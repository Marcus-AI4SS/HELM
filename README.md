# HELM

HELM is a local desktop command dashboard for research work. It helps you see project status, evidence readiness, deliverables, local environment health, and the handoff that should be continued in Codex.

HELM does not run research for you. It does not provide chat, prompt input, hidden agent scheduling, citation verification, manuscript writing, or submission automation. It reads local state, shows what is known, and prepares a concise handoff so the work can continue in Codex.

## What HELM Does

- Shows trusted local projects and their current phase, blockers, materials, deliverables, and recent activity.
- Opens safe local folders and source files so you can inspect the evidence trail.
- Runs local validators when the bundled environment provides them.
- Copies a Codex handoff summary without writing back into your research project.
- Starts without a local research environment by showing an empty or sample state.

## HELM And VELA

HELM and VELA are separate projects with linked roles.

- **HELM** is the desktop command dashboard. It reads status and prepares handoffs.
- **VELA** is the companion workflow and environment layer. It can provide project facts, evidence traces, validator outputs, and runtime context that HELM displays.

They are intentionally kept in separate repositories. HELM can run by itself in public sample mode. When a VELA-compatible environment exists beside it or is configured with `HELM_VELA_SKILLS_ROOT`, HELM can read that environment as its live source.

## Quick Start

```powershell
cd apps/desktop
npm install
npm run build
cd src-tauri
cargo check
```

To run the public release checks from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File release/check-public-release.ps1
```

## Desktop App

The app is built with React, Vite, and Tauri v2.

```powershell
cd apps/desktop
npm run dev
```

For a native desktop development run:

```powershell
cd apps/desktop
npm run tauri dev
```

## Repository Layout

```text
apps/desktop/        React and Tauri desktop app
skills/              Public-safe runtime resources used by HELM
release/             Public release checks, privacy scan, and release checklist
site/                GitHub Pages product site
.github/workflows/   CI and Pages workflows
```

## Privacy Model

HELM is local-first. It has no telemetry service and no hosted backend in this repository. The app may read local project files when you choose a trusted project, but public release payloads must not include personal project materials, browser state, Zotero databases, Obsidian vaults, credentials, or local absolute paths.

See [PRIVACY.md](PRIVACY.md) for the detailed boundary.

## Release Status

This repository is prepared as a public candidate. Before a tagged release, run the public release checklist in [release/RELEASE_CHECKLIST.md](release/RELEASE_CHECKLIST.md), generate artifacts, checksums, release notes, and final review records.

## License

MIT. See [LICENSE](LICENSE).

