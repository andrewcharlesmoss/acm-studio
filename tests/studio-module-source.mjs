import { readFileSync } from "node:fs";

const moduleGroups = {
  "app/studio/studio-canvas.tsx": [
    "app/studio/studio-canvas.tsx",
    "app/studio/blocks/editors/rich-text.tsx",
    "app/studio/blocks/editors/list.tsx",
    "app/studio/blocks/editors/table.tsx",
    "app/studio/blocks/paragraph/edit-field.tsx",
    "app/studio/blocks/hidden-block-placeholder.tsx",
    "app/studio/studio-hover-icon.tsx",
  ],
  "app/studio/studio-inspectors.tsx": [
    "app/studio/studio-inspectors.tsx",
    "app/studio/blocks/inspectors/document-inspector.tsx",
    "app/studio/blocks/inspectors/block-inspector.tsx",
    "app/studio/blocks/inspectors/paragraph-inspector.tsx",
  ],
  "app/components/content.tsx": [
    "app/components/content.tsx",
    "app/components/blocks/block-renderer.tsx",
    "app/components/blocks/rich-text.tsx",
    "app/components/blocks/list-table.tsx",
  ],
};

export function readStudioSource(path, encoding = "utf8") {
  const normalisedPath = path.replaceAll("\\", "/").replace(/^\.\.\//, "");
  const paths = moduleGroups[normalisedPath] ?? [normalisedPath];
  return paths.map(modulePath => readFileSync(new URL(`../${modulePath}`, import.meta.url), encoding)).join("\n");
}
