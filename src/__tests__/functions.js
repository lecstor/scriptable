const runner = require("../");

const DEBUG = true;

const run = runner();

describe("function", () => {
  it("defines a function", () => {
    const code = `
      function foo(bar){ return bar + 3; }
      baz = foo(7);
      `;
    const env = {};
    run(code, env);
    expect(env.foo).toBeDefined();
    expect(env.baz).toEqual(10);
  });

  it("defines an arrow function", () => {
    const code = `
      foo = (bar) => { return bar + 3; }
      baz = foo(7);
      `;
    const env = {};
    const run = runner();
    run(code, env);
    expect(env.foo).toBeDefined();
    expect(env.baz).toEqual(10);
  });
});
