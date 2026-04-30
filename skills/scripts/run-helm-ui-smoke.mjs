import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const appRoot = path.join(repoRoot, "apps", "desktop");
const outputDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(repoRoot, "skills", "outputs", "manager-app", "ui-smoke", "v8.5-usability-rc");
const port = Number(process.env.HELM_UI_SMOKE_PORT || 1420);
const chromePort = Number(process.env.HELM_UI_SMOKE_CHROME_PORT || 9333);

fs.mkdirSync(outputDir, { recursive: true });

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

function requestText(url, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => resolve({ statusCode: res.statusCode || 0, data }));
    });
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`timeout: ${url}`));
    });
    request.on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killProcessTree(child) {
  return new Promise((resolve) => {
    if (!child || !child.pid) {
      resolve();
      return;
    }
    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        try {
          child.kill("SIGKILL");
        } catch {
          // best effort after taskkill
        }
        try {
          child.unref();
        } catch {
          // best effort after taskkill
        }
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, 3500);
      killer.on("exit", finish);
      killer.on("error", finish);
      return;
    }
    child.kill();
    resolve();
  });
}

function removePathBestEffort(targetPath, options = {}) {
  try {
    fs.rmSync(targetPath, {
      force: true,
      maxRetries: 5,
      retryDelay: 180,
      ...options,
    });
  } catch (err) {
    if (err?.code !== "ENOENT") {
      console.warn(`Warning: could not remove temporary path ${targetPath}: ${err.message}`);
    }
  }
}

async function isDevServerReady() {
  try {
    const response = await requestText(`http://127.0.0.1:${port}`, 1500);
    return response.statusCode > 0 && response.statusCode < 500;
  } catch {
    return false;
  }
}

async function waitForDevServer() {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (await isDevServerReady()) return;
    await sleep(500);
  }
  throw new Error(`Vite dev server did not become ready on port ${port}`);
}

function findChrome() {
  const candidates =
    process.platform === "win32"
      ? [
          path.join(process.env.PROGRAMFILES || "", "Google", "Chrome", "Application", "chrome.exe"),
          path.join(process.env["PROGRAMFILES(X86)"] || "", "Google", "Chrome", "Application", "chrome.exe"),
          path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
          path.join(process.env.PROGRAMFILES || "", "Microsoft", "Edge", "Application", "msedge.exe"),
          path.join(process.env["PROGRAMFILES(X86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
        ]
      : ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"];
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (message) => {
      const msg = JSON.parse(message.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result || {});
        return;
      }
      const handlers = this.events.get(msg.method) || [];
      for (const handler of handlers) handler(msg.params || {});
    };
  }

  async send(method, params = {}) {
    await this.ready;
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  once(method) {
    return new Promise((resolve) => {
      const handler = (params) => {
        const list = this.events.get(method) || [];
        this.events.set(method, list.filter((item) => item !== handler));
        resolve(params);
      };
      const list = this.events.get(method) || [];
      list.push(handler);
      this.events.set(method, list);
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // best effort cleanup
    }
  }
}

async function waitForPageTarget() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const list = await getJson(`http://127.0.0.1:${chromePort}/json/list`);
      const page = list.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
      if (page) return page;
    } catch {
      // wait for Chrome CDP
    }
    await sleep(250);
  }
  throw new Error("Chrome page CDP target did not start");
}

async function main() {
  const existingServer = await isDevServerReady();
  let viteProcess = null;
  if (!existingServer) {
    const npmCli = process.platform === "win32"
      ? path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")
      : null;
    const npmCommand = npmCli && fs.existsSync(npmCli) ? process.execPath : "npm";
    const npmArgs = npmCli && fs.existsSync(npmCli)
      ? [npmCli, "run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)]
      : ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)];
    viteProcess = spawn(npmCommand, npmArgs, {
      cwd: appRoot,
      shell: false,
      windowsHide: true,
      stdio: [
        "ignore",
        fs.openSync(path.join(outputDir, "vite.stdout.log"), "w"),
        fs.openSync(path.join(outputDir, "vite.stderr.log"), "w"),
      ],
    });
    fs.writeFileSync(path.join(outputDir, ".vite-dev.pid"), String(viteProcess.pid), "utf8");
  }

  const chromePath = findChrome();
  if (!chromePath) throw new Error("Chrome or Edge executable not found for UI smoke test");

  const userData = path.join(outputDir, `chrome-profile-${process.pid}-${Date.now()}`);
  removePathBestEffort(userData, { recursive: true });
  let chromeProcess = null;
  let cdp = null;

  try {
    await waitForDevServer();
    chromeProcess = spawn(
      chromePath,
      [
        "--headless=new",
        `--remote-debugging-port=${chromePort}`,
        `--user-data-dir=${userData}`,
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "about:blank",
      ],
      { windowsHide: true, stdio: "ignore" },
    );

    const target = await waitForPageTarget();
    cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    const viewports = [
      { name: "minimum-1280x760", width: 1280, height: 760 },
      { name: "default-1480x940", width: 1480, height: 940 },
      { name: "expanded-1728x1080", width: 1728, height: 1080 },
      { name: "wide-1920x1080", width: 1920, height: 1080 },
      { name: "fullscreen-wide-2560x1440", width: 2560, height: 1440 },
    ];
    const pages = [
      { key: "project", label: "项目" },
      { key: "credibility", label: "证据" },
      { key: "next-step", label: "交给 Codex" },
      { key: "deliverables", label: "文件" },
      { key: "environment", label: "本机" },
    ];
    const scenarios = [
      { name: "standard", query: "" },
      { name: "empty", query: "?scenario=empty" },
    ];
    const results = [];
    const interactionResults = [];
    const onboardingResults = [];
    const copyResults = [];
    let historySeeded = false;

    for (const scenario of scenarios) {
      for (const viewport of viewports) {
        await cdp.send("Emulation.setDeviceMetricsOverride", {
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: 1,
          mobile: false,
        });
        const load = cdp.once("Page.loadEventFired");
        await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}${scenario.query}` });
        await load;
        await sleep(900);
      if (!historySeeded) {
        await cdp.send("Runtime.evaluate", {
          expression: `(() => {
            const legacy = [{
              id: 'legacy:<PROJECT_ROOT>',
              project_name: '演示项目',
              project_root: '<PROJECT_ROOT>',
              copied_at: new Date().toISOString(),
              handoff_generated_at: new Date().toISOString(),
              handoff_version: 'v8-legacy',
              recommended_action: '读取真实项目状态后继续推进。',
              blocker_count: 1,
              excerpt: '旧历史摘要包含本机路径 C:\\\\Users\\\\17666\\\\Secret Project\\\\notes.md，应在读取时脱敏。'
            }];
            window.localStorage.setItem('helm.handoffHistory.v1', JSON.stringify(legacy));
          })()`,
        });
        const reload = cdp.once("Page.loadEventFired");
        await cdp.send("Page.reload", { ignoreCache: true });
        await reload;
        await sleep(900);
        historySeeded = true;
      }

      if (scenario.name === "standard" && viewport.name === "minimum-1280x760") {
        const onboardingResult = await cdp.send("Runtime.evaluate", {
          returnByValue: true,
          awaitPromise: true,
          expression: `(() => new Promise((resolve) => {
            const textOf = (el) => (el?.textContent || '').replace(/\\s+/g, ' ').trim();
            const visible = (el) => {
              if (!el) return false;
              const style = getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
            };
            const all = (selector) => [...document.querySelectorAll(selector)].filter(visible);
            const controls = (root = document) => [...root.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"],label,input')].filter(visible);
            const buttons = (root = document) => [...root.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"]')].filter(visible);
            const findButton = (patterns, root = document) => buttons(root).find((button) => patterns.some((pattern) => pattern.test(textOf(button) || button.getAttribute('aria-label') || button.getAttribute('title') || '')));
            const findControl = (patterns, root = document) => controls(root).find((el) => patterns.some((pattern) => pattern.test(textOf(el) || el.getAttribute('aria-label') || el.getAttribute('title') || '')));
            const wizardSelectors = [
              '[data-tour-id*="onboarding"]',
              '[data-tour-id*="tour"]',
              '[data-testid*="onboarding"]',
              '[data-testid*="tour"]',
              '.onboarding-tour',
              '.tour-panel',
              '.tour-dialog',
              '.welcome-guide',
              '[role="dialog"]'
            ];
            const findWizard = () => all(wizardSelectors.join(',')).find((el) => /下一步|上一步|完成|不再显示|开始|新手|向导|HELM/.test(textOf(el)));
            const click = (el) => {
              if (!el) return false;
              el.click();
              return true;
            };
            const storageSnapshot = () => Object.fromEntries(Array.from({ length: localStorage.length }, (_, index) => {
              const key = localStorage.key(index);
              return [key, key ? localStorage.getItem(key) : ''];
            }).filter(([key]) => key));
            const storageMentionsDismiss = (before, after) => Object.entries(after).some(([key, value]) => {
              if (before[key] === value) return false;
              return /tour|onboarding|welcome|guide|dismiss|dont|skip|seen|不再显示/i.test(String(key) + ' ' + String(value));
            });

            const beforeStorage = storageSnapshot();
            const initialWizard = findWizard();
            const initialWizardVisible = Boolean(initialWizard);
            const firstLaunchGuideVisible = initialWizardVisible || all('.onboarding-card,.project-intake-card,[data-tour-id*="first-launch"],[data-testid*="first-launch"]').length > 0;
            const nextClicked = initialWizardVisible && click(findButton([/下一步/, /next/i], initialWizard));
            setTimeout(() => {
              const afterNextWizard = findWizard();
              const backClicked = Boolean(afterNextWizard) && click(findButton([/上一步/, /back|previous/i], afterNextWizard));
              setTimeout(() => {
                const afterBackWizard = findWizard();
                const skipControl = afterBackWizard ? findControl([/不再显示/, /do not show|don't show|dont show|never show/i], afterBackWizard) : null;
                if (skipControl?.matches('input')) {
                  skipControl.checked = true;
                  skipControl.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                  click(skipControl);
                }
                const afterDismissStorage = storageSnapshot();
                const dismissPersisted = storageMentionsDismiss(beforeStorage, afterDismissStorage);
                const afterDismissWizard = findWizard();
                const doneClicked = Boolean(afterDismissWizard) && click(findButton([/完成/, /知道了/, /开始使用/, /done|finish|start/i], afterDismissWizard));
                setTimeout(() => {
                  const helpButton = findButton([/帮助/, /help/i]) || document.querySelector('[data-tour-id="help-button"],[aria-label*="帮助"],[aria-label*="help" i]');
                  const helpButtonVisible = visible(helpButton);
                  const helpButtonOperable = click(helpButton);
                  setTimeout(() => {
                    const helpPanel = all('.help-panel,.help-drawer,[data-tour-id*="help"],[data-testid*="help"],[role="dialog"]').find((el) => /帮助|向导|新手|重新|开始|guide|tour|help/i.test(textOf(el)));
                    const helpPanelOpened = Boolean(helpPanel);
                    const helpPanelLeftAligned = Boolean(helpPanel && helpPanel.getBoundingClientRect().left < window.innerWidth * 0.45);
                    const reopenButton = helpPanel
                      ? [...helpPanel.querySelectorAll('button,[role="button"]')].find((button) => /向导|新手|重新|开始|guide|tour|onboarding/i.test(textOf(button) || button.getAttribute('aria-label') || button.getAttribute('title') || ''))
                      : null;
                    const helpReopenClicked = click(reopenButton);
                    setTimeout(() => {
                      const wizardReopenedFromHelp = helpReopenClicked && Boolean(findWizard());
                      const settingsButton = findButton([/设置/, /settings/i]);
                      const settingsButtonVisible = visible(settingsButton);
                      const settingsButtonOperable = click(settingsButton);
                      setTimeout(() => {
                        const settingsPanelOpened = Boolean(all('.settings-panel,[data-testid*="settings"],[role="dialog"]').find((el) => /设置|settings/i.test(textOf(el))));
                        const settingsPanel = document.querySelector('.settings-panel');
                        const settingsPanelLeftAligned = Boolean(settingsPanel && settingsPanel.getBoundingClientRect().left < window.innerWidth * 0.45);
                        click(document.querySelector('.settings-close,[aria-label*="关闭设置"]'));
                        resolve({
                          firstLaunchGuideVisible,
                          initialWizardVisible,
                          nextClicked,
                          backClicked,
                          dismissPersisted,
                          doneClicked,
                          helpButtonVisible,
                          helpButtonOperable,
                          helpPanelOpened,
                          helpPanelLeftAligned,
                          helpReopenClicked,
                          wizardReopenedFromHelp,
                          settingsButtonVisible,
                          settingsButtonOperable,
                          settingsPanelOpened,
                          settingsPanelLeftAligned,
                        });
                      }, 160);
                    }, 160);
                  }, 180);
                }, 160);
              }, 120);
            }, 120);
          }))()`,
        });
        onboardingResults.push(onboardingResult.result.value);
      }

      if (scenario.name === "standard" && viewport.name === "minimum-1280x760") {
        await sleep(700);
        const interactionResult = await cdp.send("Runtime.evaluate", {
          returnByValue: true,
          awaitPromise: true,
          expression: `(() => new Promise((resolve) => {
            const settingsButton = [...document.querySelectorAll('button')].find((button) => button.textContent.trim().includes('设置'));
            if (settingsButton) settingsButton.click();
            setTimeout(() => {
              const panel = document.querySelector('.settings-panel');
              const settingsPanelLeftAligned = Boolean(panel && panel.getBoundingClientRect().left < window.innerWidth * 0.45);
              const launch = panel?.querySelector('[data-testid="settings-launch-page"]');
              const density = panel?.querySelector('[data-testid="settings-density"]');
              const reduceMotion = panel?.querySelector('[data-testid="settings-reduce-motion"]');
              const historyLimit = panel?.querySelector('[data-testid="settings-history-limit"]');
              if (launch) {
                launch.value = 'environment';
                launch.dispatchEvent(new Event('change', { bubbles: true }));
              }
              if (density) {
                density.value = 'compact';
                density.dispatchEvent(new Event('change', { bubbles: true }));
              }
              if (reduceMotion) {
                reduceMotion.value = 'on';
                reduceMotion.dispatchEvent(new Event('change', { bubbles: true }));
              }
              if (historyLimit) {
                historyLimit.value = '10';
                historyLimit.dispatchEvent(new Event('change', { bubbles: true }));
              }
              const clearButton = [...document.querySelectorAll('.settings-panel button')].find((button) => button.textContent.trim().includes('清空本机历史'));
              const close = document.querySelector('.settings-close');
              setTimeout(() => {
                const settingsRaw = window.localStorage.getItem('helm.userSettings.v1') || '';
                if (close) close.click();
                resolve({
                  settingsButtonOpened: Boolean(panel),
                  settingsPanelLeftAligned,
                  densityApplied: document.documentElement.dataset.density === 'compact',
                  reduceMotionApplied: document.documentElement.dataset.reduceMotion === 'on',
                  settingsPersisted: settingsRaw.includes('"launchPage":"environment"') && settingsRaw.includes('"displayDensity":"compact"'),
                  clearHistoryButtonVisible: Boolean(clearButton),
                });
              }, 140);
            }, 120);
          }))()`,
        });
        interactionResults.push(interactionResult.result.value);

        const copyResult = await cdp.send("Runtime.evaluate", {
          returnByValue: true,
          awaitPromise: true,
          expression: `(() => new Promise((resolve) => {
            const copied = [];
            const textOf = (el) => (el?.textContent || el?.getAttribute?.('aria-label') || el?.getAttribute?.('title') || '').replace(/\\s+/g, ' ').trim();
            const visible = (el) => {
              if (!el) return false;
              const style = getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
            };
            const buttons = () => [...document.querySelectorAll('button,[role="button"]')].filter(visible);
            const clickButton = (patterns) => {
              const button = buttons().find((item) => patterns.some((pattern) => pattern.test(textOf(item))));
              if (!button) return false;
              button.click();
              return true;
            };
            const clickAnyButton = (patterns) => {
              const button = [...document.querySelectorAll('button,[role="button"]')].find((item) => patterns.some((pattern) => pattern.test(textOf(item))));
              if (!button) return false;
              button.scrollIntoView({ block: 'center', inline: 'nearest' });
              button.click();
              return true;
            };
            const closeOverlays = () => {
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
              [...document.querySelectorAll('.settings-close,[aria-label*="关闭"]')].filter(visible).forEach((button) => button.click());
            };
            const installClipboardHook = () => {
              const clipboard = { writeText: async (value) => { copied.push(String(value)); window.__helmLastCopiedText = String(value); } };
              try {
                Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, get: () => clipboard });
                return true;
              } catch {
                try {
                  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
                  return true;
                } catch {
                  return false;
                }
              }
            };
            const hookInstalled = installClipboardHook();
            closeOverlays();
            clickButton([/^项目$/]);
            setTimeout(() => {
              closeOverlays();
              const helpOpened = clickAnyButton([/帮助/]);
              setTimeout(() => {
                const intakeClicked = clickAnyButton([/复制接入说明/]);
              setTimeout(() => {
                const intakeText = copied[copied.length - 1] || '';
                closeOverlays();
                clickAnyButton([/本机/]);
                setTimeout(() => {
                  document.querySelector('.page-surface')?.scrollTo?.(0, document.querySelector('.page-surface')?.scrollHeight || 0);
                  window.scrollTo(0, document.body.scrollHeight);
                  const diagnosticClicked = clickAnyButton([/复制本机诊断/]);
                  setTimeout(() => {
                    const diagnosticText = copied[copied.length - 1] || '';
                    const rawProjectFilePattern = /\\b(?:research-map\\.md|findings-memory\\.md|material-passport\\.yaml|evidence-ledger\\.yaml)\\b/i;
                    const rawModePattern = /\\b(?:demo_snapshot|legacy_app_snapshot|live_environment|source mode|runtime|on|off|project)\\b/i;
                    resolve({
                      hookInstalled,
                      helpOpened,
                      intakeClicked,
                      diagnosticClicked,
                      intakeTextChecked: Boolean(intakeText) && !rawProjectFilePattern.test(intakeText) && /项目说明/.test(intakeText) && /材料清单/.test(intakeText),
                      diagnosticTextChecked: Boolean(diagnosticText) && !rawModePattern.test(diagnosticText) && /本机读取状态/.test(diagnosticText) && /设置：启动页=/.test(diagnosticText),
                    });
                  }, 180);
                }, 420);
              }, 180);
              }, 220);
            }, 180);
          }))()`,
        });
        copyResults.push(copyResult.result.value);
      }

        for (const page of pages) {
        await cdp.send("Runtime.evaluate", {
          expression: `(() => { const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim().includes(${JSON.stringify(page.label)})); if (btn) btn.click(); })()`,
        });
        await sleep(450);
        const evalResult = await cdp.send("Runtime.evaluate", {
          returnByValue: true,
          expression: `(() => {
            const surface = document.querySelector('.page-surface');
            const grid = document.querySelector('.page-grid');
            const workspace = document.querySelector('.workspace-shell');
            const shell = document.querySelector('.app-shell');
            const titlebar = document.querySelector('.titlebar');
            const windowControls = document.querySelector('.window-controls');
            const surfaceRect = surface ? surface.getBoundingClientRect() : null;
            const gridRect = grid ? grid.getBoundingClientRect() : null;
            const titlebarRect = titlebar ? titlebar.getBoundingClientRect() : null;
            const windowControlsRect = windowControls ? windowControls.getBoundingClientRect() : null;
            const rightBlankPx = surfaceRect && gridRect ? Math.max(0, Math.round(surfaceRect.right - gridRect.right)) : null;
            const contentWidthRatio = surfaceRect && gridRect && surfaceRect.width > 0
              ? Number((gridRect.width / surfaceRect.width).toFixed(3))
              : null;
            const rows = grid
              ? [...grid.children]
                  .filter((el) => {
                    const style = getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                  })
                  .map((el) => {
                    const rect = el.getBoundingClientRect();
                    return { top: Math.round(rect.top), left: rect.left, right: rect.right, width: rect.width, className: String(el.className || '') };
                  })
                  .reduce((groups, item) => {
                    const group = groups.find((row) => Math.abs(row.top - item.top) <= 4);
                    if (group) group.items.push(item);
                    else groups.push({ top: item.top, items: [item] });
                    return groups;
                  }, [])
                  .map((row) => {
                    const left = Math.min(...row.items.map((item) => item.left));
                    const right = Math.max(...row.items.map((item) => item.right));
                    const width = right - left;
                    const ratio = gridRect && gridRect.width > 0 ? width / gridRect.width : 1;
                    const hasSpan = row.items.some((item) => item.className.includes('span-2'));
                    return { top: row.top, itemCount: row.items.length, width: Math.round(width), ratio: Number(ratio.toFixed(3)), hasSpan };
                  })
              : [];
            const blankGridRows = gridRect
              ? rows.filter((row) => row.itemCount === 1 && !row.hasSpan && row.ratio < 0.82)
              : [];
            const selectors = '.titlebar h1,.titlebar p,.action-button,.project-selector-trigger,.project-selector-trigger strong,.segmented-nav button,.status-badge,.evidence-title-row h3,.file-card strong,.file-card small,.entry-summary-grid strong,.entry-summary-grid small,.plain-file-list strong,.plain-file-list span,.project-selector-menu strong,.project-selector-menu small';
            const clipped = [...document.querySelectorAll(selectors)].filter((el) => {
              const style = getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden') return false;
              return el.scrollWidth - el.clientWidth > 1 || el.scrollHeight - el.clientHeight > 2;
            }).map((el) => ({ tag: el.tagName, className: String(el.className), text: (el.textContent || '').trim().slice(0, 120), sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight }));
            const text = document.body.innerText || '';
            const isVisible = (el) => {
              if (!el) return false;
              const style = getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
            };
            const textOf = (el) => (el?.textContent || '').replace(/\\s+/g, ' ').trim();
            const hiddenFromMainFlow = (el) => Boolean(el.closest([
              '.diagnostic-panel',
              '.settings-panel',
              '.settings-overlay',
              '.toast',
              '[aria-hidden="true"]',
              '[hidden]',
              'script',
              'style',
              'noscript',
              'template',
              'code',
              'pre',
              'svg'
            ].join(',')));
            const mainFlowTextNodes = [];
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
              acceptNode(node) {
                const value = (node.nodeValue || '').replace(/\\s+/g, ' ').trim();
                const parent = node.parentElement;
                if (!value || !parent || hiddenFromMainFlow(parent) || !isVisible(parent)) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
              }
            });
            while (walker.nextNode()) {
              mainFlowTextNodes.push({
                text: walker.currentNode.nodeValue.replace(/\\s+/g, ' ').trim(),
                tag: walker.currentNode.parentElement?.tagName || '',
                className: String(walker.currentNode.parentElement?.className || ''),
              });
            }
            const bannedMainFlowTerms = [
              { term: 'handoff', pattern: /\\bhandoff\\b/i },
              { term: 'validator', pattern: /\\bvalidator\\b/i },
              { term: 'runtime', pattern: /\\bruntime\\b/i },
              { term: 'source mode', pattern: /\\bsource\\s+mode\\b/i },
              { term: 'bridge', pattern: /\\bbridge\\b/i },
              { term: 'schema', pattern: /\\bschema\\b/i },
              { term: 'Project intake', pattern: /\\bProject\\s+intake\\b/i },
              { term: 'Onboarding', pattern: /\\bOnboarding\\b/i },
              { term: 'gate', pattern: /\\bgate\\b/i },
              { term: '复查', pattern: /复查/ },
              { term: '交接单', pattern: /交接单/ },
              { term: '交付物', pattern: /交付物/ },
              { term: 'raw identifier', pattern: /\\b[a-z][a-z0-9]+(?:_[a-z0-9]+)+\\b/i },
              { term: 'raw project filename', pattern: /\\b(?:research-map|findings-memory|material-passport|evidence-ledger|pipeline-status|writing-quality-report)\\b/i },
            ];
            const mainFlowTechTerms = mainFlowTextNodes
              .flatMap((node) => bannedMainFlowTerms
                .filter((item) => item.pattern.test(node.text))
                .map((item) => ({ term: item.term, text: node.text.slice(0, 160), tag: node.tag, className: node.className })));
            const historyRaw = window.localStorage.getItem('helm.handoffHistory.v1') || '';
            const historyStorageHasPrivatePath = /C:\\\\Users|C:\\/Users|\\/Users\\/|\\/home\\//.test(historyRaw);
            const historyActionCount = document.querySelectorAll('.handoff-history-card .action-button').length;
            const oldBrandTerms = [
              'Codex' + ' Research' + ' Console',
              'Codex' + 'ResearchConsole',
              'Codex' + '-Research' + '-Console',
            ];
            const privateTerms = [
              '私有版',
              '仅限个人',
            ];
            const windowControlCount = document.querySelectorAll('.window-control').length;
            const windowControlsDropped = Boolean(titlebarRect && windowControlsRect && windowControlsRect.top - titlebarRect.top > 44);
            const toolbarSettingsHelpCount = [...document.querySelectorAll('.toolbar-actions button')].filter((button) => /设置|帮助|settings|help/i.test(textOf(button) || button.getAttribute('aria-label') || '')).length;
            const sidebarUtilityCount = document.querySelectorAll('.sidebar-footer .action-button').length;
            const nativeToolbarProjectSelectCount = document.querySelectorAll('.toolbar-actions .project-selector select').length;
            const projectSelectorTriggerCount = document.querySelectorAll('.toolbar-actions .project-selector-trigger').length;
            let projectSelectorMenuOverflow = false;
            const projectSelectorTrigger = document.querySelector('.toolbar-actions .project-selector-trigger');
            if (isVisible(projectSelectorTrigger)) {
              projectSelectorTrigger.click();
              const menu = document.querySelector('.project-selector-menu');
              if (isVisible(menu)) {
                const menuRect = menu.getBoundingClientRect();
                projectSelectorMenuOverflow = menuRect.left < -1 || menuRect.right > window.innerWidth + 1 || menuRect.width > window.innerWidth;
              }
              projectSelectorTrigger.click();
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            }
            const visibleControls = [...document.querySelectorAll('button,select')].filter((el) => {
              const style = getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
            });
            const keyboardFocusFailures = visibleControls
              .filter((el) => !((el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim()))
              .map((el) => ({ tag: el.tagName, className: String(el.className || ''), html: el.outerHTML.slice(0, 160) }));
            const settingsButtonCount = [...document.querySelectorAll('button')].filter((button) => button.textContent.trim().includes('设置')).length;
            const helpButtonCount = [...document.querySelectorAll('button,[role="button"]')].filter((button) => {
              const label = (button.textContent || button.getAttribute('aria-label') || button.getAttribute('title') || '').trim();
              return isVisible(button) && /帮助|help/i.test(label);
            }).length;
            const projectIntakeCount = document.querySelectorAll('.project-intake-card').length;
            const projectPortfolio = document.querySelector('.project-portfolio-card');
            const invalidProjectRows = projectPortfolio
              ? [...projectPortfolio.querySelectorAll('.project-row,button')].filter((row) => {
                  const rowText = textOf(row);
                  return isVisible(row) && (row.disabled || /缺失|不可用|失效|未检测|公开样例|<PUBLIC_SAMPLE_PROJECT>/i.test(rowText));
                }).map((row) => textOf(row).slice(0, 180))
              : [];
            const usableProjectRows = projectPortfolio
              ? [...projectPortfolio.querySelectorAll('.project-row,button')].filter((row) => isVisible(row) && !row.disabled).length
              : 0;
            const beginnerGuideVisible = [...document.querySelectorAll('.onboarding-card,.project-intake-card,[data-tour-id*="onboarding"],[data-testid*="onboarding"]')]
              .some((el) => isVisible(el) && /第一次|新手|项目接入|可信项目|复制项目接入模板|未检测到可信项目/i.test(textOf(el)));
            const diagnosticPanelCount = document.querySelectorAll('.diagnostic-panel').length;
            return {
              scenario: ${JSON.stringify(scenario.name)},
              viewport: ${JSON.stringify(viewport.name)},
              page: ${JSON.stringify(page.key)},
              bodyOverflowX: Math.max(0, document.body.scrollWidth - window.innerWidth),
              docOverflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
              surfaceOverflowX: surface ? Math.max(0, surface.scrollWidth - surface.clientWidth) : null,
              workspaceOverflowX: workspace ? Math.max(0, workspace.scrollWidth - workspace.clientWidth) : null,
              shellOverflowX: shell ? Math.max(0, shell.scrollWidth - shell.clientWidth) : null,
              rightBlankPx,
              contentWidthRatio,
              blankGridRows,
              hasWideBlankColumn: (rightBlankPx !== null && (rightBlankPx > 96 || contentWidthRatio < 0.82)) || blankGridRows.length > 0,
              hasHorizontalScrollbar: document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth || (surface && surface.scrollWidth > surface.clientWidth + 1),
              sidebarVisualCount: document.querySelectorAll('.sidebar-visual,.sidebar-note').length,
              oldBrandInText: oldBrandTerms.some((term) => text.includes(term)),
              privateCopyInText: privateTerms.some((term) => text.includes(term)),
              historyStorageHasPrivatePath,
              historyControlsMissing: ${JSON.stringify(page.key)} === 'next-step' && historyActionCount < 2,
              historyActionCount,
              brandSrc: document.querySelector('.brand-mark img')?.getAttribute('src') || '',
              inputCount: document.querySelectorAll('textarea,input[type="text"],input:not([type]),[contenteditable="true"]').length,
              windowControlCount,
              windowControlsDropped,
              toolbarSettingsHelpCount,
              sidebarUtilityCount,
              nativeToolbarProjectSelectCount,
              projectSelectorTriggerCount,
              projectSelectorMenuOverflow,
              settingsButtonMissing: settingsButtonCount < 1,
              helpButtonMissing: helpButtonCount < 1,
              projectIntakeMissing: ${JSON.stringify(scenario.name)} === 'empty' && ${JSON.stringify(page.key)} === 'project' && projectIntakeCount < 1,
              invalidProjectRows,
              invalidProjectVisible: ${JSON.stringify(page.key)} === 'project' && invalidProjectRows.length > 0,
              usableProjectRows,
              emptyOnboardingMissing: ${JSON.stringify(scenario.name)} === 'empty' && ${JSON.stringify(page.key)} === 'project' && !beginnerGuideVisible,
              diagnosticPanelMissing: ${JSON.stringify(page.key)} === 'environment' && diagnosticPanelCount < 1,
              mainFlowTechTerms,
              keyboardFocusFailures,
              clipped,
            };
          })()`,
        });
        const row = evalResult.result.value;
        results.push(row);
        const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
        fs.writeFileSync(path.join(outputDir, `${scenario.name}-${viewport.name}-${page.key}.png`), Buffer.from(shot.data, "base64"));
      }
      }
    }

    const summary = {
      ok: results.every(
        (row) =>
          !row.hasHorizontalScrollbar &&
          row.sidebarVisualCount === 0 &&
          !row.oldBrandInText &&
          !row.privateCopyInText &&
          !row.historyStorageHasPrivatePath &&
          !row.historyControlsMissing &&
          !row.hasWideBlankColumn &&
          row.inputCount === 0 &&
          row.windowControlCount === 3 &&
          !row.windowControlsDropped &&
          row.toolbarSettingsHelpCount === 0 &&
          row.sidebarUtilityCount >= 2 &&
          row.nativeToolbarProjectSelectCount === 0 &&
          (row.projectSelectorTriggerCount >= 1 || row.scenario === 'empty') &&
          !row.projectSelectorMenuOverflow &&
          !row.settingsButtonMissing &&
          !row.helpButtonMissing &&
          !row.projectIntakeMissing &&
          !row.invalidProjectVisible &&
          !row.emptyOnboardingMissing &&
          !row.diagnosticPanelMissing &&
          row.mainFlowTechTerms.length === 0 &&
          row.keyboardFocusFailures.length === 0 &&
          row.clipped.length === 0 &&
          row.brandSrc.includes("helm-command-mark"),
      ) && interactionResults.length === 1 && interactionResults.every(
        (row) => row.settingsButtonOpened && row.settingsPanelLeftAligned && row.densityApplied && row.reduceMotionApplied && row.settingsPersisted && row.clearHistoryButtonVisible,
      ) && onboardingResults.length === 1 && onboardingResults.every(
        (row) =>
          row.firstLaunchGuideVisible &&
          row.initialWizardVisible &&
          row.nextClicked &&
          row.backClicked &&
          row.dismissPersisted &&
          row.doneClicked &&
          row.helpButtonVisible &&
          row.helpButtonOperable &&
          row.helpPanelOpened &&
          row.helpPanelLeftAligned &&
          row.helpReopenClicked &&
          row.wizardReopenedFromHelp &&
          row.settingsButtonVisible &&
          row.settingsButtonOperable &&
          row.settingsPanelOpened &&
          row.settingsPanelLeftAligned,
      ) && copyResults.length === 1 && copyResults.every(
        (row) =>
          row.hookInstalled &&
          row.helpOpened &&
          row.intakeClicked &&
          row.diagnosticClicked &&
          row.intakeTextChecked &&
          row.diagnosticTextChecked,
      ),
      generated_at: new Date().toISOString(),
      results,
      interactions: interactionResults,
      onboarding: onboardingResults,
      copy_checks: copyResults,
      totals: {
        overflowPages: results.filter((row) => row.hasHorizontalScrollbar).length,
        sidebarVisualPages: results.filter((row) => row.sidebarVisualCount > 0).length,
        oldBrandPages: results.filter((row) => row.oldBrandInText).length,
        privateCopyPages: results.filter((row) => row.privateCopyInText).length,
        historyPrivacyFailures: results.filter((row) => row.historyStorageHasPrivatePath).length,
        historyControlFailures: results.filter((row) => row.historyControlsMissing).length,
        wideBlankPages: results.filter((row) => row.hasWideBlankColumn).length,
        blankGridRows: results.reduce((count, row) => count + (row.blankGridRows?.length || 0), 0),
        inputPages: results.filter((row) => row.inputCount > 0).length,
        windowControlFailures: results.filter((row) => row.windowControlCount !== 3).length,
        windowControlAlignmentFailures: results.filter((row) => row.windowControlsDropped).length,
        toolbarUtilityPlacementFailures: results.filter((row) => row.toolbarSettingsHelpCount !== 0 || row.sidebarUtilityCount < 2).length,
        projectSelectorStyleFailures: results.filter((row) => row.nativeToolbarProjectSelectCount !== 0 || (row.projectSelectorTriggerCount < 1 && row.scenario !== 'empty') || row.projectSelectorMenuOverflow).length,
        settingsInteractionRuns: interactionResults.length,
        settingsPanelFailures: interactionResults.filter(
          (row) => !row.settingsButtonOpened || !row.settingsPanelLeftAligned || !row.densityApplied || !row.reduceMotionApplied || !row.settingsPersisted || !row.clearHistoryButtonVisible,
        ).length,
        onboardingInteractionRuns: onboardingResults.length,
        onboardingInteractionFailures: onboardingResults.filter(
          (row) =>
            !row.firstLaunchGuideVisible ||
            !row.initialWizardVisible ||
            !row.nextClicked ||
            !row.backClicked ||
            !row.dismissPersisted ||
            !row.doneClicked ||
            !row.helpButtonVisible ||
            !row.helpButtonOperable ||
            !row.helpPanelOpened ||
            !row.helpPanelLeftAligned ||
            !row.helpReopenClicked ||
            !row.wizardReopenedFromHelp ||
            !row.settingsButtonVisible ||
            !row.settingsButtonOperable ||
            !row.settingsPanelOpened ||
            !row.settingsPanelLeftAligned,
        ).length,
        copyTextCheckRuns: copyResults.length,
        copyTextFailures: copyResults.filter(
          (row) => !row.hookInstalled || !row.helpOpened || !row.intakeClicked || !row.diagnosticClicked || !row.intakeTextChecked || !row.diagnosticTextChecked,
        ).length,
        settingsButtonFailures: results.filter((row) => row.settingsButtonMissing).length,
        helpButtonFailures: results.filter((row) => row.helpButtonMissing).length,
        projectIntakeFailures: results.filter((row) => row.projectIntakeMissing).length,
        invalidProjectVisibilityFailures: results.filter((row) => row.invalidProjectVisible).length,
        emptyOnboardingFailures: results.filter((row) => row.emptyOnboardingMissing).length,
        diagnosticPanelFailures: results.filter((row) => row.diagnosticPanelMissing).length,
        mainFlowTechTermFailures: results.reduce((count, row) => count + row.mainFlowTechTerms.length, 0),
        keyboardFocusFailures: results.reduce((count, row) => count + row.keyboardFocusFailures.length, 0),
        clippedCount: results.reduce((count, row) => count + row.clipped.length, 0),
        badLogoPages: results.filter((row) => !row.brandSrc.includes("helm-command-mark")).length,
      },
    };
    const reportPath = path.join(outputDir, "ui-smoke-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), "utf8");
    console.log(reportPath);
    console.log(JSON.stringify(summary.totals));
    process.exitCode = summary.ok ? 0 : 1;
  } finally {
    if (cdp) cdp.close();
    await killProcessTree(chromeProcess);
    await killProcessTree(viteProcess);
    if (fs.existsSync(path.join(outputDir, ".vite-dev.pid"))) {
      removePathBestEffort(path.join(outputDir, ".vite-dev.pid"));
    }
    removePathBestEffort(userData, { recursive: true });
  }
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
