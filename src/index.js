const babylon = require("babylon");
const evaluate = require("./evaluate");

// const script = `
// foo;
// baz = foo;
// bar = { fizz: "bo" };
// func = (arg) => { return arg };
// add10 = (arg) => arg + 10;
// add10b = (arg = 3) => arg + 10;
// `;

function parse(code) {
  return babylon.parse(code, {
    sourceType: "script",
    plugins: ["estree"]
  });
}

function run(code, env, debug) {
  const ast = parse(code);
  if (debug) {
    console.log(JSON.stringify(ast.program.body, null, 2));
  }

  const result = evaluate(ast, env);
  return { result, env };
}

// const env = {
//   foo: "bar"
// };

// const ast = parse(script);
// console.log(JSON.stringify(ast, null, 2));

// const result = evaluate(ast, env);
// console.log(JSON.stringify({ result }, null, 2));
// console.log(JSON.stringify({ env }, null, 2));

module.exports = run;
