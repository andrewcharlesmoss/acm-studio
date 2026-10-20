import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
test('per-option Reset returns focus to an enabled toggle or to the trigger for required controls',()=>{
 const source=readFileSync(new URL('../app/studio/inspector-tools-section.tsx',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 let open=true;let focused='';let reset=0;const frames=[];
 const trigger={focus(){focused='trigger';}};
 const react={useState:()=>[open,value=>{open=typeof value==='function'?value(open):value;}],useId:()=> 'tools',useRef:()=>({current:trigger}),useEffect(){}};
 const jsx=(type,props)=>({type,props});const require=name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:new Proxy({},{get:(_,key)=>key});
 const Content=new Function('require','exports','requestAnimationFrame',`${code}\nreturn InspectorToolsSectionContent;`)(require,{},callback=>frames.push(callback));
 const all=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(all):[node,...all(node.props?.children)];
 for(const disabled of [false,true]){
  focused='';const toggle={disabled,isConnected:true,focus(){focused='toggle';}};
  const tree=Content({title:'Dimensions',options:[{id:'width',label:'Width',disabled}],visible:new Set(['width']),canReset:true,alwaysShow:true,showCloseControl:false,menuWidth:240,allowMenuOverlap:false,resettableOptions:new Set(['width']),onResetOption(){reset+=1;},menuOptions:[],onToggle(){},onReset(){},disabled:false,children:'Example'});
  const resetButton=all(tree).find(node=>node.props?.['aria-label']==='Reset Width');
  resetButton.props.onClick({currentTarget:{parentElement:{querySelector:()=>toggle}}});
  assert.equal(focused,'');frames.shift()();assert.equal(focused,disabled?'trigger':'toggle');
 }
 assert.equal(reset,2);
});

test('shared inspector options use glyph-only hover and expanded feedback', () => {
 const css=readFileSync(new URL('../app/studio/studio.css',import.meta.url),'utf8');
 assert.match(css,/\.inspector-tools-trigger:hover:not\(:disabled\), \.inspector-tools-trigger\[aria-expanded="true"\]:not\(:disabled\) \{ background: transparent; color: var\(--acm-color-accent, #0088ff\); \}/);
 const siteCss=readFileSync(new URL('../app/studio/site-editor/site-editor-preview.css',import.meta.url),'utf8');
 assert.match(siteCss, /:not\([^)]*\.inspector-tools-trigger(?:,|\))/);
 assert.doesNotMatch(css,/:is\([^)]*\.inspector-tools-trigger[^)]*\):not\(:disabled\):not\(\[aria-expanded="true"\]\):hover \{ background:/);
});
