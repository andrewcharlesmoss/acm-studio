import type { CSSProperties } from "react";
import { styleTypography } from "./style-reference-data";

export const typographyRoles = ["text", "links", "headings", "h1", "h2", "h3", "h4", "h5", "h6", "captions", "buttons"] as const;
export type TypographyRole = typeof typographyRoles[number];
export type TypographyFields = {
  family?: string; size?: string; preset?: string; weight?: number; lineHeight?: string; letterSpacing?: string;
  transform?: "none" | "uppercase" | "lowercase" | "capitalize";
  align?: "left" | "center" | "right" | "justify";
  decoration?: "none" | "underline" | "line-through";
};
export type FontSizePreset = { id: string; name: string; size: string; fluid: boolean; customFluid?: boolean; min: string; max: string };
export type TypographySettings = { elements?: Partial<Record<TypographyRole, TypographyFields>>; presets?: Record<string, FontSizePreset | null>; enabledFonts?: string[] };
export const referenceFonts = [
  { name: "Manrope", family: '"TT5 Manrope", sans-serif', weights: [200, 300, 400, 500, 600, 700, 800], variable: true },
  { name: "Fira Code", family: '"TT5 Fira Code", monospace', weights: [300, 400, 500, 600, 700], variable: true },
  { name: "Beiruti", family: '"TT5 Beiruti", sans-serif', weights: [200, 300, 400, 500, 600, 700, 800, 900], variable: true },
  { name: "Literata", family: '"TT5 Literata", serif', weights: [200, 300, 400, 900], variable: false },
  { name: "Vollkorn", family: '"TT5 Vollkorn", serif', weights: [400, 500, 600, 700, 800, 900], variable: true },
  { name: "Platypi", family: '"TT5 Platypi", serif', weights: [300, 400, 500, 600, 700, 800], variable: true },
  { name: "Ysabeau Office", family: '"TT5 Ysabeau Office", sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], variable: true },
  { name: "Roboto Slab", family: '"TT5 Roboto Slab", serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], variable: true },
  { name: "Fira Sans", family: '"TT5 Fira Sans", sans-serif', weights: [300, 400], variable: false },
] as const;
export const alphabeticalReferenceFonts = [...referenceFonts].sort((first, second) => first.name.localeCompare(second.name, "en"));
export const defaultFontSizePresets: FontSizePreset[] = [
  { id: "small", name: "Small", size: "0.875rem", fluid: false, min: "0.875rem", max: "0.875rem" },
  { id: "medium", name: "Medium", size: "1rem", fluid: true, min: "1rem", max: "1.125rem" },
  { id: "large", name: "Large", size: "1.38rem", fluid: true, min: "1.125rem", max: "1.375rem" },
  { id: "x-large", name: "Extra Large", size: "1.75rem", fluid: true, min: "1.75rem", max: "2rem" },
  { id: "xx-large", name: "Extra Extra Large", size: "2.15rem", fluid: true, min: "2.15rem", max: "3rem" },
];
export function mergeTypographySettings(global: TypographySettings = {}, local: TypographySettings = {}): TypographySettings {
  const elements: TypographySettings["elements"] = { ...global.elements };
  for (const role of typographyRoles) if (local.elements?.[role]) elements[role] = { ...elements[role], ...local.elements[role] };
  return { elements, presets: { ...global.presets, ...local.presets }, enabledFonts: local.enabledFonts ?? global.enabledFonts };
}
export function resolveFontSizePresets(settings: TypographySettings = {}) {
  const presets = new Map(defaultFontSizePresets.map(item => [item.id, item]));
  for (const [id, preset] of Object.entries(settings.presets ?? {})) { if (preset) presets.set(id, preset); else presets.delete(id); }
  return [...presets.values()];
}
export function isValidFontLength(value: string): boolean { const match = value.match(/^(\d+(?:\.\d+)?)(px|rem|em)$/); return Boolean(match && Number(match[1]) > 0 && Number(match[1]) <= (match[2] === "px" ? 400 : 25)); }
export function validFontSizePreset(preset: FontSizePreset): boolean {
  if (!preset.id || !preset.name.trim() || !isValidFontLength(preset.size) || !isValidFontLength(preset.min) || !isValidFontLength(preset.max)) return false;
  const pixels = (value: string) => parseFloat(value) * (value.endsWith("px") ? 1 : 16);
  return !preset.fluid || pixels(preset.min) <= pixels(preset.max);
}
/** Fluid sizes interpolate across the same 320–1440px reference range for every specimen. */
export function fontSizePresetCss(preset: FontSizePreset): string {
  if (!preset.fluid) return preset.size;
  const px = (value: string) => parseFloat(value) * (value.endsWith("px") ? 1 : 16);
  const min = preset.customFluid === false ? px(preset.size) * 0.85 : px(preset.min), max = preset.customFluid === false ? px(preset.size) : px(preset.max);
  return `clamp(${min / 16}rem, calc(${(min - (max - min) * 320 / 1120) / 16}rem + ${(max - min) * 100 / 1120}cqw), ${max / 16}rem)`;
}
export function resolvedTypographyFields(typography: typeof styleTypography[number], settings: TypographySettings, role: TypographyRole): TypographyFields {
  const body: TypographyFields = { family: typography.bodyFamily, weight: typography.bodyWeight, size: typography.bodySize, preset: typography.bodySize === "1.38rem" ? "large" : typography.bodySize === "1rem" ? "medium" : undefined, lineHeight: typography.bodyLineHeight, letterSpacing: typography.letterSpacing, transform: "none", align: "left", decoration: "none", ...settings.elements?.text };
  const heading = role === "headings" || /^h[1-6]$/.test(role);
  const headingSizes: Record<string, string> = { h1: "xx-large", h2: "x-large", h3: "large", h4: "large", h5: "medium", h6: "small" };
  const fields: TypographyFields = { ...body, ...(heading ? { family: typography.headingFamily, weight: typography.headingWeight, lineHeight: typography.headingLineHeight, letterSpacing: typography.headingLetterSpacing, preset: headingSizes[role], ...settings.elements?.headings } : role === "captions" ? { preset: "small" } : role === "buttons" ? { preset: "medium" } : role === "links" ? { decoration: "underline" as const } : {}), ...settings.elements?.[role] };
  const font = referenceFonts.find(item => item.family === fields.family);
  if (font && fields.weight !== undefined) {
    const requested = fields.weight;
    fields.weight = font.weights.reduce((nearest, weight) => Math.abs(weight - requested) < Math.abs(nearest - requested) ? weight : nearest, font.weights[0] as number);
  }
  return fields;
}
export function typographyFieldsCss(fields: TypographyFields, settings: TypographySettings): CSSProperties {
  const preset = fields.preset && resolveFontSizePresets(settings).find(item => item.id === fields.preset);
  return { fontFamily: fields.family, fontWeight: fields.weight, fontSize: preset ? fontSizePresetCss(preset) : fields.size, lineHeight: fields.lineHeight, letterSpacing: fields.letterSpacing, textTransform: fields.transform, textAlign: fields.align, textDecoration: fields.decoration };
}

/** Families used by every resolved role remain available until their styles are changed. */
export function typographyInUseFamilies(typography: typeof styleTypography[number], settings: TypographySettings): string[] {
  return [...new Set([...typography.fontFamilies, ...typographyRoles.map(role => resolvedTypographyFields(typography, settings, role).family).filter((family): family is string => Boolean(family))])];
}

/** Gutenberg lists the active theme families alphabetically, retaining enabled and authored uses. */
export function visibleTypographyFonts(typography: typeof styleTypography[number], settings: TypographySettings) {
  const families = new Set([...typographyInUseFamilies(typography, settings), ...(settings.enabledFonts ?? [])]);
  return alphabeticalReferenceFonts.filter(font => families.has(font.family));
}

/** Entering custom mode starts at the selected preset's authored size, not the body size. */
export function customTypographyStartingSize(fields: TypographyFields, settings: TypographySettings): string | undefined {
  return resolveFontSizePresets(settings).find(preset => preset.id === fields.preset)?.size ?? fields.size;
}
export type TypographySizeMode = "presets" | "custom";
export function typographySizeMode(fields: TypographyFields): TypographySizeMode { return fields.preset ? "presets" : "custom"; }
/** History changes select the effective mode; a local view-only toggle may stay open otherwise. */
export function reconcileTypographySizeMode(previousIncoming: TypographySizeMode, incoming: TypographySizeMode, local: TypographySizeMode): TypographySizeMode {
  return previousIncoming === incoming ? local : incoming;
}
