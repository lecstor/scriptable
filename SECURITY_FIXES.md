# Security Audit — scriptable@0.1.1

## Scope

`scriptable` is a sandboxed JavaScript expression evaluator. User code is parsed by `acorn` into an AST and executed by a tree-walking interpreter in `src/evaluate.ts`. The audit covered the interpreter surface, the environment/scope implementation, builtin functions, and the dependency tree.

## Audit findings

### Code-injection sinks (eval / new Function / child_process)

**None present.** `rg "\beval\b|new Function|child_process|execSync"` across `src/` matches only identifiers inside *user-supplied script strings in tests* (e.g. `eval("1+1")` as an attacker payload, which the sandbox correctly rejects with `"eval is not a function"`). The interpreter never lowers user code into the host's `eval` or `Function` — it walks the acorn AST directly.

> Explicit non-change: **did not introduce `vm2`.** `vm2` was deprecated in 2023 after multiple unfixable sandbox-escape CVEs (GHSA-ch3r-j5x3-6q2m, GHSA-g644-9gfx-q4q4, GHSA-cchq-frhr-rjg8). Swapping the current AST-walker for `vm2` would be a security regression, not a mitigation. The existing "interpret the AST, never hand a string to the host runtime" design is strictly safer than any `vm`-module–based sandbox.

### Prototype pollution / sandbox escape

Already hardened. `BLOCKED_PROPS = {constructor, __proto__, prototype, __defineGetter__, __defineSetter__, __lookupGetter__, __lookupSetter__}` is enforced in four places:

1. `evaluate.ts` `MemberExpression` — blocks `a.constructor`, `a["__proto__"]`, and variable-indirected forms (`k = "constructor"; a[k]`).
2. `evaluate.ts` `evalAsPath` — blocks the same names on assignment LHS and call callees (`a.__proto__ = x`, `a.constructor(...)`).
3. `evaluate.ts` `ObjectExpression` — rejects blocked keys as object-literal keys (static, computed, and shorthand), so `{__proto__: {...}}` cannot set the prototype of a fresh literal; spreads drop blocked own-keys by manual copy (not `Object.assign`, which invokes the `__proto__` setter).
4. `environment.ts` `assertSafeParts` — `deepHas` / `deepGet` / `deepSet` re-check every segment so nothing slips through a deep path.

Host-provided `env` values flow through the same sandbox (`env.constructor` still throws). 84 tests in `security.test.ts` plus 17 in `audit-followups.test.ts` cover these paths.

### Forbidden language surface

`ThisExpression`, `NewExpression`, `ImportExpression`, and `arguments` have no `evals[...]` handler, so they throw `"Cannot evaluate <Type>"` or `"<name> is not defined"` — i.e. `eval`, `Function`, `require`, `process`, `globalThis`, and `import()` are all unreachable.

### DoS controls (per-run limits)

Already in place via `Runtime`:

- `maxSteps` (default 100 000) — interpreter step budget, checked every `evaluate()`.
- `maxCodeSize` (default 64 KiB) — bounds parser work before acorn runs.
- `maxAllocSize` (default 1 000 000) — bounds string length, array length, and object own-key count; checked on every value returned from a handler and projected before array/spread growth to trip before V8's 65 K argument-stack limit.
- `maxDurationMs` (default 0, opt-in) — wall-clock deadline checked between steps; guards against long native builtin calls (`sort` on 1M-element array) that don't advance the step counter.

Counters live on a per-run `Runtime` instance (not a module global), so re-entrant runs (`runInner` callback pattern) can't leak budget between caller and callee — regression test at `security.test.ts:297`.

### Dependencies

`pnpm audit` reported:

| Severity | Package | Advisory |
|----------|---------|----------|
| high     | vite (transitive via vitest) | [GHSA-v2wj-q39q-566r](https://github.com/advisories/GHSA-v2wj-q39q-566r) — `server.fs.deny` bypass |
| high     | vite | [GHSA-p9ff-h696-f583](https://github.com/advisories/GHSA-p9ff-h696-f583) — arbitrary file read via dev-server WebSocket |
| moderate | vite | [GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) — path traversal in optimized deps |

All three are **dev-dependency-only** (vitest's test-runner dev-server) and do not ship to consumers of `@lecstor/scriptable`. Runtime dep is only `acorn@^8.14.1`, which has no open advisories.

## Changes made

### 1. `package.json` — update vitest and pin vite to a patched version

```diff
- "vitest": "^3.1.0"
+ "vitest": "^4.1.4"
+ "pnpm": { "overrides": { "vite": "^7.3.2" } }
```

- Bumped `vitest` 3.2.4 → 4.1.4.
- Added a `pnpm.overrides` entry forcing `vite` to ≥ 7.3.2 (earliest version patched for all three advisories). `vitest@4.1.4`'s peer resolves to `vite@7.3.1`, which is still vulnerable; the override pulls 7.3.2+ without breaking the peer range.
- Regenerated `pnpm-lock.yaml`; `pnpm audit` now reports **"No known vulnerabilities found"**.

### 2. Validation

All 198 existing tests pass on the updated toolchain (`pnpm test`), including the 101 security/audit-followup tests exercising prototype-chain blocks, `__proto__` handling, deep-path pollution, DoS caps, and re-entrance isolation.

## Items considered and deliberately not changed

- **`var` in `src/`** — the only occurrence is `if (exp.kind === "var")` in `evaluate.ts:379`, where the interpreter handles the `var` keyword from *user scripts*. No TypeScript source uses `var` itself.
- **CSP / strict headers** — not applicable. `scriptable` is a library, not a server; it emits no HTTP responses. A CSP would belong to the embedder, not the library.
- **"Use strict"** — `type: "module"` in `package.json` makes every `src/*.ts` implicit strict mode; adding `"use strict"` directives would be dead code.
- **Replacing the AST walker with `vm2` / `vm` / `isolated-vm`** — see note above. The current design is strictly safer than `vm2` and does not require a native addon the way `isolated-vm` does.

## Residual risk

- Host-provided builtins (`functions` map) and host-provided `env` values run with full host privilege. A caller that passes `{ fs }` into `env` has voluntarily handed the sandbox a filesystem. This is by design and documented in the README; the sandbox only guarantees that the *script text* cannot reach host capabilities it was not explicitly given.
- `maxDurationMs` defaults to `0` (disabled). Single-tenant callers running trusted templates don't need it; multi-tenant hostile workloads should opt in.
