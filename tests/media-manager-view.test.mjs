import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHostModuleEvaluator } from './production-module.mjs';

const source = await readFile(new URL('../app/studio/media-manager.tsx', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const descendants = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(descendants) : [node, ...descendants(node.props?.children)];
const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : node?.props ? text(node.props.children) : '';
const asset = { id: 'one', name: 'One.png', type: 'image/png', blob: new Blob(['png'], {type: 'image/png'}), size: 3, altText: 'Original', caption: '', folderId: null, createdAt: '2026-10-27T00:00:00Z', updatedAt: '2026-10-27T00:00:00Z' };
function harness({ onInsertImage = () => true, list = async () => ({assets:[asset],folders:[]}), get = async () => asset, targetKind = 'block', production = false } = {}) {
  const slots=[]; let index=0, effects=[], dirty=true, tree;
  const react={
    useState(initial){const id=index++; if(!(id in slots)) slots[id]=typeof initial==='function'?initial():initial; return [slots[id], value=>{slots[id]=typeof value==='function'?value(slots[id]):value; dirty=true;}];},
    useRef(initial){const id=index++;return slots[id]??={current:initial};},
    useMemo(fn,deps){const id=index++,old=slots[id]; if(!old||deps.some((d,i)=>d!==old.deps[i])) slots[id]={deps,value:fn()}; return slots[id].value;},
    useEffect(fn,deps){const id=index++,old=slots[id];if(!old||!deps||deps.some((d,i)=>d!==old.deps?.[i])){slots[id]={deps};effects.push(()=>{old?.cleanup?.();slots[id].cleanup=fn();});}},
  }; react.useLayoutEffect=react.useEffect;
  const productionCalls=[];
  const forbidden=()=>assert.fail('isolated Files called a product dependency');
  const jsx=(type,props)=>({type,props});
  const dependencies={
    react,'react/jsx-runtime':{jsx,jsxs:jsx},
    './controls/native-fields':{SearchInput:'search',SelectControl:'select',TextArea:'textarea',TextInput:'input'},
    './overlays/dialog':{StudioDialog:'dialog',StudioDialogActions:'actions'},'./controls/use-blob-urls':{useBlobUrls:()=>({one:'blob:one'})},
    './overlays/anchored-menu':{StudioAnchoredMenu:'menu'},'./controls/button':{StudioButton:'button'},'./studio-icons':{StudioIcon:'icon'},
    './media-store':{listMediaLibrary:forbidden,getMediaAsset:forbidden,prepareMediaFolderMove:forbidden},
    './media-command':{assetBefore:forbidden,folderBefore:forbidden},'./media-sync':{useMediaSession:forbidden,submitMediaCommand:forbidden},'./design-store':{loadDesigns:forbidden},
    '../content/image-source':{isSafeManagedImageType:type=>['image/png','image/jpeg'].includes(type)},
  };
  if(production) { dependencies['./media-store'].listMediaLibrary=async()=>{productionCalls.push('list');return {assets:[asset],folders:[]};}; dependencies['./media-store'].getMediaAsset=async()=>{productionCalls.push('get');return asset;}; dependencies['./media-sync']={useMediaSession:()=>{productionCalls.push('session');return {ready:true,revision:7};},submitMediaCommand:async()=>{productionCalls.push('command');}}; dependencies['./design-store']={loadDesigns:()=>{productionCalls.push('designs');return [];}}; }
  const component=createHostModuleEvaluator(['require','exports'],source+'\nreturn exports.'+(production?'MediaManager':'MediaManagerView')+';')(id=>dependencies[id]??assert.fail(id),{});
  const props={writable:true,targetLabel:'Image',targetOwnerId:'document/image',targetKind,onInsertImage,resources:{listMediaLibrary:list,getMediaAsset:get,designLinks:()=>({})},session:{ready:true,revision:0}};
  return {props,productionCalls,tree:()=>tree,
    async flush(){for(let count=0;count<20;count++){if(dirty){dirty=false;index=0;tree=component(props);const pending=effects;effects=[];pending.forEach(fn=>fn());}await tick();if(!dirty)return tree;}assert.fail('unsettled');},
    render(){dirty=true;},close(){slots.forEach(slot=>slot?.cleanup?.());},
    button(name){return descendants(tree).find(node=>node.type==='button'&&(node.props['aria-label']===name||text(node)===name));},
    select(){descendants(tree).find(node=>node.type==='button'&&node.props.className?.includes('media-file-card')).props.onClick();},
    submit(){descendants(tree).find(node=>node.type==='form').props.onSubmit({preventDefault(){}});},
  };
}
for(const invalidation of ['unmount','permission','context']) test(`Files aborts a started owner operation on ${invalidation}`,async()=>{
  let signal,finish;const pending=new Promise(resolve=>finish=resolve);
  const h=harness({targetKind:'cover',onInsertImage:(_asset,_url,_alt,nextSignal)=>{signal=nextSignal;return pending;}});
  await h.flush();h.select();await h.flush();h.button('Use as featured image').props.onClick({currentTarget:{}});await h.flush();
  assert.ok(signal);assert.equal(signal.aborted,false);
  if(invalidation==='unmount')h.close();else{if(invalidation==='permission')h.props.writable=false;else h.props.targetOwnerId='different/image';h.render();await h.flush();}
  assert.equal(signal.aborted,true);finish(false);await tick();h.close();
});
test('read-only management preserves insertion and exposes resource failures',async()=>{
  let fail=false;const h=harness({list:async()=>{if(fail)throw Error('read failed');return {assets:[asset],folders:[]};}});
  await h.flush();h.select();await h.flush();assert.equal(h.button('Insert into Image').props.disabled,false);
  assert.ok(descendants(h.tree()).filter(node=>node.type==='input'&&node.props.type==='file').every(node=>node.props.disabled));
  assert.match(text(h.tree()),/File management is unavailable.*Files ready/s);
  fail=true;h.props.session={ready:true,revision:1};h.render();await h.flush();assert.match(text(h.tree()),/File management is unavailable.*library is unavailable/s);h.close();
});
test('failed image retrieval keeps description text and permits retry',async()=>{
  let fail=true;const h=harness({get:async()=>{if(fail)throw Error('read failed');return asset;}});await h.flush();h.select();await h.flush();h.button('Insert into Image').props.onClick({currentTarget:{}});await h.flush();
  descendants(h.tree()).find(node=>node.type==='textarea'&&node.props.rows===4).props.onChange({target:{value:'Retain my text'}});await h.flush();h.submit();await h.flush();
  assert.equal(descendants(h.tree()).find(node=>node.type==='textarea'&&node.props.rows===4).props.value,'Retain my text');
  assert.ok(descendants(h.tree()).some(node=>node.props?.role==='alert'));fail=false;h.submit();await h.flush();assert.equal(descendants(h.tree()).some(node=>node.type==='dialog'),false);h.close();
});

test('production Files wrapper supplies its canonical session, readers and command broker',async()=>{
  const h=harness({production:true});const view=await h.flush();
  assert.equal(view.props.session.revision,7);
  await view.props.resources.listMediaLibrary();await view.props.resources.getMediaAsset('one');view.props.resources.designLinks();await view.props.submitCommand({kind:'test'});
  assert.deepEqual(h.productionCalls,['session','list','get','designs','command']);h.close();
});
