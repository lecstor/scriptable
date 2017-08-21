const KEYWORDS = `
if then else func true false
forEach push sum
`;
const DIGITS = "01234567890";
const ALPHA = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const OP_CHAR = ".+-*/%=&|<>!";
const PUNC = ",;(){}[]";

function makeLookup(str, sep) {
  const lookup = {};
  str.split(sep).forEach(key => {
    lookup[key] = true;
  });
  return lookup;
}

const lookupKeyword = makeLookup(KEYWORDS, /\s/);
const lookupDigits = makeLookup(DIGITS, "");
const lookupIdStart = makeLookup(ALPHA, "");
const lookupOpChar = makeLookup(OP_CHAR, "");
const lookupPunc = makeLookup(PUNC, "");
const lookupWs = {
  " ": true,
  "\n": true,
  "\t": true
};

function isId(ch) {
  return ch === "." || lookupIdStart[ch] || lookupDigits[ch];
}

function isOpChar(ch) {
  return lookupOpChar[ch];
}

function isWhitespace(ch) {
  return lookupWs[ch];
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
    return lookupDigits[ch];
  });
  return { type: "num", value: parseFloat(number) };
}

function readIdent(input) {
  var id = readWhile(input, isId);
  return {
    type: lookupKeyword[id] ? "kw" : "var",
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
  if (lookupDigits[ch]) {
    return readNumber(input);
  }
  if (lookupIdStart[ch]) {
    return readIdent(input);
  }
  if (lookupPunc[ch]) {
    return {
      type: "punc",
      value: input.next()
    };
  }
  if (lookupOpChar[ch]) {
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
