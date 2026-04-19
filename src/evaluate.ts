import type { Node } from "acorn";
import binaryOps from "./binary-ops.js";
import logicOps from "./logic-ops.js";
import type Environment from "./environment.js";
import type { FunctionMap } from "./builtin-functions.js";

type AnyNode = Node & Record<string, any>;

// Properties that enable sandbox escape (prototype chain → Function constructor)
// or prototype pollution. Blocked in both MemberExpression and deep path access.
const BLOCKED_PROPS = new Set([
  "constructor",
  "__proto__",
  "prototype",
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__",
]);

function assertSafeProperty(prop: string): void {
  if (BLOCKED_PROPS.has(prop)) {
    throw new Error(`Access to property '${prop}' is not allowed`);
  }
}

function loc(exp: AnyNode) {
  return exp.loc!.start;
}

function makeFunc(
  params: string[],
  body: AnyNode,
  env: Environment,
  functions: FunctionMap
) {
  const scope = env.extend();
  return (...args: any[]) => {
    params.forEach((param, idx) => {
      scope.def(param, idx < args.length ? args[idx] : false);
    });
    return evaluate(body, scope, functions);
  };
}

const evals: Record<
  string,
  (exp: AnyNode, env: Environment, functions: FunctionMap) => any
> = {
  ArrowFunctionExpression(exp, env, functions) {
    const params = exp.params.map((param: AnyNode) => evaluate(param));
    return makeFunc(params, exp.body, env, functions);
  },

  ArrayExpression(exp, env, functions) {
    const result: any[] = [];
    for (const el of exp.elements) {
      if (el && el.type === "SpreadElement") {
        const spread = evaluate(el.argument, env, functions);
        // Check projected length before growing. push(...spread) hits V8's
        // argument-stack limit (~65K) well below maxAllocSize, so enforce here
        // and grow via a loop instead.
        const addLen =
          spread && typeof spread.length === "number" ? spread.length : 0;
        env.runtime.checkLength(result.length + addLen);
        for (const item of spread) result.push(item);
      } else if (el) {
        result.push(evaluate(el, env, functions));
      }
    }
    return result;
  },

  AssignmentExpression(exp, env, functions) {
    const target = evaluate(exp.left);
    return env.set(target, evaluate(exp.right, env, functions), loc(exp));
  },

  BinaryExpression(exp, env, functions) {
    const left = evaluate(exp.left, env, functions);
    const right = evaluate(exp.right, env, functions);
    return binaryOps[exp.operator](left, right);
  },

  BlockStatement(exp, env, functions) {
    const scope = env.extend();
    let result;
    for (const part of exp.body) {
      result = evaluate(part, scope, functions);
      if (part.type === "ReturnStatement") {
        break;
      }
    }
    return result;
  },

  CallExpression(exp, env, functions) {
    const func = evaluate(exp.callee);

    // Collect args, handling spread. Same V8 argument-stack consideration
    // as ArrayExpression — cap projected length and grow via a loop.
    const args: any[] = [];
    for (const arg of exp.arguments) {
      if (arg.type === "SpreadElement") {
        const spread = evaluate(arg.argument, env, functions);
        const addLen =
          spread && typeof spread.length === "number" ? spread.length : 0;
        env.runtime.checkLength(args.length + addLen);
        for (const item of spread) args.push(item);
      } else {
        args.push(evaluate(arg, env, functions));
      }
    }

    if (functions[func]) {
      return functions[func](...args);
    }

    if (env.defined(func)) {
      const customFunc = env.get(func, loc(exp));
      if (typeof customFunc === "function") {
        return customFunc(...args);
      }
    }
    const l = loc(exp);
    throw new Error(`${func} is not a function (${l.line}:${l.column})`);
  },

  ConditionalExpression(exp, env, functions) {
    const test = evaluate(exp.test, env, functions);
    return test
      ? evaluate(exp.consequent, env, functions)
      : evaluate(exp.alternate, env, functions);
  },

  ExpressionStatement(exp, env, functions) {
    return evaluate(exp.expression, env, functions);
  },

  FunctionDeclaration(exp, env, functions) {
    const name = evaluate(exp.id);
    const params = exp.params.map((param: AnyNode) => evaluate(param));
    env.set(name, makeFunc(params, exp.body, env, functions), loc(exp));
  },

  Identifier(exp, env) {
    if (env) {
      return env.get(exp.name, loc(exp));
    }
    return exp.name;
  },

  IfStatement(exp, env, functions) {
    const test = evaluate(exp.test, env, functions);
    if (test) {
      return evaluate(exp.consequent, env, functions);
    }
    if (exp.alternate) {
      return evaluate(exp.alternate, env, functions);
    }
  },

  Literal(exp) {
    return exp.value;
  },

  LogicalExpression(exp, env, functions) {
    const left = evaluate(exp.left, env, functions);
    const right = evaluate(exp.right, env, functions);
    return logicOps[exp.operator](left, right);
  },

  MemberExpression(exp, env, functions) {
    if (!env) {
      const obj = evaluate(exp.object);
      const prop = evaluate(exp.property);
      assertSafeProperty(prop);
      return `${obj}.${prop}`;
    }
    const obj = evaluate(exp.object, env, functions);
    if (exp.computed) {
      const prop = evaluate(exp.property, env, functions);
      assertSafeProperty(String(prop));
      return obj[prop];
    }
    const prop = evaluate(exp.property);
    assertSafeProperty(prop);
    return obj[prop];
  },

  ObjectExpression(exp, env, functions) {
    const result: Record<string, any> = {};
    for (const prop of exp.properties) {
      if (prop.type === "SpreadElement") {
        const spread = evaluate(prop.argument, env, functions);
        Object.assign(result, spread);
      } else {
        // Property — key can be Identifier or Literal
        const key =
          prop.key.type === "Identifier" ? prop.key.name : prop.key.value;
        result[key] = evaluate(prop.value, env, functions);
      }
    }
    return result;
  },

  Program(exp, env, functions) {
    let result;
    for (const node of exp.body) {
      result = evaluate(node, env, functions);
    }
    return result;
  },

  ReturnStatement(exp, env, functions) {
    return evaluate(exp.argument, env, functions);
  },

  TemplateLiteral(exp, env, functions) {
    let result = "";
    for (let i = 0; i < exp.quasis.length; i++) {
      result += exp.quasis[i].value.cooked;
      if (i < exp.expressions.length) {
        result += String(evaluate(exp.expressions[i], env, functions));
      }
    }
    return result;
  },

  UnaryExpression(exp, env, functions) {
    const arg = evaluate(exp.argument, env, functions);
    switch (exp.operator) {
      case "!":
        return !arg;
      case "-":
        return -arg;
      case "+":
        return +arg;
      case "typeof":
        return typeof arg;
      default:
        throw new Error(`Unsupported unary operator: ${exp.operator}`);
    }
  },

  VariableDeclaration(exp, env, functions) {
    if (exp.kind === "var") {
      const globalScope = env.getGlobalScope();
      for (const dec of exp.declarations) {
        evaluate(dec, globalScope, functions);
      }
      return;
    }
    for (const dec of exp.declarations) {
      evaluate(dec, env, functions);
    }
  },

  VariableDeclarator(exp, env, functions) {
    const name = evaluate(exp.id);
    const value = exp.init ? evaluate(exp.init, env, functions) : undefined;
    return env.def(name, value);
  },
};

function evaluate(exp: AnyNode, env?: any, functions?: any): any {
  // env is absent when we're resolving a static path (AssignmentExpression
  // target, CallExpression callee, function/variable names, params). Those
  // branches don't execute user code, so the counter only needs to run here.
  if (env) env.runtime.step();
  if (evals[exp.type]) {
    const result = evals[exp.type](exp, env, functions);
    // checkSize inspects strings and arrays; other return types are no-ops.
    // Covers both interpreter-built values (BinaryExpression +, TemplateLiteral,
    // ArrayExpression) and builtin results (CallExpression).
    if (env) env.runtime.checkSize(result);
    return result;
  }
  throw new Error("Cannot evaluate " + exp.type);
}

export default evaluate;
