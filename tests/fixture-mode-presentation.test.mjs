import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';

const { StudioCanvas } = await loadProductionModule(new URL('../app/studio/studio-canvas.tsx', import.meta.url));
const { withTestSiteNavigation } = await loadProductionModule(new URL('../app/studio/test-site/navigation.tsx', import.meta.url));
const { layoutStyleProperties } = await loadProductionModule(new URL('../app/content/layout.ts', import.meta.url));
const { existingSitePresentation } = await loadProductionModule(new URL('../app/studio/test-site/existing-presentation.tsx', import.meta.url));


function resolveCssVariable(expression, variables) {
  if (!expression.startsWith('var(')) return expression.trim();
  const inner = expression.slice(4, -1);
  let depth = 0;
  let comma = -1;
  for (let index = 0; index < inner.length; index++) {
    if (inner[index] === '(') depth++;
    if (inner[index] === ')') depth--;
    if (inner[index] === ',' && depth === 0) { comma = index; break; }
  }
  const name = (comma < 0 ? inner : inner.slice(0, comma)).trim();
  return variables[name] ?? resolveCssVariable(inner.slice(comma + 1).trim(), variables);
}

// Real canvas markup/context is checked below. Node has no layout engine, so
// protect the shared CSS ownership separately; pixel parity is a browser check.
test('fixture hosts retain canonical root and nested block spacing instead of resetting it', () => {
  const css = postcss.parse(readFileSync(process.env.STUDIO_FIXTURE_SPACING_CSS || new URL('../app/studio/studio.css', import.meta.url), 'utf8'));
  const rules = [];
  css.walkRules(rule => rules.push(rule));
  const declarations = rule => Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
  assert.equal(declarations(rules.find(rule => rule.selector === '.studio-block-preview')).gap, 'var(--studio-block-gap, 20px)');
  assert.equal(declarations(rules.find(rule => rule.selector === '.block-position + .block-position .canvas-block'))['margin-top'], 'var(--studio-block-margin, var(--studio-block-gap))');
  const hostResets = rules.filter(rule => rule.selector.includes('.test-site-editor-surface') && /canvas-block|studio-nested-block/.test(rule.selector))
    .flatMap(rule => rule.nodes.filter(node => node.type === 'decl' && /^(margin|margin-block|margin-top|margin-block-start)$/.test(node.prop)));
  assert.deepEqual(hostResets.map(node => `${node.prop}:${node.value}`), [], 'fixture chrome must not erase shared spacing or nested authored layout');
  assert.ok(rules.some(rule => rule.selector.includes('.studio-nested-group.has-layout-options.layout-flow') && declarations(rule)['margin-block-start']?.includes('--block-layout-row-gap')));
  assert.ok(rules.some(rule => rule.selector === '.block-editor:not(.template-editing)' && declarations(rule)['--studio-selected-toolbar-gap'] === '0px'), 'ordinary content selection must not add toolbar layout space');
});

test('actual fixture canvas consumes inherited website settings in Edit and Preview without changing content', () => {
  for (const siteId of ['test', 'test2']) {
    const document = { id: 'home', kind: 'page', title: 'Home', blocks: [
      { id: 'one', type: 'paragraph', text: 'First paragraph' },
      { id: 'two', type: 'heading', level: 2, text: 'Second heading' },
      { id: 'inherited', type: 'group', layout: 'flow', ariaLabel: 'Inherited rhythm', children: [
        { id: 'inherited-one', type: 'paragraph', text: 'Inherited first' },
        { id: 'inherited-two', type: 'paragraph', text: 'Inherited second' },
      ] },
      { id: 'group', type: 'group', layout: 'flow', gap: 9, ariaLabel: 'Authored rhythm', children: [
        { id: 'nested-one', type: 'paragraph', text: 'Nested first', style: { textColor: '#ff0000' } },
        { id: 'nested-two', type: 'paragraph', text: 'Nested second' },
      ] },
    ] };
    const site = { version: 9, siteId, siteNavigation: { setId: 'missing', partId: 'missing' }, templates: { sets: [], assignments: [], defaultTemplateIds: {} }, documents: [document], websiteDesign: { identity: { title: siteId }, styles: { layout: { contentWidth: '645px' } } } };
    const globals = { websiteDesignDefaults: { identity: {}, styles: { layout: { blockSpacing: '31px' }, blockStyles: { paragraph: { padding: '7px' } }, typography: { elements: { text: { size: '22px' } } } } } };
    const before = structuredClone({ site, globals });
    const presentation = withTestSiteNavigation(existingSitePresentation(document, {}, false, () => {}, () => {}), site, () => {}, () => {}, undefined, undefined, globals);
    for (const previewing of [false, true]) for (const selectedBlockId of [null, 'two']) {
      const html = renderToStaticMarkup(createElement(StudioCanvas, { activeDocument: document, writable: true, className: 'test-site-editor-surface', presentation,
        previewing, selectedBlockId, showCoverImage: false, mediaBlockUrls: {}, linkTargets: [], wordCount: 0, characterCount: 0 }));
      assert.match(html, /data-website-design=/, 'the existing shared presentation provider wraps both modes');
      assert.match(html, /--studio-block-gap:31px/);
      assert.match(html, /--studio-block-margin:31px/);
      assert.match(html, /max-width:645px/);
      assert.match(html, /font-size:22px/);
      assert.match(html, /padding:7px/, 'BlockField and BlockRenderer both consume the inherited projection context');
      assert.match(html, /--block-layout(?:-row)?-gap:9px/, 'authored nested group rhythm remains independent');
      const templates = postcss.parse(readFileSync(process.env.STUDIO_FIXTURE_TEMPLATES_CSS || new URL('../app/studio/templates.css', import.meta.url), 'utf8'));
      let flowGap;
      templates.walkRules(rule => { if (rule.selector === ':is(.studio-nested-group, .content-group, .template-group).has-layout-options.layout-flow > * + *') flowGap = rule.nodes.find(node => node.prop === 'margin-block-start').value; });
      for (const [label, expected] of [['Inherited rhythm', '31px'], ['Authored rhythm', '9px']]) {
        const tag = html.match(new RegExp(`<[^>]+aria-label="${label}"[^>]*>`))?.[0];
        assert.ok(tag, `${label} is rendered through the actual ${previewing ? 'content-group' : 'studio-nested-group'} flow owner`);
        assert.match(tag, new RegExp(previewing ? 'content-group layout-flow has-layout-options' : 'studio-nested-group layout-flow has-layout-options'));
        const variables = Object.fromEntries([...tag.matchAll(/(--[\w-]+):([^;"<]+)/g)].map(match => [match[1], match[2]]));
        variables['--studio-block-gap'] = html.match(/--studio-block-gap:([^;}]+)/)[1];
        assert.equal(resolveCssVariable(flowGap, variables), expected, 'actual Group styles resolve the effective rhythm without inventing an authored gap');
      }

      assert.match(html, /color:#ff0000/, 'authored child colour wins over inherited presentation');
      assert.match(html, new RegExp(`data-test-mode="${previewing ? 'preview' : 'edit'}"`));
    }
    assert.deepEqual({ site, globals }, before, 'neither rendering mode materialises settings into source');
  }
});


test('Preview flow Groups use the same website rhythm fallback as Edit and retain explicit zero gaps', () => {
  const selector = ':is(.studio-nested-group, .content-group, .template-group).has-layout-options.layout-flow > * + *';
  const fallback = 'var(--block-layout-row-gap, var(--block-layout-gap, var(--studio-block-gap, 0px)))';
  for (const file of ['studio.css', 'templates.css']) {
    const source = file === 'templates.css' && process.env.STUDIO_FIXTURE_TEMPLATES_CSS || new URL(`../app/studio/${file}`, import.meta.url);
    const sheet = postcss.parse(readFileSync(source, 'utf8'));
    const matches = [];
    sheet.walkRules(rule => { if (rule.selector === selector) matches.push(rule); });
    assert.ok(matches.length, `${file} supplies the canonical flow rule`);
    for (const rule of matches) assert.equal(rule.nodes.find(node => node.prop === 'margin-block-start')?.value, fallback,
      `${file} must not replace website rhythm with a zero fallback in Preview`);
  }
  const resolveGap = options => {
    const css = layoutStyleProperties({ type: 'group', layout: 'flow', ...options });
    return css['--block-layout-row-gap'] ?? css['--block-layout-gap'] ?? '31px';
  };
  assert.equal(resolveGap({}), '31px');
  assert.equal(resolveGap({ gap: 0 }), '0px');
  assert.equal(resolveGap({ gap: 9 }), '9px');
  assert.equal(resolveGap({ gap: 9, rowGap: 0 }), '0px');
  assert.equal(resolveGap({ gap: 0, rowGap: 12 }), '12px');
});
