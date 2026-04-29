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
        <h3>{empty ? "第一次使用 HELM" : "如何让项目出现在 HELM"}</h3>
        <p>
          HELM 只读取本地项目状态。第一次打开时，如果还没有可信项目，请复制接入模板并交给 Codex；
          Codex 连接你的项目文件夹后，回到 HELM 刷新即可查看状态。
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
      <ol className="onboarding-steps">
        <li>
          <strong>1. 复制模板</strong>
          <span>模板不会写入项目，只是告诉 Codex 需要检查哪些事实源。</span>
        </li>
        <li>
          <strong>2. 交给 Codex</strong>
          <span>把模板和你的项目路径发给 Codex，让 Codex 在项目根目录补齐上下文。</span>
        </li>
        <li>
          <strong>3. 回到 HELM</strong>
          <span>刷新后查看项目、可信度、下一步、交付物和环境状态。</span>
        </li>
      </ol>
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
