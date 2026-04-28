import { Activity, Archive, FileText, OctagonAlert } from "lucide-react";
import type { ReactNode } from "react";
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
  if (!projects.length) return null;
  return (
    <section className="card span-2 project-portfolio-card">
      <div className="section-header">
        <div>
          <h3>可信项目控制台</h3>
          <p>比较已登记项目的阶段、阻断、材料和产物；切换后只读取对应本地路径。</p>
        </div>
        <StatusBadge tone="blue">{projects.length} 个项目</StatusBadge>
      </div>
      <div className="project-portfolio">
        {projects.map((project) => {
          const active = project.path === selectedProjectRoot;
          const disabled = project.exists === false || !project.path;
          return (
            <button
              key={project.path || project.name}
              type="button"
              className={`project-row ${active ? "active" : ""}`}
              disabled={disabled}
              onClick={() => onSelectProject(project.path)}
            >
              <span className="project-row-main">
                <strong>{project.name || project.path}</strong>
                <small title={project.path}>{project.path || "未提供路径"}</small>
              </span>
              <span className="project-row-stage">
                <StatusBadge tone={project.tone || (disabled ? "gray" : "blue")}>{project.current_stage || project.status || "未读取"}</StatusBadge>
                <small>{project.next_action || "让 Codex 读取事实源并继续推进。"}</small>
              </span>
              <span className="project-row-metrics">
                <Metric icon={<OctagonAlert size={14} />} label="阻断" value={project.missing_count ?? 0} />
                <Metric icon={<FileText size={14} />} label="材料" value={project.material_count ?? 0} />
                <Metric icon={<Archive size={14} />} label="产物" value={project.artifact_count ?? 0} />
                <Metric icon={<Activity size={14} />} label="活动" value={project.recent_activity_count ?? 0} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
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
