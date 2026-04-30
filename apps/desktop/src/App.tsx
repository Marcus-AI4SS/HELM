import { useEffect, useMemo, useState } from "react";
import { FolderOpen, RefreshCw } from "lucide-react";
import { AppShell } from "./components/AppShell";
import { ActionButton } from "./components/ActionButton";
import { EmptyState } from "./components/EmptyState";
import { GuidedTour } from "./components/GuidedTour";
import { HelpButton } from "./components/HelpButton";
import { HelpPanel } from "./components/HelpPanel";
import { ProjectSelector } from "./components/ProjectSelector";
import { SettingsButton } from "./components/SettingsButton";
import { SettingsPanel } from "./components/SettingsPanel";
import { Toast } from "./components/Toast";
import {
  getCodexHandoff,
  getDashboard,
  openExternalApp,
  openPath,
  runValidator,
} from "./bridge";
import { CredibilityPage } from "./pages/CredibilityPage";
import { DeliverablesPage } from "./pages/DeliverablesPage";
import { EnvironmentPage } from "./pages/EnvironmentPage";
import { NextStepPage } from "./pages/NextStepPage";
import { ProjectPage } from "./pages/ProjectPage";
import { PAGES } from "./navigation";
import { displayActionText } from "./displayText";
import type { AppActionResult, DashboardData, DiagnosticSummary, HandoffHistoryEntry, HelmUserSettings, PageKey } from "./types";
import "./styles/tokens.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/pages.css";
import "./styles/states.css";

const SELECTED_PROJECT_KEY = "helm.selectedProjectRoot.v1";
const HANDOFF_HISTORY_KEY = "helm.handoffHistory.v1";
const USER_SETTINGS_KEY = "helm.userSettings.v1";
const DASHBOARD_CACHE_KEY = "helm.dashboardCache.v1";
const DASHBOARD_CACHE_SCHEMA = 1;
const DASHBOARD_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const GUIDE_VERSION = "v1-usability";

const DEFAULT_SETTINGS: HelmUserSettings = {
  launchPage: "project",
  rememberLastProject: true,
  displayDensity: "standard",
  reduceMotion: "system",
  handoffHistoryLimit: 20,
  firstRunGuideDismissed: false,
  lastSeenGuideVersion: "",
};

interface DashboardCache {
  schemaVersion: number;
  savedAt: number;
  selectedProjectRoot: string | null;
  data: DashboardData;
}

function App() {
  const [settings, setSettings] = useState<HelmUserSettings>(() => readSettings());
  const [initialStoredProject] = useState<string | null>(() => (settings.rememberLastProject ? readStoredProject() : null));
  const [startupCache] = useState<DashboardCache | null>(() => (
    shouldBypassDashboardCache() ? null : readDashboardCache(initialStoredProject)
  ));
  const [activePage, setActivePage] = useState<PageKey>(() => settings.launchPage);
  const [data, setData] = useState<DashboardData | null>(() => startupCache?.data ?? null);
  const [selectedProject, setSelectedProject] = useState<string | null>(() => (
    initialStoredProject ?? startupCache?.selectedProjectRoot ?? startupCache?.data.selected_project_root ?? null
  ));
  const [handoffHistory, setHandoffHistory] = useState<HandoffHistoryEntry[]>(() => readHandoffHistory(settings.handoffHistoryLimit));
  const [loading, setLoading] = useState(!startupCache?.data);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(() => !settings.firstRunGuideDismissed);

  const projects = data?.projects ?? [];
  const usableProjects = useMemo(() => projects.filter((project) => isUsableProject(project)), [projects]);
  const unavailableProjectCount = Math.max(0, projects.length - usableProjects.length);
  const projectRoot = selectedProject ?? data?.selected_project_root ?? null;
  const projectKey = projectRoot ? createProjectKey(projectRoot) : null;
  const diagnosticSummary = createDiagnosticSummary(data, error, settings, projectRoot);
  const currentProjectCanUse = isUsableProject({
    path: data?.project_page?.project?.root ?? projectRoot ?? undefined,
    exists: data?.project_page?.project?.exists,
    status: data?.project_page?.project?.status,
    current_stage: data?.project_page?.project?.current_stage,
  });

  async function refresh(projectRootOverride?: string | null, options: { silent?: boolean } = {}) {
    if (!options.silent) {
      setLoading(true);
      setError("");
    }
    try {
      const requestedProject = projectRootOverride ?? projectRoot;
      const next = await getDashboard(requestedProject);
      setData(next);
      const resolved = next.selected_project_root ?? requestedProject ?? null;
      setSelectedProject(resolved);
      writeStoredProject(settings.rememberLastProject ? resolved : null);
      writeDashboardCache(next, resolved);
    } catch (err) {
      if (!options.silent) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (startupCache?.data) {
      if (!isDashboardCacheFresh(startupCache)) {
        void refresh(undefined, { silent: true });
      }
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    writeSettings(settings);
    document.documentElement.dataset.density = settings.displayDensity;
    document.documentElement.dataset.reduceMotion = settings.reduceMotion;
    if (!settings.rememberLastProject) {
      writeStoredProject(null);
    }
    setHandoffHistory((previous) => {
      const next = previous.slice(0, settings.handoffHistoryLimit);
      writeHandoffHistory(next, settings.handoffHistoryLimit);
      return next;
    });
  }, [settings]);

  async function copyHandoff() {
    try {
      const handoff = await getCodexHandoff(projectRoot);
      await copyText(handoff.text);
      recordHandoffHistory(handoff);
      setNotice("给 Codex 的说明已复制。请回到 Codex 对话窗口粘贴发送。");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleOpenPath(path?: string) {
    if (!path) {
      setNotice("没有可打开路径。");
      return;
    }
    try {
      showResult(await openPath(path, projectRoot), "已请求打开本地路径。");
    } catch (err) {
      setError(actionErrorMessage(err, "本地路径没有打开。"));
    }
  }

  async function handleRunValidator(name: string) {
    try {
      showResult(await runValidator(name), `${name} 本地检查已返回结果。`);
      await refresh();
    } catch (err) {
      setError(actionErrorMessage(err, "本地检查没有完成。"));
    }
  }

  async function handleOpenCodex() {
    try {
      showResult(await openExternalApp("Codex App"), "已请求打开 Codex。");
    } catch (err) {
      setError(actionErrorMessage(err, "Codex 没有打开。"));
    }
  }

  async function selectProjectRoot(nextProject: string) {
    setSelectedProject(nextProject);
    writeStoredProject(settings.rememberLastProject ? nextProject : null);
    await refresh(nextProject);
  }

  function showResult(result: AppActionResult, successText: string) {
    if (result.ok === false) {
      setError(String(result.error ?? result.stderr ?? result.status ?? "操作未完成"));
      return;
    }
    setNotice(String(result.status || successText));
  }

  function renderPage() {
    if (loading) return <EmptyState title="正在读取本机状态" body="HELM 正在读取这台电脑上的项目状态；如果读取失败，会直接提示错误。" />;
    if (!data) {
      return (
        <EmptyState
          title="没有读取到数据"
          body="请先刷新。如果仍然没有数据，可以复制接入说明交给 Codex，或打开帮助查看第一步。"
          actions={
            <>
              <ActionButton variant="primary" onClick={() => void copyProjectIntakeTemplate()} data-tour-id="copy-project-intake">复制接入说明</ActionButton>
              <ActionButton variant="secondary" onClick={() => void handleOpenCodex()}>打开 Codex</ActionButton>
              <ActionButton variant="secondary" onClick={() => setActivePage("environment")}>查看本机状态</ActionButton>
              <ActionButton variant="ghost" onClick={() => setHelpOpen(true)}>打开帮助</ActionButton>
              <ActionButton variant="ghost" onClick={() => setSettingsOpen(true)}>打开设置</ActionButton>
            </>
          }
        />
      );
    }
    if (activePage === "project") {
      return (
        <ProjectPage
          data={data.project_page}
          hasUsableProject={currentProjectCanUse}
          projects={data.projects}
          selectedProjectRoot={projectRoot}
          onSelectProject={(path) => void selectProjectRoot(path)}
          onOpenPath={handleOpenPath}
          onOpenCodex={() => void handleOpenCodex()}
          onShowEnvironment={() => setActivePage("environment")}
          onShowHandoff={() => setActivePage("next-step")}
          onCopyProjectIntake={() => void copyProjectIntakeTemplate()}
        />
      );
    }
    if (activePage === "credibility") {
      return <CredibilityPage data={data.credibility_page} onOpenPath={handleOpenPath} />;
    }
    if (activePage === "next-step") {
      return (
        <NextStepPage
          data={data.next_step_page}
          history={handoffHistory.filter((item) => !projectKey || item.project_key === projectKey || item.project_root === projectRoot)}
          onCopyHandoff={copyHandoff}
          onCopyHistoryEntry={(entry) => void copyHandoffHistoryEntry(entry)}
          onClearHistory={clearHandoffHistory}
        />
      );
    }
    if (activePage === "deliverables") {
      return <DeliverablesPage data={data.deliverables_page} onOpenPath={handleOpenPath} />;
    }
    return (
      <EnvironmentPage
        data={data.environment_page}
        onRunValidator={handleRunValidator}
        diagnosticSummary={diagnosticSummary.text}
        onCopyDiagnostic={() => void copyDiagnosticSummary()}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    );
  }

  function recordHandoffHistory(handoff: Awaited<ReturnType<typeof getCodexHandoff>>) {
    const entry: HandoffHistoryEntry = {
      id: `${handoff.generated_at}:${createProjectKey(handoff.project.root)}`,
      project_name: handoff.project.name,
      project_key: createProjectKey(handoff.project.root),
      copied_at: new Date().toISOString(),
      handoff_generated_at: handoff.generated_at,
      handoff_version: handoff.handoff_version,
      recommended_action: data?.next_step_page?.recommended_action || handoff.safe_next_actions_for_codex[0] || "让 Codex 读取事实源并继续推进。",
      blocker_count: handoff.missing_inputs.length,
      excerpt: sanitizeHistoryExcerpt(handoff.text, handoff.project.root),
    };
    setHandoffHistory((previous) => {
      if (settings.handoffHistoryLimit <= 0) {
        writeHandoffHistory([], 0);
        return [];
      }
      const next = [entry, ...previous.filter((item) => item.id !== entry.id)].slice(0, settings.handoffHistoryLimit);
      writeHandoffHistory(next, settings.handoffHistoryLimit);
      return next;
    });
  }

  async function copyHandoffHistoryEntry(entry: HandoffHistoryEntry) {
    try {
      await copyText(formatHandoffHistorySummary(entry));
      setNotice("历史摘要已复制。");
    } catch (err) {
      setError(actionErrorMessage(err, "历史摘要没有复制成功。"));
    }
  }

  function clearHandoffHistory() {
    setHandoffHistory([]);
    writeHandoffHistory([], settings.handoffHistoryLimit);
    setNotice("本机摘要历史已清空。");
  }

  async function copyProjectIntakeTemplate() {
    try {
      await copyText(formatProjectIntakeTemplate(projectRoot));
      setNotice("项目接入说明已复制。请在 Codex 中把 <PROJECT_PATH> 替换为真实路径后发送。");
    } catch (err) {
      setError(actionErrorMessage(err, "项目接入说明没有复制成功。"));
    }
  }

  async function copyDiagnosticSummary() {
    try {
      await copyText(diagnosticSummary.text);
      setNotice("给 Codex 的本机摘要已复制，绝对路径已脱敏。");
    } catch (err) {
      setError(actionErrorMessage(err, "本机摘要没有复制成功。"));
    }
  }

  function dismissGuidePermanently() {
    setSettings((previous) => ({
      ...previous,
      firstRunGuideDismissed: true,
      lastSeenGuideVersion: GUIDE_VERSION,
    }));
    setGuideOpen(false);
  }

  function restartGuide() {
    setHelpOpen(false);
    setActivePage("project");
    setGuideOpen(true);
  }

  return (
    <AppShell
      active={activePage}
      onSelect={setActivePage}
      toolbar={
        <>
          {usableProjects.length > 0 ? (
            <ProjectSelector
              projects={usableProjects}
              selectedProjectRoot={projectRoot}
              disabled={loading}
              onSelect={(path) => void selectProjectRoot(path)}
            />
          ) : null}
          <ActionButton variant="ghost" onClick={() => void handleOpenCodex()} data-tour-id="open-codex">打开 Codex</ActionButton>
          <ActionButton variant="ghost" disabled={!currentProjectCanUse} onClick={() => void handleOpenPath(projectRoot ?? undefined)}>
            <FolderOpen size={16} />
            打开项目
          </ActionButton>
          <ActionButton variant="ghost" onClick={() => void refresh()} data-tour-id="refresh-dashboard">
            <RefreshCw size={16} />
            刷新
          </ActionButton>
          <ActionButton
            variant="primary"
            onClick={() => {
              if (!currentProjectCanUse) {
                void copyProjectIntakeTemplate();
                return;
              }
              if (activePage === "next-step") {
                void copyHandoff();
                return;
              }
              setActivePage("next-step");
            }}
            data-tour-id={!currentProjectCanUse ? "copy-project-intake" : activePage === "next-step" ? "copy-codex-instruction" : "show-codex-handoff"}
          >
            {!currentProjectCanUse ? "复制接入说明" : activePage === "next-step" ? "复制给 Codex" : "交给 Codex"}
          </ActionButton>
        </>
      }
      sidebarFooter={
        <div className="sidebar-utility-actions">
          <SettingsButton onClick={() => setSettingsOpen(true)} />
          <HelpButton onClick={() => setHelpOpen(true)} />
        </div>
      }
    >
      <Toast message={notice} />
      <Toast message={error} kind="error" />
      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        pageOptions={PAGES.map((page) => ({ key: page.key, title: page.title }))}
        historyCount={handoffHistory.length}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
        onClearHistory={clearHandoffHistory}
      />
      <HelpPanel
        open={helpOpen}
        unavailableProjectCount={unavailableProjectCount}
        onClose={() => setHelpOpen(false)}
        onCopyProjectIntake={() => void copyProjectIntakeTemplate()}
        onOpenCodex={() => void handleOpenCodex()}
        onShowEnvironment={() => {
          setHelpOpen(false);
          setActivePage("environment");
        }}
        onRestartGuide={restartGuide}
      />
      <GuidedTour
        open={guideOpen}
        activePage={activePage}
        onSelectPage={setActivePage}
        onClose={() => setGuideOpen(false)}
        onDismissPermanently={dismissGuidePermanently}
        onDismissPreferenceChange={(dismissed) => {
          setSettings((previous) => ({
            ...previous,
            firstRunGuideDismissed: dismissed,
            lastSeenGuideVersion: dismissed ? GUIDE_VERSION : previous.lastSeenGuideVersion,
          }));
        }}
      />
      {renderPage()}
    </AppShell>
  );
}

function readSettings(): HelmUserSettings {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(USER_SETTINGS_KEY) || "{}");
    const launchPage = isPageKey(parsed.launchPage) ? parsed.launchPage : DEFAULT_SETTINGS.launchPage;
    const displayDensity = parsed.displayDensity === "compact" ? "compact" : DEFAULT_SETTINGS.displayDensity;
    const reduceMotion = parsed.reduceMotion === "on" || parsed.reduceMotion === "off" ? parsed.reduceMotion : DEFAULT_SETTINGS.reduceMotion;
    const handoffHistoryLimit = [0, 5, 10, 20].includes(Number(parsed.handoffHistoryLimit))
      ? Number(parsed.handoffHistoryLimit)
      : DEFAULT_SETTINGS.handoffHistoryLimit;
    return {
      launchPage,
      rememberLastProject: typeof parsed.rememberLastProject === "boolean" ? parsed.rememberLastProject : DEFAULT_SETTINGS.rememberLastProject,
      displayDensity,
      reduceMotion,
      handoffHistoryLimit,
      firstRunGuideDismissed: typeof parsed.firstRunGuideDismissed === "boolean"
        ? parsed.firstRunGuideDismissed
        : DEFAULT_SETTINGS.firstRunGuideDismissed,
      lastSeenGuideVersion: typeof parsed.lastSeenGuideVersion === "string" ? parsed.lastSeenGuideVersion : DEFAULT_SETTINGS.lastSeenGuideVersion,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(value: HelmUserSettings) {
  try {
    window.localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(value));
  } catch {
    // Settings are optional local preferences.
  }
}

function isPageKey(value: unknown): value is PageKey {
  return typeof value === "string" && PAGES.some((page) => page.key === value);
}

function readStoredProject(): string | null {
  try {
    return window.localStorage.getItem(SELECTED_PROJECT_KEY) || null;
  } catch {
    return null;
  }
}

function writeStoredProject(value: string | null) {
  try {
    if (value) window.localStorage.setItem(SELECTED_PROJECT_KEY, value);
    else window.localStorage.removeItem(SELECTED_PROJECT_KEY);
  } catch {
    // Browser privacy modes can reject localStorage; selection still works for this session.
  }
}

function readDashboardCache(expectedProjectRoot?: string | null): DashboardCache | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DASHBOARD_CACHE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.schemaVersion !== DASHBOARD_CACHE_SCHEMA) return null;
    if (typeof parsed.savedAt !== "number" || !parsed.data?.product || !Array.isArray(parsed.data?.projects)) return null;
    const selectedProjectRoot = typeof parsed.selectedProjectRoot === "string" ? parsed.selectedProjectRoot : parsed.data.selected_project_root ?? null;
    if (expectedProjectRoot && selectedProjectRoot !== expectedProjectRoot) return null;
    return {
      schemaVersion: DASHBOARD_CACHE_SCHEMA,
      savedAt: parsed.savedAt,
      selectedProjectRoot,
      data: parsed.data as DashboardData,
    };
  } catch {
    return null;
  }
}

function writeDashboardCache(data: DashboardData, selectedProjectRoot?: string | null) {
  try {
    const cache: DashboardCache = {
      schemaVersion: DASHBOARD_CACHE_SCHEMA,
      savedAt: Date.now(),
      selectedProjectRoot: selectedProjectRoot ?? data.selected_project_root ?? null,
      data,
    };
    window.localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Dashboard cache is optional startup acceleration; live bridge remains authoritative.
  }
}

function isDashboardCacheFresh(cache: DashboardCache) {
  return Date.now() - cache.savedAt < DASHBOARD_CACHE_TTL_MS;
}

function shouldBypassDashboardCache() {
  try {
    return new URLSearchParams(window.location.search).get("scenario") === "empty";
  } catch {
    return false;
  }
}

function readHandoffHistory(limit = DEFAULT_SETTINGS.handoffHistoryLimit): HandoffHistoryEntry[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HANDOFF_HISTORY_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const entries = parsed
      .filter((item): item is HandoffHistoryEntry => Boolean(item?.id && item?.copied_at && (item?.project_key || item?.project_root)))
      .map((item) => {
        const root = typeof item.project_root === "string" ? item.project_root : "";
        const projectKey = item.project_key || createProjectKey(root || item.project_name || item.id);
        const stableTime = item.handoff_generated_at || item.copied_at || "handoff";
        const entry: HandoffHistoryEntry = {
          ...item,
          id: `${stableTime}:${projectKey}`,
          project_key: projectKey,
          project_root: undefined,
          excerpt: sanitizeHistoryExcerpt(String(item.excerpt ?? ""), root),
        };
        return entry;
      })
      .slice(0, limit);
    window.localStorage.setItem(HANDOFF_HISTORY_KEY, JSON.stringify(entries));
    return entries;
  } catch {
    return [];
  }
}

function writeHandoffHistory(value: HandoffHistoryEntry[], limit = DEFAULT_SETTINGS.handoffHistoryLimit) {
  try {
    window.localStorage.setItem(HANDOFF_HISTORY_KEY, JSON.stringify(value.slice(0, limit)));
  } catch {
    // Handoff history is an optional local convenience cache.
  }
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function sanitizeHistoryExcerpt(value: string, projectRoot?: string) {
  let text = value || "";
  const roots = [projectRoot, projectRoot?.split("\\").join("/")].filter((item): item is string => Boolean(item));
  for (const root of roots) {
    if (root.length > 2) text = text.split(root).join("<PROJECT_PATH>");
  }
  return text
    .replace(/[A-Za-z]:[\\/][^\r\n]+/g, "<LOCAL_PATH>")
    .replace(/(?:\/Users|\/home)\/[^\s\r\n]+/g, "<LOCAL_PATH>")
    .slice(0, 420);
}

function sanitizeDiagnosticText(value: string) {
  return (value || "")
    .replace(/[A-Za-z]:[\\/][^\r\n]+/g, "<LOCAL_PATH>")
    .replace(/(?:\/(?:Users|home|Volumes|tmp|var|opt|private|Applications)(?:\/[^\r\n]+)?)/g, "<LOCAL_PATH>")
    .replace(/\\\\[^\r\n]+/g, "<NETWORK_PATH>");
}

function formatProjectIntakeTemplate(projectRoot?: string | null) {
  const pathPlaceholder = projectRoot ? "<PROJECT_PATH>" : "<PROJECT_PATH>";
  return [
    "HELM 项目接入说明",
    "",
    `项目路径：${pathPlaceholder}`,
    "",
    "请在 Codex 中读取该项目，并优先让 VELA 准备 HELM 可读状态：",
    "0. 确认 Codex 可以读取该项目路径；若缺失，请让 Codex 在本机配置中登记该路径。",
    "1. 如果这是新项目，请运行：vela init <PROJECT_PATH>。",
    "2. 如果这是旧 VELA 项目，请运行：vela export-helm-context <PROJECT_PATH> 或 vela validate <PROJECT_PATH> --repair-context。",
    "3. 确认 <PROJECT_PATH>/.vela/context.json 存在，且 schema_version 是 vela.project.context.v1。",
    "4. 不要让 HELM 创建研究材料；研究推进和判断仍回到 Codex 完成。",
    "项目说明：请让 Codex 读取 README、AGENTS.md 和 .vela/context.json，确认研究阶段、当前阻塞项和下一步边界。",
    "材料清单：请让 Codex 检查 materials/、evidence/、claims/、methods/、deliverables/ 和 handoffs/helm/ 是否齐备。",
    "",
    "如果刷新后项目仍未出现，请让 Codex 检查本机项目配置是否包含该路径，并确认 .vela/context.json 没有语法错误。",
    "",
    "边界：HELM 不创建项目、不登记路径、不写研究材料；研究推进、写作、引用核验和判断都由 Codex 执行并由用户确认。",
  ].join("\n");
}

function createDiagnosticSummary(
  data: DashboardData | null,
  latestError: string,
  settings: HelmUserSettings,
  projectRoot?: string | null,
): DiagnosticSummary {
  const missing = data?.project_page?.missing_inputs?.slice(0, 6) ?? [];
  const validators = data?.environment_page?.validators ?? [];
  const failedValidators = validators
    .filter((item) => item.tone === "red" || item.blocking)
    .map((item) => displayActionText(item.label));
  const sourceMode = String(data?.source_status?.mode ?? data?.runtime?.mode ?? "unknown");
  const runtimeMode = String(data?.runtime?.mode ?? "unknown");
  const selectedProjectState = data?.project_page?.project?.exists
    ? "trusted_project_detected"
    : data
      ? "no_trusted_project_or_public_sample"
      : "dashboard_unavailable";
  const lines = [
    "HELM 本机摘要",
    `生成时间：${new Date().toISOString()}`,
    `本机读取状态：${formatReadableSourceMode(runtimeMode)}`,
    `数据来源：${formatReadableSourceMode(sourceMode)}`,
    `当前项目状态：${formatDiagnosticState(selectedProjectState)}`,
    `当前项目路径：${projectRoot ? "<PROJECT_PATH>" : "未选择"}`,
    `本地检查：${failedValidators.length ? `需检查 ${failedValidators.join(", ")}` : "未发现阻断级问题"}`,
    `最近错误：${latestError ? sanitizeDiagnosticText(latestError) : "无"}`,
    `设置：启动页=${formatPageName(settings.launchPage)}；记住项目=${settings.rememberLastProject ? "开启" : "关闭"}；显示密度=${formatDisplayDensity(settings.displayDensity)}；减少动效=${formatMotionSetting(settings.reduceMotion)}；本机摘要历史=最多 ${settings.handoffHistoryLimit} 条`,
    "缺失项：",
    ...(missing.length ? missing.map((item) => `- ${sanitizeDiagnosticText(displayActionText(item))}`) : ["- 未读取到显式缺失项"]),
    "建议检查命令：",
    "- cd apps/desktop && npm run build",
    "- python -m py_compile skills/scripts/helm_app_bridge.py skills/manager/research_env.py skills/manager/app.py",
    "- cd apps/desktop/src-tauri && cargo check",
  ];
  return {
    generated_at: new Date().toISOString(),
    text: sanitizeDiagnosticText(lines.join("\n")),
  };
}

function createProjectKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `project-${(hash >>> 0).toString(36)}`;
}

function formatHandoffHistorySummary(entry: HandoffHistoryEntry) {
  return [
    "HELM 本机摘要",
    `项目：${entry.project_name}`,
    `复制时间：${formatLocalTime(entry.copied_at)}`,
    `说明版本：${entry.handoff_version}`,
    `阻断数：${entry.blocker_count}`,
    `建议交给 Codex：${displayActionText(entry.recommended_action)}`,
    "",
    "短摘要：",
    displayActionText(entry.excerpt || "无摘要"),
  ].join("\n");
}

function isUsableProject(project: { path?: string; exists?: boolean; status?: string; current_stage?: string; error?: string }) {
  if (!project.path || project.exists === false) return false;
  const status = `${project.status || ""} ${project.current_stage || ""} ${project.error || ""}`.toLowerCase();
  if (/untrusted|not_trusted|path_not_found|not found|not_exist|不可读取|路径不存在|未检测/.test(status)) return false;
  return true;
}

function formatDiagnosticState(value: string) {
  const labels: Record<string, string> = {
    trusted_project_detected: "已接入项目",
    no_trusted_project_or_public_sample: "未检测到可用项目或正在显示公开示例",
    dashboard_unavailable: "未读取到看板数据",
  };
  return labels[value] ?? value;
}

function formatPageName(value: PageKey | string) {
  return PAGES.find((page) => page.key === value)?.label ?? "项目";
}

function formatDisplayDensity(value: HelmUserSettings["displayDensity"]) {
  return value === "compact" ? "紧凑" : "标准";
}

function formatMotionSetting(value: HelmUserSettings["reduceMotion"]) {
  if (value === "on") return "已开启";
  if (value === "off") return "已关闭";
  return "跟随系统";
}

function formatReadableSourceMode(value: string) {
  const labels: Record<string, string> = {
    live_environment: "正在读取本机环境",
    legacy_app_snapshot: "使用兼容数据",
    demo_snapshot: "使用内置示例",
    public_sample: "使用公开示例",
    snapshot: "使用内置示例",
    browser_mock: "浏览器预览",
    unknown: "未检测到",
  };
  return labels[value] ?? displayActionText(value);
}

function formatLocalTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function actionErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return fallback;
}

export default App;
