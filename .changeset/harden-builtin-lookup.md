---
"scriptable": patch
---

Harden builtin lookup and fix two long-standing semantic bugs surfaced by a security audit:

- `CallExpression` now resolves builtins with `hasOwn` instead of `functions[name]`. A plain-object `functions` map inherits from `Object.prototype`, so `constructor()` previously resolved to `Object` and returned `{}`, `toString()` resolved to `Object.prototype.toString`, etc. Not directly exploitable (blocked property access on the returned wrappers still threw) but a defense-in-depth gap that vanished the moment a builtin name collided with an `Object.prototype` member.
- `LogicalExpression` now short-circuits. `a || b` and `a && b` used to eagerly evaluate both sides, so `guard && action()` always ran `action()`. `??` is also supported.
- `AssignmentExpression` now honours its operator. `a += 1` used to silently behave as `a = 1`; compound ops (`+=`, `-=`, `*=`, `/=`, `%=`, `||=`, `&&=`, `??=`) now read-combine-write, with the logical compounds short-circuiting. The LHS still goes through the blocked-property checks.
