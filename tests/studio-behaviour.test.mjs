import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import test from "node:test";
import { studioHistoryShortcut, handleStudioHistoryShortcut } from "../app/studio/studio-history-shortcuts.mjs";
import {
  addDocumentToWorkspace,
  commitHistory,
  deleteDocumentFromWorkspace,
  duplicateBlockAt,
  duplicateDocumentWithIds,
  duplicateNestedBlockById,
  findBlockById,
  insertBlockAt,
  moveBlockAt,
  redoHistory,
  removeBlockById,
  removeNestedBlockById,
  updateBlockById,
  undoHistory,
} from "../app/studio/studio-command-operations.mjs";

function document() {
  return { id: "post-1", kind: "post", title: "Post", blocks: [{ id: "a", type: "paragraph" }, { id: "b", type: "heading" }] };
}

test("block commands preserve order while inserting, moving, duplicating and removing", () => {
  const inserted = insertBlockAt(document(), { id: "c", type: "quote" }, 0);
  assert.deepEqual(inserted.blocks.map((block) => block.id), ["a", "c", "b"]);
  const moved = moveBlockAt(inserted, 2, 0);
  assert.deepEqual(moved.blocks.map((block) => block.id), ["b", "a", "c"]);
  const duplicated = duplicateBlockAt(moved, 1, (type) => `${type}-copy`);
  assert.deepEqual(duplicated.blocks.map((block) => block.id), ["b", "a", "paragraph-copy", "c"]);
  assert.deepEqual(removeBlockById(duplicated, "a").blocks.map((block) => block.id), ["b", "paragraph-copy", "c"]);
});

test("nested blocks support lookup, update, removal and deep duplication", () => {
  const nested = { ...document(), blocks: [{ id: "group", type: "group", layout: "stack", children: [{ id: "table", type: "table", rows: [["A"]] }] }] };
  assert.equal(findBlockById(nested.blocks, "table").type, "table");
  const updated = updateBlockById(nested, "table", (block) => ({ ...block, rows: [["B"]] }));
  assert.equal(findBlockById(updated.blocks, "table").rows[0][0], "B");
  const duplicated = duplicateNestedBlockById(updated, "group", (type) => `${type}-copy`);
  assert.deepEqual(duplicated.blocks.map((block) => block.id), ["group", "group-copy"]);
  assert.equal(duplicated.blocks[1].children[0].id, "table-copy");
  assert.equal(findBlockById(removeNestedBlockById(updated, "table").blocks, "table"), null);
});

test("new code blocks start empty for the editor placeholder", async () => {
  const source = await readFile(new URL("../app/studio/editor-model.ts", import.meta.url), "utf8");
  assert.match(source, /if \(type === "code"\) return \{ id, type, language: "text", code: "" \};/);
});

test("new table blocks start with an editable two-row grid", async () => {
  const source = await readFile(new URL("../app/studio/editor-model.ts", import.meta.url), "utf8");
  assert.match(source, /if \(type === "table"\) return \{ id, type, rows: \[\["", "", ""\], \["", "", ""\]\] \};/);
});

test("table editing exposes row and column actions from the toolbar menu", async () => {
  const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(source, /aria-label="Table options"/);
  assert.match(source, /Insert row before/);
  assert.match(source, /Delete column/);
});

test("block options expose a safe Gutenberg-style Edit as HTML action", async () => {
  const [canvas, htmlEditor, styles] = await Promise.all([
    readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio-html-editor.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
  ]);
  assert.match(canvas, /aria-label="More block options"/);
  assert.match(canvas, /role="menuitem" onMouseDown=\{preserveTextSelection\} onClick=\{\(\) => openHtmlEditor\(block\)\}/);
  assert.match(canvas, /<strong>Edit as HTML<\/strong>/);
  assert.match(canvas, /parseHtmlToBlock\(htmlEditor\.draft, block\)/);
  assert.match(htmlEditor, /export function blockToHtml/);
  assert.match(htmlEditor, /export function parseHtmlToBlock/);
  assert.match(htmlEditor, /Component blocks are code-backed/);
  assert.match(htmlEditor, /Scripts, event handlers and unsafe elements are not supported/);
  assert.match(htmlEditor, /Each block must have a unique data-block-id/);
  assert.match(canvas, /That edit would duplicate another block ID/);
  assert.match(htmlEditor, /Each block must have a unique block ID/);
  assert.match(htmlEditor, /This HTML would create an invalid block/);
  assert.match(htmlEditor, /Table rows must all contain the same number of cells/);
  assert.match(htmlEditor, /plainTextFromRuns/);
  assert.match(styles, /\.block-options-menu \{[^}]*background: white[^}]*position: absolute/);
  assert.match(styles, /\.html-editor-popover textarea \{[^}]*font-family: ui-monospace[^}]*font-size: 13px/);
  assert.match(canvas, /className="block-options-menu" role="menu" tabIndex=\{-1\}/);
});

test("the shared canvas exposes a recursive List View for block structure", async () => {
  const [canvas, styles, presentation] = await Promise.all([
    readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/mini-golf-presentation.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(canvas, /aria-label="List View"/);
  assert.match(canvas, /function StudioListView/);
  assert.match(canvas, /blockChildren\(block\)/);
  assert.match(canvas, /aria-expanded={expanded}/);
  assert.match(canvas, /scrollIntoView\({ block: "nearest"/);
  assert.match(canvas, /data-studio-block-anchor-id={block\.id}/);
  assert.match(canvas, /data-studio-nested-block-id={block\.id}/);
  assert.match(presentation, /data-studio-nested-block-id={child\.id}/);
  assert.match(styles, /\.studio-list-view \{/);
  assert.match(styles, /\.studio-list-item\.is-selected/);
});

test("the shared canvas exposes a document-level Gutenberg-style code editor", async () => {
  const [canvas, htmlEditor, styles, prototype, siteEditor] = await Promise.all([
    readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio-html-editor.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/mini-golf-site-editor.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(canvas, /aria-label="Code editor"/);
  assert.match(canvas, /function StudioCodeEditor/);
  assert.match(canvas, /blocksToHtml\(activeDocument\.blocks\)/);
  assert.match(canvas, /initialDraft/);
  assert.match(canvas, /initialBlocksSnapshot/);
  assert.match(canvas, /draft !== current\.initialDraft/);
  assert.match(canvas, /parseHtmlToBlocks\(codeEditor\.draft, activeDocument\.blocks\)/);
  assert.match(canvas, /codeEditor\.documentId !== activeDocument\.id/);
  assert.match(canvas, /JSON\.stringify\(activeDocument\.blocks\) !== codeEditor\.initialBlocksSnapshot/);
  assert.match(canvas, /This document changed outside the code editor/);
  assert.match(canvas, /Discard unsaved code changes\?/);
  assert.match(canvas, /Exit code editor/);
  assert.match(canvas, /id="studio-code-source"/);
  assert.match(canvas, /Wrap text/);
  assert.match(canvas, /Format code/);
  assert.match(canvas, /Code is already formatted/);
  assert.match(canvas, /Formatting unavailable while another Studio tab owns editing/);
  assert.match(canvas, /aria-pressed={wrapText}/);
  assert.match(canvas, /wrap={wrapText \? "soft" : "off"}/);
  assert.match(canvas, /highlightCode\(state\.draft, "html"\)/);
  assert.match(canvas, /className="studio-code-highlight" aria-hidden="true"/);
  assert.match(canvas, /onScroll={syncHighlightScroll}/);
  assert.match(htmlEditor, /export function blocksToHtml/);
  assert.match(htmlEditor, /export function formatHtml/);
  assert.match(htmlEditor, /textContainers/);
  assert.match(htmlEditor, /tagStack/);
  assert.match(htmlEditor, /export function parseHtmlToBlocks/);
  assert.match(htmlEditor, /Component blocks are code-backed/);
  assert.match(styles, /\.studio-code-source, \.studio-code-highlight \{[^}]*font-family: ui-monospace[^}]*width: 100%/);
  assert.match(styles, /\.studio-code-source-wrap \{[^}]*position: relative/);
  assert.match(styles, /\.studio-code-highlight \{[^}]*pointer-events: none[^}]*position: absolute/);
  assert.match(styles, /\.studio-code-source-wrap\.is-wrapped \.studio-code-source, \.studio-code-source-wrap\.is-wrapped \.studio-code-highlight/);
  assert.match(styles, /\.studio-code-source\.is-wrapped \{[^}]*white-space: pre-wrap/);
  assert.match(prototype, /function confirmCodeEditorDiscard/);
  assert.match(siteEditor, /function confirmCodeEditorDiscard/);
});

test("the block appender exposes Gutenberg's slash prompt and add control", async () => {
  const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(source, /placeholder="Type \/ to choose a block"/);
  assert.match(source, /aria-label="Add block"/);
});

test("the cover image exposes a between-block inserter", async () => {
  const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(source, /aria-label="Add block below cover image"/);
  assert.match(source, /openInserter\(-1\)/);
});

test("block hover controls group the source-faithful move chevrons vertically", async () => {
  const [canvas, styles] = await Promise.all([
    readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
  ]);
  assert.match(canvas, /className="block-move-controls" role="group" aria-label="Move block"/);
  assert.equal((canvas.match(/StudioIcon name="chevron-down"/g) ?? []).length >= 2, true);
  assert.match(styles, /\.block-move-controls \{[^}]*grid-template-rows: repeat\(2, 18px\)/);
  assert.match(styles, /\.canvas-block-toolbar \{[^}]*background: var\(--studio-toolbar-background\)/s);
  assert.match(styles, /\.canvas-block-toolbar \{[^}]*border: 1px solid var\(--studio-toolbar-border\)/s);
  assert.match(styles, /\.canvas-block-toolbar button \{[^}]*height: 30px[^}]*width: 30px/);
  assert.match(styles, /\.canvas-block-toolbar button:focus-visible \{[^}]*outline:/);
  assert.match(styles, /\.canvas-block-actions \{[^}]*align-items: center[^}]*display: flex/);
  assert.match(styles, /\.move-block-up svg \{ transform: rotate\(180deg\); \}/);
  const order = [
    canvas.indexOf("<BlockTransformControl"),
    canvas.indexOf('className="drag-handle"'),
    canvas.indexOf('className="block-move-controls"'),
    canvas.indexOf('className="canvas-format-actions"'),
    canvas.indexOf('className="canvas-block-actions"'),
    canvas.indexOf('aria-label="Duplicate block"'),
    canvas.indexOf('aria-label="Remove block"'),
  ];
  assert.equal(order.every((position) => position >= 0), true);
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test("Files view controls centre their source-faithful icons", async () => {
  const styles = await readFile(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(styles, /\.media-view-switcher button \{[^}]*align-items: center[^}]*display: inline-flex[^}]*justify-content: center[^}]*padding: 0/);
});

test("double-clicking a local image opens an accessible media preview", async () => {
  const [manager, styles] = await Promise.all([
    readFile(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/media.css", import.meta.url), "utf8"),
  ]);
  assert.match(manager, /onDoubleClick=\{\(event\) => openImagePreview\(asset, event\.currentTarget\)\}/);
  assert.match(manager, /<dialog ref=\{previewDialogRef\} className="media-preview-dialog" aria-labelledby="media-preview-title"/);
  assert.match(manager, /aria-label="Close image preview"/);
  assert.match(manager, /dialog\.showModal\(\)/);
  assert.match(manager, /previewTriggerRef\.current\?\.focus\(\)/);
  assert.match(styles, /\.media-preview-dialog::backdrop \{ background: rgba\(25, 26, 28, \.72\); \}/);
});

test("the document bar keeps a fixed, vertically centred layout", async () => {
  const source = await readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(source, /\.editor-document-bar \{[^}]*height: 64px[^}]*min-height: 64px/);
  assert.match(source, /\.editor-document-counts strong \{[^}]*text-overflow: ellipsis[^}]*white-space: nowrap/);
  assert.match(source, /\.editor-document-actions button \{[^}]*height: 40px[^}]*justify-content: center/);
});

test("the document inspector exposes Gutenberg-style status and publish date controls", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("../app/studio/studio-inspectors.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
  ]);
  assert.match(source, /Status &amp; visibility/);
  assert.match(source, /publish-calendar-grid/);
  assert.match(source, /aria-label="Previous month"/);
  assert.match(source, /aria-label="Next month"/);
  assert.match(source, /UTC\+0/);
  assert.match(source, /Now/);
  assert.match(source, /const publishDate = document\.publishAt \? formatPublishDate\(document\.publishAt\) : "Immediately";/);
  assert.match(source, /function publishImmediately\(\) \{\s*onChange\("publishAt", undefined\);/);
  assert.doesNotMatch(source, /Use immediately/);
  assert.match(source, /documentStatusDescription/);
  assert.match(source, /onChange\("publishAt"/);
  assert.match(source, /aria-haspopup="dialog" aria-controls="publish-date-popover"/);
  assert.match(source, /trigger\.closest\("\.studio-inspector"\)\?\.getBoundingClientRect\(\)\.left/);
  assert.match(source, /globalThis\.document\.addEventListener\("pointerdown", closePublishPopover\)/);
  assert.match(source, /event\.target\.closest\("button, input, select, textarea, a\[href\], \[tabindex\]:not\(\[tabindex='-1'\]\)"\)/);
  assert.match(source, /event\.key !== "Escape"/);
  assert.match(styles, /\.publish-date-popover \{[^}]*position: fixed[^}]*z-index: 20/);
});

test("text blocks expose the source-faithful Gutenberg transform control", async () => {
  const [canvas, transforms, icons] = await Promise.all([
    readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/block-transforms.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio-icons.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(canvas, /aria-label=\{`Transform \$\{blockLabel\(block\.type\)\} block`\}/);
  assert.match(canvas, /Transform to/);
  assert.match(transforms, /availableBlockTransforms/);
  assert.match(transforms, /transformBlock/);
  assert.match(icons, /Source revision: 1addb122219043a1ac1c38f817c71255ae16d6e3/);
});

test("auto-height fields avoid observing the element they resize", async () => {
  const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.equal((source.match(/observer\.observe\(observedElement\)/g) ?? []).length, 2);
  assert.ok((source.match(/requestAnimationFrame\(/g) ?? []).length >= 2);
  assert.match(source, /cancelAnimationFrame\(animationFrame\)/);
});

test("document commands add, duplicate and delete documents without losing the active selection", () => {
  const workspace = { activeDocumentId: "post-1", documents: [document()] };
  const copy = duplicateDocumentWithIds(document(), (kind) => `${kind}-2`, (type) => `${type}-2`);
  const withCopy = addDocumentToWorkspace(workspace, copy);
  assert.equal(withCopy.activeDocumentId, "post-2");
  assert.equal(withCopy.documents.length, 2);
  const afterDelete = deleteDocumentFromWorkspace(withCopy, "post-2");
  assert.equal(afterDelete.activeDocumentId, "post-1");
  assert.equal(afterDelete.documents.length, 1);
});

test("history supports undo and redo and clears redo after a new commit", () => {
  const first = { value: 1 };
  const second = { value: 2 };
  const third = { value: 3 };
  const committed = commitHistory(first, [], 60);
  const undone = undoHistory(second, committed.history, committed.future, 60);
  assert.equal(undone.workspace.value, 1);
  const redone = redoHistory(undone.workspace, undone.history, undone.future, 60);
  assert.equal(redone.workspace.value, 2);
  const newCommit = commitHistory(third, redone.history, 60);
  assert.deepEqual(newCommit.future, []);
});


test("List View stays blue while hovered and selected canvas blocks use red outlines", () => {
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /\.studio-list-item:not\(\.is-selected\):hover\s*\{[^}]*background: var\(--accent-soft\);[^}]*border-color: var\(--accent\)/);
  assert.match(css, /\.canvas-block:not\(\.is-selected\):is\(:hover, \[data-studio-hovered="true"\]\)\s*\{\s*border-color: #cc1818;/);
  assert.match(css, /\.canvas-block:not\(\.is-selected\):is\(:hover, \[data-studio-hovered="true"\]\)\s*\{[^}]*outline: 1px solid #cc1818;[^}]*outline-offset: -1px;/);
  assert.match(css, /\.canvas-block\.is-selected\s*\{[^}]*border-color: #cc1818;[^}]*outline: 1px solid #cc1818;[^}]*outline-offset: -1px;/);
  assert.match(css, /\.studio-list-item\.is-selected\s*\{[^}]*border-color: var\(--accent\)/);
  assert.match(css, /\.canvas-block\.is-table\.is-selected \.table-field \{ border-color: #cc1818;/);
});


test("nested editor hover and selection use red inset outlines", () => {
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  const presentation = readFileSync(new URL("../app/studio/mini-golf-presentation.tsx", import.meta.url), "utf8");
  assert.match(css, /\.block-canvas :is\(\.studio-nested-block, \[data-studio-selected\]\):not\(\[data-studio-selected="true"\]\):is\(:hover, \[data-studio-hovered="true"\]\) \{ outline: 1px solid #cc1818; outline-offset: -1px;/);
  assert.match(css, /\[data-studio-selected="true"\] \{ outline: 1px solid #cc1818; outline-offset: -1px;/);
  assert.match(canvas, /data-studio-selected=\{selectedBlockId === child.id\}/);
  assert.match(presentation, /"data-studio-selected": context.selectedBlockId === block.id/);
  assert.match(presentation, /<BlockField block=\{block\} selectedBlockId=\{context.selectedBlockId\}/);
});


test("List View pointer hover marks its matching top-level or nested canvas block", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  const presentation = readFileSync(new URL("../app/studio/mini-golf-presentation.tsx", import.meta.url), "utf8");
  assert.match(canvas, /onPointerEnter=\{\(\) => onHoverBlock\(block.id\)\}/);
  assert.match(canvas, /onPointerLeave=\{\(\) => onHoverBlock\(null\)\}/);
  assert.match(canvas, /data-studio-hovered=\{hoveredBlockId === block.id\}/);
  assert.match(canvas, /data-studio-hovered=\{hoveredBlockId === child.id\}/);
  assert.match(presentation, /"data-studio-hovered": context.hoveredBlockId === block.id/);
  assert.match(presentation, /hoveredBlockId=\{context.hoveredBlockId\}/);
});


test("closing List View clears cross-highlighting on toggle, Preview, Code and unmount", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(canvas, /setHoveredBlockId\(null\); onSetShowInserter\(false\); setListViewOpen\(\(current\) => !current\)/);
  assert.match(canvas, /setHoveredBlockId\(null\); setListViewOpen\(false\); onSetShowInserter\(false\); onPreviewChange\(true\)/);
  assert.match(canvas, /function openCodeEditor[\s\S]*?setHoveredBlockId\(null\);\s*setListViewOpen\(false\)/);
  assert.match(canvas, /function closeListView\(\) \{\s*setHoveredBlockId\(null\)/);
  assert.match(canvas, /useLayoutEffect\(\(\) => \(\) => onHoverBlock\(null\), \[onHoverBlock\]\)/);
});


test("between-block inserters stay in the reserved gap without margin collapse", () => {
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /\.block-position \{ display: flow-root; position: relative; \}/);
  assert.match(css, /\.block-position \+ \.block-position \.canvas-block \{ margin-top: 30px; \}/);
  assert.match(css, /\.cover-inserter-position \{ height: 30px; position: relative; \}/);
  assert.match(css, /\.cover-inserter-position \.between-blocks \{ top: 0; \}/);
});


test("Mini Golf centres insertion cues in source spacing without adding a layout gap", () => {
  const css = readFileSync(new URL("../app/studio/site-draft.css", import.meta.url), "utf8");
  assert.match(css, /\.mini-golf-editor-surface \.block-position \{ display: block; \}/);
  assert.match(css, /\.mini-golf-editor-surface \.block-position > \.between-blocks \{ top: -23px; \}/);
  assert.match(css, /\.mini-golf-editor-surface \.block-position \+ \.block-position \.canvas-block \{ margin-top:0; \}/);
});


test("history shortcuts follow Mac and Windows/Linux conventions and prevent native history", () => {
  const event = (key, modifiers = {}) => ({ key, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false, ...modifiers });
  for (const [platform, key, modifiers, expected] of [
    ["MacIntel", "z", { metaKey: true }, "undo"],
    ["MacIntel", "Z", { metaKey: true, shiftKey: true }, "redo"],
    ["Win32", "z", { ctrlKey: true }, "undo"],
    ["Win32", "y", { ctrlKey: true }, "redo"],
    ["Linux x86_64", "y", { ctrlKey: true }, "redo"],
    ["Linux x86_64", "z", { ctrlKey: true, shiftKey: true }, "redo"],
  ]) {
    let calls = "";
    let prevented = false;
    assert.equal(handleStudioHistoryShortcut({ ...event(key, modifiers), preventDefault() { prevented = true; } }, platform, () => { calls += "undo"; }, () => { calls += "redo"; }), true);
    assert.equal(calls, expected);
    assert.equal(prevented, true);
  }
  for (const [platform, key, modifiers] of [
    ["MacIntel", "z", { ctrlKey: true }], ["MacIntel", "y", { metaKey: true }],
    ["Win32", "z", { metaKey: true }], ["Win32", "y", { ctrlKey: true, shiftKey: true }],
    ["Win32", "s", { ctrlKey: true }], ["MacIntel", "Escape", {}],
    ["Win32", "z", { ctrlKey: true, altKey: true }], ["MacIntel", "z", { metaKey: true, defaultPrevented: true }],
  ]) assert.equal(studioHistoryShortcut(event(key, modifiers), platform), null);
});

test("both editors share history shortcuts without replacing save or Escape handling", () => {
  const studio = readFileSync(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8");
  const miniGolf = readFileSync(new URL("../app/studio/mini-golf-site-editor.tsx", import.meta.url), "utf8");
  const hook = readFileSync(new URL("../app/studio/use-studio-history-shortcuts.ts", import.meta.url), "utf8");
  assert.match(studio, /useStudioHistoryShortcuts\(undoStudio, redoStudio, studioSection === "content"\)/);
  assert.match(studio, /function undoStudio\(\) \{\s*undo\(\);\s*setSelectedBlockId\(null\)/);
  assert.match(studio, /function redoStudio\(\) \{\s*redo\(\);\s*setSelectedBlockId\(null\)/);
  assert.match(miniGolf, /useStudioHistoryShortcuts\(undo, redo, view === "page"\)/);
  assert.doesNotMatch(studio, /event.key.toLowerCase\(\) === "z"/);
  assert.match(studio, /event.key.toLowerCase\(\) === "s"/);
  assert.match(studio, /event.key === "Escape"/);
  assert.match(hook, /removeEventListener\("keydown", handleKeyDown\)/);
});


test("history shortcuts leave independent text editing surfaces to native undo", () => {
  const target = (contexts, editable = true) => ({
    isContentEditable: false,
    matches: () => editable,
    closest(selector) { return selector.split(",").some(part => contexts.includes(part.trim())) ? this : null; },
  });
  for (const surface of [".site-settings", ".site-codex", ".studio-code-editor", ".html-editor-popover", ".link-editor-popover", ".block-inserter", ".mini-golf-runtime-table", ".mini-golf-editor-surface .setup", ".mini-golf-editor-surface .table-size-control"]) {
    let prevented = false;
    let changed = false;
    const handled = handleStudioHistoryShortcut({ key: "z", metaKey: true, target: target([surface, ".block-canvas"]), preventDefault() { prevented = true; } }, "MacIntel", () => { changed = true; }, () => { changed = true; });
    assert.equal(handled, false, surface);
    assert.equal(prevented, false, surface);
    assert.equal(changed, false, surface);
  }
  assert.equal(studioHistoryShortcut({ key: "y", ctrlKey: true, target: target([]) }, "Win32"), null);
  for (const surface of [".document-heading", ".table-field", ".rich-text-editor"]) {
    assert.equal(studioHistoryShortcut({ key: "z", metaKey: true, target: target([surface, ".block-canvas"]) }, "MacIntel"), "undo");
  }
  assert.equal(studioHistoryShortcut({ key: "z", metaKey: true, target: target(["[data-studio-table-authoring]", ".mini-golf-runtime-table", ".block-canvas"]) }, "MacIntel"), "undo");
  const hook = readFileSync(new URL("../app/studio/use-studio-history-shortcuts.ts", import.meta.url), "utf8");
  assert.match(hook, /if \(!enabled\) return;/);
  assert.match(hook, /\[undo, redo, enabled\]/);
});

test("design canvas resets zoom with the platform zero shortcut", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /event\.target instanceof HTMLSelectElement/);
  assert.doesNotMatch(editor, /event\.target instanceof HTMLButtonElement/);
  assert.match(editor, /const zoomReset = event\.key === "0" \|\| event\.code === "Digit0" \|\| event\.code === "Numpad0"/);
  assert.match(editor, /if \(commandOrControl && zoomReset\) \{ event\.preventDefault\(\); setZoom\(100\); \}/);
});

test("design canvas history shortcuts survive page and layer button focus", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /else if \(commandOrControl && event\.key\.toLowerCase\(\) === "z"\) \{ event\.preventDefault\(\); if \(event\.shiftKey\) redo\(\); else undo\(\); \}/);
  assert.match(editor, /else if \(\(event\.ctrlKey && event\.key\.toLowerCase\(\) === "y"\)\) \{ event\.preventDefault\(\); redo\(\); \}/);
  assert.doesNotMatch(editor, /event\.target instanceof HTMLButtonElement/);
});

test("design canvas keeps layers in the left pane and offers an all-pages view", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(editor, /aria-label="Design pages and layers"/);
  assert.match(editor, /const \[leftPaneTab, setLeftPaneTab\] = useState<"pages" \| "layers">\("pages"\)/);
  assert.match(editor, /role="tablist" aria-label="Design navigation"/);
  assert.match(editor, /role="tab"[\s\S]*>Pages<\/button>[\s\S]*role="tab"[\s\S]*>Layers<\/button>/);
  assert.match(editor, /aria-controls=\{leftPaneTab === "pages" \? "design-pages-tabpanel" : undefined\}/);
  assert.match(editor, /aria-controls=\{leftPaneTab === "layers" \? "design-layers-tabpanel" : undefined\}/);
  assert.match(editor, /leftPaneTab === "pages" \? <div className="design-page-list"/);
  assert.match(editor, /id="design-pages-tab"/);
  assert.match(editor, /id="design-pages-tabpanel" role="tabpanel" aria-labelledby="design-pages-tab"/);
  assert.match(editor, /id="design-layers-tabpanel" role="tabpanel" aria-labelledby="design-layers-tab" aria-label="Layers"><LayerList/);
  assert.match(editor, /<LayerList page=\{activePage\}/);
  assert.match(editor, /className=\{`design-canvas-scroll\$\{allPagesVisible/);
  assert.match(editor, /className=\{`design-all-page\$\{isActive/);
  assert.match(editor, /className="design-all-page-heading" style=\{\{ width: `\$\{zoom\}%` \}\}/);
  assert.match(editor, />Edit Page<\/button>/);
  assert.match(editor, /event\.stopPropagation\(\); selectPage\(page\.id\)/);
  assert.match(editor, /aria-label=\{allPagesVisible \? "View single page" : "View all pages"\}/);
  assert.match(editor, /\{allPagesVisible \? "View single page" : "View all pages"\}/);
  assert.match(css, /\.design-page-list \{ align-content: start;/);
  assert.match(css, /\.design-all-page-heading \{ align-items: center; box-sizing: border-box; display: flex; justify-content: space-between; margin-inline: auto; min-height: 28px; padding: 0 4px; \}/);
  assert.match(css, /\.design-canvas-help \{ color: var\(--muted\); font-size: 12px; line-height: 1\.3; margin: 0; padding: 4px 18px 8px; \}/);
  assert.match(css, /\.design-main \{ display: grid; grid-template-columns: minmax\(0, 1fr\); grid-template-rows: auto minmax\(0, 1fr\); min-height: 0; min-width: 0; \}/);
  assert.match(css, /\.design-canvas-area \{ display: grid; grid-template-rows: auto minmax\(0, 1fr\) auto; min-height: 0; min-width: 0; \}/);
  assert.doesNotMatch(editor, /design-selection-box/);
  assert.doesNotMatch(css, /design-selection-box/);
  assert.match(css, /\.design-rotate-handle:hover \{ fill: #8b3dff !important/);
  assert.match(css, /\.design-rotate-handle:hover \+ \.design-rotate-icon \{ color: #fff; \}/);
  assert.match(css, /\.design-resize-handle, \.design-endpoint-handle, \.design-rotate-handle \{ fill: #fff !important/);
  assert.match(css, /\.design-resize-handle \{ stroke: #aeb3bf/);
  assert.match(css, /\.design-pane-tabs button\.is-active \{ border-bottom-color: var\(--accent\);/);
});

test("design image resizing keeps proportions by default and uses Shift for freeform sizing", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /function shouldKeepResizeRatio\(object: DesignObject, shiftKey: boolean\)/);
  assert.match(editor, /keepRatio: shouldKeepResizeRatio\(object, event\.shiftKey\)/);
  assert.match(editor, /resizeObject\(item, handle, dx, dy, page, shouldKeepResizeRatio\(item, event\.shiftKey\), false\)/);
  assert.match(editor, /Images keep their proportions by default; hold Shift to stretch them/);
});

test("design pages expose corner handles for direct resizing", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /function resizePage\(page: DesignPage, handle: ResizeHandle, dx: number, dy: number, keepRatio: boolean\)/);
  assert.match(editor, /const pageResizeRef = useRef<PageResizeInteraction \| null>\(null\)/);
  assert.match(editor, /showPageResizeHandles={tool === "select" && selectedIds.length === 0}/);
  assert.match(editor, /aria-label={label} className={`design-resize-handle handle-\$\{handle\}`}/);
  assert.match(editor, /function onPageResizePointerDown\(event: PointerEvent<SVGCircleElement>, handle: ResizeHandle\)/);
  assert.match(editor, /function onPageResizeKeyDown\(event: ReactKeyboardEvent<SVGCircleElement>, handle: ResizeHandle\)/);
  assert.match(editor, /Drag a page corner to resize the page/);
});

test("design snapping uses Canva-style solid page guides and dotted object guides", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(editor, /type Guide = \{ axis: "x" \| "y"; position: number; style: "solid" \| "dotted" \}/);
  assert.match(editor, /position: activePage\.width \/ 2, style: "solid"/);
  assert.match(editor, /position: item\.x \+ item\.width \/ 2, style: "dotted"/);
  assert.match(editor, /className=\{`design-guide design-guide-\$\{guide\.style\}`\}/);
  assert.match(css, /\.design-guide \{ opacity: \.8; pointer-events: none; stroke: #ff00ff; stroke-width: 2;/);
  assert.match(css, /\.design-guide-solid \{ stroke-dasharray: none; \}/);
  assert.match(css, /\.design-guide-dotted \{ stroke-dasharray: 2 4; \}/);
});

test("design rotation handle uses one dedicated SVG glyph", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  const icons = readFileSync(new URL("../app/studio/studio-icons.tsx", import.meta.url), "utf8");
  assert.match(editor, /<StudioIcon name="rotate" size=\{28 \* controlScale\}/);
  assert.doesNotMatch(editor, /design-rotate-connector/);
  assert.doesNotMatch(editor, /<StudioIcon name="undo" size=\{13\}.*<StudioIcon name="redo" size=\{13\}/);
  assert.match(icons, /case "rotate": return <svg/);
  assert.match(icons, /M8\.5 5\.5a6\.5 6\.5 0 0 0 0 13/);
});

test("design rotation control hides during drag and keeps the rotation cursor", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(editor, /const \[isRotating, setIsRotating\] = useState\(false\)/);
  assert.match(editor, /!isRotating \? <><circle role="button"/);
  assert.match(editor, /setIsRotating\(true\)/);
  assert.match(editor, /setIsRotating\(false\)/);
  assert.match(editor, /function rotationBadgePoint\(/);
  assert.match(editor, /if \(interaction\.mode === "rotate"\) setRotationCursor\(point\)/);
  assert.match(editor, /rotationCursor=\{isActive \? rotationCursor : null\}/);
  assert.match(css, /\.design-rotate-handle \{[^}]*cursor: ew-resize/);
  assert.match(css, /\.design-rotate-handle:focus-visible \{ outline: none !important; stroke: #8b3dff/);
  assert.match(css, /\.design-page-svg\.is-rotating, \.design-page-svg\.is-rotating \* \{ cursor: ew-resize !important; \}/);
  assert.match(css, /\.design-page-svg\.is-rotating \.design-rotation-badge,\n\.design-page-svg\.is-rotating \.design-rotation-badge \* \{ cursor: default !important; \}/);
  assert.match(editor, /rx=\{7 \* controlScale\}/);
});

test("design resize cursors follow the selected object's rotation", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /function resizeCursor\(handle: ResizeHandle, rotation: number\)/);
  assert.match(editor, /style=\{\{ cursor: resizeCursor\(handle, object\.rotation\) \}\}/);
  assert.match(editor, /const axis = \(\(handleAngles\[handle\] \+ rotation\) % 180 \+ 180\) % 180/);
});

test("design objects use a four-way cursor while moving", () => {
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(css, /\.design-page-svg\.is-select-mode \.design-object:active \{ cursor: move; \}/);
  assert.match(css, /\.design-page-svg\.is-select-mode \.design-object\.is-locked:active \{ cursor: default; \}/);
});

test("design canvas controls keep a constant screen size as zoom changes", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /const controlScale = 100 \/ Math\.max\(1, zoom\)/);
  assert.match(editor, /r=\{10 \* controlScale\}/);
  assert.match(editor, /r=\{18 \* controlScale\}/);
  assert.match(editor, /width=\{50 \* controlScale\}/);
  assert.match(editor, /height=\{30 \* controlScale\}/);
  assert.match(editor, /fontSize: `\$\{13 \* controlScale\}px`/);
  assert.match(editor, /zoom=\{zoom\} page=\{activePage\}/);
});

test("selected arrows expose endpoint controls instead of corner and rotate controls", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /selectedIds\.includes\(object\.id\) && object\.type !== "arrow" \? \(\(\) => \{/);
  assert.match(editor, /selectedIds\.includes\(object\.id\) && object\.type === "arrow" \? <>/);
  assert.match(editor, /aria-label="Resize arrow from start point"/);
  assert.match(editor, /aria-label="Resize arrow from end point"/);
  assert.match(editor, /function resizeArrowEndpoint\(/);
  assert.match(editor, /nextObject = resizeArrowEndpoint\(interaction\.original, interaction\.endpoint \?\? "end", point, activePage\)/);
  assert.match(editor, /return resizeArrowEndpoint\(item, endpoint, \{ x: current\.x \+ dx, y: current\.y \+ dy \}, page\)/);
  assert.match(editor, /Arrows resize through their two endpoints instead of corner handles/);
});

test("shared editor toolbar owns history controls and docks a dismissible List View", () => {
  const read = (name) => readFileSync(new URL(`../app/studio/${name}`, import.meta.url), "utf8");
  const canvas = read("studio-canvas.tsx");
  const toolbar = canvas.slice(canvas.indexOf('className="editor-history-actions"'), canvas.indexOf('className="editor-mode-control"'));
  assert.ok(toolbar.indexOf('aria-label="Add block"') < toolbar.indexOf('aria-label="Undo"'));
  assert.ok(toolbar.indexOf('aria-label="Undo"') < toolbar.indexOf('aria-label="Redo"'));
  assert.ok(toolbar.indexOf('aria-label="Redo"') < toolbar.indexOf('aria-label="List View"'));
  assert.match(toolbar, /disabled=\{!writable \|\| !canUndo\}/);
  assert.match(toolbar, /disabled=\{!writable \|\| !canRedo\}/);
  for (const name of ["studio-prototype.tsx", "mini-golf-site-editor.tsx"]) {
    const source = read(name);
    assert.doesNotMatch(source, /aria-label="(?:Undo|Redo)"/);
    assert.match(source, /canUndo=\{canUndo\}/);
    assert.match(source, /canRedo=\{canRedo\}/);
  }
  assert.match(read("use-studio-workspace.ts"), /canUndo: ownership.canWrite\(loadedToken\) && historyAvailability.undo/);
  assert.match(read("use-studio-workspace.ts"), /canRedo: ownership.canWrite\(loadedToken\) && historyAvailability.redo/);
  assert.match(canvas, /className="editor-work-area"/);
  assert.match(canvas, /className="studio-list-backdrop"[^>]*aria-label="Close List View"/);
  assert.match(canvas, /event.key !== "Escape" \|\| event.defaultPrevented/);
  assert.match(canvas, /requestAnimationFrame\(\(\) => listViewToggleRef.current\?\.focus\(\)\)/);
  const css = read("studio.css");
  assert.match(css, /\.editor-work-area \{[^}]*display: flex[^}]*min-height: 0/);
  assert.match(css, /\.studio-list-view \{[^}]*flex: 0 0 280px[^}]*position: static/);
  assert.match(css, /\.studio-list-view nav \{ flex: 1; min-height: 0; overflow: auto/);
  assert.match(css, /@container \(max-width: 680px\) \{\s*\.studio-list-view \{[^}]*position: absolute; top: 0/);
});


test("full document counts sit beside Code and collapse before crowding the toolbar", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  const actions = canvas.slice(canvas.indexOf('className="editor-document-actions"'), canvas.indexOf('{publishFeedback ?'));
  assert.match(actions, /Code<\/button>[\s\S]*className="editor-document-counts"/);
  assert.match(actions, /<strong>\{wordCount\} words · \{characterCount\} characters · \{activeDocument.blocks.length\} blocks<\/strong>/);
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /@container \(max-width: 1000px\) \{\s*\.editor-document-counts \{ display: none; \}/);
});


test("block library shares the docked work area and excludes List View", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(canvas, /className="editor-work-area">\s*\{showInserter && !previewing && !codeEditor \? <BlockInserter/);
  assert.match(canvas, /!previewing && !showInserter && listViewOpen \? <StudioListView/);
  assert.match(canvas, /function openInserter[^}]*setListViewOpen\(false\);[^}]*onOpenInserter\(afterIndex, query\)/);
  assert.match(canvas, /className="block-inserter"[^>]*aria-labelledby="inserter-title"/);
  assert.doesNotMatch(canvas, /className="block-inserter"[^>]*aria-modal/);
  assert.match(canvas, /openerRef.current\?\.isConnected/);
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /\.inserter-backdrop \{[^}]*flex: 0 0 320px[^}]*position: relative/);
  assert.match(css, /\.inserter-results \{[^}]*min-height: 0; overflow: auto/);
  assert.match(css, /@container \(max-width: 680px\) \{\s*\.inserter-backdrop \{ inset: 0; position: absolute/);
});


test("Preview and Code transitions dismiss the block library", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(canvas, /onSetShowInserter\(false\); onPreviewChange\(true\)/);
  assert.match(canvas, /function openCodeEditor\(\) \{[\s\S]*?onSetShowInserter\(false\)/);
  assert.match(canvas, /showInserter && !previewing && !codeEditor \? <BlockInserter/);
});


test("the block library slides in on each mount and respects reduced motion", () => {
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /\.block-inserter \{ animation: studio-inserter-enter 180ms ease-out/);
  assert.match(css, /@keyframes studio-inserter-enter \{\s*from \{ opacity: 0; transform: translateX\(-100%\); \}\s*to \{ opacity: 1; transform: translateX\(0\); \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.block-inserter, \.block-inserter\[data-closing="true"\] \{ animation: none; \}/);
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(canvas, /onClick=\{\(\) => showInserter && !inserterClosing \? dismissInserter\(\) : openInserter\(null\)\}/);
  assert.match(canvas, /showInserter && !previewing && !codeEditor \? <BlockInserter/);
});


test("Add block toggles the library so reopening remounts its slide-in", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  const button = canvas.slice(canvas.indexOf('className="editor-add-block"'), canvas.indexOf('name="add" size={20}'));
  assert.match(button, /onClick=\{\(\) => showInserter && !inserterClosing \? dismissInserter\(\) : openInserter\(null\)\}/);
  assert.match(button, /aria-pressed=\{showInserter && !inserterClosing && !previewing && !codeEditor\}/);
  assert.match(canvas, /showInserter && !previewing && !codeEditor \? <BlockInserter/);
});


test("library dismissal waits for its own exit animation except with reduced motion", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(canvas, /function dismissInserter\(\) \{\s*if \(window.matchMedia\("\(prefers-reduced-motion: reduce\)"\).matches\) finishInserterClose\(\);\s*else setInserterClosing\(true\)/);
  assert.match(canvas, /onDismiss=\{dismissInserter\}/);
  assert.match(canvas, /event.target === event.currentTarget && event.animationName === "studio-inserter-exit"\) onCloseAnimationEnd\(\)/);
  assert.match(canvas, /inert=\{closing\}/);
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /\.block-inserter\[data-closing="true"\] \{ animation: studio-inserter-exit 180ms ease-in forwards/);
});


test("Add block cancels an exit in progress and restores the entry animation", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(canvas, /showInserter && !inserterClosing \? dismissInserter\(\) : openInserter\(null\)/);
  assert.match(canvas, /function openInserter[^}]*setInserterClosing\(false\)/);
  assert.match(canvas, /data-closing=\{closing \|\| undefined\}/);
  assert.match(canvas, /if \(closing && event.target === event.currentTarget/);
});


test("folder menus offer keyboard-accessible owner-gated actions and persistent colours", () => {
  const manager = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(manager, /onContextMenu=\{/);
  assert.match(manager, /event.key === "ContextMenu" \|\| \(event.shiftKey && event.key === "F10"\)/);
  assert.match(manager, /onClick=\{\(\) => openFolder\(folder\)\}/);
  assert.match(manager, /aria-haspopup="menu"/);
  assert.doesNotMatch(manager, /aria-label="Close folder actions"/);
  assert.match(manager, /event.key === "Escape"/);
  assert.match(manager, /disabled=\{!canMutate\}[\s\S]*?>Rename/);
  assert.match(manager, /void removeFolder\(\)/);
  assert.match(manager, /await mutate\(async \(\) => \{\s*await colourMediaFolder\(id, colour \|\| null\)/);
  const store = readFileSync(new URL("../app/studio/media-store.ts", import.meta.url), "utf8");
  assert.match(store, /colour\?: string/);
  assert.match(store, /function colourMediaFolder[^}]*studioWriteOwnership.write/);
  assert.match(store, /if \(colour === null\) delete next.colour;\s*else next.colour = colour/);
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.folder-glyph svg \{ height: 64px; width: 64px/);
});


test("media folders use a folder silhouette, hoverable colour choices and aligned list icons", () => {
  const manager = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(manager, /StudioIcon name="folder" size=\{64\}/);
  assert.doesNotMatch(manager, /StudioIcon name="archive"/);
  assert.match(manager, /onMouseEnter=\{\(event\) => openColourMenu\(event.currentTarget\)/);
  assert.match(manager, /event.key === "ArrowRight"/);
  assert.match(manager, /\}, \[folderMenuId\]\)/);
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-entries.is-list \.folder-glyph \{[^}]*height: 44px;[^}]*margin: 0; width: 46px/);
  assert.match(css, /\.media-entries.is-list \.media-thumbnail \{ height: 44px; width: 46px/);
});


test("folder palette offers exactly the requested colours and can clear a saved choice", () => {
  const manager = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  const palette = manager.match(/(\[ \["No Colour".*?\] \])\.map/)[1];
  assert.deepEqual(JSON.parse(palette).map(([label]) => label), ["No Colour", "Red", "Orange", "Yellow", "Green", "Blue", "Purple", "Grey"]);
  assert.match(manager, /if \(colour !== undefined\) void changeFolderColour/);
  assert.match(manager, /aria-checked=\{\(selectedFolder\?\.colour \?\? ""\) === colour\}/);
  const store = readFileSync(new URL("../app/studio/media-store.ts", import.meta.url), "utf8");
  assert.match(store, /colourMediaFolder\(id: string, colour: string \| null\)/);
  assert.match(store, /if \(colour === null\) delete next.colour/);
});


test("folder colours open in a labelled side submenu with return navigation", () => {
  const manager = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(manager, /className="folder-colour-icon" aria-hidden="true"/);
  assert.match(manager, /className="folder-colour-menu"[^>]*role="menu" aria-label="Folder colour"/);
  assert.match(manager, /aria-controls="folder-colour-menu" aria-expanded=\{folderMenu.colours\}/);
  assert.match(manager, /rect.right \+ 4/);
  assert.match(manager, /event.key === "Escape" \|\| event.key === "ArrowLeft"/);
  assert.match(manager, /colourMenuTriggerRef.current\?\.focus\(\)/);
  assert.match(manager, /item.closest\("\[role=menu\]"\) === event.currentTarget/);
});


test("folder context menu omits Close while retaining dismissal and read-only focus", () => {
  const manager = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(manager, />Close<\/button>/);
  assert.match(manager, /if \(event.key === "Escape"\)/);
  assert.match(manager, /document.addEventListener\("pointerdown", outside\)/);
  assert.match(manager, /\?\? folderMenuRef.current\)\?\.focus\(\)/);
});


test("folder rename focus waits for a writable rendered input and is retried after refresh", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(!canMutate \|\| folderMenu \|\| folderNameFocusTargetIdRef.current !== selectedFolder\?\.id \|\| !folderNameInputRef.current\) return/);
  assert.match(source, /\[selectedFolder\?\.id, folders, folderMenu, canMutate\]/);
  assert.match(source, /setInlineRename\(\{ id: item.id, kind: folderMenu.kind, name: item.name \}\);[\s\S]*?closeFolderMenu\(false\)/);
});


test("folder Rename and Delete use the shared menu icons", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /<StudioIcon name="pencil" size=\{16\} \/>Rename<\/button>/);
  assert.match(source, /<StudioIcon name="trash" size=\{16\} \/>Delete<\/button>/);
});


test("colour hover dismissal bridges the submenu gap and preserves keyboard focus", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.equal((source.match(/onMouseLeave=\{scheduleColourMenuClose\}/g) ?? []).length, 2);
  assert.match(source, /onMouseEnter=\{cancelColourMenuClose\}/);
  assert.match(source, /function openColourMenu[^}]*cancelColourMenuClose\(\)/);
  assert.match(source, /focused.matches\(":focus-visible"\)/);
  assert.match(source, /colourSubmenuRef.current\?\.contains\(focused\)/);
  assert.match(source, /window.setTimeout\([\s\S]*?\}, 150\)/);
  assert.match(source, /removeEventListener\("pointerdown", outside\); cancelColourMenuClose\(\)/);
});


test("file cards share Rename and Delete menus without folder colour controls", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /showFileMenu\(asset, event.currentTarget, event.clientX, event.clientY\)/);
  assert.match(source, /showFileMenu\(asset, event.currentTarget, rect.left, rect.bottom\)/);
  assert.match(source, /folderMenu.kind === "folder" \? <button ref=\{colourMenuTriggerRef\}/);
  assert.match(source, /if \(folderMenu.kind === "file"\) void removeAsset\(\); else void removeFolder\(\)/);
  assert.match(source, /setInlineRename\(\{ id: item.id, kind: folderMenu.kind, name: item.name/);
  assert.match(source, /inlineRenameRef.current\?\.focus\(\);\s*inlineRenameRef.current\?\.select\(\)/);
});


test("inline card rename cancels before blur can save and preserves the details panel", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /inlineRenameFinishedRef.current = true; setInlineRename\(null\)/);
  assert.match(source, /if \(!inlineRename \|\| inlineRenameFinishedRef.current \|\| !canMutate\) return/);
  assert.match(source, /await saveAsset\(\{ name \}, inlineRename.id\)/);
  assert.match(source, /inlineRename\?\.id === folder.id \? inlineNameEditor/);
  assert.match(source, /inlineRename\?\.id === asset.id \? inlineNameEditor/);
  assert.match(source, /<h2>File details<\/h2>/);
});


test("inline rename matches the name rectangle without changing card flow", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /const nameRect = label.getBoundingClientRect\(\)/);
  assert.match(source, /width: `\$\{nameRect.width\}px`, height: `\$\{nameRect.height\}px`/);
  assert.match(source, /\[inlineRenameId, inlineRenameKind, view\]/);
  assert.match(source, /observer\?\.observe\(label\)/);
  assert.match(source, /observer\?\.disconnect\(\)/);
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-card-name.is-renaming \{ visibility: hidden; \}/);
  assert.match(css, /\.media-inline-name \{[^}]*padding: 0; position: absolute/);
  assert.doesNotMatch(css, /\.media-inline-name[^}]*bottom:|\.media-inline-name[^}]*top: 5px/);
});


test("media drag-and-drop is owner-gated and folders have a keyboard move equivalent", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /draggable=\{canMutate && !inlineRename\}/);
  assert.match(source, /onDrop=\{\(event\) => dropIntoFolder\(event, folder.id\)\}/);
  assert.match(source, /if \(canMutate && entry\) void moveMediaEntry\(entry, id\)/);
  assert.match(source, /entry.kind === "folder" && !allowedFolderDestination\(entry.id, id\)/);
  assert.match(source, /await updateMediaAsset\(entry.id, \{ folderId: parentId \}\)/);
  assert.match(source, /<span>Move to folder<\/span>/);
  const store = readFileSync(new URL("../app/studio/media-store.ts", import.meta.url), "utf8");
  assert.match(store, /function moveMediaFolder[^}]*studioWriteOwnership.write/);
  assert.match(store, /runTransaction\(database, FOLDER_STORE, "readwrite"/);
});


test("move to parent uses the containing folder parent and respects write ownership", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /selectedAsset\?\.folderId \?\? selectedFolder\?\.parentId \?\? null/);
  assert.match(source, /selectedContainer \? <button type="button" role="menuitem" disabled=\{!canMutate\}/);
  assert.match(source, /moveMediaEntry\(\{ id: folderMenu.id, kind: folderMenu.kind \}, selectedContainer.parentId\)/);
  assert.match(source, /<StudioIcon name="arrow-up" size=\{16\} \/>Move to parent folder/);
});


test("parent navigation is separate from searchable sortable folder records", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.ok(source.indexOf('media-parent-card') < source.indexOf("{visibleFolders.map"));
  assert.match(source, /setCurrentFolderId\(currentFolder.parentId\)/);
  assert.match(source, /className="folder-up-arrow" name="arrow-up"/);
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-entries.is-list \.media-parent-card \{[^}]*grid-template-columns: 46px 1fr/);
});


test("Parent folder drops validate destinations and show accepted/rejected hover states", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /onDragOver=\{dragOverParent\}/);
  assert.match(source, /onDrop=\{dropIntoParent\}/);
  assert.match(source, /allowedFolderDestination\(entry.id, currentFolder.parentId\)/);
  assert.match(source, /if \(valid && entry && currentFolder\) void moveMediaEntry\(entry, currentFolder.parentId\)/);
  assert.match(source, /setParentDropState\(valid \? "valid" : "invalid"\)/);
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-parent-card.is-drop-target/);
  assert.match(css, /\.media-parent-card.is-invalid-drop/);
});


test("media breadcrumbs accept validated drops without invoking navigation", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /onDrop=\{\(event\) => dropIntoBreadcrumb\(event, null\)\}/);
  assert.match(source, /onDrop=\{\(event\) => dropIntoBreadcrumb\(event, folder.id\)\}/);
  assert.match(source, /allowedFolderDestination\(entry.id, folderId\)/);
  const drop = source.slice(source.indexOf("function dropIntoBreadcrumb"), source.indexOf("function leaveBreadcrumb"));
  assert.match(drop, /event.preventDefault\(\); event.stopPropagation\(\)/);
  assert.match(drop, /if \(valid && entry\) void moveMediaEntry\(entry, folderId\)/);
  assert.doesNotMatch(drop, /setCurrentFolderId|openFolder/);
});


test("folder cards retain keyboard opening and concise Folder metadata", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /onDoubleClick=\{\(\) => openFolder\(folder\)\}/);
  assert.match(source, /<small>Folder<\/small>/);
  assert.doesNotMatch(source, /Folder · double-click to open/);
  assert.match(source, /if \(event.key === "Enter"\) \{ event.preventDefault\(\); openFolder\(folder\)/);
});


test("grid folder labels align with file thumbnail and copy spacing", () => {
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-thumbnail \{[^}]*height: 105px/);
  assert.match(css, /\.media-entries.is-grid \.media-folder-card \{[^}]*grid-template-rows: 105px min-content min-content; padding: 0/);
  assert.match(css, /\.media-card-copy \{ display: grid; padding: 9px/);
  assert.match(css, /\.media-entries.is-grid \.media-folder-card strong \{ margin: 9px 9px 0/);
  assert.match(css, /\.media-entries.is-grid \.media-folder-card small \{ margin: 3px 9px 9px/);
  assert.match(css, /\.media-entries.is-list \.folder-glyph \{[^}]*height: 44px/);
});


test("grid folders use larger icons without changing their track or list icons", () => {
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-entries.is-grid \.media-folder-card \.folder-glyph svg \{ height: 88px; transform: translateY\(16px\); width: 88px/);
  assert.match(css, /grid-template-rows: 105px min-content min-content/);
  assert.match(css, /\.media-entries.is-list \.folder-glyph svg \{ height: 26px; width: 26px/);
});


test("file and folder cards share horizontal overflow controls and centred larger grid icons", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /className="media-folder-menu-toggle"[^>]*aria-haspopup="menu"/);
  assert.match(source, /className="media-file-menu-toggle"[^>]*aria-haspopup="menu"/);
  assert.equal((source.match(/className="media-card-menu-icon" name="more-vertical"/g) ?? []).length, 2);
  assert.match(source, /showFileMenu\(asset, event.currentTarget, rect.left, rect.bottom\)/);
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-folder-menu-toggle, \.media-file-menu-toggle \{[^}]*right: 4px; top: 4px/);
  assert.match(css, /\.media-card-menu-icon \{ transform: rotate\(90deg\)/);
  assert.match(css, /\.media-entries.is-grid \.media-folder-card \.folder-glyph \{ align-self: center; justify-self: center/);
  assert.match(css, /\.media-entries.is-list \.folder-glyph svg \{ height: 26px; width: 26px/);
});


test("list file names shrink and reserve space for their overflow control", () => {
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-entries.is-list \.media-folder-card, \.media-entries.is-list \.media-file-card \{ padding-right: 40px/);
  assert.match(css, /\.media-entries.is-list \.media-file-card, \.media-entries.is-list \.media-folder-card \{[^}]*grid-template-columns: 46px minmax\(0, 1fr\)/);
});


test("grid folder icons sit lower without moving labels or list icons", () => {
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-entries.is-grid \.media-folder-card \.folder-glyph svg \{ height: 88px; transform: translateY\(16px\); width: 88px/);
  assert.match(css, /grid-template-rows: 105px min-content min-content/);
  assert.match(css, /\.media-entries.is-list \.folder-glyph svg \{ height: 26px; width: 26px; \}/);
});


test("overflow pointer and focus transitions reach toggle handlers before dismissal", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /event.target.closest\("\.media-folder-menu-toggle, \.media-file-menu-toggle"\)\) return/);
  assert.match(source, /event.relatedTarget.closest\("\.media-folder-menu-toggle, \.media-file-menu-toggle"\)\) return/);
  assert.match(source, /folderMenu\?\.kind === "folder" && folderMenu.id === folder.id\) \{ closeFolderMenu\(\); return/);
  assert.match(source, /folderMenu\?\.kind === "file" && folderMenu.id === asset.id\) \{ closeFolderMenu\(\); return/);
});
