# HELM and VELA Import Interface

HELM and VELA are separate products. HELM is the local research board. VELA is the portable workflow environment. The integration boundary is explicit local files, not app memory, telemetry, or hidden automation.

## Direction 1: VELA to HELM

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
  "project": {
    "id": "sample-project",
    "title": "Sample Project",
    "root": "."
  },
  "paths": {
    "materials": "materials/",
    "evidence": "evidence/",
    "claims": "claims/",
    "methods": "methods/",
    "deliverables": "deliverables/",
    "handoffs": "handoffs/"
  },
  "status": {
    "phase": "scoping",
    "blocked": false,
    "last_updated": "2026-04-29T00:00:00Z"
  },
  "evidence": {
    "items": 0,
    "verified": 0,
    "pending": 0
  },
  "deliverables": [],
  "handoffs": []
}
```

HELM must treat missing fields as unknown, not as success.

## Direction 2: HELM to VELA

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
  "project_id": "sample-project",
  "created_at": "2026-04-29T00:00:00Z",
  "codex_task": {
    "task": "Review the evidence index and identify unsupported claims.",
    "relevant_files": ["evidence/index.md", "claims/draft.md"],
    "constraints": ["Do not invent citations.", "Keep private paths out of deliverables."],
    "expected_output": "A review note with unsupported claim IDs and required evidence.",
    "known_gaps": ["No DOI verification has been run for new sources."],
    "review_standard": "Every claim must point to a visible evidence item."
  }
}
```

HELM prepares the packet. It does not execute the task automatically.

## Shared Boundary Rules

- Either product can be used alone.
- Import packets are local files that users can inspect, copy, commit, or delete.
- The interface does not authorize cloud sync, background execution, hidden agent scheduling, or automatic citation claims.
- VELA owns workflow state. HELM owns local dashboard presentation and handoff preparation.

The machine-readable schema is [vela-helm-interface.schema.json](./vela-helm-interface.schema.json).
