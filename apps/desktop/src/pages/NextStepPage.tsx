import { EmptyState } from "../components/EmptyState";
import { EvidenceCard } from "../components/EvidenceCard";
import { FileCard } from "../components/FileCard";
import { HandoffHistory } from "../components/HandoffHistory";
import { HandoffPanel } from "../components/HandoffPanel";
import type { HandoffHistoryEntry, NextStepPageData } from "../types";

export function NextStepPage({
  data,
  history,
  onOpenPath,
  onCopyHandoff,
  onCopyHistoryEntry,
  onClearHistory,
}: {
  data?: NextStepPageData;
  history: HandoffHistoryEntry[];
  onOpenPath: (path?: string) => void;
  onCopyHandoff: () => void;
  onCopyHistoryEntry: (entry: HandoffHistoryEntry) => void;
  onClearHistory: () => void;
}) {
  if (!data) return <EmptyState title="暂时不能推荐下一步" body="没有项目状态时，不生成任务建议。" />;
  return (
    <div className="page-grid next-page">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Next step</span>
          <h2>{data.recommended_action}</h2>
          <p>{data.rationale}</p>
        </div>
      </section>

      <section className="card">
        <h3>前置条件</h3>
        <div className="stack">
          {data.preconditions.map((item, index) => <EvidenceCard key={index} item={item} compact />)}
        </div>
      </section>

      <section className="card">
        <h3>阻断项</h3>
        {data.blockers.length ? (
          <ul className="plain-list">
            {data.blockers.map((item) => <li key={item}>{item}</li>)}
          </ul>
        ) : (
          <EmptyState title="没有显式阻断" body="仍需由 Codex 读取事实源后确认推进路径。" />
        )}
      </section>

      <section className="card">
        <h3>相关文件</h3>
        <div className="file-grid">
          {data.related_files.length ? data.related_files.map((file, index) => <FileCard key={index} file={file} onOpen={onOpenPath} />) : <EmptyState title="没有相关文件" body="缺文件时只生成阻断交接单。" />}
        </div>
      </section>

      <div className="span-2">
        <HandoffPanel handoff={data.handoff} onCopy={onCopyHandoff} />
      </div>

      <HandoffHistory entries={history} onCopyEntry={onCopyHistoryEntry} onClearHistory={onClearHistory} />
    </div>
  );
}
