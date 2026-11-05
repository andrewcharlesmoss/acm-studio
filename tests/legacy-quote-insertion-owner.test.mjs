import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { loadProductionModule } from './production-module.mjs';

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { captureCanvasInsertionTarget, insertAtLegacyQuoteBoundary } = await load('../app/studio/canvas-insertion-target.ts');
const { createTemplateSet, emptyTemplateStore, templateEditorBlocks, templateNodesFromBlocks } = await load('../app/studio/template-model.ts');
const { replaceTemplateLibraryContext } = await load('../app/studio/template-library.ts');
const source = readFileSync(new URL('../app/studio/template-workspace.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('template-workspace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let owner;
function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'changeCurrentTargetNodes') owner = node; ts.forEachChild(node, visit); }
visit(tree);
assert.ok(owner);
const compiled = ts.transpileModule(`${owner.getText(tree)}; globalThis.change = changeCurrentTargetNodes;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

test('template owner applies a captured Quote insertion to the latest set and rejects stale or denied writes', () => {
  const set = createTemplateSet('Captured Quote');
  const entry = set.templates[0];
  entry.nodes = [{ id: 'quote', type: 'quote', text: 'Original', runs: [{ text: 'Original', marks: ['bold'] }], align: 'right', attribution: 'Source' }];
  let store = { ...emptyTemplateStore(), sets: [set] }, allow = true, commits = 0;
  const templates = { commit(update, options) { if (!allow) return false; const next = update(structuredClone(store)); if (options?.skipUnchanged && JSON.stringify(next) === JSON.stringify(store)) return true; store = next; commits++; return true; } };
  const scope = { templates, replaceTemplateLibraryContext }; runInNewContext(compiled, scope);
  const doc = nodes => ({ id: 'sample', blocks: templateEditorBlocks(nodes) });
  const target = captureCanvasInsertionTarget(doc(entry.nodes), null, 'quote');
  const insert = nodes => {
    const current = doc(nodes);
    const next = insertAtLegacyQuoteBoundary(current, target, { id: 'new', type: 'paragraph', text: '' }, 'legacy');
    return next === current ? null : templateNodesFromBlocks(next.blocks, nodes);
  };
  store.sets[0].name = 'Updated elsewhere';
  store.sets[0].templates[0].nodes[0].text = 'Latest';
  store.sets[0].templates[0].nodes[0].runs = [{ text: 'Latest', marks: ['italic'] }];
  assert.equal(scope.change(set.id, entry.id, entry.kind, insert), true);
  assert.equal(commits, 1);
  assert.equal(store.sets[0].name, 'Updated elsewhere');
  const quote = store.sets[0].templates[0].nodes[0];
  assert.equal(quote.attribution, 'Source');
  assert.equal(quote.children[0].text, 'Latest');
  assert.equal(quote.children[0].align, 'right');
  assert.equal(quote.children[0].runs[0].marks[0], 'italic');
  assert.equal(scope.change(set.id, entry.id, entry.kind, insert), false);
  assert.equal(commits, 1);
  allow = false;
  assert.equal(scope.change(set.id, entry.id, entry.kind, insert), false);
  assert.equal(commits, 1);
});

test('document adapter reports acceptance only for an insertion against the current owned document', () => {
  const prototypeSource = readFileSync(new URL('../app/studio/studio-prototype.tsx', import.meta.url), 'utf8');
  const syntax = ts.createSourceFile('studio-prototype.tsx', prototypeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let property;
  function find(node) { if (ts.isPropertyAssignment(node) && node.name.getText(syntax) === 'onInsertCapturedLegacyQuote') property = node; ts.forEachChild(node, find); }
  find(syntax);
  assert.ok(property);
  const js = ts.transpileModule(`globalThis.insert = ${property.initializer.getText(syntax)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let document = { id: 'doc', blocks: [{ id: 'quote', type: 'quote', text: 'Original', attribution: 'Source' }] }, allowed = true, history = [];
  const scope = { insertAtLegacyQuoteBoundary, updateActiveDocument(update) { if (!allowed) return false; const next = update(document); if (next !== document) { history.push(document); document = next; } return true; } };
  runInNewContext(js, scope);
  const target = captureCanvasInsertionTarget(document, null, 'quote');
  const block = { id: 'inserted', type: 'paragraph', text: '' };
  allowed = false;
  assert.equal(scope.insert(target, block, 'legacy'), false);
  assert.equal(history.length, 0);
  allowed = true;
  document = { ...document, blocks: [{ ...document.blocks[0], children: [{ id: 'peer', type: 'paragraph', text: 'Peer' }] }] };
  assert.equal(scope.insert(target, block, 'legacy'), false);
  assert.equal(history.length, 0);
  document = { id: 'doc', blocks: [{ id: 'quote', type: 'quote', text: 'Updated', attribution: 'Source' }] };
  assert.equal(scope.insert(target, block, 'legacy'), true);
  assert.equal(history.length, 1);
  assert.equal(document.blocks[0].children[0].text, 'Updated');
  assert.equal(document.blocks[0].children[1].id, 'inserted');
});
