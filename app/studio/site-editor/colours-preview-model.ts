import type { CSSProperties } from "react";
import type { ParagraphBackgroundGradient } from "../../content/model";
import { paragraphBackgroundGradientCss } from "../../content/paragraph-styles";
import type { TypographyRole } from "./typography-preview-model";
import { stylePalettes } from "./style-reference-data";

export type PreviewPalette = { id: string; name: string; colours: readonly string[]; text: string; heading: string; buttonBackground: string; buttonText: string };
export type PreviewColour = { id: string; name: string; colour: string };
export type PreviewGradient = { id: string; name: string; gradient: ParagraphBackgroundGradient };
export type ColourRoleSettings = { background?: string; gradient?: ParagraphBackgroundGradient; gradientId?: string; hover?: string };
export type PreviewColours = { retired?: Record<string, string>; retiredGradients?: Record<string, ParagraphBackgroundGradient>; theme?: Record<string, string>; custom?: Record<string, PreviewColour | null>; gradients?: Record<string, PreviewGradient | null>; elements?: Partial<Record<TypographyRole, ColourRoleSettings>> };
export function mergePreviewColours(global: PreviewColours = {}, local: PreviewColours = {}): PreviewColours {
  const elements = { ...global.elements };
  for (const role of Object.keys(local.elements ?? {}) as TypographyRole[]) elements[role] = { ...elements[role], ...local.elements?.[role] };
  return { retiredGradients: { ...global.retiredGradients, ...local.retiredGradients }, retired: { ...global.retired, ...local.retired }, theme: { ...global.theme, ...local.theme }, custom: { ...global.custom, ...local.custom }, gradients: { ...global.gradients, ...local.gradients }, elements };
}
export function resolveColourPalette(source: PreviewPalette, settings: PreviewColours = {}): PreviewPalette {
  const colours = source.colours.map((colour, index) => settings.theme?.[String(index)] ?? colour);
  const replace = (value: string) => { const index = source.colours.indexOf(value); return index < 0 ? value : colours[index]; };
  return { ...source, colours, text: replace(source.text), heading: replace(source.heading), buttonBackground: replace(source.buttonBackground), buttonText: replace(source.buttonText) };
}
export function previewColourEntries(palette: PreviewPalette, settings: PreviewColours = {}) {
  return [...palette.colours.map((colour, index) => ({ key: `theme-${index}`, label: index === 0 ? 'Base' : index === 1 ? 'Contrast' : `Accent ${index - 1}`, colour: colour.startsWith('color-mix(') ? `${palette.text}33` : colour, token: `var(--site-palette-theme-${index})` })), ...Object.values(settings.custom ?? {}).filter((item): item is PreviewColour => Boolean(item)).map(item => ({ key: item.id, label: item.name, colour: item.colour, token: `var(--site-palette-${item.id})` }))];
}
export function previewColourValue(value: string | undefined, palette: PreviewPalette, settings: PreviewColours = {}) {
  return previewColourEntries(palette, settings).find(entry => entry.token === value)?.colour ?? (value?.startsWith("var(--site-palette-") ? settings.retired?.[value.slice("var(--site-palette-".length, -1)] : undefined) ?? value;
}
/** Palette selection carries its identity; custom picker values remain literal colours. */
export function previewPaletteReference(key: string) { return `var(--site-palette-${key})`; }
export function previewColourVariables(palette: PreviewPalette, settings: PreviewColours = {}): CSSProperties {
  return Object.fromEntries([...Object.entries(settings.retired ?? {}).map(([id, colour]) => [`--site-palette-${id}`, colour]), ...previewColourEntries(palette, settings).map(entry => [entry.token.slice(4, -1), entry.colour])]) as CSSProperties;
}
export function previewRoleBackground(settings: PreviewColours, role: TypographyRole) {
  const fields = { ...(/^h[1-6]$/.test(role) ? settings.elements?.headings : {}), ...settings.elements?.[role] };
  const gradient = fields.gradientId ? settings.gradients?.[fields.gradientId]?.gradient ?? settings.retiredGradients?.[fields.gradientId] ?? fields.gradient : fields.gradient;
  return gradient ? paragraphBackgroundGradientCss(gradient) : fields.background;
}
export const referenceColourPalettes: readonly PreviewPalette[] = stylePalettes;
