import { iconGeometry, iconMetadata } from '../dist/index.js';
import { statusForeground } from './status-colours.js';

/** Resolved palette colours for the two annotation symbols. */
export function annotationArtwork(name, scale, colours) {
  if (!['insert.highlight', 'insert.redaction'].includes(name) || !iconGeometry[name]?.[scale]) throw new Error('Invalid annotation icon');
  for (const key of ['ink', 'surface', 'highlight']) {
    if (typeof colours?.[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(colours[key])) throw new Error('Invalid annotation colour');
  }
  const glyph = iconGeometry[name][scale];
  const luminance = value => {
    const channels = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(colours.ink), b = luminance(colours.surface);
  const keyline = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 3 ? colours.surface : statusForeground(colours.ink);
  const outline = { fill: 'none', stroke: keyline, strokeWidth: glyph.strokeWidth + 2 };
  const ink = { fill: 'none', stroke: colours.ink, strokeWidth: glyph.strokeWidth };
  if (name === 'insert.highlight') {
    const d = glyph.paths[0].d;
    const split = d.lastIndexOf(' M ');
    const pen = d.slice(0, split);
    const marker = d.slice(split + 1).replaceAll('22.3', '22');
    return [
      { d: pen, ...outline }, { d: marker, ...outline, strokeWidth: 4 },
      { d: pen, ...ink }, { d: marker, ...ink, strokeWidth: 3 },
      { d: marker, ...ink, stroke: colours.highlight, strokeWidth: 1.5 },
    ];
  }
  const [lines, bar] = glyph.paths;
  return [
    { d: lines.d, ...outline }, { d: bar.d, ...outline },
    { d: lines.d, ...ink }, { d: bar.d, ...ink, fill: colours.ink },
  ];
}
export function hasAnnotationColours(name) { return name === 'insert.highlight' || name === 'insert.redaction'; }
export function createAnnotationSvg(name, scale, size, colours) {
  if (!Number.isInteger(size) || size < 1 || size > 512) throw new Error('Invalid annotation icon size');
  const paths = annotationArtwork(name, scale, colours);
  return ['<?xml version="1.0" encoding="UTF-8"?>', `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">`, `  <title>${iconMetadata[name].label}</title>`, ...paths.map(({ d, fill, stroke, strokeWidth }) => `  <path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`), '</svg>', ''].join('\n');
}
