# scriptable

A safe, sandboxed JavaScript interpreter that walks the AST node-by-node. No `eval()`, no `new Function()` — only explicitly handled node types are executed, with only whitelisted functions available to scripts.

Designed for executing user-provided or AI-generated JS in constrained environments like Cloudflare Workers where CSP blocks dynamic code evaluation.

## Install

```bash
pnpm add scriptable
```

## Usage

```ts
import runner from "scriptable";

const run = runner();

const { result, env } = run(`
  const tax = price * 0.1;
  const total = price + tax;
`, { price: 100 });

// result: 110 (last expression value)
// env: { price: 100, tax: 10, total: 110 }
```

### Injecting custom functions

Scripts can only call functions you explicitly provide. Pass them via the `functions` option:

```ts
const run = runner({
  functions: {
    add: (a, b) => a + b,
    greet: (name) => `hello ${name}`,
  },
});

const { result } = run(`greet("world")`);
// result: "hello world"
```

The default `functions` include array/collection operations (`map`, `filter`, `reduce`, `forEach`, `concat`, `keys`, `values`, etc.), number formatting (`numberFormatter`, `formatDollars`), date formatting (`formatDate`, `currentDate`), and array mutation (`push`, `shift`).

### API

**`runner(options?)`** returns an executor function.

- `options.functions` — `Record<string, Function>` of callable functions (defaults to built-in set)
- `options.maxSteps` — AST nodes evaluated per run before throwing `Execution limit exceeded`. Defaults to `100_000`. Set to `0` to disable.
- `options.maxCodeSize` — maximum source length in UTF-16 code units, checked before parsing. Defaults to `65_536` (64 KiB). Set to `0` to disable.
- `options.maxAllocSize` — maximum length of any string or array produced during a run, and maximum key count of any object literal. Defaults to `1_000_000` (~2 MB for strings, 1M elements for arrays, 1M keys for objects). Set to `0` to disable.
- `options.maxDurationMs` — wall-clock deadline per run, in milliseconds. Checked between interpreter steps, so a single long native builtin call (e.g. `sort` on a large array) can overshoot by up to its own duration before subsequent work is rejected. Defaults to `0` (disabled); set a positive value for hostile multi-tenant workloads.

**`run(code, env?, debug?)`** executes code and returns `{ result, env }`.

- `code` — JavaScript source string
- `env` — initial variables available to the script (default `{}`)
- `debug` — if truthy, logs the AST to console
- Returns `result` (value of last expression) and `env` (all variables after execution)

### Trust boundary

The sandbox contains user code — it does **not** sanitize values or callables you inject. Anything you put in `env` or `options.functions` is trusted:

- Passing a function (e.g. `Function`, `eval`, a host method that shells out) lets the script invoke it directly.
- Passing an object with a getter runs that getter when the script reads the property.

If you need to expose host capabilities, wrap them in plain functions that validate their inputs and return only primitives or plain objects.

## Supported syntax

| Node type | Examples |
|---|---|
| Variables | `var`, `let`, `const`, assignment |
| Functions | `function foo() {}`, arrow functions `() => {}` |
| Expressions | Binary (`+`, `-`, `*`, `/`, `%`, comparisons), logical (`&&`, `\|\|`), unary (`!`, `-`, `+`, `typeof`) |
| Conditionals | `if`/`else if`/`else`, ternary `? :` |
| Literals | Strings, numbers, booleans, arrays, objects |
| Template literals | `` `hello ${name}` `` |
| Spread | `[...arr]`, `{...obj}`, `fn(...args)` |
| Member access | `obj.prop`, `obj["prop"]`, `arr[0]` |
| Return | `return` in functions |

Unsupported node types throw `"Cannot evaluate <type>"`, which is the primary security mechanism — there is no way to access `this`, `arguments`, constructors, `import`, `require`, or any runtime API unless explicitly injected via `functions`.

## Changes from v0.0.x

This is a full rewrite of the original package. The interpreter behavior and API shape are preserved.

### Parser: Babylon → Acorn

Replaced [Babylon](https://github.com/babel/babylon) with [Acorn](https://github.com/acornjs/acorn) (~12KB, zero transitive deps, ESM, actively maintained, Cloudflare Workers compatible).

### Language: JavaScript → TypeScript

All source converted to TypeScript with strict mode. Builds to ESM (`dist/`) with declaration files.

### Dependencies removed

| Old | Replacement |
|---|---|
| `babylon` | `acorn` |
| `lodash` | Native equivalents (`Object.keys`, `Array.map`, etc.) |
| `moment` + `moment-timezone` | `Intl.DateTimeFormat` (zero deps, built into all runtimes) |
| `jest` | `vitest` |

### Test runner: Jest → Vitest

All tests ported to Vitest. The moment-dependent date tests now use `Intl.DateTimeFormat` and accept runtime-dependent timezone abbreviations (e.g. `AEST` in browsers/Workers, `GMT+10` in some Node versions).

### New AST node types

- **TemplateLiteral** — backtick strings with `${expression}` interpolation
- **SpreadElement** — `...` in arrays, objects, and function arguments
- **ConditionalExpression** — ternary `condition ? a : b`
- **UnaryExpression** — `!`, `-`, `+`, `typeof`
- **IfStatement else** — `else` and `else if` branches (previously only `if`)

### Bug fixes

- `VariableDeclarator` now evaluates initializers with the environment, so `const x = foo(bar)` works (previously only literal initializers like `const x = "hello"` worked)
- `BlockStatement` uses a native `for` loop instead of `lodash/forEach` for return-statement breaking

### Date builtins

`currentDate(tz?)` and `formatDate(dateString, format, timezone?)` are reimplemented using `Intl.DateTimeFormat`. The `formatDate` function accepts moment-style format tokens:

| Token | Output | Example |
|---|---|---|
| `YYYY` | 4-digit year | `2017` |
| `YY` | 2-digit year | `17` |
| `MMMM` | Full month | `January` |
| `MMM` | Short month | `Jan` |
| `MM` | Padded month | `01` |
| `DD` | Padded day | `05` |
| `D` | Day | `5` |
| `HH` | 24-hour padded | `09` |
| `h` | 12-hour | `9` |
| `mm` | Minutes padded | `08` |
| `ss` | Seconds padded | `05` |
| `a` | am/pm | `am` |
| `A` | AM/PM | `AM` |
| `z` | Timezone abbr | `UTC` |

### Package setup

- ESM (`"type": "module"`) with TypeScript build
- pnpm for package management
- `exports` field with types

## Contributing

### Adding a changeset

Every user-facing change needs a changeset so it appears in the CHANGELOG:

```bash
pnpm changeset       # interactive: pick patch/minor/major, write a summary
git add .changeset   # commit the generated .changeset/*.md file with your PR
```

### Releasing

```bash
pnpm release
```

This runs the release script (`scripts/release.js`), which:

1. Guards: clean tree, on `main`, up to date with `origin/main`, pending changesets exist.
2. Runs tests and build as a safety gate.
3. Consumes changesets to bump `package.json` and update `CHANGELOG.md`.
4. Commits as `Version X.Y.Z` and shows the diff.
5. Prompts for confirmation (last chance to abort).
6. Pushes `main`, creates an annotated `vX.Y.Z` tag, and pushes the tag.
7. The tag push triggers `.github/workflows/release.yml`, which publishes to npm via OIDC trusted publishing with provenance attestation. No `NPM_TOKEN` is involved.

### Recovery: if the release workflow fails after the tag is pushed

The version commit is on `main` and the tag is pushed, but npm publish failed. You can't rerun `pnpm release` because the changesets have already been consumed.

```bash
# 1. Delete the tag locally and on the remote
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z

# 2. Fix whatever broke, commit on main
git commit -am "fix(ci): ..."
git push origin main

# 3. Re-tag HEAD (annotated!) and push to re-trigger the workflow.
#    Same version number — this is a retry, not a new version.
git tag -a vX.Y.Z -m "Version X.Y.Z"
git push origin vX.Y.Z
```
