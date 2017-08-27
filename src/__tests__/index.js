const runner = require("../");

const run = runner();

const DEBUG = true;

const code = `
  /**
   * @param {String} who say hello to
   */
  function hello (who) {
    return "hello " + who;
  }

  // arrow function
  arrow = (str) => { return str + " =>"; }

  list = ["me", "myself"];
  push(list, "I");

  greet1 = hello(who || "world");

  who = "Jason";
  greet2 = hello(who || "world");

  greet3 = arrow(hello(who || "world"));

  olsenTimezoneBrisbane = "Australia/Brisbane";
  olsenTimezoneLA = "America/Los_Angeles";

  dateNowUTC = currentDate();
  // Sat Aug 26 2017 22:56:08 GMT+0000

  dateNowBrisbane = currentDate(olsenTimezoneBrisbane);
  // Sun Aug 27 2017 08:56:08 GMT+1000

  dateNowLA = currentDate(olsenTimezoneLA);
  // Sat Aug 26 2017 19:52:35 GMT-0700

  nowFormattedUTC = formatDate(currentDate(), "MMM D YYYY h:mma z");
  // Aug 27 2017 2:56am UTC

  nowFormattedBrisbane = formatDate(currentDate(), "MMM D YYYY h:mma z", olsenTimezoneBrisbane);
  // Aug 27 2017 12:56pm AEST

  iso8601 = "2017-08-27T09:00:57.730+10:00";

  iso8601FormattedUTC = formatDate(iso8601, "MMM D YYYY h:mma z");
  // "Aug 26 2017 11:00pm UTC"

  iso8601FormattedLA = formatDate(iso8601, "MMM D YYYY h:mma z", olsenTimezoneLA);
  // "Aug 26 2017 4:00pm PDT"

  Date = (date) => formatDate(date, "MMM D YYYY h:mma z", olsenTimezoneLA);

  myDate = Date(iso8601);
  // "Aug 26 2017 4:00pm PDT"
  `;

describe("docca-script", () => {
  it("runs a script", () => {
    const env = {};
    run(code, env);

    expect(env.arrow).toBeInstanceOf(Function);
    expect(env.hello).toBeInstanceOf(Function);

    expect(env.list).toEqual(["me", "myself", "I"]);

    expect(env.greet1).toEqual("hello world");

    expect(env.greet2).toEqual("hello Jason");

    expect(env.greet3).toEqual("hello Jason =>");

    expect(/\+0000$/.test(`${env.dateNowUTC}`)).toBeTruthy();
    expect(/\+1000$/.test(`${env.dateNowBrisbane}`)).toBeTruthy();
    expect(/-0700$/.test(`${env.dateNowLA}`)).toBeTruthy();

    expect(env.iso8601FormattedUTC).toEqual("Aug 26 2017 11:00pm UTC");
    expect(env.iso8601FormattedLA).toEqual("Aug 26 2017 4:00pm PDT");
    expect(env.myDate).toEqual("Aug 26 2017 4:00pm PDT");
  });
});
