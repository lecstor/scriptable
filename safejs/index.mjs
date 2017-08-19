// http://lisperator.net/pltut/

// const InputStream = require("./input-stream");
// const TokenStream = require("./token-stream");
// const Environment = require("./environment");
// const parse = require("./parse");
// const evaluate = require("./evaluate");

import InputStream from "./input-stream";
import TokenStream from "./token-stream";
import Environment from "./environment";
import parse from "./parse";
import evaluate from "./evaluate";

function run(code, props = {}) {
  var globalEnv = new Environment();
  Object.keys(props).forEach(key => {
    globalEnv.def(key, props[key]);
  });
  const ast = parse(TokenStream(InputStream(code)));
  console.log(JSON.stringify(ast, null, 2));
  const result = evaluate(ast, globalEnv);
  console.log({ globalEnv });
  return result;
}

export default run;
// module.exports = run;

// var globalEnv = new Environment();

// globalEnv.def("time", func => {
//   try {
//     console.time("time");
//     return func();
//   } finally {
//     console.timeEnd("time");
//   }
// });

// if (typeof process !== "undefined") {
//   (function() {
//     globalEnv.def("println", val => {
//       console.log(val);
//     });
//     globalEnv.def("print", val => {
//       console.log(val);
//     });
//     var code = "";
//     process.stdin.setEncoding("utf8");
//     process.stdin.on("readable", () => {
//       var chunk = process.stdin.read();
//       if (chunk) {
//         code += chunk;
//       }
//     });
//     process.stdin.on("end", () => {
//       var ast = parse(TokenStream(InputStream(code)));
//       evaluate(ast, globalEnv);
//     });
//   })();
// }
