import assert from 'node:assert/strict';
import test from 'node:test';
import { commitLocalPublication, readPublicationWorkspace, recoverPendingPublication } from '../app/content/publication-recovery.ts';
import { LOCAL_WORKSPACE_KEY as workspaceKey, LOCAL_PUBLICATIONS_KEY as publicationKey, PUBLICATION_JOURNAL_KEY as journalKey } from '../app/content/local-storage-keys.ts';

function storageFixture() {
  const values = new Map([[workspaceKey, 'original workspace'], [publicationKey, '{"posts":[]}']]);
  const writes = [];
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) { writes.push(key); values.set(key, value); },
    removeItem(key) { writes.push(key); values.delete(key); },
  };
  return { values, writes, storage };
}
const journal = (previousWorkspace = 'original workspace') => ({ version: 1, operationId: crypto.randomUUID(), previousWorkspace });

for (const published of [false, true]) test(`recovery ${published ? 'finishes a committed pair' : 'rolls back an incomplete pair'} without a peer writing`, () => {
  const f = storageFixture(), record = journal();
  f.values.set(journalKey, JSON.stringify(record));
  f.values.set(workspaceKey, 'new workspace');
  if (published) f.values.set(publicationKey, JSON.stringify({ posts: [], publicationCommitId: record.operationId }));
  const publication = f.storage.getItem(publicationKey);
  assert.equal(readPublicationWorkspace(f.storage), published ? 'new workspace' : 'original workspace');
  assert.deepEqual(f.writes, []);
  assert.throws(() => recoverPendingPublication(f.storage, () => false), /requires the Studio writer/);
  assert.deepEqual(f.writes, []);
  recoverPendingPublication(f.storage, () => true);
  assert.equal(f.storage.getItem(workspaceKey), published ? 'new workspace' : 'original workspace');
  assert.equal(f.storage.getItem(publicationKey), publication);
  assert.equal(f.storage.getItem(journalKey), null);
});

for (const failedKey of [journalKey, workspaceKey, publicationKey]) test(`failed transaction write to ${failedKey} preserves the original pair`, () => {
  const f = storageFixture();
  const set = f.storage.setItem;
  f.storage.setItem = (key, value) => { if (key === failedKey) throw new Error('Storage full'); set(key, value); };
  assert.throws(() => commitLocalPublication(f.storage, 'next workspace', { posts: ['next'] }, () => true), /Storage full/);
  assert.equal(f.storage.getItem(workspaceKey), 'original workspace');
  assert.equal(f.storage.getItem(publicationKey), '{"posts":[]}');
  assert.equal(f.storage.getItem(journalKey), null);
});

test('successful transaction exposes the new pair and preserves it after cleanup retry', () => {
  const f = storageFixture();
  const remove = f.storage.removeItem;
  f.storage.removeItem = () => { throw new Error('Cleanup unavailable'); };
  assert.equal(commitLocalPublication(f.storage, 'next workspace', { posts: ['next'] }, () => true), false);
  assert.equal(readPublicationWorkspace(f.storage), 'next workspace');
  assert.deepEqual(JSON.parse(f.storage.getItem(publicationKey)).posts, ['next']);
  f.storage.removeItem = remove;
  recoverPendingPublication(f.storage, () => true);
  assert.equal(f.storage.getItem(workspaceKey), 'next workspace');
  assert.equal(f.storage.getItem(journalKey), null);
});

test('failed rollback retains its recovery record and can be retried', () => {
  const f = storageFixture();
  const set = f.storage.setItem;
  f.storage.setItem = (key, value) => {
    if (key === publicationKey || key === workspaceKey && value === 'original workspace') throw new Error('Storage unavailable');
    set(key, value);
  };
  assert.throws(() => commitLocalPublication(f.storage, 'next workspace', { posts: ['next'] }, () => true), AggregateError);
  assert.equal(readPublicationWorkspace(f.storage), 'original workspace');
  assert.notEqual(f.storage.getItem(journalKey), null);
  f.storage.setItem = set;
  recoverPendingPublication(f.storage, () => true);
  assert.equal(f.storage.getItem(workspaceKey), 'original workspace');
});

test('recovery restores an absent workspace without inventing one', () => {
  const f = storageFixture();
  f.values.set(journalKey, JSON.stringify(journal(null)));
  f.values.set(workspaceKey, 'interrupted first publication');
  assert.equal(readPublicationWorkspace(f.storage), null);
  recoverPendingPublication(f.storage, () => true);
  assert.equal(f.storage.getItem(workspaceKey), null);
});

for (const raw of ['{broken', JSON.stringify({ version: 2 }), JSON.stringify({ ...journal(), previousWorkspace: 42 })]) test(`invalid journal stays intact: ${raw.slice(0, 20)}`, () => {
  const f = storageFixture(); f.values.set(journalKey, raw);
  assert.throws(() => recoverPendingPublication(f.storage, () => true));
  assert.deepEqual(f.writes, []);
  assert.equal(f.storage.getItem(journalKey), raw);
});

test('a second transaction cannot replace an uncleared recovery record', () => {
  const f = storageFixture(), original = JSON.stringify(journal());
  f.values.set(journalKey, original);
  f.storage.removeItem = () => { throw new Error('Cleanup unavailable'); };
  assert.throws(() => commitLocalPublication(f.storage, 'next', { posts: ['next'] }, () => true), /Cleanup unavailable/);
  assert.equal(f.storage.getItem(journalKey), original);
  assert.equal(f.storage.getItem(workspaceKey), 'original workspace');
});
