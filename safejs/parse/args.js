const { skipPunc } = require("./skip");
const { isA } = require("./is-a");
const { PUNC } = require("../constants");

function delimited(input, start, stop, separator, parser) {
  let a = [];
  let first = true;
  skipPunc(input, start);
  while (!input.eof()) {
    if (isA(PUNC, input, stop)) {
      break;
    }
    if (first) {
      first = false;
    } else {
      skipPunc(input, separator);
    }
    if (isA(PUNC, input, stop)) {
      break;
    }
    a.push(parser(input));
  }
  skipPunc(input, stop);
  return a;
}

module.exports = { delimited };
