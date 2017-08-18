function log(...args) {
  console.log(...args);
  return args;
}

function numberFormatter(
  locale = "en-us",
  options = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }
) {
  return new Intl.NumberFormat(locale, options).format;
}

module.exports = {
  log,
  numberFormatter
};
