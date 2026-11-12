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
const jsx = (type, props) => ({ type, props });
const code = readFileSync(new URL('../app/studio/ui/styles/style-guide-sandbox.tsx', import.meta.url), 'utf8');
const require = name => name === 'react' ? { useState: () => ['size', () => {}], forwardRef: fn => fn }
  : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx }
  : name === '@acm/styles' ? realRequire(name)
  : name === '../../controls/range-control' ? { RangeControl }
  : name === '../../controls/native-fields' ? { NumberInput, SelectControl } : {};
const { TypographyControls } = createHostModuleEvaluator(['require', 'exports'], `${code}\nexports.TypographyControls = TypographyControls; return exports;`)(require, {});
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
