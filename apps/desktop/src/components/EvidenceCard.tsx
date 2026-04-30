import { AlertTriangle, CheckCircle2, CircleDashed, FileText } from "lucide-react";
import { displayDetail, displayLabel, displaySourcePath } from "../displayText";
import { evidenceLevelLabel, evidenceSourceLabel, isDemo, preciseStatus, toneForEvidence } from "../status";
import type { EvidenceStatus } from "../types";
import { StatusBadge } from "./StatusBadge";

export function EvidenceCard({ item, compact = false }: { item: EvidenceStatus; compact?: boolean }) {
  const tone = toneForEvidence(item);
  const Icon = item.blocking ? AlertTriangle : tone === "green" ? CheckCircle2 : tone === "gray" ? CircleDashed : FileText;
  const sourceLabel = evidenceSourceLabel(item.evidence_source);
  const sourcePathLabel = displaySourcePath(item.source_path);
  return (
    <article className={`evidence-card ${tone} ${compact ? "compact" : ""}`}>
      <div className="evidence-icon">
        <Icon size={18} />
      </div>
      <div className="evidence-body">
        <div className="evidence-title-row">
          <h3 title={item.label}>{displayLabel(item.label)}</h3>
          <StatusBadge tone={tone}>{preciseStatus(item)}</StatusBadge>
        </div>
        <p title={item.detail || item.status}>{displayDetail(item.detail || item.status)}</p>
        <div className="evidence-meta">
          <span>{evidenceLevelLabel(item.evidence_level)}</span>
          <span>{sourceLabel}</span>
          {item.source_path && sourcePathLabel && sourcePathLabel !== sourceLabel ? <span title={item.source_path}>{sourcePathLabel}</span> : null}
          {isDemo(item) ? <StatusBadge tone="amber">演示数据</StatusBadge> : null}
        </div>
      </div>
    </article>
  );
}
