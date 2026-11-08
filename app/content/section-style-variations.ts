/** Twenty Twenty-Five section styles, pinned to 62c10821880ac2242460e7ecf42727ce1a026047.
 * Source: styles/sections/section-{1..5}.json (GPL-2.0-or-later).
 * These are render-only theme defaults, never materialised in authored content.
 */
export type SectionStyleReference = {
  id: string;
  label: string;
  backgroundColor: string;
  textColor: string;
  button?: { background: string; text: string; hoverBackground: string };
};
const defaultPalette = ["#FFFFFF", "#111111", "#FFEE58", "#F6CFF4", "#503AA8", "#686868", "#FBFAF3", "color-mix(in srgb,currentColor 20%,transparent)"];
const colour = (index: number) => `var(--site-palette-theme-${index},${defaultPalette[index]})`;
export const sectionStyleVariations: readonly SectionStyleReference[] = [
  { id: 'section-1', label: 'Style 1', backgroundColor: colour(6), textColor: colour(1) },
  { id: 'section-2', label: 'Style 2', backgroundColor: colour(3), textColor: colour(1) },
  { id: 'section-3', label: 'Style 3', backgroundColor: colour(2), textColor: colour(1) },
  { id: 'section-4', label: 'Style 4', backgroundColor: colour(4), textColor: colour(3), button: { background: colour(3), text: colour(4), hoverBackground: `color-mix(in srgb,${colour(3)} 85%,transparent)` } },
  { id: 'section-5', label: 'Style 5', backgroundColor: colour(1), textColor: colour(0), button: { background: colour(0), text: colour(1), hoverBackground: `color-mix(in srgb,${colour(0)} 80%,transparent)` } },
];
export const sectionStyleBlockIds = ['group', 'row', 'stack', 'grid', 'columns', 'column'] as const;
export const sectionStyleReference = (id?: string) => sectionStyleVariations.find(variation => variation.id === id);
