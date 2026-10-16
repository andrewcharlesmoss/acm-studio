import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { loadProductionModule } from './production-module.mjs';

const { templateNeedsPreviewContent } = await loadProductionModule(new URL('../app/studio/template-preview-content.ts', import.meta.url));
const element = name => ({ id: name, type: 'element', element: name });
const target = (kind, nodes = []) => ({ id: 'target', name: kind, kind, nodes });
const needs = (kind, nodes = [], parts = []) => templateNeedsPreviewContent(target(kind, nodes), { parts });

test('Page and Post templates always offer content; overlay editors retain their existing selector', () => {
  for (const kind of ['page', 'post', 'overlay']) assert.equal(needs(kind), true);
});

test('site-only and static Header/Footer content does not offer document selection', () => {
  const nodes = ['site-identity', 'navigation', 'copyright', 'social-links'].map(element);
  nodes.push({ id: 'text', type: 'paragraph', text: 'A static heading' });
  for (const kind of ['header', 'footer']) {
    assert.equal(needs(kind), false);
    assert.equal(needs(kind, nodes), false);
    assert.equal(needs(kind, [{ id: 'group', type: 'group', children: nodes }]), false);
  }
});

test('all document template elements and ordinary document display blocks require content', () => {
  for (const kind of ['header', 'footer']) {
    for (const name of ['document-title', 'subtitle', 'cover-image', 'post-metadata', 'content']) assert.equal(needs(kind, [element(name)]), true, `${kind}: ${name}`);
    for (const type of ['document-title', 'document-subtitle', 'cover-image', 'post-author', 'post-date', 'reading-time']) assert.equal(needs(kind, [{ id: type, type }]), true, `${kind}: ${type}`);
    assert.equal(needs(kind, [{ ...element('cover-image'), fixedImage: { src: '/fixed.png', alt: '' } }]), true);
    assert.equal(needs(kind, [{ ...element('document-title'), editorial: { hidden: true } }]), true);
  }
});

test('canonical nested containers and shared-part/overlay references reveal document dependencies', () => {
  let node = { id: 'author', type: 'post-author' };
  for (const type of ['quote', 'column', 'columns', 'section', 'group']) node = { id: type, type, children: [node] };
  assert.equal(needs('header', [node]), true);
  const parts = [target('header', [{ id: 'second-ref', type: 'part', partId: 'second' }]), { id: 'second', kind: 'footer', nodes: [element('subtitle')] }];
  parts[0].id = 'first';
  assert.equal(needs('footer', [{ id: 'ref', type: 'part', partId: 'first' }], parts), true);
  assert.equal(needs('header', [{ ...element('navigation'), overlayPartId: 'second' }], parts), true);
});

test('missing references and cycles terminate, while a dependency elsewhere in a cycle is retained', () => {
  const nodes = [{ id: 'ref', type: 'part', partId: 'other' }];
  const part = { id: 'other', kind: 'footer', nodes: [{ id: 'back', type: 'part', partId: 'target' }] };
  assert.equal(needs('header', nodes, [part]), false);
  assert.equal(needs('header', [{ id: 'missing', type: 'part', partId: 'missing' }]), false);
  part.nodes.push(element('document-title'));
  assert.equal(needs('header', nodes, [part]), true);
});

test('decisions follow current target and referenced content without retaining stale state', () => {
  const part = { id: 'part', kind: 'footer', nodes: [] };
  const nodes = [{ id: 'ref', type: 'part', partId: part.id }];
  assert.equal(needs('header', nodes, [part]), false);
  part.nodes.push(element('document-title'));
  assert.equal(needs('header', nodes, [part]), true);
  part.nodes.length = 0;
  assert.equal(needs('header', nodes, [part]), false);
  nodes.push(element('content'));
  assert.equal(needs('header', nodes, [part]), true);
  nodes.pop();
  assert.equal(needs('header', nodes, [part]), false);
});

test('production TemplateEditor guards only the content selector using the current target and set', () => {
  const source = readFileSync(new URL('../app/studio/template-editor.tsx', import.meta.url), 'utf8');
  assert.match(source, /\{previewControls\}\s*\{templateNeedsPreviewContent\(target, set\) \? <label>Preview Content/);
  assert.match(source, /No pages or posts yet<\/option>\}<\/SelectControl><\/label> : null\}/);
});
