import test from 'node:test';
import assert from 'node:assert/strict';
import {isStudioDialogBackdropClick} from '../app/studio/overlays/dialog-backdrop.ts';

function clickAt({x, y, targetIsDialog = true, detail = 1} = {}) {
 const dialog = {getBoundingClientRect:()=>({left:100,top:80,right:500,bottom:400})};
 return {target:targetIsDialog?dialog:{},currentTarget:dialog,detail,clientX:x,clientY:y};
}

test('dialog backdrop clicks dismiss only when the opt-in is enabled and the point is outside the dialog',()=>{
 assert.equal(isStudioDialogBackdropClick(clickAt({x:40,y:200}),true,false),true);
 assert.equal(isStudioDialogBackdropClick(clickAt({x:120,y:100}),true,false),false);
 assert.equal(isStudioDialogBackdropClick(clickAt({x:40,y:200,targetIsDialog:false}),true,false),false);
 assert.equal(isStudioDialogBackdropClick(clickAt({x:40,y:200}),false,false),false);
 assert.equal(isStudioDialogBackdropClick(clickAt({x:40,y:200}),true,true),false);
 assert.equal(isStudioDialogBackdropClick(clickAt({x:40,y:200,detail:0}),true,false),false);
});
