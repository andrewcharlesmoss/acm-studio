import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { runInNewContext } from 'node:vm';
import { loadProductionModule } from './production-module.mjs';
import { readStudioSource } from './studio-module-source.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { blockInserterOptions, groupAllowsChild, permitsBlockTreeChanges, parentOfNestedBlock } = await load('../app/studio/block-inserter-options.ts');
const { insertBlockAtTarget, moveBlockToTarget } = await load('../app/studio/block-placement.ts');
const { blockCatalogue } = await load('../app/studio/editor-model.ts');
const { availableBlockTransforms } = await load('../app/studio/block-transforms.ts');
const { findContentBlock: findBlockById } = await load('../app/content/block-tree.ts');
const { cloneClipboardPayloadForInsertion } = await load('../app/studio/block-clipboard.ts');
const { copiedBlocksForParent } = await load('../app/studio/block-copy.ts');
const { editBlockSiblings } = await load('../app/studio/block-sibling-operations.ts');
const { useStudioBlockCommands } = await load('../app/studio/use-studio-block-commands.ts');
const p = id => ({ id, type:'paragraph', text:id });
const heading = { id:'heading', type:'heading', level:2, text:'Heading' };
const source = ts.createSourceFile('canvas.tsx', readStudioSource('app/studio/studio-canvas.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) { if (ts.isJsxAttribute(node) && node.name.getText(source) === 'onPasteCapture' && node.initializer.expression.getText(source).includes('currentListTextRange()')) handler=node.initializer.expression; ts.forEachChild(node,visit); }
visit(source);
const pasteCode = ts.transpileModule(`globalThis.paste=${handler.getText(source)};`, { compilerOptions:{target:ts.ScriptTarget.ES2022} }).outputText;
for (const type of ['group','column']) for (const allowedBlocks of [[],['paragraph']]) test(`${type} legacy ${JSON.stringify(allowedBlocks)} offers insertion, movement, transforms and Canvas paste`,()=>{
  const parent={id:'parent',type,...(type==='group'?{layout:'flow'}:{}),allowedBlocks,children:[p('anchor')]};
  const roots=type==='column'?[{id:'columns',type:'columns',children:[parent]},heading]:[parent,heading];
  assert.deepEqual(blockInserterOptions(blockCatalogue,parent,''),blockInserterOptions(blockCatalogue,{...parent,allowedBlocks:undefined},''));
  let document={blocks:roots};
  const commands=useStudioBlockCommands({activeDocument:document,updateActiveDocument:update=>{document=update(document);}});
  assert.ok(commands.insertBlock('heading',null,'parent'));
  assert.equal(findBlockById(document.blocks,'parent').children.at(-1).type,'heading');
  if(type==='column') assert.equal(findBlockById(moveBlockToTarget(roots,'heading',{parentId:'parent',index:1}),'parent').children[1].id,'heading');
  assert.deepEqual(availableBlockTransforms(parent.children[0],parent),availableBlockTransforms(parent.children[0],{...parent,allowedBlocks:undefined}));
  let committed;
  const scope={writable:true,previewing:false,codeEditor:null,currentListTextRange:()=>null,readBlockClipboardPayload:()=>({blocks:[heading],footnotes:[]}),findBlockById,parentOfNestedBlock,cloneClipboardPayloadForInsertion,copiedBlocksForParent,editBlockSiblings,Element:class{},selectedBlockId:'anchor',activeDocument:{blocks:roots},applyBlockList:next=>{assert.equal(permitsBlockTreeChanges(roots,next),true);committed=next;return true;},focusInsertedBlock:()=>{}};
  runInNewContext(pasteCode,scope);
  scope.paste({target:{},clipboardData:{getData:()=>''},preventDefault(){},stopPropagation(){}});
  assert.equal(findBlockById(committed,'parent').children[1].type,'heading');
  assert.deepEqual(findBlockById(committed,'parent').allowedBlocks,allowedBlocks);
  assert.deepEqual(parent.children,[p('anchor')]);
});
test('structural child owners still reject incompatible insertion and tree proposals',()=>{
  for (const parent of [{id:'columns',type:'columns',children:[]},{id:'buttons',type:'buttons',children:[]},{id:'social',type:'social-icons',children:[]},{id:'list',type:'list',style:'unordered',items:[]}]) {
    assert.equal(groupAllowsChild(parent,'heading'),false);
    assert.equal(insertBlockAtTarget([parent],heading,{parentId:parent.id,index:0})[0],parent);
    if(parent.type!=='list') assert.equal(permitsBlockTreeChanges([parent],[{...parent,children:[heading]}]),false);
  }
});
