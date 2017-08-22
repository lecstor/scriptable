function InputStream(input) {
  let pos = 0;
  let line = 1;
  let col = 0;
  return {
    next() {
      var ch = input.charAt(pos++);
      if (ch === "\n") {
        line++;
        col = 0;
      } else {
        col++;
      }
      return ch;
    },

    peek() {
      return input.charAt(pos);
    },

    eof() {
      return this.peek() === "";
    },

    croak(msg) {
      throw new Error(`${msg} (${line}:${col})`);
    }
  };
}

module.exports = InputStream;
