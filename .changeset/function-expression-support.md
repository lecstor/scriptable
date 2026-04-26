---
"scriptable": patch
---

Add `FunctionExpression` evaluator. Anonymous function expressions assigned to a variable (`foo = function (x) { return x + 1; }`) and passed as callback arguments (`map(prices, function (p) { return p * 2; })`) now evaluate the same way as `ArrowFunctionExpression` — the AST nodes are structurally identical for our purposes (no `this` rebinding, no `arguments` object, just params + body routed through the same `makeFunc` pipeline). Previously `function (...) { ... }` threw `Cannot evaluate FunctionExpression`, even though the equivalent arrow form worked. Useful in particular for LLM-generated scripts where some models emit function-expression callbacks instead of arrows.
