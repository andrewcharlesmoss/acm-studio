import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { availableBlockTransformsInDocument, transformBlock } = await load('../app/studio/block-transforms.ts');
const { validContentBlocks } = await load('../app/studio/workspace-validation.ts');
const { capabilityProfileFor } = await load('../app/studio/blocks/capability-profiles.ts');
const { BlockPreviewRules } = await load('../app/studio/site-editor/block-preview-rules.tsx');
const plain = value => JSON.parse(JSON.stringify(value));
const code = { id: 'code', type: 'code', language: 'typescript', code: '\tconst x = `<tag>`;\n\n', blockAlign: 'wide', visualStyle: { minHeight: '200px', minWidth: '120px', padding: '12px', borderStyle: 'solid', borderWidth: '2px', borderRadius: '8px' }, editorial: { name: 'Retained code' } };

test('Code fixtures exercise real tabs and trailing blank lines', () => { assert.equal(code.code.charCodeAt(0), 9); assert.ok(code.code.endsWith('\n\n')); });

test('Code wrappers retain the exact original record and valid container trees', () => {
  for (const id of ['wrap-group', 'wrap-columns']) {
    const choice = availableBlockTransformsInDocument(code, [code]).find(item => item.id === id);
    assert.ok(choice);
    let count = 0;
    const wrapped = transformBlock(code, choice, () => `new-${count++}`);
    const child = wrapped.type === 'columns' ? wrapped.children[0].children[0] : wrapped.children[0];
    assert.equal(child, code);
    assert.deepEqual(plain(child), code);
    assert.equal(wrapped.blockAlign, 'wide');
    assert.equal(validContentBlocks([wrapped]), true);
  }
});

test('Code wrapper choices respect locks, parent restrictions and complete tree depth', () => {
  const ids = (block, blocks) => availableBlockTransformsInDocument(block, blocks).map(item => item.id);
  for (const lock of [{ move: true }, { remove: true }]) {
    const locked = { ...code, editorial: { lock } };
    assert.ok(!ids(locked, [locked]).some(id => id.startsWith('wrap-')));
  }
  const restricted = { id: 'quote', type: 'quote', text: '', children: [code] };
  assert.ok(!ids(code, [restricted]).some(id => id.startsWith('wrap-')));
  let root = code;
  for (let i = 0; i < 7; i++) root = { id: `depth-${i}`, type: 'group', layout: 'flow', children: [root] };
  assert.ok(!ids(code, [root]).includes('wrap-columns'));
});

test('Code website rules retain margin and paint border, radius and padding only on the code surface', () => {
  const html = renderToStaticMarkup(createElement(BlockPreviewRules, { scopeId: 'code-test', referenceDefaults: false, onlyBlock: 'code', selection: { paletteId: 'default', typographyId: 'default', blockStyles: { code: { margin: '24px 0', padding: '12px', borderStyle: 'solid', borderWidth: '3px', borderColor: '#123456', borderRadius: '9px' } } } }));
  for (const declaration of ['margin:24px 0', 'border-style:solid', 'border-width:3px', 'border-color:#123456', 'border-radius:9px', 'padding:12px']) assert.ok(html.includes(declaration), declaration);
  assert.match(html, /\.studio-code-preview\{border-radius:9px!important\}/);
  assert.match(html, /site-block-authored-border-radius/);
});

test('Code exposes existing canonical minimum dimension controls', () => {
  const profile = capabilityProfileFor('code');
  const dimensions = profile.controls.filter(control => control.section === 'dimensions').map(control => control.id);
  assert.ok(dimensions.includes('min-height'));
  assert.ok(dimensions.includes('min-width'));
});

test('Code projection keeps authored baseline and device appearance above website defaults', async () => {
  const { projectWebsiteDesignBlocks } = await load('../app/studio/site-editor/website-design-surface.tsx');
  const { styleForViewport } = await load('../app/content/responsive-styles.ts');
  const original = { id: 'own', type: 'code', code: 'Keep', visualStyle: { padding: '6px', borderStyle: 'solid', borderWidth: '2px', responsive: { tablet: { borderWidth: '4px' } } } };
  const projected = projectWebsiteDesignBlocks([original], { paletteId: 'default', typographyId: 'default', blockStyles: { code: { padding: '18px', borderRadius: '9px', responsive: { mobile: { padding: '8px', borderWidth: '5px', borderRadius: '12px' } } } } })[0];
  assert.equal(styleForViewport(projected.visualStyle, 'mobile').padding, '6px');
  assert.equal(styleForViewport(projected.visualStyle, 'mobile').borderWidth, '2px');
  assert.equal(styleForViewport(projected.visualStyle, 'tablet').borderWidth, '4px');
  assert.equal(styleForViewport(projected.visualStyle, 'mobile').borderRadius, '9px', 'The original authored device map is preserved; website mobile defaults paint through guarded website CSS');
  assert.deepEqual(original.visualStyle.responsive, { tablet: { borderWidth: '4px' } });
});

test('Code splits only surface paint from frame layout with portable responsive metrics', async () => {
  const { codeFramePresentation, codeInputPresentation } = await load('../app/components/blocks/code-presentation.ts');
  const css = { padding: '6px', borderStyle: 'solid', borderWidth: '2px', borderColor: '#008800', borderRadius: '4px', backgroundColor: '#ffeecc', margin: '7px 0', minHeight: '220px', color: '#111111', '--studio-rs-mobile-padding': '8px', '--studio-rs-mobile-margin': '12px' };
  const result = codeFramePresentation(css);
  assert.deepEqual(plain(result.frame), { margin: '7px 0', minHeight: '220px', color: '#111111', '--studio-rs-mobile-margin': '12px' });
  assert.equal(result.surface.padding, '6px');
  assert.equal(result.surface['--studio-rs-mobile-padding'], '8px');
  const input = codeInputPresentation(result.surface);
  assert.equal(input.padding, '6px');
  assert.equal(input['--studio-rs-mobile-padding'], '8px');
  assert.equal(input.borderWidth, '2px');
  assert.equal(input.borderColor, 'transparent');
  assert.equal(input.backgroundColor, undefined);
});

test('Code surface adapter preserves accepted safe CSS longhands and shorthand metrics', async () => {
  const { codeFramePresentation, codeInputPresentation } = await load('../app/components/blocks/code-presentation.ts');
  const { paragraphStyleToCss } = await load('../app/content/paragraph-styles.ts');
  const css = paragraphStyleToCss({ additionalCss: 'padding:6px; padding-top:11px; border:4px solid #880088; border-left-width:7px; border-radius:24px; background:#ffeecc;' });
  const { frame, surface } = codeFramePresentation(css);
  assert.deepEqual(plain(frame), {});
  assert.equal(surface.paddingTop, '11px');
  assert.equal(surface.borderLeftWidth, '7px');
  const input = codeInputPresentation(surface);
  assert.equal(input.paddingTop, '11px');
  assert.equal(input.borderLeftWidth, '7px');
  assert.equal(input.borderColor, 'transparent');
});
