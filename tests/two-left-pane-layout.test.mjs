import test from 'node:test';
import assert from 'node:assert/strict';
import {twoLeftPaneWidths} from '../app/studio/panes/two-left-pane-layout.ts';
test('each collapsed pane releases all width independently, including tablet layout',()=>{
 for(const primaryClosed of [false,true]) for(const secondaryClosed of [false,true]) {
  const result=twoLeftPaneWidths({width:250,collapsed:primaryClosed},{width:310,collapsed:secondaryClosed});
  assert.equal(result['--two-left-primary-width'],primaryClosed?'0px':'250px');
  assert.equal(result['--two-left-secondary-width'],secondaryClosed?'0px':'310px');
  assert.equal(result['--two-left-secondary-fluid-width'],secondaryClosed?'0px':'1fr');
 }
});
