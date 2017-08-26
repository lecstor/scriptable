const run = require("../");

const DEBUG = true;

describe("expressions", () => {
  it("6 + 3", () => {
    const code = `6 + 3`;
    const env = {};
    const { result } = run(code, env);
    expect(result).toEqual(9);
  });
});
