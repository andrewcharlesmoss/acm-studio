import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { StudioCanvas, BlockField } = await loadProductionModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url));
const { miniGolfPresentation } = await loadProductionModule(new URL("../app/studio/mini-golf-presentation.tsx", import.meta.url));
const blocks = [
  { id: "preceding", type: "paragraph", text: "Earlier", style: { textIndent: "2em" } },
  { id: "group", type: "group", layout: "stack", children: [{ id: "nested-list", type: "list", style: "unordered", items: ["First", "Second"] }, { id: "nested-table", type: "table", rows: [["Cell"]] }] },
  { id: "after", type: "paragraph", text: "Later" },
];
const document = { id: "adapted-example", kind: "post", title: "Example", slug: "example", status: "draft", blocks };
const mediaUrls = { managed: "blob:http://localhost:3010/adapted-example" };

function canvas(extra = {}) {
  const fields = [];
  const contexts = [];
  const html = renderToStaticMarkup(createElement(StudioCanvas, {
    activeDocument: document, previewing: false, writable: true, selectedBlockId: "nested-list",
    wordCount: 0, characterCount: 0, linkTargets: [], mediaBlockUrls: mediaUrls,
    presentation: { renderBlock(context) {
      contexts.push(context);
      const field = context.renderEditableBlock(context.block);
      fields.push(field);
      return field;
    } }, ...extra,
  }));
  return { html, fields, contexts };
}

test("presentation overrides preserve Canvas callbacks and editing roots", () => {
  const sample = { ...document, title: "Sample document", blocks: [{ id: "sample", type: "paragraph", text: "Sample content" }] };
  const fields = [];
  canvas({ presentation: { renderBlock(context) {
    const field = context.renderEditableBlock(context.block, { document: sample, templatePlaceholder: true, spacerOrientation: "horizontal" });
    fields.push(field); return field;
  } } });
  assert.equal(fields.length, blocks.length);
  for (const field of fields) {
    assert.equal(field.props.document, sample);
    assert.equal(field.props.rootBlocks, blocks);
    assert.equal(field.props.templatePlaceholder, true);
    assert.equal(field.props.spacerOrientation, "horizontal");
    for (const name of ["onTextSelection", "onTableCellFocus", "onLinkActivate", "onListItemSelection", "onListItemLinkActivate", "onChange"]) assert.equal(typeof field.props[name], "function", name);
  }
});

test("Canvas supplies the complete canonical field contract to an adapted presentation", () => {
  const { fields } = canvas();
  assert.equal(fields.length, blocks.length);
  for (const [index, field] of fields.entries()) {
    assert.equal(field.type, BlockField);
    assert.equal(field.props.block, blocks[index]);
    assert.equal(field.props.document, document);
    assert.equal(field.props.rootBlocks, blocks);
    assert.equal(field.props.mediaUrls, mediaUrls);
    for (const key of ["onTextSelection", "onLinkActivate", "onListItemSelection", "onListItemLinkActivate", "onTableCellFocus", "renderBlockControls", "onOpenNestedInserter", "onInsertNestedBlock", "onChange"]) assert.equal(typeof field.props[key], "function", key);
  }
  assert.equal(fields[1].props.previousParagraphIndent, "2em");
});

test("adapted fields preserve paragraph/list commands and child insertion ownership", () => {
  const split = () => "split";
  const merge = () => null;
  const splitMany = () => [];
  const exit = () => null;
  const inserted = [];
  const { fields } = canvas({ onSplitParagraph: split, onMergeParagraphBackward: merge, onSplitParagraphs: splitMany, onExitList: exit, onInsertBlock: (...args) => inserted.push(args) });
  const props = fields[1].props;
  assert.equal(props.onSplitParagraph, split);
  assert.equal(props.onMergeParagraphBackward, merge);
  assert.equal(props.onSplitParagraphs, splitMany);
  assert.equal(props.onExitList, exit);
  props.onInsertNestedBlock("paragraph", "group");
  assert.deepEqual(inserted, [["paragraph", "group"]]);
});

test("adapted updates retain the exact owning block and unchanged-source guard", () => {
  let current = blocks[1];
  const owners = [];
  const { fields } = canvas({ onUpdateBlock(id, change) { owners.push(id); current = change(current); } });
  const next = { ...current, children: [...current.children, { id: "added", type: "paragraph", text: "New" }] };
  fields[1].props.onChange(next, true);
  assert.equal(current, next);
  assert.deepEqual(owners, ["group"]);
  const staleNext = { ...blocks[1], children: [] };
  fields[1].props.onChange(staleNext, true);
  assert.equal(current, next);
});

test("read-only adapted fields cannot dispatch child insertion", () => {
  const { fields } = canvas({ writable: false, onInsertBlock() { assert.fail("Read-only insertion"); } });
  assert.equal(fields[1].props.writable, false);
  fields[1].props.onInsertNestedBlock("paragraph", "group");
});

test("delegating an adapted field preserves nested toolbar and List item targets", () => {
  const { html } = canvas();
  assert.match(html, /data-studio-nested-block-id="nested-list"/);
  assert.match(html, /data-list-context-id="nested-list"/);
  assert.match(html, /data-list-item-index="1"/);
  assert.match(html, /aria-label="More text formatting"/);
  assert.match(html, /aria-label="Add block"|> Add block<\/button>/);
});

test("Mini Golf delegates generic blocks to the supplied editor and never during Preview", () => {
  for (const block of [blocks[1], { id: "list", type: "list", style: "unordered", items: ["Item"] }, { id: "image", type: "image", src: "/image.png", alt: "Image" }, { id: "quote", type: "quote", text: "Quote" }, { id: "code", type: "code", code: "example" }, { id: "table", type: "table", rows: [["Cell"]] }]) {
    const calls = [];
    const renderEditableBlock = value => { calls.push(value); return createElement("span", { "data-editor-delegate": value.id }, "Canonical editor"); };
    const base = { document: { ...document, blocks: [block] }, block, mediaUrls, writable: true, renderEditableBlock, onDocumentFieldChange() {}, onFocusDocumentField() {} };
    assert.match(renderToStaticMarkup(miniGolfPresentation.renderBlock({ ...base, mode: "edit" })), /data-editor-delegate/);
    assert.deepEqual(calls, [block]);
    calls.length = 0;
    assert.doesNotMatch(renderToStaticMarkup(miniGolfPresentation.renderBlock({ ...base, mode: "preview" })), /data-editor-delegate/);
    assert.equal(calls.length, 0);
  }
});

test("Mini Golf canonical score-table fallback delegates the table identity once", () => {
  const table = { id: "authored", type: "table", rows: [["Cell"]], caption: "Notes" };
  const block = { id: "scorecard", type: "section", role: "scorecard", layout: "stack", children: [table] };
  const calls = [];
  const html = renderToStaticMarkup(miniGolfPresentation.renderBlock({ document: { ...document, blocks: [block] }, block, mode: "edit", renderEditableBlock(value) { calls.push(value); return createElement("span", {}, "Canonical score editor"); } }));
  assert.deepEqual(calls, [table]);
  assert.match(html, /Canonical score editor/);
});

test("Mini Golf keeps site-specific text presentation outside the generic delegate", () => {
  const block = { id: "hero", type: "paragraph", text: "Course note", siteRole: "eyebrow" };
  const html = renderToStaticMarkup(miniGolfPresentation.renderBlock({ document: { ...document, blocks: [block] }, block, mode: "edit", writable: false, renderEditableBlock() { assert.fail("Site-specific text must retain its renderer"); } }));
  assert.match(html, /Course note/);
});

test("nested adapted blocks receive one toolbar while root blocks keep the Canvas toolbar owner", () => {
  const list = { id: "section-list", type: "list", style: "unordered", items: ["Item"] };
  const table = { id: "score-table", type: "table", rows: [["Cell"]], caption: "Notes" };
  const section = { id: "scorecard", type: "section", role: "scorecard", layout: "stack", children: [table, list] };
  const controls = [];
  const base = { document: { ...document, blocks: [section] }, mode: "edit", renderEditableBlock: () => createElement("span", {}, "Field"), renderBlockControls(block) { controls.push(block.id); return createElement("button", { "data-nested-toolbar": block.id }, "Toolbar"); } };
  const html = renderToStaticMarkup(miniGolfPresentation.renderBlock({ ...base, block: section }));
  assert.deepEqual(controls, [table.id, list.id]);
  assert.equal(html.split('data-nested-toolbar="score-table"').length - 1, 1);
  assert.match(html, /class="studio-nested-block"/);
  controls.length = 0;
  renderToStaticMarkup(miniGolfPresentation.renderBlock({ ...base, document: { ...document, blocks: [list] }, block: list }));
  assert.equal(controls.length, 0);
});
