import test from 'node:test';import assert from 'node:assert/strict';import ts from 'typescript';import {readFileSync} from 'node:fs';
const source=readFileSync(process.env.STUDIO_HOME_OWNER_SOURCE || new URL('../app/studio/studio-prototype.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('studio-prototype.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const owner=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='StudioPrototype');
// Execute the production owner's actual render decisions, including early returns.
// Hook-owned data is supplied at the boundary; this detects a separate preview renderer.
const decisions=owner.body.statements.filter(node=>ts.isIfStatement(node)&&(ts.isReturnStatement(node.thenStatement)||ts.isBlock(node.thenStatement)&&node.thenStatement.statements.some(ts.isReturnStatement))||ts.isReturnStatement(node)||ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>item.name.getText(ast)==='canvasPreviewing')).map(node=>node.getText(ast)).join('\n');
const code=ts.transpileModule('function render(){'+decisions+'}',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const jsx=(type,props)=>({type,props});
const noop=new Proxy(()=>undefined,{get:(_target,key)=>key===Symbol.iterator?function*(){}:noop});
const nodes=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...nodes(node.props?.children)];
function render(editing,document,urls,presentation,overrides={}){
 const bindings={exports:{},hostedHome:true,selectedSite:'test2',homeHost:{editing,busy:false,prepared:false,feedback:''},testSite:{draft:{},failure:null,syncConflict:null,syncResolutionError:null,syncStatus:'primary',label:'Saved',canUndo:false,canRedo:false},globalTemplates:{library:{},session:{}},homeId:document.id,homeError:'',workspace:{activeDocumentId:document.id,documents:[document],bin:[]},previewWindow:false,previewing:false,studioSection:'content',websiteView:false,viewViewport:'desktop',viewportWidthFor:()=>1200,siteName:'Test2',activeDocument:document,workspaceDocument:document,displayedDocument:document,editorWritable:true,hasContentDocuments:true,showTemplate:false,hasTemplate:false,media:{blockUrls:urls,coverImageUrl:urls.image},testPresentation:presentation,withTestSiteNavigation:value=>value,testContext:{collection:{},headerReference:null,publicationFor:()=>({})},syncConflict:null,dependencies:{dialog:null,feedback:null},navigationEditing:{guardNavigationLink(){},feedback:null},selectedBlockId:null,documentFieldSelection:null,showInserter:false,publishFeedback:null,StudioEditor:'StudioEditor',StudioSitePreview:'StudioSitePreview'};
 Object.assign(bindings,overrides);
 const scope=new Proxy(bindings,{has:(_target,key)=>!['render','require','jsx_runtime_1'].includes(key),get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:key in globalThis?globalThis[key]:noop});
 return new Function('scope','require','with(scope){'+code+';return render();}')(scope,()=>({jsx,jsxs:jsx}));
}
test('hosted preview and editor retain canonical canvas, presentation and resolved media paths',()=>{
 const document={id:'home',kind:'page',title:'Actual home',blocks:[]};const urls={image:'/__studio/site-media/test2/acm-image.png'};const presentation={renderDocument:()=>null};
 for(const editing of [false,true]){
  const tree=render(editing,document,urls,presentation);const all=nodes(tree);const editor=all.find(node=>node.type==='StudioEditor');
  assert.ok(editor,'the same canonical StudioEditor must own both preview and edit '+JSON.stringify(all.map(node=>typeof node.type==='string'?node.type:typeof node.type))); 
  assert.equal(all.some(node=>node.type==='StudioSitePreview'),false);
  assert.equal(editor.props.canvas.activeDocument,document);assert.equal(editor.props.canvas.mediaBlockUrls,urls);assert.equal(editor.props.canvas.presentation,presentation);
  assert.equal(editor.props.canvas.previewing,!editing);assert.equal(editor.props.writable,editing);
  assert.equal(editor.props.canvas.viewportWidth,editing?1200:undefined,'preview inherits canonical responsive paper sizing; editor retains its desktop viewport');
 }
});


test('the retained canonical canvas clears Code mode only when entering an authorised preview',()=>{
 const canvas=readFileSync(new URL('../app/studio/studio-canvas.tsx',import.meta.url),'utf8');
 const tree=ts.createSourceFile('studio-canvas.tsx',canvas,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const component=tree.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='StudioCanvasContent');
 const transition=component.body.statements.find(node=>ts.isIfStatement(node)&&node.expression.getText(tree)==='previewing && codeEditor');
 assert.ok(transition,'external preview must clear a retained Code editor after the host has confirmed discard');
 const apply=new Function('previewing','codeEditor','setCodeEditor',ts.transpileModule(transition.getText(tree),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText);
 const draft={initialDraft:'Before',draft:'Unapplied changes'};const updates=[];
 apply(false,draft,value=>updates.push(value));assert.deepEqual(updates,[]);
 apply(true,draft,value=>updates.push(value));assert.deepEqual(updates,[null]);assert.equal(draft.draft,'Unapplied changes');
 apply(true,null,value=>updates.push(value));assert.deepEqual(updates,[null]);
});

test('hosted editor omits duplicate informational notice while ordinary editor and real errors remain visible',()=>{
 const document={id:'home',kind:'page',title:'Actual home',blocks:[]};
 const noteNodes=tree=>nodes(tree).filter(node=>node.props?.className==='studio-notice'&&node.props.role==='note');
 assert.equal(noteNodes(render(true,document,{},{})).length,0);
 assert.equal(noteNodes(render(true,document,{},{},{hostedHome:false})).length,1);
 const feedback='Draft could not be saved';
 const all=nodes(render(true,document,{},{},{homeHost:{editing:true,busy:false,feedback}}));
 assert.ok(all.some(node=>node.props?.role==='alert'&&node.props.children===feedback));
 assert.equal(all.some(node=>node.props?.className==='studio-hosted-home-toolbar'),false);
});

test('hosted page loading uses a centred accessible spinner while errors remain readable alerts',()=>{
 const loading=nodes(render(false,{id:'home',kind:'page',title:'Home'}, {}, {}, {globalTemplates:{library:null,session:{}}}));
 const state=loading.find(node=>node.props?.className==='studio-hosted-home-state is-loading');
 assert.ok(state);
 assert.equal(state.props.role,'status');assert.equal(state.props['aria-busy'],true);
 assert.ok(nodes(state).some(node=>node.props?.className==='studio-hosted-home-spinner'&&node.props['aria-hidden']==='true'));
 assert.ok(nodes(state).some(node=>node.props?.className==='visually-hidden'&&node.props.children==='Loading the selected page and its global templates…'));
 const failed=nodes(render(false,{id:'home',kind:'page',title:'Home'}, {}, {}, {testSite:{draft:{},failure:'The selected page could not be loaded.'}}));
 const alert=failed.find(node=>node.props?.className==='studio-hosted-home-state');
 assert.ok(alert);assert.equal(alert.props.role,'alert');assert.equal(alert.props.children,'The selected page could not be loaded.');
 assert.equal(failed.some(node=>node.props?.className==='studio-hosted-home-spinner'),false);
 const css=readFileSync(new URL('../app/studio/studio.css',import.meta.url),'utf8');
 assert.match(css,/\.studio-hosted-home-state\s*\{[^}]*display:\s*grid[^}]*place-items/s);
 assert.match(css,/@keyframes studio-hosted-home-spin/);
 assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.studio-hosted-home-spinner\s*\{\s*animation:\s*none;/);
});
