# HELM New User Test Script

Use this script before a tagged public release.

## Windows

- Install or build HELM from a clean checkout.
- Launch the desktop app.
- Confirm the app starts with no available project and shows the first-run guide instead of crashing.
- Confirm the five main views are available: 项目, 证据, 交给 Codex, 文件, 本机.
- Confirm the settings panel opens and closes.
- Copy the note for Codex.
- Run the release check script.
- Record OS version, install path, first-launch result, and any blocking issue.

## macOS

- Build from a clean checkout or install the guided bundle prepared for the release.
- Launch the app from Finder or Terminal.
- Confirm Gatekeeper, signing, or quarantine behavior is documented.
- Confirm the app starts with no available project and shows the first-run guide.
- Confirm the five main views are readable at the minimum supported window size.
- Copy the note for Codex.
- Record macOS version, chip architecture, install method, first-launch result, and any blocking issue.

## Acceptance

Public release should not proceed if either platform has a P0 or P1 first-use failure.
