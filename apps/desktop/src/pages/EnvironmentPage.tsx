import { DiagnosticSummaryPanel } from "../components/DiagnosticSummaryPanel";
import { EmptyState } from "../components/EmptyState";
import { EvidenceCard } from "../components/EvidenceCard";
import { ValidatorCard } from "../components/ValidatorCard";
import type { EnvironmentPageData } from "../types";

export function EnvironmentPage({
  data,
  onRunValidator,
  diagnosticSummary,
  onCopyDiagnostic,
  onOpenSettings,
}: {
  data?: EnvironmentPageData;
  onRunValidator: (name: string) => void;
  diagnosticSummary: string;
  onCopyDiagnostic: () => void;
  onOpenSettings: () => void;
}) {
  if (!data) return <EmptyState title="未读取环境" body="环境页只显示当前项目最低本地条件，不做综合打分。" />;
  const validatorName = (label: string) => {
    const normalized = label.toLowerCase();
    if (normalized.includes("pipeline")) return "pipeline";
    if (normalized.includes("contract")) return "contract";
    if (normalized.includes("registry")) return "registry";
    return "stack";
  };
  return (
    <div className="page-grid environment-page">
      <section className="hero-panel span-2">
        <div>
          <span className="eyebrow">Environment</span>
          <h2>不做综合打分</h2>
          <p>本页只回答：当前项目继续推进是否被本地环境阻碍。配置态不等于真实连通。</p>
        </div>
        <EvidenceCard item={data.source_status} />
      </section>

      <DiagnosticSummaryPanel summary={diagnosticSummary} onCopy={onCopyDiagnostic} onOpenSettings={onOpenSettings} />

      <section className="card">
        <h3>当前项目最低条件</h3>
        <div className="stack">
          {data.current_project_readiness.map((item, index) => <EvidenceCard key={index} item={item} compact />)}
        </div>
      </section>

      <section className="card">
        <h3>本地能力</h3>
        <div className="stack">
          {data.local_capabilities.map((item, index) => <EvidenceCard key={index} item={item} compact />)}
        </div>
      </section>

      <section className="card span-2">
        <h3>本地校验</h3>
        <div className="validator-grid">
          {data.validators.map((item, index) => (
            <ValidatorCard key={index} item={item} onRun={() => onRunValidator(validatorName(item.label))} />
          ))}
        </div>
      </section>
    </div>
  );
}
