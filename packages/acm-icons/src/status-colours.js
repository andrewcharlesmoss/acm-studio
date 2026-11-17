import { iconGeometry, iconMetadata } from "../dist/index.js";
/** Universal palette roles used by the optional status appearance. */
const roles = Object.freeze({
  'state.info': 'information',
  'state.warning': 'warning',
  'state.caution': 'warning',
  'state.error': 'alert',
  'state.published': 'success',
});
export function statusColourRole(name) { return Object.hasOwn(roles, name) ? roles[name] : undefined; }

/** Choose the higher-contrast black or white foreground for a palette colour. */
export function statusForeground(colour) {
  if (typeof colour !== 'string' || !/^#[0-9a-f]{6}$/i.test(colour)) throw new Error('Invalid status colour');
  const channels = [1, 3, 5].map(i => parseInt(colour.slice(i, i + 2), 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const light = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return (light + 0.05) / 0.05 >= 1.05 / (light + 0.05) ? '#000000' : '#FFFFFF';
}
/** Portable status artwork, with a resolved universal palette colour. */
export function createStatusSvg(name, scale, size, colour) {
  const glyph = iconGeometry[name]?.[scale];
  if (!statusColourRole(name) || !glyph || !Number.isInteger(size) || size < 1 || size > 512) throw new Error('Invalid status icon export');
  const foreground = statusForeground(colour);
  const paths = glyph.paths.map(({ d, fill, fillRule, stroke }, index) => `  <path d="${d}"${index === 0 ? ` fill="${colour}"` : fill ? ` fill="${foreground}"` : ''}${fillRule ? ` fill-rule="${fillRule}"` : ''}${stroke === 'none' ? ' stroke="none"' : ''} />`);
  return [`<?xml version="1.0" encoding="UTF-8"?>`, `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${foreground}" stroke-width="${glyph.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">`, `  <title>${iconMetadata[name].label}</title>`, ...paths, `</svg>`, ``].join("\n");
}
