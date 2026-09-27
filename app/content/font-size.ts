export type CustomFontSizeUnit = "px" | "em" | "rem" | "vw" | "vh";

export function customFontSizeMaximum(unit: CustomFontSizeUnit) {
  return unit === "px" ? 400 : 25;
}

export function normaliseCustomFontSize(amount: number, unit: CustomFontSizeUnit) {
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return `${Math.min(amount, customFontSizeMaximum(unit))}${unit}`;
}

export function validCustomFontSize(value: unknown) {
  if (value === undefined) return true;
  if (typeof value !== "string") return false;
  const match = value.match(/^(\d+(?:\.\d+)?)(px|em|rem|vw|vh)$/);
  return Boolean(match && Number(match[1]) > 0 && Number(match[1]) <= customFontSizeMaximum(match[2] as CustomFontSizeUnit));
}
