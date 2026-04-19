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
}

export interface RunResult {
  result: any;
  env: Record<string, any>;
}

const DEFAULT_MAX_STEPS = 100_000;

export default function runner({ functions = builtinFuncs, maxSteps = DEFAULT_MAX_STEPS }: RunnerOptions = {}) {
  return (code: string, env: Record<string, any> = {}, debug?: boolean): RunResult => {
    const ast = parse(code);
    debug && console.log(JSON.stringify(ast.body, null, 2));
    const globalEnv = new Environment(undefined, new Runtime(maxSteps));
    Object.keys(env).forEach((key) => {
      globalEnv.def(key, env[key]);
    });
    const result = evaluate(ast, globalEnv, functions);
    return { result, env: globalEnv.vars };
  };
}

export { Environment, Runtime };
export type { FunctionMap };
