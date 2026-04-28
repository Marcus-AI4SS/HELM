# HELM V8.5 Install And Diagnostic Notes

## Windows

1. Build with `powershell -ExecutionPolicy Bypass -File skills/scripts/build-codex-manager-exe.ps1`.
2. Refresh the Desktop shortcut with `powershell -ExecutionPolicy Bypass -File skills/scripts/create-codex-manager-shortcut.ps1`.
3. Launch `HELM 本地科研看板`.
4. If the app opens but shows no trusted project, use `项目` -> `复制项目接入模板`.
5. If the app cannot read the environment, use `环境` -> `复制诊断摘要`.

The shortcut target should point to `skills/outputs/manager-app/dist/HELMLocalResearchBoard.exe`. Its icon should point to the HELM app icon asset.

## macOS Guided Bundle

1. Build with `powershell -ExecutionPolicy Bypass -File skills/scripts/build-codex-manager-bundle.ps1`.
2. Use the generated guided bundle under `skills/outputs/manager-app/macos-guided/`.
3. Follow the bundle instructions on the target Mac.

The guided bundle is expected to contain sanitized runtime resources only. It must not include personal project outputs, browser state, Zotero or Obsidian databases, or credentials.

## Diagnostic Summary

The diagnostic summary is meant for support and development triage. It includes:

- runtime mode
- source status
- current project state
- validator state
- latest visible error
- current local settings
- missing items
- suggested check commands

It must not include raw local absolute paths.

## Basic Checks

- `cd apps/desktop && npm run build`
- `python -m py_compile skills/scripts/helm_app_bridge.py skills/manager/research_env.py skills/manager/app.py`
- `cd apps/desktop/src-tauri && cargo check`
- `powershell -ExecutionPolicy Bypass -File skills/scripts/verify-codex-console-v8-release.ps1 -SkipInstall`
- `powershell -ExecutionPolicy Bypass -File skills/scripts/verify-helm-public-candidate.ps1 -SkipReleaseCheck`
