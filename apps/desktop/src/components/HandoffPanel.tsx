import { ClipboardCheck } from "lucide-react";
import type { CodexHandoff } from "../types";
import { ActionButton } from "./ActionButton";

export function HandoffPanel({ handoff, onCopy }: { handoff: CodexHandoff; onCopy: () => void }) {
  return (
    <section className="handoff-panel">
      <div>
        <span className="eyebrow">Codex handoff</span>
        <h2>交给 Codex</h2>
        <p>这不是执行按钮。它只生成一份包含依据文件、缺口、阻断项和禁止声称内容的交接单。</p>
      </div>
      <div className="handoff-preview">
        <pre>{handoff.text}</pre>
      </div>
      <ActionButton variant="primary" onClick={onCopy}>
        <ClipboardCheck size={18} />
        复制交接单
      </ActionButton>
    </section>
  );
}
