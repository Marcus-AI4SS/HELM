import type { ButtonHTMLAttributes, ReactNode } from "react";

export function ActionButton({
  variant = "secondary",
  disabled = false,
  children,
  className = "",
  ...buttonProps
}: {
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  return (
    <button type="button" className={`action-button ${variant} ${className}`.trim()} disabled={disabled} {...buttonProps}>
      {children}
    </button>
  );
}
