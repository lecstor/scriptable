function isA(type, input, val) {
  var tok = input.peek();
  return tok && tok.type === type && (!val || tok.value === val) && tok;
}

module.exports = { isA };
