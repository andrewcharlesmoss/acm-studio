import type { stylePalettes } from './style-reference-data';

/** Resolve the reference theme's translucent contrast swatch for colour editing. */
export function typographyColourPalette(palette: typeof stylePalettes[number]) {
  return palette.colours.map((colour, index) => ({
    key: String(index),
    label: index === 0 ? 'Base' : index === 1 ? 'Contrast' : `Accent ${index - 1}`,
    colour: colour === 'color-mix(in srgb, currentColor 20%, transparent)' ? `${palette.text}33` : colour,
  }));
}
