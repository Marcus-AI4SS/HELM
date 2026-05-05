# VELA HELM Sync Log - 2026-04-29

## Scope

- HELM public repository: `Marcus-AI4SS/HELM`
- VELA repository: `Marcus-AI4SS/VELA`
- Self-use HELM work was kept outside the public release lane.

## Boundary Decision

VELA and HELM remain independent products. HELM is the Hub for Evidence, Logs & Monitoring. VELA is the Versioned Evidence Lifecycle Architecture workflow wrapper. The two repositories share visual language, page structure, and import contracts, but neither product controls the other.

## Synchronized Items

- GitHub README now points to the counterpart repository and import interface.
- Pages source is `docs/` to match the public VELA documentation structure.
- Import contract added at `docs/imports/vela-helm-interface.md`.
- Machine-readable schema added at `docs/imports/vela-helm-interface.schema.json`.
- Shared direction names:
  - `vela.project.context.v1`: VELA → HELM project context import.
  - `helm.codex.handoff.v1`: HELM → Codex / VELA handoff import.

## Local Note

The self-use HELM line is not the public Pages target. Public homepage and Pages work should land in `Marcus-AI4SS/HELM`.
