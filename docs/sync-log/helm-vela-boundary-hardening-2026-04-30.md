# HELM / VELA Boundary Hardening Log - 2026-04-30

## Scope

This log is for the VELA integration thread. It records the HELM-side decision after reviewing the old self-use app draft PR and the public HELM VELA context work.

## Decision

- Public HELM is the source of truth for future development.
- The old self-use app draft PR should not be merged into the self-use app repository because it contains a broad historical V8.1 app payload mixed with a small VELA context idea.
- The useful idea is kept in public HELM: HELM can read VELA project context from `project-root/.vela/context.json` when the packet declares `schema_version: "vela.project.context.v1"`.

## HELM Boundary

- HELM reads local status and presents it to the user.
- HELM prepares a copyable Codex handoff packet with `schema_version: "helm.codex.handoff.v1"`.
- HELM does not silently write handoff JSON files into the project folder.
- HELM does not execute research work, schedule agents, verify citations, or mutate VELA project state.

## VELA Thread Next Step

VELA should generate `project-root/.vela/context.json` as the explicit import surface. HELM expects that file to contain project identity, paths, truth files, counts, blockers or warnings, validator status, and `helm.import_ready`.

The VELA thread should not rely on HELM to create `handoffs/helm/*.json` automatically. If file-based handoff export is needed later, it should be implemented as an explicit user action with a visible button and release-gated privacy checks.

## HELM Changes In This Round

- Removed HELM's automatic handoff file write from the bridge.
- Kept copyable handoff text and structured handoff fields.
- Reworded user-facing VELA context labels into Chinese product language.
- Documented the read-first boundary in the import contract and sync log.

## Validation

Passed on this branch:

- `python -m py_compile skills/scripts/helm_app_bridge.py`
- temporary VELA context read/write-boundary check: HELM reads `vela.project.context.v1` and does not create `handoffs/helm`
- `npm run verify:public`
