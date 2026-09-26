import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const projectsDirectory = path.resolve(projectDirectory, "..");
const governanceDirectory = path.join(projectsDirectory, "workspace-governance");
const stylesDirectory = path.join(projectsDirectory, "acm-styles");
const guidePath = path.join(governanceDirectory, "STYLE_GUIDE.md");
const presetPath = path.join(stylesDirectory, "src/universal-style-preset.json");
const outputPath = path.join(projectDirectory, "app/studio/ui/styles/style-guide-source.json");

const guide = fs.readFileSync(guidePath, "utf8");
const committedGuide = execFileSync("git", ["-C", governanceDirectory, "show", "HEAD:STYLE_GUIDE.md"], { encoding: "utf8" });
if (guide !== committedGuide) {
  throw new Error("Commit workspace-governance/STYLE_GUIDE.md before generating the Studio source bundle.");
}
const preset = JSON.parse(fs.readFileSync(presetPath, "utf8"));
const lines = guide.replace(/\r\n/g, "\n").split("\n");
const headings = [];
const rowByPath = new Map();
let currentHeading = "Style Guide";

for (const [index, text] of lines.entries()) {
  const headingMatch = /^(#{1,6})\s+(.+)$/.exec(text);
  if (headingMatch) {
    currentHeading = headingMatch[2].trim();
    headings.push({ level: headingMatch[1].length, text: currentHeading, line: index + 1 });
  }

  if (!text.startsWith("| ")) continue;
  const cells = text.split("|").slice(1, -1).map(cell => cell.trim());
  const key = cells[0]?.replace(/^`|`$/g, "");
  if (key && !/^[-: ]+$/.test(key)) rowByPath.set(key, { line: index + 1, excerpt: text, heading: currentHeading });
}

function allPaths(value, prefix = "") {
  return Object.entries(value).flatMap(([key, nested]) => {
    const current = prefix ? `${prefix}.${key}` : key;
    return nested && typeof nested === "object" && !Array.isArray(nested)
      ? [current, ...allPaths(nested, current)]
      : [current];
  });
}

function sourceRowPath(stylePath) {
  if (stylePath.startsWith("palette.")) return stylePath;
  if (stylePath.startsWith("typography.") || stylePath.startsWith("buttons.")) return stylePath.split(".").slice(0, 2).join(".");
  if (stylePath.startsWith("layout.")) return stylePath;
  if (stylePath.startsWith("specimen.")) return stylePath;
  return null;
}

const stylePaths = [
  ...allPaths(preset.palette, "palette"),
  ...allPaths(preset.typography, "typography"),
  ...allPaths(preset.buttons, "buttons"),
  ...allPaths(preset.layout, "layout"),
  "specimen.link",
  "specimen.unordered-list",
  "specimen.ordered-list",
  "specimen.quote",
];
const mappings = {};
for (const stylePath of stylePaths) {
  const rowPath = sourceRowPath(stylePath);
  const reference = rowPath && rowByPath.get(rowPath);
  if (!reference) throw new Error(`No Style Guide row found for ${stylePath}`);
  mappings[stylePath] = { ...reference, rowPath };
}

const sourceRevision = execFileSync("git", ["-C", governanceDirectory, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const document = lines.join("\n");
const output = {
  schemaVersion: 1,
  sourcePath: "workspace-governance/STYLE_GUIDE.md",
  sourceRevision,
  sourceDigest: crypto.createHash("sha256").update(document).digest("hex"),
  document,
  headings,
  mappings,
};
const serialized = `${JSON.stringify(output, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (existing !== serialized) {
    console.error("Bundled Style Guide source is out of date. Run npm run styles:source after committing the guide.");
    process.exitCode = 1;
  }
} else {
  fs.writeFileSync(outputPath, serialized);
  console.log(`Generated Style Guide source from ${sourceRevision.slice(0, 7)} at ${path.relative(projectDirectory, outputPath)}`);
}
