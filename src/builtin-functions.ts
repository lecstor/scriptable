export type FunctionMap = Record<string, (...args: any[]) => any>;

// ---------------------------------------------------------------------------
// Date helpers (Intl-based, no moment dependency)
// ---------------------------------------------------------------------------

function getDateParts(date: Date, tz: string) {
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts });

  const year = parseInt(fmt({ year: "numeric" }).format(date));
  const month = parseInt(fmt({ month: "numeric" }).format(date));
  const day = parseInt(fmt({ day: "numeric" }).format(date));

  const h24Parts = fmt({
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);

  const part = (type: string) =>
    h24Parts.find((p) => p.type === type)?.value || "0";
  const hour24 = parseInt(part("hour"));
  const minute = parseInt(part("minute"));
  const second = parseInt(part("second"));

  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? "pm" : "am";

  const monthShort = fmt({ month: "short" }).format(date);
  const monthLong = fmt({ month: "long" }).format(date);

  const tzAbbr =
    fmt({ timeZoneName: "short" })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value || "";

  return {
    year, month, day,
    hour12, hour24, minute, second,
    ampm, monthShort, monthLong, tzAbbr,
  };
}

const FORMAT_TOKENS =
  /YYYY|YY|MMMM|MMM|MM|M|DD|D|HH|H|hh|h|mm|m|ss|s|a|A|z/g;

function applyFormat(parts: ReturnType<typeof getDateParts>, format: string) {
  return format.replace(FORMAT_TOKENS, (token) => {
    switch (token) {
      case "YYYY": return String(parts.year);
      case "YY":   return String(parts.year).slice(-2);
      case "MMMM": return parts.monthLong;
      case "MMM":  return parts.monthShort;
      case "MM":   return String(parts.month).padStart(2, "0");
      case "M":    return String(parts.month);
      case "DD":   return String(parts.day).padStart(2, "0");
      case "D":    return String(parts.day);
      case "HH":   return String(parts.hour24).padStart(2, "0");
      case "H":    return String(parts.hour24);
      case "hh":   return String(parts.hour12).padStart(2, "0");
      case "h":    return String(parts.hour12);
      case "mm":   return String(parts.minute).padStart(2, "0");
      case "m":    return String(parts.minute);
      case "ss":   return String(parts.second).padStart(2, "0");
      case "s":    return String(parts.second);
      case "a":    return parts.ampm;
      case "A":    return parts.ampm.toUpperCase();
      case "z":    return parts.tzAbbr;
      default:     return token;
    }
  });
}

// ---------------------------------------------------------------------------
// Number helpers
// ---------------------------------------------------------------------------

function numberFormatter(...args: any[]) {
  return new Intl.NumberFormat(...args).format;
}

const functions: FunctionMap = {
  push(...args: any[]) {
    const [target, item] = args;
    target.push(item);
  },

  shift(...args: any[]) {
    const [target] = args;
    return target.shift();
  },

  currentDate(tz?: string) {
    return new Date();
  },

  formatDate(dateString: string, format: string, timezone?: string) {
    const date = /^\d+$/.test(dateString)
      ? new Date(+dateString)
      : new Date(dateString);
    const tz = timezone || "UTC";
    return applyFormat(getDateParts(date, tz), format);
  },

  numberFormatter,

  formatDollars: numberFormatter("en-us", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),

  // Array/collection operations (replaces lodash)
  map(arr: any[], fn: (...args: any[]) => any) {
    return arr.map(fn);
  },
  filter(arr: any[], fn: (...args: any[]) => any) {
    return arr.filter(fn);
  },
  find(arr: any[], fn: (...args: any[]) => any) {
    return arr.find(fn);
  },
  forEach(arr: any[], fn: (...args: any[]) => any) {
    arr.forEach(fn);
  },
  reduce(arr: any[], fn: (...args: any[]) => any, initial?: any) {
    return initial !== undefined ? arr.reduce(fn, initial) : arr.reduce(fn);
  },
  concat(arr: any[], ...items: any[]) {
    return arr.concat(...items);
  },
  keys(obj: any) {
    return Object.keys(obj);
  },
  values(obj: any) {
    return Object.values(obj);
  },
  entries(obj: any) {
    return Object.entries(obj);
  },
  assign(...args: any[]) {
    return Object.assign({}, ...args);
  },
  join(arr: any[], sep: string) {
    return arr.join(sep);
  },
  includes(arr: any[], item: any) {
    return arr.includes(item);
  },
  slice(arr: any[], start?: number, end?: number) {
    return arr.slice(start, end);
  },
  sort(arr: any[], fn?: (...args: any[]) => any) {
    return [...arr].sort(fn);
  },
  reverse(arr: any[]) {
    return [...arr].reverse();
  },
  flat(arr: any[], depth?: number) {
    return arr.flat(depth);
  },
  flatMap(arr: any[], fn: (...args: any[]) => any) {
    return arr.flatMap(fn);
  },
  some(arr: any[], fn: (...args: any[]) => any) {
    return arr.some(fn);
  },
  every(arr: any[], fn: (...args: any[]) => any) {
    return arr.every(fn);
  },
  indexOf(arr: any[], item: any) {
    return arr.indexOf(item);
  },
};

export default functions;
