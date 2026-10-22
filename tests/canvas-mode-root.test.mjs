import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {createElement} from 'react';

const source=readFileSync(process.env.STUDIO_CANVAS_MODE_SOURCE || new URL('../app/studio/studio-canvas.tsx',import.meta.url),'utf8');
const tree=ts.createSourceFile('studio-canvas.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function rootFor(prefix){
 let result;
 function visit(node){
  if(ts.isJsxElement(node)){
   const attribute=node.openingElement.attributes.properties.find(item=>ts.isJsxAttribute(item)&&item.name.text==='className');
   if(attribute?.initializer?.getText(tree).includes(prefix))result=node;
  }
  ts.forEachChild(node,visit);
 }
 visit(tree);assert.ok(result,`production canvas ${prefix} root exists`);return result;
}
function elementFor(node){
 // Evaluate the actual host props; presentation content remains at the same
 // child position while each canonical body branch retains its own controls.
 const content=node.children.find(child=>ts.isJsxExpression(child)&&child.expression);
 assert.equal(content.expression.expression.getText(tree),'compose','the presentation remains at the same first child slot');
 const opening=node.openingElement.getText(tree);
 const tag=node.openingElement.tagName.getText(tree);
 const expression=opening+'{header}</'+tag+'>';
 const code=ts.transpileModule('export const value = '+expression,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 return new Function('React','exports','activeDocument','viewportStyle','header',code+'\nreturn exports.value;')({createElement},{},{kind:'page'},{width:1200},createElement('nav',{'aria-label':'Site navigation'}));
}
test('production Edit and Preview roots preserve the same React host identity and header slot',()=>{
 const edit=elementFor(rootFor('block-canvas studio-responsive-container'));
 const preview=elementFor(rootFor('document-preview studio-responsive-container'));
 assert.equal(edit.type,preview.type,'changing the host element type remounts its complete header/navigation subtree');
 assert.equal(edit.type,'article');assert.equal(edit.key,preview.key);
 assert.equal(edit.props.children.type,preview.props.children.type);
 assert.deepEqual(edit.props.style,preview.props.style);
 assert.match(edit.props.className,/block-canvas/);assert.match(preview.props.className,/document-preview/);
});
