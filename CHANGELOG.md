# scriptable

## 0.2.1

### Patch Changes

- bb3b162: Narrow the published tarball to `dist/` (plus auto-included `README.md`, `LICENSE`, `package.json`). Previously the absence of a `files` field caused `npm publish` to include `src/` (sources and tests), `scripts/release.js`, and `tsconfig.json` — 38 files / 149 KB, most of it irrelevant to consumers. Socket flagged four URL fragments in those shipped-but-unused files (test comments, a `console.log` in the release helper). Published tarball is now 13 files / 42 KB and contains no references to external URLs beyond the `repository` metadata.

  Also added `prebuild: rm -rf dist` so stale compiled artifacts from deleted source files don't persist across builds.

## 0.2.0

### Minor Changes

- 3fcb7fc: Add `maxAllocSize` option to `runner()` (default 1,000,000). Caps the length of any string or array value produced during a run. Without this bound, exponential growth from string concat (`s = s + s`), template literals, or `concat()` stayed well within the step budget — 26 doublings from an 8-char seed could allocate ~512 MiB. Array spread now also enforces projected length before growing, using a loop instead of `push(...spread)` so enforcement fires at `maxAllocSize` rather than V8's ~65K argument-stack ceiling. Set to `0` to disable.
- ae442ce: Add `maxCodeSize` option to `runner()` (default 64 KiB). The step counter bounds execution but not parsing — acorn still reads multi-megabyte input before the interpreter sees it, which is ~200ms of CPU per 50 MB on a modern machine. Sources over the limit now throw before `acorn.parse` is called. Set to `0` to disable.

### Patch Changes

- ed90a55: Address the remaining findings from the v0.1.1 security audit:

  - **Computed keys with literal dots are preserved** (audit #4). `evalAsPath` now returns `string[]` segments instead of a dotted string, so `a["x.y"] = 1` stores under the literal key `"x.y"` rather than being silently re-split into `a.x.y` by `deepSet`. Read and write are now consistent. The change is internal — `evalAsPath` and the `Environment` get/set/def/defined methods now take `string[]`; the public `runner` API is unchanged.
  - **Dotted paths resolve through parent scope** (audit #5). `deepHas`/`deepGet` used `hasOwnProperty` on every segment, but `env.vars = Object.create(parent.vars)` makes outer-scope variables visible only via the prototype chain — so `obj.method()` inside a nested function threw `"obj.method is not a function"` whenever `obj` lived in an enclosing scope. First segment now uses `in` (walks the chain); subsequent segments still use `hasOwn` so user-land objects can't leak `Object.prototype` members through the lookup.
  - **`maxAllocSize` now bounds object key count** (audit #7). Previously only strings and arrays were size-checked, so `reduce(arr, (acc, k) => ({...acc, [k]: k}), {})` could grow an accumulator to `maxSteps` keys without tripping any cap. `ObjectExpression` now projects `ownCount + (spread ? spread.keys : 1)` against `maxAllocSize` before each write.
  - **New `options.maxDurationMs`** bounds wall-clock time per run (audit #6). The step counter only increments inside `evaluate()`, so long native builtin calls (`sort` on a 1M-element array ≈ 1.7s) run uninterrupted. The deadline is checked in `Runtime.step()` between interpreter steps — a single long native call can overshoot by up to its own duration, but subsequent work is rejected. Defaults to `0` (disabled); opt in for hostile multi-tenant workloads.

- 4548bd1: Block `__proto__`, `constructor`, `prototype`, and the legacy descriptor methods as keys in object literals (`{ "__proto__": … }`, `{ [expr]: … }`, shorthand, and spread). Previously user code could set the prototype of a fresh object via literal `__proto__` and emit booby-trapped "constructor" own properties that would ride along when the caller merged `env.vars` into a host object. Also fixes `{[identifier]: value}` — the computed key now evaluates to the identifier's value instead of the literal name.
- b950626: Fix computed member access on the LHS of assignments and on call targets. Previously `a[k] = v` wrote to a property named `k` (the identifier name) instead of the property named by the _value_ of `k`; the same bug affected dotted-path resolution of call targets. The LHS and callee resolver now evaluates the key of a computed member (`a[expr]`) in the current environment, and rejects runtime-resolved blocked keys (`k = "constructor"; a[k] = …`). CallExpression now also handles dynamic callees (e.g. `f()()`, `((x) => x)(v)`) by evaluating the callee as a value when it isn't a static path.
- ed90a55: Harden builtin lookup and fix two long-standing semantic bugs surfaced by a security audit:

  - `CallExpression` now resolves builtins with `hasOwn` instead of `functions[name]`. A plain-object `functions` map inherits from `Object.prototype`, so `constructor()` previously resolved to `Object` and returned `{}`, `toString()` resolved to `Object.prototype.toString`, etc. Not directly exploitable (blocked property access on the returned wrappers still threw) but a defense-in-depth gap that vanished the moment a builtin name collided with an `Object.prototype` member.
  - `LogicalExpression` now short-circuits. `a || b` and `a && b` used to eagerly evaluate both sides, so `guard && action()` always ran `action()`. `??` is also supported.
  - `AssignmentExpression` now honours its operator. `a += 1` used to silently behave as `a = 1`; compound ops (`+=`, `-=`, `*=`, `/=`, `%=`, `||=`, `&&=`, `??=`) now read-combine-write, with the logical compounds short-circuiting. The LHS still goes through the blocked-property checks.

- 9b3897a: Fix `return` statements nested inside `if` (or any other non-`ReturnStatement` node) so they correctly short-circuit the enclosing function body. Previously `BlockStatement` only broke its iteration loop when the _immediate_ statement was a `ReturnStatement`, so `function f(n) { if (n == 0) return 1; … }` would evaluate the guarded return but then continue executing the statements after the `if`. `ReturnStatement` now throws a `ReturnValue` sentinel that unwinds to the nearest function boundary (`makeFunc`), which is the standard control-flow mechanism for tree-walking interpreters. This also unblocks idiomatic recursive functions that use a guard-then-recurse pattern.
- 0cea1d6: Give each function invocation its own scope. `makeFunc` previously hoisted `const scope = env.extend()` to closure-creation time and reused it for every call, so a recursive call overwrote the caller's params (and any `let`/`const` set on the function scope). Moved the `env.extend()` inside the returned closure so every call gets a fresh child of the captured lexical parent.
- 0fbe14e: Move execution step counter from module-global state onto a per-run `Runtime` carried by `Environment`. Previously, a synchronously re-entrant run (e.g. a caller-injected function that itself invokes the interpreter) would reset the shared counter and silently bypass the outer run's `maxSteps` budget. Each run now owns its own step state.

## 0.1.1

### Patch Changes

- e243ccb: Releases are now published from GitHub Actions via npm OIDC trusted publishing. Each published artifact carries an npm provenance attestation, and no `NPM_TOKEN` secret is stored anywhere.

## 0.1.0

### Minor Changes

- Rewritten in TypeScript, using the `acorn` parser. All legacy runtime dependencies have been dropped.
- Hardened the sandbox: fixed a set of sandbox-escape and prototype-pollution vectors, and added DoS protections (execution limits) so runaway scripts can no longer lock up the host process.
