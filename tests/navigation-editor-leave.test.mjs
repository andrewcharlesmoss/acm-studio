import { evaluateProductionModule } from "./production-module.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';


function editor({writable=true,save=()=>Promise.resolve(),presentation="workspace"}={}) {
 const slots=[];let cursor=0,dialog=false,alert=false,closes=0;const listeners={};const leave={current:null},history={current:null};
 const react={useState(v){const i=cursor++;if(!(i in slots))slots[i]=v;return[slots[i],next=>slots[i]=next];},useRef(v){const i=cursor++;return slots[i]??={current:v};},useCallback:fn=>fn,useEffect:fn=>fn(),useLayoutEffect:fn=>fn()};
 const jsx=(type,props)=>({type,props});const components=new Proxy({}, {get:(_,key)=>key});
 const templates={store:{sets:[{id:'menu',navigation:[]}]},writable,error:null,saveLabel:'Ready',commit:()=>true};
 const source=(readFileSync(new URL('../app/studio/site-navigation-editor.tsx',import.meta.url),'utf8'));
 const exports={};evaluateProductionModule(source,{exports,require:id=>id==='react'?react:id==='react/jsx-runtime'?{jsx,jsxs:jsx}:id==='react-dom'?{flushSync:fn=>fn()}:id==='./test-site/sites'?{localFixtureName:id=>id}:components,document:{activeElement:null,querySelector:selector=>selector.includes('site-navigation-details')?alert:dialog},window:{addEventListener:(name,fn)=>{(listeners[name]??=[]).push(fn);},removeEventListener(){}},HTMLInputElement:class{},HTMLTextAreaElement:class{}});
 function render(){cursor=0;return exports.SiteNavigationEditor({presentation,navigation:{setId:'menu'},templates,documents:[],onSave:save,onClose:()=>closes++,prepareToLeaveRef:leave,historyChangeRef:history});}
 function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found;}return null;}
 return {render,find,leave,history,templates,setDialog:v=>dialog=v,setAlert:v=>alert=v,input(){find(render(),n=>n.props?.className==='site-navigation-pane-frame').props.onChangeCapture();},escape(){for(const fn of listeners.keydown??[])fn({key:'Escape',preventDefault(){},defaultPrevented:false});},get closes(){return closes;}};
}
test('clean readonly menus can leave, but unfinished input, alerts and overlays cannot',async()=>{
 const f=editor({writable:false});f.render();assert.equal(await f.leave.current(),true);
 f.setAlert(true);assert.equal(await f.leave.current(),false);f.setAlert(false);
 f.setDialog(true);assert.equal(await f.leave.current(),false);f.setDialog(false);
 f.input();assert.equal(await f.leave.current(),false);
});
test('keyboard menu history changes remain protected after ownership is lost',async()=>{
 const f=editor();f.render();f.history.current();f.templates.writable=false;f.render();assert.equal(await f.leave.current(),false);
});
test('leaving waits for save acknowledgement and a failed save keeps the editor',async()=>{
 let resolve;const f=editor({save:()=>new Promise(r=>resolve=r)});f.render();let done=false;const pending=f.leave.current().then(ok=>done=ok);await Promise.resolve();assert.equal(done,false);resolve();await pending;assert.equal(done,true);
 const failed=editor({save:()=>Promise.reject(new Error('Failed save'))});failed.render();assert.equal(await failed.leave.current(),false);
});
test('Escape leaves a topmost overlay to its owner and closes the menu only after dismissal',()=>{
 const f=editor();f.render();f.setDialog(true);f.escape();assert.equal(f.closes,0);f.setDialog(false);f.escape();assert.equal(f.closes,1);
});


test('pane management shares the canonical list and selected link inspector without a workspace replacement', () => {
 const f=editor({presentation:'pane'});let tree=f.render();
 assert.equal(f.find(tree,n=>n.type==='PaneWorkspace'),null);
 const list=f.find(tree,n=>n.type==='NavigationMenuList');assert.ok(list);
 list.props.onSelect('link');tree=f.render();assert.ok(f.find(tree,n=>n.type==='PageLinkInspector'));
 assert.equal(f.find(tree,n=>n.type==='NavigationMenuList'),null);
});
test('visual presentation uses the canonical editable navigation canvas', () => {
 const f=editor({presentation:'visual'}),tree=f.render();
 assert.ok(f.find(tree,n=>n.type==='NavigationCanvasEditor'));
 assert.equal(f.find(tree,n=>n.type==='NavigationMenuList'),null);
});
