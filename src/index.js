const babylon = require("babylon");
const evaluate = require("./evaluate");
const builtinFuncs = require("./builtin-functions");
const Environment = require("./environment");

function parse(code) {
  return babylon.parse(code, {
    sourceType: "script",
    plugins: ["estree"]
  });
}

function runner({ functions = builtinFuncs } = {}) {
  return (code, env = {}, debug) => {
    const ast = parse(code);
    debug && console.log(JSON.stringify(ast.program.body, null, 2));
    const globalEnv = new Environment();
    Object.keys(env).forEach(key => {
      globalEnv.def(key, env[key]);
    });
    const result = evaluate(ast, globalEnv, functions);
    return { result, env: globalEnv.vars };
  };
}

module.exports = runner;
