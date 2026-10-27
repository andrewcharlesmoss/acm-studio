import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { loadProductionModule } from './production-module.mjs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const source = readFileSync(new URL('../app/studio/studio-canvas.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('canvas.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const commands = new Map();
function visit(node) {
  if (ts.isFunctionDeclaration(node) && ['setTitleLevel', 'setTitleAlignment', 'titleToolbarAlignment', 'TextAlignmentControl'].includes(node.name?.text)) commands.set(node.name.text, node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
const code = ts.transpileModule([...commands.values()].join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
const templates = await loadProductionModule(new URL('../app/studio/template-model.ts', import.meta.url));
const validation = await loadProductionModule(new URL('../app/studio/workspace-validation.ts', import.meta.url));
const { projectWebsiteDesignBlocks } = await loadProductionModule(new URL('../app/studio/site-editor/website-design-surface.tsx', import.meta.url));
const { effectivePreviewBlockStyle } = await loadProductionModule(new URL('../app/studio/site-editor/blocks-preview-model.ts', import.meta.url));
const { previewStyleDetails, createStylesPreview, resolvePreviewStyle } = await loadProductionModule(new URL('../app/studio/site-editor/styles-preview-state.ts', import.meta.url));
const { resolvedTypographyFields } = await loadProductionModule(new URL('../app/studio/site-editor/typography-preview-model.ts', import.meta.url));
const defaultSelection = () => resolvePreviewStyle(createStylesPreview().present, 'global');

function harness(initial, deferred = false) {
  let block = initial;
  const pending = [];
  const scope = {
    writableRef: { current: true }, currentDocumentRef: { current: { id: 'doc' } },
    websiteDesign: null, styleViewport: 'desktop', projectWebsiteDesignBlocks, effectivePreviewBlockStyle, previewStyleDetails, resolvedTypographyFields,
    React, useRef: React.useRef, preserveTextSelection() {},
    StudioHoverIcon: ({ name }) => React.createElement('span', { 'data-icon': name }),
    AlignmentIcon: ({ align }) => React.createElement('span', { 'data-alignment': align }),
    StudioAnchoredMenu: ({ children }) => React.createElement('div', { role: 'menu' }, children),
    onUpdateBlock(id, update) { if (id === block.id) { if (deferred) pending.push(update); else block = update(block); } },
    setAlignmentMenuBlockId() {},
  };
  runInNewContext(code, scope);
  return { scope, block: () => block, retype: value => { block = value; }, flush: () => { for (const update of pending) block = update(block); } };
}

const title = () => ({ id: 'title', type: 'document-title', isLink: true, linkTarget: '_blank', rel: 'nofollow', blockAlign: 'wide', visualStyle: { anchor: 'title-anchor', textColor: '#123456' }, editorial: { lock: { move: true, remove: true } } });

test('actual Title toolbar commands retain metadata, support every level and round-trip template projection', () => {
  for (const level of [0, 1, 2, 3, 4, 5, 6]) {
    const original = title(); const h = harness(original);
    h.scope.setTitleLevel('title', 'doc', level);
    h.scope.setTitleAlignment('title', 'doc', 'right');
    const block = h.block();
    assert.equal(block.level ?? 2, level);
    assert.equal(block.align, 'right');
    for (const key of ['id', 'isLink', 'linkTarget', 'rel', 'blockAlign', 'visualStyle', 'editorial']) assert.deepEqual(block[key], original[key]);
    assert.equal(validation.validContentBlocks([block]), true);
    const restored = templates.templateEditorBlocks(templates.templateNodesFromBlocks([block]))[0];
    assert.deepEqual(JSON.parse(JSON.stringify(restored)), JSON.parse(JSON.stringify(block)));
  }
});

test('Title no-ops preserve identity but explicit Left can override inherited alignment', () => {
  const original = title(); const h = harness(original);
  h.scope.setTitleLevel('title', 'doc', 2);
  assert.equal(h.block(), original);
  h.scope.setTitleAlignment('title', 'doc', 'left');
  assert.notEqual(h.block(), original);
  assert.equal(h.block().align, 'left');
  const explicit = h.block();
  h.scope.setTitleAlignment('title', 'doc', 'left');
  assert.equal(h.block(), explicit);
});

test('actual Title toolbar resolves inherited website alignment and explicit Left restores authored precedence', () => {
  const h = harness(title());
  h.scope.websiteDesign = { design: { styles: { ...defaultSelection(), blockStyles: { 'document-title': { textAlign: 'center', previewResponsive: { mobile: { textAlign: 'right' } } } } } } };
  assert.equal(h.scope.titleToolbarAlignment(h.block()), 'centre');
  h.scope.styleViewport = 'mobile';
  assert.equal(h.scope.titleToolbarAlignment(h.block()), 'right');
  h.scope.setTitleAlignment('title', 'doc', 'left');
  assert.equal(h.scope.titleToolbarAlignment(h.block()), 'left');
  const projected = projectWebsiteDesignBlocks([h.block()], h.scope.websiteDesign.design.styles)[0];
  assert.match(projected.visualStyle.className, /site-block-authored-text-align/);
  assert.equal(projected.align, 'left');
});

test('Title toolbar follows its current Typography role with block/device/explicit precedence', () => {
  const h = harness(title());
  const styles = { ...defaultSelection(), typography: { elements: { text: { align: 'left' }, headings: { align: 'center' }, h3: { align: 'right' } } } };
  h.scope.websiteDesign = { design: { styles } };
  assert.equal(h.scope.titleToolbarAlignment(h.block()), 'centre');
  h.scope.setTitleLevel('title', 'doc', 3);
  assert.equal(h.scope.titleToolbarAlignment(h.block()), 'right');
  h.scope.setTitleLevel('title', 'doc', 0);
  assert.equal(h.scope.titleToolbarAlignment(h.block()), 'left');
  h.scope.setTitleLevel('title', 'doc', 3);
  styles.blockStyles = { 'document-title': { textAlign: 'center', previewResponsive: { mobile: { textAlign: 'left' } } } };
  assert.equal(h.scope.titleToolbarAlignment(h.block()), 'centre');
  h.scope.styleViewport = 'mobile';
  assert.equal(h.scope.titleToolbarAlignment(h.block()), 'left');
  h.scope.setTitleAlignment('title', 'doc', 'right');
  assert.equal(h.scope.titleToolbarAlignment(h.block()), 'right');
});

test('inherited Justify is displayed accurately without selecting an unsupported stored value', () => {
  const h = harness(title());
  h.scope.websiteDesign = { design: { styles: { ...defaultSelection(), typography: { elements: { headings: { align: 'justify' } } } } } };
  const alignment = h.scope.titleToolbarAlignment(h.block());
  assert.equal(alignment, 'justify');
  const html = renderToStaticMarkup(React.createElement(h.scope.TextAlignmentControl, { block: h.block(), alignment, writable: true, open: true, onChoose() {}, onOpenChange() {} }));
  assert.match(html, /data-icon="text.justify"/);
  assert.equal((html.match(/aria-checked="false"/g) ?? []).length, 3);
  assert.doesNotMatch(html, /aria-checked="true"/);
});

test('Title commands refuse stale documents, lost ownership and retyped deferred targets', () => {
  for (const method of ['setTitleLevel', 'setTitleAlignment']) {
    const value = method === 'setTitleLevel' ? 3 : 'centre';
    for (const deferred of [false, true]) {
      const h = harness(title(), deferred); const original = h.block();
      if (deferred) h.scope[method]('title', 'doc', value);
      h.scope.currentDocumentRef.current.id = 'other';
      if (!deferred) h.scope[method]('title', 'doc', value);
      h.flush(); assert.equal(h.block(), original);
      const readonly = harness(title(), deferred); const baseline = readonly.block();
      if (deferred) readonly.scope[method]('title', 'doc', value);
      readonly.scope.writableRef.current = false;
      if (!deferred) readonly.scope[method]('title', 'doc', value);
      readonly.flush(); assert.equal(readonly.block(), baseline);
    }
    const h = harness(title(), true);
    h.scope[method]('title', 'doc', value);
    const paragraph = { id: 'title', type: 'paragraph', text: 'Replacement' };
    h.retype(paragraph); h.flush(); assert.equal(h.block(), paragraph);
  }
});
