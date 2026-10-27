import { testSiteVersion } from "./test-site-fixture.mjs";
import { withHtmlDom } from "./html-dom-fixture.mjs";
import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';
const { tableCellPresentation, setTableCellAlignment } = await loadProductionModule(new URL('../app/content/table-presentation.ts', import.meta.url));
const { applyTableStructureAction } = await loadProductionModule(new URL('../app/content/table-actions.ts', import.meta.url));
const { validContentBlocks, validateStudioWorkspace } = await loadProductionModule(new URL('../app/studio/workspace-validation.ts', import.meta.url));
const { initialStudioWorkspace } = await loadProductionModule(new URL('../app/studio/editor-model.ts', import.meta.url));
const { blocksToHtml, blockToHtml, parseHtmlToBlock } = await loadProductionModule(new URL('../app/studio/studio-html-editor.ts', import.meta.url));
const base = { id: 'table', type: 'table', hasHeader: true, rows: [['Heading', 'Value'], ['Body', 'Detail']], columnAlignments: ['left', 'right'] };
test('explicit Left overrides a centred header without changing legacy defaults or adjacent cells', () => {
  assert.deepEqual(tableCellPresentation(base, 0, 0), {});
  const next = setTableCellAlignment(base, { rowIndex: 0, columnIndex: 0 }, { textAlign: 'left' });
  assert.deepEqual(tableCellPresentation(next, 0, 0), { textAlign: 'left' });
  assert.deepEqual(tableCellPresentation(next, 1, 0), {});
  assert.deepEqual(tableCellPresentation(next, 0, 1), { textAlign: 'right' });
  assert.equal(base.cellMetadata, undefined);
  assert.equal(setTableCellAlignment(base, { rowIndex: -1, columnIndex: 0 }, { textAlign: 'left' }), base);
});
test('every cell direction, reset and column scope share one resolver', () => {
  for (const verticalAlign of ['top', 'middle', 'bottom']) for (const textAlign of ['left', 'centre', 'right']) {
    const next = setTableCellAlignment(base, { rowIndex: 1, columnIndex: 0 }, { textAlign, verticalAlign }, 'column');
    for (const row of [0, 1]) assert.deepEqual(tableCellPresentation(next, row, 0), { textAlign: textAlign === 'centre' ? 'center' : textAlign, verticalAlign });
    assert.equal(validContentBlocks([next]), true);
    const reset = setTableCellAlignment(next, { rowIndex: 1, columnIndex: 0 }, { textAlign: undefined, verticalAlign: undefined }, 'column');
    assert.equal(reset.cellMetadata, undefined);
    assert.equal(reset.columnStyles, undefined);
  }
});
test('structural edits preserve alignment and header semantics together', () => {
  let table = setTableCellAlignment(base, { rowIndex: 1, columnIndex: 0 }, { textAlign: 'left', verticalAlign: 'bottom' });
  table.cellMetadata[1][0] = { ...table.cellMetadata[1][0], tag: 'th', scope: 'row' };
  const row = applyTableStructureAction(table, 'insert-row-before', { rowIndex: 1, columnIndex: 0 }).block;
  assert.deepEqual(row.cellMetadata[2][0], table.cellMetadata[1][0]);
  const column = applyTableStructureAction(row, 'insert-column-before', { rowIndex: 2, columnIndex: 0 }).block;
  assert.deepEqual(column.cellMetadata[2][1], table.cellMetadata[1][0]);
  const restored = applyTableStructureAction(column, 'delete-column', { rowIndex: 2, columnIndex: 0 }).block;
  assert.deepEqual(restored.cellMetadata[2][0], table.cellMetadata[1][0]);
});
test('current workspaces round-trip alignment while older envelopes reject the new extension', () => {
  const block = setTableCellAlignment(base, { rowIndex: 0, columnIndex: 0 }, { textAlign: 'left', verticalAlign: 'bottom' });
  const document = { ...initialStudioWorkspace.documents[0], blocks: [block] };
  const workspace = { ...initialStudioWorkspace, version: 28, documents: [document], activeDocumentId: document.id, bin: [] };
  assert.deepEqual(validateStudioWorkspace(JSON.parse(JSON.stringify(workspace))).documents[0].blocks[0], JSON.parse(JSON.stringify(block)));
  assert.throws(() => validateStudioWorkspace({ ...workspace, version: 27 }));
  assert.equal(validContentBlocks([{ ...block, cellMetadata: [[{ verticalAlign: 'stretch' }, null], [null, null]] }]), false);
  assert.match(blocksToHtml([block]), /data-cell-align="left" data-cell-vertical-align="bottom"/);
});

test('column alignment remains a baseline for inserted rows and moves with columns', () => {
  const column = setTableCellAlignment(base, { rowIndex: 0, columnIndex: 0 }, { textAlign: 'left', verticalAlign: 'bottom' }, 'column');
  const inserted = applyTableStructureAction(column, 'insert-row-after', { rowIndex: 0, columnIndex: 0 }).block;
  assert.deepEqual(tableCellPresentation(inserted, 1, 0), { textAlign: 'left', verticalAlign: 'bottom' });
  const moved = applyTableStructureAction(inserted, 'insert-column-before', { rowIndex: 0, columnIndex: 0 }).block;
  assert.deepEqual(tableCellPresentation(moved, 1, 1), { textAlign: 'left', verticalAlign: 'bottom' });
  const deleted = applyTableStructureAction(moved, 'delete-column', { rowIndex: 0, columnIndex: 0 }).block;
  assert.deepEqual(deleted.columnStyles, column.columnStyles);
  assert.equal(validContentBlocks([deleted]), true);
});

test('HTML round-trip keeps per-cell choices separate from column baselines', () => withHtmlDom(() => {
  for (const scope of ['cell', 'column']) {
    const source = { ...base, columnAlignments: undefined };
    const block = setTableCellAlignment(source, { rowIndex: 0, columnIndex: 0 }, { textAlign: 'right', verticalAlign: 'bottom' }, scope);
    const result = parseHtmlToBlock(blockToHtml(block), block);
    assert.ok('block' in result, result.error);
    assert.deepEqual(tableCellPresentation(result.block, 0, 0), { textAlign: 'right', verticalAlign: 'bottom' });
    assert.deepEqual(tableCellPresentation(result.block, 1, 0), scope === 'cell' ? {} : { textAlign: 'right', verticalAlign: 'bottom' });
  }
}));

test('the fixture document adapter accepts a new alignment before the owning save', async () => {
  const { validTestSiteDocument, testDocumentFromEditor, testSiteCollection } = await loadProductionModule(new URL('../app/studio/test-site/contract.ts', import.meta.url));
  const original = { ...initialStudioWorkspace.documents[0], kind: 'page', slug: '', id: 'test-site' };
  const source = testSiteCollection({ format: 'acm-test-site', version: 2, siteId: 'test', document: original });
  const migrated = testSiteVersion({ ...source, globalTemplates: [], publications: [] },10);
  assert.equal(validTestSiteDocument(migrated), true);
  const next = { ...original, blocks: [setTableCellAlignment(base, { rowIndex: 0, columnIndex: 0 }, { textAlign: 'left' })] };
  // A v9 website source must be upgraded by this pre-save portability check.
  const candidate = testDocumentFromEditor(next, { ...migrated, version: 9, websiteDesign: { identity: {}, styles: {} } });
  assert.ok(candidate);
  assert.equal(candidate.version, 12);
  assert.equal(validTestSiteDocument(candidate), true);
});
