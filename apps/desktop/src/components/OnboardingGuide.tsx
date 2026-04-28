import { Compass, ExternalLink } from "lucide-react";
import { ActionButton } from "./ActionButton";

export function OnboardingGuide({
  empty = false,
  onCopyProjectIntake,
  onOpenCodex,
  onShowEnvironment,
}: {
  empty?: boolean;
  onCopyProjectIntake: () => void;
  onOpenCodex: () => void;
  onShowEnvironment: () => void;
}) {
  return (
    <section className="card span-2 onboarding-card project-intake-card">
      <div>
        <span className="eyebrow">{empty ? "Onboarding" : "Project intake"}</span>
        <h3>{empty ? "未检测到可信项目" : "如何让项目出现在 HELM"}</h3>
        <p>
          HELM 不创建项目、不登记路径、不写研究材料。把接入模板交给 Codex，由 Codex 在你的项目根目录读取或补齐事实源后，
          HELM 才会把项目显示为可信状态。
        </p>
      </div>
      <div className="onboarding-actions">
        <ActionButton variant="primary" onClick={onCopyProjectIntake}>复制项目接入模板</ActionButton>
        <ActionButton variant="secondary" onClick={onOpenCodex}>
          <ExternalLink size={16} />
          打开 Codex
        </ActionButton>
        <ActionButton variant="secondary" onClick={onShowEnvironment}>
          <Compass size={16} />
          查看环境诊断
        </ActionButton>
      </div>
      <ul className="onboarding-list source-checklist">
        <li>
          <strong>research-map.md</strong>
          <span>项目身份、研究边界和当前阶段。</span>
        </li>
        <li>
          <strong>material-passport.yaml</strong>
          <span>材料入口、来源身份和读取状态。</span>
        </li>
        <li>
          <strong>evidence-ledger.yaml</strong>
          <span>证据链、校验状态和阻断项。</span>
        </li>
        <li>
          <strong>findings-memory.md</strong>
          <span>Codex 已确认的阶段性发现。</span>
        </li>
      </ul>
    </section>
  );
}
