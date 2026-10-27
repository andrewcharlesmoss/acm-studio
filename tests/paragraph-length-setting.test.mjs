import { loadProductionModule } from "./production-module.mjs";
const boxLengths = await loadProductionModule(new URL("../app/content/box-lengths.ts",import.meta.url));
import { createHostModuleEvaluator } from "./production-module.mjs";
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';


function fixture(presentation = 'input-first') {
 const source = readFileSync(new URL('../app/studio/controls/paragraph-length-setting.tsx', import.meta.url), 'utf8');
 const code = (source);
 const slots = []; let index = 0;
 const jsx = (type, props) => ({ type, props });
 const useState = initial => { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], next => { slots[slot] = next; }]; };
 const require = name => name.endsWith("content/box-lengths") ? boxLengths : name === 'react' ? { useState } : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' } : name.endsWith('number-unit-field') ? { NumberUnitField: 'unit-field' } : { RangeControl: 'range' };
 const Component = createHostModuleEvaluator(['require', 'exports'], `${code}\nreturn exports.ParagraphLengthSetting;`)(require, {});
 const changes = [];
 const props = { label: 'Line indent', min: -100, max: 200, presentation, onChange: next => { props.value = next; changes.push(next); } };
 const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
 const find = type => { index = 0; return flatten(Component(props)).find(node => node.type === type); };
 return { props, changes, field: () => find('unit-field').props, range: () => find('range').props };
}

test('input-first indent permits unit selection before entry, commits lengths, and clears without zero overrides', () => {
 const f = fixture();
 assert.equal(f.field().unitProps.disabled, false);
 assert.equal(f.range().min, 0, 'unset indent starts at the left edge of the slider');
 f.field().unitProps.onChange({ target: { value: 'em' } });
 assert.equal(f.field().unitProps.value, 'em');
 assert.deepEqual(f.changes, [], 'a view-only unit choice does not pin an inherited value');
 f.field().inputProps.onChange({ target: { value: '2' } });
 f.field().inputProps.onBlur();
 assert.equal(f.props.value, '2em');
 f.field().inputProps.onChange({ target: { value: '' } });
 f.field().inputProps.onBlur();
 assert.equal(f.props.value, undefined);
 assert.equal(f.field().inputProps.value, '');
 f.props.value = '-20px';
 assert.equal(f.range().min, -20, 'authored negative values remain visible');
 assert.equal(f.field().inputProps.value, '-20', 'history updates the visible field');
});

test('legacy paragraph length keeps its range bounds and blank-unit disabled behaviour', () => {
 const f = fixture('standard');
 assert.equal(f.range().min, -100);
 assert.equal(f.field().unitProps.disabled, true);
 f.range().onChange({ target: { value: '16' } });
 assert.equal(f.props.value, '16px');
 assert.equal(f.field().unitProps.disabled, false);
 f.field().unitProps.onChange({ target: { value: 'em' } });
 f.props.value = undefined;
 assert.equal(f.field().unitProps.value, 'px', 'legacy clearing restores its original unit default');
});
