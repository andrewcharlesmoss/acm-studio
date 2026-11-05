import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHostModuleEvaluator, loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const inheritance = await load('../app/studio/blocks/style-inheritance.tsx');
const model = await load('../app/studio/site-editor/blocks-preview-model.ts');
const { BlockPreviewRules } = await load('../app/studio/site-editor/block-preview-rules.tsx');
const { paragraphStyleToCss } = await load('../app/content/paragraph-styles.ts');
const { capabilityProfileFor } = await load('../app/studio/blocks/capability-profiles.ts');
const { blockCatalogue } = await load('../app/studio/editor-model.ts');
const { AdvancedFieldsControl } = await load('../app/studio/controls/advanced-fields-control.tsx');
const text = readFileSync(new URL('../app/studio/blocks/inspectors/block-inspector.tsx', import.meta.url), 'utf8');
const adapterSource = text.slice(text.indexOf('function AdvancedFieldsInspector('), text.indexOf('type LayoutBlock ='));
const adapter = createHostModuleEvaluator(['useEffectiveContentSettingStyle', 'blockCatalogue', 'capabilityProfileFor', 'InspectorAccordionSection', 'AdvancedFieldsControl', 'require', 'exports'], adapterSource + '\nreturn AdvancedFieldsInspector;');
const require = createRequire(import.meta.url);
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];

test('Local Additional CSS clear persists as empty ownership through blur, parent changes and Reset', () => {
  for (const type of ['paragraph', 'heading']) {
    let block = type === 'paragraph' ? { id: 'test', type, text: 'Text', style: { anchor: 'keep', className: 'keep' } } : { id: 'test', type, text: 'Text', level: 2, visualStyle: { anchor: 'keep', className: 'keep' } };
    const own = () => block.type === 'paragraph' ? block.style : block.visualStyle;
    const target = model.previewBlockTarget(block);
    let parent = { additionalCss: 'color:red; width:200px' };
    const selection = () => ({ paletteId: 'default', typographyId: 'default', blockStyles: { [target]: parent } });
    const Component = adapter(value => inheritance.effectiveContentSettingStyle(value, selection(), 'desktop'), blockCatalogue, capabilityProfileFor, 'section', 'advanced', require, {});
    const control = () => nodes(Component({ block, fields: { anchor: true, className: true, additionalCss: true }, onChange(next) { block = next; } })).find(node => node.type === 'advanced').props;
    assert.equal(inheritance.contentSettingInheritance(block, own(), selection(), 'desktop')['Additional CSS'], true);
    control().onChange('additionalCss', '');
    assert.equal(own().additionalCss, '');
    assert.equal(own().anchor, 'keep'); assert.equal(own().className, 'keep');
    parent = { additionalCss: 'color:blue; width:300px' };
    assert.equal(control().style.additionalCss, '');
    assert.equal(inheritance.contentSettingInheritance(block, own(), selection(), 'desktop')['Additional CSS'], false);
    const projected = model.projectedStyle(parent, own());
    assert.equal(projected.additionalCss, '');
    assert.equal(paragraphStyleToCss(projected).color, undefined);
    assert.match(projected.className, /site-block-authored-additional-css/);
    const html = renderToStaticMarkup(createElement(AdvancedFieldsControl, { ...control(), blockName: 'Block' }));
    assert.match(html, /<textarea[^>]*><\/textarea>/);
    control().resetAdditionalCss();
    assert.equal(own().additionalCss, undefined);
    assert.equal(control().inheritedAdditionalCss, parent.additionalCss);
    assert.equal(inheritance.contentSettingInheritance(block, own(), selection(), 'desktop')['Additional CSS'], true);
    assert.equal(own().anchor, 'keep'); assert.equal(own().className, 'keep');
  }
});

test('parent Additional CSS paint is guarded independently from normal style defaults', () => {
  const html = renderToStaticMarkup(createElement(BlockPreviewRules, { scopeId: 'test', referenceDefaults: false, selection: { paletteId: 'default', typographyId: 'default', blockStyles: { paragraph: { textColor: '#123456', additionalCss: 'color:red' } } } }));
  assert.match(html, /:not\(\.site-block-authored-additional-css\)[^{}]*\{color:red!important\}/);
  const redRules = html.match(/[^{}]+\{color:red!important\}/g) ?? [];
  assert.ok(redRules.length > 0);
  assert.ok(redRules.every(rule => rule.includes(':not(.site-block-authored-additional-css)')));
  assert.match(html, /color:#123456!important/);
});

test('empty CSS remains a valid stored style rather than an absent field', async () => {
  const { validParagraphStyle } = await load('../app/studio/workspace-validation.ts');
  const empty = JSON.parse(JSON.stringify({ additionalCss: '' }));
  assert.equal(validParagraphStyle(empty), true);
  assert.equal(Object.hasOwn(empty, 'additionalCss'), true);
  assert.equal(model.projectedStyle({ additionalCss: 'color:red' }, empty).additionalCss, '');
});
