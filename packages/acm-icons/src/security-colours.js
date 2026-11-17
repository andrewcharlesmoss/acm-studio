import { iconGeometry, iconMetadata } from '../dist/index.js';
import { statusForeground } from './status-colours.js';
const names = Object.freeze(['security.lock', 'security.unlock', 'security.key', 'security.shield']);
export function hasSecurityColours(name) { return names.includes(name); }
/** Gold and neutral artwork using the existing optical geometry. */
export function securityArtwork(name, scale, colours) {
  if (!hasSecurityColours(name) || !iconGeometry[name]?.[scale]) throw new Error('Invalid security icon');
  for (const key of ['gold', 'neutral', 'ink', 'surface', 'subtle']) {
    if (typeof colours?.[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(colours[key])) throw new Error('Invalid security colour');
  }
  const glyph = iconGeometry[name][scale];
  const luminance = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  const contrast = (first, second) => {
    const a = luminance(first), b = luminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const ink = contrast(colours.ink, colours.gold) >= 3 ? colours.ink : statusForeground(colours.gold);
  const neutral = contrast(colours.neutral, ink) >= 1.5 ? colours.neutral : statusForeground(ink);
  const subtle = contrast(colours.subtle, colours.gold) >= 3 ? colours.subtle : statusForeground(colours.gold);
  const halo = contrast(ink, colours.surface) >= 3 ? colours.surface : statusForeground(ink);
  const [first, second, third] = glyph.paths;
  const path = (d, stroke, strokeWidth, fill = 'none') => ({ d, stroke, strokeWidth, fill });
  const outer = glyph.paths.map(({ d }) => path(d, halo, glyph.strokeWidth + 2));
  if (name === 'security.lock' || name === 'security.unlock') return [
    ...outer, path(first.d, ink, glyph.strokeWidth + 0.7), path(first.d, neutral, glyph.strokeWidth),
    path(second.d, ink, glyph.strokeWidth, colours.gold), path(third.d, ink, glyph.strokeWidth),
  ];
  if (name === 'security.key') return [
    ...outer, ...glyph.paths.map(({ d }) => path(d, ink, glyph.strokeWidth + 0.9)),
    ...glyph.paths.map(({ d }) => path(d, colours.gold, glyph.strokeWidth)),
  ];
  return [...outer, path(first.d, ink, glyph.strokeWidth + 1, subtle), path(first.d, colours.gold, glyph.strokeWidth, 'none')];
}
export function createSecuritySvg(name, scale, size, colours) {
  if (!Number.isInteger(size) || size < 1 || size > 512) throw new Error('Invalid security icon size');
  const paths = securityArtwork(name, scale, colours);
  return ['<?xml version="1.0" encoding="UTF-8"?>', `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">`, `  <title>${iconMetadata[name].label}</title>`, ...paths.map(({ d, fill, stroke, strokeWidth }) => `  <path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`), '</svg>', ''].join('\n');
}
