import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';
const load = name => loadProductionModule(new URL(name, import.meta.url));
const { availableBlockTransformsInDocument, transformBlock } = await load('../app/studio/block-transforms.ts');
const { validContentBlocks } = await load('../app/studio/workspace-validation.ts');
const table = {
  id: 'table', type: 'table', rows: [['Heading', 'Value'], ['First\nsecond', '42'], ['Total', '42']],
  cellRuns: [[[{ text: 'Heading', marks: ['bold'] }], [{ text: 'Value' }]], [[{ text: 'First\nsecond', marks: ['italic'] }], [{ text: '42' }]], [[{ text: 'Total' }], [{ text: '42' }]]],
  cellMetadata: [[null, null], [{ tag: 'th', scope: 'row', textAlign: 'right', verticalAlign: 'bottom' }, null], [null, null]],
  hasHeader: true, hasFooter: true, headerRowCount: 1, footerRowCount: 1,
  columnWidths: [35, 65], rowHeights: [45, 80, 50], columnAlignments: ['centre', 'right'], columnStyles: [{ textAlign: 'centre' }, { verticalAlign: 'top' }],
  caption: 'A rich caption', captionRuns: [{ text: 'A rich caption', marks: ['bold'] }], fixedWidth: false, tableStyle: 'stripes', blockAlign: 'wide',
  visualStyle: { padding: '12px', borderStyle: 'solid', borderWidth: '2px', borderColor: '#123456' }, editorial: { name: 'Retained table' },
};

test('Table Columns and Group wrap the complete original record without conversion', () => {
  assert.equal(validContentBlocks([table]), true);
  for (const id of ['wrap-group', 'wrap-columns']) {
    const transform = availableBlockTransformsInDocument(table, [table]).find(choice => choice.id === id);
    assert.ok(transform);
    let count = 0;
    const wrapped = transformBlock(table, transform, () => `wrapper-${count++}`);
    const child = wrapped.type === 'columns' ? wrapped.children[0].children[0] : wrapped.children[0];
    assert.equal(child, table);
    assert.equal(wrapped.blockAlign, 'wide');
    assert.equal(validContentBlocks([wrapped]), true);
    assert.equal(child.rows[1][0], 'First\nsecond');
    assert.deepEqual(child.captionRuns, table.captionRuns);
    if (wrapped.type === 'columns') assert.equal(wrapped.children[0].width, 100);
  }
});

test('Table wrapping honours locks, parent constraints, and complete document depth', () => {
  const wrappers = (block, blocks) => availableBlockTransformsInDocument(block, blocks).filter(choice => choice.id.startsWith('wrap-'));
  for (const lock of [{ move: true }, { remove: true }]) {
    const locked = { ...table, editorial: { lock } };
    assert.equal(wrappers(locked, [locked]).length, 0);
  }
  assert.equal(wrappers(table, [{ id: 'restricted', type: 'quote', text: '', children: [table] }]).length, 0);
  for (const count of [7, 8]) {
    let root = table;
    for (let index = 0; index < count; index++) root = { id: `parent-${index}`, type: 'group', layout: 'flow', children: [root] };
    assert.equal(validContentBlocks([root]), true, 'The existing tree itself is valid at the depth boundary');
    const choices = wrappers(table, [root]);
    assert.ok(!choices.some(choice => choice.id === 'wrap-columns'));
    if (count === 8) assert.equal(choices.length, 0);
  }
  assert.equal(wrappers(table, []).length, 0, 'A stale table outside the document cannot offer structural changes');
});

test('Table section and structural changes retain surviving rich cells and captions', async () => {
  const { setTableSection, resetTableSettings } = await load('../app/content/table-sections.ts');
  const { applyTableStructureAction } = await load('../app/content/table-actions.ts');
  const withoutSections = resetTableSettings(table);
  assert.deepEqual(withoutSections.rows, [table.rows[1]]);
  assert.deepEqual(withoutSections.cellRuns, [table.cellRuns[1]]);
  assert.deepEqual(withoutSections.cellMetadata, [table.cellMetadata[1]]);
  assert.deepEqual(withoutSections.captionRuns, table.captionRuns);
  const header = setTableSection(withoutSections, 'header', true);
  assert.deepEqual(header.rows[0], ['', '']);
  assert.deepEqual(header.rows[1], table.rows[1]);
  for (const [insert, remove] of [['insert-row-after', 'delete-row'], ['insert-column-after', 'delete-column']]) {
    const added = applyTableStructureAction(table, insert, { rowIndex: 1, columnIndex: 0 });
    assert.ok(added);
    const restored = applyTableStructureAction(added.block, remove, added.activeCell).block;
    for (const field of ['rows', 'cellRuns', 'cellMetadata', 'captionRuns', 'columnWidths', 'rowHeights', 'columnStyles']) assert.deepEqual(restored[field], table[field], field);
  }
});
