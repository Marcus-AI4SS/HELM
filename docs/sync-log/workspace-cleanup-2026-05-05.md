# Workspace Cleanup Sync Log

Date: 2026-05-05

This repository is the current public HELM dashboard source.

Cleanup completed in the surrounding local workspace:

- Removed legacy `public-release/codex-research-stack` clones from both the D drive workspace and the C drive reference copy.
- Removed legacy `git-folders/skills-environment-release` clones from both locations.
- Removed old `CodexResearchConsole` / manager app build outputs from the root environment and local environment copies.
- Removed obsolete `workspace-control` scripts that still pointed to the old four-workspace split.

Current source-of-truth mapping:

- VELA workflow package: `D:\AI environment-GITHUB\git-folders\VELA-workflow`
- HELM public dashboard: `D:\AI environment-GITHUB\git-folders\HELM`
- Local research environment: `D:\AI environment-GITHUB\git-folders\skills-environment-local`
- Private local app: `D:\AI environment-GITHUB\git-folders\skills-app-own`

Do not restore `codex-research-stack`, `skills-environment-release`, or `skills-app-github` as active workspaces unless a later migration explicitly reopens them.
