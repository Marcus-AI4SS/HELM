import { Maximize2, Minus, X } from "lucide-react";
import { runWindowAction } from "../windowRuntime";

export function WindowControls() {
  return (
    <div className="window-controls" aria-label="窗口控制">
      <button
        className="window-control"
        type="button"
        title="最小化"
        aria-label="最小化窗口"
        onClick={() => void runWindowAction((appWindow) => appWindow.minimize())}
      >
        <Minus size={14} strokeWidth={2.2} />
      </button>
      <button
        className="window-control"
        type="button"
        title="最大化或还原"
        aria-label="最大化或还原窗口"
        onClick={() => void runWindowAction((appWindow) => appWindow.toggleMaximize())}
      >
        <Maximize2 size={13} strokeWidth={2.2} />
      </button>
      <button
        className="window-control close"
        type="button"
        title="关闭"
        aria-label="关闭窗口"
        onClick={() => void runWindowAction((appWindow) => appWindow.destroy())}
      >
        <X size={14} strokeWidth={2.2} />
      </button>
    </div>
  );
}
