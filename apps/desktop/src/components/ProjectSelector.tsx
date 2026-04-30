import { Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectRow } from "../types";

export function ProjectSelector({
  projects,
  selectedProjectRoot,
  disabled = false,
  onSelect,
}: {
  projects: ProjectRow[];
  selectedProjectRoot?: string | null;
  disabled?: boolean;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(
    () => projects.find((project) => project.path === selectedProjectRoot) ?? projects[0],
    [projects, selectedProjectRoot],
  );

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!projects.length || !selected) return null;

  return (
    <div className="project-selector" ref={rootRef} data-tour-id="project-selector">
      <span>当前项目</span>
      <button
        type="button"
        className="project-selector-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        title={selected.path}
        onClick={() => setOpen((value) => !value)}
      >
        <strong>{selected.name || selected.path}</strong>
        <ChevronDown size={15} />
      </button>
      {open ? (
        <div className="project-selector-menu" role="listbox" aria-label="选择当前项目">
          {projects.map((project) => {
            const active = project.path === selected.path;
            return (
              <button
                key={project.path}
                type="button"
                className={active ? "active" : ""}
                role="option"
                aria-selected={active}
                title={project.path}
                onClick={() => {
                  setOpen(false);
                  if (!active) onSelect(project.path);
                }}
              >
                <span>
                  <strong>{project.name || project.path}</strong>
                  <small>本地项目文件夹</small>
                </span>
                {active ? <Check size={15} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
