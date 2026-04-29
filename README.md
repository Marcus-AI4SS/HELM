<p align="center">
  <a href="https://marcus-ai4ss.github.io/HELM/">
    <img src="site/assets/helm-icon.png" alt="HELM logo" width="112" />
  </a>
</p>

<h1 align="center">HELM</h1>

<p align="center">
  Local desktop command dashboard for research projects, evidence, deliverables, environment health, and Codex handoffs.
</p>

<p align="center">
  <a href="https://github.com/Marcus-AI4SS/HELM/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Marcus-AI4SS/HELM/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://github.com/Marcus-AI4SS/HELM/actions/workflows/pages.yml"><img alt="Pages" src="https://github.com/Marcus-AI4SS/HELM/actions/workflows/pages.yml/badge.svg" /></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-2563eb" /></a>
</p>

<p align="center">
  <a href="https://marcus-ai4ss.github.io/HELM/">Product site</a>
  ·
  <a href="site/install.html">Install guide</a>
  ·
  <a href="PRIVACY.md">Privacy</a>
  ·
  <a href="release/RELEASE_CHECKLIST.md">Release checklist</a>
</p>

## What HELM Is

HELM is a local desktop dashboard for research work. It shows what your project already knows: current phase, blockers, materials, evidence readiness, deliverables, local environment status, and the handoff that should continue in Codex.

HELM is intentionally narrow. It does not provide chat, prompt input, hidden agent scheduling, one-click research execution, manuscript writing, citation verification, or submission automation.

## New User Path

If you are opening HELM for the first time, use it in this order:

1. Install or build HELM, then open the desktop app.
2. Check the **Project** page. If HELM shows no trusted project, copy the project intake template.
3. Paste that template into Codex and ask Codex to connect your project folder.
4. Return to HELM and refresh. HELM should then show project status, evidence readiness, deliverables, environment health, and the next Codex handoff.

You do not need to create projects inside HELM. Codex prepares the project context; HELM reads it locally.

## HELM And VELA

HELM and VELA are separate tools that can work together.

| Project | Role | Boundary |
| --- | --- | --- |
| **VELA** | Workflow and environment layer | Produces local project context, evidence traces, validator outputs, and runtime state. |
| **HELM** | Desktop command dashboard | Reads local state, visualizes readiness, opens safe paths, and prepares Codex handoffs. |

The projects stay in separate repositories. HELM can run by itself in public sample or empty state. When a VELA-compatible environment is available beside HELM or configured through `HELM_VELA_SKILLS_ROOT`, HELM can read it as the live source.

## Core Screens

- **Project**: compare trusted projects, blockers, materials, deliverables, and recent activity.
- **Credibility**: inspect evidence source levels without overstating file-read signals.
- **Next Step**: review the next Codex handoff and local history summaries.
- **Deliverables**: browse generated artifacts and source files.
- **Environment**: diagnose runtime, validators, source mode, and local settings.

## Quick Start

```powershell
cd apps/desktop
npm install
npm run build
cd src-tauri
cargo check
```

Run the public release gate from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File release/check-public-release.ps1
```

## Build Desktop Artifacts

The release artifact script records signing readiness and checksums. It can build unsigned local artifacts when no signing credentials are configured.

```powershell
powershell -ExecutionPolicy Bypass -File release/build-public-artifacts.ps1
```

Generated artifacts are written under `release/artifacts/` and are not committed.

## Privacy Model

HELM is local-first. This repository has no telemetry service, hosted backend, analytics SDK, or cloud sync layer. Public release payloads must not include personal research materials, reference-manager databases, note vaults, browser profiles, credentials, or local absolute paths.

See [PRIVACY.md](PRIVACY.md).

## Repository Layout

```text
apps/desktop/        React and Tauri desktop app
skills/              Public-safe runtime resources used by HELM
release/             Release checks, artifact scripts, privacy scan, checklists
site/                GitHub Pages product site
.github/workflows/   CI, Pages, and artifact workflows
```

## Release Status

This repository is prepared as a public candidate. A tagged public release still needs signed or clearly unsigned artifacts, checksums, release notes, and clean Windows/macOS first-use test records.
