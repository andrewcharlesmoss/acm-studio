import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, overrides = {}, cache = new Map()) {
  file = resolve(file);
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const source = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const dependency = id => {
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (id.endsWith(".css")) return {};
    if (!id.startsWith(".")) return require(id);
    const base = resolve(dirname(file), id);
    const path = [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}.js`].find(existsSync);
    return load(path, overrides, cache);
  };
  vm.runInNewContext(source, { exports, require: dependency, console, URL, Map, Set });
  return exports;
}
const { setTableSection, resetTableSettings } = load("app/content/table-sections.ts");
const { validContentBlocks } = load("app/studio/workspace-validation.ts");
const plain = value => JSON.parse(JSON.stringify(value));
const body = () => ({ id: "table", type: "table", rows: [["Body", "Value"], ["Second", "2"]], cellRuns: [[[{ text: "Body", marks: ["bold"] }], [{ text: "Value" }]], [[{ text: "Second" }], [{ text: "2" }]]], cellMetadata: [[{ tag: "th", scope: "row" }, null], [null, null]], rowHeights: [60, 70], columnWidths: [40, 60], columnAlignments: ["centre", "right"], caption: "Caption", tableStyle: "stripes" });

test("section switches insert separate blank rows and preserve body contracts", () => {
  const original = body();
  const header = setTableSection(original, "header", true);
  const both = setTableSection(header, "footer", true);
  assert.deepEqual(plain(both.rows), [["", ""], ...original.rows, ["", ""]]);
  assert.deepEqual(plain(both.cellRuns), [[[], []], ...original.cellRuns, [[], []]]);
  assert.deepEqual(plain(both.cellMetadata), [[null, null], ...original.cellMetadata, [null, null]]);
  assert.deepEqual(plain(both.rowHeights), [42, 60, 70, 42]);
  for (const field of ["columnWidths", "columnAlignments", "caption", "tableStyle"]) assert.equal(both[field], original[field]);
  assert.equal(validContentBlocks([both]), true);
  assert.equal(both.hasHeader, true); assert.equal(both.hasFooter, true);
  assert.equal(setTableSection(both, "header", true), both);
  const removed = setTableSection(setTableSection(both, "header", false), "footer", false);
  assert.deepEqual(plain(removed), plain({ ...original, hasHeader: undefined, hasFooter: undefined }));
  assert.deepEqual(original.rows, [["Body", "Value"], ["Second", "2"]]);
});

test("removing populated sections removes their content without reclassifying body cells", () => {
  const original = body();
  const table = { ...setTableSection(setTableSection(original, "header", true), "footer", true), fixedWidth: false };
  table.rows[0] = ["Heading", "Label"]; table.cellRuns[0] = [[{ text: "Heading" }], [{ text: "Label" }]];
  table.rows[3] = ["Footer", "Total"]; table.cellRuns[3] = [[{ text: "Footer" }], [{ text: "Total" }]];
  const reset = resetTableSettings(table);
  assert.deepEqual(plain(reset.rows), original.rows);
  assert.deepEqual(plain(reset.cellMetadata), original.cellMetadata);
  assert.deepEqual(plain(reset.cellRuns), original.cellRuns);
  assert.deepEqual(plain(reset.rowHeights), [60, 70]);
  assert.equal(reset.fixedWidth, undefined);
  const headerReset = resetTableSettings(table, ["hasHeader"]);
  assert.equal(headerReset.hasFooter, true); assert.equal(headerReset.fixedWidth, false);
  assert.deepEqual(plain(headerReset.rows), [...original.rows, ["Footer", "Total"]]);
  assert.equal(table.rows[0][0], "Heading");
});

test("single body row supports both sections in either order, without optional grids", () => {
  const original = { id: "one", type: "table", rows: [["Only body"]] };
  for (const order of [["header", "footer"], ["footer", "header"]]) {
    let table = original;
    for (const section of order) table = setTableSection(table, section, true);
    assert.deepEqual(plain(table.rows), [[""], ["Only body"], [""]]);
    assert.equal(table.cellRuns, undefined); assert.equal(table.cellMetadata, undefined); assert.equal(table.rowHeights, undefined);
    for (const section of order) table = setTableSection(table, section, false);
    assert.deepEqual(plain(table.rows), original.rows);
  }
  const empty = { ...original, rows: [] };
  assert.equal(setTableSection(empty, "header", true), empty);
  assert.equal(setTableSection(empty, "footer", true), empty);
});

test("fixed layout reset preserves rows, text formatting and section flags", () => {
  const original = { ...setTableSection(body(), "header", true), fixedWidth: false };
  const reset = resetTableSettings(original, ["fixedWidth"]);
  assert.equal(reset.rows, original.rows); assert.equal(reset.cellRuns, original.cellRuns);
  assert.equal(reset.hasHeader, true); assert.equal(reset.fixedWidth, undefined);
});

test("inspector toggle and reset callbacks each publish one complete table update", () => {
  const { TableSettingsInspector } = load("app/studio/blocks/table-settings-inspector.tsx", { "../inspector-tools-section": { InspectorToolsSection() {} }, "../controls/toggle-setting": { ToggleSetting() {} } });
  const writes = [];
  const original = body();
  const inspector = TableSettingsInspector({ block: original, onChange: block => writes.push(block) });
  const [header, footer] = inspector.props.children[1].props.children;
  header.props.onChange(true);
  assert.equal(writes.length, 1); assert.equal(writes[0].rows.length, 3); assert.equal(writes[0].hasHeader, true);
  footer.props.onChange(true);
  assert.equal(writes.length, 2); assert.equal(writes[1].rows.length, 3); assert.equal(writes[1].hasFooter, true);
  const populated = TableSettingsInspector({ block: setTableSection(setTableSection(original, "header", true), "footer", true), onChange: block => writes.push(block) });
  populated.props.onReset();
  assert.equal(writes.length, 3); assert.deepEqual(plain(writes[2].rows), original.rows);
});

test("removing the final legacy section clears column-sized arrays for an empty table", () => {
  for (const section of ["header", "footer"]) {
    const original = { id: "legacy", type: "table", rows: [["Section"]], [section === "header" ? "hasHeader" : "hasFooter"]: true, columnWidths: [100], columnAlignments: ["right"], rowHeights: [60], cellRuns: [[[{ text: "Section" }]]], cellMetadata: [[null]] };
    const empty = setTableSection(original, section, false);
    assert.equal(validContentBlocks([empty]), true);
    assert.deepEqual(plain(empty.rows), []);
    for (const field of ["columnWidths", "columnAlignments", "hasHeader", "hasFooter"]) assert.equal(empty[field], undefined);
    for (const field of ["cellRuns", "cellMetadata", "rowHeights"]) assert.deepEqual(plain(empty[field]), []);
    assert.equal(original.columnWidths[0], 100);
  }
  const reset = resetTableSettings({ id: "sections", type: "table", rows: [["Head"], ["Foot"]], hasHeader: true, hasFooter: true, columnWidths: [100], columnAlignments: ["right"] });
  assert.equal(validContentBlocks([reset]), true);
  assert.deepEqual(plain(reset.rows), []); assert.equal(reset.columnWidths, undefined); assert.equal(reset.columnAlignments, undefined);
});

const { changedTableStructures } = load("app/studio/table-structure-selection.ts");
test("table cell selections invalidate on sections, dimensions, removal and Undo, including nested tables", () => {
  const original = body();
  const wrap = table => [{ id: "group", type: "group", children: [table] }];
  const header = setTableSection(original, "header", true);
  const changes = (a, b) => [...changedTableStructures(wrap(a), wrap(b))];
  assert.deepEqual(changes(original, header), ["table"]);
  assert.deepEqual(changes(header, original), ["table"]);
  assert.deepEqual(changes(original, { ...original, rows: [...original.rows, ["Third", "3"]] }), ["table"]);
  assert.deepEqual(changes(original, { ...original, rows: original.rows.map(row => [...row, ""]) }), ["table"]);
  assert.deepEqual([...changedTableStructures(wrap(original), [])], ["table"]);
  assert.deepEqual(changes(original, { ...original, fixedWidth: false }), []);
  assert.deepEqual(changes(original, { ...original, rows: [["Changed", "Value"], original.rows[1]] }), []);
});

test("structure changes discard both cell and caption selections without touching other tables", () => {
  const { staleTableTextSelection } = load("app/studio/table-structure-selection.ts");
  const changed = new Set(["table"]);
  assert.equal(staleTableTextSelection("table:cell:3:0", changed), true);
  assert.equal(staleTableTextSelection("table", changed), true);
  assert.equal(staleTableTextSelection("other:cell:3:0", changed), false);
  assert.equal(staleTableTextSelection("table-other", changed), false);
});

const { applyTableStructureAction, validTableActiveCell } = load("app/content/table-actions.ts");
const { tableRowSections, tableRowSectionAt } = load("app/content/table-row-sections.ts");
const multiSection = () => ({
  id: "multi", type: "table", hasHeader: true, hasFooter: true, headerRowCount: 2, footerRowCount: 2,
  rows: [["H1", "Label"], ["H2", "Detail"], ["Body", "Value"], ["F1", "Total"], ["F2", "Note"]],
  cellRuns: ["H1", "H2", "Body", "F1", "F2"].map((text, index) => [[{ text, marks: ["bold"] }], [{ text: ["Label", "Detail", "Value", "Total", "Note"][index] }]]),
  cellMetadata: [[null, null], [{ scope: "rowgroup" }, null], [{ tag: "th", scope: "row" }, null], [null, null], [null, null]],
  rowHeights: [45, 50, 60, 65, 70], columnWidths: [40, 60], columnAlignments: ["centre", "right"], caption: "Caption",
});

test("multi-row sections validate and keep shared flat boundaries", () => {
  const table = multiSection();
  assert.equal(validContentBlocks([table]), true);
  assert.deepEqual(plain(tableRowSections(table)), { headerRowCount: 2, footerRowCount: 2, bodyStart: 2, bodyEnd: 3 });
  assert.deepEqual(table.rows.map((_, index) => tableRowSectionAt(table, index)), ["header", "header", "body", "footer", "footer"]);
  for (const value of [-1, 1.5, NaN, Infinity, "2", 6]) assert.equal(validContentBlocks([{ ...table, headerRowCount: value }]), false);
  assert.equal(validContentBlocks([{ ...table, headerRowCount: 4 }]), false);
  assert.equal(validContentBlocks([{ ...table, hasHeader: false }]), false);
  assert.equal(validContentBlocks([{ ...table, footerRowCount: 0 }]), false);
});

for (const [section, rowIndex] of [["header", 1], ["body", 2], ["footer", 3]]) {
  for (const action of ["insert-row-before", "insert-row-after"]) test(`${action} keeps ${section} ownership and selects column zero`, () => {
    const table = multiSection();
    const result = applyTableStructureAction(table, action, { rowIndex, columnIndex: 1 });
    const at = rowIndex + Number(action.endsWith("after"));
    assert.equal(result.block.headerRowCount, 2 + Number(section === "header"));
    assert.equal(result.block.footerRowCount, 2 + Number(section === "footer"));
    assert.equal(tableRowSectionAt(result.block, at), section);
    assert.deepEqual(plain(result.activeCell), { rowIndex: at, columnIndex: 0 });
    assert.deepEqual(plain(result.block.rows[at]), ["", ""]);
    assert.equal(result.block.cellMetadata?.[at]?.[0] ?? null, null);
    assert.equal(validContentBlocks([result.block]), true);
    const restored = applyTableStructureAction(result.block, "delete-row", result.activeCell);
    assert.deepEqual(plain(restored.block), plain(table));
    assert.equal(restored.activeCell, null);
  });
}

test("deleting final section rows clears only that section and preserves body tags", () => {
  let table = multiSection();
  table = applyTableStructureAction(table, "delete-row", { rowIndex: 0, columnIndex: 0 }).block;
  table = applyTableStructureAction(table, "delete-row", { rowIndex: 0, columnIndex: 0 }).block;
  assert.equal(table.headerRowCount, undefined); assert.equal(table.hasHeader, undefined);
  assert.deepEqual(plain(table.rows), [["Body", "Value"], ["F1", "Total"], ["F2", "Note"]]);
  assert.deepEqual(plain(table.cellMetadata[0][0]), { tag: "th", scope: "row" });
  assert.equal(table.footerRowCount, 2);
  table = applyTableStructureAction(table, "delete-row", { rowIndex: 1, columnIndex: 0 }).block;
  table = applyTableStructureAction(table, "delete-row", { rowIndex: 1, columnIndex: 0 }).block;
  assert.equal(table.footerRowCount, undefined); assert.equal(table.hasFooter, undefined);
  assert.deepEqual(plain(table.rows), [["Body", "Value"]]);
  assert.equal(validContentBlocks([table]), true);
  const noBody = applyTableStructureAction(multiSection(), "delete-row", { rowIndex: 2, columnIndex: 0 }).block;
  assert.equal(noBody.headerRowCount, 2); assert.equal(noBody.footerRowCount, 2);
  assert.equal(tableRowSections(noBody).bodyStart, tableRowSections(noBody).bodyEnd);
  assert.equal(validContentBlocks([noBody]), true);
});

test("reset removes complete populated sections with all parallel row grids", () => {
  const table = multiSection();
  const reset = resetTableSettings(table);
  for (const field of ["rows", "cellRuns", "cellMetadata", "rowHeights"]) assert.deepEqual(plain(reset[field]), plain(table[field].slice(2, 3)));
  for (const field of ["hasHeader", "hasFooter", "headerRowCount", "footerRowCount"]) assert.equal(reset[field], undefined);
  assert.equal(reset.caption, table.caption);
  assert.equal(validContentBlocks([reset]), true);
});

test("final-column deletion clears all sections and optional grids without changing caption", () => {
  const table = multiSection();
  const one = applyTableStructureAction(table, "delete-column", { rowIndex: 4, columnIndex: 1 }).block;
  const empty = applyTableStructureAction(one, "delete-column", { rowIndex: 0, columnIndex: 0 });
  assert.deepEqual(plain(empty.block.rows), []); assert.equal(empty.activeCell, null);
  assert.deepEqual(plain(empty.block.cellRuns), []); assert.deepEqual(plain(empty.block.rowHeights), []);
  for (const field of ["hasHeader", "hasFooter", "headerRowCount", "footerRowCount", "columnWidths", "columnAlignments", "cellMetadata"]) assert.equal(empty.block[field], undefined);
  assert.equal(empty.block.caption, table.caption); assert.equal(validContentBlocks([empty.block]), true);
  assert.equal(validTableActiveCell(empty.block, { rowIndex: 0, columnIndex: 0 }), false);
});

test("changing section boundaries invalidates cell selection even with identical dimensions", () => {
  const table = multiSection();
  const next = { ...table, headerRowCount: 1, footerRowCount: 3 };
  assert.deepEqual([...changedTableStructures([table], [next])], [table.id]);
});

test("new envelopes preserve multi-section data and read the preceding versions", () => {
  const { initialStudioWorkspace } = load("app/studio/editor-model.ts");
  const { migrateStudioWorkspace, validatePublicationSnapshot } = load("app/studio/workspace-validation.ts");
  const workspace = plain(initialStudioWorkspace);
  workspace.documents[0].blocks.push(multiSection());
  assert.equal(workspace.version, 24);
  for (const version of [20, 21, 22, 23, 24]) {
    const restored = migrateStudioWorkspace({ ...workspace, version });
    assert.equal(restored.version, 24);
    assert.deepEqual(plain(restored.documents[0].blocks.at(-1)), multiSection());
  }
  for (const version of [13, 14, 15, 16, 17]) assert.doesNotThrow(() => validatePublicationSnapshot({ version, posts: [] }));
  const { emptyTemplateStore, validateTemplateStore } = load("app/studio/template-model.ts");
  const store = emptyTemplateStore(); assert.equal(store.version, "0.25.0");
  assert.equal(validateTemplateStore({ ...store, version: "0.21.0" }).version, "0.25.0");
  const { blocksToMiniGolfPageDefinition, parseMiniGolfPageDefinition } = load("app/studio/mini-golf-page-contract.ts");
  const definition = blocksToMiniGolfPageDefinition([multiSection()], { pageId: "page", instanceId: "instance", source: { revision: "fixture", fileHashes: {} } });
  assert.equal(definition.version, 5);
  for (const version of [1, 2, 3, 4, 5]) assert.deepEqual(plain(parseMiniGolfPageDefinition({ ...definition, version }).blocks), [multiSection()]);
});

test("Mini Golf game adapter accepts only its owned one-header/one-footer shape", () => {
  const { supportsMiniGolfRuntimeTable } = load("app/studio/mini-golf-table-authoring.ts");
  assert.equal(supportsMiniGolfRuntimeTable(multiSection()), false);
  assert.equal(supportsMiniGolfRuntimeTable({ id: "empty", type: "table", rows: [] }), false);
  assert.equal(supportsMiniGolfRuntimeTable({ id: "game", type: "table", hasHeader: true, hasFooter: true, rows: [["Hole", "Player", "Total"], ["1", "", ""], ["Total", "", ""]] }), true);
});
