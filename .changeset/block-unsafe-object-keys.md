---
"scriptable": patch
---

Block `__proto__`, `constructor`, `prototype`, and the legacy descriptor methods as keys in object literals (`{ "__proto__": … }`, `{ [expr]: … }`, shorthand, and spread). Previously user code could set the prototype of a fresh object via literal `__proto__` and emit booby-trapped "constructor" own properties that would ride along when the caller merged `env.vars` into a host object. Also fixes `{[identifier]: value}` — the computed key now evaluates to the identifier's value instead of the literal name.
