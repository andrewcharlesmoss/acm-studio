import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { runnerImport } from "vite";
const options={environments:{inline:{resolve:{noExternal:[/^@acm\//]}}}};
const {module:ordering}=await runnerImport("app/studio/library-reordering.ts",options);
const {module:geometry}=await runnerImport("app/studio/drop-gap-geometry.ts",options);
export const box=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
/** Executes every owning production hook with deterministic React state and DOM bounds. */
export function dragControl({mode="gap",axis="y",policy={}}={}) {
 const slots=[],effects=[];let cursor=0,ids=["a","b","c"],version="original",writable=true,allowed=true,listKey="posts",stops=0;const moves=[];
 const react={useEffect:()=>{},useCallback:fn=>fn,useLayoutEffect:(effect,deps)=>{const index=cursor++;if(!deps||!slots[index]||deps.some((value,i)=>!Object.is(value,slots[index].deps?.[i]))){slots[index]={deps};effects.push(effect);}},useId:()=>"test-list",useRef:value=>{const index=cursor++;return slots[index]??={current:value};},useState:value=>{const index=cursor++;if(!(index in slots))slots[index]=value;return[slots[index],next=>slots[index]=typeof next==="function"?next(slots[index]):next];}};
 const modules={react,"./library-reordering":ordering,"./drop-gap-geometry":geometry,"./drag-auto-scroll":{startDragAutoScroll:()=>()=>{stops++;}}};
 function load(path){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>modules[name]});return exports;}
 modules["./use-drag-placement"]=load("../app/studio/use-drag-placement.ts");modules["./use-gap-reordering"]=load("../app/studio/use-gap-reordering.ts");const library=load("../app/studio/use-library-reordering.ts");
 const boxes=axis==="y"?[box(10,20,100,30),box(10,70,100,50),box(10,140,100,40)]:[box(20,10,30,100),box(70,10,50,100),box(140,10,40,100)];
 const owner={dataset:{dragPlacementOwner:"test-list",gapContainer:"test-list"},offsetWidth:200,clientLeft:0,clientTop:0,scrollLeft:0,scrollTop:0,contains:target=>Boolean(target?.inside),getBoundingClientRect:()=>box(0,0,200,200),querySelectorAll:()=>ids.map((id,i)=>({dataset:{gapOwner:"test-list",gapRow:id},getBoundingClientRect:()=>boxes[i]}))};
 const handle={focus(){},setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){},closest:()=>owner};
 const values=new Map();const transfer={get types(){return [...values.keys()];},setData:(key,value)=>values.set(key,value),getData:key=>values.get(key)??""};
 function render(){cursor=0;const commit=move=>{moves.push(move);policy.onMove?.(move);return true;};const ui=mode==="library"?library.useLibraryReordering(ids,writable,commit,listKey):mode==="raw"?modules["./use-drag-placement"].useDragPlacement({version,writable,canStart:()=>true,effect:policy.effect,resolve:(...args)=>allowed?policy.resolve(...args):null,commit:(_source,target)=>commit(target)}):modules["./use-gap-reordering"].useGapReordering({ids,version,writable,axis,accepts:move=>allowed&&(policy.accepts?policy.accepts(move):true),onMove:commit});while(effects.length)effects.shift()();return ui;}
 return {moves,render,owner,handle,boxes,transfer,get stops(){return stops;},setVersion:value=>version=value,setWritable:value=>writable=value,setAllowed:value=>allowed=value,setIds:value=>ids=value,setListKey:value=>listKey=value,
 event:coordinate=>({currentTarget:owner,clientX:axis==="x"?coordinate:30,clientY:axis==="y"?coordinate:30,dataTransfer:transfer,relatedTarget:null,preventDefault(){},stopPropagation(){}}),
 pointer:coordinate=>({currentTarget:handle,clientX:axis==="x"?coordinate:30,clientY:axis==="y"?coordinate:30,pointerId:7,pointerType:"mouse",button:0,preventDefault(){},stopPropagation(){}}),
 };
}
