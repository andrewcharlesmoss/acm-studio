import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { createReferenceTemplateParts, upgradeReferenceTemplateParts, referenceComparisonSet, referencePartSetId, resetReferenceTemplatePart } = await load('../app/studio/reference-template-parts.ts');
const { validateTemplateSet, validateTemplateStore, createTemplateSet, emptyTemplateStore, templateEditorBlocks, templateNodesFromBlocks } = await load('../app/studio/template-model.ts');
const { validateGlobalTemplateLibrary, migrateHeaderNavigation } = await load('../app/studio/global-template-contract.ts');
const { TemplateNodes, TemplateSurface } = await load('../app/studio/template-renderer.tsx');
const { containsGeneralTemplatePart } = await load('../app/studio/reference-template-parts-contract.ts');

test('seven reference originals have stable IDs, editable nodes and correct areas', () => {
  const set = createReferenceTemplateParts();
  assert.doesNotThrow(() => validateTemplateSet(set));
  assert.deepEqual(set.parts.map(p => p.kind), ['header', 'general', 'header', 'header', 'footer', 'footer', 'footer']);
  assert.deepEqual(set.parts.map(p => p.id), createReferenceTemplateParts().parts.map(p => p.id));
  for (const part of set.parts) {
    const result = templateNodesFromBlocks(templateEditorBlocks(part.nodes), part.nodes);
    assert.doesNotThrow(() => validateTemplateSet({ ...set, parts: [{ ...part, nodes: result }] }));
  }
  assert.equal(set.navigation.length, 0);
});
test('comparison content is an isolated projection with both example page links', () => {
  const set = createReferenceTemplateParts(); const before = structuredClone(set);
  const preview = referenceComparisonSet(set);
  assert.equal(preview.identity.name, 'My WordPress Website');
  assert.deepEqual(preview.navigation.map(link => link.label), ['Hello from WordPress Playground!', 'Sample Page']);
  assert.deepEqual(set, before);
});

test('reference Header renders its constrained Group, title row and separate Navigation row', () => {
  const set = referenceComparisonSet(createReferenceTemplateParts());
  const header = set.parts.find(part => part.id === 'tt5-header');
  const html = renderToStaticMarkup(createElement(TemplateNodes, { set, nodes: header.nodes, document: { blocks: [] }, authoring: true }));
  assert.match(html, /data-layout-constrained="true"/);
  assert.match(html, /data-block-align="wide"/);
  assert.doesNotMatch(html, /data-compact-navigation-row="true"/);
  assert.match(html, /template-site-title-text/);
  assert.match(html, /data-navigation-overlay="mobile"/);
  const stacked = structuredClone(header.nodes);
  stacked[0].children[0].stackAt = 'mobile';
  const stackedHtml = renderToStaticMarkup(createElement(TemplateNodes, { set, nodes: stacked, document: { blocks: [] }, authoring: true }));
  assert.match(stackedHtml, /data-layout-constrained="true"/);
  assert.match(stackedHtml, /data-navigation-overlay="mobile"/);
});

test('pristine reference headers gain an inset shell while authored headers remain intact', async () => {
  const { upgradeReferenceTemplateParts } = await load('../app/studio/reference-template-parts.ts');
  const { applyHeaderDesign, headerDesigns } = await load('../app/studio/template-part-designs.ts');
  const previous = createReferenceTemplateParts('accuracy2');
  const authored = structuredClone(previous);
  authored.parts.find(part => part.id === 'tt5-header-large-title').nodes[0].visualStyle.padding = '30px';
  const upgraded = upgradeReferenceTemplateParts(authored);
  const header = upgraded.parts.find(part => part.id === 'tt5-header');
  assert.equal(header.nodes[0].visualStyle.className, 'tt5-reference-shell tt5-header-shell');
  assert.equal(header.nodes[0].visualStyle.padding, undefined, 'fluid shell defaults remain overridable by authored padding');
  const headerRow = (nodes) => { for (const node of nodes) { if (node.visualStyle?.className === 'tt5-header-row') return node; if (node.children) { const nested = headerRow(node.children); if (nested) return nested; } } return undefined; };
  assert.equal(headerRow(header.nodes).layout, 'flow');
  assert.deepEqual(upgraded.parts.find(part => part.id === 'tt5-header-large-title'), authored.parts.find(part => part.id === 'tt5-header-large-title'));
  for (const design of headerDesigns) {
    const result = applyHeaderDesign(header.nodes, design.id);
    assert.ok(result, `${design.id} can be applied`);
    assert.equal(result[0].id, header.nodes[0].id);
    assert.doesNotThrow(() => validateTemplateSet({ ...upgraded, parts: [{ ...header, nodes: result }] }));
  }
  assert.deepEqual(upgradeReferenceTemplateParts(upgraded), upgraded);
});

test('the exact legacy compact Header regains its reference shell without changing its menu node ID', async () => {
  const { upgradeReferenceTemplateParts } = await load('../app/studio/reference-template-parts.ts');
  const set = createReferenceTemplateParts();
  const header = set.parts.find(part => part.id === 'tt5-header');
  header.nodes = [{
    id: 'tt5-header-3', type: 'group', layout: 'row', gap: 0,
    visualStyle: { fontFamily: 'site-manrope', textColor: '#111111', padding: '20px 0' },
    children: [
      { id: 'tt5-header-1', type: 'element', element: 'site-title', tagName: 'p', visualStyle: { fontSizeCustom: '22px', appearance: 'bold', lineHeight: '1.2', letterSpacing: '-0.5px' }, align: 'left', linkToHome: true, opensInNewTab: false },
      { id: 'tt5-header-2', type: 'element', element: 'navigation', layout: 'row', horizontalAlign: 'right', overlayMenu: 'mobile', gap: 24, visualStyle: { fontSizeCustom: '18px', appearance: 'light' }, align: 'left', allowWrap: true, submenuOpenOnClick: false, showSubmenuIcon: true, ariaLabel: 'Site navigation' },
    ],
    horizontalAlign: 'space-between', verticalAlign: 'centre', allowWrap: false,
  }];
  const upgraded = upgradeReferenceTemplateParts(set);
  const next = upgraded.parts.find(part => part.id === 'tt5-header');
  const find = (nodes, predicate) => { for (const node of nodes) { if (predicate(node)) return node; if (node.children) { const nested = find(node.children, predicate); if (nested) return nested; } } return undefined; };
  assert.equal(next.nodes[0].visualStyle.className, 'tt5-reference-shell tt5-header-shell');
  assert.equal(find(next.nodes, node => node.type === 'element' && node.element === 'navigation').id, 'tt5-header-2');
  assert.equal(find(next.nodes, node => node.type === 'element' && node.element === 'site-title').id, 'tt5-header-1');
  assert.deepEqual(upgradeReferenceTemplateParts(upgraded), upgraded);

  const authored = structuredClone(set);
  authored.parts.find(part => part.id === 'tt5-header').nodes[0].visualStyle.padding = '20px 12px';
  assert.deepEqual(upgradeReferenceTemplateParts(authored), authored);
});

test('an exact earlier generated Header with a reused row/menu ID is repaired without leaving duplicate block IDs', async () => {
  const { upgradeReferenceTemplateParts } = await load('../app/studio/reference-template-parts.ts');
  const set = createReferenceTemplateParts('header-layout-v1');
  const header = set.parts.find(part => part.id === 'tt5-header');
  const row = header.nodes[0].children[0].children[0];
  row.children.find(node => node.type === 'element' && node.element === 'navigation').id = row.id;
  const repaired = upgradeReferenceTemplateParts(set);
  const next = repaired.parts.find(part => part.id === 'tt5-header');
  const ids = [];
  const visit = nodes => nodes.forEach(node => { ids.push(node.id); if (node.children) visit(node.children); });
  visit(next.nodes);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(next.nodes[0].visualStyle.className, 'tt5-reference-shell tt5-header-shell');
  assert.equal(next.nodes[0].children[0].children[1].children[0].id, row.id);
});

test('reference migration is additive, idempotent and retains the active Header role', () => {
  const set = createTemplateSet('Authored');
  const library = { format: 'acm-global-templates', version: 43, templates: { ...emptyTemplateStore(), sets: [set] }, header: { setId: set.id, partId: set.parts[0].id }, migrations: { test: { bindings: [], bases: [] }, test2: { bindings: [], bases: [] } } };
  const before = structuredClone(library);
  const result = validateGlobalTemplateLibrary(library);
  assert.equal(result.templates.sets.filter(s => s.id === referencePartSetId).length, 1);
  assert.deepEqual(result.templates.sets[0], validateTemplateSet(before.templates.sets[0]));
  assert.deepEqual(result.header, before.header);
  assert.deepEqual(validateGlobalTemplateLibrary(result), result);
  assert.deepEqual(migrateHeaderNavigation(result).header, before.header);
  assert.deepEqual(library, before);
});
test('older template and library envelopes reject new reference fields', () => {
  const set = createReferenceTemplateParts();
  assert.equal(containsGeneralTemplatePart(set), true);
  assert.throws(() => validateTemplateStore({ ...emptyTemplateStore(), version: '0.72.0', sets: [set] }), /v0.73.0/);
  assert.equal(validateTemplateStore({ ...emptyTemplateStore(), version: '0.74.0', sets: [set] }).version, '0.77.0');
  assert.throws(() => validateGlobalTemplateLibrary({ format: 'acm-global-templates', version: 43, templates: { ...emptyTemplateStore(), sets: [set] }, header: { setId: 'x', partId: 'y' }, migrations: { test: { bindings: [], bases: [] }, test2: { bindings: [], bases: [] } } }), /v45/);
  assert.equal(containsGeneralTemplatePart(Array(150000).fill('x')), false);
});

test('an authentic v43 reference set upgrades to current parts without misclassifying generated v73 features', () => {
  const legacy = createReferenceTemplateParts('accuracy2');
  const library = {
    format: 'acm-global-templates', version: 43,
    templates: { ...emptyTemplateStore(), version: '0.72.0', sets: [legacy] },
    header: { setId: legacy.id, partId: 'tt5-header' },
    migrations: { test: { bindings: [], bases: [] }, test2: { bindings: [], bases: [] } },
  };
  const upgraded = validateGlobalTemplateLibrary(library);
  const set = upgraded.templates.sets[0];
  const sidebar = set.parts.find(part => part.id === 'tt5-sidebar');
  const header = set.parts.find(part => part.id === 'tt5-header');
  assert.equal(upgraded.version, 48);
  assert.equal(upgraded.templates.version, '0.77.0');
  assert.equal(header.nodes[0].visualStyle.className, 'tt5-reference-shell tt5-header-shell');
  assert.equal(sidebar.nodes[0].visualStyle.className, 'tt5-sidebar');
  assert.equal(JSON.stringify(library.templates.sets[0]), JSON.stringify(legacy), 'migration leaves the saved source object unchanged');
});

test('legacy v0.71 template data is readable before references are added', () => {
  const set = createTemplateSet('Legacy');
  assert.doesNotThrow(() => validateTemplateStore({ ...emptyTemplateStore(), version: '0.71.0', sets: [set] }));
});
test('Site Logo renders browser media and honours its authored visual style', () => {
  const set = createReferenceTemplateParts(); set.identity.logo = { mediaId: 'logo', src: '', alt: 'Site logo' };
  const node = { id: 'logo', type: 'element', element: 'site-logo', visualStyle: { padding: '8px' } };
  const html = renderToStaticMarkup(createElement(TemplateNodes, { set, document: { blocks: [] }, nodes: [node], mediaUrls: { logo: 'blob:http://localhost/logo' }, authoring: true }));
  assert.match(html, /blob:http:\/\/localhost\/logo/);
  assert.match(html, /padding:8px/);
  const surface = renderToStaticMarkup(createElement(TemplateSurface, { set }, 'Example'));
  assert.match(surface, /TT5 Manrope/);
});

test('accuracy upgrade replaces only pristine original parts and preserves authored variations', () => {
  const original = createReferenceTemplateParts('original');
  const authored = structuredClone(original);
  authored.parts.find(part => part.id === 'tt5-header').nodes[0].visualStyle.padding = '45px';
  const before = structuredClone(authored);
  const library = { format: 'acm-global-templates', version: 44, templates: { ...emptyTemplateStore(), sets: [authored] }, header: { setId: authored.id, partId: 'tt5-header' }, migrations: { test: { bindings: [], bases: [] }, test2: { bindings: [], bases: [] } } };
  const result = validateGlobalTemplateLibrary(library);
  const upgraded = result.templates.sets.find(set => set.id === referencePartSetId);
  assert.deepEqual(upgraded.parts.find(part => part.id === 'tt5-header'), before.parts.find(part => part.id === 'tt5-header'));
  assert.deepEqual(upgraded.parts.find(part => part.id === 'tt5-footer-newsletter'), createReferenceTemplateParts().parts.find(part => part.id === 'tt5-footer-newsletter'));
  assert.deepEqual(validateGlobalTemplateLibrary(result), result);
  assert.deepEqual(authored, before);
});

test('reset restores only the chosen reference nodes and retains stable mapped menu IDs', () => {
  const set = createReferenceTemplateParts();
  const before = structuredClone(set);
  const target = set.parts.find(part => part.id === 'tt5-header');
  target.nodes[0].visualStyle.padding = '47px';
  target.name = 'My edited Header';
  const assignment = { navigationId: 'tt5-header-navigation', menuId: 'wordPress-comparison' };
  const reset = resetReferenceTemplatePart(set, target.id);
  assert.deepEqual(reset.parts.find(part => part.id === target.id).nodes, before.parts.find(part => part.id === target.id).nodes);
  assert.equal(reset.parts.find(part => part.id === target.id).id, target.id);
  assert.equal(reset.parts.find(part => part.id === target.id).name, 'My edited Header');
  assert.equal(reset.parts.find(part => part.id === target.id).nodes[0].children[0].children[1].children[0].id, assignment.navigationId);
  assert.equal(assignment.menuId, 'wordPress-comparison');
  assert.deepEqual(reset.parts.filter(part => part.id !== target.id), before.parts.filter(part => part.id !== target.id));
  assert.deepEqual(reset.navigation, before.navigation);
  assert.deepEqual(set.parts.find(part => part.id === target.id).nodes[0].visualStyle.padding, '47px');
  assert.equal(resetReferenceTemplatePart({ ...set, id: 'another-set' }, target.id).id, 'another-set');
});

test('reference Newsletter uses a semantic heading with container-sized presentation', () => {
  const set = createReferenceTemplateParts();
  const part = set.parts.find(part => part.id === 'tt5-footer-newsletter');
  const html = renderToStaticMarkup(createElement(TemplateSurface, { set }, createElement(TemplateNodes, { set, nodes: part.nodes, document: { blocks: [] }, authoring: true })));
  assert.match(html, /tt5-newsletter-title[^>]*>[\s\S]*?<h2[^>]*>Stories<\/h2>/);
  assert.doesNotMatch(html, /font-size:24vw/);
  assert.match(html, /--acm-layout-content-width:1340px/);
});

test('all five Footer designs validate in an authored set and keep independent node identities', async () => {
  const { footerDesigns, applyFooterDesign } = await load('../app/studio/template-part-designs.ts');
  assert.equal(footerDesigns.length, 5);
  const set = createTemplateSet('Authored');
  const footer = set.parts.find(part => part.kind === 'footer');
  for (const design of footerDesigns) {
    const nodes = applyFooterDesign(design.id);
    const next = { ...set, parts: set.parts.map(part => part.id === footer.id ? { ...part, nodes } : part) };
    assert.doesNotThrow(() => validateTemplateSet(next));
    assert.equal(next.parts.find(part => part.id === footer.id).id, footer.id);
    assert.notDeepEqual(nodes, applyFooterDesign(design.id), 'each application creates fresh block IDs');
  }
});

test('Footer selected state follows exact layout values independently of generated IDs', async () => {
  const { footerDesignSelected, applyFooterDesign } = await load('../app/studio/template-part-designs.ts');
  const nodes = applyFooterDesign('newsletter');
  assert.equal(footerDesignSelected(nodes, 'newsletter'), true);
  assert.equal(footerDesignSelected(nodes, 'columns'), false);
  nodes[0].visualStyle.padding = '12px';
  assert.equal(footerDesignSelected(nodes, 'newsletter'), false);
});


test('reference full sections constrain their inner content and keep the large Header divider outside its gutters', async () => {
  const { applyHeaderDesign } = await load('../app/studio/template-part-designs.ts');
  const set = createReferenceTemplateParts();
  const large = set.parts.find(part => part.id === 'tt5-header-large-title');
  const shell = large.nodes[0];
  assert.equal(shell.visualStyle.borderWidthSides.bottom, '1px');
  assert.equal(shell.children[0].visualStyle.borderWidthSides, undefined);
  assert.equal(shell.visualStyle.padding, undefined);
  const header = set.parts.find(part => part.id === 'tt5-header');
  const applied = applyHeaderDesign(header.nodes, 'large');
  assert.equal(applied[0].visualStyle.borderWidthSides.bottom, '1px');
  assert.equal(applyHeaderDesign(applied, 'compact')[0].visualStyle.borderWidthSides, undefined);
  for (const id of ['tt5-footer', 'tt5-footer-columns', 'tt5-footer-newsletter']) {
    const part = set.parts.find(part => part.id === id);
    const html = renderToStaticMarkup(createElement(TemplateNodes, { set, nodes: part.nodes, document: { blocks: [] }, authoring: true }));
    assert.match(html, /tt5-reference-shell/);
    assert.match(html, /tt5-wide/);
  }
  const footer = set.parts.find(part => part.id === 'tt5-footer');
  const children = footer.nodes[0].children[0].children;
  assert.equal(children[0].element, 'site-logo');
  assert.equal(children[1].layout, 'row');
  const html = renderToStaticMarkup(createElement(TemplateNodes, { set, nodes: footer.nodes, document: { blocks: [] }, authoring: true }));
  assert.ok(html.indexOf('Site logo placeholder') < html.indexOf('My WordPress Website'));
  assert.ok(html.indexOf('My WordPress Website') < html.indexOf('>Blog</a>'));
});

test('latest accuracy upgrade preserves authored designs and upgrades only exact earlier generated shells', async () => {
  const { upgradeReferenceTemplateParts } = await load('../app/studio/reference-template-parts.ts');
  const previous = createReferenceTemplateParts('accuracy3');
  previous.parts.find(part => part.id === 'tt5-header').nodes[0].visualStyle.padding = '12px';
  const authoredNewsletter = previous.parts.find(part => part.id === 'tt5-footer-newsletter');
  authoredNewsletter.nodes = structuredClone(previous.parts.find(part => part.id === 'tt5-footer-columns').nodes);
  const before = structuredClone(previous);
  const next = upgradeReferenceTemplateParts(previous);
  assert.deepEqual(next.parts.find(part => part.id === 'tt5-header'), before.parts.find(part => part.id === 'tt5-header'));
  assert.deepEqual(next.parts.find(part => part.id === 'tt5-footer-newsletter'), authoredNewsletter);
  assert.deepEqual(next.parts.find(part => part.id === 'tt5-footer'), createReferenceTemplateParts().parts.find(part => part.id === 'tt5-footer'));
  assert.deepEqual(upgradeReferenceTemplateParts(next), next);
  assert.deepEqual(previous, before);
});


test('explicit Header design application adopts its shell without changing menu or row IDs', async () => {
  const { applyHeaderDesign } = await load('../app/studio/template-part-designs.ts');
  const old = createReferenceTemplateParts('current').parts.find(part => part.id === 'tt5-header');
  old.nodes[0].visualStyle.padding = '20px 50px';
  const find = (nodes, predicate) => { for (const node of nodes) { if (predicate(node)) return node; const nested = node.children && find(node.children, predicate); if (nested) return nested; } return undefined; };
  const rowId = find(old.nodes, node => node.type === 'group' && node.visualStyle?.className === 'tt5-header-row').id;
  const navId = find(old.nodes, node => node.type === 'element' && node.element === 'navigation').id;
  const next = applyHeaderDesign(old.nodes, 'compact');
  assert.match(next[0].visualStyle.className, /tt5-header-shell/);
  assert.equal(find(next, node => node.type === 'group' && node.visualStyle?.className === 'tt5-header-row').id, rowId);
  assert.equal(find(next, node => node.type === 'element' && node.element === 'navigation').id, navId);
  const reapplied = applyHeaderDesign(next, 'large');
  assert.equal(reapplied[0].id, next[0].id);
  assert.equal(find(reapplied, node => node.type === 'group' && node.visualStyle?.className === 'tt5-header-row').id, rowId);
  assert.equal(find(reapplied, node => node.type === 'element' && node.element === 'navigation').id, navId);
  assert.equal(reapplied[0].visualStyle.borderWidthSides.bottom, '1px');
  assert.equal(find(reapplied, node => node.type === 'element' && node.element === 'site-title').element, 'site-title');
});


test('Header Group replaces only a pristine Stack reference', () => {
  const previous = createReferenceTemplateParts('stack-header');
  const header = previous.parts.find(part => part.id === 'tt5-header');
  assert.equal(header.nodes[0].layout, 'stack');
  const upgraded = upgradeReferenceTemplateParts(previous);
  assert.equal(upgraded.parts.find(part => part.id === 'tt5-header').nodes[0].layout, 'row');
  const customised = structuredClone(previous);
  const customHeader = customised.parts.find(part => part.id === 'tt5-header');
  customHeader.nodes[0].visualStyle.className += ' custom';
  assert.deepEqual(upgradeReferenceTemplateParts(customised).parts.find(part => part.id === 'tt5-header'), customHeader);
});
