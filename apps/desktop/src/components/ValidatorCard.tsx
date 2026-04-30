import { Wrench } from "lucide-react";
import type { EvidenceStatus } from "../types";
import { ActionButton } from "./ActionButton";
import { EvidenceCard } from "./EvidenceCard";

export function ValidatorCard({ item, onRun }: { item: EvidenceStatus; onRun: () => void }) {
  return (
    <div className="validator-card">
      <EvidenceCard item={item} compact />
      <ActionButton variant="secondary" onClick={onRun}>
        <Wrench size={16} />
        运行本地检查
      </ActionButton>
    </div>
  );
}
