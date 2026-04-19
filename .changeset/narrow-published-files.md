---
"scriptable": patch
---

Narrow the published tarball to `dist/` (plus auto-included `README.md`, `LICENSE`, `package.json`). Previously the absence of a `files` field caused `npm publish` to include `src/` (sources and tests), `scripts/release.js`, and `tsconfig.json` — 38 files / 149 KB, most of it irrelevant to consumers. Socket flagged four URL fragments in those shipped-but-unused files (test comments, a `console.log` in the release helper). Published tarball is now 13 files / 42 KB and contains no references to external URLs beyond the `repository` metadata.

Also added `prebuild: rm -rf dist` so stale compiled artifacts from deleted source files don't persist across builds.
