const binaryOps: Record<string, (l: unknown, r: unknown) => unknown> = {
  "+": (l: any, r: any) => l + r,
  "-": (l: any, r: any) => l - r,
  "*": (l: any, r: any) => l * r,
  "/": (l: any, r: any) => l / r,
  "%": (l: any, r: any) => l % r,

  ">": (l: any, r: any) => l > r,
  "<": (l: any, r: any) => l < r,
  ">=": (l: any, r: any) => l >= r,
  "<=": (l: any, r: any) => l <= r,
  "==": (l: any, r: any) => l === r,
  "!=": (l: any, r: any) => l !== r,
  "===": (l: any, r: any) => l === r,
  "!==": (l: any, r: any) => l !== r,
};

export default binaryOps;
