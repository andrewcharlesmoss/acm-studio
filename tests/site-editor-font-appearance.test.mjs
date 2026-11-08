import { createHostModuleEvaluator } from "./production-module.mjs";
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const jsx = (type, props) => ({ type, props });
const slots = []; let index = 0; let focused = 0;
const react = { useId: () => 'font-choice', useRef: () => ({ current: { focus: () => focused++ } }), useState(initial) { const id = index++; if (!(id in slots)) slots[id] = initial; return [slots[id], value => { slots[id] = typeof value === 'function' ? value(slots[id]) : value; }]; } };
const sharedSource = readFileSync(new URL('../app/studio/controls/font-preview-select.tsx', import.meta.url), 'utf8');
const sharedCode = (sharedSource);
const requireShared = name => name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name.endsWith('anchored-menu') ? { StudioAnchoredMenu: 'Menu' } : name.endsWith('studio-icons') ? { StudioIcon: 'Icon' } : {};
const FontPreviewSelect = createHostModuleEvaluator(['require', 'exports', 'requestAnimationFrame'], `${sharedCode}\nreturn exports.FontPreviewSelect;`)(requireShared, {}, callback => callback());
const appearanceSource = readFileSync(new URL('../app/studio/site-editor/font-appearance-select.tsx', import.meta.url), 'utf8');
const appearanceCode = (appearanceSource);
const FontAppearanceSelect = createHostModuleEvaluator(['require', 'exports'], `${appearanceCode}\nreturn exports.FontAppearanceSelect;`)(name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : { FontPreviewSelect: 'FontPreviewSelect' }, {});
const appearanceSettingSource = readFileSync(new URL('../app/studio/controls/font-size-appearance-setting.tsx', import.meta.url), 'utf8');
const appearanceSettingCode = appearanceSettingSource;
const FontSizeAppearanceSetting = createHostModuleEvaluator(['require', 'exports'], `${appearanceSettingCode}\nreturn exports.FontSizeAppearanceSetting;`)(name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name === './setting-inheritance' ? { SettingLabel: 'SettingLabel' } : name === './font-preview-select' ? { FontPreviewSelect: 'FontPreviewSelect' } : name === '@acm/icons/react' ? { AcmIcon: 'AcmIcon' } : name === './custom-font-size-setting' ? { CustomFontSizeSetting: 'CustomFontSizeSetting' } : {} , {});
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
  assert.equal(all(tree).filter(node => node.props?.role === 'menuitem').length, 0, 'dropdown has no Close action');
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

test('Typography Appearance matches Gutenberg weights, italic variants, authored Default, and trigger-width contract', () => {
  const changes = [];
  const tree = FontSizeAppearanceSetting({ appearance: undefined, appearanceFontFamily: '"TT5 Manrope", sans-serif', mode: 'presets', showSize: false, onModeChange: () => {}, onSizeChange: () => {}, onCustomSizeChange: () => {}, onAppearanceChange: value => changes.push(value) });
  const dropdown = all(tree).find(node => node.type === 'FontPreviewSelect');
  const options = dropdown.props.options;
  assert.equal(dropdown.props.value, '', 'unset appearance stays Default even if rendering inherits a font weight');
  assert.equal(dropdown.props.matchAnchorWidth, true);
  assert.equal(options.length, 21);
  assert.deepEqual(options.map(option => option.label), ['Default', 'Thin', 'Extra Light', 'Light', 'Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold', 'Black', 'Extra Black', 'Thin Italic', 'Extra Light Italic', 'Light Italic', 'Regular Italic', 'Medium Italic', 'Semi Bold Italic', 'Bold Italic', 'Extra Bold Italic', 'Black Italic', 'Extra Black Italic']);
  assert.deepEqual(options.slice(1).map(option => [option.weight, option.italic]), [...[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map(weight => [weight, undefined]), ...[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map(weight => [weight, true])]);
  assert.equal(options[10].family, '"TT5 Manrope", sans-serif');
  dropdown.props.onChange('extra-black-italic');
  dropdown.props.onChange('');
  assert.deepEqual(changes, ['extra-black-italic', undefined]);
});
