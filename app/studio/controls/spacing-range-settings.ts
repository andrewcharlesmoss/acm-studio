/** Gutenberg-inspired custom spacing ranges; numeric entry may exceed the slider scale. */
export function spacingRangeSettings(unit: string, allowNegative: boolean) {
  const relative = unit === "em" || unit === "rem";
  const max = unit === "px" ? 300 : relative ? 10 : 100;
  return { min: allowNegative ? -max : 0, max, step: relative ? 0.1 : 1 };
}
