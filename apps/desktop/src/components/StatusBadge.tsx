import type { ReactNode } from "react";
import type { Tone } from "../types";

export function StatusBadge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}
