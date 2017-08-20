// http://lisperator.net/pltut/

const InputStream = require("./input-stream");
const TokenStream = require("./token-stream");
const Environment = require("./environment");
const parse = require("./parse");
const evaluate = require("./evaluate");

function run(code, env = {}) {
  var globalEnv = new Environment();
  Object.keys(env).forEach(key => {
    globalEnv.def(key, env[key]);
  });
  const ast = parse(TokenStream(InputStream(code)));
  const result = evaluate(ast, globalEnv);
  return { result, env: globalEnv.vars };
}

module.exports = run;
