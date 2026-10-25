import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';

const { useStudioBlockCommands } = await loadProductionModule(new URL('../app/studio/use-studio-block-commands.ts', import.meta.url));

function fixture(blocks) {
  let document = { id: 'document', kind: 'page', title: 'Fixture', blocks };
  let writes = 0;
  const commands = useStudioBlockCommands({
    activeDocument: document,
    updateActiveDocument(update) {
      writes += 1;
      document = update(document);
    },
  });
  return { commands, get document() { return document; }, get writes() { return writes; } };
}

const paragraph = (id, text = '') => ({ id, type: 'paragraph', text });

test('Return in an empty terminal Paragraph creates another empty Paragraph', () => {
  const state = fixture([paragraph('before', 'Text'), paragraph('empty')]);

  assert.ok(state.commands.splitParagraph('empty', [], []));
  assert.equal(state.writes, 1);
  assert.deepEqual(state.document.blocks.map(block => block.text), ['Text', '', '']);
});

test('Return still splits a non-empty terminal Paragraph and allows intentional interior blank blocks', () => {
  const state = fixture([paragraph('text', 'words')]);
  const nextId = state.commands.splitParagraph('text', [{ text: 'word' }], [{ text: 's' }]);

  assert.ok(nextId);
  assert.deepEqual(state.document.blocks.map(block => block.text), ['word', 's']);

  const interior = fixture([paragraph('first', 'Before'), paragraph('blank'), paragraph('last', 'After')]);
  assert.ok(interior.commands.splitParagraph('blank', [], []));
  assert.deepEqual(interior.document.blocks.map(block => block.text), ['Before', '', '', 'After']);
});

test('Return in the last empty Paragraph inside a Group creates another child', () => {
  const group = { id: 'group', type: 'group', layout: 'flow', children: [paragraph('child', '')] };
  const state = fixture([group]);

  assert.ok(state.commands.splitParagraph('child', [], []));
  assert.equal(state.writes, 1);
  assert.equal(state.document.blocks[0].children.length, 2);
});
