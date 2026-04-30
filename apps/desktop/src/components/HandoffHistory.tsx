import { Clock3, Copy, Trash2 } from "lucide-react";
import { displayActionText } from "../displayText";
import type { HandoffHistoryEntry } from "../types";
import { ActionButton } from "./ActionButton";
import { StatusBadge } from "./StatusBadge";

export function HandoffHistory({
  entries,
  onCopyEntry,
  onClearHistory,
}: {
  entries: HandoffHistoryEntry[];
  onCopyEntry: (entry: HandoffHistoryEntry) => void;
  onClearHistory: () => void;
}) {
  return (
    <section className="card span-2 handoff-history-card">
      <div className="section-header">
        <div>
          <h3>本机摘要历史</h3>
          <p>仅保存项目名、时间、阻断数和脱敏短摘要；不保存完整研究材料或本机路径。</p>
        </div>
        <div className="history-actions">
          <StatusBadge tone="blue">最多 20 条</StatusBadge>
          {entries.length ? (
            <ActionButton variant="ghost" onClick={onClearHistory}>
              <Trash2 size={15} />
              清空摘要
            </ActionButton>
          ) : null}
        </div>
      </div>
      {entries.length ? (
        <div className="handoff-history-list">
          {entries.map((entry) => (
            <article className="handoff-history-item" key={entry.id}>
              <Clock3 size={17} />
              <div>
                <strong>{entry.project_name}</strong>
                <small>{formatTime(entry.copied_at)} · 本机摘要</small>
                <p title={entry.recommended_action}>{displayActionText(entry.recommended_action)}</p>
                <p className="history-excerpt">{displayActionText(entry.excerpt)}</p>
              </div>
              <div className="history-entry-actions">
                <StatusBadge tone={entry.blocker_count ? "amber" : "blue"}>{entry.blocker_count} 个阻断</StatusBadge>
                <ActionButton variant="ghost" onClick={() => onCopyEntry(entry)}>
                  <Copy size={15} />
                  复制摘要
                </ActionButton>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted-copy">复制给 Codex 后，这里会记录本机摘要，方便确认最近发送过什么上下文。</p>
      )}
    </section>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}
