import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';

const model = await loadProductionModule(new URL('../app/studio/site-editor/blocks-preview-model.ts', import.meta.url));
const state = await loadProductionModule(new URL('../app/studio/site-editor/styles-preview-state.ts', import.meta.url));
const book = await loadProductionModule(new URL('../app/studio/site-editor/style-book-model.ts', import.meta.url));
const { StyleBook } = await loadProductionModule(new URL('../app/studio/site-editor/style-book.tsx', import.meta.url));
const { ComparisonHome } = await loadProductionModule(new URL('../app/studio/site-editor/comparison-home.tsx', import.meta.url));
const { BlocksPreview } = await loadProductionModule(new URL('../app/studio/site-editor/blocks-preview.tsx', import.meta.url));

test('Blocks contains only existing Style Book families and selects the corresponding production specimens', () => {
  assert.equal(model.previewBlockTargets.length, 12);
  for (const target of model.previewBlockTargets) {
    const specimens = book.styleBookExamples({ block: target.id });
    assert.equal(specimens.length, 1, target.id);
    assert.equal(specimens[0].id, target.example);
  }
  const overview = book.styleBookExamples({ block: null });
  assert.equal(overview.length, 11); // Button and Buttons share their canonical group specimen.
  assert.ok(!overview.some(item => ['colours', 'typography', 'links'].includes(item.id)));
});

test('Block styles inherit per property and reset/undo remain scoped', () => {
  let history = state.createStylesPreview();
  const change = action => { history = state.stylesPreviewReducer(history, action); };
  const read = scope => state.resolvePreviewStyle(history.present, scope).blockStyles;
  change({ type: 'block-style', scope: 'global', block: 'paragraph', patch: { textColor: '#123456', fontSizeCustom: '30px' } });
  change({ type: 'block-style', scope: 'test', block: 'paragraph', patch: { textColor: '#654321' } });
  change({ type: 'block-style', scope: 'global', block: 'paragraph', patch: { fontSizeCustom: '36px' } });
  assert.deepEqual(read('test').paragraph, { textColor: '#654321', fontSizeCustom: '36px' });
  assert.equal(read('test2').paragraph.textColor, '#123456');
  change({ type: 'reset-block-style', scope: 'test', block: 'paragraph' });
  assert.equal(read('test').paragraph.textColor, '#123456');
  change({ type: 'undo' }); assert.equal(read('test').paragraph.textColor, '#654321');
  change({ type: 'redo' }); assert.equal(read('test').paragraph.textColor, '#123456');
  change({ type: 'reset', scope: 'global' }); assert.equal(read('test2'), undefined);
});

test('Inspector deltas do not pin unchanged inherited fields and clearing resumes inheritance', () => {
  const before = { textColor: '#123456', padding: '20px', fontSizeCustom: '30px' };
  const patch = model.previewBlockStyleDelta(before, { ...before, fontSizeCustom: '40px' });
  assert.deepEqual(patch, { fontSizeCustom: '40px' });
  const cleared = model.previewBlockStyleDelta(before, { padding: '20px', fontSizeCustom: '30px' });
  assert.deepEqual(cleared, { textColor: undefined });
  assert.deepEqual(model.patchPreviewBlockStyle({ textColor: '#654321' }, cleared), {});
});

test('Projection preserves fixtures, inline content styles, nested buttons, and quote variants', () => {
  const input = [{ id: 'p', type: 'paragraph', text: 'Hello', style: { textColor: '#112233' } }, { id: 'g', type: 'buttons', children: [{ id: 'b', type: 'button', label: 'Go', url: '#' }] }, { id: 'q', type: 'quote', text: 'Quote' }, { id: 'pq', type: 'quote', quoteStyle: 'plain', text: 'Pullquote' }];
  const original = JSON.stringify(input);
  const output = model.applyPreviewBlockStyles(input, { paragraph: { textColor: '#FFFFFF', padding: '10px' }, button: { borderRadius: '20px' }, quote: { textColor: '#333333' }, pullquote: { textColor: '#444444' } });
  assert.equal(JSON.stringify(input), original);
  assert.deepEqual(output[0].style, { textColor: '#112233', padding: '10px' });
  assert.equal(output[1].children[0].visualStyle.borderRadius, '20px');
  assert.equal(output[2].visualStyle.textColor, '#333333');
  assert.equal(output[3].visualStyle.textColor, '#444444');
});

test('Home and Style Book render the same block styles through canonical production blocks', () => {
  const selection = { ...state.resolvePreviewStyle(state.createStylesPreview().present, 'test'), blockStyles: { paragraph: { fontSizeCustom: '37px', textColor: '#123456' }, heading: { textTransform: 'uppercase' }, button: { borderRadius: '7px' }, search: { padding: '15px' } } };
  const props = { selection, context: { block: 'paragraph' }, onTypography() {}, onBrowse() {}, onBlock() {} };
  const html = renderToStaticMarkup(createElement(StyleBook, props));
  const home = renderToStaticMarkup(createElement(ComparisonHome, { selection }));
  assert.match(html, /font-size:37px;color:#123456/);
  assert.match(home, /font-size:37px;color:#123456/);
  assert.match(html, /Edit Paragraph block styles/);
  assert.doesNotMatch(html, /contenteditable/i);
  const buttons = renderToStaticMarkup(createElement(StyleBook, { ...props, context: { block: 'button' } }));
  assert.match(buttons, /border-radius:7px/);
  const search = renderToStaticMarkup(createElement(StyleBook, { ...props, context: { block: 'search' } }));
  assert.match(search, /padding:15px/);
});

test('Blocks pane uses existing inspector controls without document or content editing', () => {
  const props = { selected: null, onSelect() {}, selection: state.resolvePreviewStyle(state.createStylesPreview().present, 'test'), authored: {}, scope: 'test', dispatch() {}, onBack() {} };
  const list = renderToStaticMarkup(createElement(BlocksPreview, props));
  assert.match(list, /type="search"/);
  assert.equal((list.match(/data-block-target=/g) ?? []).length, 12);
  for (const target of model.previewBlockTargets) {
    const detail = renderToStaticMarkup(createElement(BlocksPreview, { ...props, selected: target.id }));
    assert.match(detail, /Back to Blocks/);
    assert.match(detail, /inspector-sections/);
    assert.doesNotMatch(detail, /contenteditable|Choose background image|HTML anchor|aria-label="Button width"/);
  }
});

test('Device edits merge per field across sites without pinning inherited sibling values', () => {
  let history = state.createStylesPreview();
  const change = action => { history = state.stylesPreviewReducer(history, action); };
  const read = scope => state.resolvePreviewStyle(history.present, scope).blockStyles.paragraph;
  change({ type: 'block-style', scope: 'global', block: 'paragraph', patch: { fontSizeCustom: '30px' } });
  change({ type: 'block-style', scope: 'global', block: 'paragraph', viewport: 'tablet', patch: { fontSizeCustom: '24px', textColor: '#123456' } });
  change({ type: 'block-style', scope: 'test', block: 'paragraph', viewport: 'tablet', patch: { textColor: '#654321' } });
  change({ type: 'block-style', scope: 'global', block: 'paragraph', viewport: 'tablet', patch: { fontSizeCustom: '26px' } });
  assert.deepEqual(read('test').responsive.tablet, { fontSizeCustom: '26px', textColor: '#654321' });
  assert.equal(read('test2').responsive.tablet.textColor, '#123456');
  change({ type: 'block-style', scope: 'test', block: 'paragraph', viewport: 'mobile', patch: { padding: '8px' } });
  change({ type: 'reset-block-style', scope: 'test', block: 'paragraph', viewport: 'tablet' });
  assert.equal(read('test').responsive.tablet.textColor, '#123456');
  assert.equal(read('test').responsive.mobile.padding, '8px');
  change({ type: 'undo' }); assert.equal(read('test').responsive.tablet.textColor, '#654321');
  change({ type: 'redo' }); assert.equal(read('test').responsive.tablet.textColor, '#123456');
  change({ type: 'reset-block-style', scope: 'global', block: 'paragraph', viewport: 'desktop' });
  assert.equal(read('test2').fontSizeCustom, undefined);
  assert.equal(read('test2').responsive.tablet.fontSizeCustom, '26px');
});

test('All block details expose States and render canonical device style variables', () => {
  const props = { onSelect() {}, onViewportChange() {}, selection: { paletteId: 'default', typographyId: 'default' }, authored: {}, scope: 'test', dispatch() {}, onBack() {} };
  for (const target of model.previewBlockTargets) {
    for (const viewport of ['desktop', 'tablet', 'mobile']) {
      const detail = renderToStaticMarkup(createElement(BlocksPreview, { ...props, selected: target.id, viewport }));
      assert.match(detail, /aria-label="States"/);
      assert.doesNotMatch(detail, /aria-label="Button width"/);
    }
  }
  const selection = { ...props.selection, blockStyles: { paragraph: { fontSizeCustom: '30px', responsive: { tablet: { fontSizeCustom: '24px' }, mobile: { fontSizeCustom: '18px' } } } } };
  const html = renderToStaticMarkup(createElement(StyleBook, { selection, context: { block: 'paragraph' }, onTypography() {}, onBrowse() {} }));
  assert.match(html, /--studio-rs-tablet-font-size:24px/);
  assert.match(html, /--studio-rs-mobile-font-size:18px/);
});

test('Site font-size choices replace the inherited alternative in both directions', () => {
  const merged = model.mergePreviewBlockStyles({ paragraph: { fontSizeCustom: '30px', responsive: { mobile: { fontSize: 'large', backgroundGradient: { type: 'linear', angle: 90, stops: [{ colour: '#000000', position: 0 }, { colour: '#FFFFFF', position: 100 }] } }, tablet: { fontSizeCustom: '28px' } } } }, { paragraph: { fontSize: 'small', responsive: { mobile: { fontSizeCustom: '33px', backgroundColor: '#FFFFFF' }, tablet: { fontSize: 'large' } } } });
  assert.equal(merged.paragraph.fontSizeCustom, undefined);
  assert.equal(merged.paragraph.responsive.mobile.fontSize, undefined);
  assert.equal(merged.paragraph.responsive.mobile.fontSizeCustom, '33px');
  assert.equal(merged.paragraph.responsive.mobile.backgroundGradient, undefined);
  assert.equal(merged.paragraph.responsive.tablet.fontSizeCustom, undefined);
  assert.equal(merged.paragraph.responsive.tablet.fontSize, 'large');
});
