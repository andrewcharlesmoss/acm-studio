import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { BlockField } = await load('../app/studio/studio-canvas.tsx');
const { BlockRenderer } = await load('../app/components/content.tsx');
const { WebsiteDesignContext, projectWebsiteDesignBlocks } = await load('../app/studio/site-editor/website-design-surface.tsx');
const { createStylesPreview, resolvePreviewStyle } = await load('../app/studio/site-editor/styles-preview-state.ts');
const { rebaseWebsiteDesignEdit } = await load('../app/studio/site-editor/website-design-edit.ts');
const selection = {...resolvePreviewStyle(createStylesPreview().present,'global'),blockStyles:{paragraph:{textIndent:'8px',previewResponsive:{tablet:{textIndent:'16px'},mobile:{textIndent:'24px'}}}}};
const noop = () => {};
const paragraph = (id, style) => ({id,type:'paragraph',text:id,...(style?{style}:{})});
function render(children) { return renderToStaticMarkup(createElement(WebsiteDesignContext.Provider,{value:{design:{styles:selection},imageUrl:value=>value}},children)); }
function edit(block, previousSibling) { return render(createElement(BlockField,{block,previousSibling,previousParagraphIndent:previousSibling?.type==='paragraph'?previousSibling.style?.textIndent:undefined,onChange:noop,onTextSelection:noop,onLinkActivate:noop,onTableCellFocus:noop})); }

test('actual Edit field retains the same consecutive paragraph marker as Preview', () => {
 const first=paragraph('first'), second=paragraph('second');
 assert.match(edit(second,first),/site-block-follows-paragraph/);
 assert.doesNotMatch(edit(first),/site-block-follows-paragraph/);
 assert.match(render(createElement(BlockRenderer,{blocks:[first,second],variant:'studio'})),/site-block-follows-paragraph/);
 assert.doesNotMatch(edit(second,{id:'heading',type:'heading',level:2,text:'Break'}),/site-block-follows-paragraph/);
 assert.match(edit(second,paragraph('first',{textIndent:'0px'})),/site-block-authored-text-indent/);
});

test('nested Edit owners retain their own sibling boundaries and authored zero', () => {
 for(const owner of [
  {id:'group',type:'group',layout:'stack',children:[paragraph('a'),paragraph('b')]},
  {id:'quote',type:'quote',children:[paragraph('a'),paragraph('b')]},
  {id:'column',type:'column',children:[paragraph('a'),paragraph('b')]},
  {id:'columns',type:'columns',children:[{id:'left',type:'column',children:[paragraph('a'),paragraph('b')]},{id:'right',type:'column',children:[paragraph('c')]}]},
 ]) {
  const html=edit(owner,paragraph('outer',{textIndent:'0px'}));
  assert.equal((html.match(/site-block-follows-paragraph/g)??[]).length,1,owner.type);
  assert.doesNotMatch(html,/site-block-authored-text-indent/,owner.type);
 }
});

test('sibling projection metadata remains presentation-only when editing text', () => {
 const first=paragraph('first'), second=paragraph('second');
 const projected=projectWebsiteDesignBlocks([second],selection,first)[0];
 const rebased=rebaseWebsiteDesignEdit(second,projected,{...projected,text:'Changed'});
 assert.deepEqual(rebased,{...second,text:'Changed'});
});
