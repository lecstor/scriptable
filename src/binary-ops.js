const binaryOps = {
  "+": (l, r) => l + r,
  "-": (l, r) => l - r,
  "*": (l, r) => l * r,
  "/": (l, r) => l / r,

  ">": (l, r) => l > r,
  "<": (l, r) => l < r,
  "==": (l, r) => l === r,
  "!=": (l, r) => l !== r
};

module.exports = binaryOps;
