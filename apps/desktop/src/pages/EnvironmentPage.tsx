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
  if (!data) return <EmptyState title="未读取本机状态" body="这里只显示继续项目时需要检查的本机条件，不做综合打分。" />;
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
          <span className="eyebrow">本机状态</span>
          <h2>不做综合打分</h2>
          <p>本页只回答：这台电脑上的条件是否会挡住当前项目继续推进。检测到配置，不等于真实可用。</p>
        </div>
        <EvidenceCard item={data.source_status} />
      </section>

      <section className="card span-2">
        <h3>本地检查</h3>
        <div className="validator-grid">
          {data.validators.map((item, index) => (
            <ValidatorCard key={index} item={item} onRun={() => onRunValidator(validatorName(item.label))} />
          ))}
        </div>
      </section>

      <section className="card">
        <h3>当前项目需要什么</h3>
        <div className="stack">
          {data.current_project_readiness.map((item, index) => <EvidenceCard key={index} item={item} compact />)}
        </div>
      </section>

      <section className="card">
        <h3>这台电脑能提供什么</h3>
        <div className="stack">
          {data.local_capabilities.map((item, index) => <EvidenceCard key={index} item={item} compact />)}
        </div>
      </section>

      <DiagnosticSummaryPanel summary={diagnosticSummary} onCopy={onCopyDiagnostic} onOpenSettings={onOpenSettings} />
    </div>
  );
}
