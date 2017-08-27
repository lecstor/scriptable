const moment = require("moment-timezone");

const lodash = {
  array: require("lodash/array"),
  collection: require("lodash/collection"),
  math: require("lodash/math"),
  number: require("lodash/number"),
  object: require("lodash/object"),
  string: require("lodash/string")
};

function numberFormatter(args) {
  return new Intl.NumberFormat(...args).format;
}

const functions = {
  push(args) {
    const [target, item] = args;
    target.push(item);
  },

  shift(args) {
    const [target] = args;
    return target.shift();
  },

  currentDate(args) {
    const [tz] = args;
    return moment().tz(tz || "UTC");
  },

  formatDate(args) {
    const [dateString, format, timezone] = args;
    const date = moment.tz(
      /^\d+$/.test(dateString) ? +dateString : dateString,
      timezone
    );
    return date.format(format);
  },

  numberFormatter,

  formatDollars: numberFormatter([
    "en-us",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ])
};

// add lodash functions..
lodash.object.forIn(lodash, category => {
  lodash.object.forIn(category, (func, key) => {
    functions[key] = args => {
      return category[key](...args);
    };
  });
});

module.exports = functions;
