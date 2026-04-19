---
"scriptable": minor
---

Add `maxCodeSize` option to `runner()` (default 64 KiB). The step counter bounds execution but not parsing — acorn still reads multi-megabyte input before the interpreter sees it, which is ~200ms of CPU per 50 MB on a modern machine. Sources over the limit now throw before `acorn.parse` is called. Set to `0` to disable.
