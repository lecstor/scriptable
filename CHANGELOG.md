# scriptable

## 0.1.0

### Minor Changes

- Rewritten in TypeScript, using the `acorn` parser. All legacy runtime dependencies have been dropped.
- Hardened the sandbox: fixed a set of sandbox-escape and prototype-pollution vectors, and added DoS protections (execution limits) so runaway scripts can no longer lock up the host process.
