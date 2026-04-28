import { AlertTriangle, CheckCircle2, CircleDashed, FileText } from "lucide-react";
import { evidenceLevelLabel, evidenceSourceLabel, isDemo, preciseStatus, toneForEvidence } from "../status";
import type { EvidenceStatus } from "../types";
import { StatusBadge } from "./StatusBadge";

export function EvidenceCard({ item, compact = false }: { item: EvidenceStatus; compact?: boolean }) {
  const tone = toneForEvidence(item);
  const Icon = item.blocking ? AlertTriangle : tone === "green" ? CheckCircle2 : tone === "gray" ? CircleDashed : FileText;
  return (
    <article className={`evidence-card ${tone} ${compact ? "compact" : ""}`}>
      <div className="evidence-icon">
        <Icon size={18} />
      </div>
      <div className="evidence-body">
        <div className="evidence-title-row">
          <h3>{item.label}</h3>
          <StatusBadge tone={tone}>{preciseStatus(item)}</StatusBadge>
        </div>
        <p>{item.detail || item.status}</p>
        <div className="evidence-meta">
          <span>{evidenceLevelLabel(item.evidence_level)}</span>
          <span>{evidenceSourceLabel(item.evidence_source)}</span>
          {item.source_path ? <span title={item.source_path}>{item.source_path}</span> : null}
          {isDemo(item) ? <StatusBadge tone="amber">演示数据</StatusBadge> : null}
        </div>
      </div>
    </article>
  );
}
