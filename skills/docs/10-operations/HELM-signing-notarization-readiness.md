# HELM Signing And Notarization Readiness

V8.5 records signing readiness but does not perform real signing or notarization.

## Public Candidate Policy

The local public-candidate lane may report signing and notarization as `not_configured`. The report must still exist and be parseable.

Required report:

- `skills/outputs/manager-app/public-candidate/signing-readiness-report.json`

## Windows Readiness

Before a real public release, prepare one of:

- a Windows code-signing certificate
- a trusted signing service
- a CI signing pipeline with controlled secret access

The local readiness check only detects environment-variable based configuration markers. It does not inspect private certificates.

## macOS Readiness

Before a real public release, prepare:

- Developer ID Application signing identity
- notarization credentials or a notarization keychain profile
- hardened runtime and entitlements review
- Gatekeeper install test on a clean macOS account

The guided bundle remains unsigned unless a separate release signing step is executed.

## Non-Goals

- No certificate generation.
- No real notarization submission.
- No credential storage in this repository.
- No signing credentials or notarization secrets stored in this repository.
