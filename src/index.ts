import * as acorn from "acorn";
import evaluate from "./evaluate.js";
import builtinFuncs from "./builtin-functions.js";
import type { FunctionMap } from "./builtin-functions.js";
import Environment, { Runtime } from "./environment.js";

function parse(code: string) {
  return acorn.parse(code, {
    ecmaVersion: "latest",
    sourceType: "script",
    locations: true,
  });
}

export interface RunnerOptions {
  functions?: FunctionMap;
  maxSteps?: number;
  /**
   * Maximum length (in UTF-16 code units) of the source string. The step
   * counter only bounds execution; parsing a multi-megabyte string still
   * consumes proportional CPU and memory inside acorn before the interpreter
   * runs. Set to 0 to disable. Defaults to 64 KiB.
   */
  maxCodeSize?: number;
  /**
   * Maximum length of any string or array value produced during a run, and
   * maximum key count of any object literal. String concatenation, array
   * spread, and object spread-accumulation can grow exponentially in a handful
   * of steps, well within the step budget. Set to 0 to disable. Defaults to
   * 1,000,000 (strings ≤ 1M UTF-16 units ≈ 2 MB; arrays ≤ 1M elements;
   * objects ≤ 1M keys).
   */
  maxAllocSize?: number;
  /**
   * Maximum wall-clock duration of a single run, in milliseconds. Checked
   * between interpreter steps — a single long native builtin call (e.g.
   * `sort` on a large array) can overshoot the deadline by up to its own
   * duration, but subsequent interpreter work is rejected. Set to 0 to
   * disable. Defaults to 0 (disabled); set to a positive value for hostile
   * multi-tenant workloads.
   */
  maxDurationMs?: number;
}

export interface RunResult {
  result: any;
  env: Record<string, any>;
}

const DEFAULT_MAX_STEPS = 100_000;
const DEFAULT_MAX_CODE_SIZE = 64 * 1024;
const DEFAULT_MAX_ALLOC_SIZE = 1_000_000;
const DEFAULT_MAX_DURATION_MS = 0;

export default function runner({
  functions = builtinFuncs,
  maxSteps = DEFAULT_MAX_STEPS,
  maxCodeSize = DEFAULT_MAX_CODE_SIZE,
  maxAllocSize = DEFAULT_MAX_ALLOC_SIZE,
  maxDurationMs = DEFAULT_MAX_DURATION_MS,
}: RunnerOptions = {}) {
  return (code: string, env: Record<string, any> = {}, debug?: boolean): RunResult => {
    if (maxCodeSize > 0 && code.length > maxCodeSize) {
      throw new Error(
        `Source exceeds maxCodeSize (${code.length} > ${maxCodeSize})`
      );
    }
    const ast = parse(code);
    debug && console.log(JSON.stringify(ast.body, null, 2));
    const globalEnv = new Environment(
      undefined,
      new Runtime(maxSteps, maxAllocSize, maxDurationMs)
    );
    Object.keys(env).forEach((key) => {
      globalEnv.def([key], env[key]);
    });
    const result = evaluate(ast, globalEnv, functions);
    return { result, env: globalEnv.vars };
  };
}

export { Environment, Runtime };
export type { FunctionMap };
