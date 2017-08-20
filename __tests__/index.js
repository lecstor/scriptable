const run = require("../");

describe("safejs", () => {
  it("runs", () => {
    const code = `
      mySum = func(x, y) x + y;
      result = mySum(21, 21);
      `;
    const props = {};
    const { result, env } = run(code, props);
    expect(result).toEqual(42);
    expect(env.result).toEqual(42);
    expect(env.mySum).toBeInstanceOf(Function);
  });

  it("runs func", () => {
    const code = `
      mySum = func(x, y) { x + y };
      result = mySum(21, 21);
      `;
    const props = {};
    const { result, env } = run(code, props);
    expect(result).toEqual(42);
    expect(env.result).toEqual(42);
    expect(env.mySum).toBeInstanceOf(Function);
  });

  it("runs func", () => {
    const code = `
      mySum = func(x, y) { x + y };
      result = mySum(21, 21);
      `;
    const props = {};
    const { result, env } = run(code, props);
    expect(result).toEqual(42);
    expect(env.result).toEqual(42);
    expect(env.mySum).toBeInstanceOf(Function);
  });

  it("has access to props", () => {
    const code = `prop2 = prop1;`;
    const props = { prop1: "hello" };
    const { result, env } = run(code, props);
    expect(result).toEqual("hello");
    expect(env.prop2).toEqual("hello");
  });

  it("has access to props", () => {
    const code = `if (prop1 == "hello") { prop2 = "goodbye" }`;
    const props = { prop1: "hello" };
    const { result, env } = run(code, props);
    expect(result).toEqual("goodbye");
    expect(env.prop2).toEqual("goodbye");
  });

  it("gets deep props", () => {
    const props = { prop1: { prop1b: "hello" } };
    const code = `prop2 = prop1.prop1b;`;
    const { result, env } = run(code, props);
    expect(result).toEqual("hello");
    expect(env.prop2).toEqual("hello");
  });

  it("sets deep props", () => {
    const props = { prop1: { prop1b: "hello" } };
    const code = `prop1.prop1b = "goodbye";`;
    const { result, env } = run(code, props);
    expect(result).toEqual("goodbye");
    expect(env.prop1.prop1b).toEqual("goodbye");
  });

  it("handles functions in props", () => {
    const props = { myFunc: () => true };
    const code = `func1 = myFunc()`;
    const { env } = run(code, props);
    expect(env.myFunc).toBeInstanceOf(Function);
    expect(env.func1).toBe(true);
  });

  it("forEach", () => {
    const props = { list: [1, 2, 3] };
    const code = `count = 0; forEach(list, func(num){ count = count + num;  })`;
    const { env } = run(code, props);
    expect(env.count).toBe(6);
  });

  it("nested forEach", () => {
    const props = { list: [[1, 2, 3], [4, 5, 6]] };
    const code = `
      count = 0;
      forEach(list, func(subList){
        forEach(subList, func(num){
          count = count + num;
        });
      })
    `;
    const { env } = run(code, props);
    expect(env.count).toBe(21);
  });

  it("push", () => {
    const props = { list: [1, 2, 3] };
    const code = `push(list, 4)`;
    const { env } = run(code, props);
    expect(env.list).toEqual([1, 2, 3, 4]);
  });

  it("sum - list of numbers", () => {
    const props = { list: [1, 2, 3] };
    const code = `sum(list);`;
    const { result } = run(code, props);
    expect(result).toEqual(6);
  });

  it("sum - prop from list of objects", () => {
    const props = { list: [{ qty: 1 }, { qty: 2 }, { qty: 3 }] };
    const code = `sum(list, "qty");`;
    const { result } = run(code, props);
    expect(result).toEqual(6);
  });
});
