"use client";

import { useLayoutEffect, useRef, type HTMLAttributes, type MouseEvent as ReactMouseEvent, type TextareaHTMLAttributes } from "react";
import { BlockRenderer } from "../components/content";
import { linkAtTextRange, normaliseTextRuns, plainTextFromRuns, safeTextLink, textToRuns, updateTextMark } from "../content/rich-text";
import type { ContentBlock, RichTextRun, TextAlignment, TextMark } from "../content/model";
import type { StudioDocument, InsertableBlockType } from "./editor-model";

function blockLabel(type: ContentBlock["type"]) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

type TextSelection = { start: number; end: number };
type EditableTextBlock = Extract<ContentBlock, { type: "paragraph" | "heading" | "quote" }>;

function isEditableTextBlock(block: ContentBlock): block is EditableTextBlock {
  return block.type === "paragraph" || block.type === "heading" || block.type === "quote";
}

export type StudioCanvasProps = {
  activeDocument: StudioDocument;
  previewing: boolean;
  wordCount: number;
  showCoverImage: boolean;
  coverImageUrl?: string;
  mediaBlockUrls: Record<string, string>;
  selectedBlockId: string | null;
  dragOverIndex: number | null;
  showInserter: boolean;
  inserterQuery: string;
  filteredBlocks: typeof import("./editor-model").blockCatalogue;
  publishFeedback: string | null;
  onOpenInserter: (afterIndex: number | null) => void;
  onSetPublishFeedback: (feedback: string | null) => void;
  onDocumentFieldChange: <K extends keyof StudioDocument>(field: K, value: StudioDocument[K]) => void;
  onFocusDocumentField: () => void;
  onOpenCoverMediaLibrary: () => void;
  onRemoveCoverImage: () => void;
  onSelectBlock: (blockId: string) => void;
  onSetDragOverIndex: (index: number | null) => void;
  onMoveBlockTo: (from: number, to: number) => void;
  onMoveBlock: (index: number, direction: -1 | 1) => void;
  onDuplicateBlock: (index: number) => void;
  onRemoveBlock: (blockId: string) => void;
  onUpdateBlock: (blockId: string, update: (block: ContentBlock) => ContentBlock) => void;
  onInsertBlock: (type: InsertableBlockType) => void;
  onSetShowInserter: (show: boolean) => void;
  onSetInserterQuery: (query: string) => void;
};

export function StudioCanvas({ activeDocument, previewing, wordCount, showCoverImage, coverImageUrl, mediaBlockUrls, selectedBlockId, dragOverIndex, showInserter, inserterQuery, filteredBlocks, publishFeedback, onOpenInserter, onSetPublishFeedback, onDocumentFieldChange, onFocusDocumentField, onOpenCoverMediaLibrary, onRemoveCoverImage, onSelectBlock, onSetDragOverIndex, onMoveBlockTo, onMoveBlock, onDuplicateBlock, onRemoveBlock, onUpdateBlock, onInsertBlock, onSetShowInserter, onSetInserterQuery }: StudioCanvasProps) {
  const draggingIndexRef = useRef<number | null>(null);
  const textSelectionsRef = useRef<Record<string, TextSelection | null>>({});

  function setTextSelection(blockId: string, selection: TextSelection | null) {
    textSelectionsRef.current[blockId] = selection;
  }

  function setTextAlignment(block: EditableTextBlock, align: TextAlignment) {
    onUpdateBlock(block.id, () => ({ ...block, align }));
  }

  function formatSelectedText(block: EditableTextBlock, mark: TextMark, mode: "toggle" | "set" = "toggle") {
    const selection = textSelectionsRef.current[block.id];
    if (!selection || selection.start === selection.end) return;
    const runs = block.runs?.length ? block.runs : textToRuns(block.text);
    const nextRuns = updateTextMark(runs, selection.start, selection.end, mark, mode);
    onUpdateBlock(block.id, () => ({ ...block, text: plainTextFromRuns(nextRuns), runs: nextRuns }));
  }

  function addLink(block: EditableTextBlock) {
    const selection = textSelectionsRef.current[block.id];
    if (!selection || selection.start === selection.end) {
      onSetPublishFeedback("Select text before adding a hyperlink.");
      return;
    }
    const runs = block.runs?.length ? block.runs : textToRuns(block.text);
    const existing = linkAtTextRange(runs, selection.start, selection.end) ?? "";
    const input = window.prompt("Link URL", existing);
    if (input === null) return;
    const url = safeTextLink(input);
    if (!url) {
      onSetPublishFeedback("Use a valid https://, mailto:, /path or #anchor URL.");
      return;
    }
    formatSelectedText(block, { type: "link", url }, "set");
  }

  return (
    <section className="block-editor" aria-label={`${activeDocument.kind} editor`}>
      <div className="editor-document-bar">
        <div><span>{activeDocument.kind}</span><strong>{wordCount} words · {activeDocument.blocks.length} blocks</strong></div>
        <button type="button" onClick={() => onOpenInserter(null)}>＋ Add block</button>
      </div>
      {publishFeedback ? <div className="publish-feedback" role="status"><span>{publishFeedback}</span><button type="button" onClick={() => onSetPublishFeedback(null)} aria-label="Dismiss publication message">×</button></div> : null}

      <div className="editor-canvas-scroll">
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
                  <button className="between-blocks" type="button" onClick={() => onOpenInserter(index - 1)} aria-label={`Add block before ${blockLabel(block.type)}`}>＋</button>
                  <article
                    className={`canvas-block is-${block.type}${selectedBlockId === block.id ? " is-selected" : ""}`}
                    onPointerDown={() => onSelectBlock(block.id)}
                    onFocusCapture={() => onSelectBlock(block.id)}
                    onDragOver={(event) => { event.preventDefault(); onSetDragOverIndex(draggingIndexRef.current === index ? null : index); }}
                    onDrop={() => { if (draggingIndexRef.current !== null) onMoveBlockTo(draggingIndexRef.current, index); draggingIndexRef.current = null; onSetDragOverIndex(null); }}
                  >
                    <div className="canvas-block-toolbar">
                      <button className="drag-handle" type="button" draggable onClick={() => onSelectBlock(block.id)} onDragStart={(event) => { event.stopPropagation(); draggingIndexRef.current = index; onSetDragOverIndex(null); }} onDragEnd={() => { draggingIndexRef.current = null; onSetDragOverIndex(null); }} aria-label={`Drag to reorder ${blockLabel(block.type)} block`} title="Drag to reorder block">⠿</button>
                      <span>{blockLabel(block.type)}</span>
                      {isEditableTextBlock(block) ? <div className="canvas-format-actions" aria-label="Text formatting">
                        <button type="button" onMouseDown={preserveTextSelection} onClick={() => setTextAlignment(block, "left")} aria-label="Align text left" title="Align left"><AlignLeftIcon /></button>
                        <button type="button" onMouseDown={preserveTextSelection} onClick={() => setTextAlignment(block, "centre")} aria-label="Align text centre" title="Align centre"><AlignCentreIcon /></button>
                        <button type="button" onMouseDown={preserveTextSelection} onClick={() => setTextAlignment(block, "right")} aria-label="Align text right" title="Align right"><AlignRightIcon /></button>
                        <button type="button" onMouseDown={preserveTextSelection} onClick={() => formatSelectedText(block, "bold")} aria-label="Bold selected text" title="Bold"><strong>B</strong></button>
                        <button type="button" onMouseDown={preserveTextSelection} onClick={() => formatSelectedText(block, "italic")} aria-label="Italicise selected text" title="Italic"><em>I</em></button>
                        <button type="button" onMouseDown={preserveTextSelection} onClick={() => addLink(block)} aria-label="Add hyperlink to selected text" title="Add hyperlink"><LinkIcon /></button>
                      </div> : null}
                      <div className="canvas-block-actions">
                        <button type="button" onClick={(event) => { event.stopPropagation(); onMoveBlock(index, -1); }} disabled={index === 0} aria-label="Move block up">↑</button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); onMoveBlock(index, 1); }} disabled={index === activeDocument.blocks.length - 1} aria-label="Move block down">↓</button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicateBlock(index); }} aria-label="Duplicate block">⧉</button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); onRemoveBlock(block.id); }} aria-label="Remove block">×</button>
                      </div>
                    </div>
                    <BlockField block={block} mediaUrl={block.type === "image" && block.mediaId ? mediaBlockUrls[block.mediaId] : undefined} onTextSelection={(selection) => setTextSelection(block.id, selection)} onChange={(next) => onUpdateBlock(block.id, () => next)} />
                  </article>
                </div>
              ))}
              <button className="canvas-appender" type="button" onClick={() => onOpenInserter(activeDocument.blocks.length - 1)}>＋ <span>Add a block</span></button>
            </div>
          </div>
        )}
      </div>

      {showInserter ? <BlockInserter inserterQuery={inserterQuery} filteredBlocks={filteredBlocks} onSetQuery={onSetInserterQuery} onInsert={onInsertBlock} onDismiss={() => onSetShowInserter(false)} /> : null}
    </section>
  );
}

function BlockInserter({ inserterQuery, filteredBlocks, onSetQuery, onInsert, onDismiss }: { inserterQuery: string; filteredBlocks: StudioCanvasProps["filteredBlocks"]; onSetQuery: (query: string) => void; onInsert: (type: InsertableBlockType) => void; onDismiss: () => void }) {
  return (
    <div className="inserter-backdrop">
      <button className="inserter-dismiss" type="button" onClick={onDismiss} aria-label="Close block library" />
      <section className="block-inserter" role="dialog" aria-modal="true" aria-labelledby="inserter-title">
        <header><div><p className="eyebrow">Block library</p><h2 id="inserter-title">Choose a block</h2></div><button type="button" onClick={onDismiss} aria-label="Close block library">×</button></header>
        <input type="search" value={inserterQuery} onChange={(event) => onSetQuery(event.target.value)} placeholder="Search blocks" aria-label="Search blocks" />
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

function BlockField({ block, mediaUrl, onTextSelection, onChange }: { block: ContentBlock; mediaUrl?: string; onTextSelection: (selection: TextSelection | null) => void; onChange: (block: ContentBlock) => void }) {
  if (block.type === "paragraph") return <RichTextEditor className={`block-textarea paragraph-field align-${block.align ?? "left"}`} text={block.text} runs={block.runs} onChange={(text, runs) => onChange({ ...block, text, runs })} onSelectionChange={onTextSelection} data-placeholder="Start writing…" aria-label="Paragraph text" />;
  if (block.type === "heading") return <RichTextEditor className={`block-textarea heading-field is-h${block.level} align-${block.align ?? "left"}`} text={block.text} runs={block.runs} onChange={(text, runs) => onChange({ ...block, text, runs })} onSelectionChange={onTextSelection} data-placeholder="Heading" aria-label="Heading text" />;
  if (block.type === "quote") return <div className={`quote-field align-${block.align ?? "left"}`}><RichTextEditor className="block-textarea" text={block.text} runs={block.runs} onChange={(text, runs) => onChange({ ...block, text, runs })} onSelectionChange={onTextSelection} aria-label="Quote text" />{block.attribution ? <span>— {block.attribution}</span> : null}</div>;
  if (block.type === "list") return <ListField block={block} onChange={onChange} />;
  if (block.type === "code") return <textarea className="block-textarea code-field" rows={5} value={block.code} onChange={(event) => onChange({ ...block, code: event.target.value })} aria-label="Code" />;
  // User-supplied URLs cannot be known to Next's image optimiser in this local editor.
  // eslint-disable-next-line @next/next/no-img-element
  if (block.type === "image") return <div className="image-field">{mediaUrl || block.src ? <img src={mediaUrl || block.src} alt={block.alt} /> : <div><span>▧</span><strong>Image block</strong><small>Choose a managed file or add an image URL.</small></div>}{block.caption ? <p>{block.caption}</p> : null}</div>;
  if (block.type === "embed") return <div className="embed-field"><span>↗</span><div><strong>{block.title}</strong><small>{block.url || "Add a URL in Block settings"}</small></div></div>;
  if (block.type === "button") return <div className="button-field"><span className={`content-button is-${block.style}`}>{block.label}</span></div>;
  return <div className="divider-field"><span /></div>;
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
    if (editor.innerHTML !== html) editor.innerHTML = html;
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
  return <div {...props} ref={editorRef} className={`${className ?? ""} rich-text-editor`} contentEditable role="textbox" tabIndex={0} aria-multiline="true" suppressContentEditableWarning onInput={handleInput} onSelect={readSelection} onKeyUp={readSelection} onMouseUp={readSelection} onFocus={readSelection} onClick={(event) => { if ((event.target as HTMLElement).closest("a")) event.preventDefault(); }} />;
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
