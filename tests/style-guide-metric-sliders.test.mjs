import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { createHostModuleEvaluator } from './production-module.mjs';
import { universalPreset } from './style-test-presets.mjs';
import { parseStyleGuidePresets } from '../app/studio/ui/styles/style-guide-tokens.mjs';
const realRequire = createRequire(import.meta.url);
const RangeControl = () => null;
const NumberInput = () => null;
const SelectControl = () => null;
const NumberUnitField = () => null;
const jsx = (type, props) => ({ type, props });
const code = readFileSync(new URL('../app/studio/ui/styles/style-guide-sandbox.tsx', import.meta.url), 'utf8');
const require = name => name === 'react' ? { useState: () => ['size', () => {}], forwardRef: fn => fn }
  : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx }
  : name === '@acm/styles' ? realRequire(name)
  : name === '../../controls/range-control' ? { RangeControl }
  : name === '../../controls/number-unit-field' ? { NumberUnitField }
  : name === '../../controls/native-fields' ? { NumberInput, SelectControl } : {};
const { TypographyControls, LayoutControls } = createHostModuleEvaluator(['require', 'exports'], `${code}\nexports.TypographyControls = TypographyControls; exports.LayoutControls = LayoutControls; return exports;`)(require, {});
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];

test('typography uses shared sliders with the resolved values, units, bounds and history boundaries', () => {
  for (const viewport of ['desktop', 'tablet', 'mobile']) {
    const changes = [], ended = [];
    const value = structuredClone(universalPreset.typography.body);
    value.size.tablet = { value: 22, unit: 'px' };
    const tree = nodes(TypographyControls({ role: 'body', viewport, value, baseline: value, search: '', matchingFamilies: [], onMetricChange: (...args) => changes.push(args), onEndEdit: () => ended.push(true) }));
    const ranges = tree.filter(node => node.type === RangeControl);
    assert.equal(ranges.length, 3);
    const unitSelectors = tree.filter(node => node.type === SelectControl);
    assert.equal(unitSelectors.length, 2, 'line height must not render a unit dropdown');
    const optionsFor = label => unitSelectors.find(node => node.props['aria-label'].includes(label)).props.children.map(option => option.props.value);
    assert.deepEqual(optionsFor('Font size'), ['px', 'em', 'rem', 'vw', 'vh']);
    assert.deepEqual(optionsFor('Letter spacing'), ['px', '%', 'em', 'rem', 'vw', 'vh']);
    assert.equal(unitSelectors.some(node => node.props['aria-label'].includes('Line height')), false);
    const inputs = tree.filter(node => node.type === NumberInput);
    for (const [index, range] of ranges.entries()) {
      assert.equal(range.props.value, inputs[index].props.value);
      assert.equal(range.props.step, "any");
      assert.equal(range.props.min, inputs[index].props.min);
      assert.equal(range.props.max, inputs[index].props.max);
      assert.match(range.props['aria-label'], new RegExp(viewport));
      range.props.onChange({ currentTarget: { value: String(range.props.max) } });
      const [metric, update, continuous] = changes.at(-1);
      assert.equal(continuous, true);
      assert.equal(update({ value: 1, unit: 'em' }).value, range.props.max);
      assert.equal(update({ value: 1, unit: 'em' }).unit, 'em');
      range.props.onPointerUp(); range.props.onPointerCancel(); range.props.onKeyUp(); range.props.onBlur();
      assert.ok(['size', 'lineHeight', 'letterSpacing'].includes(metric));
    }
    const typed = inputs[0].props.min >= 8 ? 17 : 1.0625;
    inputs[0].props.onChange({ target: { value: String(typed) } });
    assert.equal(changes.at(-1)[1]({ value: 1, unit: "rem" }).value, typed);
    assert.equal(ended.length, 12);
  }
});

test('layout settings use the shared editable number-unit field beside their slider', () => {
  const layout = {
    spacing: { value: 24, unit: 'px' }, contentWidth: { value: 1040, unit: 'px' },
    radius: { value: 8, unit: 'px' }, borderWidth: { value: 1, unit: 'px' },
  };
  const fields = [], ranges = [], changes = [], drafts = [];
  const tree = nodes(LayoutControls({ layout, originals: layout, inputDraft: {}, setInputDraft: update => drafts.push(update), setPreset: (...args) => changes.push(args), onEndEdit() {} }));
  for (const key of ['spacing', 'contentWidth', 'radius', 'borderWidth']) {
    const field = tree.find(node => node.type === NumberUnitField && node.props.inputProps['data-style-path'] === `layout.${key}`);
    const range = tree.find(node => node.type === RangeControl && node.props['data-style-path'] === `layout.${key}`);
    assert.ok(field, `${key} uses NumberUnitField`);
    assert.ok(range, `${key} uses RangeControl`);
    assert.equal(field.props.inputProps.value, layout[key].value, 'the text field remains editable');
    assert.equal(range.props.value, layout[key].value);
    fields.push(field); ranges.push(range);
  }
  assert.deepEqual(fields.map(field => field.props.units), [
    ['px', '%', 'em', 'rem', 'vw', 'vh'], ['px', '%', 'em', 'rem', 'vw', 'vh'],
    ['px', '%', 'em', 'rem'], ['px'],
  ]);
  fields[0].props.inputProps.onChange({ currentTarget: { value: '31' } });
  assert.deepEqual(drafts.at(-1)({}), { spacing: '31' }, 'typing updates the editable value draft');
  assert.deepEqual(changes.at(-1)[0]({ layout }).layout.spacing, { value: 31, unit: 'px' }, 'valid typed values update the saved-value draft');
  ranges[0].props.onChange({ currentTarget: { value: '42' } });
  assert.deepEqual(changes.at(-1)[0]({ layout }).layout.spacing, { value: 42, unit: 'px' }, 'the slider updates the same metric while retaining its unit');
  fields[0].props.unitProps.onChange({ currentTarget: { value: 'rem' } });
  assert.deepEqual(changes.at(-1)[0]({ layout }).layout.spacing, { value: 1.5, unit: 'rem' });
  const validChanges = changes.length;
  fields[3].props.unitProps.onChange({ currentTarget: { value: '%' } });
  assert.equal(changes.length, validChanges, 'unsupported units are ignored');
});

test('the canonical guide parser accepts the WordPress typography unit choices and rejects line-height units', () => {
  const guidePath = new URL('../../workspace-governance/STYLE_GUIDE.md', import.meta.url);
  const source = readFileSync(guidePath, 'utf8');
  const customBodyRow = '| typography.body | Inter | 4vw | 400 | normal | 1.5 | -0.1% | none |';
  const guide = source.replace('| typography.body | Inter | 1.0625rem | 400 | normal | 1.5 | 0em | none |', customBodyRow);
  const parsed = parseStyleGuidePresets(guide).universalPreset.typography.body;
  assert.deepEqual(parsed.size.desktop, { value: 4, unit: 'vw' });
  assert.deepEqual(parsed.letterSpacing.desktop, { value: -0.1, unit: '%' });
  assert.throws(() => parseStyleGuidePresets(guide.replace(customBodyRow, customBodyRow.replace('| 1.5 |', '| 1.5em |'))), /unsupported lineHeight unit/);
});
