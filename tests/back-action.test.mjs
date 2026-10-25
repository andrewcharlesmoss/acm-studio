import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
import { createDepartureLinkHandler } from '../app/studio/departure-link.ts';
const { BackAction } = await loadProductionModule(new URL('../app/studio/controls/back-action.tsx', import.meta.url));
test('BackAction keeps accessible native button and link semantics', () => {
 const button = renderToStaticMarkup(createElement(BackAction, {label:'Back to parent',disabled:true}));
 assert.match(button, /^<button/); assert.match(button,/type="button"/); assert.match(button,/disabled=""/);
 assert.match(button,/aria-label="Back to parent"/); assert.match(button,/title="Back to parent"/);
 assert.match(button,/data-studio-control="back-action"/); assert.match(button,/<svg/);
 const link = renderToStaticMarkup(createElement(BackAction,{label:'Back to Studio',href:'/studio'}));
 assert.match(link,/^<a /); assert.match(link,/href="\/studio"/); assert.doesNotMatch(link,/role="button"|disabled=/);
});
const event = (extra={}) => ({button:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){},...extra});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('back departure waits for preparation and retains the view on failed saving',async()=>{
 const visits=[]; let release;
 const handler=createDepartureLinkHandler(()=>new Promise(resolve=>{release=resolve;}),href=>visits.push(href));
 const link={href:'/studio',target:'',hasAttribute:()=>false}; const click=event();handler(click,link);
 await settle();assert.equal(click.defaultPrevented,true);assert.deepEqual(visits,[]);release(false);await settle();assert.deepEqual(visits,[]);
 handler(event(),link);await settle();release(true);await settle();assert.deepEqual(visits,['/studio']);
 for(const modifier of ['metaKey','ctrlKey','shiftKey','altKey']){const click=event({[modifier]:true});handler(click,link);assert.equal(click.defaultPrevented,false);}
});
