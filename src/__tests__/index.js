const run = require("../safejs");

describe("safejs", () => {
  it("runs", () => {
    const code = `
      sum = lambda(x, y) x + y;
      result = sum(21, 21);
      `;
    const props = {};
    const result = run(code, props);
    expect(result).toEqual(42);
  });
});
