# scriptable

## 0.1.1

### Patch Changes

- e243ccb: Releases are now published from GitHub Actions via npm OIDC trusted publishing. Each published artifact carries an npm provenance attestation, and no `NPM_TOKEN` secret is stored anywhere.

## 0.1.0

### Minor Changes

- Rewritten in TypeScript, using the `acorn` parser. All legacy runtime dependencies have been dropped.
- Hardened the sandbox: fixed a set of sandbox-escape and prototype-pollution vectors, and added DoS protections (execution limits) so runaway scripts can no longer lock up the host process.
