// Properties that could be used for prototype-chain traversal or pollution.
// Defense-in-depth: also checked in evaluate.ts MemberExpression.
const BLOCKED_PROPS = new Set([
  "constructor",
  "__proto__",
  "prototype",
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__",
]);

function assertSafeParts(parts: string[]): void {
  for (const part of parts) {
    if (BLOCKED_PROPS.has(part)) {
      throw new Error(`Access to property '${part}' is not allowed`);
    }
  }
}

// First segment walks the scope chain (env.vars is Object.create(parent.vars))
// so `obj.method()` still resolves when `obj` lives in an enclosing scope.
// Subsequent segments use hasOwn to prevent user-land objects from leaking
// Object.prototype members through the lookup (e.g. `obj.toString`).
function deepHas(obj: any, parts: string[]): boolean {
  assertSafeParts(parts);
  if (parts.length === 0) return false;
  if (!(parts[0] in obj)) return false;
  let current = obj[parts[0]];
  for (let i = 1; i < parts.length; i++) {
    if (current == null || typeof current !== "object") return false;
    if (!Object.prototype.hasOwnProperty.call(current, parts[i])) return false;
    current = current[parts[i]];
  }
  return true;
}

function deepGet(obj: any, parts: string[]): any {
  assertSafeParts(parts);
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function deepSet(obj: any, parts: string[], value: any): void {
  assertSafeParts(parts);
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] == null || typeof current[parts[i]] !== "object") {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

export interface Loc {
  line: number;
  column: number;
}

// Per-run execution state. Shared across every scope in a single interpreter
// run via Environment.runtime. Replaces the previous module-global counter,
// so concurrent or re-entrant runs can't clobber each other's budgets.
export class Runtime {
  steps: number = 0;
  maxSteps: number;
  maxAllocSize: number;
  // Absolute deadline in ms (Date.now()). 0 means "no deadline".
  deadline: number;

  constructor(
    maxSteps: number = 0,
    maxAllocSize: number = 0,
    maxDurationMs: number = 0
  ) {
    this.maxSteps = maxSteps;
    this.maxAllocSize = maxAllocSize;
    this.deadline = maxDurationMs > 0 ? Date.now() + maxDurationMs : 0;
  }

  step(): void {
    // Wall-clock deadline guards against hostile workloads where a single
    // native builtin call (e.g. sort on a 1M-element array) burns CPU without
    // advancing the step counter. Checked between interpreter steps — a single
    // long native call can overshoot the deadline by up to that call's
    // duration, but subsequent work is rejected.
    if (this.deadline && Date.now() > this.deadline) {
      throw new Error("Execution time exceeded");
    }
    if (this.maxSteps === 0) return;
    if (++this.steps > this.maxSteps) {
      throw new Error("Execution limit exceeded");
    }
  }

  // String doubling and array spread/concat can grow exponentially in a handful
  // of steps — 26 string doublings reach V8's ~512 MiB string-length ceiling in
  // under a dozen statements. Check the size of every value produced by a
  // handler so one run can't allocate unbounded memory.
  checkSize(value: unknown): void {
    if (this.maxAllocSize === 0) return;
    if (typeof value === "string") {
      if (value.length > this.maxAllocSize) {
        throw new Error(
          `String length ${value.length} exceeds maxAllocSize (${this.maxAllocSize})`
        );
      }
    } else if (Array.isArray(value)) {
      if (value.length > this.maxAllocSize) {
        throw new Error(
          `Array length ${value.length} exceeds maxAllocSize (${this.maxAllocSize})`
        );
      }
    }
  }

  // Caller-projected length — used before growing an array via spread, so we
  // reject the growth rather than wait for V8's per-call argument stack limit
  // (which fires at ~65K args on push(...spread), a much lower ceiling than
  // maxAllocSize is designed to enforce).
  checkLength(projected: number): void {
    if (this.maxAllocSize === 0) return;
    if (projected > this.maxAllocSize) {
      throw new Error(
        `Length ${projected} exceeds maxAllocSize (${this.maxAllocSize})`
      );
    }
  }
}

export default class Environment {
  vars: Record<string, any>;
  parent: Environment | null;
  runtime: Runtime;

  constructor(parent?: Environment, runtime?: Runtime) {
    this.vars = Object.create(parent ? parent.vars : null);
    this.parent = parent || null;
    this.runtime = parent ? parent.runtime : runtime ?? new Runtime();
  }

  extend(): Environment {
    return new Environment(this);
  }

  getGlobalScope(): Environment {
    let scope: Environment = this;
    while (scope.parent) {
      scope = scope.parent;
    }
    return scope;
  }

  lookup(name: string): Environment {
    let scope: Environment = this;
    while (scope.parent) {
      if (Object.prototype.hasOwnProperty.call(scope.vars, name)) {
        return scope;
      }
      scope = scope.parent;
    }
    return scope;
  }

  defined(path: string[]): boolean {
    return deepHas(this.vars, path);
  }

  get(path: string[], loc: Loc): any {
    if (deepHas(this.vars, path)) {
      return deepGet(this.vars, path);
    }
    throw new ReferenceError(
      `"${path.join(".")}" is not defined (${loc.line}:${loc.column})`
    );
  }

  set(path: string[], value: any, loc: Loc): any {
    const scope = this.lookup(path[0]);
    deepSet(scope.vars, path, value);
    return value;
  }

  def(path: string[], value: any): any {
    deepSet(this.vars, path, value);
    return value;
  }
}
