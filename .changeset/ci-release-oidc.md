---
"scriptable": patch
---

Releases are now published from GitHub Actions via npm OIDC trusted publishing. Each published artifact carries an npm provenance attestation, and no `NPM_TOKEN` secret is stored anywhere.
