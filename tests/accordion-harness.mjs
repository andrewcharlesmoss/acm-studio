import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";

/** Render the actual shared accordion with deterministic React hook scheduling. */
export function accordionControl(props, inheritedDisabled = false) {
  let state = props.defaultOpen ?? true;
  const refs = [];
  let cursor = 0;
  const react = {createContext:()=>({}),useContext:()=>inheritedDisabled,useId:()=>"accordion-content",useRef:value=>refs[cursor++]??={current:value},useState:()=>[state,value=>{state=typeof value==="function"?value(state):value;} ]};
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../app/studio/inspector-accordion.tsx",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>name==="react"?react:name==="./studio-icons"?{StudioIcon:"svg"}:jsxRuntime});
  return {render(){cursor=0;return exports.InspectorAccordionSection(props);}};
}
