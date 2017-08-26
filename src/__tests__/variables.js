const run = require("../");

const DEBUG = true;

describe("bare variables", () => {
  it("evals a bare var", () => {
    const code = `foo`;
    const env = { foo: "bar" };
    const { result } = run(code, env);
    expect(result).toEqual("bar");
    expect(env).toEqual({ foo: "bar" });
  });

  it("evals a deep bare var", () => {
    const code = `foo["bar"]`;
    const env = { foo: { bar: "baz" } };
    const { result } = run(code, env);
    expect(result).toEqual("baz");
    expect(env).toEqual({ foo: { bar: "baz" } });
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
    expect(env).toEqual({ foo: { bar: { baz: "fiz" } } });
  });

  it("evals a dotted deep bare var", () => {
    const code = `foo.bar`;
    const env = { foo: { bar: "baz" } };
    const { result } = run(code, env);
    expect(result).toEqual("baz");
    expect(env).toEqual({ foo: { bar: "baz" } });
  });

  it("evals a deeper bare var", () => {
    const code = `foo.bar.baz`;
    const env = { foo: { bar: { baz: "fiz" } } };
    const { result } = run(code, env);
    expect(result).toEqual("fiz");
    expect(env).toEqual({ foo: { bar: { baz: "fiz" } } });
  });
});

describe("objects", () => {
  it("creates an object", () => {
    const code = `foo = { bar: "baz" };`;
    const env = {};
    const { result } = run(code, env);
    expect(result).toBeUndefined();
    expect(env).toEqual({ foo: { bar: "baz" } });
  });

  it("creates an array", () => {
    const code = `foo = ["bar", "baz"];`;
    const env = {};
    const { result } = run(code, env);
    expect(result).toBeUndefined();
    expect(env).toEqual({ foo: ["bar", "baz"] });
  });
});
