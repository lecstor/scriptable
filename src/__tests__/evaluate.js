const evaluate = require("../evaluate");

function ello(arg) {
  return `${arg} ello`;
}

describe("eval", () => {
  it("has access to external variables", () => {
    const hello = "Hello!";
    const result = eval("hello");
    expect(result).toEqual("Hello!");
  });

  it("has access to external functions", () => {
    const result = eval(`ello("hello")`);
    expect(result).toEqual("hello ello");
  });
});

describe("evaluate", () => {
  it("has access to external variables", () => {
    const code = `
      formatter = numberFormatter();
      formatter(123);
    `;
    const ev = evaluate(code);
    expect(ev.result).toEqual("123.00");
    expect(Object.keys(ev.props)).toEqual(["formatter"]);
  });
});
