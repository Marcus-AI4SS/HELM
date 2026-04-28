# HELM Desktop

Tauri/React desktop shell for HELM.

## Role

- Codex is the main user entry and execution engine.
- This app is the visual dashboard, local file/tool console, evidence browser, deliverable index, and environment health surface.
- The app does not provide chat, hidden agent scheduling, or fake workflow progress.

## Runtime

- Frontend: React + Vite + lucide icons.
- Desktop shell: Tauri v2.
- Backend bridge: `skills/scripts/helm_app_bridge.py`.
- Data source: optional VELA-compatible environment first, embedded HELM resources second.

## Commands

```powershell
npm install
npm run build
cd src-tauri
cargo check
```

Run `powershell -ExecutionPolicy Bypass -File ../../release/check-public-release.ps1` from this directory to execute the public release gate.
