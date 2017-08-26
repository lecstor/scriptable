const runner = require("../");

const DEBUG = true;

const run = runner();

describe("expressions", () => {
  it("6 + 3", () => {
    const code = `6 + 3`;
    const env = {};
    const { result } = run(code, env);
    expect(result).toEqual(9);
  });
});
