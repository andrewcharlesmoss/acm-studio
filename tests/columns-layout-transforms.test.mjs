import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { availableBlockTransformsInDocument, transformBlock } = await load("../app/studio/block-transforms.ts");
const { validContentBlocks } = await load("../app/studio/workspace-validation.ts");
const { findContentBlock } = await load("../app/content/block-tree.ts");

function columnsFixture() {
  return {
    id: "columns-root",
    type: "columns",
    gap: 24,
    columnGap: 32,
    stackAt: "tablet",
    siteRole: "eyebrow",
    style: { padding: "12px", textColor: "#123456" },
    visualStyle: { borderColor: "#654321" },
    children: [
      {
        id: "column-first",
        type: "column",
        width: 35,
        allowedBlocks: ["paragraph"],
        verticalAlign: "centre",
        style: { backgroundColor: "#eeeeee" },
        visualStyle: { textColor: "#123456" },
        siteRole: "eyebrow",
        editorial: { name: "Intro" },
        children: [{ id: "column-first-paragraph", type: "paragraph", text: "First column" }],
      },
      {
        id: "column-second",
        type: "column",
        width: 320,
        widthUnit: "px",
        style: { padding: "8px" },
        children: [{ id: "column-second-heading", type: "heading", level: 2, text: "Second column" }],
      },
    ],
  };
}

test("Columns transforms preserve children, wrapper identities, styling and widths in Row", () => {
  const columns = columnsFixture();
  const choices = availableBlockTransformsInDocument(columns, [columns]);
  const choice = choices.find(item => item.id === "columns-to-row");
  assert.ok(choice);

  let nextId = 0;
  const row = transformBlock(columns, choice, () => `style-layer-${++nextId}`);
  assert.equal(row.type, "group");
  assert.equal(row.id, columns.id);
  assert.equal(row.layout, "row");
  assert.equal(row.allowSizingOnChildren, true);
  assert.equal(row.allowWrap, false);
  assert.equal(row.stackAt, "tablet");
  assert.equal(row.siteRole, "eyebrow");
  assert.deepEqual(row.visualStyle, { ...columns.visualStyle, ...columns.style });
  assert.equal(row.children[0].id, "column-first");
  assert.equal(row.children[0].visualStyle.flexItemSizing.size, "35%");
  assert.equal(row.children[0].visualStyle.textColor, "#123456");
  assert.equal(row.children[0].siteRole, "eyebrow");
  assert.equal(row.children[1].visualStyle.flexItemSizing.size, "320px");
  assert.deepEqual(row.children[0].allowedBlocks, ["paragraph"]);
  assert.deepEqual(row.children[0].editorial, { name: "Intro" });
  assert.equal(row.children[1].visualStyle.padding, "8px");
  assert.equal(findContentBlock([row], "column-first-paragraph").text, "First column");
  assert.equal(findContentBlock([row], "column-second-heading").text, "Second column");
  assert.equal(validContentBlocks([row]), true);
  assert.equal(validContentBlocks([columns]), true, "the source is not mutated");
});

test("Columns transforms preserve content in a fixed-count Grid", () => {
  const columns = columnsFixture();
  const choice = availableBlockTransformsInDocument(columns, [columns]).find(item => item.id === "columns-to-grid");
  assert.ok(choice);

  let nextId = 0;
  const grid = transformBlock(columns, choice, () => `style-layer-${++nextId}`);
  assert.equal(grid.layout, "grid");
  assert.equal(grid.gridMode, "manual");
  assert.equal(grid.columns, 2);
  assert.equal(findContentBlock([grid], "column-first-paragraph").text, "First column");
  assert.equal(findContentBlock([grid], "column-second-heading").text, "Second column");
  assert.equal(grid.children[0].visualStyle.textColor, "#123456");
  assert.equal(grid.children[0].siteRole, "eyebrow");
  assert.equal(grid.children[0].visualStyle.flexItemSizing, undefined, "Grid uses equal-width grid tracks rather than Row child sizing");
  assert.equal(validContentBlocks([grid]), true);
});

test("Columns layout transforms respect locks and parent block restrictions", () => {
  const columns = columnsFixture();
  assert.deepEqual(availableBlockTransformsInDocument({ ...columns, editorial: { lock: { move: true } } }, [{ ...columns, editorial: { lock: { move: true } } }]), []);
  const lockedColumn = { ...columns, children: [{ ...columns.children[0], editorial: { lock: { remove: true } } }, columns.children[1]] };
  assert.deepEqual(availableBlockTransformsInDocument(lockedColumn, [lockedColumn]), []);
  const restrictedParent = { id: "restricted", type: "group", layout: "flow", allowedBlocks: ["columns"], children: [columns] };
  assert.deepEqual(availableBlockTransformsInDocument(columns, [restrictedParent]), []);
});
