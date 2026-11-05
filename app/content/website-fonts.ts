export const referenceFonts = [
  { id: 'site-manrope', name: "Manrope", family: '"TT5 Manrope", sans-serif', weights: [200, 300, 400, 500, 600, 700, 800], variable: true },
  { id: 'site-fira-code', name: "Fira Code", family: '"TT5 Fira Code", monospace', weights: [300, 400, 500, 600, 700], variable: true },
  { id: 'site-beiruti', name: "Beiruti", family: '"TT5 Beiruti", sans-serif', weights: [200, 300, 400, 500, 600, 700, 800, 900], variable: true },
  { id: 'site-literata', name: "Literata", family: '"TT5 Literata", serif', weights: [200, 300, 400, 900], variable: false },
  { id: 'site-vollkorn', name: "Vollkorn", family: '"TT5 Vollkorn", serif', weights: [400, 500, 600, 700, 800, 900], variable: true },
  { id: 'site-platypi', name: "Platypi", family: '"TT5 Platypi", serif', weights: [300, 400, 500, 600, 700, 800], variable: true },
  { id: 'site-ysabeau-office', name: "Ysabeau Office", family: '"TT5 Ysabeau Office", sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], variable: true },
  { id: 'site-roboto-slab', name: "Roboto Slab", family: '"TT5 Roboto Slab", serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], variable: true },
  { id: 'site-fira-sans', name: "Fira Sans", family: '"TT5 Fira Sans", sans-serif', weights: [300, 400], variable: false },
] as const;

export type WebsiteFontId = typeof referenceFonts[number]["id"];
/** Keep authored font IDs while disabled site fonts resolve to their declared fallback. */
export function websiteFontFallbackVariables(disabledFonts: readonly string[] = []): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const font of referenceFonts) if (disabledFonts.includes(font.family)) variables[`--${font.id}`] = font.family.split(",").slice(1).join(",").trim() || "sans-serif";
  return variables;
}
export function isWebsiteFontId(value: unknown): value is WebsiteFontId { return typeof value === "string" && referenceFonts.some(font => font.id === value); }
export function containsWebsiteFont(value: unknown): boolean {
  const pending: unknown[] = [value];
  const seen = new Set<object>();
  while (pending.length) {
    const item = pending.pop();
    if (!item || typeof item !== "object" || seen.has(item)) continue;
    seen.add(item);
    if (!Array.isArray(item)) {
      const record = item as Record<string, unknown>;
      if (isWebsiteFontId(record.fontFamily) || Array.isArray(record.path) && record.path.at(-1) === "fontFamily" && isWebsiteFontId(record.value)) return true;
    }
    for (const child of Array.isArray(item) ? item : Object.values(item)) if (child && typeof child === "object") pending.push(child);
  }
  return false;
}
