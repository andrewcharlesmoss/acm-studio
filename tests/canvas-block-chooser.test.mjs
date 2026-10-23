import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { readStudioSource } from './studio-module-source.mjs';
import { loadProductionModule } from './production-module.mjs';
const { captureCanvasInsertionTarget, canvasInsertionTargetCurrent, canvasBlockChoices } = await loadProductionModule(new URL('../app/studio/canvas-insertion-target.ts', import.meta.url));
const { useStudioBlockCommands: createCommands } = await loadProductionModule(new URL('../app/studio/use-studio-block-commands.ts', import.meta.url));
const p = id => ({ id, type: 'paragraph', text: id });
const document = { id: 'doc', blocks: [p('a'), { id: 'group', type: 'group', layout: 'flow', children: [p('b')] }, p('c')] };
const canvas = ts.createSourceFile('canvas.tsx', process.env.STUDIO_CANVAS_CALLBACK_SOURCE ? readFileSync(process.env.STUDIO_CANVAS_CALLBACK_SOURCE, 'utf8') : readStudioSource('app/studio/studio-canvas.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
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
    const scope={writableRef:{current:true},canvasInserterCurrent:true,canvasInserter:{target},canvasChoices:[{type:'heading'}],activeDocument:current,findBlockById:(blocks,id)=>blocks.find(block=>block.id===id),onInsertBlock:(type,id)=>commands.insertBlock(type,null,id),insertLibraryBlockAt:(type,index,parentId)=>commands.insertBlock(type,index-1,parentId,parentId?index:undefined),setPendingGroupLayoutBlockId(){},closeCanvasInserter(){closed=true;},focusInsertedBlock(id){focused=id;}};
    runInNewContext(functionCode('insertFromCanvasChooser'),scope);
    scope.handler('heading');
    const inserted=parentId?current.blocks.find(block=>block.id===parentId).children[1]:current.blocks[1];
    assert.equal(inserted.type,'heading');assert.equal(focused,inserted.id);assert.equal(closed,true);
    closed=false;scope.canvasInserterCurrent=false;scope.handler('heading');assert.equal(closed,false);
  }
});
test('Browse All explicitly transfers root/nested destination and search into the pane', () => {
  for(const parentId of [null,'group']) {
    let opened, retained;
    const scope={activeDocument:document,findBlockById:(blocks,id)=>blocks.find(block=>block.id===id),writableRef:{current:true},canvasInserterCurrent:true,canvasInserter:{target:captureCanvasInsertionTarget(document,parentId?null:0,parentId),query:'image'},closeCanvasInserter(){},setInserterBoundaryTarget(target){retained=target;},openInserter:(...args)=>{opened=args;}};
    runInNewContext(functionCode('browseAllCanvasBlocks'),scope);
    scope.handler();assert.deepEqual(opened,[parentId?null:0,'image',parentId]);
    assert.equal(retained,parentId?scope.canvasInserter.target:undefined);
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


test('nested Group chooser and Browse all insert before the existing child and refuse stale handoffs', () => {
  for (const browseAll of [false, true]) {
    let current = structuredClone(document);
    const target = captureCanvasInsertionTarget(current, -1, 'group');
    const commands = createCommands({ activeDocument: current, updateActiveDocument: update => { current = update(current); } });
    let closed = false;
    const scope = {
      writableRef: { current: true }, canvasInserterCurrent: true, canvasInserter: { target },
      canvasChoices: [{ type: 'heading' }], inserterParentId: 'group', inserterBoundaryTarget: target, activeDocument: current,
      canvasInsertionTargetCurrent, findBlockById: (blocks, id) => blocks.find(block => block.id === id),
      onInsertBlock() { assert.fail('An exact Group boundary must not append'); },
      insertLibraryBlockAt: (type, index, parentId) => commands.insertBlock(type, index - 1, parentId, index),
      setPendingGroupLayoutBlockId() {}, setInserterBoundaryTarget() {}, finishInserterClose() { closed = true; },
      closeCanvasInserter() { closed = true; }, focusInsertedBlock() {},
    };
    const code = functionCode(browseAll ? 'insertFromBlockInserter' : 'insertFromCanvasChooser');
    runInNewContext(code, scope);
    scope.handler('heading');
    assert.deepEqual(current.blocks.find(block => block.id === 'group').children.map(block => block.type), ['heading', 'paragraph']);
    assert.equal(closed, true);
    assert.equal(current.blocks[0].id, 'a');
    assert.equal(current.blocks[2].id, 'c');
    if (browseAll) {
      closed = false;
      scope.activeDocument = current;
      scope.handler('heading');
      assert.equal(closed, false, 'Sibling changes invalidate the retained pane boundary');
      assert.equal(current.blocks.find(block => block.id === 'group').children.length, 2);
      scope.writableRef.current = false;
      scope.activeDocument = document;
      scope.handler('heading');
      assert.equal(closed, false, 'A lost writer cannot insert');
    }
  }
});

test('real Group and Section markup exposes each nested boundary only while writable', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { BlockField } = await loadProductionModule(new URL('../app/studio/studio-canvas.tsx', import.meta.url));
  for (const type of ['group', 'section']) for (const count of [1, 3]) {
    const block = { id: 'legacy-main', type, tagName: 'main', layout: 'flow', role: 'main', children: Array.from({ length: count }, (_, i) => p(`p${i}`)) };
    const render = writable => renderToStaticMarkup(createElement(BlockField, { block, writable, onOpenNestedInserter() {}, onChange() {}, onTableCellFocus() {}, onTextSelection() {}, onLinkActivate() {} }));
    const html = render(true);
    assert.equal((html.match(/class="between-blocks nested-between-blocks"/g) || []).length, count);
    assert.equal((html.match(/class="between-blocks nested-end-inserter"/g) || []).length, 1);
    assert.ok(html.indexOf('Add block before Paragraph') < html.indexOf('data-studio-block-id="p0"'));
    assert.equal((render(false).match(/class="between-blocks nested-between-blocks"/g) || []).length, 0);
  }
});


test('Quote Browse all preserves legacy append instead of unsupported numeric insertion', () => {
  const quote = { id: 'quote', type: 'quote', text: 'Retained quotation' };
  const source = { id: 'doc', blocks: [quote] };
  let opened;
  const scope = { activeDocument: source, findBlockById: () => quote, writableRef: { current: true }, canvasInserterCurrent: true,
    canvasInserter: { target: captureCanvasInsertionTarget(source, null, quote.id), query: '' },
    closeCanvasInserter() {}, openInserter: (...args) => { opened = args; },
    setInserterBoundaryTarget() { assert.fail('Quote retains its legacy append command'); },
  };
  runInNewContext(functionCode('browseAllCanvasBlocks'), scope);
  scope.handler();
  assert.deepEqual(opened, [null, '', quote.id]);
});


test('actual nested boundary button callback forwards its Group owner and before-child index', () => {
  let callback;
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(canvas) === 'CanvasInserterButton') {
      const attr = name => node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(canvas) === name);
      if (attr('className')?.initializer?.getText(canvas) === '"between-blocks nested-between-blocks"') callback = attr('onClick').initializer.expression.getText(canvas);
    }
    ts.forEachChild(node, visit);
  }
  visit(canvas);
  assert.ok(callback);
  for (const index of [0, 1, 2]) {
    let opened;
    const anchor = {};
    runInNewContext(`(${ts.transpileModule(callback, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText.trim().replace(/;$/, '')})({currentTarget:anchor})`, { block: { id: 'legacy-main' }, index, anchor, onOpenNestedInserter: (...args) => { opened = args; } });
    assert.deepEqual(opened, ['legacy-main', anchor, index - 1]);
  }
});

test('Browse all exact Group insertion retains the canonical new-Group layout chooser', () => {
  const inserted = { id: 'new-group', type: 'group', layout: 'flow', children: [] };
  let pending, closed = false;
  const scope = { writableRef: { current: true }, activeDocument: document,
    inserterBoundaryTarget: captureCanvasInsertionTarget(document, -1, 'group'), canvasInsertionTargetCurrent,
    onInsertBlockAt: (type, index, parentId) => { assert.equal(type, 'group'); assert.equal(index, 0); assert.equal(parentId, 'group'); return inserted; },
    setPendingGroupLayoutBlockId: value => { pending = value; },
    finishInserterClose() { closed = true; }, setInserterBoundaryTarget() {}, focusInsertedBlock() {},
  };
  runInNewContext(functionCode('insertLibraryBlockAt'), scope);
  scope.insertLibraryBlockAt = scope.handler;
  runInNewContext(functionCode('insertFromBlockInserter'), scope);
  scope.handler('group');
  assert.equal(pending, inserted.id);
  assert.equal(closed, true);
});

test('shared horizontal Quote appender opens its anchored chooser and commits an allowed child', () => {
  let current = { id: 'doc', blocks: [{ id: 'quote', type: 'quote', text: 'Retained quotation', attribution: 'Author' }] };
  const original = structuredClone(current);
  const commands = createCommands({ activeDocument: current, updateActiveDocument: update => { current = update(current); } });
  const anchor = {};
  let opened;
  let declaration;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'NestedBlockAppender') declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(canvas);
  const source = ts.transpileModule(`${declaration.getText(canvas)};globalThis.appender=NestedBlockAppender;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, jsxFactory: 'createElement' },
  }).outputText;
  const scope = { createElement: (_type, props) => props, CanvasInserterButton() {} };
  runInNewContext(source, scope);
  for (const writable of [false, true]) {
    const button = scope.appender({ parentId: 'quote', horizontal: true, writable, onOpen: (...args) => { opened = args; } });
    assert.equal(button.className, 'between-blocks nested-end-inserter');
    assert.equal(button.showLabel, false);
    assert.equal(button.disabled, !writable);
    button.onClick({ currentTarget: anchor });
    if (!writable) assert.equal(opened, undefined);
  }
  assert.deepEqual(opened, ['quote', anchor]);
  const target = captureCanvasInsertionTarget(current, null, opened[0]);
  const choices = canvasBlockChoices(current, target, '');
  assert.ok(choices.some(item => item.type === 'paragraph'));
  let closed = false;
  const chooser = { writableRef: { current: true }, canvasInserterCurrent: true, canvasInserter: { target }, canvasChoices: choices,
    activeDocument: current, findBlockById: blocks => blocks[0], onInsertBlock: (type, parentId) => commands.insertBlock(type, null, parentId),
    closeCanvasInserter() { closed = true; }, focusInsertedBlock() {}, setPendingGroupLayoutBlockId() {} };
  runInNewContext(functionCode('insertFromCanvasChooser'), chooser);
  chooser.handler('paragraph');
  assert.equal(closed, true);
  assert.deepEqual(current.blocks[0].children.map(child => child.type), ['paragraph', 'paragraph']);
  assert.equal(current.blocks[0].children[0].text, 'Retained quotation');
  assert.equal(current.blocks[0].attribution, 'Author');
  assert.deepEqual(original.blocks[0], { id: 'quote', type: 'quote', text: 'Retained quotation', attribution: 'Author' });
});

test('trailing prompt Return appends even empty paragraphs and retains the caret below them', () => {
  let handler;
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(canvas) === 'input') {
      const attrs = node.attributes.properties;
      if (attrs.some(attr => attr.name?.getText(canvas) === 'aria-label' && attr.initializer?.text === 'Type / to choose a block')) {
        handler = attrs.find(attr => attr.name?.getText(canvas) === 'onKeyDown').initializer.expression.getText(canvas);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(canvas);
  assert.ok(handler);
  const code = ts.transpileModule(`globalThis.keydown = ${handler}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const value of ['', '  ', 'A new paragraph']) {
    const blocks = [p('existing')];
    let focused = false, prevented = false, selected = 'existing', updates = 0, reject = true;
    const scope = { writableRef: { current: true }, appenderValue: value, activeDocument: { blocks },
      onInsertBlockAt(type, index) { if (reject) return null; assert.equal(type, 'paragraph'); assert.equal(index, blocks.length); const block = { id: 'new', type, text: '' }; blocks.splice(index, 0, block); return block; },
      onUpdateBlock(id, update) { updates += 1; blocks[1] = update(blocks[1]); }, textToRuns: text => [{ text }],
      setAppenderValue(value) { scope.appenderValue = value; }, setAppenderActive(value) { assert.equal(value, true); },
      onClearBlockSelection() { selected = null; },
    };
    runInNewContext(code, scope);
    const event = { key: 'Enter', nativeEvent: {}, currentTarget: { focus() { focused = true; } }, preventDefault() { prevented = true; } };
    for (const extra of [{ nativeEvent: { isComposing: true } }, { nativeEvent: { keyCode: 229 } }, { shiftKey: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
      scope.keydown({ ...event, ...extra }); assert.equal(blocks.length, 1);
    }
    scope.writableRef.current = false; scope.keydown(event); assert.equal(blocks.length, 1);
    scope.writableRef.current = true; scope.keydown(event);
    assert.equal(blocks.length, 1); assert.equal(scope.appenderValue, value); assert.equal(selected, 'existing'); assert.equal(focused, false);
    reject = false; scope.keydown(event);
    assert.equal(blocks.length, 2); assert.equal(blocks[1].text, value);
    assert.equal(updates, value.length > 0 ? 1 : 0, 'empty Return must create only the insertion history entry');
    assert.equal(scope.appenderValue, ''); assert.equal(selected, null);
    assert.equal(focused, true); assert.equal(prevented, true);
  }
});
