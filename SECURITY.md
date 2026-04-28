# Security

## Supported Versions

This repository is a public candidate. Security fixes target the current `main` branch until the first tagged release is published.

## Reporting

Please open a GitHub security advisory or a minimal issue that describes the affected area without posting secrets, credentials, private paths, or personal research data.

## Desktop Command Surface

HELM keeps the desktop command surface intentionally small:

- read dashboard data
- read page data
- prepare a handoff
- open safe local paths
- run configured local validators
- open an external application requested by the user

Risky executable files should not be launched directly through the path-opening flow. Safe viewing and folder opening are preferred.

## Data Boundary

Public artifacts must be generated from sanitized source. Do not add real project materials, browser state, reference-manager databases, note vaults, or credentials to this repository.

