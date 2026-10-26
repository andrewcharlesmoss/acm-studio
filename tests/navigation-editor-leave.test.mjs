import { evaluateProductionModule } from "./production-module.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as resize from '../app/studio/navigation-canvas-resize.ts';
import * as resizeDrag from '../app/studio/resize-drag.ts';


function editor({writable=true,save=()=>Promise.resolve(),presentation="workspace"}={}) {
 const slots=[];let cursor=0,dialog=false,alert=false,closes=0,stateUpdates=0;const listeners={};const refs=[];const leave={current:null},history={current:null};
 const react={useState(v){const i=cursor++;if(!(i in slots))slots[i]=v;return[slots[i],next=>{stateUpdates++;slots[i]=typeof next==='function'?next(slots[i]):next;}];},useRef(v){const i=cursor++;const ref=slots[i]??={current:v};refs[i]=ref;return ref;},useId:()=> 'test-navigation-canvas',useCallback:fn=>fn,useEffect:fn=>fn(),useLayoutEffect:fn=>fn()};
 const jsx=(type,props)=>({type,props});const components=new Proxy({}, {get:(_,key)=>key});
 const templates={store:{sets:[{id:'menu',navigation:[]}]},writable,error:null,saveLabel:'Ready',commit:()=>true};
 const source=(readFileSync(new URL('../app/studio/site-navigation-editor.tsx',import.meta.url),'utf8'));
 const exports={};evaluateProductionModule(source,{exports,require:id=>id==='react'?react:id==='react/jsx-runtime'?{jsx,jsxs:jsx}:id==='react-dom'?{flushSync:fn=>fn()}:id==='./test-site/sites'?{localFixtureName:id=>id}:id==='./navigation-canvas-resize'?resize:id==='./resize-drag'?resizeDrag:components,document:{activeElement:null,querySelector:selector=>selector.includes('site-navigation-details')?alert:dialog},window:{addEventListener:(name,fn)=>{(listeners[name]??=[]).push(fn);},removeEventListener(){}},ResizeObserver:class{observe(){}disconnect(){}},HTMLInputElement:class{},HTMLTextAreaElement:class{}});
 function render(){cursor=0;return exports.SiteNavigationEditor({presentation,navigation:{setId:'menu'},templates,documents:[],onSave:save,onClose:()=>closes++,prepareToLeaveRef:leave,historyChangeRef:history});}
 function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found;}return null;}
 return {render,find,leave,history,templates,refs,slots,setSlot(index,value){slots[index]=value;},get stateUpdates(){return stateUpdates;},setDialog:v=>dialog=v,setAlert:v=>alert=v,input(){find(render(),n=>n.props?.className==='site-navigation-pane-frame').props.onChangeCapture();},escape(){for(const fn of listeners.keydown??[])fn({key:'Escape',preventDefault(){},defaultPrevented:false});},get closes(){return closes;}};
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
 const handles=[];const visit=node=>{if(!node||typeof node!=='object')return;if(node.props?.className?.includes?.('site-navigation-canvas-resize-handle'))handles.push(node);for(const child of [node.props?.children].flat(Infinity))visit(child);};visit(tree);
 assert.deepEqual(handles.map(node=>node.props['aria-label']),['Resize navigation canvas from left edge','Resize navigation canvas from right edge']);
 assert.equal(handles[0].props['aria-controls'],handles[1].props['aria-controls']);
});

test('pointer movement updates the production canvas under the active handle without React state renders', () => {
 for (const edge of ['left','right']) {
  const f=editor({presentation:'visual'}),initial=f.render();
  const stageNode=f.find(initial,n=>n.props?.className==='site-navigation-canvas-stage');
  const frameNode=f.find(initial,n=>n.props?.className==='site-navigation-canvas-frame');
  const attrs=[{},{}];let captured=null;
  const targets=attrs.map(values=>({focus(){},setPointerCapture(id){captured=id;},hasPointerCapture(id){return captured===id;},releasePointerCapture(){captured=null;},setAttribute(name,value){values[name]=value;}}));
  const stage={clientWidth:1000,getBoundingClientRect(){return{left:100};}};
  const frame={style:{},getBoundingClientRect(){return{left:300};},querySelectorAll(){return targets;}};
  stageNode.props.ref.current=stage;frameNode.props.ref.current=frame;
  f.setSlot(5,600);
  f.render();const tree=f.render();
  assert.equal(f.slots[4],1000);
  assert.equal(f.slots[5],600);assert.equal(f.slots[6],false);
  const handle=f.find(tree,n=>n.props?.className===`site-navigation-canvas-resize-handle is-${edge}`);
  const origin=edge==='left'?288:912,delta=80,pointerId=7;
  const event=x=>({button:0,pointerId,clientX:x,currentTarget:targets[edge==='left'?0:1],preventDefault(){}});
  handle.props.onPointerDown(event(origin));
  assert.equal(captured,pointerId);
  const updatesBeforeMove=f.stateUpdates;
  handle.props.onPointerMove(event(origin+delta));
  const width=edge==='left'?440:760;
  const left=edge==='left'?280:120;
  const frameLeft=(stage.clientWidth-width)/2;
  const activeHandleCentre=stage.getBoundingClientRect().left+frameLeft+(edge==='left'?-12:width+12);
  assert.equal(f.stateUpdates,updatesBeforeMove,'pointermove must not rerender the navigation editor');
  assert.equal(Number.parseFloat(frame.style.width),width,JSON.stringify({style:frame.style,attrs,slots:f.slots}));
  assert.equal(frameLeft,left,'the canvas remains centred while both edges adapt');
  assert.equal(activeHandleCentre,origin+delta,'the dragged handle must follow the pointer');
  assert.deepEqual(attrs.map(value=>value['aria-valuenow']),[String(width),String(width)]);
  handle.props.onPointerUp(event(origin));
  assert.equal(frame.style.width,'600px');assert.equal(frame.style.left,'0px');
  assert.deepEqual(attrs.map(value=>value['aria-valuenow']),['600','600']);
  assert.equal(captured,null);
 }
});

test('cancelling a pointer resize restores the rendered width, position and splitter values', () => {
 const f=editor({presentation:'visual'}),initial=f.render();
 const stageNode=f.find(initial,n=>n.props?.className==='site-navigation-canvas-stage');
 const frameNode=f.find(initial,n=>n.props?.className==='site-navigation-canvas-frame');
 const attrs=[{},{}];let captured=null;
 const targets=attrs.map(values=>({focus(){},setPointerCapture(id){captured=id;},hasPointerCapture(id){return captured===id;},releasePointerCapture(){captured=null;},setAttribute(name,value){values[name]=value;}}));
 const stage={clientWidth:1000,getBoundingClientRect(){return{left:100};}};
 const frame={style:{width:'600px',left:'0px'},getBoundingClientRect(){const width=Number.parseFloat(this.style.width);return{left:100+Number.parseFloat(this.style.left)+(1000-width)/2};},querySelectorAll(){return targets;}};
 stageNode.props.ref.current=stage;frameNode.props.ref.current=frame;
 f.setSlot(5,600);f.render();const tree=f.render();
 const handle=f.find(tree,n=>n.props?.className==='site-navigation-canvas-resize-handle is-left');
 const event=x=>({button:0,pointerId:9,clientX:x,currentTarget:targets[0],preventDefault(){}});
 handle.props.onPointerDown(event(288));handle.props.onPointerMove(event(368));
 assert.equal(frame.style.width,'440px');assert.equal(attrs[0]['aria-valuenow'],'440');
 handle.props.onPointerCancel(event(368));
 assert.equal(frame.style.width,'600px');assert.equal(frame.style.left,'0px');
 assert.deepEqual(attrs.map(value=>value['aria-valuenow']),['600','600']);
 assert.equal(captured,null);
});

test('a stationary handle click preserves the canvas fit preference', () => {
 const f=editor({presentation:'visual'}),initial=f.render();
 const stageNode=f.find(initial,n=>n.props?.className==='site-navigation-canvas-stage');
 const frameNode=f.find(initial,n=>n.props?.className==='site-navigation-canvas-frame');
 let captured=null;const target={focus(){},setPointerCapture(id){captured=id;},hasPointerCapture(id){return captured===id;},releasePointerCapture(){captured=null;},setAttribute(){}};
 const stage={clientWidth:1000,getBoundingClientRect(){return{left:100};}};
 const frame={style:{width:'952px',left:'0px'},getBoundingClientRect(){return{left:124};},querySelectorAll(){return[target,target];}};
 stageNode.props.ref.current=stage;frameNode.props.ref.current=frame;f.render();const tree=f.render();
 const handle=f.find(tree,n=>n.props?.className==='site-navigation-canvas-resize-handle is-right');
 const event={button:0,pointerId:4,clientX:1088,currentTarget:target,preventDefault(){}};
 handle.props.onPointerDown(event);handle.props.onPointerUp(event);
 assert.equal(f.slots[5],null);assert.equal(f.slots[6],false);
 assert.equal(captured,null);
});
