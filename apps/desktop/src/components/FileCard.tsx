import { ExternalLink, FileText } from "lucide-react";
import type { FileRow } from "../types";
import { StatusBadge } from "./StatusBadge";

export function FileCard({ file, onOpen }: { file: FileRow; onOpen?: (path?: string) => void }) {
  const isDemo = file.evidence_source === "demo";
  const isVerified = file.evidence_level === "validator_ran" || file.evidence_level === "end_to_end_success";
  const label = isDemo ? "演示数据" : file.status || (file.exists ? "可读文件" : "缺失");
  const tone = isDemo ? "amber" : isVerified ? "green" : file.exists ? "blue" : "amber";
  const title = file.label || file.name || "文件";
  const path = file.path || "未提供路径";
  return (
    <button type="button" className="file-card" onClick={() => onOpen?.(file.path)} disabled={!file.path}>
      <FileText size={17} />
      <span>
        <strong title={title}>{title}</strong>
        <small title={path}>{path}</small>
      </span>
      <StatusBadge tone={tone}>{label}</StatusBadge>
      <ExternalLink size={15} />
    </button>
  );
}
