---
"scriptable": minor
---

Add `maxAllocSize` option to `runner()` (default 1,000,000). Caps the length of any string or array value produced during a run. Without this bound, exponential growth from string concat (`s = s + s`), template literals, or `concat()` stayed well within the step budget — 26 doublings from an 8-char seed could allocate ~512 MiB. Array spread now also enforces projected length before growing, using a loop instead of `push(...spread)` so enforcement fires at `maxAllocSize` rather than V8's ~65K argument-stack ceiling. Set to `0` to disable.
