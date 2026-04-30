import { ClipboardCheck } from "lucide-react";
import { displayActionText } from "../displayText";
import type { CodexHandoff } from "../types";
import { ActionButton } from "./ActionButton";

export function HandoffPanel({ handoff, onCopy }: { handoff: CodexHandoff; onCopy: () => void }) {
  return (
    <section className="handoff-panel">
      <div>
        <span className="eyebrow">给 Codex 的说明</span>
        <h2>复制给 Codex</h2>
        <p>这不是执行研究或写作的按钮，只复制一份给 Codex 继续判断的上下文。</p>
      </div>
      <div className="handoff-preview">
        <pre>{formatHandoffPreview(handoff.text)}</pre>
      </div>
      <ActionButton variant="primary" onClick={onCopy} data-tour-id="copy-codex-instruction">
        <ClipboardCheck size={18} />
        复制给 Codex
      </ActionButton>
    </section>
  );
}

function formatHandoffPreview(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => displayActionText(line))
    .join("\n")
    .replace(/[A-Za-z]:[\\/][^\r\n]+/g, "<本机路径>")
    .replace(/(?:\/Users|\/home)\/[^\s\r\n]+/g, "<本机路径>");
}
