import { EmptyState } from "../components/EmptyState";
import { EvidenceCard } from "../components/EvidenceCard";
import { HandoffHistory } from "../components/HandoffHistory";
import { HandoffPanel } from "../components/HandoffPanel";
import { PlainFileList } from "../components/PlainFileList";
import { displayActionText } from "../displayText";
import type { HandoffHistoryEntry, NextStepPageData } from "../types";

export function NextStepPage({
  data,
  history,
  onCopyHandoff,
  onCopyHistoryEntry,
  onClearHistory,
}: {
  data?: NextStepPageData;
  history: HandoffHistoryEntry[];
  onCopyHandoff: () => void;
  onCopyHistoryEntry: (entry: HandoffHistoryEntry) => void;
  onClearHistory: () => void;
}) {
  if (!data) return <EmptyState title="暂时不能生成给 Codex 的说明" body="没有项目状态时，不给出继续说明。" />;
  return (
    <div className="page-grid next-page">
      <section className="hero-panel span-2">
        <div>
          <span className="eyebrow">交给 Codex</span>
          <h2 title={data.recommended_action}>{displayActionText(data.recommended_action)}</h2>
          <p title={data.rationale}>{displayActionText(data.rationale)}</p>
        </div>
      </section>

      <div className="span-2">
        <HandoffPanel handoff={data.handoff} onCopy={onCopyHandoff} />
      </div>

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
            {data.blockers.map((item) => <li key={item}>{displayActionText(item)}</li>)}
          </ul>
        ) : (
          <EmptyState title="没有显式阻断" body="仍需由 Codex 读取项目资料后确认推进路径。" />
        )}
      </section>

      <section className="card span-2">
        <h3>说明依据</h3>
        <p className="muted-copy">这里只显示这份说明参考了哪些材料；需要打开材料或产物时，请去“证据”或“文件”页。</p>
        <PlainFileList files={data.related_files} emptyTitle="没有可展示的依据文件" limit={6} />
      </section>

      <HandoffHistory entries={history} onCopyEntry={onCopyHistoryEntry} onClearHistory={onClearHistory} />
    </div>
  );
}
