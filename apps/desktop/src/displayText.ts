import type { FileRow } from "./types";

const stageLabels: Record<string, string> = {
  legacy_evidence_intake: "整理旧项目证据",
  legacy_revision_package_intake: "接入旧项目修订资料",
  legacy_thesis_pipeline_intake: "接入毕业论文资料",
  legacy_research_project_intake: "接入旧研究项目",
  research_design: "研究设计",
  data_intake: "接入材料",
  evidence_review: "检查证据",
  writing_review: "检查写作",
  delivery_review: "交付前检查",
  pending: "等待处理",
  missing: "缺少资料",
  empty_state: "还没有可用项目",
  demo_snapshot: "演示状态",
  file_read: "已读到文件",
  field_scanned: "已读到信息",
  configured: "仅检测到配置",
  live_environment: "正在读取本机环境",
  legacy_app_snapshot: "使用兼容快照",
  snapshot: "使用内置示例",
};

const actionLabels: Record<string, string> = {
  python_stata_consistency_scope_review: "检查 Python 和 Stata 的口径是否一致",
  probe_log_reconciliation: "合并并核对探查日志",
  reproduction_trace_check: "检查复现路径",
  result_to_figure_trace_check: "检查结果和图表是否能对应",
  citation_trace_check: "检查引用线索",
  raw_to_processed_lineage_check: "检查原始数据到处理结果的路径",
  analysis_script_review: "检查分析脚本",
  rebuild_v4: "重新整理旧版资料",
  review_materials: "检查项目材料",
  delivery_doc_review: "检查交付文件",
};

const fileLabels: Record<string, { title: string; description: string }> = {
  "research-map.md": {
    title: "项目说明",
    description: "说明项目目标、当前阶段和接下来要交给 Codex 的事项。",
  },
  "findings-memory.md": {
    title: "阶段性发现",
    description: "保存已经确认的发现和待继续检查的问题。",
  },
  "material-passport.yaml": {
    title: "材料清单",
    description: "列出项目用到的资料、数据和来源。",
  },
  "evidence-ledger.yaml": {
    title: "证据记录",
    description: "记录每条依据来自哪里、是否足够支撑结论。",
  },
  "pipeline-status.json": {
    title: "项目进度记录",
    description: "记录项目当前进度和检查状态。",
  },
  "writing-quality-report.json": {
    title: "写作检查记录",
    description: "记录文稿、引用和交付前检查结果。",
  },
  "current.json": {
    title: "当前状态记录",
    description: "记录最近一次读取到的项目状态。",
  },
  "history.md": {
    title: "历史记录",
    description: "记录项目过往状态和处理线索。",
  },
};

const exactLabelReplacements: Record<string, string> = {
  "stack validator": "基础环境检查",
  "pipeline validator": "项目流程检查",
  "contract validator": "协作规则检查",
  "registry validator": "项目登记检查",
};

const labelReplacements: Record<string, string> = {
  "schema 可读": "资料格式可读",
  "pipeline-status": "项目进度记录",
  "writing-quality-report": "写作检查记录",
  "material-passport": "材料清单",
  "evidence-ledger": "证据记录",
  "research-map": "项目说明",
  "findings-memory": "阶段性发现",
  "current": "当前状态记录",
  "history": "历史记录",
  "live 环境": "本机环境",
  "正式 snapshot": "兼容快照",
  "validator": "本地检查",
  "复查": "检查",
  "交付物": "已有文件",
  "交接单": "给 Codex 的说明",
  "gate": "检查",
};

export function displayStage(value?: string | null): string {
  const raw = clean(value);
  if (!raw) return "还没写入项目阶段";
  const key = normalizeKey(raw);
  return stageLabels[key] ?? humanizeTechnicalText(raw);
}

export function displayActionText(value?: string | null): string {
  const raw = clean(value);
  if (!raw) return "";
  return humanizeTechnicalText(raw);
}

export function displayLabel(value?: string | null): string {
  const raw = clean(value);
  if (!raw) return "";
  const exactLabel = exactLabelReplacements[normalizeKey(raw)];
  if (exactLabel) return exactLabel;
  const exact = fileLabels[fileName(raw)]?.title ?? stageLabels[normalizeKey(raw)];
  if (exact) return exact;
  return humanizeTechnicalText(replaceKnownLabels(raw));
}

export function displayFileTitle(file: FileRow): string {
  const raw = file.label || file.name || fileName(file.path || "") || "文件";
  return displayLabel(raw);
}

export function displayFileDescription(file: FileRow): string {
  const key = fileName(file.path || file.name || file.label || "");
  if (fileLabels[key]) return fileLabels[key].description;
  if (file.exists === false) return "暂时没有读到这个本地文件。";
  if (file.evidence_level === "validator_ran") return "本地检查生成的记录。";
  return "本地文件，可点击打开。";
}

export function displayDetail(value?: string | null): string {
  const raw = clean(value);
  if (!raw) return "";
  return displayActionText(replaceKnownLabels(raw));
}

export function displaySourcePath(path?: string | null): string {
  if (!path) return "";
  const key = fileName(path);
  if (fileLabels[key]) return `本地文件：${fileLabels[key].title}`;
  if (/[A-Za-z]:[\\/]/.test(path) || path.startsWith("/") || path.startsWith("\\\\")) return "本地路径";
  return humanizeTechnicalText(path);
}

function humanizeTechnicalText(value: string): string {
  let text = value;
  for (const [key, label] of Object.entries(actionLabels)) {
    text = replaceEvery(text, key, label);
  }
  for (const [key, label] of Object.entries(stageLabels)) {
    text = replaceEvery(text, key, label);
  }
  for (const [key, { title }] of Object.entries(fileLabels)) {
    text = replaceEvery(text, key, title);
    text = replaceEvery(text, key.replace(/\.[^.]+$/, ""), title);
  }
  text = text.replace(/\b([a-z][a-z0-9]+(?:_[a-z0-9]+)+)\b/gi, (match) => actionLabels[normalizeKey(match)] ?? toReadableWords(match));
  text = text.replace(/\s*,\s*/g, "、").replace(/\s{2,}/g, " ").trim();
  return text;
}

function replaceKnownLabels(value: string): string {
  let text = value;
  for (const [key, label] of Object.entries(labelReplacements)) {
    text = replaceEvery(text, key, label);
  }
  return text;
}

function replaceEvery(value: string, needle: string, replacement: string): string {
  return value.split(needle).join(replacement);
}

function toReadableWords(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => {
      if (word === "doi") return "DOI";
      if (word === "api") return "API";
      if (word === "url") return "链接";
      if (word === "schema") return "资料格式";
      if (word === "legacy") return "旧项目";
      if (word === "intake") return "接入";
      if (word === "review") return "检查";
      if (word === "trace") return "追踪";
      if (word === "check") return "检查";
      if (word === "status") return "状态";
      if (word === "pipeline") return "进度";
      return word;
    })
    .join(" ");
}

function fileName(value: string): string {
  return value.split(/[\\/]/).pop()?.toLowerCase() ?? "";
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function clean(value?: string | null): string {
  return String(value ?? "").trim();
}
