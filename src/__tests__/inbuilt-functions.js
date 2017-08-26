const run = require("../");

const DEBUG = true;

describe("inbuilt functions", () => {
  it("_concat", () => {
    const code = `_concat(list, "i")`;
    const env = { list: ["me", "myself"] };
    const { result } = run(code, env);
    expect(result).toEqual(["me", "myself", "i"]);
  });

  it("push", () => {
    const code = `push(list, "i")`;
    const env = { list: ["me", "myself"] };
    const { result } = run(code, env);
    expect(result).toBeUndefined();
    expect(env.list).toEqual(["me", "myself", "i"]);
  });

  it("shift", () => {
    const code = `shift(list)`;
    const env = { list: ["me", "myself"] };
    const { result } = run(code, env);
    expect(result).toEqual("me");
    expect(env.list).toEqual(["myself"]);
  });

  it("numberFormatter", () => {
    const code = `formatD = numberFormatter(); formatD(12340);`;
    const env = {};
    const { result } = run(code, env, DEBUG);
    expect(result).toEqual("12,340");
  });

  it("formatDollars", () => {
    const code = `formatDollars(12340);`;
    const env = {};
    const { result } = run(code, env, DEBUG);
    expect(result).toEqual("12,340.00");
  });
});
