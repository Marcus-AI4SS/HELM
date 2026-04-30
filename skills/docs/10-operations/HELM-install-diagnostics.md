# HELM Install And Diagnostic Notes

## Windows

1. Install Node.js, Rust, and Microsoft Edge WebView2 Runtime.
2. From the repository root, install and run HELM:

```powershell
cd apps/desktop
npm install
npm run build
npm run tauri -- dev
```

3. For release checks, return to the repository root:

```powershell
cd ..\..
powershell -ExecutionPolicy Bypass -File release/check-public-release.ps1
```

4. To build local artifacts from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File release/build-public-artifacts.ps1
```

## macOS

1. Install Node.js, Rust, and the system prerequisites required by Tauri.
2. From the repository root, install and run HELM:

```bash
cd apps/desktop
npm install
npm run build
npm run tauri -- dev
```

3. The public release gate is a PowerShell script. On macOS, run it with `pwsh` if installed, or rely on the GitHub Actions result for the public repository:

```bash
cd ../..
pwsh -File release/check-public-release.ps1
```

## First Launch

1. Open HELM.
2. If no project appears, use `项目` -> `复制接入说明`.
3. Paste that instruction into Codex and provide the real project folder path.
4. Return to HELM and click `刷新`.
5. Use `本机` -> `复制给 Codex 排查` only when you need help diagnosing a local setup problem.

## Diagnostic Summary

The diagnostic summary is meant for support and local troubleshooting. It includes:

- local read mode
- data source status
- current project state
- local check status
- latest visible error
- current local settings
- missing items
- suggested check commands

It must not include raw local absolute paths.

## Basic Checks

From the repository root:

```powershell
python -m py_compile skills/scripts/helm_app_bridge.py skills/manager/research_env.py
```

From `apps/desktop`:

```powershell
npm run build
npm run verify:ui
```

From `apps/desktop/src-tauri`:

```powershell
cargo check
```
