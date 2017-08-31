const runner = require("../");

const run = runner();

const DEBUG = true;

describe("define global vars", () => {
  it(`foo`, () => {
    const code = `foo`;
    const vars = {};
    expect(() => run(code, vars)).toThrow(
      new ReferenceError(`"foo" is not defined (1:0)`)
    );
  });
  it("let foo", () => {
    const code = `let foo;`;
    const vars = {};
    const { result, env } = run(code, vars);
    expect(result).toEqual(undefined);
    expect(env).toEqual({ foo: undefined });
  });
  it("const foo", () => {
    const code = `const foo;`;
    const vars = {};
    expect(() => run(code, vars)).toThrow(
      new SyntaxError("Unexpected token (1:9)")
    );
  });

  it(`foo = "bar"`, () => {
    const code = `foo = "bar";`;
    const vars = {};
    const { result, env } = run(code, vars);
    expect(result).toEqual("bar");
    expect(env).toEqual({ foo: "bar" });
  });
  it(`var foo = "bar"`, () => {
    const code = `var foo = "bar";`;
    const vars = {};
    const { result, env } = run(code, vars);
    expect(result).toEqual(undefined);
    expect(env).toEqual({ foo: "bar" });
  });
  it(`let foo = "bar"`, () => {
    const code = `let foo = "bar";`;
    const vars = {};
    const { result, env } = run(code, vars);
    expect(result).toEqual(undefined);
    expect(env).toEqual({ foo: "bar" });
  });
  it(`const foo = "bar"`, () => {
    const code = `const foo = "bar";`;
    const vars = {};
    const { result, env } = run(code, vars);
    expect(result).toEqual(undefined);
    expect(env).toEqual({ foo: "bar" });
  });
});

describe("define vars in scope", () => {
  it(`foo = "foo"`, () => {
    const code = `
      if (true) {
        foo = "foo";
      }
    `;
    const vars = {};
    const { result, env } = run(code, vars);
    expect(result).toEqual("foo");
    expect(env).toEqual({ foo: "foo" });
  });
  it(`var foo = "foo"`, () => {
    const code = `
      if (true) {
        var foo = "foo";
      }
    `;
    const vars = {};
    const { result, env } = run(code, vars);
    expect(result).toEqual(undefined);
    expect(env).toEqual({ foo: "foo" });
  });
  it(`let foo = "foo"`, () => {
    const code = `
      if (true) {
        let foo = "foo";
      }
    `;
    const vars = {};
    const { result, env } = run(code, vars);
    expect(result).toEqual(undefined);
    expect(env).toEqual({ foo: undefined });
  });
  it(`const foo = "foo"`, () => {
    const code = `
      if (true) {
        const foo = "foo";
      }
    `;
    const vars = {};
    const { result, env } = run(code, vars);
    expect(result).toEqual(undefined);
    expect(env).toEqual({ foo: undefined });
  });
});

describe("bare variables eval", () => {
  it("evals a bare var", () => {
    const code = `foo`;
    const env = { foo: "bar" };
    const { result } = run(code, env);
    expect(result).toEqual("bar");
  });

  it("evals a deep bare var", () => {
    const code = `foo["bar"]`;
    const env = { foo: { bar: "baz" } };
    const { result } = run(code, env);
    expect(result).toEqual("baz");
  });

  it("evals an array index", () => {
    const code = `foo[1]`;
    const env = { foo: ["me", "myself", "i"] };
    const { result } = run(code, env);
    expect(result).toEqual("myself");
  });

  it("evals a deeper bare var", () => {
    const code = `foo["bar"]["baz"]`;
    const env = { foo: { bar: { baz: "fiz" } } };
    const { result } = run(code, env);
    expect(result).toEqual("fiz");
  });

  it("evals a dotted deep bare var", () => {
    const code = `foo.bar`;
    const env = { foo: { bar: "baz" } };
    const { result } = run(code, env);
    expect(result).toEqual("baz");
  });

  it("evals a deeper bare var", () => {
    const code = `foo.bar.baz`;
    const env = { foo: { bar: { baz: "fiz" } } };
    const { result } = run(code, env);
    expect(result).toEqual("fiz");
  });
});

describe("assignment", () => {
  it("assigns top level var", () => {
    const code = `foo = "bar"`;
    const vars = {};
    const { env } = run(code, vars);
    expect(env).toEqual({ foo: "bar" });
  });
  it("re-assigns third level var", () => {
    const code = `foo.baz.fiz = "bar"`;
    const vars = { foo: { baz: { fiz: "b00" } } };
    const { env } = run(code, vars);
    expect(env).toEqual({ foo: { baz: { fiz: "bar" } } });
  });

  it("modifies var from inbuilt function", () => {
    const code = `forEach(foo, bar => { bar.baz = 2 })`;
    const env = { foo: [{ baz: 1 }, { baz: 1 }] };
    run(code, env);
    expect(env).toEqual({ foo: [{ baz: 2 }, { baz: 2 }] });
  });

  // these probably shouldn't actually work..
  it("assigns second level var", () => {
    const code = `foo.baz = "bar"`;
    const vars = {};
    const { env } = run(code, vars);
    expect(env).toEqual({ foo: { baz: "bar" } });
  });
  it("assigns third level var", () => {
    const code = `foo.baz.fiz = "bar"`;
    const vars = {};
    const { env } = run(code, vars);
    expect(env).toEqual({ foo: { baz: { fiz: "bar" } } });
  });
});

describe("objects", () => {
  it("creates an object", () => {
    const code = `foo = { bar: "baz" };`;
    const vars = {};
    const { result, env } = run(code, vars);
    expect(result).toEqual({ bar: "baz" });
    expect(env).toEqual({ foo: { bar: "baz" } });
  });

  it("creates an array", () => {
    const code = `foo = ["bar", "baz"];`;
    const vars = {};
    const { result, env } = run(code, vars);
    expect(result).toEqual(["bar", "baz"]);
    expect(env).toEqual({ foo: ["bar", "baz"] });
  });
});
