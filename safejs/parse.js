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

const PUNC = "punc";
const KW = "kw";
const OP = "op";

const FALSE = { type: "bool", value: false };

function isA(type, input, val) {
  var tok = input.peek();
  return tok && tok.type === type && (!val || tok.value === val) && tok;
}

function skipPunc(input, ch) {
  if (isA(PUNC, input, ch)) {
    input.next();
  } else {
    input.croak(`Expecting punctuation: "${ch}"`);
  }
}

function skipKw(input, kw) {
  if (isA(KW, input, kw)) {
    input.next();
  } else {
    input.croak(`Expecting keyword: "${kw}"`);
  }
}

// function skip_op(op) {
//   if (isA(OP, input, op)) {
//     input.next();
//   } else {
//     input.croak('Expecting operator: "' + op + '"');
//   }
// }

function unexpected(input) {
  input.croak(`Unexpected token: ${JSON.stringify(input.peek())}`);
}

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

function parseIf(input) {
  skipKw(input, "if");
  var cond = parseExpression(input);
  if (!isA(PUNC, input, "{")) {
    skipKw(input, "then");
  }
  var then = parseExpression(input);
  var ret = {
    type: "if",
    cond: cond,
    then: then
  };
  if (isA(KW, input, "else")) {
    input.next();
    ret.else = parseExpression(input);
  }
  return ret;
}

function isValidFunctionCall(input, functionName) {
  skipKw(input, functionName);
  if (!isA(PUNC, input, "(")) {
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
  var [list, prop] = delimited(input, "(", ")", ",", parseExpression);
  var ret = { type: "sum", list, prop };
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

function processAtom(input) {
  if (isA(PUNC, input, "(")) {
    input.next();
    var exp = parseExpression(input);
    skipPunc(input, ")");
    return exp;
  }
  if (isA(PUNC, input, "{")) {
    return parseProg(input);
  }
  if (isA(KW, input, "if")) {
    return parseIf(input);
  }
  if (isA(KW, input, "forEach")) {
    return parseForEach(input);
  }
  if (isA(KW, input, "push")) {
    return parsePush(input);
  }
  if (isA(KW, input, "sum")) {
    return parseSum(input);
  }
  if (isA(KW, input, "true") || isA(KW, input, "false")) {
    return parseBool(input);
  }
  if (isA(KW, input, "func")) {
    input.next();
    return parseFunc(input);
  }
  var tok = input.next();
  if (tok.type === "var" || tok.type === "num" || tok.type === "str") {
    return tok;
  }
  unexpected(input);
}

function maybeCall(input, expr) {
  expr = expr(input);
  return isA(PUNC, input, "(") ? parseCall(input, expr) : expr;
}

function parseAtom(input) {
  return maybeCall(input, processAtom);
}

function maybeBinary(input, left, myPrec) {
  var tok = isA(OP, input);
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

function parseExpression(input) {
  return maybeCall(input, () => maybeBinary(input, parseAtom(input), 0));
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
