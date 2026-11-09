import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';
const { availableBlockTransformsInDocument, transformBlock } = await loadProductionModule(new URL('../app/studio/block-transforms.ts', import.meta.url));
const { validContentBlocks } = await loadProductionModule(new URL('../app/studio/workspace-validation.ts', import.meta.url));
test('group structural transformations retain original content and metadata', () => {
 const group = { id:'g', type:'group', layout:'flow', editorial:{name:'Header'}, visualStyle:{backgroundColor:'#ffffff'}, children:[{id:'p',type:'paragraph',text:'Hello'}] };
 const options = availableBlockTransformsInDocument(group,[group]);
 for (const id of ['group-to-cover','group-to-columns','group-to-details']) {
   const option=options.find(item=>item.id===id); assert.ok(option,id);
   let n=0; const result=transformBlock(group,option,()=>`new-${n++}`);
   assert.ok(validContentBlocks([result]));
   const preserved=result.type==='columns' ? result.children[0].children[0] : result.children[0];
   if (id === 'group-to-cover') { assert.equal(result.visualStyle.backgroundColor, '#ffffff'); assert.equal(preserved.visualStyle.backgroundColor, undefined); assert.equal(preserved.children[0].id, 'p'); } else assert.deepEqual(preserved,group);
 }
});
test('plain Row and Grid split children into Columns', () => {
 for (const layout of ['row','grid']) {
  const block = {id:'g',type:'group',layout,children:['a','b','c'].map(id=>({id,type:'paragraph',text:id})), ...(layout==='grid'?{gridMode:'manual',columns:2}:{})};
  const option=availableBlockTransformsInDocument(block,[block]).find(item=>item.id==='group-to-columns');
  assert.ok(option); let n=0; const result=transformBlock(block,option,()=>`new-${n++}`);
  assert.equal(result.type,'columns');
  assert.deepEqual(result.children.map(column=>column.children.map(child=>child.id)), layout==='row' ? [['a'],['b'],['c']] : [['a','c'],['b']]);
 }
});

test('Group with sole Cover child converts to that Cover', () => {
 const child = { id: 'cover', type: 'cover', src: '', alt: '', dimRatio: 50, children: [] };
 const group = { id: 'group', type: 'group', layout: 'flow', children: [child] };
 const option = availableBlockTransformsInDocument(group, [group]).find(item => item.id === 'group-to-cover');
 assert.ok(option); assert.deepEqual(transformBlock(group, option, () => 'new'), child);
});
