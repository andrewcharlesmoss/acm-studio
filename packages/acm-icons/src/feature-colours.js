import { iconGeometry, iconMetadata } from '../dist/index.js';
import { statusForeground } from './status-colours.js';

const featureNames = Object.freeze(['library.designs', 'insert.shapes', 'security.lock', 'security.unlock', 'security.key', 'security.shield']);
export function hasFeatureColours(name) { return featureNames.includes(name); }
/** Palette Accent artwork, outlined for legibility on both light and dark surfaces. */
export function featureArtwork(name, scale, colour) {
  if (!hasFeatureColours(name) || !iconGeometry[name]?.[scale]) throw new Error('Invalid feature icon');
  if (typeof colour !== 'string' || !/^#[0-9a-f]{6}$/i.test(colour)) throw new Error('Invalid feature colour');
  const glyph = iconGeometry[name][scale];
  const edge = statusForeground(colour);
  const paths = glyph.paths;
  return [
    ...paths.map(({ d }) => ({ d, fill: 'none', stroke: edge, strokeWidth: glyph.strokeWidth + 1.5 })),
    ...paths.map(({ d, fill, fillRule, stroke }) => ({ d, fill: fill === 'currentColor' ? colour : 'none', ...(fillRule ? { fillRule } : {}), stroke: stroke === 'none' ? 'none' : colour, strokeWidth: glyph.strokeWidth })),
  ];
}
export function createFeatureSvg(name, scale, size, colour) {
  if (!Number.isInteger(size) || size < 1 || size > 512) throw new Error('Invalid feature icon size');
  const paths = featureArtwork(name, scale, colour);
  return ['<?xml version="1.0" encoding="UTF-8"?>', `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">`, `  <title>${iconMetadata[name].label}</title>`, ...paths.map(({ d, fill, fillRule, stroke, strokeWidth }) => `  <path d="${d}" fill="${fill}"${fillRule ? ` fill-rule="${fillRule}"` : ''} stroke="${stroke}" stroke-width="${strokeWidth}" />`), '</svg>', ''].join('\n');
}
