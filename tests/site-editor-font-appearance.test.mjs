import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
const slots = []; let index = 0; let focused = 0;
const react = { useId: () => 'font-choice', useRef: () => ({ current: { focus: () => focused++ } }), useState(initial) { const id = index++; if (!(id in slots)) slots[id] = initial; return [slots[id], value => { slots[id] = typeof value === 'function' ? value(slots[id]) : value; }]; } };
const sharedSource = readFileSync(new URL('../app/studio/controls/font-preview-select.tsx', import.meta.url), 'utf8');
const sharedCode = ts.transpileModule(sharedSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const requireShared = name => name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name.endsWith('anchored-menu') ? { StudioAnchoredMenu: 'Menu' } : name.endsWith('studio-icons') ? { StudioIcon: 'Icon' } : {};
const FontPreviewSelect = new Function('require', 'exports', 'requestAnimationFrame', `${sharedCode}\nreturn exports.FontPreviewSelect;`)(requireShared, {}, callback => callback());
const appearanceSource = readFileSync(new URL('../app/studio/site-editor/font-appearance-select.tsx', import.meta.url), 'utf8');
const appearanceCode = ts.transpileModule(appearanceSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const FontAppearanceSelect = new Function('require', 'exports', `${appearanceCode}\nreturn exports.FontAppearanceSelect;`)(name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : { FontPreviewSelect: 'FontPreviewSelect' }, {});
const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];

test('shared Font dropdown previews each family and selects with focus return', () => {
  const changes = [];
  const options = [{ value: '', label: 'Default' }, { value: 'Manrope', label: 'Manrope', family: 'Manrope' }, { value: 'Literata', label: 'Literata', family: 'Literata' }];
  let value = 'Manrope';
  const render = () => { index = 0; return FontPreviewSelect({ label: 'Font', value, options, onChange: next => { value = next; changes.push(next); } }); };
  let tree = render();
  const trigger = () => all(tree).find(node => node.props?.['aria-haspopup'] === 'menu');
  trigger().props.onClick(); tree = render();
  const choices = all(tree).filter(node => node.props?.role === 'menuitemradio');
  assert.deepEqual(choices.map(node => node.props.children[0].props.style.fontFamily), [undefined, 'Manrope', 'Literata']);
  assert.equal(choices[1].props['aria-checked'], true);
  choices[2].props.onClick(); tree = render();
  assert.deepEqual(changes, ['Literata']);
  assert.equal(trigger().props['aria-expanded'], false);
  assert.equal(focused, 1);
  trigger().props.onClick(); tree = render();
  const reopenedChoices = all(tree).filter(node => node.props?.role === 'menuitemradio');
  assert.equal(reopenedChoices[2].props['aria-checked'], true);
  reopenedChoices[0].props.onClick(); tree = render();
  assert.equal(value, '');
  assert.deepEqual(changes, ['Literata', '']);
  assert.equal(focused, 2);
  trigger().props.onClick(); tree = render();
  all(tree).find(node => node.type === 'Menu').props.onClose(); tree = render();
  assert.equal(trigger().props['aria-expanded'], false);
  assert.equal(focused, 3);
});

test('Appearance uses the shared dropdown and previews weight in the selected family', () => {
  const options = [{ value: '', label: 'Default' }, { value: '300', label: 'Light', weight: 300 }, { value: '700', label: 'Bold', weight: 700, italic: true }];
  const tree = FontAppearanceSelect({ value: '', family: 'Example Font', options, onChange: () => {} });
  assert.equal(tree.type, 'FontPreviewSelect');
  assert.equal(tree.props.label, 'Appearance');
  assert.deepEqual(tree.props.options.map(option => [option.family, option.weight, option.italic]), [[undefined, undefined, undefined], ['Example Font', 300, undefined], ['Example Font', 700, true]]);
});
