module.exports = {
  PUNC: "punc",
  KW: "kw",
  OP: "op",
  FALSE: { type: "bool", value: false },
  PRECEDENCE: {
    "=": 1,
    "||": 2,
    "&&": 3,
    "<": 7,
    ">": 7,
    "<=": 7,
    ">=": 7,
    "==": 7,
    "!=": 7,
    "+": 10,
    "-": 10,
    "*": 20,
    "/": 20,
    "%": 20
  }
};
