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

  it("has access to env", () => {
    const code = `
      Date = (date) => formatDate(date, "MMM D YYYY h:mma z", customer.tz);
      Date("2017-08-27T09:00:57.730+10:00");
    `;
    const { result } = run(code, { customer: { tz: "America/Los_Angeles" } });
    expect(result).toEqual("Aug 26 2017 4:00pm PDT");
  });
});
