const runner = require("../");

const run = runner();

const DEBUG = true;

const code = `
  /**
   * @param {String} who say hello to
   */
  function hello (who) {
    return "hello " + who;
  }
  // single line comment

  // arrow function
  arrow = (str) => { return str + " =>"; }

  list = ["me", "myself"];
  push(list, "I");

  greet1 = hello(who || "world")
  greet2 = arrow(hello(who || "world"));

  greet2
`;

describe("a program", () => {
  it("does it all (1)", () => {
    const env = {};
    const { result } = run(code, env);
    expect(env.arrow).toBeInstanceOf(Function);
    expect(env.hello).toBeInstanceOf(Function);
    expect(env.greet1).toEqual("hello world");
    expect(env.greet2).toEqual("hello world =>");
    expect(result).toBeDefined();
    expect(result).toEqual("hello world =>");
  });

  it("does it all (2)", () => {
    const env = { who: "Jason" };
    const { result } = run(code, env);
    expect(result).toBeDefined();
    expect(result).toEqual("hello Jason =>");
  });
});
