const babylon = require("babylon");

const stdFuncs = require("./standard-functions");

const safejs = {
  validate(code) {
    const parsed = babylon.parse(code);
    const env = {
      funcs: stdFuncs,
      propFuncs: {
        forEach: true,
        push: true,
        shift: true
      }
    };
    parsed.program.body.forEach(line => walk(line, env));
    return code;
  }
};

module.exports = safejs;

const okTypes = {
  ExpressionStatement(expr, env) {
    walk(expr.expression, env);
  },
  ArrayExpression(expr, env) {
    expr.elements.forEach(exp => walk(exp, env));
  },
  AssignmentExpression(expr, env) {
    // if (expr.right.type === "ArrowFunctionExpression") {
    // assignment of function call result might be a function..
    env.funcs[expr.left.name] = true;
    // }
    walk(expr.left, env);
    walk(expr.right, env);
  },
  Identifier() {},
  StringLiteral() {},
  MemberExpression(expr, env) {
    walk(expr.object, env);
  },
  NumericLiteral() {},
  ArrowFunctionExpression(expr, env) {
    walk(expr.body, env);
  },
  CallExpression(expr, env) {
    if (expr.callee.type === "Identifier") {
      if (!env.funcs[expr.callee.name]) {
        console.log(env.funcs);
        throw new Error(`Function not permitted: ${expr.callee.name}`);
      }
      walk(expr.callee, env);
    } else if (expr.callee.type === "MemberExpression") {
      if (!env.propFuncs[expr.callee.property.name]) {
        console.log(env.propFuncs);
        throw new Error(
          `Property Function not permitted: ${expr.callee.property.name}`
        );
      }
      walk(expr.callee, env);
    } else {
      throw new Error(`Callee Type not permitted: ${expr.callee.type}`);
    }
  },
  BinaryExpression(expr, env) {
    walk(expr.left, env);
    walk(expr.right, env);
  }
};

const okOperators = {
  "+": true,
  "-": true,
  "*": true,
  "/": true,
  "=": true
};

function walk(expr, env) {
  console.log(JSON.stringify(expr, null, 2));
  if (!(expr.type in okTypes)) {
    throw new Error(`Type not permitted: ${expr.type}`);
  }
  if (expr.operator && !(expr.operator in okOperators)) {
    throw new Error(`Operator not permitted: ${expr.operator}`);
  }
  return okTypes[expr.type](expr, env);
}
