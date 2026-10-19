import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { loadProductionModule } from './production-module.mjs';
const colourPalette = await loadProductionModule(new URL('../app/studio/site-editor/typography-colour-palette.ts', import.meta.url));

test('Typography menu exposes the reference options, resets authored fields, and toggles without changing values', () => {
  const source = readFileSync(new URL('../app/studio/site-editor/typography-element-settings.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const slots = []; let index = 0; let changes = 0;
  const jsx = (type, props) => ({ type, props });
  const react = { useId: () => 'spacing', useState(initial) { const id = index++; if (!(id in slots)) slots[id] = initial; return [slots[id], value => { slots[id] = typeof value === 'function' ? value(slots[id]) : value; }]; } };
  const model = { availableTypographyFamily: family => family, resolvedTypographyFields: () => ({ family: 'Example', weight: 400, lineHeight: 1.4, letterSpacing: '0px' }), typographySizeMode: () => 'presets', visibleTypographyFonts: () => [], resolveFontSizePresets: () => [], customTypographyStartingSize: () => '1rem', referenceFonts: [] };
  const require = name => name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name.endsWith('typography-preview-model') ? model : name.endsWith('typography-colour-palette') ? colourPalette : new Proxy({}, { get: (_, key) => key });
  const component = new Function('require', 'exports', `${code}\nreturn exports.TypographyElementSettings;`)(require, {});
  const resetFields = [];
  const render = () => { index = 0; return component({ role: 'text', typography: {}, palette: { colours: ['white'], text: 'black' }, settings: {}, authored: { family: 'Manrope', preset: 'large', size: '1.25rem', lineHeight: '1.5' }, onChange: () => changes++, onReset: () => {}, onResetFields: fields => resetFields.push(fields) }); };
  const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  let tree = render();
  const section = () => all(tree).find(node => node.type === 'InspectorToolsSection');
  assert.deepEqual(section().props.options.map(option => option.label), ['Colour', 'Font', 'Size', 'Appearance', 'Line height', 'Letter spacing', 'Letter case', 'Text alignment']);
  assert.equal(section().props.showCloseControl, false);
  assert.deepEqual([...section().props.resettableOptions], ['font', 'size', 'lineHeight']);
  section().props.onResetOption('size');
  assert.deepEqual(resetFields, [['preset', 'size']]);
  assert.equal(all(tree).find(node => node.type === 'FontFamilySelect').props.previewOptions, true);
  const probes = { colour: nodes => nodes.some(n => n.type === 'PaletteColourSetting'), font: nodes => nodes.some(n => n.type === 'FontFamilySelect'), size: nodes => nodes.some(n => n.type === 'FontSizeAppearanceSetting' && n.props.showSize), appearance: nodes => nodes.some(n => n.type === 'FontAppearanceSelect'), lineHeight: nodes => nodes.some(n => n.type === 'LineHeightSetting'), letterSpacing: nodes => nodes.some(n => n.type === 'NumberUnitField'), transform: nodes => nodes.some(n => n.type === 'RadioGroup' && n.props.label === 'Letter Case'), align: nodes => nodes.some(n => n.type === 'RadioGroup' && n.props.label === 'Text Alignment') };
  for (const [id, probe] of Object.entries(probes)) {
    assert.equal(probe(all(tree)), true, `${id} starts visible`);
    section().props.onToggle(id); tree = render();
    assert.equal(section().props.visible.has(id), false);
    assert.equal(probe(all(tree)), false, `${id} hides`);
    section().props.onToggle(id); tree = render();
    assert.equal(probe(all(tree)), true, `${id} restores`);
  }
  assert.equal(changes, 0);
});
