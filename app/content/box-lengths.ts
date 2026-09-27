const LENGTH = /^-?(?:0|\d+(?:\.\d+)?(?:px|em|rem|%|ch|vw|vh)?)$/;

export function validBoxLengths(value: unknown, allowNegative = false): boolean {
  if (value === undefined) return true;
  if (typeof value !== "string") return false;
  const parts = value.trim().split(/\s+/);
  return parts.length >= 1 && parts.length <= 4
    && parts.every(part => LENGTH.test(part) && (allowNegative || !part.startsWith("-")));
}

export function expandBoxLengths(value?: string): [string, string, string, string] {
  const parts = value?.trim().split(/\s+/) ?? [];
  const [top = "0", right = top, bottom = top, left = right] = parts;
  return [top, right, bottom, left];
}

export function compactBoxLengths([top, right, bottom, left]: readonly string[]): string {
  if (top === right && top === bottom && top === left) return top;
  if (top === bottom && right === left) return `${top} ${right}`;
  if (right === left) return `${top} ${right} ${bottom}`;
  return `${top} ${right} ${bottom} ${left}`;
}
