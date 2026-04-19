import { describe, it, expect } from "vitest";
import runner from "../index.js";

// Regressions for four additional findings from the v0.1.1 audit that were
// deferred until after the initial hardening pass. See
// `.changeset/audit-followups.md` for narrative context.

describe("Finding 4 — literal-dot keys survive the path refactor", () => {
  // Pre-fix, evalAsPath built a dotted string ("a.x.y"), so a key like
  // `a["x.y"]` was split by deepSet into `a.x.y` on write but read back via
  // a flat `obj["x.y"]` lookup — silent inconsistency. Post-fix, paths are
  // string[] segments and dots inside a segment stay literal.
  const run = runner();

  it("a['x.y'] = 1 stores under the literal key 'x.y'", () => {
    const { env } = run(`a = {}; a["x.y"] = 1;`);
    expect(Object.prototype.hasOwnProperty.call(env.a, "x.y")).toBe(true);
    expect(env.a["x.y"]).toBe(1);
    expect(env.a.x).toBeUndefined();
  });

  it("read-after-write through the same bracket expression round-trips", () => {
    const { result } = run(`a = {}; a["x.y"] = 42; a["x.y"];`);
    expect(result).toBe(42);
  });

  it("compound assignment on a dotted literal key still works", () => {
    const { env } = run(`a = { "x.y": 1 }; a["x.y"] += 10;`);
    expect(env.a["x.y"]).toBe(11);
  });

  it("blocked props remain blocked even when embedded in a dotted string", () => {
    // 'a.__proto__' as a full literal key is NOT the blocked string "__proto__"
    // (it's the 11-char string), so this is allowed as a plain property. The
    // real prototype-pollution vector is the literal "__proto__" segment,
    // still caught by assertSafeProperty.
    expect(() => run(`a = {}; a["__proto__"] = 1;`)).toThrow(
      "Access to property '__proto__' is not allowed"
    );
  });
});

describe("Finding 5 — dotted paths resolve through parent scope", () => {
  // Pre-fix, env.vars = Object.create(parent.vars) made parent variables
  // visible via prototype chain, but deepHas used hasOwn on the first segment
  // so `obj.method()` inside a nested function threw "obj.method is not a
  // function". Post-fix, the first segment uses `in` (walks the chain);
  // subsequent segments still use hasOwn so Object.prototype can't leak in.
  const run = runner();

  it("calls a method on a parent-scope object from inside a function", () => {
    const { result } = run(`
      obj = { double: (x) => x * 2 };
      function f() { return obj.double(5); }
      f();
    `);
    expect(result).toBe(10);
  });

  it("reads a nested property on a parent-scope object", () => {
    const { result } = run(`
      config = { db: { host: "localhost", port: 5432 } };
      function f() { return config.db.port; }
      f();
    `);
    expect(result).toBe(5432);
  });

  it("still blocks Object.prototype leak on subsequent segments", () => {
    // `obj.toString` would resolve to Object.prototype.toString if hasOwn
    // weren't applied after the first segment. Make sure it doesn't.
    expect(() =>
      run(`
        obj = {};
        function f() { return obj.toString(); }
        f();
      `)
    ).toThrow(/is not a function|is not defined/);
  });

  it("still blocks constructor on any segment", () => {
    expect(() =>
      run(`
        obj = {};
        function f() { return obj.constructor; }
        f();
      `)
    ).toThrow("Access to property 'constructor' is not allowed");
  });
});

describe("Finding 7 — maxAllocSize bounds object key growth", () => {
  it("spread accumulation under the cap still works", () => {
    const run = runner({ maxSteps: 0, maxAllocSize: 50 });
    const { env } = run(`
      acc = {};
      acc = {...acc, a: 1};
      acc = {...acc, b: 2};
      acc = {...acc, c: 3};
    `);
    expect(env.acc).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("recursive {...acc, [k]: k} growth trips the cap", () => {
    // Use recursion instead of reduce(bigArr, ...) so the array literal check
    // doesn't fire first — all that's in scope is a primitive counter. Each
    // ObjectExpression spread projects ownCount + 1; once that exceeds
    // maxAllocSize, checkLength throws.
    const run = runner({ maxSteps: 0, maxAllocSize: 10 });
    expect(() =>
      run(`
        grow = (acc, n) => n > 0 ? grow({...acc, ["k" + n]: n}, n - 1) : acc;
        grow({}, 50);
      `)
    ).toThrow(/Length.*exceeds maxAllocSize/);
  });

  it("object literal with > maxAllocSize keys throws on construction", () => {
    const run = runner({ maxAllocSize: 3 });
    const keys = ["a: 1", "b: 2", "c: 3", "d: 4"].join(", ");
    expect(() => run(`({ ${keys} })`)).toThrow(
      /Length.*exceeds maxAllocSize/
    );
  });

  it("repeated keys within one literal don't over-count", () => {
    // Same key written twice is still one own key; cap shouldn't trip.
    const run = runner({ maxAllocSize: 1 });
    expect(() => run(`({ a: 1, a: 2 })`)).not.toThrow();
  });

  it("objects under the cap still build", () => {
    const run = runner({ maxAllocSize: 10 });
    const { result } = run(`({ a: 1, b: 2, c: 3 })`);
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });
});

describe("Finding 6 — maxDurationMs bounds wall-clock runs", () => {
  it("a long-running injected builtin trips the deadline on the next step", () => {
    const run = runner({
      maxSteps: 0,
      maxDurationMs: 20,
      functions: {
        slow: (ms: number) => {
          const end = Date.now() + ms;
          while (Date.now() < end) {
            /* burn */
          }
          return 1;
        },
        add: (a: number, b: number) => a + b,
      },
    });
    // slow(100) runs inside V8 (~100ms), overshoots the 20ms deadline. The
    // next interpreter step — evaluating `add(1, 2)` — sees the deadline
    // passed and throws.
    expect(() => run(`slow(100); add(1, 2);`)).toThrow(
      "Execution time exceeded"
    );
  });

  it("scripts that finish inside the deadline succeed", () => {
    const run = runner({ maxDurationMs: 5000 });
    const { result } = run(`1 + 2 + 3`);
    expect(result).toBe(6);
  });

  it("maxDurationMs=0 disables the deadline", () => {
    const run = runner({
      maxDurationMs: 0,
      maxSteps: 1000,
      functions: {
        slow: () => {
          const end = Date.now() + 30;
          while (Date.now() < end) {
            /* burn */
          }
          return 1;
        },
      },
    });
    expect(() => run(`slow()`)).not.toThrow();
  });

  it("deadline supersedes subsequent work even if maxSteps would still allow it", () => {
    // Step counter never trips (maxSteps=0 disables), so wall-clock is the
    // only gate. Confirm the deadline still fires.
    const run = runner({
      maxSteps: 0,
      maxDurationMs: 10,
      functions: {
        slow: (ms: number) => {
          const end = Date.now() + ms;
          while (Date.now() < end) {
            /* burn */
          }
          return 1;
        },
      },
    });
    expect(() => run(`slow(50); slow(50);`)).toThrow(
      "Execution time exceeded"
    );
  });
});
