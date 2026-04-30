export type PageKey = "project" | "credibility" | "next-step" | "deliverables" | "environment";

export type DisplayDensity = "standard" | "compact";

export type ReduceMotionSetting = "system" | "on" | "off";

export type EvidenceLevel =
  | "missing"
  | "file_read"
  | "field_scanned"
  | "configured"
  | "openable"
  | "validator_ran"
  | "end_to_end_success";

export type EvidenceSource =
  | "path"
  | "config"
  | "runtime"
  | "validator"
  | "manual_open"
  | "codex_log"
  | "snapshot"
  | "demo";

export type Tone = "blue" | "green" | "amber" | "red" | "gray";

export type VelaImportSource = "vela_context" | "legacy_files" | "missing_context";

export interface EvidenceStatus {
  label: string;
  status: string;
  tone: Tone;
  evidence_level: EvidenceLevel;
  evidence_source: EvidenceSource;
  source_path?: string;
  checked_at?: string;
  detail?: string;
  blocking?: boolean;
  returncode?: number | null;
  stdout_excerpt?: string;
  stderr_excerpt?: string;
}

export interface FileRow {
  name?: string;
  label?: string;
  path?: string;
  exists?: boolean;
  status?: string;
  evidence_level?: EvidenceLevel;
  evidence_source?: EvidenceSource;
  updated_at?: number | string;
  line_count?: number;
}

export interface ProjectRow {
  name: string;
  path: string;
  exists?: boolean;
  source?: string;
  import_source?: VelaImportSource;
  import_schema?: string | null;
  context_path?: string;
  import_ready?: boolean;
  current_stage?: string;
  status?: string;
  missing_count?: number;
  material_count?: number;
  artifact_count?: number;
  recent_activity_count?: number;
  last_activity_at?: number | string | null;
  next_action?: string;
  tone?: Tone;
  blocking?: boolean;
  error?: string;
}

export interface HandoffHistoryEntry {
  id: string;
  project_name: string;
  project_key?: string;
  project_root?: string;
  copied_at: string;
  handoff_generated_at: string;
  handoff_version: string;
  recommended_action: string;
  blocker_count: number;
  excerpt: string;
}

export interface HelmUserSettings {
  launchPage: PageKey;
  rememberLastProject: boolean;
  displayDensity: DisplayDensity;
  reduceMotion: ReduceMotionSetting;
  handoffHistoryLimit: number;
  firstRunGuideDismissed: boolean;
  lastSeenGuideVersion?: string;
}

export interface DiagnosticSummary {
  generated_at: string;
  text: string;
}

export interface AppActionResult {
  ok?: boolean;
  error?: string;
  stdout?: string;
  stderr?: string;
  returncode?: number;
  path?: string;
  label?: string;
  evidence_level?: EvidenceLevel;
  evidence_source?: EvidenceSource;
  [key: string]: unknown;
}

export interface CodexHandoff {
  schema_version?: "helm.codex.handoff.v1";
  producer?: "HELM";
  consumer?: "VELA";
  handoff_version: string;
  generated_at: string;
  product_boundary: string;
  project: {
    id?: string;
    name: string;
    root: string;
    exists: boolean;
    trusted_config_detected: boolean;
    context_schema?: string | null;
    import_source?: VelaImportSource;
  };
  recommended_action?: string;
  relevant_files?: string[];
  constraints?: string[];
  validation_context?: Record<string, unknown>;
  human_review_required?: boolean;
  handoff_path?: string;
  handoff_write_error?: string;
  local_evidence: {
    truth_sources: EvidenceStatus[];
    reports: EvidenceStatus[];
    runtime: EvidenceStatus[];
    integrations: EvidenceStatus[];
  };
  validation: {
    validators_run: EvidenceStatus[];
    blocking_failures: string[];
    last_success_level: EvidenceLevel;
  };
  missing_inputs: string[];
  safe_next_actions_for_codex: string[];
  forbidden_claims: string[];
  text: string;
}

export interface ProjectPageData {
  project: {
    name: string;
    root?: string | null;
    exists: boolean;
    current_stage: string;
    status: string;
    import_source?: VelaImportSource;
    import_schema?: string | null;
  };
  stage_status: EvidenceStatus;
  missing_inputs: string[];
  recent_codex_activity: EvidenceStatus[];
  material_entries: FileRow[];
  artifact_entries: FileRow[];
  environment_status?: EvidenceStatus;
  vela_import_status?: EvidenceStatus;
}

export interface CredibilityPageData {
  project_name: string;
  judgments: EvidenceStatus[];
  truth_sources: EvidenceStatus[];
  gate_reports: EvidenceStatus[];
  source_files: FileRow[];
  warning: string;
}

export interface NextStepPageData {
  project_name: string;
  recommended_action: string;
  rationale: string;
  preconditions: EvidenceStatus[];
  blockers: string[];
  related_files: FileRow[];
  handoff: CodexHandoff;
}

export interface DeliverablesPageData {
  project_name: string;
  deliverables: DeliverableGroup[];
}

export interface DeliverableGroup {
  label: string;
  description: string;
  files: FileRow[];
  status: EvidenceStatus;
}

export interface EnvironmentPageData {
  source_status: EvidenceStatus;
  current_project_readiness: EvidenceStatus[];
  local_capabilities: EvidenceStatus[];
  validators: EvidenceStatus[];
  runtime: Record<string, string>;
}

export interface DashboardData {
  product: {
    name: string;
    tagline: string;
    version: string;
  };
  source_status: Record<string, unknown>;
  projects: ProjectRow[];
  selected_project_root?: string | null;
  project_page?: ProjectPageData;
  credibility_page?: CredibilityPageData;
  next_step_page?: NextStepPageData;
  deliverables_page?: DeliverablesPageData;
  environment_page?: EnvironmentPageData;
  runtime: Record<string, string>;
}
