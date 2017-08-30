const runner = require("../");

const DEBUG = true;

const run = runner();

/*
 * https://blog.liftsecurity.io/2015/04/27/when-this-is-really-that/
 *
 */

describe("try to get require", () => {
  it("this.constructor.constructor", () => {
    // https://gist.github.com/domenic/d15dfd8f06ae5d1109b0
    const code = `bar = this.constructor.constructor`;
    const env = {};
    expect(() => run(code, env)).toThrow("Cannot evaluate ThisExpression");
  });

  it("object.constructor", () => {
    // https://gist.github.com/domenic/d15dfd8f06ae5d1109b0
    const code = `
      bar = { any: "thing" };
      func = bar.constructor;
      func2 = func("return process");
      process = func2();
    `;
    const env = {};
    expect(() => run(code, env)).toThrow(
      new TypeError("func2 is not a function (5:16)")
    );
  });

  it("arguments.callee.caller", () => {
    // https://gist.github.com/bjoerge/2889278
    const code = `
      function getFunc () {
        return arguments.callee.caller.arguments.callee.caller.arguments.callee.caller.arguments.callee.arguments.callee.caller;
      }
      func = getFunc();
      func.call(func, "var fs = process.mainModule.require('fs');");
    `;
    const env = {};
    // try {
    //   run(code, env, DEBUG);
    // } catch (err) {
    //   console.error(err);
    // }
    // console.log(env.args);
    expect(() => run(code, env)).toThrow(
      new Error(`"arguments" is undefined (3:15)`)
    );
  });
});
