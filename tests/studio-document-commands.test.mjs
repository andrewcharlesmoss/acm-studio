import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";

const { useStudioDocumentCommands: createDocumentCommands } = await loadProductionModule(new URL("../app/studio/use-studio-document-commands.ts", import.meta.url));
const { createDocument } = await loadProductionModule(new URL("../app/studio/editor-model.ts", import.meta.url));
const { createTemplateSet, emptyTemplateStore, validateTemplateSet } = await loadProductionModule(new URL("../app/studio/template-model.ts", import.meta.url));
const { cloneTemplateIntoSet } = await loadProductionModule(new URL("../app/studio/template-cloning.ts", import.meta.url));

function fixture(options = {}) {
  const first = { ...createDocument("post"), id: "first", title: "First", status: options.published ? "published" : "draft" };
  const second = { ...createDocument("page"), id: "second", title: "Second" };
  let workspace = { version: 24, documents: options.only ? [first] : [first, second], activeDocumentId: first.id, categories: [], bin: [] };
  let store = { ...emptyTemplateStore(), assignments: options.assigned ? [{ documentId: first.id, kind: "post", setId: "set", templateId: "layout" }] : [] };
  const feedback = [], operations = [];
  const publication = options.published ? { id: first.id, title: "Published", blocks: first.blocks } : undefined;
  let storedPublication = publication;
  let templateCommits = 0;
  const templates = { store, writable: options.templateWritable !== false, commit(update) {
    operations.push("template"); templateCommits++;
    if (options.templateFailure === templateCommits) return false;
    store = update(store); return true;
  } };
  const commit = update => {
    operations.push("workspace");
    if (options.workspaceThrows) throw new Error("Rejected workspace");
    if (options.workspaceFailure) return false;
    workspace = update(workspace); return true;
  };
  const publications = {
    capture() { operations.push("capture"); return storedPublication; },
    unpublish() { operations.push("unpublish"); storedPublication = undefined; if (options.unpublishThrows) throw new Error("Uncertain remove"); },
    restore(value) { operations.push("restore"); if (options.restoreThrows) throw new Error("Cannot restore"); storedPublication = value; },
  };
  const commands = createDocumentCommands({ workspace, activeDocument: first, commit, setActiveDocument: id => operations.push(`select:${id}`), writable: options.writable !== false,
    exclusiveWritable: options.exclusiveWritable !== false, templates, feedback: message => feedback.push(message), publications });
  return { commands, first, second, publication, feedback, operations, workspace: () => workspace, store: () => store, publicationValue: () => storedPublication };
}

test("document duplication targets the requested record and uses fresh IDs", () => {
  const f = fixture(); const copy = f.commands.duplicateDocument("second");
  assert.equal(copy.title, "Second copy"); assert.notEqual(copy.id, "second");
  assert.equal(f.workspace().documents.length, 3);
  assert.equal(f.workspace().activeDocumentId, copy.id);
});
test("rename targets the requested document, retaining unrelated records and data", () => {
  const f = fixture(); assert.equal(f.commands.renameDocument("second", "  Revised  "), true);
  assert.equal(f.workspace().documents[0].title, "First");
  assert.equal(f.workspace().documents[1].title, "Revised");
  assert.equal(f.workspace().activeDocumentId, "first");
  assert.equal(f.commands.renameDocument("missing", "Anything"), false);
  assert.equal(f.commands.renameDocument("second", " "), false);
});
test("read-only document commands refuse every write", () => {
  const f = fixture({ writable: false, assigned: true, published: true });
  assert.equal(f.commands.addDocument("page"), null);
  assert.equal(f.commands.duplicateDocument(), null);
  assert.equal(f.commands.renameDocument("first", "Changed"), false);
  assert.equal(f.commands.moveDocumentToBin(), false);
  assert.deepEqual(f.operations, []);
});
test("rejected duplication and rename do not report success", () => {
  const f = fixture({ workspaceFailure: true });
  assert.equal(f.commands.duplicateDocument(), null);
  assert.equal(f.commands.renameDocument("first", "Changed"), false);
  assert.equal(f.workspace().documents.length, 2);
});
test("create from template commits assignment before document", () => {
  const f = fixture(); const created = f.commands.addDocument("page", { setId: "set", templateId: "layout" });
  assert.ok(created); assert.deepEqual(f.operations, ["template", "workspace"]);
  assert.equal(f.store().assignments[0].documentId, created.id);
  assert.equal(f.workspace().activeDocumentId, created.id);
});
for (const options of [{ workspaceFailure: true }, { workspaceThrows: true }]) {
  test(`create compensates template assignment when workspace ${options.workspaceThrows ? "throws" : "rejects"}`, () => {
    const f = fixture(options); assert.equal(f.commands.addDocument("page", { setId: "set", templateId: "layout" }), null);
    assert.deepEqual(f.store().assignments, []); assert.equal(f.workspace().documents.length, 2);
    assert.deepEqual(f.operations, ["template", "workspace", "template"]);
    assert.match(f.feedback[0], /could not be created/);
  });
}
test("failed create compensation reports recovery instructions", () => {
  const f = fixture({ workspaceFailure: true, templateFailure: 2 });
  assert.equal(f.commands.addDocument("page", { setId: "set", templateId: "layout" }), null);
  assert.match(f.feedback[0], /Keep this page open and export a Backup/);
});
test("template creation refuses unavailable template ownership", () => {
  const f = fixture({ templateWritable: false });
  assert.equal(f.commands.addDocument("page", { setId: "set", templateId: "layout" }), null);
  assert.deepEqual(f.operations, []);
});
test("Bin captures document, assignment and immutable publication in order", () => {
  const f = fixture({ assigned: true, published: true });
  assert.equal(f.commands.moveDocumentToBin(), true);
  assert.deepEqual(f.operations, ["capture", "template", "unpublish", "workspace"]);
  const entry = f.workspace().bin[0];
  assert.equal(entry.document, f.first); assert.equal(entry.publication, f.publication);
  assert.equal(entry.assignment.documentId, "first"); assert.equal(f.workspace().activeDocumentId, "second");
  assert.deepEqual(f.store().assignments, []); assert.equal(f.publicationValue(), undefined);
});
test("Bin refuses published and assigned records without required ownership", () => {
  for (const options of [{ published: true, exclusiveWritable: false }, { assigned: true, templateWritable: false }]) {
    const f = fixture(options); assert.equal(f.commands.moveDocumentToBin(), false); assert.deepEqual(f.operations, []);
  }
});
test("Bin assignment rejection leaves publication and workspace intact", () => {
  const f = fixture({ published: true, assigned: true, templateFailure: 1 });
  assert.equal(f.commands.moveDocumentToBin(), false);
  assert.deepEqual(f.operations, ["capture", "template"]);
  assert.equal(f.publicationValue(), f.publication); assert.equal(f.workspace().bin.length, 0);
});
for (const option of ["workspaceFailure", "workspaceThrows", "unpublishThrows"]) {
  test(`Bin restores both stores after ${option}`, () => {
    const f = fixture({ published: true, assigned: true, [option]: true });
    assert.equal(f.commands.moveDocumentToBin(), false);
    assert.equal(f.publicationValue(), f.publication);
    assert.equal(f.store().assignments[0].documentId, "first"); assert.equal(f.workspace().bin.length, 0);
    assert.deepEqual(f.operations.slice(-2), ["restore", "template"]);
  });
}
test("Bin failed restoration reports Backup recovery while retaining document", () => {
  const f = fixture({ published: true, assigned: true, workspaceFailure: true, restoreThrows: true });
  assert.equal(f.commands.moveDocumentToBin(), false); assert.equal(f.workspace().documents.length, 2);
  assert.equal(f.store().assignments[0].documentId, "first"); assert.match(f.feedback[0], /export a Backup/);
});
test("Bin supports last-document and inactive-document removal", () => {
  const last = fixture({ only: true }); assert.equal(last.commands.moveDocumentToBin(), true);
  assert.equal(last.workspace().activeDocumentId, ""); assert.equal(last.workspace().bin.length, 1);
  const inactive = fixture(); assert.equal(inactive.commands.moveDocumentToBin("second"), true);
  assert.equal(inactive.workspace().activeDocumentId, "first");
});
test("template cloning copies reader-valid Group and nested part references", () => {
  const source = createTemplateSet("Source"), destination = createTemplateSet("Destination");
  source.parts = [{ id: "outer", name: "Outer", kind: "header", nodes: [{ id: "nested-ref", type: "part", partId: "inner" }] },
    { id: "inner", name: "Inner", kind: "footer", nodes: [{ id: "p", type: "paragraph", text: "Keep me", runs: [{ text: "Keep me" }] }] }];
  const layout = { ...source.templates[0], nodes: [{ id: "group", type: "group", layout: "stack", children: [{ id: "ref", type: "part", partId: "outer" }] }] };
  const result = cloneTemplateIntoSet(source, layout, destination, "Cloned");
  validateTemplateSet({ ...destination, templates: [...destination.templates, { ...result.template, isDefault: false }], parts: [...destination.parts, ...result.parts] });
  assert.equal(result.parts.length, 2); assert.notEqual(result.template.id, layout.id);
  const outer = result.parts.find(part => part.name === "Outer"), inner = result.parts.find(part => part.name === "Inner");
  assert.equal(result.template.nodes[0].children[0].partId, outer.id);
  assert.equal(outer.nodes[0].partId, inner.id); assert.notEqual(inner.nodes[0].id, "p");
  assert.equal(inner.nodes[0].runs[0].text, "Keep me"); assert.equal(layout.nodes[0].children[0].partId, "outer");
});
test("same-set cloning keeps shared part references without duplicating parts", () => {
  const source = createTemplateSet(); const layout = { ...source.templates[0], nodes: [{ id: "ref", type: "part", partId: source.parts[0].id }] };
  const result = cloneTemplateIntoSet(source, layout, source, "Shared");
  assert.deepEqual(result.parts, []); assert.equal(result.template.nodes[0].partId, source.parts[0].id);
  assert.notEqual(result.template.nodes[0].id, "ref");
});
