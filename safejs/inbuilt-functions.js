module.exports = {
  forEach: ([list, fn]) => {
    list.forEach(fn);
    return true;
  },
  map: ([list, fn]) => list.map(fn),
  push: ([list, value]) => {
    return list.push(value);
  },
  sum: ([list, prop]) => {
    return list.reduce((total, item) => {
      total += prop ? item[prop] : item;
      return total;
    }, 0);
  },
  numberFormatter: args => {
    const [
      locale = "en-us",
      options = {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    ] = args;
    return new Intl.NumberFormat(locale, options).format;
  }
};
