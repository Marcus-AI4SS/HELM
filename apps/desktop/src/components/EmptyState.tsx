import { CircleDashed } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title, body, actions }: { title: string; body: string; actions?: ReactNode }) {
  return (
    <div className="empty-state">
      <CircleDashed size={24} />
      <strong>{title}</strong>
      <p>{body}</p>
      {actions ? <div className="empty-actions">{actions}</div> : null}
    </div>
  );
}
