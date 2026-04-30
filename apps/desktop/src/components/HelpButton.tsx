import { CircleHelp } from "lucide-react";
import { ActionButton } from "./ActionButton";

export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <ActionButton variant="ghost" onClick={onClick} data-tour-id="support-button" aria-label="打开帮助">
      <CircleHelp size={16} />
      帮助
    </ActionButton>
  );
}
