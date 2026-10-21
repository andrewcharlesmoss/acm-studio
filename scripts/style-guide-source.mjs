import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { validateInterfaceStylePreset, validateUniversalStylePreset } from "../../acm-styles/src/index.ts";
import { indexStyleGuide, projectStyleGuideTokens } from "../app/studio/ui/styles/style-guide-tokens.mjs";

export function createStyleGuideSource(document, preset, interfacePreset, sourceRevision, sourceWorkingTree = false) {
  return {
    schemaVersion: 1, sourcePath: "workspace-governance/STYLE_GUIDE.md", sourceRevision,
    sourceWorkingTree,
    sourceDigest: createHash("sha256").update(document).digest("hex"),
    document, ...indexStyleGuide(document, preset, interfacePreset),
  };
}

export function guideProvenance(governanceDirectory) {
  const git = args => execFileSync("git", ["-C", governanceDirectory, ...args], { encoding: "utf8" });
  return { revision: git(["log", "-1", "--format=%H", "--", "STYLE_GUIDE.md"]).trim(), committed: git(["show", "HEAD:STYLE_GUIDE.md"]) };
}

export function serializeStyleGuideSource({ guidePath, presetPath, governanceDirectory }) {
  const document = readFileSync(guidePath, "utf8").replace(/\r\n/g, "\n");
  const preset = validateUniversalStylePreset(JSON.parse(readFileSync(presetPath, "utf8")));
  const interfacePresetPath = presetPath.replace("universal-style-preset.json", "interface-style-preset.json");
  const interfacePreset = validateInterfaceStylePreset(JSON.parse(readFileSync(interfacePresetPath, "utf8")));
  if (projectStyleGuideTokens(document, preset, interfacePreset) !== document) throw new Error("Style Guide token tables differ from the presets. Save shared styles in the local Studio to synchronise them.");
  const provenance = guideProvenance(governanceDirectory);
  return `${JSON.stringify(createStyleGuideSource(document, preset, interfacePreset, provenance.revision, document !== provenance.committed), null, 2)}\n`;
}
