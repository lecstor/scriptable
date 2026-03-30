import { describe, it, expect } from "vitest";
import runner from "../index.js";

const run = runner();

describe("function", () => {
  it("defines a function", () => {
    const code = `
      function foo(bar){ return bar + 3; }
      baz = foo(7);
      `;
    const vars = {};
    const { env } = run(code, vars);
    expect(env.foo).toBeDefined();
    expect(env.baz).toEqual(10);
  });

  it("defines an arrow function", () => {
    const code = `
      foo = (bar) => { return bar + 3; }
      baz = foo(7);
      `;
    const vars = {};
    const { env } = run(code, vars);
    expect(env.foo).toBeDefined();
    expect(env.baz).toEqual(10);
  });

  it("has access to env", () => {
    const code = `
      greet = (name) => "hello " + name;
      greet(customer.name);
      `;
    const { result } = run(code, { customer: { name: "Jason" } });
    expect(result).toEqual("hello Jason");
  });

  it("can call a builtin with a function as arg", () => {
    const code = `
      nprices = map(prices, (price) => { price });
    `;
    const vars = { prices: [11, 22, 33] };
    const { env } = run(code, vars);
    expect(env).toEqual({
      prices: [11, 22, 33],
      nprices: [11, 22, 33],
    });
  });

  it("can call a builtin with a function as arg", () => {
    const code = `
      addTax = (price) => { return price + price / 10 };
      incTax = map(prices, (price) => { return addTax(price) });
      incTax2 = map(prices, (price) => addTax(price));
      incTax3 = map(prices, addTax);
      `;
    const vars = { prices: [10, 20, 30] };
    const { env } = run(code, vars);
    expect(env.incTax).toEqual([11, 22, 33]);
    expect(env.incTax2).toEqual([11, 22, 33]);
    expect(env.incTax3).toEqual([11, 22, 33]);
  });

  it("can use an array as a function arg", () => {
    const code = `
      getLength = (list) => list.length;
      getLength([1, 2, 3]);
      `;
    const { result } = run(code, {});
    expect(result).toEqual(3);
  });

  it("can use an object as a function arg", () => {
    const code = `
      getLength = (obj) => keys(obj).length;
      getLength({ one: 1, two: 2, three: 3 });
      `;
    const { result } = run(code, {});
    expect(result).toEqual(3);
  });
});
