# Privacy

HELM is designed as a local desktop dashboard. This public repository does not include a hosted service, telemetry endpoint, analytics SDK, or cloud sync layer.

## Local Data

HELM may read local project state when you point it at a trusted project or a VELA-compatible environment. Typical inputs include project maps, material indexes, evidence ledgers, deliverable indexes, validator results, and environment status files.

The app displays this information locally. It does not upload it from the code in this repository.

## Local Storage

The frontend can store lightweight preferences in browser local storage:

- last selected project identifier
- display density
- launch page
- reduced motion preference
- handoff history summaries

Handoff history stores summaries only. It should not be used to store full research materials, credentials, notes, manuscript text, or datasets.

## Release Payload Boundary

Public release payloads must exclude:

- personal project outputs
- real research materials
- Zotero or reference-manager databases
- Obsidian or note vaults
- browser profiles or session state
- credentials, tokens, cookies, keys, or local service secrets
- local absolute paths
- unreleased environment snapshots that contain personal data

The release scripts include a public privacy scan that checks for known local-path and data-boundary risks before release.

## VELA Companion Environments

VELA can provide live environment state for HELM. When used, it remains a separate local source. HELM reads the configured source and presents its status; it does not turn VELA data into public release content.

