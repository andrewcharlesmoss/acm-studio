import assert from "node:assert/strict";
import test from "node:test";
import { iconGeometry, iconMetadata, iconScales } from "../dist/index.js";
const additions = ["block.heading", "block.list", "block.table", "block.code", "block.image", "layout.column", "document.title", "document.featured-image", "account.author", "document.date", "document.content", "social.block"];
test("block identities have three distinct authored optical variants and original provenance", () => {
  for (const name of additions) {
    assert.match(iconMetadata[name].provenance, /Original ACM optical geometry.*no third-party paths/);
    assert.equal(iconMetadata[name].golden, false);
    assert.equal(new Set(iconScales.map(scale => JSON.stringify(iconGeometry[name][scale].paths))).size, 3, name);
  }
});
test("block silhouettes preserve filled Heading and Column marks and plain Table and Code outlines", () => {
  for (const scale of iconScales) {
    for (const name of ["block.heading", "layout.column", "document.date"]) assert.ok(iconGeometry[name][scale].paths.some(path => path.fill === "currentColor"), name);
    assert.equal(iconGeometry["block.code"][scale].paths.length, 1);
    assert.equal((iconGeometry["block.code"][scale].paths[0].d.match(/M /g) ?? []).length, 2, "two chevrons without a slash");
    assert.ok(iconGeometry["block.table"][scale].paths.every(path => !path.fill), "table has no selected cell");
    assert.equal((iconGeometry["document.content"][scale].paths[0].d.match(/M /g) ?? []).length, 4, "content has four body rules");
    assert.equal(iconGeometry["social.block"][scale].paths.length, 4, "connectors and three outlined square share nodes");
  }
});
