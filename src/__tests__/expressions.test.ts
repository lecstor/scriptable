import { describe, it, expect } from "vitest";
import runner from "../index.js";

const run = runner();

describe("expressions", () => {
  it("6 + 3", () => {
    const code = `6 + 3`;
    const env = {};
    const { result } = run(code, env);
    expect(result).toEqual(9);
  });
});
