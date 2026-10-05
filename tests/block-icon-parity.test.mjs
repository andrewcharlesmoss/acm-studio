import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import test from "node:test";
import { iconGeometry, iconMetadata, iconNames, iconScales } from "@acm/icons";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
const require = createRequire(import.meta.url);
function load(file, cache = new Map()) {
  file = resolve(file);
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const source = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const dependency = id => {
    if (!id.startsWith(".")) return require(id);
    const base = resolve(dirname(file), id);
    return load([base, `${base}.ts`, `${base}.tsx`].find(existsSync), cache);
  };
  vm.runInNewContext(source, { exports, require: dependency, console, URL, Map, Set });
  return exports;
}
const { blockLibraryEntries } = load("app/studio/blocks/library-catalogue.ts");
const { blockLibrarySymbol, BlockLibraryIcon, BlockLibraryIconSample } = load("app/studio/block-library-icons.tsx");

test("every canonical block including non-insertable types resolves to safe shared optical artwork", () => {
  assert.equal(blockLibraryEntries.length, 29);
  assert.equal(new Set(blockLibraryEntries.map(entry => entry.type)).size, 29);
  assert.ok(blockLibraryEntries.some(entry => entry.type === "footnotes"));
  assert.ok(blockLibraryEntries.some(entry => entry.type === "template-content"));
  for (const entry of blockLibraryEntries) {
    const symbol = blockLibrarySymbol(entry.type);
    assert.equal(symbol.source, "ACM Icons", entry.type);
    assert.ok(iconNames.includes(symbol.symbol), entry.type);
    assert.match(iconMetadata[symbol.symbol].provenance, /Original ACM/);
    for (const [index, scale] of iconScales.entries()) {
      const markup = renderToStaticMarkup(createElement(BlockLibraryIconSample, { type: entry.type, scale, size: [16, 24, 32][index] }));
      assert.match(markup, /aria-hidden="true"/);
      assert.match(markup, /focusable="false"/);
      for (const path of iconGeometry[symbol.symbol][scale].paths) assert.ok(markup.includes(path.d), `${entry.type}:${scale}`);
    }
    const normal = renderToStaticMarkup(createElement(BlockLibraryIcon, { type: entry.type }));
    const medium = renderToStaticMarkup(createElement(BlockLibraryIconSample, { type: entry.type, scale: "Regular-M", size: 24 }));
    assert.equal(normal, medium, entry.type);
  }
});

test("block identities use recognisable semantic glyphs while generic formatting and selection stay distinct", () => {
  const expected = { heading: "block.heading", list: "block.list", table: "block.table", code: "block.code", image: "block.image", column: "layout.column", columns: "layout.columns", group: "layout.flow", footnotes: "text.list-numbered", component: "component.block", "template-content": "document.content", "document-title": "document.title", "cover-image": "document.featured-image", "post-author": "account.author", "post-date": "document.date", "social-icons": "social.block" };
  for (const [type, name] of Object.entries(expected)) assert.equal(blockLibrarySymbol(type).symbol, name);
  for (const [block, generic] of [["block.heading", "text.heading"], ["block.list", "text.list-bulleted"], ["block.table", "table.cell"], ["block.code", "text.code"], ["block.image", "insert.image"], ["social.block", "social.icons"]]) {
    for (const scale of iconScales) assert.notDeepEqual(iconGeometry[block][scale].paths, iconGeometry[generic][scale].paths, `${block}:${scale}`);
  }
});

test("all editor identities use the central mapping without system-block fallback remapping", () => {
  const canvas = readFileSync("app/studio/studio-canvas.tsx", "utf8");
  const identities = canvas.slice(canvas.indexOf("function TransformIcon"), canvas.indexOf("function BlockInserter"));
  assert.match(identities, /BlockLibraryIcon type=\{transform.target\}/);
  assert.match(identities, /BlockLibraryIcon type=\{type\}/);
  assert.doesNotMatch(identities, /text\.code|text\.list-bulleted|insert\.image|type === "footnotes"|type === "column"/);
  assert.match(identities, /HeadingLevelIcon level=\{transform.level\}/);
  assert.match(identities, /HeadingLevelIcon level=\{headingLevel \?\? 2\}/);
  assert.match(readFileSync("app/studio/ui/icons-catalogue.tsx", "utf8"), /const blockLibraryCatalogue = blockLibraryEntries/);
});
