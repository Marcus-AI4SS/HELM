import { useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";
import { ActionButton } from "../components/ActionButton";
import { EmptyState } from "../components/EmptyState";
import { EvidenceCard } from "../components/EvidenceCard";
import { FilterChips, type FilterChipOption } from "../components/FilterChips";
import { FileCard } from "../components/FileCard";
import { OnboardingGuide } from "../components/OnboardingGuide";
import { ProjectPortfolio } from "../components/ProjectPortfolio";
import type { FileRow, ProjectPageData, ProjectRow } from "../types";

type EntryFilter = "all" | "missing" | "read" | "blocking" | "validator";

export function ProjectPage({
  data,
  projects = [],
  selectedProjectRoot,
  onSelectProject,
  onOpenPath,
  onOpenCodex,
  onShowEnvironment,
  onHandoff,
  onCopyProjectIntake,
}: {
  data?: ProjectPageData;
  projects?: ProjectRow[];
  selectedProjectRoot?: string | null;
  onSelectProject: (path: string) => void;
  onOpenPath: (path?: string) => void;
  onOpenCodex: () => void;
  onShowEnvironment: () => void;
  onHandoff: () => void;
  onCopyProjectIntake: () => void;
}) {
  const [materialFilter, setMaterialFilter] = useState<EntryFilter>("all");
  const [artifactFilter, setArtifactFilter] = useState<EntryFilter>("all");
  const materialEntries = useMemo(() => filterEntries(data?.material_entries ?? [], materialFilter), [data?.material_entries, materialFilter]);
  const artifactEntries = useMemo(() => filterEntries(data?.artifact_entries ?? [], artifactFilter), [data?.artifact_entries, artifactFilter]);
  if (!data) return <EmptyState title="未读取项目" body="请选择项目或刷新本地环境。" />;
  const materialOptions = filterOptions(data.material_entries);
  const artifactOptions = filterOptions(data.artifact_entries);
  const hasUsableProject = projects.some((project) => project.path && project.exists !== false);
  return (
    <div className="page-grid project-page">
      <section className="hero-panel span-2">
        <div>
          <span className="eyebrow">Project</span>
          <h2>{data.project.name}</h2>
          <p>阶段：{data.project.current_stage}。本页只显示本地项目身份、材料、产物和缺口。</p>
          <div className="hero-actions">
            <ActionButton variant="primary" onClick={onHandoff}>复制交接单</ActionButton>
            <ActionButton variant="secondary" disabled={!data.project.root} onClick={() => onOpenPath(data.project.root ?? undefined)}>
              <FolderOpen size={16} />
              打开项目目录
            </ActionButton>
          </div>
        </div>
        <EvidenceCard item={data.stage_status} />
      </section>

      <ProjectPortfolio projects={projects} selectedProjectRoot={selectedProjectRoot} onSelectProject={onSelectProject} />

      <OnboardingGuide
        empty={!hasUsableProject}
        onCopyProjectIntake={onCopyProjectIntake}
        onOpenCodex={onOpenCodex}
        onShowEnvironment={onShowEnvironment}
      />

      <div className="overview-strip span-2">
        <section className="overview-card">
          <h3>缺失项</h3>
          {data.missing_inputs.length ? (
            <ul className="plain-list">
              {data.missing_inputs.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : (
            <EmptyState title="没有显式缺失项" body="仍需由 Codex 读取事实源后确认下一步。" />
          )}
        </section>

        <section className="overview-card">
          <h3>最近 Codex 写回</h3>
          <div className="stack">
            {data.recent_codex_activity.length ? data.recent_codex_activity.map((item, index) => <EvidenceCard key={index} item={item} compact />) : <EmptyState title="暂无活动记录" body="Codex 写入 activity.jsonl 后会显示在这里。" />}
          </div>
        </section>

        <section className="overview-card">
          <h3>本地环境</h3>
          {data.environment_status ? <EvidenceCard item={data.environment_status} compact /> : <EmptyState title="未读取环境来源" body="请刷新本地环境状态。" />}
        </section>

        <section className="overview-card">
          <h3>交接单摘要</h3>
          <div className="stack">
            <p>{data.next_step_hint || "复制交接单，让 Codex 读取事实源后继续推进。"}</p>
            <ActionButton variant="secondary" onClick={onHandoff}>复制交接单</ActionButton>
          </div>
        </section>
      </div>

      <section className="card span-2">
        <div className="section-header">
          <div>
            <h3>材料入口</h3>
            <p>只浏览本地文件和台账状态；缺失项不会被标成完成。</p>
          </div>
          <FilterChips value={materialFilter} options={materialOptions} onChange={setMaterialFilter} ariaLabel="材料筛选" />
        </div>
        <div className="file-grid">
          {materialEntries.length ? materialEntries.map((file, index) => <FileCard key={`${file.path}-${index}`} file={file} onOpen={onOpenPath} />) : <EmptyState title="当前筛选没有材料" body="切回全部，或让 Codex 补齐材料台账与项目事实源。" />}
        </div>
      </section>

      <section className="card span-2">
        <div className="section-header">
          <div>
            <h3>产物入口</h3>
            <p>显示已有文稿、图表、报告和复现痕迹，不生成新产物。</p>
          </div>
          <FilterChips value={artifactFilter} options={artifactOptions} onChange={setArtifactFilter} ariaLabel="产物筛选" />
        </div>
        <div className="file-grid">
          {artifactEntries.length ? artifactEntries.map((file, index) => <FileCard key={`${file.path}-${index}`} file={file} onOpen={onOpenPath} />) : <EmptyState title="当前筛选没有产物" body="切回全部，或让 Codex 写回真实产物索引。" />}
        </div>
      </section>
    </div>
  );
}

function filterOptions(files: FileRow[]): FilterChipOption<EntryFilter>[] {
  return [
    { key: "all", label: "全部", count: files.length },
    { key: "missing", label: "缺失", count: files.filter((file) => matchesFilter(file, "missing")).length },
    { key: "read", label: "已读取", count: files.filter((file) => matchesFilter(file, "read")).length },
    { key: "blocking", label: "阻断", count: files.filter((file) => matchesFilter(file, "blocking")).length },
    { key: "validator", label: "validator", count: files.filter((file) => matchesFilter(file, "validator")).length },
  ];
}

function filterEntries(files: FileRow[], filter: EntryFilter): FileRow[] {
  if (filter === "all") return files;
  return files.filter((file) => matchesFilter(file, filter));
}

function matchesFilter(file: FileRow, filter: EntryFilter): boolean {
  const text = `${file.status || ""} ${file.label || ""} ${file.name || ""}`.toLowerCase();
  if (filter === "missing") return file.exists === false || file.evidence_level === "missing";
  if (filter === "read") return file.exists === true || file.evidence_level === "file_read";
  if (filter === "blocking") return file.exists === false || file.evidence_level === "missing" || /缺失|阻断|未发现|missing|block/.test(text);
  if (filter === "validator") return file.evidence_level === "validator_ran" || file.evidence_level === "end_to_end_success" || text.includes("validator");
  return true;
}
