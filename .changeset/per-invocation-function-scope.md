---
"scriptable": patch
---

Give each function invocation its own scope. `makeFunc` previously hoisted `const scope = env.extend()` to closure-creation time and reused it for every call, so a recursive call overwrote the caller's params (and any `let`/`const` set on the function scope). Moved the `env.extend()` inside the returned closure so every call gets a fresh child of the captured lexical parent.
