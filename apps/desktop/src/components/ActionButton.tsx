import type { ReactNode } from "react";

export function ActionButton({
  variant = "secondary",
  disabled = false,
  children,
  onClick,
}: {
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={`action-button ${variant}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
