import type { Node } from "acorn";
import binaryOps from "./binary-ops.js";
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

// Sentinel thrown by ReturnStatement and caught at the nearest function
// boundary (makeFunc). Without this, a `return` nested inside an `if` (or
// any non-ReturnStatement node) would be evaluated but the enclosing
// BlockStatement would keep iterating the remaining statements — so
// `function f(n) { if (n==0) return 1; f(0); return n; }` would fall
// through to `f(0)` after the guarded return and recurse forever.
class ReturnValue {
  constructor(public value: any) {}
}

function loc(exp: AnyNode) {
  return exp.loc!.start;
}

// Resolve an LHS or callee expression to an array of path segments. Used by
// AssignmentExpression target and CallExpression callee. Unlike full
// evaluation, this walks Identifier → name and stitches member accesses into
// a segment list; but it *does* evaluate the key of a computed member
// (`a[k]`) in the runtime env so the path reflects the actual property being
// addressed. Returning segments (not a dotted string) keeps dot-containing
// keys like `a["x.y"]` as a single segment — a dotted string would be
// re-split on the way through deepSet and write to `a.x.y` instead.
function evalAsPath(
  exp: AnyNode,
  env: Environment,
  functions: FunctionMap
): string[] {
  if (exp.type === "Identifier") return [exp.name];
  if (exp.type === "Literal") return [String(exp.value)];
  if (exp.type === "MemberExpression") {
    const objParts = evalAsPath(exp.object, env, functions);
    const propStr = exp.computed
      ? String(evaluate(exp.property, env, functions))
      : String((exp.property as AnyNode).name);
    assertSafeProperty(propStr);
    return [...objParts, propStr];
  }
  throw new Error("Cannot evaluate " + exp.type + " as assignment target");
}

function makeFunc(
  params: string[],
  body: AnyNode,
  env: Environment,
  functions: FunctionMap
) {
  // Fresh scope per invocation — a scope hoisted to closure creation time was
  // shared across every call, so recursion overwrote the caller's params and
  // any let/const it had set on the function scope. `env` is the closure's
  // captured lexical parent; extend it anew on every call.
  return (...args: any[]) => {
    const scope = env.extend();
    params.forEach((param, idx) => {
      scope.def([param], idx < args.length ? args[idx] : false);
    });
    try {
      return evaluate(body, scope, functions);
    } catch (err) {
      if (err instanceof ReturnValue) return err.value;
      throw err;
    }
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
    // Previously the operator was ignored, so `a += 1` silently behaved as
    // `a = 1`. Compound ops now read the current value, combine with the rhs
    // via the matching binary op, and write back. Logical compounds
    // (`||=`, `&&=`, `??=`) short-circuit: rhs is only evaluated and written
    // when the gate condition holds.
    const target = evalAsPath(exp.left, env, functions);
    if (exp.operator === "=") {
      return env.set(target, evaluate(exp.right, env, functions), loc(exp));
    }
    const current = env.get(target, loc(exp));
    if (exp.operator === "||=") {
      return current || env.set(target, evaluate(exp.right, env, functions), loc(exp));
    }
    if (exp.operator === "&&=") {
      return current && env.set(target, evaluate(exp.right, env, functions), loc(exp));
    }
    if (exp.operator === "??=") {
      return current ?? env.set(target, evaluate(exp.right, env, functions), loc(exp));
    }
    const op = exp.operator.slice(0, -1);
    if (!binaryOps[op]) {
      throw new Error(`Unsupported assignment operator: ${exp.operator}`);
    }
    const rhs = evaluate(exp.right, env, functions);
    return env.set(target, binaryOps[op](current, rhs), loc(exp));
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
    }
    return result;
  },

  CallExpression(exp, env, functions) {
    // Path-based resolution for static callees (Identifier / MemberExpression)
    // lets us look up builtins in the `functions` map and dotted-path names in
    // env. For dynamic callees (e.g. `f()()`, `(() => 1)()`), evaluate the
    // callee as a value and call it directly if it's a function.
    let fn: Function | undefined;
    let name: string | undefined;
    if (
      exp.callee.type === "Identifier" ||
      exp.callee.type === "MemberExpression"
    ) {
      const path = evalAsPath(exp.callee, env, functions);
      name = path.join(".");
      // hasOwn, not `functions[name]`: a plain-object `functions` map inherits
      // from Object.prototype, so `functions["constructor"]` would resolve to
      // `Object`, `functions["toString"]` to `Object.prototype.toString`, etc.
      // Not directly exploitable today (returned wrappers can't reach blocked
      // props) but a foot-gun the moment a builtin shares a name with an
      // Object.prototype member.
      if (Object.prototype.hasOwnProperty.call(functions, name)) {
        fn = functions[name];
      } else if (env.defined(path)) {
        const value = env.get(path, loc(exp));
        if (typeof value === "function") fn = value;
      }
    } else {
      const value = evaluate(exp.callee, env, functions);
      if (typeof value === "function") fn = value;
    }

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

    if (fn) return fn(...args);
    const l = loc(exp);
    throw new Error(
      `${name ?? exp.callee.type} is not a function (${l.line}:${l.column})`
    );
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
    env.set([name], makeFunc(params, exp.body, env, functions), loc(exp));
  },

  Identifier(exp, env) {
    if (env) {
      return env.get([exp.name], loc(exp));
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
    // Short-circuit: `a || b` must not evaluate `b` when `a` is truthy, and
    // `a && b` must not evaluate `b` when `a` is falsy. Previously both sides
    // were evaluated eagerly, which broke the common `guard && action` idiom.
    const left = evaluate(exp.left, env, functions);
    switch (exp.operator) {
      case "||":
        return left || evaluate(exp.right, env, functions);
      case "&&":
        return left && evaluate(exp.right, env, functions);
      case "??":
        return left ?? evaluate(exp.right, env, functions);
      default:
        throw new Error(`Unsupported logical operator: ${exp.operator}`);
    }
  },

  MemberExpression(exp, env, functions) {
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
    // Track own-key count so we can bound via checkLength without an O(N)
    // Object.keys(result).length call on every iteration.
    let ownCount = 0;
    for (const prop of exp.properties) {
      if (prop.type === "SpreadElement") {
        const spread = evaluate(prop.argument, env, functions);
        // Object.assign invokes setters, which includes Object.prototype's
        // __proto__ setter when source has own __proto__. Copy own enumerable
        // keys manually and drop blocked keys so a spread can't set the
        // prototype of result or plant a booby-trapped own "constructor".
        if (spread != null && typeof spread === "object") {
          const keys = Object.keys(spread);
          // Project before writing: `reduce(arr, (a,k) => ({...a,[k]:k}), {})`
          // grows the accumulator by one key per step and would otherwise run
          // until maxSteps exhausts, leaving a maxSteps-sized object behind.
          env.runtime.checkLength(ownCount + keys.length);
          for (const key of keys) {
            if (!BLOCKED_PROPS.has(key)) {
              if (!Object.prototype.hasOwnProperty.call(result, key)) {
                ownCount++;
              }
              result[key] = (spread as Record<string, any>)[key];
            }
          }
        }
      } else {
        // Property — non-computed keys are Identifier (shorthand/name) or
        // Literal; computed keys (`{[expr]: v}`) require evaluating the
        // expression. The previous code ignored `computed`, so `{[k]: v}`
        // silently used the identifier NAME "k" instead of its value.
        let key: string;
        if (prop.computed) {
          key = String(evaluate(prop.key, env, functions));
        } else if (prop.key.type === "Identifier") {
          key = prop.key.name;
        } else {
          key = String(prop.key.value);
        }
        // Block "__proto__", "constructor", etc. as keys so user code can't
        // set the prototype of a fresh object via literal syntax, and so an
        // object leaving the sandbox can't carry a booby-trapped "constructor"
        // into the caller's scope.
        assertSafeProperty(key);
        if (!Object.prototype.hasOwnProperty.call(result, key)) {
          env.runtime.checkLength(ownCount + 1);
          ownCount++;
        }
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
    // Throw a sentinel so control unwinds to the nearest function boundary
    // regardless of which nested construct (if/block/etc.) contains the return.
    throw new ReturnValue(
      exp.argument ? evaluate(exp.argument, env, functions) : undefined
    );
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
    return env.def([name], value);
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
