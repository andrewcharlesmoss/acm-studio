import { iconGeometry, iconMetadata, resolveIconName } from "../dist/index.js";

// Monochrome service treatments follow WordPress's logos-only social palette.
// Multicolour treatments below are generated ACM interpretations of brand references.
const colours = Object.freeze({
  wordpress: "#3499CD", fivehundredpx: "#000000", amazon: "#FF9900", bandcamp: "#1EA0C3", behance: "#0757FE", bluesky: "#0A7AFF", codepen: "#1E1F26", deviantart: "#02E49B", discord: "#5865F2", dribbble: "#E94C89", dropbox: "#0061FE", etsy: "#F45800", facebook: "#0866FF", flickr: "#0461DD", foursquare: "#E65678", goodreads: "#382110", google: "#4285F4", github: "#24292D", gravatar: "#1D4FC4", instagram: "#F00075", lastfm: "#E21B24", linkedin: "#0D66C2", mastodon: "#6364FF", meetup: "#F6405F", medium: "#000000", patreon: "#000000", pinterest: "#E60122", pocket: "#EF4155", reddit: "#FF4500", snapchat: "#000000", soundcloud: "#FF5600", spotify: "#1BD760", telegram: "#2AABEE", threads: "#000000", tiktok: "#000000", tumblr: "#011835", twitch: "#6440A4", twitter: "#1DA1F2", vimeo: "#1EB7EA", vk: "#4680C2", whatsapp: "#25D366", x: "#000000", yelp: "#D32422", youtube: "#FF0000"
});

export function hasSocialBrandVariant(name) {
  const canonical = typeof name === "string" ? resolveIconName(name) : undefined;
  return !!canonical && canonical.startsWith("social.service.") && Object.hasOwn(colours, canonical.slice(15));
}

/** The returned data contains only package-owned, bounded artwork and colours. */
export function socialBrandAsset(name, scale = "Regular-M") {
  const canonical = typeof name === "string" ? resolveIconName(name) : undefined;
  if (!canonical || !hasSocialBrandVariant(canonical) || !Object.hasOwn(iconGeometry[canonical], scale)) throw new Error("Unknown social icon or scale");
  const service = canonical.slice(15);
  const glyph = iconGeometry[canonical][scale];
  let background, gradient;
  let paths = glyph.paths.map(path => ({ ...path, fill: path.fill ? colours[service] : "none", stroke: path.stroke === "none" ? "none" : colours[service], strokeWidth: glyph.strokeWidth }));
  if (service === "amazon") {
    const parts = glyph.paths[0].d.split(" Z M ");
    if (parts.length !== 4) throw new Error("Invalid Amazon geometry");
    paths = [{ d: parts[0] + " Z M " + parts[1] + " Z", fill: "#111111", fillRule: "evenodd", stroke: "none" }, { d: "M " + parts[2] + " Z M " + parts[3], fill: "#FF9900", fillRule: "evenodd", stroke: "none" }];
  } else if (service === "youtube") {
    const parts = glyph.paths[0].d.split(" Z M ");
    if (parts.length !== 2) throw new Error("Invalid YouTube geometry");
    paths = [{ d: parts[0] + " Z", fill: "#FF0000", stroke: "none" }, { d: "M " + parts[1], fill: "#FFFFFF", stroke: "none" }];
  } else if (service === "linkedin") {
    const outer = glyph.paths[0].d.split(" Z M ")[0] + " Z";
    paths = [{ d: outer, fill: "#FFFFFF", stroke: "none" }, ...paths];
  } else if (service === "flickr") {
    const [first, second] = glyph.paths[0].d.split(" Z M ");
    if (!second) throw new Error("Invalid Flickr geometry");
    paths = [{ d: first + " Z", fill: "#0063DC", stroke: "none" }, { d: "M " + second, fill: "#FF0084", stroke: "none" }];
  } else if (service === "instagram") {
    background = { fill: "gradient", rx: 5 };
    gradient = { x1: "0%", y1: "100%", x2: "100%", y2: "0%", stops: [["0%", "#FEDA75"], ["30%", "#FA7E1E"], ["55%", "#D62976"], ["78%", "#962FBF"], ["100%", "#4F5BD5"]] };
    paths = glyph.paths.map(path => ({ ...path, fill: "none", stroke: "#FFFFFF", strokeWidth: glyph.strokeWidth }));
  } else if (service === "google") {
    gradient = { x1: "0%", y1: "100%", x2: "100%", y2: "0%", stops: [["0%", "#34A853"], ["28%", "#FBBC05"], ["52%", "#EA4335"], ["78%", "#4285F4"], ["100%", "#4285F4"]] };
    paths = paths.map(path => ({ ...path, fill: path.fill === "none" ? "none" : "gradient", stroke: path.stroke === "none" ? "none" : "gradient" }));
  } else if (service === "snapchat") {
    background = { fill: "#FFFC00", rx: 5 };
    paths = glyph.paths.map(path => ({ ...path, fill: "#FFFFFF", stroke: "#000000", strokeWidth: 1 }));
  } else if (service === "tiktok") {
    const layer = (colour, offset = 0) => glyph.paths.map(path => ({ ...path, fill: path.fill ? colour : "none", stroke: path.stroke === "none" ? "none" : colour, strokeWidth: glyph.strokeWidth, transform: `translate(1.2 1.2) scale(0.9) translate(${offset} 0)` }));
    paths = [...layer("#25F4EE", -1.5), ...layer("#FE2C55", 1.5), ...layer("#000000")];
  }
  return { background, gradient, paths };
}

const paint = (value, id) => value === "gradient" ? `url(#${id})` : value;
/** Self-contained SVG suitable for export; callers cannot provide markup or colours. */
export function createSocialBrandSvg(name, scale = "Regular-M", size = 24) {
  if (!Number.isInteger(size) || size < 1 || size > 512) throw new Error("Choose a valid icon size");
  const asset = socialBrandAsset(name, scale), id = "social-brand-gradient";
  const metadata = iconMetadata[resolveIconName(name)];
  const escape = value => value.replace(/[<>&"']/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&apos;" })[character]);
  const gradient = asset.gradient ? `<defs><linearGradient id="${id}" x1="${asset.gradient.x1}" y1="${asset.gradient.y1}" x2="${asset.gradient.x2}" y2="${asset.gradient.y2}">${asset.gradient.stops.map(([offset, colour]) => `<stop offset="${offset}" stop-color="${colour}" />`).join("")}</linearGradient></defs>` : "";
  const background = asset.background ? `<rect x="1" y="1" width="22" height="22" rx="${asset.background.rx}" fill="${paint(asset.background.fill, id)}" />` : "";
  const paths = asset.paths.map(path => `<path d="${path.d}" fill="${paint(path.fill, id)}" stroke="${paint(path.stroke, id)}"${path.strokeWidth ? ` stroke-width="${path.strokeWidth}"` : ""}${path.fillRule ? ` fill-rule="${path.fillRule}"` : ""}${path.transform ? ` transform="${path.transform}"` : ""} />`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><title>${escape(metadata.label)}</title><desc>${escape(metadata.description)}</desc>${gradient}${background}${paths}</svg>`;
}
