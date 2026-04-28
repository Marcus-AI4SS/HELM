import type { ReactNode } from "react";
import { pageByKey } from "../navigation";
import type { PageKey } from "../types";
import { runWindowAction } from "../windowRuntime";
import helmMark from "../assets/brand/helm-local-board-icon-master.png";
import { SegmentedNav } from "./SegmentedNav";
import { WindowControls } from "./WindowControls";

export function AppShell({
  active,
  onSelect,
  children,
  toolbar,
}: {
  active: PageKey;
  onSelect: (key: PageKey) => void;
  children: ReactNode;
  toolbar?: ReactNode;
}) {
  const page = pageByKey(active);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">
            <img src={helmMark} alt="" draggable={false} />
          </div>
          <div>
            <span className="eyebrow">本地科研看板</span>
            <strong>HELM</strong>
          </div>
        </div>
        <SegmentedNav active={active} onSelect={onSelect} />
      </aside>

      <section className="workspace-shell">
        <header className="titlebar">
          <div
            className="titlebar-drag"
            data-tauri-drag-region
            onMouseDown={(event) => {
              if (event.button === 0) void runWindowAction((appWindow) => appWindow.startDragging());
            }}
          >
            <span className="eyebrow">HELM view</span>
            <h1>{page.title}</h1>
            <p>{page.subtitle}</p>
          </div>
          <div className="toolbar-actions">{toolbar}</div>
          <WindowControls />
        </header>
        <main className="page-surface">{children}</main>
      </section>
    </div>
  );
}
