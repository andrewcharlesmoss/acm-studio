export type ShadowLengthUnit = "px" | "em" | "rem" | "vw" | "vh";
export type PreviewShadowLayer = { id: string; colour: string; inset: boolean; x: string; y: string; blur: string; spread: string };
export type PreviewShadowPreset = { id: string; name: string; layers: PreviewShadowLayer[] };
export type PreviewShadows = Record<string, Partial<Omit<PreviewShadowPreset, "id">> | null>;
const layer = (id: string, x: number, y: number, blur: number, spread: number, colour: string): PreviewShadowLayer => ({ id, x: `${x}px`, y: `${y}px`, blur: `${blur}px`, spread: `${spread}px`, colour, inset: false });
/** Gutenberg lib/theme.json shadow presets; original names and CSS values, no artwork. */
export const defaultShadowPresets: readonly PreviewShadowPreset[] = [
  { id: "natural", name: "Natural", layers: [layer("natural-1", 6, 6, 9, 0, "#00000033")] },
  { id: "deep", name: "Deep", layers: [layer("deep-1", 12, 12, 50, 0, "#00000066")] },
  { id: "sharp", name: "Sharp", layers: [layer("sharp-1", 6, 6, 0, 0, "#00000033")] },
  { id: "outlined", name: "Outlined", layers: [layer("outlined-1", 6, 6, 0, -3, "#FFFFFF"), layer("outlined-2", 6, 6, 0, 0, "#000000")] },
  { id: "crisp", name: "Crisp", layers: [layer("crisp-1", 6, 6, 0, 0, "#000000")] },
];
export function mergePreviewShadows(global: PreviewShadows = {}, local: PreviewShadows = {}): PreviewShadows {
  const merged = { ...global };
  for (const [id, preset] of Object.entries(local)) merged[id] = preset === null || (global[id] === null && preset.layers === undefined) ? null : { ...merged[id], ...preset };
  return merged;
}
export function resolveShadowPresets(settings: PreviewShadows = {}): PreviewShadowPreset[] {
  const presets = new Map(defaultShadowPresets.map(preset => [preset.id, preset]));
  for (const [id, preset] of Object.entries(settings)) {
    if (preset === null) { presets.delete(id); continue; }
    const previous = presets.get(id);
    presets.set(id, { id, name: preset.name ?? previous?.name ?? "Custom shadow", layers: preset.layers ?? previous?.layers ?? [] });
  }
  return [...presets.values()];
}
export function validShadowLength(value: string, negative = true) { return /^-?(?:\d+(?:\.\d+)?)(?:px|em|rem|vw|vh)$/.test(value) && (negative || !value.startsWith("-")) && Math.abs(parseFloat(value)) <= 10000; }
export function shadowPresetCss(preset: PreviewShadowPreset, specimen = false) {
  const length = (value: string) => specimen ? value.replace(/vw$/, "cqw").replace(/vh$/, "cqh") : value;
  return preset.layers.filter(layer => validShadowLength(layer.x) && validShadowLength(layer.y) && validShadowLength(layer.blur, false) && validShadowLength(layer.spread)).map(layer => `${layer.inset ? "inset " : ""}${length(layer.x)} ${length(layer.y)} ${length(layer.blur)} ${length(layer.spread)} ${layer.colour}`).join(", ") || "none";
}
export function newShadowLayer(id: string): PreviewShadowLayer { return layer(id, 6, 6, 9, 0, "#00000033"); }
