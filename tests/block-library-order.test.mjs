import { createIsolatedModuleLoader } from "./production-module.mjs";
import assert from "node:assert/strict";
import { readStudioSource } from "./studio-module-source.mjs";
import test from "node:test";
import { readFileSync } from "node:fs";

const sharedLoader = createIsolatedModuleLoader({ globals: { crypto } });
function load(url) {
  return sharedLoader(url);
}
const model = load(new URL("../app/studio/editor-model.ts", import.meta.url));
const options = load(new URL("../app/studio/block-inserter-options.ts", import.meta.url));
const plain = value => JSON.parse(JSON.stringify(value));

test("supported block tiles follow Gutenberg category and registration order", () => {
  assert.deepEqual(plain(model.blockCatalogueGroups), ["Text", "Media", "Design", "Widgets", "Theme", "Embeds", "Other"]);
  const expected = {
    Text: ["paragraph", "heading", "list", "quote", "code", "table"], Media: ["image"],
    Design: ["buttons", "button", "columns", "group", "row", "stack", "grid", "divider", "spacer"],
    Widgets: ["social-icons", "social-linkedin", "social-tiktok"],
    Theme: ["document-title", "cover-image", "post-author", "post-date"],
    Embeds: ["embed"], Other: ["section", "field", "reading-time", "document-subtitle"],
  };
  for (const [group, types] of Object.entries(expected)) assert.deepEqual(plain(model.blockCatalogue.filter(entry => entry.group === group).map(entry => entry.type)), types);
  assert.deepEqual(plain([...new Set(model.blockCatalogue.map(entry => entry.group))]), plain(model.blockCatalogueGroups));
});

test("catalogue includes the four Group variations and keeps the template slot separate", () => {
  const types = model.blockCatalogue.map(entry => entry.type);
  assert.equal(types.length, 28); assert.equal(new Set(types).size, 28);
  assert.equal(types.includes("template-content"), false);
  for (const unsupported of ["gallery", "audio", "video", "details", "file", "pullquote", "preformatted", "verse"]) assert.equal(types.includes(unsupported), false);
  assert.equal(model.templateContentBlock.group, "Theme");
  assert.equal(model.templateContentBlock.type, "template-content");
});

test("ordinary content insertion follows Gutenberg ownership while Studio-only blocks remain scoped", () => {
  const ordinaryTypes = model.contentEditorBlockCatalogue.map(entry => entry.type);
  for (const type of ["social-linkedin", "social-tiktok", "section", "field"]) assert.equal(ordinaryTypes.includes(type), false);
  assert.equal(ordinaryTypes.includes("group"), true);
  assert.deepEqual(plain(model.socialIconCatalogue.map(entry => entry.type)), ["social-linkedin", "social-tiktok"]);
  const rootChoices = options.blockInserterOptions(model.contentEditorBlockCatalogue, undefined, "").map(entry => entry.type);
  assert.ok(rootChoices.includes("buttons"));
  assert.equal(rootChoices.includes("button"), false);
  assert.equal(rootChoices.includes("social-icons"), true);
  // The Library remains a complete supported/compatibility inventory.
  const { blockLibraryEntries } = load(new URL("../app/studio/blocks/library-catalogue.ts", import.meta.url));
  for (const type of ["social-linkedin", "social-tiktok", "section", "field"]) assert.equal(blockLibraryEntries.some(entry => entry.type === type), true);
});

test("description search and structural parent filtering retain canonical tile order", () => {
  const text = options.blockInserterOptions(model.blockCatalogue, undefined, "code");
  assert.deepEqual(plain(text.map(entry => entry.type)), ["code"]);
  const group = { id: "group", type: "group", children: [], allowedBlocks: ["heading", "paragraph", "table"] };
  assert.deepEqual(plain(options.blockInserterOptions(model.blockCatalogue, group, "")), plain(options.blockInserterOptions(model.blockCatalogue, { ...group, allowedBlocks: undefined }, "")));
  const social = { id: "social", type: "social-icons", children: [] };
  assert.deepEqual(plain(options.blockInserterOptions(model.blockCatalogue, social, "", model.socialIconCatalogue).map(entry => entry.type)), ["social-linkedin", "social-tiktok"]);
});

test("docked tiles use three equal columns and retain descriptions without visible prose", () => {
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /\.inserter-group > div\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  const responsive = readFileSync(new URL("../app/studio/responsive.css", import.meta.url), "utf8");
  for (const [, rule] of responsive.matchAll(/\.inserter-group > div\s*\{([^}]+)\}/g)) assert.match(rule, /repeat\(3, minmax\(0, 1fr\)\)/);
  const source = readStudioSource("app/studio/studio-canvas.tsx");
  const inserter = source.slice(source.indexOf("function BlockInserter("), source.indexOf("function ColumnsLayoutChooser("));
  assert.match(inserter, /blockCatalogueGroups\.map/);
  assert.match(inserter, /title=\{item\.description\}/);
  assert.match(inserter, /<strong>\{item\.label\}<\/strong>/);
  assert.doesNotMatch(inserter, /<small>\{item\.description\}/);
  assert.match(inserter, /application\/x-acm-studio-block/);
});
