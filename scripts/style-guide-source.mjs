import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { indexStyleGuide } from "../app/studio/ui/styles/style-guide-tokens.mjs";

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
