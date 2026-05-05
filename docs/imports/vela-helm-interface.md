# HELM and VELA Import Interface

HELM and VELA are separate products. HELM is the Hub for Evidence, Logs & Monitoring. VELA is the Versioned Evidence Lifecycle Architecture workflow wrapper for Codex. The integration boundary is explicit local files, not app memory, telemetry, or hidden automation.

## Direction 1: VELA → HELM

HELM imports a VELA project context packet when a project exposes `vela.project.context.v1`.

Recommended path:

```text
project-root/.vela/context.json
```

Minimal packet:

```json
{
  "schema_version": "vela.project.context.v1",
  "producer": "VELA",
  "consumer": "HELM",
  "generated_at": "2026-04-30T00:00:00Z",
  "project": {
    "id": "sample-project",
    "name": "Sample Project",
    "title": "Sample Project",
    "root": ".",
    "stage": "research_design",
    "status": "initialized"
  },
  "paths": {
    "materials": "materials",
    "evidence": "evidence",
    "claims": "claims",
    "methods": "methods",
    "deliverables": "deliverables",
    "handoffs": "handoffs",
    "handoffs_helm": "handoffs/helm",
    "logs": "logs"
  },
  "truth_files": [
    { "name": "research-map.md", "path": "research-map.md", "exists": true },
    { "name": "findings-memory.md", "path": "findings-memory.md", "exists": true },
    { "name": "material-passport.yaml", "path": "material-passport.yaml", "exists": true },
    { "name": "evidence-ledger.yaml", "path": "evidence-ledger.yaml", "exists": true }
  ],
  "counts": {
    "materials": 0,
    "evidence": 0,
    "claims": 0,
    "deliverables": 0,
    "handoffs": 1
  },
  "quality": {
    "blockers": [],
    "warnings": [],
    "validators": []
  },
  "helm": {
    "import_ready": true,
    "handoff_dir": "handoffs/helm"
  }
}
```

HELM must treat missing fields as unknown, not as success.

## Direction 2: HELM → Codex / VELA

VELA imports a HELM handoff packet when HELM prepares a bounded continuation task for Codex.

Recommended path:

```text
project-root/handoffs/helm/2026-04-29-codex-handoff.json
```

Minimal packet:

```json
{
  "schema_version": "helm.codex.handoff.v1",
  "producer": "HELM",
  "consumer": "VELA",
  "generated_at": "2026-04-30T00:00:00Z",
  "project": { "id": "sample-project", "name": "Sample Project", "root": "." },
  "recommended_action": "Review the evidence index and identify unsupported claims.",
  "relevant_files": ["research-map.md", "evidence-ledger.yaml"],
  "constraints": ["Do not invent citations.", "Keep private paths out of deliverables."],
  "missing_inputs": ["No DOI verification has been run for new sources."],
  "validation_context": { "source": ".vela/context.json", "schema_version": "vela.project.context.v1" },
  "human_review_required": true,
  "text": "Copy this bounded task back into Codex."
}
```

HELM prepares the packet for the user to copy back into Codex. The public HELM app does not silently write this packet into a project folder and does not execute the task automatically.

## Shared Boundary Rules

- Either product can be used alone.
- Import packets are local files that users can inspect, copy, commit, or delete.
- The interface does not authorize cloud sync, background execution, hidden agent scheduling, or automatic citation claims.
- VELA owns workflow state. HELM owns local dashboard presentation and copyable handoff preparation.

The machine-readable schema is [vela-helm-interface.schema.json](./vela-helm-interface.schema.json).
