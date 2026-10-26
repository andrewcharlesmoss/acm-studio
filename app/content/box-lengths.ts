const LENGTH = /^-?(?:0|\d+(?:\.\d+)?(?:px|em|rem|%|ch|vw|vh)?)$/;

/** Keep finite JS measurements in the decimal syntax accepted by saved CSS lengths. */
export function cssDecimal(amount: number): string {
  if (!Number.isFinite(amount)) throw new Error('CSS measurements must be finite.');
  const value = String(amount);
  const match = value.match(/^(-?)(\d+)(?:\.(\d+))?e([+-]?\d+)$/);
  if (!match) return value;
  const [, sign, whole, fraction = '', exponent] = match;
  const digits = whole + fraction;
  const point = whole.length + Number(exponent);
  return sign + (point <= 0 ? `0.${'0'.repeat(-point)}${digits}` : point >= digits.length ? digits + '0'.repeat(point - digits.length) : `${digits.slice(0, point)}.${digits.slice(point)}`);
}

export function validBoxLengths(value: unknown, allowNegative = false): boolean {
  if (value === undefined) return true;
  if (typeof value !== "string") return false;
  const parts = value.trim().split(/\s+/);
  return parts.length >= 1 && parts.length <= 4
    && parts.every(part => LENGTH.test(part) && (allowNegative || !part.startsWith("-")));
}

export function expandBoxLengths(value?: string): [string, string, string, string] {
  // Reference previews may contain calc()/clamp(); whitespace inside a function
  // belongs to its length, never to another side. Validation remains separate.
  const parts: string[] = [];
  let depth = 0, token = '';
  for (const character of value?.trim() ?? '') {
    if (/\s/.test(character) && depth === 0) { if (token) parts.push(token); token = ''; }
    else { token += character; if (character === '(') depth++; if (character === ')') depth = Math.max(0, depth - 1); }
  }
  if (token) parts.push(token);
  const [top = "0", right = top, bottom = top, left = right] = parts;
  return [top, right, bottom, left];
}

export function compactBoxLengths([top, right, bottom, left]: readonly string[]): string {
  if (top === right && top === bottom && top === left) return top;
  if (top === bottom && right === left) return `${top} ${right}`;
  if (right === left) return `${top} ${right} ${bottom}`;
  return `${top} ${right} ${bottom} ${left}`;
}
