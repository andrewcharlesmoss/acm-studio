import type { ParagraphStyle } from "./model";

/** Shared registrations for content choices and website variation defaults. */
export const TEXT_STYLE_VARIATIONS = [
  { id: "display", label: "Display" },
  { id: "subtitle", label: "Subtitle" },
  { id: "annotation", label: "Annotation" },
] as const;
export type TextStyleVariation = "default" | typeof TEXT_STYLE_VARIATIONS[number]["id"];

export const TEXT_STYLE_VARIATION_DEFAULTS: Record<Exclude<TextStyleVariation, "default">, ParagraphStyle> = {
  display: { fontSizeCustom: "clamp(2.2rem, calc(1.9334rem + 1.333cqw), 3.5rem)", lineHeight: "1.2" },
  subtitle: { fontSizeCustom: "clamp(1.5rem, calc(1.4216rem + .392cqw), 1.75rem)", lineHeight: "1.2" },
  annotation: { fontSize: "small", lineHeight: "1.5", borderColor: "currentColor", borderStyle: "solid", borderWidth: "1px", borderRadius: "16px", padding: ".2rem .6rem .25rem" },
};

export function textStyleVariation(style?: ParagraphStyle): TextStyleVariation {
  const classes = style?.className?.split(/\s+/) ?? [];
  return TEXT_STYLE_VARIATIONS.find(choice => classes.includes(`is-style-${choice.id}`))?.id ?? "default";
}

/** Only the registered variation classes change; authored fields stay intact. */
export function setTextStyleVariation(style: ParagraphStyle | undefined, value: TextStyleVariation): ParagraphStyle | undefined {
  const classes = (style?.className?.split(/\s+/) ?? []).filter(name => name && !TEXT_STYLE_VARIATIONS.some(choice => name === `is-style-${choice.id}`));
  if (value !== "default") classes.push(`is-style-${value}`);
  const next = { ...style };
  if (classes.length) next.className = classes.join(" "); else delete next.className;
  return Object.keys(next).length ? next : undefined;
}

export function resolveTextStyleVariation(style?: ParagraphStyle): ParagraphStyle | undefined {
  const variation = textStyleVariation(style);
  if (variation === "default") return style;
  const defaults = { ...TEXT_STYLE_VARIATION_DEFAULTS[variation] };
  // An explicit preset or custom size supersedes the variation's size.
  if (style?.fontSize || style?.fontSizeCustom) { delete defaults.fontSize; delete defaults.fontSizeCustom; }
  return { ...defaults, ...style };
}
