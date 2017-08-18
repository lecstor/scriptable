const keywords = " if then else lambda true false ";

function isKeyword(x) {
  return keywords.indexOf(" " + x + " ") >= 0;
}

function isDigit(ch) {
  return /[0-9]/i.test(ch);
}

function isIdStart(ch) {
  return /[a-zÎ»_]/i.test(ch);
}

function isId(ch) {
  return isIdStart(ch) || "?!-<>=0123456789".indexOf(ch) >= 0;
}

function isOpChar(ch) {
  return "+-*/%=&|<>!".indexOf(ch) >= 0;
}

function isPunc(ch) {
  return ",;(){}[]".indexOf(ch) >= 0;
}

function isWhitespace(ch) {
  return " \t\n".indexOf(ch) >= 0;
}

function readWhile(input, predicate) {
  var str = "";
  while (!input.eof() && predicate(input.peek())) {
    str += input.next();
  }
  return str;
}

function readNumber(input) {
  var hasDot = false;
  var number = readWhile(input, ch => {
    if (ch === ".") {
      if (hasDot) {
        return false;
      }
      hasDot = true;
      return true;
    }
    return isDigit(ch);
  });
  return { type: "num", value: parseFloat(number) };
}

function readIdent(input) {
  var id = readWhile(input, isId);
  return {
    type: isKeyword(id) ? "kw" : "var",
    value: id
  };
}

function readEscaped(input, end) {
  let escaped = false;
  let str = "";
  input.next();
  while (!input.eof()) {
    var ch = input.next();
    if (escaped) {
      str += ch;
      escaped = false;
    } else if (ch === "\\") {
      escaped = true;
    } else if (ch === end) {
      break;
    } else {
      str += ch;
    }
  }
  return str;
}

function readString(input) {
  return { type: "str", value: readEscaped(input, '"') };
}

function skipComment(input) {
  readWhile(input, ch => ch !== "\n");
  input.next();
}

function readNext(input) {
  readWhile(input, isWhitespace);
  if (input.eof()) {
    return null;
  }
  var ch = input.peek();
  if (ch === "#") {
    skipComment(input);
    return readNext(input);
  }
  if (ch === '"') {
    return readString(input);
  }
  if (isDigit(ch)) {
    return readNumber(input);
  }
  if (isIdStart(ch)) {
    return readIdent(input);
  }
  if (isPunc(ch)) {
    return {
      type: "punc",
      value: input.next()
    };
  }
  if (isOpChar(ch)) {
    return {
      type: "op",
      value: readWhile(input, isOpChar)
    };
  }
  input.croak("Can't handle character: " + ch);
}

function TokenStream(input) {
  var current = null;
  return {
    peek() {
      return current || (current = readNext(input));
    },
    next() {
      var tok = current;
      current = null;
      return tok || readNext(input);
    },
    eof() {
      return this.peek() === null;
    },
    croak: input.croak
  };
}

module.exports = TokenStream;
