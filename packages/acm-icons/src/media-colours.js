import { iconGeometry, iconMetadata } from "../dist/index.js";

const mediaIcons = Object.freeze([
  "library.files",
  "insert.image",
  "insert.audio",
  "insert.video",
  "media.gallery",
]);

/** Universal palette role used for optional file and media icon colour. */
export function mediaColourRole(name) {
  return mediaIcons.includes(name) ? "accent" : undefined;
}

/** Portable single-accent treatment for the supported file and media symbols. */
export function createMediaSvg(name, scale, size, colour) {
  const glyph = iconGeometry[name]?.[scale];
  if (!mediaColourRole(name) || !glyph || !Number.isInteger(size) || size < 1 || size > 512) {
    throw new Error("Invalid media icon export");
  }
  if (typeof colour !== "string" || !/^#[0-9a-f]{6}$/i.test(colour)) {
    throw new Error("Invalid media colour");
  }

  const colouredPaths = glyph.paths.map(({ d, fill, fillRule, stroke }) => {
    const pathFill = fill === "currentColor" ? colour : "none";
    return `  <path d="${d}" fill="${pathFill}"${fillRule ? ` fill-rule="${fillRule}"` : ""}${stroke === "none" ? ' stroke="none"' : ""} />`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="${glyph.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">`,
    `  <title>${iconMetadata[name].label}</title>`,
    ...colouredPaths,
    "</svg>",
    "",
  ].join("\n");
}
