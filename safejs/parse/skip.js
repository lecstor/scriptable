const { isA } = require("./is-a");
const { PUNC, KW } = require("../constants");

function skipKw(input, kw) {
  if (isA(KW, input, kw)) {
    input.next();
  } else {
    input.croak(`Expecting keyword: "${kw}"`);
  }
}

function skipPunc(input, ch) {
  if (isA(PUNC, input, ch)) {
    input.next();
  } else {
    input.croak(`Expecting punctuation: "${ch}"`);
  }
}

module.exports = { skipKw, skipPunc };
