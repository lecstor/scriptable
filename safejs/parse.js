const PRECEDENCE = {
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
};

const FALSE = { type: "bool", value: false };

function isPunc(input, ch) {
  var tok = input.peek();
  return tok && tok.type === "punc" && (!ch || tok.value === ch) && tok;
}

function isKw(input, kw) {
  var tok = input.peek();
  return tok && tok.type === "kw" && (!kw || tok.value === kw) && tok;
}

function isOp(input, op) {
  var tok = input.peek();
  return tok && tok.type === "op" && (!op || tok.value === op) && tok;
}

function skipPunc(input, ch) {
  if (isPunc(input, ch)) {
    input.next();
  } else {
    input.croak('Expecting punctuation: "' + ch + '"');
  }
}

function skipKw(input, kw) {
  if (isKw(input, kw)) {
    input.next();
  } else {
    input.croak('Expecting keyword: "' + kw + '"');
  }
}

// function skip_op(op) {
//   if (isOp(input, op)) {
//     input.next();
//   } else {
//     input.croak('Expecting operator: "' + op + '"');
//   }
// }

function unexpected(input) {
  input.croak("Unexpected token: " + JSON.stringify(input.peek()));
}

function maybeBinary(input, left, myPrec) {
  var tok = isOp(input);
  if (tok) {
    var hisPrec = PRECEDENCE[tok.value];
    if (hisPrec > myPrec) {
      input.next();
      return maybeBinary(
        input,
        {
          type: tok.value === "=" ? "assign" : "binary",
          operator: tok.value,
          left: left,
          right: maybeBinary(input, parseAtom(input), hisPrec)
        },
        myPrec
      );
    }
  }
  return left;
}

function delimited(input, start, stop, separator, parser) {
  let a = [];
  let first = true;
  skipPunc(input, start);
  while (!input.eof()) {
    if (isPunc(input, stop)) {
      break;
    }
    if (first) {
      first = false;
    } else {
      skipPunc(input, separator);
    }
    if (isPunc(input, stop)) {
      break;
    }
    a.push(parser(input));
  }
  skipPunc(input, stop);
  return a;
}

function parseIf(input) {
  skipKw(input, "if");
  var cond = parseExpression(input);
  if (!isPunc(input, "{")) {
    skipKw(input, "then");
  }
  var then = parseExpression(input);
  var ret = {
    type: "if",
    cond: cond,
    then: then
  };
  if (isKw(input, "else")) {
    input.next();
    ret.else = parseExpression(input);
  }
  return ret;
}

function isValidFunctionCall(input, functionName) {
  skipKw(input, functionName);
  if (!isPunc(input, "(")) {
    input.croak(`${functionName} is a reserved word (it's a function)`);
  }
}

function parseForEach(input) {
  isValidFunctionCall(input, "forEach");
  // forEach takes a list and function as args
  var [list, func] = delimited(input, "(", ")", ",", parseExpression);
  var ret = { type: "forEach", list, func };
  return ret;
}

function parsePush(input) {
  isValidFunctionCall(input, "push");
  // push takes a list and expression
  var [list, value] = delimited(input, "(", ")", ",", parseExpression);
  var ret = { type: "push", list, value };
  return ret;
}

function parseSum(input) {
  isValidFunctionCall(input, "sum");
  // sum takes a list
  var [list] = delimited(input, "(", ")", ",", parseExpression);
  var ret = { type: "sum", list };
  console.log({ ret });
  return ret;
}

function parseVarname(input) {
  var name = input.next();
  if (name.type !== "var") {
    input.croak("Expecting variable name");
  }
  return name.value;
}

function parseFunc(input) {
  return {
    type: "func",
    vars: delimited(input, "(", ")", ",", parseVarname),
    body: parseExpression(input)
  };
}

function parseBool(input) {
  return {
    type: "bool",
    value: input.next().value === "true"
  };
}

function parseCall(input, func) {
  return {
    type: "call",
    func: func,
    args: delimited(input, "(", ")", ",", parseExpression)
  };
}

function maybeCall(input, expr) {
  expr = expr();
  return isPunc(input, "(") ? parseCall(input, expr) : expr;
}

function parseAtom(input) {
  return maybeCall(input, function() {
    if (isPunc(input, "(")) {
      input.next();
      var exp = parseExpression(input);
      skipPunc(input, ")");
      return exp;
    }
    if (isPunc(input, "{")) {
      return parseProg(input);
    }
    if (isKw(input, "if")) {
      return parseIf(input);
    }
    if (isKw(input, "forEach")) {
      return parseForEach(input);
    }
    if (isKw(input, "push")) {
      return parsePush(input);
    }
    if (isKw(input, "sum")) {
      return parseSum(input);
    }
    if (isKw(input, "true") || isKw(input, "false")) {
      return parseBool(input);
    }
    if (isKw(input, "func")) {
      input.next();
      return parseFunc(input);
    }
    var tok = input.next();
    if (tok.type === "var" || tok.type === "num" || tok.type === "str") {
      return tok;
    }
    unexpected(input);
  });
}

function parseProg(input) {
  var prog = delimited(input, "{", "}", ";", parseExpression);
  if (prog.length === 0) {
    return FALSE;
  }
  if (prog.length === 1) {
    return prog[0];
  }
  return { type: "prog", prog: prog };
}

function parseExpression(input) {
  return maybeCall(input, function() {
    return maybeBinary(input, parseAtom(input), 0);
  });
}

function parse(input) {
  var prog = [];
  while (!input.eof()) {
    prog.push(parseExpression(input));
    if (!input.eof()) {
      skipPunc(input, ";");
    }
  }
  return { type: "prog", prog: prog };
}

module.exports = parse;
