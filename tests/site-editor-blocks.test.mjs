import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';

const { blockCatalogue, templateContentBlock, templateNavigationBlock, templatePageLinkBlock } = await loadProductionModule(new URL('../app/studio/editor-model.ts', import.meta.url));
const model = await loadProductionModule(new URL('../app/studio/site-editor/blocks-preview-model.ts', import.meta.url));
const state = await loadProductionModule(new URL('../app/studio/site-editor/styles-preview-state.ts', import.meta.url));
const book = await loadProductionModule(new URL('../app/studio/site-editor/style-book-model.ts', import.meta.url));
const { StyleBook } = await loadProductionModule(new URL('../app/studio/site-editor/style-book.tsx', import.meta.url));
const { ComparisonHome } = await loadProductionModule(new URL('../app/studio/site-editor/comparison-home.tsx', import.meta.url));
const { BlocksPreview } = await loadProductionModule(new URL('../app/studio/site-editor/blocks-preview.tsx', import.meta.url));
const { BlockStyleSpecimen } = await loadProductionModule(new URL('../app/studio/site-editor/block-style-specimen.tsx', import.meta.url));
const { BlockPreviewRules } = await loadProductionModule(new URL('../app/studio/site-editor/block-preview-rules.tsx', import.meta.url));
const { websiteDesignRules } = await loadProductionModule(new URL('../app/studio/site-editor/website-design-surface.tsx', import.meta.url));

test('Blocks contains supported content families and selects the corresponding production specimens', () => {
  const ids = new Set(model.previewBlockTargets.map(item => item.id));
  for (const block of blockCatalogue) assert.ok(ids.has(block.type), `Missing Styles target: ${block.type}`);
  const additional = model.previewBlockTargets.filter(item => !blockCatalogue.some(block => block.type === item.id)).map(item => item.id).sort();
  assert.deepEqual(additional, ['column', 'footnotes', 'pullquote', 'search']); // Nested owners and labelled reference-only specimens.
  assert.deepEqual([templateContentBlock, templateNavigationBlock, templatePageLinkBlock].map(item => item.type), ['template-content', 'navigation', 'page-link']); // Template-owned, outside portable content defaults.
  assert.deepEqual(model.previewBlockTargets.filter(item => item.referenceOnly).map(item => item.id), ['pullquote', 'search']);
  for (const target of model.previewBlockTargets) {
    const specimens = book.styleBookExamples({ block: target.id });
    assert.equal(specimens.length, 1, target.id);
    assert.equal(specimens[0].id, target.example);
  }
  const overview = book.styleBookExamples({ block: null });
  assert.equal(overview.length, new Set(model.previewBlockTargets.map(item => item.example)).size); // Button and Buttons share their canonical group specimen.
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
  assert.deepEqual(output[0].style, { textColor: '#112233', padding: '10px', className: 'site-block-authored-color site-block-style-paragraph' });
  assert.equal(output[1].children[0].visualStyle.borderRadius, '20px');
  assert.equal(output[2].visualStyle.textColor, '#333333');
  assert.equal(output[3].visualStyle.textColor, '#333333', 'plain Quotes inherit Quote, not the reference Pullquote');
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
  assert.equal((list.match(/data-block-target=/g) ?? []).length, model.previewBlockTargets.length);
  for (const target of model.previewBlockTargets) {
    const detail = renderToStaticMarkup(createElement(BlocksPreview, { ...props, selected: target.id }));
    assert.match(detail, /Back to Blocks/);
    assert.match(detail, /inspector-sections/);
    assert.doesNotMatch(detail, /contenteditable|HTML anchor/);
  }
});

test('Style variation controls do not leave duplicate vertical insets before Typography', () => {
  const css = readFileSync(new URL('../app/studio/site-editor/blocks-preview.css', import.meta.url), 'utf8');
  assert.match(css, /\.site-block-variations\s*\{[^}]*padding-block:\s*24px\s+0/);
  assert.match(css, /\.site-blocks-preview:has\(> \.site-block-variations\) > \.site-block-style-sections > \.inspector-tools-section:first-child\s*\{\s*padding-block-start:\s*0/);
});

test('block style labels are black and share one line height for aligned fields', () => {
  const css = readFileSync(new URL('../app/studio/site-editor/blocks-preview.css', import.meta.url), 'utf8');
  assert.match(css, /\.site-block-style-sections \.inspector-tools-content \.site-block-length-label,[\s\S]*?\.site-block-field-label \{ gap: 8px; \}/);
  assert.match(css, /\.site-block-style-sections \.site-block-length-label > span:first-child,[\s\S]*?\.site-block-style-sections \.studio-line-height-setting > span,[\s\S]*?\{ color: var\(--ink\); line-height: 1\.5; text-transform: uppercase; font-weight: 600; \}/);
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
      assert.equal(/aria-label="Width Top amount"/.test(detail), target.id === "button");
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

const { blockStyleProfiles } = await loadProductionModule(new URL('../app/studio/site-editor/block-style-profiles.ts', import.meta.url));

test('Captured Styles profiles differ by block and do not expose editor-only controls', () => {
  assert.deepEqual(blockStyleProfiles.image.typography, []);
  assert.equal(blockStyleProfiles.image.filters, true);
  assert.equal(blockStyleProfiles.image.settings, true);
  assert.deepEqual(blockStyleProfiles.table.border, ['border']);
  assert.deepEqual(blockStyleProfiles.list.dimensions, ['padding','margin','gap']);
  assert.deepEqual(blockStyleProfiles.divider.typography, []);
  assert.deepEqual(blockStyleProfiles.search.dimensions, ['margin']);
  assert.equal(blockStyleProfiles.buttons.typography.includes('colour'), false);
  assert.deepEqual(blockStyleProfiles.button.dimensions, ['padding','width']);
  assert.deepEqual(blockStyleProfiles.paragraph.variations.map(v=>v.label), ['Display','Subtitle','Annotation']);
  assert.equal(blockStyleProfiles.quote.backgroundImage, true);
  assert.equal(blockStyleProfiles.pullquote.backgroundImage, true);
  assert.equal(blockStyleProfiles.code.verticalMargin, true);
  const props={onSelect(){},selection:state.resolvePreviewStyle(state.createStylesPreview().present,'global'),authored:{},scope:'global',dispatch(){},onBack(){}};
  for(const target of model.previewBlockTargets){
    const html=renderToStaticMarkup(createElement(BlocksPreview,{...props,selected:target.id}));
    assert.match(html,/Additional CSS/);
    assert.equal(/aria-label="Duotone"/.test(html),['image','cover-image'].includes(target.id));
    assert.equal(/Enlarge on click/.test(html),target.id==='image');
    assert.equal(/Choose background image/.test(html),['quote','pullquote','group','row','stack','grid','section'].includes(target.id));
    assert.doesNotMatch(html,/HTML anchor|Drop cap|Fit text/);
    if(target.id==='table')assert.doesNotMatch(html,/>Radius</);
  }
});

test('Variation and device edits inherit independently without replacing base defaults', () => {
  let history=state.createStylesPreview();
  const change=action=>{history=state.stylesPreviewReducer(history,action);};
  change({type:'block-style',scope:'global',block:'paragraph',patch:{textColor:'#123456',websitePreset:'large'}});
  change({type:'block-style',scope:'global',block:'paragraph',variation:'display',viewport:'tablet',patch:{websiteWeight:600,textColor:'#abcdef'}});
  change({type:'block-style',scope:'test',block:'paragraph',variation:'display',viewport:'tablet',patch:{textColor:'#654321'}});
  const selected=state.resolvePreviewStyle(history.present,'test').blockStyles.paragraph;
  const base=model.effectivePreviewBlockStyle(selected,'tablet');
  const variant=model.effectivePreviewBlockStyle(model.resolvePreviewBlockVariant(selected,'display'),'tablet');
  assert.equal(base.websitePreset,'large');assert.equal(base.textColor,'#123456');
  assert.equal(variant.websiteWeight,600);assert.equal(variant.textColor,'#654321');
  assert.equal(variant.websitePreset,undefined);assert.match(variant.fontSizeCustom,/clamp/);
  change({type:'reset-block-style',scope:'test',block:'paragraph',variation:'display',viewport:'tablet'});
  assert.equal(model.effectivePreviewBlockStyle(model.resolvePreviewBlockVariant(state.resolvePreviewStyle(history.present,'test').blockStyles.paragraph,'display'),'tablet').textColor,'#abcdef');
  change({type:'undo'});assert.equal(model.effectivePreviewBlockStyle(model.resolvePreviewBlockVariant(state.resolvePreviewStyle(history.present,'test').blockStyles.paragraph,'display'),'tablet').textColor,'#654321');
});

test('Responsive font selector shows the active device override while the specimen inherits Desktop styling', () => {
  const base = { websiteFont: 'Manrope' };
  const inherited = model.previewBlockFontSelection(base, 'mobile');
  assert.equal(inherited, '');
  assert.equal(model.effectivePreviewBlockStyle(base, 'mobile').websiteFont, 'Manrope');
  const overridden = { ...base, previewResponsive: { mobile: { websiteFont: '"TT5 Fira Code", monospace' } } };
  assert.equal(model.previewBlockFontSelection(overridden, 'mobile'), '"TT5 Fira Code", monospace');
  assert.equal(model.previewBlockFontSelection(base, 'desktop'), 'Manrope');

  const selection = { ...state.resolvePreviewStyle(state.createStylesPreview().present, 'global'), blockStyles: { paragraph: base } };
  const html = renderToStaticMarkup(createElement(BlocksPreview, { selected: 'paragraph', viewport: 'mobile', selection, authored: {}, scope: 'global', onSelect() {}, dispatch() {}, onBack() {} }));
  assert.match(html, /id="[^"]+-value">Default<\/span>/);
  assert.match(html, /font-family:Manrope/);
});

test('Block Font Default clears the scoped override across viewports without selecting inherited theme or global fonts', () => {
  const manrope = '"TT5 Manrope", sans-serif';
  const fira = '"TT5 Fira Code", monospace';
  for (const viewport of ['desktop', 'tablet', 'mobile']) for (const [scope, selected] of [['global', 'code'], ['test', 'paragraph']]) {
    let history = state.createStylesPreview();
    const change = action => { history = state.stylesPreviewReducer(history, action); };
    if (scope === 'test') change({ type: 'block-style', scope: 'global', block: selected, viewport, patch: { websiteFont: fira } });
    const read = () => {
      const selection = state.resolvePreviewStyle(history.present, scope);
      const html = renderToStaticMarkup(createElement(BlocksPreview, { selected, viewport, selection, authored: history.present[scope], scope, onSelect() {}, dispatch() {}, onBack() {} }));
      return { label: html.match(/class="studio-font-preview-trigger"[^>]*><span[^>]*>([^<]*)<\/span>/)?.[1], value: model.effectivePreviewBlockStyle(model.referencePreviewBlockStyles(selection.blockStyles)[selected], viewport) };
    };
    change({ type: 'block-style', scope, block: selected, viewport, patch: { websiteFont: manrope } });
    assert.equal(read().label, 'Manrope');
    change({ type: 'block-style', scope, block: selected, viewport, patch: { websiteFont: undefined, fontFamily: undefined } });
    assert.equal(read().label, 'Default', `${scope} ${selected} ${viewport}`);
    assert.equal(read().value.websiteFont, fira);
    change({ type: 'undo' }); assert.equal(read().label, 'Manrope');
    change({ type: 'redo' }); assert.equal(read().label, 'Default');
  }
});

test('Preview rules override presets at device custom sizes and target painted surfaces', () => {
  const selection={...state.resolvePreviewStyle(state.createStylesPreview().present,'global'),blockStyles:{paragraph:{websitePreset:'large',responsive:{mobile:{fontSizeCustom:'31px'}}},button:{shadowPreset:'natural'},image:{duotone:{dark:'#000000',light:'#ffffff'},shadowPreset:'natural'},code:{backgroundColor:'#aabbcc'},heading:{backgroundColor:'#aabbcc'}}};
  const html=renderToStaticMarkup(createElement(BlockPreviewRules,{selection,scopeId:'test'}));
  assert.match(html,/@container studio-document \(max-width:480px\).*font-size:31px!important/);
  assert.match(html,/site-block-style-button:not\(\.site-block-authored-box-shadow\) \.content-button[^{}]*\{box-shadow:/);
  assert.match(html,/site-block-style-image:not\(\.site-block-authored-box-shadow\) img\{box-shadow:/);
  assert.match(html,/site-block-style-code:not\(\.site-block-authored-background-color\) \.studio-code-preview\{background-color:#aabbcc/);
  assert.match(html,/site-block-style-heading:not\(\.site-block-authored-background-color\) \.heading-field\{background-color:#aabbcc/);
  assert.match(html,/TT5 Fira Code/);
  assert.match(html,/feComponentTransfer/);
  assert.match(html,/data-block-preview-scope="test"/);
});

test('List Block spacing is exposed by the native Styles pane and reaches both list renderers', () => {
  assert.ok(blockStyleProfiles.list.dimensions.includes('gap'));
  assert.ok(blockStyleProfiles.list.typography.includes('align'));
  const selection = { ...state.resolvePreviewStyle(state.createStylesPreview().present, 'test'), blockStyles: { list: { blockGap: '8px', textAlign: 'left', websitePreset: 'large' } } };
  const html = renderToStaticMarkup(createElement(BlockPreviewRules, { selection, scopeId: 'list-gap' }));
  assert.match(html, /site-block-style-list[^}]*\.list-field-editor,\.list-field-preview[^}]*\{row-gap:8px!important\}/);
  assert.match(html, /site-block-style-list:not\(\.site-block-authored-text-align\)\{text-align:left!important\}/);
  assert.match(html, /site-block-style-list[^}]*:is\(\.heading-field,\.block-textarea,\.list-item-text,\.list-item-editor/);
  assert.match(html, /\.list-item-editor[^}]*\{font-size:inherit!important\}/);
});

test('flow Groups inherit the website block-spacing default unless they set their own gap', () => {
  const stylesheet = readFileSync(new URL('../app/studio/studio.css', import.meta.url), 'utf8');
  const flowGroupSpacing = stylesheet.match(/\.content-group\.has-layout-options\.layout-flow\s*>\s*\*\s*\+\s*\*\s*\{\s*margin-block-start:\s*([^;}]+)/)?.[1];
  assert.equal(flowGroupSpacing, 'var(--block-layout-row-gap, var(--block-layout-gap, var(--studio-block-gap, 0px)))');
  const inherited = websiteDesignRules({ ...state.resolvePreviewStyle(state.createStylesPreview().present, 'test'), layout: undefined }, 'block-spacing');
  assert.ok(inherited.includes('.test-site-page{--studio-block-gap:1.2rem}'));
  assert.ok(inherited.includes('.test-site-page{--studio-block-margin:1.2rem}'));
  const overridden = websiteDesignRules({ ...state.resolvePreviewStyle(state.createStylesPreview().present, 'test'), layout: { blockSpacing: '2rem' } }, 'block-spacing');
  assert.ok(overridden.includes('.test-site-page{--studio-block-gap:2rem}'));
  assert.ok(overridden.includes('.test-site-page{--studio-block-margin:2rem}'));
});

test('Code preview paints padding on its full-width surface once, including device overrides', () => {
  const selection = { ...state.resolvePreviewStyle(state.createStylesPreview().present, 'test'), blockStyles: { code: { padding: '12px 24px', responsive: { mobile: { padding: '8px' } } } } };
  const css = renderToStaticMarkup(createElement(BlockPreviewRules, { selection, scopeId: 'code-padding' }));
  assert.match(css, /site-block-style-code:not\(\.site-block-authored-padding\) \.studio-code-preview\{padding:12px 24px!important\}/);
  assert.match(css, /site-block-style-code:not\(\.site-block-authored-padding\)\{padding:0!important\}/);
  assert.match(css, /site-block-style-code:not\(\.site-block-authored-padding\):not\(\.site-block-authored---studio-rs-mobile-padding\) \.studio-code-preview\{padding:8px!important\}/);
  for (const Component of [StyleBook, ComparisonHome]) {
    const html = renderToStaticMarkup(createElement(Component, { selection, context: { block: 'code' }, onTypography() {}, onBrowse() {} }));
    assert.match(html, /studio-code-preview\{padding:12px 24px!important\}/);
    assert.match(html, /studio-code-preview\{padding:8px!important\}/);
  }
});

test('Table cell padding is a native website Styles value with a responsive override', () => {
  const selection = { ...state.resolvePreviewStyle(state.createStylesPreview().present, 'test'), blockStyles: { table: { cellPadding: '11px', previewResponsive: { mobile: { cellPadding: '7px' } } } } };
  const html = renderToStaticMarkup(createElement(BlockPreviewRules, { selection, scopeId: 'table-cell-padding' }));
  assert.match(html, /site-block-style-table[^}]*\{--studio-table-cell-padding:11px!important\}/);
  assert.match(html, /@container studio-document \(max-width:480px\).*site-block-style-table[^}]*\{--studio-table-cell-padding:7px!important\}/);
});

test('Explicit Heading margins suppress only the unedited book rhythm, including zero and device overrides', () => {
  const selection = { ...state.resolvePreviewStyle(state.createStylesPreview().present, 'test'), blockStyles: { heading: { margin: '0px', padding: '4px', responsive: { mobile: { margin: '10px' } } } } };
  const html = renderToStaticMarkup(createElement(StyleBook, { selection, context: 'typography', onTypography() {}, onBrowse() {} }));
  assert.match(html, /\.site-style-book \[data-block-preview-scope="[^"]+"\] \.site-block-style-heading:not\(\.site-block-authored-margin-block\) \.heading-field\{margin-block:0!important\}/);
  assert.match(html, /@container studio-document \(max-width:480px\).*\.heading-field\{margin-block:0!important\}/s);
  assert.match(html, /padding:4px;margin:0px/);
  assert.match(html, /--studio-rs-mobile-margin:10px/);
  const defaultRules = renderToStaticMarkup(createElement(BlockPreviewRules, { selection: state.resolvePreviewStyle(state.createStylesPreview().present, 'test'), scopeId: 'no-margin' }));
  assert.doesNotMatch(defaultRules, /heading-field\{margin-block:/);
});

test('Background Blob replacement is undoable even with identical metadata', () => {
  let history=state.createStylesPreview();
  const image={id:'same',name:'same',blob:new Blob(['first'],{type:'image/png'})};
  history=state.stylesPreviewReducer(history,{type:'block-style',scope:'test',block:'quote',patch:{backgroundImage:image}});
  const replacement={...image,blob:new Blob(['second'],{type:'image/png'})};
  history=state.stylesPreviewReducer(history,{type:'block-style',scope:'test',block:'quote',patch:{backgroundImage:replacement}});
  assert.equal(history.past.length,2);
  assert.equal(history.present.test.blockStyles.quote.backgroundImage,replacement);
  history=state.stylesPreviewReducer(history,{type:'undo'});
  assert.equal(history.present.test.blockStyles.quote.backgroundImage,image);
});

test('Explicit authored device styles remain protected from global theme adapters', () => {
  const [projected]=model.applyPreviewBlockStyles([{id:'authored',type:'paragraph',text:'Author choice',style:{responsive:{mobile:{fontSizeCustom:'23px'}}}}],{paragraph:{websitePreset:'large'}});
  assert.match(projected.style.className,/site-block-authored---studio-rs-mobile-font-size/);
  const selection={...state.resolvePreviewStyle(state.createStylesPreview().present,'global'),blockStyles:{paragraph:{websitePreset:'large'}}};
  const rules=renderToStaticMarkup(createElement(BlockPreviewRules,{selection,scopeId:'authored'}));
  assert.match(rules,/@container studio-document \(min-width:782.01px\)/);
  assert.match(rules,/site-block-style-paragraph:not\(\.site-block-authored-font-size\):not\(\.site-block-authored---studio-rs-mobile-font-size\)/);
  const paint=renderToStaticMarkup(createElement(BlockPreviewRules,{selection:{...selection,blockStyles:{table:{borderColor:'var(--site-palette-theme-2)',backgroundColor:'var(--site-palette-theme-2)'},divider:{backgroundColor:'var(--site-palette-theme-2)'}}},scopeId:'paint'}));
  assert.doesNotMatch(paint,/site-block-style-(table|divider)[^{]*\{(?:border-color|background-color):/);
});

test('Paragraph Styles composes the canonical background rows, icon choices and input-first indent', () => {
  const props = { selected: 'paragraph', onSelect() {}, selection: state.resolvePreviewStyle(state.createStylesPreview().present, 'test'), authored: {}, scope: 'test', dispatch() {}, onBack() {} };
  const html = renderToStaticMarkup(createElement(BlocksPreview, props));
  assert.match(html, /paragraph-background-option-row paragraph-gradient-option-row/);
  assert.equal((html.match(/paragraph-background-mode-swatch/g) ?? []).length, 2, 'both Background rows display value swatches');
  assert.match(html, /paragraph-length-controls--input-first[^]*Line indent value[^]*Line indent amount/);
  assert.match(html, /aria-label="Horizontal"[^]*aria-label="Vertical"/);
  assert.doesNotMatch(html, />Horizontal<|>Vertical<|Choose background colour|Block style options/);
  assert.match(html, /aria-label="Increase Columns"/);
  assert.match(html, /aria-expanded="false"[^]*>Advanced</);
});


test('Reference block defaults are effective without becoming authored and Reset/Undo stay scoped for all supported panes', () => {
  let history = state.createStylesPreview();
  for (const {id} of model.previewBlockTargets) {
    history = state.stylesPreviewReducer(history,{type:'block-style',scope:'test',block:id,patch:{padding:'11px'}});
    const effective = () => model.referencePreviewBlockStyles(state.resolvePreviewStyle(history.present,'test').blockStyles)[id];
    assert.equal(effective().padding,'11px',id);
    history = state.stylesPreviewReducer(history,{type:'reset-block-style',scope:'test',block:id});
    assert.equal(effective()?.padding,model.referenceBlockDefaults[id]?.padding,id);
    history = state.stylesPreviewReducer(history,{type:'undo'});
    assert.equal(effective().padding,'11px',id);
    history = state.stylesPreviewReducer(history,{type:'redo'});
    assert.equal(effective()?.padding,model.referenceBlockDefaults[id]?.padding,id);
  }
  const values = model.referencePreviewBlockStyles();
  assert.equal(values.quote.websitePreset,'large');
  assert.equal(values.code.websitePreset,'medium');
  assert.equal(values.pullquote.lineHeight,'1.2');
  assert.equal(values.search.lineHeight,'1.6');
  assert.equal(values.buttons.rowGap,'16px');
  const overrides = model.referencePreviewBlockStyles({code:{fontSizeCustom:'31px',responsive:{mobile:{fontSizeCustom:'22px'}}}});
  assert.equal(overrides.code.websitePreset,undefined);
  assert.equal(model.effectivePreviewBlockStyle(overrides.code,'mobile').fontSizeCustom,'22px');
  const plain = model.resolvePreviewBlockVariant(values.quote,'plain');
  assert.equal(plain.padding,'0px'); assert.equal(plain.borderStyle,'none');
});

test('The panes render captured control variants and inherit the current font-size catalogue', () => {
  const selection = state.resolvePreviewStyle(state.createStylesPreview().present,'global');
  const props={onSelect(){},selection,authored:{},scope:'global',dispatch(){},onBack(){}};
  const pane = selected => renderToStaticMarkup(createElement(BlocksPreview,{...props,selected}));
  const button=pane('button');
  assert.match(button,/aria-label="Width Top amount"/); assert.doesNotMatch(button,/Unlink padding sides/);
  const buttons=pane('buttons');
  assert.match(buttons,/Vertical block spacing Vertical value[^>]*value="16"/);
  assert.match(buttons,/Horizontal block spacing Horizontal amount/);
  assert.doesNotMatch(buttons,/Margin Horizontal amount/);
  assert.match(pane('pullquote'),/Minimum height value[^]*Minimum height amount/);
  const image=pane('image');
  assert.match(image,/studio-colour-value-swatch[^]*Duotone/);
  assert.match(image,/site-block-control-label">Shadow/);
  assert.match(pane('quote'),/No background image selected/);
  assert.match(pane('code'),/aria-label="Medium" aria-pressed="true"/);
  assert.match(pane('pullquote'),/aria-label="Extra Extra Large" aria-pressed="true"/);
  const customSelection={...selection,typography:{presets:{reading:{id:'reading',name:'Reading',size:'19px',min:'19px',max:'19px',fluid:false}}},blockStyles:{list:{websitePreset:'reading'}}};
  const custom=renderToStaticMarkup(createElement(BlocksPreview,{...props,selection:customSelection,selected:'list'}));
  assert.match(custom,/aria-label="Reading" aria-pressed="true"/);
});

test('Image enlarge defaults preserve explicitly authored media and custom links', () => {
  for(const linkDestination of ['custom','media']) {
    const image={id:'image',type:'image',src:'/sample.png',alt:'Sample',linkDestination,linkUrl:'https://example.com'};
    const [result]=model.applyPreviewBlockStyles([image],{image:{enlargeOnClick:true}});
    assert.equal(result.linkDestination,linkDestination);
    assert.equal(result.linkUrl,image.linkUrl);
  }
  const [image]=model.applyPreviewBlockStyles([{id:'image',type:'image',src:'/sample.png',alt:'Sample'}],{image:{enlargeOnClick:true}});
  assert.equal(image.linkDestination,'lightbox');
});

const {FontSizeAppearanceSetting}=await loadProductionModule(new URL('../app/studio/controls/font-size-appearance-setting.tsx',import.meta.url));
const childNodes=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(childNodes):[node,...childNodes(node.props?.children)];
test('Shared font sizes accept owner-supplied choices while editor defaults stay intact',()=>{
 const changes=[];
 const tree=FontSizeAppearanceSetting({size:'custom-id',presetChoices:[{value:'custom-id',label:'Reading',accessibleName:'Reading size'}],mode:'presets',onSizeChange:value=>changes.push(value),onModeChange(){},onCustomSizeChange(){},onAppearanceChange(){}});
 const choice=childNodes(tree).find(node=>node.props?.['aria-label']==='Reading size');
 assert.equal(choice.props['aria-pressed'],true);choice.props.onClick();assert.deepEqual(changes,[undefined]);
 const editor=renderToStaticMarkup(createElement(FontSizeAppearanceSetting,{mode:'presets',onSizeChange(){},onModeChange(){},onCustomSizeChange(){},onAppearanceChange(){}}));
 assert.match(editor,/aria-label="Extra large"/);assert.doesNotMatch(editor,/Reading/);
});


test('Quote heading colours inherit per level without pinning siblings across scopes and devices',()=>{
 let history=state.createStylesPreview();
 const change=action=>history=state.stylesPreviewReducer(history,action);
 const patch=(scope,headingColors,viewport='desktop')=>change({type:'block-style',scope,block:'quote',viewport,patch:{headingColors}});
 const read=()=>state.resolvePreviewStyle(history.present,'test').blockStyles.quote;
 patch('global',{1:'#ff0000'});patch('test',{2:'#0000ff'});
 assert.deepEqual(history.present.test.blockStyles.quote.headingColors,{2:'#0000ff'});
 assert.deepEqual(read().headingColors,{1:'#ff0000',2:'#0000ff'});
 patch('global',{1:'#00ff00'});
 assert.equal(read().headingColors[1],'#00ff00');
 patch('test',{3:'#444444'},'mobile');
 assert.deepEqual(model.effectivePreviewBlockStyle(read(),'mobile').headingColors,{1:'#00ff00',2:'#0000ff',3:'#444444'});
 patch('test',{2:undefined});
 assert.deepEqual(read().headingColors,{1:'#00ff00'});
 change({type:'undo'});assert.equal(read().headingColors[2],'#0000ff');
 change({type:'redo'});assert.equal(read().headingColors[2],undefined);
});

test('Button theme sizing leaves Buttons and element typography variables effective until authored',()=>{
 const selection={...state.resolvePreviewStyle(state.createStylesPreview().present,'global'),blockStyles:{buttons:{fontSizeCustom:'40px'}}};
 const rules=renderToStaticMarkup(createElement(BlockPreviewRules,{selection,scopeId:'group'}));
 assert.match(rules,/--button-group-font-size:40px/);
 assert.doesNotMatch(rules,/site-block-style-button:not\([^}]+\{font-size:/);
 const custom=renderToStaticMarkup(createElement(BlockPreviewRules,{selection:{...selection,blockStyles:{...selection.blockStyles,button:{fontSizeCustom:'22px'}}},scopeId:'group'}));
 assert.match(custom,/site-block-style-button:not\([^}]+\{font-size:22px/);
});

test('Button pseudo states are independently inherited, responsive, resettable, and undoable',()=>{
 let history=state.createStylesPreview();
 const change=action=>history=state.stylesPreviewReducer(history,action);
 const read=scope=>state.resolvePreviewStyle(history.present,scope).blockStyles?.button;
 change({type:'block-style',scope:'global',block:'button',pseudoState:'hover',patch:{backgroundColor:'#123456'}});
 change({type:'block-style',scope:'global',block:'button',pseudoState:'focus-visible',viewport:'mobile',patch:{borderColor:'#abcdef'}});
 change({type:'block-style',scope:'test',block:'button',pseudoState:'hover',patch:{textColor:'#ffffff'}});
 assert.deepEqual(read('test').interactionStates.hover,{backgroundColor:'#123456',textColor:'#ffffff'});
 assert.deepEqual(read('test').interactionStates['focus-visible'].responsive.mobile,{borderColor:'#abcdef'});
 change({type:'reset-block-style',scope:'test',block:'button',pseudoState:'hover'});
 assert.deepEqual(read('test').interactionStates.hover,{backgroundColor:'#123456'});
 change({type:'undo'});assert.equal(read('test').interactionStates.hover.textColor,'#ffffff');
 change({type:'redo'});assert.equal(read('test').interactionStates.hover.textColor,undefined);
 change({type:'reset-block-style',scope:'global',block:'button',pseudoState:'hover'});
 assert.equal(read('global').interactionStates.hover,undefined);
});

test('Button default edits and resets preserve separately authored pseudo-state overrides',()=>{
 let history=state.createStylesPreview();
 const change=action=>history=state.stylesPreviewReducer(history,action);
 const read=()=>state.resolvePreviewStyle(history.present,'global').blockStyles.button;
 change({type:'block-style',scope:'global',block:'button',pseudoState:'hover',patch:{backgroundColor:'#123456'}});
 change({type:'block-style',scope:'global',block:'button',pseudoState:'focus',viewport:'mobile',patch:{textColor:'#abcdef'}});
 change({type:'block-style',scope:'global',block:'button',patch:{borderColor:'#ff0000'}});
 assert.equal(read().borderColor,'#ff0000');
 assert.deepEqual(read().interactionStates.hover,{backgroundColor:'#123456'});
 assert.deepEqual(read().interactionStates.focus.responsive.mobile,{textColor:'#abcdef'});
 change({type:'undo'});
 assert.equal(read().borderColor,undefined);
 assert.deepEqual(read().interactionStates.hover,{backgroundColor:'#123456'});
 change({type:'redo'});
 assert.equal(read().borderColor,'#ff0000');
 change({type:'reset-block-style',scope:'global',block:'button'});
 assert.equal(read().borderColor,undefined);
 assert.deepEqual(read().interactionStates.hover,{backgroundColor:'#123456'});
 assert.deepEqual(read().interactionStates.focus.responsive.mobile,{textColor:'#abcdef'});
 change({type:'undo'});
 assert.equal(read().borderColor,'#ff0000');
 assert.deepEqual(read().interactionStates.hover,{backgroundColor:'#123456'});
 change({type:'redo'});
 assert.equal(read().borderColor,undefined);
 assert.deepEqual(read().interactionStates.hover,{backgroundColor:'#123456'});
});

test('Button pseudo-state inheritance merges fields per viewport across site scopes',()=>{
 let history=state.createStylesPreview();
 const change=action=>history=state.stylesPreviewReducer(history,action);
 change({type:'block-style',scope:'global',block:'button',pseudoState:'hover',viewport:'tablet',patch:{borderColor:'#123456',backgroundColor:'#111111'}});
 change({type:'block-style',scope:'global',block:'button',pseudoState:'hover',viewport:'mobile',patch:{textColor:'#ffffff'}});
 change({type:'block-style',scope:'test',block:'button',pseudoState:'hover',viewport:'tablet',patch:{borderColor:'#abcdef'}});
 change({type:'block-style',scope:'test',block:'button',pseudoState:'hover',viewport:'mobile',patch:{backgroundColor:'#222222'}});
 const hover=state.resolvePreviewStyle(history.present,'test').blockStyles.button.interactionStates.hover;
 assert.deepEqual(model.effectivePreviewBlockStyle(hover,'tablet').borderColor,'#abcdef');
 assert.equal(model.effectivePreviewBlockStyle(hover,'tablet').backgroundColor,'#111111');
 assert.equal(model.effectivePreviewBlockStyle(hover,'mobile').textColor,'#ffffff');
 assert.equal(model.effectivePreviewBlockStyle(hover,'mobile').backgroundColor,'#222222');
});

test('Button Style Book preview renders selected pseudo-state styles through the scoped preview rules',()=>{
 const selection={...state.resolvePreviewStyle(state.createStylesPreview().present,'global'),blockStyles:{button:{interactionStates:{hover:{backgroundColor:'#123456'},'focus-visible':{textColor:'#abcdef'}}}}};
 const [button]=model.applyPreviewBlockStyles([{id:'preview-button',type:'button',label:'Preview',url:'#',style:'primary'}],selection.blockStyles,'focus-visible');
 assert.match(button.visualStyle.className,/is-button-state-preview-focus-visible/);
 const html=renderToStaticMarkup(createElement(BlockPreviewRules,{selection,scopeId:'button-state'}));
 assert.match(html,/site-block-style-button[^{}]*\.content-button[^{}]*:focus-visible\{color:#abcdef!important\}/);
 assert.match(html,/is-button-state-preview-focus-visible \.content-button[^{}]*\{color:#abcdef!important\}/);
 assert.match(html,/background-color:#123456!important/);
 assert.match(html,/color:#abcdef!important/);
 const specimen=renderToStaticMarkup(createElement(BlockStyleSpecimen,{id:'button',selection,viewport:'desktop',buttonPreviewState:'focus-visible'}));
 assert.match(specimen,/is-button-state-preview-focus-visible/);
 assert.match(specimen,/color:#abcdef!important/);
});


const {BorderSettings}=await loadProductionModule(new URL('../app/studio/controls/border-settings.tsx',import.meta.url));
test('Styles border starts on its inherited first side while editor mixed-width presentation stays unchanged',()=>{
 const props={style:{borderWidth:'0px 0px 0px 2px'},includeRadius:false,includeShadow:false,onChange(){}};
 const linked=renderToStaticMarkup(createElement(BorderSettings,{...props,initiallyLinked:true}));
 assert.match(linked,/aria-label="Border All width"[^>]*value="0"/);
 assert.doesNotMatch(linked,/placeholder="Mixed"/);
 const editor=renderToStaticMarkup(createElement(BorderSettings,props));
 assert.match(editor,/aria-label="Border Left width"[^>]*value="2"/);
});


test('Group family inheritance is shared without authoring inherited fields', () => {
  const styles = { group: { textColor: '#123456', responsive: { mobile: { textColor: '#654321', padding: '12px' } }, previewResponsive: { mobile: { websiteWeight: 700 } }, variations: { plain: { padding: '8px' } } }, row: { responsive: { mobile: { padding: '20px' } } } };
  const original = JSON.stringify(styles);
  const effective = model.referencePreviewBlockStyles(styles);
  assert.equal(effective.row.textColor, '#123456');
  assert.deepEqual(effective.row.responsive.mobile, { textColor: '#654321', padding: '20px' });
  assert.equal(effective.row.previewResponsive.mobile.websiteWeight, 700);
  assert.equal(effective.row.variations.plain.padding, '8px');
  assert.equal(model.previewBlockInspectorStyle(effective.row, 'mobile', 'default').textColor, '#654321');
  assert.equal(JSON.stringify(styles), original);
  assert.deepEqual(model.editablePreviewBlockStyle(styles.row, 'desktop'), {});
});

test('compact Group-family specimen honours selected Desktop independently of pane width', () => {
  const selection = { ...state.resolvePreviewStyle(state.createStylesPreview().present, 'global'), blockStyles: { group: { textColor: '#123456', responsive: { mobile: { textColor: '#654321' } } } } };
  const desktop = renderToStaticMarkup(createElement(BlockStyleSpecimen, { id: 'row', selection, viewport: 'desktop' }));
  const mobile = renderToStaticMarkup(createElement(BlockStyleSpecimen, { id: 'row', selection, viewport: 'mobile' }));
  assert.match(desktop, /#123456/);
  assert.doesNotMatch(desktop, /#654321/);
  assert.match(mobile, /#654321/);
});
