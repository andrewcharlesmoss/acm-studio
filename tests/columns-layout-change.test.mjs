import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { loadProductionModule } from './production-module.mjs';
import { commitHistory, undoHistory, redoHistory } from '../app/studio/studio-command-operations.mjs';

const { proposeColumnCountChange } = await loadProductionModule(new URL('../app/studio/columns-count-change.ts', import.meta.url));
const { useStudioBlockCommands: createCommands } = await loadProductionModule(new URL('../app/studio/use-studio-block-commands.ts', import.meta.url));
const { setColumnCount, columnsLayoutStyle } = await loadProductionModule(new URL('../app/content/columns.ts', import.meta.url));
const { cssVerticalAlignment, layoutStyleProperties } = await loadProductionModule(new URL('../app/content/layout.ts', import.meta.url));
const { validContentBlocks, validateStudioWorkspace } = await loadProductionModule(new URL('../app/studio/workspace-validation.ts', import.meta.url));
const { initialStudioWorkspace } = await loadProductionModule(new URL('../app/studio/editor-model.ts', import.meta.url));
const { blocksToMiniGolfPageDefinition, miniGolfPageDefinitionToBlocks } = await loadProductionModule(new URL('../app/studio/mini-golf-page-contract.ts', import.meta.url));
const { BlockRenderer } = await loadProductionModule(new URL('../app/components/content.tsx', import.meta.url));
const { blockToHtml } = await loadProductionModule(new URL('../app/studio/studio-html-editor.ts', import.meta.url));
const p = id => ({ id, type: 'paragraph', text: id });
const fixture = () => ({ id: 'columns', type: 'columns', verticalAlign: 'top', gap: 16, stackAt: 'mobile', children: [
  { id: 'left', type: 'column', width: 50, children: [p('a')] },
  { id: 'right', type: 'column', width: 50, children: [p('b'), p('c')] },
] });
function harness(parent = fixture()) {
  let document = { id: 'document', blocks: [parent] }; const original = document; let writes = 0;
  const commands = createCommands({ activeDocument: original, updateActiveDocument: update => { const next = update(document); if (next !== document) writes++; document = next; } });
  return { original, commands, get document() { return document; }, get writes() { return writes; }, replace(next) { document = next; } };
}
const ids = block => block.children.flatMap(column => column.children.map(child => child.id));

test('Top, Centre, Bottom and Stretch share valid CSS values across layout owners', () => {
  for (const [value, css] of [['top','start'], ['centre','center'], ['bottom','end'], ['stretch','stretch'], ['space-between','space-between']]) {
    assert.equal(cssVerticalAlignment(value), css);
    assert.equal(layoutStyleProperties({ verticalAlign: value })['--block-layout-vertical-align'], css);
    if (value !== 'space-between') assert.equal(columnsLayoutStyle({ ...fixture(), verticalAlign: value })['--block-layout-vertical-align'], css);
  }
  assert.equal(columnsLayoutStyle({ children: fixture().children })['--block-layout-vertical-align'], 'stretch');
  assert.equal(layoutStyleProperties({})['--block-layout-vertical-align'], undefined);
});

test('production preview renders Top for Columns, Row, Grid and Section without changing saved values', () => {
  const columns = fixture();
  const blocks = [columns, ...['row', 'grid'].map(layout => ({ id: layout, type: 'group', layout, verticalAlign: 'top', children: [p(`${layout}-child`)] })), { id: 'section', type: 'section', layout: 'row', verticalAlign: 'top', children: [p('section-child')] }];
  assert.equal(validContentBlocks(blocks), true);
  const html = renderToStaticMarkup(React.createElement(BlockRenderer, { blocks, variant: 'studio' }));
  assert.equal((html.match(/--block-layout-vertical-align:start/g) ?? []).length, 4);
  assert.equal(html.includes('--block-layout-vertical-align:top'), false);
  const source = blockToHtml(columns);
  assert.match(source, /data-layout-vertical-align="top"/);
  for (const id of ['columns', 'left', 'right', 'a', 'b', 'c']) assert.ok(source.includes(`data-block-id="${id}"`));
});

test('unrestricted reduction retains every child in order and equalises surviving widths', () => {
  const before = fixture(); const next = proposeColumnCountChange(before, 1, i => `new-${i}`);
  assert.equal(next.reason, undefined); assert.equal(next.block.children.length, 1);
  assert.deepEqual(ids(next.block), ['a','b','c']); assert.equal(next.block.children[0].width, 100);
  assert.equal(before.children.length, 2); assert.equal(validContentBlocks([next.block]), true);
});

test('destination restrictions refuse moved content while retaining existing disallowed children', () => {
  const before = fixture(); before.children[0].allowedBlocks = ['heading'];
  const denied = proposeColumnCountChange(before, 1, i => `new-${i}`);
  assert.equal(denied.block, before); assert.match(denied.reason, /does not allow/);
  const retained = structuredClone(before); retained.children[1].children = [];
  assert.notEqual(proposeColumnCountChange(retained, 1, i => `new-${i}`).block, retained);
  const images = fixture(); images.children[0].allowedBlocks = ['paragraph']; images.children[1].children = [{ id:'image',type:'image',src:'https://example.test/photo.png',alt:'Example' }];
  assert.equal(proposeColumnCountChange(images, 1, i => `new-${i}`).block, images);
});

test('removal and movement locks refuse reduction without changing content or history', () => {
  for (const lock of ['column-remove','child-move']) {
    const parent = fixture();
    if (lock === 'column-remove') parent.children[1].editorial = { lock: { remove: true } };
    else parent.children[1].children[0].editorial = { lock: { move: true } };
    const h = harness(parent); const proposal = proposeColumnCountChange(parent, 1, i => `new-${i}`);
    assert.equal(proposal.block, parent); assert.match(proposal.reason, /locked block/);
    h.commands.updateColumnCount(parent, 1); assert.equal(h.document, h.original); assert.equal(h.writes, 0);
  }
});

test('count bounds, non-finite input and unchanged count preserve no-op identity', () => {
  const parent = fixture();
  for (const count of [NaN,Infinity,-Infinity,2]) assert.equal(proposeColumnCountChange(parent,count,i=>`new-${i}`).block,parent);
  assert.equal(setColumnCount(parent,NaN,i=>`new-${i}`),parent);
  assert.equal(proposeColumnCountChange(parent,0,i=>`new-${i}`).block.children.length,1);
  assert.equal(proposeColumnCountChange(parent,100,i=>`new-${i}`).block.children.length,6);
});

test('canonical count command rejects stale parent, switched documents and invalid graphs', () => {
  for (const mutation of [d=>({...d,id:'other'}),d=>({...d,blocks:[]}),d=>({...d,blocks:[{...d.blocks[0],gap:32}]}),d=>({...d,blocks:[...d.blocks,p('a')]})]) {
    const h=harness(); const latest=mutation(h.original);h.replace(latest);
    h.commands.updateColumnCount(h.original.blocks[0],1);assert.equal(h.document,latest);assert.equal(h.writes,0);
  }
});

test('count command commits once, Undo/Redo restores both columns, and readers/export round-trip', () => {
  const h = harness(); h.commands.updateColumnCount(h.original.blocks[0],1);
  assert.equal(h.writes,1); assert.equal(validContentBlocks(h.document.blocks),true); assert.deepEqual(ids(h.document.blocks[0]),['a','b','c']);
  const history=commitHistory(h.original,[]);const undone=undoHistory(h.document,history.history,history.future);
  assert.deepEqual(undone.workspace,h.original);assert.deepEqual(redoHistory(undone.workspace,undone.history,undone.future).workspace,h.document);
  const workspace=structuredClone(initialStudioWorkspace);workspace.documents[0].blocks=h.document.blocks;
  assert.deepEqual(validateStudioWorkspace(JSON.parse(JSON.stringify(workspace))).documents[0].blocks,h.document.blocks);
  const definition=blocksToMiniGolfPageDefinition(h.document.blocks,{pageId:'mini-golf-home',instanceId:'fixture',source:{revision:'local-fixture',fileHashes:{}}});
  assert.deepEqual(miniGolfPageDefinitionToBlocks(JSON.parse(JSON.stringify(definition))),h.document.blocks);
  const html=blockToHtml(h.document.blocks[0]);for(const id of ['a','b','c'])assert.ok(html.includes(`data-block-id="${id}"`));
});

test('new column identities allocate once when an updater is replayed', () => {
  const original={id:'document',blocks:[fixture()]};let update;
  const commands=createCommands({activeDocument:original,updateActiveDocument:callback=>{update=callback;}});
  commands.updateColumnCount(original.blocks[0],3);
  const first=update(original),second=update(structuredClone(original));
  assert.deepEqual(first,second);assert.equal(first.blocks[0].children.length,3);assert.equal(validContentBlocks(first.blocks),true);
});

async function astOf(path) { const source=await readFile(new URL(path,import.meta.url),'utf8');return ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX); }
function nodes(ast,predicate) { const found=[];function visit(node){if(predicate(node))found.push(node);ts.forEachChild(node,visit);}visit(ast);return found; }
function expression(node,ast,context) {return vm.runInNewContext(ts.transpileModule(node.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);}

test('actual Main, Mini Golf, Template and Library callbacks dispatch the canonical count command',async()=>{
  for(const path of ['../app/studio/studio-prototype.tsx','../app/studio/mini-golf-site-editor.tsx']) {
    const ast=await astOf(path);const property=nodes(ast,n=>ts.isPropertyAssignment(n)&&n.name.getText(ast)==='onColumnCountChange')[0];const h=harness();
    expression(property.initializer,ast,{blockCommands:h.commands})(h.original.blocks[0],1);assert.deepEqual(ids(h.document.blocks[0]),['a','b','c']);assert.equal(h.document.blocks[0].children.length,1);
  }
  const template=await astOf('../app/studio/template-editor.tsx');const attribute=nodes(template,n=>ts.isJsxAttribute(n)&&n.name.getText(template)==='onColumnCountChange')[0];const h=harness();
  expression(attribute.initializer.expression,template,{commands:h.commands})(h.original.blocks[0],1);assert.equal(h.document.blocks[0].children.length,1);
  const library=await astOf('../app/studio/ui/blocks/block-specimen-catalogue.tsx');const handler=nodes(library,n=>ts.isJsxAttribute(n)&&n.name.getText(library)==='onColumnCountChange')[0];const fixtureHarness=harness();
  expression(handler.initializer.expression,library,{commands:fixtureHarness.commands,inspectorBlock:fixtureHarness.original.blocks[0]})(1);assert.equal(fixtureHarness.document.blocks[0].children.length,1);
});

test('actual Columns inspector disables a refused reduction and exposes its reason',async()=>{
  const ast=await astOf('../app/studio/studio-inspectors.tsx');const owner=nodes(ast,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='ColumnsInspector')[0];
  const context={React,useId:()=> 'count-help',proposeColumnCountChange,InspectorAccordionSection:()=>null,AcmIcon:()=>null};
  const code=ts.transpileModule(`${owner.getText(ast)}\nColumnsInspector;`,{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
  const Inspector=vm.runInNewContext(code,context);const blocked=fixture();blocked.children[0].allowedBlocks=['heading'];
  const tree=Inspector({block:blocked,onChange:()=>assert.fail('Wrong owner'),onCountChange:()=>assert.fail('Disabled reduction')});
  const found=[];function walk(n){if(!React.isValidElement(n))return;found.push(n);React.Children.forEach(n.props.children,walk);}walk(tree);
  const button=found.find(n=>n.type==='button'&&n.props['aria-label']==='Remove column');assert.equal(button.props.disabled,true);assert.equal(button.props['aria-describedby'],'count-help');
  assert.match(found.find(n=>n.type==='p'&&n.props.id==='count-help').props.children,/does not allow/);
  const available=Inspector({block:fixture(),onChange:()=>assert.fail('Wrong owner'),onCountChange:count=>assert.equal(count,1)});
  found.length=0;walk(available);const remove=found.find(n=>n.type==='button'&&n.props['aria-label']==='Remove column');assert.equal(remove.props.disabled,false);remove.props.onClick();
});
