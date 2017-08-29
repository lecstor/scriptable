const runner = require("../");

const run = runner();

const DEBUG = true;

describe("builtin functions", () => {
  it("concat", () => {
    const code = `concat(list, "i")`;
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

  it("numberFormatter - no args", () => {
    const code = `formatD = numberFormatter(); formatD(12340);`;
    const env = {};
    const { result } = run(code, env);
    expect(result).toEqual("12,340");
  });

  it("numberFormatter - with args", () => {
    const code = `
      formatD = numberFormatter("en-us", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      formatD(12340);
    `;
    const env = {};
    const { result } = run(code, env);
    expect(result).toEqual("12,340.00");
  });

  it("formatDollars", () => {
    const code = `formatDollars(12340);`;
    const env = {};
    const { result } = run(code, env);
    expect(result).toEqual("12,340.00");
  });
});
