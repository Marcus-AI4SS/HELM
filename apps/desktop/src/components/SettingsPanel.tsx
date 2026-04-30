import { X } from "lucide-react";
import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import type { HelmUserSettings, PageKey } from "../types";

interface PageOption {
  key: PageKey;
  title: string;
}

export function SettingsPanel({
  open,
  settings,
  pageOptions,
  historyCount,
  onChange,
  onClose,
  onClearHistory,
}: {
  open: boolean;
  settings: HelmUserSettings;
  pageOptions: PageOption[];
  historyCount: number;
  onChange: (settings: HelmUserSettings) => void;
  onClose: () => void;
  onClearHistory: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const target = panelRef.current?.querySelector<HTMLElement>("[data-testid='settings-launch-page']") ?? panelRef.current;
    window.setTimeout(() => target?.focus(), 0);
  }, [open]);

  if (!open) return null;

  const update = <K extends keyof HelmUserSettings>(key: K, value: HelmUserSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const updateCheckbox = (event: ChangeEvent<HTMLInputElement>) => {
    update("rememberLastProject", event.target.checked);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = panelRef.current
      ? Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            "button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex='-1'])",
          ),
        ).filter((item) => item.offsetParent !== null)
      : [];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="settings-overlay" role="presentation" onMouseDown={onClose}>
      <aside
        className="settings-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="HELM 基础设置"
        onKeyDown={handleKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="settings-panel-header">
          <div>
            <span className="eyebrow">设置</span>
            <h2>基础设置</h2>
            <p>设置只保存在这台电脑上，不写项目文件，也不改你的研究环境。</p>
          </div>
          <button type="button" className="settings-close" onClick={onClose} aria-label="关闭设置">
            <X size={18} />
          </button>
        </div>

        <div className="settings-section">
          <label className="setting-row">
            <span>
              <strong>启动页</strong>
              <small>下次打开 HELM 时优先显示的页面。</small>
            </span>
            <select
              data-testid="settings-launch-page"
              value={settings.launchPage}
              onChange={(event) => update("launchPage", event.target.value as PageKey)}
            >
              {pageOptions.map((page) => (
                <option key={page.key} value={page.key}>
                  {page.title}
                </option>
              ))}
            </select>
          </label>

          <label className="setting-row toggle-row">
            <span>
              <strong>记住上次项目</strong>
              <small>关闭后会移除本机保存的上次项目路径。</small>
            </span>
            <input
              data-testid="settings-remember-project"
              type="checkbox"
              checked={settings.rememberLastProject}
              onChange={updateCheckbox}
            />
          </label>

          <label className="setting-row">
            <span>
              <strong>显示密度</strong>
              <small>紧凑模式会减少卡片留白，适合小窗口。</small>
            </span>
            <select
              data-testid="settings-density"
              value={settings.displayDensity}
              onChange={(event) => update("displayDensity", event.target.value as HelmUserSettings["displayDensity"])}
            >
              <option value="standard">标准</option>
              <option value="compact">紧凑</option>
            </select>
          </label>

          <label className="setting-row">
            <span>
              <strong>减少动效</strong>
              <small>跟随系统时使用操作系统的减弱动效设置。</small>
            </span>
            <select
              data-testid="settings-reduce-motion"
              value={settings.reduceMotion}
              onChange={(event) => update("reduceMotion", event.target.value as HelmUserSettings["reduceMotion"])}
            >
              <option value="system">跟随系统</option>
              <option value="on">开启</option>
              <option value="off">关闭</option>
            </select>
          </label>

          <label className="setting-row">
            <span>
              <strong>交接历史保留</strong>
              <small>只保存脱敏摘要，不保存完整研究材料。</small>
            </span>
            <select
              data-testid="settings-history-limit"
              value={settings.handoffHistoryLimit}
              onChange={(event) => update("handoffHistoryLimit", Number(event.target.value))}
            >
              <option value={0}>不保留</option>
              <option value={5}>最多 5 条</option>
              <option value={10}>最多 10 条</option>
              <option value={20}>最多 20 条</option>
            </select>
          </label>
        </div>

        <div className="settings-footer">
          <div>
            <strong>本机交接摘要</strong>
            <small>当前保存 {historyCount} 条。</small>
          </div>
          <button type="button" className="action-button secondary" onClick={onClearHistory}>
            清空本机历史
          </button>
        </div>
      </aside>
    </div>
  );
}
