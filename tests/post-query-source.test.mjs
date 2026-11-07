import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixtureQueryPostSummaries, nextFixtureQueryPostBoundary } from '../app/studio/post-query-source.ts';
import { loadProductionModule } from './production-module.mjs';
const { validContentBlocks } = await loadProductionModule(new URL('../app/studio/workspace-validation.ts', import.meta.url));
const base = { kind: 'post', title: 'Post', updatedAt: '2026-01-01T00:00:00Z', publishedAt: '2026-01-01T00:00:00Z' };
test('fixture query source never exposes private, protected, future or page records in public output', () => {
  const documents = [
    { ...base, id: 'published', status: 'published' },
    { ...base, id: 'draft', status: 'draft' },
    { ...base, id: 'private', status: 'private' },
    { ...base, id: 'protected', status: 'published', passwordProtection: {} },
    { ...base, id: 'future', status: 'scheduled', publishAt: '2027-01-01T00:00:00Z' },
    { ...base, id: 'page', kind: 'page', status: 'published' },
  ];
  const publications = documents.map(document => ({ document }));
  const activeIds = new Set(documents.map(document => document.id));
  const href = document => `/#${document.id}`;
  assert.deepEqual(fixtureQueryPostSummaries(publications, activeIds, href, { now: Date.parse('2026-06-01T00:00:00Z') }).map(item => item.id), ['published']);
  assert.deepEqual(fixtureQueryPostSummaries(publications, activeIds, href, { now: Date.parse('2028-01-01T00:00:00Z') }).map(item => item.id), ['future', 'published']);
  activeIds.delete('published');
  assert.deepEqual(fixtureQueryPostSummaries(publications, activeIds, href, { now: Date.parse('2026-06-01T00:00:00Z') }), []);
});

test('scheduled post boundary refresh ignores removed, protected and page publications', () => {
  const now = Date.parse('2026-06-01T00:00:00Z');
  const publications = [
    { document: { ...base, id: 'first', status: 'scheduled', publishAt: '2026-06-02T00:00:00Z' } },
    { document: { ...base, id: 'second', status: 'scheduled', publishAt: '2026-06-03T00:00:00Z' } },
    { document: { ...base, id: 'protected', status: 'scheduled', publishAt: '2026-06-01T01:00:00Z', passwordProtection: {} } },
    { document: { ...base, id: 'page', kind: 'page', status: 'scheduled', publishAt: '2026-06-01T00:30:00Z' } },
  ];
  assert.equal(nextFixtureQueryPostBoundary(publications, new Set(publications.map(item => item.document.id)), { now }), Date.parse('2026-06-02T00:00:00Z'));
  assert.equal(nextFixtureQueryPostBoundary(publications, new Set(['second']), { now }), Date.parse('2026-06-03T00:00:00Z'));
  assert.equal(nextFixtureQueryPostBoundary(publications, new Set(), { now }), null);
});

test('static Query Loop candidates include only bounded future scheduled posts with their publication boundary', () => {
  const now = Date.parse('2026-06-01T00:00:00Z');
  const documents = [
    { ...base, id: 'first', status: 'scheduled', publishAt: '2026-06-02T00:00:00Z' },
    { ...base, id: 'second', status: 'scheduled', publishAt: '2026-06-03T00:00:00Z' },
    { ...base, id: 'private', status: 'private', publishAt: '2026-06-02T00:00:00Z' },
  ];
  const active = new Set(documents.map(item => item.id));
  const candidates = fixtureQueryPostSummaries(documents.map(document => ({ document })), active, document => `/#${document.id}`, { now, includeFutureScheduled: true, maxCandidates: 1 });
  assert.deepEqual(candidates.map(item => item.id), ['second']);
  assert.equal(candidates[0].availableAt, Date.parse('2026-06-03T00:00:00Z'));
});

test('query validation does not consume Post Template and No Results children', () => {
  const tree = [{ id: 'query', type: 'query-loop', count: 4, order: 'desc', children: [
    { id: 'template', type: 'post-template', children: [{ id: 'title', type: 'title', level: 2, isLink: true }] },
    { id: 'empty', type: 'no-results', children: [{ id: 'message', type: 'paragraph', text: 'No posts.' }] },
  ] }];
  const before = structuredClone(tree);
  assert.equal(validContentBlocks(tree), true);
  assert.deepEqual(tree, before);
});
