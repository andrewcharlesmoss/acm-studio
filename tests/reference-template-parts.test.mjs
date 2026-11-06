import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { createReferenceTemplateParts, referenceComparisonSet, referencePartSetId } = await load('../app/studio/reference-template-parts.ts');
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

test('reference site-title headers use the compact identity and menu layout contract', () => {
  const set = referenceComparisonSet(createReferenceTemplateParts());
  const header = set.parts.find(part => part.id === 'tt5-header');
  const html = renderToStaticMarkup(createElement(TemplateNodes, { set, nodes: header.nodes, document: { blocks: [] }, authoring: true }));
  assert.match(html, /data-compact-navigation-row="true"/);
  assert.match(html, /template-site-title-text/);
  assert.match(html, /data-navigation-overlay="mobile"/);
  const stacked = structuredClone(header.nodes);
  stacked[0].children[0].stackAt = 'mobile';
  const stackedHtml = renderToStaticMarkup(createElement(TemplateNodes, { set, nodes: stacked, document: { blocks: [] }, authoring: true }));
  assert.doesNotMatch(stackedHtml, /data-compact-navigation-row="true"/);
});

test('pristine reference headers gain an inset shell while authored headers remain intact', async () => {
  const { upgradeReferenceTemplateParts } = await load('../app/studio/reference-template-parts.ts');
  const { applyHeaderDesign, headerDesigns } = await load('../app/studio/template-part-designs.ts');
  const previous = createReferenceTemplateParts('accuracy2');
  const authored = structuredClone(previous);
  authored.parts.find(part => part.id === 'tt5-header-large-title').nodes[0].visualStyle.padding = '30px';
  const upgraded = upgradeReferenceTemplateParts(authored);
  const header = upgraded.parts.find(part => part.id === 'tt5-header');
  assert.equal(header.nodes[0].visualStyle.className, 'tt5-header-shell');
  assert.equal(header.nodes[0].visualStyle.padding, undefined, 'fluid shell defaults remain overridable by authored padding');
  assert.equal(header.nodes[0].children[0].layout, 'row');
  assert.deepEqual(upgraded.parts.find(part => part.id === 'tt5-header-large-title'), authored.parts.find(part => part.id === 'tt5-header-large-title'));
  for (const design of headerDesigns) {
    const result = applyHeaderDesign(header.nodes, design.id);
    assert.ok(result, `${design.id} can be applied`);
    assert.equal(result[0].id, header.nodes[0].id);
    assert.doesNotThrow(() => validateTemplateSet({ ...upgraded, parts: [{ ...header, nodes: result }] }));
  }
  assert.deepEqual(upgradeReferenceTemplateParts(upgraded), upgraded);
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
  assert.throws(() => validateTemplateStore({ ...emptyTemplateStore(), version: '0.71.0', sets: [set] }), /General template parts/);
  assert.equal(containsGeneralTemplatePart(Array(150000).fill('x')), false);
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
  const library = { format: 'acm-global-templates', version: 43, templates: { ...emptyTemplateStore(), sets: [authored] }, header: { setId: authored.id, partId: 'tt5-header' }, migrations: { test: { bindings: [], bases: [] }, test2: { bindings: [], bases: [] } } };
  const result = validateGlobalTemplateLibrary(library);
  const upgraded = result.templates.sets.find(set => set.id === referencePartSetId);
  assert.deepEqual(upgraded.parts.find(part => part.id === 'tt5-header'), before.parts.find(part => part.id === 'tt5-header'));
  assert.deepEqual(upgraded.parts.find(part => part.id === 'tt5-footer-newsletter'), createReferenceTemplateParts().parts.find(part => part.id === 'tt5-footer-newsletter'));
  assert.deepEqual(validateGlobalTemplateLibrary(result), result);
  assert.deepEqual(authored, before);
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
  const old = createReferenceTemplateParts('accuracy2').parts.find(part => part.id === 'tt5-header');
  old.nodes[0].visualStyle.padding = '20px 50px';
  const rowId = old.nodes[0].id;
  const navId = old.nodes[0].children.find(node => node.element === 'navigation').id;
  const next = applyHeaderDesign(old.nodes, 'compact');
  assert.equal(next[0].visualStyle.className, 'tt5-header-shell');
  assert.equal(next[0].children[0].id, rowId);
  assert.equal(next[0].children[0].children.find(node => node.element === 'navigation').id, navId);
  const reapplied = applyHeaderDesign(next, 'large');
  assert.equal(reapplied[0].id, next[0].id);
  assert.equal(reapplied[0].children[0].id, rowId);
  assert.equal(reapplied[0].children[0].children.find(node => node.element === 'navigation').id, navId);
  assert.equal(reapplied[0].visualStyle.borderWidthSides.bottom, '1px');
  assert.equal(reapplied[0].children[0].children[0].element, 'site-title');
});
