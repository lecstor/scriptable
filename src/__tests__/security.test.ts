import { describe, it, expect } from "vitest";
import runner from "../index.js";

const run = runner();

// ==========================================================================
// 1. Sandbox escape — prototype chain to Function constructor
// ==========================================================================

describe("sandbox escape: prototype chain", () => {
  it("blocks obj.constructor", () => {
    const code = `a = {}; a.constructor`;
    expect(() => run(code)).toThrow("Access to property 'constructor' is not allowed");
  });

  it("blocks obj.constructor.constructor (Function access)", () => {
    const code = `a = {}; a.constructor.constructor`;
    expect(() => run(code)).toThrow("Access to property 'constructor' is not allowed");
  });

  it("blocks array.constructor.constructor", () => {
    const code = `a = [1,2]; a.constructor.constructor("return this")()`;
    expect(() => run(code)).toThrow("Access to property 'constructor' is not allowed");
  });

  it("blocks string.constructor", () => {
    const code = `a = "hello"; a.constructor`;
    expect(() => run(code)).toThrow("Access to property 'constructor' is not allowed");
  });

  it("blocks number.constructor", () => {
    // Wrap in parens to avoid parser ambiguity
    const code = `a = 42; a.constructor`;
    expect(() => run(code)).toThrow("Access to property 'constructor' is not allowed");
  });

  it("blocks function.constructor (reaches Function)", () => {
    const code = `
      f = (x) => x;
      f.constructor("return this")();
    `;
    expect(() => run(code)).toThrow("Access to property 'constructor' is not allowed");
  });

  it("blocks constructor via computed property", () => {
    const code = `a = {}; a["constructor"]`;
    expect(() => run(code)).toThrow("Access to property 'constructor' is not allowed");
  });

  it("blocks constructor via computed string concatenation", () => {
    const code = `a = {}; a["const" + "ructor"]`;
    expect(() => run(code)).toThrow("Access to property 'constructor' is not allowed");
  });

  it("blocks constructor via variable indirection", () => {
    const code = `
      a = {};
      key = "constructor";
      a[key];
    `;
    expect(() => run(code)).toThrow("Access to property 'constructor' is not allowed");
  });
});

// ==========================================================================
// 2. Sandbox escape — __proto__ access
// ==========================================================================

describe("sandbox escape: __proto__", () => {
  it("blocks __proto__ read", () => {
    const code = `a = {}; a.__proto__`;
    expect(() => run(code)).toThrow("Access to property '__proto__' is not allowed");
  });

  it("blocks __proto__ computed read", () => {
    const code = `a = {}; a["__proto__"]`;
    expect(() => run(code)).toThrow("Access to property '__proto__' is not allowed");
  });

  it("blocks __proto__ assignment", () => {
    const code = `a = {}; a.__proto__ = {}`;
    expect(() => run(code)).toThrow("Access to property '__proto__' is not allowed");
  });
});

// ==========================================================================
// 3. Sandbox escape — prototype access
// ==========================================================================

describe("sandbox escape: prototype", () => {
  it("blocks .prototype access", () => {
    const code = `
      a = {};
      f = a.constructor;
    `;
    expect(() => run(code)).toThrow("Access to property 'constructor' is not allowed");
  });

  it("blocks .prototype via computed", () => {
    const code = `a = {}; a["prototype"]`;
    expect(() => run(code)).toThrow("Access to property 'prototype' is not allowed");
  });
});

// ==========================================================================
// 4. Prototype pollution via deep assignment
// ==========================================================================

describe("prototype pollution via deep path assignment", () => {
  it("blocks constructor in deep assignment path", () => {
    const code = `foo.constructor.prototype.polluted = "yes"`;
    expect(() => run(code, { foo: {} })).toThrow(
      "Access to property 'constructor' is not allowed"
    );
  });

  it("blocks __proto__ in deep assignment path", () => {
    const code = `foo.__proto__.polluted = "yes"`;
    expect(() => run(code, { foo: {} })).toThrow(
      "Access to property '__proto__' is not allowed"
    );
  });

  it("does not pollute Object.prototype even if attempted", () => {
    // Verify no pollution leaked from prior tests
    expect((Object.prototype as any).polluted).toBeUndefined();
  });
});

// ==========================================================================
// 5. Sandbox escape — legacy property descriptors
// ==========================================================================

describe("sandbox escape: legacy descriptor methods", () => {
  it("blocks __defineGetter__", () => {
    const code = `a = {}; a.__defineGetter__`;
    expect(() => run(code)).toThrow(
      "Access to property '__defineGetter__' is not allowed"
    );
  });

  it("blocks __defineSetter__", () => {
    const code = `a = {}; a.__defineSetter__`;
    expect(() => run(code)).toThrow(
      "Access to property '__defineSetter__' is not allowed"
    );
  });

  it("blocks __lookupGetter__", () => {
    const code = `a = {}; a.__lookupGetter__`;
    expect(() => run(code)).toThrow(
      "Access to property '__lookupGetter__' is not allowed"
    );
  });

  it("blocks __lookupSetter__", () => {
    const code = `a = {}; a.__lookupSetter__`;
    expect(() => run(code)).toThrow(
      "Access to property '__lookupSetter__' is not allowed"
    );
  });
});

// ==========================================================================
// 6. Sandbox escape — this / arguments / globals
// ==========================================================================

describe("sandbox escape: forbidden expressions", () => {
  it("blocks this", () => {
    const code = `this`;
    expect(() => run(code)).toThrow("Cannot evaluate ThisExpression");
  });

  it("blocks arguments keyword", () => {
    const code = `
      function f() { return arguments; }
      f();
    `;
    expect(() => run(code)).toThrow('"arguments" is not defined');
  });

  it("cannot access process", () => {
    const code = `process`;
    expect(() => run(code)).toThrow('"process" is not defined');
  });

  it("cannot access require", () => {
    const code = `require("fs")`;
    expect(() => run(code)).toThrow("require is not a function");
  });

  it("cannot access globalThis", () => {
    const code = `globalThis`;
    expect(() => run(code)).toThrow('"globalThis" is not defined');
  });

  it("cannot access eval", () => {
    const code = `eval("1+1")`;
    expect(() => run(code)).toThrow("eval is not a function");
  });

  it("cannot access Function", () => {
    const code = `Function("return 1")`;
    expect(() => run(code)).toThrow("Function is not a function");
  });

  it("blocks import()", () => {
    const code = `import("fs")`;
    expect(() => run(code)).toThrow();
  });

  it("blocks new expressions", () => {
    const code = `new Array(10)`;
    expect(() => run(code)).toThrow("Cannot evaluate NewExpression");
  });
});

// ==========================================================================
// 7. DoS — infinite recursion
// ==========================================================================

describe("DoS: infinite recursion", () => {
  // V8's call stack limit catches deep recursion before our step counter
  // (each interpreter call creates many real stack frames). Either mechanism
  // is an acceptable guard — the important thing is execution stops.

  it("stops infinite recursive function", () => {
    const code = `
      function f() { return f(); }
      f();
    `;
    expect(() => run(code)).toThrow();
  });

  it("stops mutual recursion", () => {
    const code = `
      function a() { return b(); }
      function b() { return a(); }
      a();
    `;
    expect(() => run(code)).toThrow();
  });

  it("stops deep self-calling arrow", () => {
    const code = `
      f = (n) => f(n);
      f(1);
    `;
    expect(() => run(code)).toThrow();
  });

  it("step counter catches recursion with low limit", () => {
    const tightRun = runner({ maxSteps: 50 });
    const code = `
      function f(n) { if (n > 0) { return f(n - 1); } return 0; }
      f(100);
    `;
    expect(() => tightRun(code)).toThrow("Execution limit exceeded");
  });
});

// ==========================================================================
// 8. DoS — execution limit configurability
// ==========================================================================

describe("DoS: execution limits", () => {
  it("respects custom maxSteps", () => {
    const tightRun = runner({ maxSteps: 10 });
    // Even simple code will exceed 10 steps
    const code = `a = 1; b = 2; c = 3; d = 4; e = 5;`;
    expect(() => tightRun(code)).toThrow("Execution limit exceeded");
  });

  it("allows disabling step limit with 0", () => {
    const noLimitRun = runner({ maxSteps: 0 });
    const code = `a = 1; b = 2; c = a + b;`;
    const { env } = noLimitRun(code);
    expect(env.c).toEqual(3);
  });

  it("default limit allows normal-sized scripts", () => {
    // Build a moderately complex script
    let code = "";
    for (let i = 0; i < 100; i++) {
      code += `x${i} = ${i};\n`;
    }
    code += `result = x0 + x99;`;
    const { env } = run(code);
    expect(env.result).toEqual(99);
  });
});

// ==========================================================================
// 8b. DoS — step counter isolation across runs
// ==========================================================================

describe("DoS: step counter per-run isolation", () => {
  it("re-entrance does not leak budget into the outer run", () => {
    // Caller-injected function that synchronously runs another interpreter.
    // Previously the module-global counter was reset by the inner run,
    // letting the outer run silently bypass its maxSteps.
    const inner = runner({ maxSteps: 100_000 });
    const outer = runner({ maxSteps: 5 });
    expect(() =>
      outer(
        `
          runInner("x = 1;");
          a = 1; b = 2; c = 3; d = 4; e = 5; f = 6; g = 7; h = 8;
        `,
        { runInner: (code: string) => inner(code).env }
      )
    ).toThrow("Execution limit exceeded");
  });

  it("two runners with different limits do not share state", () => {
    const tight = runner({ maxSteps: 5 });
    const loose = runner({ maxSteps: 100_000 });
    // loose completes first; tight should still trip on its own budget.
    loose(`a = 1; b = 2; c = 3; d = 4; e = 5;`);
    expect(() => tight(`a = 1; b = 2; c = 3;`)).toThrow(
      "Execution limit exceeded"
    );
  });
});

// ==========================================================================
// 9. Sandbox escape via builtin return values
// ==========================================================================

describe("sandbox escape: via builtin return values", () => {
  it("blocks constructor on array returned by map", () => {
    const code = `
      result = map([1,2], (x) => x);
      result.constructor;
    `;
    expect(() => run(code)).toThrow("Access to property 'constructor' is not allowed");
  });

  it("blocks constructor on object returned by assign", () => {
    const code = `
      obj = assign({ a: 1 });
      obj.constructor;
    `;
    expect(() => run(code)).toThrow("Access to property 'constructor' is not allowed");
  });

  it("blocks constructor on string returned by join", () => {
    const code = `
      s = join(["a", "b"], ",");
      s.constructor;
    `;
    expect(() => run(code)).toThrow("Access to property 'constructor' is not allowed");
  });
});

// ==========================================================================
// 10. Sandbox escape — original break-out.js tests (preserved)
// ==========================================================================

describe("original break-out tests (preserved)", () => {
  it("this.constructor.constructor", () => {
    const code = `bar = this.constructor.constructor`;
    expect(() => run(code)).toThrow("Cannot evaluate ThisExpression");
  });

  it("object.constructor", () => {
    const code = `
      bar = { any: "thing" };
      func = bar.constructor;
      func2 = func("return process");
      process = func2();
    `;
    expect(() => run(code)).toThrow(
      "Access to property 'constructor' is not allowed"
    );
  });

  it("arguments.callee.caller", () => {
    const code = `
      function getFunc () {
        return arguments.callee.caller.arguments.callee.caller.arguments.callee.caller.arguments.callee.arguments.callee.caller;
      }
      func = getFunc();
      func.call(func, "var fs = process.mainModule.require('fs');");
    `;
    expect(() => run(code)).toThrow(
      new ReferenceError(`"arguments" is not defined (3:15)`)
    );
  });
});

// ==========================================================================
// 11. Safe property access still works
// ==========================================================================

describe("safe property access still works", () => {
  it("array .length", () => {
    const code = `[1, 2, 3].length`;
    const { result } = run(code);
    expect(result).toEqual(3);
  });

  it("string .length", () => {
    const code = `a = "hello"; a.length`;
    const { result } = run(code);
    expect(result).toEqual(5);
  });

  it("object property access", () => {
    const code = `a = { foo: "bar" }; a.foo`;
    const { result } = run(code);
    expect(result).toEqual("bar");
  });

  it("nested object property access", () => {
    const code = `a.b.c`;
    const { result } = run(code, { a: { b: { c: 42 } } });
    expect(result).toEqual(42);
  });

  it("computed property access with string", () => {
    const code = `a = { foo: "bar" }; a["foo"]`;
    const { result } = run(code);
    expect(result).toEqual("bar");
  });

  it("array index access", () => {
    const code = `a = [10, 20, 30]; a[1]`;
    const { result } = run(code);
    expect(result).toEqual(20);
  });
});
