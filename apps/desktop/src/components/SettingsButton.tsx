import { Settings } from "lucide-react";
import { ActionButton } from "./ActionButton";

export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <ActionButton variant="ghost" onClick={onClick}>
      <Settings size={16} />
      设置
    </ActionButton>
  );
}
