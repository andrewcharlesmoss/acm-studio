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

/** Identify the per-side format at versioned content boundaries. */
export function containsBoxSideOverrides(value: unknown): boolean {
  const pending: unknown[] = [value];
  const visited = new Set<object>();
  while (pending.length) {
    const current = pending.pop();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    if (!Array.isArray(current)) {
      const record = current as Record<string, unknown>;
      if ((Object.hasOwn(record, "paddingSides") || Object.hasOwn(record, "marginSides") || Object.hasOwn(record, "borderWidthSides") || Object.hasOwn(record, "borderRadiusCorners")) || Array.isArray(record.path) && (record.path.includes("paddingSides") || record.path.includes("marginSides") || record.path.includes("borderWidthSides") || record.path.includes("borderRadiusCorners"))) return true;
    }
    for (const child of Array.isArray(current) ? current : Object.values(current)) if (child && typeof child === "object" && !visited.has(child)) pending.push(child);
  }
  return false;
}

/** Change only the selected sides; an existing shorthand owns all four. */
export function updatePaddingSides<T extends { padding?: string; paddingSides?: Partial<Record<"top" | "right" | "bottom" | "left", string>> }>(style: T, indices: readonly number[], value: string | undefined): T {
  const sides = ["top", "right", "bottom", "left"] as const;
  const next = { ...style };
  const overrides: Partial<Record<typeof sides[number], string>> = style.padding !== undefined
    ? { ...Object.fromEntries(expandBoxLengths(style.padding).map((part, index) => [sides[index], part])), ...style.paddingSides }
    : { ...style.paddingSides };
  delete next.padding;
  for (const index of indices) {
    const side = sides[index];
    if (!side) continue;
    if (value === undefined) delete overrides[side]; else overrides[side] = value;
  }
  if (Object.keys(overrides).length) next.paddingSides = overrides; else delete next.paddingSides;
  return next;
}

export function updateMarginSides<T extends { margin?: string; marginSides?: Partial<Record<"top" | "right" | "bottom" | "left", string>> }>(style: T, indices: readonly number[], value: string | undefined): T {
  const sides = ["top", "right", "bottom", "left"] as const;
  const next = { ...style };
  const overrides: Partial<Record<typeof sides[number], string>> = style.margin !== undefined
    ? { ...Object.fromEntries(expandBoxLengths(style.margin).map((part, index) => [sides[index], part])), ...style.marginSides }
    : { ...style.marginSides };
  delete next.margin;
  for (const index of indices) {
    const side = sides[index];
    if (!side) continue;
    if (value === undefined) delete overrides[side]; else overrides[side] = value;
  }
  if (Object.keys(overrides).length) next.marginSides = overrides; else delete next.marginSides;
  return next;
}


export function updateBorderWidthSides<T extends { borderWidth?: string; borderWidthSides?: Partial<Record<"top" | "right" | "bottom" | "left", string>> }>(style: T, indices: readonly number[], value: string | undefined): T {
  const sides = ["top", "right", "bottom", "left"] as const;
  const next = { ...style };
  const overrides: Partial<Record<typeof sides[number], string>> = style.borderWidth !== undefined
    ? { ...Object.fromEntries(expandBoxLengths(style.borderWidth).map((part, index) => [sides[index], part])), ...style.borderWidthSides }
    : { ...style.borderWidthSides };
  delete next.borderWidth;
  for (const index of indices) {
    const side = sides[index];
    if (!side) continue;
    if (value === undefined) delete overrides[side]; else overrides[side] = value;
  }
  if (Object.keys(overrides).length) next.borderWidthSides = overrides; else delete next.borderWidthSides;
  return next;
}

export function updateBorderRadiusCorners<T extends { borderRadius?: string; borderRadiusCorners?: Partial<Record<"topLeft" | "topRight" | "bottomRight" | "bottomLeft", string>> }>(style: T, indices: readonly number[], value: string | undefined): T {
  const sides = ["topLeft", "topRight", "bottomRight", "bottomLeft"] as const;
  const next = { ...style };
  const overrides: Partial<Record<typeof sides[number], string>> = style.borderRadius !== undefined
    ? { ...Object.fromEntries(expandBoxLengths(style.borderRadius).map((part, index) => [sides[index], part])), ...style.borderRadiusCorners }
    : { ...style.borderRadiusCorners };
  delete next.borderRadius;
  for (const index of indices) {
    const side = sides[index];
    if (!side) continue;
    if (value === undefined) delete overrides[side]; else overrides[side] = value;
  }
  if (Object.keys(overrides).length) next.borderRadiusCorners = overrides; else delete next.borderRadiusCorners;
  return next;
}