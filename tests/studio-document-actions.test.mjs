import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";
const { createTemplateSet, emptyTemplateStore, validateTemplateSet } = await loadProductionModule(new URL("../app/studio/template-model.ts", import.meta.url));
const { cloneTemplateIntoSet } = await loadProductionModule(new URL("../app/studio/template-cloning.ts", import.meta.url));
const { createDocument } = await loadProductionModule(new URL("../app/studio/editor-model.ts", import.meta.url));
const source = await readFile(new URL("../app/studio/use-studio-document-actions.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source.replace(/^import .*;\n/gm, ""), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

// Run the actual controller with a small state adapter, not a browser renderer.
function harness(options = {}) {
  const state = []; let index = 0, store = { ...emptyTemplateStore(), sets: [createTemplateSet()] };
  const calls = [], feedback = [];
  const document = { ...createDocument("page"), id: "page", title: "Page" };
  const useState = value => { const key = index++; if (!(key in state)) state[key] = value; return [state[key], value => { state[key] = typeof value === "function" ? value(state[key]) : value; }]; };
  const controller = new Function("exports", "useState", "createTemplateSet", "cloneTemplateIntoSet", `${code}\nreturn exports.useStudioDocumentActions;`)({}, useState, createTemplateSet, cloneTemplateIntoSet);
  const props = { workspace: { documents: [document] }, activeDocument: document, resolvedDocument: document,
    templateSession: { store, writable: true, commit(update) { calls.push("template"); if (options.saveThrows) throw new Error("Rejected"); if (options.saveRejected) return false; store = update(store); return true; } },
    documentCommands: { addDocument(kind, choice) { calls.push({ action: "create", kind, choice }); return options.createRejected ? null : { kind }; },
      duplicateDocument(id) { calls.push({ action: "duplicate", id }); return options.duplicateRejected ? null : {}; },
      renameDocument(id, name) { calls.push({ action: "rename", id, name }); return !options.renameRejected; },
      moveDocumentToBin(id) { calls.push({ action: "bin", id }); return !options.binRejected; } },
    writable: true, codeEditorDirty: false, confirmCodeEditorDiscard: () => !options.discardRejected,
    onDocumentCreated: kind => calls.push({ action: "activate", kind }), onDocumentDuplicated: () => calls.push("duplicated"),
    onDocumentRemoved: id => calls.push({ action: "removed", id }), feedback: message => feedback.push(message), ...options.props };
  function render() { index = 0; return controller(props); }
  return { render, props, calls, feedback, store: () => store };
}
for (const rejected of ["saveRejected", "saveThrows"]) {
  test(`${rejected} preserves the save template draft and shows an error`, () => {
    const h = harness({ [rejected]: true }); h.render().saveAsTemplate(); let actions = h.render(); const draft = actions.saveTemplateDialog;
    actions.commitSaveAsTemplate(draft); actions = h.render();
    assert.equal(actions.saveTemplateDialog, draft); assert.match(actions.actionError, /could not be saved/);
    assert.equal(h.calls.length, 1); assert.equal(h.store().sets[0].templates.length, 2);
  });
}
test("accepted template save closes the draft and produces reader-valid data", () => {
  const h = harness(); h.render().saveAsTemplate(); const a = h.render(); a.commitSaveAsTemplate(a.saveTemplateDialog);
  assert.equal(h.render().saveTemplateDialog, undefined); assert.equal(h.store().sets[0].templates.length, 3);
  validateTemplateSet(h.store().sets[0]);
});
test("template controls refuse unavailable template ownership without blocking Rename", () => {
  const h = harness(); h.props.templateSession.writable = false;
  const a = h.render(); a.saveAsTemplate(); a.addDocumentFromTemplate(); a.requestRenameDocument("page");
  assert.equal(h.render().saveTemplateDialog, undefined); assert.equal(h.render().newTemplateChoice, undefined);
  assert.equal(h.render().renameDocumentDialog.documentId, "page"); h.render().confirmRenameDocument();
  assert.equal(h.render().renameDocumentDialog, null); assert.equal(h.calls[0].action, "rename");
});
test("failed template create preserves choice and avoids screen activation", () => {
  const h = harness({ createRejected: true }); h.render().addDocumentFromTemplate(); const choice = h.render().newTemplateChoice;
  h.render().commitNewDocumentFromTemplate(); const a = h.render();
  assert.equal(a.newTemplateChoice, choice); assert.match(a.actionError, /could not be created/);
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].action, "create");
});
test("accepted create activates the new kind only after the command accepts", () => {
  const h = harness(); h.render().addDocumentFromTemplate(); h.render().commitNewDocumentFromTemplate();
  assert.equal(h.render().newTemplateChoice, undefined); assert.equal(h.calls[0].action, "create"); assert.equal(h.calls[1].action, "activate");
});
test("dirty code blocks duplicate and Bin commands", () => {
  const h = harness({ props: { codeEditorDirty: true } }); const a = h.render(); a.duplicateDocument(); a.requestDeleteDocument();
  assert.deepEqual(h.calls, []); assert.equal(h.feedback.length, 2);
});
test("declined discard leaves create and template dialogs closed", () => {
  const h = harness({ discardRejected: true }); const a = h.render(); a.addDocument("page"); a.addDocumentFromTemplate(); a.saveAsTemplate();
  assert.deepEqual(h.calls, []); assert.equal(h.render().newTemplateChoice, undefined); assert.equal(h.render().saveTemplateDialog, undefined);
});
test("failed rename and Bin retain their drafts and screen selection", () => {
  const h = harness({ renameRejected: true, binRejected: true }); h.render().requestRenameDocument("page"); h.render().confirmRenameDocument();
  assert.ok(h.render().renameDocumentDialog); assert.match(h.render().actionError, /could not be renamed/);
  h.render().requestDeleteDocument(); assert.ok(!h.calls.some(call => call.action === "removed"));
});
test("document context duplication passes the explicit target", () => {
  const h = harness(); h.render().duplicateDocument("specific"); assert.deepEqual(h.calls, [{ action: "duplicate", id: "specific" }, "duplicated"]);
});
