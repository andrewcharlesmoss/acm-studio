import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { loadProductionModule } from './production-module.mjs';

const { FontSizeAppearanceSetting } = await loadProductionModule(new URL('../app/studio/controls/font-size-appearance-setting.tsx', import.meta.url));
function options(font, appearance) {
  const control = FontSizeAppearanceSetting({ appearanceFontId: font, appearance, showSize: false, mode: 'presets', onModeChange() {}, onSizeChange() {}, onCustomSizeChange() {}, onAppearanceChange() {} });
  return React.Children.toArray(control.props.children).find(child => child.props?.label === 'Appearance').props.options;
}
test('Appearance follows explicit theme font weights and keeps Default unrestricted', () => {
  assert.equal(options(undefined).length, 21);
  assert.deepEqual(options('site-manrope').filter(option => !option.italic).map(option => option.weight).filter(Boolean), [200, 300, 400, 500, 600, 700, 800]);
  assert.deepEqual(options('site-fira-code').filter(option => option.italic).map(option => option.weight), [300, 400, 500, 600, 700]);
});
test('switching fonts retains an authored unavailable Appearance choice', () => {
  assert.equal(options('site-manrope', 'black').find(option => option.value === 'black').label, 'Black');
  assert.equal(options('site-fira-code', 'thin-italic').find(option => option.value === 'thin-italic').italic, true);
});
