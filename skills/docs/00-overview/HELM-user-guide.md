# HELM V8.5 User Guide

HELM is a local research dashboard. It reads project status, evidence files, deliverables, validator reports, and environment state. Codex remains the only research execution entrypoint.

## First Run

1. Open HELM.
2. Stay on `项目`.
3. If HELM shows no trusted project, click `复制项目接入模板`.
4. Paste the template into Codex.
5. Replace `<PROJECT_PATH>` with the real project root.
6. Ask Codex to mark the project trusted in the local project configuration, then read or complete the HELM truth sources.
7. Return to HELM and click `刷新`.

HELM does not create projects or register paths. The app only reads files that already exist in the trusted local workflow.

## Project Truth Sources

HELM expects Codex-managed projects to expose these local files:

- `research-map.md`: project identity, research scope, stage, and next step.
- `material-passport.yaml`: material entries, source identity, read status, and missing items.
- `evidence-ledger.yaml`: evidence chain, validator state, and blockers.
- `findings-memory.md`: confirmed findings and unresolved checks.

If a project does not appear in HELM after refresh, ask Codex to confirm that the project path is listed as trusted and then inspect these files.

## Settings

Open settings from the top-right toolbar or the `环境` page.

- `启动页`: chooses the first page shown when HELM opens.
- `记住上次项目`: stores or removes the last selected project root in local browser storage.
- `显示密度`: switches between standard and compact spacing.
- `减少动效`: follows the system setting by default, or can be forced on/off.
- `交接历史保留`: keeps at most 0, 5, 10, or 20 local handoff summaries.

Settings are stored only in frontend `localStorage`. HELM does not write project files, environment repos, or hidden config files for these preferences.

## Startup Cache

HELM stores the latest dashboard snapshot in frontend `localStorage` for faster startup. If the cache is less than 12 hours old and still matches the remembered project, HELM opens from that cache instead of reading the local environment again.

Click `刷新` when you need the latest project files, validator state, or trusted project list. Manual refresh and project switching still use the live bridge.

## Diagnostics

Use `环境` -> `复制诊断摘要` when HELM cannot read the local environment or a validator fails. The copied text redacts local absolute paths and keeps only status, mode, missing items, and suggested check commands.

## Product Boundary

HELM can open local resources, run local validators, display status, and copy a Codex handoff. It must not be used as a chat surface, writing engine, citation verifier, submission tool, project creator, or agent scheduler.
