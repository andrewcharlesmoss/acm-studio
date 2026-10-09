import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serializeStyleGuideSource } from "./style-guide-source.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const projectsDirectory = path.resolve(projectDirectory, "..");
const governanceDirectory = path.join(projectsDirectory, "workspace-governance");
const stylesDirectory = path.join(projectsDirectory, "acm-styles");
const guidePath = path.join(governanceDirectory, "STYLE_GUIDE.md");
const presetPath = path.join(stylesDirectory, "src/universal-style-preset.json");
const outputPath = path.join(projectDirectory, "app/studio/ui/styles/style-guide-source.json");

const serialized = serializeStyleGuideSource({ guidePath, presetPath, governanceDirectory });

if (process.argv.includes("--check")) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (existing !== serialized) {
    console.error("Bundled Style Guide source is out of date. Run npm run styles:source after updating the guide.");
    process.exitCode = 1;
  }
} else {
  fs.writeFileSync(outputPath, serialized);
  console.log(`Generated Style Guide source from the canonical files at ${path.relative(projectDirectory, outputPath)}`);
}
