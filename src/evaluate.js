const set = require("lodash/set");
const forEach = require("lodash/forEach");
const cloneDeep = require("lodash/cloneDeep");

const binaryOps = require("./binary-ops");
const logicOps = require("./logic-ops");

const DEBUG = false;

function makeFunc(params, body, env, functions) {
  DEBUG && console.log({ params, body });
  let localEnv = cloneDeep(env);
  return (...args) => {
    params.forEach((param, idx) => {
      localEnv[param] = args[idx];
    });
    return evaluate(body, localEnv, functions);
  };
}

const evals = {
  ArrowFunctionExpression(exp, env, functions) {
    const params = exp.params.map(param => evaluate(param));
    DEBUG && console.log({ exp, env, params: exp.params });
    return makeFunc(params, exp.body, env, functions);
  },
  ArrayExpression(exp, env, functions) {
    return exp.elements.map(el => evaluate(el, env, functions));
  },
  AssignmentExpression(exp, env, functions) {
    const target = exp.left.name;
    set(env, target, evaluate(exp.right, env, functions));
  },
  BinaryExpression(exp, env, functions) {
    DEBUG && console.log({ exp, env });
    const left = evaluate(exp.left, env, functions);
    const right = evaluate(exp.right, env, functions);
    return binaryOps[exp.operator](left, right);
  },
  BlockStatement(exp, env, functions) {
    DEBUG && console.log({ exp, env });
    let result;
    forEach(exp.body, part => {
      result = evaluate(part, env, functions);
      if (part.type === "ReturnStatement") {
        return false;
      }
    });
    return result;
  },
  CallExpression(exp, env, functions) {
    const func = evaluate(exp.callee);
    const args = exp.arguments.map(arg => evaluate(arg, env, functions));
    DEBUG && console.log({ exp, env, func, args });
    if (functions[func]) {
      return functions[func](...args);
    }
    if (!env[func]) {
      const loc = exp.loc.start;
      throw new Error(`${func} is not a function (${loc.line}:${loc.column})`);
    }
    return env[func](...args);
  },
  ExpressionStatement(exp, env, functions) {
    return evaluate(exp.expression, env, functions);
  },
  File(exp, env, functions) {
    return evaluate(exp.program, env, functions);
  },
  FunctionDeclaration(exp, env, functions) {
    const name = evaluate(exp.id);
    const params = exp.params.map(param => evaluate(param));
    DEBUG && console.log({ exp, env, name, params });
    env[name] = makeFunc(params, exp.body, env, functions);
  },
  Identifier(exp, env, functions) {
    DEBUG && console.log({ exp, env });
    if (env) {
      return env[exp.name];
    }
    return exp.name;
  },
  IfStatement(exp, env, functions) {
    const test = evaluate(exp.test, env, functions);
    if (test) {
      return evaluate(exp.consequent, env, functions);
    }
  },
  Literal(exp) {
    DEBUG && console.log({ exp });
    return exp.value;
  },
  LogicalExpression(exp, env, functions) {
    DEBUG && console.log({ exp, env });
    const left = evaluate(exp.left, env, functions);
    const right = evaluate(exp.right, env, functions);
    return logicOps[exp.operator](left, right);
  },
  MemberExpression(exp, env, functions) {
    const obj = evaluate(exp.object, env, functions);
    const prop = evaluate(exp.property, obj, functions);
    DEBUG && console.log({ exp, env, obj, prop });
    if (exp.computed) {
      return obj[prop];
    }
    return prop;
  },
  ObjectExpression(exp, env, functions) {
    DEBUG && console.log({ exp, env });
    return exp.properties.reduce((res, prop) => {
      res[prop.key.name] = evaluate(prop.value, env, functions);
      return res;
    }, {});
  },
  Program(exp, env, functions) {
    DEBUG && console.log({ exp, env });
    // only return the result of the last "line"
    let result;
    exp.body.forEach(exp => {
      result = evaluate(exp, env, functions);
    });
    return result;
  },
  ReturnStatement(exp, env, functions) {
    DEBUG && console.log({ exp, env });
    return evaluate(exp.argument, env, functions);
  }
};

function evaluate(exp, env, functions) {
  if (evals[exp.type]) {
    return evals[exp.type](exp, env, functions);
  }
  throw new Error("Cannot evaluate " + exp.type);
}

module.exports = evaluate;
