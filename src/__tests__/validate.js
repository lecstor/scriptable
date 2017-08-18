const safejs = require("../validate");

describe("assignment", () => {
  it("assign a string", () => {
    const code = "value = 'hello';";
    const result = safejs.validate(code);
    expect(result).toBeTruthy();
  });

  it("assign a number", () => {
    const code = "value = 12.5;";
    const result = safejs.validate(code);
    expect(result).toBeTruthy();
  });

  it("assign an arrow function", () => {
    const code = `
      ret = a => a;
      value = ret(2);
    `;
    const result = safejs.validate(code);
    expect(result).toBeTruthy();
  });

  it("assigns a number formatter to a var", () => {
    const code = `
      formatter = numberFormatter();
      value = formatter(12340);
    `;
    const result = safejs.validate(code);
    expect(result).toBeTruthy();
  });

  it("assigns an arrow function to a var", () => {
    const code = `
      formatter = numberFormatter();
      dollars = amount => formatter(amount);
      value = dollars(12340);
    `;
    const result = safejs.validate(code);
    expect(result).toBeTruthy();
  });
});

describe("math", () => {
  it("does math", () => {
    const code = "value = 1 + 3 * 2 / 4 - 2;";
    const result = safejs.validate(code);
    expect(result).toBeTruthy();
  });
});

describe("property functions", () => {
  it("forEach", () => {
    const code = "[1, 2, 3].forEach(num => { total += num });";
    const result = safejs.validate(code);
    expect(result).toBeTruthy();
  });

  it("push", () => {
    const code = "[1, 2, 3].push(4);";
    const result = safejs.validate(code);
    expect(result).toBeTruthy();
  });
});

describe("forbidden", () => {
  it("require", () => {
    const code = "require('some-bad-module')";
    expect(() => safejs.validate(code)).toThrow(
      new Error(`Function not permitted: require`)
    );
  });

  it("readFile", () => {
    const code = `fs.readFile("/etc/passwd", () => {})`;
    expect(() => safejs.validate(code)).toThrow(
      new Error(`Property Function not permitted: readFile`)
    );
  });

  it("process.exit", () => {
    const code = `process.exit()`;
    expect(() => safejs.validate(code)).toThrow(
      new Error(`Property Function not permitted: exit`)
    );
  });

  it("this", () => {
    const code = `this.process`;
    expect(() => safejs.validate(code)).toThrow(
      new Error(`Type not permitted: ThisExpression`)
    );
  });

  it.only("array property constructor", () => {
    const code = `[].map['con' + 'structor']()`;
    expect(() => safejs.validate(code)).toThrow(
      new Error(`Property Function not permitted: inspect`)
    );
  });

  // https://github.com/gf3/sandbox/issues/50
  it("object constructor", () => {
    const code = `new Function("return (this.constructor.constructor('return (this.process.mainModule.constructor._load)')())")()("util").inspect("hi")`;
    expect(() => safejs.validate(code)).toThrow(
      new Error(`Property Function not permitted: inspect`)
    );
  });
  it("object constructor 2", () => {
    const code = `new Function("return (this.constructor.constructor('return (this.process.mainModule.constructor._load)')())")()("util")`;
    expect(() => safejs.validate(code)).toThrow(
      new Error(`Callee Type not permitted: CallExpression`)
    );
  });
  it("object constructor 3", () => {
    const code = `new Function("return (this.constructor.constructor('return (this.process.mainModule.constructor._load)')())")()`;
    expect(() => safejs.validate(code)).toThrow(
      new Error(`Callee Type not permitted: NewExpression`)
    );
  });
  it("object constructor 4", () => {
    const code = `new Function("return (this.constructor.constructor('return (this.process.mainModule.constructor._load)')())")`;
    expect(() => safejs.validate(code)).toThrow(
      new Error(`Type not permitted: NewExpression`)
    );
  });
  it("object constructor 5", () => {
    const code = `this.constructor.constructor('return (this.process.mainModule.constructor._load)')()`;
    expect(() => safejs.validate(code)).toThrow(
      new Error(`Callee Type not permitted: CallExpression`)
    );
  });
  it("object constructor 6", () => {
    const code = `this.constructor.constructor('return (this.process.mainModule.constructor._load)')()`;
    expect(() => safejs.validate(code)).toThrow(
      new Error(`Callee Type not permitted: CallExpression`)
    );
  });
});
