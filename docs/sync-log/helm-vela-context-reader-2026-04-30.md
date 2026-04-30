# HELM / VELA Context Reader Sync - 2026-04-30

## Scope

- Branch: `codex/vela-context-reader`
- Public repository: `Marcus-AI4SS/HELM`
- Read interface: `vela.project.context.v1`
- Preferred project path: `project-root/.vela/context.json`

## Decision

HELM now recognizes a VELA project context packet as the preferred project source when it exists. If the packet is missing, HELM falls back to the older local project files it already supported.

This public implementation only reads local context and prepares copyable Codex instructions. It does not automatically write a handoff JSON file into the project, because public HELM should not silently mutate project folders.

## Why This Replaces The Private PR

The private self-use branch contained a useful context-reader idea, but the draft pull request also carried older app code and private-repository history. The public HELM repository is now the source of truth for product development, so the useful behavior was ported here instead of merging the private draft.

## Verification Target

- Python bridge compiles.
- Frontend types compile.
- Public release check passes.
- Privacy scan finds no private repository names, local paths, browser state, Zotero data, Obsidian vaults, or credentials.
