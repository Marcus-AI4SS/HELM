import { FolderOpen } from "lucide-react";
import { displayActionText, displayStage } from "../displayText";
import { ActionButton } from "../components/ActionButton";
import { EmptyState } from "../components/EmptyState";
import { EvidenceCard } from "../components/EvidenceCard";
import { OnboardingGuide } from "../components/OnboardingGuide";
import { PlainFileList } from "../components/PlainFileList";
import { ProjectPortfolio } from "../components/ProjectPortfolio";
import type { FileRow, ProjectPageData, ProjectRow } from "../types";

type EntryFilter = "all" | "missing" | "read" | "blocking";

export function ProjectPage({
  data,
  hasUsableProject,
  projects = [],
  selectedProjectRoot,
  onSelectProject,
  onOpenPath,
  onOpenCodex,
  onShowEnvironment,
  onShowHandoff,
  onCopyProjectIntake,
}: {
  data?: ProjectPageData;
  hasUsableProject: boolean;
  projects?: ProjectRow[];
  selectedProjectRoot?: string | null;
  onSelectProject: (path: string) => void;
  onOpenPath: (path?: string) => void;
  onOpenCodex: () => void;
  onShowEnvironment: () => void;
  onShowHandoff: () => void;
  onCopyProjectIntake: () => void;
}) {
  if (!data) return <EmptyState title="未读取项目" body="请选择项目或刷新本地环境。" />;
  const materialCounts = entryCounts(data.material_entries);
  const artifactCounts = entryCounts(data.artifact_entries);
  const keyMaterials = data.material_entries.slice(0, 4);
  const keyArtifacts = data.artifact_entries.slice(0, 4);
  return (
    <div className="page-grid project-page">
      <section className="hero-panel span-2">
        <div>
          <span className="eyebrow">项目状态</span>
          <h2>{data.project.name}</h2>
          <p>{hasUsableProject ? `当前状态：${displayStage(data.project.current_stage)}。这里先确认项目、打开目录；需要继续推进时，去“交给 Codex”页复制说明。` : "还没有可用项目。请先复制接入说明，交给 Codex 后再回到 HELM 刷新。"}</p>
          <div className="hero-actions">
            <ActionButton
              variant="primary"
              onClick={hasUsableProject ? onShowHandoff : onCopyProjectIntake}
              data-tour-id={hasUsableProject ? "show-codex-handoff" : "copy-project-intake"}
            >
              {hasUsableProject ? "去交给 Codex" : "复制接入说明"}
            </ActionButton>
            <ActionButton variant="secondary" disabled={!hasUsableProject || !data.project.root} onClick={() => onOpenPath(data.project.root ?? undefined)}>
              <FolderOpen size={16} />
              打开项目目录
            </ActionButton>
          </div>
        </div>
        <EvidenceCard item={data.stage_status} />
      </section>

      <ProjectPortfolio projects={projects} selectedProjectRoot={selectedProjectRoot} onSelectProject={onSelectProject} />

      {!hasUsableProject ? (
        <OnboardingGuide
          empty
          onCopyProjectIntake={onCopyProjectIntake}
          onOpenCodex={onOpenCodex}
          onShowEnvironment={onShowEnvironment}
        />
      ) : null}

      <section className="card span-2">
        <div className="section-header">
          <div>
            <h3>材料概览</h3>
            <p>这里只看材料是否齐、是否有缺口；要打开依据和看检查结果，请去“证据”页。</p>
          </div>
        </div>
        <EntrySummary counts={materialCounts} emptyTitle="还没有材料记录" emptyBody="让 Codex 接入项目后，HELM 会显示材料是否读到。" />
        <PlainFileList files={keyMaterials} emptyTitle="没有可展示的关键材料" />
      </section>

      <section className="card span-2">
        <div className="section-header">
          <div>
            <h3>文件概览</h3>
            <p>这里只提示已有文件数量；完整打开文稿、图表和整理包，请去“文件”页。</p>
          </div>
        </div>
        <EntrySummary counts={artifactCounts} emptyTitle="还没有文件记录" emptyBody="Codex 写回文稿、图表或报告后，HELM 会在这里显示数量。" />
        <PlainFileList files={keyArtifacts} emptyTitle="没有可展示的关键文件" />
      </section>

      <div className="overview-strip span-2">
        <section className="overview-card">
          <h3>缺失项</h3>
          {data.missing_inputs.length ? (
            <ul className="plain-list">
              {data.missing_inputs.map((item) => <li key={item}>{displayActionText(item)}</li>)}
            </ul>
          ) : (
            <EmptyState title="没有显式缺失项" body="仍需由 Codex 读取项目资料后确认继续说明。" />
          )}
        </section>

        <section className="overview-card">
          <h3>最近 Codex 写回</h3>
          <div className="stack">
            {data.recent_codex_activity.length ? data.recent_codex_activity.map((item, index) => <EvidenceCard key={index} item={item} compact />) : <EmptyState title="暂无活动记录" body="Codex 写回项目进展后会显示在这里。" />}
          </div>
        </section>

        <section className="overview-card">
          <h3>本机状态</h3>
          {data.environment_status ? <EvidenceCard item={data.environment_status} compact /> : <EmptyState title="未读取本机状态" body="请刷新本机状态。" />}
          {data.vela_import_status ? <EvidenceCard item={data.vela_import_status} compact /> : null}
        </section>

      </div>

    </div>
  );
}

function EntrySummary({
  counts,
  emptyTitle,
  emptyBody,
}: {
  counts: Record<EntryFilter, number>;
  emptyTitle: string;
  emptyBody: string;
}) {
  if (counts.all === 0) return <EmptyState title={emptyTitle} body={emptyBody} />;
  return (
    <div className="entry-summary-grid" aria-label="条目概览">
      <span><strong>{counts.all}</strong><small>全部</small></span>
      <span><strong>{counts.read}</strong><small>已读取</small></span>
      <span><strong>{counts.missing}</strong><small>缺失</small></span>
      <span><strong>{counts.blocking}</strong><small>阻断</small></span>
    </div>
  );
}

function entryCounts(files: FileRow[]): Record<EntryFilter, number> {
  return {
    all: files.length,
    missing: files.filter((file) => matchesFilter(file, "missing")).length,
    read: files.filter((file) => matchesFilter(file, "read")).length,
    blocking: files.filter((file) => matchesFilter(file, "blocking")).length,
  };
}

function matchesFilter(file: FileRow, filter: EntryFilter): boolean {
  const text = `${file.status || ""} ${file.label || ""} ${file.name || ""}`.toLowerCase();
  if (filter === "missing") return file.exists === false || file.evidence_level === "missing";
  if (filter === "read") return file.exists === true || file.evidence_level === "file_read";
  if (filter === "blocking") return file.exists === false || file.evidence_level === "missing" || /缺失|阻断|未发现|missing|block/.test(text);
  return true;
}
