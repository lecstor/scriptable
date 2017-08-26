const run = require("../");

const DEBUG = true;

describe("function", () => {
  it("defines a function", () => {
    const code = `
      function foo(bar){ return bar + 3; }
      baz = foo(7);
      `;
    const env = {};
    // const { result } = run(code, env);
    run(code, env);
    // console.log(JSON.stringify({ env }, null, 2));
    // console.log(env);
    // console.log(`${env.foo}`);
    expect(env.foo).toBeDefined();
    expect(env.baz).toEqual(10);
  });

  it("defines an arrow function", () => {
    const code = `
      foo = (bar) => { return bar + 3; }
      baz = foo(7);
      `;
    const env = {};
    // const { result } = run(code, env);
    run(code, env);
    // console.log(JSON.stringify({ env }, null, 2));
    // console.log(env);
    // console.log(`${env.foo}`);
    expect(env.foo).toBeDefined();
    expect(env.baz).toEqual(10);
  });
});
