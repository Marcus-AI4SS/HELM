# HELM Desktop Contract-First Refactor Plan

Date: 2026-05-05

## Goal

HELM is a desktop-first local research board for non-technical users. It must be installable and usable out of the box while still being able to:

- read a user's local VELA project;
- validate VELA project context and HELM handoff packets;
- run local validators;
- open local files and folders safely;
- prepare bounded Codex handoff text without silently executing research work.

This means HELM should keep a desktop runtime. A pure browser Web UI is useful for docs, previews, and demos, but it cannot reliably read arbitrary local project folders, launch local validators, or open project files without user friction and browser sandbox limits.

## Architecture Decision

Keep Tauri for the desktop shell, but make it thin.

```text
React UI
  -> TypeScript bridge client
  -> Tauri invoke commands
  -> Rust desktop shell
  -> Python HELM bridge
  -> VELA/HELM schemas, local readers, validators, file-open actions
```

Rust should not contain research product logic. It should only:

- locate bundled or development resources;
- locate and invoke Python;
- call the Python bridge with a JSON payload;
- return JSON or a clear bridge error to the UI;
- support desktop-only actions such as opening paths through the Python bridge.

Python should own local workflow logic. JSON Schema should own interface contracts.

## Cross-Repository Consistency Contract

This plan must stay consistent with:

- VELA plan: `D:\AI environment-GITHUB\git-folders\VELA-workflow\docs\contract-first-refactor-plan.md`
- Local environment plan: `D:\AI environment-GITHUB\git-folders\skills-environment-local\skills\docs\20-architecture\local-environment-contract-refactor-plan.md`

Shared ownership:

| Product | Owns | Must not own |
| --- | --- | --- |
| VELA | Public Codex workflow wrapper, starter package, `.vela/context.json`, Codex handoff schema, validation reports | Desktop UI, local dashboard, private harness runtime |
| HELM | Desktop local board, safe local file access, local validator invocation, copyable Codex handoff display | Creating research projects silently, executing Codex work, owning VELA state |
| Local environment | Private/source governance for skills, MCP, profiles, harness, playbooks, vetting, environment validation | Public product branding, HELM UI, VELA public runtime assumptions |

Shared schema names:

- `vela.project.context.v1`: VELA writes; HELM reads.
- `vela.codex.handoff.v1`: VELA writes/lints/renders for Codex.
- `helm.codex.handoff.v1`: HELM prepares; VELA may store only after explicit user export/save.
- `vela.validation.report.v1`: VELA validators emit.
- `vela.project.initializer.v1`: VELA public starter package manifest.

Required data flow:

```text
VELA -> writes schema-valid project state
HELM Desktop -> reads VELA state and prepares schema-valid copyable Codex handoff
Local environment -> supplies validated private governance and sanitized package snapshots only when explicitly exported
```

Forbidden data flow:

```text
HELM silently writes research state into VELA projects
VELA requires HELM to function
HELM packages private local environment outputs or user research data
Rust/Tauri layer contains research business logic
```

## Current Problems To Fix

### P1. Runtime interface checks are not schema-backed

File: `skills/scripts/helm_app_bridge.py`

Current behavior:

- `_load_vela_context()` accepts `.vela/context.json` when `schema_version == "vela.project.context.v1"`.
- `_codex_handoff()` emits a `helm.codex.handoff.v1`-shaped object but does not validate it.
- `skills/schemas/` does not include the runtime VELA/HELM interface schemas.
- `docs/imports/vela-helm-interface.schema.json` exists, but runtime code does not use it.

Required behavior:

- HELM must validate incoming VELA context against `vela.project.context.v1`.
- HELM must validate outgoing handoff against `helm.codex.handoff.v1`.
- Invalid input should be shown as `missing_context` or `invalid_context`, not silently downgraded to success.
- Invalid outgoing handoff should return a bridge error with schema error details.

### P1. Bridge script is too large and mixes responsibilities

File: `skills/scripts/helm_app_bridge.py`

Current behavior:

- One 1,100+ line script handles CLI parsing, action dispatch, VELA context reading, DTO construction, safe path opening, validator invocation, handoff construction, legacy compatibility, and public text replacement.
- The dispatch table uses anonymous lambdas, which makes ownership and testing unclear.

Required behavior:

- Keep `skills/scripts/helm_app_bridge.py` as a thin CLI entrypoint only.
- Move logic into focused modules under `skills/helm_bridge/`.
- Use named action handlers instead of anonymous lambdas.

### P2. Rust bridge logic is duplicated

Files:

- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src-tauri/src/main.rs`

Current behavior:

- Both files contain similar logic for bridge discovery, Python invocation, and self-test support.
- Drift between desktop invoke and CLI self-test is likely.

Required behavior:

- Add `apps/desktop/src-tauri/src/bridge.rs`.
- Move resource discovery, Python candidate selection, child-process invocation, and dashboard probe into `bridge.rs`.
- Keep `lib.rs` for Tauri command handlers.
- Keep `main.rs` for `--self-test`, `--self-test-json`, and app entry.

### P2. Public wording still uses old VELA expansion

Files include:

- `README.md`
- `README.zh-CN.md`
- `docs/index.html`
- `docs/imports.html`
- `docs/imports/vela-helm-interface.md`
- `docs/zh/index.html`
- selected sync logs where wording is historical

Previously observed behavior:

- Some public text used an outdated VELA expansion instead of the current product wording.

Required behavior:

- Current public wording should use `VELA = Versioned Evidence Lifecycle Architecture`.
- Historical sync logs may keep old wording only if marked as historical wording.
- Public product text must not imply HELM controls VELA or that VELA is an app.

### P2. Frontend build path assumes dependencies are installed

Current validation:

- `cargo check` passes.
- `python -m py_compile skills/scripts/helm_app_bridge.py skills/manager/research_env.py` passes.
- `npm run build` fails locally if `apps/desktop/node_modules` is missing because `tsc` is unavailable.

Required behavior:

- Document `npm ci` as the first source-build step.
- Add a lightweight dependency preflight or improve build docs so the failure is actionable.

## Target File Structure

Create:

```text
skills/helm_bridge/
  __init__.py
  schemas.py
  context_reader.py
  handoff.py
  presenters.py
  actions.py
  dispatch.py
  legacy_actions.py

skills/tests/
  test_helm_bridge_contracts.py
  test_helm_bridge_dispatch.py

apps/desktop/src-tauri/src/
  bridge.rs
```

Modify:

```text
skills/scripts/helm_app_bridge.py
skills/schemas/vela.project.context.v1.schema.json
skills/schemas/helm.codex.handoff.v1.schema.json
apps/desktop/src-tauri/src/lib.rs
apps/desktop/src-tauri/src/main.rs
apps/desktop/package.json
README.md
README.zh-CN.md
docs/index.html
docs/imports.html
docs/imports/vela-helm-interface.md
docs/zh/index.html
```

Do not move UI pages during this pass unless needed for tests. `apps/desktop/src/App.tsx` is large, but the urgent risk is the bridge contract and desktop runtime boundary.

## Step-by-Step Implementation Plan

### Task 1: Add runtime schemas to HELM

Files:

- Create: `skills/schemas/vela.project.context.v1.schema.json`
- Create: `skills/schemas/helm.codex.handoff.v1.schema.json`
- Modify: `docs/imports/vela-helm-interface.schema.json` only if it drifts from the runtime schemas.

Requirements:

- `vela.project.context.v1` must require:
  - `schema_version`
  - `generated_at`
  - `project.id`
  - `project.name`
  - `project.root`
  - `project.stage`
  - `project.status`
  - `paths`
  - `truth_files`
  - `counts`
  - `quality`
  - `helm.import_ready`
  - `helm.handoff_dir`
- `helm.codex.handoff.v1` must require:
  - `schema_version`
  - `generated_at`
  - `project`
  - `recommended_action`
  - `relevant_files`
  - `constraints`
  - `missing_inputs`
  - `validation_context`
  - `human_review_required`
  - `text`

Validation command:

```powershell
python -m json.tool skills/schemas/vela.project.context.v1.schema.json > $null
python -m json.tool skills/schemas/helm.codex.handoff.v1.schema.json > $null
```

### Task 2: Add schema validation module

Files:

- Create: `skills/helm_bridge/__init__.py`
- Create: `skills/helm_bridge/schemas.py`

Required API:

```python
from pathlib import Path
from typing import Any

def load_schema(schema_name: str) -> dict[str, Any]:
    ...

def validate_payload(payload: Any, schema_name: str, label: str) -> list[str]:
    ...

def validate_json_file(path: Path, schema_name: str, label: str | None = None) -> tuple[dict[str, Any] | None, list[str]]:
    ...
```

Implementation guidance:

- Use `jsonschema.Draft202012Validator`.
- Return a list of readable errors, not exceptions, for normal validation failures.
- Treat malformed JSON as a validation error.
- Do not import UI code or Tauri code.

Tests:

- Valid VELA context fixture returns no errors.
- Missing `project.id` returns a schema error.
- Invalid `counts.materials` type returns a schema error.

### Task 3: Split VELA context reader

Files:

- Create: `skills/helm_bridge/context_reader.py`
- Modify: `skills/scripts/helm_app_bridge.py`

Required API:

```python
def vela_context_path(project_root: str | None) -> Path | None:
    ...

def load_vela_context(project_root: str | None) -> dict[str, Any] | None:
    ...

def project_import_status(project_root: str | None) -> dict[str, Any]:
    ...
```

Behavior:

- `load_vela_context()` must validate using `vela.project.context.v1`.
- If schema fails, return `None` and expose errors through `project_import_status()`.
- Add `source` values:
  - `vela_context`
  - `legacy_files`
  - `missing_context`
  - `invalid_context`
- UI must be able to display invalid context distinctly from missing context.

### Task 4: Split HELM handoff builder

Files:

- Create: `skills/helm_bridge/handoff.py`
- Modify: `skills/scripts/helm_app_bridge.py`

Required API:

```python
def build_codex_handoff(payload: dict[str, Any]) -> dict[str, Any]:
    ...
```

Behavior:

- Build `helm.codex.handoff.v1`.
- Validate before returning.
- If invalid, raise a bridge-visible error containing schema errors.
- Keep human-readable `text` output.
- Do not write to `handoffs/helm` unless a future explicit user export action is added.

### Task 5: Split presenters and actions

Files:

- Create: `skills/helm_bridge/presenters.py`
- Create: `skills/helm_bridge/actions.py`
- Modify: `skills/scripts/helm_app_bridge.py`

Move these responsibilities:

- Page DTOs:
  - dashboard
  - project page
  - credibility/evidence page
  - next-step page
  - deliverables page
  - environment page
- Actions:
  - `run_validator`
  - `open_path`
  - `open_external_app`

Preserve safety behavior:

- `open_path` must refuse paths outside allowed roots.
- Risky executable-like files must open parent directory, not execute the file.
- Validator names must stay allowlisted.

### Task 6: Replace lambda dispatch with named handlers

Files:

- Create: `skills/helm_bridge/dispatch.py`
- Create: `skills/helm_bridge/legacy_actions.py`
- Modify: `skills/scripts/helm_app_bridge.py`

Required API:

```python
def dispatch(action: str, payload: dict[str, Any]) -> dict[str, Any]:
    ...
```

Behavior:

- Public actions registered by name.
- Legacy actions only registered when `HELM_ENABLE_LEGACY_BRIDGE_ACTIONS=1`.
- Unknown actions return the same error shape as today.
- No anonymous lambdas in the dispatch table.

### Task 7: Deduplicate Rust bridge

Files:

- Create: `apps/desktop/src-tauri/src/bridge.rs`
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Modify: `apps/desktop/src-tauri/src/main.rs`

Move into `bridge.rs`:

- `public_bridge_file_name`
- `legacy_bridge_file_name`
- `bridge_script`
- `has_bridge`
- `bridge_root`
- resource root detection
- Python invocation candidates
- child console hiding
- bridge command runner
- dashboard probe

Keep in `lib.rs`:

- Tauri command functions:
  - `get_dashboard`
  - `get_codex_handoff`
  - `run_validator`
  - `open_path`
  - `open_external_app`
- `run()`

Keep in `main.rs`:

- Windows console attach
- `--self-test`
- `--self-test-json`
- desktop app entry

Validation:

```powershell
cd apps/desktop/src-tauri
cargo check
```

### Task 8: Make build path explicit

Files:

- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/install.html`
- Optionally modify: `apps/desktop/package.json`

Required public source-build command:

```powershell
cd apps/desktop
npm ci
npm run build
npm run tauri dev
```

If adding a script, prefer:

```json
"doctor:deps": "node -e \"const fs=require('fs'); if(!fs.existsSync('node_modules/.bin/tsc.cmd') && process.platform==='win32') { console.error('Run npm ci first.'); process.exit(1) }\""
```

Then call it before build or document it. Do not hide dependency installation inside build.

### Task 9: Clean public wording

Files:

- `README.md`
- `README.zh-CN.md`
- `docs/index.html`
- `docs/imports.html`
- `docs/imports/vela-helm-interface.md`
- `docs/zh/index.html`
- `skills/scripts/helm_app_bridge.py`
- selected sync logs only if they are not historical records

Replace:

```text
VELA = <outdated expansion>
```

With:

```text
VELA = Versioned Evidence Lifecycle Architecture
```

Replace visible `Console` wording with `HELM`, `local board`, or `desktop board` unless the word is inside an intentional legacy compatibility replacement.

## Acceptance Tests

Run from `D:\AI environment-GITHUB\git-folders\HELM`.

```powershell
python -m py_compile `
  skills\scripts\helm_app_bridge.py `
  skills\manager\research_env.py `
  skills\helm_bridge\schemas.py `
  skills\helm_bridge\context_reader.py `
  skills\helm_bridge\handoff.py `
  skills\helm_bridge\presenters.py `
  skills\helm_bridge\actions.py `
  skills\helm_bridge\dispatch.py
```

```powershell
python -m unittest discover -s skills\tests
```

```powershell
cd apps\desktop
npm ci
npm run build
```

```powershell
cd apps\desktop\src-tauri
cargo check
```

Manual smoke:

- Launch HELM desktop.
- Select or pass a project with valid `.vela/context.json`.
- Confirm project source shows `VELA context`.
- Corrupt `.vela/context.json` by removing `project.id`.
- Refresh HELM.
- Confirm the UI reports invalid context instead of treating it as ready.
- Restore context.
- Copy Codex handoff.
- Confirm the handoff validates as `helm.codex.handoff.v1`.
- Open a safe project directory.
- Try opening a risky script file; HELM should open the parent directory rather than execute it.

## Non-Goals For This Pass

- Do not rewrite the full React UI.
- Do not remove Tauri.
- Do not add cloud sync.
- Do not make HELM create or mutate VELA projects.
- Do not silently write `handoffs/helm/*.json`.
- Do not mix private `skills-app-own` payloads into public HELM.

## Final Target

After this refactor, HELM should be easy to reason about:

```text
schema validates data
Python bridge reads local state and builds DTOs
Rust shell exposes desktop capabilities
React renders and copies handoffs
```

This keeps the desktop product useful for mainstream users while keeping the implementation auditable and maintainable.
