import { iconGeometry, iconMetadata } from "../dist/index.js";

// Filled artwork is a paint treatment of the outline master, never a second drawing.
// Each index addresses a subpath of the original SVG in its existing order.
const tableActionCutouts = Object.freeze({ "Regular-S": [1], "Regular-M": [1, 2], "Regular-L": [1, 2, 3] });

const treatments = Object.freeze({
  "document.date": { faces: [0], cutouts: [1, 4], solidCutouts: [1] },
  "commerce.payment": { faces: [0], cutouts: [1, 2], solidCutouts: [1] },
  "social.service.codepen": { faces: [0], cutouts: [3, 4] },
  "view.shadow": { faces: [0], cutouts: [], retainedSolids: [1] },
  "arrange.backward": { faces: [1], cutouts: [], retainedSolids: [0] },
  "arrange.back": { faces: [0], cutouts: [], retainedSolids: [2] },
  "state.info": { faces: [0], cutouts: [1, 2], solidStrokedCutouts: [1] },
  "media.save": { faces: [0], cutouts: [1, 2] },
  "media.gallery": { faces: [0], cutouts: [2, 3], solidCutouts: [3] },
  "social.service.whatsapp": { faces: [0], cutouts: [1], solidCutouts: [1] },
  "action.settings": { faces: [0], cutouts: [1] },
  "social.service.instagram": { faces: [0], cutouts: [1, 2] },
  "social.service.dribbble": { faces: [0], cutouts: [1, 2, 3] },
  "insert.highlight": { faces: [1], cutouts: [2] },
  "action.edit": { faces: [0], cutouts: [2] },
  "document.from-template": { faces: { "Regular-S": [1], "Regular-M": [2], "Regular-L": [2] }, cutouts: { "Regular-S": [2, 3], "Regular-M": [3, 4, 5], "Regular-L": [3, 4, 5] } },
  "state.warning": { faces: [0], cutouts: [1, 2], solidCutouts: [1, 2] },
  "action.help": { faces: [0], cutouts: [1, 2], solidCutouts: [2] },
  "state.caution": { faces: [0], cutouts: [1, 2], solidCutouts: [2] },
  "device.mobile": { faces: [0], cutouts: [1], solidCutouts: [1] },
  "insert.video": { faces: [0], cutouts: [1], solidCutouts: [1] },
  "layout.column": { faces: [0], cutouts: [1], solidCutouts: [1] },
  "text.caption": { faces: [0], cutouts: [1, 2, 3], solidCutouts: [1, 2, 3] },
  "arrange.group": { faces: [0], cutouts: [1, 2], solidCutouts: [1, 2] },
  "arrange.ungroup": { faces: [0, 1], cutouts: [2, 3], solidCutouts: [2, 3] },
  "site.identity": { faces: [0], cutouts: [1, 2, 3], solidCutouts: [2] },
  "table.row-before": { faces: [0], cutouts: tableActionCutouts },
  "table.row-after": { faces: [0], cutouts: tableActionCutouts },
  "table.column-before": { faces: [0], cutouts: tableActionCutouts },
  "table.column-after": { faces: [0], cutouts: tableActionCutouts },
  "table.row-delete": { faces: [0], cutouts: tableActionCutouts },
  "table.column-delete": { faces: [0], cutouts: tableActionCutouts },
  "commerce.store": { faces: [0], cutouts: { "Regular-S": [], "Regular-M": [3, 4], "Regular-L": [3, 4] } },
  "social.service.twitch": { faces: [0], cutouts: [1, 2] },
  "view.snap": { faces: [0], cutouts: [1, 2] },
  "text.language": { faces: [0], cutouts: [1, 2, 3, 4, 5] },
  "location.marker": { faces: [0], cutouts: [1] },
  "media.camera": { faces: [0], cutouts: [1] },
  "insert.image": { faces: [0], cutouts: [1, 2] },
  "social.block": { faces: [2, 3, 4], cutouts: [] },
  "view.show": { faces: [1], cutouts: [] },
  "action.paste": { faces: [1], cutouts: [] },
  "document.cover": { faces: [0], cutouts: [1, 2] },
  "account.record": { faces: [0], cutouts: [1, 2, 3, 4, 5] },
  "scope.all": { faces: [0], cutouts: [1, 2, 3, 4] },
  "component.block": { faces: [0], cutouts: [1, 2, 3] },
  "action.adjust": { faces: [4, 5], cutouts: [] },
  "text.keyboard": { faces: [0], cutouts: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  "block.image": { faces: [0], cutouts: [1] },
  "insert.embed": { faces: [0], cutouts: [1, 2, 3] },
  "layout.columns": { faces: [0], cutouts: [1, 2] },
  "layout.grid": { faces: [0], cutouts: [1, 2] },
  "layout.drawer-left": { faces: [0], cutouts: [1] },
  "layout.drawer-right": { faces: [0], cutouts: [1] },
  "layout.template": { faces: [0], cutouts: [1, 2] },
  "block.table": { faces: [0], cutouts: [1, 2, 3] },
  "document.new-post": { faces: [0], cutouts: [1, 2, 3, 4] },
  "output.backup": { faces: [0], cutouts: [1, 2, 3, 4] },
  "view.fit": { faces: [0], cutouts: [] },
  "device.tablet": { faces: [0], cutouts: [1] },
  "document.featured-image": { faces: [0], cutouts: [1] },
  "account.author": { faces: [0], cutouts: [] },
  "media.video-camera": { faces: [0, 1], cutouts: [] },
  "block.meta": { faces: [4, 5], cutouts: [] },
  "security.key": { faces: [0], cutouts: [] },
  "style.colour": { faces: [0], cutouts: [] },
  "action.tip": { faces: [0], cutouts: [] },
  "arrange.rotate": { faces: [2], cutouts: [] },
  "taxonomy.category": { faces: [0, 1, 2, 3], cutouts: [] },
  "block.default": { faces: [0], cutouts: [] },
  "view.single": { faces: [0], cutouts: [1, 2, 3] },
  "view.pages": { faces: [1], cutouts: [2, 3] },
  "document.new-page": { faces: [0], cutouts: [1, 2, 3] },
  "commerce.receipt": { faces: [0], cutouts: [1, 2, 3] },
  "action.clear": { faces: [0], cutouts: [] },
  "state.inherited": { faces: [0], cutouts: [] },
  "view.zoom-in": { faces: [0], cutouts: [2, 3] },
  "view.zoom-out": { faces: [0], cutouts: [2] },
  "library.designs": { faces: [0, 1, 2, 3], cutouts: [] },
  "insert.shapes": { faces: [0, 1, 2], cutouts: [] },
  "insert.step": { faces: [0], cutouts: [1, 2] },
  "action.filter": { faces: [0], cutouts: [] },
  "insert.button": { faces: [0], cutouts: [1] },
  "time.clock": { faces: [0], cutouts: [1] },
  "view.layers": { faces: [0], cutouts: [] },
  "tool.select": { faces: [0], cutouts: [] },
  "security.shield": { faces: [0], cutouts: [] },
  "communication.comment": { faces: [0], cutouts: [] },
  "device.desktop": { faces: [0], cutouts: [] },
  "security.lock": { faces: [1], cutouts: [2] },
  "security.unlock": { faces: [1], cutouts: [2] },
  "action.add-circle": { faces: [0], cutouts: [1, 2] },
  "state.error": { faces: [0], cutouts: [1, 2] },
  "state.published": { faces: [0], cutouts: [1] },
  "navigation.home": { faces: [0, 1], cutouts: [2] },
  "library.files": { faces: [0], cutouts: [1] },
  "action.search": { faces: [0], cutouts: [] },
  "action.copy": { faces: [1], cutouts: [] },
  "action.duplicate": { faces: [1], cutouts: [2, 3] },
  "action.archive": { faces: [0, 1], cutouts: [2] },
  "action.delete": { faces: [1, 2], cutouts: [3, 4] },
  "communication.bell": { faces: [0], cutouts: [] },
  "communication.envelope": { faces: [0], cutouts: [1] },
  "time.calendar": { faces: [0], cutouts: [3, 4, 5, 6, 7, 8] },
  "taxonomy.tag": { faces: [0], cutouts: [1] },
});

const escapeXml = value => value.replace(/[<>&"']/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]);

export function hasFilledIcon(name) { return Object.hasOwn(treatments, name); }

/** Original master paths, split at move commands only where faces need separate paint. */
export function filledIconPaths(name, scale) {
  if (!hasFilledIcon(name) || !Object.hasOwn(iconGeometry[name] ?? {}, scale)) throw new Error("Unknown filled icon or scale");
  const paths = iconGeometry[name][scale].paths;
  return paths.flatMap(path => path.d.split(/ +(?=M )/).map(d => ({ d })));
}

export function filledIconArtwork(name, scale) {
  const paths = filledIconPaths(name, scale);
  const { faces: configuredFaces, cutouts: configuredCutouts } = treatments[name];
  const faces = Array.isArray(configuredFaces) ? configuredFaces : configuredFaces[scale];
  const cutouts = Array.isArray(configuredCutouts) ? configuredCutouts : configuredCutouts[scale];
  const solidCutouts = treatments[name].solidCutouts ?? (name === "taxonomy.tag" ? [1] : []);
  const solidStrokedCutouts = treatments[name].solidStrokedCutouts ?? [];
  const retainedSolids = treatments[name].retainedSolids ?? [];
  const strokeWidth = iconGeometry[name][scale].strokeWidth;
  if (faces.some(index => index >= paths.length)) throw new Error("Filled treatment does not match outline master");
  const availableCutouts = cutouts.filter(index => index < paths.length);
  const cutoutSet = new Set(availableCutouts);
  return { paths, faces, cutouts: availableCutouts, solidCutouts, solidStrokedCutouts, retainedSolids, strokes: paths.map((_, index) => index).filter(index => !cutoutSet.has(index) && !retainedSolids.includes(index)), strokeWidth };
}

/** Portable monochrome SVG using the same master geometry and paint treatment as React. */
export function createFilledSvg(name, scale, size) {
  if (!Number.isInteger(size) || size < 1 || size > 512) throw new Error("Invalid filled icon size");
  const { paths, faces, cutouts, solidCutouts, solidStrokedCutouts, retainedSolids, strokes, strokeWidth } = filledIconArtwork(name, scale);
  const { label, description } = iconMetadata[name];
  const path = index => paths[index].d;
  const mask = cutouts.length ? `<defs><mask id="cutouts" maskUnits="userSpaceOnUse"><rect width="24" height="24" fill="white" />${cutouts.map(index => `<path d="${path(index)}" fill="${solidCutouts.includes(index) || solidStrokedCutouts.includes(index) ? "black" : "none"}" stroke="${solidCutouts.includes(index) ? "none" : "black"}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`).join("")}</mask></defs>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">\n  <title>${escapeXml(label)}</title>\n  <desc>${escapeXml(description)}</desc>\n  ${mask}\n  <g${cutouts.length ? ' mask="url(#cutouts)"' : ""} fill="#1C1C1E">${faces.map(index => `<path d="${path(index)}" />`).join("")}</g>\n  <g fill="#1C1C1E">${retainedSolids.map(index => `<path d="${path(index)}" />`).join("")}</g>\n  <g stroke="#1C1C1E" stroke-width="${strokeWidth}">${strokes.map(index => `<path d="${path(index)}" />`).join("")}</g>\n</svg>\n`;
}
