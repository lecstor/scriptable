---
"scriptable": patch
---

Fix `return` statements nested inside `if` (or any other non-`ReturnStatement` node) so they correctly short-circuit the enclosing function body. Previously `BlockStatement` only broke its iteration loop when the *immediate* statement was a `ReturnStatement`, so `function f(n) { if (n == 0) return 1; … }` would evaluate the guarded return but then continue executing the statements after the `if`. `ReturnStatement` now throws a `ReturnValue` sentinel that unwinds to the nearest function boundary (`makeFunc`), which is the standard control-flow mechanism for tree-walking interpreters. This also unblocks idiomatic recursive functions that use a guard-then-recurse pattern.
