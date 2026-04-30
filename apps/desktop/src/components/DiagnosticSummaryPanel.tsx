import { ClipboardCopy, Settings } from "lucide-react";
import { ActionButton } from "./ActionButton";

export function DiagnosticSummaryPanel({
  summary,
  onCopy,
  onOpenSettings,
}: {
  summary: string;
  onCopy: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <section className="card span-2 diagnostic-panel">
      <div className="section-header">
        <div>
          <h3>本机诊断摘要</h3>
          <p>用于排查电脑状态；正式继续研究的说明请到“交给 Codex”页复制。</p>
        </div>
        <div className="diagnostic-actions">
          <ActionButton variant="secondary" onClick={onCopy}>
            <ClipboardCopy size={16} />
            复制本机诊断
          </ActionButton>
          <ActionButton variant="ghost" onClick={onOpenSettings}>
            <Settings size={16} />
            打开设置
          </ActionButton>
        </div>
      </div>
      <details className="diagnostic-details">
        <summary>查看摘要内容</summary>
        <pre tabIndex={0} aria-label="HELM 诊断摘要文本">{summary}</pre>
      </details>
    </section>
  );
}
