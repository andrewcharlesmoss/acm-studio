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
  if (ts.isFunctionDeclaration(node) && ['setReadingTimeMode', 'setReadingTimeAlignment', 'metadataToolbarAlignment', 'TextAlignmentControl'].includes(node.name?.text)) commands.set(node.name.text, node.getText(ast));
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

const reading = () => ({ id: 'reading', type: 'reading-time', prefix: 'About', showRange: false, presentation: 'plain', visualStyle: { anchor: 'reading-anchor', textColor: '#123456' }, editorial: { lock: { move: true, remove: true } } });

test('Time to Read mode and alignment preserve metadata and existing template/package/clipboard contracts', async () => {
  const { validateTemplatePackage } = await loadProductionModule(new URL('../app/studio/template-package.ts', import.meta.url));
  const clipboard = await loadProductionModule(new URL('../app/studio/block-clipboard.ts', import.meta.url));
  for (const mode of ['time', 'words']) {
    const original = reading(); const h = harness(original);
    h.scope.setReadingTimeMode('reading', 'doc', mode);
    h.scope.setReadingTimeAlignment('reading', 'doc', 'right');
    const block = h.block();
    assert.equal(block.mode ?? 'time', mode);
    assert.equal(block.align, 'right');
    for (const key of ['id', 'prefix', 'showRange', 'presentation', 'visualStyle', 'editorial']) assert.deepEqual(block[key], original[key]);
    assert.equal(validation.validContentBlocks([block]), true);
    const nodes = templates.templateNodesFromBlocks([block]);
    const restored = templates.templateEditorBlocks(nodes)[0];
    assert.deepEqual(JSON.parse(JSON.stringify(restored)), JSON.parse(JSON.stringify(block)));
    const set = templates.createTemplateSet('Reading example'); set.parts[0].nodes = nodes;
    const pkg = validateTemplatePackage({ format: 'acm-studio-template-set', version: templates.TEMPLATE_VERSION, set, media: [] });
    assert.equal(templates.templateEditorBlocks(pkg.set.parts[0].nodes)[0].mode ?? 'time', mode);
    const html = clipboard.blockClipboardHtml([block]);
    const encoded = /data-acm-studio-blocks="([^"]*)"/.exec(html)[1].replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
    const originalParser = globalThis.DOMParser;
    try {
      globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => encoded }) }; } };
      assert.deepEqual(JSON.parse(JSON.stringify(clipboard.readBlockClipboardPayload(html).blocks[0])), JSON.parse(JSON.stringify(block)));
    } finally { globalThis.DOMParser = originalParser; }
  }
});

test('Time to Read default mode and repeated explicit alignment are no-ops, while Left can override inheritance', () => {
  const original = reading(); const h = harness(original);
  h.scope.setReadingTimeMode('reading', 'doc', 'time'); assert.equal(h.block(), original);
  h.scope.setReadingTimeAlignment('reading', 'doc', 'left'); assert.notEqual(h.block(), original);
  const explicit = h.block();
  h.scope.setReadingTimeAlignment('reading', 'doc', 'left'); assert.equal(h.block(), explicit);
  h.scope.setReadingTimeMode('reading', 'doc', 'words'); const words = h.block();
  h.scope.setReadingTimeMode('reading', 'doc', 'words'); assert.equal(h.block(), words);
});

test('Time to Read alignment follows text role, block/device and explicit overrides without falsely selecting Justify', () => {
  const h = harness(reading());
  const styles = { ...defaultSelection(), typography: { elements: { text: { align: 'center' }, headings: { align: 'right' } } } };
  h.scope.websiteDesign = { design: { styles } };
  assert.equal(h.scope.metadataToolbarAlignment(h.block()), 'centre');
  styles.blockStyles = { 'reading-time': { textAlign: 'right', previewResponsive: { mobile: { textAlign: 'justify' } } } };
  assert.equal(h.scope.metadataToolbarAlignment(h.block()), 'right');
  h.scope.styleViewport = 'mobile';
  const alignment = h.scope.metadataToolbarAlignment(h.block()); assert.equal(alignment, 'justify');
  const html = renderToStaticMarkup(React.createElement(h.scope.TextAlignmentControl, { block: h.block(), alignment, writable: true, open: true, onChoose() {}, onOpenChange() {} }));
  assert.match(html, /data-icon="text.justify"/); assert.equal((html.match(/aria-checked="false"/g) ?? []).length, 3);
  h.scope.setReadingTimeAlignment('reading', 'doc', 'left'); assert.equal(h.scope.metadataToolbarAlignment(h.block()), 'left');
});

test('Time to Read commands refuse stale documents, lost ownership and deferred retyped targets', () => {
  for (const [method, value] of [['setReadingTimeMode', 'words'], ['setReadingTimeAlignment', 'centre']]) {
    for (const deferred of [false, true]) {
      for (const refusal of ['document', 'readonly', 'retyped']) {
        const h = harness(reading(), deferred); const original = h.block();
        if (deferred) h.scope[method]('reading', 'doc', value);
        if (refusal === 'document') h.scope.currentDocumentRef.current.id = 'other';
        if (refusal === 'readonly') h.scope.writableRef.current = false;
        const paragraph = { id: 'reading', type: 'paragraph', text: 'Replacement' };
        if (refusal === 'retyped') h.retype(paragraph);
        if (!deferred) h.scope[method]('reading', 'doc', value);
        h.flush(); assert.equal(h.block(), refusal === 'retyped' ? paragraph : original);
      }
    }
  }
});
