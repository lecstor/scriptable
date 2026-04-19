import { describe, it, expect } from "vitest";
import runner from "../index.js";

const run = runner();

// Regressions for three semantic/security bugs discovered in the v0.1.1 audit.

describe("functions lookup uses hasOwn (no Object.prototype walk)", () => {
  it("`constructor()` does not resolve to Object via prototype chain", () => {
    // Pre-fix: `functions['constructor']` inherited `Object` from Object.prototype,
    // so this call succeeded and returned `{}`. Post-fix the builtin map is
    // checked with hasOwn, so the call falls through to env lookup and throws.
    expect(() => run(`constructor()`)).toThrow(
      "Access to property 'constructor' is not allowed"
    );
  });

  it("`toString()` does not resolve to Object.prototype.toString", () => {
    expect(() => run(`toString()`)).toThrow(
      /is not a function|is not defined/
    );
  });

  it("`valueOf()` does not resolve to Object.prototype.valueOf", () => {
    expect(() => run(`valueOf()`)).toThrow(/is not a function|is not defined/);
  });

  it("`hasOwnProperty()` does not resolve to Object.prototype method", () => {
    expect(() => run(`hasOwnProperty()`)).toThrow(
      /is not a function|is not defined/
    );
  });

  it("real builtins still resolve", () => {
    const { result } = run(`map([1, 2, 3], (x) => x * 2)`);
    expect(result).toEqual([2, 4, 6]);
  });

  it("user-supplied functions map with Object.prototype inheritance is still safe", () => {
    // A caller may pass a plain object literal. hasOwn defends against that
    // too, not just the default builtins.
    const run2 = runner({ functions: { add: (a: number, b: number) => a + b } });
    expect(() => run2(`constructor()`)).toThrow(
      /Access to property|is not a function|is not defined/
    );
    const { result } = run2(`add(2, 3)`);
    expect(result).toEqual(5);
  });
});

describe("LogicalExpression short-circuits", () => {
  it("`false && side()` does not evaluate side effect", () => {
    const code = `
      count = 0;
      side = () => { count = count + 1; return 1; };
      result = false && side();
      count;
    `;
    const { result } = run(code);
    expect(result).toEqual(0);
  });

  it("`true || side()` does not evaluate side effect", () => {
    const code = `
      count = 0;
      side = () => { count = count + 1; return 1; };
      result = true || side();
      count;
    `;
    const { result } = run(code);
    expect(result).toEqual(0);
  });

  it("`true && side()` does evaluate the right side", () => {
    const code = `
      count = 0;
      side = () => { count = count + 1; return 42; };
      result = true && side();
      [result, count];
    `;
    const { result } = run(code);
    expect(result).toEqual([42, 1]);
  });

  it("`null ?? value` returns value (and `0 ?? x` returns 0)", () => {
    expect(run(`null ?? "fallback"`).result).toEqual("fallback");
    expect(run(`0 ?? "fallback"`).result).toEqual(0);
    expect(run(`"" ?? "fallback"`).result).toEqual("");
  });

  it("`x ?? side()` does not evaluate side effect when x is defined", () => {
    const code = `
      count = 0;
      side = () => { count = count + 1; return "fallback"; };
      result = "value" ?? side();
      count;
    `;
    const { result } = run(code);
    expect(result).toEqual(0);
  });
});

describe("AssignmentExpression compound operators", () => {
  it("`+=` adds", () => {
    const { env } = run(`a = 10; a += 5;`);
    expect(env.a).toEqual(15);
  });

  it("`-=` subtracts", () => {
    const { env } = run(`a = 10; a -= 3;`);
    expect(env.a).toEqual(7);
  });

  it("`*=` multiplies", () => {
    const { env } = run(`a = 4; a *= 3;`);
    expect(env.a).toEqual(12);
  });

  it("`/=` divides", () => {
    const { env } = run(`a = 12; a /= 4;`);
    expect(env.a).toEqual(3);
  });

  it("`%=` modulo", () => {
    const { env } = run(`a = 10; a %= 3;`);
    expect(env.a).toEqual(1);
  });

  it("`+=` on strings concatenates", () => {
    const { env } = run(`s = "hello"; s += " world";`);
    expect(env.s).toEqual("hello world");
  });

  it("compound assignment works on nested paths", () => {
    const { env } = run(`o = { n: 1 }; o.n += 10;`);
    expect(env.o.n).toEqual(11);
  });

  it("`||=` writes only when lhs is falsy", () => {
    expect(run(`a = 0; a ||= 5; a;`).result).toEqual(5);
    expect(run(`a = 7; a ||= 5; a;`).result).toEqual(7);
  });

  it("`&&=` writes only when lhs is truthy", () => {
    expect(run(`a = 0; a &&= 5; a;`).result).toEqual(0);
    expect(run(`a = 7; a &&= 5; a;`).result).toEqual(5);
  });

  it("`??=` writes only when lhs is nullish", () => {
    expect(run(`a = null; a ??= 5; a;`).result).toEqual(5);
    expect(run(`a = 0; a ??= 5; a;`).result).toEqual(0);
  });

  it("`||=` does not evaluate rhs when lhs is truthy", () => {
    const code = `
      count = 0;
      side = () => { count = count + 1; return 42; };
      a = 7;
      a ||= side();
      [a, count];
    `;
    const { result } = run(code);
    expect(result).toEqual([7, 0]);
  });

  it("compound assignment still blocks dangerous paths on the LHS", () => {
    expect(() => run(`o = {}; o.__proto__ += 1`)).toThrow(
      "Access to property '__proto__' is not allowed"
    );
  });
});
