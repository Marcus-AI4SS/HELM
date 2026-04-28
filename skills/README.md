# HELM Runtime Resources

This directory contains public-safe runtime resources used by the HELM desktop app.

It can include schemas, catalogs, profiles, app bridge code, and documentation that help the app render local project and environment state. It must not include personal project materials, credentials, browser state, reference-manager databases, or local absolute paths.

When a VELA-compatible environment is available, HELM can read it as a live source. Otherwise HELM falls back to the public-safe resources in this repository.

