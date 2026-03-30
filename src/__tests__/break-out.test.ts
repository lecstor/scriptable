import { describe, it, expect } from "vitest";
import runner from "../index.js";

const run = runner();

/*
 * https://blog.liftsecurity.io/2015/04/27/when-this-is-really-that/
 */

describe("try to get require", () => {
  it("this.constructor.constructor", () => {
    const code = `bar = this.constructor.constructor`;
    const env = {};
    expect(() => run(code, env)).toThrow("Cannot evaluate ThisExpression");
  });

  it("object.constructor", () => {
    const code = `
      bar = { any: "thing" };
      func = bar.constructor;
      func2 = func("return process");
      process = func2();
    `;
    const env = {};
    expect(() => run(code, env)).toThrow(
      "Access to property 'constructor' is not allowed"
    );
  });

  it("arguments.callee.caller", () => {
    const code = `
      function getFunc () {
        return arguments.callee.caller.arguments.callee.caller.arguments.callee.caller.arguments.callee.arguments.callee.caller;
      }
      func = getFunc();
      func.call(func, "var fs = process.mainModule.require('fs');");
    `;
    const env = {};
    expect(() => run(code, env)).toThrow(
      new ReferenceError(`"arguments" is not defined (3:15)`)
    );
  });
});
