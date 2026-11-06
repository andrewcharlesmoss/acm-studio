import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { loadProductionModule } from './production-module.mjs';
import { commitHistory, undoHistory, redoHistory } from '../app/studio/studio-command-operations.mjs';

const { useStudioBlockCommands: createBlockCommands } = await loadProductionModule(new URL('../app/studio/use-studio-block-commands.ts', import.meta.url));
const { setColumnWidth, setColumnWidthUnit, findColumnsParent, columnsGridTemplate } = await loadProductionModule(new URL('../app/content/columns.ts', import.meta.url));
const { validContentBlocks, validateStudioWorkspace, validatePublicationSnapshot } = await loadProductionModule(new URL('../app/studio/workspace-validation.ts', import.meta.url));
const { initialStudioWorkspace } = await loadProductionModule(new URL('../app/studio/editor-model.ts', import.meta.url));
const templateModel = await loadProductionModule(new URL('../app/studio/template-model.ts', import.meta.url));
const { validateTemplatePackage } = await loadProductionModule(new URL('../app/studio/template-package.ts', import.meta.url));
const { validateStudioBackup } = await loadProductionModule(new URL('../app/studio/backup-store.ts', import.meta.url));
const { validateGlobalTemplateLibrary } = await loadProductionModule(new URL('../app/studio/global-template-contract.ts', import.meta.url));
const { blockToHtml, parseHtmlToBlock } = await loadProductionModule(new URL('../app/studio/studio-html-editor.ts', import.meta.url));
const clipboard = await loadProductionModule(new URL('../app/studio/block-clipboard.ts', import.meta.url));
const { withHtmlDom } = await import('./html-dom-fixture.mjs');
const columns = () => ({ id: 'columns', type: 'columns', children: [
  { id: 'left', type: 'column', width: 62, children: [{ id: 'left-text', type: 'paragraph', text: 'Left content' }] },
  { id: 'right', type: 'column', width: 38, children: [{ id: 'right-text', type: 'paragraph', text: 'Right content' }] },
] });
function harness(block = columns()) {
  let document = { id: 'document', blocks: [block] };
  const original = document;
  let writes = 0;
  const commands = createBlockCommands({ activeDocument: original, updateActiveDocument: update => {
    const next = update(document);
    if (next !== document) writes++;
    document = next;
  } });
  return { original, commands, get document() { return document; }, get writes() { return writes; }, replace(next) { document = next; } };
}
function assertContentPreserved(before, after) {
  assert.equal(after.id, before.id);
  assert.deepEqual(after.children.map(child => child.id), before.children.map(child => child.id));
  assert.deepEqual(after.children.map(child => child.children), before.children.map(child => child.children));
  assert.ok(Math.abs(after.children.reduce((sum, child) => sum + child.width, 0) - 100) < 1e-9);
}

test('Column width changes its parent once, retaining all content and unique IDs', () => {
  const h = harness();
  h.commands.updateColumnWidth(h.original.blocks[0], 'left', 25);
  assert.equal(h.writes, 1);
  assert.equal(h.document.blocks[0].children[0].type, 'column');
  assert.deepEqual(h.document.blocks[0].children.map(child => child.width), [25, 75]);
  assertContentPreserved(h.original.blocks[0], h.document.blocks[0]);
  assert.equal(validContentBlocks(h.document.blocks), true);
});

test('nested width changes preserve surrounding blocks and existing restricted content', () => {
  const parent = columns(); parent.children[0].allowedBlocks = ['heading'];
  const group = { id: 'group', type: 'group', layout: 'flow', children: [{ id: 'before', type: 'paragraph', text: 'Keep' }, parent] };
  const h = harness(group);
  h.commands.updateColumnWidth(parent, 'right', 70);
  assert.deepEqual(h.document.blocks[0].children[1].children.map(child => child.width), [30, 70]);
  assert.equal(h.document.blocks[0].children[0], group.children[0]);
  assertContentPreserved(parent, h.document.blocks[0].children[1]);
  assert.equal(findColumnsParent(h.document.blocks, 'right').id, 'columns');
});

test('stale, removed, switched and invalid graphs reject the entire change', () => {
  for (const mutation of [
    original => ({ ...original, id: 'another-document' }),
    original => ({ ...original, blocks: [] }),
    original => ({ ...original, blocks: [{ ...original.blocks[0], gap: 33 }] }),
    original => ({ ...original, blocks: [...original.blocks, { id: 'left-text', type: 'paragraph', text: 'Duplicate' }] }),
  ]) {
    const h = harness(); const changed = mutation(h.original); h.replace(changed);
    h.commands.updateColumnWidth(h.original.blocks[0], 'left', 25);
    assert.equal(h.document, changed); assert.equal(h.writes, 0);
  }
});

test('non-finite, missing-child, single-child and unchanged widths preserve history', () => {
  for (const width of [NaN, Infinity, -Infinity, 62]) {
    const h = harness(); h.commands.updateColumnWidth(h.original.blocks[0], 'left', width);
    assert.equal(h.document, h.original); assert.equal(h.writes, 0);
  }
  const h = harness(); h.commands.updateColumnWidth(h.original.blocks[0], 'missing', 25);
  assert.equal(h.document, h.original);
  const single = columns(); single.children = [single.children[0]];
  assert.equal(setColumnWidth(single, 'left', 30), single);
});

test('width limits and proportional redistribution preserve a three-column graph', () => {
  const parent = columns(); parent.children.push({ id: 'third', type: 'column', width: 38, children: [] });
  for (const width of [-10, 1000, 45.5]) {
    const next = setColumnWidth(parent, 'left', width);
    assert.equal(next.children[0].width, Math.max(5, Math.min(90, width)));
    assert.equal(next.children[1].width, next.children[2].width);
    assertContentPreserved(parent, next); assert.equal(validContentBlocks([next]), true);
  }
});

test('unit widths validate and render as fixed tracks beside legacy flexible percentage tracks', () => {
  const block = columns();
  block.children[0] = { ...block.children[0], width: 280, widthUnit: 'px' };
  assert.equal(validContentBlocks([block]), true);
  assert.equal(columnsGridTemplate(block.children), 'minmax(280px, 280px) minmax(0, 38fr)');
  block.children[0] = { ...block.children[0], widthUnit: 'bogus' };
  assert.equal(validContentBlocks([block]), false);
});

test('fixed Column widths round-trip through HTML inspection and clipboard envelopes', () => {
  const base = columns();
  const block = { ...base, children: [{ ...base.children[0], width: 280, widthUnit: 'px' }, base.children[1]] };
  withHtmlDom(() => {
    const parsed = parseHtmlToBlock(blockToHtml(block), block);
    assert.ok('block' in parsed, JSON.stringify(parsed));
    assert.deepEqual([parsed.block.children[0].width, parsed.block.children[0].widthUnit], [280, 'px']);
  });

  const originalParser = globalThis.DOMParser;
  globalThis.DOMParser = class {
    parseFromString(html) {
      const encoded = /data-acm-studio-blocks="([^"]*)"/.exec(html)?.[1];
      const value = encoded?.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
      return { querySelector: () => value ? { getAttribute: () => value } : null };
    }
  };
  try {
    const html = clipboard.blockClipboardHtml([block]);
    const parsed = clipboard.readBlockClipboardPayload(html);
    assert.deepEqual([parsed?.blocks[0].children[0].width, parsed?.blocks[0].children[0].widthUnit], [280, 'px']);
  } finally { globalThis.DOMParser = originalParser; }
});

test('mixed fixed and flexible widths only redistribute flexible siblings', () => {
  const block = columns();
  block.children = [
    { ...block.children[0], width: 280, widthUnit: 'px' },
    { ...block.children[1], width: 40 },
    { id: 'extra', type: 'column', width: 60, children: [] },
  ];
  const resized = setColumnWidth(block, 'right', 70);
  assert.deepEqual(resized.children.map(column => column.width), [280, 70, 30]);
  assert.equal(resized.children[0].widthUnit, 'px');
});

test('fixed-to-percent conversion redistributes through the owning Columns command', () => {
  const block = columns();
  block.children[0] = { ...block.children[0], width: 280, widthUnit: 'px' };
  assert.deepEqual(setColumnWidthUnit(block, 'left', 280, '%').children.map(column => [column.width, column.widthUnit]), [[95, undefined], [5, undefined]]);
  const h = harness(block);
  h.commands.updateColumnWidthUnit(block, 'left', 280, '%');
  assert.deepEqual(h.document.blocks[0].children.map(column => [column.width, column.widthUnit]), [[95, undefined], [5, undefined]]);
  assert.equal(validContentBlocks(h.document.blocks), true);
});

test('unit widths require the new workspace and publication format versions', () => {
  const workspace = structuredClone(initialStudioWorkspace);
  workspace.documents[0].blocks = [columns()];
  workspace.documents[0].blocks[0].children[0] = { ...workspace.documents[0].blocks[0].children[0], width: 280, widthUnit: 'px' };
  assert.throws(() => validateStudioWorkspace({ ...workspace, version: 37 }), /invalid|unsupported/i);
  assert.equal(validateStudioWorkspace({ ...workspace, version: 38 }).documents[0].blocks[0].children[0].widthUnit, 'px');

  const article = { localDocumentId: 'post', title: 'Post', slug: 'post', section: 'Writing', summary: '', displayDate: '', readingTime: '', publishedAt: '2026-10-28T00:00:00.000Z', mediaIds: [], blocks: [columns()] };
  article.blocks[0].children[0] = { ...article.blocks[0].children[0], width: 20, widthUnit: 'rem' };
  assert.throws(() => validatePublicationSnapshot({ version: 29, posts: [article] }), /published-post snapshot v30/i);
  assert.equal(validatePublicationSnapshot({ version: 30, posts: [article] }).posts[0].blocks[0].children[0].widthUnit, 'rem');
});

test('unit widths require current template and backup envelopes while legacy values stay compatible', () => {
  const block = columns();
  block.children[0] = { ...block.children[0], width: 280, widthUnit: 'px' };
  const set = templateModel.createTemplateSet('Column widths');
  set.templates[0].nodes = [block];
  const store = { ...templateModel.emptyTemplateStore(), version: templateModel.TEMPLATE_VERSION, sets: [set] };
  assert.equal(templateModel.validateTemplateStore(store).version, templateModel.TEMPLATE_VERSION);
  assert.throws(() => templateModel.validateTemplateStore({ ...store, version: '0.43.0' }), /Column width units require template v0\.44\.0/);
  assert.throws(() => templateModel.validateTemplateSnapshot({ version: '0.43.0', set, templateId: set.templates[0].id }), /Column width units require template v0\.44\.0/);
  assert.equal(validateTemplatePackage({ format: 'acm-studio-template-set', version: templateModel.TEMPLATE_VERSION, set, media: [] }).version, templateModel.TEMPLATE_VERSION);

  const globalTemplates = { ...templateModel.emptyTemplateStore(), version: templateModel.TEMPLATE_VERSION, sets: [set] };
  const header = set.parts.find(part => part.kind === 'header');
  const globalLibrary = { format: 'acm-global-templates', version: 16, templates: globalTemplates, header: { setId: set.id, partId: header.id }, migrations: { test: { bindings: [], bases: [] }, test2: { bindings: [], bases: [] } } };
  assert.equal(validateGlobalTemplateLibrary(globalLibrary).version, 42);
  assert.equal(validateGlobalTemplateLibrary({ ...globalLibrary, version: 15 }).version, 42);

  const workspace = structuredClone(initialStudioWorkspace);
  workspace.documents[0].blocks = [block];
  const backup = { format: 'acm-studio-backup', exportedAt: '2026-10-28T00:00:00.000Z', workspace, publications: null, media: { folders: [], assets: [] } };
  assert.throws(() => validateStudioBackup({ ...backup, version: 9 }), /Column width units require backup v10/);
  assert.equal(validateStudioBackup({ ...backup, version: 10 }).version, 10);
});

test('Undo/Redo restores the full parent and reader-valid export round-trips', () => {
  const h = harness(); h.commands.updateColumnWidth(h.original.blocks[0], 'left', 25);
  const committed = commitHistory(h.original, []);
  const undone = undoHistory(h.document, committed.history, committed.future);
  assert.deepEqual(undone.workspace, h.original);
  assert.deepEqual(redoHistory(undone.workspace, undone.history, undone.future).workspace, h.document);
  const workspace = structuredClone(initialStudioWorkspace);
  workspace.documents[0].blocks = h.document.blocks;
  assert.deepEqual(validateStudioWorkspace(JSON.parse(JSON.stringify(workspace))).documents[0].blocks, h.document.blocks);
});

async function astOf(path) {
  const text = await readFile(new URL(path, import.meta.url), 'utf8');
  return ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function nodes(ast, predicate) {
  const found = []; function visit(node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); } visit(ast); return found;
}
test('Main inspector configuration dispatches the canonical parent-width command', async () => {
  for (const path of ['../app/studio/studio-prototype.tsx']) {
    const ast = await astOf(path);
    const property = nodes(ast, node => ts.isPropertyAssignment(node) && node.name.getText(ast) === 'onColumnWidthChange');
    assert.equal(property.length, 1);
    const h = harness();
    const callback = vm.runInNewContext(ts.transpileModule(property[0].initializer.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { blockCommands: h.commands });
    callback(h.original.blocks[0], 'left', 25);
    assert.equal(validContentBlocks(h.document.blocks), true);
    assert.equal(h.document.blocks[0].children[0].width, 25);
  }
});

test('actual inspector callback supplies the captured parent, with honest disabled fallback', async () => {
  const ast = await astOf('../app/studio/studio-inspectors.tsx');
  const owner = nodes(ast, node => ts.isFunctionDeclaration(node) && node.name?.text === 'StudioInspector')[0];
  const attribute = nodes(owner, node => ts.isJsxAttribute(node) && node.name.getText(ast) === 'onColumnWidthChange')[0];
  const expression = attribute.initializer.expression;
  const h = harness();
  const evaluate = callback => vm.runInNewContext(ts.transpileModule(expression.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { selectedColumnParent: h.original.blocks[0], onColumnWidthChange: callback });
  assert.equal(evaluate(undefined), undefined);
  evaluate(h.commands.updateColumnWidth)('left', 25);
  assert.equal(validContentBlocks(h.document.blocks), true);
  assert.equal(h.document.blocks[0].children[0].width, 25);
});

test('the actual workspace commit boundary rejects a width command when read-only', async () => {
  const ast = await astOf('../app/studio/use-studio-workspace.ts');
  const owner = nodes(ast, node => ts.isFunctionDeclaration(node) && node.name?.text === 'useStudioWorkspace')[0];
  const names = ['commit', 'updateDocument', 'updateActiveDocument'];
  const functions = names.map(name => owner.body.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast)).join('\n');
  const h = harness();
  const context = { editable: false, workspace: { activeDocumentId: h.original.id, documents: [h.original] }, setWorkspace() { assert.fail('Read-only commit scheduled a change'); } };
  context.workspaceRef = { current: context.workspace };
  const update = vm.runInNewContext(ts.transpileModule(`${functions}\nupdateActiveDocument;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const commands = createBlockCommands({ activeDocument: h.original, updateActiveDocument: update });
  commands.updateColumnWidth(h.original.blocks[0], 'left', 25);
  assert.deepEqual(context.workspace.documents[0], h.original);
});

test('redistribution floors every sibling at 5% and retains existing locks and metadata', () => {
  for (let count = 2; count <= 6; count++) {
    const parent = { id: 'columns', type: 'columns', children: Array.from({ length: count }, (_, index) => ({ id: `c-${index}`, type: 'column', width: index ? 5 : 100 - (count - 1) * 5, children: [], editorial: { name: `Column ${index}`, lock: { move: true } } })) };
    for (const selected of parent.children) for (const width of [5, 40, 95, 1000]) {
      const next = setColumnWidth(parent, selected.id, width);
      assertContentPreserved(parent, next);
      assert.ok(next.children.every(child => child.width >= 5));
      assert.equal(validContentBlocks([next]), true);
      assert.deepEqual(next.children.map(child => child.editorial), parent.children.map(child => child.editorial));
    }
  }
});

test('Library width availability and maximum use the owning Columns record', async () => {
  const ast = await astOf('../app/studio/ui/blocks/block-specimen-catalogue.tsx');
  const attribute = nodes(ast, node => ts.isJsxAttribute(node) && node.name.getText(ast) === 'onColumnWidthChange')[0];
  const expression = attribute.initializer.expression;
  const evaluate = (parent, commands) => vm.runInNewContext(ts.transpileModule(expression.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { selectedColumnParent: parent, commands });
  assert.equal(evaluate(undefined, {}), undefined);
  assert.equal(evaluate({ ...columns(), children: [columns().children[0]] }, {}), undefined);
  const h = harness(); evaluate(h.original.blocks[0], h.commands)('left', 25);
  assert.equal(h.document.blocks[0].children[0].width, 25);
  const { maximumColumnWidth } = await loadProductionModule(new URL('../app/content/columns.ts', import.meta.url));
  assert.deepEqual([2, 3, 4, 5, 6].map(maximumColumnWidth), [95, 90, 85, 80, 75]);
  const maximum = nodes(ast, node => ts.isJsxAttribute(node) && node.name.getText(ast) === 'columnWidthMax')[0];
  const h3 = { ...columns(), children: [...columns().children, { id: 'third', type: 'column', children: [] }] };
  assert.equal(vm.runInNewContext(ts.transpileModule(maximum.initializer.expression.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { selectedColumnParent: h3, maximumColumnWidth }), 90);
});
