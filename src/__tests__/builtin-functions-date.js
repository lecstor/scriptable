const runner = require("../");

const run = runner();

const DEBUG = true;

describe("builtin functions", () => {
  describe("date", () => {
    it("formats an iso8610 timestamp (+00:00 -> +00:00)", () => {
      const code = `formatDate("2017-08-14T11:08:19+00:00", "MMM D YYYY h:mma z")`;
      const { result } = run(code);
      expect(result).toEqual("Aug 14 2017 11:08am UTC");
    });

    it("formats an iso8610 timestamp (+10:00 -> +00:00)", () => {
      const code = `formatDate("2017-08-14T11:08:19+10:00", "MMM D YYYY h:mma z")`;
      const { result } = run(code);
      expect(result).toEqual("Aug 14 2017 1:08am UTC");
    });

    it("formats an iso8610 timestamp (+10:00 -> Australia/Brisbane)", () => {
      const code = `formatDate("2017-08-14T11:08:19+10:00", "MMM D YYYY h:mma z", "Australia/Brisbane")`;
      const { result } = run(code);
      expect(result).toEqual("Aug 14 2017 11:08am AEST");
    });

    it("formats an iso8610 timestamp (+00:00 -> Australia/Brisbane)", () => {
      const code = `formatDate("2017-08-14T11:08:19+00:00", "MMM D YYYY h:mma z", "Australia/Brisbane")`;
      const { result } = run(code);
      expect(result).toEqual("Aug 14 2017 9:08pm AEST");
    });

    it("formats a Unix timestamp (+00:00 -> +00:00)", () => {
      const code = `formatDate("1403454068850", "MMM D YYYY h:mma z")`;
      const { result } = run(code);
      expect(result).toEqual("Jun 22 2014 4:21pm UTC");
    });

    it("formats a Unix timestamp (+00:00 -> Australia/Brisbane)", () => {
      const code = `formatDate("1403454068850", "MMM D YYYY h:mma z", "Australia/Brisbane")`;
      const { result } = run(code);
      expect(result).toEqual("Jun 23 2014 2:21am AEST");
    });
  });

  describe("func that wraps formatDate", () => {
    it("wraps formatData", () => {
      const code = `
        Date = (date) => formatDate(date, "MMM D YYYY h:mma z", customer.tz);
        Date("2017-08-27T09:00:57.730+10:00");
      `;
      const { result } = run(code, { customer: { tz: "America/Los_Angeles" } });
      expect(result).toEqual("Aug 26 2017 4:00pm PDT");
    });
  });
});
