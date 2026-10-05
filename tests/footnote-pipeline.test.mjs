import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const moduleCache = new Map();
async function compileModule(url) {
  if (moduleCache.has(url.href)) return moduleCache.get(url.href);
  const result = compileUncached(url);
  moduleCache.set(url.href, result);
  return result;
}
async function compileUncached(url) {
  const source = await readFile(url, "utf8").catch(error => {
    if (error.code !== "ENOENT" || !url.pathname.endsWith(".ts")) throw error;
    url = new URL(`${url.href}x`);
    return readFile(url, "utf8");
  });
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  outputText = outputText.replace(/import ["'][^"']+\.css["'];?/g, "");
  for (const match of [...outputText.matchAll(/from "([^"]+)"/g)]) {
    const specifier = match[1];
    let resolved;
    if (specifier.startsWith(".")) {
      resolved = specifier.endsWith(".mjs")
        ? new URL(specifier, url).href
        : await compileModule(new URL(/\.tsx?$/.test(specifier) ? specifier : `${specifier}.ts`, url));
    } else {
      resolved = import.meta.resolve(specifier);
    }
    outputText = outputText.replace(match[0], `from "${resolved}"`);
  }
  return `data:text/javascript;base64,${Buffer.from(`${outputText}\n//# sourceURL=${url.pathname}`).toString("base64")}`;
}


const load = path => compileModule(new URL(path, import.meta.url)).then(url => import(url));
const { footnoteReferenceRun: reference, INLINE_OBJECT_CHARACTER: atom } = await load("../app/content/footnote-runs.ts");
const { addDocumentFootnote, addDocumentFootnotes } = await load("../app/studio/footnote-command.ts");
const { reconcileFootnoteBlocks, canRemoveFootnoteOwners, preservesReferencedFootnotes } = await load("../app/content/footnote-reconciliation.ts");
const { useStudioBlockCommands } = await load("../app/studio/use-studio-block-commands.ts");
const { commitHistory, undoHistory, redoHistory, findBlockById } = await import("../app/studio/studio-command-operations.mjs");
const { visibleFootnoteNumbers, visibleFootnoteReferenceAnchors } = await load("../app/content/footnote-blocks.ts");
const { validContentBlocks, validateStudioWorkspace, migrateStudioWorkspace, validatePublicationSnapshot } = await load("../app/studio/workspace-validation.ts");
const { BlockRenderer, renderText } = await load("../app/components/content.tsx");
const { miniGolfPresentation } = await load("../app/studio/mini-golf-presentation.tsx");
const { MiniGolfRuntimeProvider } = await load("../app/studio/mini-golf-runtime.tsx");
const { initialStudioWorkspace } = await load("../app/studio/editor-model.ts");
const { blockToHtml, blocksToHtml, parseHtmlToBlock } = await load("../app/studio/studio-html-editor.ts");
const { emptyTemplateStore, createTemplateSet, validateTemplateStore, validateTemplateSnapshot, validateTemplatePublicationSnapshot, TEMPLATE_VERSION } = await load("../app/studio/template-model.ts");
const { blockClipboardHtml, createBlockClipboardPayload, readBlockClipboard, readBlockClipboardPayload, cloneClipboardBlocks, cloneClipboardPayloadForInsertion, writeBlockClipboard } = await load("../app/studio/block-clipboard.ts");
const { RichTextEditingProvider, useRichTextEditing } = await load("../app/studio/rich-text-editing-context.tsx");
const { blocksToMiniGolfPageDefinition, parseMiniGolfPageDefinition } = await load("../app/studio/mini-golf-page-contract.ts");
const { initialMiniGolfDraft, createMiniGolfDraftRepository } = await load("../app/studio/mini-golf-draft.ts");
const { supportsMiniGolfRuntimeTable } = await load("../app/studio/mini-golf-table-authoring.ts");
const { containsRichTextInlineObjects } = await load("../app/content/rich-text-contract.ts");
const { contentWordCount } = await load("../app/content/reading-time.ts");
const { parentOfNestedBlock, permitsBlockTreeChanges } = await load("../app/studio/block-inserter-options.ts");
const { editBlockSiblings } = await load("../app/studio/block-sibling-operations.ts");
const { copiedBlocksForParent } = await load("../app/studio/block-copy.ts");
const { toLocallyPublishedArticle, parseLocallyPublishedArticles, LOCAL_WORKSPACE_KEY, LOCAL_PUBLICATIONS_KEY } = await load("../app/content/local-publishing.ts");
const { browserWorkspaceRepository } = await load("../app/studio/workspace-repository.ts");
const { loadTemplates } = await load("../app/studio/template-store.ts");
const { validateStudioBackup } = await load("../app/studio/backup-store.ts");
const { validateTemplatePackage } = await load("../app/studio/template-package.ts");
const { TEMPLATE_STORAGE_KEY } = await load("../app/studio/template-model.ts");
const { DESIGN_STORAGE_KEY } = await load("../app/studio/design-model.ts");
const paragraph = (id = "p") => ({ id, type: "paragraph", text: `before${atom}after`, runs: [{ text: "before" }, reference("note"), { text: "after" }] });
const notes = { id: "notes", type: "footnotes", notes: [{ id: "note", text: "Note content" }] };
function freeze(value) { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }

const legacyParagraph = (id = "legacy") => ({ id, type: "paragraph", text: "Before source after", runs: [{ text: "Before " }, { text: "source", marks: ["bold", { type: "footnote", id: "note" }] }, { text: " after" }] });
const migratedLegacyText = `Before source${atom} after`;
function legacyWorkspace() {
  const document = { ...initialStudioWorkspace.documents.find(item => item.kind === "post"), blocks: [legacyParagraph(), notes] };
  const binnedDocument = { ...document, id: "binned-footnote-document" };
  return { ...initialStudioWorkspace, version: 22, activeDocumentId: document.id, documents: [document], bin: [{ id: "binned-item", deletedAt: "2026-10-04T12:00:00Z", document: binnedDocument, publication: toLocallyPublishedArticle(binnedDocument) }] };
}

test("workspace readers migrate validated active, Bin and publication fields without saving or mutating legacy data", () => {
  const source = freeze(legacyWorkspace());
  const serialised = JSON.stringify(source);
  for (const reader of [validateStudioWorkspace, migrateStudioWorkspace]) {
    const canonical = reader(source);
    for (const block of [canonical.documents[0].blocks[0], canonical.bin[0].document.blocks[0], canonical.bin[0].publication.blocks[0]]) {
      assert.equal(block.text, migratedLegacyText);
      assert.equal(block.runs[1].text, "source");
      assert.deepEqual(block.runs[1].marks, ["bold"]);
      assert.equal(block.runs[2].text, atom);
      assert.deepEqual(block.runs[2].inline, reference("note").inline);
      assert.equal(block.runs[2].marks, undefined);
    }
    assert.equal(canonical.version, 24);
    assert.deepEqual(validateStudioWorkspace(canonical), canonical);
  }
  const previousWindow = globalThis.window;
  let reads = 0;
  try {
    globalThis.window = { localStorage: { getItem(key) { assert.equal(key, LOCAL_WORKSPACE_KEY); reads++; return serialised; }, setItem() { throw new Error("Reading must not save"); } } };
    assert.equal(browserWorkspaceRepository.load().documents[0].blocks[0].text, migratedLegacyText);
  } finally { globalThis.window = previousWindow; }
  assert.equal(reads, 1);
  assert.equal(JSON.stringify(source), serialised);
  assert.throws(() => validateStudioWorkspace({ ...source, documents: [{ ...source.documents[0], blocks: [{ ...legacyParagraph(), runs: [{ text: "source", marks: [{ type: "footnote", id: 42 }] }] }] }] }));
  assert.throws(() => validateStudioWorkspace({ ...source, bin: [{ ...source.bin[0], publication: { ...source.bin[0].publication, blocks: [{ id: "bad", type: "table", rows: ["bad"] }] } }] }));
});

test("publication readers return canonical immutable content and embedded template snapshots", () => {
  const set = createTemplateSet();
  set.parts[0].nodes = [legacyParagraph(), notes];
  const document = { ...initialStudioWorkspace.documents.find(item => item.kind === "post"), blocks: [legacyParagraph(), notes] };
  const article = { ...toLocallyPublishedArticle(document), templateSnapshot: { version: "0.23.0", set, templateId: set.templates[0].id } };
  const source = freeze({ version: 15, posts: [article] });
  const raw = JSON.stringify(source);
  const canonical = validateTemplatePublicationSnapshot(source);
  assert.equal(canonical.version, 18);
  assert.equal(canonical.posts[0].blocks[0].text, migratedLegacyText);
  assert.equal(canonical.posts[0].templateSnapshot.version, TEMPLATE_VERSION);
  assert.equal(canonical.posts[0].templateSnapshot.set.parts[0].nodes[0].text, migratedLegacyText);
  assert.deepEqual(validateTemplatePublicationSnapshot(canonical), canonical);
  assert.deepEqual(JSON.parse(JSON.stringify(parseLocallyPublishedArticles(raw))), JSON.parse(JSON.stringify(canonical.posts)));
  assert.equal(JSON.stringify(source), raw);
  assert.deepEqual(parseLocallyPublishedArticles(JSON.stringify({ ...source, posts: [{ ...article, blocks: [{ ...legacyParagraph(), runs: [{ text: "source", marks: [{ type: "unknown" }] }] }] }] })), []);
});

test("template store, Bin restore entry and package readers migrate actual nodes while retaining template-only contracts", () => {
  const set = createTemplateSet();
  set.parts[0].nodes = [{ id: "legacy-layout", type: "group", layout: "stack", contentSize: "640px", children: [legacyParagraph(), notes] }];
  const entry = { ...set.parts[0], nodes: [legacyParagraph(), notes] };
  const source = freeze({ ...emptyTemplateStore(), version: "0.23.0", sets: [set], bin: [{ id: "template-bin", kind: "template", deletedAt: "2026-10-04T12:00:00Z", setId: set.id, setName: set.name, setSnapshot: set, entry }] });
  const raw = JSON.stringify(source);
  const canonical = validateTemplateStore(source);
  assert.equal(canonical.sets[0].parts[0].nodes[0].children[0].text, migratedLegacyText);
  assert.equal(canonical.sets[0].parts[0].nodes[0].contentSize, "640px");
  assert.equal(canonical.bin[0].entry.nodes[0].text, migratedLegacyText);
  assert.equal(canonical.bin[0].setSnapshot.parts[0].nodes[0].children[0].text, migratedLegacyText);
  assert.deepEqual(canonical.sets[0].templates[0].nodes, set.templates[0].nodes);
  assert.deepEqual(validateTemplateStore(canonical), canonical);
  assert.equal(loadTemplates({ getItem: () => raw }).bin[0].entry.nodes[0].text, migratedLegacyText);
  assert.equal(validateTemplatePackage({ format: "acm-studio-template-set", version: "0.23.0", set, media: [] }).set.parts[0].nodes[0].children[0].text, migratedLegacyText);
  assert.equal(JSON.stringify(source), raw);
  const badEntry = { ...entry, nodes: [{ ...legacyParagraph(), runs: "invalid" }] };
  assert.throws(() => validateTemplateStore({ ...source, bin: [{ ...source.bin[0], entry: badEntry }] }));
});

test("Mini Golf readers migrate old authored fields in memory and retain definition descriptors", () => {
  const workspace = { ...initialMiniGolfDraft, version: 22, documents: initialMiniGolfDraft.documents.map(document => ({ ...document, blocks: [...document.blocks, legacyParagraph(), notes] })) };
  const source = freeze({ format: "mini-golf-page-draft", version: 11, workspace });
  const raw = JSON.stringify(source);
  const previousWindow = globalThis.window;
  try {
    globalThis.window = { localStorage: { getItem: () => raw, setItem() { throw new Error("Reading must not save"); } } };
    const canonical = createMiniGolfDraftRepository("memory-only-test").load();
    assert.equal(canonical.documents[0].blocks.at(-2).text, migratedLegacyText);
    assert.equal(canonical.version, 24);
  } finally { globalThis.window = previousWindow; }
  const identity = { pageId: "mini-golf-home", instanceId: "prod", source: { revision: "fixture", fileHashes: {} } };
  const definition = blocksToMiniGolfPageDefinition(workspace.documents[0].blocks, identity);
  assert.equal(definition.blocks.at(-2).text, migratedLegacyText);
  const legacyDefinition = { ...definition, version: 3, blocks: workspace.documents[0].blocks };
  assert.deepEqual(parseMiniGolfPageDefinition(legacyDefinition), definition);
  assert.equal(JSON.stringify(source), raw);
});

test("legacy clipboard payloads migrate only after validation and remap migrated references with their notes", () => {
  const blocks = [legacyParagraph(), notes];
  const payload = JSON.stringify({ format: "acm-studio-blocks", version: 1, blocks });
  const parser = globalThis.DOMParser;
  try {
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
    const canonical = readBlockClipboard('data-acm-studio-blocks="fixture"');
    assert.equal(canonical[0].text, migratedLegacyText);
    let nextId = 0;
    const copies = cloneClipboardBlocks(canonical, prefix => `${prefix}-${++nextId}`);
    assert.equal(copies[0].runs[2].inline.id, copies[1].notes[0].id);
    assert.notEqual(copies[1].notes[0].id, "note");
    assert.equal(blocks[0].text, "Before source after");
  } finally { globalThis.DOMParser = parser; }
});

test("backup validation returns canonical workspace, templates and publications while retaining the immutable input", () => {
  const workspace = legacyWorkspace();
  const set = createTemplateSet(); set.parts[0].nodes = [legacyParagraph(), notes];
  const templates = { ...emptyTemplateStore(), version: "0.23.0", sets: [set] };
  const backup = freeze({ format: "acm-studio-backup", version: 4, exportedAt: "2026-10-04T12:00:00Z", workspace, templates, publications: JSON.stringify({ version: 15, posts: [workspace.bin[0].publication] }), media: { folders: [], assets: [] } });
  const raw = JSON.stringify(backup);
  const canonical = validateStudioBackup(backup);
  assert.equal(canonical.workspace.version, 24);
  assert.equal(canonical.workspace.documents[0].blocks[0].text, migratedLegacyText);
  assert.equal(canonical.workspace.bin[0].document.blocks[0].text, migratedLegacyText);
  assert.equal(canonical.templates.version, TEMPLATE_VERSION);
  assert.equal(canonical.templates.sets[0].parts[0].nodes[0].text, migratedLegacyText);
  assert.equal(JSON.parse(canonical.publications).version, 18);
  assert.equal(JSON.parse(canonical.publications).posts[0].blocks[0].text, migratedLegacyText);
  assert.equal(JSON.stringify(validateStudioBackup(canonical)), JSON.stringify(canonical));
  assert.equal(JSON.stringify(backup), raw);
});

test("ordinary workspace and Mini Golf repositories validate and migrate binned publication template snapshots without saving", () => {
  const source = legacyBackup(); const raw = JSON.stringify(source.workspace);
  const previousWindow = globalThis.window;
  try {
    globalThis.window = { localStorage: { getItem: () => raw, setItem() { throw new Error("Reading must not save"); } } };
    const workspace = browserWorkspaceRepository.load();
    const snapshot = workspace.bin[0].publication.templateSnapshot;
    assert.equal(snapshot.version, TEMPLATE_VERSION);
    assert.equal(snapshot.set.parts[0].nodes[0].text, migratedLegacyText);
    const golfSource = { ...initialMiniGolfDraft, version: 23, categories: source.workspace.categories, bin: source.workspace.bin };
    const golfRaw = JSON.stringify({ format: "mini-golf-page-draft", version: 12, workspace: golfSource });
    globalThis.window.localStorage.getItem = () => golfRaw;
    assert.equal(createMiniGolfDraftRepository("memory-only-test").load().bin[0].publication.templateSnapshot.set.parts[0].nodes[0].text, migratedLegacyText);
    const invalid = structuredClone(source.workspace);
    invalid.bin[0].publication.templateSnapshot.set.parts[0].nodes[0].runs = "invalid";
    globalThis.window.localStorage.getItem = () => JSON.stringify(invalid);
    assert.throws(() => browserWorkspaceRepository.load());
    assert.equal(JSON.stringify(source.workspace), raw);
  } finally { globalThis.window = previousWindow; }
});

// Execute the actual consumer bodies with isolated persistence. Real Web Lock
// acquisition, draining and read-only exclusion are covered by ownership tests.
async function backupConsumer(name, bindings) {
  const source = await readFile(new URL("../app/studio/backup-store.ts", import.meta.url), "utf8");
  const parsed = ts.createSourceFile("backup-store.ts", source, ts.ScriptTarget.Latest, true);
  const declaration = parsed.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
  assert.ok(declaration, `Production ${name} must exist`);
  const code = ts.transpileModule(`${declaration.getText(parsed).replace(/^export /, "")}\nglobalThis.consumer = ${name};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = { validateStudioBackup, LOCAL_WORKSPACE_KEY, LOCAL_PUBLICATIONS_KEY, TEMPLATE_STORAGE_KEY, DESIGN_STORAGE_KEY, Blob, ...bindings };
  runInNewContext(code, context);
  return context.consumer;
}

function legacyBackup() {
  const workspace = legacyWorkspace();
  const set = createTemplateSet(); set.parts[0].nodes = [legacyParagraph(), notes];
  const templateSnapshot = { version: "0.23.0", set, templateId: set.templates.find(entry => entry.kind === "post").id };
  workspace.bin[0].publication = { ...workspace.bin[0].publication, templateSnapshot };
  return freeze({ format: "acm-studio-backup", version: 4, exportedAt: "2026-10-04T12:00:00Z", workspace,
    templates: { ...emptyTemplateStore(), version: "0.23.0", sets: [set] },
    publications: JSON.stringify({ version: 15, posts: [workspace.bin[0].publication] }), media: { folders: [], assets: [] } });
}

test("actual backup restore saves canonical content in its restore permit and rejects invalid data before ownership or storage", async () => {
  const source = legacyBackup(); const raw = JSON.stringify(source);
  const permit = {}; const saved = new Map(); const calls = [];
  let restoring = false;
  const restore = await backupConsumer("restoreStudioBackup", {
    studioWriteOwnership: { async restore(operation) { calls.push("permit"); restoring = true; try { return await operation(permit); } finally { restoring = false; } } },
    listMediaLibrary: async () => { assert.equal(restoring, true); calls.push("snapshot-media"); return { assets: [], folders: [] }; },
    replaceMediaLibrary: async (assets, folders, actualPermit) => { assert.equal(actualPermit, permit); assert.equal(restoring, true); assert.deepEqual(assets, []); assert.deepEqual(folders, []); calls.push("write-media"); },
    window: { localStorage: {
      getItem(key) { assert.equal(restoring, true); calls.push(`read:${key}`); return null; },
      setItem(key, value) { assert.equal(restoring, true); saved.set(key, value); calls.push(`write:${key}`); },
      removeItem(key) { assert.equal(restoring, true); saved.delete(key); calls.push(`remove:${key}`); },
    } },
  });
  await restore(source);
  assert.equal(calls[0], "permit");
  assert.ok(calls.indexOf("write-media") > calls.indexOf(`read:${TEMPLATE_STORAGE_KEY}`));
  const workspace = JSON.parse(saved.get(LOCAL_WORKSPACE_KEY));
  assert.equal(workspace.version, 24);
  assert.equal(workspace.documents[0].blocks[0].text, migratedLegacyText);
  assert.equal(workspace.bin[0].publication.templateSnapshot.set.parts[0].nodes[0].text, migratedLegacyText);
  assert.equal(JSON.parse(saved.get(TEMPLATE_STORAGE_KEY)).sets[0].parts[0].nodes[0].text, migratedLegacyText);
  assert.equal(JSON.parse(saved.get(LOCAL_PUBLICATIONS_KEY)).posts[0].blocks[0].text, migratedLegacyText);
  assert.equal(saved.has(DESIGN_STORAGE_KEY), false);
  assert.equal(JSON.stringify(source), raw);
  const beforeInvalid = calls.length;
  await assert.rejects(restore({ ...source, workspace: { ...source.workspace, documents: [{ ...source.workspace.documents[0], blocks: [{ ...legacyParagraph(), runs: "invalid" }] }] } }));
  assert.equal(calls.length, beforeInvalid, "Validation must fail before requesting the restore permit");
});

test("actual canonical backup restore rolls back exact original stores after a late write failure", async () => {
  const source = legacyBackup(); const permit = {};
  const originals = new Map([[LOCAL_WORKSPACE_KEY, ""], [LOCAL_PUBLICATIONS_KEY, "original publications"], [TEMPLATE_STORAGE_KEY, "original templates"]]);
  const saved = new Map(originals); const mediaWrites = []; const storageWrites = [];
  let failOnce = true;
  const oldLibrary = { assets: [{ id: "existing-media" }], folders: [{ id: "existing-folder" }] };
  const restore = await backupConsumer("restoreStudioBackup", {
    studioWriteOwnership: { restore: operation => operation(permit) },
    listMediaLibrary: async () => oldLibrary,
    replaceMediaLibrary: async (assets, folders, actualPermit) => { assert.equal(actualPermit, permit); mediaWrites.push({ assets, folders }); },
    window: { localStorage: {
      getItem: key => saved.get(key) ?? null,
      setItem(key, value) {
        storageWrites.push(key);
        if (key === LOCAL_PUBLICATIONS_KEY && failOnce) { failOnce = false; throw new Error("publication write failed"); }
        saved.set(key, value);
      },
      removeItem: key => { storageWrites.push(key); saved.delete(key); },
    } },
  });
  await assert.rejects(restore(source), /publication write failed/);
  assert.deepEqual(saved, originals);
  assert.equal(mediaWrites.length, 2);
  assert.equal(mediaWrites[1].assets, oldLibrary.assets);
  assert.equal(mediaWrites[1].folders, oldLibrary.folders);
  assert.deepEqual(storageWrites.slice(-4), [LOCAL_WORKSPACE_KEY, LOCAL_PUBLICATIONS_KEY, DESIGN_STORAGE_KEY, TEMPLATE_STORAGE_KEY]);
});

test("actual backup download exports the canonical result without altering its source or accessing storage", async () => {
  const source = legacyBackup(); const raw = JSON.stringify(source);
  let blob; let clicked = false; let revoked;
  const link = { click() { clicked = true; } };
  const download = await backupConsumer("downloadStudioBackup", {
    MAX_BACKUP_BYTES: 100 * 1024 * 1024,
    URL: { createObjectURL(value) { blob = value; return "blob:memory-only"; }, revokeObjectURL(value) { revoked = value; } },
    document: { createElement(tag) { assert.equal(tag, "a"); return link; } },
  });
  download(source);
  const exported = JSON.parse(await blob.text());
  assert.equal(exported.workspace.documents[0].blocks[0].text, migratedLegacyText);
  assert.equal(exported.workspace.bin[0].publication.templateSnapshot.set.parts[0].nodes[0].text, migratedLegacyText);
  assert.equal(JSON.parse(exported.publications).version, 18);
  assert.equal(link.download, "acm-studio-backup-2026-10-04.json");
  assert.equal(clicked, true); assert.equal(revoked, "blob:memory-only");
  assert.equal(JSON.stringify(source), raw);
});

test("reference removal reconciles its note, retains saved orphans and leaves the empty host recoverable", () => {
  const before = freeze([paragraph(), { ...notes, notes: [...notes.notes, { id: "orphan", text: "Saved orphan text" }] }]);
  const after = [ { id: "p", type: "paragraph", text: "beforeafter", runs: [{ text: "beforeafter" }] }, before[1] ];
  const result = reconcileFootnoteBlocks(before, after);
  assert.deepEqual(result[1].notes, [{ id: "orphan", text: "Saved orphan text" }]);
  assert.equal(result[0], after[0]);
  assert.equal(before[1].notes.length, 2);
  assert.equal(reconcileFootnoteBlocks(result, result), result);
  assert.equal(reconcileFootnoteBlocks(before, [after[0], notes])[1].notes.length, 0);
});

test("repeated and hidden references retain one note until the last stored active reference disappears", () => {
  const hidden = { id: "hidden", type: "group", editorial: { hidden: true }, children: [paragraph("hidden-p")] };
  const before = freeze([paragraph(), hidden, notes]);
  const oneRemoved = [hidden, notes];
  assert.equal(reconcileFootnoteBlocks(before, oneRemoved), oneRemoved);
  const lastRemoved = [notes];
  assert.deepEqual(reconcileFootnoteBlocks(oneRemoved, lastRemoved)[0].notes, []);
});

test("all nested rich-field removals reconcile against their document owner", () => {
  const fields = [
    paragraph(),
    { id: "h", type: "heading", level: 2, text: atom, runs: [reference("note")] },
    { id: "q", type: "quote", text: "", attribution: atom, attributionRuns: [reference("note")] },
    { id: "l", type: "list", style: "unordered", items: [{ text: "parent", children: [{ id: "child-list", type: "list", style: "ordered", items: [{ text: atom, runs: [reference("note")] }] }] }] },
    { id: "t", type: "table", rows: [[atom]], cellRuns: [[[reference("note")]]], caption: atom, captionRuns: [reference("caption-note")] },
    { id: "i", type: "image", src: "", alt: "", caption: atom, captionRuns: [reference("note")] },
    { id: "e", type: "embed", url: "https://example.test/", title: "Example", caption: atom, captionRuns: [reference("note")] },
  ];
  for (const source of fields) {
    const host = { ...notes, notes: [...notes.notes, { id: "caption-note", text: "Caption note" }, { id: "orphan", text: "Keep" }] };
    const before = freeze([{ id: "group", type: "group", children: [source] }, host]);
    const after = [{ ...before[0], children: [] }, before[1]];
    const result = reconcileFootnoteBlocks(before, after);
    assert.equal(result[1].notes.some(note => note.id === "note"), false, source.type);
    assert.equal(result[1].notes.some(note => note.id === "caption-note"), source.type !== "table", source.type);
    assert.equal(result[1].notes.at(-1).text, "Keep");
  }
});

test("dormant Quote text is a recovery field and never causes orphan note pruning", () => {
  const dormant = { id: "q", type: "quote", text: atom, runs: [reference("note")], children: [] };
  const before = freeze([dormant, notes]);
  const after = [{ ...dormant, text: "", runs: [] }, notes];
  assert.equal(reconcileFootnoteBlocks(before, after), after);
  assert.equal(after[1].notes[0].text, "Note content");
  const active = freeze([{ ...dormant, children: undefined }, notes]);
  const newlyDormant = [{ ...active[0], children: [] }, notes];
  assert.equal(reconcileFootnoteBlocks(active, newlyDormant), newlyDormant);
  assert.equal(canRemoveFootnoteOwners(newlyDormant, ["notes"]), false);
  assert.equal(reconcileFootnoteBlocks(newlyDormant, [newlyDormant[0]]), null);
});

test("note deletion is rejected while referenced, but complete owner selection can be removed", () => {
  const nestedHost = { id: "host-group", type: "group", children: [notes] };
  const before = freeze([paragraph(), nestedHost]);
  assert.equal(preservesReferencedFootnotes(before, [before[0]]), false);
  assert.equal(reconcileFootnoteBlocks(before, [before[0]]), null);
  assert.equal(canRemoveFootnoteOwners(before, ["notes"]), false);
  assert.equal(canRemoveFootnoteOwners(before, ["host-group"]), false);
  assert.equal(canRemoveFootnoteOwners(before, ["host-group", "p"]), true);
  assert.deepEqual(reconcileFootnoteBlocks(before, []), []);
  assert.equal(reconcileFootnoteBlocks(before, [before[0], { ...notes, notes: [] }]), null);
  assert.equal(canRemoveFootnoteOwners([nestedHost, { id: "hidden", type: "group", editorial: { hidden: true }, children: [paragraph()] }], ["notes"]), false);
});

test("note host selection honours references in captions, list children and sibling notes blocks", () => {
  const references = [
    { id: "image", type: "image", src: "", alt: "", caption: atom, captionRuns: [reference("note")] },
    { id: "list", type: "list", style: "unordered", items: [{ text: "parent", children: [{ id: "child-list", type: "list", style: "ordered", items: [{ text: atom, runs: [reference("note")] }] }] }] },
  ];
  for (const source of references) {
    const before = freeze([source, notes]);
    assert.equal(canRemoveFootnoteOwners(before, ["notes"]), false);
    assert.equal(canRemoveFootnoteOwners(before, [source.id, "notes"]), true);
  }
  const dangling = [{ id: "dangling", type: "paragraph", text: atom, runs: [reference("unresolved")] }];
  const unchangedDangling = [...dangling];
  assert.equal(reconcileFootnoteBlocks(dangling, unchangedDangling), unchangedDangling);
});

test("actual block commands reconcile deletion in one history update and preserve independent orphan data", () => {
  const original = freeze({ id: "document", blocks: [paragraph(), { ...notes, notes: [...notes.notes, { id: "orphan", text: "Keep orphan" }] }] });
  let current = original;
  const past = [];
  const commands = useStudioBlockCommands({ activeDocument: current, updateActiveDocument: update => { const next = update(current); if (next === current) return; past.push(current); current = next; } });
  commands.updateBlock("p", block => ({ ...block, text: "beforeafter", runs: [{ text: "beforeafter" }] }));
  assert.equal(past.length, 1);
  assert.deepEqual(current.blocks[1].notes, [{ id: "orphan", text: "Keep orphan" }]);
  const future = current;
  current = past.pop();
  assert.deepEqual(current, original);
  current = future;
  assert.equal(current.blocks[0].text, "beforeafter");
  assert.equal(current.blocks[1].notes.length, 1);
});

test("actual block commands reject deleting a referenced note host and permit deleting source plus host", () => {
  const original = freeze({ id: "document", blocks: [paragraph(), notes] });
  let current = original;
  let changed = 0;
  const commands = useStudioBlockCommands({ activeDocument: current, updateActiveDocument: update => { const next = update(current); if (next !== current) { changed++; current = next; } } });
  commands.removeBlock("notes");
  assert.equal(current, original);
  assert.equal(changed, 0);
  commands.removeBlocks(["p", "notes"]);
  assert.deepEqual(current.blocks, []);
  assert.equal(changed, 1);
});

test("the actual workspace commit boundary rejects note loss without consuming history or clearing Redo", async () => {
  const source = await readFile(new URL("../app/studio/use-studio-workspace.ts", import.meta.url), "utf8");
  const tree = ts.createSourceFile("use-studio-workspace.ts", source, ts.ScriptTarget.Latest, true);
  const functions = [];
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && ["commit", "updateDocument"].includes(node.name?.text)) functions.push(node.getText(tree));
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.equal(functions.length, 2);
  const { outputText } = ts.transpileModule(`${functions.join("\n")}\nglobalThis.updateDocument = updateDocument;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } });
  const original = freeze({ version: 23, documents: [{ id: "doc", updatedAt: "2026-10-04T00:00:00.000Z", blocks: [paragraph(), notes] }] });
  let current = original;
  const future = { version: 23, documents: [{ ...original.documents[0], title: "Previous future" }] };
  const availability = [];
  const scope = { editable: true, MAX_HISTORY: 60, historyRef: { current: [] }, futureRef: { current: [future] }, cloneWorkspace: structuredClone, commitHistory, reconcileFootnoteBlocks, setWorkspace(update) { current = update(current); }, setHistoryAvailability(value) { availability.push(value); } };
  runInNewContext(outputText, scope);
  scope.updateDocument("doc", document => ({ ...document, blocks: [document.blocks[0]] }));
  assert.equal(current, original);
  assert.equal(scope.historyRef.current.length, 0);
  assert.equal(scope.futureRef.current[0], future);
  assert.equal(availability.length, 0);
  scope.updateDocument("doc", document => document);
  assert.equal(current, original);
  assert.equal(scope.historyRef.current.length, 0);
  scope.updateDocument("doc", document => ({ ...document, blocks: [{ ...document.blocks[0], text: "beforeafter", runs: [{ text: "beforeafter" }] }, document.blocks[1]] }));
  assert.equal(scope.historyRef.current.length, 1);
  assert.equal(scope.futureRef.current.length, 0);
  assert.equal(current.documents[0].blocks[1].notes.length, 0);
  const deleted = JSON.parse(JSON.stringify(current));
  const undone = undoHistory(current, scope.historyRef.current, [], 60);
  assert.deepEqual(undone.workspace.documents[0].blocks, original.documents[0].blocks);
  const redone = redoHistory(undone.workspace, undone.history, undone.future, 60);
  assert.deepEqual(JSON.parse(JSON.stringify(redone.workspace)), deleted);
});
function withListHtmlDom(callback) {
  const previousParser = globalThis.DOMParser;
  const previousNode = globalThis.Node;
  const previousHTMLElement = globalThis.HTMLElement;
  const decode = value => value.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const elements = [];
  class MinimalHTMLElement {}
  function makeElement(tagName, attributes = {}, parent) {
    const element = Object.assign(new MinimalHTMLElement(), {
      nodeType: 1, tagName: tagName.toUpperCase(), id: attributes.id ?? "", className: attributes.class ?? "", style: {}, lang: attributes.lang ?? "", dir: attributes.dir ?? "", dataset: {}, children: [], childNodes: [], parentElement: parent,
      classList: { contains: name => (attributes.class ?? "").split(/\s+/).includes(name) },
      getAttribute: name => attributes[name] ?? null,
      hasAttribute: name => Object.hasOwn(attributes, name),
      remove() { if (!this.parentElement) return; this.parentElement.children = this.parentElement.children.filter(child => child !== this); this.parentElement.childNodes = this.parentElement.childNodes.filter(child => child !== this); this.parentElement = undefined; },
      cloneNode(deep) {
        const copy = makeElement(tagName, attributes);
        if (deep) for (const child of this.childNodes) {
          if (child.nodeType === 3) copy.childNodes.push({ ...child });
          else { const nested = child.cloneNode(true); nested.parentElement = copy; copy.children.push(nested); copy.childNodes.push(nested); }
        }
        return copy;
      },
      querySelector: selector => element.querySelectorAll(selector)[0] ?? null,
      querySelectorAll: selector => {
        const descendants = [];
        const visit = parentNode => parentNode.children.forEach(child => { descendants.push(child); visit(child); });
        visit(element);
        return selector === "[data-block-id]" ? descendants.filter(child => child.dataset.blockId)
          : selector === "ol > li" ? descendants.filter(child => child.tagName === "LI" && child.parentElement?.tagName === "OL")
          : selector === "[data-footnote-back]" ? descendants.filter(child => child.hasAttribute("data-footnote-back"))
          : descendants.filter(child => child.tagName.toLowerCase() === selector);
      },
    });
    for (const [name, value] of Object.entries(attributes)) if (name.startsWith("data-")) element.dataset[name.slice(5).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())] = value;
    Object.defineProperty(element, "textContent", { get: () => element.childNodes.map(child => child.textContent).join("") });
    elements.push(element);
    return element;
  }
  class MinimalDOMParser {
    parseFromString(markup) {
      elements.length = 0;
      const body = { children: [], childNodes: [] };
      const stack = [body];
      for (const token of markup.match(/<[^>]+>|[^<]+/g) ?? []) {
        if (token.startsWith("</")) { stack.pop(); continue; }
        if (token.startsWith("<")) {
          const [, tagName, rawAttributes = ""] = token.match(/^<([a-z][\w-]*)\b([^>]*)>$/i) ?? [];
          if (!tagName) continue;
          const attributes = Object.fromEntries([...rawAttributes.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]));
          const parent = stack.at(-1);
          const child = makeElement(tagName, attributes, parent);
          parent.children.push(child); parent.childNodes.push(child);
          if (!/^(?:br|hr|img|input|meta)$/i.test(tagName) && !/\/\s*>$/.test(token)) stack.push(child);
        } else stack.at(-1).childNodes.push({ nodeType: 3, textContent: decode(token) });
      }
      return { body: { childNodes: body.childNodes }, querySelector: () => null, querySelectorAll: selector => selector === "[data-block-id]" ? elements.filter(element => element.dataset.blockId) : [] };
    }
  }
  try {
    globalThis.DOMParser = MinimalDOMParser; globalThis.Node = { TEXT_NODE: 3, ELEMENT_NODE: 1 }; globalThis.HTMLElement = MinimalHTMLElement;
    return callback();
  } finally {
    globalThis.DOMParser = previousParser; globalThis.Node = previousNode; globalThis.HTMLElement = previousHTMLElement;
  }
}


test("one Footnote operation preserves nested source and appends one recoverable blank note", () => {
  const original = freeze([{ id: "group", type: "group", layout: "stack", children: [{ id: "p", type: "paragraph", text: "beforeafter" }] }, { id: "notes", type: "footnotes", notes: [{ id: "old", text: "Retained" }] }]);
  const operation = addDocumentFootnote(original, paragraph(), "note", "new-notes");
  assert.equal(operation.notesBlockId, "notes");
  assert.equal(operation.blocks[0].children[0].runs[1].inline.id, "note");
  assert.deepEqual(operation.blocks[1].notes, [{ id: "old", text: "Retained" }, { id: "note", text: "" }]);
  assert.equal(original[0].children[0].runs, undefined);
  assert.equal(validContentBlocks(operation.blocks), true);
});

test("hidden ancestors are excluded when choosing the notes block, while their identities stay protected", () => {
  const hidden = { id: "hidden", type: "group", layout: "stack", editorial: { hidden: true }, children: [notes] };
  const old = { id: "p", type: "paragraph", text: "word" };
  const source = { ...old, text: `word${atom}`, runs: [{ text: "word" }, reference("new")] };
  const operation = addDocumentFootnote([old, hidden], source, "new", "visible-notes");
  assert.equal(operation.notesBlockId, "visible-notes");
  assert.equal(operation.blocks[1], hidden);
  assert.equal(operation.blocks.at(-1).notes[0].id, "new");
  assert.deepEqual([...visibleFootnoteNumbers(operation.blocks)], [["new", 1]]);
  assert.equal(addDocumentFootnote([old, hidden], source, "note", "visible-notes"), null);
});

test("missing source, duplicate note identity and colliding notes-block identity fail without mutation", () => {
  const original = freeze([paragraph(), notes]);
  assert.equal(addDocumentFootnote(original, paragraph("missing"), "new", "fresh"), null);
  assert.equal(addDocumentFootnote(original, paragraph(), "note", "fresh"), null);
  assert.equal(addDocumentFootnote([paragraph()], paragraph(), "new", "p"), null);
});

test("validators reject malformed objects and nested interactive references in Button labels", () => {
  assert.equal(validContentBlocks([paragraph(), notes]), true);
  for (const run of [{ text: "bad", inline: { type: "footnote", id: "note" } }, { ...reference("note"), marks: ["bold"] }, { text: atom, inline: { type: "other", id: "note" } }, { text: atom, inline: null }, { text: atom, inline: { type: "footnote", id: "note", extra: true } }]) {
    assert.equal(validContentBlocks([{ ...paragraph(), runs: [run] }]), false);
  }
  assert.equal(validContentBlocks([{ id: "b", type: "button", label: atom, labelRuns: [reference("note")], style: "primary", url: "" }]), false);
});

test("editor-exported Paragraph, List and Table references round-trip as objects, not visible numbers", () => withListHtmlDom(() => {
  const examples = [paragraph(), { id: "list", type: "list", style: "ordered", items: [{ text: atom, runs: [reference("note")] }] }, { id: "table", type: "table", rows: [[atom, "plain"]], cellRuns: [[[reference("note")], [{ text: "plain" }]]], caption: `caption${atom}`, captionRuns: [{ text: "caption" }, reference("note")] }];
  for (const block of examples) {
    const html = blockToHtml(block);
    assert.match(html, /data-footnote-object="note"/);
    assert.equal(html.includes(atom), false);
    const parsed = parseHtmlToBlock(html, block);
    assert.equal(parsed.error, undefined, `${block.type}: ${parsed.error}`);
    assert.equal(validContentBlocks([parsed.block]), true);
    if (block.type === "paragraph") assert.equal(JSON.stringify(parsed.block.runs), JSON.stringify(block.runs));
    if (block.type === "list") assert.deepEqual(parsed.block.items[0].runs, [reference("note")]);
    if (block.type === "table") { assert.deepEqual(parsed.block.rows, block.rows); assert.equal(JSON.stringify(parsed.block.cellRuns), JSON.stringify(block.cellRuns)); assert.equal(JSON.stringify(parsed.block.captionRuns), JSON.stringify(block.captionRuns)); }
  }
}));

test("Preview numbers text, nested List Item, Table cell and caption from one document scope", () => {
  const table = { id: "table", type: "table", rows: [[atom]], cellRuns: [[[reference("note")]]], caption: atom, captionRuns: [reference("note")] };
  const list = { id: "list", type: "list", style: "ordered", items: [{ text: atom, runs: [reference("note")] }] };
  const blocks = [paragraph(), { id: "group", type: "group", layout: "stack", children: [table, list] }, notes];
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant: "studio" }));
  assert.equal(html.includes(atom), false);
  assert.equal((html.match(/aria-label="Footnote 1"/g) ?? []).length, 4);
  assert.equal(html.includes("†"), false);
  const ids = [...html.matchAll(/id="(footnote-ref-[^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 4); assert.equal(new Set(ids).size, 4);
  const backlink = html.match(/class="footnote-backlink" href="([^"]+)"/)[1];
  assert.equal(decodeURIComponent(backlink.slice(1)), ids[0]);
});

test("repeated references have distinct stable anchors across fields, nested children and Preview/article variants", () => {
  const repeated = { id: "repeat", type: "paragraph", text: `${atom}${atom}`, runs: [reference("note"), reference("note")] };
  const legacy = { id: "legacy-repeat", type: "paragraph", text: "first second", runs: [{ text: "first", marks: ["bold", { type: "footnote", id: "note" }] }, { text: " second", marks: [{ type: "footnote", id: "note" }] }] };
  const blocks = freeze([notes, repeated, { id: "hidden-group", type: "group", layout: "flow", editorial: { hidden: true }, children: [paragraph("hidden-p")] },
    { id: "quote", type: "quote", text: atom, runs: [reference("note")], children: [legacy], attribution: atom, attributionRuns: [reference("note")] },
    { id: "list", type: "list", style: "unordered", items: [{ text: atom, runs: [reference("note")], children: [{ id: "nested-list", type: "list", style: "ordered", items: [{ text: atom, runs: [reference("note")] }] }] }] },
    { id: "table", type: "table", rows: [[`${atom}${atom}`, atom]], cellRuns: [[[reference("note"), reference("note")], [reference("note")]]], caption: atom, captionRuns: [reference("note")] },
  ]);
  const before = JSON.stringify(blocks);
  const firstAnchor = visibleFootnoteReferenceAnchors(blocks).get("note");
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant }));
    const ids = [...html.matchAll(/id="(footnote-ref-[^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, 11); assert.equal(new Set(ids).size, 11);
    assert.equal(ids[0], firstAnchor);
    assert.equal(decodeURIComponent(html.match(/class="footnote-backlink" href="([^"]+)"/)[1].slice(1)), firstAnchor);
    const again = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant }));
    assert.deepEqual([...again.matchAll(/id="(footnote-ref-[^"]+)"/g)].map(match => match[1]), ids);
  }
  assert.equal(JSON.stringify(blocks), before);
});

test("complete HTML export gives each reference an anchor and a resolvable first-reference backlink", () => withListHtmlDom(() => {
  const blocks = [paragraph(), { id: "group", type: "group", layout: "flow", children: [{ id: "list", type: "list", style: "ordered", items: [{ text: atom, runs: [reference("note")] }] }, { id: "table", type: "table", rows: [[atom]], cellRuns: [[[reference("note")]]], caption: atom, captionRuns: [reference("note")] }] }, notes];
  const html = blocksToHtml(blocks);
  const ids = [...html.matchAll(/id="(footnote-ref-[^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 4); assert.equal(new Set(ids).size, 4);
  assert.equal(decodeURIComponent(html.match(/data-footnote-back="true" href="([^"]+)"/)[1].slice(1)), ids[0]);
  const parsed = parseHtmlToBlock(blockToHtml(blocks[1]), blocks[1]);
  assert.equal(parsed.error, undefined); assert.deepEqual(parsed.block.children[0].items[0].runs, [reference("note")]);
  assert.deepEqual(parsed.block.children[1].cellRuns, [[[reference("note")]]]);
  const orphanHtml = blockToHtml(notes);
  assert.doesNotMatch(orphanHtml, /data-footnote-back/);
  assert.deepEqual(parseHtmlToBlock(orphanHtml, notes).block.notes, notes.notes);
}));

test("non-rendered Component children and empty Table captions do not own visible note backlinks", () => {
  const blocks = freeze([
    { id: "recovery-component", type: "component", name: "Recovery", children: [paragraph("recovery-reference")] },
    { id: "empty-table", type: "table", rows: [], caption: atom, captionRuns: [reference("note")] },
    paragraph("visible-reference"), notes,
  ]);
  const before = JSON.stringify(blocks);
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant: "studio" }));
  const ids = [...html.matchAll(/id="(footnote-ref-[^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 1);
  assert.equal(visibleFootnoteReferenceAnchors(blocks).get("note"), ids[0]);
  assert.equal(decodeURIComponent(html.match(/class="footnote-backlink" href="([^"]+)"/)[1].slice(1)), ids[0]);
  assert.deepEqual([...visibleFootnoteNumbers(blocks)], [["note", 1]]);
  const recoveryOnly = [blocks[0], blocks[1], notes];
  assert.equal(visibleFootnoteReferenceAnchors(recoveryOnly).size, 0);
  assert.equal(visibleFootnoteNumbers(recoveryOnly).size, 0);
  assert.doesNotMatch(renderToStaticMarkup(createElement(BlockRenderer, { blocks: recoveryOnly, variant: "studio" })), /footnote-backlink/);
  assert.equal(JSON.stringify(blocks), before);
});

test("Mini Golf custom Preview references resolve to the shared note and its first-reference backlink", () => {
  const blocks = freeze([
    paragraph("mini-golf-paragraph"),
    { id: "mini-golf-heading", type: "heading", level: 2, text: atom, runs: [reference("note")] },
    { ...paragraph("mini-golf-score-value"), siteRole: "score-value" },
    notes,
  ]);
  const document = { ...initialStudioWorkspace.documents[0], blocks };
  const before = JSON.stringify(document);
  const html = renderToStaticMarkup(createElement("main", null, ...blocks.map(block =>
    createElement("div", { key: block.id }, miniGolfPresentation.renderBlock({ document, block, mode: "preview", onDocumentFieldChange() {}, onFocusDocumentField() {} })),
  )));
  const ids = [...html.matchAll(/id="(footnote-ref-[^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 3); assert.equal(new Set(ids).size, 3);
  assert.equal(ids[0], visibleFootnoteReferenceAnchors(blocks).get("note"));
  const backlink = html.match(/class="footnote-backlink" href="([^"]+)"/)[1];
  assert.equal(decodeURIComponent(backlink.slice(1)), ids[0]);
  assert.equal((html.match(/href="#footnote-note"/g) ?? []).length, 3);
  assert.equal(JSON.stringify(document), before);
});

test("Mini Golf runtime clones have unique reference and note owners and exclude replaced authored fields", () => {
  const blocks = freeze([
    { ...paragraph("progress-reference"), siteRole: "progress" },
    { id: "leaderboard", type: "section", role: "leaderboard", children: [
      { id: "card", type: "section", role: "leaderboard-card", children: [
        { ...paragraph("derived-name"), siteRole: "player-name" },
        { ...paragraph("derived-score"), siteRole: "score-value" },
        { ...paragraph("derived-average"), siteRole: "metric-average" },
        paragraph("static-reference"),
        { id: "quote", type: "quote", text: "", children: [paragraph("quote-reference")] },
        notes,
      ] },
      { id: "unused-card", type: "section", role: "leaderboard-card", children: [paragraph("unused-reference")] },
    ] },
  ]);
  const document = { ...initialStudioWorkspace.documents[0], blocks };
  const before = JSON.stringify(document);
  const children = blocks.map(block => createElement("div", { key: block.id }, miniGolfPresentation.renderBlock({ document, block, mode: "preview", onDocumentFieldChange() {}, onFocusDocumentField() {} })));
  const render = () => renderToStaticMarkup(createElement(MiniGolfRuntimeProvider, { blocks, identity: "memory-only-footnote-navigation" }, children));
  const html = render();
  const ids = [...html.matchAll(/id="(footnote-ref-[^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 4); assert.equal(new Set(ids).size, 4);
  assert.equal((html.match(/id="footnote-note"/g) ?? []).length, 1);
  const backlink = html.match(/class="footnote-backlink" href="([^"]+)"/)[1];
  assert.equal(decodeURIComponent(backlink.slice(1)), ids[0]);
  assert.doesNotMatch(decodeURIComponent(ids[0]), /derived-name|derived-score|derived-average|progress-reference|unused-reference/);
  assert.match(decodeURIComponent(ids[0]), /static-reference/);
  // Runtime player identities are generated per session; source records are untouched.
  assert.equal([...render().matchAll(/id="(footnote-ref-[^"]+)"/g)].length, 4);
  assert.equal(JSON.stringify(document), before);
});

test("unscoped rich-text renderers use unique fallback anchors without changing note identity", () => {
  const html = renderToStaticMarkup(createElement("div", null, ...renderText(`${atom}${atom}`, [reference("note"), reference("note")]), ...renderText(atom, [reference("note")])));
  const ids = [...html.matchAll(/id="(footnote-ref-[^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 3); assert.equal(new Set(ids).size, 3);
  assert.equal((html.match(/data-footnote-object="note"/g) ?? []).length, 3);
});

test("Preview orders note text by references and excludes recoverable orphan notes", () => {
  const blocks = [
    { id: "p", type: "paragraph", text: `${atom} then ${atom}`, runs: [reference("later"), { text: " then " }, reference("earlier")] },
    { id: "notes", type: "footnotes", notes: [{ id: "earlier", text: "Second reference" }, { id: "orphan", text: "Recoverable old text" }, { id: "later", text: "First reference" }] },
  ];
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant: "studio" }));
  assert.match(html, /aria-label="Footnote 1">1<\/a>/);
  assert.match(html, /aria-label="Footnote 2">2<\/a>/);
  assert.ok(html.indexOf("<span>First reference") < html.indexOf("<span>Second reference"));
  assert.match(html, /value="1" id="footnote-later"/);
  assert.match(html, /value="2" id="footnote-earlier"/);
  assert.doesNotMatch(html, /Recoverable old text/);
  assert.equal(blocks[1].notes[1].text, "Recoverable old text");
});

test("prose metadata excludes atomic references while retaining actual note text", () => {
  const refOnly = { id: "p", type: "paragraph", text: atom, runs: [reference("note")] };
  assert.equal(contentWordCount([refOnly]), 0);
  assert.equal(contentWordCount([paragraph(), notes]), 3);
  const document = { ...initialStudioWorkspace.documents.find(item => item.kind === "post"), blocks: [paragraph(), notes], excerpt: "" };
  const publication = toLocallyPublishedArticle(document);
  assert.equal(publication.summary, "beforeafter");
  assert.equal(publication.summary.includes(atom), false);
});

test("reading-time counts globally resolved notes and excludes hidden or recoverable orphan text", () => {
  const blocks = [
    paragraph(),
    { id: "group", type: "group", children: [{ ...notes, notes: [...notes.notes, { id: "orphan", text: "orphan ".repeat(500) }] }] },
    { id: "hidden", type: "group", editorial: { hidden: true }, children: [{ id: "hidden-notes", type: "footnotes", notes: [{ id: "hidden-note", text: "hidden ".repeat(500) }] }] },
  ];
  assert.equal(contentWordCount(blocks), contentWordCount([paragraph(), notes]));
  assert.equal(contentWordCount([blocks[1]]), 0, "a notes-only subtree has no references");
  assert.equal(blocks[1].children[0].notes[1].text.split(" ").length, 501);
});

test("workspace and publication envelopes deliberately version inline-object support", () => {
  const workspace = { ...initialStudioWorkspace, version: 23, documents: initialStudioWorkspace.documents.map((doc, index) => index ? doc : { ...doc, blocks: [paragraph(), notes] }) };
  assert.equal(validateStudioWorkspace(workspace).version, 24);
  assert.equal(migrateStudioWorkspace(workspace).version, 24);
  for (const reader of [validateStudioWorkspace, migrateStudioWorkspace]) assert.throws(() => reader({ ...workspace, version: 22 }));
  const ordinary = { ...initialStudioWorkspace, version: 22 };
  assert.equal(validateStudioWorkspace(migrateStudioWorkspace(ordinary)).version, 24);
  const doc = { ...initialStudioWorkspace.documents.find(item => item.kind === "post"), blocks: [paragraph(), notes] };
  const article = toLocallyPublishedArticle(doc);
  assert.doesNotThrow(() => validatePublicationSnapshot({ version: 16, posts: [article] }));
  assert.throws(() => validatePublicationSnapshot({ version: 15, posts: [article] }));
});

test("Template and Mini Golf contracts retain old records but require new envelopes for objects", () => {
  assert.equal(TEMPLATE_VERSION, "0.26.0");
  assert.equal(validateTemplateStore({ ...emptyTemplateStore(), version: "0.23.0" }).version, TEMPLATE_VERSION);
  const identity = { pageId: "mini-golf-home", instanceId: "prod", source: { revision: "fixture", fileHashes: {} } };
  const blocks = [...initialMiniGolfDraft.documents[0].blocks, paragraph(), notes];
  const definition = blocksToMiniGolfPageDefinition(blocks, identity);
  assert.equal(definition.version, 5);
  assert.equal(parseMiniGolfPageDefinition(definition).blocks.at(-2).runs[1].inline.id, "note");
  assert.throws(() => parseMiniGolfPageDefinition({ ...definition, version: 3 }));
});

test("Mini Golf preserves rich cells and captions through the canonical Table path", () => {
  const ordinary = { id: "table", type: "table", hasHeader: true, hasFooter: true, rows: [["Hole", "Player", "Total"], ["1", "", ""], ["Total", "", ""]] };
  assert.equal(supportsMiniGolfRuntimeTable(ordinary), true);
  assert.equal(supportsMiniGolfRuntimeTable({ ...ordinary, caption: "Authored caption" }), false);
  assert.equal(supportsMiniGolfRuntimeTable({ ...ordinary, cellRuns: [[[reference("note")]]] }), false);
  assert.equal(supportsMiniGolfRuntimeTable({ ...ordinary, cellRuns: [[[{ text: "bold", marks: ["bold"] }]]] }), false);
});

test("the envelope detector covers nested and binned run metadata without treating prose placeholders as objects", () => {
  assert.equal(containsRichTextInlineObjects({ bin: [{ document: { blocks: [paragraph()] } }] }), true);
  assert.equal(containsRichTextInlineObjects({ text: atom }), false);
  assert.equal(containsRichTextInlineObjects({ text: "", inline: null }), true);
  const cyclic = {}; cyclic.self = cyclic;
  assert.equal(containsRichTextInlineObjects(cyclic), false);
});

test("populated Template store and snapshot preserve objects only in their current envelopes", () => {
  const set = createTemplateSet();
  set.parts[0].nodes = [paragraph(), notes];
  const store = { ...emptyTemplateStore(), sets: [set] };
  assert.deepEqual(validateTemplateStore(JSON.parse(JSON.stringify(store))).sets[0].parts[0].nodes, [paragraph(), notes]);
  assert.throws(() => validateTemplateStore({ ...store, version: "0.23.0" }));
  const snapshot = { version: TEMPLATE_VERSION, set, templateId: set.templates[0].id };
  assert.deepEqual(validateTemplateSnapshot(JSON.parse(JSON.stringify(snapshot))).set.parts[0].nodes, [paragraph(), notes]);
  assert.throws(() => validateTemplateSnapshot({ ...snapshot, version: "0.23.0" }));
});

test("complete clipboard payload round-trips objects and remaps their note identities together", () => {
  const blocks = [paragraph(), notes];
  const html = blockClipboardHtml(blocks);
  const payload = html.match(/data-acm-studio-blocks="([^"]*)"/)[1].replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
  const parser = globalThis.DOMParser;
  try {
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
    assert.deepEqual(readBlockClipboard(html), blocks);
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => JSON.stringify({ ...JSON.parse(payload), version: 1 }) }) }; } };
    assert.equal(readBlockClipboard(html), null);
  } finally { globalThis.DOMParser = parser; }
  let id = 0;
  const copies = cloneClipboardBlocks(blocks, prefix => `${prefix}-${++id}`);
  assert.equal(copies[0].runs[1].inline.id, copies[1].notes[0].id);
  assert.notEqual(copies[1].notes[0].id, "note");
  assert.deepEqual(blocks, [paragraph(), notes]);
});

function clipboardPayloadFromHtml(html) {
  const serialised = html.match(/data-acm-studio-blocks="([^"]*)"/)[1].replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
  const parser = globalThis.DOMParser;
  try {
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => serialised }) }; } };
    return readBlockClipboardPayload(html);
  } finally { globalThis.DOMParser = parser; }
}

test("the clipboard writer rejects a valid selection above its reader limit before dispatch", async () => {
  const ids = Array.from({ length: 250 }, (_, index) => `large-note-${index}`);
  const selected = { id: "large-source", type: "paragraph", text: atom.repeat(ids.length), runs: ids.map(reference) };
  const owner = { id: "large-owner", type: "footnotes", notes: ids.map(id => ({ id, text: "x".repeat(10000) })) };
  assert.equal(validContentBlocks([selected, owner]), true);
  const html = blockClipboardHtml([selected], [selected, owner]);
  assert.ok(html.length > 2 * 1024 * 1024);
  assert.equal(readBlockClipboardPayload(html), null);
  // No DOMParser or navigator is installed: rejection must precede both boundaries.
  await assert.rejects(writeBlockClipboard([selected], [selected, owner]), /supported clipboard contract/);
  assert.equal(owner.notes.length, ids.length); assert.equal(selected.runs.length, ids.length);
});

test("the actual async Canvas Cut keeps changed companion notes and stale document ownership", async () => {
  const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  const tree = ts.createSourceFile("studio-canvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "runBlockMenuAction") handler = node;
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(handler, "exercise the production asynchronous block command");
  const { outputText } = ts.transpileModule(`${handler.getText(tree)}; globalThis.cut = runBlockMenuAction;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } });
  for (const scenario of ["unchanged", "edited-note", "missing-note", "edited-selection", "lost-writer", "changed-document", "write-rejected"]) {
    const selected = paragraph();
    const initial = [selected, structuredClone(notes)];
    let resolveWrite, rejectWrite, copied;
    const completion = new Promise((resolve, reject) => { resolveWrite = resolve; rejectWrite = reject; });
    const removed = [], feedback = [];
    const scope = {
      blockMenuItems: () => [{ action: "cut", disabled: false }], setBlockMenuBlockId: () => {}, menuBlocks: () => [selected],
      activeDocument: { id: "source-document", blocks: initial }, writableRef: { current: true },
      currentDocumentRef: { current: { id: "source-document", blocks: structuredClone(initial) } },
      writeBlockClipboard: (blocks, documentBlocks) => { copied = structuredClone(createBlockClipboardPayload(blocks, documentBlocks)); return completion; },
      createBlockClipboardPayload, findBlockById, canRemove: () => true, canRemoveFootnoteOwners,
      onRemoveBlocks: ids => removed.push(ids), clearMultiSelection: () => {}, onClearBlockSelection: () => {},
      onSetPublishFeedback: value => feedback.push(value), requestAnimationFrame: callback => callback(), htmlEditorTriggerRef: { current: null },
    };
    runInNewContext(outputText, scope);
    const pending = scope.cut("cut", selected);
    if (scenario === "edited-note") scope.currentDocumentRef.current.blocks[1].notes[0].text = "New note text";
    if (scenario === "missing-note") scope.currentDocumentRef.current.blocks.pop();
    if (scenario === "edited-selection") scope.currentDocumentRef.current.blocks[0].text = "New paragraph";
    if (scenario === "lost-writer") scope.writableRef.current = false;
    if (scenario === "changed-document") scope.currentDocumentRef.current.id = "another-document";
    if (scenario === "write-rejected") rejectWrite(new Error("Clipboard unavailable")); else resolveWrite();
    await pending;
    assert.equal(removed.length, scenario === "unchanged" ? 1 : 0, scenario);
    assert.equal(copied.footnotes[0].text, "Note content");
    if (scenario === "edited-note") assert.equal(scope.currentDocumentRef.current.blocks[1].notes[0].text, "New note text");
    if (scenario === "write-rejected") assert.match(feedback[0], /blocks have been kept/);
    if (scenario === "unchanged") {
      assert.deepEqual(Array.from(removed[0]), [selected.id]);
      const remaining = reconcileFootnoteBlocks(initial, initial.filter(block => !removed[0].includes(block.id)));
      assert.equal(remaining.find(block => block.type === "footnotes")?.notes.length ?? 0, 0);
      const committed = { workspace: { blocks: remaining }, ...commitHistory({ blocks: initial }, []) };
      assert.deepEqual(undoHistory(committed.workspace, committed.history, []).workspace.blocks, initial);
    }
  }
});

test("the actual Canvas paste attaches companions outside restricted parents and honours read-only mode", async () => {
  const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  const tree = ts.createSourceFile("studio-canvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.getText(tree) === "onPasteCapture"
      && ts.isJsxExpression(node.initializer) && node.initializer.expression?.getText(tree).includes("applyBlockList(next)")) handler = node.initializer.expression;
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(handler, "exercise the production Canvas paste boundary");
  const { outputText } = ts.transpileModule(`globalThis.paste = ${handler.getText(tree)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } });
  for (const writable of [true, false]) {
    const destination = freeze([{ id: "restricted", type: "group", layout: "flow", allowedBlocks: ["paragraph"], children: [{ id: "anchor", type: "paragraph", text: "Destination" }] }, structuredClone(notes)]);
    const changes = [], focused = [];
    let stopped = 0, prevented = 0, sequence = 0;
    const scope = {
      writable, previewing: false, codeEditor: null, currentListTextRange: () => null,
      readBlockClipboardPayload: clipboardPayloadFromHtml, findBlockById, parentOfNestedBlock, cloneClipboardPayloadForInsertion: payload => cloneClipboardPayloadForInsertion(payload, prefix => `${prefix}-${++sequence}`),
      copiedBlocksForParent, editBlockSiblings, addDocumentFootnotes, crypto: { randomUUID: () => `owner-${++sequence}` },
      Element: class {}, selectedBlockId: "anchor", activeDocument: { blocks: destination },
      applyBlockList: next => { assert.equal(validContentBlocks(next), true); assert.equal(permitsBlockTreeChanges(destination, next), true); changes.push(next); return true; },
      focusInsertedBlock: id => focused.push(id),
    };
    runInNewContext(outputText, scope);
    scope.paste({ target: {}, clipboardData: { getData: () => blockClipboardHtml([paragraph()], [paragraph(), notes]) }, preventDefault: () => prevented++, stopPropagation: () => stopped++ });
    assert.equal(changes.length, writable ? 1 : 0); assert.equal(prevented, writable ? 1 : 0); assert.equal(stopped, writable ? 1 : 0);
    if (!writable) continue;
    const next = changes[0], pasted = next[0].children[1];
    assert.equal(next[0].children.length, 2); assert.equal(next.length, 2); assert.equal(next[1].notes.length, 2);
    assert.equal(pasted.runs[1].inline.id, next[1].notes[1].id); assert.notEqual(pasted.runs[1].inline.id, "note");
    assert.equal(next[1].notes[0].id, "note"); assert.equal(focused[0], pasted.id);
    const committed = { workspace: { blocks: next }, ...commitHistory({ blocks: destination }, []) };
    assert.deepEqual(undoHistory(committed.workspace, committed.history, []).workspace.blocks, destination);
  }
});

test("partial block copy carries only referenced companion notes without changing source ownership", () => {
  const selected = freeze([paragraph()]);
  const source = freeze([...selected, { ...notes, notes: [...notes.notes, { id: "uncopied", text: "Unrelated note" }] }]);
  const before = JSON.stringify(source);
  const payload = createBlockClipboardPayload(selected, source);
  assert.deepEqual(payload.blocks, selected); assert.deepEqual(payload.footnotes, notes.notes);
  const html = blockClipboardHtml(selected, source);
  assert.match(html, /Note content/); assert.doesNotMatch(html, /Unrelated note/);
  assert.deepEqual(clipboardPayloadFromHtml(html), payload);
  assert.equal(JSON.stringify(source), before);
  assert.deepEqual(createBlockClipboardPayload(source, source).footnotes, [], "An already selected notes owner is not duplicated");
});

test("companions cover hidden and dormant Quote, nested List Item, Table cell and caption references once", () => {
  const blocks = freeze([
    { id: "hidden", type: "group", layout: "flow", editorial: { hidden: true }, children: [paragraph()] },
    { id: "quote", type: "quote", text: atom, runs: [reference("note")], children: [], attribution: atom, attributionRuns: [reference("note")] },
    { id: "list", type: "list", style: "unordered", items: [{ text: atom, runs: [reference("note")], children: [{ id: "nested", type: "list", style: "ordered", items: [{ text: atom, runs: [reference("note")] }] }] }] },
    { id: "table", type: "table", rows: [[atom]], cellRuns: [[[reference("note")]]], caption: atom, captionRuns: [reference("note")] },
  ]);
  const payload = createBlockClipboardPayload(blocks, [...blocks, notes]);
  assert.deepEqual(payload.footnotes, notes.notes);
  const restored = clipboardPayloadFromHtml(blockClipboardHtml(blocks, [...blocks, notes]));
  assert.deepEqual(restored, payload);
});

test("partial paste remaps notes and references together and attaches notes outside a restricted parent in one history transaction", () => {
  const payload = clipboardPayloadFromHtml(blockClipboardHtml([paragraph()], [paragraph(), notes]));
  let sequence = 0;
  const content = cloneClipboardPayloadForInsertion(payload, prefix => `${prefix}-${++sequence}`);
  const destination = freeze([{ id: "restricted", type: "group", layout: "flow", allowedBlocks: ["paragraph"], children: [] },
    { id: "destination-notes", type: "footnotes", notes: [{ id: "note", text: "Unrelated destination note" }] }]);
  const inserted = [{ ...destination[0], children: content.blocks }, destination[1]];
  const proposal = addDocumentFootnotes(inserted, content.blocks[0], content.footnotes, "new-owner");
  assert.equal(proposal.notesBlockId, "destination-notes"); assert.equal(proposal.blocks.length, 2);
  assert.equal(proposal.blocks[0].children.length, 1); assert.equal(proposal.blocks[1].notes.length, 2);
  const copiedReference = content.blocks[0].runs[1].inline.id;
  assert.notEqual(copiedReference, "note");
  assert.equal(proposal.blocks[1].notes[1].id, copiedReference); assert.equal(proposal.blocks[1].notes[1].text, "Note content");
  assert.equal(proposal.blocks[1].notes[0].text, "Unrelated destination note");
  assert.equal(validContentBlocks(proposal.blocks), true);
  const committed = { workspace: { blocks: proposal.blocks }, ...commitHistory({ blocks: destination }, []) };
  assert.equal(committed.history.length, 1);
  const undone = undoHistory(committed.workspace, committed.history, []);
  assert.deepEqual(undone.workspace.blocks, destination);
  assert.deepEqual(redoHistory(undone.workspace, undone.history, undone.future).workspace.blocks, proposal.blocks);
  assert.deepEqual(destination[0].children, []); assert.equal(payload.blocks[0].runs[1].inline.id, "note");
});

test("partial paste creates a visible notes owner when the only existing owner is hidden", () => {
  const source = paragraph();
  const blocks = [source, { id: "hidden-owner", type: "group", editorial: { hidden: true }, children: [notes] }];
  const result = addDocumentFootnotes(blocks, source, [{ id: "new-note", text: "Copied note" }], "visible-owner");
  assert.equal(result.notesBlockId, "visible-owner"); assert.equal(result.blocks.at(-1).notes[0].text, "Copied note");
  assert.equal(result.blocks[1], blocks[1]);
});

test("legacy partial clipboard references cannot bind to unrelated destination notes", () => {
  const legacy = { blocks: [legacyParagraph()], footnotes: [] };
  let sequence = 0;
  const copied = cloneClipboardPayloadForInsertion(legacy, prefix => `${prefix}-${++sequence}`);
  const mark = copied.blocks[0].runs[1].marks.find(mark => typeof mark !== "string");
  assert.notEqual(mark.id, "note"); assert.deepEqual(copied.footnotes, []);
  assert.equal(legacy.blocks[0].runs[1].marks[1].id, "note");
  assert.equal(cloneClipboardBlocks(legacy.blocks, prefix => `${prefix}-${++sequence}`)[0].runs[1].marks[1].id, "note", "Same-document duplication retains its unselected note owner");
});

test("clipboard metadata validates the complete original and rejects malformed, unrelated or duplicate companions", () => {
  const valid = { format: "acm-studio-blocks", version: 3, blocks: [paragraph()], footnotes: notes.notes };
  const parser = globalThis.DOMParser;
  try {
    for (const value of [
      { ...valid, footnotes: null }, { ...valid, footnotes: [{ id: "note", text: 7 }] },
      { ...valid, footnotes: [{ id: "unrelated", text: "Not referenced" }] },
      { ...valid, footnotes: [...notes.notes, ...notes.notes] },
      { ...valid, blocks: [paragraph(), notes] }, { ...valid, version: 5 },
    ]) {
      globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => JSON.stringify(value) }) }; } };
      assert.equal(readBlockClipboardPayload('data-acm-studio-blocks="fixture"'), null);
    }
    for (const version of [1, 2]) {
      globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => JSON.stringify({ format: "acm-studio-blocks", version, blocks: [legacyParagraph()] }) }) }; } };
      const old = readBlockClipboardPayload('data-acm-studio-blocks="fixture"');
      assert.equal(old.blocks[0].text, migratedLegacyText); assert.deepEqual(old.footnotes, []);
    }
  } finally { globalThis.DOMParser = parser; }
});

test("one Canvas editing policy disables all descendant rich fields while preserving explicit read-only fields", () => {
  // The untyped fixture deliberately exercises the public optional prop values.
  // eslint-disable-next-line react/prop-types
  function Field({ contentEditable }) {
    return createElement("div", { contentEditable: useRichTextEditing(contentEditable) });
  }
  for (const writable of [true, false]) for (const setting of [undefined, true, "true", false, "false", "inherit", "plaintext-only"]) {
    const html = renderToStaticMarkup(createElement(RichTextEditingProvider, { writable }, createElement(Field, { contentEditable: setting })));
    const expected = writable && setting !== false && setting !== "false";
    assert.match(html, new RegExp(`contentEditable="${expected}"`, "i"));
  }
});

test("the actual Canvas cleanup survives rapid ownership restoration and skips unmounted state", async () => {
  const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  const tree = ts.createSourceFile("studio-canvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(tree) === "useLayoutEffect" && node.arguments[1]?.getText(tree) === "[writable]" && node.arguments[0].getText(tree).includes("readonlyDraftsMountedRef")) callback = node.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(callback, "exercise the production ownership-loss callback");
  const { outputText } = ts.transpileModule(`globalThis.discard = ${callback.getText(tree)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } });
  for (const unmount of [false, true]) {
    const pending = [];
    const updates = [];
    const scope = {
      writable: false,
      readonlyDraftsMountedRef: { current: true },
      restoreRichTextMenuFocusBlockIdRef: { current: "paragraph" },
      queueMicrotask: task => pending.push(task),
      setRichTextMenuBlockId: value => updates.push(["menu", value]),
      setLanguageTarget: value => updates.push(["language", value]),
      languageCaptureRef: { current: { documentId: "old", baseline: "old" } },
      mathCaptureRef: { current: { documentId: "old", baseline: "old" } },
      setMathTarget: value => updates.push(["math", value]),
    };
    runInNewContext(outputText, scope);
    assert.equal(scope.discard(), undefined, "restoring ownership must not cancel discard");
    scope.writable = true;
    assert.equal(scope.discard(), undefined);
    if (unmount) scope.readonlyDraftsMountedRef.current = false;
    pending.forEach(task => task());
    assert.deepEqual(updates, unmount ? [] : [["menu", null], ["language", null], ["math", null]]);
    assert.equal(scope.mathCaptureRef.current === null, !unmount);
    assert.equal(scope.languageCaptureRef.current === null, !unmount);
    assert.equal(scope.restoreRichTextMenuFocusBlockIdRef.current, unmount ? "paragraph" : null);
  }
});

const mathObjects = await load("../app/content/math-runs.ts");
const equation = () => mathObjects.mathRun({ type: "math", latex: "x^2", alternativeText: "x squared", sourceRuns: [{ text: "x^2", marks: ["bold"] }] });
const mathParagraph = () => ({ id: "math", type: "paragraph", text: `before${atom}after`, runs: [{ text: "before" }, equation(), { text: "after" }] });

test("Math storage boundary gates and canonical writers cover active/Bin/publication/template/package/backup", () => {
  const doc = { ...initialStudioWorkspace.documents.find(item => item.kind === "post"), blocks: [mathParagraph()] };
  const article = toLocallyPublishedArticle(doc);
  const value = { ...initialStudioWorkspace, version: 24, documents: [doc], activeDocumentId: doc.id, bin: [{ id: "bin-math", deletedAt: "2026-10-04T12:00:00Z", document: { ...doc, id: "binned-math", slug: "binned-math" }, publication: { ...article, localDocumentId: "binned-math", slug: "binned-math" } }] };
  assert.deepEqual(validateStudioWorkspace(freeze(value)).bin[0].publication.blocks[0].runs[1], equation());
  assert.throws(() => validateStudioWorkspace({ ...value, version: 23 }));
  assert.equal(validatePublicationSnapshot({ version: 17, posts: [article] }).version, 18);
  assert.throws(() => validatePublicationSnapshot({ version: 16, posts: [article] }));
  const set = createTemplateSet(); set.parts[0].nodes = [mathParagraph()];
  const store = { ...emptyTemplateStore(), sets: [set] };
  assert.deepEqual(validateTemplateStore(store).sets[0].parts[0].nodes[0], mathParagraph());
  assert.throws(() => validateTemplateStore({ ...store, version: "0.24.0" }));
  const snapshot = { version: TEMPLATE_VERSION, set, templateId: set.templates[0].id };
  assert.deepEqual(validateTemplateSnapshot(snapshot).set.parts[0].nodes[0], mathParagraph());
  assert.throws(() => validateTemplateSnapshot({ ...snapshot, version: "0.24.0" }));
  const pkg = { format: "acm-studio-template-set", version: TEMPLATE_VERSION, set, media: [] };
  assert.deepEqual(validateTemplatePackage(pkg).set.parts[0].nodes[0], mathParagraph());
  assert.throws(() => validateTemplatePackage({ ...pkg, version: "0.24.0" }));
  const backup = validateStudioBackup({ format: "acm-studio-backup", version: 4, exportedAt: "2026-10-04T12:00:00Z", workspace: value, templates: store, publications: JSON.stringify({ version: 17, posts: [article] }), media: { folders: [], assets: [] } });
  assert.equal(backup.workspace.version, 24);
  assert.deepEqual(JSON.parse(backup.publications).posts[0].blocks[0].runs[1], equation());
});
test("Math Mini Golf draft/definition boundaries preserve authored rich content", () => {
  const blocks = [...initialMiniGolfDraft.documents[0].blocks, mathParagraph()];
  const identity = { pageId: "mini-golf-home", instanceId: "prod", source: { revision: "fixture", fileHashes: {} } };
  const definition = blocksToMiniGolfPageDefinition(blocks, identity);
  assert.equal(definition.version, 5);
  assert.deepEqual(parseMiniGolfPageDefinition(definition).blocks.at(-1), mathParagraph());
  assert.throws(() => parseMiniGolfPageDefinition({ ...definition, version: 4 }));
  const originalWindow = globalThis.window;
  try {
    const draft = { ...initialMiniGolfDraft, version: 24, documents: [{ ...initialMiniGolfDraft.documents[0], blocks }] };
    for (const version of [12, 13]) {
      const source = JSON.stringify({ format: "mini-golf-page-draft", version, workspace: draft });
      globalThis.window = { localStorage: { getItem: () => source, setItem: () => assert.fail("load must remain read-only") } };
      if (version === 12) assert.throws(() => createMiniGolfDraftRepository("fixture").load());
      else assert.deepEqual(createMiniGolfDraftRepository("fixture").load().documents[0].blocks.at(-1), mathParagraph());
    }
  } finally { globalThis.window = originalWindow; }
});
test("Math clipboard v4 round-trips recovery formats and rejects older Math envelopes", () => {
  const html = blockClipboardHtml([mathParagraph()]);
  const payload = html.match(/data-acm-studio-blocks="([^"]*)"/)[1].replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
  const original = JSON.parse(payload), previous = globalThis.DOMParser;
  try {
    for (const version of [3, 4]) {
      globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => JSON.stringify({ ...original, version }) }) }; } };
      const result = readBlockClipboardPayload(html);
      if (version === 3) assert.equal(result, null);
      else {
        assert.deepEqual(result.blocks[0], mathParagraph());
        assert.deepEqual(cloneClipboardPayloadForInsertion(result).blocks[0].runs[1], equation());
      }
    }
  } finally { globalThis.DOMParser = previous; }
});
test("actual Math HTML export/import has one equation and exact typed source", () => {
  const block = mathParagraph(), html = blockToHtml(block);
  assert.equal((html.match(/class="katex"/g) ?? []).length, 1);
  assert.match(html, /data-math-object=/);
  withListHtmlDom(() => { const parsed = parseHtmlToBlock(html, block); assert.equal(parsed.error, undefined); assert.equal(JSON.stringify(parsed.block.runs), JSON.stringify(block.runs)); });
});

test("extended Language floors cover publication, templates, packages, Mini Golf and clipboard", () => {
  for (const language of ["", "en-u-ca-gregory"]) {
    const mark = { type: "language", language, direction: "rtl" };
    const block = { id: "language", type: "paragraph", text: "authored", runs: [{ text: "authored", marks: [mark] }] };
    const doc = { ...initialStudioWorkspace.documents.find(item => item.kind === "post"), blocks: [block] };
    const article = toLocallyPublishedArticle(doc);
    assert.deepEqual(validatePublicationSnapshot({ version: 17, posts: [article] }).posts[0].blocks[0].runs, block.runs);
    assert.throws(() => validatePublicationSnapshot({ version: 16, posts: [article] }));
    const set = createTemplateSet(); set.parts[0].nodes = [block];
    const store = { ...emptyTemplateStore(), sets: [set] };
    assert.deepEqual(validateTemplateStore(store).sets[0].parts[0].nodes[0].runs, block.runs);
    assert.throws(() => validateTemplateStore({ ...store, version: "0.24.0" }));
    const snapshot = { version: TEMPLATE_VERSION, set, templateId: set.templates[0].id };
    assert.deepEqual(validateTemplateSnapshot(snapshot).set.parts[0].nodes[0].runs, block.runs);
    assert.throws(() => validateTemplateSnapshot({ ...snapshot, version: "0.24.0" }));
    const pkg = { format: "acm-studio-template-set", version: TEMPLATE_VERSION, set, media: [] };
    assert.deepEqual(validateTemplatePackage(pkg).set.parts[0].nodes[0].runs, block.runs);
    assert.throws(() => validateTemplatePackage({ ...pkg, version: "0.24.0" }));
    const blocks = [...initialMiniGolfDraft.documents[0].blocks, block];
    const definition = blocksToMiniGolfPageDefinition(blocks, { pageId: "mini-golf-home", instanceId: "prod", source: { revision: "fixture", fileHashes: {} } });
    assert.deepEqual(parseMiniGolfPageDefinition(definition).blocks.at(-1).runs, block.runs);
    assert.throws(() => parseMiniGolfPageDefinition({ ...definition, version: 4 }));
    const previousWindow = globalThis.window, previousParser = globalThis.DOMParser;
    try {
      const draft = { ...initialMiniGolfDraft, version: 24, documents: [{ ...initialMiniGolfDraft.documents[0], blocks }] };
      for (const version of [12, 13]) {
        const source = JSON.stringify({ format: "mini-golf-page-draft", version, workspace: draft });
        globalThis.window = { localStorage: { getItem: () => source, setItem: () => assert.fail("read must not write") } };
        if (version === 12) assert.throws(() => createMiniGolfDraftRepository("language-fixture").load());
        else assert.deepEqual(createMiniGolfDraftRepository("language-fixture").load().documents[0].blocks.at(-1).runs, block.runs);
      }
      for (const version of [3, 4]) {
        globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => JSON.stringify({ format: "acm-studio-blocks", version, blocks: [block], footnotes: [] }) }) }; } };
        const result = readBlockClipboardPayload('data-acm-studio-blocks="fixture"');
        if (version === 3) assert.equal(result, null);
        else assert.deepEqual(result.blocks[0].runs, block.runs);
      }
    } finally { globalThis.window = previousWindow; globalThis.DOMParser = previousParser; }
  }
});

test("actual HTML parser retains legacy Language spans and direction-only bdo", () => withListHtmlDom(() => {
  const block = { id: "language", type: "paragraph", text: "ancien direction", runs: [{ text: "ancien", marks: [{ type: "language", language: "fr", direction: "ltr" }] }, { text: " direction", marks: [{ type: "language", language: "", direction: "rtl" }] }] };
  const exported = blockToHtml(block);
  assert.deepEqual(parseHtmlToBlock(exported, block).block.runs, block.runs);
  const legacy = exported.replace('<bdo lang="fr" dir="ltr">ancien</bdo>', '<span lang="fr" dir="ltr">ancien</span>');
  assert.deepEqual(parseHtmlToBlock(legacy, block).block.runs, block.runs);
}));
