import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseStyleGuidePresets } from "../app/studio/ui/styles/style-guide-tokens.mjs";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const styleGuideMarkdown = readFileSync(path.resolve(project, "../workspace-governance/STYLE_GUIDE.md"), "utf8");
const parsed = parseStyleGuidePresets(styleGuideMarkdown);
export const universalPreset = parsed.universalPreset;
export const interfacePreset = parsed.interfacePreset;
export const createUniversalStylePreset = () => structuredClone(universalPreset);
export const createInterfaceStylePreset = () => structuredClone(interfacePreset);
