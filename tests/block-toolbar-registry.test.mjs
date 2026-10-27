import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";

const registry = await loadProductionModule(new URL("../app/studio/blocks/toolbar-registry.ts", import.meta.url));
const profiles = await loadProductionModule(new URL("../app/studio/blocks/capability-profiles.ts", import.meta.url));
const library = await loadProductionModule(new URL("../app/studio/blocks/library-catalogue.ts", import.meta.url));
const ids = controls => controls.map(control => control.id);

test("capability profiles expose the canonical toolbar definition used by the block Library", () => {
  for (const entry of library.blockLibraryEntries) {
    assert.ok(entry.profile.toolbar, `${entry.type} has a toolbar definition`);
    assert.equal(entry.profile.toolbar, registry.blockToolbarDefinitionFor(entry.type), `${entry.type} shares the registry object`);
  }
  assert.equal(profiles.listItemCapabilityProfile.toolbar, registry.blockToolbarDefinitionFor("list"));
});

test("Quote toolbar resolves the citation label and pressed state from the selected context", () => {
  const hidden = registry.resolveBlockToolbar({ block: { id: "q", type: "quote" }, writable: true, citationVisible: false });
  const citation = hidden.find(control => control.id === "quote-citation");
  assert.equal(citation.label, "Add citation");
  assert.equal(citation.pressed, false);

  const visible = registry.resolveBlockToolbar({ block: { id: "q", type: "quote" }, writable: true, citationVisible: true });
  assert.equal(visible.find(control => control.id === "quote-citation").label, "Remove citation");
  assert.equal(visible.find(control => control.id === "quote-citation").pressed, true);
  assert.deepEqual(registry.resolveBlockToolbar({ block: { id: "q", type: "quote" }, previewing: true }), []);
});

test("table toolbar omits content controls for empty tables and includes them for populated tables", () => {
  const empty = registry.resolveBlockToolbar({ block: { id: "t", type: "table" }, hasRows: false });
  assert.equal(ids(empty).includes("table-structure"), false);
  assert.equal(ids(empty).includes("table-caption"), false);
  const populated = registry.resolveBlockToolbar({ block: { id: "t", type: "table" }, hasRows: true });
  assert.equal(ids(populated).includes("table-column-alignment"), true);
  assert.equal(ids(populated).includes("table-cell-alignment"), true);
  assert.equal(ids(populated).includes("table-structure"), true);
  assert.equal(ids(populated).includes("table-caption"), true);
});

test("Image toolbar exposes separate image destination and caption controls", () => {
  const actions = registry.resolveBlockToolbar({ block: { id: "image", type: "image" }, writable: true });
  assert.equal(ids(actions).includes("image-link"), true);
  assert.equal(ids(actions).includes("image-caption"), true);
  assert.equal(ids(actions).includes("link"), true);
  const readOnly = registry.resolveBlockToolbar({ block: { id: "image", type: "image" }, writable: false });
  assert.equal(readOnly.find(action => action.id === "image-link").disabled, true);
  assert.equal(readOnly.find(action => action.id === "image-caption").disabled, true);
});

test("Title toolbar exposes presentation controls without enabling document text formatting", () => {
  const context = { block: { id: "title", type: "document-title" }, writable: true, moveLocked: true, removeLocked: true };
  const actions = registry.resolveBlockToolbar(context);
  assert.ok(ids(actions).includes("title-level"));
  assert.ok(ids(actions).includes("text-alignment"));
  for (const id of ["bold", "italic", "link", "text-formatting"]) assert.ok(!ids(actions).includes(id));
  for (const id of ["title-level", "text-alignment"]) {
    assert.equal(actions.find(action => action.id === id).disabled, false, "movement locks retain presentation editing");
    assert.equal(registry.resolveBlockToolbar({ ...context, writable: false }).find(action => action.id === id).disabled, true);
  }
  assert.deepEqual(registry.resolveBlockToolbar({ ...context, previewing: true }), []);
});

test("selected List Items switch context and suppress root-only move and transform controls", () => {
  const selected = registry.resolveBlockToolbar({ block: { id: "list", type: "list" }, hasListItemSelection: true, writable: true });
  assert.equal(ids(selected).includes("list-item-switcher"), true);
  assert.equal(ids(selected).includes("list-item-actions"), true);
  assert.equal(ids(selected).includes("transform"), false);
  assert.equal(ids(selected).includes("drag"), false);
  assert.equal(ids(selected).includes("move"), false);
});

test("read-only, locked, and cross-item contexts explain unavailable commands", () => {
  const readOnly = registry.resolveBlockToolbar({ block: { id: "p", type: "paragraph" }, writable: false, blockAlignable: true, hasTextSelection: true });
  assert.equal(readOnly.find(control => control.id === "bold").disabled, true);
  assert.equal(readOnly.find(control => control.id === "bold").disabledReason, "This editor is read-only.");
  assert.equal(readOnly.find(control => control.id === "block-alignment").disabledReason, "This editor is read-only.");
  assert.equal(readOnly.find(control => control.id === "text-alignment").disabledReason, "This editor is read-only.");
  const locked = registry.resolveBlockToolbar({ block: { id: "p", type: "paragraph" }, writable: true, moveLocked: true, removeLocked: true });
  assert.equal(locked.find(control => control.id === "drag").disabledReason, "This block is locked against moving.");
  assert.equal(locked.find(control => control.id === "delete").disabledReason, "This block is locked against removal.");
  const range = registry.resolveBlockToolbar({ block: { id: "p", type: "paragraph" }, writable: true, acrossListItems: true });
  assert.equal(range.find(control => control.id === "bold").disabledReason, "Select text within one List Item for this action.");
});

test("Page Link toolbar is owned by the template navigation editor and retains its ordered actions", () => {
  const definition = registry.blockToolbarDefinitionFor("page-link");
  assert.equal(definition.commandOwner, "template-navigation-editor");
  const controls = registry.resolveBlockToolbar({ block: { type: "page-link" }, writable: true, selected: true });
  assert.deepEqual(ids(controls), ["page-link-parent", "page-link-reorder", "page-link-edit", "page-link-add", "bold", "italic", "page-link-options"]);
});

test("multiple selection resolves its structural toolbar and disables destructive work when read-only", () => {
  const actions = registry.resolveBlockToolbar({ block: { type: "multi-selection" }, multipleSelection: true, writable: false });
  assert.deepEqual(ids(actions), ["options", "delete", "clear-selection"]);
  assert.equal(actions.find(action => action.id === "delete").disabledReason, "This editor is read-only.");
  assert.equal(actions.find(action => action.id === "clear-selection").disabled, false);
  assert.deepEqual(registry.resolveBlockToolbar({ block: { type: "multi-selection" }, multipleSelection: false }), []);
});

 test("Reading Time toolbar exposes mode and alignment without rich formatting", () => {
  const context = { block: { id: "reading", type: "reading-time" }, writable: true, moveLocked: true, removeLocked: true };
  const actions = registry.resolveBlockToolbar(context);
  for (const id of ["reading-time-mode", "text-alignment"]) {
    assert.equal(actions.find(action => action.id === id).disabled, false);
    assert.equal(registry.resolveBlockToolbar({ ...context, writable: false }).find(action => action.id === id).disabled, true);
  }
  for (const id of ["bold", "italic", "link", "text-formatting"]) assert.ok(!ids(actions).includes(id));
  assert.deepEqual(registry.resolveBlockToolbar({ ...context, previewing: true }), []);
});
