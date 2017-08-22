const { skipKw, skipPunc } = require("./skip");
const { isA } = require("./is-a");

const { PRECEDENCE, PUNC, KW, OP, FALSE } = require("../constants");
const { delimited } = require("./args");

const keywordProcessors = {
  false: parseBool,
  func: parseFunc,
  if: parseIf,
  true: parseBool
};

// parse builtin functions into tokens with type and args
const functions = ["forEach", "push", "sum"];
functions.forEach(name => {
  keywordProcessors[name] = input => {
    isValidFunctionCall(input, name);
    const args = delimited(input, "(", ")", ",", parseExpression);
    return { type: name, args };
  };
});

// parse a function declaration
function parseFunc(input) {
  input.next();
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

// if is still a bit special (it's a statement, not an expression)
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

function parseVarname(input) {
  var name = input.next();
  if (name.type !== "var") {
    input.croak("Expecting variable name");
  }
  return name.value;
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
  let tok = input.peek();
  if (!tok) {
    return unexpected(input);
  }
  if (tok.type === PUNC) {
    if (tok.value === "(") {
      input.next();
      var exp = parseExpression(input);
      skipPunc(input, ")");
      return exp;
    }
    if (tok.value === "{") {
      return parseProg(input);
    }
  }
  if (tok.type === KW) {
    if (keywordProcessors[tok.value]) {
      return keywordProcessors[tok.value](input, {});
    }
  }
  tok = input.next();
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

function unexpected(input) {
  input.croak(`Unexpected token: ${JSON.stringify(input.peek())}`);
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
