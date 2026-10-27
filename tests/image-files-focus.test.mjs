import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHostModuleEvaluator, loadProductionModule } from './production-module.mjs';
const source=await readFile(new URL('../app/studio/use-studio-image-files-focus.ts',import.meta.url),'utf8');
const tree=await loadProductionModule(new URL('../app/content/block-tree.ts',import.meta.url));
function fixture(){
  const slots=[];let cursor=0,effects=[],frames=[],state;const selected=[],focused=[];
  const props={activeDocument:{id:'one',kind:'post',blocks:[{id:'image',type:'image',src:'/old.png',alt:'Old'}]},studioSection:'content',onSelectBlock:id=>selected.push(id),onSelectTab:()=>{}};
  const button={focus(){focused.push('restored');}};const canvas={querySelector:()=>button};
  const react={useRef(value){return slots[cursor++]??={current:value};},useLayoutEffect(fn){cursor++;effects.push(fn);}};
  const component=createHostModuleEvaluator(['require','exports','requestAnimationFrame','document','CSS'],source+'\nreturn exports.useStudioImageFilesFocus;')(name=>name==='react'?react:tree,{},fn=>frames.push(fn),{querySelector:selector=>selector.startsWith('[data-studio-document-id=')?canvas:button},{escape:value=>value});
  function render(){cursor=0;state=component(props);const pending=effects;effects=[];pending.forEach(fn=>fn());}
  render();return {props,focused,selected,get state(){return state;},render,frame(){const pending=frames;frames=[];pending.forEach(fn=>fn());}};
}
for(const accepted of [true,false])test(`real Files route restores remounted toolbar focus after ${accepted?'acceptance':'cancellation'}`,()=>{
  const f=fixture();f.state.capture('image',{isConnected:false},'Replace image');f.props.studioSection='files';f.render();
  if(accepted)f.state.returnToDocument();f.props.studioSection='content';f.render();assert.deepEqual(f.selected,['image']);assert.deepEqual(f.focused,[]);f.frame();assert.deepEqual(f.focused,['restored']);
});
for(const stale of ['document','block','route'])test(`Files restoration cannot focus a stale ${stale}`,()=>{
  const f=fixture();f.state.capture('image',{isConnected:false},'Replace image');f.props.studioSection='files';f.render();f.props.studioSection='content';f.render();
  if(stale==='document')f.props.activeDocument={...f.props.activeDocument,id:'two'};
  if(stale==='block')f.props.activeDocument={...f.props.activeDocument,blocks:[]};
  if(stale==='route')f.props.studioSection='templates';f.render();f.frame();assert.deepEqual(f.focused,[]);
});
