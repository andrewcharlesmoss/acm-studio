"use client";

import { useEffect, useState } from "react";
import type { InsertableBlockType, StudioDocument } from "../../editor-model";
import { blockCatalogue } from "../../editor-model";
import { StudioCanvas } from "../../studio-canvas";
import { miniGolfPresentation } from "../../mini-golf-presentation";
import { useStudioBlockCommands } from "../../use-studio-block-commands";
import { insertedBlockSelectionId } from "../../button-insertion";
import { StudioUiSectionHost } from "../studio-ui-section-host";
import { reconcileFootnoteBlocks } from "../../../content/footnote-reconciliation";
import { useStudioHistoryShortcuts } from "../../use-studio-history-shortcuts";

const loadExampleInlineImages = async () => [{ id: "selection-example-image", name: "Geometric image", altText: "", blob: new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><rect width="240" height="80" fill="#cbe8f4"/><circle cx="120" cy="40" r="28" fill="#456f5d"/></svg>'], { type: "image/svg+xml" }) }];

const fixture: StudioDocument = {
  id: "selection-library-example", kind: "post", title: "Multiple block selection", subtitle: "", slug: "selection-example", excerpt: "", author: "ACM", status: "draft", updatedAt: "2026-10-02T12:00:00.000Z", tags: [], seoTitle: "", seoDescription: "",
  blocks: [
    { id: "column-drag-source", type: "paragraph", text: "Drag this paragraph into a column." },
    { id: "column-drag-example", type: "columns", children: [
      { id: "drop-column-left", type: "column", children: [{ id: "existing-column-item", type: "paragraph", text: "Existing column item" }] },
      { id: "drop-column-right", type: "column", children: [] },
    ] },
    { id: "list-text-example", type: "list", style: "unordered", items: ["First item", "Second item", "Third item"] },
    { id: "list-keyboard-example", type: "list", style: "ordered", items: ["Before empty", "", "This List Item wraps onto several lines in a narrow viewport so keyboard selection can cross its last line.", "After wrapped"] },
    { id: "first", type: "paragraph", text: "Start a selection here, then drag into the final paragraph." },
    { id: "heading", type: "heading", level: 2, text: "A heading between different blocks" },
    { id: "image", type: "image", src: "", mediaId: "selection-example-image", alt: "A local geometric image fixture", displayWidth: 240, displayHeight: 80 },
    { id: "spacer", type: "spacer", height: 24 },
    { id: "table", type: "table", rows: [["First cell", "Second cell"], ["Third cell", "Fourth cell"]] },
    { id: "adapted-scorecard", type: "section", role: "scorecard", layout: "stack", children: [
      { id: "adapted-score-table", type: "table", rows: [["Score heading", "Player"], ["Hole", "Score target"]], caption: "Adapted score caption" },
      { id: "adapted-section-list", type: "list", style: "unordered", items: ["Section first item", "Section second item"] },
    ] },
    { id: "last", type: "paragraph", text: "Finish the selection here to include the intervening blocks." },
    { id: "legacy-footnote-example", type: "paragraph", text: "Before source after", runs: [{ text: "Before " }, { text: "source", marks: [{ type: "footnote", id: "legacy-example-note" }] }, { text: " after" }] },
    { id: "legacy-footnotes", type: "footnotes", notes: [{ id: "legacy-example-note", text: "A recoverable legacy note for selection checks." }] },
    { id: "legacy-inline-image-example", type: "paragraph", text: "Before source after", runs: [{ text: "Before " }, { text: "source", marks: [{ type: "inline-image", mediaId: "selection-example-image", alt: "Inline selection example", width: 24 }] }, { text: " after" }] },
    { id: "inline-image-object-example", type: "paragraph", text: "Before \uFFFC after", runs: [{ text: "Before " }, { text: "\uFFFC", inline: { type: "image", mediaId: "selection-example-image", alt: "Geometric inline image", width: 120 } }, { text: " after" }] },
    { id: "missing-inline-image-example", type: "paragraph", text: "Before \uFFFC after", runs: [{ text: "Before " }, { text: "\uFFFC", inline: { type: "image", mediaId: "missing-example-image", alt: "Missing inline image" } }, { text: " after" }] },
    { id: "inline-image-quote", type: "quote", text: "Quote body", children: [{ id: "inline-image-quote-body", type: "paragraph", text: "Quote body" }], attribution: "Quote citation" },
    { id: "inline-image-embed", type: "embed", url: "https://example.test/embed", title: "Local caption example", caption: "Embed caption" },
    { id: "language-example", type: "paragraph", text: "French English direction", runs: [{ text: "French", marks: [{ type: "language", language: "fr", direction: "ltr" }, "bold"] }, { text: " English", marks: [{ type: "language", language: "en", direction: "ltr" }] }, { text: " direction", marks: [{ type: "language", language: "", direction: "rtl" }] }] },
    { id: "math-object-example", type: "paragraph", text: "Before \uFFFC after", runs: [{ text: "Before " }, { text: "\uFFFC", inline: { type: "math", latex: "x^2", alternativeText: "x squared", sourceRuns: [{ text: "x^2", marks: ["bold"] }] } }, { text: " after" }] },
    { id: "rich-form-transition-example", type: "paragraph", text: "Before \uFFFC\uFFFC after", runs: [{ text: "Before " }, { text: "\uFFFC", inline: { type: "math", latex: "z^2", alternativeText: "Transition equation" } }, { text: "\uFFFC", inline: { type: "image", mediaId: "selection-example-image", alt: "Transition image", width: 24 } }, { text: " after" }] },
    { id: "legacy-math-example", type: "paragraph", text: "Before original prose after", runs: [{ text: "Before " }, { text: "original", marks: ["bold", { type: "math", latex: "y^3", alternativeText: "Legacy equation" }] }, { text: " prose", marks: ["italic", { type: "math", latex: "y^3", alternativeText: "Legacy equation" }] }, { text: " after" }] },
    { id: "group", type: "group", layout: "stack", children: [
      { id: "nested-first", type: "paragraph", text: "A nested paragraph" },
      { id: "nested-button", type: "button", label: "Example button", url: "", style: "primary" },
      { id: "nested-last", type: "paragraph", text: "Another nested paragraph" },
      { id: "nested-table", type: "table", rows: [["Nested cell", "Next cell"], ["Last row", "Last cell"]] },
      { id: "nested-buttons", type: "buttons", children: [
        { id: "button-one", type: "button", label: "First button", url: "", style: "primary" },
        { id: "button-two", type: "button", label: "Second button", url: "https://example.test/second", style: "secondary", width: 50, visualStyle: { anchor: "second-button-anchor", textColor: "#123456" } },
      ] },
      { id: "nested-columns", type: "columns", children: [
        { id: "column-one", type: "column", children: [{ id: "column-text", type: "paragraph", text: "Column content" }] },
        { id: "column-two", type: "column", children: [{ id: "other-column-text", type: "paragraph", text: "Second column" }] },
      ] },
      { id: "nested-social", type: "social-icons", children: [
        { id: "social-one", type: "social-linkedin", url: "https://www.linkedin.com/", label: "LinkedIn" },
        { id: "social-two", type: "social-tiktok", url: "https://www.tiktok.com/", label: "TikTok" },
      ] },
      { id: "nested-list-root", type: "list", style: "unordered", items: [
        { text: "First parent item", children: [
          { id: "nested-list-one", type: "list", style: "ordered", start: 3, visualStyle: { backgroundColor: "#fff3cd" }, items: [{ text: "First nested item", style: { backgroundColor: "#f8d7da", anchor: "nested-item-anchor", className: "nested-item-example" }, children: [{ id: "deeper-list", type: "list", style: "unordered", visualStyle: { backgroundColor: "#d1e7dd", anchor: "deep-list-anchor", className: "deep-list-example" }, items: ["Deep item"] }] }, "Second nested item"] },
          { id: "nested-list-two", type: "list", style: "unordered", items: ["Second sibling list"] },
        ] },
        { text: "Second parent item", children: [{ id: "other-item-list", type: "list", style: "unordered", items: ["Different item owner"] }] },
      ] },
      { id: "list-following-paragraph", type: "paragraph", text: "Append this paragraph from the deepest final List item." },
      { id: "restricted-group", type: "group", layout: "flow", allowedBlocks: ["paragraph"], children: [{ id: "restricted-text", type: "paragraph", text: "Only Paragraph is allowed here" }] },
    ] },
  ],
};

/** A production Canvas specimen; all document data and history remain in memory. */
export default function SelectionSpecimenPage() {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><rect width="240" height="80" fill="#cbe8f4"/><circle cx="120" cy="40" r="28" fill="#456f5d"/></svg>'], { type: "image/svg+xml" }));
    setMediaUrl(url);
    return () => URL.revokeObjectURL(url);
  }, []);
  const [document, setDocument] = useState<StudioDocument>(() => structuredClone(fixture));
  const [past, setPast] = useState<StudioDocument[]>([]);
  const [future, setFuture] = useState<StudioDocument[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [writable, setWritable] = useState(true);
  const [useMiniGolfPresentation, setUseMiniGolfPresentation] = useState(false);
  const [showInserter, setShowInserter] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [insertAfter, setInsertAfter] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  function update(update: (value: StudioDocument) => StudioDocument) {
    if (!writable) return;
    const proposed = update(document);
    const blocks = reconcileFootnoteBlocks(document.blocks, proposed.blocks);
    if (!blocks || proposed === document) return;
    const next = blocks === proposed.blocks ? proposed : { ...proposed, blocks };
    setPast([...past, document]); setFuture([]); setDocument(next);
  }
  const commands = useStudioBlockCommands({ activeDocument: document, updateActiveDocument: update });
  function insertBlock(type: InsertableBlockType, parentId?: string, afterIndex = insertAfter, keepInserterOpen = false, parentInsertionIndex?: number) {
    if (!writable) return null;
    const block = commands.insertBlock(type, afterIndex, parentId, parentInsertionIndex);
    if (!block) return null;
    setSelected(insertedBlockSelectionId(block));
    if (keepInserterOpen && !parentId && afterIndex !== null) setInsertAfter(afterIndex + 1);
    if (!keepInserterOpen) { setShowInserter(false); setQuery(""); }
    return block;
  }
  function undo() { const previous = past.at(-1); if (!writable || !previous) return; setPast(past.slice(0, -1)); setFuture([document, ...future]); setDocument(previous); }
  function redo() { const next = future[0]; if (!writable || !next) return; setPast([...past, document]); setFuture(future.slice(1)); setDocument(next); }
  useStudioHistoryShortcuts(undo, redo, writable);
  return <StudioUiSectionHost section="workspace"><section className="selection-library-specimen">
    <h1>Multiple block selection</h1>
    <p>Shift-click to select a range. Command-click or Control-click adds or removes a block. Drag across blocks to include all blocks between them. Use Delete or Backspace, or Delete Selected Blocks. Undo restores the whole selection.</p>
    <div className="selection-library-actions">
      <button type="button" onClick={() => { setDocument(structuredClone(fixture)); setSelected(null); setPast([]); setFuture([]); setFeedback(null); }}>Reset Example</button>
      <button type="button" disabled={!past.length || !writable} onClick={undo}>Undo</button>
      <button type="button" disabled={!future.length || !writable} onClick={redo}>Redo</button>
      <label><input type="checkbox" checked={writable} onChange={event => setWritable(event.target.checked)} />Enable editing</label>
      <label><input type="checkbox" checked={useMiniGolfPresentation} onChange={event => setUseMiniGolfPresentation(event.target.checked)} />Use Mini Golf presentation</label>
      <a href="/studio/ui/selection/template">Template column drops</a>
    </div>
    <StudioCanvas presentation={useMiniGolfPresentation ? miniGolfPresentation : undefined} loadInlineImages={loadExampleInlineImages} activeDocument={document} writable={writable} previewing={previewing} onPreviewChange={setPreviewing} onUndo={undo} onRedo={redo} canUndo={Boolean(past.length)} canRedo={Boolean(future.length)} wordCount={0} characterCount={0} linkTargets={[]} showCoverImage={false} mediaBlockUrls={mediaUrl ? { "selection-example-image": mediaUrl } : {}} selectedBlockId={selected} dragOverIndex={dragOverIndex} showInserter={showInserter} inserterQuery={query} filteredBlocks={blockCatalogue.filter(item => item.label.toLowerCase().includes(query.toLowerCase()))} publishFeedback={feedback}
      onOpenInserter={index => { setInsertAfter(index); setShowInserter(true); }} onSetPublishFeedback={setFeedback} onDocumentFieldChange={(field, value) => update(current => ({ ...current, [field]: value }))} onApplyDocumentCode={blocks => update(current => ({ ...current, blocks }))} onFocusDocumentField={() => setSelected(null)} onOpenCoverMediaLibrary={() => {}} onRemoveCoverImage={() => {}} onSelectBlock={setSelected} onClearBlockSelection={() => setSelected(null)} onSetDragOverIndex={setDragOverIndex} onMoveBlockTo={commands.moveBlockTo} onMoveBlock={commands.moveBlock} onDuplicateBlock={commands.duplicateBlock} onRemoveBlock={commands.removeBlock} onRemoveBlocks={commands.removeBlocks} onUpdateBlock={commands.updateBlock} onSplitParagraph={commands.splitParagraph} onMergeParagraphBackward={commands.mergeParagraphBackward} onSplitParagraphs={commands.splitParagraphs} onExitList={commands.exitList} onInsertBlock={(type, parentId, options) => insertBlock(type, parentId, insertAfter, options?.keepInserterOpen)} onInsertBlockAt={(type, index, parentId) => insertBlock(type, parentId, index - 1, true, parentId ? index : undefined)} onSetShowInserter={setShowInserter} onSetInserterQuery={setQuery} />
  </section></StudioUiSectionHost>;
}
