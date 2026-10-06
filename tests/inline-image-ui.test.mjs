import assert from 'node:assert/strict';
import { readStudioSource } from "./studio-module-source.mjs";
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const image = await load('../app/content/inline-image.ts');
const rich = await load('../app/content/rich-text.ts');
const lists = await load('../app/studio/list-structure.ts');
const listText = await load('../app/content/list-item-text.ts');
const model = await load('../app/content/model.ts');
const validation = await load('../app/studio/workspace-validation.ts');
const treeOps = await load('../app/studio/block-sibling-operations.ts');
const table = await load('../app/content/table-row-sections.ts');
const tablePresentation = await load('../app/content/table-presentation.ts');
const tableMetadata = await load('../app/content/table-cell-metadata.ts');
const embedConversion = await load('../app/studio/embed-link-conversion.ts');
const operations = await import('../app/studio/studio-command-operations.mjs');
const source = readStudioSource("app/studio/studio-canvas.tsx");
const ast = ts.createSourceFile('canvas.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
function collect(node) { if (ts.isFunctionDeclaration(node) && node.name) declarations.set(node.name.text, node); ts.forEachChild(node, collect); }
collect(ast);
function bind(names, scope) {
  const code = names.map(name => declarations.get(name).getText(ast)).join('\n') + `\nObject.assign(globalThis, {${names.join(',')}});`;
  runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText.replace(/export /g, ''), scope);
}
const descriptor = { type: 'image', mediaId: 'managed', alt: '', width: 150 };
function harness(block = { id: 'p', type: 'paragraph', text: 'ab' }, selection = { start: 1, end: 1 }, deferred = false) {
  const writes = [], frames = [], restored = [];
  const editor = { isConnected: true, dataset: { studioBlockId: block.id }, closest: () => null };
  const scope = { ...image, ...rich, ...lists, ...listText, ...validation, ...treeOps, listItemText: model.listItemText, findBlockById: operations.findBlockById,
    currentDocumentRef: { current: { id: 'doc', blocks: [structuredClone(block)] } }, writableRef: { current: true }, selectedLinkOwnerRef: { current: block.id }, imageEpochRef: { current: 0 }, imageDismissedRef: { current: null }, imageTarget: null, imagePickerOpen: false, document: { activeElement: editor },
    prepareRichTextFormTarget(_keep, captured) { return { ...captured, documentSnapshot: JSON.stringify(scope.currentDocumentRef.current.blocks) }; }, dismissRichTextForms() {}, setRichTextMenuBlockId() {}, onSetPublishFeedback() {}, onSelectBlock(id) { scope.selectedLinkOwnerRef.current = id; },
    setImageTarget(value) { scope.imageTarget = typeof value === 'function' ? value(scope.imageTarget) : value; }, setImagePickerOpen(value) { scope.imagePickerOpen = value; },
    richFormSelectionEpochRef: { current: 0 }, restoreMathSelection(...args) { restored.push(args); }, requestAnimationFrame(fn) { frames.push(fn); },
    onUpdateBlock(id, updater) { const apply = () => { scope.currentDocumentRef.current = operations.updateBlockById(scope.currentDocumentRef.current, id, updater); }; if (deferred) writes.push(apply); else apply(); },
  };
  bind(['isEditableTextBlock','isEditableRichTextBlock','richTextContent','withRichTextContent','richTextFieldFromDocument','currentLanguageField','currentImageField','captureImage','openInlineImagePicker','activateInlineImage','closeInlineImage','changeInlineImage'], scope);
  const field = scope.richTextFieldFromDocument(editor, scope.currentDocumentRef.current);
  scope.languageCaptureRef = { current: { documentId: 'doc', ownerId: block.id, blockId: block.id, itemIndex: field.itemIndex, listId: field.listId, cell: field.cell, editor, selection, baseline: JSON.stringify(field.runs), blockSnapshot: JSON.stringify(block) } };
  return { scope, editor, writes, frames, restored, block: () => scope.currentDocumentRef.current.blocks[0], flush: () => { while(writes.length) writes.shift()(); while(frames.length) frames.shift()(); } };
}
test('actual Canvas insertion replaces one range and restores one-slot caret', () => {
  const h = harness(); h.scope.openInlineImagePicker();
  assert.equal(h.scope.changeInlineImage(descriptor, true), true);
  assert.equal(h.block().text, 'a\uFFFCb');
  assert.equal(h.block().runs[1].inline.alt, '');
  assert.equal(h.scope.imageTarget, null);
  assert.deepEqual(h.restored.at(-1).slice(1,3), [2,2]);
});
test('actual Canvas rejects stale decoding targets before committing', () => {
  for (const change of [h=>h.scope.closeInlineImage(false), h=>h.scope.writableRef.current=false, h=>h.scope.currentDocumentRef.current.id='other', h=>h.scope.selectedLinkOwnerRef.current='other', h=>h.editor.isConnected=false, h=>h.scope.currentDocumentRef.current.blocks[0].text='changed']) {
    const h = harness(); h.scope.openInlineImagePicker(); change(h);
    assert.equal(h.scope.changeInlineImage(descriptor, true), false);
    assert.ok(!h.block().runs);
  }
});
test('chosen updater survives dismissal but rejects replay against changed actual state', () => {
  const accepted = harness(undefined, undefined, true); accepted.scope.openInlineImagePicker(); accepted.scope.changeInlineImage(descriptor,true); accepted.flush();
  assert.equal(accepted.block().text, 'a\uFFFCb');
  for (const change of [h=>h.scope.writableRef.current=false, h=>h.scope.currentDocumentRef.current.id='other', h=>h.scope.selectedLinkOwnerRef.current='other', h=>h.scope.currentDocumentRef.current.blocks[0].editorial={name:'Changed'}, h=>h.scope.currentDocumentRef.current.blocks[0].text='different']) {
    const h=harness(undefined,undefined,true); h.scope.openInlineImagePicker(); h.scope.changeInlineImage(descriptor,true); change(h); h.flush(); assert.ok(!h.block().runs);
  }
});
test('exact atom activation closes when caret or wider range leaves it; form focus retains it', () => {
  const block={id:'p',type:'paragraph',text:'a\uFFFCb',runs:[{text:'a'},image.inlineImageRun(descriptor),{text:'b'}]};
  for(const selection of [{start:2,end:2},{start:0,end:2}]) { const h=harness(block); h.scope.activateInlineImage(h.editor,{start:1,end:2},true); assert.ok(h.scope.imageTarget); h.scope.activateInlineImage(h.editor,selection); assert.equal(h.scope.imageTarget,null); }
  const h=harness(block); h.scope.activateInlineImage(h.editor,{start:1,end:2},true); h.scope.document.activeElement={}; h.scope.activateInlineImage(h.editor,{start:2,end:2}); assert.ok(h.scope.imageTarget);
});
test('stale invalidation frame cannot be cancelled by restoring state or close a new target', () => {
  const node = [...declarations.get('StudioCanvasContent').body.statements].find(n=>ts.isExpressionStatement(n)&&n.expression.getText(ast).startsWith('useLayoutEffect(() => {\n    if (!imageTarget || imageVisible)'));
  assert.ok(node); const callback=node.expression.arguments[0].getText(ast);
  for(const fresh of [false,true]) { const h=harness(); h.scope.openInlineImagePicker(); h.scope.imageVisible=false; runInNewContext(ts.transpileModule(`globalThis.invalidate=${callback}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,h.scope); h.scope.invalidate(); if(fresh) h.scope.openInlineImagePicker(); h.scope.imageVisible=true; h.flush(); assert.equal(Boolean(h.scope.imageTarget),fresh); }
});
// The dynamically evaluated renderer receives production props rather than a public component contract.
// eslint-disable-next-line react/prop-types
const common={...rich,...table,...tablePresentation,...tableMetadata,...embedConversion,React,useContext:()=>({}),useFootnoteNumbers:()=>new Map(),useId:()=> 'caption',useRef:()=>({current:null}),useLayoutEffect:()=>{},useState:value=>[value,()=>{}],useTableCaption:()=>({visible:true}),FootnoteNumbersContext:{},normaliseTableColumnWidths:count=>Array(count).fill(100/count),blockAlignmentClass:()=>'',imageDisplayStyle:()=>({}),resolveEmbedProvider:()=>true,EmbedContent:()=>React.createElement('div'),renderText:(text,runs,urls)=>React.createElement('span',{dangerouslySetInnerHTML:{__html:runs.map(run=>run.inline?.type==='image'?image.inlineImageHtml(run.inline,urls,true):run.text).join('')}}),RichTextEditor:props=>React.createElement('span',{'aria-label':props['aria-label'],dangerouslySetInnerHTML:{__html:(props.runs ?? []).map(run=>run.inline?.type==='image'?image.inlineImageHtml(run.inline,props.mediaUrls,true):run.text).join('')}})};
bind(['TableField','EmbedUrlField','BlockFieldContent'],common);
test('actual field renderers pass managed images into Table cells and all captions',()=>{
 const runs=[image.inlineImageRun(descriptor)],urls={managed:'blob:owned'};
 for(const block of [{id:'t',type:'table',rows:[['\uFFFC']],cellRuns:[[runs]],caption:'\uFFFC',captionRuns:runs},{id:'i',type:'image',src:'/image.png',alt:'',caption:'\uFFFC',captionRuns:runs},{id:'e',type:'embed',url:'https://example.com',caption:'\uFFFC',captionRuns:runs}]) {
  const markup=renderToStaticMarkup(React.createElement(common.BlockFieldContent,{block,selectedBlockId:block.id,writable:true,mediaUrls:urls,onChange(){},onTableCellFocus(){},onTextSelection(){},onLinkActivate(){}}));
  assert.equal((markup.match(/src="blob:owned"/g)??[]).length,block.type==='table'?2:1,block.type); assert.doesNotMatch(markup,/Image unavailable/);
 }
 const block={id:'e',type:'embed',url:'https://example.com',caption:'\uFFFC',captionRuns:runs};
 assert.match(renderToStaticMarkup(React.createElement(common.BlockFieldContent,{block,mediaUrls:urls,selectedBlockId:null})),/src="blob:owned"/);
});
async function uiFunction(path,name,bindings) {
 const text=await readFile(new URL(path,import.meta.url),'utf8'),tree=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let declaration; function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)declaration=node;ts.forEachChild(node,visit);}visit(tree);assert.ok(declaration);
 runInNewContext(ts.transpileModule(declaration.getText(tree)+`\nglobalThis.actual=${name};`,{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText.replace(/export /g,''),bindings);return bindings.actual;
}
function descendants(element) { if(!element||typeof element!=='object')return [];return [element,...React.Children.toArray(element.props?.children).flatMap(descendants)]; }
test('actual image form uses changed-only Apply, validates widths and retains blank alternative text',async()=>{
 for(const [width,alt,enabled] of [['150','',false],['0','',false],['1.5','',false],['2401','',false],['','',true],['90','Description',true]]) {
  let index=0,proposed;const states=[width,alt,false];const bindings={React,useState:()=>[states[index++],()=>{}],StudioAnchoredPopover:()=>{},PopoverHeading:()=>{},StudioButton:()=>{},StudioDialogActions:()=>{}};
  const form=await uiFunction('../app/studio/inline-image-popover.tsx','InlineImagePopover',bindings);
  const elements=descendants(form({value:descriptor,anchor(){},onApply:value=>{proposed=value;return true;},onReplace(){},onClose(){}}));
  const apply=elements.find(el=>el.type===bindings.StudioButton&&el.props.type==='submit');assert.equal(!apply.props.disabled,enabled);
  elements.find(el=>el.type==='form').props.onSubmit({preventDefault(){}});assert.equal(Boolean(proposed),enabled);
  if(width===''&&enabled)assert.ok(!Object.hasOwn(proposed,'width'));
  if(enabled)assert.equal(proposed.alt,alt);
 }
});
test('actual image measurement caps natural width and rejects load failures',async()=>{
 let instance; const bindings={Image:function(){return instance={};},window:{setTimeout:()=>1,clearTimeout(){}}};
 const measure=await uiFunction('../app/studio/inline-image-picker.tsx','measureInlineImage',bindings);
 for(const naturalWidth of [80,500]){const result=measure('/fixture.svg');instance.naturalWidth=naturalWidth;instance.onload();assert.equal(await result,Math.min(naturalWidth,150));}
 const failed=measure('/broken.svg');instance.onerror();await assert.rejects(failed,/Image unavailable/);
});
test('actual picker cancels late decoding and resets a changed media-provider session',async()=>{
 let hook=0,effect,chooseComplete,accepted=0,closed=0;const states=[],refs=[];let widthPromise;
 const bindings={React,safeImageSource:rich.safeImageSource,StudioDialog:()=>{},StudioDialogActions:()=>{},StudioButton:()=>{},URL:{createObjectURL:()=> 'blob:fixture',revokeObjectURL(){}},useEffect:fn=>{effect=fn;},useRef:value=>refs[hook++]??(refs[hook-1]={current:value}),useState:value=>{const i=hook++;if(!(i in states))states[i]=value;return [states[i],next=>states[i]=next];},measureInlineImage:()=>widthPromise};
 const picker=await uiFunction('../app/studio/inline-image-picker.tsx','InlineImagePicker',bindings);
 const provider=async()=>[];
 function render(loadImages=provider){hook=0;return picker({loadImages,replacing:false,returnFocus:{},onChoose:()=>{accepted++;return true;},onClose:()=>{closed++;}});}
 let element=render(),cleanup=effect();await new Promise(resolve=>setImmediate(resolve));
 widthPromise=new Promise(resolve=>chooseComplete=resolve);element=render();
 // Set URL through the real input, then rerender to capture its current value.
 descendants(element).find(el=>el.type==='input'&&el.props.inputMode==='url').props.onChange({target:{value:'/fixture.svg'}});element=render();descendants(element).find(el=>el.type==='form').props.onSubmit({preventDefault(){}});
 cleanup();element=render(async()=>[]);cleanup=effect();await new Promise(resolve=>setImmediate(resolve));chooseComplete(150);await new Promise(resolve=>setImmediate(resolve));assert.equal(accepted,0);
 element=render();assert.equal(descendants(element).find(el=>el.type===bindings.StudioButton&&el.props.type==='submit').props.disabled,false);
 widthPromise=new Promise(resolve=>chooseComplete=resolve);descendants(element).find(el=>el.type==='form').props.onSubmit({preventDefault(){}});element=render();element.props.onClose();chooseComplete(150);await new Promise(resolve=>setImmediate(resolve));assert.equal(accepted,0);assert.equal(closed,1);cleanup();
});
test('actual keyboard handler gives image Tab priority while ordinary and Shift+Tab keep List semantics',()=>{
 for(const [selection,shiftKey,object] of [[{start:0,end:1},false,true],[{start:1,end:1},false,false],[{start:0,end:1},true,false]]) {
  let delegated=0,activated=0,focused=0;const editor={};const scope={...image,editable:true,editorRef:{current:editor},renderedRuns:[image.inlineImageRun(descriptor)],selectionWithinEditor:()=>selection,onKeyDownProp:event=>{delegated++;event.preventDefault();},activateImage:()=>activated++,requestAnimationFrame:fn=>fn(),document:{querySelector:()=>({focus:()=>focused++})}};
  bind(['handleKeyDown'],scope);const event={key:'Tab',shiftKey,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};scope.handleKeyDown(event);
  assert.equal(delegated,object?0:1);assert.equal(activated,object?1:0);assert.equal(focused,object?1:0);
 }
});
test('actual DOM sync preserves identical browser-normalised image nodes before click',()=>{
 const effect=[...declarations.get('RichTextEditor').body.statements].find(node=>ts.isExpressionStatement(node)&&node.expression.getText(ast).startsWith('useLayoutEffect(() => {\n    const editor = editorRef.current;\n    if (!editor) return;\n    const html = runsToEditorHtml'));
 assert.ok(effect);const callback=effect.expression.arguments[0].getText(ast);let replaced=0;const canonical='<img alt="">';
 const editor={get innerHTML(){return canonical;},set innerHTML(value){replaced++;}};
 const scope={editorRef:{current:editor},renderedRuns:[],mediaUrls:{},footnoteNumbers:{},runsToEditorHtml:()=>'<img alt="" />',document:{createElement:()=>({get innerHTML(){return canonical;},set innerHTML(value){}})}};
 runInNewContext(ts.transpileModule(`globalThis.sync=${callback}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,scope);scope.sync();assert.equal(replaced,0);
});
test('chosen updater also rejects a different supplied block without relying on the document ref',()=>{
 const h=harness();let returned;h.scope.onUpdateBlock=(_id,update)=>{returned=update({...h.block(),editorial:{name:'Other writer'}});};h.scope.openInlineImagePicker();h.scope.changeInlineImage(descriptor,true);assert.equal(returned.text,'ab');assert.equal(returned.editorial.name,'Other writer');assert.ok(!returned.runs);
});
