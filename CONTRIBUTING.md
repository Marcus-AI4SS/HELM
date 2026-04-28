# Contributing

HELM is a local-first desktop dashboard. Contributions should preserve that product boundary.

## Product Boundary

Accepted directions:

- clearer project status views
- safer local file browsing
- better evidence and deliverable indexing
- stronger diagnostics
- better accessibility and installer guidance
- public-safe release tooling

Out of scope:

- chat UI
- prompt input
- one-click research execution
- hidden agent scheduling
- manuscript generation
- citation verification as an in-app claim
- submission automation

## Development

```powershell
cd apps/desktop
npm install
npm run build
cd src-tauri
cargo check
```

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File release/check-public-release.ps1
```

## Pull Request Checklist

- The app builds.
- `cargo check` passes.
- Python bridge files compile.
- Public privacy scan has zero findings.
- No personal paths, credentials, or real research materials are added.
- UI changes keep the five-page boundary: Project, Credibility, Next Step, Deliverables, Environment.

