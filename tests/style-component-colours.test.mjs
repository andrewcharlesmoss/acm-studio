import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const styleConsumers = [
  "app/layout.tsx",
  "app/studio/controls/button.tsx",
  "app/studio/controls/button.css",
  "app/studio/ui/styles/style-guide-sandbox.tsx",
  "app/studio/ui/styles/interface-style-sandbox.tsx",
  "app/studio/ui/styles/website-layout-editor-example.ts",
  "app/studio/ui/global-catalogue.tsx",
  "app/studio/ui/styles/canonical-source-lines.css",
  "app/studio/ui/styles/interface-style-sandbox.css",
  "app/studio/ui/styles/website-layout-preview.css",
  "../acm-styles/src/styles.css",
];
function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.(?:css|mjs|ts|tsx)$/.test(entry.name) ? [file] : [];
  });
}

test("shared style components and specimens consume tokens instead of embedding hex colours", () => {
  const files = [...new Set([...sourceFiles(path.join(root, "app/studio/ui/styles")), ...styleConsumers.map(file => path.resolve(root, file))])];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /#[\da-f]{3,8}\b/i, `${path.relative(root, file)} contains a hard-coded hex colour`);
  }
});
