import { describe, it, expect } from "vitest";
import runner from "../index.js";

const run = runner();

describe("builtin functions", () => {
  describe("date", () => {
    it("formats an iso8601 timestamp (+00:00 -> +00:00)", () => {
      const code = `formatDate("2017-08-14T11:08:19+00:00", "MMM D YYYY h:mma z")`;
      const { result } = run(code);
      expect(result).toEqual("Aug 14 2017 11:08am UTC");
    });

    it("formats an iso8601 timestamp (+10:00 -> +00:00)", () => {
      const code = `formatDate("2017-08-14T11:08:19+10:00", "MMM D YYYY h:mma z")`;
      const { result } = run(code);
      expect(result).toEqual("Aug 14 2017 1:08am UTC");
    });

    it("formats an iso8601 timestamp (+10:00 -> Australia/Brisbane)", () => {
      const code = `formatDate("2017-08-14T11:08:19+10:00", "MMM D YYYY h:mma z", "Australia/Brisbane")`;
      const { result } = run(code);
      expect(result).toMatch(/^Aug 14 2017 11:08am (AEST|GMT\+10)$/);
    });

    it("formats an iso8601 timestamp (+00:00 -> Australia/Brisbane)", () => {
      const code = `formatDate("2017-08-14T11:08:19+00:00", "MMM D YYYY h:mma z", "Australia/Brisbane")`;
      const { result } = run(code);
      expect(result).toMatch(/^Aug 14 2017 9:08pm (AEST|GMT\+10)$/);
    });

    it("formats a Unix timestamp (+00:00 -> +00:00)", () => {
      const code = `formatDate("1403454068850", "MMM D YYYY h:mma z")`;
      const { result } = run(code);
      expect(result).toEqual("Jun 22 2014 4:21pm UTC");
    });

    it("formats a Unix timestamp (+00:00 -> Australia/Brisbane)", () => {
      const code = `formatDate("1403454068850", "MMM D YYYY h:mma z", "Australia/Brisbane")`;
      const { result } = run(code);
      expect(result).toMatch(/^Jun 23 2014 2:21am (AEST|GMT\+10)$/);
    });
  });

  describe("func that wraps formatDate", () => {
    it("wraps formatDate", () => {
      const code = `
        Date = (date) => formatDate(date, "MMM D YYYY h:mma z", customer.tz);
        Date("2017-08-27T09:00:57.730+10:00");
      `;
      const { result } = run(code, { customer: { tz: "America/Los_Angeles" } });
      expect(result).toEqual("Aug 26 2017 4:00pm PDT");
    });
  });

  describe("additional format tokens", () => {
    it("24-hour format", () => {
      const code = `formatDate("2017-08-14T15:30:45+00:00", "HH:mm:ss", "UTC")`;
      const { result } = run(code);
      expect(result).toEqual("15:30:45");
    });

    it("full month name and padded day", () => {
      const code = `formatDate("2017-01-05T10:00:00+00:00", "MMMM DD, YYYY")`;
      const { result } = run(code);
      expect(result).toEqual("January 05, 2017");
    });

    it("2-digit year", () => {
      const code = `formatDate("2017-08-14T11:08:19+00:00", "MM/DD/YY")`;
      const { result } = run(code);
      expect(result).toEqual("08/14/17");
    });
  });
});
