import type { EvidenceLevel, EvidenceSource, EvidenceStatus, Tone } from "./types";

const levelLabel: Record<EvidenceLevel, string> = {
  missing: "缺失",
  file_read: "已读到文件",
  field_scanned: "已读到信息",
  configured: "仅检测到配置",
  openable: "可打开",
  validator_ran: "已做本地检查",
  end_to_end_success: "完整检查通过",
};

const sourceLabel: Record<EvidenceSource, string> = {
  path: "本地路径",
  config: "配置",
  runtime: "本机状态",
  validator: "本地检查",
  manual_open: "手动打开",
  codex_log: "Codex 日志",
  snapshot: "内置示例",
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
  if (item.evidence_level === "configured") return "检测到配置";
  if (item.evidence_level === "openable") return "可尝试打开";
  if (item.evidence_level === "validator_ran") return item.returncode === 0 ? "检查通过" : "检查未通过";
  if (item.evidence_level === "file_read") return "已读取本地文件";
  if (item.evidence_level === "field_scanned") return "已读取信息";
  if (item.evidence_level === "end_to_end_success") return "完整检查通过";
  return item.status || "未发现本地证据";
}

export function isDemo(item?: Partial<EvidenceStatus> | null): boolean {
  return item?.evidence_source === "demo";
}
