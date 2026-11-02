import { mergeStyleFields, resolvePreviewBlockDefaults, type PreviewBlockId, type PreviewBlockStyle } from "./blocks-preview-model";
import { previewStyleDetails, type StyleSelection } from "./styles-preview-state";
import { resolvedTypographyFields, type TypographyFields, type TypographyRole } from "./typography-preview-model";
import { stylePalettes } from "./style-reference-data";

/** Source presence only: resolved reference values are deliberately not authorship. */
export function explicitTypographyFields(selection: StyleSelection, role: TypographyRole): TypographyFields {
  const { typography } = previewStyleDetails(selection);
  const settings = selection.typography ?? {};
  const resolved = resolvedTypographyFields(typography, settings, role);
  const source: TypographyFields = { ...settings.elements?.text };
  const heading = role === "headings" || /^h[1-6]$/.test(role);
  if (heading) for (const field of ["family", "weight", "fontStyle", "lineHeight", "letterSpacing", "transform", "colour", "preset", "size"] as const) delete source[field];
  if (role === "captions" || role === "buttons") { delete source.preset; delete source.size; }
  if (role === "buttons") delete source.colour;
  if (role === "links") delete source.decoration;
  Object.assign(source, heading ? settings.elements?.headings : {}, settings.elements?.[role]);
  if (resolved.preset && settings.presets?.[resolved.preset] !== undefined) source.preset ??= resolved.preset;
  const customisedTheme = selection.typographyId !== undefined && selection.typographyId !== "default";
  const themeFields = new Set<keyof TypographyFields>(["family", "weight", "lineHeight", "letterSpacing", ...(!heading && role !== "buttons" && role !== "captions" ? ["size", "preset"] as const : [])]);
  if (role === "h6") themeFields.delete("weight");
  if (role === "h5" || role === "h6") themeFields.delete("letterSpacing");
  const result: TypographyFields = {};
  for (const field of Object.keys(resolved) as (keyof TypographyFields)[]) {
    if (customisedTheme && themeFields.has(field) || source[field] !== undefined) Reflect.set(result, field, resolved[field]);
  }
  return result;
}

export function explicitPaletteColour(selection: StyleSelection, role: "text" | "heading" | "buttonText" | "buttonBackground" | "background"): boolean {
  if (selection.paletteId !== undefined && selection.paletteId !== "default") return true;
  const source = stylePalettes.find(item => item.id === (selection.paletteId ?? "default")) ?? stylePalettes[0];
  const value = role === "background" ? source.colours[0] : source[role];
  const index = (source.colours as readonly string[]).indexOf(value);
  return index >= 0 && selection.colours?.theme?.[String(index)] !== undefined;
}

/** Merge authored family/variation values without injecting theme variation artwork. */
export function explicitBlockStyle(selection: StyleSelection, id: PreviewBlockId, variation?: string): PreviewBlockStyle {
  const base = resolvePreviewBlockDefaults(selection.blockStyles)[id] ?? {};
  return variation ? mergeStyleFields(base, base.variations?.[variation]) : base;
}
