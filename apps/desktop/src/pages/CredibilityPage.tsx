import { EmptyState } from "../components/EmptyState";
import { EvidenceCard } from "../components/EvidenceCard";
import { FileCard } from "../components/FileCard";
import type { CredibilityPageData } from "../types";

export function CredibilityPage({ data, onOpenPath }: { data?: CredibilityPageData; onOpenPath: (path?: string) => void }) {
  if (!data) return <EmptyState title="未读取证据状态" body="这里只显示有来源的本地证据状态。" />;
  return (
    <div className="page-grid credibility-page">
      <section className="hero-panel span-2">
        <div>
          <span className="eyebrow">证据状态</span>
          <h2>不提供一键打分</h2>
          <p>{data.warning || "本页只回答本地证据是否足以继续推进，不判断研究结论必然成立。"}</p>
        </div>
        <div className="judgment-grid">
          {data.judgments.map((item, index) => <EvidenceCard key={index} item={item} compact />)}
        </div>
      </section>

      <section className="card">
        <h3>项目资料</h3>
        <div className="stack">
          {data.truth_sources.length ? data.truth_sources.map((item, index) => <EvidenceCard key={index} item={item} compact />) : <EmptyState title="缺少项目资料" body="还没有读到项目说明、材料清单或证据记录。" />}
        </div>
      </section>

      <section className="card">
        <h3>检查记录</h3>
        <div className="stack">
          {data.gate_reports.length ? data.gate_reports.map((item, index) => <EvidenceCard key={index} item={item} compact />) : <EmptyState title="尚未发现检查记录" body="没有检查记录时，HELM 不会显示通过状态。" />}
        </div>
      </section>

      <section className="card span-2">
        <h3>依据来源</h3>
        <div className="file-grid">
          {data.source_files.length ? data.source_files.map((file, index) => <FileCard key={index} file={file} onOpen={onOpenPath} />) : <EmptyState title="未发现依据文件" body="请先让 Codex 补齐材料目录或证据记录。" />}
        </div>
      </section>
    </div>
  );
}
