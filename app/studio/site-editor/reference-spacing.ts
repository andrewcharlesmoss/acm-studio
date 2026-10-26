import { validBoxLengths } from "../../content/box-lengths";

/** The finite spacing choices captured from the website Styles reference. */
export const referenceSpacing = [
  { value: "0px", label: "None" }, { value: "10px", label: "Tiny" },
  { value: "20px", label: "X-Small" }, { value: "30px", label: "Small" },
  { value: "clamp(30px,5cqw,50px)", label: "Regular" },
  { value: "clamp(30px,7cqw,70px)", label: "Large" },
  { value: "clamp(50px,7cqw,90px)", label: "X-Large" },
  { value: "clamp(70px,10cqw,140px)", label: "XX-Large" },
] as const;

const referenceLengths = new Set<string>(referenceSpacing.map(preset => preset.value));

/** Permit only the reference functions and the existing bounded CSS lengths. */
export function validWebsiteBoxLengths(value: unknown, allowNegative = false): boolean {
  if (value === undefined) return true;
  if (typeof value !== "string") return false;
  const parts = value.trim().split(/\s+/);
  return parts.length >= 1 && parts.length <= 4 && parts.every(part => referenceLengths.has(part) || validBoxLengths(part, allowNegative));
}
