---
"scriptable": patch
---

Move execution step counter from module-global state onto a per-run `Runtime` carried by `Environment`. Previously, a synchronously re-entrant run (e.g. a caller-injected function that itself invokes the interpreter) would reset the shared counter and silently bypass the outer run's `maxSteps` budget. Each run now owns its own step state.
