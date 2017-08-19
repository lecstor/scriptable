function makeLambda(env, exp) {
  return (...args) => {
    const names = exp.vars;
    const scope = env.extend();
    names.forEach((name, idx) => {
      scope.def(name, idx < args.length ? args[idx] : false);
    });
    const result = evaluate(exp.body, scope);
    return result;
  };
}

function applyOp(op, a, b) {
  function num(x) {
    if (typeof x !== "number") {
      throw new Error("Expected number but got " + x);
    }
    return x;
  }
  function div(x) {
    if (num(x) === 0) {
      throw new Error("Divide by zero");
    }
    return x;
  }
  switch (op) {
    case "+":
      return num(a) + num(b);
    case "-":
      return num(a) - num(b);
    case "*":
      return num(a) * num(b);
    case "/":
      return num(a) / div(b);
    case "%":
      return num(a) % div(b);
    case "&&":
      return a !== false && b;
    case "||":
      return a !== false ? a : b;
    case "<":
      return num(a) < num(b);
    case ">":
      return num(a) > num(b);
    case "<=":
      return num(a) <= num(b);
    case ">=":
      return num(a) >= num(b);
    case "==":
      return a === b;
    case "!=":
      return a !== b;
  }
  throw new Error("Can't apply operator " + op);
}

const evalOps = {
  num(exp, env) {
    return exp.value;
  },
  str(exp, env) {
    return exp.value;
  },
  bool(exp, env) {
    return exp.value;
  },
  assign(exp, env) {
    if (exp.left.type !== "var") {
      throw new Error("Cannot assign to " + JSON.stringify(exp.left));
    }
    return env.set(exp.left.value, evaluate(exp.right, env));
  },
  binary(exp, env) {
    return applyOp(
      exp.operator,
      evaluate(exp.left, env),
      evaluate(exp.right, env)
    );
  },
  lambda(exp, env) {
    return makeLambda(env, exp);
  },
  prog(exp, env) {
    let val = false;
    exp.prog.forEach(function(exp) {
      val = evaluate(exp, env);
    });
    return val;
  },
  call(exp, env) {
    const func = evaluate(exp.func, env);
    return func.apply(
      null,
      exp.args.map(function(arg) {
        return evaluate(arg, env);
      })
    );
  },
  if: (exp, env) => {
    const cond = evaluate(exp.cond, env);
    if (cond !== false) {
      return evaluate(exp.then, env);
    }
    return exp.else ? evaluate(exp.else, env) : false;
  },
  forEach: (exp, env) => {
    const list = evaluate(exp.list, env);
    const feFunc = evaluate(exp.func, env);
    list.forEach(feFunc);
    return true;
  },
  var: (exp, env) => {
    return env.get(exp.value);
  }
};

function evaluate(exp, env) {
  if (evalOps[exp.type]) {
    return evalOps[exp.type](exp, env);
  }
  throw new Error("I don't know how to evaluate " + exp.type);
}

module.exports = evaluate;
