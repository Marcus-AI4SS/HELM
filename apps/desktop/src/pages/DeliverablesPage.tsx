import { EmptyState } from "../components/EmptyState";
import { EvidenceCard } from "../components/EvidenceCard";
import { FileCard } from "../components/FileCard";
import type { DeliverablesPageData } from "../types";

export function DeliverablesPage({ data, onOpenPath }: { data?: DeliverablesPageData; onOpenPath: (path?: string) => void }) {
  if (!data) return <EmptyState title="未读取交付物" body="交付物页只浏览已有本地文件和 gate 状态。" />;
  const singleGroup = data.deliverables.length === 1;
  return (
    <div className="page-grid deliverables-page">
      {data.deliverables.map((group) => (
        <section className={`card deliverable-group ${singleGroup ? "span-2" : ""}`} key={group.label}>
          <h3>{group.label}</h3>
          <p>{group.description}</p>
          <EvidenceCard item={group.status} compact />
          <div className="file-grid">
            {group.files.length ? group.files.map((file, index) => <FileCard key={index} file={file} onOpen={onOpenPath} />) : <EmptyState title="未发现文件" body="没有真实文件时不显示完成态。" />}
          </div>
        </section>
      ))}
      <section className="card span-2">
        <h3>交付 gate</h3>
        <div className="stack">
          {data.gate_status.length ? data.gate_status.map((item, index) => <EvidenceCard key={index} item={item} compact />) : <EmptyState title="没有 gate 报告" body="不能把交付物状态写成已完成。" />}
        </div>
      </section>
    </div>
  );
}
