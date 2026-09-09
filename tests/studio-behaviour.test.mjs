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
  assert.match(source, /onOpenInserter\(-1\)/);
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
  assert.match(canvas, /setHoveredBlockId\(null\); setListViewOpen\(\(current\) => !current\)/);
  assert.match(canvas, /setHoveredBlockId\(null\); setListViewOpen\(false\); onPreviewChange\(true\)/);
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
