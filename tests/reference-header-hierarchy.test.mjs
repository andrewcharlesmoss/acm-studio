import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';

const { createReferenceTemplateParts, upgradeReferenceTemplateParts, resetReferenceTemplatePart, isReferenceTemplatePart } = await loadProductionModule(new URL('../app/studio/reference-template-parts.ts', import.meta.url));
const { templateEditorBlocks, templateNodesFromBlocks, validateTemplateSet } = await loadProductionModule(new URL('../app/studio/template-model.ts', import.meta.url));
const { TemplateInspector } = await loadProductionModule(new URL('../app/studio/template-inspector.tsx', import.meta.url));
const header = set => set.parts.find(part => part.id === 'tt5-header');
const walk = nodes => nodes.flatMap(node => [node, ...walk(node.children ?? [])]);

test('WordPress reset availability recognises exact generated IDs only in the reference set', () => {
  const set = createReferenceTemplateParts();
  for (const part of set.parts) assert.equal(isReferenceTemplatePart(set.id, part.id), true);
  assert.equal(isReferenceTemplatePart('another-set', 'tt5-header'), false);
  assert.equal(isReferenceTemplatePart(set.id, 'header'), false);
  assert.equal(isReferenceTemplatePart(set.id, 'tt5-header-custom'), false);
  const noop = () => {};
  const html = renderToStaticMarkup(createElement(TemplateInspector, { set, target: header(set), selectedBlock: null, globalOriginal: true, writable: true, users: [], onChange: noop, onBlockChange: noop, onOpenMedia: noop, onEditPart: noop }));
  assert.match(html, />Reset to WordPress design<\/button>/);
});

test('ordinary Header follows the TT5 Group hierarchy without materialising inherited typography', () => {
  const set = createReferenceTemplateParts();
  const shell = header(set).nodes[0];
  const row = shell;
  const group = row.children[0];
  const [title, menuRow] = group.children;
  const navigation = menuRow.children[0];
  assert.equal(shell.layout, 'row');
  assert.equal(shell.contentWidth, 'full');
  assert.equal(shell.blockAlign, 'full');
  assert.equal(group.layout, 'flow');
  assert.equal(group.inheritLayout, true);
  assert.equal(group.blockAlign, 'wide');
  assert.equal(group.allowWrap, false);
  assert.equal(group.gap, undefined);
  assert.equal(group.horizontalAlign, 'space-between');
  assert.equal(group.visualStyle.padding, '20px 0');
  assert.equal(title.element, 'site-title');
  assert.equal(title.tagName, 'p');
  assert.equal(menuRow.layout, 'row');
  assert.equal(menuRow.horizontalAlign, 'right');
  assert.equal(menuRow.allowWrap, false);
  assert.equal(menuRow.gap, 10);
  assert.equal(navigation.element, 'navigation');
  assert.equal(navigation.pageListBlock.type, 'navigation-page-list');
  assert.equal(navigation.allowWrap, true);
  assert.equal(navigation.gap, undefined);
  for (const node of walk([shell]).filter(node => node.type === 'group')) {
    assert.equal(node.visualStyle?.fontFamily, undefined);
    assert.equal(node.visualStyle?.textColor, undefined);
  }
  const roundTrip = templateNodesFromBlocks(templateEditorBlocks([shell]), [shell]);
  assert.doesNotThrow(() => validateTemplateSet({ ...set, parts: [{ ...header(set), nodes: roundTrip }] }));
  assert.equal(roundTrip[0].children[0].children[1].children[0].id, navigation.id);
});

test('exact previous Header upgrades preserve Navigation identity and other six reference parts', () => {
  const previous = createReferenceTemplateParts('header-layout-v1');
  const before = structuredClone(previous);
  const next = upgradeReferenceTemplateParts(previous);
  assert.equal(header(next).nodes[0].layout, 'row');
  assert.equal(header(next).nodes[0].children[0].layout, 'flow');
  assert.equal(walk(header(next).nodes).find(node => node.element === 'navigation').id, 'tt5-header-navigation');
  assert.deepEqual(next.parts.filter(part => part.id !== 'tt5-header'), before.parts.filter(part => part.id !== 'tt5-header'));
  assert.deepEqual(previous, before);
  assert.deepEqual(upgradeReferenceTemplateParts(next), next);
});

test('a legacy Header gets Gutenberg’s Row/Group hierarchy and Page List while its site menu stays intact', () => {
  const old = createReferenceTemplateParts('header-layout-v3');
  old.navigation = [{ id: 'site-menu-page', label: 'Sample Page', url: '/sample-page' }];
  const upgraded = upgradeReferenceTemplateParts(old);
  const [shell] = header(upgraded).nodes;
  const [group] = shell.children;
  assert.equal(shell.layout, 'row');
  assert.equal(group.layout, 'flow');
  assert.equal(walk(header(upgraded).nodes).find(node => node.element === 'navigation').pageListBlock.type, 'navigation-page-list');
  assert.deepEqual(upgraded.navigation, old.navigation);
  const customised = structuredClone(old);
  header(customised).nodes[0].visualStyle.padding = '13px';
  const customisedUpgrade = header(upgradeReferenceTemplateParts(customised));
  assert.equal(customisedUpgrade.nodes[0].visualStyle.padding, '13px');
  assert.equal(customisedUpgrade.nodes[0].layout, 'row');
  assert.equal(customisedUpgrade.nodes[0].children[0].layout, 'flow');
  assert.equal(walk(customisedUpgrade.nodes).find(node => node.element === 'navigation').pageListBlock.type, 'navigation-page-list');
});

test('a styled legacy Header keeps its authored styles, IDs and menu while upgrading its generated hierarchy', async () => {
  const set = createReferenceTemplateParts('header-layout-v3');
  const part = header(set);
  const [shell] = part.nodes;
  const [previousGroup] = shell.children;
  const [previousRow] = previousGroup.children;
  const [, previousNavigationRow] = previousRow.children;
  const [navigation] = previousNavigationRow.children;
  shell.visualStyle = { ...shell.visualStyle, padding: '0px', margin: '0px 0' };
  previousNavigationRow.id = 'tt5-header-2-reference';
  navigation.id = 'tt5-header-2';
  set.navigation = [{ id: 'saved-link', label: 'Saved link', url: '/saved-link' }];
  const before = structuredClone(set);

  const upgraded = upgradeReferenceTemplateParts(set);
  const upgradedHeader = header(upgraded);
  const [upgradedOuter] = upgradedHeader.nodes;
  const [upgradedInner] = upgradedOuter.children;
  assert.equal(upgradedOuter.layout, 'row');
  assert.equal(upgradedInner.layout, 'flow');
  assert.equal(upgradedOuter.visualStyle.padding, '0px');
  assert.equal(upgradedInner.children[1].id, 'tt5-header-2-reference');
  const upgradedNavigation = walk(upgradedHeader.nodes).find(node => node.element === 'navigation');
  assert.equal(upgradedNavigation.id, 'tt5-header-2');
  assert.equal(upgradedNavigation.pageListBlock.type, 'navigation-page-list');
  assert.deepEqual(upgraded.navigation, before.navigation);
  assert.deepEqual(upgraded.parts.filter(item => item.id !== 'tt5-header'), before.parts.filter(item => item.id !== 'tt5-header'));
  const projectedNavigation = walk(templateEditorBlocks(header(upgraded).nodes, upgraded)).find(block => block.type === 'group' && block.data?.templateElement === 'navigation');
  assert.equal(projectedNavigation.children[0].type, 'navigation-page-list');
  assert.deepEqual(upgradeReferenceTemplateParts(upgraded), upgraded);
  assert.deepEqual(set, before);
});

test('authored Header transformations and explicit inherited-looking font values remain untouched', () => {
  const set = createReferenceTemplateParts('accuracy3');
  const part = header(set);
  part.nodes[0].id = 'authored-header-shell';
  part.nodes[0].layout = 'row';
  part.nodes[0].visualStyle = { fontFamily: 'site-manrope', className: 'tt5-header-shell' };
  part.nodes[0].children[0].layout = 'flow';
  const before = structuredClone(part);
  assert.deepEqual(header(upgradeReferenceTemplateParts(set)), before);
});

test('only an exact previous Header spacing seed adopts the inherited theme gap', () => {
  const previous = createReferenceTemplateParts('header-layout-v2');
  const oldRow = header(previous).nodes[0].children[0].children[0];
  assert.equal(oldRow.gap, 0);
  const next = upgradeReferenceTemplateParts(previous);
  assert.equal(header(next).nodes[0].gap, undefined);
  assert.equal(header(next).nodes[0].children[0].gap, undefined);
  assert.equal(header(next).nodes[0].children[0].children[1].gap, 10);
  assert.deepEqual(next.parts.filter(part => part.id !== 'tt5-header'), previous.parts.filter(part => part.id !== 'tt5-header'));
  const customised = structuredClone(previous);
  header(customised).nodes[0].children[0].children[0].horizontalAlign = 'left';
  const customisedUpgrade = header(upgradeReferenceTemplateParts(customised));
  const [outer] = customisedUpgrade.nodes;
  const [inner] = outer.children;
  assert.equal(outer.layout, 'row');
  assert.equal(inner.layout, 'flow');
  assert.equal(inner.horizontalAlign, 'left');
  assert.equal(walk(customisedUpgrade.nodes).find(node => node.element === 'navigation').pageListBlock.type, 'navigation-page-list');
});

test('Header theme widths inherit through canonical layout rules without forcing flex or Grid children wide', () => {
  const css = readFileSync(new URL('../app/studio/templates.css', import.meta.url), 'utf8');
  assert.match(css, /\.template-group\.tt5-header-shell\s*\{\s*--block-content-size: 645px; --block-wide-size: 1340px;/);
  assert.doesNotMatch(css, /\.tt5-header-shell\s*>\s*div\s*[,{]/);
});

test('explicit reset restores the Header structure and preserves existing menu node identity and data', () => {
  const set = createReferenceTemplateParts('accuracy3');
  const part = header(set);
  part.name = 'My Header';
  part.nodes[0].layout = 'grid';
  part.nodes[0].visualStyle.fontFamily = 'site-manrope';
  const navigation = walk(part.nodes).find(node => node.element === 'navigation');
  navigation.id = 'saved-navigation';
  set.navigation = [{ id: 'kept-page', label: 'Keep this page', url: '/kept-page' }];
  const before = structuredClone(set);
  const reset = resetReferenceTemplatePart(set, part.id);
  assert.equal(header(reset).nodes[0].layout, 'row');
  assert.equal(header(reset).name, 'My Header');
  assert.equal(walk(header(reset).nodes).find(node => node.element === 'navigation').id, 'saved-navigation');
  assert.deepEqual(reset.navigation, before.navigation);
  assert.deepEqual(reset.parts.filter(part => part.id !== 'tt5-header'), before.parts.filter(part => part.id !== 'tt5-header'));
  assert.deepEqual(set, before);
  const ids = walk(header(reset).nodes).map(node => node.id);
  assert.equal(new Set(ids).size, ids.length);
});
