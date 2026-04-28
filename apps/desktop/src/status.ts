import type { EvidenceLevel, EvidenceSource, EvidenceStatus, Tone } from "./types";

const levelLabel: Record<EvidenceLevel, string> = {
  missing: "缺失",
  file_read: "文件读取",
  field_scanned: "字段扫描",
  configured: "配置态",
  openable: "可打开",
  validator_ran: "可执行校验",
  end_to_end_success: "端到端成功",
};

const sourceLabel: Record<EvidenceSource, string> = {
  path: "本地路径",
  config: "配置",
  runtime: "运行时",
  validator: "校验器",
  manual_open: "手动打开",
  codex_log: "Codex 日志",
  snapshot: "快照",
  demo: "演示数据",
};

export function toneForEvidence(item?: Partial<EvidenceStatus> | null): Tone {
  if (!item) return "gray";
  if (item.blocking) return "red";
  if (item.tone) return item.tone as Tone;
  if (item.evidence_level === "end_to_end_success" || item.evidence_level === "validator_ran") return "green";
  if (item.evidence_level === "missing") return "amber";
  return "blue";
}

export function evidenceLevelLabel(level?: EvidenceLevel): string {
  return level ? levelLabel[level] : "未知";
}

export function evidenceSourceLabel(source?: EvidenceSource): string {
  return source ? sourceLabel[source] : "未知来源";
}

export function preciseStatus(item: Partial<EvidenceStatus>): string {
  if (item.evidence_level === "configured") return "配置中已启用";
  if (item.evidence_level === "openable") return "可尝试打开";
  if (item.evidence_level === "validator_ran") return item.returncode === 0 ? "校验通过" : "校验未通过";
  if (item.evidence_level === "file_read") return "已读取本地文件";
  if (item.evidence_level === "field_scanned") return "已扫描字段";
  if (item.evidence_level === "end_to_end_success") return "端到端成功";
  return item.status || "未发现本地证据";
}

export function isDemo(item?: Partial<EvidenceStatus> | null): boolean {
  return item?.evidence_source === "demo";
}
