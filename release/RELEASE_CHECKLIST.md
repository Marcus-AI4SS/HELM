# HELM Public Release Checklist

## V8.6 Source Repository Preparation

- Whitelist-migrated source exists in the `HELM` repository.
- Public README, license, privacy policy, security policy, and contributing guide exist.
- CI runs build, Python compile, Cargo check, and public privacy scan.
- GitHub Pages source exists under `site/`.
- Full public privacy scan has zero findings.

## V8.7 Install Delivery

- `release/build-public-artifacts.ps1` runs locally.
- Windows artifact workflow runs and uploads a public-candidate artifact.
- macOS artifact workflow runs and uploads a public-candidate artifact.
- Windows signing readiness is recorded in `signing-readiness-report.json`.
- macOS signing and notarization readiness are recorded in `signing-readiness-report.json`.
- SHA-256 checksums are generated for release artifacts.
- Unsigned artifacts are clearly labeled as public candidates, not final signed releases.

## V8.8 New User Testing

- One Windows first-use test is completed and recorded.
- One macOS first-use test is completed and recorded.
- No P0 or P1 install, launch, or onboarding issue remains.

## V9.0 GitHub Release

- Release branch is clean.
- Final public release check passes.
- Final five review gates have zero P0/P1 findings.
- Tag is created.
- Artifacts and checksums are attached.
- Release notes describe user-facing changes and known limitations.
- GitHub Pages is deployed and points to the release.
