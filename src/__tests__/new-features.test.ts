import { describe, it, expect } from "vitest";
import runner from "../index.js";

const run = runner();

describe("template literals", () => {
  it("evaluates a simple template literal", () => {
    const code = "result = `hello world`";
    const { env } = run(code, {});
    expect(env.result).toEqual("hello world");
  });

  it("evaluates template literal with expression", () => {
    const code = "name = \"Jason\"; result = `hello ${name}`";
    const { env } = run(code, {});
    expect(env.result).toEqual("hello Jason");
  });

  it("evaluates template literal with multiple expressions", () => {
    const code = "a = 1; b = 2; result = `${a} + ${b} = ${a + b}`";
    const { env } = run(code, {});
    expect(env.result).toEqual("1 + 2 = 3");
  });
});

describe("conditional (ternary) expression", () => {
  it("evaluates truthy ternary", () => {
    const code = `result = true ? "yes" : "no"`;
    const { env } = run(code, {});
    expect(env.result).toEqual("yes");
  });

  it("evaluates falsy ternary", () => {
    const code = `result = false ? "yes" : "no"`;
    const { env } = run(code, {});
    expect(env.result).toEqual("no");
  });

  it("evaluates ternary with complex test", () => {
    const code = `x = 5; result = x > 3 ? "big" : "small"`;
    const { env } = run(code, {});
    expect(env.result).toEqual("big");
  });
});

describe("spread element", () => {
  it("spreads in array literal", () => {
    const code = `
      a = [1, 2];
      b = [...a, 3, 4];
    `;
    const { env } = run(code, {});
    expect(env.b).toEqual([1, 2, 3, 4]);
  });

  it("spreads in function call", () => {
    const code = `
      args = [1, 2, 3];
      result = concat(args, ...args);
    `;
    const { env } = run(code, {});
    expect(env.result).toEqual([1, 2, 3, 1, 2, 3]);
  });

  it("spreads in object literal", () => {
    const code = `
      base = { a: 1, b: 2 };
      result = { ...base, c: 3 };
    `;
    const { env } = run(code, {});
    expect(env.result).toEqual({ a: 1, b: 2, c: 3 });
  });
});

describe("unary expressions", () => {
  it("negation", () => {
    const code = `result = !true`;
    const { env } = run(code, {});
    expect(env.result).toEqual(false);
  });

  it("unary minus", () => {
    const code = `result = -5`;
    const { env } = run(code, {});
    expect(env.result).toEqual(-5);
  });

  it("typeof", () => {
    const code = `result = typeof "hello"`;
    const { env } = run(code, {});
    expect(env.result).toEqual("string");
  });
});

describe("const/let declarations with expressions", () => {
  it("const with function call", () => {
    const code = `
      const items = concat([1, 2], 3);
    `;
    const { env } = run(code, {});
    expect(env.items).toEqual([1, 2, 3]);
  });

  it("let with binary expression", () => {
    const code = `
      let x = 5 + 3;
    `;
    const { env } = run(code, {});
    expect(env.x).toEqual(8);
  });
});

describe("if/else", () => {
  it("evaluates else branch", () => {
    const code = `
      if (false) {
        result = "yes";
      } else {
        result = "no";
      }
    `;
    const { env } = run(code, {});
    expect(env.result).toEqual("no");
  });

  it("evaluates else-if chain", () => {
    const code = `
      x = 2;
      if (x == 1) {
        result = "one";
      } else if (x == 2) {
        result = "two";
      } else {
        result = "other";
      }
    `;
    const { env } = run(code, {});
    expect(env.result).toEqual("two");
  });
});

describe("custom injected functions", () => {
  it("uses injected functions", () => {
    const run = runner({
      functions: {
        add: (a: number, b: number) => a + b,
        greet: (name: string) => `hello ${name}`,
      },
    });
    const code = `
      const sum = add(1, 2);
      const msg = greet("world");
    `;
    const { env } = run(code, {});
    expect(env.sum).toEqual(3);
    expect(env.msg).toEqual("hello world");
  });
});
