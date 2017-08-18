const babylon = require("babylon");
const stdFuncs = require("./standard-functions");

const safejs = {
  run(code, context = {}) {
    const parsed = babylon.parse(code);
    console.log(JSON.stringify(parsed, null, 2));
    const { body } = parsed.program;
    const env = {
      stdFuncs,
      userFuncs: {},
      context
    };
    body.forEach(statement => evaluate(statement, env));
    return context;
  }
};

module.exports = safejs;

function evaluate(expr, env) {
  console.log("evaluate", expr);
  switch (expr.type) {
    case "ExpressionStatement":
      return evaluate(expr.expression, env);
    case "AssignmentExpression":
      return assignmentExpression(expr, env);
    case "CallExpression":
      return callExpression(expr, env);
    case "ArrowFunctionExpression":
      return arrowFunctionExpression(expr, env);
    case "StringLiteral":
      return expr.value;
    case "NumericLiteral":
      return expr.value;
    // case "Identifier":
    //   return env.context[expr.name];
    default:
      console.log(expr);
      throw new Error(`Unexpected expression: ${expr}`);
  }
}

function assignmentExpression(expr, env) {
  if (expr.operator !== "=") {
    throw new Error(
      `Unexpected assignment expression operator: ${expr.operator}`
    );
  }
  const { context, userFuncs } = env;
  const varName = expr.left.name;
  let envSlot = context;
  let value = evaluate(expr.right, env);
  if (expr.right.type === "CallExpression") {
    value = value();
    if (typeof value === "function") {
      envSlot = userFuncs;
    }
  } else if (expr.right.type === "ArrowFunctionExpression") {
    envSlot = userFuncs;
  }
  envSlot[varName] = value;
  return env;
}

function makeCall(funcName, args, env) {
  if (env.stdFuncs[funcName]) {
    return env.stdFuncs[funcName](...args);
  } else if (env.userFuncs[funcName]) {
    return env.userFuncs[funcName](...args);
  } else {
    console.log({ env });
    throw new Error(`Function ${funcName} not found`);
  }
}

function callExpression(expr, env) {
  if (expr.callee.type !== "Identifier") {
    throw new Error(
      `Unexpected call expression callee type: ${expr.callee.type}`
    );
  }
  const funcName = expr.callee.name;
  return (...args) => {
    const argVals = expr.arguments.map((arg, idx) => {
      if (arg.type === "Identifier") {
        return args[idx];
      }
      return evaluate(arg, env);
    });
    return makeCall(funcName, argVals, env);
  };
}

function arrowFunctionExpression(expr, env) {
  if (expr.generator) {
    throw new Error(`Generators are not supported`);
  }
  if (expr.async) {
    throw new Error(`Async is not supported`);
  }
  if (!expr.expression) {
    throw new Error(`Something probably isn't right`);
  }
  const params = expr.params.map(param => param.name);
  const body = evaluate(expr.body, env);
  return (...args) => body(...args);
}
