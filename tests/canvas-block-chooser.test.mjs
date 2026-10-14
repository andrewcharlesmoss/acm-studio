import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { runInNewContext } from 'node:vm';
import { readStudioSource } from './studio-module-source.mjs';
import { loadProductionModule } from './production-module.mjs';
const { captureCanvasInsertionTarget, canvasInsertionTargetCurrent, canvasBlockChoices } = await loadProductionModule(new URL('../app/studio/canvas-insertion-target.ts', import.meta.url));
const { useStudioBlockCommands: createCommands } = await loadProductionModule(new URL('../app/studio/use-studio-block-commands.ts', import.meta.url));
const p = id => ({ id, type: 'paragraph', text: id });
const document = { id: 'doc', blocks: [p('a'), { id: 'group', type: 'group', layout: 'flow', children: [p('b')] }, p('c')] };
const canvas = ts.createSourceFile('canvas.tsx', readStudioSource('app/studio/studio-canvas.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function functionCode(name) {
  let found;
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node; ts.forEachChild(node, visit); }
  visit(canvas);
  assert.ok(found, name);
  return ts.transpileModule(`${found.getText(canvas)}; globalThis.handler=${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}
test('root and nested boundaries stay fixed and reject deleted/reordered siblings and foreign documents', () => {
  const target = captureCanvasInsertionTarget(document, 0);
  assert.equal(target.index, 1);
  assert.equal(canvasInsertionTargetCurrent({ ...document, blocks: document.blocks.map(block => block.id === 'a' ? { ...block, text: 'edited' } : block) }, target), true);
  assert.equal(canvasInsertionTargetCurrent({ ...document, blocks: [...document.blocks].reverse() }, target), false);
  assert.equal(canvasInsertionTargetCurrent({ ...document, id: 'other' }, target), false);
  const nested = captureCanvasInsertionTarget(document, null, 'group');
  assert.equal(nested.index, 1);
  assert.equal(canvasInsertionTargetCurrent({ ...document, blocks: [p('a'), p('c')] }, nested), false);
  assert.equal(captureCanvasInsertionTarget(document, null, 'missing'), null);
});
test('quick choices use the canonical six and search reaches all contextual choices', () => {
  const target = captureCanvasInsertionTarget(document, null);
  assert.deepEqual(canvasBlockChoices(document, target, '').map(item => item.type), ['paragraph','list','image','embed','heading','divider']);
  assert.ok(canvasBlockChoices(document, target, 'table').some(item => item.type === 'table'));
  assert.equal(canvasBlockChoices(document, target, 'navigation').length, 0);
  assert.ok(canvasBlockChoices(document, target, 'navigation', { allowTemplateNavigation: true }).some(item => item.type === 'navigation'));
  assert.equal(canvasBlockChoices(document, target, 'page link', { allowTemplatePageLink: true }).length, 0);
  const navigation = { id:'nav',type:'group',layout:'flow',data:{templateElement:'navigation'},children:[] };
  const menuDocument = { id:'doc',blocks:[navigation] };
  assert.deepEqual(canvasBlockChoices(menuDocument,captureCanvasInsertionTarget(menuDocument,null,'nav'),'',{allowTemplatePageLink:true}).map(item=>item.type),['page-link']);
  const quote = { id:'quote',type:'quote',text:'',children:[] };
  const quoted = { id:'doc',blocks:[quote] };
  const choices = canvasBlockChoices(quoted, captureCanvasInsertionTarget(quoted,null,'quote'),'');
  assert.ok(choices.every(item => ['paragraph','heading','list','quote','image'].includes(item.type)));
});
test('production canvas opener leaves pane closed and never mutates unfinished appender text', () => {
  let popup;
  let pane = true;
  const scope = { writableRef:{current:true}, canvasInserter:null, activeDocument:document, captureCanvasInsertionTarget, finishInserterClose:()=>{pane=false;}, setHoveredBlockId(){}, setListViewOpen(){}, setCanvasInserter:value=>{popup=value;}, closeCanvasInserter(){}, appenderValue:'unfinished', onOpenInserter(){throw Error('pane must not open');} };
  runInNewContext(functionCode('openCanvasInserter'), scope);
  const anchor={};
  scope.handler(anchor, 0);
  assert.equal(pane,false);
  assert.equal(popup.anchor,anchor);
  assert.equal(popup.target.index,1);
  assert.equal(scope.appenderValue,'unfinished');
  popup=null;scope.writableRef.current=false;scope.handler(anchor,0);assert.equal(popup,null);
});
test('production chooser uses root boundary or explicit nested owner, closes and focuses inserted block', () => {
  for (const parentId of [null,'group']) {
    let current=structuredClone(document);
    let closed=false, focused;
    const commands=createCommands({activeDocument:current,updateActiveDocument:update=>{current=update(current);}});
    const target=captureCanvasInsertionTarget(current,parentId?null:0,parentId);
    const scope={writableRef:{current:true},canvasInserterCurrent:true,canvasInserter:{target},canvasChoices:[{type:'heading'}],activeDocument:current,findBlockById:(blocks,id)=>blocks.find(block=>block.id===id),onInsertBlock:(type,id)=>commands.insertBlock(type,null,id),insertLibraryBlockAt:(type,index)=>commands.insertBlock(type,index-1),setPendingGroupLayoutBlockId(){},closeCanvasInserter(){closed=true;},focusInsertedBlock(id){focused=id;}};
    runInNewContext(functionCode('insertFromCanvasChooser'),scope);
    scope.handler('heading');
    const inserted=parentId?current.blocks.find(block=>block.id===parentId).children[1]:current.blocks[1];
    assert.equal(inserted.type,'heading');assert.equal(focused,inserted.id);assert.equal(closed,true);
    closed=false;scope.canvasInserterCurrent=false;scope.handler('heading');assert.equal(closed,false);
  }
});
test('Browse All explicitly transfers root/nested destination and search into the pane', () => {
  for(const parentId of [null,'group']) {
    let opened;
    const scope={writableRef:{current:true},canvasInserterCurrent:true,canvasInserter:{target:captureCanvasInsertionTarget(document,parentId?null:0,parentId),query:'image'},closeCanvasInserter(){},openInserter:(...args)=>{opened=args;}};
    runInNewContext(functionCode('browseAllCanvasBlocks'),scope);
    scope.handler();assert.deepEqual(opened,[parentId?null:0,'image',parentId]);
  }
});
test('actual JSX canvas plus callbacks route to the chooser with their root boundaries', () => {
  const handlers = new Map();
  function visit(node) {
    if(ts.isJsxOpeningElement(node)) {
      const attr=name=>node.attributes.properties.find(item=>ts.isJsxAttribute(item)&&item.name.getText(canvas)===name);
      const className=attr('className')?.initializer?.getText(canvas);
      if(['"canvas-appender-button"','"between-blocks"','"between-blocks cover-inserter"'].includes(className)) handlers.set(className,attr('onClick').initializer.expression.getText(canvas));
    }
    ts.forEachChild(node,visit);
  }
  visit(canvas);
  assert.equal(handlers.size,3);
  for(const [className,callback] of handlers) {
    let opened;
    const anchor={};
    const scope={activeDocument:document,index:2,event:{currentTarget:anchor},openCanvasInserter:(...args)=>{opened=args;}};
    runInNewContext(ts.transpileModule(`(${callback})(event)`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,scope);
    assert.equal(opened[0],anchor);
    assert.equal(opened[1],className.includes('cover-inserter')?-1:className.includes('appender')?2:1);
  }
});
test('Column insertion retains numeric child boundary and template dispatch retains explicit owners', () => {
  const column={id:'column',type:'column',children:[p('child')]};
  const doc={id:'doc',blocks:[{id:'columns',type:'columns',children:[column]}]};
  let current=doc;
  const commands=createCommands({activeDocument:doc,updateActiveDocument:update=>{current=update(current);}});
  const scope={writableRef:{current:true},canvasInserterCurrent:true,canvasInserter:{target:captureCanvasInsertionTarget(doc,null,'column')},canvasChoices:[{type:'heading'}],activeDocument:doc,findBlockById:()=>column,onInsertBlock(){throw Error('Column must use numeric placement');},insertLibraryBlockAt:(type,index,parentId)=>commands.insertBlock(type,null,parentId,index),setPendingGroupLayoutBlockId(){},closeCanvasInserter(){},focusInsertedBlock(){}};
  runInNewContext(functionCode('insertFromCanvasChooser'),scope);scope.handler('heading');
  assert.equal(current.blocks[0].children[0].children[1].type,'heading');
  for(const type of ['template-content','navigation','page-link']) {
    let forwarded;
    const targetScope={writableRef:{current:true},setPendingGroupLayoutBlockId(){},onInsertTemplateContent:(...args)=>{forwarded=args;return null;},onInsertTemplateNavigation:(...args)=>{forwarded=args;return null;},onInsertTemplatePageLink:(...args)=>{forwarded=args;return null;},onInsertBlockAt(){throw Error('template-only type reached content command');}};
    runInNewContext(functionCode('insertLibraryBlockAt'),targetScope);targetScope.handler(type,1,'column');
    assert.deepEqual(forwarded,[1,'column']);
  }
});
