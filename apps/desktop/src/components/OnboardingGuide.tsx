import { Compass, ExternalLink } from "lucide-react";
import { ActionButton } from "./ActionButton";

export function OnboardingGuide({
  empty = false,
  compact = false,
  onCopyProjectIntake,
  onOpenCodex,
  onShowEnvironment,
}: {
  empty?: boolean;
  compact?: boolean;
  onCopyProjectIntake: () => void;
  onOpenCodex: () => void;
  onShowEnvironment: () => void;
}) {
  return (
    <section className={`card span-2 onboarding-card project-intake-card ${compact ? "compact-onboarding" : ""}`}>
      <div>
        <span className="eyebrow">{empty ? "首次使用" : "添加项目"}</span>
        <h3>{empty ? "第一次使用 HELM" : "添加另一个项目"}</h3>
        <p>
          没有项目不是故障。HELM 需要 Codex 先按你的确认读取项目文件夹，之后才能显示项目状态。
          你只需要复制接入说明，回到 Codex 粘贴，并补上真实项目路径。
        </p>
      </div>
      <div className="onboarding-actions">
        <ActionButton variant="primary" onClick={onCopyProjectIntake} data-tour-id="copy-project-intake">复制接入说明</ActionButton>
        <ActionButton variant="secondary" onClick={onOpenCodex}>
          <ExternalLink size={16} />
          打开 Codex
        </ActionButton>
        <ActionButton variant="secondary" onClick={onShowEnvironment}>
          <Compass size={16} />
          查看本机状态
        </ActionButton>
      </div>
      {!compact ? (
        <>
          <ol className="onboarding-steps">
            <li>
              <strong>1. 复制说明</strong>
              <span>这只是复制文字，不会写入项目，也不会登记路径。</span>
            </li>
            <li>
              <strong>2. 回到 Codex</strong>
              <span>把说明粘贴给 Codex，并补上你的项目文件夹位置。</span>
            </li>
            <li>
              <strong>3. 等 Codex 接入</strong>
              <span>Codex 会按你的确认检查项目资料，准备 HELM 能读取的状态。</span>
            </li>
            <li>
              <strong>4. 刷新 HELM</strong>
              <span>回到 HELM 点“刷新”，再查看项目、证据、文件和本机状态。</span>
            </li>
          </ol>
          <ul className="onboarding-list source-checklist">
            <li>
              <strong>项目说明</strong>
              <span>项目是什么、当前到哪一步、接下来要交给 Codex 什么。</span>
            </li>
            <li>
              <strong>材料清单</strong>
              <span>材料在哪里、是否读到、缺什么。</span>
            </li>
            <li>
              <strong>证据记录</strong>
              <span>哪些依据可用，哪些还需要继续检查。</span>
            </li>
            <li>
              <strong>阶段性发现</strong>
              <span>Codex 已确认和仍需继续检查的内容。</span>
            </li>
          </ul>
        </>
      ) : null}
    </section>
  );
}
