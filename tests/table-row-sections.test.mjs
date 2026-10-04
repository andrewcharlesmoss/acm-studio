import assert from "node:assert/strict";
import test from "node:test";
import { tableRowSections, tableRowSectionAt, tableSectionAttributes, validTableRowSections } from "../app/content/table-row-sections.ts";

const table = { id: "table", type: "table", rows: [["Header 1"], ["Header 2"], ["Body"], ["Footer 1"], ["Footer 2"]], hasHeader: true, headerRowCount: 2, hasFooter: true, footerRowCount: 2 };

test("explicit sections retain flat row boundaries and correct owning section", () => {
  assert.deepEqual(tableRowSections(table), { headerRowCount: 2, footerRowCount: 2, bodyStart: 2, bodyEnd: 3 });
  assert.deepEqual(table.rows.map((_, row) => tableRowSectionAt(table, row)), ["header", "header", "body", "footer", "footer"]);
  assert.equal(validTableRowSections(table), true);
});

test("legacy section flags still describe one row and clamp insufficient content", () => {
  const legacy = { ...table, headerRowCount: undefined, footerRowCount: undefined };
  assert.deepEqual(tableRowSections(legacy), { headerRowCount: 1, footerRowCount: 1, bodyStart: 1, bodyEnd: 4 });
  assert.deepEqual(tableRowSections({ ...legacy, rows: [["Only row"]] }), { headerRowCount: 1, footerRowCount: 0, bodyStart: 1, bodyEnd: 1 });
  assert.equal(validTableRowSections({ ...legacy, rows: [] }), true);
});

test("section flags and counts are removed together without changing source", () => {
  assert.deepEqual(tableSectionAttributes(0, 2), { headerRowCount: undefined, hasHeader: undefined, footerRowCount: 2, hasFooter: true });
  assert.deepEqual(tableSectionAttributes(0, 0), { headerRowCount: undefined, hasHeader: undefined, footerRowCount: undefined, hasFooter: undefined });
  assert.equal(table.headerRowCount, 2);
});

test("invalid explicit counts, flag disagreement and section overlap are rejected", () => {
  for (const count of [-1, 1.5, 6, NaN, Infinity, "2", null]) assert.equal(validTableRowSections({ ...table, headerRowCount: count }), false);
  assert.equal(validTableRowSections({ ...table, hasHeader: false }), false);
  assert.equal(validTableRowSections({ ...table, footerRowCount: 4 }), false);
  assert.equal(validTableRowSections({ ...table, headerRowCount: 0, hasHeader: undefined }), true);
});
