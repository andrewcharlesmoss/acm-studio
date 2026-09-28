"use client";

import { useCallback, useLayoutEffect, useRef, useState, type DragEvent, type FormEvent, type HTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode, type RefObject, type TextareaHTMLAttributes } from "react";
import { AcmIcon } from "@acm/icons/react";
import type { IconName } from "@acm/icons";
import { BlockRenderer } from "../components/content";
import { useFitText } from "../components/fit-text-paragraph";
import { ArticleMetaIcon } from "../components/article-meta-icon";
import { authorInitials, documentAuthor, documentFieldVisible, formatDocumentDate } from "../content/document-metadata";
import { readingTimeLabel } from "../content/reading-time";
import { imageDisplayStyle } from "../content/image-style";
import { highlightCode } from "../content/code-highlighting.mjs";
import { safeMathMLMarkup } from "../content/mathml";
import { buttonVisualCss, fitTextEnabled, paragraphStyleAnchor, paragraphStyleClassName, paragraphStyleToCss, visualStyleClassName } from "../content/paragraph-styles";
import { spacerDimensions } from "../content/spacer";
import { availableBlockTransforms, transformBlock as transformContentBlock, type BlockTransform } from "./block-transforms";
import { BlockLibraryIcon } from "./block-library-icons";
import { socialIconCatalogue } from "./editor-model";
import { SocialIconView } from "../components/social-icons";
import { StudioIcon } from "./studio-icons";
import { Pane } from "./panes/pane-components";
import { TableActionIcon, TableIcon, type TableAction } from "./table-icons";
import { linkAtTextRange, normaliseTextRuns, plainTextFromRuns, replaceTextRange, safeImageSource, safeTextLink, textToRuns, updateTextMark } from "../content/rich-text";
import { DEFAULT_TABLE_ROW_HEIGHT, fitTableColumn, listItemText, listMarker, normaliseTableColumnWidths, normaliseTableRowHeights, resizeTableColumn, type ContentBlock, type DocumentRenderContext, type HeadingLevel, type ListItem, type RichTextRun, type TextAlignment, type TextMark } from "../content/model";
import type { StudioDocument, InsertableBlockType } from "./editor-model";
import type { StudioPresentation } from "./studio-presentation";
import { blockToHtml, blocksToHtml, collectBlockIds, formatHtml, parseHtmlToBlock, parseHtmlToBlocks } from "./studio-html-editor";
import { hasLayoutOptions, layoutDataAttributes, layoutStyleProperties } from "../content/layout";
import { COLUMN_LAYOUT_PRESETS, columnsLayoutStyle, setColumnsLayout } from "../content/columns";
import { blockAlignmentClass, blockAlignmentOptions, contentBlockAlignment } from "../content/block-alignment";
import { findBlockById } from "./studio-command-operations.mjs";

function StudioHoverIcon({ name, size = 24, vertical = false }: { name: IconName; size?: number; vertical?: boolean }) {
  return <AcmIcon className={vertical ? "studio-hover-icon is-vertical" : "studio-hover-icon"} name={name} scale="Regular-M" size={size} />;
}

function blockLabel(type: ContentBlock["type"]) {
  if (type === "column") return "Column";
  if (type === "reading-time") return "Reading Time";
  if (type === "post-author") return "Post Author";
  if (type === "post-date") return "Post Date";
  if (type === "document-title") return "Document Title";
  if (type === "document-subtitle") return "Document Subtitle";
  if (type === "cover-image") return "Cover Image";
  if (type === "social-icons") return "Social Icons";
  if (type === "social-linkedin") return "LinkedIn";
  if (type === "social-tiktok") return "TikTok";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function blockChildren(block: ContentBlock) {
  return (block.type === "section" || block.type === "group" || block.type === "columns" || block.type === "column" || block.type === "component" || block.type === "social-icons") ? (block.children ?? []) : [];
}

function lastParagraphBlock(blocks: ContentBlock[]): Extract<ContentBlock, { type: "paragraph" }> | null {
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    if (block.type === "paragraph") return block;
    const nestedParagraph = lastParagraphBlock(blockChildren(block));
    if (nestedParagraph) return nestedParagraph;
  }
  return null;
}

function blockOutlineLabel(block: ContentBlock) {
  if (block.type === "group" && block.data?.templateElement) return String(block.data.templateElement).replaceAll("-", " ");
  if (block.type === "group" && block.data?.templatePart) return "Shared part";
  if (block.type === "section" && block.role) return block.role.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  if (block.siteRole) return `${block.siteRole.replaceAll("-", " ")}: ${"text" in block ? block.text.slice(0, 36) : "label" in block ? block.label : block.type}`;
  if (block.type === "heading") return `Heading ${block.level}`;
  if (block.type === "component") return block.component.replace("mini-golf-", "Mini Golf ");
  return blockLabel(block.type);
}

type TextSelection = { start: number; end: number };
type TableCell = { rowIndex: number; columnIndex: number };
type EditableTextBlock = Extract<ContentBlock, { type: "paragraph" | "heading" | "quote" }>;
type EditableListBlock = Extract<ContentBlock, { type: "list" }>;
type EditableRichTextBlock = EditableTextBlock | EditableListBlock;
type BlockAlignedBlock = Extract<ContentBlock, { type: "paragraph" | "heading" | "quote" | "list" | "table" | "code" | "image" | "embed" | "divider" | "group" | "columns" | "document-title" }>;
type LinkTarget = { id: string; title: string; href: string; kind: "page" | "post" };
type LinkEditorState = { blockId: string; itemIndex?: number; url: string; text: string; selection: TextSelection | null; existingUrl: string | null; opensInNewTab: boolean; advancedOpen: boolean; mode: "preview" | "edit"; anchor: { left: number; top: number } | null };
type HtmlEditorState = { blockId: string; draft: string; error: string | null };
type CodeEditorState = { documentId: string; initialDraft: string; initialBlocksSnapshot: string; draft: string; error: string | null };

function isEditableTextBlock(block: ContentBlock): block is EditableTextBlock {
  return block.type === "paragraph" || block.type === "heading" || block.type === "quote";
}

function isBlockAlignedBlock(block: ContentBlock): block is BlockAlignedBlock {
  return blockAlignmentOptions(block.type).length > 0;
}

function blockAlignmentIcon(alignment: ReturnType<typeof contentBlockAlignment>): IconName {
  if (alignment === "left") return "arrange.align-left";
  if (alignment === "center") return "arrange.align-centre-horizontal";
  if (alignment === "right") return "arrange.align-right";
  if (alignment === "wide") return "layout.width-wide";
  if (alignment === "full") return "layout.width-full";
  return "layout.width-default";
}

function blockAlignmentLabel(alignment: ReturnType<typeof contentBlockAlignment>) {
  if (alignment === "left") return "Align left";
  if (alignment === "center") return "Align centre";
  if (alignment === "right") return "Align right";
  if (alignment === "wide") return "Wide width";
  if (alignment === "full") return "Full width";
  return "None";
}

function richTextContent(block: EditableRichTextBlock, itemIndex = 0) {
  if (block.type !== "list") return { text: block.text, runs: block.runs };
  const item = block.items[itemIndex] ?? "";
  return { text: listItemText(item), runs: typeof item === "string" ? undefined : item.runs };
}

function withRichTextContent(block: EditableRichTextBlock, text: string, runs: RichTextRun[], itemIndex = 0): EditableRichTextBlock {
  if (block.type !== "list") return { ...block, text, runs };
  if (itemIndex < 0 || itemIndex >= block.items.length) return block;
  const items = [...block.items];
  items[itemIndex] = runs.some((run) => run.marks?.length) ? { text, runs } : text;
  return { ...block, items };
}

export type StudioCanvasProps = {
  allowHtmlEditing?: boolean;
  targetLabel?: string;
  toolbarContent?: ReactNode;
  viewportWidth?: number;
  viewportWidthCanOverflow?: boolean;
  /** Opt-in workspace zoom. Ordinary Studio and Mini Golf callers leave this unset. */
  canvasZoom?: number;
  className?: string;
  presentation?: StudioPresentation;
  writable?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  activeDocument: StudioDocument;
  previewing: boolean;
  onPreviewChange: (previewing: boolean) => void;
  wordCount: number;
  characterCount: number;
  linkTargets: LinkTarget[];
  showCoverImage: boolean;
  coverImageUrl?: string;
  mediaBlockUrls: Record<string, string>;
  selectedBlockId: string | null;
  pendingColumnsLayoutBlockId?: string | null;
  onColumnsLayoutSelected?: () => void;
  selectedDocumentField?: "title" | "subtitle" | null;
  dragOverIndex: number | null;
  showInserter: boolean;
  inserterQuery: string;
  filteredBlocks: typeof import("./editor-model").blockCatalogue;
  publishFeedback: string | null;
  onOpenInserter: (afterIndex: number | null, query?: string, parentId?: string) => void;
  onSetPublishFeedback: (feedback: string | null) => void;
  onDocumentFieldChange: <K extends keyof StudioDocument>(field: K, value: StudioDocument[K]) => void;
  onApplyDocumentCode: (blocks: ContentBlock[]) => void;
  onCodeEditorDirtyChange?: (dirty: boolean) => void;
  onFocusDocumentField: (field?: "title" | "subtitle") => void;
  onOpenCoverMediaLibrary: () => void;
  onOpenInlineImage?: (blockId: string, selection: TextSelection) => void;
  onAddFootnote?: (blockId: string, selection: TextSelection, text: string) => void;
  onRemoveCoverImage: () => void;
  onSelectBlock: (blockId: string) => void;
  onClearBlockSelection: () => void;
  onSetDragOverIndex: (index: number | null) => void;
  onMoveBlockTo: (from: number, to: number) => void;
  onMoveBlock: (index: number, direction: -1 | 1) => void;
  onDuplicateBlock: (index: number) => void;
  onRemoveBlock: (blockId: string) => void;
  onUpdateBlock: (blockId: string, update: (block: ContentBlock) => ContentBlock) => void;
  onSplitParagraph: (blockId: string, beforeRuns: RichTextRun[], afterRuns: RichTextRun[]) => string | null;
  onMergeParagraphBackward?: (blockId: string) => { blockId: string; offset: number } | null;
  onSplitParagraphs: (blockId: string, paragraphs: RichTextRun[][]) => string[] | null;
  onInsertBlock: (type: InsertableBlockType, parentId?: string) => ContentBlock;
  onInsertBlockAt: (type: InsertableBlockType, insertionIndex: number) => ContentBlock;
  onSetShowInserter: (show: boolean) => void;
  onSetInserterQuery: (query: string) => void;
};

export function StudioCanvas({ allowHtmlEditing = true, targetLabel, toolbarContent, viewportWidth, viewportWidthCanOverflow = false, canvasZoom, className, presentation, writable = true, onUndo, onRedo, canUndo = false, canRedo = false, activeDocument, previewing, onPreviewChange, wordCount, characterCount, linkTargets, showCoverImage, coverImageUrl, mediaBlockUrls, selectedBlockId, pendingColumnsLayoutBlockId = null, onColumnsLayoutSelected, selectedDocumentField = null, dragOverIndex, showInserter, inserterQuery, filteredBlocks, publishFeedback, onOpenInserter, onSetPublishFeedback, onDocumentFieldChange, onApplyDocumentCode, onCodeEditorDirtyChange, onFocusDocumentField, onOpenCoverMediaLibrary, onOpenInlineImage, onAddFootnote, onRemoveCoverImage, onSelectBlock, onClearBlockSelection, onSetDragOverIndex, onMoveBlockTo, onMoveBlock, onDuplicateBlock, onRemoveBlock, onUpdateBlock, onSplitParagraph, onMergeParagraphBackward, onSplitParagraphs, onInsertBlock, onInsertBlockAt, onSetShowInserter, onSetInserterQuery }: StudioCanvasProps) {
  const draggingIndexRef = useRef<number | null>(null);
  const crossBlockSelectionRef = useRef<{ pointerId: number; blockIdentity: Element; blockId: string; start: Range; last: Range; active: boolean } | null>(null);
  const textSelectionsRef = useRef<Record<string, TextSelection | null>>({});
  const [textSelections, setTextSelections] = useState<Record<string, TextSelection | null>>({});
  const [activeListItems, setActiveListItems] = useState<Record<string, number>>({});
  const linkInputRef = useRef<HTMLInputElement>(null);
  const htmlInputRef = useRef<HTMLTextAreaElement>(null);
  const blockMenuItemRef = useRef<HTMLButtonElement>(null);
  const htmlEditorTriggerRef = useRef<HTMLButtonElement>(null);
  const richTextMenuTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const richTextMenuItemRef = useRef<HTMLButtonElement>(null);
  const blockAlignmentTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const blockAlignmentMenuItemRef = useRef<HTMLButtonElement>(null);
  const tableAlignmentTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tableAlignmentMenuItemRef = useRef<HTMLButtonElement>(null);
  const restoreRichTextMenuFocusBlockIdRef = useRef<string | null>(null);
  const codeEditorToggleRef = useRef<HTMLButtonElement>(null);
  const codeEditorInputRef = useRef<HTMLTextAreaElement>(null);
  const listViewToggleRef = useRef<HTMLButtonElement>(null);
  const [inserterClosing, setInserterClosing] = useState(false);
  const [inserterParentId, setInserterParentId] = useState<string | null>(null);
  const appenderInputRef = useRef<HTMLInputElement>(null);
  const [linkEditor, setLinkEditor] = useState<LinkEditorState | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [headingMenuBlockId, setHeadingMenuBlockId] = useState<string | null>(null);
  const [transformMenuBlockId, setTransformMenuBlockId] = useState<string | null>(null);
  const [alignmentMenuBlockId, setAlignmentMenuBlockId] = useState<string | null>(null);
  const [blockAlignmentMenuBlockId, setBlockAlignmentMenuBlockId] = useState<string | null>(null);
  const [richTextMenuBlockId, setRichTextMenuBlockId] = useState<string | null>(null);
  const [richTextActionDialog, setRichTextActionDialog] = useState<{ blockId: string; itemIndex?: number; selection: TextSelection; kind: "highlight" | "language" | "math" | "footnote"; text: string; foreground: string; background: string; language: string; direction: "ltr" | "rtl"; format: "latex" | "mathml"; alternativeText: string } | null>(null);
  const [tableMenuBlockId, setTableMenuBlockId] = useState<string | null>(null);
  const [tableAlignmentMenuBlockId, setTableAlignmentMenuBlockId] = useState<string | null>(null);
  const [blockMenuBlockId, setBlockMenuBlockId] = useState<string | null>(null);
  const viewportStyle = viewportWidth ? { width: viewportWidth, ...(viewportWidthCanOverflow ? {} : { maxWidth: "100%" }), ...(canvasZoom ? { zoom: canvasZoom / 100 } : {}) } : undefined;
  const [htmlEditor, setHtmlEditor] = useState<HtmlEditorState | null>(null);
  const [codeEditor, setCodeEditor] = useState<CodeEditorState | null>(null);
  const [listViewOpen, setListViewOpen] = useState(false);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [tableCellSelections, setTableCellSelections] = useState<Record<string, TableCell>>({});
  const [appenderActive, setAppenderActive] = useState(false);
  const [appenderValue, setAppenderValue] = useState("");
  const hasAppenderDraft = Boolean(appenderValue.trim());
  const appenderWordCount = appenderValue.trim().split(/\s+/).filter(Boolean).length;
  const displayedWordCount = wordCount + appenderWordCount;
  const displayedCharacterCount = characterCount + appenderValue.length + (hasAppenderDraft && activeDocument.blocks.length > 0 ? 1 : 0);
  const displayedBlockCount = activeDocument.blocks.length + (hasAppenderDraft ? 1 : 0);

  useLayoutEffect(() => {
    if (richTextMenuBlockId) richTextMenuItemRef.current?.focus();
    else if (restoreRichTextMenuFocusBlockIdRef.current) {
      const blockId = restoreRichTextMenuFocusBlockIdRef.current;
      restoreRichTextMenuFocusBlockIdRef.current = null;
      richTextMenuTriggerRefs.current[blockId]?.focus();
    }
  }, [richTextMenuBlockId]);

  useLayoutEffect(() => {
    if (blockAlignmentMenuBlockId) blockAlignmentMenuItemRef.current?.focus();
  }, [blockAlignmentMenuBlockId]);

  useLayoutEffect(() => {
    if (tableAlignmentMenuBlockId) tableAlignmentMenuItemRef.current?.focus();
  }, [tableAlignmentMenuBlockId]);

  function dragInsertionIndex(event: DragEvent<HTMLDivElement>, index: number) {
    const block = event.currentTarget.querySelector<HTMLElement>(".canvas-block");
    if (!block) return index;
    const bounds = block.getBoundingClientRect();
    return event.clientY < bounds.top + bounds.height / 2 ? index : index + 1;
  }
  function handleBlockDragOver(event: DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.types.includes("application/x-acm-studio-block")) {
      event.dataTransfer.dropEffect = "copy";
      onSetDragOverIndex(dragInsertionIndex(event, index));
      return;
    }
    const from = draggingIndexRef.current;
    const insertionIndex = dragInsertionIndex(event, index);
    onSetDragOverIndex(from === null || insertionIndex === from || insertionIndex === from + 1 ? null : insertionIndex);
  }
  function handleBlockDrop(event: DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    event.stopPropagation();
    const libraryType = event.dataTransfer.getData("application/x-acm-studio-block");
    if (filteredBlocks.some(item => item.type === libraryType && item.type !== "template-content")) {
      onInsertBlockAt(libraryType as InsertableBlockType, dragInsertionIndex(event, index));
      onSetDragOverIndex(null);
      return;
    }
    const from = draggingIndexRef.current;
    if (from !== null) {
      const insertionIndex = dragInsertionIndex(event, index);
      const target = insertionIndex > from ? insertionIndex - 1 : insertionIndex;
      onMoveBlockTo(from, target);
    }
    draggingIndexRef.current = null;
    onSetDragOverIndex(null);
  }
  const allowCoverImage = presentation?.allowCoverImage ?? activeDocument.kind === "post";
  const compose = (content: ReactNode, mode: "edit" | "preview") => presentation?.renderDocument?.({ document: activeDocument, mode, selectedBlockId, selectedDocumentField, onSelectBlock, onDocumentFieldChange, onFocusDocumentField }, content) ?? content;

  function selectBlockFromList(blockId: string) {
    onSelectBlock(blockId);
    requestAnimationFrame(() => {
      const target = [...document.querySelectorAll<HTMLElement>("[data-studio-block-anchor-id], [data-studio-block-id], [data-studio-nested-block-id]")]
        .find((element) => element.dataset.studioBlockAnchorId === blockId || element.dataset.studioBlockId === blockId || element.dataset.studioNestedBlockId === blockId);
      target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  function finishInserterClose() {
    setInserterClosing(false);
    onSetShowInserter(false);
  }

  function dismissInserter() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) finishInserterClose();
    else setInserterClosing(true);
  }

  function openInserter(afterIndex: number | null, query?: string, parentId: string | null = null) {
    setInserterClosing(false);
    setHoveredBlockId(null);
    setListViewOpen(false);
    setInserterParentId(parentId);
    onOpenInserter(afterIndex, query, parentId ?? undefined);
  }

  function toggleInserter(afterIndex: number | null, query?: string) {
    if (showInserter && !inserterClosing) {
      dismissInserter();
      return;
    }
    openInserter(afterIndex, query);
  }

  function closeListView() {
    setHoveredBlockId(null);
    setListViewOpen(false);
    requestAnimationFrame(() => listViewToggleRef.current?.focus());
  }

  useLayoutEffect(() => {
    if (!listViewOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || showInserter || linkEditor || htmlEditor || blockMenuBlockId || headingMenuBlockId || transformMenuBlockId || alignmentMenuBlockId || blockAlignmentMenuBlockId || tableMenuBlockId) return;
      event.preventDefault();
      event.stopPropagation();
      closeListView();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [listViewOpen, showInserter, linkEditor, htmlEditor, blockMenuBlockId, headingMenuBlockId, transformMenuBlockId, alignmentMenuBlockId, blockAlignmentMenuBlockId, tableMenuBlockId]);

  useLayoutEffect(() => {
    if (linkEditor) linkInputRef.current?.focus();
  }, [linkEditor]);

  useLayoutEffect(() => {
    if (appenderActive) appenderInputRef.current?.focus();
  }, [appenderActive]);

  useLayoutEffect(() => {
    if (htmlEditor) htmlInputRef.current?.focus();
  }, [htmlEditor]);

  useLayoutEffect(() => {
    if (codeEditor) codeEditorInputRef.current?.focus();
  }, [codeEditor]);

  useLayoutEffect(() => {
    if (blockMenuBlockId) blockMenuItemRef.current?.focus();
  }, [blockMenuBlockId]);

  useLayoutEffect(() => {
    if (!htmlEditor) htmlEditorTriggerRef.current?.focus();
  }, [htmlEditor]);

  function openHtmlEditor(block: ContentBlock) {
    setBlockMenuBlockId(null);
    setHtmlEditor({ blockId: block.id, draft: blockToHtml(block), error: null });
  }

  function applyHtmlEditor(block: ContentBlock) {
    if (!htmlEditor || htmlEditor.blockId !== block.id) return;
    const parsed = parseHtmlToBlock(htmlEditor.draft, block);
    if ("error" in parsed) {
      setHtmlEditor((current) => current ? { ...current, error: parsed.error } : current);
      return;
    }
    const originalIds = new Set(collectBlockIds(block));
    const siblingIds = new Set(activeDocument.blocks.flatMap(collectBlockIds).filter((id) => !originalIds.has(id)));
    if (collectBlockIds(parsed.block).some((id) => siblingIds.has(id))) {
      setHtmlEditor((current) => current ? { ...current, error: "That edit would duplicate another block ID." } : current);
      return;
    }
    onUpdateBlock(block.id, () => parsed.block);
    setHtmlEditor(null);
  }

  function openCodeEditor() {
    const initialDraft = formatHtml(blocksToHtml(activeDocument.blocks));
    setCodeEditor({ documentId: activeDocument.id, initialDraft, initialBlocksSnapshot: JSON.stringify(activeDocument.blocks), draft: initialDraft, error: null });
    onCodeEditorDirtyChange?.(false);
    setHoveredBlockId(null);
    setListViewOpen(false);
    onSetShowInserter(false);
    setHtmlEditor(null);
    setBlockMenuBlockId(null);
  }

  function closeCodeEditor(confirmDiscard = false) {
    if (confirmDiscard && codeEditor && codeEditor.draft !== codeEditor.initialDraft && !window.confirm("Discard unsaved code changes?")) return false;
    setCodeEditor(null);
    onCodeEditorDirtyChange?.(false);
    requestAnimationFrame(() => codeEditorToggleRef.current?.focus());
    return true;
  }

  function applyCodeEditor() {
    if (!codeEditor) return;
    if (codeEditor.documentId !== activeDocument.id) {
      setCodeEditor((current) => current ? { ...current, error: "This document changed. Reopen the code editor before applying changes." } : current);
      return;
    }
    if (JSON.stringify(activeDocument.blocks) !== codeEditor.initialBlocksSnapshot) {
      setCodeEditor((current) => current ? { ...current, error: "This document changed outside the code editor. Reopen it before applying changes." } : current);
      return;
    }
    const parsed = parseHtmlToBlocks(codeEditor.draft, activeDocument.blocks);
    if ("error" in parsed) {
      setCodeEditor((current) => current ? { ...current, error: parsed.error } : current);
      return;
    }
    onApplyDocumentCode(parsed.blocks);
    setCodeEditor(null);
    onCodeEditorDirtyChange?.(false);
    onClearBlockSelection();
    requestAnimationFrame(() => codeEditorToggleRef.current?.focus());
  }

  function selectionKey(blockId: string, itemIndex?: number) {
    return itemIndex === undefined ? blockId : `${blockId}:item:${itemIndex}`;
  }

  function activeItemIndex(block: EditableRichTextBlock) {
    return block.type === "list" ? Math.min(activeListItems[block.id] ?? 0, Math.max(block.items.length - 1, 0)) : undefined;
  }

  function setTextSelection(blockId: string, selection: TextSelection | null, itemIndex?: number) {
    // Keep the last range when focus briefly moves to the formatting toolbar.
    if (selection) {
      const key = selectionKey(blockId, itemIndex);
      textSelectionsRef.current[key] = selection;
      setTextSelections((current) => ({ ...current, [key]: selection }));
    }
  }

  function textEditor(blockId: string, itemIndex?: number) {
    return [...document.querySelectorAll<HTMLElement>("[data-studio-block-id]")].find((element) => element.dataset.studioBlockId === blockId && (itemIndex === undefined || element.dataset.listItemIndex === String(itemIndex)));
  }

  function currentTextSelection(blockId: string, itemIndex?: number) {
    const key = selectionKey(blockId, itemIndex);
    const editor = textEditor(blockId, itemIndex);
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return textSelectionsRef.current[key];
    const range = selection.getRangeAt(0);
    const start = editorOffset(editor, range.startContainer, range.startOffset);
    const end = editorOffset(editor, range.endContainer, range.endOffset);
    const nextSelection = start <= end ? { start, end } : { start: end, end: start };
    textSelectionsRef.current[key] = nextSelection;
    setTextSelections((current) => ({ ...current, [key]: nextSelection }));
    return nextSelection;
  }

  function textMarkState(block: EditableRichTextBlock, mark: Extract<TextMark, string>): boolean | "mixed" {
    const itemIndex = activeItemIndex(block);
    const key = selectionKey(block.id, itemIndex);
    const selection = textSelections[key] ?? textSelectionsRef.current[key];
    if (!selection || selection.start === selection.end) return false;
    const content = richTextContent(block, itemIndex);
    const runs = content.runs?.length ? content.runs : textToRuns(content.text);
    const selectedStates: boolean[] = [];
    let offset = 0;
    for (const run of runs) {
      const runStart = offset;
      const runEnd = runStart + run.text.length;
      offset = runEnd;
      if (runStart >= selection.end || runEnd <= selection.start) continue;
      selectedStates.push((run.marks ?? []).includes(mark));
    }
    if (selectedStates.length === 0 || selectedStates.every((active) => !active)) return false;
    if (selectedStates.every(Boolean)) return true;
    return "mixed";
  }

  function formatMarkButton(block: EditableRichTextBlock, mark: Extract<TextMark, string>, label: string = mark, icon: IconName, buttonRef?: RefObject<HTMLButtonElement | null>) {
    const state = textMarkState(block, mark);
    return <button ref={buttonRef} className={state === true ? "is-active" : state === "mixed" ? "is-mixed" : ""} type="button" role="menuitemcheckbox" onMouseDown={preserveTextSelection} onClick={() => { restoreRichTextMenuFocusBlockIdRef.current = block.id; formatSelectedText(block, mark); setRichTextMenuBlockId(null); }} aria-checked={state} aria-label={`${label} selected text`} title={label}><StudioHoverIcon name={icon} size={20} /><span>{label}</span></button>;
  }

  function openRichTextAction(block: EditableRichTextBlock, kind: NonNullable<typeof richTextActionDialog>["kind"]) {
    const itemIndex = activeItemIndex(block);
    const selection = currentTextSelection(block.id, itemIndex);
    if (!selection || selection.start === selection.end) return;
    setRichTextActionDialog({ blockId: block.id, itemIndex, selection, kind, text: "", foreground: "#1e1e1e", background: "#ffeb3b", language: "en", direction: "ltr", format: "latex", alternativeText: "" });
  }

  function applyRichTextAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = richTextActionDialog;
    if (!action) return;
    const block = activeDocument.blocks.find(candidate => candidate.id === action.blockId);
    if (!block || (!isEditableTextBlock(block) && block.type !== "list")) return;
    if (action.kind === "footnote") {
      if (block.type !== "list" && action.text.trim()) onAddFootnote?.(block.id, action.selection, action.text.trim());
    } else if (action.kind === "highlight") {
      formatSelectedText(block, { type: "highlight", textColor: action.foreground, backgroundColor: action.background }, "set", action.selection, action.itemIndex);
    } else if (action.kind === "language") {
      const language = action.language.trim();
      if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(language)) return;
      formatSelectedText(block, { type: "language", language, direction: action.direction }, "set", action.selection, action.itemIndex);
    } else {
      if (action.format === "latex") {
        if (!action.text.trim() || !action.alternativeText.trim()) return;
        formatSelectedText(block, { type: "math", latex: action.text.trim(), alternativeText: action.alternativeText.trim() }, "set", action.selection, action.itemIndex);
      } else {
        if (!safeMathMLMarkup(action.text.trim()) || !action.alternativeText.trim()) return;
        formatSelectedText(block, { type: "math", mathml: action.text.trim(), alternativeText: action.alternativeText.trim() }, "set", action.selection, action.itemIndex);
      }
    }
    restoreRichTextMenuFocusBlockIdRef.current = block.id;
    setRichTextActionDialog(null);
    setRichTextMenuBlockId(null);
  }

  function closeRichTextActionDialog(blockId: string) {
    restoreRichTextMenuFocusBlockIdRef.current = blockId;
    setRichTextActionDialog(null);
    setRichTextMenuBlockId(null);
  }

  function setTextAlignment(block: EditableTextBlock, align: TextAlignment) {
    onUpdateBlock(block.id, () => ({ ...block, align }));
    setAlignmentMenuBlockId(null);
  }

  function applyBlockTransform(block: ContentBlock, transform: BlockTransform) {
    onUpdateBlock(block.id, () => transformContentBlock(block, transform));
    setTransformMenuBlockId(null);
  }

  function updateTable(block: Extract<ContentBlock, { type: "table" }>, action: TableAction) {
    const rows = (block.rows.length ? block.rows : [[""]]).map((row) => [...row]);
    const columnCount = Math.max(1, ...rows.map((row) => row.length));
    const columnWidths = normaliseTableColumnWidths(columnCount, block.columnWidths);
    const columnAlignments = Array.from({ length: columnCount }, (_, index) => block.columnAlignments?.[index] ?? "left" as TextAlignment);
    const rowHeights = normaliseTableRowHeights(rows.length, block.rowHeights);
    const activeCell = tableCellSelections[block.id] ?? { rowIndex: 0, columnIndex: 0 };
    const rowIndex = Math.min(activeCell.rowIndex, rows.length - 1);
    const columnIndex = Math.min(activeCell.columnIndex, columnCount - 1);
    let nextCell = { rowIndex, columnIndex };

    if (action === "insert-row-before") {
      rows.splice(rowIndex, 0, Array.from({ length: columnCount }, () => ""));
      rowHeights.splice(rowIndex, 0, DEFAULT_TABLE_ROW_HEIGHT);
    } else if (action === "insert-row-after") {
      rows.splice(rowIndex + 1, 0, Array.from({ length: columnCount }, () => ""));
      rowHeights.splice(rowIndex + 1, 0, DEFAULT_TABLE_ROW_HEIGHT);
      nextCell = { rowIndex: rowIndex + 1, columnIndex };
    } else if (action === "delete-row") {
      if (rows.length <= 1) return;
      rows.splice(rowIndex, 1);
      rowHeights.splice(rowIndex, 1);
      nextCell = { rowIndex: Math.min(rowIndex, rows.length - 1), columnIndex };
    } else if (action === "insert-column-before") {
      rows.forEach((row) => row.splice(columnIndex, 0, ""));
      const width = columnWidths[columnIndex] / 2;
      columnWidths.splice(columnIndex, 0, width);
      columnWidths[columnIndex + 1] = width;
      columnAlignments.splice(columnIndex, 0, "left");
    } else if (action === "insert-column-after") {
      rows.forEach((row) => row.splice(columnIndex + 1, 0, ""));
      const width = columnWidths[columnIndex] / 2;
      columnWidths[columnIndex] = width;
      columnWidths.splice(columnIndex + 1, 0, width);
      columnAlignments.splice(columnIndex + 1, 0, "left");
      nextCell = { rowIndex, columnIndex: columnIndex + 1 };
    } else {
      if (columnCount <= 1) return;
      rows.forEach((row) => row.splice(columnIndex, 1));
      const [removedWidth] = columnWidths.splice(columnIndex, 1);
      columnWidths[columnIndex === 0 ? 0 : columnIndex - 1] += removedWidth;
      columnAlignments.splice(columnIndex, 1);
      nextCell = { rowIndex, columnIndex: Math.min(columnIndex, columnCount - 2) };
    }

    onUpdateBlock(block.id, () => ({ ...block, rows, columnWidths, rowHeights, columnAlignments }));
    setTableCellSelections((current) => ({ ...current, [block.id]: nextCell }));
    setTableMenuBlockId(null);
  }

  function formatSelectedText(block: EditableRichTextBlock, mark: TextMark, mode: "toggle" | "set" | "remove" = "toggle", selection = textSelectionsRef.current[selectionKey(block.id, activeItemIndex(block))], itemIndex = activeItemIndex(block)) {
    if (!selection || selection.start === selection.end) return;
    const content = richTextContent(block, itemIndex);
    const runs = content.runs?.length ? content.runs : textToRuns(content.text);
    const nextRuns = updateTextMark(runs, selection.start, selection.end, mark, mode);
    onUpdateBlock(block.id, (current) => {
      if (!isEditableTextBlock(current) && current.type !== "list") return current;
      return withRichTextContent(current, plainTextFromRuns(nextRuns), nextRuns, itemIndex);
    });
  }

  function linkAnchor(blockId: string, itemIndex?: number) {
    const editor = textEditor(blockId, itemIndex);
    const blockElement = editor?.closest<HTMLElement>(".canvas-block");
    const selection = window.getSelection();
    if (!editor || !blockElement || !selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return null;
    const range = selection.getRangeAt(0);
    const rangeRect = range.getBoundingClientRect();
    const blockRect = blockElement.getBoundingClientRect();
    return { left: Math.max(0, rangeRect.left - blockRect.left), top: rangeRect.bottom - blockRect.top + 8 };
  }

  function openLinkEditor(block: EditableRichTextBlock, selectionOverride?: TextSelection, mode: LinkEditorState["mode"] = "edit", itemIndex = activeItemIndex(block)) {
    const selection = selectionOverride ?? currentTextSelection(block.id, itemIndex);
    const content = richTextContent(block, itemIndex);
    const runs = content.runs?.length ? content.runs : textToRuns(content.text);
    const hasSelection = Boolean(selection && selection.start !== selection.end);
    const existing = hasSelection && selection ? linkAtTextRange(runs, selection.start, selection.end) : null;
    if (mode === "preview" && !existing) return;
    setLinkError(hasSelection ? null : "Select the text you want to link, then choose or enter its destination.");
    setLinkEditor({ blockId: block.id, itemIndex, url: existing?.url ?? "", text: selection ? content.text.slice(selection.start, selection.end) : "", selection, existingUrl: existing?.url ?? null, opensInNewTab: Boolean(existing?.opensInNewTab), advancedOpen: Boolean(existing?.opensInNewTab), mode, anchor: linkAnchor(block.id, itemIndex) });
  }

  function applyLink(event: FormEvent<HTMLFormElement>, block: EditableRichTextBlock) {
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
    const replacement = editor.text;
    const content = richTextContent(block, editor.itemIndex);
    const source = content.runs?.length ? content.runs : textToRuns(content.text);
    const replacedRuns = replaceTextRange(source, editor.selection.start, editor.selection.end, replacement);
    const end = editor.selection.start + replacement.length;
    const nextRuns = updateTextMark(replacedRuns, editor.selection.start, end, { type: "link", url, opensInNewTab: editor.opensInNewTab || undefined }, "set");
    onUpdateBlock(block.id, (current) => {
      if (!isEditableTextBlock(current) && current.type !== "list") return current;
      return withRichTextContent(current, plainTextFromRuns(nextRuns), nextRuns, editor.itemIndex);
    });
    setLinkEditor(null);
    setLinkError(null);
  }

  function removeLink(block: EditableRichTextBlock) {
    if (!linkEditor) return;
    formatSelectedText(block, { type: "link", url: "" }, "remove", linkEditor.selection, linkEditor.itemIndex);
    setLinkEditor(null);
    setLinkError(null);
  }

  const linkSuggestions = linkEditor
    ? linkTargets.filter((target) => `${target.title} ${target.href} ${target.kind}`.toLowerCase().includes(linkEditor.url.trim().toLowerCase())).slice(0, 5)
    : [];
  const safeCoverImageUrl = activeDocument.coverImage?.mediaId
    ? safeImageSource(coverImageUrl ?? "", { allowBlob: true })
    : safeImageSource(coverImageUrl ?? "");
  function selectDocumentField(field: "title" | "subtitle") {
    onFocusDocumentField(field);
  }
  const hasDynamicTitle = activeDocument.blocks.some((block) => block.type === "document-title");
  const hasDynamicSubtitle = activeDocument.blocks.some((block) => block.type === "document-subtitle");
  const hasDynamicCover = activeDocument.blocks.some((block) => block.type === "cover-image");

  return (
    <section className={`block-editor${className ? ` ${className}` : ""}`} aria-label={`${activeDocument.kind} editor`} data-readonly={!writable || undefined} onBeforeInputCapture={(event) => { if (!writable && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }} onPasteCapture={(event) => { if (!writable && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }} onCutCapture={(event) => { if (!writable && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }}>
      <div className="editor-document-bar">
        <div className="editor-history-actions" role="group" aria-label="Editor tools">
          <button className="editor-add-block" type="button" disabled={!writable || previewing || Boolean(codeEditor)} onClick={() => showInserter && !inserterClosing ? dismissInserter() : openInserter(null)} aria-label="Add block" title="Add block" aria-pressed={showInserter && !inserterClosing && !previewing && !codeEditor}><StudioIcon name="add" size={20} /></button>
          <button type="button" disabled={!writable || !canUndo} onClick={onUndo} aria-label="Undo" title="Undo"><StudioIcon name="undo" size={20} /></button>
          <button type="button" disabled={!writable || !canRedo} onClick={onRedo} aria-label="Redo" title="Redo"><StudioIcon name="redo" size={20} /></button>
          <button ref={listViewToggleRef} type="button" className={`editor-list-toggle${listViewOpen ? " is-active" : ""}`} disabled={previewing || Boolean(codeEditor)} aria-pressed={listViewOpen && !showInserter} aria-label="List View" title="List View" onClick={() => { setHoveredBlockId(null); onSetShowInserter(false); setListViewOpen((current) => !current); }}><StudioIcon name="list" size={20} /></button>
        </div>
        <div className="editor-mode-control" role="group" aria-label={`${targetLabel ?? (activeDocument.kind === "post" ? "Post" : "Page")} view`}>
          <button type="button" aria-pressed={!previewing} onClick={() => onPreviewChange(false)}>Edit</button>
          <button type="button" aria-pressed={previewing} onClick={() => { if (codeEditor && !closeCodeEditor(true)) return; setHoveredBlockId(null); setListViewOpen(false); onSetShowInserter(false); onPreviewChange(true); }}>Preview</button>
        </div>
      <div className="editor-document-actions" aria-hidden={previewing}>
          {allowHtmlEditing ? <button ref={codeEditorToggleRef} type="button" className={`editor-code-toggle${codeEditor ? " is-active" : ""}`} disabled={previewing} aria-pressed={Boolean(codeEditor)} aria-label="Code editor" title="Code editor" onClick={() => codeEditor ? closeCodeEditor(true) : openCodeEditor()}><StudioIcon name="code" size={18} />Code</button> : null}
          <span className="editor-document-counts" title={`${displayedWordCount} words · ${displayedCharacterCount} characters · ${displayedBlockCount} blocks`}><strong>{displayedWordCount} words · {displayedCharacterCount} characters · {displayedBlockCount} blocks</strong></span>
        </div>
      </div>
      {publishFeedback ? <div className="publish-feedback" role="status"><span>{publishFeedback}</span><button type="button" onClick={() => onSetPublishFeedback(null)} aria-label="Dismiss publication message"><StudioIcon name="close" size={18} /></button></div> : null}
      {toolbarContent}
      <div className="editor-work-area">
      {showInserter && !previewing && !codeEditor ? <BlockInserter closing={inserterClosing} onCloseAnimationEnd={finishInserterClose} inserterQuery={inserterQuery} filteredBlocks={inserterParentId && findBlockById(activeDocument.blocks, inserterParentId)?.type === "social-icons" ? socialIconCatalogue.filter(item => `${item.label} ${item.description}`.toLowerCase().includes(inserterQuery.toLowerCase())) : filteredBlocks} onSetQuery={onSetInserterQuery} onInsert={(type) => onInsertBlock(type, inserterParentId ?? undefined)} onDragEnd={() => onSetDragOverIndex(null)} onDismiss={dismissInserter} /> : null}
      {!previewing && !showInserter && listViewOpen ? <button className="studio-list-backdrop" type="button" aria-label="Close List View" onClick={closeListView} /> : null}
      {!previewing && !showInserter && listViewOpen ? <StudioListView key={activeDocument.id} blocks={activeDocument.blocks} selectedBlockId={selectedBlockId} onSelectBlock={selectBlockFromList} onHoverBlock={setHoveredBlockId} onClose={closeListView} onRemoveBlock={onRemoveBlock} onMoveItem={(parentId, index, direction) => {
        if (!parentId) { onMoveBlock(index, direction); return; }
        onUpdateBlock(parentId, (parent) => {
          if (parent.type !== "section" && parent.type !== "group" && parent.type !== "columns" && parent.type !== "column" && parent.type !== "component" && parent.type !== "social-icons") return parent;
          const children = [...(parent.children ?? [])]; const target = index + direction;
          if (target < 0 || target >= children.length) return parent;
          const [moved] = children.splice(index, 1); children.splice(target, 0, moved);
          if (parent.type === "columns") return { ...parent, children: children as typeof parent.children };
          if (parent.type === "social-icons") return { ...parent, children: children as typeof parent.children };
          return { ...parent, children };
        });
      }} /> : null}

      <div className="editor-canvas-scroll" onPointerDownCapture={(event) => {
        const activeSelection = crossBlockSelectionRef.current;
        if (activeSelection && activeSelection.pointerId !== event.pointerId) return;
        const target = event.target instanceof Element ? event.target : event.target instanceof Node ? event.target.parentElement : null;
        const block = target?.closest<HTMLElement>(".canvas-block");
        // Template nodes own selection inside a rendered parent block. Do not
        // start cross-block text selection from their pointer event: its
        // pointer-up handler would otherwise select the outer canvas block.
        if (event.button !== 0 || !block || target?.closest(".template-node-selectable, .canvas-block-toolbar, button, input, textarea, select, [role=\"button\"]")) {
          crossBlockSelectionRef.current = null;
          return;
        }
        const start = caretRangeAtPoint(event.clientX, event.clientY);
        const nestedBlock = target?.closest<HTMLElement>("[data-studio-nested-block-id]");
        const blockIdentity = nestedBlock ?? block;
        const blockId = nestedBlock?.dataset.studioNestedBlockId ?? block.dataset.studioBlockAnchorId;
        crossBlockSelectionRef.current = start && blockId ? { pointerId: event.pointerId, blockIdentity, blockId, start, last: start.cloneRange(), active: false } : null;
      }} onPointerMove={(event) => {
        const selectionDrag = crossBlockSelectionRef.current;
        if (!selectionDrag || selectionDrag.pointerId !== event.pointerId || (event.buttons & 1) !== 1) return;
        const target = document.elementFromPoint(event.clientX, event.clientY);
        const block = target instanceof Element ? target.closest<HTMLElement>(".canvas-block") : null;
        if (!block || target?.closest(".canvas-block-toolbar, button, input, textarea, select, [role=\"button\"]")) return;
        const end = caretRangeAtPoint(event.clientX, event.clientY);
        if (!end) return;
        selectionDrag.last = end;
        const nestedBlock = target instanceof Element ? target.closest("[data-studio-nested-block-id]") : null;
        const blockIdentity = nestedBlock ?? block;
        if (blockIdentity !== selectionDrag.blockIdentity) selectionDrag.active = true;
        if (selectionDrag.active && !event.currentTarget.hasPointerCapture(event.pointerId)) {
          try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* The pointer may already have been released. */ }
        }
        if (selectionDrag.active) applyCrossBlockSelection(selectionDrag.start, end);
      }} onPointerUp={(event) => {
        const selectionDrag = crossBlockSelectionRef.current;
        if (!selectionDrag || selectionDrag.pointerId !== event.pointerId) return;
        const endpoint = caretRangeAtPoint(event.clientX, event.clientY) ?? selectionDrag.last;
        selectionDrag.last = endpoint;
        if (selectionDrag.active) {
          onSelectBlock(selectionDrag.blockId);
          window.requestAnimationFrame(() => applyCrossBlockSelection(selectionDrag.start, selectionDrag.last));
        } else onSelectBlock(selectionDrag.blockId);
        crossBlockSelectionRef.current = null;
      }} onLostPointerCapture={(event) => {
        const selectionDrag = crossBlockSelectionRef.current;
        if (selectionDrag?.pointerId === event.pointerId) crossBlockSelectionRef.current = null;
      }} onPointerCancel={(event) => {
        if (crossBlockSelectionRef.current?.pointerId === event.pointerId) crossBlockSelectionRef.current = null;
      }} onPointerLeave={(event) => {
        const selectionDrag = crossBlockSelectionRef.current;
        if (selectionDrag?.pointerId === event.pointerId && !selectionDrag.active) crossBlockSelectionRef.current = null;
      }} onPointerDown={(event) => {
        if (event.target instanceof Element && !event.target.closest(".canvas-block, button, input, textarea, select, [contenteditable=\"true\"]")) onClearBlockSelection();
      }}>
        {codeEditor ? <StudioCodeEditor document={activeDocument} writable={writable} state={codeEditor} inputRef={codeEditorInputRef} onChange={(draft) => { setCodeEditor((current) => { if (!current) return current; onCodeEditorDirtyChange?.(draft !== current.initialDraft); return { ...current, draft, error: null }; }); }} onFormat={(draft) => { setCodeEditor((current) => { if (!current) return current; onCodeEditorDirtyChange?.(draft !== current.initialDraft); return { ...current, draft, error: null }; }); }} onDocumentFieldChange={onDocumentFieldChange} onApply={applyCodeEditor} onExit={() => closeCodeEditor(true)} /> : previewing ? (
          <article className={`document-preview is-${activeDocument.kind}`} style={viewportStyle}>
            {compose(<>
            {presentation?.renderHeader?.({ document: activeDocument, mode: "preview", selectedBlockId, selectedDocumentField, onSelectBlock, onUpdateBlock, onDocumentFieldChange, onFocusDocumentField }) ?? <DocumentHeading document={activeDocument} selectedDocumentField={selectedDocumentField} previewing onChange={onDocumentFieldChange} onFocus={selectDocumentField} showTitle={!hasDynamicTitle} showSubtitle={!hasDynamicSubtitle} />}
            {allowCoverImage && showCoverImage && !hasDynamicCover ? <div className={`preview-cover-image${safeCoverImageUrl ? " is-source" : ""}`} role="img" aria-label={activeDocument.coverImage?.alt || "Mock cover image"}>
              {safeCoverImageUrl ? (
                // Local browser-managed media cannot be known to Next's image optimiser.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={safeCoverImageUrl} alt={activeDocument.coverImage?.alt || ""} />
              ) : null}
            </div> : null}
            {presentation?.renderBlock ? activeDocument.blocks.map((block) => presentation.renderBlock?.({ document: activeDocument, block, mode: "preview", selectedBlockId, onSelectBlock, onUpdateBlock, onDocumentFieldChange, onFocusDocumentField }) ?? <BlockRenderer key={block.id} blocks={[block]} mediaUrls={mediaBlockUrls} variant="studio" hideDividers={presentation.hideDividers ?? true} document={activeDocument} />) : <BlockRenderer blocks={activeDocument.blocks} mediaUrls={mediaBlockUrls} variant="studio" hideDividers={presentation?.hideDividers ?? true} document={activeDocument} />}
            {presentation?.renderFooter?.({ document: activeDocument, mode: "preview", selectedBlockId, onSelectBlock, onUpdateBlock, onDocumentFieldChange, onFocusDocumentField })}
            </>, "preview")}
          </article>
        ) : (
          <div className="block-canvas" style={viewportStyle}>
            {compose(<>
            {presentation?.renderHeader?.({ document: activeDocument, mode: "edit", selectedBlockId, selectedDocumentField, hoveredBlockId, onTableCellFocus: (blockId, rowIndex, columnIndex) => setTableCellSelections(current => ({ ...current, [blockId]: { rowIndex, columnIndex } })), onSelectBlock, onUpdateBlock, onDocumentFieldChange, onFocusDocumentField }) ?? <DocumentHeading document={activeDocument} selectedDocumentField={selectedDocumentField} previewing={false} onChange={onDocumentFieldChange} onFocus={selectDocumentField} showTitle={!hasDynamicTitle} showSubtitle={!hasDynamicSubtitle} />}
            {allowCoverImage && showCoverImage && !hasDynamicCover ? <div className="canvas-cover-wrap">
              <div className={`canvas-cover-image${safeCoverImageUrl ? " is-source" : ""}`} role="img" aria-label={activeDocument.coverImage?.alt || "Mock cover image"}>
                {safeCoverImageUrl ? (
                  // Local browser-managed media cannot be known to Next's image optimiser.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={safeCoverImageUrl} alt={activeDocument.coverImage?.alt || ""} />
                ) : null}
              </div>
              <div className="canvas-cover-actions">
                <button className="cover-action-button" type="button" onClick={onOpenCoverMediaLibrary} aria-label="Change cover image" title="Change cover image">
                  <StudioIcon name="image" />
                </button>
                <button className="cover-action-button is-destructive" type="button" onClick={onRemoveCoverImage} aria-label="Remove cover image" title="Remove cover image">
                  <StudioIcon name="trash" />
                </button>
              </div>
            </div> : allowCoverImage ? <button className="canvas-add-cover" type="button" onClick={onOpenCoverMediaLibrary}><StudioIcon name="add" size={18} />Add cover image</button> : null}

            <div className="canvas-blocks" onDragOver={event => {
              if (!event.dataTransfer.types.includes("application/x-acm-studio-block")) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              onSetDragOverIndex(activeDocument.blocks.length);
            }} onDrop={event => {
              const libraryType = event.dataTransfer.getData("application/x-acm-studio-block");
              if (!filteredBlocks.some(item => item.type === libraryType && item.type !== "template-content")) return;
              event.preventDefault();
              onInsertBlockAt(libraryType as InsertableBlockType, activeDocument.blocks.length);
              onSetDragOverIndex(null);
            }}>
              {allowCoverImage && showCoverImage && !hasDynamicCover ? <div className="cover-inserter-position"><button className="between-blocks cover-inserter" type="button" onClick={() => toggleInserter(-1)} aria-label="Add block below cover image" title="Add block below cover image"><span aria-hidden="true"><StudioIcon name="add" /></span></button></div> : null}
              {activeDocument.blocks.map((block, index) => (
                <div className="block-position" key={block.id}
                  onDragOver={(event) => handleBlockDragOver(event, index)}
                  onDrop={(event) => handleBlockDrop(event, index)}
                >
                  {dragOverIndex === index || (index === activeDocument.blocks.length - 1 && dragOverIndex === index + 1) ? <div className={`drop-indicator${dragOverIndex === index + 1 ? " is-after" : ""}`} aria-hidden="true" /> : null}
                  {index > 0 ? <button className="between-blocks" type="button" onClick={() => toggleInserter(index - 1)} aria-label={`Add block before ${blockLabel(block.type)}`}><span aria-hidden="true"><StudioIcon name="add" /></span></button> : null}
                  <article
                    className={`canvas-block is-${block.type}${contentBlockAlignment(block) ? ` has-block-align-${contentBlockAlignment(block)}` : ""}${selectedBlockId === block.id ? " is-selected" : ""}`}
                    data-studio-block-anchor-id={block.id}
                    data-studio-hovered={hoveredBlockId === block.id}
                    onPointerDown={(event) => {
                      if (crossBlockSelectionRef.current) return;
                      const nestedBlockId = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-studio-nested-block-id]")?.dataset.studioNestedBlockId : undefined;
                      onSelectBlock(nestedBlockId ?? block.id);
                      if (!(event.target instanceof Element) || !event.target.closest(".alignment-control")) setAlignmentMenuBlockId(null);
                      if (!(event.target instanceof Element) || !event.target.closest(".block-alignment-control")) setBlockAlignmentMenuBlockId(null);
                      if (!(event.target instanceof Element) || !event.target.closest(".rich-text-format-control")) setRichTextMenuBlockId(null);
                      if (!(event.target instanceof Element) || !event.target.closest(".transform-control")) setTransformMenuBlockId(null);
                      if (event.target instanceof Element && !event.target.closest(".link-editor-popover, .link-preview-popover, .block-options-menu, .html-editor-popover, .rich-text-editor a")) {
                        setLinkEditor(null);
                        setLinkError(null);
                      }
                      if (!(event.target instanceof Element) || !event.target.closest(".block-options-menu")) setBlockMenuBlockId(null);
                    }}
                    onFocusCapture={(event) => {
                      if (crossBlockSelectionRef.current) return;
                      if (event.target instanceof Element && event.target.closest(".mini-golf-nested-controls, .mini-golf-nested-block")) return;
                      const nestedBlockId = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-studio-nested-block-id]")?.dataset.studioNestedBlockId : undefined;
                      onSelectBlock(nestedBlockId ?? block.id);
                    }}
                  >
                    <div className="canvas-block-toolbar">
                      <BlockTransformControl block={block} open={transformMenuBlockId === block.id} onOpenChange={(open) => setTransformMenuBlockId(open ? block.id : null)} onTransform={(transform) => applyBlockTransform(block, transform)} />
                      <button className="drag-handle" type="button" draggable onClick={() => onSelectBlock(block.id)} onDragStart={(event) => { event.stopPropagation(); draggingIndexRef.current = index; onSetDragOverIndex(null); }} onDragEnd={() => { draggingIndexRef.current = null; onSetDragOverIndex(null); }} aria-label={`Drag to reorder ${blockLabel(block.type)} block`} title="Drag to reorder block"><StudioHoverIcon name="arrange.reorder" /></button>
                      <div className="block-move-controls" role="group" aria-label="Move block">
                        <button className="move-block-up" type="button" onClick={(event) => { event.stopPropagation(); onMoveBlock(index, -1); }} disabled={index === 0} aria-label="Move block up" title="Move up"><StudioHoverIcon name="arrange.move-up" /></button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); onMoveBlock(index, 1); }} disabled={index === activeDocument.blocks.length - 1} aria-label="Move block down" title="Move down"><StudioHoverIcon name="arrange.move-down" /></button>
                      </div>
                      {isBlockAlignedBlock(block) ? <div className="block-alignment-control">
                        <button ref={element => { blockAlignmentTriggerRefs.current[block.id] = element; }} className={`block-alignment-button${blockAlignmentMenuBlockId === block.id ? " is-active" : ""}`} type="button" onMouseDown={preserveTextSelection} onClick={() => setBlockAlignmentMenuBlockId(current => current === block.id ? null : block.id)} aria-haspopup="menu" aria-expanded={blockAlignmentMenuBlockId === block.id} aria-label="Align block" title="Align">
                          <StudioHoverIcon name={blockAlignmentIcon(contentBlockAlignment(block))} />
                          <StudioHoverIcon name="navigation.disclosure" size={16} />
                        </button>
                        {blockAlignmentMenuBlockId === block.id ? <div className="block-alignment-menu" role="menu" tabIndex={-1} aria-label="Align block" onKeyDown={event => {
                          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setBlockAlignmentMenuBlockId(null); requestAnimationFrame(() => blockAlignmentTriggerRefs.current[block.id]?.focus()); return; }
                          const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
                          const activeIndex = items.indexOf(event.target as HTMLButtonElement);
                          let nextIndex: number | null = null;
                          if (event.key === "ArrowDown") nextIndex = (activeIndex + 1) % items.length;
                          else if (event.key === "ArrowUp") nextIndex = (activeIndex - 1 + items.length) % items.length;
                          else if (event.key === "Home") nextIndex = 0;
                          else if (event.key === "End") nextIndex = items.length - 1;
                          if (nextIndex !== null && items.length) { event.preventDefault(); items[nextIndex]?.focus(); }
                        }}>
                          {([undefined, ...blockAlignmentOptions(block.type)] as const).map((alignment, optionIndex) => {
                            const active = contentBlockAlignment(block) === alignment;
                            const label = blockAlignmentLabel(alignment);
                            const icon = blockAlignmentIcon(alignment);
                            return <button ref={optionIndex === 0 ? blockAlignmentMenuItemRef : undefined} className={active ? "is-active" : ""} type="button" role="menuitemradio" aria-checked={active} key={alignment ?? "none"} onMouseDown={preserveTextSelection} onClick={() => {
                              onUpdateBlock(block.id, current => isBlockAlignedBlock(current) ? { ...current, blockAlign: alignment, ...(current.type === "image" ? { wide: false } : {}) } : current);
                              setBlockAlignmentMenuBlockId(null);
                              requestAnimationFrame(() => blockAlignmentTriggerRefs.current[block.id]?.focus());
                            }}><StudioHoverIcon name={icon} /><span>{label}</span></button>;
                          })}
                        </div> : null}
                      </div> : null}
                      {block.type === "heading" ? <div className="heading-level-control"><button className="heading-level-button" type="button" onMouseDown={preserveTextSelection} onClick={() => setHeadingMenuBlockId((current) => current === block.id ? null : block.id)} aria-haspopup="menu" aria-expanded={headingMenuBlockId === block.id} aria-label={`Heading level ${block.level}`}><strong>H{block.level}</strong><StudioIcon name="chevron-down" size={18} /></button>{headingMenuBlockId === block.id ? <div className="heading-level-menu" role="menu" aria-label="Heading level">{[1, 2, 3, 4, 5, 6].map((level) => <button className={level === block.level ? "is-active" : ""} type="button" role="menuitem" key={level} onMouseDown={preserveTextSelection} onClick={() => { onUpdateBlock(block.id, () => ({ ...block, level: level as HeadingLevel })); setHeadingMenuBlockId(null); }}><strong>H{level}</strong><span>Heading {level}</span></button>)}</div> : null}</div> : block.type === "table" ? <><div className="alignment-control"><button ref={element => { tableAlignmentTriggerRefs.current[block.id] = element; }} className={`alignment-button${tableAlignmentMenuBlockId === block.id ? " is-active" : ""}`} type="button" onMouseDown={preserveTextSelection} onClick={() => setTableAlignmentMenuBlockId(current => current === block.id ? null : block.id)} aria-haspopup="menu" aria-expanded={tableAlignmentMenuBlockId === block.id} aria-label="Align column content" title="Align column content"><AlignmentIcon align={block.columnAlignments?.[tableCellSelections[block.id]?.columnIndex ?? 0] ?? "left"} /><StudioHoverIcon name="navigation.disclosure" size={16} /></button>{tableAlignmentMenuBlockId === block.id ? <div className="alignment-menu" role="menu" tabIndex={-1} aria-label="Align column content" onKeyDown={event => {
                        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setTableAlignmentMenuBlockId(null); requestAnimationFrame(() => tableAlignmentTriggerRefs.current[block.id]?.focus()); return; }
                        const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
                        const activeIndex = items.indexOf(event.target as HTMLButtonElement);
                        let nextIndex: number | null = null;
                        if (event.key === "ArrowDown") nextIndex = (activeIndex + 1) % items.length;
                        else if (event.key === "ArrowUp") nextIndex = (activeIndex - 1 + items.length) % items.length;
                        else if (event.key === "Home") nextIndex = 0;
                        else if (event.key === "End") nextIndex = items.length - 1;
                        if (nextIndex !== null && items.length) { event.preventDefault(); items[nextIndex]?.focus(); }
                      }}>{(["left", "centre", "right"] as TextAlignment[]).map((alignment, optionIndex) => { const columnIndex = Math.min(tableCellSelections[block.id]?.columnIndex ?? 0, Math.max(0, block.rows[0]?.length - 1)); const active = (block.columnAlignments?.[columnIndex] ?? "left") === alignment; return <button ref={optionIndex === 0 ? tableAlignmentMenuItemRef : undefined} className={active ? "is-active" : ""} type="button" role="menuitemradio" aria-checked={active} key={alignment} onMouseDown={preserveTextSelection} onClick={() => { const count = Math.max(1, block.rows[0]?.length ?? 1); const columnAlignments = Array.from({ length: count }, (_, index) => block.columnAlignments?.[index] ?? "left" as TextAlignment); columnAlignments[columnIndex] = alignment; onUpdateBlock(block.id, () => ({ ...block, columnAlignments })); setTableAlignmentMenuBlockId(null); requestAnimationFrame(() => tableAlignmentTriggerRefs.current[block.id]?.focus()); }}><AlignmentIcon align={alignment} /><span>Align column {alignment}</span></button>; })}</div> : null}</div><div className="table-control"><button className={`table-control-button${tableMenuBlockId === block.id ? " is-active" : ""}`} type="button" onMouseDown={preserveTextSelection} onClick={() => setTableMenuBlockId((current) => current === block.id ? null : block.id)} aria-haspopup="menu" aria-expanded={tableMenuBlockId === block.id} aria-label="Table options" title="Table options"><TableIcon /></button>{tableMenuBlockId === block.id ? <div className="table-menu" role="menu" aria-label="Table options">
                        <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => updateTable(block, "insert-row-before")}><TableActionIcon action="insert-row-before" /><span>Insert row before</span></button>
                        <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => updateTable(block, "insert-row-after")}><TableActionIcon action="insert-row-after" /><span>Insert row after</span></button>
                        <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => updateTable(block, "delete-row")}><TableActionIcon action="delete-row" /><span>Delete row</span></button>
                        <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => updateTable(block, "insert-column-before")}><TableActionIcon action="insert-column-before" /><span>Insert column before</span></button>
                        <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => updateTable(block, "insert-column-after")}><TableActionIcon action="insert-column-after" /><span>Insert column after</span></button>
                        <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => updateTable(block, "delete-column")}><TableActionIcon action="delete-column" /><span>Delete column</span></button>
                      </div> : null}</div></> : null}
                      {isEditableTextBlock(block) || block.type === "list" ? <div className="canvas-format-actions" aria-label="Text formatting">
                        {isEditableTextBlock(block) ? <div className="alignment-control"><button className={`alignment-button${alignmentMenuBlockId === block.id ? " is-active" : ""}`} type="button" onMouseDown={preserveTextSelection} onClick={() => setAlignmentMenuBlockId((current) => current === block.id ? null : block.id)} aria-haspopup="menu" aria-expanded={alignmentMenuBlockId === block.id} aria-label="Text alignment" title="Text alignment"><AlignmentIcon align={block.align ?? "left"} /><StudioHoverIcon name="navigation.disclosure" size={16} /></button>{alignmentMenuBlockId === block.id ? <div className="alignment-menu" role="menu" aria-label="Text alignment">{(["left", "centre", "right"] as TextAlignment[]).map((align) => <button className={block.align === align || (!block.align && align === "left") ? "is-active" : ""} type="button" role="menuitemradio" aria-checked={block.align === align || (!block.align && align === "left")} key={align} onMouseDown={preserveTextSelection} onClick={() => setTextAlignment(block, align)}><AlignmentIcon align={align} /><span>Align text {align}</span></button>)}</div> : null}</div> : null}
                        <button className={textMarkState(block, "bold") === true ? "is-active" : ""} type="button" onMouseDown={preserveTextSelection} onClick={() => formatSelectedText(block, "bold")} aria-pressed={textMarkState(block, "bold")} aria-label="Bold selected text" title="Bold"><StudioHoverIcon name="text.bold" /></button>
                        <button className={textMarkState(block, "italic") === true ? "is-active" : ""} type="button" onMouseDown={preserveTextSelection} onClick={() => formatSelectedText(block, "italic")} aria-pressed={textMarkState(block, "italic")} aria-label="Italicise selected text" title="Italic"><StudioHoverIcon name="text.italic" /></button>
                        <button type="button" onMouseDown={(event) => { preserveTextSelection(event); openLinkEditor(block); }} aria-label="Add hyperlink to selected text" title="Add hyperlink"><StudioHoverIcon name="action.link" /></button>
                        <div className="rich-text-format-control"><button ref={element => { richTextMenuTriggerRefs.current[block.id] = element; }} type="button" onMouseDown={preserveTextSelection} onClick={() => setRichTextMenuBlockId(current => current === block.id ? null : block.id)} aria-haspopup="menu" aria-expanded={richTextMenuBlockId === block.id} aria-label="More text formatting" title="More text formatting"><StudioHoverIcon name="navigation.disclosure" /></button>{richTextMenuBlockId === block.id ? <div className="rich-text-format-menu" role="menu" tabIndex={-1} aria-label="More text formatting" onKeyDown={event => {
                          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); restoreRichTextMenuFocusBlockIdRef.current = block.id; setRichTextMenuBlockId(null); return; }
                          if (event.key === "Tab") {
                            event.preventDefault();
                            setRichTextMenuBlockId(null);
                            if (event.shiftKey) richTextMenuTriggerRefs.current[block.id]?.focus();
                            else event.currentTarget.closest(".canvas-block")?.querySelector<HTMLButtonElement>(".canvas-block-actions button:not(:disabled)")?.focus();
                            return;
                          }
                          const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]'));
                          const activeIndex = items.indexOf(event.target as HTMLButtonElement);
                          let nextIndex: number | null = null;
                          if (event.key === "ArrowDown") nextIndex = (activeIndex + 1) % items.length;
                          else if (event.key === "ArrowUp") nextIndex = (activeIndex - 1 + items.length) % items.length;
                          else if (event.key === "Home") nextIndex = 0;
                          else if (event.key === "End") nextIndex = items.length - 1;
                          if (nextIndex !== null && items.length) { event.preventDefault(); items[nextIndex]?.focus(); }
                        }}>
                          {block.type !== "list" ? <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => openRichTextAction(block, "footnote")}><StudioHoverIcon name="text.footnote" size={20} /><span>Footnote</span></button> : null}
                          <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => openRichTextAction(block, "highlight")}><StudioHoverIcon name="insert.highlight" size={20} /><span>Highlight</span></button>
                          {formatMarkButton(block, "inline-code", "Inline code", "text.code")}
                          {block.type !== "list" ? <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => { const selection = currentTextSelection(block.id); if (selection) { restoreRichTextMenuFocusBlockIdRef.current = block.id; setRichTextMenuBlockId(null); onOpenInlineImage?.(block.id, selection); } }}><StudioHoverIcon name="insert.image" size={20} /><span>Inline image</span></button> : null}
                          {formatMarkButton(block, "keyboard", "Keyboard input", "text.keyboard")}
                          <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => openRichTextAction(block, "language")}><StudioHoverIcon name="text.language" size={20} /><span>Language</span></button>
                          <button type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => openRichTextAction(block, "math")}><StudioHoverIcon name="text.math" size={20} /><span>Math</span></button>
                          {formatMarkButton(block, "strikethrough", "Strikethrough", "text.strikethrough", richTextMenuItemRef)}
                          {formatMarkButton(block, "subscript", "Subscript", "text.subscript")}
                          {formatMarkButton(block, "superscript", "Superscript", "text.superscript")}
                        </div> : null}
                        {richTextActionDialog?.blockId === block.id ? <form className="rich-text-action-dialog" role="dialog" aria-label={`${richTextActionDialog.kind} selected text`} onSubmit={applyRichTextAction} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); closeRichTextActionDialog(block.id); } }}>
                          <strong>{richTextActionDialog.kind === "highlight" ? "Highlight" : richTextActionDialog.kind === "language" ? "Language" : richTextActionDialog.kind === "math" ? "Inline math" : "Footnote"}</strong>
                          <button className="rich-text-action-close" type="button" aria-label="Close" onClick={() => closeRichTextActionDialog(block.id)}><StudioIcon name="close" size={16} /></button>
                          {richTextActionDialog.kind === "highlight" ? <div className="rich-text-highlight-colours"><label><span>Text colour</span><input aria-label="Highlight text colour" type="color" value={richTextActionDialog.foreground} onChange={event => setRichTextActionDialog({ ...richTextActionDialog, foreground: event.target.value })} /></label><label><span>Background colour</span><input aria-label="Highlight background colour" type="color" value={richTextActionDialog.background} onChange={event => setRichTextActionDialog({ ...richTextActionDialog, background: event.target.value })} /></label></div> : null}
                          {richTextActionDialog.kind === "language" ? <><label><span>Language code</span><input autoFocus required pattern="[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*" value={richTextActionDialog.language} onChange={event => setRichTextActionDialog({ ...richTextActionDialog, language: event.target.value })} placeholder="en, es, fr" /></label><label><span>Text direction</span><select value={richTextActionDialog.direction} onChange={event => setRichTextActionDialog({ ...richTextActionDialog, direction: event.target.value as "ltr" | "rtl" })}><option value="ltr">Left to right</option><option value="rtl">Right to left</option></select></label></> : null}
                          {richTextActionDialog.kind === "math" ? <><label><span>Input format</span><select value={richTextActionDialog.format} onChange={event => setRichTextActionDialog({ ...richTextActionDialog, format: event.target.value as "latex" | "mathml" })}><option value="latex">LaTeX</option><option value="mathml">MathML</option></select></label><label><span>{richTextActionDialog.format === "latex" ? "LaTeX expression" : "MathML expression"}</span><textarea autoFocus required rows={3} value={richTextActionDialog.text} onChange={event => setRichTextActionDialog({ ...richTextActionDialog, text: event.target.value })} placeholder={richTextActionDialog.format === "latex" ? "\\frac{a}{b}" : "<math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>"} /></label><label><span>Accessible description</span><input required value={richTextActionDialog.alternativeText} onChange={event => setRichTextActionDialog({ ...richTextActionDialog, alternativeText: event.target.value })} placeholder="a divided by b" /></label></> : null}
                          {richTextActionDialog.kind === "footnote" ? <label><span>Footnote text</span><textarea autoFocus required rows={3} value={richTextActionDialog.text} onChange={event => setRichTextActionDialog({ ...richTextActionDialog, text: event.target.value })} /></label> : null}
                          <div><button type="button" onClick={() => closeRichTextActionDialog(block.id)}>Cancel</button><button type="submit">Apply</button></div>
                        </form> : null}
                      </div>
                      </div> : null}
                      <div className="canvas-block-actions">
                        <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicateBlock(index); }} aria-label="Duplicate block" title="Duplicate block"><StudioHoverIcon name="action.duplicate" /></button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); onRemoveBlock(block.id); }} aria-label="Remove block" title="Remove block"><StudioHoverIcon name="action.close" /></button>
                        <div className="block-options-control">
                          <button ref={(element) => { if (element && blockMenuBlockId === block.id) htmlEditorTriggerRef.current = element; }} className={blockMenuBlockId === block.id ? "is-active" : ""} type="button" onMouseDown={preserveTextSelection} onClick={(event) => { event.stopPropagation(); htmlEditorTriggerRef.current = event.currentTarget; setBlockMenuBlockId((current) => current === block.id ? null : block.id); }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setBlockMenuBlockId(null); } }} aria-haspopup="menu" aria-expanded={blockMenuBlockId === block.id} aria-label="More block options" title="More options"><StudioHoverIcon name="action.more" vertical /></button>
                          {blockMenuBlockId === block.id ? <div className="block-options-menu" role="menu" tabIndex={-1} aria-label="Block options" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setBlockMenuBlockId(null); } }}>
                            <button ref={blockMenuItemRef} type="button" role="menuitem" onMouseDown={preserveTextSelection} onClick={() => openHtmlEditor(block)} disabled={!allowHtmlEditing}>{allowHtmlEditing ? "Edit as HTML" : "HTML editing unavailable for templates"}</button>
                          </div> : null}
                        </div>
                      </div>
                      </div>
                      {(isEditableTextBlock(block) || block.type === "list") && linkEditor?.blockId === block.id ? linkEditor.mode === "preview" ? <LinkPreviewPopover editor={linkEditor} onEdit={() => setLinkEditor({ ...linkEditor, mode: "edit" })} onRemove={() => removeLink(block)} /> : <form className="link-editor-popover" aria-label={linkEditor.existingUrl ? "Edit link" : "Add hyperlink"} style={linkEditor.anchor ?? undefined} onSubmit={(event) => applyLink(event, block)}>
                        <div className="link-editor-fields">
                          <label><span>Text</span><input type="text" value={linkEditor.text} onChange={(event) => setLinkEditor({ ...linkEditor, text: event.target.value })} /></label>
                          <label><span>Link</span><input ref={linkInputRef} type="text" value={linkEditor.url} onChange={(event) => { setLinkEditor({ ...linkEditor, url: event.target.value }); setLinkError(null); }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setLinkEditor(null); setLinkError(null); } }} placeholder="Search or type URL" autoComplete="url" /></label>
                        </div>
                        <details className="link-editor-advanced" open={linkEditor.advancedOpen} onToggle={(event) => setLinkEditor({ ...linkEditor, advancedOpen: event.currentTarget.open })}><summary>Advanced</summary><label className="link-editor-checkbox"><input type="checkbox" checked={linkEditor.opensInNewTab} onChange={(event) => setLinkEditor({ ...linkEditor, opensInNewTab: event.target.checked })} /><span>Open in new tab</span></label></details>
                        {linkError ? <p className="link-editor-error" role="alert">{linkError}</p> : null}
                        {linkSuggestions.length ? <div className="link-editor-suggestions" role="listbox" aria-label="Internal links">{linkSuggestions.map((target) => <button type="button" key={target.id} onMouseDown={preserveTextSelection} onClick={() => { setLinkEditor({ ...linkEditor, url: target.href }); setLinkError(null); }}><span className="link-target-mark" aria-hidden="true">{target.kind === "page" ? "P" : "A"}</span><span><strong>{target.title}</strong><small>{target.href}</small></span><em>{target.kind}</em></button>)}</div> : null}
                        <div className="link-editor-actions">{linkEditor.existingUrl ? <button className="link-editor-remove" type="button" onMouseDown={preserveTextSelection} onClick={() => removeLink(block)}>Remove link</button> : <span /> }<span><button type="button" onMouseDown={preserveTextSelection} onClick={() => { setLinkEditor(null); setLinkError(null); }}>Cancel</button><button className="link-editor-apply" type="submit">Apply</button></span></div>
                      </form> : null}
                      {htmlEditor?.blockId === block.id ? <form className="html-editor-popover" aria-label="Edit block as HTML" onSubmit={(event) => { event.preventDefault(); applyHtmlEditor(block); }}>
                        <label htmlFor={`html-editor-${block.id}`}><strong>Edit as HTML</strong><span>Supported markup only</span></label>
                        <textarea ref={htmlInputRef} id={`html-editor-${block.id}`} value={htmlEditor.draft} onChange={(event) => setHtmlEditor({ ...htmlEditor, draft: event.target.value, error: null })} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setHtmlEditor(null); } }} spellCheck={false} autoCapitalize="off" autoCorrect="off" />
                        {htmlEditor.error ? <p className="html-editor-error" role="alert">{htmlEditor.error}</p> : null}
                        <div className="html-editor-actions"><button type="button" onClick={() => setHtmlEditor(null)}>Cancel</button><button className="html-editor-apply" type="submit">Apply</button></div>
                      </form> : null}
                      {htmlEditor?.blockId === block.id ? null : presentation?.renderBlock?.({ document: activeDocument, block, mode: "edit", selectedBlockId, hoveredBlockId, onTableCellFocus: (blockId, rowIndex, columnIndex) => setTableCellSelections(current => ({ ...current, [blockId]: { rowIndex, columnIndex } })), onSelectBlock, onUpdateBlock, onDocumentFieldChange, onFocusDocumentField, onSplitParagraphs }) ?? <BlockField block={block} rootBlocks={activeDocument.blocks} document={activeDocument} selectedBlockId={selectedBlockId} hoveredBlockId={hoveredBlockId} pendingColumnsLayoutBlockId={pendingColumnsLayoutBlockId} onColumnsLayoutSelected={onColumnsLayoutSelected} coverImageUrl={coverImageUrl} onOpenCoverMediaLibrary={onOpenCoverMediaLibrary} onRemoveCoverImage={onRemoveCoverImage} mediaUrls={mediaBlockUrls} mediaUrl={block.type === "image" && block.mediaId ? mediaBlockUrls[block.mediaId] : undefined} onTableCellFocus={(rowIndex, columnIndex) => setTableCellSelections((current) => ({ ...current, [block.id]: { rowIndex, columnIndex } }))} onTextSelection={(selection) => setTextSelection(block.id, selection)} onLinkActivate={(selection) => { if (isEditableTextBlock(block)) openLinkEditor(block, selection, "preview"); }} onListItemSelection={(list, itemIndex, selection) => { setActiveListItems((current) => current[list.id] === itemIndex ? current : { ...current, [list.id]: itemIndex }); setTextSelection(list.id, selection, itemIndex); }} onListItemLinkActivate={(list, itemIndex, selection) => openLinkEditor(list, selection, "preview", itemIndex)} onSplitParagraph={onSplitParagraph} onMergeParagraphBackward={onMergeParagraphBackward} onSplitParagraphs={onSplitParagraphs} onOpenNestedInserter={(parentId) => openInserter(null, undefined, parentId)} writable={writable} onInsertNestedBlock={(type, parentId) => { if (writable) onInsertBlock(type, parentId); }} onChange={(next) => onUpdateBlock(block.id, () => next)} />}
                  </article>
                </div>
              ))}
              {showInserter ? <div className={`canvas-library-drop-zone${dragOverIndex === activeDocument.blocks.length ? " is-active" : ""}`} aria-hidden="true" /> : null}
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
                      openInserter(activeDocument.blocks.length - 1, value.slice(1));
                      return;
                    }
                    setAppenderValue(value);
                  }}
                  onKeyDown={(event) => {
                    if ((event.key === "Backspace" || event.key === "ArrowUp" || event.key === "ArrowLeft") && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && appenderValue.length === 0 && event.currentTarget.selectionStart === 0) {
                      const previousParagraph = lastParagraphBlock(activeDocument.blocks);
                      if (previousParagraph) {
                        event.preventDefault();
                        setAppenderActive(false);
                        onSelectBlock(previousParagraph.id);
                        window.requestAnimationFrame(() => {
                          const target = [...document.querySelectorAll<HTMLElement>(".rich-text-editor")]
                            .find((editor) => editor.dataset.studioBlockId === previousParagraph.id || editor.dataset.blockId === previousParagraph.id);
                          if (target) focusRichTextEditorAtOffset(target, previousParagraph.text.length);
                        });
                        return;
                      }
                    }
                    if (event.key !== "Enter" || !appenderValue.trim()) return;
                    event.preventDefault();
                    const block = onInsertBlock("paragraph");
                    onUpdateBlock(block.id, () => ({ ...block, text: appenderValue, runs: textToRuns(appenderValue) }));
                    setAppenderValue("");
                    setAppenderActive(false);
                  }}
                />
                {appenderActive ? <button className="canvas-appender-button" type="button" onClick={() => { setAppenderValue(""); setAppenderActive(false); toggleInserter(activeDocument.blocks.length - 1); }} aria-label="Add block" title="Add block"><StudioIcon name="add" /></button> : null}
              </div>
            </div>
            {presentation?.renderFooter?.({ document: activeDocument, mode: "edit", selectedBlockId, hoveredBlockId, onTableCellFocus: (blockId, rowIndex, columnIndex) => setTableCellSelections(current => ({ ...current, [blockId]: { rowIndex, columnIndex } })), onSelectBlock, onUpdateBlock, onDocumentFieldChange, onFocusDocumentField })}
            </>, "edit")}
          </div>
        )}
      </div>

      </div>

    </section>
  );
}

function StudioCodeEditor({ document, writable, state, inputRef, onChange, onFormat, onDocumentFieldChange, onApply, onExit }: {
  document: StudioDocument;
  writable: boolean;
  state: CodeEditorState;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onFormat: (draft: string) => void;
  onDocumentFieldChange: StudioCanvasProps["onDocumentFieldChange"];
  onApply: () => void;
  onExit: () => void;
}) {
  const [wrapText, setWrapText] = useState(true);
  const [formatNotice, setFormatNotice] = useState<string | null>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const highlighted = highlightCode(state.draft, "html");

  const syncHighlightScroll = useCallback(() => {
    const source = inputRef.current;
    const highlight = highlightRef.current;
    if (!source || !highlight) return;
    highlight.scrollTop = source.scrollTop;
    highlight.scrollLeft = source.scrollLeft;
  }, [inputRef]);

  useLayoutEffect(() => {
    syncHighlightScroll();
  }, [state.draft, syncHighlightScroll, wrapText]);

  function handleFormat() {
    const formatted = formatHtml(state.draft);
    if (formatted === state.draft) {
      setFormatNotice("Code is already formatted.");
      return;
    }
    setFormatNotice(null);
    onFormat(formatted);
  }

  return <div className="studio-code-editor" aria-label="Code editor" data-readonly={!writable || undefined}>
    <div className="studio-code-editor-header"><strong>Editing code</strong><button type="button" onClick={onExit}>Exit code editor</button></div>
    <div className="studio-code-editor-body">
      <label htmlFor="studio-code-title"><span>Title</span><AutoResizeTextarea id="studio-code-title" className="studio-code-title" value={document.title} onChange={(event) => onDocumentFieldChange("title", event.target.value)} placeholder={`Add ${document.kind} title`} readOnly={!writable} /></label>
      {document.subtitle !== undefined ? <label htmlFor="studio-code-subtitle"><span>Subtitle</span><AutoResizeTextarea id="studio-code-subtitle" className="studio-code-subtitle" value={document.subtitle ?? ""} onChange={(event) => onDocumentFieldChange("subtitle", event.target.value)} placeholder="Add subtitle" readOnly={!writable} /></label> : null}
      <div className="studio-code-source-field">
        <div className="studio-code-source-header">
          <label htmlFor="studio-code-source">Content</label>
          <button type="button" className="studio-code-format" onClick={handleFormat} disabled={!writable} title={writable ? "Format supported HTML" : "Formatting unavailable while another Studio tab owns editing"}>Format code</button>
          <button
            type="button"
            className={`studio-code-wrap-toggle${wrapText ? " is-active" : ""}`}
            aria-pressed={wrapText}
            aria-label={`${wrapText ? "Disable" : "Enable"} text wrapping`}
            title={`${wrapText ? "Disable" : "Enable"} text wrapping`}
            onClick={() => setWrapText((current) => !current)}
          >Wrap text</button>
        </div>
        <div className={`studio-code-source-wrap${wrapText ? " is-wrapped" : " is-unwrapped"}`}>
          <pre ref={highlightRef} className="studio-code-highlight" aria-hidden="true" data-language={highlighted.language}><code dangerouslySetInnerHTML={{ __html: highlighted.html }} /></pre>
          <textarea id="studio-code-source" ref={inputRef} className={`studio-code-source${wrapText ? " is-wrapped" : " is-unwrapped"}`} value={state.draft} onChange={(event) => { setFormatNotice(null); onChange(event.target.value); }} onScroll={syncHighlightScroll} spellCheck={false} autoCapitalize="off" autoCorrect="off" aria-label="Document HTML" readOnly={!writable} wrap={wrapText ? "soft" : "off"} />
        </div>
      </div>
      {formatNotice ? <p className="studio-code-status" role="status">{formatNotice}</p> : null}
      <p className="studio-code-help">{writable ? "Edit supported block markup. Component blocks keep their code-backed implementation." : "Formatting and editing are unavailable while another Studio tab owns this draft."}</p>
      {state.error ? <p className="html-editor-error" role="alert">{state.error}</p> : null}
      <div className="html-editor-actions"><button type="button" onClick={onExit}>Cancel</button><button className="html-editor-apply" type="button" onClick={onApply} disabled={!writable}>Apply</button></div>
    </div>
  </div>;
}

function StudioListView({ blocks, selectedBlockId, onSelectBlock, onHoverBlock, onClose, onMoveItem, onRemoveBlock }: {
  blocks: ContentBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  onHoverBlock: (blockId: string | null) => void;
  onClose: () => void;
  onMoveItem: (parentId: string | null, index: number, direction: -1 | 1) => void;
  onRemoveBlock: (blockId: string) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(blocks.filter((block) => blockChildren(block).length).map((block) => block.id)));

  useLayoutEffect(() => () => onHoverBlock(null), [onHoverBlock]);

  function toggleExpanded(blockId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  }

  function renderBlock(block: ContentBlock, index: number, siblings: ContentBlock[], parentId: string | null = null): ReactNode {
    const children = blockChildren(block);
    const expanded = expandedIds.has(block.id);
    return <li key={block.id}>
      <div className={`studio-list-item${selectedBlockId === block.id ? " is-selected" : ""}`} onPointerEnter={() => onHoverBlock(block.id)} onPointerLeave={() => onHoverBlock(null)}>
        {children.length ? <button className={`studio-list-disclosure${expanded ? " is-expanded" : ""}`} type="button" aria-label={`${expanded ? "Collapse" : "Expand"} ${blockOutlineLabel(block)}`} aria-expanded={expanded} onClick={() => toggleExpanded(block.id)}><StudioIcon name="chevron-right" size={16} /></button> : <span className="studio-list-disclosure-spacer" aria-hidden="true" />}
        <button className="studio-list-select" type="button" aria-current={selectedBlockId === block.id ? "true" : undefined} onClick={() => onSelectBlock(block.id)}>
          <span className="studio-list-icon" aria-hidden="true"><BlockTypeIcon type={block.type} /></span>
          <span>{blockOutlineLabel(block)}</span>
        </button>
        {selectedBlockId === block.id ? <div className="studio-list-actions">
          <button type="button" aria-label={`Move ${blockOutlineLabel(block)} up`} disabled={index === 0} onClick={() => onMoveItem(parentId, index, -1)}><StudioIcon name="chevron-down" size={16} /></button>
          <button type="button" aria-label={`Move ${blockOutlineLabel(block)} down`} disabled={index === siblings.length - 1} onClick={() => onMoveItem(parentId, index, 1)}><StudioIcon name="chevron-down" size={16} /></button>
          <button type="button" aria-label={`Remove ${blockOutlineLabel(block)}`} onClick={() => onRemoveBlock(block.id)}><StudioIcon name="trash" size={16} /></button>
        </div> : null}
      </div>
      {children.length && expanded ? <ol>{children.map((child, index) => renderBlock(child, index, children, block.id))}</ol> : null}
    </li>;
  }

  return <aside className="studio-list-view" aria-label="List View">
    <header><h2>List View</h2><button type="button" onClick={onClose} aria-label="Close List View" title="Close List View"><StudioIcon name="close" size={18} /></button></header>
    <nav aria-label="Block structure"><ol>{blocks.map((block, index) => renderBlock(block, index, blocks))}</ol></nav>
  </aside>;
}

function DocumentHeading({ document, selectedDocumentField, previewing, onChange, onFocus, showTitle = true, showSubtitle = true }: {
  document: StudioDocument;
  selectedDocumentField?: "title" | "subtitle" | null;
  previewing: boolean;
  onChange: StudioCanvasProps["onDocumentFieldChange"];
  onFocus: (field: "title" | "subtitle") => void;
  showTitle?: boolean;
  showSubtitle?: boolean;
}) {
  const titleRef = useFittedTextHeight<HTMLHeadingElement>(document.title, previewing);
  const subtitleRef = useFittedTextHeight<HTMLParagraphElement>(document.subtitle, previewing);
  return (
    <header className="document-heading">
      {showTitle ? <div className={`document-title-field${selectedDocumentField === "title" ? " is-document-field-selected" : ""}`} data-document-field="title">
        {previewing ? <h1 className="preview-title" ref={titleRef}>{document.title || `Untitled ${document.kind}`}</h1> : <>
          <label className="canvas-title-label" htmlFor="document-title">{document.kind} title</label>
          <AutoResizeTextarea id="document-title" className="canvas-title" value={document.title} onFocus={() => onFocus("title")} onChange={(event) => onChange("title", event.target.value)} placeholder={`Add ${document.kind} title`} />
        </>}
      </div> : null}
      {showSubtitle && (previewing && !document.subtitle?.trim() ? null : <div className={`document-subtitle-field${selectedDocumentField === "subtitle" ? " is-document-field-selected" : ""}`} data-document-field="subtitle">
        {previewing ? <p className="preview-subtitle" ref={subtitleRef}>{document.subtitle}</p> : <>
          <label className="canvas-subtitle-label" htmlFor="document-subtitle">Subtitle</label>
          <AutoResizeTextarea id="document-subtitle" className="canvas-subtitle" value={document.subtitle ?? ""} onFocus={() => onFocus("subtitle")} onChange={(event) => onChange("subtitle", event.target.value)} placeholder="Add a subtitle" />
        </>}
      </div>)}
    </header>
  );
}

function LinkPreviewPopover({ editor, onEdit, onRemove }: { editor: LinkEditorState; onEdit: () => void; onRemove: () => void }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(editor.url);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className="link-preview-popover" role="dialog" aria-label="Link options" style={editor.anchor ?? undefined}>
      <div className="link-preview-target"><span className="link-preview-mark" aria-hidden="true"><StudioIcon name="globe" size={17} /></span><span><strong>{editor.text || editor.url}</strong><small>{editor.url}</small></span></div>
      <div className="link-preview-actions"><button type="button" onClick={onEdit} aria-label="Edit link" title="Edit link"><StudioIcon name="pencil" size={18} /></button><button type="button" onClick={onRemove} aria-label="Remove link" title="Remove link"><StudioIcon name="link-off" size={18} /></button><button type="button" onClick={() => void copyLink()} aria-label={copyState === "copied" ? "Link copied" : "Copy link"} title={copyState === "copied" ? "Link copied" : "Copy link"}><StudioIcon name="copy" size={18} /></button></div>
      {copyState !== "idle" ? <span className="visually-hidden" role="status">{copyState === "copied" ? "Link copied to clipboard." : "Unable to copy link."}</span> : null}
    </div>
  );
}

function BlockTransformControl({ block, open, onOpenChange, onTransform }: { block: ContentBlock; open: boolean; onOpenChange: (open: boolean) => void; onTransform: (transform: BlockTransform) => void }) {
  const transforms = availableBlockTransforms(block);
  if (!transforms.length) return null;
  return <div className="transform-control"><button className={open ? "is-active" : ""} type="button" onMouseDown={preserveTextSelection} onClick={() => onOpenChange(!open)} aria-haspopup="menu" aria-expanded={open} aria-label={`Transform ${blockLabel(block.type)} block`} title="Transform block"><HoverBlockTypeIcon type={block.type} headingLevel={block.type === "heading" ? block.level : undefined} /></button>{open ? <div className="transform-menu" role="menu" aria-label="Transform block"><strong>Transform to</strong>{transforms.map((transform) => <button type="button" role="menuitem" key={transform.id} onMouseDown={preserveTextSelection} onClick={() => onTransform(transform)}><TransformIcon transform={transform} /><span>{transform.label}</span></button>)}</div> : null}</div>;
}

function TransformIcon({ transform }: { transform: BlockTransform }) {
  if (transform.target === "heading" && transform.level) return <span className="studio-heading-icon" aria-hidden="true">H{transform.level}</span>;
  const icons: Record<BlockTransform["target"], IconName> = { heading: "text.heading", list: "text.list-bulleted", paragraph: "text.paragraph", quote: "text.quote" };
  return <StudioHoverIcon name={icons[transform.target]} />;
}

function BlockTypeIcon({ type }: { type: ContentBlock["type"] | "template-content" }) {
  const blockType = type === "component" || type === "footnotes" ? "template-content" : type === "column" ? "columns" : type;
  return <BlockLibraryIcon type={blockType} />;
}

function HoverBlockTypeIcon({ type, headingLevel }: { type: ContentBlock["type"] | "template-content"; headingLevel?: HeadingLevel }) {
  if (type === "paragraph") return <StudioHoverIcon name="text.paragraph" />;
  if (type === "list") return <StudioHoverIcon name="text.list-bulleted" />;
  if (type === "quote") return <StudioHoverIcon name="text.quote" />;
  if (type === "code") return <StudioHoverIcon name="text.code" />;
  if (type === "image") return <StudioHoverIcon name="insert.image" />;
  if (type === "heading") return <span className="studio-heading-icon" aria-hidden="true">H{headingLevel ?? 2}</span>;
  return <BlockTypeIcon type={type} />;
}

function BlockInserter({ closing, onCloseAnimationEnd, inserterQuery, filteredBlocks, onSetQuery, onInsert, onDragEnd, onDismiss }: { closing: boolean; onCloseAnimationEnd: () => void; inserterQuery: string; filteredBlocks: StudioCanvasProps["filteredBlocks"]; onSetQuery: (query: string) => void; onInsert: (type: InsertableBlockType) => void; onDragEnd: () => void; onDismiss: () => void }) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const dismiss = useCallback(() => {
    onDismiss();
    requestAnimationFrame(() => { if (openerRef.current?.isConnected) openerRef.current.focus(); });
  }, [onDismiss]);

  useLayoutEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    searchInputRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dismiss]);

  return (
    <div className="inserter-backdrop" onAnimationEnd={(event) => { if (closing && event.target instanceof HTMLElement && event.target.classList.contains("block-inserter") && event.animationName === "studio-inserter-exit") onCloseAnimationEnd(); }}>
      <button className="inserter-dismiss" type="button" onClick={dismiss} aria-label="Close block library" />
      <Pane trackClassName="block-inserter-track" className={`block-inserter${closing ? " is-closing" : ""}`} bodyClassName="inserter-results" label="Block Library" side="left" width={320} collapsed={false} onCollapsedChange={() => undefined} collapseIcon={null} collapsible={false} inert={closing}
        header={<div className="block-inserter-heading"><div><p className="eyebrow">Block library</p><h2 id="inserter-title">Choose a block</h2></div><button type="button" onClick={() => { dismiss(); onCloseAnimationEnd(); }} aria-label="Close block library"><StudioIcon name="close" /></button></div>}
        toolbar={<input ref={searchInputRef} type="search" value={inserterQuery} onChange={(event) => onSetQuery(event.target.value)} placeholder="Search blocks" aria-label="Search blocks" />}>
          {(["Text", "Media", "Design", "Widgets", "Other"] as const).map((group) => {
            const items = filteredBlocks.filter((item) => item.group === group);
            if (!items.length) return null;
            const insertableItems = items.filter((item): item is (typeof filteredBlocks)[number] & { type: InsertableBlockType } => item.type !== "template-content");
            if (!insertableItems.length) return null;
            return <div className="inserter-group" key={group}><h3>{group}</h3><div>{insertableItems.map((item) => <button type="button" draggable key={item.type} onDragStart={event => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-acm-studio-block", item.type); }} onDragEnd={onDragEnd} onClick={() => onInsert(item.type)}><span><BlockTypeIcon type={item.type} /></span><strong>{item.label}</strong><small>{item.description}</small></button>)}</div></div>;
          })}
      </Pane>
    </div>
  );
}

function ColumnsLayoutChooser({ block, onSelect }: { block: Extract<ContentBlock, { type: "columns" }>; onSelect: (widths: readonly number[]) => void }) {
  const currentWidths = block.children.map((column) => column.width);
  const activePresetIndex = COLUMN_LAYOUT_PRESETS.findIndex((preset) => preset.widths.length === currentWidths.length && preset.widths.every((width, index) => {
    const currentWidth = currentWidths[index];
    return currentWidth !== undefined && Math.abs(width - currentWidth) < 0.1;
  }));
  return <section className="columns-layout-chooser" aria-labelledby={`columns-layout-title-${block.id}`}>
    <div className="columns-layout-chooser-heading"><span aria-hidden="true"><BlockLibraryIcon type="columns" /></span><strong id={`columns-layout-title-${block.id}`}>Columns</strong></div>
    <p>Divide into columns. Select a layout:</p>
    <div className="columns-layout-choices" role="group" aria-label="Column layout">
      {COLUMN_LAYOUT_PRESETS.map((preset, index) => <button key={preset.label} type="button" className={index === activePresetIndex ? "is-active" : undefined} aria-label={preset.label} aria-pressed={index === activePresetIndex} onClick={() => onSelect(preset.widths)}>
        <span className="columns-layout-choice-preview" aria-hidden="true">{preset.widths.map((width, columnIndex) => <i key={columnIndex} style={{ flexGrow: width }} />)}</span>
        <span>{["100", "50/50", "33/66", "66/33", "33/33/33", "25/50/25"][index]}</span>
      </button>)}
    </div>
  </section>;
}

type BlockFieldProps = { block: ContentBlock; rootBlocks?: ContentBlock[]; document?: StudioDocument; templatePlaceholder?: boolean; selectedBlockId?: string | null; hoveredBlockId?: string | null; writable?: boolean; pendingColumnsLayoutBlockId?: string | null; onColumnsLayoutSelected?: () => void; mediaUrl?: string; mediaUrls?: Record<string, string>; coverImageUrl?: string; onOpenCoverMediaLibrary?: () => void; onRemoveCoverImage?: () => void; onTableCellFocus: (rowIndex: number, columnIndex: number) => void; onTextSelection: (selection: TextSelection | null) => void; onLinkActivate: (selection: TextSelection) => void; onListItemSelection?: (list: EditableListBlock, index: number, selection: TextSelection | null) => void; onListItemLinkActivate?: (list: EditableListBlock, index: number, selection: TextSelection) => void; onSplitParagraph?: (blockId: string, beforeRuns: RichTextRun[], afterRuns: RichTextRun[]) => string | null; onMergeParagraphBackward?: (blockId: string) => { blockId: string; offset: number } | null; onSplitParagraphs?: (blockId: string, paragraphs: RichTextRun[][]) => string[] | null; onOpenNestedInserter?: (parentId: string) => void; onInsertNestedBlock?: (type: InsertableBlockType, parentId: string) => void; onChange: (block: ContentBlock) => void };

function SocialIconsEditorBlock({ block, selectedBlockId, hoveredBlockId, writable, onInsert }: { block: Extract<ContentBlock, { type: "social-icons" }>; selectedBlockId?: string | null; hoveredBlockId?: string | null; writable: boolean; onInsert?: (type: InsertableBlockType) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const choices = socialIconCatalogue.filter(item => `${item.label} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()));

  useLayoutEffect(() => {
    if (writable && onInsert) return;
    setOpen(false);
    setQuery("");
  }, [writable, onInsert]);

  useLayoutEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (popoverRef.current?.contains(event.target as Node) || triggerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setQuery("");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setQuery("");
      requestAnimationFrame(() => triggerRef.current?.focus());
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function insert(type: InsertableBlockType) {
    onInsert?.(type);
    setOpen(false);
    setQuery("");
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return <nav className={`social-icons-block is-editing is-${block.orientation ?? "horizontal"} justify-${block.justification ?? "left"} size-${block.iconSize ?? "normal"}`} aria-label="Social links"><ul>{block.children.map(child => <li className="studio-nested-block" data-studio-nested-block-id={child.id} data-studio-selected={selectedBlockId === child.id} data-studio-hovered={hoveredBlockId === child.id} tabIndex={0} aria-label={`${blockLabel(child.type)} icon block`} key={child.id}><SocialIconView block={child} showLabel={block.showLabels} editing /></li>)}<li className="social-icons-appender"><button ref={triggerRef} className="social-icons-add" type="button" disabled={!writable || !onInsert} onClick={() => { setOpen(value => !value); setQuery(""); }} aria-haspopup="dialog" aria-expanded={open} aria-controls={`social-icon-picker-${block.id}`} aria-label="Add social icon" title="Add social icon"><StudioIcon name="add" size={18} /></button>{open ? <div ref={popoverRef} id={`social-icon-picker-${block.id}`} className="social-icon-picker" role="dialog" aria-label="Choose a social icon"><div className="social-icon-picker-header"><input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search" aria-label="Search social icons" /><button type="button" aria-label="Close social icon picker" title="Close" onClick={() => { setOpen(false); setQuery(""); requestAnimationFrame(() => triggerRef.current?.focus()); }}><StudioIcon name="close" size={18} /></button></div><div className="social-icon-picker-options">{choices.map(item => <button type="button" key={item.type} disabled={!writable || !onInsert} onClick={() => insert(item.type as InsertableBlockType)}><BlockTypeIcon type={item.type} /><strong>{item.label}</strong></button>)}{choices.length === 0 ? <p>No social icons found.</p> : null}</div></div> : null}</li></ul></nav>;
}

export function BlockField(props: BlockFieldProps) {
  const { block } = props;
  const content = <BlockFieldContent {...props} />;
  if (!block.visualStyle || block.type === "spacer") return content;
  const style = block.visualStyle;
  return <div id={paragraphStyleAnchor(style)} className={visualStyleClassName(style)} style={block.type === "button" || block.type === "image" ? (style.margin ? { margin: style.margin } : undefined) : paragraphStyleToCss(style)}>{content}</div>;
}

function BlockFieldContent({ block, rootBlocks = [block], document, templatePlaceholder = false, selectedBlockId, hoveredBlockId, writable = true, pendingColumnsLayoutBlockId, onColumnsLayoutSelected, mediaUrl, mediaUrls = {}, coverImageUrl, onOpenCoverMediaLibrary, onRemoveCoverImage, onTableCellFocus, onTextSelection, onLinkActivate, onListItemSelection, onListItemLinkActivate, onSplitParagraph, onMergeParagraphBackward, onSplitParagraphs, onOpenNestedInserter, onInsertNestedBlock, onChange }: BlockFieldProps) {
  const documentContext: DocumentRenderContext = document ?? { kind: "page" };
  if (block.type === "paragraph") return <RichTextEditor mediaUrls={mediaUrls} id={paragraphStyleAnchor(block.style)} className={`block-textarea paragraph-field align-${block.align ?? "left"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}${paragraphStyleClassName(block.style) ? ` ${paragraphStyleClassName(block.style)}` : ""}`} style={paragraphStyleToCss(block.style) as React.CSSProperties} fitText={fitTextEnabled(block.style)} text={block.text} runs={block.runs} onChange={(text, runs) => onChange({ ...block, text, runs })} onSelectionChange={onTextSelection} onLinkActivate={onLinkActivate} onSplitParagraph={onSplitParagraph ? (beforeRuns, afterRuns) => onSplitParagraph(block.id, beforeRuns, afterRuns) : undefined} onMergeParagraphBackward={onMergeParagraphBackward ? () => onMergeParagraphBackward(block.id) : undefined} onSplitParagraphs={onSplitParagraphs ? paragraphs => onSplitParagraphs(block.id, paragraphs) : undefined} data-studio-block-id={block.id} data-placeholder="Start writing…" aria-label="Paragraph text" />;
  if (block.type === "heading") return <RichTextEditor mediaUrls={mediaUrls} className={`block-textarea heading-field is-h${block.level} align-${block.align ?? "left"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}${fitTextEnabled(block.visualStyle) ? " has-fit-text" : ""}`} fitText={fitTextEnabled(block.visualStyle)} fitTextSignature={JSON.stringify(block.visualStyle ?? {})} text={block.text} runs={block.runs} onChange={(text, runs) => onChange({ ...block, text, runs })} onSelectionChange={onTextSelection} onLinkActivate={onLinkActivate} data-studio-block-id={block.id} data-placeholder="Heading" aria-label="Heading text" />;
  if (block.type === "quote") return <div className={`quote-field align-${block.align ?? "left"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}${block.quoteStyle === "plain" ? " is-style-plain" : ""}`}><RichTextEditor mediaUrls={mediaUrls} className="block-textarea" text={block.text} runs={block.runs} onChange={(text, runs) => onChange({ ...block, text, runs })} onSelectionChange={onTextSelection} onLinkActivate={onLinkActivate} data-studio-block-id={block.id} aria-label="Quote text" />{block.attribution ? <span>— {block.attribution}</span> : null}</div>;
  if (block.type === "list") return <ListField block={block} mediaUrls={mediaUrls} onSelectionChange={onListItemSelection} onLinkActivate={onListItemLinkActivate} onChange={onChange} />;
  if (block.type === "table") return <TableField block={block} onCellFocus={onTableCellFocus} onChange={onChange} />;
  if (block.type === "code") return <CodeEditor className={blockAlignmentClass(block)} value={block.code} language={block.language} onChange={(code) => onChange({ ...block, code })} />;
  // User-supplied URLs cannot be known to Next's image optimiser in this local editor.
  // eslint-disable-next-line @next/next/no-img-element
  if (block.type === "image") {
    const imageSource = block.mediaId ? safeImageSource(mediaUrl ?? "", { allowBlob: true }) : safeImageSource(block.src);
    const linkDestination = block.linkDestination ?? (block.linkUrl ? "custom" : "none");
    const imageLink = linkDestination === "media" ? imageSource : linkDestination === "custom" && block.linkUrl ? safeTextLink(block.linkUrl) : null;
    const image = imageSource ? <img src={imageSource} alt={block.decorative ? "" : block.alt} title={block.title} style={imageDisplayStyle(block)} /> : null;
    return <figure className={`image-field${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`}>{image ? (imageLink ? <a href={imageLink} target={block.opensInNewTab ? "_blank" : undefined} rel={block.opensInNewTab ? "noopener noreferrer" : undefined} aria-label={block.decorative || !block.alt ? block.title || block.alt || "Open linked image" : undefined} onClick={(event) => event.preventDefault()}>{image}</a> : image) : <div><span><StudioIcon name="image" /></span><strong>Image block</strong><small>Choose a managed file or add an image URL.</small></div>}{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure>;
  }
  if (block.type === "embed") return <div className={`embed-field${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`}><span><StudioIcon name="external" /></span><div><strong>{block.title}</strong><small>{block.url || "Add a URL in Block settings"}</small>{block.caption ? <p className="embed-caption">{block.caption}</p> : null}</div></div>;
  if (block.type === "button") return <div className={`button-field align-${block.align ?? "centre"}${block.width ? ` has-width-${block.width}` : ""}`}><span className={`content-button is-${block.style}`} style={buttonVisualCss(block.visualStyle)}>{block.label}</span></div>;
  if (block.type === "field") return <label className="content-field"><span>{block.label}</span>{block.control === "select" ? <select value={block.value} onChange={(event) => onChange({ ...block, value: event.target.value })}>{(block.options?.length ? block.options : [block.value]).map((option) => <option key={option}>{option}</option>)}</select> : <input value={block.value} onChange={(event) => onChange({ ...block, value: event.target.value })} />}</label>;
  if (block.type === "footnotes") return <section className="footnotes-field" aria-label="Footnotes"><strong>Footnotes</strong><ol>{block.notes.map((note, index) => <li key={note.id}><textarea aria-label={`Footnote ${index + 1}`} rows={2} value={note.text} onChange={event => onChange({ ...block, notes: block.notes.map(item => item.id === note.id ? { ...item, text: event.target.value } : item) })} /></li>)}</ol></section>;
  if (block.type === "document-title") {
    const TitleElement = `h${block.level ?? 2}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    const title = templatePlaceholder ? "Title" : document?.title || "Add a title in Document settings.";
    const href = document?.slug ? (document.kind === "post" ? `/writing/${document.slug}` : `/${document.slug}`) : null;
    return documentFieldVisible(documentContext, "title") ? <TitleElement className={`metadata-block-editor document-dynamic-title${templatePlaceholder ? " template-dynamic-placeholder" : ""} align-${block.align ?? "left"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`}>{block.isLink && href ? <a href={href} onClick={(event) => event.preventDefault()}>{title}</a> : title}</TitleElement> : null;
  }
  if (block.type === "document-subtitle") return documentFieldVisible(documentContext, "subtitle") ? <p className={`metadata-block-editor document-dynamic-field template-subtitle${templatePlaceholder ? " template-dynamic-placeholder" : ""} align-${block.align ?? "left"}`}>{templatePlaceholder ? "Subtitle" : document?.subtitle || "Add a subtitle in Document settings."}</p> : null;
  if (block.type === "cover-image") {
    const imageSource = document?.coverImage?.mediaId ? safeImageSource(coverImageUrl ?? "", { allowBlob: true }) : safeImageSource(coverImageUrl ?? "");
    return <div className={`canvas-cover-wrap document-dynamic-cover align-${block.align ?? "left"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`}>
      <div className={`canvas-cover-image${imageSource ? " is-source" : ""}`} role="img" aria-label={document?.coverImage?.alt || "Mock cover image"}>
        {imageSource ? <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSource} alt={document?.coverImage?.alt || ""} style={imageDisplayStyle(block)} />
        </> : null}
      </div>
      {onOpenCoverMediaLibrary || onRemoveCoverImage ? <div className="canvas-cover-actions">
        {onOpenCoverMediaLibrary ? <button className="cover-action-button" type="button" onClick={(event) => { event.stopPropagation(); onOpenCoverMediaLibrary(); }} aria-label="Change cover image" title="Change cover image"><StudioIcon name="image" /></button> : null}
        {onRemoveCoverImage ? <button className="cover-action-button is-destructive" type="button" onClick={(event) => { event.stopPropagation(); onRemoveCoverImage(); }} aria-label="Remove cover image" title="Remove cover image"><StudioIcon name="trash" /></button> : null}
      </div> : null}
    </div>;
  }
  if (block.type === "spacer") return <button type="button" id={paragraphStyleAnchor(block.visualStyle)} className={`spacer-field${paragraphStyleClassName(block.visualStyle) ? ` ${paragraphStyleClassName(block.visualStyle)}` : ""}`} style={{ ...spacerDimensions(block), margin: block.visualStyle?.margin }} data-studio-block-id={block.id} aria-label="Spacer block" />;
  if (block.type === "reading-time") return <div className={`metadata-block-editor reading-time-block-editor${block.presentation === "plain" ? " is-plain" : ""} align-${block.align ?? "left"}`}>{block.presentation !== "plain" ? <span className="reading-time-badge">{block.prefix ?? "Reading Time:"} {readingTimeLabel(rootBlocks)}</span> : <span>{block.prefix ?? "Reading Time:"} {readingTimeLabel(rootBlocks)}</span>}</div>;
  if (block.type === "post-author") { const author = documentAuthor(documentContext); return <div className={`metadata-block-editor article-byline align-${block.align ?? "left"}`}>{author ? <>{block.avatar !== false ? <span className="article-author-avatar" aria-hidden="true">{authorInitials(author)}</span> : null}<span>{block.prefix ?? "By"} <strong>{author}</strong></span></> : <span className="metadata-missing">Add an author in Document settings.</span>}</div>; }
  if (block.type === "post-date") { const date = formatDocumentDate(documentContext, block.format); const value = date ? <>{block.showIcon !== false ? <ArticleMetaIcon name="clock" /> : null}<time dateTime={documentContext.publishAt ?? documentContext.publishedAt}>{date}</time></> : <span className="metadata-missing">Add a publication date in Document settings.</span>; const href = document?.slug ? (document.kind === "post" ? `/writing/${document.slug}` : `/${document.slug}`) : null; return <div className={`metadata-block-editor article-byline-detail align-${block.align ?? "left"}`}>{block.isLink && href ? <a href={href} onClick={(event) => event.preventDefault()}>{value}</a> : value}</div>; }
  if (block.type === "social-icons") return <SocialIconsEditorBlock block={block} selectedBlockId={selectedBlockId} hoveredBlockId={hoveredBlockId} writable={writable} onInsert={type => onInsertNestedBlock?.(type, block.id)} />;
  if (block.type === "social-linkedin" || block.type === "social-tiktok") return <SocialIconView block={block} showLabel editing />;
  if (block.type === "columns") {
    if (block.id === pendingColumnsLayoutBlockId) return <ColumnsLayoutChooser block={block} onSelect={widths => {
      onChange(setColumnsLayout(block, widths, index => `column-${crypto.randomUUID()}-${index + 1}`));
      onColumnsLayoutSelected?.();
    }} />;
    return <div id={paragraphStyleAnchor(block.style)} className={`studio-columns${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}${paragraphStyleClassName(block.style) ? ` ${paragraphStyleClassName(block.style)}` : ""}`} style={{ ...columnsLayoutStyle(block), ...paragraphStyleToCss(block.style) }} {...layoutDataAttributes(block)}>{block.children.map((column) => <div className="studio-column-block studio-nested-block" data-studio-nested-block-id={column.id} data-studio-selected={selectedBlockId === column.id} data-studio-hovered={hoveredBlockId === column.id} key={column.id}><BlockField block={column} rootBlocks={rootBlocks} document={document} selectedBlockId={selectedBlockId} hoveredBlockId={hoveredBlockId} pendingColumnsLayoutBlockId={pendingColumnsLayoutBlockId} onColumnsLayoutSelected={onColumnsLayoutSelected} coverImageUrl={coverImageUrl} onOpenCoverMediaLibrary={onOpenCoverMediaLibrary} onRemoveCoverImage={onRemoveCoverImage} mediaUrls={mediaUrls} onTableCellFocus={onTableCellFocus} onTextSelection={onTextSelection} onLinkActivate={onLinkActivate} onSplitParagraph={onSplitParagraph} onMergeParagraphBackward={onMergeParagraphBackward} onSplitParagraphs={onSplitParagraphs} onOpenNestedInserter={onOpenNestedInserter} writable={writable} onInsertNestedBlock={onInsertNestedBlock} onChange={(next) => onChange({ ...block, children: block.children.map((candidate) => candidate.id === column.id ? next as typeof column : candidate) })} /></div>)}</div>;
  }
  if (block.type === "column") return <div id={paragraphStyleAnchor(block.style)} className={`studio-column-content${paragraphStyleClassName(block.style) ? ` ${paragraphStyleClassName(block.style)}` : ""}`} style={{ ...(block.verticalAlign ? { alignSelf: block.verticalAlign === "centre" ? "center" : block.verticalAlign === "bottom" ? "end" : block.verticalAlign === "top" ? "start" : "stretch" } : {}), ...paragraphStyleToCss(block.style) }}>{block.children.map((child) => <div className="studio-nested-block" data-studio-nested-block-id={child.id} data-studio-selected={selectedBlockId === child.id} data-studio-hovered={hoveredBlockId === child.id} key={child.id}><BlockField block={child} rootBlocks={rootBlocks} document={document} selectedBlockId={selectedBlockId} hoveredBlockId={hoveredBlockId} pendingColumnsLayoutBlockId={pendingColumnsLayoutBlockId} onColumnsLayoutSelected={onColumnsLayoutSelected} coverImageUrl={coverImageUrl} onOpenCoverMediaLibrary={onOpenCoverMediaLibrary} onRemoveCoverImage={onRemoveCoverImage} mediaUrls={mediaUrls} mediaUrl={child.type === "image" && child.mediaId ? mediaUrls[child.mediaId] : undefined} onTableCellFocus={onTableCellFocus} onTextSelection={onTextSelection} onLinkActivate={onLinkActivate} onSplitParagraph={onSplitParagraph} onMergeParagraphBackward={onMergeParagraphBackward} onSplitParagraphs={onSplitParagraphs} onOpenNestedInserter={onOpenNestedInserter} writable={writable} onInsertNestedBlock={onInsertNestedBlock} onChange={(next) => onChange({ ...block, children: block.children.map((candidate) => candidate.id === child.id ? next : candidate) })} /></div>)}<button type="button" className="nested-add-block" onClick={() => onOpenNestedInserter?.(block.id)}><StudioIcon name="add" size={16} /> Add block</button></div>;
  if (block.type === "section" || block.type === "group") { const Group = block.type === "section" ? "section" : block.tagName ?? "div"; return <Group className={`studio-nested-group layout-${block.layout}${hasLayoutOptions(block) ? " has-layout-options" : ""}${block.type === "group" && blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`} style={layoutStyleProperties(block)} {...layoutDataAttributes(block)} data-section-role={block.type === "section" ? block.role : undefined} aria-label={block.type === "group" ? block.ariaLabel || undefined : undefined}>{block.children.map((child) => <div className="studio-nested-block" data-studio-nested-block-id={child.id} data-studio-selected={selectedBlockId === child.id} data-studio-hovered={hoveredBlockId === child.id} key={child.id}><BlockField block={child} rootBlocks={rootBlocks} document={document} selectedBlockId={selectedBlockId} hoveredBlockId={hoveredBlockId} pendingColumnsLayoutBlockId={pendingColumnsLayoutBlockId} onColumnsLayoutSelected={onColumnsLayoutSelected} coverImageUrl={coverImageUrl} onOpenCoverMediaLibrary={onOpenCoverMediaLibrary} onRemoveCoverImage={onRemoveCoverImage} mediaUrls={mediaUrls} mediaUrl={child.type === "image" && child.mediaId ? mediaUrl : undefined} onTableCellFocus={onTableCellFocus} onTextSelection={onTextSelection} onLinkActivate={onLinkActivate} onSplitParagraph={onSplitParagraph} onMergeParagraphBackward={onMergeParagraphBackward} onSplitParagraphs={onSplitParagraphs} onOpenNestedInserter={onOpenNestedInserter} writable={writable} onInsertNestedBlock={onInsertNestedBlock} onChange={(next) => onChange({ ...block, children: block.children.map((candidate) => candidate.id === child.id ? next : candidate) })} /></div>)}<button type="button" className="nested-add-block" onClick={() => onOpenNestedInserter?.(block.id)}><StudioIcon name="add" size={16} /> Add block</button></Group>; }
  return <div className={`divider-field${block.type === "divider" && blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`}><span className={`content-divider is-${block.type === "divider" ? block.style ?? "default" : "default"}`} /></div>;
}

function CodeEditor({ value, language, className, onChange }: { value: string; language?: string; className?: string; onChange: (value: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const highlighted = highlightCode(value, language);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const resize = () => {
      textarea.style.height = "0px";
      textarea.style.height = `${textarea.scrollHeight}px`;
      syncScroll();
    };
    let animationFrame = 0;
    const scheduleResize = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        animationFrame = 0;
        resize();
      });
    };
    scheduleResize();
    let width = textarea.clientWidth;
    const observedElement = textarea.parentElement ?? textarea;
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth !== width) { width = textarea.clientWidth; scheduleResize(); }
    });
    observer.observe(observedElement);
    return () => {
      observer.disconnect();
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [value, language]);

  function syncScroll() {
    const textarea = textareaRef.current;
    const highlightedCode = highlightRef.current;
    if (!textarea || !highlightedCode) return;
    highlightedCode.scrollTop = textarea.scrollTop;
    highlightedCode.scrollLeft = textarea.scrollLeft;
  }

  return (
    <div className={`code-editor-shell${className ? ` ${className}` : ""}`}>
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

export type RichTextEditorProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  fitText?: boolean;
  fitTextSignature?: string;
  as?: "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "dt" | "dd";
  text: string;
  runs?: RichTextRun[];
  mediaUrls?: Record<string, string>;
  onChange: (text: string, runs: RichTextRun[]) => void;
  onSelectionChange: (selection: TextSelection | null) => void;
  onLinkActivate: (selection: TextSelection) => void;
  onSplitParagraph?: (beforeRuns: RichTextRun[], afterRuns: RichTextRun[]) => string | null;
  onMergeParagraphBackward?: () => { blockId: string; offset: number } | null;
  onSplitParagraphs?: (paragraphs: RichTextRun[][]) => string[] | null;
};

export function RichTextEditor({ as: elementName = "div", text, runs, mediaUrls = {}, onChange, onSelectionChange, onLinkActivate, onSplitParagraph, onMergeParagraphBackward, onSplitParagraphs, onKeyDown: onKeyDownProp, className, fitText = false, fitTextSignature = "", ...props }: RichTextEditorProps) {
  const Tag = elementName as "div";
  const editorRef = useRef<HTMLDivElement>(null);
  const normalizationAttemptRef = useRef<string | null>(null);
  const renderedRuns = runs?.length ? runs : textToRuns(text);
  useFitText(editorRef, fitText, typeof props.style?.fontSize === "string" ? props.style.fontSize : "", `${text}|${className}|${fitTextSignature}|${props.style?.fontFamily}|${props.style?.fontWeight}|${props.style?.fontStyle}|${props.style?.letterSpacing}|${props.style?.lineHeight}`);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = runsToEditorHtml(renderedRuns, mediaUrls);
    if (editor.innerHTML === html) return;
    const selection = selectionWithinEditor(editor);
    editor.innerHTML = html;
    if (selection) restoreEditorSelection(editor, selection);
  }, [renderedRuns, mediaUrls]);

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
    normalizationAttemptRef.current = null;
    onChange(plainTextFromRuns(nextRuns), nextRuns);
    readSelection();
  }

  function splitLegacyParagraphsOnFocus(editor: HTMLElement) {
    if (!onSplitParagraphs) return;
    const sourceRuns = editorToRuns(editor);
    const sourceText = plainTextFromRuns(sourceRuns);
    if (normalizationAttemptRef.current === sourceText) return;
    const paragraphs = splitRunsAtBlankLines(sourceRuns);
    if (paragraphs.length < 2) return;
    const blockId = editor.dataset.studioBlockId ?? editor.dataset.blockId;
    if (!blockId) return;
    normalizationAttemptRef.current = sourceText;
    const selection = window.getSelection();
    const focusOffset = selection?.focusNode && editor.contains(selection.focusNode)
      ? editorTextOffset(editor, selection.focusNode, selection.focusOffset)
      : 0;
    let targetIndex = paragraphs.findIndex(part => focusOffset <= part.end);
    if (targetIndex < 0) targetIndex = paragraphs.length - 1;
    const targetOffset = Math.max(0, focusOffset - paragraphs[targetIndex].start);
    const ids = onSplitParagraphs(paragraphs.map(part => part.runs));
    if (!ids || ids.length !== paragraphs.length) return;
    onSelectionChange(null);
    window.requestAnimationFrame(() => {
      const target = [...document.querySelectorAll<HTMLElement>(".rich-text-editor")]
        .find(candidate => candidate.dataset.studioBlockId === ids[targetIndex] || candidate.dataset.blockId === ids[targetIndex]);
      if (target) focusRichTextEditorAtOffset(target, targetOffset);
    });
  }

  function moveCaretBetweenEditors(event: ReactKeyboardEvent<HTMLDivElement>) {
    const editor = editorRef.current;
    if (!editor || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false;
    if (event.key === "ArrowRight") {
      const selection = window.getSelection();
      if (!editor.classList.contains("paragraph-field") || !selection?.isCollapsed || !selection.focusNode || !editor.contains(selection.focusNode)) return false;
      const caretOffset = editorTextOffset(editor, selection.focusNode, selection.focusOffset);
      const editorEnd = editorTextOffset(editor, editor, editor.childNodes.length);
      if (caretOffset !== editorEnd) return false;
      const paragraphs = [...document.querySelectorAll<HTMLElement>(".rich-text-editor.paragraph-field[data-studio-block-id]")]
        .filter(candidate => candidate.isContentEditable && candidate.getClientRects().length > 0);
      const target = paragraphs[paragraphs.indexOf(editor) + 1];
      if (!target) {
        const blockPosition = editor.closest(".block-position");
        const nextPosition = blockPosition?.nextElementSibling;
        const appender = nextPosition?.classList.contains("canvas-appender")
          ? nextPosition.querySelector<HTMLInputElement>("input[placeholder='Type / to choose a block']")
          : null;
        if (!appender) return false;
        event.preventDefault();
        appender.focus({ preventScroll: true });
        appender.setSelectionRange(appender.value.length, appender.value.length);
        return true;
      }
      event.preventDefault();
      focusRichTextEditorAtOffset(target, 0);
      return true;
    }
    if (event.key === "ArrowLeft") {
      const selection = window.getSelection();
      if (!editor.classList.contains("paragraph-field") || !selection?.isCollapsed || !selection.focusNode || !editor.contains(selection.focusNode)) return false;
      const caretOffset = editorTextOffset(editor, selection.focusNode, selection.focusOffset);
      if (caretOffset !== 0) return false;
      const paragraphs = [...document.querySelectorAll<HTMLElement>(".rich-text-editor.paragraph-field[data-studio-block-id]")]
        .filter(candidate => candidate.isContentEditable && candidate.getClientRects().length > 0);
      const target = paragraphs[paragraphs.indexOf(editor) - 1];
      if (!target) return false;
      const targetEnd = editorTextOffset(target, target, target.childNodes.length);
      event.preventDefault();
      focusRichTextEditorAtOffset(target, targetEnd);
      return true;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return false;
    const selection = window.getSelection();
    if (!selection?.isCollapsed || !selection.focusNode || !editor.contains(selection.focusNode)) return false;
    const caret = document.createRange();
    caret.setStart(selection.focusNode, selection.focusOffset);
    caret.collapse(true);
    const caretRect = caret.getBoundingClientRect();
    const content = document.createRange();
    content.selectNodeContents(editor);
    const lineRects = [...content.getClientRects()].filter(rect => rect.height > 0);
    const editorRect = editor.getBoundingClientRect();
    const firstLineTop = lineRects.length ? Math.min(...lineRects.map(rect => rect.top)) : editorRect.top;
    const lastLineBottom = lineRects.length ? Math.max(...lineRects.map(rect => rect.bottom)) : editorRect.bottom;
    const direction = event.key === "ArrowUp" ? -1 : 1;
    const editorLineHeight = Number.parseFloat(getComputedStyle(editor).lineHeight) || caretRect.height;
    const edgeTolerance = Math.max(3, Math.min(caretRect.height, editorLineHeight * 0.7));
    const atEdge = direction < 0
      ? caretRect.top <= firstLineTop + edgeTolerance
      : caretRect.bottom >= lastLineBottom - edgeTolerance;
    if (!atEdge) return false;
    const editors = [...document.querySelectorAll<HTMLElement>(".rich-text-editor")].filter(candidate => candidate.isContentEditable && candidate.getClientRects().length > 0);
    const target = editors[editors.indexOf(editor) + direction];
    const blockPosition = editor.closest(".block-position");
    const nextIsAppender = direction > 0 && blockPosition?.nextElementSibling?.classList.contains("canvas-appender");
    const appender = nextIsAppender
      ? blockPosition?.nextElementSibling?.querySelector<HTMLInputElement>("input[placeholder='Type / to choose a block']")
      : null;
    if (appender && (!target || target.closest(".block-position") !== blockPosition)) {
      event.preventDefault();
      appender.focus({ preventScroll: true });
      appender.setSelectionRange(appender.value.length, appender.value.length);
      return true;
    }
    if (!target) return false;
    const targetRect = target.getBoundingClientRect();
    const lineHeight = Number.parseFloat(getComputedStyle(target).lineHeight) || caretRect.height || 20;
    const x = Math.max(targetRect.left + 1, Math.min(caretRect.left, targetRect.right - 1));
    const y = direction < 0 ? targetRect.bottom - lineHeight / 2 : targetRect.top + lineHeight / 2;
    const targetDocument = target.ownerDocument as Document & {
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    const caretPosition = targetDocument.caretPositionFromPoint?.(x, y);
    const point = caretPosition && target.contains(caretPosition.offsetNode)
      ? { node: caretPosition.offsetNode, offset: caretPosition.offset }
      : (() => {
          const range = targetDocument.caretRangeFromPoint?.(x, y);
          return range && target.contains(range.startContainer) ? { node: range.startContainer, offset: range.startOffset } : null;
        })();
    if (!point) return false;
    event.preventDefault();
    target.focus({ preventScroll: true });
    const nextRange = document.createRange();
    nextRange.setStart(point.node, point.offset);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    return true;
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    onKeyDownProp?.(event);
    if (event.defaultPrevented || moveCaretBetweenEditors(event)) return;
    if (event.key === "Backspace" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && onMergeParagraphBackward) {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (editor && selection?.isCollapsed && selection.rangeCount > 0 && editor.contains(selection.anchorNode) && editor.contains(selection.focusNode)) {
        const range = selection.getRangeAt(0);
        if (editorTextOffset(editor, range.startContainer, range.startOffset) === 0) {
          const merged = onMergeParagraphBackward();
          if (merged) {
            event.preventDefault();
            onSelectionChange(null);
            window.requestAnimationFrame(() => {
              const target = [...document.querySelectorAll<HTMLElement>(".rich-text-editor")]
                .find((candidate) => candidate.dataset.studioBlockId === merged.blockId || candidate.dataset.blockId === merged.blockId);
              if (target) focusRichTextEditorAtOffset(target, merged.offset);
            });
            return;
          }
        }
      }
    }
    if (event.key !== "Enter" || event.shiftKey || !onSplitParagraph) return;
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return;
    event.preventDefault();

    const range = selection.getRangeAt(0);
    const sourceRuns = editorToRuns(editor);
    const sourceLength = plainTextFromRuns(sourceRuns).length;
    const firstOffset = Math.min(editorTextOffset(editor, range.startContainer, range.startOffset), sourceLength);
    const secondOffset = Math.min(editorTextOffset(editor, range.endContainer, range.endOffset), sourceLength);
    const selectionStart = Math.min(firstOffset, secondOffset);
    const selectionEnd = Math.max(firstOffset, secondOffset);
    const beforeRuns = sliceRichRuns(sourceRuns, 0, selectionStart);
    const afterRuns = sliceRichRuns(sourceRuns, selectionEnd, plainTextFromRuns(sourceRuns).length);
    const nextBlockId = onSplitParagraph(beforeRuns, afterRuns);
    onSelectionChange(null);
    if (!nextBlockId) return;

    window.requestAnimationFrame(() => {
      const nextEditor = [...document.querySelectorAll<HTMLElement>(".rich-text-editor")]
        .find((element) => element.dataset.studioBlockId === nextBlockId || element.dataset.blockId === nextBlockId);
      if (!nextEditor) return;
      nextEditor.focus();
      const nextRange = document.createRange();
      nextRange.selectNodeContents(nextEditor);
      nextRange.collapse(true);
      const nextSelection = window.getSelection();
      nextSelection?.removeAllRanges();
      nextSelection?.addRange(nextRange);
    });
  }

  // Select links in-place and show their Gutenberg-style controls instead of navigating away from Studio.
  return <Tag {...props} ref={editorRef} className={`${className ?? ""} rich-text-editor`} contentEditable role="textbox" tabIndex={0} aria-multiline="true" suppressContentEditableWarning onInput={handleInput} onKeyDown={handleKeyDown} onSelect={readSelection} onKeyUp={readSelection} onMouseUp={(event) => { readSelection(); splitLegacyParagraphsOnFocus(event.currentTarget); }} onFocus={(event) => { props.onFocus?.(event); readSelection(); const editor = event.currentTarget; window.requestAnimationFrame(() => { if (document.activeElement === editor) splitLegacyParagraphsOnFocus(editor); }); }} onClick={(event) => {
    const link = (event.target as HTMLElement).closest("a");
    if (!link || !editorRef.current?.contains(link)) return;
    event.preventDefault();
    const range = document.createRange();
    range.selectNodeContents(link);
    const nextSelection = { start: editorOffset(editorRef.current, range.startContainer, range.startOffset), end: editorOffset(editorRef.current, range.endContainer, range.endOffset) };
    const nativeSelection = window.getSelection();
    nativeSelection?.removeAllRanges();
    nativeSelection?.addRange(range);
    onSelectionChange(nextSelection);
    onLinkActivate(nextSelection);
  }} />;
}

function preserveTextSelection(event: ReactMouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}

function caretRangeAtPoint(x: number, y: number) {
  const target = document.elementFromPoint(x, y);
  if (!(target instanceof Element) || !target.closest(".canvas-block") || target.closest(".canvas-block-toolbar, button, input, textarea, select, [role=\"button\"]")) return null;
  const browserDocument = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const caret = browserDocument.caretPositionFromPoint?.(x, y);
  if (caret) {
    const range = document.createRange();
    range.setStart(caret.offsetNode, caret.offset);
    range.collapse(true);
    return range;
  }
  const range = browserDocument.caretRangeFromPoint?.(x, y) ?? null;
  if (!range) return null;
  range.collapse(true);
  return range;
}

function editorOffset(root: HTMLElement, container: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(container, offset);
  return range.toString().length;
}

function editorTextOffset(root: HTMLElement, container: Node, offset: number) {
  function nodeLength(node: Node): number {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent?.length ?? 0;
    if (node.nodeType !== Node.ELEMENT_NODE) return 0;
    const element = node as HTMLElement;
    if (element.tagName === "BR") return 1;
    const childrenLength = Array.from(element.childNodes).reduce((total, child) => total + nodeLength(child), 0);
    return childrenLength + (element.tagName === "DIV" || element.tagName === "P" ? 1 : 0);
  }

  function countBefore(node: Node): number | null {
    if (node === container) {
      if (node.nodeType === Node.TEXT_NODE) return Math.max(0, Math.min(offset, node.textContent?.length ?? 0));
      return Array.from(node.childNodes).slice(0, Math.max(0, Math.min(offset, node.childNodes.length))).reduce((total, child) => total + nodeLength(child), 0);
    }
    let total = 0;
    for (const child of Array.from(node.childNodes)) {
      if (child === container || child.contains(container)) {
        const nested = countBefore(child);
        return nested === null ? null : total + nested;
      }
      total += nodeLength(child);
    }
    return null;
  }

  return countBefore(root) ?? 0;
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
  const safeOffset = (point: { node: Node; offset: number }) => Math.min(Math.max(0, point.offset), point.node.nodeType === Node.TEXT_NODE ? point.node.nodeValue?.length ?? 0 : point.node.childNodes.length);
  range.setStart(start.node, safeOffset(start));
  range.setEnd(end.node, safeOffset(end));
  const nativeSelection = window.getSelection();
  if (!nativeSelection) return;
  nativeSelection.removeAllRanges();
  nativeSelection.addRange(range);
}

function editorPointAtOffset(editor: HTMLElement, targetOffset: number) {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  let lastTextNode: Node | null = null;
  let offset = 0;
  const target = Number.isFinite(targetOffset) ? Math.max(0, Math.trunc(targetOffset)) : 0;
  while (node) {
    const length = node.nodeValue?.length ?? 0;
    if (target <= offset + length) return { node, offset: target - offset };
    offset += length;
    lastTextNode = node;
    node = walker.nextNode();
  }
  // Undo may shorten the content or end it in an inline element. DOM Range
  // element offsets count child nodes, never characters in textContent.
  return lastTextNode ? { node: lastTextNode, offset: lastTextNode.nodeValue?.length ?? 0 } : { node: editor, offset: 0 };
}

function applyCrossBlockSelection(start: Range, end: Range) {
  const selection = window.getSelection();
  if (!selection) return;
  if (selection.setBaseAndExtent) {
    selection.setBaseAndExtent(start.startContainer, start.startOffset, end.startContainer, end.startOffset);
    return;
  }
  const range = document.createRange();
  if (start.compareBoundaryPoints(Range.START_TO_START, end) <= 0) {
    range.setStart(start.startContainer, start.startOffset);
    range.setEnd(end.startContainer, end.startOffset);
  } else {
    range.setStart(end.startContainer, end.startOffset);
    range.setEnd(start.startContainer, start.startOffset);
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function runsToEditorHtml(runs: RichTextRun[], mediaUrls: Record<string, string> = {}) {
  return runs.map((run) => {
    let html = escapeHtml(run.text).replace(/\n/g, "<br>");
    for (const mark of run.marks ?? []) {
      if (mark === "bold") html = `<strong>${html}</strong>`;
      else if (mark === "italic") html = `<em>${html}</em>`;
      else if (mark === "strikethrough") html = `<s>${html}</s>`;
      else if (mark === "inline-code") html = `<code>${html}</code>`;
      else if (mark === "subscript") html = `<sub>${html}</sub>`;
      else if (mark === "superscript") html = `<sup>${html}</sup>`;
      else if (mark === "keyboard") html = `<kbd>${html}</kbd>`;
      else if (typeof mark !== "string" && mark.type === "highlight") {
        const style = [mark.textColor && `color:${escapeHtml(mark.textColor)}`, mark.backgroundColor && `background-color:${escapeHtml(mark.backgroundColor)}`].filter(Boolean).join(";");
        html = `<mark${style ? ` style="${style}"` : ""}>${html}</mark>`;
      } else if (typeof mark !== "string" && mark.type === "language") html = `<span lang="${escapeHtml(mark.language)}" dir="${mark.direction}">${html}</span>`;
      else if (typeof mark !== "string" && mark.type === "math") html = `<span data-inline-math="true"${mark.latex ? ` data-math-latex="${escapeHtml(mark.latex)}"` : ""}${mark.mathml ? ` data-mathml="${escapeHtml(mark.mathml)}"` : ""} data-math-alt="${escapeHtml(mark.alternativeText)}">${html}</span>`;
      else if (typeof mark !== "string" && mark.type === "inline-image") {
        const source = mark.mediaId ? safeImageSource(mediaUrls[mark.mediaId] ?? "", { allowBlob: true }) : null;
        const fallbackSource = source ?? safeImageSource(mark.src ?? "");
        const image = fallbackSource ? `<img src="${escapeHtml(fallbackSource)}" alt="${escapeHtml(mark.alt)}"${mark.width ? ` width="${mark.width}"` : ""} />` : `<span>${escapeHtml(mark.alt)}</span>`;
        html = `<span contenteditable="false" class="rich-text-inline-image" data-inline-image="true"${mark.mediaId ? ` data-media-id="${escapeHtml(mark.mediaId)}"` : ""}${mark.src ? ` data-image-src="${escapeHtml(mark.src)}"` : ""} data-inline-text="${escapeHtml(run.text)}" data-image-alt="${escapeHtml(mark.alt)}"${mark.width ? ` data-image-width="${mark.width}"` : ""}>${image}<span class="rich-text-inline-image-offset" aria-hidden="true">${escapeHtml(run.text)}</span></span>`;
      } else if (typeof mark !== "string" && mark.type === "footnote") html = `<span data-footnote-ref="${escapeHtml(mark.id)}">${html}<sup data-footnote-marker="true">†</sup></span>`;
      else {
        const href = safeTextLink(mark.url);
        if (href) html = `<a href="${escapeHtml(href)}"${mark.opensInNewTab ? " target=\"_blank\" rel=\"noopener noreferrer\"" : ""}>${html}</a>`;
      }
    }
    return html;
  }).join("");
}

function sliceRichRuns(runs: RichTextRun[], start: number, end: number) {
  let offset = 0;
  return normaliseTextRuns(runs.flatMap((run) => {
    const runStart = offset;
    const runEnd = runStart + run.text.length;
    offset = runEnd;
    const sliceStart = Math.max(start, runStart);
    const sliceEnd = Math.min(end, runEnd);
    if (sliceEnd <= sliceStart) return [];
    return [{ text: run.text.slice(sliceStart - runStart, sliceEnd - runStart), marks: run.marks?.length ? [...run.marks] : undefined }];
  }));
}

function splitRunsAtBlankLines(runs: RichTextRun[]) {
  const text = plainTextFromRuns(runs);
  const parts: { runs: RichTextRun[]; start: number; end: number }[] = [];
  const separators = /\n[\t ]*\n+/g;
  let start = 0;
  for (const match of text.matchAll(separators)) {
    const separatorStart = match.index ?? start;
    if (separatorStart > start) parts.push({ runs: sliceRichRuns(runs, start, separatorStart), start, end: separatorStart });
    start = separatorStart + match[0].length;
  }
  if (start < text.length) parts.push({ runs: sliceRichRuns(runs, start, text.length), start, end: text.length });
  return parts;
}

function focusRichTextEditorAtOffset(editor: HTMLElement, requestedOffset: number) {
  const target = Math.max(0, Math.trunc(requestedOffset));
  let offset = 0;
  function findPoint(node: Node): { node: Node; offset: number } | null {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;
      if (target <= offset + length) return { node, offset: target - offset };
      offset += length;
      return null;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const element = node as HTMLElement;
    if (element.tagName === "BR") {
      if (target <= offset) return { node: element.parentNode ?? editor, offset: element.parentNode ? Array.prototype.indexOf.call(element.parentNode.childNodes, element) : 0 };
      offset += 1;
      if (target <= offset) return { node: element.parentNode ?? editor, offset: element.parentNode ? Array.prototype.indexOf.call(element.parentNode.childNodes, element) + 1 : 0 };
      return null;
    }
    for (const child of Array.from(element.childNodes)) {
      const point = findPoint(child);
      if (point) return point;
    }
    return null;
  }
  const point = findPoint(editor) ?? { node: editor, offset: editor.childNodes.length };
  editor.focus({ preventScroll: true });
  const range = document.createRange();
  range.setStart(point.node, point.offset);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
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
    if (element.dataset.inlineImage === "true") {
      const src = safeImageSource(element.dataset.imageSrc ?? "");
      const mediaId = element.dataset.mediaId;
      if (mediaId || src) runs.push({ text: element.dataset.inlineText ?? "", marks: [...inheritedMarks, { type: "inline-image", mediaId: mediaId || undefined, src: src ?? undefined, alt: element.dataset.imageAlt ?? "", width: Number(element.dataset.imageWidth) || undefined }] });
      return;
    }
    if (element.tagName === "MATH") {
      runs.push({ text: element.textContent ?? "", marks: [...inheritedMarks, { type: "math", mathml: element.outerHTML, alternativeText: element.getAttribute("aria-label") ?? element.textContent ?? "Mathematical expression" }] });
      return;
    }
    const marks = [...inheritedMarks];
    if (element.tagName === "STRONG" || element.tagName === "B") marks.push("bold");
    if (element.tagName === "EM" || element.tagName === "I") marks.push("italic");
    if (["S", "STRIKE", "DEL"].includes(element.tagName)) marks.push("strikethrough");
    if (element.tagName === "CODE") marks.push("inline-code");
    if (element.tagName === "SUB") marks.push("subscript");
    if (element.tagName === "SUP") marks.push("superscript");
    if (element.tagName === "KBD") marks.push("keyboard");
    if (element.dataset.inlineMath === "true") marks.push({ type: "math", latex: element.dataset.mathLatex, mathml: element.dataset.mathml, alternativeText: element.dataset.mathAlt ?? element.textContent ?? "" });
    if (element.dataset.footnoteRef) marks.push({ type: "footnote", id: element.dataset.footnoteRef });
    if (element.tagName === "MARK") marks.push({ type: "highlight", textColor: element.style.color || undefined, backgroundColor: element.style.backgroundColor || undefined });
    if (element.lang) marks.push({ type: "language", language: element.lang, direction: element.dir === "rtl" ? "rtl" : "ltr" });
    if (element.tagName === "A") {
      const href = safeTextLink(element.getAttribute("href") ?? "");
      if (href) marks.push({ type: "link", url: href, opensInNewTab: element.getAttribute("target") === "_blank" || undefined });
    }
    element.childNodes.forEach((child) => {
      if (child instanceof HTMLElement && child.dataset.footnoteMarker === "true") return;
      visit(child, marks);
    });
    if (element.tagName === "DIV" || element.tagName === "P") runs.push({ text: "\n" });
  }
  editor.childNodes.forEach((node) => visit(node, []));
  const nextRuns = normaliseTextRuns(runs);
  const last = nextRuns[nextRuns.length - 1];
  if (last?.text.endsWith("\n")) last.text = last.text.slice(0, -1);
  return normaliseTextRuns(nextRuns);
}

function AlignmentIcon({ align }: { align: TextAlignment }) {
  const icons: Record<TextAlignment, IconName> = { left: "text.align-left", centre: "text.align-centre", right: "text.align-right" };
  return <StudioHoverIcon name={icons[align]} />;
}

// Native textareas include glyph overflow in their height. Apply the same
// measurement to preview headings so later fields cannot shift between modes.
// Observe the stable wrapper instead of the element whose height is mutated;
// this avoids a ResizeObserver feedback loop during layout changes.
function useFittedTextHeight<T extends HTMLElement>(value: unknown, active = true) {
  const textRef = useRef<T>(null);
  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element || !active) return;
    const resize = () => {
      element.style.height = "0px";
      // scrollHeight excludes borders, whereas our fields use border-box sizing.
      element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
    };
    let animationFrame = 0;
    const scheduleResize = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        animationFrame = 0;
        resize();
      });
    };
    scheduleResize();
    let width = element.clientWidth;
    const observedElement = element.parentElement ?? element;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth !== width) { width = element.clientWidth; scheduleResize(); }
    });
    observer.observe(observedElement);
    return () => {
      observer.disconnect();
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [value, active]);
  return textRef;
}

function AutoResizeTextarea({ value, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const textareaRef = useFittedTextHeight<HTMLTextAreaElement>(value);
  return <textarea {...props} ref={textareaRef} rows={1} value={value} />;
}

function ListField({ block, mediaUrls, onSelectionChange, onLinkActivate, onChange }: { block: EditableListBlock; mediaUrls: Record<string, string>; onSelectionChange?: (block: EditableListBlock, index: number, selection: TextSelection | null) => void; onLinkActivate?: (block: EditableListBlock, index: number, selection: TextSelection) => void; onChange: (block: ContentBlock) => void }) {
  const items = block.items.length ? block.items : [""];
  const listRef = useRef<HTMLDivElement>(null);
  function updateItem(index: number, value: string, runs: RichTextRun[]) {
    const nextItems = [...items];
    nextItems[index] = runs.some((run) => run.marks?.length) ? { text: value, runs } : value;
    onChange({ ...block, items: nextItems });
  }
  function focusItem(index: number) {
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(`[data-list-item-index="${index}"]`)?.focus();
    });
  }
  function removeItem(index: number, focusIndex?: number) {
    const nextItems = items.filter((_, itemIndex) => itemIndex !== index);
    onChange({ ...block, items: nextItems.length ? nextItems : [""] });
    if (focusIndex !== undefined) focusItem(Math.min(Math.max(focusIndex, 0), Math.max(nextItems.length - 1, 0)));
  }
  return (
    <div ref={listRef} className={`list-field-editor is-${block.style}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`}>
      {items.map((item, index) => (
        <div className="list-field-row" key={`${block.id}-item-${index}`}>
          <span className="list-field-marker" aria-hidden="true">{block.style === "ordered" ? listMarker(block, index) : "•"}</span>
          <RichTextEditor className="list-item-editor" data-studio-block-id={block.id} data-list-item-index={index} text={listItemText(item)} runs={typeof item === "string" ? undefined : item.runs} mediaUrls={mediaUrls} onChange={(text, runs) => updateItem(index, text, runs)} onSelectionChange={(selection) => onSelectionChange?.(block, index, selection)} onLinkActivate={(selection) => onLinkActivate?.(block, index, selection)} onSplitParagraph={(beforeRuns, afterRuns) => {
            const nextItems: ListItem[] = [...items];
            nextItems[index] = beforeRuns.some((run) => run.marks?.length) ? { text: plainTextFromRuns(beforeRuns), runs: beforeRuns } : plainTextFromRuns(beforeRuns);
            nextItems.splice(index + 1, 0, afterRuns.some((run) => run.marks?.length) ? { text: plainTextFromRuns(afterRuns), runs: afterRuns } : plainTextFromRuns(afterRuns));
            onChange({ ...block, items: nextItems });
            focusItem(index + 1);
            return null;
          }} onKeyDown={(event) => { if (event.key === "Backspace" && !event.shiftKey && listItemText(item).length === 0 && items.length > 1) { event.preventDefault(); removeItem(index, index - 1); } }} aria-label={`${block.style === "ordered" ? "Numbered" : "Bulleted"} list item ${index + 1}`} data-placeholder="List item" />
        </div>
      ))}
    </div>
  );
}

export function TableField({ block, onCellFocus, onChange }: { block: Extract<ContentBlock, { type: "table" }>; onCellFocus: (rowIndex: number, columnIndex: number) => void; onChange: (block: ContentBlock) => void }) {
  const rows = block.rows.length ? block.rows : [[""]];
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const normalisedRows = rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] ?? ""));
  const tableRef = useRef<HTMLTableElement>(null);
  const [resizeDraft, setResizeDraft] = useState<{ columnWidths: number[]; rowHeights: number[]; kind: "column" | "row"; index: number } | null>(null);
  const resizeRef = useRef<{
    pointerId: number; kind: "column" | "row"; index: number; start: number;
    tableWidth: number; columnWidths: number[]; rowHeights: number[];
    nextColumns: number[]; nextRows: number[]; moved: boolean;
  } | null>(null);
  const columnWidths = resizeDraft?.columnWidths ?? normaliseTableColumnWidths(columnCount, block.columnWidths);
  const rowHeights = resizeDraft?.rowHeights ?? normaliseTableRowHeights(normalisedRows.length, block.rowHeights);
  const hasFooterRow = Boolean(block.hasFooter && normalisedRows.length > (block.hasHeader ? 1 : 0));

  function updateCell(rowIndex: number, columnIndex: number, value: string) {
    const nextRows = normalisedRows.map((row) => [...row]);
    nextRows[rowIndex][columnIndex] = value;
    onChange({ ...block, rows: nextRows });
  }

  function beginResize(event: React.PointerEvent<HTMLButtonElement>, kind: "column" | "row", index: number) {
    if (event.button !== 0 || !event.isPrimary || !tableRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      pointerId: event.pointerId, kind, index,
      start: kind === "column" ? event.clientX : event.clientY,
      tableWidth: tableRef.current.getBoundingClientRect().width,
      columnWidths, rowHeights, nextColumns: columnWidths, nextRows: rowHeights, moved: false,
    };
    setResizeDraft({ columnWidths, rowHeights, kind, index });
  }

  function moveResize(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = resizeRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = (drag.kind === "column" ? event.clientX : event.clientY) - drag.start;
    // Clicks, including a double-click to fit, must not create undo entries.
    if (!drag.moved && Math.abs(delta) < 2) return;
    drag.moved = true;
    if (drag.kind === "column") {
      drag.nextColumns = resizeTableColumn(drag.columnWidths, drag.index, delta / drag.tableWidth * 100);
    } else {
      drag.nextRows = [...drag.rowHeights];
      drag.nextRows[drag.index] = Math.max(DEFAULT_TABLE_ROW_HEIGHT, drag.rowHeights[drag.index] + delta);
    }
    setResizeDraft({ columnWidths: drag.nextColumns, rowHeights: drag.nextRows, kind: drag.kind, index: drag.index });
  }

  function endResize(event: React.PointerEvent<HTMLButtonElement>, cancelled = false) {
    const drag = resizeRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    resizeRef.current = null;
    setResizeDraft(null);
    if (!cancelled && drag.moved) {
      onChange(drag.kind === "column" ? { ...block, columnWidths: drag.nextColumns } : { ...block, rowHeights: drag.nextRows });
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function optimiseColumn(index: number) {
    const table = tableRef.current;
    if (!table) return;
    const probe = document.createElement("span");
    Object.assign(probe.style, { position: "absolute", visibility: "hidden", pointerEvents: "none", whiteSpace: "pre", width: "max-content" });
    table.parentElement?.append(probe);
    let width = DEFAULT_TABLE_ROW_HEIGHT;
    try {
      for (const row of table.rows) {
        const editor = row.cells[index]?.querySelector("textarea");
        if (!editor) continue;
        const style = getComputedStyle(editor);
        probe.style.font = style.font;
        probe.style.letterSpacing = style.letterSpacing;
        probe.style.tabSize = style.tabSize;
        probe.textContent = editor.value;
        width = Math.max(width, probe.getBoundingClientRect().width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 2);
      }
    } finally {
      probe.remove();
    }
    onChange({ ...block, columnWidths: fitTableColumn(columnWidths, index, Math.ceil(width) / table.getBoundingClientRect().width * 100) });
  }

  function optimiseRow(index: number) {
    const row = tableRef.current?.rows[index];
    if (!row) return;
    let height = DEFAULT_TABLE_ROW_HEIGHT;
    for (const editor of row.querySelectorAll("textarea")) {
      const previousHeight = editor.style.height;
      const previousScroll = editor.scrollTop;
      // Measure wrapped content independently of the row's current height.
      editor.style.height = "0px";
      height = Math.max(height, editor.scrollHeight + 1);
      editor.style.height = previousHeight;
      editor.scrollTop = previousScroll;
    }
    const nextHeights = [...rowHeights];
    nextHeights[index] = Math.ceil(height);
    onChange({ ...block, rowHeights: nextHeights });
  }

  function resizeColumnFromKeyboard(index: number, amount: number) {
    onChange({ ...block, columnWidths: resizeTableColumn(columnWidths, index, amount) });
  }

  function resizeRowFromKeyboard(index: number, amount: number) {
    const nextHeights = [...rowHeights];
    nextHeights[index] = Math.max(nextHeights[index] + amount, DEFAULT_TABLE_ROW_HEIGHT);
    onChange({ ...block, rowHeights: nextHeights });
  }

  function renderRow(row: string[], rowIndex: number, section: "header" | "body" | "footer") {
    const Cell = section === "header" ? "th" : "td";
    return (
      <tr key={`row-${rowIndex}`} style={{ height: rowHeights[rowIndex] }}>
        {row.map((cell, columnIndex) => (
          <Cell key={columnIndex} scope={section === "header" ? "col" : undefined} style={{ textAlign: block.columnAlignments?.[columnIndex] === "centre" ? "center" : block.columnAlignments?.[columnIndex] ?? "left" }}>
            <textarea
              rows={1}
              value={cell}
              onFocus={() => onCellFocus(rowIndex, columnIndex)}
              onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
              aria-label={section === "body" ? `Table row ${rowIndex + 1}, column ${columnIndex + 1}` : `Table ${section} ${columnIndex + 1}`}
            />
          </Cell>
        ))}
      </tr>
    );
  }

  return (
    <div className={`table-field${block.tableStyle === "stripes" ? " is-striped" : ""}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`} data-studio-nested-block-id={block.id}>
      <table className={`table-field-grid${block.fixedWidth === false ? " is-auto-layout" : ""}`} ref={tableRef}>
        {block.caption ? <caption>{block.caption}</caption> : null}
        {block.fixedWidth !== false ? <colgroup>{columnWidths.map((width, index) => <col key={`column-${index}`} style={{ width: `${width}%` }} />)}</colgroup> : null}
        {block.hasHeader ? <thead>{renderRow(normalisedRows[0], 0, "header")}</thead> : null}
        <tbody>{normalisedRows.slice(block.hasHeader ? 1 : 0, hasFooterRow ? -1 : undefined).map((row, rowIndex) => renderRow(row, rowIndex + (block.hasHeader ? 1 : 0), "body"))}</tbody>
        {hasFooterRow ? <tfoot>{renderRow(normalisedRows[normalisedRows.length - 1], normalisedRows.length - 1, "footer")}</tfoot> : null}
      </table>
      {block.fixedWidth !== false ? columnWidths.slice(0, -1).map((_, index) => (
        <button
          className={`table-resize-handle table-column-resize-handle${resizeDraft?.kind === "column" && resizeDraft.index === index ? " is-resizing" : ""}`}
          key={`column-resize-${index}`} type="button"
          style={{ left: `${columnWidths.slice(0, index + 1).reduce((total, width) => total + width, 0)}%` }}
          aria-label={`Resize columns ${index + 1} and ${index + 2}`} title={`Drag to resize. Double-click to fit column ${index + 1}.`}
          onPointerDown={(event) => beginResize(event, "column", index)} onPointerMove={moveResize}
          onPointerUp={endResize} onPointerCancel={(event) => endResize(event, true)} onLostPointerCapture={(event) => endResize(event, true)}
          onDoubleClick={() => optimiseColumn(index)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); resizeColumnFromKeyboard(index, event.key === "ArrowLeft" ? -2 : 2); }
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); optimiseColumn(index); }
            if (event.key === "Escape") { resizeRef.current = null; setResizeDraft(null); }
          }}
        />
      )) : null}
      {rowHeights.map((_, index) => (
        <button
          className={`table-resize-handle table-row-resize-handle${resizeDraft?.kind === "row" && resizeDraft.index === index ? " is-resizing" : ""}`}
          key={`row-resize-${index}`} type="button"
          style={{ top: `${rowHeights.slice(0, index + 1).reduce((total, height) => total + height, 0)}px` }}
          aria-label={`Resize row ${index + 1}`} title={`Drag to resize. Double-click to fit row ${index + 1}.`}
          onPointerDown={(event) => beginResize(event, "row", index)} onPointerMove={moveResize}
          onPointerUp={endResize} onPointerCancel={(event) => endResize(event, true)} onLostPointerCapture={(event) => endResize(event, true)}
          onDoubleClick={() => optimiseRow(index)}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); resizeRowFromKeyboard(index, event.key === "ArrowUp" ? -8 : 8); }
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); optimiseRow(index); }
            if (event.key === "Escape") { resizeRef.current = null; setResizeDraft(null); }
          }}
        />
      ))}
    </div>
  );
}

/** The same Gutenberg-style table action menu used by top-level tables. */
export function TableControls({ block, activeCell = { rowIndex: 0, columnIndex: 0 }, protectEdges = false, onActiveCellChange, onChange }: { block: Extract<ContentBlock, { type: "table" }>; activeCell?: TableCell; protectEdges?: boolean; onActiveCellChange?: (cell: TableCell) => void; onChange: (block: ContentBlock) => void }) {
  const [open, setOpen] = useState(false);
  function apply(action: TableAction) {
    const rows = (block.rows.length ? block.rows : [[""]]).map((row) => [...row]);
    const columnCount = Math.max(1, ...rows.map((row) => row.length));
    const widths = normaliseTableColumnWidths(columnCount, block.columnWidths);
    const heights = normaliseTableRowHeights(rows.length, block.rowHeights);
    const rowIndex = Math.min(activeCell.rowIndex, rows.length - 1);
    const columnIndex = Math.min(activeCell.columnIndex, columnCount - 1);
    let nextCell = { rowIndex, columnIndex };
    if (action === "insert-row-before" || action === "insert-row-after") {
      const at = action === "insert-row-before" ? rowIndex : rowIndex + 1;
      rows.splice(at, 0, Array.from({ length: columnCount }, () => "")); heights.splice(at, 0, DEFAULT_TABLE_ROW_HEIGHT); nextCell = { rowIndex: at, columnIndex };
    } else if (action === "delete-row") {
      if (rows.length <= 1) return;
      rows.splice(rowIndex, 1); heights.splice(rowIndex, 1); nextCell = { rowIndex: Math.min(rowIndex, rows.length - 1), columnIndex };
    } else if (action === "insert-column-before" || action === "insert-column-after") {
      const at = action === "insert-column-before" ? columnIndex : columnIndex + 1;
      rows.forEach((row) => row.splice(at, 0, "")); const width = widths[columnIndex] / 2;
      if (action === "insert-column-before") { widths.splice(columnIndex, 0, width); widths[columnIndex + 1] = width; }
      else { widths[columnIndex] = width; widths.splice(columnIndex + 1, 0, width); }
      nextCell = { rowIndex, columnIndex: at };
    } else {
      if (columnCount <= 1) return;
      rows.forEach((row) => row.splice(columnIndex, 1)); const removed = widths.splice(columnIndex, 1)[0]; widths[Math.max(0, columnIndex - 1)] += removed; nextCell = { rowIndex, columnIndex: Math.min(columnIndex, columnCount - 2) };
    }
    onChange({ ...block, rows, columnWidths: widths, rowHeights: heights }); onActiveCellChange?.(nextCell); setOpen(false);
  }
  const actions: Array<[TableAction, string]> = [["insert-row-before", "Insert row before"], ["insert-row-after", "Insert row after"], ["delete-row", "Delete row"], ["insert-column-before", "Insert column before"], ["insert-column-after", "Insert column after"], ["delete-column", "Delete column"]];
  const rowProtected = protectEdges && ((block.hasHeader && activeCell.rowIndex === 0) || (block.hasFooter && activeCell.rowIndex === block.rows.length - 1));
  const columnProtected = protectEdges && (activeCell.columnIndex === 0 || activeCell.columnIndex === Math.max(0, block.rows[0]?.length - 1));
  return <div className="table-control"><button className={`table-control-button${open ? " is-active" : ""}`} type="button" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Table options" title="Table options"><TableIcon /></button>{open ? <div className="table-menu" role="menu" aria-label="Table options">{actions.map(([action, label]) => { const disabled = (action === "delete-row" && rowProtected) || (action === "delete-column" && columnProtected); return <button type="button" role="menuitem" key={action} onClick={() => apply(action)} disabled={disabled} title={disabled ? "Scorecard header, footer and boundary columns are kept intact." : undefined}><TableActionIcon action={action} /><span>{label}</span></button>; })}</div> : null}</div>;
}
