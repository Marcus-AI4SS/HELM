import { BookOpen, ClipboardCopy, ExternalLink, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { ActionButton } from "./ActionButton";

export function HelpPanel({
  open,
  unavailableProjectCount,
  onClose,
  onCopyProjectIntake,
  onOpenCodex,
  onShowEnvironment,
  onRestartGuide,
}: {
  open: boolean;
  unavailableProjectCount: number;
  onClose: () => void;
  onCopyProjectIntake: () => void;
  onOpenCodex: () => void;
  onShowEnvironment: () => void;
  onRestartGuide: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const target = panelRef.current?.querySelector<HTMLElement>("[data-help-focus]") ?? panelRef.current;
    window.setTimeout(() => target?.focus(), 0);
  }, [open]);

  if (!open) return null;

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
            "button:not(:disabled), summary, [tabindex]:not([tabindex='-1'])",
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
    <div className="help-overlay" role="presentation" onMouseDown={onClose}>
      <aside
        className="help-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="HELM 使用帮助"
        onKeyDown={handleKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="help-panel-header">
          <div>
            <span className="eyebrow">使用帮助</span>
            <h2>不知道点哪里，先看这里</h2>
            <p>这里按“你想完成什么”告诉你该去哪个页面、该点哪个按钮。HELM 只帮你看清本机状态，继续研究仍回到 Codex。</p>
          </div>
          <button type="button" className="settings-close" onClick={onClose} aria-label="关闭帮助">
            <X size={18} />
          </button>
        </div>

        <div className="help-panel-body">
          <section className="help-card primary-help">
            <div>
              <h3>5 分钟上手</h3>
              <ol className="help-steps">
                <li>先看“项目”页，确认 HELM 是否已经看到你的项目。</li>
                <li>如果没有项目，点“复制接入说明”，粘贴到 Codex，并补上真实项目路径。</li>
                <li>等 Codex 按你的确认检查项目文件夹后，回到 HELM 点“刷新”。</li>
                <li>先看项目缺口，再看证据和文件；遇到问题就去“本机”。</li>
                <li>需要继续推进时，到“交给 Codex”页复制说明，再回 Codex 发送。</li>
              </ol>
            </div>
            <div className="help-actions">
              <ActionButton data-help-focus variant="primary" onClick={onCopyProjectIntake}>
                <ClipboardCopy size={16} />
                复制接入说明
              </ActionButton>
              <ActionButton variant="secondary" onClick={onOpenCodex}>
                <ExternalLink size={16} />
                打开 Codex
              </ActionButton>
              <ActionButton variant="ghost" onClick={onRestartGuide}>
                <RotateCcw size={16} />
                重新看向导
              </ActionButton>
            </div>
          </section>

          <section className="help-card">
            <h3>我想做什么</h3>
            <ul className="help-lookup-list">
              <li><strong>我还没有项目</strong><span>去“项目”页，点“复制接入说明”，再交给 Codex。</span></li>
              <li><strong>我想换一个项目</strong><span>用顶部“当前项目”下拉框，或在“项目”页选择可用项目。</span></li>
              <li><strong>我想知道材料够不够</strong><span>去“证据”页，看项目资料和检查记录。</span></li>
              <li><strong>我想继续交给 Codex</strong><span>去“交给 Codex”页，复制已经整理好的继续说明。</span></li>
              <li><strong>我想打开文稿、图表或报告</strong><span>去“文件”页，打开本机已有文件。</span></li>
              <li><strong>我怀疑电脑环境有问题</strong><span>去“本机”页，运行本地检查或复制本机诊断。</span></li>
            </ul>
          </section>

          <section className="help-card">
            <h3>五个页面分别干什么</h3>
            <div className="help-page-reference">
              <article>
                <strong>项目</strong>
                <span>确认 HELM 正在看哪个项目，快速切换项目，查看当前缺口。</span>
                <small>常用按钮：打开项目、刷新、复制接入说明。</small>
              </article>
              <article>
                <strong>证据</strong>
                <span>查看项目资料、证据记录和检查结果是否已经读到。</span>
                <small>常用按钮：打开依据来源、筛选缺失或阻断项。</small>
              </article>
              <article>
                <strong>交给 Codex</strong>
                <span>把当前项目状态整理成一段可复制说明，便于回到 Codex 继续。</span>
                <small>常用按钮：复制给 Codex、打开 Codex。</small>
              </article>
              <article>
                <strong>文件</strong>
                <span>打开已有文稿、图表、报告、整理包，不在 HELM 里新生成内容。</span>
                <small>常用按钮：打开文件、查看文件夹。</small>
              </article>
              <article>
                <strong>本机</strong>
                <span>检查这台电脑是否具备继续读取项目的条件。</span>
                <small>常用按钮：运行本地检查、复制本机诊断、打开设置。</small>
              </article>
            </div>
          </section>

          <section className="help-card">
            <h3>卡住时怎么判断</h3>
            <dl className="help-faq">
              <dt>为什么我看不到自己的项目？</dt>
              <dd>先把接入说明交给 Codex，让 Codex 读取你的项目文件夹。HELM 不会在界面里新建或登记项目。</dd>
              <dt>项目显示有缺口怎么办？</dt>
              <dd>这不是错误，而是提醒你还有内容需要回到 Codex 处理。进入“交给 Codex”页复制说明，再让 Codex 继续。</dd>
              <dt>文件打不开怎么办？</dt>
              <dd>先去“本机”页复制本机诊断，交给 Codex 排查路径、权限或文件是否仍存在。</dd>
              <dt>为什么有些项目不在列表里？</dt>
              <dd>读取不到、路径失效或还没接入的项目不会放进主列表，避免误点。{unavailableProjectCount > 0 ? `当前有 ${unavailableProjectCount} 个项目暂时不可读取。` : ""}</dd>
              <dt>HELM 会不会改我的研究材料？</dt>
              <dd>不会。HELM 只读取状态、打开文件、复制说明；写作、判断和引用核验都在 Codex 中继续。</dd>
            </dl>
          </section>

          <section className="help-card">
            <h3>macOS 用户怎么用</h3>
            <p>使用同一个公开仓库和同一套功能。macOS 只是在安装步骤上多一段引导，打开后的页面和使用方式保持一致。</p>
          </section>

          <details className="help-card advanced-help">
            <summary>
              <BookOpen size={16} />
              高级说明
            </summary>
            <p>如果你让 Codex 接入项目，它会检查项目说明、材料清单、证据记录和阶段性发现。高级用户可以在项目根目录中看到对应的本地文件。</p>
            <ActionButton variant="secondary" onClick={onShowEnvironment}>查看本机诊断</ActionButton>
          </details>
        </div>
      </aside>
    </div>
  );
}
