---
"scriptable": patch
---

Address the remaining findings from the v0.1.1 security audit:

- **Computed keys with literal dots are preserved** (audit #4). `evalAsPath` now returns `string[]` segments instead of a dotted string, so `a["x.y"] = 1` stores under the literal key `"x.y"` rather than being silently re-split into `a.x.y` by `deepSet`. Read and write are now consistent. The change is internal — `evalAsPath` and the `Environment` get/set/def/defined methods now take `string[]`; the public `runner` API is unchanged.
- **Dotted paths resolve through parent scope** (audit #5). `deepHas`/`deepGet` used `hasOwnProperty` on every segment, but `env.vars = Object.create(parent.vars)` makes outer-scope variables visible only via the prototype chain — so `obj.method()` inside a nested function threw `"obj.method is not a function"` whenever `obj` lived in an enclosing scope. First segment now uses `in` (walks the chain); subsequent segments still use `hasOwn` so user-land objects can't leak `Object.prototype` members through the lookup.
- **`maxAllocSize` now bounds object key count** (audit #7). Previously only strings and arrays were size-checked, so `reduce(arr, (acc, k) => ({...acc, [k]: k}), {})` could grow an accumulator to `maxSteps` keys without tripping any cap. `ObjectExpression` now projects `ownCount + (spread ? spread.keys : 1)` against `maxAllocSize` before each write.
- **New `options.maxDurationMs`** bounds wall-clock time per run (audit #6). The step counter only increments inside `evaluate()`, so long native builtin calls (`sort` on a 1M-element array ≈ 1.7s) run uninterrupted. The deadline is checked in `Runtime.step()` between interpreter steps — a single long native call can overshoot by up to its own duration, but subsequent work is rejected. Defaults to `0` (disabled); opt in for hostile multi-tenant workloads.
