import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
import { queryPosts } from '../app/content/post-query.ts';
const { BlockRenderer } = await loadProductionModule(new URL('../app/components/blocks/block-renderer.tsx', import.meta.url));

const posts = [
  { id: 'b', title: 'B', href: '/b', publishedAt: '2026-01-01T00:00:00Z' },
  { id: 'a', title: 'A', href: '/a', publishedAt: '2026-01-01T00:00:00Z' },
  { id: 'c', title: 'C', href: '/c', publishedAt: '2026-02-01T00:00:00Z' },
  { id: 'bad', title: 'Bad', href: '/bad', publishedAt: 'invalid' },
];
test('post queries order and bound eligible host-supplied posts without mutating them', () => {
  assert.deepEqual(queryPosts(posts, { count: 2, order: 'desc' }).map(post => post.id), ['c', 'a']);
  assert.deepEqual(queryPosts(posts, { count: 10, order: 'asc' }).map(post => post.id), ['a', 'b', 'c']);
  assert.equal(posts[0].id, 'b');
  assert.deepEqual(queryPosts(posts, { count: NaN, order: 'desc' }), []);
});

test('sticky-first preserves date order within each sticky group and remains count bounded', () => {
  const mixed = [
    { id: 'old', title: 'Old', href: '/old', publishedAt: '2025-01-01T00:00:00Z' },
    { id: 'sticky-old', title: 'Sticky old', href: '/sticky-old', publishedAt: '2024-01-01T00:00:00Z', sticky: true },
    { id: 'sticky-new', title: 'Sticky new', href: '/sticky-new', publishedAt: '2026-01-01T00:00:00Z', sticky: true },
  ];
  assert.deepEqual(queryPosts(mixed, { count: 2, order: 'desc', stickyFirst: true }).map(post => post.id), ['sticky-new', 'sticky-old']);
  assert.deepEqual(queryPosts(mixed, { count: 2, order: 'asc', stickyFirst: true }).map(post => post.id), ['sticky-old', 'sticky-new']);
  assert.deepEqual(queryPosts(mixed, { count: 1000, order: 'desc' }), queryPosts(mixed, { count: 100, order: 'desc' }));
});

test('the Query Loop renderer repeats post fields as links and renders its empty state only when needed', () => {
  const block = { id: 'query', type: 'query-loop', count: 2, order: 'desc', stickyFirst: true, children: [
    { id: 'template', type: 'post-template', children: [
      { id: 'title', type: 'title', level: 2, isLink: true },
      { id: 'date', type: 'post-date', format: 'iso', isLink: true, showIcon: false },
    ] },
    { id: 'empty', type: 'no-results', children: [{ id: 'empty-text', type: 'paragraph', text: 'No matching posts.' }] },
  ] };
  const candidates = [
    { id: 'ordinary', title: 'Ordinary', href: '/posts/ordinary', publishedAt: '2026-05-01T10:00:00Z' },
    { id: 'sticky', title: 'Sticky', href: '/posts/sticky', publishedAt: '2026-04-01T10:00:00Z', sticky: true },
  ];
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], queryCandidates: candidates, variant: 'article' }));
  assert.ok(html.indexOf('Sticky') < html.indexOf('Ordinary'));
  assert.match(html, /href="\/posts\/sticky"/);
  assert.match(html, /dateTime="2026-04-01T10:00:00Z"/);
  assert.doesNotMatch(html, /No matching posts/);
  const empty = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], queryCandidates: [], variant: 'article' }));
  assert.match(empty, /No matching posts/);
});

test('static Query Loops retain a bounded inert schedule candidate and the live empty state', () => {
  const block = { id: 'query', type: 'query-loop', count: 1, order: 'desc', stickyFirst: true, children: [
    { id: 'template', type: 'post-template', children: [{ id: 'title', type: 'title', level: 2, isLink: true }] },
    { id: 'empty', type: 'no-results', children: [{ id: 'empty-text', type: 'paragraph', text: 'No matching posts.' }] },
  ] };
  const future = Date.now() + 60_000;
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], queryCandidates: [{ id: 'scheduled', title: 'Scheduled', href: '/posts/scheduled', publishedAt: new Date(future).toISOString(), availableAt: future }], staticQuerySchedule: true, variant: 'article' }));
  assert.match(html, /data-query-count="1"/);
  assert.match(html, /data-query-no-results/);
  assert.match(html, /<template data-query-scheduled-candidate="\d+">/);
  assert.ok(html.indexOf('<template data-query-scheduled-candidate=') < html.indexOf('data-query-post-id="scheduled"'));
});
