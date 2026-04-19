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

function deepHas(obj: any, path: string): boolean {
  const parts = path.split(".");
  assertSafeParts(parts);
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return false;
    if (!Object.prototype.hasOwnProperty.call(current, part)) return false;
    current = current[part];
  }
  return true;
}

function deepGet(obj: any, path: string): any {
  const parts = path.split(".");
  assertSafeParts(parts);
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function deepSet(obj: any, path: string, value: any): void {
  const parts = path.split(".");
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

  constructor(maxSteps: number = 0) {
    this.maxSteps = maxSteps;
  }

  step(): void {
    if (this.maxSteps === 0) return;
    if (++this.steps > this.maxSteps) {
      throw new Error("Execution limit exceeded");
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

  defined(name: string): boolean {
    if (name in this.vars) {
      return true;
    }
    if (deepHas(this.vars, name)) {
      return true;
    }
    return false;
  }

  get(name: string, loc: Loc): any {
    if (name in this.vars) {
      return this.vars[name];
    }
    if (deepHas(this.vars, name)) {
      return deepGet(this.vars, name);
    }
    throw new ReferenceError(
      `"${name}" is not defined (${loc.line}:${loc.column})`
    );
  }

  set(name: string, value: any, loc: Loc): any {
    const baseName = name.replace(/\..*/, "");
    const scope = this.lookup(baseName);
    if (!scope && this.parent) {
      throw new ReferenceError(
        `"${name}" is not defined (${loc.line}:${loc.column})`
      );
    }
    deepSet((scope || this).vars, name, value);
    return value;
  }

  def(name: string, value: any): any {
    deepSet(this.vars, name, value);
    return value;
  }
}
