const set = require("lodash/set");
const forEach = require("lodash/forEach");

const binaryOps = require("./binary-ops");
const logicOps = require("./logic-ops");
const inbuiltFuncs = require("./inbuilt-functions");

function makeFunc(params, body) {
  return args => {
    let localEnv = {};
    args.forEach((arg, idx) => {
      localEnv[params[idx]] = arg;
    });
    return evaluate(body, localEnv);
  };
}

const evals = {
  ArrowFunctionExpression(exp, env) {
    const params = exp.params.map(param => evaluate(param));
    return makeFunc(params, exp.body);
  },
  ArrayExpression(exp, env) {
    return exp.elements.map(el => evaluate(el, env));
  },
  AssignmentExpression(exp, env) {
    // const target = evaluate(exp.left, env);
    const target = exp.left.name;
    set(env, target, evaluate(exp.right, env));
  },
  BinaryExpression(exp, env) {
    const left = evaluate(exp.left, env);
    const right = evaluate(exp.right, env);
    return binaryOps[exp.operator](left, right);
  },
  BlockStatement(exp, env) {
    let result;
    forEach(exp.body, part => {
      result = evaluate(part, env);
      if (part.type === "ReturnStatement") {
        return false;
      }
    });
    return result;
  },
  CallExpression(exp, env) {
    const func = evaluate(exp.callee);
    const args = exp.arguments.map(arg => evaluate(arg, env));
    if (inbuiltFuncs[func]) {
      return inbuiltFuncs[func](args);
    }
    return env[func](args);
  },
  ExpressionStatement(exp, env) {
    return evaluate(exp.expression, env);
  },
  File(exp, env) {
    return evaluate(exp.program, env);
  },
  FunctionDeclaration(exp, env) {
    const name = evaluate(exp.id);
    const params = exp.params.map(param => evaluate(param));
    env[name] = makeFunc(params, exp.body);
  },
  Identifier(exp, env) {
    if (env) {
      return env[exp.name];
    }
    return exp.name;
  },
  IfStatement(exp, env) {
    const test = evaluate(exp.test, env);
    if (test) {
      return evaluate(exp.consequent, env);
    }
  },
  Literal(exp, env) {
    return exp.value;
  },
  LogicalExpression(exp, env) {
    const left = evaluate(exp.left, env);
    const right = evaluate(exp.right, env);
    return logicOps[exp.operator](left, right);
  },
  MemberExpression(exp, env) {
    const obj = evaluate(exp.object, env);
    const prop = evaluate(exp.property, obj);
    // console.log({ obj, prop });
    if (exp.computed) {
      return obj[prop];
    }
    return prop;
  },
  ObjectExpression(exp, env) {
    return exp.properties.reduce((res, prop) => {
      // res[evaluate(prop.key, env)] = evaluate(prop.value, env);
      res[prop.key.name] = evaluate(prop.value, env);
      return res;
    }, {});
  },
  Program(exp, env) {
    // only return the result of the last "line"
    let result;
    exp.body.forEach(exp => {
      result = evaluate(exp, env);
    });
    return result;
    // return exp.body.map(exp => {
    //   return evaluate(exp, env);
    // });
  },
  ReturnStatement(exp, env) {
    return evaluate(exp.argument, env);
  }
};

function evaluate(exp, env) {
  if (evals[exp.type]) {
    return evals[exp.type](exp, env);
  }
  throw new Error("I don't know how to evaluate " + exp.type);
}

module.exports = evaluate;
