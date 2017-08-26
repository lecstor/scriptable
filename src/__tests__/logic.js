const runner = require("../");

const run = runner();

const DEBUG = true;

describe("logic", () => {
  describe("operators", () => {
    it("gt true", () => {
      const code = `6 > 3`;
      const env = {};
      const { result } = run(code, env);
      expect(result).toEqual(true);
    });

    it("gt false", () => {
      const code = `3 > 6`;
      const env = {};
      const { result } = run(code, env);
      expect(result).toEqual(false);
    });
  });

  describe("if", () => {
    it("if gt true", () => {
      const code = `if (6 > 3) { true }`;
      const env = {};
      const { result } = run(code, env);
      expect(result).toEqual(true);
    });
  });

  describe("||", () => {
    it("handles ||", () => {
      const code = `thing = who || "world"; thing`;
      const env = { who: "Me" };
      const { result } = run(code, env);
      expect(result).toEqual("Me");
    });
  });
  describe("&&", () => {
    it("handles && - true", () => {
      const code = `if (1 && 2) { thing = "true" }`;
      const env = {};
      run(code, env);
      expect(env.thing).toEqual("true");
    });
    it("handles && - false", () => {
      const code = `if (0 && 2) { thing = "true" }`;
      const env = {};
      run(code, env);
      expect(env.thing).toBeUndefined();
    });
  });
});
