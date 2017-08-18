const safejs = require("../");

describe("assignment", () => {
  it("assigns a string to a var", () => {
    const code = "value = 'hello';";
    const context = safejs.run(code);
    expect(context.value).toEqual("hello");
  });

  it("assigns a number to a var", () => {
    const code = "value = 12.5;";
    const context = safejs.run(code);
    expect(context.value).toEqual(12.5);
  });

  it.only("assigns a simple arrow function to a var", () => {
    const code = `
      ret = a => a;
      value = ret(2);
    `;
    const context = safejs.run(code);
    expect(context.value).toEqual(2);
  });

  it("assigns a number formatter to a var", () => {
    const code = `
      formatter = numberFormatter();
      value = formatter(12340);
    `;
    const context = safejs.run(code);
    expect(context.value).toEqual("12,340.00");
  });

  it("assigns an arrow function to a var", () => {
    const code = `
      formatter = numberFormatter();
      dollars = amount => formatter(amount);
      value = dollars(12340);
    `;
    const context = safejs.run(code);
    expect(context.value).toEqual("12,340.00");
  });
});

// const script = `
//   result = log(1980 / 100);
//   `;

// macro(longDate, date, formatDate(date, "MMM D YYYY h:mma z", tz));
// macro(itemTotal, item, *(item.price, item.quantity));

// forEach(invoice.items, set(it.total, itemTotal(it)));
// set(totals, pick(invoice.items, "total");
// set(total, +(totals))
// set(amountDue, dollars(total));

// console.log(babylon.parseExpression(code1));
// const parsed = babylon.parse(code1);
// const parsed = babylon.parse(call);
