var lodash = require("lodash");

function numberFormatter(args) {
  return new Intl.NumberFormat(...args).format;
}

module.exports = {
  push(args) {
    const [target, item] = args;
    target.push(item);
  },
  shift(args) {
    const [target] = args;
    return target.shift();
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

// add all of lodash..
lodash.forOwn(lodash, (value, key) => {
  module.exports[`_${key}`] = args => {
    return lodash[key](...args);
  };
});
