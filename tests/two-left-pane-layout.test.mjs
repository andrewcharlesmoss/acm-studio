import test from 'node:test';
import assert from 'node:assert/strict';
import {twoLeftPaneWidths} from '../app/studio/panes/two-left-pane-layout.ts';
test('each collapsed pane releases all width independently, including tablet layout',()=>{
 for(const primaryClosed of [false,true]) for(const secondaryClosed of [false,true]) {
  const result=twoLeftPaneWidths({width:250,collapsed:primaryClosed},{width:310,collapsed:secondaryClosed});
  assert.equal(result['--two-left-primary-width'],primaryClosed?'0px':'250px');
  assert.equal(result['--two-left-secondary-width'],secondaryClosed?'0px':'310px');
  assert.equal(result['--two-left-secondary-fluid-width'],secondaryClosed?'0px':'1fr');
  assert.equal(result['--two-left-free-width'],secondaryClosed?'1fr':'0px');
 }
});

test('grouped controls share the remaining edge and centre the full stack with the open pane above',async()=>{
 const {twoLeftPaneControls}=await import('../app/studio/panes/two-left-pane-layout.ts');
 for (const firstClosed of [false,true]) for (const secondClosed of [false,true]) {
  const primary={left:0,top:0,width:firstClosed?0:240,height:600,collapsed:firstClosed};
  const secondary={left:primary.width,top:0,width:secondClosed?0:280,height:600,collapsed:secondClosed};
  const result=twoLeftPaneControls(primary,secondary,600);
  if(!firstClosed&&!secondClosed){assert.deepEqual(result,{primary:{left:240,top:300},secondary:{left:520,top:300}});continue;}
  assert.equal(result.primary.left,result.secondary.left);
  assert.equal(result.primary.left,primary.width+secondary.width);
  assert.equal((result.primary.top+result.secondary.top)/2,300);
  assert.equal(Math.abs(result.primary.top-result.secondary.top),36);
  assert.equal(result.primary.top<result.secondary.top,!firstClosed||secondClosed);
 }
});
test('actual narrow layout bounds determine open control centres and grouped boundary',async()=>{
 const {twoLeftPaneControls}=await import('../app/studio/panes/two-left-pane-layout.ts');
 const primary={left:0,top:0,width:376,height:200,collapsed:false};
 const secondary={left:0,top:200,width:376,height:300,collapsed:false};
 assert.deepEqual(twoLeftPaneControls(primary,secondary,700),{primary:{left:376,top:100},secondary:{left:376,top:350}});
 const result=twoLeftPaneControls({...primary,collapsed:true,width:0},{...secondary,top:0},500);
 assert.equal(result.primary.left,376);
 assert.equal(result.secondary.top,232);
 assert.equal(result.primary.top,268);
});

test('coarse pointer spacing preserves separate 44px touch targets and group centring',async()=>{
 const {twoLeftPaneControls}=await import('../app/studio/panes/two-left-pane-layout.ts');
 const box={left:0,top:0,width:0,height:600,collapsed:true};
 const result=twoLeftPaneControls(box,box,600,true);
 assert.equal(result.secondary.top-result.primary.top,44);
 assert.equal((result.secondary.top+result.primary.top)/2,300);
});
