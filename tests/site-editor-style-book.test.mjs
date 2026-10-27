import { createHostModuleEvaluator } from "./production-module.mjs";
import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';

const { styleBookExamples, styleBookExampleText, styleBookPresentation } = await loadProductionModule(new URL('../app/studio/site-editor/style-book-model.ts', import.meta.url));
const { StyleBook } = await loadProductionModule(new URL('../app/studio/site-editor/style-book.tsx', import.meta.url));
const { createStylesPreview, stylesPreviewReducer, resolvePreviewStyle } = await loadProductionModule(new URL('../app/studio/site-editor/styles-preview-state.ts', import.meta.url));

test('Style Book filters overview, typography and individual roles without changing its fixtures', () => {
  assert.deepEqual(styleBookExamples('overview').map(item => item.id), ['colours', 'typography', 'image', 'separator', 'buttons', 'pullquote', 'search']);
  assert.ok(styleBookExamples('typography').some(item => item.id === 'table'));
  assert.deepEqual(styleBookExamples('buttons').map(item => item.id), ['buttons']);
  assert.deepEqual(styleBookExamples('captions').map(item => item.id), ['image']);
  assert.deepEqual(styleBookExamples('h3')[0].blocks.map(block => block.level), [3]);
  assert.equal(styleBookExamples('headings')[0].blocks.length, 6);
});

test('Overview retains its paragraph pair while Typography opens with heading specimens', () => {
  const typography = styleBookExamples('overview').find(example => example.id === 'typography');
  assert.equal(typography.blocks.length, 2);
  assert.ok(typography.blocks.every(block => block.type === 'paragraph'));
  const selection = resolvePreviewStyle(createStylesPreview().present, 'test');
  const rendered = renderToStaticMarkup(createElement(StyleBook, { selection, context: 'overview', onTypography() {}, onBrowse() {} }));
  const columns = rendered.match(/<div class="site-style-book-columns">(.*?)<p class="visually-hidden"/s)?.[1];
  assert.ok(columns);
  assert.equal((columns.match(/class="block-textarea paragraph-field/g) ?? []).length, 2);
  for (const block of typography.blocks) {
    assert.ok(columns.includes(block.text));
    assert.ok(styleBookExampleText(typography).includes(block.text));
  }
  assert.match(columns, /present and organise information/);
  assert.match(columns, /guides the reader through the content smoothly/);
  assert.deepEqual(styleBookExamples('typography').map(example => example.id), ['headings', 'paragraph', 'list', 'quote', 'code', 'details', 'math', 'preformatted', 'pullquote', 'table', 'poetry', 'custom-link', 'content', 'home-link']);
  const detail = renderToStaticMarkup(createElement(StyleBook, { selection, context: 'typography', onTypography() {}, onBrowse() {} }));
  assert.doesNotMatch(detail, /site-style-book-alphabet|site-style-book-columns/);
  assert.ok(detail.indexOf('style-book-label-headings') < detail.indexOf('style-book-label-paragraph'));
});

test('Style Book follows scope inheritance, authored properties, palette changes, reset and history', () => {
  let state = createStylesPreview();
  const read = scope => styleBookPresentation(resolvePreviewStyle(state.present, scope));
  state = stylesPreviewReducer(state, { type: 'element', scope: 'global', role: 'text', patch: { family: 'Example Serif', weight: 700, letterSpacing: '2px' } });
  assert.equal(read('test')['--book-text-font-family'], 'Example Serif');
  assert.equal(read('test')['--book-text-font-weight'], 700);
  state = stylesPreviewReducer(state, { type: 'change', scope: 'test', patch: { paletteId: 'evening' } });
  assert.equal(read('test')['--book-surface'], '#1B1B1B');
  assert.equal(read('test2')['--book-surface'], '#FFFFFF');
  state = stylesPreviewReducer(state, { type: 'element', scope: 'test', role: 'h2', patch: { colour: '#123456' } });
  assert.equal(read('test')['--book-h2-color'], '#123456');
  assert.notEqual(read('test2')['--book-h2-color'], '#123456');
  state = stylesPreviewReducer(state, { type: 'reset-element', scope: 'test', role: 'h2' });
  assert.notEqual(read('test')['--book-h2-color'], '#123456');
  state = stylesPreviewReducer(state, { type: 'undo' });
  assert.equal(read('test')['--book-h2-color'], '#123456');
  state = stylesPreviewReducer(state, { type: 'redo' });
  assert.notEqual(read('test')['--book-h2-color'], '#123456');
});

test('Style Book renders canonical Studio blocks behind named navigation targets', () => {
  const selection = resolvePreviewStyle(createStylesPreview().present, 'test');
  const render = context => renderToStaticMarkup(createElement(StyleBook, { selection, context, onTypography() {}, onBrowse() {} }));
  const typography = render('typography');
  assert.match(typography, /heading-field is-h1/);
  assert.match(typography, /paragraph-field/);
  assert.match(typography, /content-table/);
  assert.match(typography, /aria-label="Open Text Typography"/);
  assert.match(typography, /aria-describedby="style-book-description-paragraph"/);
  assert.match(typography, /inert=""/);
  assert.doesNotMatch(typography, /contenteditable/i);
  const overview = render('overview');
  assert.match(overview, /src="\/specimens\/mont-blanc.jpg"/);
  assert.match(overview, /Browse Colour Variations/);
  assert.match(overview, /Open Typography/);
  assert.match(overview, /Open Buttons Typography/);
  assert.match(overview, /Snow-covered Mont Blanc rising above the clouds/);
  assert.match(overview, /Mont Blanc appears — still, snowy, and serene\./);
});

test('Style Book uses the WordPress alphabet specimen and punctuation order', () => {
  const selection = resolvePreviewStyle(createStylesPreview().present, 'test');
  const overview = renderToStaticMarkup(createElement(StyleBook, { selection, context: 'overview', onTypography() {}, onBrowse() {} }));
  const alphabet = overview.match(/<p class="site-style-book-alphabet">(.*?)<\/p>/)?.[1];

  assert.equal(alphabet, 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789X{(…)},.-&lt;&gt;?!*&amp;:/A@HELFO™©');
});

test('Style Book link typography leaves social icon links their own foreground and dimensions', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../app/studio/site-editor/style-book.css', import.meta.url), 'utf8');
  assert.match(css, /\.site-style-book \.site-style-book-sample a:not\(\.content-button, \.social-icon-item\) \{/);
  assert.match(css, /\.site-style-book \.site-style-book-sample a:not\(\.content-button, \.social-icon-item\):hover \{/);
});


test('Overview matches the reference content while preserving standard Quote and inert Search', () => {
  const examples = styleBookExamples('overview');
  const buttons = examples.find(example => example.id === 'buttons').blocks[0];
  assert.equal(buttons.justification, 'centre');
  assert.equal(buttons.allowWrap, true);
  assert.deepEqual(buttons.children.map(button => [button.label, button.style]), [['Find out more', 'primary'], ['Contact us', 'primary']]);
  const pullquote = examples.find(example => example.id === 'pullquote');
  assert.equal(pullquote.blocks[0].quoteStyle, 'plain');
  assert.equal(pullquote.blocks[0].align, 'centre');
  assert.match(styleBookExampleText(pullquote), /One of the hardest things to do in technology is disrupt yourself\. Matt Mullenweg/);
  assert.equal(styleBookExamples('typography').find(example => example.id === 'quote').blocks[0].text, 'In quoting others, we cite ourselves.');
  assert.ok(!styleBookExamples('typography').some(example => example.id === 'search'));
  const selection = resolvePreviewStyle(createStylesPreview().present, 'test');
  const html = renderToStaticMarkup(createElement(StyleBook, { selection, context: 'overview', onTypography() {}, onBrowse() {} }));
  const search = html.match(/<section class="site-style-book-example is-search".*?<\/section>/s)?.[0];
  assert.ok(search);
  assert.equal(styleBookExampleText(examples.find(example => example.id === 'search')), 'Search field with placeholder Optional placeholder… and a Search button.');
  assert.match(search, /class="visually-hidden"[^>]*>Search field with placeholder Optional placeholder… and a Search button\./);
  assert.match(search, /class="site-style-book-sample" inert=""/);
  assert.match(search, /<label for="style-book-search-input">Search<\/label>/);
  assert.match(search, /type="search"/);
  assert.match(search, /placeholder="Optional placeholder…"/);
  assert.match(search, /readOnly=""/);
  assert.match(search, /class="content-button is-primary"[^>]*>Search<\/a>/);
  assert.doesNotMatch(search, /<form|action=|onSubmit|contenteditable/);
});

test('Specimens open their existing block settings and Colours opens the palette', async () => {
  const { readFile } = await import('node:fs/promises');

  const source = await readFile(new URL('../app/studio/site-editor/style-book.tsx', import.meta.url), 'utf8');
  const code = (source);
  const layoutModel = await loadProductionModule(new URL('../app/studio/site-editor/layout-preview-model.ts', import.meta.url));
  const blocksModel = await loadProductionModule(new URL('../app/studio/site-editor/blocks-preview-model.ts', import.meta.url));
  const styleModel = await loadProductionModule(new URL('../app/studio/site-editor/style-book-model.ts', import.meta.url));
  const stateModel = await loadProductionModule(new URL('../app/studio/site-editor/styles-preview-state.ts', import.meta.url));
  const jsx = (type, props) => ({ type, props });
  const require = name => name === 'react' ? {useId:()=> 'style-book-test'} : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'Fragment' } : name.endsWith('styles-preview-state') ? stateModel : name.endsWith('style-book-model') ? styleModel : name.endsWith('layout-preview-model') ? layoutModel : name.endsWith('blocks-preview-model') ? blocksModel : {};
  const { StyleBook: Book } = createHostModuleEvaluator(['require', 'exports'], `${code}\nreturn exports;`)(require, {});
  const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  const selection = resolvePreviewStyle(createStylesPreview().present, 'test');
  let destination = '';
  const tree = Book({ selection, context: 'colours', onTypography() {}, onBrowse() { destination = 'browse'; }, onColours() { destination = 'palette'; } });
  all(tree).find(node => node.type === 'button' && node.props['aria-label'] === 'Edit palette').props.onClick();
  assert.equal(destination, 'palette');
  const blocks = Book({ selection, context: 'typography', onTypography() { destination = 'typography'; }, onBrowse() {}, onBlock(id) { destination = id; } });
  for (const [label, id] of [['Heading', 'heading'], ['Paragraph', 'paragraph'], ['Quote', 'quote'], ['Table', 'table']]) {
    all(blocks).find(node => node.type === 'button' && node.props['aria-label'] === `Edit ${label} block styles`).props.onClick();
    assert.equal(destination, id);
  }
  assert.ok(!all(blocks).some(node => node.type === 'button' && /Edit (Math|Details|Poetry) block styles/.test(node.props['aria-label'])));
  const { ColoursPreview } = await loadProductionModule(new URL('../app/studio/site-editor/colours-preview.tsx', import.meta.url));
  const html = renderToStaticMarkup(createElement(ColoursPreview, { selection, authored: {}, scope: 'test', dispatch() {}, onBack() {}, view: 'palette', onViewChange() {} }));
  assert.match(html, /tabindex="-1">Edit palette<\/h3>/);
  assert.match(html, /aria-label="Palette type"/);
  assert.doesNotMatch(html, /class="site-colours-edit-palette"/);
});

test('Site Editor routes the Theme Colours target into its controlled palette pane', async () => {
  const { readFile } = await import('node:fs/promises');

  const source = await readFile(new URL('../app/studio/site-editor/site-editor-preview.tsx', import.meta.url), 'utf8');
  const code = (source);
  const modules = {};
  for (const name of ['identity-preview-state', 'identity-preview-presentation', 'styles-preview-state', 'typography-preview-model', 'colours-preview-model', 'background-preview-model', 'layout-preview-model']) modules[`./${name}`] = await loadProductionModule(new URL(`../app/studio/site-editor/${name}.ts`, import.meta.url));
  const slots = []; let index = 0;
  const react = { useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }]; }, useRef() { return { current: null }; }, useEffect() {}, useLayoutEffect() {}, useCallback: fn => fn, useMemo(fn) { return fn(); }, useReducer(reducer, argument, initialise) { return [initialise(argument), () => {}]; } };
  modules['./use-website-design'] = { useWebsiteDesign: () => ({ history: modules['./identity-preview-state'].createIdentityPreview(), dispatch() {}, stylesHistory: createStylesPreview(), dispatchStyle() {}, ready: true, status: 'Saved', startup: null, failure: null, flush: async () => {} }) };
  const jsx = (type, props) => ({ type, props });
  const require = name => name.endsWith("studio-view-menu") ? { viewportWidthFor: () => undefined } : name.endsWith("/sites") ? { localFixtureName: id => id === "test2" ? "Test2" : "Test" } : name.endsWith("use-site-editor-sessions") ? { useSiteEditorSessions: () => ({ browser: {}, test: {}, test2: {}, globals: {} }) } : name.endsWith("project-local-links") ? { useProjectLocalVisit: () => ({ canVisit: false, openLocal() {} }), ProjectLocalDocumentButton: "ProjectLocalDocumentButton" } : name.endsWith("test-site-context") ? { useTestSiteContext: () => null } : name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'Fragment' } : modules[name] ?? (name.endsWith('use-blob-urls') ? { useBlobUrls: () => ({}) } : new Proxy({}, { get: (_, key) => key }));
  const { SiteEditorPreview } = createHostModuleEvaluator(['require', 'exports'], `${code}\nreturn exports;`)(require, {});
  const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children), ...all(node.props?.primary), ...all(node.props?.secondary), ...all(node.props?.header)];
  const render = () => { index = 0; return all(SiteEditorPreview()); };
  render().find(node => node.type === 'button' && node.props.className === 'library-tool-button' && node.props.children.some?.(child => child?.type === 'strong' && child.props.children === 'Styles')).props.onClick();
  await new Promise(setImmediate);
  render().find(node => node.type === 'StylesPaneHeaderActions').props.onToggleStyleBook();
  render().find(node => node.type === 'StylesPreviewMenu').props.onColours();
  assert.equal(render().find(node => node.type === 'ColoursPreview').props.view, 'menu');
  render().find(node => node.type === 'StyleBook').props.onColours();
  let pane = render().find(node => node.type === 'ColoursPreview');
  assert.equal(pane.props.view, 'palette');
  assert.equal(render().find(node => node.type === 'StyleBook').props.context, 'colours');
  pane.props.onViewChange('menu');
  pane = render().find(node => node.type === 'ColoursPreview');
  assert.equal(pane.props.view, 'menu');
});


test('Typography includes reference-only specimens without adding editable block types', () => {
  const selection = resolvePreviewStyle(createStylesPreview().present, 'test');
  const html = renderToStaticMarkup(createElement(StyleBook, { selection, context: 'typography', onTypography() {}, onBrowse() {}, onBlock() {} }));
  assert.match(html, /In a village of La Mancha/);
  assert.match(html, /The Queen of Hearts/);
  assert.match(html, /Julio Cortázar/);
  assert.match(html, /registerBlockType/);
  assert.match(html, /Jaco Pastorius/);
  assert.match(html, /<details open=""><summary>La Mancha<\/summary>/);
  assert.match(html, /katex/);
  assert.match(html, /id="style-book-description-math">Quadratic formula:/);
  assert.match(html, /WHAT was he doing, the great god Pan/);
  assert.match(html, /This is the Content block/);
  assert.doesNotMatch(html, /contenteditable|<form/);
  let state = createStylesPreview();
  const codeFamily = '"TT5 Fira Code", monospace';
  assert.equal(styleBookPresentation(resolvePreviewStyle(state.present, 'test'))['--book-preformatted-font-family'], codeFamily);
  state = stylesPreviewReducer(state, { type: 'fonts', scope: 'test', families: [], disabledFamilies: [codeFamily] });
  assert.equal(styleBookPresentation(resolvePreviewStyle(state.present, 'test'))['--book-preformatted-font-family'], 'monospace');
  const styled = renderToStaticMarkup(createElement(StyleBook, { selection: { ...selection, blockStyles: { paragraph: { fontSizeCustom: '40px' }, code: { fontSizeCustom: '50px' } } }, context: 'typography', onTypography() {}, onBrowse() {} }));
  for (const id of ['math', 'preformatted', 'poetry', 'custom-link', 'home-link']) {
    const section = styled.match(new RegExp(`<section class="site-style-book-example is-${id}".*?<\\/section>`, 's'))?.[0];
    assert.ok(section);
    assert.doesNotMatch(section, /site-block-style-(paragraph|code)/);
  }
});

test('Math specimen uses display fractions without changing ordinary inline maths', async () => {
  const { mathPresentation } = await loadProductionModule(new URL('../app/content/math-presentation.ts', import.meta.url));
  const math = styleBookExamples('typography').find(example => example.id === 'math').blocks[0].runs[0].inline;
  assert.match(math.latex, /^\\displaystyle /);
  const display = mathPresentation(math);
  const inline = mathPresentation({ type: 'math', latex: math.latex.replace(/^\\displaystyle /, '') });
  assert.equal(display.error, null);
  assert.equal(inline.error, null);
  assert.notEqual(display.html, inline.html);
  assert.match(display.html, /<mstyle[^>]* displaystyle="true"/);
  assert.doesNotMatch(inline.html, /<mstyle[^>]* displaystyle="true"/);
});

test('Authored Layout block spacing keeps the canonical grid rhythm and Reset restores the reference rhythm', () => {
  let history = createStylesPreview();
  const render = () => renderToStaticMarkup(createElement(StyleBook, { selection: resolvePreviewStyle(history.present, 'test'), context: 'typography', onTypography() {}, onBrowse() {} }));
  assert.doesNotMatch(render(), /has-custom-block-spacing/);
  history = stylesPreviewReducer(history, { type: 'layout', scope: 'test', patch: { blockSpacing: '0px' } });
  assert.match(render(), /has-custom-block-spacing/);
  assert.match(render(), /--site-layout-block-spacing:0px/);
  history = stylesPreviewReducer(history, { type: 'layout', scope: 'test', patch: { blockSpacing: '10px' } });
  assert.match(render(), /--site-layout-block-spacing:10px/);
  history = stylesPreviewReducer(history, { type: 'layout', scope: 'test', patch: { blockSpacing: undefined } });
  assert.doesNotMatch(render(), /has-custom-block-spacing/);
});
