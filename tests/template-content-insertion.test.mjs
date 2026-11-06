import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { loadProductionModule } from './production-module.mjs';
import { commitHistory, undoHistory, redoHistory } from '../app/studio/studio-command-operations.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const model = await load('../app/studio/template-model.ts');
const { insertTemplateContent, replaceParagraphWithTemplateElement, templateContentAvailable } = await load('../app/studio/template-content-insertion.ts');
const { blockInserterOptions } = await load('../app/studio/block-inserter-options.ts');
const { reconcileFootnoteBlocks } = await load('../app/content/footnote-reconciliation.ts');
const { useStudioBlockCommands } = await load('../app/studio/use-studio-block-commands.ts');
const content = { type: 'template-content', label: 'Content', description: 'Document body', group: 'Theme' };
function fixture(kind = 'page', nodes = []) {
  const set = model.createTemplateSet();
  const target = [...set.templates, ...set.parts].find(item => item.kind === kind);
  target.nodes = nodes;
  return { set, target };
}
function insert(f, index = null, parentId, id = 'new-content') {
  return insertTemplateContent(f.set, f.target, f.target.nodes, index, parentId, id);
}
for (const kind of ['page', 'post']) test(`${kind} Content inserts as a template element and round-trips its transient projection`, () => {
  const f = fixture(kind, [{ id: 'before', type: 'paragraph', text: 'Before' }]);
  const proposal = insert(f, 0);
  assert.equal(proposal.nodes[0].type, 'element'); assert.equal(proposal.nodes[0].element, 'content');
  assert.equal(proposal.block.type, 'group'); assert.equal(proposal.block.data.templateElement, 'content');
  assert.deepEqual(model.templateNodesFromBlocks(model.templateEditorBlocks(proposal.nodes), proposal.nodes), proposal.nodes);
  assert.deepEqual(f.target.nodes, [{ id: 'before', type: 'paragraph', text: 'Before' }]);
  assert.equal(templateContentAvailable(f.target, proposal.nodes), false);
  assert.equal(insertTemplateContent(f.set, f.target, proposal.nodes, null, undefined, 'second'), null);
});
test('Content HTML element selection persists through the transient editor projection, renderer and inspector', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { TemplateNodes } = await load('../app/studio/template-renderer.tsx');
  const { BlockInspector } = await load('../app/studio/blocks/inspectors/block-inspector.tsx');
  const { createWorkspacePreviewDocument } = await load('../app/studio/editor-model.ts');
  const node = { id: 'content-slot', type: 'element', element: 'content', tagName: 'article', align: 'centre', visualStyle: { buttonTextColor: '#123456', buttonBackgroundGradient: { type: 'linear', angle: 90, stops: [{ colour: '#ffffff', position: 0 }, { colour: '#000000', position: 100 }] } } };
  const f = fixture('page', [node]);
  const projected = model.templateEditorBlocks([node])[0];
  assert.equal(projected.tagName, 'article');
  const restored = model.templateNodesFromBlocks([projected], [node])[0];
  assert.equal(restored.tagName, 'article');
  assert.equal(restored.type, 'element');
  assert.deepEqual(restored.visualStyle, node.visualStyle);
  const html = renderToStaticMarkup(createElement(TemplateNodes, {
    set: f.set,
    document: createWorkspacePreviewDocument('page'),
    nodes: [node],
  }));
  assert.match(html, /<article class="template-content-layout/);
  assert.match(html, /style="[^"]*text-align:center/);
  assert.match(html, /--button-base-color:#123456/);
  assert.match(html, /--button-base-background-image:linear-gradient\(90deg/);
  const inspector = renderToStaticMarkup(createElement(BlockInspector, {
    contentSlot: true,
    block: projected,
    onChange() {},
    fontSizeViewModes: {},
    onFontSizeViewModeChange() {},
    onOpenFiles() {},
    onOpenBackgroundMedia() {},
    canOpenFiles: false,
  }));
  assert.match(inspector, /<span>HTML element<\/span>/);
  assert.match(inspector, /<option value="article" selected="">article<\/option>/);
  assert.match(inspector, /<span>Alignment<\/span>/);
  assert.match(inspector, /<span>Button<\/span>/);
  assert.match(inspector, /<option value="centre" selected="">Centre<\/option>/);
  assert.match(inspector, /customise the appearance of the Content block/);
  assert.match(inspector, /Block spacing/);
  assert.doesNotMatch(inspector, /Minimum width/);
  const configuredInspector = renderToStaticMarkup(createElement(BlockInspector, { contentSlot: true, block: { ...projected, visualStyle: { ...projected.visualStyle, minWidth: "240px" } }, onChange() {}, fontSizeViewModes: {}, onFontSizeViewModeChange() {}, onOpenFiles() {}, canOpenFiles: false }));
  assert.match(configuredInspector, /Minimum width/);
  const legacy = { ...model.emptyTemplateStore(), version: '0.40.0', sets: [f.set] };
  assert.throws(() => model.validateTemplateStore(legacy), /Content HTML elements require template v0.41.0/);
  assert.throws(() => model.validateTemplateSnapshot({ version: '0.40.0', set: f.set, templateId: f.target.id }), /Content HTML elements require template v0.41.0/);
  const { validateTemplatePackage } = await load('../app/studio/template-package.ts');
  assert.throws(() => validateTemplatePackage({ format: 'acm-studio-template-set', version: '0.40.0', set: f.set, media: [] }), /Content HTML elements require template v0.41.0/);
  const buttonStyleSet = structuredClone(f.set);
  for (const entry of [...buttonStyleSet.templates, ...buttonStyleSet.parts]) {
    const slot = entry.nodes.find(node => node.type === 'element' && node.element === 'content');
    if (slot) delete slot.tagName;
  }
  assert.throws(() => model.validateTemplateStore({ ...model.emptyTemplateStore(), version: '0.41.0', sets: [buttonStyleSet] }), /Content Button element colours require template v0.42.0/);
  assert.throws(() => model.validateTemplateSnapshot({ version: '0.41.0', set: buttonStyleSet, templateId: f.target.id }), /Content Button element colours require template v0.42.0/);
  assert.throws(() => validateTemplatePackage({ format: 'acm-studio-template-set', version: '0.41.0', set: buttonStyleSet, media: [] }), /Content Button element colours require template v0.42.0/);
});
for (const kind of ['header', 'footer']) test(`${kind} excludes Content and refuses direct insertion`, () => {
  const f = fixture(kind);
  assert.equal(templateContentAvailable(f.target), false);
  assert.equal(insert(f), null);
});
for (const type of ['group', 'column', 'section']) test(`Content can be inserted at a named position in ${type}`, () => {
  const node = { id: 'parent', type, ...(type !== 'column' ? { layout: 'stack' } : {}), children: [{ id: 'child', type: 'paragraph', text: 'After' }] };
  const roots = type === 'column' ? [{ id: 'columns', type: 'columns', children: [node] }] : [node];
  const f = fixture('page', roots); const proposal = insert(f, 0, 'parent');
  const owner = type === 'column' ? proposal.nodes[0].children[0] : proposal.nodes[0];
  assert.deepEqual(owner.children.map(node => node.id), ['new-content', 'child']);
  model.validateTemplateSet({ ...f.set, templates: f.set.templates.map(item => item.id === f.target.id ? { ...item, nodes: proposal.nodes } : item) });
});
for (const parent of [
  { id: 'parent', type: 'quote', text: '', children: [], attribution: '' },
  { id: 'parent', type: 'buttons', children: [] },
  { id: 'parent', type: 'columns', children: [] },
  { id: 'parent', type: 'social-icons', children: [] },
  { id: 'parent', type: 'paragraph', text: '' },
  { id: 'parent', type: 'element', element: 'site-identity' },
]) test(`${parent.type}/${parent.element ?? parent.allowedBlocks ?? ''} refuses Content without changing the tree`, () => {
  const f = fixture('page', [parent]); const baseline = structuredClone(f.target.nodes);
  assert.equal(insert(f, null, 'parent'), null); assert.deepEqual(f.target.nodes, baseline);
  const projected = model.templateEditorBlocks([parent])[0];
  assert.equal(blockInserterOptions([content], projected, '', [], { allowTemplateContent: true }).length, 0);
});
for (const index of [-1, 0.5, 2, NaN, Infinity]) test(`invalid insertion boundary ${index} refuses`, () => assert.equal(insert(fixture(), index), null));
test('missing parent, duplicate ID and nested existing Content refuse', () => {
  assert.equal(insert(fixture(), 0, 'missing'), null);
  assert.equal(insert(fixture('page', [{ id: 'new-content', type: 'paragraph', text: '' }])), null);
  const f = fixture('post', [{ id: 'group', type: 'group', layout: 'stack', children: [{ id: 'slot', type: 'element', element: 'content' }] }]);
  assert.equal(templateContentAvailable(f.target), false); assert.equal(insert(f), null);
});
test('restricted Group uses the Content projection type and retains locked siblings', () => {
  const f = fixture('page', [{ id: 'parent', type: 'group', layout: 'stack', allowedBlocks: ['group'], children: [{ id: 'locked', type: 'paragraph', text: 'Existing', editorial: { lock: { move: true, remove: true } } }] }]);
  assert.equal(blockInserterOptions([content], model.templateEditorBlocks(f.target.nodes)[0], '', [], { allowTemplateContent: true }).length, 1);
  const proposal = insert(f, 0, 'parent'); assert.ok(proposal);
  assert.deepEqual(proposal.nodes[0].children[1], f.target.nodes[0].children[0]);
});
test('ordinary document options require an explicit capability even when Content appears in their source catalogue', () => {
  assert.deepEqual(blockInserterOptions([content], undefined, ''), []);
  assert.deepEqual(blockInserterOptions([content], undefined, '', [], { allowTemplateContent: false }), []);
  assert.deepEqual(blockInserterOptions([content], undefined, 'body', [], { allowTemplateContent: true }), [content]);
  assert.deepEqual(blockInserterOptions([content], undefined, 'unrelated', [], { allowTemplateContent: true }), []);
});

// Execute the actual Template adapter functions, including its acceptance gate.
const editorSource = await readFile(new URL('../app/studio/template-editor.tsx', import.meta.url), 'utf8');
const syntax = ts.createSourceFile('template-editor.tsx', editorSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function sourceFunction(name) {
  let found;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node.getText(syntax);
    if (ts.isVariableDeclaration(node) && node.name.getText(syntax) === name) found = `const ${node.getText(syntax)};`;
    ts.forEachChild(node, visit);
  }
  visit(syntax); assert.ok(found, `Missing production function ${name}`); return found;
}
function adapter({ writable = true, accept = true } = {}) {
  const f = fixture(); let history = []; let future = []; let current = f.set; let selected = null; let calls = 0;
  const scope = { ...model, insertTemplateContent, reconcileFootnoteBlocks, writable, set: current, target: f.target, nodesRef: { current: f.target.nodes },
    onChange(next) { calls++; if (!accept) return false; ({ history, future } = commitHistory(current, history)); current = next; scope.set = next; return true; },
    selectBlock(id) { selected = id; }, setInsertAfter() {}, setShowInserter() {}, setQuery() {}, setInserterParentId() {},
  };
  const source = `${sourceFunction('updateNodes')}\n${sourceFunction('insertContent')}\nglobalThis.insert = insertContent;`;
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  return { scope, insert: () => scope.insert(null), current: () => current, selected: () => selected, calls: () => calls, history: () => history, future: () => future, original: f.set };
}
for (const condition of [{ writable: false }, { accept: false }]) test(`adapter refuses ${JSON.stringify(condition)} without selection or history`, () => {
  const h = adapter(condition); assert.equal(h.insert(), null); assert.equal(h.selected(), null); assert.equal(h.history().length, 0); assert.equal(h.current(), h.original);
  assert.equal(h.calls(), condition.writable === false ? 0 : 1);
});
test('accepted insertion has one history transaction, rejects a repeated stale callback, and Undo/Redo restore the slot', () => {
  const h = adapter(); const block = h.insert(); assert.ok(block); assert.equal(h.selected(), block.id); assert.equal(h.history().length, 1);
  assert.equal(h.insert(), null); assert.equal(h.calls(), 1); assert.equal(h.history().length, 1);
  const undo = undoHistory(h.current(), h.history(), h.future()); assert.deepEqual(undo.workspace, h.original);
  const redo = redoHistory(undo.workspace, undo.history, undo.future); assert.deepEqual(redo.workspace, JSON.parse(JSON.stringify(h.current())));
});
test('canonical remove command removes Content, then template validation and history retain recovery', () => {
  const f = fixture(); const proposal = insert(f); let current = { id: f.target.id, blocks: model.templateEditorBlocks(proposal.nodes) };
  let history = []; let future = [];
  const commands = useStudioBlockCommands({ activeDocument: current, updateActiveDocument(update) { const next = update(current); ({ history, future } = commitHistory(current, history)); current = next; } });
  commands.removeBlock(proposal.block.id);
  const nodes = model.templateNodesFromBlocks(current.blocks, proposal.nodes);
  assert.equal(templateContentAvailable(f.target, nodes), true);
  model.validateTemplateSet({ ...f.set, templates: f.set.templates.map(item => item.id === f.target.id ? { ...item, nodes } : item) });
  const undo = undoHistory(current, history, future); assert.equal(undo.workspace.blocks[0].data.templateElement, 'content');
  const redo = redoHistory(undo.workspace, undo.history, undo.future); assert.deepEqual(redo.workspace.blocks, []);
});
for (const [index, explicitParent, rememberedParent, expectedIndex, expectedParent] of [
  [null, undefined, 'column', null, 'column'],
  [0, undefined, 'column', 0, undefined],
  [1, 'other-column', 'column', 1, 'other-column'],
  [null, undefined, null, 3, undefined],
]) test(`actual Library adapter preserves click/drop destination ${index}/${explicitParent ?? rememberedParent}`, () => {
  let call;
  const scope = { inserterParentId: rememberedParent, insertAfter: 2, insertContent(...args) { call = args; return 'accepted'; } };
  const source = `${sourceFunction('insertContentFromLibrary')}\nglobalThis.insert = insertContentFromLibrary;`;
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  assert.equal(scope.insert(index, explicitParent), 'accepted'); assert.deepEqual([...call], [expectedIndex, expectedParent]);
});
for (const wrapper of ['group', 'section', 'column', 'columns']) test(`Duplicate refuses a ${wrapper} containing Content before changing history`, () => {
  const slot = model.templateEditorBlocks([{ id: 'slot', type: 'element', element: 'content' }])[0];
  const column = { id: 'column', type: 'column', children: [slot] };
  const root = wrapper === 'columns' ? { id: 'root', type: wrapper, children: [column] } : { id: 'root', type: wrapper, ...(wrapper === 'column' ? {} : { layout: 'stack' }), children: [slot] };
  const document = { id: 'document', blocks: [root] }; let writes = 0;
  const commands = useStudioBlockCommands({ activeDocument: document, updateActiveDocument() { writes++; } });
  assert.equal(commands.duplicateBlock(0), null); assert.equal(commands.duplicateBlockById('root'), null); assert.equal(writes, 0);
});

test('nested Column Content renders the shared slot rather than the empty Group chooser', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { BlockField } = await load('../app/studio/studio-canvas.tsx');
  const slot = model.templateEditorBlocks([{ id: 'slot', type: 'element', element: 'content', visualStyle: { anchor: 'content-anchor', textColor: '#123456' } }])[0];
  const columns = { id: 'columns', type: 'columns', children: [{ id: 'column', type: 'column', children: [slot] }] };
  const html = renderToStaticMarkup(createElement(BlockField, { block: columns, templatePlaceholder: true, onChange() {}, onTableCellFocus() {}, onTextSelection() {}, onLinkActivate() {} }));
  assert.match(html, /aria-label="Content slot"/); assert.match(html, /This is the Content block, it will display all the blocks in any single post or page\./);
  assert.doesNotMatch(html, /Group blocks together|Group layout|group-layout-empty/);
  assert.equal((html.match(/id="content-anchor"/g) ?? []).length, 1);
  assert.match(html, /color:#123456/);
});

function presentationRenderer(writable, canChooseFixedImage = true) {
  let renderer;
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(syntax) === 'renderBlock' && ts.isArrowFunction(node.initializer)) renderer = node.initializer.getText(syntax);
    ts.forEachChild(node, visit);
  }
  visit(syntax); assert.ok(renderer);
  const scope = { React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) }, writable, canChooseFixedImage, globalOriginal: false,
    TemplateNodes: 'TemplateNodes', BlockField: 'BlockField', BlockRenderer: 'BlockRenderer', TemplateContentSlot: 'TemplateContentSlot',
    templateNodesFromBlocks: model.templateNodesFromBlocks, templateEditorBlocks: model.templateEditorBlocks,
    findTemplateNode() {}, set: {}, resolvedSample: {}, templatePreviewDocument: {}, mediaUrls: {}, selected: 'slot',
    editingProjection: { blocks: [] }, blocks: [], commands: {}, fixtureLinks: false, sharedSiteNavigation: false, navigationSearchEntries: [], browserLocalPublicationSearchEntries: () => [], onEditPart() {}, onOpenMedia() {}, clearCoverImage() {}, restoreCoverImage() {},
    splitParagraph() {}, splitParagraphs() {}, openNestedInserter() {}, insertBlock() {}, selectBlock() {},
  };
  const compiled = ts.transpileModule(`globalThis.render = ${renderer};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
  runInNewContext(compiled, scope); return scope.render;
}
for (const writable of [true, false]) for (const mode of ['edit', 'preview']) test(`actual Template presentation routes nested Content through TemplateNodes in ${mode}, writable=${writable}`, () => {
  const block = model.templateEditorBlocks([{ id: 'columns', type: 'columns', children: [{ id: 'column', type: 'column', children: [{ id: 'slot', type: 'element', element: 'content' }] }] }])[0];
  const result = presentationRenderer(writable)({ mode, block });
  assert.equal(result.type, 'TemplateNodes');
  assert.equal(result.props.nodes[0].children[0].children[0].element, 'content');
  assert.equal(result.props.content.type, 'TemplateContentSlot');
});

for (const canChooseFixedImage of [true, false]) test(`actual template featured-image presentation advertises supported chooser=${canChooseFixedImage} and retains recovery controls`, () => {
  const block = model.templateEditorBlocks([{ id: 'featured', type: 'element', element: 'cover-image' }])[0];
  const editable = presentationRenderer(true, canChooseFixedImage)({ mode: 'edit', block });
  assert.equal(typeof editable.props.onChangeCover, canChooseFixedImage ? 'function' : 'undefined');
  for (const name of ['onRemoveCoverImage', 'onRemoveCoverBlock', 'onRestoreCoverImage']) assert.equal(typeof editable.props[name], 'function');
  for (const context of [{ mode: 'edit', writable: false }, { mode: 'preview', writable: true }]) {
    const result = presentationRenderer(context.writable, canChooseFixedImage)({ mode: context.mode, block });
    for (const name of ['onChangeCover', 'onRemoveCoverImage', 'onRemoveCoverBlock', 'onRestoreCoverImage']) assert.equal(result.props[name], undefined);
  }
});

test('Content root and nested projections share constrained layout, appearance, media and alignment', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { TemplateNodes } = await load('../app/studio/template-renderer.tsx');
  const { TemplateContentSlot } = await load('../app/studio/template-content-slot.tsx');
  const { BlockField } = await load('../app/studio/studio-canvas.tsx');
  const { createWorkspacePreviewDocument } = await load('../app/studio/editor-model.ts');
  const slot = { id: 'slot', type: 'element', element: 'content', align: 'centre', inheritLayout: false, contentSize: '640px', rowGap: 32, paddingX: 24, paddingY: 16, visualStyle: { anchor: 'content-anchor', textColor: '#123456', backgroundImageMediaId: 'image' } };
  const f = fixture('page', [slot]);
  const restoredSlot = model.templateNodesFromBlocks(model.templateEditorBlocks([slot]), [slot])[0];
  assert.equal(restoredSlot.rowGap, 32);
  assert.equal(restoredSlot.inheritLayout, false);
  assert.deepEqual(restoredSlot.visualStyle, slot.visualStyle);
  const mediaUrls = { image: 'https://example.com/content.png' };
  const root = renderToStaticMarkup(createElement(TemplateNodes, { set: f.set, document: createWorkspacePreviewDocument('page'), nodes: [slot], mediaUrls, content: createElement(TemplateContentSlot) }));
  const nested = renderToStaticMarkup(createElement(BlockField, { block: model.templateEditorBlocks([slot])[0], mediaUrls, templatePlaceholder: true, onChange() {}, onTableCellFocus() {}, onTextSelection() {}, onLinkActivate() {} }));
  for (const html of [root, nested]) {
    assert.match(html, /This is the Content block, it will display all the blocks in any single post or page\./);
    assert.match(html, /That might be a simple arrangement like consecutive paragraphs/);
    assert.match(html, /If there are any Custom Post Types registered at your site/);
    assert.equal((html.match(/<p(?:\s|>)/g) ?? []).length, 3);
    assert.match(html, /template-content-layout template-group layout-flow has-layout-options/);
    assert.match(html, /data-layout-constrained="true"/);
    assert.match(html, /--block-content-size:640px/);
    assert.match(html, /--block-layout-row-gap:32px/);
    assert.match(html, /--block-layout-padding-x:24px/);
    assert.match(html, /--block-layout-padding-y:16px/);
    assert.match(html, /background-image:url/);
    assert.match(html, /example.com\/content.png/);
    assert.match(html, /text-align:center/);
    assert.equal((html.match(/id="content-anchor"/g) ?? []).length, 1);
  }
});

test('Website Content styles apply to the template slot surface without changing the saved node', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { TemplateNodes } = await load('../app/studio/template-renderer.tsx');
  const { WebsiteDesignSurface } = await load('../app/studio/site-editor/website-design-surface.tsx');
  const { createWorkspacePreviewDocument } = await load('../app/studio/editor-model.ts');
  const slot = { id: 'slot', type: 'element', element: 'content', visualStyle: { textColor: '#abcdef', padding: '8px' } };
  const f = fixture('page', [slot]);
  const document = { ...createWorkspacePreviewDocument('page'), blocks: [
    { id: 'body-copy', type: 'paragraph', text: 'Actual document body' },
    { id: 'body-authored-copy', type: 'paragraph', text: 'Authored paragraph', style: { textColor: '#fedcba' } },
    { id: 'body-heading', type: 'heading', level: 2, text: 'Body heading', visualStyle: { textColor: '#fedcba' } },
  ] };
  const website = { identity: {}, styles: { paletteId: 'default', typographyId: 'default', blockStyles: { content: { fontSizeCustom: '24px', textColor: '#123456', padding: '16px', headingColor: '#654321', inheritLayout: false, contentSize: '760px', wideSize: '1040px', horizontalAlign: 'left' } } } };
  const tree = createElement(WebsiteDesignSurface, { design: website, scopeId: 'content-theme' }, createElement(TemplateNodes, { set: f.set, document, nodes: [slot] }));
  const html = renderToStaticMarkup(tree);
  assert.match(html, /class="template-content-layout template-group layout-flow has-layout-options site-block-style-content site-block-authored-color site-block-authored-padding"/);
  assert.match(html, /--block-content-size:760px/);
  assert.match(html, /--block-wide-size:1040px/);
  assert.match(html, /data-layout-justification="left"/);
  assert.match(html, /style="[^"]*font-size:24px;color:#abcdef;padding:8px/);
  assert.match(html, /Actual document body/);
  assert.doesNotMatch(html, /This is the Content block, it will display/);
  assert.match(html, /Authored paragraph/);
  assert.match(html, /site-block-authored-color" style="color:#fedcba/);
  assert.match(html, /Body heading/);
  const headingIndex = html.indexOf('Body heading');
  const headingContext = html.slice(Math.max(0, headingIndex - 600), headingIndex);
  assert.match(headingContext, /site-block-authored-color[^>]*style="[^"]*color:#fedcba/);
  assert.match(html, /site-block-style-content[^{}]*\{[^}]*font-size:inherit/);
  assert.match(html, /--site-container-heading-2-color:#654321/);
  assert.deepEqual(slot.visualStyle, { textColor: '#abcdef', padding: '8px' });
  assert.deepEqual(document.blocks[1].style, { textColor: '#fedcba' });
});

test('Content specimen Preview projects the nested body for Group and Columns wrappers', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { BlockRenderer } = await load('../app/components/content.tsx');
  const { TemplateNodes } = await load('../app/studio/template-renderer.tsx');
  const { templateContentProjectionBlocks } = await load('../app/studio/template-content-slot.tsx');
  const f = fixture('post');
  const document = { id: 'preview-document', kind: 'post', title: 'Preview', slug: 'preview', blocks: [] };
  const body = [
    { id: 'body-one', type: 'paragraph', text: 'First projected paragraph.' },
    { id: 'body-two', type: 'paragraph', text: 'Second projected paragraph.' },
  ];
  const slot = { id: 'content-slot', type: 'group', layout: 'flow', data: { templateElement: 'content' }, children: body };
  const wrappers = [
    { id: 'group-wrapper', type: 'group', layout: 'flow', children: [slot] },
    { id: 'columns-wrapper', type: 'columns', children: [{ id: 'column-wrapper', type: 'column', width: 100, children: [slot] }] },
  ];

  for (const wrapper of wrappers) {
    const projection = templateContentProjectionBlocks([wrapper]);
    assert.deepEqual(projection, body);
    const html = renderToStaticMarkup(createElement(TemplateNodes, {
      set: f.set,
      document,
      nodes: model.templateNodesFromBlocks([wrapper]),
      content: createElement(BlockRenderer, { blocks: projection, variant: 'studio', document }),
      templatePreview: true,
    }));
    assert.match(html, /template-content-layout/);
    for (const text of ['First projected paragraph.', 'Second projected paragraph.']) {
      assert.equal((html.match(new RegExp(text.replaceAll('.', '\\.'), 'g')) ?? []).length, 1, `${text} renders once for ${wrapper.type}`);
    }
  }
  assert.equal(templateContentProjectionBlocks([{ id: 'no-content', type: 'group', layout: 'flow', children: [] }]), null);
});

test('slash replacement is atomic, respects ownership and rejects stale and duplicate Content', () => {
  const f = fixture('page', [{ id: 'parent', type: 'group', layout: 'flow', children: [{ id: 'slash', type: 'paragraph', text: '/content' }, { id: 'sibling', type: 'paragraph', text: 'Remain' }] }]);
  const run = (nodes, query = 'content', type = 'template-content') => replaceParagraphWithTemplateElement(f.set, f.target, nodes, 'slash', query, type, 'inserted');
  const result = run(f.target.nodes);
  assert.deepEqual(result.nodes[0].children.map(item => item.id), ['inserted', 'sibling']);
  assert.equal(result.nodes[0].children[0].element, 'content');
  assert.equal(f.target.nodes[0].children[0].text, '/content');
  assert.equal(run(f.target.nodes, 'stale'), null);
  assert.equal(run([...f.target.nodes, { id: 'existing', type: 'element', element: 'content' }]), null);
  const locked = structuredClone(f.target.nodes); locked[0].children[0].editorial = { lock: { remove: true } };
  assert.equal(run(locked), null);
  const restricted = structuredClone(f.target.nodes); restricted[0].allowedBlocks = ['paragraph'];
  assert.equal(run(restricted), null);
  const navNodes = [{ id: 'slash', type: 'paragraph', text: '/navigation' }];
  assert.equal(run(navNodes, 'navigation', 'navigation').nodes[0].element, 'navigation');
  assert.equal(replaceParagraphWithTemplateElement(f.set, f.target, navNodes, 'slash', 'navigation', 'navigation', 'slash'), null);
});

test('empty appender replacement keeps template ownership and stale-text guards separate from slash queries', () => {
  const f = fixture('page', [{ id: 'empty', type: 'paragraph', text: '' }]);
  const replace = (nodes, type = 'template-content') => replaceParagraphWithTemplateElement(f.set, f.target, nodes, 'empty', '', type, 'inserted', true);
  assert.equal(replace(f.target.nodes).nodes[0].element, 'content');
  assert.equal(replace(f.target.nodes, 'navigation').nodes[0].element, 'navigation');
  assert.equal(replaceParagraphWithTemplateElement(f.set, f.target, f.target.nodes, 'empty', '', 'template-content', 'inserted'), null);
  const stale = structuredClone(f.target.nodes); stale[0].text = 'Draft';
  assert.equal(replace(stale), null);
  const locked = structuredClone(f.target.nodes); locked[0].editorial = { lock: { remove: true } };
  assert.equal(replace(locked), null);
  assert.equal(replace([...f.target.nodes, { id: 'content', type: 'element', element: 'content' }]), null);
});
