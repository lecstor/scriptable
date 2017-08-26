const babylon = require("babylon");
const evaluate = require("./evaluate");
const builtinFuncs = require("./builtin-functions");

function parse(code) {
  return babylon.parse(code, {
    sourceType: "script",
    plugins: ["estree"]
  });
}

function runner({ functions = builtinFuncs } = {}) {
  return (code, env, debug) => {
    const ast = parse(code);
    debug && console.log(JSON.stringify(ast.program.body, null, 2));
    const result = evaluate(ast, env, functions);
    return { result, env };
  };
}

module.exports = runner;
