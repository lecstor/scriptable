---
"scriptable": patch
---

Fix computed member access on the LHS of assignments and on call targets. Previously `a[k] = v` wrote to a property named `k` (the identifier name) instead of the property named by the *value* of `k`; the same bug affected dotted-path resolution of call targets. The LHS and callee resolver now evaluates the key of a computed member (`a[expr]`) in the current environment, and rejects runtime-resolved blocked keys (`k = "constructor"; a[k] = …`). CallExpression now also handles dynamic callees (e.g. `f()()`, `((x) => x)(v)`) by evaluating the callee as a value when it isn't a static path.
