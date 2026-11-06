import { test } from 'node:test';
import assert from 'node:assert/strict';
import { patternPage } from '../app/studio/site-editor/patterns-view-model.mjs';

test('pattern views preserve reference order and sort without mutating originals', () => {
  const entries = ['Footer Columns', 'Footer Newsletter', 'Footer', 'Header'].map(name => ({ entry: { name } }));
  const names = result => result.items.map(item => item.entry.name);
  assert.deepEqual(names(patternPage(entries, 'reference', 1, 20)), ['Footer Columns', 'Footer Newsletter', 'Footer', 'Header']);
  assert.deepEqual(names(patternPage(entries, 'asc', 1, 20)), ['Footer', 'Footer Columns', 'Footer Newsletter', 'Header']);
  assert.deepEqual(names(patternPage(entries, 'desc', 1, 20)), ['Header', 'Footer Newsletter', 'Footer Columns', 'Footer']);
  assert.equal(entries[0].entry.name, 'Footer Columns');
  const last = patternPage(entries, 'reference', 9, 3);
  assert.equal(last.currentPage, 2);
  assert.deepEqual(names(last), ['Header']);
  assert.deepEqual(patternPage([], 'reference', 1, 20).items, []);
});

test('author sorting retains stable order for equal authors and supports both directions', () => {
  const entries = [{ entry: { name: 'One' }, author: 'Zebra' }, { entry: { name: 'Two' }, author: 'Alpha' }, { entry: { name: 'Three' }, author: 'Alpha' }];
  const names = result => result.items.map(item => item.entry.name);
  assert.deepEqual(names(patternPage(entries, 'asc', 1, 20, 'author')), ['Two', 'Three', 'One']);
  assert.deepEqual(names(patternPage(entries, 'desc', 1, 20, 'author')), ['One', 'Two', 'Three']);
  assert.deepEqual(names(patternPage(entries, 'reference', 1, 20, 'author')), ['One', 'Two', 'Three']);
});
