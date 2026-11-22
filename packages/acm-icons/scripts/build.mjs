import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const check = process.argv.includes("--check");
export const scales = ["Regular-S", "Regular-M", "Regular-L"];
const escapeXml = (value) => value.replace(/[<>&]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[character]);
const addedAt = JSON.parse(readFileSync(resolve(root, "added-at.json"), "utf8"));
const modifiedAt = JSON.parse(readFileSync(resolve(root, "modified-at.json"), "utf8"));
const catalogue = JSON.parse(readFileSync(resolve(root, "catalogue.json"), "utf8"));
const compatibilityAliases = { "brand.linkedin": "social.service.linkedin", "brand.tiktok": "social.service.tiktok" };

export function parseMaster(source) {
  const header = /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">\s*<title>[A-Za-z0-9 ,&;-]+<\/title>\s*<desc>[A-Za-z0-9 ,&;.-]+<\/desc>\s*/;
  if (!header.test(source) || !source.endsWith("</svg>\n")) throw new Error("Invalid SVG document");
  let rest = source.replace(header, "").replace(/<\/svg>\n$/, "");
  const variants = {};
  for (const scale of scales) {
    const group = rest.match(/^<g id="(Regular-[SML])" stroke-width="(2|1\.75|1\.5|1|2\.7|2\.35|2\.05)">\s*([\s\S]*?)<\/g>\s*/);
    if (!group || group[1] !== scale) throw new Error("Invalid or missing scale");
    rest = rest.slice(group[0].length);
    const paths = [];
    let body = group[3];
    while (body.trim()) {
      const path = body.match(/^<path (?:d="([MLCQZ0-9., -]+)"( fill="currentColor")?( fill-rule="evenodd")?( stroke="none")?|fill="currentColor"( fill-rule="evenodd")?( stroke="none")? d="([MLCQZ0-9., -]+)") \/>\s*/);
      if (!path) throw new Error("Unsafe or unsupported SVG path");
      const d = path[1] || path[7];
      if (!d.startsWith("M ") || !/[0-9]/.test(d)) throw new Error("Invalid path data");
      // Consume the entire lexical input. The master format deliberately uses
      // space-separated absolute commands, never permissive SVG separators.
      if (!/^(?:[MLCQZ]|-?\d+(?:\.\d+)?)(?: +(?:[MLCQZ]|-?\d+(?:\.\d+)?))*$/.test(d)) throw new Error("Invalid path token or separator");
      // The restricted absolute path grammar makes attributes and resources impossible.
      const tokens = d.split(/ +/);
      while (tokens.length) {
        const command = tokens.shift();
        const count = { M: 2, L: 2, C: 6, Q: 4, Z: 0 }[command];
        if (count === undefined || tokens.length < count) throw new Error("Invalid path command");
        for (let index = 0; index < count; index++) {
          const coordinate = Number(tokens.shift());
          if (!Number.isFinite(coordinate) || coordinate < 0 || coordinate > 24) throw new Error("Invalid coordinate");
        }
      }
      paths.push({ d, ...(path[2] || path[7] ? { fill: "currentColor" } : {}), ...(path[3] || path[5] ? { fillRule: "evenodd" } : {}), ...(path[4] || path[6] ? { stroke: "none" } : {}) });
      body = body.slice(path[0].length);
    }
    if (!paths.length) throw new Error("Empty scale");
    variants[scale] = { strokeWidth: Number(group[2]), paths };
  }
  if (rest.trim()) throw new Error("Unexpected SVG content");
  return variants;
}

export function buildFiles() {
  const names = catalogue.map((icon) => icon.name);
  if (new Set(names).size !== names.length) throw new Error("Duplicate icon name");
  if (Object.keys(addedAt).length !== names.length || names.some((name) => !addedAt[name] || !Number.isFinite(Date.parse(addedAt[name])) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(addedAt[name]))) throw new Error("Invalid or incomplete icon addition timestamps");
  if (Object.keys(modifiedAt).length !== names.length || names.some((name) => !modifiedAt[name] || !Number.isFinite(Date.parse(modifiedAt[name])) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(modifiedAt[name]) || Date.parse(modifiedAt[name]) < Date.parse(addedAt[name]))) throw new Error("Invalid or incomplete icon modification timestamps");
  const masters = readdirSync(resolve(root, "masters")).sort();
  if (JSON.stringify(masters) !== JSON.stringify(names.map((name) => name + ".svg").sort())) throw new Error("Master inventory mismatch");
  const geometry = {};
  const metadata = {};
  const files = {};
  for (const icon of catalogue) {
    if (!/^[a-z]+(?:[.-][a-z]+)+$/.test(icon.name) || !icon.description || !icon.provenance || !icon.keywords.length) throw new Error("Invalid metadata");
    metadata[icon.name] = icon;
    geometry[icon.name] = parseMaster(readFileSync(resolve(root, "masters", icon.name + ".svg"), "utf8"));
    for (const scale of scales) {
      const glyph = geometry[icon.name][scale];
      files["dist/svg/" + icon.name + "/" + scale + ".svg"] =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + glyph.strokeWidth + '" stroke-linecap="round" stroke-linejoin="round">\n' +
        (icon.licenceNotice ? "<metadata>" + escapeXml(icon.licenceNotice) + "</metadata>\n" : "") +
        glyph.paths.map((path) => '<path d="' + path.d + '"' + (path.fill ? ' fill="currentColor"' : '') + (path.fillRule ? ' fill-rule="evenodd"' : '') + (path.stroke ? ' stroke="none"' : '') + ' />').join("\n") + "\n</svg>\n";
    }
  }
  const exportedAddedAt = { ...addedAt };
  const exportedModifiedAt = { ...modifiedAt };
  for (const [alias, canonical] of Object.entries(compatibilityAliases)) {
    if (!geometry[canonical] || geometry[alias]) throw new Error("Invalid icon compatibility alias");
    geometry[alias] = geometry[canonical];
    metadata[alias] = { ...metadata[canonical], name: alias, label: canonical.endsWith("linkedin") ? "LinkedIn" : "TikTok", description: canonical.endsWith("linkedin") ? "A LinkedIn profile link" : "A TikTok profile link" };
    exportedAddedAt[alias] = addedAt[canonical];
    exportedModifiedAt[alias] = modifiedAt[canonical];
    for (const scale of scales) files["dist/svg/" + alias + "/" + scale + ".svg"] = files["dist/svg/" + canonical + "/" + scale + ".svg"];
  }
  files["dist/metadata.json"] = JSON.stringify(metadata, null, 2) + "\n";
  files["dist/added-at.json"] = JSON.stringify(exportedAddedAt, null, 2) + "\n";
  files["dist/modified-at.json"] = JSON.stringify(exportedModifiedAt, null, 2) + "\n";
  files["dist/index.js"] = "// Generated from editable masters. Do not edit.\nexport const iconNames = " + JSON.stringify(names) + ";\nexport const iconScales = " + JSON.stringify(scales) + ";\nexport const iconMetadata = " + JSON.stringify(metadata) + ";\nexport const iconGeometry = " + JSON.stringify(geometry) + ';\nexport function svgAssetPath(name, scale = "Regular-M") { if (!iconGeometry[name]?.[scale]) throw new Error("Unknown icon or scale"); return "@acm/icons/svg/" + name + "/" + scale + ".svg"; }\n';
  files["dist/index.js"] += "export function resolveIconName(name) { const aliases = " + JSON.stringify(compatibilityAliases) + "; return Object.hasOwn(aliases, name) ? aliases[name] : (Object.hasOwn(iconGeometry, name) ? name : undefined); }\n";
  files["dist/index.js"] += "export const iconAddedAt = " + JSON.stringify(exportedAddedAt) + ";\n";
  files["dist/index.js"] += "export const iconModifiedAt = " + JSON.stringify(exportedModifiedAt) + ";\n";
  files["dist/index.d.ts"] = "export type IconName = " + [...names, ...Object.keys(compatibilityAliases)].map((name) => JSON.stringify(name)).join(" | ") + ';\nexport type IconScale = "Regular-S" | "Regular-M" | "Regular-L";\nexport type IconMetadata = { name: IconName; label: string; description: string; keywords: string[]; golden: boolean; provenance: string; licenceNotice?: string };\nexport declare const iconNames: readonly IconName[];\nexport declare const iconScales: readonly IconScale[];\nexport declare const iconMetadata: Record<IconName, IconMetadata>;\nexport declare const iconGeometry: Record<IconName, Record<IconScale, { strokeWidth: number; paths: { d: string; fill?: string; fillRule?: "evenodd"; stroke?: "none" }[] }>>;\nexport declare function svgAssetPath(name: IconName, scale?: IconScale): string;\n';
  files["dist/index.d.ts"] += "export declare function resolveIconName(name: string): IconName | undefined;\n";
  files["dist/index.d.ts"] += "export declare const iconAddedAt: Record<IconName, string>;\n";
  files["dist/index.d.ts"] += "export declare const iconModifiedAt: Record<IconName, string>;\n";
  return files;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = buildFiles();
  for (const [path, content] of Object.entries(files)) {
    const absolute = resolve(root, path);
    if (check) {
      if (readFileSync(absolute, "utf8") !== content) throw new Error("Generated asset drift: " + path);
    } else {
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, content);
    }
  }
  console.log((check ? "Verified " : "Generated ") + Object.keys(files).length + " files for " + catalogue.length + " symbols.");
}
