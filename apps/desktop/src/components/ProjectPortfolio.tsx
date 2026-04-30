import { Activity, Archive, FileText, OctagonAlert } from "lucide-react";
import type { ReactNode } from "react";
import { displayActionText, displayStage } from "../displayText";
import type { ProjectRow } from "../types";
import { StatusBadge } from "./StatusBadge";

export function ProjectPortfolio({
  projects,
  selectedProjectRoot,
  onSelectProject,
}: {
  projects: ProjectRow[];
  selectedProjectRoot?: string | null;
  onSelectProject: (path: string) => void;
}) {
  const visibleProjects = projects.filter((project) => isUsableProject(project));
  const hiddenCount = projects.length - visibleProjects.length;
  if (!visibleProjects.length) return null;
  return (
    <section className="card span-2 project-portfolio-card">
      <div className="section-header">
        <div>
          <h3>可用项目</h3>
          <p>选择要查看的项目。读取不到的路径已从操作入口隐藏，避免误点。</p>
          {hiddenCount > 0 ? <p className="muted-copy">{hiddenCount} 个项目暂时不可读取，可在帮助或本机诊断中查看处理方式。</p> : null}
        </div>
        <StatusBadge tone="blue">{visibleProjects.length} 个可打开项目</StatusBadge>
      </div>
      <div className="project-portfolio">
        {visibleProjects.map((project) => {
          const active = project.path === selectedProjectRoot;
          return (
            <button
              key={project.path || project.name}
              type="button"
              className={`project-row ${active ? "active" : ""}`}
              onClick={() => onSelectProject(project.path)}
            >
              <span className="project-row-main">
                <strong>{project.name || project.path}</strong>
                <small title={project.path}>{project.path ? "本地项目文件夹" : "未提供路径"}</small>
              </span>
              <span className="project-row-stage">
                <StatusBadge tone={project.tone || "blue"}>{displayStage(project.current_stage || project.status || "待读取")}</StatusBadge>
                <small title={project.next_action}>{displayActionText(project.next_action || "让 Codex 读取项目资料并继续推进。")}</small>
              </span>
              <span className="project-row-metrics">
                <Metric icon={<OctagonAlert size={14} />} label="阻断" value={project.missing_count ?? 0} />
                <Metric icon={<FileText size={14} />} label="材料" value={project.material_count ?? 0} />
                <Metric icon={<Archive size={14} />} label="文件" value={project.artifact_count ?? 0} />
                <Metric icon={<Activity size={14} />} label="活动" value={project.recent_activity_count ?? 0} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function isUsableProject(project: ProjectRow) {
  if (!project.path || project.exists === false) return false;
  const status = `${project.status || ""} ${project.current_stage || ""} ${project.error || ""}`.toLowerCase();
  if (/untrusted|not_trusted|path_not_found|not found|not_exist|不可读取|路径不存在|未检测/.test(status)) return false;
  return true;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <span className="mini-metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}
