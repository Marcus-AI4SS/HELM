<p align="center">
  <a href="https://marcus-ai4ss.github.io/HELM/">
    <img src="https://raw.githubusercontent.com/Marcus-AI4SS/HELM/main/site/assets/helm-icon.png" alt="HELM logo" width="112" />
  </a>
</p>

<h1 align="center">HELM</h1>

<p align="center">
  Local research board for project status, evidence, deliverables, environment health, and Codex handoffs.
</p>

<p align="center">
  <a href="https://github.com/Marcus-AI4SS/HELM/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Marcus-AI4SS/HELM/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://github.com/Marcus-AI4SS/HELM/actions/workflows/pages.yml"><img alt="Pages" src="https://github.com/Marcus-AI4SS/HELM/actions/workflows/pages.yml/badge.svg" /></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-2563eb" /></a>
</p>

<p align="center">
  <a href="https://marcus-ai4ss.github.io/HELM/">Pages</a>
  ·
  <a href="https://github.com/Marcus-AI4SS/VELA-Versioned-Evidence-Lifecycle-Architecture">VELA</a>
  ·
  <a href="docs/imports/vela-helm-interface.md">VELA import interface</a>
  ·
  <a href="docs/install.html">Install</a>
  ·
  <a href="PRIVACY.md">Privacy</a>
</p>

## What HELM Is

HELM is a local desktop dashboard for research work. It shows project phase, blockers, materials, evidence readiness, deliverables, local environment status, and the handoff that should continue in Codex.

HELM is intentionally narrow. It does not provide chat, prompt input, hidden agent scheduling, one-click research execution, manuscript writing, citation verification, or submission automation.

## HELM And VELA

HELM and VELA are separate products that can work together.

| Product | Role | Can Stand Alone? |
| --- | --- | --- |
| **VELA** | Portable research workflow environment for Codex | Yes |
| **HELM** | Local research board for status, evidence, deliverables, environment health, and Codex handoffs | Yes |

Use HELM by itself when you want a local dashboard over public-safe sample or configured project state. Add [VELA](https://github.com/Marcus-AI4SS/VELA-Versioned-Evidence-Lifecycle-Architecture) when you want a portable workflow environment that HELM can read.

The shared import contract has two directions:

- `vela.project.context.v1`: HELM imports VELA project state.
- `helm.codex.handoff.v1`: VELA imports a HELM-prepared Codex handoff packet.

See [VELA and HELM import interface](docs/imports/vela-helm-interface.md).

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

## Repository Layout

| Path | Purpose |
| --- | --- |
| `apps/desktop/` | React and Tauri desktop app |
| `docs/` | GitHub Pages product site, import docs, and synchronization notes |
| `docs/imports/` | VELA and HELM import contracts |
| `docs/sync-log/` | Local cross-repository synchronization notes |
| `skills/` | Public-safe runtime resources used by HELM |
| `release/` | Release checks, artifact scripts, privacy scan, and checklists |
| `site/` | Legacy Pages source retained for compatibility while `docs/` becomes the public site |
