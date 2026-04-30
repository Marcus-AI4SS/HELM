import { Settings } from "lucide-react";
import { ActionButton } from "./ActionButton";

export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <ActionButton variant="ghost" onClick={onClick} data-tour-id="settings-button" aria-label="打开设置">
      <Settings size={16} />
      设置
    </ActionButton>
  );
}
