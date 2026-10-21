import guideMarkdown from "../../../../../workspace-governance/STYLE_GUIDE.md?raw";
import { parseStyleGuidePresets, indexStyleGuide } from "./style-guide-tokens.mjs";

// The Markdown is imported as source text. These validated objects and the
// inspector index exist only in memory; STYLE_GUIDE.md remains authoritative.
export let STYLE_GUIDE_MARKDOWN = guideMarkdown.replace(/\r\n/g, "\n");
const initialPresets = parseStyleGuidePresets(STYLE_GUIDE_MARKDOWN);
export let UNIVERSAL_STYLE_PRESET = initialPresets.universalPreset;
export let INTERFACE_STYLE_PRESET = initialPresets.interfacePreset;
export let STYLE_GUIDE_INDEX = indexStyleGuide(STYLE_GUIDE_MARKDOWN, UNIVERSAL_STYLE_PRESET, INTERFACE_STYLE_PRESET);

export function createUniversalStylePreset() {
  return structuredClone(UNIVERSAL_STYLE_PRESET);
}

export function createInterfaceStylePreset() {
  return structuredClone(INTERFACE_STYLE_PRESET);
}

export let BUNDLED_STYLE_GUIDE_SOURCE = {
  schemaVersion: 1,
  sourcePath: "workspace-governance/STYLE_GUIDE.md",
  sourceRevision: "working-tree",
  sourceWorkingTree: true,
  sourceDigest: "",
  document: STYLE_GUIDE_MARKDOWN,
  ...STYLE_GUIDE_INDEX,
};

/** Replace in-memory defaults after a local source read or verified save. */
export function installCanonicalStyleGuide(document: string) {
  const normalized = document.replace(/\r\n/g, "\n");
  const parsed = parseStyleGuidePresets(normalized);
  STYLE_GUIDE_MARKDOWN = normalized;
  UNIVERSAL_STYLE_PRESET = parsed.universalPreset;
  INTERFACE_STYLE_PRESET = parsed.interfacePreset;
  STYLE_GUIDE_INDEX = indexStyleGuide(normalized, UNIVERSAL_STYLE_PRESET, INTERFACE_STYLE_PRESET);
  BUNDLED_STYLE_GUIDE_SOURCE = { ...BUNDLED_STYLE_GUIDE_SOURCE, document: normalized, ...STYLE_GUIDE_INDEX };
}
