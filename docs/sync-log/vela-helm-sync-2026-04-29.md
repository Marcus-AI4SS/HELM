# VELA HELM Sync Log - 2026-04-29

## Scope

- HELM public repository: `Marcus-AI4SS/HELM`
- VELA repository: `Marcus-AI4SS/VELA-Versioned-Evidence-Lifecycle-Architecture`
- HELM private/self-use repository verified separately and kept outside the public release lane.

## Boundary Decision

VELA and HELM remain independent products. HELM is the local research board. VELA is the portable workflow environment. The two repositories share visual language, page structure, and import contracts, but neither product controls the other.

## Synchronized Items

- GitHub README now points to the counterpart repository and import interface.
- Pages source is `docs/` to match the public VELA documentation structure.
- Import contract added at `docs/imports/vela-helm-interface.md`.
- Machine-readable schema added at `docs/imports/vela-helm-interface.schema.json`.
- Shared direction names:
  - `vela.project.context.v1`: VELA to HELM project context import.
  - `helm.codex.handoff.v1`: HELM to VELA Codex handoff import.

## Local Note

The private HELM/self-use line is not the public Pages target. Public homepage and Pages work should land in `Marcus-AI4SS/HELM`, not in any private self-use repository.
