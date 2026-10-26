import { createHostModuleEvaluator } from "./production-module.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";

import { loadProductionModule } from "./production-module.mjs";
const styleLimits = await loadProductionModule(new URL("../app/studio/site-editor/website-style-limits.ts", import.meta.url));
const boxLengths = await loadProductionModule(new URL("../app/content/box-lengths.ts", import.meta.url));
const stateModel = await loadProductionModule(new URL("../app/studio/site-editor/styles-preview-state.ts", import.meta.url));
const shadowModel = await loadProductionModule(new URL("../app/studio/site-editor/shadows-preview-model.ts", import.meta.url));
const colourModel = await loadProductionModule(new URL("../app/studio/site-editor/colours-preview-model.ts", import.meta.url));
const layoutModel = await loadProductionModule(new URL("../app/studio/site-editor/layout-preview-model.ts", import.meta.url));
const { ShadowsPreview } = await loadProductionModule(new URL("../app/studio/site-editor/shadows-preview.tsx", import.meta.url));
const { LayoutPreview } = await loadProductionModule(new URL("../app/studio/site-editor/layout-preview.tsx", import.meta.url));
const { createStylesPreview, stylesPreviewReducer, resolvePreviewStyle } = stateModel;
function fixture() { let state = createStylesPreview(); return { apply(action) { state = stylesPreviewReducer(state, action); }, get state() { return state; }, selection(scope = "test") { return resolvePreviewStyle(state.present, scope); } }; }
test("reference shadow definitions preserve both Outlined layers and shadow unit validity", () => {
  assert.deepEqual(shadowModel.defaultShadowPresets.map(item => item.name), ["Natural", "Deep", "Sharp", "Outlined", "Crisp"]);
  assert.equal(shadowModel.shadowPresetCss(shadowModel.defaultShadowPresets[0]), "6px 6px 9px 0px #00000033");
  assert.equal(shadowModel.shadowPresetCss(shadowModel.defaultShadowPresets[3]), "6px 6px 0px -3px #FFFFFF, 6px 6px 0px 0px #000000");
  const layer = { ...shadowModel.newShadowLayer("first"), inset: true, x: "3vw", blur: "1vh" };
  assert.match(shadowModel.shadowPresetCss({ id: "x", name: "X", layers: [layer] }), /^inset 3vw 6px 1vh/);
  assert.match(shadowModel.shadowPresetCss({ id: "x", name: "X", layers: [layer] }, true), /^inset 3cqw 6px 1cqh/);
  assert.equal(shadowModel.validShadowLength("10%"), false); assert.equal(shadowModel.validShadowLength("-2px", false), false);
});
test("default shadow overrides, custom add rename delete, and reset retain inheritance and history", () => {
  const f = fixture(); const layers = [{ ...shadowModel.newShadowLayer("edited"), x: "20px" }];
  f.apply({ type: "shadow", scope: "global", id: "natural", patch: { layers } });
  f.apply({ type: "shadow", scope: "test", id: "natural", patch: { name: "Soft" } });
  assert.equal(shadowModel.resolveShadowPresets(f.selection().shadows)[0].layers[0].x, "20px");
  assert.equal(shadowModel.resolveShadowPresets(f.selection("test2").shadows)[0].name, "Natural");
  f.apply({ type: "reset-shadow", scope: "test", id: "natural" });
  assert.equal(shadowModel.resolveShadowPresets(f.selection().shadows)[0].name, "Natural");
  f.apply({ type: "shadow", scope: "global", id: "custom", patch: { name: "Custom", layers } });
  f.apply({ type: "shadow", scope: "test", id: "custom", patch: { name: "Local" } });
  assert.equal(shadowModel.resolveShadowPresets(f.selection().shadows).at(-1).layers[0].x, "20px");
  f.apply({ type: "delete-shadow", scope: "test", id: "custom" });
  assert.equal(shadowModel.resolveShadowPresets(f.selection().shadows).some(item => item.id === "custom"), false);
  f.apply({ type: "undo" }); assert.equal(shadowModel.resolveShadowPresets(f.selection().shadows).at(-1).name, "Local");
  f.apply({ type: "redo" }); assert.equal(shadowModel.resolveShadowPresets(f.selection().shadows).some(item => item.id === "custom"), false);
  f.apply({ type: "reset-shadow", scope: "test" }); assert.equal(shadowModel.resolveShadowPresets(f.selection().shadows).at(-1).name, "Custom");
});
test("layout fields inherit separately, reset independently, and preserve background Blob history", () => {
  const f = fixture(); const image = { id: "x", name: "Image", blob: new Blob(["source"]) };
  f.apply({ type: "background", scope: "test", patch: { image } });
  f.apply({ type: "layout", scope: "global", patch: { contentWidth: "40rem", wideWidth: "90%", padding: "0px 3vw", blockSpacing: "2rem" } });
  f.apply({ type: "layout", scope: "test", patch: { contentWidth: "500px", blockSpacing: "0px" } });
  assert.equal(f.selection().layout.wideWidth, "90%"); assert.equal(f.selection().layout.blockSpacing, "0px");
  f.apply({ type: "reset-layout", scope: "test", field: "contentWidth" });
  assert.equal(f.selection().layout.contentWidth, "40rem"); assert.equal(f.selection().layout.blockSpacing, "0px");
  f.apply({ type: "undo" }); assert.equal(f.selection().layout.contentWidth, "500px");
  f.apply({ type: "reset-layout", scope: "test" }); assert.equal(f.selection().layout.blockSpacing, "2rem");
  assert.equal(f.selection().background.image, image);
  f.apply({ type: "reset", scope: "test" }); assert.equal(f.selection().background, undefined);
  f.apply({ type: "undo" }); assert.equal(f.selection().background.image, image);
  const invalid = layoutModel.patchPreviewLayout({}, { contentWidth: "0px", wideWidth: "-5px", padding: "url(invalid)", blockSpacing: "Infinityrem" }); assert.deepEqual(invalid, {});
});
test("preview layout lengths resolve viewport units against measured sample viewport", () => {
 const css = layoutModel.previewLayoutCss({ contentWidth: "50vw", wideWidth: "90%", padding: "0px 3vw", blockSpacing: "2vh" });
 assert.equal(css["--site-layout-content-width"], "calc(var(--site-preview-viewport-width, 0px) * 0.5)");
 assert.equal(css["--site-layout-wide-width"], "90%");
 assert.equal(css["--site-layout-padding"], "0px calc(var(--site-preview-viewport-width, 0px) * 0.03)");
 assert.equal(css["--site-layout-block-spacing"], "calc(var(--site-preview-viewport-height, 0px) * 0.02)");
});
test("Shadows and Layout expose their reference entry controls through production components", () => {
 const props = { selection: { paletteId: "default", typographyId: "default" }, authored: {}, scope: "test", dispatch() {}, onBack() {} };
 const shadows = renderToStaticMarkup(createElement(ShadowsPreview, props));
 for (const name of ["Natural", "Deep", "Sharp", "Outlined", "Crisp", "Add shadow"]) assert.ok(shadows.includes(name));
 const layout = renderToStaticMarkup(createElement(LayoutPreview, props));
 for (const name of ["Dimensions options", "Content width", "Wide width", "Padding", "Block spacing"]) assert.ok(layout.includes(name));
 assert.ok(layout.includes("Set the width of the main content area."));
 assert.ok(layout.includes("Block spacing Top value"));
 assert.equal((layout.match(/--spacing-segments:7/g) ?? []).length, 2);
 assert.ok(!layout.includes("Set the site’s content width"));
 assert.match(layout, /value="645"/); assert.match(layout, /value="1340"/);
});
test("production shadow UI routes preset selection, layer edits and removal through Styles commands", () => {
 const source = readFileSync(new URL("../app/studio/site-editor/shadows-preview.tsx", import.meta.url), "utf8");
 const code = (source);
 let focused=''; const focusTarget={focus(){focused='Add shadow layer';}}; const frames=[];const flushFrames=()=>{for(const callback of frames.splice(0))callback();};const fakeRoot={querySelectorAll:()=>[],querySelector:()=>focusTarget,focus(){focused='heading';}}; const slots=[];let index=0;const react={useState(initial){const i=index++;if(!(i in slots))slots[i]=initial;return[slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},useRef:()=>({current:fakeRoot}),useEffect(){}};
 const jsx=(type,props)=>({type,props}); const require=name=>name.endsWith("website-style-limits") ? styleLimits : name.endsWith("content/box-lengths") ? boxLengths : name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name.endsWith('shadows-preview-model')?shadowModel:name.endsWith('styles-preview-state')?stateModel:name.endsWith('colours-preview-model')?colourModel:new Proxy({},{get:(_,key)=>key});
 const {ShadowsPreview:Preview}=createHostModuleEvaluator(['require', 'exports', 'requestAnimationFrame'], `${code}\nreturn exports;`)(require,{},callback=>frames.push(callback));
 const f=fixture(); const all=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(all):[node,...all(node.props?.children)];const render=()=>{index=0;return all(Preview({selection:f.selection(),authored:f.state.present.test,scope:'test',dispatch:action=>f.apply(action),onBack(){}}));};
 let tree=render();tree.find(node=>node.props?.preset?.id==='outlined').props.onClick();f.apply({type:'colours',scope:'global',patch:{theme:{2:'#ABCDEF80'}}});tree=render();assert.equal(tree.find(node=>node.props?.className==='site-shadow-specimen').props.style['--site-palette-theme-2'],'#ABCDEF80');
 let layers=tree.filter(node=>node.props?.layer);assert.equal(layers.length,2);
 layers[0].props.onChange({inset:true,x:'3rem'});tree=render();layers=tree.filter(node=>node.props?.layer);assert.equal(layers[0].props.layer.x,'3rem');assert.equal(layers[0].props.layer.inset,true);
 layers[1].props.onRemove();tree=render();flushFrames();assert.equal(focused,'Add shadow layer');assert.equal(tree.filter(node=>node.props?.layer).length,1);
 f.apply({type:'undo'});tree=render();assert.equal(tree.filter(node=>node.props?.layer).length,2);
 f.apply({type:'shadow',scope:'test',id:'custom',patch:{name:'Custom',layers:[shadowModel.newShadowLayer('custom-layer')]}});
 tree.find(node=>node.props?.['aria-label']==='Back to Shadows').props.onClick();tree=render();flushFrames();
 tree.find(node=>node.props?.preset?.id==='custom').props.onClick();tree=render();
 tree.find(node=>node.props?.['aria-label']==='Shadow preset options').props.onClick();tree=render();
 tree.find(node=>node.type==='StudioMenuItem'&&node.props.children==='Rename').props.onClick();tree=render();
 tree.find(node=>node.type==='TextInput').props.onChange({target:{value:'Evening'}});tree=render();
 assert.equal(f.selection().shadows.custom.name,'Custom','rename draft does not change history');
 tree.find(node=>node.type==='StudioDialog').props.onClose();tree=render();assert.equal(f.selection().shadows.custom.name,'Custom','Escape cancels rename');
 tree.find(node=>node.props?.['aria-label']==='Shadow preset options').props.onClick();tree=render();
 tree.find(node=>node.type==='StudioMenuItem'&&node.props.children==='Rename').props.onClick();tree=render();
 tree.find(node=>node.type==='TextInput').props.onChange({target:{value:'Evening'}});tree=render();
 tree.find(node=>node.type==='form').props.onSubmit({preventDefault(){}});tree=render();
 assert.equal(f.selection().shadows.custom.name,'Evening');assert.equal(tree.some(node=>node.type==='StudioDialog'),false);
 tree.find(node=>node.props?.['aria-label']==='Shadow preset options').props.onClick();tree=render();
 tree.find(node=>node.type==='StudioMenuItem'&&node.props.children==='Delete').props.onClick();tree=render();
 assert.ok(f.selection().shadows.custom,'Delete requires confirmation');
 tree.find(node=>node.type==='StudioDialog').props.onClose();tree=render();assert.ok(f.selection().shadows.custom);
 tree.find(node=>node.props?.['aria-label']==='Back to Shadows').props.onClick();tree=render();
 tree.find(node=>node.props?.['aria-label']==='Add shadow').props.onClick();tree=render();
 assert.equal(tree.find(node=>node.props?.preset?.name==='Shadow 1').props.preset.name,'Shadow 1');
 assert.equal(tree.some(node=>node.props?.['aria-label']==='Back to Shadows'),false,'Add stays on the list');
 tree.find(node=>node.props?.['aria-label']==='Shadow options').props.onClick();tree=render();
 tree.find(node=>node.type==='StudioMenuItem'&&node.props.children==='Remove all custom shadows').props.onClick();tree=render();
 assert.equal(shadowModel.resolveShadowPresets(f.selection().shadows).length,7,'bulk removal requires confirmation');
 tree.find(node=>node.type==='StudioButton'&&node.props.children==='Remove').props.onClick();tree=render();
 assert.equal(shadowModel.resolveShadowPresets(f.selection().shadows).length,5);


});
test("deleting an inherited custom shadow hides name-only overrides and Undo restores them", () => {
 const f=fixture();const layers=[shadowModel.newShadowLayer('base')];
 f.apply({type:'shadow',scope:'global',id:'custom',patch:{name:'Global',layers}});
 f.apply({type:'shadow',scope:'test',id:'custom',patch:{name:'Local'}});
 f.apply({type:'delete-shadow',scope:'global',id:'custom'});
 assert.equal(shadowModel.resolveShadowPresets(f.selection().shadows).some(item=>item.id==='custom'),false);
 assert.equal(f.state.present.test.shadows.custom.name,'Local');
 f.apply({type:'undo'});let preset=shadowModel.resolveShadowPresets(f.selection().shadows).find(item=>item.id==='custom');assert.equal(preset.name,'Local');assert.equal(preset.layers[0].id,'base');
 f.apply({type:'shadow',scope:'test',id:'custom',patch:{layers:[shadowModel.newShadowLayer('own')]}});
 f.apply({type:'delete-shadow',scope:'global',id:'custom'});
 preset=shadowModel.resolveShadowPresets(f.selection().shadows).find(item=>item.id==='custom');assert.equal(preset.layers[0].id,'own');
});
test("shadow number fields retain transient negative drafts and commit on blur or Enter", () => {
 const source=readFileSync(new URL('../app/studio/site-editor/shadows-preview.tsx',import.meta.url),'utf8');
 const code=(source);
 let draft=null;const react={useState:()=>[draft,value=>{draft=value;} ]};const jsx=(type,props)=>({type,props});
 const require=name=>name.endsWith("website-style-limits") ? styleLimits : name.endsWith("content/box-lengths") ? boxLengths : name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:new Proxy({},{get:(_,key)=>key});
 const Field=createHostModuleEvaluator(['require', 'exports'], `${code}\nreturn ShadowLengthField;`)(require,{});
 let committed;const props={id:'x',label:'X Position',value:'6px',negative:true,onChange:value=>{committed=value;}};
 const render=()=>Field(props).props.children[1];
 render().props.inputProps.onChange({target:{value:'-'}});assert.equal(draft,'-');assert.equal(committed,undefined);
 render().props.inputProps.onChange({target:{value:'-12.5'}});render().props.inputProps.onBlur();assert.equal(committed,'-12.5px');assert.equal(draft,null);
 render().props.inputProps.onChange({target:{value:'-20'}});const current=render();current.props.inputProps.onKeyDown({key:'Enter',currentTarget:{blur:()=>current.props.inputProps.onBlur()}});assert.equal(committed,'-20px');
 render().props.inputProps.onChange({target:{value:'0.0000001'}});render().props.inputProps.onBlur();assert.equal(committed,'0.0000001px');
});

test("shadow palette references track effective theme edits and the specimen supplies their CSS variables", () => {
 const f=fixture();const token=colourModel.previewPaletteReference('theme-2');
 f.apply({type:'shadow',scope:'test',id:'natural',patch:{layers:[{...shadowModel.newShadowLayer('reference'),colour:token}]}});
 f.apply({type:'colours',scope:'global',patch:{theme:{2:'#ABCDEF80'}}});
 const selection=f.selection();const preset=shadowModel.resolveShadowPresets(selection.shadows)[0];
 const {palette}=stateModel.previewStyleDetails(selection);
 assert.match(shadowModel.shadowPresetCss(preset),/var\(--site-palette-theme-2\)/);
 assert.equal(colourModel.previewColourValue(preset.layers[0].colour,palette,selection.colours),'#ABCDEF80');
 assert.equal(colourModel.previewColourVariables(palette,selection.colours)['--site-palette-theme-2'],'#ABCDEF80');
});

test("shadow layer palette selection stores identity while custom picker changes remain literal", () => {
 const source=readFileSync(new URL('../app/studio/site-editor/shadows-preview.tsx',import.meta.url),'utf8');
 const code=(source);
 const react={useState:()=>[true,()=>{}],useRef:()=>({current:null})};const jsx=(type,props)=>({type,props});
 const require=name=>name.endsWith("website-style-limits") ? styleLimits : name.endsWith("content/box-lengths") ? boxLengths : name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name.endsWith('colours-preview-model')?colourModel:new Proxy({},{get:(_,key)=>key});
 const Layer=createHostModuleEvaluator(['require', 'exports'], `${code}\nreturn ShadowLayer;`)(require,{});
 let patch;const tree=Layer({layer:shadowModel.newShadowLayer('a'),colour:'#FF0000',index:0,entries:[],onChange:value=>{patch=value;},onRemove(){}});
 const all=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(all):[node,...all(node.props?.children)];
 const picker=all(tree).find(node=>node.type==='ColourPicker');
 picker.props.onSelectPalette({key:'theme-2',colour:'#FF0000'});assert.deepEqual(patch,{colour:'var(--site-palette-theme-2)'});
 picker.props.onChange('#12345680');assert.deepEqual(patch,{colour:'#12345680'});
});

test("Layout exposes exactly the six reference units in order for widths and spacing", () => {
  const html = renderToStaticMarkup(createElement(LayoutPreview, { selection: { paletteId: "default", typographyId: "default", layout: { padding: "1rem" } }, authored: {}, scope: "test", dispatch() {}, onBack() {} }));
  const menus = [...html.matchAll(/<select\b[^>]*>(.*?)<\/select>/g)].map(match => [...match[1].matchAll(/<option\b[^>]*value="([^"]+)"/g)].map(option => option[1]));
  assert.ok(menus.length >= 3);
  for (const options of menus) assert.deepEqual(options, ["px", "%", "em", "rem", "vw", "vh"]);
  assert.equal(layoutModel.validPreviewLength("40ch"), true, "legacy measurements remain recoverable");
});

test("shadow layer composes the shared colour card and equal-width segmented radios", () => {
 const source=readFileSync(new URL('../app/studio/site-editor/shadows-preview.tsx',import.meta.url),'utf8');
 const code=(source);
 const react={useState:()=>[true,()=>{}],useRef:()=>({current:null})};const jsx=(type,props)=>({type,props});
 const require=name=>name.endsWith("website-style-limits") ? styleLimits : name.endsWith("content/box-lengths") ? boxLengths : name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:new Proxy({},{get:(_,key)=>key});
 const Layer=createHostModuleEvaluator(['require', 'exports'], `${code}\nreturn ShadowLayer;`)(require,{});
 const tree=Layer({layer:shadowModel.newShadowLayer('a'),colour:'#000000',index:0,entries:[],onChange(){},onRemove(){}});
 const all=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(all):[node,...all(node.props?.children)];
 const nodes=all(tree);
 assert.equal(nodes.find(node=>node.type==='ColourPicker').props.presentation,'preview-card');
 const radio=nodes.find(node=>node.type==='RadioGroup');
 assert.equal(radio.props.presentation,'segmented'); assert.equal(radio.props.hideLabel,true);
 assert.deepEqual(radio.props.options.map(option=>option.label),['Outset','Inset']);
 assert.ok(nodes.some(node=>node.type==='PopoverHeading'&&node.props.closeLabel==='Close shadow layer'));
});

test("custom shadows use numbered names without collisions after rename or deletion", () => {
  const presets = [{ id: "custom-shadow-1-uuid", name: "Evening", layers: [] }, { id: "legacy-uuid", name: "Shadow 3", layers: [] }];
  assert.equal(shadowModel.nextCustomShadowName([]), "Shadow 1");
  assert.equal(shadowModel.nextCustomShadowName(presets), "Shadow 4");
  assert.equal(shadowModel.nextCustomShadowName(presets.slice(0, 1)), "Shadow 2");
  assert.equal(shadowModel.nextCustomShadowName([{ id: "custom-shadow-5-uuid", name: "Renamed", layers: [] }]), "Shadow 6");
});
test("remove all custom shadows preserves defaults and other scopes in one undoable action", () => {
  const f = fixture();
  const layers = [shadowModel.newShadowLayer("layer")];
  f.apply({ type: "shadow", scope: "global", id: "custom-global", patch: { name: "Global", layers } });
  f.apply({ type: "shadow", scope: "test", id: "custom-local", patch: { name: "Local", layers } });
  f.apply({ type: "shadow", scope: "test", id: "natural", patch: { layers: [{ ...layers[0], x: "40px" }] } });
  const before = f.state.present;
  f.apply({ type: "remove-custom-shadows", scope: "test" });
  assert.deepEqual(shadowModel.resolveShadowPresets(f.selection().shadows).map(p => p.id), ["natural", "deep", "sharp", "outlined", "crisp"]);
  assert.equal(shadowModel.resolveShadowPresets(f.selection().shadows)[0].layers[0].x, "40px");
  assert.equal(shadowModel.resolveShadowPresets(f.selection("test2").shadows).at(-1).name, "Global");
  f.apply({ type: "undo" }); assert.deepEqual(f.state.present, before);
  f.apply({ type: "redo" }); assert.equal(shadowModel.resolveShadowPresets(f.selection().shadows).length, 5);
});
