import { iconGeometry, iconMetadata } from '../dist/index.js';
import { statusForeground } from './status-colours.js';
const names = Object.freeze(['library.files', 'insert.image', 'insert.audio', 'insert.video', 'media.gallery', 'library.designs', 'insert.shapes']);
export function hasIllustrationColours(name) { return names.includes(name); }
/** Colour choices are visual details, not status indicators. */
export function illustrationArtwork(name, scale, colours) {
  if (!hasIllustrationColours(name) || !iconGeometry[name]?.[scale]) throw new Error('Invalid illustration icon');
  for (const key of ['accent', 'gold', 'green', 'ink', 'surface', 'subtle']) {
    if (typeof colours?.[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(colours[key])) throw new Error('Invalid illustration colour');
  }
  const glyph = iconGeometry[name][scale];
  const roles = {
    'library.files': [{ fill: colours.gold }, { line: colours.ink }],
    'insert.image': [{ fill: colours.subtle }, { fill: colours.gold }, { line: colours.green }],
    'insert.audio': [{ line: colours.ink }, { fill: colours.accent }, { fill: colours.accent }],
    'insert.video': [{ fill: colours.subtle }, { fill: colours.accent }],
    'media.gallery': [{ fill: colours.subtle }, { line: colours.ink }, { fill: colours.gold }],
    'library.designs': [{ fill: colours.accent }, { fill: colours.gold }, { fill: colours.green }, { fill: colours.subtle }],
    'insert.shapes': [{ fill: colours.accent }, { fill: colours.gold }, { fill: colours.green }],
  }[name];
  const result = [];
  glyph.paths.forEach(({ d, fillRule }, index) => {
    const paint = roles[index];
    const colour = paint.fill || paint.line || colours.ink;
    const edge = statusForeground(colour);
    const halo = statusForeground(edge);
    const common = { d, ...(fillRule ? { fillRule } : {}) };
    if (!(['insert.image', 'media.gallery', 'insert.video'].includes(name) && index > 0) && !(name === 'library.files' && index === 1)) result.push({ ...common, fill: 'none', stroke: halo, strokeWidth: name === 'insert.shapes' && scale === 'Regular-L' ? Math.min(glyph.strokeWidth + 2, 3.4) : glyph.strokeWidth + 2 });
    const detail = (name === 'insert.image' && index === 1) || (name === 'media.gallery' && index === 2);
    if (!(name === 'library.files' && index === 1)) result.push({ ...common, fill: paint.fill || 'none', stroke: edge, strokeWidth: detail ? 0.65 : glyph.strokeWidth });
    if (paint.line) result.push({ ...common, fill: 'none', stroke: paint.line, strokeWidth: name === 'library.files' && index === 1 ? glyph.strokeWidth : Math.max(0.7, glyph.strokeWidth - 0.7) });
  });
  return result;
}
export function createIllustrationSvg(name, scale, size, colours) {
  if (!Number.isInteger(size) || size < 1 || size > 512) throw new Error('Invalid illustration icon size');
  const paths = illustrationArtwork(name, scale, colours);
  return ['<?xml version="1.0" encoding="UTF-8"?>', `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">`, `  <title>${iconMetadata[name].label}</title>`, ...paths.map(({ d, fill, fillRule, stroke, strokeWidth }) => `  <path d="${d}" fill="${fill}"${fillRule ? ` fill-rule="${fillRule}"` : ''} stroke="${stroke}" stroke-width="${strokeWidth}" />`), '</svg>', ''].join('\n');
}
