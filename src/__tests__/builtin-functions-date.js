const runner = require("../");

const run = runner();

const DEBUG = true;

describe("builtin functions", () => {
  describe("date", () => {
    it("formats an iso8610 timestamp (+00:00 -> +00:00)", () => {
      const code = `formatDate("2017-08-14T11:08:19+00:00", "MMM D YYYY h:mma")`;
      const { result } = run(code);
      expect(result).toEqual("Aug 14 2017 11:08am");
    });

    it("formats an iso8610 timestamp (+10:00 -> +00:00)", () => {
      const code = `formatDate("2017-08-14T11:08:19+10:00", "MMM D YYYY h:mma")`;
      const { result } = run(code);
      expect(result).toEqual("Aug 14 2017 1:08am");
    });

    it("formats an iso8610 timestamp (+10:00 -> Australia/Brisbane)", () => {
      const code = `formatDate("2017-08-14T11:08:19+10:00", "MMM D YYYY h:mma z", "Australia/Brisbane")`;
      const { result } = run(code);
      expect(result).toEqual("Aug 14 2017 11:08am AEST");
    });

    it("formats an iso8610 timestamp (+00:00 -> Australia/Brisbane)", () => {
      const code = `formatDate("2017-08-14T11:08:19+00:00", "MMM D YYYY h:mma", "Australia/Brisbane")`;
      const { result } = run(code);
      expect(result).toEqual("Aug 14 2017 9:08pm");
    });

    it("formats a Unix timestamp (+00:00 -> +00:00)", () => {
      const code = `formatDate("1403454068850", "MMM D YYYY h:mma")`;
      const { result } = run(code);
      expect(result).toEqual("Jun 22 2014 4:21pm");
    });

    it("formats a Unix timestamp (+00:00 -> Australia/Brisbane)", () => {
      const code = `formatDate("1403454068850", "MMM D YYYY h:mma", "Australia/Brisbane")`;
      const { result } = run(code);
      expect(result).toEqual("Jun 23 2014 2:21am");
    });
  });
});
