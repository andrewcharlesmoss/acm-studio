import { validBoxLengths } from "./box-lengths";

/** Twenty Twenty-Five spacing, with viewport units scoped to the preview canvas. */
export const referenceSpacing = [
  { value: "0px", label: "None" }, { value: "10px", label: "Tiny" },
  { value: "20px", label: "X-Small" }, { value: "30px", label: "Small" },
  { value: "clamp(30px,5cqw,50px)", label: "Regular" },
  { value: "clamp(30px,7cqw,70px)", label: "Large" },
  { value: "clamp(50px,7cqw,90px)", label: "X-Large" },
  { value: "clamp(70px,10cqw,140px)", label: "XX-Large" },
] as const;

export function isReferenceFluidSpacing(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("clamp(") && referenceSpacing.some(preset => preset.value === value);
}

/** No arbitrary CSS functions enter stored spacing. */
export function validWebsiteBoxLengths(value: unknown, allowNegative = false): boolean {
  if (value === undefined) return true;
  if (typeof value !== "string") return false;
  const parts = value.trim().split(/\s+/);
  return parts.length >= 1 && parts.length <= 4 && parts.every(part => isReferenceFluidSpacing(part) || validBoxLengths(part, allowNegative));
}
