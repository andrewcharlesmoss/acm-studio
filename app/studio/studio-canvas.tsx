"use client";

import { useLayoutEffect, useRef, useState, type FormEvent, type HTMLAttributes, type MouseEvent as ReactMouseEvent, type TextareaHTMLAttributes } from "react";
import { BlockRenderer } from "../components/content";
import { highlightCode } from "../content/code-highlighting.mjs";
import { TableActionIcon, TableIcon, type TableAction } from "./table-icons";
import { linkAtTextRange, normaliseTextRuns, plainTextFromRuns, safeTextLink, textToRuns, updateTextMark } from "../content/rich-text";
import type { ContentBlock, HeadingLevel, RichTextRun, TextAlignment, TextMark } from "../content/model";
import type { StudioDocument, InsertableBlockType } from "./editor-model";

function blockLabel(type: ContentBlock["type"]) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

type TextSelection = { start: number; end: number };
type TableCell = { rowIndex: number; columnIndex: number };
type EditableTextBlock = Extract<ContentBlock, { type: "paragraph" | "heading" | "quote" }>;
type LinkTarget = { id: string; title: string; href: string; kind: "page" | "post" };
type LinkEditorState = { blockId: string; url: string; selection: TextSelection | null; existingUrl: string | null };

function isEditableTextBlock(block: ContentBlock): block is EditableTextBlock {
  return block.type === "paragraph" || block.type === "heading" || block.type === "quote";
}

export type StudioCanvasProps = {
  activeDocument: StudioDocument;
  previewing: boolean;
  wordCount: number;
  characterCount: number;
  linkTargets: LinkTarget[];
  showCoverImage: boolean;
  coverImageUrl?: string;
  mediaBlockUrls: Record<string, string>;
  selectedBlockId: string | null;
  dragOverIndex: number | null;
  showInserter: boolean;
  inserterQuery: string;
  filteredBlocks: typeof import("./editor-model").blockCatalogue;
  publishFeedback: string | null;
  onOpenInserter: (afterIndex: number | null, query?: string) => void;
  onSetPublishFeedback: (feedback: string | null) => void;
  onDocumentFieldChange: <K extends keyof StudioDocument>(field: K, value: StudioDocument[K]) => void;
  onFocusDocumentField: () => void;
  onOpenCoverMediaLibrary: () => void;
  onRemoveCoverImage: () => void;
  onSelectBlock: (blockId: string) => void;
  onClearBlockSelection: () => void;
  onSetDragOverIndex: (index: number | null) => void;
  onMoveBlockTo: (from: number, to: number) => void;
  onMoveBlock: (index: number, direction: -1 | 1) => void;
  onDuplicateBlock: (index: number) => void;
  onRemoveBlock: (blockId: string) => void;
  onUpdateBlock: (blockId: string, update: (block: ContentBlock) => ContentBlock) => void;
  onInsertBlock: (type: InsertableBlockType) => ContentBlock;
  onSetShowInserter: (show: boolean) => void;
  onSetInserterQuery: (query: string) => void;
};

export function StudioCanvas({ activeDocument, previewing, wordCount, characterCount, linkTargets, showCoverImage, coverImageUrl, mediaBlockUrls, selectedBlockId, dragOverIndex, showInserter, inserterQuery, filteredBlocks, publishFeedback, onOpenInserter, onSetPublishFeedback, onDocumentFieldChange, onFocusDocumentField, onOpenCoverMediaLibrary, onRemoveCoverImage, onSelectBlock, onClearBlockSelection, onSetDragOverIndex, onMoveBlockTo, onMoveBlock, onDuplicateBlock, onRemoveBlock, onUpdateBlock, onInsertBlock, onSetShowInserter, onSetInserterQuery }: StudioCanvasProps) {
  const draggingIndexRef = useRef<number | null>(null);
  const textSelectionsRef = useRef<Record<string, TextSelection | null>>({});
  const linkInputRef = useRef<HTMLInputElement>(null);
  const appenderInputRef = useRef<HTMLInputElement>(null);
  const [linkEditor, setLinkEditor] = useState<LinkEditorState | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [headingMenuBlockId, setHeadingMenuBlockId] = useState<string | null>(null);
  const [tableMenuBlockId, setTableMenuBlockId] = useState<string | null>(null);
  const [tableCellSelections, setTableCellSelections] = useState<Record<string, TableCell>>({});
  const [appenderActive, setAppenderActive] = useState(false);
  const [appenderValue, setAppenderValue] = useState("");

  useLayoutEffect(() => {
    if (linkEditor) linkInputRef.current?.focus();
  }, [linkEditor]);

  useLayoutEffect(() => {
    if (appenderActive) appenderInputRef.current?.focus();
  }, [appenderActive]);

  function setTextSelection(blockId: string, selection: TextSelection | null) {
    // Keep the last range when focus briefly moves to the formatting toolbar.
    if (selection) textSelectionsRef.current[blockId] = selection;
  }

  function currentTextSelection(blockId: string) {
    const editor = [...document.querySelectorAll<HTMLElement>("[data-studio-block-id]")].find((element) => element.dataset.studioBlockId === blockId);
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return textSelectionsRef.current[blockId];
    const range = selection.getRangeAt(0);
    const start = editorOffset(editor, range.startContainer, range.startOffset);
    const end = editorOffset(editor, range.endContainer, range.endOffset);
    const nextSelection = start <= end ? { start, end } : { start: end, end: start };
    textSelectionsRef.current[blockId] = nextSelection;
    return nextSelection;
  }

  function setTextAlignment(block: EditableTextBlock, align: TextAlignment) {
    onUpdateBlock(block.id, () => ({ ...block, align }));
  }

  function updateTable(block: Extract<ContentBlock, { type: "table" }>, action: TableAction) {
    const rows = (block.rows.length ? block.rows : [[""]]).map((row) => [...row]);
    const columnCount = Math.max(1, ...rows.map((row) => row.length));
    const activeCell = tableCellSelections[block.id] ?? { rowIndex: 0, columnIndex: 0 };
    const rowIndex = Math.min(activeCell.rowIndex, rows.length - 1);
    const columnIndex = Math.min(activeCell.columnIndex, columnCount - 1);
    let nextCell = { rowIndex, columnIndex };

    if (action === "insert-row-before") {
      rows.splice(rowIndex, 0, Array.from({ length: columnCount }, () => ""));
    } else if (action === "insert-row-after") {
      rows.splice(rowIndex + 1, 0, Array.from({ length: columnCount }, () => ""));
      nextCell = { rowIndex: rowIndex + 1, columnIndex };
    } else if (action === "delete-row") {
      if (rows.length <= 1) return;
      rows.splice(rowIndex, 1);
      nextCell = { rowIndex: Math.min(rowIndex, rows.length - 1), columnIndex };
    } else if (action === "insert-column-before") {
      rows.forEach((row) => row.splice(columnIndex, 0, ""));
    } else if (action === "insert-column-after") {
      rows.forEach((row) => row.splice(columnIndex + 1, 0, ""));
      nextCell = { rowIndex, columnIndex: columnIndex + 1 };
    } else {
      if (columnCount <= 1) return;
      rows.forEach((row) => row.splice(columnIndex, 1));
      nextCell = { rowIndex, columnIndex: Math.min(columnIndex, columnCount - 2) };
    }

    onUpdateBlock(block.id, () => ({ ...block, rows }));
    setTableCellSelections((current) => ({ ...current, [block.id]: nextCell }));
    setTableMenuBlockId(null);
  }

  function formatSelectedText(block: EditableTextBlock, mark: TextMark, mode: "toggle" | "set" | "remove" = "toggle", selection = textSelectionsRef.current[block.id]) {
    if (!selection || selection.start === selection.end) return;
    const runs = block.runs?.length ? block.runs : textToRuns(block.text);
    const nextRuns = updateTextMark(runs, selection.start, selection.end, mark, mode);
    onUpdateBlock(block.id, () => ({ ...block, text: plainTextFromRuns(nextRuns), runs: nextRuns }));
  }

  function openLinkEditor(block: EditableTextBlock) {
    const selection = currentTextSelection(block.id);
    const runs = block.runs?.length ? block.runs : textToRuns(block.text);
    const hasSelection = Boolean(selection && selection.start !== selection.end);
    const existing = hasSelection && selection ? linkAtTextRange(runs, selection.start, selection.end) ?? "" : "";
    setLinkError(hasSelection ? null : "Select the text you want to link, then choose or enter its destination.");
    setLinkEditor({ blockId: block.id, url: existing, selection, existingUrl: existing || null });
  }

  function applyLink(event: FormEvent<HTMLFormElement>, block: EditableTextBlock) {
    event.preventDefault();
    const editor = linkEditor;
    if (!editor?.selection || editor.selection.start === editor.selection.end) {
      setLinkError("Select the text you want to link, then choose or enter its destination.");
      return;
    }
    const url = safeTextLink(editor?.url ?? "");
    if (!url) {
      setLinkError("Use a full URL, email link, /path or #anchor.");
      return;
    }
    formatSelectedText(block, { type: "link", url }, "set", editor?.selection);
    setLinkEditor(null);
    setLinkError(null);
  }

  function removeLink(block: EditableTextBlock) {
    if (!linkEditor) return;
    formatSelectedText(block, { type: "link", url: "" }, "remove", linkEditor.selection);
    setLinkEditor(null);
    setLinkError(null);
  }

  const linkSuggestions = linkEditor
    ? linkTargets.filter((target) => `${target.title} ${target.href} ${target.kind}`.toLowerCase().includes(linkEditor.url.trim().toLowerCase())).slice(0, 5)
    : [];

  return (
    <section className="block-editor" aria-label={`${activeDocument.kind} editor`}>
      <div className="editor-document-bar">
        <div><span>{activeDocument.kind}</span><strong>{wordCount} words · {characterCount} characters · {activeDocument.blocks.length} blocks</strong></div>
        <button type="button" onClick={() => onOpenInserter(null)}>＋ Add block</button>
      </div>
      {publishFeedback ? <div className="publish-feedback" role="status"><span>{publishFeedback}</span><button type="button" onClick={() => onSetPublishFeedback(null)} aria-label="Dismiss publication message">×</button></div> : null}

      <div className="editor-canvas-scroll" onPointerDown={(event) => {
        if (event.target instanceof Element && !event.target.closest(".canvas-block, button, input, textarea, select, [contenteditable=\"true\"]")) onClearBlockSelection();
      }}>
        {previewing ? (
          <article className={`document-preview is-${activeDocument.kind}`}>
            <div className="preview-meta"><span>{activeDocument.kind}</span><span>{activeDocument.status}</span></div>
            <h1>{activeDocument.title || `Untitled ${activeDocument.kind}`}</h1>
            {activeDocument.subtitle ? <p className="preview-subtitle">{activeDocument.subtitle}</p> : null}
            {showCoverImage ? <div className={`preview-cover-image${coverImageUrl ? " is-source" : ""}`} role="img" aria-label={activeDocument.coverImage?.alt || "Mock cover image"}>
              {coverImageUrl ? (
                // Local browser-managed media cannot be known to Next's image optimiser.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImageUrl} alt={activeDocument.coverImage?.alt || ""} />
              ) : null}
            </div> : null}
            {activeDocument.excerpt ? <p className="preview-summary">{activeDocument.excerpt}</p> : null}
            <BlockRenderer blocks={activeDocument.blocks} mediaUrls={mediaBlockUrls} />
          </article>
        ) : (
          <div className="block-canvas">
            <label className="canvas-title-label" htmlFor="document-title">{activeDocument.kind} title</label>
            <AutoResizeTextarea id="document-title" className="canvas-title" value={activeDocument.title} onFocus={onFocusDocumentField} onChange={(event) => onDocumentFieldChange("title", event.target.value)} placeholder={`Add ${activeDocument.kind} title`} />
            <label className="canvas-subtitle-label" htmlFor="document-subtitle">Subtitle</label>
            <AutoResizeTextarea id="document-subtitle" className="canvas-subtitle" value={activeDocument.subtitle ?? ""} onFocus={onFocusDocumentField} onChange={(event) => onDocumentFieldChange("subtitle", event.target.value)} placeholder="Add a subtitle" />
            {showCoverImage ? <div className="canvas-cover-wrap">
              <div className={`canvas-cover-image${coverImageUrl ? " is-source" : ""}`} role="img" aria-label={activeDocument.coverImage?.alt || "Mock cover image"}>
                {coverImageUrl ? (
                  // Local browser-managed media cannot be known to Next's image optimiser.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverImageUrl} alt={activeDocument.coverImage?.alt || ""} />
                ) : null}
              </div>
              <div className="canvas-cover-actions">
                <button className="cover-action-button" type="button" onClick={onOpenCoverMediaLibrary} aria-label="Change cover image" title="Change cover image">
                  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 5-5 3 3 2-2 6 4" /><path d="M17 3v4m-2-2h4" /></svg>
                </button>
                <button className="cover-action-button is-destructive" type="button" onClick={onRemoveCoverImage} aria-label="Remove cover image" title="Remove cover image">
                  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M5 7h14M10 4h4l1 3H9l1-3Zm-3 3 1 13h8l1-13M10 11v6m4-6v6" /></svg>
                </button>
              </div>
            </div> : <button className="canvas-add-cover" type="button" onClick={onOpenCoverMediaLibrary}>＋ Add cover image</button>}

            <div className="canvas-blocks">
              {activeDocument.blocks.map((block, index) => (
                <div className="block-position" key={block.id}>
                  {dragOverIndex === index ? <div className="drop-indicator" aria-hidden="true" /> : null}
                  {index > 0 ? <button className="between-blocks" type="button" onClick={() => onOpenInserter(index - 1)} aria-label={`Add block before ${blockLabel(block.type)}`}><span aria-hidden="true">＋</span></button> : null}
                  <article
                    className={`canvas-block is-${block.type}${selectedBlockId === block.id ? " is-selected" : ""}`}
                    onPointerDown={() => onSelectBlock(block.id)}
                    onFocusCapture={() => onSelectBlock(block.id)}
                    onDragOver={(event) => { event.preventDefault(); onSetDragOverIndex(draggingIndexRef.current === index ? null : index); }}
                    onDrop={() => { if (draggingIndexRef.current !== null) onMoveBlockTo(draggingIndexRef.current, index); draggingIndexRef.current = null; onSetDragOverIndex(null); }}
                  >
                    <div className="canvas-block-toolbar">
                      <button className="drag-handle" type="button" draggable onClick={() => onSelectBlock(block.id)} onDragStart={(event) => { event.stopPropagation(); draggingIndexRef.current = index; onSetDragOverIndex(null); }} onDragEnd={() => { draggingIndexRef.current = null; onSetDragOverIndex(null); }} aria-label={`Drag to reorder ${blockLabel(block.type)} block`} title="Drag to reorder block">⠿</button>
                      {block.type === "heading" ? <div className="heading-level-control"><button className="heading-level-button" type="button" onMouseDown={preserveTextSelection} onClick={() => setHeadingMenuBlockId((current) => current === block.id ? null : block.id)} aria-haspopup="menu" aria-expanded={headingMenuBlockId === block.id} aria-label={`Heading level ${block.level}`}><strong>H{block.level}</strong><span aria-hidden="true">⌄</span></button>{headingMenuBlockId === block.id ? <div className="heading-level-menu" role="menu" aria-label="Heading level">{[1, 2, 3, 4, 5, 6].map((level) => <button className={level === block.level ? "is-active" : ""} type="button" role="menuitem" key={level} onMouseDown={preserveTextSelection} onClick={() => { onUpdateBlock(block.id, () => ({ ...block, level: level as HeadingLevel })); setHeadingMenuBlockId(null); }}><strong>H{level}</strong><span>Heading {level}</span></button>)}</div> : null}</div> : block.type === "table" ? <div className="table-control"><button className={`table-control-button${tableMenuBlockId === block.id ? " is-active" : ""}`} type="button" onMouseDown={preserveTextSelection} onClick={() => setTableMenuBlockId((current) => current === block.id ? null : block.id)} aria-haspopup="menu" aria-expanded={tableMenuBlockId === block.id} aria-label="Table options" title="Table options"><TableIcon /></button>{tableMenuBlockId === block.id ? <div className="table-menu" role="menu" aria-label="Table options">
                        <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => updateTable(block, "insert-row-before")}><TableActionIcon action="insert-row-before" /><span>Insert row before</span></button>
                        <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => updateTable(block, "insert-row-after")}><TableActionIcon action="insert-row-after" /><span>Insert row after</span></button>
                        <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => updateTable(block, "delete-row")}><TableActionIcon action="delete-row" /><span>Delete row</span></button>
                        <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => updateTable(block, "insert-column-before")}><TableActionIcon action="insert-column-before" /><span>Insert column before</span></button>
                        <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => updateTable(block, "insert-column-after")}><TableActionIcon action="insert-column-after" /><span>Insert column after</span></button>
                        <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => updateTable(block, "delete-column")}><TableActionIcon action="delete-column" /><span>Delete column</span></button>
                      </div> : null}</div> : <span>{blockLabel(block.type)}</span>}
                      {isEditableTextBlock(block) ? <div className="canvas-format-actions" aria-label="Text formatting">
                        <button className={block.align === "left" || !block.align ? "is-active" : ""} type="button" onMouseDown={preserveTextSelection} onClick={() => setTextAlignment(block, "left")} aria-label="Align text left" aria-pressed={block.align === "left" || !block.align} title="Align left"><AlignLeftIcon /></button>
                        <button className={block.align === "centre" ? "is-active" : ""} type="button" onMouseDown={preserveTextSelection} onClick={() => setTextAlignment(block, "centre")} aria-label="Align text centre" aria-pressed={block.align === "centre"} title="Align centre"><AlignCentreIcon /></button>
                        <button className={block.align === "right" ? "is-active" : ""} type="button" onMouseDown={preserveTextSelection} onClick={() => setTextAlignment(block, "right")} aria-label="Align text right" aria-pressed={block.align === "right"} title="Align right"><AlignRightIcon /></button>
                        <button type="button" onMouseDown={preserveTextSelection} onClick={() => formatSelectedText(block, "bold")} aria-label="Bold selected text" title="Bold"><strong>B</strong></button>
                        <button type="button" onMouseDown={preserveTextSelection} onClick={() => formatSelectedText(block, "italic")} aria-label="Italicise selected text" title="Italic"><em>I</em></button>
                        <button type="button" onMouseDown={(event) => { preserveTextSelection(event); openLinkEditor(block); }} aria-label="Add hyperlink to selected text" title="Add hyperlink"><LinkIcon /></button>
                      </div> : null}
                      <div className="canvas-block-actions">
                        <button type="button" onClick={(event) => { event.stopPropagation(); onMoveBlock(index, -1); }} disabled={index === 0} aria-label="Move block up" title="Move up"><ArrowUpIcon /></button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); onMoveBlock(index, 1); }} disabled={index === activeDocument.blocks.length - 1} aria-label="Move block down" title="Move down"><ArrowDownIcon /></button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicateBlock(index); }} aria-label="Duplicate block" title="Duplicate block"><DuplicateIcon /></button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); onRemoveBlock(block.id); }} aria-label="Remove block" title="Remove block"><CloseIcon /></button>
                      </div>
                      {isEditableTextBlock(block) && linkEditor?.blockId === block.id ? <form className="link-editor-popover" aria-label="Add hyperlink" onSubmit={(event) => applyLink(event, block)}>
                        <div className="link-editor-input-row"><label><span>Link</span><input ref={linkInputRef} type="text" value={linkEditor.url} onChange={(event) => { setLinkEditor({ ...linkEditor, url: event.target.value }); setLinkError(null); }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setLinkEditor(null); setLinkError(null); } }} placeholder="Search or type URL" autoComplete="url" /></label><button className="link-editor-submit-icon" type="submit" aria-label="Apply hyperlink" title="Apply hyperlink">↵</button></div>
                        <p className="link-editor-selection-state">{linkEditor.selection && linkEditor.selection.start !== linkEditor.selection.end ? "Selected text ready to link." : "Select text in this block, then apply the link."}</p>
                        {linkError ? <p className="link-editor-error" role="alert">{linkError}</p> : null}
                        {linkSuggestions.length ? <div className="link-editor-suggestions" role="listbox" aria-label="Internal links">{linkSuggestions.map((target) => <button type="button" key={target.id} onMouseDown={preserveTextSelection} onClick={() => { setLinkEditor({ ...linkEditor, url: target.href }); setLinkError(null); }}><span className="link-target-mark" aria-hidden="true">{target.kind === "page" ? "P" : "A"}</span><span><strong>{target.title}</strong><small>{target.href}</small></span><em>{target.kind}</em></button>)}</div> : null}
                      <div className="link-editor-actions">{linkEditor.existingUrl ? <button className="link-editor-remove" type="button" onMouseDown={preserveTextSelection} onClick={() => removeLink(block)}>Remove link</button> : <span /> }<span><button type="button" onMouseDown={preserveTextSelection} onClick={() => { setLinkEditor(null); setLinkError(null); }}>Cancel</button><button className="link-editor-apply" type="submit">Apply</button></span></div>
                      </form> : null}
                      </div>
                      <BlockField block={block} mediaUrl={block.type === "image" && block.mediaId ? mediaBlockUrls[block.mediaId] : undefined} onTableCellFocus={(rowIndex, columnIndex) => setTableCellSelections((current) => ({ ...current, [block.id]: { rowIndex, columnIndex } }))} onTextSelection={(selection) => setTextSelection(block.id, selection)} onChange={(next) => onUpdateBlock(block.id, () => next)} />
                  </article>
                </div>
              ))}
              <div className={`canvas-appender${appenderActive ? " is-active" : ""}`}>
                <input
                  ref={appenderInputRef}
                  type="text"
                  value={appenderValue}
                  placeholder="Type / to choose a block"
                  aria-label="Type / to choose a block"
                  onFocus={() => setAppenderActive(true)}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value.startsWith("/")) {
                      setAppenderValue("");
                      setAppenderActive(false);
                      onOpenInserter(activeDocument.blocks.length - 1, value.slice(1));
                      return;
                    }
                    setAppenderValue(value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || !appenderValue.trim()) return;
                    event.preventDefault();
                    const block = onInsertBlock("paragraph");
                    onUpdateBlock(block.id, () => ({ ...block, text: appenderValue, runs: textToRuns(appenderValue) }));
                    setAppenderValue("");
                    setAppenderActive(false);
                  }}
                />
                {appenderActive ? <button className="canvas-appender-button" type="button" onClick={() => { setAppenderValue(""); setAppenderActive(false); onOpenInserter(activeDocument.blocks.length - 1); }} aria-label="Add block" title="Add block">＋</button> : null}
              </div>
            </div>
          </div>
        )}
      </div>

      {showInserter ? <BlockInserter inserterQuery={inserterQuery} filteredBlocks={filteredBlocks} onSetQuery={onSetInserterQuery} onInsert={onInsertBlock} onDismiss={() => onSetShowInserter(false)} /> : null}
    </section>
  );
}

function BlockInserter({ inserterQuery, filteredBlocks, onSetQuery, onInsert, onDismiss }: { inserterQuery: string; filteredBlocks: StudioCanvasProps["filteredBlocks"]; onSetQuery: (query: string) => void; onInsert: (type: InsertableBlockType) => void; onDismiss: () => void }) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  return (
    <div className="inserter-backdrop">
      <button className="inserter-dismiss" type="button" onClick={onDismiss} aria-label="Close block library" />
      <section className="block-inserter" role="dialog" aria-modal="true" aria-labelledby="inserter-title">
        <header><div><p className="eyebrow">Block library</p><h2 id="inserter-title">Choose a block</h2></div><button type="button" onClick={onDismiss} aria-label="Close block library">×</button></header>
        <input ref={searchInputRef} type="search" value={inserterQuery} onChange={(event) => onSetQuery(event.target.value)} placeholder="Search blocks" aria-label="Search blocks" />
        <div className="inserter-results">
          {(["Text", "Media", "Design"] as const).map((group) => {
            const items = filteredBlocks.filter((item) => item.group === group);
            if (!items.length) return null;
            return <div className="inserter-group" key={group}><h3>{group}</h3><div>{items.map((item) => <button type="button" key={item.type} onClick={() => onInsert(item.type)}><span>{item.glyph}</span><strong>{item.label}</strong><small>{item.description}</small></button>)}</div></div>;
          })}
        </div>
      </section>
    </div>
  );
}

function BlockField({ block, mediaUrl, onTableCellFocus, onTextSelection, onChange }: { block: ContentBlock; mediaUrl?: string; onTableCellFocus: (rowIndex: number, columnIndex: number) => void; onTextSelection: (selection: TextSelection | null) => void; onChange: (block: ContentBlock) => void }) {
  if (block.type === "paragraph") return <RichTextEditor className={`block-textarea paragraph-field align-${block.align ?? "left"}`} text={block.text} runs={block.runs} onChange={(text, runs) => onChange({ ...block, text, runs })} onSelectionChange={onTextSelection} data-studio-block-id={block.id} data-placeholder="Start writing…" aria-label="Paragraph text" />;
  if (block.type === "heading") return <RichTextEditor className={`block-textarea heading-field is-h${block.level} align-${block.align ?? "left"}`} text={block.text} runs={block.runs} onChange={(text, runs) => onChange({ ...block, text, runs })} onSelectionChange={onTextSelection} data-studio-block-id={block.id} data-placeholder="Heading" aria-label="Heading text" />;
  if (block.type === "quote") return <div className={`quote-field align-${block.align ?? "left"}`}><RichTextEditor className="block-textarea" text={block.text} runs={block.runs} onChange={(text, runs) => onChange({ ...block, text, runs })} onSelectionChange={onTextSelection} data-studio-block-id={block.id} aria-label="Quote text" />{block.attribution ? <span>— {block.attribution}</span> : null}</div>;
  if (block.type === "list") return <ListField block={block} onChange={onChange} />;
  if (block.type === "table") return <TableField block={block} onCellFocus={onTableCellFocus} onChange={onChange} />;
  if (block.type === "code") return <CodeEditor value={block.code} language={block.language} onChange={(code) => onChange({ ...block, code })} />;
  // User-supplied URLs cannot be known to Next's image optimiser in this local editor.
  // eslint-disable-next-line @next/next/no-img-element
  if (block.type === "image") return <div className="image-field">{mediaUrl || block.src ? <img src={mediaUrl || block.src} alt={block.alt} /> : <div><span>▧</span><strong>Image block</strong><small>Choose a managed file or add an image URL.</small></div>}{block.caption ? <p>{block.caption}</p> : null}</div>;
  if (block.type === "embed") return <div className="embed-field"><span>↗</span><div><strong>{block.title}</strong><small>{block.url || "Add a URL in Block settings"}</small></div></div>;
  if (block.type === "button") return <div className="button-field"><span className={`content-button is-${block.style}`}>{block.label}</span></div>;
  return <div className="divider-field"><span /></div>;
}

function CodeEditor({ value, language, onChange }: { value: string; language?: string; onChange: (value: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const highlighted = highlightCode(value, language);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
    syncScroll();
  }, [value, language]);

  function syncScroll() {
    const textarea = textareaRef.current;
    const highlightedCode = highlightRef.current;
    if (!textarea || !highlightedCode) return;
    highlightedCode.scrollTop = textarea.scrollTop;
    highlightedCode.scrollLeft = textarea.scrollLeft;
  }

  return (
    <div className="code-editor-shell">
      <pre className="code-highlight" ref={highlightRef} aria-hidden="true" data-language={highlighted.language}><code dangerouslySetInnerHTML={{ __html: highlighted.html }} /></pre>
      <textarea
        ref={textareaRef}
        className="block-textarea code-field code-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={syncScroll}
        aria-label="Code"
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="Write code…"
        rows={1}
        spellCheck={false}
      />
    </div>
  );
}

type RichTextEditorProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  text: string;
  runs?: RichTextRun[];
  onChange: (text: string, runs: RichTextRun[]) => void;
  onSelectionChange: (selection: TextSelection | null) => void;
};

function RichTextEditor({ text, runs, onChange, onSelectionChange, className, ...props }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const renderedRuns = runs?.length ? runs : textToRuns(text);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = runsToEditorHtml(renderedRuns);
    if (editor.innerHTML === html) return;
    const selection = selectionWithinEditor(editor);
    editor.innerHTML = html;
    if (selection) restoreEditorSelection(editor, selection);
  }, [renderedRuns]);

  function readSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) {
      onSelectionChange(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const start = editorOffset(editor, range.startContainer, range.startOffset);
    const end = editorOffset(editor, range.endContainer, range.endOffset);
    onSelectionChange(start <= end ? { start, end } : { start: end, end: start });
  }

  function handleInput() {
    const editor = editorRef.current;
    if (!editor) return;
    const nextRuns = editorToRuns(editor);
    onChange(plainTextFromRuns(nextRuns), nextRuns);
    readSelection();
  }

  // Prevent editing links from navigating away from the Studio.
  return <div {...props} ref={editorRef} className={`${className ?? ""} rich-text-editor`} contentEditable role="textbox" tabIndex={0} aria-multiline="true" suppressContentEditableWarning onInput={handleInput} onSelect={readSelection} onKeyUp={readSelection} onMouseUp={readSelection} onFocus={readSelection} onClick={(event) => {
    const link = (event.target as HTMLElement).closest("a");
    if (!link || !editorRef.current?.contains(link)) return;
    event.preventDefault();
    const range = document.createRange();
    range.selectNodeContents(link);
    onSelectionChange({ start: editorOffset(editorRef.current, range.startContainer, range.startOffset), end: editorOffset(editorRef.current, range.endContainer, range.endOffset) });
  }} />;
}

function preserveTextSelection(event: ReactMouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}

function editorOffset(root: HTMLElement, container: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(container, offset);
  return range.toString().length;
}

function selectionWithinEditor(editor: HTMLElement): TextSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return null;
  const range = selection.getRangeAt(0);
  const start = editorOffset(editor, range.startContainer, range.startOffset);
  const end = editorOffset(editor, range.endContainer, range.endOffset);
  return start <= end ? { start, end } : { start: end, end: start };
}

function restoreEditorSelection(editor: HTMLElement, selection: TextSelection) {
  const start = editorPointAtOffset(editor, selection.start);
  const end = editorPointAtOffset(editor, selection.end);
  if (!start || !end) return;
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  const nativeSelection = window.getSelection();
  if (!nativeSelection) return;
  nativeSelection.removeAllRanges();
  nativeSelection.addRange(range);
}

function editorPointAtOffset(editor: HTMLElement, targetOffset: number) {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  let offset = 0;
  while (node) {
    const length = node.textContent?.length ?? 0;
    if (targetOffset <= offset + length) return { node, offset: targetOffset - offset };
    offset += length;
    node = walker.nextNode();
  }
  return editor.lastChild ? { node: editor.lastChild, offset: editor.lastChild.textContent?.length ?? 0 } : null;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function runsToEditorHtml(runs: RichTextRun[]) {
  return runs.map((run) => {
    let html = escapeHtml(run.text).replace(/\n/g, "<br>");
    for (const mark of run.marks ?? []) {
      if (mark === "bold") html = `<strong>${html}</strong>`;
      else if (mark === "italic") html = `<em>${html}</em>`;
      else {
        const href = safeTextLink(mark.url);
        if (href) html = `<a href="${escapeHtml(href)}">${html}</a>`;
      }
    }
    return html;
  }).join("");
}

function editorToRuns(editor: HTMLElement) {
  const runs: RichTextRun[] = [];
  function visit(node: Node, inheritedMarks: TextMark[]) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) runs.push({ text: node.textContent, marks: inheritedMarks.length ? inheritedMarks : undefined });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    if (element.tagName === "BR") {
      runs.push({ text: "\n" });
      return;
    }
    const marks = [...inheritedMarks];
    if (element.tagName === "STRONG" || element.tagName === "B") marks.push("bold");
    if (element.tagName === "EM" || element.tagName === "I") marks.push("italic");
    if (element.tagName === "A") {
      const href = safeTextLink(element.getAttribute("href") ?? "");
      if (href) marks.push({ type: "link", url: href });
    }
    element.childNodes.forEach((child) => visit(child, marks));
    if (element.tagName === "DIV" || element.tagName === "P") runs.push({ text: "\n" });
  }
  editor.childNodes.forEach((node) => visit(node, []));
  const nextRuns = normaliseTextRuns(runs);
  const last = nextRuns[nextRuns.length - 1];
  if (last?.text.endsWith("\n")) last.text = last.text.slice(0, -1);
  return normaliseTextRuns(nextRuns);
}

function AlignLeftIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false"><path d="M3 4h14M3 8h10M3 12h14M3 16h10" /></svg>;
}

function AlignCentreIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false"><path d="M3 4h14M5 8h10M3 12h14M5 16h10" /></svg>;
}

function AlignRightIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false"><path d="M3 4h14M7 8h10M3 12h14M7 16h10" /></svg>;
}

function LinkIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false"><path d="m8 12 4-4M6.5 14.5l-1 1a3 3 0 0 1-4-4l2-2a3 3 0 0 1 4-0.2M13.5 5.5l1-1a3 3 0 0 1 4 4l-2 2a3 3 0 0 1-4 .2" /></svg>;
}

function ArrowUpIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false"><path d="M10 16V4m-5 5 5-5 5 5" /></svg>;
}

function ArrowDownIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false"><path d="M10 4v12m-5-5 5 5 5-5" /></svg>;
}

function DuplicateIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false"><rect x="6" y="6" width="10" height="10" rx="1" /><path d="M4 13V4a1 1 0 0 1 1-1h9" /></svg>;
}

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false"><path d="m5 5 10 10M15 5 5 15" /></svg>;
}

function AutoResizeTextarea({ value, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);
  return <textarea {...props} ref={textareaRef} rows={1} value={value} />;
}

function ListField({ block, onChange }: { block: Extract<ContentBlock, { type: "list" }>; onChange: (block: ContentBlock) => void }) {
  const items = block.items.length ? block.items : [""];
  function updateItem(index: number, value: string) {
    const nextItems = [...items];
    nextItems[index] = value;
    onChange({ ...block, items: nextItems });
  }
  function removeItem(index: number) {
    const nextItems = items.filter((_, itemIndex) => itemIndex !== index);
    onChange({ ...block, items: nextItems.length ? nextItems : [""] });
  }
  return (
    <div className={`list-field-editor is-${block.style}`}>
      {items.map((item, index) => (
        <div className="list-field-row" key={`${block.id}-item-${index}`}>
          <span className="list-field-marker" aria-hidden="true">{block.style === "ordered" ? `${index + 1}.` : "•"}</span>
          <textarea rows={Math.max(1, Math.ceil(item.length / 62))} value={item} onChange={(event) => updateItem(index, event.target.value)} aria-label={`${block.style === "ordered" ? "Numbered" : "Bulleted"} list item ${index + 1}`} placeholder="List item" />
          <button className="list-item-remove" type="button" onClick={() => removeItem(index)} aria-label={`Remove list item ${index + 1}`}>×</button>
        </div>
      ))}
      <button className="list-item-add" type="button" onClick={() => onChange({ ...block, items: [...items, ""] })}>＋ Add item</button>
    </div>
  );
}

function TableField({ block, onCellFocus, onChange }: { block: Extract<ContentBlock, { type: "table" }>; onCellFocus: (rowIndex: number, columnIndex: number) => void; onChange: (block: ContentBlock) => void }) {
  const rows = block.rows.length ? block.rows : [[""]];
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const normalisedRows = rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] ?? ""));
  const hasFooterRow = Boolean(block.hasFooter && normalisedRows.length > (block.hasHeader ? 1 : 0));

  function updateCell(rowIndex: number, columnIndex: number, value: string) {
    const nextRows = normalisedRows.map((row) => [...row]);
    nextRows[rowIndex][columnIndex] = value;
    onChange({ ...block, rows: nextRows });
  }

  return (
    <div className="table-field">
      <table className="table-field-grid">
        {block.hasHeader ? <thead><tr>{normalisedRows[0].map((cell, columnIndex) => <th key={`header-${columnIndex}`}><input value={cell} onFocus={() => onCellFocus(0, columnIndex)} onChange={(event) => updateCell(0, columnIndex, event.target.value)} aria-label={`Table header ${columnIndex + 1}`} /></th>)}</tr></thead> : null}
        <tbody>{normalisedRows.slice(block.hasHeader ? 1 : 0, hasFooterRow ? -1 : undefined).map((row, rowIndex) => { const actualRowIndex = rowIndex + (block.hasHeader ? 1 : 0); return <tr key={`row-${actualRowIndex}`}>{row.map((cell, columnIndex) => <td key={`${actualRowIndex}-${columnIndex}`}><input value={cell} onFocus={() => onCellFocus(actualRowIndex, columnIndex)} onChange={(event) => updateCell(actualRowIndex, columnIndex, event.target.value)} aria-label={`Table row ${actualRowIndex + 1}, column ${columnIndex + 1}`} /></td>)}</tr>; })}</tbody>
        {hasFooterRow ? <tfoot><tr>{normalisedRows.at(-1)?.map((cell, columnIndex) => <td key={`footer-${columnIndex}`}><input value={cell} onFocus={() => onCellFocus(normalisedRows.length - 1, columnIndex)} onChange={(event) => updateCell(normalisedRows.length - 1, columnIndex, event.target.value)} aria-label={`Table footer ${columnIndex + 1}`} /></td>)}</tr></tfoot> : null}
      </table>
    </div>
  );
}
