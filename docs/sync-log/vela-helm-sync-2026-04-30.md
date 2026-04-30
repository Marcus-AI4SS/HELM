# VELA / HELM Sync Log - 2026-04-30

## Scope

- HELM now treats `.vela/context.json` as the preferred VELA import surface.
- Legacy truth files remain available only as a compatibility fallback.

## HELM Changes

- Added VELA context detection in the bridge layer.
- Added import source state: `vela_context`, `legacy_files`, `missing_context`.
- Added `helm.codex.handoff.v1` output fields while preserving the readable Codex handoff text.
- Kept first-run guide, help panel, project selector, Pages tutorial, and smoke flow from the latest public HELM update.

## VELA Dependency

HELM expects VELA projects to expose `project-root/.vela/context.json` with `schema_version: "vela.project.context.v1"`.
