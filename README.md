<p align="center">
  <a href="https://marcus-ai4ss.github.io/HELM/">
    <img src="https://raw.githubusercontent.com/Marcus-AI4SS/HELM/main/site/assets/helm-icon.png" alt="HELM logo" width="112" />
  </a>
</p>

<h1 align="center">HELM</h1>

<p align="center">
  <strong>Hub for Evidence, Logs &amp; Monitoring</strong><br>
  A local command board for research projects, evidence readiness, files, local checks, and the note you take back to Codex.
</p>

<p align="center">
  <a href="https://github.com/Marcus-AI4SS/HELM/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Marcus-AI4SS/HELM/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://github.com/Marcus-AI4SS/HELM/actions/workflows/pages.yml"><img alt="Pages" src="https://github.com/Marcus-AI4SS/HELM/actions/workflows/pages.yml/badge.svg" /></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-2563eb" /></a>
</p>

<p align="center">
  <a href="README.zh-CN.md">Chinese</a>
  ·
  <a href="https://marcus-ai4ss.github.io/HELM/">Pages</a>
  ·
  <a href="docs/tutorial.html">First-run guide</a>
  ·
  <a href="docs/install.html">Install</a>
  ·
  <a href="docs/imports/vela-helm-interface.md">VELA interface</a>
  ·
  <a href="https://github.com/Marcus-AI4SS/VELA">VELA</a>
  ·
  <a href="PRIVACY.md">Privacy</a>
</p>

## What HELM Is

HELM = **Hub for Evidence, Logs & Monitoring**. It is a local research board that reads project state from your computer and shows the active project, stage, blockers, evidence readiness, existing files, local checks, and a bounded note for Codex.

Research still happens in Codex. HELM is not a chat app, writing tool, project creator, one-click research runner, hidden agent scheduler, citation verifier, or submission automation tool. It helps you see where a project stands and what should be handed back to Codex next.

## Start In Five Minutes

1. Open HELM.
2. If no project appears, open **Project** and copy the project intake note.
3. Paste that note into Codex so Codex can connect the project folder and prepare local context.
4. Return to HELM and refresh.
5. Review the five pages: **Project**, **Evidence**, **Codex Note**, **Files**, and **Local**.
6. Copy the note from **Codex Note** and continue the research in Codex.

You do not create projects inside HELM. Codex prepares project context; HELM reads and displays it.

## HELM And VELA

HELM and VELA are separate products. They can work together, and either can stand alone.

| Product | Role | Can stand alone? |
| --- | --- | --- |
| **VELA** = Versatile Experiment Lab & Automation | Prepares portable project structure, rules, handoff templates, and local context for Codex | Yes |
| **HELM** = Hub for Evidence, Logs & Monitoring | Reads and displays local project status, evidence, files, checks, and Codex notes | Yes |

Without VELA, HELM can show an empty state, public-safe examples, or configured project state. With VELA, HELM can read VELA-generated project context. The two products share language and interface contracts, but they do not share hidden memory, cloud sync, or background task execution.

Shared interface directions:

- `vela.project.context.v1`: HELM reads VELA project state.
- `helm.codex.handoff.v1`: HELM prepares a Codex continuation note; VELA should store it only after explicit user save or export.

See [VELA and HELM import interface](docs/imports/vela-helm-interface.md).

## The Five Pages

- **Project**: active project, stage, blockers, materials, and recent activity.
- **Evidence**: evidence levels and source readiness without overstating file reads as verified facts.
- **Codex Note**: a bounded note to copy back into Codex.
- **Files**: an index of existing local files and outputs.
- **Local**: local environment state, checks, and settings.

## Run From Source

```powershell
cd apps/desktop
npm install
npm run build
npm run tauri dev
```

For a build-only check:

```powershell
cd apps/desktop
npm run build
cd src-tauri
cargo check
```

See [Install](docs/install.html) for the user-facing install and build notes.

## Privacy Boundary

HELM is local-first. This repository does not include telemetry services, hosted backend logic, analytics SDKs, or a cloud sync layer. Public releases must not contain personal research material, reference-manager databases, note vaults, browser state, credentials, or local absolute paths.

See [PRIVACY.md](PRIVACY.md).

## Repository Layout

| Path | Purpose |
| --- | --- |
| `apps/desktop/` | React and Tauri desktop app |
| `docs/` | GitHub Pages site, import docs, and sync notes |
| `docs/imports/` | VELA and HELM import contracts |
| `docs/sync-log/` | Cross-repository synchronization notes |
| `skills/` | Public-safe runtime resources used by HELM |
| `site/` | Legacy Pages source retained for compatibility |

## Release Status

HELM is a public source candidate. A tagged binary release still needs signed packages, checksums, release notes, and first-run testing on Windows and macOS.
