import { invoke } from "@tauri-apps/api/core";
import type {
  AppActionResult,
  CodexHandoff,
  CredibilityPageData,
  DashboardData,
  DeliverablesPageData,
  EnvironmentPageData,
  EvidenceStatus,
  FileRow,
  NextStepPageData,
  ProjectPageData,
} from "./types";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function call<T>(command: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!isTauriRuntime()) {
    return mock(command, payload) as T;
  }
  return invoke<T>(command, payload);
}

const demoEvidence = (
  label: string,
  status: string,
  tone: EvidenceStatus["tone"] = "amber",
  detail = "浏览器预览使用演示数据；真实状态只在桌面应用中读取。"
): EvidenceStatus => ({
  label,
  status,
  tone,
  evidence_level: "field_scanned",
  evidence_source: "demo",
  detail,
});

function demoHandoff(projectRoot: string, empty = false): CodexHandoff {
  const handoff: CodexHandoff = {
    handoff_version: empty ? "v8-empty-demo" : "v8-demo",
    generated_at: new Date().toISOString(),
    product_boundary: "HELM 只读取本地状态、打开资源、运行本地检查并准备给 Codex 的说明；研究判断、写作和核验必须回到 Codex 对话并由用户确认。",
    project: {
      name: empty ? "未检测到可用项目" : "演示项目",
      root: empty ? "" : projectRoot,
      exists: !empty,
      trusted_config_detected: !empty,
    },
    local_evidence: {
      truth_sources: [demoEvidence("证据台账", "演示数据", "amber")],
      reports: [],
      runtime: [demoEvidence("运行环境", "演示数据", "amber")],
      integrations: [demoEvidence("Codex App", "演示数据", "amber")],
    },
    validation: {
      validators_run: [],
      blocking_failures: ["演示模式不能作为真实研究状态。"],
      last_success_level: "field_scanned",
    },
    missing_inputs: empty
      ? ["未检测到可用项目。", "请在 Codex 中补齐项目说明、材料清单、证据记录和阶段性发现。"]
      : ["请在桌面应用中读取真实项目文件。"],
    safe_next_actions_for_codex: empty
      ? ["请按 HELM 项目接入说明读取 <PROJECT_PATH>，并只写回项目资料。"]
      : ["读取真实项目状态后，再生成给 Codex 的说明。"],
    forbidden_claims: [
      "不要把演示数据当作真实证据。",
      "不要把检测到配置当作真实可用。",
      "不要在未实时核验 DOI 前写入正式引用。",
    ],
    text: empty
      ? "HELM 未检测到可用项目。请在 Codex 中把 <PROJECT_PATH> 替换为真实路径，并补齐 HELM 需要的项目资料后再回到 HELM 刷新。"
      : "请读取真实项目状态；当前浏览器预览仅为演示数据，不能作为研究依据。",
  };
  return handoff;
}

function mock(command: string, payload: Record<string, unknown>): unknown {
  const scenario = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("scenario");
  const isEmptyScenario = scenario === "empty";
  const projectRoot = isEmptyScenario ? "<PROJECT_PATH>" : String(payload.projectRoot ?? "<PROJECT_ROOT>");
  const file = (label: string, name: string): FileRow => ({
    label,
    name,
    path: `${projectRoot}/${name}`,
    status: "演示数据",
    exists: false,
    evidence_level: "field_scanned",
    evidence_source: "demo",
  });
  const handoff = demoHandoff(projectRoot, isEmptyScenario);

  const projectPage: ProjectPageData = {
    project: {
      name: isEmptyScenario ? "未检测到可用项目" : "演示项目",
      root: isEmptyScenario ? null : projectRoot,
      exists: !isEmptyScenario,
      current_stage: isEmptyScenario ? "公开样例或空状态" : "待真实读取",
      status: isEmptyScenario ? "empty_state" : "demo_snapshot",
    },
    stage_status: demoEvidence("项目状态", isEmptyScenario ? "未检测到可用项目" : "演示数据", "amber"),
    missing_inputs: isEmptyScenario
      ? ["未检测到可用项目。", "请在 Codex 中按接入说明读取项目资料。"]
      : ["真实项目文件尚未读取。"],
    recent_codex_activity: isEmptyScenario ? [] : [demoEvidence("最近活动", "演示数据", "amber")],
    material_entries: isEmptyScenario ? [] : [file("研究地图", "research-map.md"), file("证据台账", "evidence-ledger.yaml")],
    artifact_entries: isEmptyScenario ? [] : [file("写作报告", "logs/quality-gates/writing-quality-report.json")],
    environment_status: demoEvidence("本地环境", "演示快照", "amber"),
  };

  const credibilityPage: CredibilityPageData = {
    project_name: "演示项目",
    judgments: [
      demoEvidence("文献引用", "待真实核验", "amber"),
      demoEvidence("材料身份", "待真实读取", "amber"),
      demoEvidence("证据支撑", "待人工复核", "amber"),
      demoEvidence("复现追踪", "未运行", "amber"),
    ],
    truth_sources: [demoEvidence("证据台账", "演示数据", "amber")],
    gate_reports: [],
    source_files: [file("证据台账", "evidence-ledger.yaml")],
    warning: "演示模式不会给出证据分数。",
  };

  const nextStepPage: NextStepPageData = {
    project_name: "演示项目",
    recommended_action: "在桌面应用中读取真实项目状态",
    rationale: "当前是预览数据，不能作为研究状态。",
    preconditions: [demoEvidence("真实项目状态", "未读取", "amber")],
    blockers: ["演示数据不能进入真实项目说明。"],
    related_files: [file("研究地图", "research-map.md")],
    handoff,
  };

  const deliverablesPage: DeliverablesPageData = {
    project_name: "演示项目",
    deliverables: [
      {
        label: "文稿",
        description: "只浏览已有文件，不生成正文。",
        files: [file("草稿", "writing/draft.md")],
        status: demoEvidence("文稿状态", "演示数据", "amber"),
      },
    ],
  };

  const environmentPage: EnvironmentPageData = {
    source_status: demoEvidence("环境来源", "演示快照", "amber"),
    current_project_readiness: [demoEvidence("当前项目最低条件", "演示数据", "amber")],
    local_capabilities: [
      demoEvidence("Codex App", "演示数据", "amber"),
      demoEvidence("Zotero", "演示数据", "amber"),
      demoEvidence("Obsidian", "演示数据", "amber"),
    ],
    validators: [demoEvidence("基础环境检查", "未运行", "gray")],
    runtime: { mode: "demo_snapshot", project_root: projectRoot },
  };

  const base: DashboardData = {
    product: {
      name: "HELM 本地科研看板",
      tagline: "本地项目状态、证据记录、已有文件和给 Codex 的说明",
      version: "0.9.1-usability-rc",
    },
    source_status: { mode: isEmptyScenario ? "demo_empty" : "demo_snapshot", label: isEmptyScenario ? "空状态演示" : "演示快照", evidence_source: "demo" },
    selected_project_root: isEmptyScenario ? null : projectRoot,
    projects: isEmptyScenario
      ? []
      : [
          {
            name: "演示项目",
            path: projectRoot,
            exists: true,
            source: "demo",
            current_stage: "待真实读取",
            status: "demo_snapshot",
            missing_count: 1,
            material_count: 2,
            artifact_count: 1,
            recent_activity_count: 1,
            next_action: "在桌面应用中读取真实项目状态。",
            tone: "amber",
            blocking: true,
          },
          {
            name: "公开样例空项目",
            path: "<PUBLIC_SAMPLE_PROJECT>",
            exists: false,
            source: "demo",
            current_stage: "未检测到本地研究环境",
            status: "empty_state",
            missing_count: 4,
            material_count: 0,
            artifact_count: 0,
            recent_activity_count: 0,
            next_action: "安装本地研究环境后刷新。",
            tone: "gray",
            blocking: true,
          },
        ],
    project_page: projectPage,
    credibility_page: credibilityPage,
    next_step_page: nextStepPage,
    deliverables_page: deliverablesPage,
    environment_page: environmentPage,
    runtime: { mode: isEmptyScenario ? "demo_empty" : "demo_snapshot" },
  };

  const lookup: Record<string, unknown> = {
    get_dashboard: base,
    get_codex_handoff: handoff,
  };

  if (command in lookup) return lookup[command];
  if (command === "run_validator") {
    return {
      ok: false,
      returncode: 1,
      error: "浏览器预览不运行本地检查。",
      evidence_level: "missing",
      evidence_source: "demo",
    };
  }
  if (command === "open_path" || command === "open_external_app") {
    return { ok: false, error: "浏览器预览不能打开本地资源。", evidence_source: "demo" };
  }
  return base;
}

export function getDashboard(projectRoot?: string | null): Promise<DashboardData> {
  return call<DashboardData>("get_dashboard", { projectRoot });
}

export function getCodexHandoff(projectRoot?: string | null): Promise<CodexHandoff> {
  return call<CodexHandoff>("get_codex_handoff", { projectRoot });
}

export function runValidator(name: string): Promise<AppActionResult> {
  return call<AppActionResult>("run_validator", { name });
}

export function openPath(path: string, projectRoot?: string | null, options: { dryRun?: boolean } = {}): Promise<AppActionResult> {
  return call<AppActionResult>("open_path", { path, projectRoot, dryRun: Boolean(options.dryRun) });
}

export function openExternalApp(label: string, options: { dryRun?: boolean } = {}): Promise<AppActionResult> {
  return call<AppActionResult>("open_external_app", { label, dryRun: Boolean(options.dryRun) });
}
