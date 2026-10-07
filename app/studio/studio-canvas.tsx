"use client";
import { changeGroupLayout, groupVariationFor, groupVariations } from "./blocks/group-variations";
import { mathRun, mathAtRange, legacyMathAtRange, createMathFromRange, replaceRichTextRuns, restoreMathSource, mathSource } from "../content/math-runs";
import { inlineImageRun, validInlineImageRun, inlineImageAtRange, insertInlineImage } from "../content/inline-image";
import { footnoteReferenceAtRange, insertFootnoteReference } from "../content/footnote-runs";
import { orderedFootnoteEntries } from "../content/footnote-blocks";
import { FootnoteNumbersProvider, useFootnoteNumbers } from "./footnote-numbers-context";
import { canRemoveFootnoteOwners, preservesReferencedFootnotes, reconcileFootnoteBlocks } from "../content/footnote-reconciliation";
import { RichTextEditingProvider } from "./rich-text-editing-context";
import { InlineImagePicker, type InlineImageLibrary } from "./inline-image-picker";
import { InlineImagePopover } from "./inline-image-popover";
import { addDocumentFootnote, addDocumentFootnotes } from "./footnote-command";
import { tableRowSections } from "../content/table-row-sections";
import { editBlockSiblings, moveBlockAmongSiblings, reorderBlockAmongSiblings } from "./block-sibling-operations";
import { moveBlockToTarget } from "./block-placement";
import { columnDropPosition } from "./column-drop-position";
import { fieldSelectOptions } from "../content/field-options";
import { richTextPointAtOffset } from "./rich-text-dom";
import { navigateStudioMenu } from "./overlays/menu";
import { StudioAnchoredMenu } from "./overlays/anchored-menu";
import { StudioAnchoredPopover } from "./overlays/anchored-popover";
import { PopoverHeading } from "./overlays/popover-heading";
import { applyTextLink, removeTextLink, textLinkAtRange } from "../content/text-link";
import { BlockOptionsMenu, type BlockMenuAction, type BlockMenuItem } from "./block-options-menu";
import { BlockEditorialDialog } from "./block-editorial-dialog";
import { marksAtCaret, changeCaretMark } from "../content/caret-formatting";
import { caretFormats, observedCaretFormats, type CaretFormatSnapshot } from "./caret-formatting-command";
import { LanguagePopover } from "./language-popover";
import { languageAtRange, languageRangeAtCaret, validLanguageCode, type LanguageMark } from "../content/language-runs";
import { MathPopover } from "./math-popover";
import type { InlineMath, InlineImage } from "../content/model";
import { HighlightPopover } from "./highlight-popover";
import { highlightColoursAtRange, highlightRangeAtCaret, updateHighlightColour, type HighlightChannel } from "../content/text-highlight";
import { BlockNoteCard } from "./block-note-card";
import { preservesBlockLocks } from "../content/block-editorial";
import { blockMenuSiblingSelection, insertAtBlockSelectionEdge, pasteBlockSelectionAppearance } from "./block-menu-selection";
import { createButtonForInsertion } from "./button-insertion";
import { ButtonLinkControl } from "./button-link-control";
import { clearedLinkDestination, equivalentLinkDestination, sameLinkDestination, updatedLinkDestination } from "../content/link-destination";
import { cloneClipboardBlocks, cloneClipboardPayloadForInsertion, createBlockClipboardPayload, readBlockClipboardPayload, writeBlockClipboard } from "./block-clipboard";
import { copiedBlocksForParent } from "./block-copy";
import { childContentBlocks } from "../content/block-tree";
import { validContentBlocks } from "./workspace-validation";
import { resolveEmbedProvider } from "../content/embed-provider";
import { buttonItemPresentation, buttonsPresentationStyle } from "../content/buttons-presentation";
import { EmbedContent } from "../components/embed-content";
import { TableCaptionControl, TableCaptionProvider } from "./table-caption-control";
import { tablePresentation } from "../content/table-presentation";
import { changedTableStructures, staleTableTextSelection } from "./table-structure-selection";
import { useCallback, useId, useLayoutEffect, useRef, useState, type DragEvent, type FormEvent, type ReactNode, type RefObject } from "react";
import { blockSelectionRange, normaliseBlockSelection, orderedBlockEntries } from "./block-selection.mjs";
import { blockSelectionPointerTarget, markBlockSelectionHosts } from "./block-selection-dom";
import type { IconName } from "@acm/icons";
import { BlockRenderer, renderText } from "../components/content";
import { ArticleMetaIcon } from "../components/article-meta-icon";
import { authorInitials, documentAuthor, documentFieldVisible, formatDocumentDate } from "../content/document-metadata";
import { readingTimeDisplay } from "../content/reading-time";
import { imageDisplayStyle, imageWrapperStyle } from "../content/image-style";
import { resolveImageSource } from "../content/image-source";
import { dividerRuleStyle } from "../content/divider-style";
import { highlightCode } from "../content/code-highlighting.mjs";
import { buttonInteractionClassName, buttonInteractionLayoutCss, buttonVisualCss, fitTextEnabled, paragraphStyleAnchor, paragraphStyleClassName, paragraphStyleToCss, visualStyleClassName } from "../content/paragraph-styles";
import { spacerDimensions, spacerOrientationForChildren, type SpacerOrientation } from "../content/spacer";
import { availableBlockTransforms, transformBlock as transformContentBlock, type BlockTransform } from "./block-transforms";
import { BlockLibraryIcon } from "./block-library-icons";
import { HeadingLevelIcon } from "./controls/heading-level-setting";
import { StudioButton } from "./controls/button";
import { GroupLayoutChooser, GroupLayoutSelection } from "./blocks/group-layout-selection";
import { blockCatalogueGroups, socialIconCatalogue, createBlock } from "./editor-model";
import { SocialIconView, socialIconsBlockClassName, socialIconsColourStyle, socialIconsGapStyle } from "../components/social-icons";
import { StudioIcon } from "./studio-icons";
import { Pane } from "./panes/pane-components";
import { isInteractiveTextMark, plainTextFromRuns, safeImageSource, safeTextLink, textToRuns, updateTextMark, withoutInteractiveTextMarks } from "../content/rich-text";
import { listItemText, type ButtonInteractionState, type ContentBlock, type DocumentRenderContext, type HeadingLevel, type RichTextRun, type TextAlignment, type TextMark } from "../content/model";
import { listItemWithTextRuns } from "../content/list-item-text";
import type { StudioDocument, InsertableBlockType, BlockLibraryItemType } from "./editor-model";
import type { StudioEditableBlockOptions, StudioPresentation } from "./studio-presentation";
import { blockToHtml, blocksToHtml, collectBlockIds, formatHtml, parseHtmlToBlock, parseHtmlToBlocks } from "./studio-html-editor";
import { hasLayoutOptions, layoutDataAttributes, layoutStyleProperties } from "../content/layout";
import { COLUMN_LAYOUT_PRESETS, columnsLayoutStyle, setColumnsLayout } from "../content/columns";
import { blockAlignmentClass, blockAlignmentOptions, contentBlockAlignment } from "../content/block-alignment";
import { validTableActiveCell } from "../content/table-actions";
import { tableCellForTextTarget, type TableCell, type TableTextTarget } from "./table-text-target";
import { findBlockById } from "./studio-command-operations.mjs";
import { TemplateContentLayout, TemplateContentSlot } from "./template-content-slot";
import { embedLinkParagraph } from "./embed-link-conversion";
import { blockInserterOptions, containsTemplateContent, groupAllowsChild, parentOfNestedBlock, permitsBlockTreeChanges } from "./block-inserter-options";
import { findListBlock, updateListItem } from "./list-structure";
import { formatListText, listTextEditor, listTextMarkState, listTextSegments, readListTextSelection, restoreListTextSelection, type ListTextSelection } from "./list-text-selection";
import { type BlockCommandFocusTarget } from "./block-command-focus";
import { RichTextEditor, preserveTextSelection, caretRangeAtPoint, editorOffset, selectionWithinEditor, restoreEditorSelection, applyCrossBlockSelection, focusRichTextEditorAtOffset, AlignmentIcon, useFittedTextHeight, AutoResizeTextarea } from "./blocks/editors/rich-text";
import { ListField } from "./blocks/editors/list";
import { TableField, TableControls } from "./blocks/editors/table";
import { ParagraphEditField } from "./blocks/paragraph/edit-field";
import { StudioHoverIcon } from "./studio-hover-icon";
import { HiddenBlockPlaceholder } from "./blocks/hidden-block-placeholder";
export { RichTextEditor, type RichTextEditorProps } from "./blocks/editors/rich-text";
export { TableField, TableControls } from "./blocks/editors/table";
export { ParagraphEditField } from "./blocks/paragraph/edit-field";

function blockLabel(type: ContentBlock["type"]) {
  if (type === "column") return "Column";
  if (type === "reading-time") return "Reading Time";
  if (type === "post-author") return "Author";
  if (type === "post-date") return "Date";
  if (type === "document-title") return "Title";
  if (type === "document-subtitle") return "Document Subtitle";
  if (type === "cover-image") return "Featured Image";
  if (type === "social-icons") return "Social Icons";
  if (type === "social-linkedin") return "LinkedIn";
  if (type === "social-tiktok") return "TikTok";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function blockChildren(block: ContentBlock) {
  return childContentBlocks(block);
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
  if (block.editorial?.name?.trim()) return block.editorial.name.trim();
  if (block.type === "group" && block.data?.templateElement) return String(block.data.templateElement).replaceAll("-", " ");
  if (block.type === "group" && block.data?.templatePart) return "Shared part";
  if (block.type === "section" && block.role) return block.role.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  if (block.siteRole) return `${block.siteRole.replaceAll("-", " ")}: ${"text" in block ? block.text.slice(0, 36) : "label" in block ? block.label : block.type}`;
  if (block.type === "heading") return `Heading ${block.level}`;
  if (block.type === "component") return block.component.replace("mini-golf-", "Mini Golf ");
  return block.type === "group" ? groupVariationFor(block).label : blockLabel(block.type);
}

type TextSelection = { start: number; end: number };
type LanguageTarget = { documentId: string; ownerId: string; blockId: string; itemIndex?: number; listId?: string; cell?: TableCell; editor: HTMLElement; selection: TextSelection; range: Range | null; baseline: string; blockSnapshot: string; pending?: TextMark[] };
type InlineImageTarget = LanguageTarget & { epoch: number; documentSnapshot: string; image?: InlineImage };
type HighlightTarget = LanguageTarget & { text: string; anchor: { left: number; bottom: number } };
type EditableTextBlock = Extract<ContentBlock, { type: "paragraph" | "heading" | "quote" }>;
type EditableListBlock = Extract<ContentBlock, { type: "list" }>;
type EditableImageCaptionBlock = Extract<ContentBlock, { type: "image" }>;
type EditableTableCaptionBlock = Extract<ContentBlock, { type: "table" }>;
type EditableEmbedCaptionBlock = Extract<ContentBlock, { type: "embed" }>;
type EditableButtonLabelBlock = Extract<ContentBlock, { type: "button" }>;
type EditableRichTextBlock = EditableTextBlock | EditableListBlock | EditableImageCaptionBlock | EditableTableCaptionBlock | EditableEmbedCaptionBlock | EditableButtonLabelBlock;
type BlockAlignedBlock = Extract<ContentBlock, { type: "paragraph" | "heading" | "quote" | "list" | "table" | "code" | "image" | "embed" | "divider" | "group" | "columns" | "document-title" }>;
type LinkTarget = { id: string; title: string; href: string; kind: "page" | "post" };
type LinkEditorState = LanguageTarget & { url: string; text: string; existingUrl: string | null; opensInNewTab: boolean; advancedOpen: boolean; mode: "preview" | "edit"; documentSnapshot: string; returnSelection: TextSelection };
type HtmlEditorState = { documentId: string; blockId: string; initialBlockSnapshot: string; initialDraft: string; draft: string; error: string | null };
type CodeEditorState = { documentId: string; initialDraft: string; initialBlocksSnapshot: string; draft: string; error: string | null };

function isEditableTextBlock(block: ContentBlock): block is EditableTextBlock {
  return block.type === "paragraph" || block.type === "heading" || block.type === "quote";
}

function isEditableRichTextBlock(block: ContentBlock): block is EditableRichTextBlock {
  return isEditableTextBlock(block) || block.type === "list" || block.type === "image" || block.type === "table" || block.type === "embed" || block.type === "button";
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

function richTextContent(block: EditableRichTextBlock, itemIndex = 0, listId = block.type === "list" ? block.id : undefined, cell?: TableCell) {
  if (block.type === "button") return { text: block.label, runs: block.labelRuns };
  if (block.type === "quote" && itemIndex === -1) return { text: block.attribution ?? "", runs: block.attributionRuns };
  if (block.type === "image") return { text: block.caption ?? "", runs: block.captionRuns };
  if (block.type === "table") return cell ? { text: block.rows[cell.rowIndex]?.[cell.columnIndex] ?? "", runs: block.cellRuns?.[cell.rowIndex]?.[cell.columnIndex] } : { text: block.caption ?? "", runs: block.captionRuns };
  if (block.type === "embed") return { text: block.caption ?? "", runs: block.captionRuns };
  if (block.type !== "list") return { text: block.text, runs: block.runs };
  const item = (listId ? findListBlock(block, listId) : block)?.items[itemIndex] ?? "";
  return { text: listItemText(item), runs: typeof item === "string" ? undefined : item.runs };
}

function withRichTextContent(block: EditableRichTextBlock, text: string, runs: RichTextRun[], itemIndex = 0, listId = block.type === "list" ? block.id : undefined, cell?: TableCell): EditableRichTextBlock {
  if (block.type === "button") { const labelRuns = withoutInteractiveTextMarks(runs); return { ...block, label: plainTextFromRuns(labelRuns), labelRuns: labelRuns.length ? labelRuns : undefined }; }
  if (block.type === "quote" && itemIndex === -1) return { ...block, attribution: text || undefined, attributionRuns: runs.length ? runs : undefined };
  if (block.type === "image") return { ...block, caption: text || undefined, captionRuns: runs.length ? runs : undefined };
  if (block.type === "table") {
    if (!cell) return { ...block, caption: text || undefined, captionRuns: runs.length ? runs : undefined };
    const rows = block.rows.map(row => [...row]);
    rows[cell.rowIndex][cell.columnIndex] = text;
    const cellRuns = block.rows.map((row, rowIndex) => row.map((_value, columnIndex) => block.cellRuns?.[rowIndex]?.[columnIndex] ?? textToRuns(block.rows[rowIndex][columnIndex])));
    cellRuns[cell.rowIndex][cell.columnIndex] = runs;
    const hasMarks = cellRuns.some(row => row.some(value => value.some(run => run.inline || run.marks?.length)));
    return { ...block, rows, cellRuns: hasMarks ? cellRuns : undefined };
  }
  if (block.type === "embed") return { ...block, caption: text || undefined, captionRuns: runs.length ? runs : undefined };
  if (block.type !== "list") return { ...block, text, runs };
  if (!listId) return block;
  return updateListItem(block, listId, itemIndex, item => listItemWithTextRuns(item, text, runs));
}

function richTextFieldFromDocument(editor: HTMLElement, document: StudioDocument) {
    let block = findBlockById(document.blocks, editor.dataset.studioBlockId ?? "");
    if (!block) { const owner = editor.closest<HTMLElement>(".studio-nested-block")?.dataset.studioNestedBlockId; block = owner ? findBlockById(document.blocks, owner) : null; }
    if (!block || !isEditableRichTextBlock(block)) return null;
    const itemIndex = editor.dataset.quoteCitation === "true" ? -1 : editor.dataset.listItemIndex !== undefined ? Number(editor.dataset.listItemIndex) : undefined;
    const listId = itemIndex === -1 ? block.id : editor.dataset.listContextId;
    const cell = editor.dataset.tableCellRow !== undefined ? { rowIndex: Number(editor.dataset.tableCellRow), columnIndex: Number(editor.dataset.tableCellColumn) } : undefined;
    const content = richTextContent(block, itemIndex, listId, cell);
    return { block, itemIndex, listId, cell, runs: content.runs?.length ? content.runs : textToRuns(content.text) };
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
  buttonPreview?: { blockId: string; state: ButtonInteractionState } | null;
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
  loadInlineImages?: InlineImageLibrary;
  onRemoveCoverImage: () => void;
  onSelectBlock: (blockId: string) => void;
  onSelectListItem?: (selection: { blockId: string; listId: string; itemIndex: number }) => void;
  onClearBlockSelection: () => void;
  onSetDragOverIndex: (index: number | null) => void;
  onMoveBlockTo: (from: number, to: number) => void;
  onMoveBlock: (index: number, direction: -1 | 1) => void;
  onDuplicateBlock: (index: number) => void;
  onRemoveBlock: (blockId: string) => void;
  onRemoveBlocks: (blockIds: string[]) => void;
  onUpdateBlock: (blockId: string, update: (block: ContentBlock) => ContentBlock) => void;
  onSplitParagraph: (blockId: string, beforeRuns: RichTextRun[], afterRuns: RichTextRun[]) => string | null;
  onMergeParagraphBackward?: (blockId: string) => { blockId: string; offset: number } | null;
  onSplitParagraphs: (blockId: string, paragraphs: RichTextRun[][]) => string[] | null; onExitList?: (blockId: string, itemIndex: number, operation?: "return" | "backward" | "forward", listId?: string) => BlockCommandFocusTarget;
  onInsertBlock: (type: InsertableBlockType, parentId?: string, options?: { keepInserterOpen?: boolean }) => ContentBlock | null;
  onInsertBlockAt: (type: InsertableBlockType, insertionIndex: number, parentId?: string) => ContentBlock | null;
  /** Explicit template-only capability; never passed to ordinary content commands. */
  onInsertTemplateContent?: (insertionIndex: number | null, parentId?: string) => ContentBlock | null;
  onSetShowInserter: (show: boolean) => void;
  onSetInserterQuery: (query: string) => void;
};

function richTextSelectionKey(blockId: string, itemIndex?: number, listId?: string, cell?: TableCell) {
  if (cell) return `${blockId}:cell:${cell.rowIndex}:${cell.columnIndex}`;
  return itemIndex === undefined ? blockId : `${blockId}:list:${listId ?? blockId}:item:${itemIndex}`;
}

export function StudioCanvas(props: StudioCanvasProps) {
  return <RichTextEditingProvider writable={props.writable !== false}><FootnoteNumbersProvider blocks={props.activeDocument.blocks}><TableCaptionProvider key={props.activeDocument.id}><StudioCanvasContent {...props} /></TableCaptionProvider></FootnoteNumbersProvider></RichTextEditingProvider>;
}

function StudioCanvasContent({ allowHtmlEditing = true, targetLabel, toolbarContent, viewportWidth, viewportWidthCanOverflow = false, canvasZoom, className, presentation, writable = true, onUndo, onRedo, canUndo = false, canRedo = false, activeDocument, previewing, onPreviewChange, wordCount, characterCount, linkTargets, showCoverImage, coverImageUrl, mediaBlockUrls, buttonPreview = null, selectedBlockId, pendingColumnsLayoutBlockId = null, onColumnsLayoutSelected, selectedDocumentField = null, dragOverIndex, showInserter, inserterQuery, filteredBlocks, publishFeedback, onOpenInserter, onSetPublishFeedback, onDocumentFieldChange, onApplyDocumentCode, onCodeEditorDirtyChange, onFocusDocumentField, onOpenCoverMediaLibrary, loadInlineImages, onRemoveCoverImage, onSelectBlock, onSelectListItem, onClearBlockSelection, onSetDragOverIndex, onMoveBlockTo, onRemoveBlock, onRemoveBlocks, onUpdateBlock, onSplitParagraph, onMergeParagraphBackward, onSplitParagraphs, onExitList, onInsertBlock, onInsertBlockAt, onInsertTemplateContent, onSetShowInserter, onSetInserterQuery }: StudioCanvasProps) {
  const nestedDragBlockIdRef = useRef<string | null>(null);
  const draggingIndexRef = useRef<number | null>(null);
  const blockDragActiveRef = useRef(false);
  const [blockDragActive, setBlockDragActive] = useState(false);
  const [columnDrop, setColumnDrop] = useState<ReturnType<typeof columnDropPosition>>(null);
  const [pendingGroupLayoutBlockId, setPendingGroupLayoutBlockId] = useState<string | null>(null);
  const blockDragBaseline = JSON.stringify(activeDocument.blocks);
  const dragSessionRef = useRef<{ documentId: string; baseline: string; libraryType?: BlockLibraryItemType } | null>(null);
  const crossBlockSelectionRef = useRef<{ pointerId: number; blockIdentity: Element; blockId: string | null; start: Range | null; last: Range | null; endBlockId: string | null; active: boolean; pointerStart?: { x: number; y: number }; listRoot?: HTMLElement; listEditor?: HTMLElement; listText?: boolean } | null>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const selectionAnchorRef = useRef<string | null>(null);
  const selectionFocusRef = useRef<string | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const selectedBlockIdsRef = useRef<string[]>([]);
  const [blockSelectionMode, setBlockSelectionMode] = useState(false);
  const blockSelectionModeRef = useRef(false);
  const selectionEntries = orderedBlockEntries(activeDocument.blocks);
  const validSelectionIds = selectedBlockIds.filter(id => selectionEntries.some(entry => entry.id === id));
  const selectedRoots = normaliseBlockSelection(activeDocument.blocks, validSelectionIds);
  const hasMultiSelection = blockSelectionMode && validSelectionIds.length > 0;
  const multiMenuBlock = findBlockById(activeDocument.blocks, selectedRoots.at(-1) ?? "");

  const [listTextRange, setListTextRange] = useState<ListTextSelection | null>(null);
  useLayoutEffect(() => {
    const changed = () => {
      const rootElement = listTextEditor(window.getSelection()?.anchorNode ?? null)?.closest<HTMLElement>("[data-list-root-id]");
      const root = rootElement && findBlockById(activeDocument.blocks, rootElement.dataset.listRootId ?? "");
      const next = !previewing && root?.type === "list" && rootElement && canvasScrollRef.current?.contains(rootElement) ? readListTextSelection(root, rootElement) : null;
      setListTextRange(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    document.addEventListener("selectionchange", changed);
    changed();
    return () => document.removeEventListener("selectionchange", changed);
  }, [activeDocument, previewing]);

  function currentListTextRange() {
    if (typeof window === "undefined") return null;
    const element = listTextEditor(window.getSelection()?.anchorNode ?? null)?.closest<HTMLElement>("[data-list-root-id]");
    const root = element && findBlockById(activeDocument.blocks, element.dataset.listRootId ?? "");
    if (!element || root?.type !== "list" || !canvasScrollRef.current?.contains(element) || previewing) return null;
    const selection = readListTextSelection(root, element);
    return selection ? { root, element, selection } : null;
  }

  function listSelectionRoot(editor: HTMLElement | null) {
    const root = editor?.closest<HTMLElement>("[data-list-root-id]");
    if (!root?.isConnected || !canvasScrollRef.current?.contains(root)) return null;
    return findBlockById(activeDocument.blocks, root.dataset.listRootId ?? "")?.type === "list" ? root : null;
  }

  function setBlockSelection(ids: string[], explicit = ids.length > 1) {
    selectedBlockIdsRef.current = ids;
    blockSelectionModeRef.current = explicit && ids.length > 0;
    setBlockSelectionMode(blockSelectionModeRef.current);
    setSelectedBlockIds(ids);
  }

  function clearMultiSelection() {
    setBlockSelection([]);
    selectionAnchorRef.current = null;
    selectionFocusRef.current = null;
  }

  function selectBlockRange(anchorId: string | null, focusId: string | null) {
    const ids = blockSelectionRange(activeDocument.blocks, anchorId, focusId);
    selectionAnchorRef.current = anchorId;
    selectionFocusRef.current = focusId;
    setBlockSelection(ids, anchorId === null || focusId === null || ids.length > 1);
    const realFocusId = focusId ?? ids.at(-1);
    if (realFocusId && ids.length) onSelectBlock(realFocusId);
  }

  function removeSelectedBlocks() {
    if (!writable || previewing || codeEditor) return;
    const ids = normaliseBlockSelection(activeDocument.blocks, selectedBlockIdsRef.current);
    if (!ids.length) return;
    if (ids.some(id => { const block = findBlockById(activeDocument.blocks, id); return block && !canRemove(block); })) return;
    if (!canRemoveFootnoteOwners(activeDocument.blocks, ids)) return;
    onRemoveBlocks(ids);
    clearMultiSelection();
    onClearBlockSelection();
    window.getSelection()?.removeAllRanges();
    canvasScrollRef.current?.focus();
  }

  useLayoutEffect(() => {
    const canvas = canvasScrollRef.current;
    if (!canvas) return;
    selectedBlockIdsRef.current = validSelectionIds;
    markBlockSelectionHosts(canvas, hasMultiSelection ? normaliseBlockSelection(activeDocument.blocks, validSelectionIds) : []);
  });

  useLayoutEffect(() => {
    if (previewing || !selectedBlockId || (selectedBlockIdsRef.current.length && !selectedBlockIdsRef.current.includes(selectedBlockId))) {
      selectedBlockIdsRef.current = [];
      blockSelectionModeRef.current = false;
      setBlockSelectionMode(false);
      setSelectedBlockIds([]);
      selectionAnchorRef.current = null;
      selectionFocusRef.current = null;
    }
  }, [previewing, selectedBlockId]);
  const [nestedRichTextTargets, setNestedRichTextTargets] = useState<Record<string, string>>({});
  const [quoteCitationTargets, setQuoteCitationTargets] = useState<Record<string, boolean>>({});
  const textSelectionsRef = useRef<Record<string, TextSelection | null>>({});
  const [textSelections, setTextSelections] = useState<Record<string, TextSelection | null>>({});
  const [caretFormatSnapshots, setCaretFormatSnapshots] = useState<Record<string, CaretFormatSnapshot & { documentId: string }>>({});
  const [activeListItems, setActiveListItems] = useState<Record<string, { listId: string; itemIndex: number }>>({});
  const linkTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const buttonLinkSelectionsRef = useRef<Record<string, TextSelection | null>>({});
  const htmlInputRef = useRef<HTMLTextAreaElement>(null);
  const htmlEditorTriggerRef = useRef<HTMLButtonElement>(null);
  const editorialDialogTriggerRef = useRef<HTMLElement | null>(null);
  const richTextMenuTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const richTextMenuItemRef = useRef<HTMLButtonElement>(null);
  const blockAlignmentTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const blockAlignmentMenuItemRef = useRef<HTMLButtonElement>(null);
  const tableAlignmentTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const restoreRichTextMenuFocusBlockIdRef = useRef<string | null>(null);
  const codeEditorToggleRef = useRef<HTMLButtonElement>(null);
  const codeEditorInputRef = useRef<HTMLTextAreaElement>(null);
  const listViewToggleRef = useRef<HTMLButtonElement>(null);
  const [inserterClosing, setInserterClosing] = useState(false);
  const [inserterParentId, setInserterParentId] = useState<string | null>(null);
  const appenderInputRef = useRef<HTMLInputElement>(null);
  const [linkEditor, setLinkEditor] = useState<LinkEditorState | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [transformMenuBlockId, setTransformMenuBlockId] = useState<string | null>(null);
  const [alignmentMenuBlockId, setAlignmentMenuBlockId] = useState<string | null>(null);
  const [blockAlignmentMenuBlockId, setBlockAlignmentMenuBlockId] = useState<string | null>(null);
  const [richTextMenuBlockId, setRichTextMenuBlockId] = useState<string | null>(null);
  const [mathMenuActive, setMathMenuActive] = useState(false);
  const highlightTargetRef = useRef<HighlightTarget | null>(null);
  const highlightCaretReseedRef = useRef<HighlightTarget | null>(null);
  const [highlightCaptureAvailable, setHighlightCaptureAvailable] = useState(false);
  const [highlightTarget, setHighlightTarget] = useState<HighlightTarget | null>(null);
  const mathCaptureRef = useRef<{ documentId: string; baseline: string } | null>(null);
  const mathDismissedRef = useRef<{ editor: HTMLElement; start: number; end: number } | null>(null);
  const [mathTarget, setMathTarget] = useState<{ documentId: string; blockId: string; itemIndex?: number; listId?: string; cell?: TableCell; editor: HTMLElement; start: number; end: number; baseline: string; blockSnapshot: string; math: InlineMath } | null>(null);
  const languageCaptureRef = useRef<LanguageTarget | null>(null);
  const [languageTarget, setLanguageTarget] = useState<LanguageTarget | null>(null);
  const [languageMenuActive, setLanguageMenuActive] = useState(false);
  const [languageMenuAvailable, setLanguageMenuAvailable] = useState(false);
  const [imageMenuActive, setImageMenuActive] = useState(false);
  const [imageTarget, setImageTarget] = useState<InlineImageTarget | null>(null);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const imageEpochRef = useRef(0);
  const imageDismissedRef = useRef<{ editor: HTMLElement; start: number; end: number } | null>(null);
  const richFormSelectionEpochRef = useRef(0);
  const [codeEditor, setCodeEditor] = useState<CodeEditorState | null>(null);
  useLayoutEffect(() => {
    const epoch = richFormSelectionEpochRef;
    const invalidate = () => { epoch.current++; };
    invalidate();
    // A later user action anywhere in Studio owns the next caret/focus. Native
    // selectionchange is excluded: model cleanup can legitimately rebase it.
    const events = ["pointerdown", "keydown", "beforeinput"];
    for (const event of events) document.addEventListener(event, invalidate, true);
    window.addEventListener("blur", invalidate);
    return () => {
      invalidate();
      for (const event of events) document.removeEventListener(event, invalidate, true);
      window.removeEventListener("blur", invalidate);
    };
  }, [activeDocument.id, codeEditor, previewing, writable]);
  const [tableAlignmentMenuBlockId, setTableAlignmentMenuBlockId] = useState<string | null>(null);
  const [blockMenuBlockId, setBlockMenuBlockId] = useState<string | null>(null);
  const [editorialDialog, setEditorialDialog] = useState<{ blockId: string; kind: "rename" | "note" | "lock" } | null>(null);
  const [noteOpenRequest, setNoteOpenRequest] = useState(0);
  const notedBlock = selectedBlockId ? findBlockById(activeDocument.blocks, selectedBlockId) : null;
  const visibleNote = !previewing && !hasMultiSelection ? notedBlock?.editorial?.note?.trim() : undefined;
  const [copiedAppearance, setCopiedAppearance] = useState<ContentBlock | null>(null);
  const currentDocumentRef = useRef(activeDocument);
  const writableRef = useRef(writable);
  const readonlyDraftsMountedRef = useRef(false);
  const selectedLinkOwnerRef = useRef(selectedBlockId);
  useLayoutEffect(() => { currentDocumentRef.current = activeDocument; writableRef.current = writable; selectedLinkOwnerRef.current = selectedBlockId; });
  const previousButtonIdsRef = useRef({ documentId: activeDocument.id, ids: new Set(orderedBlockEntries(activeDocument.blocks).filter(entry => findBlockById(activeDocument.blocks, entry.id)?.type === "button").map(entry => entry.id)) });
  const pendingButtonFocusRef = useRef(new Set<string>());
  useLayoutEffect(() => {
    const previous = previousButtonIdsRef.current;
    const ids = new Set(orderedBlockEntries(activeDocument.blocks).filter(entry => findBlockById(activeDocument.blocks, entry.id)?.type === "button").map(entry => entry.id));
    if (previous.documentId !== activeDocument.id || !writable || previewing) pendingButtonFocusRef.current.clear();
    else for (const id of ids) if (!previous.ids.has(id)) pendingButtonFocusRef.current.add(id);
    previousButtonIdsRef.current = { documentId: activeDocument.id, ids };
    for (const id of pendingButtonFocusRef.current) if (!ids.has(id)) pendingButtonFocusRef.current.delete(id);
    if (!writable || previewing || !selectedBlockId || !pendingButtonFocusRef.current.has(selectedBlockId)) return;
    // Insertion callbacks may publish content and selection in separate renders.
    // Focus only a newly inserted selected Button, never an existing label.
    const editor = [...(canvasScrollRef.current?.querySelectorAll<HTMLElement>('.rich-text-editor[contenteditable="true"][data-studio-block-id]') ?? [])].find(element => element.dataset.studioBlockId === selectedBlockId);
    if (!editor) return;
    pendingButtonFocusRef.current.delete(selectedBlockId);
    // A pointer or keyboard interaction may already have placed a caret in a
    // newly pasted child. Consume the hand-off without replacing that caret.
    if (document.activeElement === editor || editor.contains(document.activeElement)) return;
    focusRichTextEditorAtOffset(editor, 0);
  }, [activeDocument.blocks, activeDocument.id, previewing, selectedBlockId, writable]);
  const closeBlockMenu = useCallback((restoreFocus = true) => { setBlockMenuBlockId(null); if (restoreFocus) requestAnimationFrame(() => htmlEditorTriggerRef.current?.focus()); }, []);

  function applyBlockList(blocks: ContentBlock[], acceptUnchanged = false) {
    if (!writable || !writableRef.current || currentDocumentRef.current.id !== activeDocument.id
      || JSON.stringify(currentDocumentRef.current.blocks) !== JSON.stringify(activeDocument.blocks)) return false;
    if (blocks === activeDocument.blocks || JSON.stringify(blocks) === JSON.stringify(activeDocument.blocks)) return acceptUnchanged;
    if (!writable || !validContentBlocks(blocks) || !permitsBlockTreeChanges(activeDocument.blocks, blocks) || !preservesBlockLocks(activeDocument.blocks, blocks)) {
      onSetPublishFeedback("That action would move or delete a locked block, or create an unsupported block structure.");
      return false;
    }
    const reconciled = reconcileFootnoteBlocks(activeDocument.blocks, blocks);
    if (!reconciled) {
      onSetPublishFeedback("Remove the footnote references before deleting their notes.");
      return false;
    }
    try { onApplyDocumentCode(reconciled); return true; }
    catch { onSetPublishFeedback("That action is not supported by this document’s block structure."); return false; }
  }

  function canRemove(block: ContentBlock) { return preservesBlockLocks([block], []); }
  function canMove(block: ContentBlock, direction: -1 | 1) {
    const next = moveBlockAmongSiblings(activeDocument.blocks, block.id, direction);
    return writable && next !== activeDocument.blocks && validContentBlocks(next) && preservesBlockLocks(activeDocument.blocks, next);
  }
  function moveSibling(block: ContentBlock, direction: -1 | 1) {
    if (!canMove(block, direction)) return;
    if (applyBlockList(moveBlockAmongSiblings(activeDocument.blocks, block.id, direction))) onSelectBlock(block.id);
  }
  function menuBlocks(block: ContentBlock) {
    const ids = normaliseBlockSelection(activeDocument.blocks, validSelectionIds);
    return ids.length > 1 && ids.includes(block.id) ? ids.map(id => findBlockById(activeDocument.blocks, id)).filter((item): item is ContentBlock => Boolean(item)) : [block];
  }
  function groupingProposal(block: ContentBlock): ContentBlock[] {
    const selected = blockMenuSiblingSelection(activeDocument.blocks, menuBlocks(block));
    if (!selected) return activeDocument.blocks;
    const ids = new Set(selected.map(item => item.id));
    return editBlockSiblings(activeDocument.blocks, selected[0].id, (siblings, index) => {
      if (selected.length === 1 && selected[0].type === "group") return [...siblings.slice(0, index), ...selected[0].children, ...siblings.slice(index + 1)];
      const group: ContentBlock = { id: crypto.randomUUID(), type: "group", layout: "flow", children: siblings.filter(item => ids.has(item.id)) };
      let inserted = false;
      return siblings.flatMap(item => {
        if (!ids.has(item.id)) return [item];
        if (inserted) return [];
        inserted = true;
        return [group];
      });
    });
  }
  function newSiblingBlock(block: ContentBlock): ContentBlock {
    const parent = parentOfNestedBlock(activeDocument.blocks, block.id);
    if (block.type === "button" && parent?.type === "buttons") return createButtonForInsertion(`button-${crypto.randomUUID()}`, block);
    const paragraph = createBlock("paragraph", `paragraph-${crypto.randomUUID()}`);
    return paragraph.type === "paragraph" ? { ...paragraph, text: "", runs: undefined } : paragraph;
  }
  function blockMenuItems(block: ContentBlock): BlockMenuItem[] {
    const mac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
    const primary = mac ? "⌘" : "Ctrl+", alt = mac ? "⌥⌘" : "Ctrl+Alt+", shift = mac ? "⇧⌘" : "Ctrl+Shift+";
    const selected = menuBlocks(block);
    const templatePlaceholder = selected.some(item => item.type === "group" && Boolean(item.data?.templateElement || item.data?.templatePart));
    const ungrouping = selected.length === 1 && block.type === "group";
    const contentSlot = selected.some(containsTemplateContent);
    const siblings = blockMenuSiblingSelection(activeDocument.blocks, selected);
    const siblingReason = !siblings ? "Choose blocks within the same container." : undefined;
    const footnoteRemovalAllowed = canRemoveFootnoteOwners(activeDocument.blocks, selected.map(item => item.id));
    const removeDisabled = !writable || selected.some(item => !canRemove(item)) || !footnoteRemovalAllowed;
    const removeDisabledReason = !footnoteRemovalAllowed ? "Remove the footnote references before deleting their notes." : undefined;
    const proposal = groupingProposal(block);
    const inserted = siblings ? insertAtBlockSelectionEdge(activeDocument.blocks, siblings, [newSiblingBlock(siblings[0])], false) : activeDocument.blocks;
    const duplicated = siblings ? insertAtBlockSelectionEdge(activeDocument.blocks, siblings, cloneClipboardBlocks(siblings), true) : activeDocument.blocks;
    const insertionAllowed = Boolean(siblings) && validContentBlocks(inserted) && permitsBlockTreeChanges(activeDocument.blocks, inserted);
    const duplicateAllowed = Boolean(siblings) && validContentBlocks(duplicated) && permitsBlockTreeChanges(activeDocument.blocks, duplicated);
    const pasted = copiedAppearance ? pasteBlockSelectionAppearance(activeDocument.blocks, selected, copiedAppearance) : null;
    const pasteAllowed = pasted && validContentBlocks(pasted) && permitsBlockTreeChanges(activeDocument.blocks, pasted) && preservesBlockLocks(activeDocument.blocks, pasted);
    return [
      { action: "copy", label: "Copy", shortcut: `${primary}C` },
      { action: "cut", label: "Cut", shortcut: `${primary}X`, disabled: removeDisabled, disabledReason: removeDisabledReason },
      { action: "duplicate", label: "Duplicate", shortcut: `${shift}D`, disabled: !writable || contentSlot || !duplicateAllowed, disabledReason: siblingReason },
      { action: "before", label: "Add before", shortcut: `${alt}T`, disabled: !writable || !insertionAllowed, disabledReason: siblingReason },
      { action: "after", label: "Add after", shortcut: `${alt}Y`, disabled: !writable || !insertionAllowed, disabledReason: siblingReason },
      { action: "note", label: block.editorial?.note ? "Edit note" : "Add note", shortcut: `${alt}M`, disabled: !writable },
      { action: "copy-styles", label: "Copy styles", separator: true },
      { action: "paste-styles", label: "Paste styles", disabled: !writable || !pasteAllowed },
      { action: "group", label: ungrouping ? "Ungroup" : "Group", separator: true, disabled: !writable || templatePlaceholder || selected.some(item => !canRemove(item)) || JSON.stringify(proposal) === JSON.stringify(activeDocument.blocks) || !validContentBlocks(proposal) || !permitsBlockTreeChanges(activeDocument.blocks, proposal) || !preservesBlockLocks(activeDocument.blocks, proposal), disabledReason: siblingReason },
      { action: "lock", label: "Lock", disabled: !writable },
      { action: "rename", label: "Rename", shortcut: `${alt}R`, disabled: !writable },
      { action: "hide", label: block.editorial?.hidden ? "Show" : "Hide", shortcut: `${shift}H`, disabled: !writable },
      { action: "html", label: "Edit as HTML", disabled: !writable || !allowHtmlEditing },
      { action: "delete", label: "Delete", shortcut: mac ? "⌃⌥Z" : "Shift+Alt+Z", separator: true, disabled: removeDisabled, disabledReason: removeDisabledReason },
    ];
  }
  function focusInsertedBlock(id: string, focusText = true) {
    clearMultiSelection(); onSelectBlock(id);
    requestAnimationFrame(() => {
      const frame = [...(canvasScrollRef.current?.querySelectorAll<HTMLElement>("[data-studio-block-anchor-id], [data-studio-nested-block-id]") ?? [])].find(item => (item.dataset.studioNestedBlockId ?? item.dataset.studioBlockAnchorId) === id);
      if (frame && !focusText && !frame.hasAttribute("tabindex")) frame.tabIndex = -1;
      (focusText ? frame?.querySelector<HTMLElement>('[contenteditable="true"]') ?? frame : frame)?.focus();
    });
  }
  async function runBlockMenuAction(action: BlockMenuAction, block: ContentBlock) {
    const item = blockMenuItems(block).find(item => item.action === action);
    if (!item || item.disabled) return;
    setBlockMenuBlockId(null);
    if (action === "rename" || action === "note" || action === "lock") { editorialDialogTriggerRef.current = document.activeElement instanceof HTMLElement && !document.activeElement.closest(".studio-block-options-menu") ? document.activeElement : htmlEditorTriggerRef.current; setEditorialDialog({ blockId: block.id, kind: action }); return; }
    if (action === "html") { openHtmlEditor(block); return; }
    if (action === "copy" || action === "cut") {
      const blocks = menuBlocks(block);
      const documentId = activeDocument.id;
      const copiedNotes = JSON.stringify(createBlockClipboardPayload(blocks, activeDocument.blocks).footnotes);
      try {
        await writeBlockClipboard(blocks, activeDocument.blocks);
        if (action === "cut" && writableRef.current && currentDocumentRef.current.id === documentId) {
          const currentBlocks = currentDocumentRef.current.blocks;
          if (blocks.every(item => JSON.stringify(findBlockById(currentBlocks, item.id)) === JSON.stringify(item))
            && copiedNotes === JSON.stringify(createBlockClipboardPayload(blocks, currentBlocks).footnotes)
            && blocks.every(canRemove) && canRemoveFootnoteOwners(currentBlocks, blocks.map(item => item.id))) {
            onRemoveBlocks(blocks.map(item => item.id)); clearMultiSelection(); onClearBlockSelection();
          }
        }
        onSetPublishFeedback(action === "copy" ? "Blocks copied." : "Blocks copied to the clipboard.");
      } catch { onSetPublishFeedback("The browser could not write to the clipboard. Your blocks have been kept."); }
    } else if (action === "copy-styles") { setCopiedAppearance(structuredClone(block)); onSetPublishFeedback("Block styles copied. Choose another block to paste them."); }
    else if (action === "paste-styles" && copiedAppearance) applyBlockList(pasteBlockSelectionAppearance(activeDocument.blocks, menuBlocks(block), copiedAppearance));
    else if (action === "duplicate") {
      const selected = blockMenuSiblingSelection(activeDocument.blocks, menuBlocks(block));
      if (!selected) return;
      const copies = cloneClipboardBlocks(selected);
      if (applyBlockList(insertAtBlockSelectionEdge(activeDocument.blocks, selected, copies, true))) {
        if (copies.length === 1) focusInsertedBlock(copies[0].id);
        else {
          const ids = copies.map(copy => copy.id);
          setBlockSelection(ids);
          selectionAnchorRef.current = ids[0];
          selectionFocusRef.current = ids.at(-1)!;
          onSelectBlock(ids.at(-1)!);
          requestAnimationFrame(() => canvasScrollRef.current?.focus());
        }
      }
      return;
    }
    else if (action === "before" || action === "after") {
      const selected = blockMenuSiblingSelection(activeDocument.blocks, menuBlocks(block));
      if (!selected) return;
      const edge = action === "after" ? selected.at(-1)! : selected[0];
      const added = newSiblingBlock(edge);
      if (applyBlockList(insertAtBlockSelectionEdge(activeDocument.blocks, selected, [added], action === "after"))) focusInsertedBlock(added.id);
      return;
    }
    else if (action === "group") {
      const ungrouping = menuBlocks(block).length === 1 && block.type === "group";
      const proposal = groupingProposal(block);
      if (applyBlockList(proposal)) {
        const existingIds = new Set(orderedBlockEntries(activeDocument.blocks).map(entry => entry.id));
        const wrapper = orderedBlockEntries(proposal).find(entry => !existingIds.has(entry.id));
        const targetId = ungrouping && block.type === "group" ? block.children[0]?.id ?? proposal[0]?.id : wrapper?.id ?? block.id;
        if (targetId) focusInsertedBlock(targetId, false);
        else { clearMultiSelection(); onClearBlockSelection(); requestAnimationFrame(() => canvasScrollRef.current?.focus()); }
      }
      return;
    }
    else if (action === "hide") onUpdateBlock(block.id, current => ({ ...current, editorial: { ...current.editorial, hidden: !current.editorial?.hidden } }));
    else if (action === "delete") { onRemoveBlocks(menuBlocks(block).map(item => item.id)); clearMultiSelection(); onClearBlockSelection(); }
    requestAnimationFrame(() => htmlEditorTriggerRef.current?.isConnected && htmlEditorTriggerRef.current.focus());
  }

  const viewportStyle = viewportWidth ? { width: viewportWidth, ...(viewportWidthCanOverflow ? {} : { maxWidth: "100%" }), ...(canvasZoom ? { zoom: canvasZoom / 100 } : {}) } : undefined;
  const [htmlEditor, setHtmlEditor] = useState<HtmlEditorState | null>(null);
  const [listViewOpen, setListViewOpen] = useState(false);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [tableCellSelections, setTableCellSelections] = useState<Record<string, TableCell>>({});
  const [tableTextTargets, setTableTextTargets] = useState<Record<string, TableTextTarget>>({});
  const previousTableBlocksRef = useRef(activeDocument.blocks);
  useLayoutEffect(() => {
    const changed = changedTableStructures(previousTableBlocksRef.current, activeDocument.blocks);
    previousTableBlocksRef.current = activeDocument.blocks;
    if (!changed.size) return;
    setTableCellSelections(current => Object.fromEntries(Object.entries(current).filter(([id]) => !changed.has(id))));
    setTableTextTargets(current => Object.fromEntries(Object.entries(current).filter(([id]) => !changed.has(id))));
    const staleSelection = (key: string) => staleTableTextSelection(key, changed);
    Object.keys(textSelectionsRef.current).filter(staleSelection).forEach(key => { delete textSelectionsRef.current[key]; });
    setTextSelections(current => Object.fromEntries(Object.entries(current).filter(([key]) => !staleSelection(key))));
    setCaretFormatSnapshots(current => Object.fromEntries(Object.entries(current).filter(([key]) => !staleSelection(key))));
    setLinkEditor(current => current?.cell && changed.has(current.blockId) ? null : current);
    setLanguageTarget(current => current?.cell && changed.has(current.blockId) ? null : current);
    setHighlightTarget(current => current?.cell && changed.has(current.blockId) ? null : current);
    if (highlightTargetRef.current?.cell && changed.has(highlightTargetRef.current.blockId)) {
      highlightTargetRef.current = null;
      setHighlightCaptureAvailable(false);
    }
    setTableAlignmentMenuBlockId(current => current && changed.has(current) ? null : current);
    setRichTextMenuBlockId(current => current && changed.has(nestedRichTextTargets[current] ?? current) ? null : current);
  }, [activeDocument.blocks, nestedRichTextTargets]);
  const [appenderActive, setAppenderActive] = useState(false);
  const [appenderValue, setAppenderValue] = useState("");
  const hasAppenderDraft = Boolean(appenderValue.trim());
  const appenderWordCount = appenderValue.trim().split(/\s+/).filter(Boolean).length;
  const displayedWordCount = wordCount + appenderWordCount;
  const displayedCharacterCount = characterCount + appenderValue.length + (hasAppenderDraft && activeDocument.blocks.length > 0 ? 1 : 0);
  const displayedBlockCount = activeDocument.blocks.length + (hasAppenderDraft ? 1 : 0);

  useLayoutEffect(() => {
    if (!richTextMenuBlockId && restoreRichTextMenuFocusBlockIdRef.current) {
      const blockId = restoreRichTextMenuFocusBlockIdRef.current;
      restoreRichTextMenuFocusBlockIdRef.current = null;
      richTextMenuTriggerRefs.current[blockId]?.focus();
    }
  }, [richTextMenuBlockId]);

  useLayoutEffect(() => {
    readonlyDraftsMountedRef.current = true;
    return () => { readonlyDraftsMountedRef.current = false; };
  }, []);

  useLayoutEffect(() => {
    if (writable) return;
    // Rendering hides editing overlays immediately; discard their transient
    // state before the next input event, even if ownership is restored meanwhile.
    queueMicrotask(() => {
      if (!readonlyDraftsMountedRef.current) return;
      restoreRichTextMenuFocusBlockIdRef.current = null;
      setRichTextMenuBlockId(null);
      setLanguageTarget(null);
      languageCaptureRef.current = null;
      mathCaptureRef.current = null;
      setMathTarget(null);
    });
  }, [writable]);

  useLayoutEffect(() => {
    if (blockAlignmentMenuBlockId) blockAlignmentMenuItemRef.current?.focus();
  }, [blockAlignmentMenuBlockId]);


  function insertLibraryBlockAt(type: BlockLibraryItemType, index: number, parentId?: string) {
    if (!writableRef.current) return null;
    const inserted = type === "template-content" ? onInsertTemplateContent?.(index, parentId) ?? null : onInsertBlockAt(type, index, parentId);
    setPendingGroupLayoutBlockId(type === "group" && inserted?.type === "group" ? inserted.id : null);
    return inserted;
  }

  function insertFromBlockInserter(type: BlockLibraryItemType) {
    if (!writableRef.current) return null;
    const inserted = type === "template-content" ? onInsertTemplateContent?.(null, inserterParentId ?? undefined) ?? null : onInsertBlock(type, inserterParentId ?? undefined, { keepInserterOpen: true });
    setPendingGroupLayoutBlockId(type === "group" && inserted?.type === "group" ? inserted.id : null);
    return inserted;
  }

  function onGroupLayoutSelected(blockId: string) {
    setPendingGroupLayoutBlockId(current => current === blockId ? null : current);
  }

  function beginBlockDrag(libraryType?: BlockLibraryItemType) {
    if (!writableRef.current) return;
    dragSessionRef.current = { documentId: activeDocument.id, baseline: blockDragBaseline, libraryType };
    setColumnDrop(null);
    blockDragActiveRef.current = true;
    setBlockDragActive(true);
    setHoveredBlockId(null);
    setBlockMenuBlockId(null);
    setAlignmentMenuBlockId(null);
    setBlockAlignmentMenuBlockId(null);
    setRichTextMenuBlockId(null);
    setTransformMenuBlockId(null);
    onSetDragOverIndex(null);
  }
  const finishBlockDrag = useCallback(() => {
    dragSessionRef.current = null;
    setColumnDrop(null);
    blockDragActiveRef.current = false;
    draggingIndexRef.current = null;
    nestedDragBlockIdRef.current = null;
    setBlockDragActive(false);
    onSetDragOverIndex(null);
  }, [onSetDragOverIndex]);

  useLayoutEffect(() => {
    function finish() {
      dragSessionRef.current = null;
      setColumnDrop(null);
      blockDragActiveRef.current = false;
      draggingIndexRef.current = null;
      nestedDragBlockIdRef.current = null;
      setBlockDragActive(false);
      onSetDragOverIndex(null);
    }
    function leaveCanvas(event: globalThis.DragEvent) {
      if (!blockDragActiveRef.current) return;
      if (!(event.target instanceof Element) || !event.target.closest(".canvas-blocks") || !canvasScrollRef.current?.contains(event.target)) { onSetDragOverIndex(null); setColumnDrop(null); }
    }
    function outsideDrop(event: globalThis.DragEvent) {
      if (!canvasScrollRef.current?.contains(event.target as Node)) finish();
    }
    function cancel(event: KeyboardEvent) { if (event.key === "Escape") finish(); }
    document.addEventListener("dragover", leaveCanvas, true);
    document.addEventListener("dragend", finish, true);
    document.addEventListener("drop", outsideDrop, true);
    document.addEventListener("keydown", cancel, true);
    window.addEventListener("blur", finish);
    return () => {
      document.removeEventListener("dragover", leaveCanvas, true);
      document.removeEventListener("dragend", finish, true);
      document.removeEventListener("drop", outsideDrop, true);
      document.removeEventListener("keydown", cancel, true);
      window.removeEventListener("blur", finish);
    };
  }, [onSetDragOverIndex]);

  useLayoutEffect(() => {
    const session = dragSessionRef.current;
    if (session && (!writable || previewing || codeEditor || session.documentId !== activeDocument.id || session.baseline !== blockDragBaseline)) finishBlockDrag();
  }, [activeDocument.id, blockDragBaseline, writable, previewing, codeEditor, finishBlockDrag]);

  function canvasInsertionIndex(event: DragEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) return null;
    const positions = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(":scope > .block-position > .canvas-block"));
    const appender = event.currentTarget.querySelector<HTMLElement>(":scope > .canvas-appender")?.getBoundingClientRect();
    // Appending replaces the typing prompt, so its feedback and drop target share that area.
    if (appender && event.clientX >= appender.left && event.clientX <= appender.right && event.clientY >= appender.top && event.clientY <= appender.bottom) return positions.length;
    for (let index = 0; index < positions.length; index++) {
      const block = positions[index].getBoundingClientRect();
      if (event.clientY < block.top + block.height / 2) return index;
    }
    return null;
  }
  function handleCanvasDragOver(event: DragEvent<HTMLDivElement>) {
    const session = dragSessionRef.current;
    if (!writable || previewing || codeEditor || !session || session.documentId !== activeDocument.id || session.baseline !== blockDragBaseline) { finishBlockDrag(); return; }
    const column = columnDropPosition(event.currentTarget, event.target instanceof Element ? event.target : null, event.clientX, event.clientY);
    const sourceId = nestedDragBlockIdRef.current ?? (draggingIndexRef.current === null ? null : activeDocument.blocks[draggingIndexRef.current]?.id);
    if (column && (!sourceId || findBlockById(activeDocument.blocks, sourceId)?.type !== "column")) {
      const parent = findBlockById(activeDocument.blocks, column.target.parentId!);
      const allowed = session.libraryType ? parent?.type === "column" && groupAllowsChild(parent, session.libraryType)
        : sourceId && moveBlockToTarget(activeDocument.blocks, sourceId, column.target) !== activeDocument.blocks;
      event.preventDefault(); event.stopPropagation();
      event.dataTransfer.dropEffect = allowed ? session.libraryType ? "copy" : "move" : "none";
      onSetDragOverIndex(null); setColumnDrop(allowed ? column : null);
      return;
    }
    setColumnDrop(null);
    if (nestedDragBlockIdRef.current) {
      event.preventDefault(); event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      const index = canvasInsertionIndex(event);
      onSetDragOverIndex(index !== null && moveBlockToTarget(activeDocument.blocks, nestedDragBlockIdRef.current, { parentId: null, index }) !== activeDocument.blocks ? index : null);
      return;
    }
    const libraryDrag = event.dataTransfer.types.includes("application/x-acm-studio-block");
    const from = draggingIndexRef.current;
    if (!libraryDrag && from === null) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = libraryDrag ? "copy" : "move";
    const index = canvasInsertionIndex(event);
    onSetDragOverIndex(!libraryDrag && (index === from || index === from! + 1) ? null : index);
  }
  function handleCanvasDrop(event: DragEvent<HTMLDivElement>) {
    const session = dragSessionRef.current;
    if (!writable || previewing || codeEditor || !session || session.documentId !== activeDocument.id || session.baseline !== blockDragBaseline) { event.preventDefault(); finishBlockDrag(); return; }
    const column = columnDropPosition(event.currentTarget, event.target instanceof Element ? event.target : null, event.clientX, event.clientY);
    const sourceId = nestedDragBlockIdRef.current ?? (draggingIndexRef.current === null ? null : activeDocument.blocks[draggingIndexRef.current]?.id);
    if (column && (!sourceId || findBlockById(activeDocument.blocks, sourceId)?.type !== "column")) {
      event.preventDefault(); event.stopPropagation();
      if (session.libraryType) insertLibraryBlockAt(session.libraryType, column.target.index, column.target.parentId!);
      else if (sourceId) { const next = moveBlockToTarget(activeDocument.blocks, sourceId, column.target); if (next !== activeDocument.blocks && applyBlockList(next)) onSelectBlock(sourceId); }
      finishBlockDrag(); return;
    }
    const nestedId = nestedDragBlockIdRef.current;
    if (nestedId) {
      event.preventDefault(); event.stopPropagation();
      const frame = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-studio-nested-block-id]") : null;
      const targetId = frame?.dataset.studioNestedBlockId;
      if (writable && targetId && frame) {
        const bounds = frame.getBoundingClientRect();
        const next = reorderBlockAmongSiblings(activeDocument.blocks, nestedId, targetId, event.clientY >= bounds.top + bounds.height / 2);
        if (next !== activeDocument.blocks && applyBlockList(next)) onSelectBlock(nestedId);
      } else {
        const index = canvasInsertionIndex(event);
        if (index !== null) { const next = moveBlockToTarget(activeDocument.blocks, nestedId, { parentId: null, index }); if (next !== activeDocument.blocks && applyBlockList(next)) onSelectBlock(nestedId); }
      }
      finishBlockDrag();
      return;
    }
    const libraryType = event.dataTransfer.getData("application/x-acm-studio-block");
    const libraryDrag = filteredBlocks.some(item => item.type === libraryType && (item.type !== "template-content" || Boolean(onInsertTemplateContent)));
    const from = draggingIndexRef.current;
    if (!libraryDrag && from === null) return;
    event.preventDefault();
    event.stopPropagation();
    const index = canvasInsertionIndex(event);
    if (writable && index !== null) {
      if (libraryDrag) insertLibraryBlockAt(libraryType as BlockLibraryItemType, index);
      else if (from !== null && index !== from && index !== from + 1) onMoveBlockTo(from, index > from ? index - 1 : index);
    }
    finishBlockDrag();
  }
  const allowCoverImage = presentation?.allowCoverImage ?? activeDocument.kind === "post";
  const compose = (content: ReactNode, mode: "edit" | "preview") => presentation?.renderDocument?.({ document: activeDocument, mode, selectedBlockId, selectedDocumentField, onSelectBlock, onDocumentFieldChange, onFocusDocumentField }, content) ?? content;

  function selectBlockBoundary(blockId: string) {
    // Selecting a boundary owns its toolbar; a previous child caret must not
    // redirect commands from the newly selected container.
    setNestedRichTextTargets(current => { const next = { ...current }; delete next[blockId]; return next; });
    setActiveListItems(current => { const next = { ...current }; delete next[blockId]; return next; });
    setQuoteCitationTargets(current => { const next = { ...current }; delete next[blockId]; return next; });
    onSelectBlock(blockId);
  }

  function selectBlockFromList(blockId: string) {
    selectBlockBoundary(blockId);
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
    if (!writableRef.current) return;
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
      if (event.key !== "Escape" || event.defaultPrevented || showInserter || linkEditor || htmlEditor || blockMenuBlockId || transformMenuBlockId || alignmentMenuBlockId || blockAlignmentMenuBlockId) return;
      event.preventDefault();
      event.stopPropagation();
      closeListView();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [listViewOpen, showInserter, linkEditor, htmlEditor, blockMenuBlockId, transformMenuBlockId, alignmentMenuBlockId, blockAlignmentMenuBlockId]);

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
    if (!htmlEditor) htmlEditorTriggerRef.current?.focus();
  }, [htmlEditor]);

  function openHtmlEditor(block: ContentBlock) {
    setBlockMenuBlockId(null);
    const initialDraft = blockToHtml(block);
    setHtmlEditor({ documentId: activeDocument.id, blockId: block.id, initialBlockSnapshot: JSON.stringify(block), initialDraft, draft: initialDraft, error: null });
  }

  function applyHtmlEditor(block: ContentBlock) {
    if (!writable || !htmlEditor || htmlEditor.blockId !== block.id) return;
    const current = findBlockById(activeDocument.blocks, htmlEditor.blockId);
    if (htmlEditor.documentId !== activeDocument.id || !current || JSON.stringify(current) !== htmlEditor.initialBlockSnapshot || JSON.stringify(block) !== htmlEditor.initialBlockSnapshot) {
      setHtmlEditor(value => value ? { ...value, error: "This block changed outside the HTML editor. Reopen it before applying changes." } : value);
      return;
    }
    const parsed = htmlEditor.draft === htmlEditor.initialDraft ? { block } : parseHtmlToBlock(htmlEditor.draft, block, activeDocument.blocks);
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
    const parent = parentOfNestedBlock(activeDocument.blocks, block.id);
    if (parent && parsed.block.type !== block.type && !groupAllowsChild(parent, parsed.block.type)) {
      setHtmlEditor(current => current ? { ...current, error: "That block type is not allowed in this container." } : current); return;
    }
    const next = editBlockSiblings(activeDocument.blocks, block.id, (siblings, index) => siblings.map((candidate, position) => position === index ? parsed.block : candidate));
    if (!permitsBlockTreeChanges(activeDocument.blocks, next)) { setHtmlEditor(current => current ? { ...current, error: "That edit adds a block type that is not allowed in its container." } : current); return; }
    if (!preservesBlockLocks(activeDocument.blocks, next)) { setHtmlEditor(current => current ? { ...current, error: "This change would move or delete a locked block." } : current); return; }
    if (!preservesReferencedFootnotes(activeDocument.blocks, next)) { setHtmlEditor(current => current ? { ...current, error: "Remove the footnote references before deleting their notes." } : current); return; }
    if (!applyBlockList(next, true)) return;
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
    const parsed = codeEditor.draft === codeEditor.initialDraft ? { blocks: activeDocument.blocks } : parseHtmlToBlocks(codeEditor.draft, activeDocument.blocks);
    if ("error" in parsed) {
      setCodeEditor((current) => current ? { ...current, error: parsed.error } : current);
      return;
    }
    if (!preservesBlockLocks(activeDocument.blocks, parsed.blocks)) { setCodeEditor(current => current ? { ...current, error: "This change would move or delete a locked block." } : current); return; }
    if (!preservesReferencedFootnotes(activeDocument.blocks, parsed.blocks)) { setCodeEditor(current => current ? { ...current, error: "Remove the footnote references before deleting their notes." } : current); return; }
    if (!applyBlockList(parsed.blocks, true)) return;
    setCodeEditor(null);
    onCodeEditorDirtyChange?.(false);
    onClearBlockSelection();
    requestAnimationFrame(() => codeEditorToggleRef.current?.focus());
  }

  function formattingTarget(block: EditableRichTextBlock): EditableRichTextBlock {
    const targetId = nestedRichTextTargets[block.id];
    const target = targetId ? findBlockById(activeDocument.blocks, targetId) : null;
    return target && isEditableRichTextBlock(target) ? target : block;
  }

  function selectionKey(blockId: string, itemIndex?: number, listId?: string, cell?: TableCell, resolved = false) {
    if (!resolved) blockId = nestedRichTextTargets[blockId] ?? blockId;
    return richTextSelectionKey(blockId, itemIndex, listId, cell);
  }

  const reportCaretFormats = useCallback((editor: HTMLElement, snapshot: CaretFormatSnapshot | null) => {
    if (!canvasScrollRef.current?.contains(editor)) return;
    const field = richTextFieldFromDocument(editor, currentDocumentRef.current);
    if (!field && snapshot) return;
    // An unmount can follow removal from the model; its DOM identity still
    // identifies the observation that must be discarded before a later Undo.
    const blockId = field?.block.id ?? editor.dataset.studioBlockId;
    if (!blockId) return;
    const citation = editor.dataset.quoteCitation === "true";
    const itemIndex = field?.itemIndex ?? (citation ? -1 : editor.dataset.listItemIndex === undefined ? undefined : Number(editor.dataset.listItemIndex));
    const listId = field?.listId ?? (citation ? blockId : editor.dataset.listContextId);
    const cell = field?.cell ?? (editor.dataset.tableCellRow === undefined ? undefined : { rowIndex: Number(editor.dataset.tableCellRow), columnIndex: Number(editor.dataset.tableCellColumn) });
    const key = richTextSelectionKey(blockId, itemIndex, listId, cell);
    const next = snapshot ? { ...snapshot, documentId: currentDocumentRef.current.id } : undefined;
    setCaretFormatSnapshots(current => {
      if (JSON.stringify(current[key]) === JSON.stringify(next)) return current;
      if (next) return { ...current, [key]: next };
      return Object.fromEntries(Object.entries(current).filter(([fieldKey]) => fieldKey !== key));
    });
  }, []);

  function displayedCaretFormats(blockId: string, content: { text: string; runs?: RichTextRun[] }, offset: number, itemIndex?: number, listId?: string, cell?: TableCell) {
    const runs = content.runs?.length ? content.runs : textToRuns(content.text);
    const snapshot = caretFormatSnapshots[richTextSelectionKey(blockId, itemIndex, listId, cell)];
    return (snapshot?.documentId === activeDocument.id ? observedCaretFormats(snapshot, content.text, runs, offset) : undefined) ?? marksAtCaret(runs, offset);
  }

  function activeListContext(block: EditableRichTextBlock) {
    if (block.type === "quote" && quoteCitationTargets[block.id]) return { listId: block.id, itemIndex: -1 };
    if (block.type !== "list") return undefined;
    const selected = activeListItems[block.id];
    const list = findListBlock(block, selected?.listId ?? block.id) ?? block;
    return { listId: list.id, itemIndex: Math.min(selected?.itemIndex ?? 0, Math.max(list.items.length - 1, 0)) };
  }

  function activeTableCell(block: EditableRichTextBlock) {
    const target = block.type === "table" ? tableTextTargets[block.id] : undefined;
    return tableCellForTextTarget(target);
  }

  function focusedTextBlockId(fallback: string) {
    const editor = document.activeElement instanceof Element ? document.activeElement.closest<HTMLElement>(".rich-text-editor[data-studio-block-id]") : null;
    return editor?.dataset.studioBlockId && findBlockById(activeDocument.blocks, editor.dataset.studioBlockId) ? editor.dataset.studioBlockId : fallback;
  }

  function setTextSelection(blockId: string, selection: TextSelection | null, itemIndex?: number, listId?: string, cell?: TableCell) {
    const ownerId = blockId;
    const anchor = window.getSelection()?.anchorNode;
    const activeEditor = (anchor instanceof Element ? anchor : anchor?.parentElement)?.closest<HTMLElement>(".rich-text-editor[data-studio-block-id]");
    if (activeEditor?.dataset.studioBlockId && findBlockById(activeDocument.blocks, activeEditor.dataset.studioBlockId)) {
      blockId = activeEditor.dataset.studioBlockId;
      const targetId = blockId;
      const isCitation = activeEditor.dataset.quoteCitation === "true";
      setNestedRichTextTargets(current => current[ownerId] === targetId ? current : { ...current, [ownerId]: targetId });
      setQuoteCitationTargets(current => current[targetId] === isCitation ? current : { ...current, [targetId]: isCitation });
      if (isCitation) { itemIndex = -1; listId = blockId; }
    }
    // Keep the last range when focus briefly moves to the formatting toolbar.
    if (selection) {
      const key = selectionKey(blockId, itemIndex, listId, cell, true);
      textSelectionsRef.current[key] = selection;
      setTextSelections((current) => ({ ...current, [key]: selection }));
    }
    return blockId;
  }

  function recordTextSelection(blockId: string, selection: TextSelection | null, rowIndex?: number, columnIndex?: number) {
    const cell = rowIndex === undefined || columnIndex === undefined ? undefined : { rowIndex, columnIndex };
    const id = setTextSelection(blockId, selection, undefined, undefined, cell);
    if (findBlockById(activeDocument.blocks, id)?.type === "table") {
      setTableCellSelections(current => cell ? { ...current, [id]: cell } : Object.fromEntries(Object.entries(current).filter(([tableId]) => tableId !== id)));
      setTableTextTargets(current => ({ ...current, [id]: cell ? { kind: "cell", ...cell } : { kind: "caption" } }));
    }
  }

  function activateTextLink(blockId: string, selection: TextSelection, rowIndex?: number, columnIndex?: number) {
    const target = findBlockById(activeDocument.blocks, focusedTextBlockId(blockId));
    if (target && isEditableRichTextBlock(target) && target.type !== "list") openLinkEditor(target, selection, "preview", undefined, undefined,
      rowIndex === undefined || columnIndex === undefined ? undefined : { rowIndex, columnIndex });
  }

  function textEditor(blockId: string, itemIndex?: number, listId?: string, cell?: TableCell) {
    blockId = nestedRichTextTargets[blockId] ?? blockId;
    return [...(canvasScrollRef.current?.querySelectorAll<HTMLElement>(".rich-text-editor[data-studio-block-id]") ?? [])].find((element) => element.dataset.studioBlockId === blockId && (cell ? element.dataset.tableCellRow === String(cell.rowIndex) && element.dataset.tableCellColumn === String(cell.columnIndex) : itemIndex === undefined ? element.dataset.tableCellRow === undefined && element.dataset.quoteCitation !== "true" : (element.dataset.listItemIndex === String(itemIndex) && element.dataset.listContextId === (listId ?? blockId))));
  }

  function currentTextSelection(blockId: string, itemIndex?: number, listId?: string, cell?: TableCell) {
    const key = selectionKey(blockId, itemIndex, listId, cell);
    const editor = textEditor(blockId, itemIndex, listId, cell);
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
    const rangeRoot = listTextRange && findBlockById(activeDocument.blocks, listTextRange.rootId);
    if (listTextRange && rangeRoot?.type === "list" && listTextSegments(rangeRoot, listTextRange)) return listTextMarkState(rangeRoot, listTextRange, mark);
    block = formattingTarget(block);
    const context = activeListContext(block);
    const itemIndex = context?.itemIndex;
    const listId = context?.listId;
    const cell = activeTableCell(block);
    const key = selectionKey(block.id, itemIndex, listId, cell);
    const selection = textSelections[key];
    if (!selection) return false;
    const content = richTextContent(formattingTarget(block), itemIndex, listId, cell);
    const runs = content.runs?.length ? content.runs : textToRuns(content.text);
    if (selection.start === selection.end) return displayedCaretFormats(block.id, content, selection.start, itemIndex, listId, cell).includes(mark);
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

  function formatMarkButton(block: EditableRichTextBlock, mark: Extract<TextMark, string>, label: string = mark, icon: IconName) {
    const state = textMarkState(block, mark);
    return <button ref={mark === "strikethrough" ? richTextMenuItemRef : undefined} className={state === true ? "is-active" : state === "mixed" ? "is-mixed" : ""} type="button" role="menuitemcheckbox" disabled={!writable} onMouseDown={preserveTextSelection} onClick={() => { restoreRichTextMenuFocusBlockIdRef.current = block.id; formatSelectedText(block, mark); setRichTextMenuBlockId(null); }} aria-checked={state} aria-label={`${label} selected text`} title={label}><StudioHoverIcon name={icon} size={20} /><span>{label}</span></button>;
  }

  function captureHighlightTarget(block: EditableRichTextBlock) {
    if (currentListTextRange()) {
      highlightTargetRef.current = null; languageCaptureRef.current = null; mathCaptureRef.current = null;
      setHighlightCaptureAvailable(false);
      setLanguageMenuAvailable(false); setLanguageMenuActive(false); setMathMenuActive(false); setImageMenuActive(false);
      return;
    }
    let target = formattingTarget(block);
    let context = activeListContext(target);
    let cell = activeTableCell(target);
    let editor = textEditor(target.id, context?.itemIndex, context?.listId, cell);
    const browserSelection = window.getSelection();
    const anchorNode = browserSelection?.anchorNode;
    const selectedEditor = (anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement)?.closest<HTMLElement>(".rich-text-editor[data-studio-block-id]");
    const owner = richTextMenuTriggerRefs.current[block.id]?.closest(".canvas-block");
    if (selectedEditor && selectedEditor.dataset.studioBlockId === target.id && owner?.contains(selectedEditor) && selectedEditor.contains(browserSelection?.focusNode ?? null)) {
      const selectedBlock = findBlockById(activeDocument.blocks, selectedEditor.dataset.studioBlockId ?? "");
      if (selectedBlock && isEditableRichTextBlock(selectedBlock)) target = selectedBlock;
      editor = selectedEditor;
      context = selectedEditor.dataset.listItemIndex !== undefined ? { itemIndex: Number(selectedEditor.dataset.listItemIndex), listId: selectedEditor.dataset.listContextId ?? target.id } : undefined;
      cell = selectedEditor.dataset.tableCellRow !== undefined ? { rowIndex: Number(selectedEditor.dataset.tableCellRow), columnIndex: Number(selectedEditor.dataset.tableCellColumn) } : undefined;
    } else if (!editor && target.type === "quote" && !target.children && context?.itemIndex !== -1) {
      // Legacy quote bodies project a paragraph without persisting its ID.
      editor = [...document.querySelectorAll<HTMLElement>(".rich-text-editor[data-studio-block-id]")].find(element => element.closest<HTMLElement>(".studio-nested-block")?.dataset.studioNestedBlockId === target.id && element.closest("blockquote"));
    }
    const range = editor && browserSelection?.rangeCount && editor.contains(browserSelection.anchorNode) && editor.contains(browserSelection.focusNode) ? browserSelection.getRangeAt(0) : null;
    const selection = range && editor ? { start: editorOffset(editor, range.startContainer, range.startOffset), end: editorOffset(editor, range.endContainer, range.endOffset) } : currentTextSelection(target.id, context?.itemIndex, context?.listId, cell);
    const field = editor && selection ? richTextFieldFromDocument(editor, currentDocumentRef.current) : null;
    if (!editor || !selection || !field) { highlightTargetRef.current = null; languageCaptureRef.current = null; mathCaptureRef.current = null; setHighlightCaptureAvailable(false); setLanguageMenuAvailable(false); setLanguageMenuActive(false); setMathMenuActive(false); setImageMenuActive(false); return; }
    setLanguageMenuAvailable(true);
    const runs = field.runs;
    const pending = selection.start === selection.end ? caretFormats(editor, selection.start) : undefined;
    languageCaptureRef.current = { documentId: currentDocumentRef.current.id, ownerId: block.id, blockId: field.block.id, itemIndex: field.itemIndex, listId: field.listId, cell: field.cell, editor, selection: { ...selection }, range: range?.cloneRange() ?? null, baseline: JSON.stringify(runs), blockSnapshot: JSON.stringify(field.block), pending };
    setLanguageMenuActive(Boolean(languageAtRange(runs, selection.start, selection.end, pending)));
    mathCaptureRef.current = { documentId: currentDocumentRef.current.id, baseline: JSON.stringify(runs) };
    setMathMenuActive(Boolean(mathAtRange(runs, selection.start, selection.end) || legacyMathAtRange(runs, selection.start, selection.end)));
    setImageMenuActive(Boolean(inlineImageAtRange(runs, selection.start, selection.end)));
    const bounds = editor.getBoundingClientRect();
    const anchorBounds = range?.getBoundingClientRect() ?? bounds;
    highlightTargetRef.current = { ...languageCaptureRef.current, text: plainTextFromRuns(runs), anchor: { left: anchorBounds.left - bounds.left, bottom: anchorBounds.bottom - bounds.top } };
    setHighlightCaptureAvailable(true);
  }

  function openHighlight() {
    const target = highlightTargetRef.current;
    if (!target || !writable) return;
    const captured = languageCaptureRef.current;
    const prepared = captured && prepareRichTextFormTarget("highlight", captured);
    if (!prepared) return;
    setRichTextMenuBlockId(null);
    const next = { ...target, ...prepared, text: plainTextFromRuns(JSON.parse(prepared.baseline)) };
    highlightTargetRef.current = next;
    setHighlightCaptureAvailable(true);
    setHighlightTarget(next);
  }

  const closeHighlight = useCallback((restoreFocus = true) => {
    highlightCaretReseedRef.current = null;
    const epoch = ++richFormSelectionEpochRef.current;
    const target = highlightTargetRef.current;
    const documentId = target?.documentId;
    setHighlightTarget(null);
    if (restoreFocus && target) requestAnimationFrame(() => {
      if (epoch !== richFormSelectionEpochRef.current || !writableRef.current || currentDocumentRef.current.id !== documentId || selectedLinkOwnerRef.current !== target.ownerId || !target.editor.isConnected) return;
      const field = richTextFieldFromDocument(target.editor, currentDocumentRef.current);
      if (!field || field.block.id !== target.blockId || field.itemIndex !== target.itemIndex || field.listId !== target.listId || JSON.stringify(field.cell) !== JSON.stringify(target.cell) || JSON.stringify(field.runs) !== target.baseline || JSON.stringify(field.block) !== target.blockSnapshot) return;
      restoreEditorSelection(target.editor, target.selection);
      if (epoch !== richFormSelectionEpochRef.current) return;
      richTextMenuTriggerRefs.current[target.ownerId]?.focus();
    });
  }, []);

  function changeHighlight(channel: HighlightChannel, value?: string) {
    const target = highlightTarget;
    const field = target && currentLanguageField(target);
    if (!target || !field) return;
    let range = target.selection;
    let pending = target.pending;
    if (target.selection.start === target.selection.end) {
      const marks = caretFormats(target.editor, target.selection.start);
      if (!marks || JSON.stringify(marks) !== JSON.stringify(target.pending)) return;
      const current = marks.find((mark): mark is Extract<TextMark, { type: "highlight" }> => typeof mark !== "string" && mark.type === "highlight");
      const next = { type: "highlight" as const, ...current };
      if (value) next[channel] = value; else delete next[channel];
      pending = changeCaretMark(marks, next, next.textColor || next.backgroundColor ? "set" : "remove");
      range = highlightRangeAtCaret(field.runs, target.selection.start) ?? range;
    }
    const next = updateHighlightColour(field.runs, range.start, range.end, channel, value);
    const baseline = JSON.stringify(next);
    const nextBlock = withRichTextContent(field.block, plainTextFromRuns(next), next, target.itemIndex, target.listId, target.cell);
    if (baseline !== target.baseline) onUpdateBlock(target.blockId, current => {
      if (!currentLanguageField(target) || !isEditableRichTextBlock(current) || JSON.stringify(current) !== target.blockSnapshot) return current;
      return withRichTextContent(current, plainTextFromRuns(next), next, target.itemIndex, target.listId, target.cell);
    });
    if (target.selection.start === target.selection.end) {
      caretFormats(target.editor, target.selection.start, pending);
      setTextSelections(current => ({ ...current }));
    }
    const changedContent = baseline !== target.baseline;
    const refreshed = { ...target, baseline, blockSnapshot: changedContent ? JSON.stringify(nextBlock) : target.blockSnapshot, pending };
    highlightTargetRef.current = refreshed;
    highlightCaretReseedRef.current = changedContent && target.selection.start === target.selection.end ? refreshed : null;
    setHighlightTarget(refreshed);
  }

  function reseedHighlightCaret() {
    const target = highlightCaretReseedRef.current;
    highlightCaretReseedRef.current = null;
    if (!target || highlightTarget !== target || !currentLanguageField(target)) return;
    // RichTextEditor clears pending formats when its source runs change. Child
    // layout effects finish before this guarded hand-off restores our own edit.
    caretFormats(target.editor, target.selection.start, target.pending);
  }
  useLayoutEffect(() => { reseedHighlightCaret(); });

  const highlightedField = highlightTarget ? currentLanguageField(highlightTarget, activeDocument) : null;
  const highlightedContent = highlightTarget && highlightedField ? richTextContent(highlightedField.block, highlightTarget.itemIndex, highlightTarget.listId, highlightTarget.cell) : null;
  const highlightVisible = writable && highlightTarget && selectedBlockId === highlightTarget.ownerId && highlightedContent && !previewing && !codeEditor && highlightedContent.text.length >= highlightTarget.selection.end;
  useLayoutEffect(() => {
    // Revoke a detached or unavailable editor target before another paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (highlightTarget && (!highlightVisible || !highlightTarget.editor.isConnected)) closeHighlight(false);
  }, [highlightTarget, highlightVisible, closeHighlight]);

  function focusFootnote(id: string, blocks = activeDocument.blocks) {
    const queue = [...blocks];
    while (queue.length) {
      const block = queue.shift()!;
      if (block.editorial?.hidden) continue;
      if (block.type === "footnotes" && block.notes.some(note => note.id === id)) {
        setRichTextMenuBlockId(null);
        onSelectBlock(block.id);
        requestAnimationFrame(() => {
          const field = [...(canvasScrollRef.current?.querySelectorAll<HTMLTextAreaElement>("textarea[data-studio-footnote-id]") ?? [])].find(element => element.dataset.studioFootnoteId === id);
          field?.focus();
          field?.setSelectionRange(0, 0);
        });
        return true;
      }
      queue.push(...childContentBlocks(block));
    }
    onSetPublishFeedback("That footnote’s text is missing or hidden. The reference has been retained.");
    return false;
  }

  function insertFootnote(block: EditableRichTextBlock) {
    if (!writable) return;
    if (currentListTextRange()) { onSetPublishFeedback("Select text within one List Item to insert a Footnote."); return; }
    const target = formattingTarget(block);
    if (target.type === "button") return;
    const context = activeListContext(target);
    const cell = activeTableCell(target);
    const selection = currentTextSelection(target.id, context?.itemIndex, context?.listId, cell);
    if (!selection) return;
    const content = richTextContent(target, context?.itemIndex, context?.listId, cell);
    const runs = content.runs?.length ? content.runs : textToRuns(content.text);
    const existing = footnoteReferenceAtRange(runs, selection.start, selection.end);
    if (existing) { focusFootnote(existing.id); return; }
    const id = `footnote-${crypto.randomUUID()}`;
    const nextRuns = insertFootnoteReference(runs, selection.end, id);
    if (!nextRuns) return;
    const source = withRichTextContent(target, plainTextFromRuns(nextRuns), nextRuns, context?.itemIndex, context?.listId, cell);
    const operation = addDocumentFootnote(activeDocument.blocks, source, id, `footnotes-${crypto.randomUUID()}`);
    if (operation && applyBlockList(operation.blocks)) focusFootnote(id, operation.blocks);
  }

  const mathField = (editor: HTMLElement) => richTextFieldFromDocument(editor, currentDocumentRef.current);

  function activateMathEditor(editor: HTMLElement, selection: TextSelection, explicit = false) {
    const dismissed = mathDismissedRef.current;
    if (!explicit && dismissed?.editor === editor && dismissed.start === selection.start && dismissed.end === selection.end) return;
    mathDismissedRef.current = null;
    if (!writableRef.current) return;
    const field = mathField(editor);
    const active = field && mathAtRange(field.runs, selection.start, selection.end);
    const legacy = field && legacyMathAtRange(field.runs, selection.start, selection.end);
    if (!field || !active && !legacy) {
      if (mathTarget && document.activeElement === editor) {
        if (field && !mathSource(mathTarget.math)) prepareRichTextFormTarget("math", { documentId: currentDocumentRef.current.id, ownerId: selectedLinkOwnerRef.current ?? field.block.id, blockId: field.block.id, itemIndex: field.itemIndex, listId: field.listId, cell: field.cell, editor, selection, range: null, baseline: JSON.stringify(field.runs), blockSnapshot: JSON.stringify(field.block) });
        else closeMath(false);
      }
      return;
    }
    const expression = active ?? legacy!;
    const math: InlineMath = active?.math ?? { ...legacy!.math };
    const prepared = prepareRichTextFormTarget("math", { documentId: currentDocumentRef.current.id, ownerId: selectedLinkOwnerRef.current ?? field.block.id, blockId: field.block.id, itemIndex: field.itemIndex, listId: field.listId, cell: field.cell, editor, selection: { start: expression.start, end: expression.end }, range: null, baseline: JSON.stringify(field.runs), blockSnapshot: JSON.stringify(field.block) });
    if (!prepared) return;
    setMathTarget(current => current?.editor === editor && current.start === prepared.selection.start && current.baseline === prepared.baseline ? current : { documentId: prepared.documentId, blockId: prepared.blockId, itemIndex: prepared.itemIndex, listId: prepared.listId, cell: prepared.cell, editor, start: prepared.selection.start, end: prepared.selection.end, baseline: prepared.baseline, blockSnapshot: prepared.blockSnapshot, math });
    setRichTextMenuBlockId(null);
  }

  function restoreMathSelection(editor: HTMLElement, start: number, end: number, expectedRuns?: string, pendingMarks?: TextMark[]) {
    const epoch = richFormSelectionEpochRef.current;
    const documentId = currentDocumentRef.current.id;
    const ownerId = selectedLinkOwnerRef.current;
    const capturedField = mathField(editor);
    if (!capturedField) return;
    requestAnimationFrame(() => {
      if (epoch !== richFormSelectionEpochRef.current || !editor.isConnected || !writableRef.current || currentDocumentRef.current.id !== documentId || selectedLinkOwnerRef.current !== ownerId) return;
      const field = mathField(editor);
      if (!field || field.block.id !== capturedField.block.id || field.itemIndex !== capturedField.itemIndex || field.listId !== capturedField.listId || JSON.stringify(field.cell) !== JSON.stringify(capturedField.cell) || expectedRuns !== undefined && JSON.stringify(field.runs) !== expectedRuns) return;
      editor.focus({ preventScroll: true });
      if (epoch !== richFormSelectionEpochRef.current) return;
      restoreEditorSelection(editor, { start, end });
      // Native focus can briefly select a different offset and clear pending formats.
      if (start === end && pendingMarks) caretFormats(editor, start, pendingMarks);
    });
  }

  function toggleMath() {
    const captured = highlightTargetRef.current;
    if (!writableRef.current || !captured || !captured.editor.isConnected || mathCaptureRef.current?.documentId !== currentDocumentRef.current.id) return;
    const field = mathField(captured.editor);
    if (!field) return;
    if (JSON.stringify(field.runs) !== mathCaptureRef.current?.baseline) { onSetPublishFeedback("The text changed while the menu was open. Reselect it to insert Math."); return; }
    const selection = captured.selection;
    const active = mathAtRange(field.runs, selection.start, selection.end);
    const legacy = legacyMathAtRange(field.runs, selection.start, selection.end);
    const restored = active ? restoreMathSource(field.runs, selection.start, selection.end) : null;
    const next = restored?.runs ?? (legacy ? replaceRichTextRuns(field.runs, legacy.start, legacy.end, legacy.sourceRuns) : createMathFromRange(field.runs, selection.start, selection.end));
    if (!next) { onSetPublishFeedback("Select plain text without an existing link, image or reference to convert it to Math."); return; }
    richFormSelectionEpochRef.current++;
    dismissRichTextForms("math");
    const baseline = JSON.stringify(field.runs);
    const documentId = currentDocumentRef.current.id;
    const blockSnapshot = JSON.stringify(field.block);
    onUpdateBlock(field.block.id, current => {
      if (!writableRef.current || currentDocumentRef.current.id !== documentId || !isEditableRichTextBlock(current) || JSON.stringify(current) !== blockSnapshot) return current;
      const fresh = richTextContent(current, field.itemIndex, field.listId, field.cell);
      if (JSON.stringify(fresh.runs?.length ? fresh.runs : textToRuns(fresh.text)) !== baseline) return current;
      return withRichTextContent(current, plainTextFromRuns(next), next, field.itemIndex, field.listId, field.cell);
    });
    setRichTextMenuBlockId(null);
    setMathTarget(null);
    if (active || legacy) restoreMathSelection(captured.editor, legacy?.start ?? selection.start, restored?.end ?? legacy!.end, JSON.stringify(next));
    else {
      const inserted = mathAtRange(next, selection.start, selection.start + 1)!;
      setMathTarget({ documentId: currentDocumentRef.current.id, blockId: field.block.id, itemIndex: field.itemIndex, listId: field.listId, cell: field.cell, editor: captured.editor, start: inserted.start, end: inserted.end, baseline: JSON.stringify(next), blockSnapshot: JSON.stringify(withRichTextContent(field.block, plainTextFromRuns(next), next, field.itemIndex, field.listId, field.cell)), math: inserted.math });
      restoreMathSelection(captured.editor, inserted.start, inserted.end, JSON.stringify(next));
    }
  }

  function updateMath(value: InlineMath): boolean {
    const target = mathTarget;
    if (!target || !writableRef.current || currentDocumentRef.current.id !== target.documentId) return false;
    const field = mathField(target.editor);
    if (!field || field.block.id !== target.blockId || field.itemIndex !== target.itemIndex || field.listId !== target.listId || JSON.stringify(field.cell) !== JSON.stringify(target.cell) || JSON.stringify(field.block) !== target.blockSnapshot || JSON.stringify(field.runs) !== target.baseline) return false;
    const legacy = legacyMathAtRange(field.runs, target.start, target.end);
    // Legacy Math remains a mark so editing its expression cannot discard old
    // prose, split formatting or reference metadata with a different source.
    const clearingLegacy = Boolean(legacy && !mathSource(value));
    const next = legacy ? updateTextMark(field.runs, legacy.start, legacy.end, { type: "math", latex: value.latex, mathml: value.mathml, alternativeText: value.alternativeText }, clearingLegacy ? "remove" : "set") : replaceRichTextRuns(field.runs, target.start, target.end, [mathRun(value)]);
    if (!next) return false;
    const baseline = JSON.stringify(next);
    if (baseline === target.baseline) return true;
    richFormSelectionEpochRef.current++;
    onUpdateBlock(target.blockId, current => {
      if (!writableRef.current || currentDocumentRef.current.id !== target.documentId || !isEditableRichTextBlock(current) || JSON.stringify(current) !== target.blockSnapshot) return current;
      const fresh = richTextContent(current, target.itemIndex, target.listId, target.cell);
      if (JSON.stringify(fresh.runs?.length ? fresh.runs : textToRuns(fresh.text)) !== target.baseline) return current;
      return withRichTextContent(current, plainTextFromRuns(next), next, target.itemIndex, target.listId, target.cell);
    });
    if (clearingLegacy) { setMathTarget(null); restoreMathSelection(target.editor, target.start, target.end, baseline); return true; }
    setMathTarget({ ...target, end: legacy ? legacy.end : target.start + 1, math: value, baseline, blockSnapshot: JSON.stringify(withRichTextContent(field.block, plainTextFromRuns(next), next, target.itemIndex, target.listId, target.cell)) });
    return true;
  }

  function closeMath(restoreFocus: boolean) {
    richFormSelectionEpochRef.current++;
    const target = mathTarget;
    setMathTarget(null);
    if (!target) return;
    mathDismissedRef.current = { editor: target.editor, start: target.start, end: target.end };
    let expectedRuns = target.baseline;
    if (!mathSource(target.math) && writableRef.current && currentDocumentRef.current.id === target.documentId) {
      const cleanedRuns = replaceRichTextRuns(JSON.parse(target.baseline), target.start, target.end, []);
      if (cleanedRuns) expectedRuns = JSON.stringify(cleanedRuns);
      onUpdateBlock(target.blockId, current => {
        if (!writableRef.current || currentDocumentRef.current.id !== target.documentId || !isEditableRichTextBlock(current) || JSON.stringify(current) !== target.blockSnapshot) return current;
        const content = richTextContent(current, target.itemIndex, target.listId, target.cell);
        const source = content.runs?.length ? content.runs : textToRuns(content.text);
        if (JSON.stringify(source) !== target.baseline) return current;
        const next = replaceRichTextRuns(source, target.start, target.end, []);
        return next ? withRichTextContent(current, plainTextFromRuns(next), next, target.itemIndex, target.listId, target.cell) : current;
      });
    }
    if (restoreFocus) restoreMathSelection(target.editor, target.start, mathSource(target.math) ? target.end : target.start, expectedRuns);
  }
  const mathFieldCurrent = mathTarget && mathTarget.documentId === activeDocument.id && mathTarget.editor.isConnected ? richTextFieldFromDocument(mathTarget.editor, activeDocument) : null;
  const mathVisible = Boolean(writable && mathTarget && mathFieldCurrent && !previewing && !codeEditor && JSON.stringify(mathFieldCurrent.runs) === mathTarget.baseline && JSON.stringify(mathFieldCurrent.block) === mathTarget.blockSnapshot);
  useLayoutEffect(() => {
    if (!mathTarget || mathVisible) return;
    const frame = requestAnimationFrame(() => closeMath(false));
    return () => cancelAnimationFrame(frame);
  });

  function currentLanguageField(target: LanguageTarget, document = currentDocumentRef.current) {
    if (!writableRef.current || document.id !== target.documentId || !target.editor.isConnected || selectedLinkOwnerRef.current !== target.ownerId) return null;
    const field = richTextFieldFromDocument(target.editor, document);
    if (!field || field.block.id !== target.blockId || field.itemIndex !== target.itemIndex || field.listId !== target.listId || JSON.stringify(field.cell) !== JSON.stringify(target.cell) || JSON.stringify(field.runs) !== target.baseline || JSON.stringify(field.block) !== target.blockSnapshot) return null;
    return field;
  }

  function commitLanguage(target: LanguageTarget, mark: LanguageMark, remove = false): boolean {
    const field = currentLanguageField(target);
    if (!field || !validLanguageCode(mark.language)) return false;
    const selection = target.selection;
    let range = selection;
    if (selection.start === selection.end) {
      const pending = caretFormats(target.editor, selection.start);
      if (!pending || JSON.stringify(pending) !== JSON.stringify(target.pending)) return false;
      caretFormats(target.editor, selection.start, changeCaretMark(pending, mark, remove ? "remove" : "set"));
      setTextSelections(current => ({ ...current }));
      if (!remove) { restoreMathSelection(target.editor, selection.start, selection.end, target.baseline, changeCaretMark(pending, mark, "set")); return true; }
      const extent = languageRangeAtCaret(field.runs, selection.start, mark);
      if (!extent) { restoreMathSelection(target.editor, selection.start, selection.end, target.baseline, changeCaretMark(pending, mark, "remove")); return true; }
      range = extent;
    }
    const next = updateTextMark(field.runs, range.start, range.end, mark, remove ? "remove" : "set");
    onUpdateBlock(target.blockId, current => {
      if (!currentLanguageField(target) || !isEditableRichTextBlock(current) || JSON.stringify(current) !== target.blockSnapshot) return current;
      const content = richTextContent(current, target.itemIndex, target.listId, target.cell);
      if (JSON.stringify(content.runs?.length ? content.runs : textToRuns(content.text)) !== target.baseline) return current;
      return withRichTextContent(current, plainTextFromRuns(next), next, target.itemIndex, target.listId, target.cell);
    });
    restoreMathSelection(target.editor, selection.start, selection.end, JSON.stringify(next), selection.start === selection.end ? changeCaretMark(target.pending ?? [], mark, "remove") : undefined);
    return true;
  }

  function toggleLanguage() {
    const captured = languageCaptureRef.current;
    if (!captured) return;
    const field = currentLanguageField(captured);
    if (!field) { onSetPublishFeedback("The text changed while the menu was open. Reselect it to use Language."); return; }
    const active = languageAtRange(field.runs, captured.selection.start, captured.selection.end, captured.pending);
    // Removing an existing format is an immediate command, not a form switch.
    if (active) {
      richFormSelectionEpochRef.current++;
      dismissRichTextForms("language");
      commitLanguage(captured, active, true);
      setRichTextMenuBlockId(null);
      return;
    }
    const target = prepareRichTextFormTarget("language", captured);
    if (!target) return;
    setRichTextMenuBlockId(null);
    setLanguageTarget(target);
  }

  function closeLanguage(restoreFocus: boolean) {
    richFormSelectionEpochRef.current++;
    const target = languageTarget;
    setLanguageTarget(null);
    if (restoreFocus && target && currentLanguageField(target)) restoreMathSelection(target.editor, target.selection.start, target.selection.end, target.baseline, target.pending);
  }

  function applyLanguage(mark: LanguageMark) {
    richFormSelectionEpochRef.current++;
    if (!languageTarget || !commitLanguage(languageTarget, mark)) return false;
    setLanguageTarget(null);
    return true;
  }
  const languageFieldCurrent = languageTarget && languageTarget.documentId === activeDocument.id && languageTarget.editor.isConnected ? richTextFieldFromDocument(languageTarget.editor, activeDocument) : null;
  const languageVisible = Boolean(writable && languageTarget && languageFieldCurrent && selectedBlockId === languageTarget.ownerId && !previewing && !codeEditor && JSON.stringify(languageFieldCurrent.runs) === languageTarget.baseline && JSON.stringify(languageFieldCurrent.block) === languageTarget.blockSnapshot);
  useLayoutEffect(() => {
    if (!languageTarget || languageVisible) return;
    const frame = requestAnimationFrame(() => closeLanguage(false));
    return () => cancelAnimationFrame(frame);
  });

  function currentImageField(target: InlineImageTarget, checkEpoch = true) {
    if (checkEpoch && target.epoch !== imageEpochRef.current || JSON.stringify(currentDocumentRef.current.blocks) !== target.documentSnapshot) return null;
    return currentLanguageField(target);
  }

  function captureImage(captured: LanguageTarget): InlineImageTarget | null {
    const field = currentLanguageField(captured);
    if (!field) return null;
    const prepared = prepareRichTextFormTarget("image", captured);
    if (!prepared) return null;
    imageDismissedRef.current = null;
    return { ...prepared, epoch: ++imageEpochRef.current, image: inlineImageAtRange(field.runs, captured.selection.start, captured.selection.end)?.image };
  }

  function openInlineImagePicker() {
    const captured = languageCaptureRef.current;
    const target = captured && captureImage(captured);
    if (!target) { onSetPublishFeedback("The text changed while the menu was open. Reselect it to insert an image."); return; }
    setRichTextMenuBlockId(null);
    setImageTarget(target);
    setImagePickerOpen(true);
  }

  function activateInlineImage(editor: HTMLElement, selection: TextSelection, explicit = false) {
    const dismissed = imageDismissedRef.current;
    if (imagePickerOpen || !writableRef.current || !explicit && dismissed?.editor === editor && dismissed.start === selection.start && dismissed.end === selection.end) return;
    const field = richTextFieldFromDocument(editor, currentDocumentRef.current);
    const active = field && inlineImageAtRange(field.runs, selection.start, selection.end);
    if (!field || !active) {
      if (imageTarget && document.activeElement === editor) closeInlineImage(false);
      return;
    }
    onSelectBlock(field.block.id);
    imageDismissedRef.current = null;
    if (imageTarget?.editor === editor && imageTarget.selection.start === selection.start && imageTarget.baseline === JSON.stringify(field.runs)) return;
    const prepared = prepareRichTextFormTarget("image", {
      documentId: currentDocumentRef.current.id, ownerId: field.block.id, blockId: field.block.id, itemIndex: field.itemIndex, listId: field.listId, cell: field.cell, editor, selection, range: null,
      baseline: JSON.stringify(field.runs), blockSnapshot: JSON.stringify(field.block),
    });
    if (!prepared) return;
    setImageTarget({ ...prepared, epoch: ++imageEpochRef.current, image: active.image });
    setRichTextMenuBlockId(null);
  }

  function closeInlineImage(restoreFocus: boolean) {
    richFormSelectionEpochRef.current++;
    const target = imageTarget;
    const fresh = target && currentImageField(target);
    imageEpochRef.current++;
    setImageTarget(null);
    setImagePickerOpen(false);
    if (!target) return;
    imageDismissedRef.current = { editor: target.editor, start: target.selection.start, end: target.selection.end };
    if (restoreFocus && fresh) restoreMathSelection(target.editor, target.selection.start, target.selection.end, target.baseline);
  }

  /** Switching rich forms must not restore an older selection or revive decoding. */
  function dismissRichTextForms(keep: "highlight" | "language" | "math" | "image" | "link") {
    if (keep !== "highlight" && highlightTarget) closeHighlight(false);
    if (keep !== "language" && languageTarget) closeLanguage(false);
    if (keep !== "math" && mathTarget) closeMath(false);
    if (keep !== "image" && imageTarget) closeInlineImage(false);
    if (keep !== "link" && linkEditor) closeLink(false);
  }

  /** Project the next capture through guarded empty-equation cleanup in this event. */
  function prepareRichTextFormTarget(keep: "highlight" | "language" | "math" | "image" | "link", captured: LanguageTarget): (LanguageTarget & { documentSnapshot: string }) | null {
    if (!currentLanguageField(captured)) return null;
    richFormSelectionEpochRef.current++;
    let projectedDocument = currentDocumentRef.current;
    let selection = captured.selection;
    const empty = mathTarget && !mathSource(mathTarget.math) && (keep !== "math" || mathTarget.editor !== captured.editor || mathTarget.start !== selection.start || mathTarget.end !== selection.end) ? mathTarget : null;
    if (empty && empty.documentId === projectedDocument.id && empty.editor.isConnected) {
      const field = richTextFieldFromDocument(empty.editor, projectedDocument);
      if (field && JSON.stringify(field.block) === empty.blockSnapshot && JSON.stringify(field.runs) === empty.baseline) {
        const runs = replaceRichTextRuns(field.runs, empty.start, empty.end, []);
        if (!runs) return null;
        const replacement = withRichTextContent(field.block, plainTextFromRuns(runs), runs, field.itemIndex, field.listId, field.cell);
        projectedDocument = { ...projectedDocument, blocks: editBlockSiblings(projectedDocument.blocks, field.block.id, (siblings, index) => siblings.map((block, position) => position === index ? replacement : block)) };
        if (empty.editor === captured.editor) {
          const rebase = (offset: number) => offset <= empty.start ? offset : offset >= empty.end ? offset - (empty.end - empty.start) : empty.start;
          selection = { start: rebase(selection.start), end: rebase(selection.end) };
        }
      }
    }
    const field = richTextFieldFromDocument(captured.editor, projectedDocument);
    if (!field) return null;
    const prepared = { ...captured, selection, range: null, baseline: JSON.stringify(field.runs), blockSnapshot: JSON.stringify(field.block), documentSnapshot: JSON.stringify(projectedDocument.blocks) };
    dismissRichTextForms(keep);
    if (keep === "math" && empty) closeMath(false);
    const epoch = richFormSelectionEpochRef.current;
    if (projectedDocument !== currentDocumentRef.current) {
      requestAnimationFrame(() => {
        if (epoch === richFormSelectionEpochRef.current && JSON.stringify(currentDocumentRef.current.blocks) === prepared.documentSnapshot && currentLanguageField(prepared) && captured.editor === document.activeElement) restoreEditorSelection(captured.editor, prepared.selection);
      });
    }
    return prepared;
  }

  function changeInlineImage(value: InlineImage, insertion = false): boolean {
    const target = imageTarget;
    const field = target && currentImageField(target);
    if (!target || !field || !validInlineImageRun(inlineImageRun(value))) return false;
    richFormSelectionEpochRef.current++;
    if (!insertion && !inlineImageAtRange(field.runs, target.selection.start, target.selection.end)) return false;
    const next = insertInlineImage(field.runs, target.selection.start, target.selection.end, value);
    if (!next) return false;
    const baseline = JSON.stringify(next);
    if (baseline === target.baseline) {
      if (insertion) { closeInlineImage(false); restoreMathSelection(target.editor, target.selection.end, target.selection.end, baseline); }
      return true;
    }
    const updated = withRichTextContent(field.block, plainTextFromRuns(next), next, field.itemIndex, field.listId, field.cell);
    const blocks = editBlockSiblings(currentDocumentRef.current.blocks, target.blockId, (siblings, index) => siblings.map((block, position) => position === index ? updated : block));
    if (!validContentBlocks(blocks)) return false;
    // Dismissal cancels pending decoding. A chosen operation still checks the
    // captured document, field and ownership inside a replayable updater.
    onUpdateBlock(target.blockId, current => {
      if (!currentImageField(target, false) || !isEditableRichTextBlock(current) || JSON.stringify(current) !== target.blockSnapshot) return current;
      const fresh = richTextContent(current, target.itemIndex, target.listId, target.cell);
      if (JSON.stringify(fresh.runs?.length ? fresh.runs : textToRuns(fresh.text)) !== target.baseline) return current;
      return updated;
    });
    if (insertion) {
      imageEpochRef.current++;
      setImageTarget(null);
      setImagePickerOpen(false);
      restoreMathSelection(target.editor, target.selection.start + 1, target.selection.start + 1, baseline);
    } else setImageTarget({ ...target, image: value, baseline, blockSnapshot: JSON.stringify(updated), documentSnapshot: JSON.stringify(blocks) });
    return true;
  }

  const imageFieldCurrent = imageTarget && imageTarget.documentId === activeDocument.id && imageTarget.editor.isConnected ? richTextFieldFromDocument(imageTarget.editor, activeDocument) : null;
  const imageVisible = Boolean(writable && imageTarget && imageFieldCurrent && selectedBlockId === imageTarget.ownerId && !previewing && !codeEditor && JSON.stringify(activeDocument.blocks) === imageTarget.documentSnapshot && JSON.stringify(imageFieldCurrent.runs) === imageTarget.baseline && JSON.stringify(imageFieldCurrent.block) === imageTarget.blockSnapshot);
  useLayoutEffect(() => {
    if (!imageTarget || imageVisible) return;
    const cancelledEpoch = ++imageEpochRef.current;
    richFormSelectionEpochRef.current++;
    requestAnimationFrame(() => {
      if (imageEpochRef.current !== cancelledEpoch) return;
      setImageTarget(null);
      setImagePickerOpen(false);
    });
  });
  useLayoutEffect(() => () => { imageEpochRef.current++; }, []);

  function setTextAlignment(block: EditableTextBlock, align: TextAlignment) {
    onUpdateBlock(block.id, () => ({ ...block, align }));
    setAlignmentMenuBlockId(null);
  }

  function applyBlockTransform(block: ContentBlock, transform: BlockTransform) {
    const current = findBlockById(activeDocument.blocks, block.id);
    if (!writable || !current || !availableBlockTransforms(current, parentOfNestedBlock(activeDocument.blocks, current.id)).some(candidate => candidate.id === transform.id)) return;
    const transformed = transformContentBlock(current, transform);
    const next = editBlockSiblings(activeDocument.blocks, current.id, (siblings, index) => siblings.map((candidate, position) => position === index ? transformed : candidate));
    if (!applyBlockList(next)) return;
    setTransformMenuBlockId(null);
  }

  function formatSelectedText(block: EditableRichTextBlock, mark: TextMark, mode: "toggle" | "set" | "remove" = "toggle", selection?: TextSelection, itemIndex?: number, listId?: string, cell = activeTableCell(block)) {
    if (!writable) return;
    const acrossItems = currentListTextRange();
    if (acrossItems) {
      const documentId = activeDocument.id;
      onUpdateBlock(acrossItems.root.id, current => writableRef.current && currentDocumentRef.current.id === documentId && current.type === "list" ? formatListText(current, acrossItems.selection, mark, mode) : current);
      requestAnimationFrame(() => {
        if (currentDocumentRef.current.id === documentId && acrossItems.element.isConnected) restoreListTextSelection(acrossItems.element, acrossItems.selection);
      });
      return;
    }
    block = formattingTarget(block);
    if (block.type === "button" && isInteractiveTextMark(mark)) return;
    const context = activeListContext(block);
    const targetIndex = itemIndex ?? context?.itemIndex;
    const targetListId = listId ?? context?.listId;
    const targetSelection = selection ?? textSelectionsRef.current[selectionKey(block.id, targetIndex, targetListId, cell)];
    if (!targetSelection) return;
    if (targetSelection.start === targetSelection.end) {
      const editor = textEditor(block.id, targetIndex, targetListId, cell);
      if (editor) restoreEditorSelection(editor, targetSelection);
      const marks = caretFormats(editor, targetSelection.start);
      if (marks) caretFormats(editor, targetSelection.start, changeCaretMark(marks, mark, mode));
      setTextSelections(current => ({ ...current }));
      return;
    }
    const content = richTextContent(formattingTarget(block), targetIndex, targetListId, cell);
    const runs = content.runs?.length ? content.runs : textToRuns(content.text);
    const nextRuns = updateTextMark(runs, targetSelection.start, targetSelection.end, mark, mode);
    onUpdateBlock(block.id, (current) => {
      if (!isEditableRichTextBlock(current)) return current;
      return withRichTextContent(current, plainTextFromRuns(nextRuns), nextRuns, targetIndex, targetListId, cell);
    });
  }

  function openLinkEditor(block: EditableRichTextBlock, selectionOverride?: TextSelection, mode: LinkEditorState["mode"] = "edit", itemIndex?: number, listId?: string, cell = activeTableCell(block)) {
    if (currentListTextRange()) { onSetPublishFeedback("Select text within one List Item to add a link."); return; }
    if (!writableRef.current || formattingTarget(block).type === "button") return;
    captureHighlightTarget(block);
    const captured = languageCaptureRef.current;
    if (!captured || itemIndex !== undefined && captured.itemIndex !== itemIndex || listId !== undefined && captured.listId !== listId || cell && JSON.stringify(captured.cell) !== JSON.stringify(cell)) return;
    const ownerId = selectedLinkOwnerRef.current;
    const owner = ownerId && findBlockById(currentDocumentRef.current.blocks, ownerId);
    if (!owner || !collectBlockIds(owner).includes(captured.blockId)) return;
    const prepared = prepareRichTextFormTarget("link", { ...captured, ownerId, selection: selectionOverride ?? captured.selection });
    if (!prepared) return;
    const runs: RichTextRun[] = JSON.parse(prepared.baseline);
    const existing = textLinkAtRange(runs, prepared.selection, prepared.pending);
    if (mode === "preview" && !existing) return;
    const selection = existing ? { start: existing.start, end: existing.end } : prepared.selection;
    setLinkError(null);
    setRichTextMenuBlockId(null);
    setLinkEditor({ ...prepared, range: captured.baseline === prepared.baseline ? captured.range : null, selection, returnSelection: prepared.selection, url: existing?.mark.url ?? "", text: plainTextFromRuns(runs).slice(selection.start, selection.end), existingUrl: existing?.mark.url ?? null, opensInNewTab: Boolean(existing?.mark.opensInNewTab), advancedOpen: Boolean(existing?.mark.opensInNewTab), mode });
  }

  function closeLink(restoreFocus: boolean) {
    const target = linkEditor;
    richFormSelectionEpochRef.current++;
    setLinkEditor(null);
    setLinkError(null);
    if (restoreFocus && target && currentLanguageField(target)) restoreMathSelection(target.editor, target.returnSelection.start, target.returnSelection.end, target.baseline, target.pending);
  }

  function commitLink(target: LinkEditorState, nextRuns: RichTextRun[], selection: TextSelection) {
    if (!currentLanguageField(target) || JSON.stringify(currentDocumentRef.current.blocks) !== target.documentSnapshot) return false;
    const baseline = JSON.stringify(nextRuns);
    if (baseline !== target.baseline) onUpdateBlock(target.blockId, current => {
      if (!currentLanguageField(target) || JSON.stringify(currentDocumentRef.current.blocks) !== target.documentSnapshot || !isEditableRichTextBlock(current) || current.type === "button" || JSON.stringify(current) !== target.blockSnapshot) return current;
      const content = richTextContent(current, target.itemIndex, target.listId, target.cell);
      if (JSON.stringify(content.runs?.length ? content.runs : textToRuns(content.text)) !== target.baseline) return current;
      return withRichTextContent(current, plainTextFromRuns(nextRuns), nextRuns, target.itemIndex, target.listId, target.cell);
    });
    closeLink(false);
    restoreMathSelection(target.editor, selection.start, selection.end, baseline, selection.start === selection.end ? marksAtCaret(nextRuns, selection.start).filter(mark => typeof mark === "string" || mark.type !== "link") : undefined);
    return true;
  }

  function applyLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = linkEditor;
    const field = target && currentLanguageField(target);
    if (!target || !field || field.block.type === "button") return;
    if (!safeTextLink(target.url)) { setLinkError("Use a full URL, email link, /path or #anchor."); return; }
    const next = applyTextLink(field.runs, target.selection, target, target.pending);
    if (!next) { setLinkError("Keep inline objects unchanged when editing the link text."); return; }
    if (!commitLink(target, next.runs, { start: next.end, end: next.end })) setLinkError("The text changed. Close and reopen the link to use its latest value.");
  }

  function removeLink() {
    const target = linkEditor;
    const field = target && currentLanguageField(target);
    const next = target && field && removeTextLink(field.runs, target.selection);
    if (target && next) commitLink(target, next, target.returnSelection);
  }

  const linkFieldCurrent = linkEditor && linkEditor.editor.isConnected ? richTextFieldFromDocument(linkEditor.editor, activeDocument) : null;
  const linkVisible = Boolean(writable && linkEditor && !previewing && !codeEditor && activeDocument.id === linkEditor.documentId && selectedBlockId === linkEditor.ownerId && linkFieldCurrent && JSON.stringify(linkFieldCurrent.block) === linkEditor.blockSnapshot && JSON.stringify(linkFieldCurrent.runs) === linkEditor.baseline && JSON.stringify(activeDocument.blocks) === linkEditor.documentSnapshot);
  useLayoutEffect(() => {
    if (linkEditor && !linkVisible) {
      richFormSelectionEpochRef.current++;
      // Selection and write ownership can invalidate the external editor target.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLinkEditor(null);
      setLinkError(null);
    }
  }, [linkEditor, linkVisible]);

  const linkSuggestions = linkEditor
    ? linkTargets.filter((target) => `${target.title} ${target.href} ${target.kind}`.toLowerCase().includes(linkEditor.url.trim().toLowerCase())).slice(0, 5)
    : [];
  const safeCoverImageUrl = activeDocument.coverImage?.mediaId
    ? safeImageSource(coverImageUrl ?? "", { allowBlob: true })
    : safeImageSource(coverImageUrl ?? "");
  function renderEditableBlock(block: ContentBlock, options: StudioEditableBlockOptions = {}, index = activeDocument.blocks.findIndex(candidate => candidate.id === block.id)): ReactNode {
    return <BlockField htmlEditorBlockId={htmlEditor?.blockId} renderBlockControls={renderBlockControls} block={block} rootBlocks={activeDocument.blocks} document={options.document ?? activeDocument} templatePlaceholder={options.templatePlaceholder} spacerOrientation={options.spacerOrientation} buttonPreview={buttonPreview} selectedBlockId={selectedBlockId} hoveredBlockId={hoveredBlockId} previousParagraphIndent={indentFromPreviousParagraph(activeDocument.blocks, index)} pendingColumnsLayoutBlockId={pendingColumnsLayoutBlockId} onColumnsLayoutSelected={onColumnsLayoutSelected} pendingGroupLayoutBlockId={pendingGroupLayoutBlockId} onGroupLayoutSelected={onGroupLayoutSelected} coverImageUrl={coverImageUrl} onOpenCoverMediaLibrary={onOpenCoverMediaLibrary} onRemoveCoverImage={onRemoveCoverImage} mediaUrls={mediaBlockUrls} mediaUrl={block.type === "image" && block.mediaId ? mediaBlockUrls[block.mediaId] : undefined} onTableCellFocus={(rowIndex, columnIndex) => {
                const id = focusedTextBlockId(block.id);
                setTableCellSelections(current => ({ ...current, [id]: { rowIndex, columnIndex } }));
                setTableTextTargets(current => ({ ...current, [id]: { kind: "cell", rowIndex, columnIndex } }));
              }} onTextSelection={(selection, rowIndex, columnIndex) => recordTextSelection(block.id, selection, rowIndex, columnIndex)} onLinkActivate={(selection, rowIndex, columnIndex) => activateTextLink(block.id, selection, rowIndex, columnIndex)} onListItemSelection={(list, itemIndex, selection) => { const targetId = setTextSelection(block.id, selection, itemIndex, list.id); const next = { listId: list.id, itemIndex }; setActiveListItems(current => ({ ...current, [block.id]: next, [targetId]: next })); onSelectBlock(targetId); onSelectListItem?.({ blockId: targetId, listId: list.id, itemIndex }); }} onListItemLinkActivate={(list, itemIndex, selection) => { const target = findBlockById(activeDocument.blocks, nestedRichTextTargets[block.id] ?? block.id); if (target?.type === "list") openLinkEditor(target, selection, "preview", itemIndex, list.id); }} onSplitParagraph={onSplitParagraph} onMergeParagraphBackward={onMergeParagraphBackward} onSplitParagraphs={onSplitParagraphs} onExitList={onExitList} onOpenNestedInserter={(parentId) => openInserter(null, undefined, parentId)} writable={writable} onInsertNestedBlock={(type, parentId) => { if (writable) onInsertBlock(type, parentId); }} onChange={(next, requireSourceMatch) => onUpdateBlock(block.id, current => !requireSourceMatch || JSON.stringify(current) === JSON.stringify(block) ? next : current)} />;
  }
  function selectDocumentField(field: "title" | "subtitle") {
    onFocusDocumentField(field);
  }
  const hasDynamicTitle = activeDocument.blocks.some((block) => block.type === "document-title");
  const hasDynamicSubtitle = activeDocument.blocks.some((block) => block.type === "document-subtitle");
  const hasDynamicCover = activeDocument.blocks.some((block) => block.type === "cover-image");
  function renderBlockControls(block: ContentBlock): ReactNode {
    if (!findBlockById(activeDocument.blocks, block.id)) return null;
    const rangeRoot = listTextRange && findBlockById(activeDocument.blocks, listTextRange.rootId);
    const acrossListItems = Boolean(listTextRange && rangeRoot?.type === "list" && listTextSegments(rangeRoot, listTextRange));
    const singleItemHint = acrossListItems ? "Select text within one List Item for this action." : undefined;
    return <>
                    <div className={`canvas-block-toolbar${block.type === "table" ? " is-table-toolbar" : ""}`}>
                      <BlockTransformControl block={block} parent={parentOfNestedBlock(activeDocument.blocks, block.id)} writable={writable} open={transformMenuBlockId === block.id} onOpenChange={(open) => setTransformMenuBlockId(open ? block.id : null)} onTransform={(transform) => applyBlockTransform(block, transform)} />
                      <button className="drag-handle" type="button" disabled={!writable || Boolean(block.editorial?.lock?.move)} draggable={!block.editorial?.lock?.move && writable} onClick={() => selectBlockBoundary(block.id)} onDragStart={(event) => {
                        event.stopPropagation();
                        const index = activeDocument.blocks.findIndex(root => root.id === block.id);
                        draggingIndexRef.current = index >= 0 ? index : null;
                        nestedDragBlockIdRef.current = index < 0 ? block.id : null;
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("application/x-acm-studio-move", block.id);
                        onSetDragOverIndex(null);
                        // Let the browser capture the source before collapsing its toolbar space.
                        requestAnimationFrame(() => { if (draggingIndexRef.current !== null || nestedDragBlockIdRef.current) beginBlockDrag(); });
                      }} onDragEnd={finishBlockDrag} aria-label={`Drag to reorder ${block.type === "group" ? groupVariationFor(block).label : blockLabel(block.type)} block`} title="Drag to reorder block"><StudioHoverIcon name="arrange.reorder" /></button>
                      <div className="block-move-controls" role="group" aria-label="Move block">
                        <button className="move-block-up" type="button" onClick={(event) => { event.stopPropagation(); moveSibling(block, -1); }} disabled={!canMove(block, -1)} aria-label="Move block up" title="Move up"><StudioHoverIcon name="arrange.move-up" /></button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); moveSibling(block, 1); }} disabled={!canMove(block, 1)} aria-label="Move block down" title="Move down"><StudioHoverIcon name="arrange.move-down" /></button>
                      </div>
                      {isBlockAlignedBlock(block) ? <div className="block-alignment-control">
                        <button ref={element => { blockAlignmentTriggerRefs.current[block.id] = element; }} className={`block-alignment-button${blockAlignmentMenuBlockId === block.id ? " is-active" : ""}`} type="button" onMouseDown={preserveTextSelection} onClick={() => setBlockAlignmentMenuBlockId(current => current === block.id ? null : block.id)} aria-haspopup="menu" aria-expanded={blockAlignmentMenuBlockId === block.id} aria-label="Align block" title="Align">
                          <StudioHoverIcon name={blockAlignmentIcon(contentBlockAlignment(block))} />
                          <StudioHoverIcon name="navigation.disclosure" size={16} />
                        </button>
                        {blockAlignmentMenuBlockId === block.id ? <div className="block-alignment-menu" role="menu" tabIndex={-1} aria-label="Align block" onKeyDown={event => {
                          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setBlockAlignmentMenuBlockId(null); requestAnimationFrame(() => blockAlignmentTriggerRefs.current[block.id]?.focus()); return; }
                          navigateStudioMenu(event, () => {
                            setBlockAlignmentMenuBlockId(null);
                            blockAlignmentTriggerRefs.current[block.id]?.focus();
                          });
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
                      {block.type === "table" && block.rows.length ? <><div className="alignment-control"><button ref={element => { tableAlignmentTriggerRefs.current[block.id] = element; }} className={`alignment-button${tableAlignmentMenuBlockId === block.id ? " is-active" : ""}`} type="button" onMouseDown={preserveTextSelection} onClick={() => { if (tableAlignmentMenuBlockId === block.id) { setTableAlignmentMenuBlockId(null); tableAlignmentTriggerRefs.current[block.id]?.focus(); } else setTableAlignmentMenuBlockId(block.id); }} aria-haspopup="menu" aria-expanded={tableAlignmentMenuBlockId === block.id} aria-label="Align column content" title="Align column content" disabled={!writable || !validTableActiveCell(block, tableCellSelections[block.id])}><AlignmentIcon align={block.columnAlignments?.[tableCellSelections[block.id]?.columnIndex ?? 0] ?? "left"} /><StudioHoverIcon name="navigation.disclosure" size={16} /></button>{tableAlignmentMenuBlockId === block.id ? <StudioAnchoredMenu anchor={() => tableAlignmentTriggerRefs.current[block.id]} className="alignment-menu" aria-label="Align column content" onClose={restoreFocus => { setTableAlignmentMenuBlockId(null); if (restoreFocus !== false) tableAlignmentTriggerRefs.current[block.id]?.focus(); }}>{(["left", "centre", "right"] as TextAlignment[]).map(alignment => { const columnIndex = tableCellSelections[block.id]?.columnIndex ?? 0; const active = (block.columnAlignments?.[columnIndex] ?? "left") === alignment; return <button className={active ? "is-active" : ""} type="button" role="menuitemradio" aria-checked={active} key={alignment} onMouseDown={preserveTextSelection} onClick={() => { if (!writable || !validTableActiveCell(block, tableCellSelections[block.id])) return; const count = block.rows[0].length; const columnAlignments = Array.from({ length: count }, (_, index) => block.columnAlignments?.[index] ?? "left" as TextAlignment); columnAlignments[columnIndex] = alignment; onUpdateBlock(block.id, () => ({ ...block, columnAlignments })); setTableAlignmentMenuBlockId(null); requestAnimationFrame(() => tableAlignmentTriggerRefs.current[block.id]?.focus()); }}><AlignmentIcon align={alignment} /><span>Align column {alignment}</span></button>; })}</StudioAnchoredMenu> : null}</div><TableControls key={JSON.stringify([block.id, tableRowSections(block), block.rows.map(row => row.length), writable])} block={block} writable={writable} activeCell={tableCellSelections[block.id]} onActiveCellChange={cell => {
                        setTableCellSelections(current => cell ? { ...current, [block.id]: cell } : Object.fromEntries(Object.entries(current).filter(([id]) => id !== block.id)));
                        const prefix = `${block.id}:cell:`;
                        Object.keys(textSelectionsRef.current).filter(key => key.startsWith(prefix)).forEach(key => { delete textSelectionsRef.current[key]; });
                        setTextSelections(current => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(prefix))));
                        setCaretFormatSnapshots(current => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(prefix))));
                      }} onChange={next => onUpdateBlock(block.id, () => next)} /></> : null}
                      {block.type === "table" && block.rows.length > 0 ? <TableCaptionControl block={block} writable={writable} onChange={next => {
                        const affectedTable = new Set([next.id]);
                        const staleSelection = (key: string) => staleTableTextSelection(key, affectedTable);
                        Object.keys(textSelectionsRef.current).filter(staleSelection).forEach(key => { delete textSelectionsRef.current[key]; });
                        setTextSelections(current => Object.fromEntries(Object.entries(current).filter(([key]) => !staleSelection(key))));
                        setCaretFormatSnapshots(current => Object.fromEntries(Object.entries(current).filter(([key]) => !staleSelection(key))));
                        setTableTextTargets(current => Object.fromEntries(Object.entries(current).filter(([id]) => id !== next.id)));
                        setLinkEditor(null);
                        setLanguageTarget(null);
                        onUpdateBlock(next.id, () => next);
                      }} /> : null}
                      {isEditableTextBlock(block) || block.type === "button" || block.type === "list" || block.type === "image" || (block.type === "table" && block.rows.length > 0) || (block.type === "embed" && Boolean(safeTextLink(block.url))) ? <div className="canvas-format-actions" aria-label="Text formatting">
                        {isEditableTextBlock(block) ? <div className="alignment-control"><button className={`alignment-button${alignmentMenuBlockId === block.id ? " is-active" : ""}`} type="button" onMouseDown={preserveTextSelection} onClick={() => setAlignmentMenuBlockId((current) => current === block.id ? null : block.id)} aria-haspopup="menu" aria-expanded={alignmentMenuBlockId === block.id} aria-label="Text alignment" title="Text alignment"><AlignmentIcon align={block.align ?? "left"} /><StudioHoverIcon name="navigation.disclosure" size={16} /></button>{alignmentMenuBlockId === block.id ? <div className="alignment-menu" role="menu" aria-label="Text alignment">{(["left", "centre", "right"] as TextAlignment[]).map((align) => <button className={block.align === align || (!block.align && align === "left") ? "is-active" : ""} type="button" role="menuitemradio" aria-checked={block.align === align || (!block.align && align === "left")} key={align} onMouseDown={preserveTextSelection} onClick={() => setTextAlignment(block, align)}><AlignmentIcon align={align} /><span>Align text {align}</span></button>)}</div> : null}</div> : null}
                        <button className={textMarkState(block, "bold") === true ? "is-active" : ""} type="button" onMouseDown={preserveTextSelection} onClick={() => formatSelectedText(block, "bold")} aria-pressed={textMarkState(block, "bold")} disabled={!writable} aria-label="Bold selected text" title="Bold"><StudioHoverIcon name="text.bold" /></button>
                        <button className={textMarkState(block, "italic") === true ? "is-active" : ""} type="button" onMouseDown={preserveTextSelection} onClick={() => formatSelectedText(block, "italic")} aria-pressed={textMarkState(block, "italic")} disabled={!writable} aria-label="Italicise selected text" title="Italic"><StudioHoverIcon name="text.italic" /></button>
                        {block.type === "button" ? <ButtonLinkControl key={`${activeDocument.id}:${block.id}`} value={block} selected={selectedBlockId === block.id && !previewing} writable={writable} anchor={() => textEditor(block.id) ?? null} suggestions={linkTargets} onCaptureSelection={() => { buttonLinkSelectionsRef.current[block.id] = currentTextSelection(block.id); }} onReturnFocus={() => {
                          requestAnimationFrame(() => {
                            const editor = textEditor(block.id);
                            if (!editor || !writableRef.current || currentDocumentRef.current.id !== activeDocument.id || selectedLinkOwnerRef.current !== block.id || findBlockById(currentDocumentRef.current.blocks, block.id)?.type !== "button") return;
                            editor.focus({ preventScroll: true });
                            const selection = buttonLinkSelectionsRef.current[block.id];
                            if (selection) restoreEditorSelection(editor, selection);
                          });
                        }} onApply={(draft, baseline) => {
                          const currentDocument = currentDocumentRef.current;
                          const current = findBlockById(currentDocument.blocks, block.id);
                          if (!writableRef.current || currentDocument.id !== activeDocument.id || current?.type !== "button") return "This Button is no longer editable.";
                          if (!sameLinkDestination(current, baseline)) return "The link changed while you were editing. Close and reopen it to use its latest value.";
                          const destination = updatedLinkDestination(current, draft);
                          if (!destination) return "Use a full URL, email link, /path or #anchor.";
                          if (!equivalentLinkDestination(current, destination)) onUpdateBlock(block.id, fresh => fresh.type === "button" && sameLinkDestination(fresh, baseline) ? { ...fresh, ...destination } : fresh);
                          return null;
                        }} onUnlink={() => {
                          if (!writableRef.current || currentDocumentRef.current.id !== activeDocument.id) return;
                          onUpdateBlock(block.id, fresh => fresh.type === "button" && (fresh.url || fresh.opensInNewTab !== undefined || fresh.rel !== undefined) ? { ...fresh, ...clearedLinkDestination() } : fresh);
                        }} /> : <button ref={element => { linkTriggerRefs.current[block.id] = element; }} type="button" onMouseDown={preserveTextSelection} onClick={event => { event.stopPropagation(); if (linkEditor?.ownerId === block.id) closeLink(true); else openLinkEditor(block); }} disabled={!writable || acrossListItems} aria-haspopup="dialog" aria-expanded={linkEditor?.ownerId === block.id} aria-label="Add or edit hyperlink" title={singleItemHint ?? "Add hyperlink"}><StudioHoverIcon name="action.link" /></button>}
                        <div className="rich-text-format-control"><button ref={element => { richTextMenuTriggerRefs.current[block.id] = element; }} type="button" onMouseDown={preserveTextSelection} onClick={() => { if (richTextMenuBlockId === block.id) { restoreRichTextMenuFocusBlockIdRef.current = block.id; setRichTextMenuBlockId(null); } else { captureHighlightTarget(block); setRichTextMenuBlockId(block.id); } }} aria-haspopup="menu" aria-expanded={richTextMenuBlockId === block.id} disabled={!writable} aria-label="More text formatting" title="More text formatting"><StudioHoverIcon name="navigation.disclosure" /></button>{writable && richTextMenuBlockId === block.id ? <StudioAnchoredMenu anchor={() => richTextMenuTriggerRefs.current[block.id]} className="rich-text-format-menu" aria-label="More text formatting" onClose={() => { restoreRichTextMenuFocusBlockIdRef.current = block.id; setRichTextMenuBlockId(null); }} onOutside={() => setRichTextMenuBlockId(null)} onKeyDown={event => {
                          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); restoreRichTextMenuFocusBlockIdRef.current = block.id; setRichTextMenuBlockId(null); return; }
                          if (event.key === "Tab") {
                            event.preventDefault();
                            setRichTextMenuBlockId(null);
                            if (event.shiftKey) richTextMenuTriggerRefs.current[block.id]?.focus();
                            else richTextMenuTriggerRefs.current[block.id]?.closest(".canvas-block-toolbar")?.querySelector<HTMLButtonElement>(".canvas-block-actions button:not(:disabled)")?.focus();
                            return;
                          }
                          navigateStudioMenu(event, () => {
                            restoreRichTextMenuFocusBlockIdRef.current = block.id;
                            setRichTextMenuBlockId(null);
                          });
                        }}>
                          {formattingTarget(block).type !== "button" ? <button type="button" role="menuitem" disabled={!writable || acrossListItems} title={singleItemHint} onMouseDown={preserveTextSelection} onClick={() => insertFootnote(block)}><StudioHoverIcon name="text.footnote" size={20} /><span>Footnote</span></button> : null}
                          <button type="button" role="menuitem" onMouseDown={preserveTextSelection} disabled={!highlightCaptureAvailable || !writable || acrossListItems} title={singleItemHint} onClick={openHighlight}><StudioHoverIcon name="insert.highlight" size={20} /><span>Highlight</span></button>
                          {formatMarkButton(block, "inline-code", "Inline code", "text.code")}
                          <button type="button" role="menuitem" className={imageMenuActive ? "is-active" : ""} disabled={!writable || !languageMenuAvailable} onMouseDown={preserveTextSelection} onClick={openInlineImagePicker}><StudioHoverIcon name="insert.image" size={20} /><span>{imageMenuActive ? "Replace image" : "Inline image"}</span></button>
                          {formatMarkButton(block, "keyboard", "Keyboard input", "text.keyboard")}
                          <button className={languageMenuActive ? "is-active" : ""} type="button" role="menuitemcheckbox" aria-checked={languageMenuActive} disabled={!writable || !languageMenuAvailable || acrossListItems} title={singleItemHint} onMouseDown={preserveTextSelection} onClick={toggleLanguage}><StudioHoverIcon name="text.language" size={20} /><span>Language</span></button>
                          <button className={mathMenuActive ? "is-active" : ""} type="button" role="menuitemcheckbox" aria-checked={mathMenuActive} disabled={!writable || acrossListItems} title={singleItemHint} onMouseDown={preserveTextSelection} onClick={() => toggleMath()}><StudioHoverIcon name="text.math" size={20} /><span>Math</span></button>
                          {formatMarkButton(block, "strikethrough", "Strikethrough", "text.strikethrough")}
                          {formatMarkButton(block, "subscript", "Subscript", "text.subscript")}
                          {formatMarkButton(block, "superscript", "Superscript", "text.superscript")}
                        </StudioAnchoredMenu> : null}
</div>
                      </div> : null}
                      <div className="canvas-block-actions">
                        <button type="button" onClick={(event) => { event.stopPropagation(); void runBlockMenuAction("duplicate", block); }} disabled={blockMenuItems(block).find(item => item.action === "duplicate")?.disabled} aria-label="Duplicate block" title="Duplicate block"><StudioHoverIcon name="action.duplicate" /></button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); void runBlockMenuAction("delete", block); }} disabled={blockMenuItems(block).find(item => item.action === "delete")?.disabled} aria-label="Remove block" title={blockMenuItems(block).find(item => item.action === "delete")?.disabledReason ?? "Remove block"}><StudioHoverIcon name="action.close" /></button>
                        <div className="block-options-control">
                          <button ref={(element) => { if (element && !hasMultiSelection && blockMenuBlockId === block.id) htmlEditorTriggerRef.current = element; }} className={`block-options-trigger${blockMenuBlockId === block.id ? " is-active" : ""}`} type="button" onMouseDown={preserveTextSelection} onClick={(event) => { event.stopPropagation(); htmlEditorTriggerRef.current = event.currentTarget; if (blockMenuBlockId === block.id) closeBlockMenu(); else setBlockMenuBlockId(block.id); }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setBlockMenuBlockId(null); } }} aria-haspopup="menu" aria-expanded={blockMenuBlockId === block.id} aria-label="More block options" title="More options"><StudioHoverIcon name="action.more" vertical /></button>
                          {!hasMultiSelection && blockMenuBlockId === block.id ? <BlockOptionsMenu items={blockMenuItems(block)} trigger={htmlEditorTriggerRef} onClose={closeBlockMenu} onAction={action => { void runBlockMenuAction(action, block); }} /> : null}
                        </div>
                      </div>
                      </div>
                      {isEditableRichTextBlock(block) && linkEditor?.ownerId === block.id && linkVisible ? <StudioAnchoredPopover key={`${linkEditor.documentId}:${linkEditor.ownerId}:${linkEditor.blockId}`} anchor={() => linkEditor.editor} anchorRect={() => linkEditor.range?.getBoundingClientRect() ?? null} label={linkEditor.mode === "preview" ? "Link options" : linkEditor.existingUrl ? "Edit link" : "Add hyperlink"} focusOnMount={linkEditor.mode === "edit"} ignoreOutside={target => Boolean(linkTriggerRefs.current[block.id]?.contains(target))} onClose={closeLink} className="rich-link-popover">
                      {linkEditor.mode === "preview" ? <LinkPreviewPopover editor={linkEditor} onEdit={() => setLinkEditor({ ...linkEditor, mode: "edit" })} onRemove={removeLink} onClose={() => closeLink(true)} /> : <form className="link-editor-popover" onSubmit={applyLink}>
                        <PopoverHeading closeLabel="Close link editor" onClose={() => closeLink(true)}>{linkEditor.existingUrl ? "Edit link" : "Add hyperlink"}</PopoverHeading>
                        <div className="link-editor-fields">
                          <label><span>Link</span><input type="text" value={linkEditor.url} onChange={(event) => { setLinkEditor({ ...linkEditor, url: event.target.value }); setLinkError(null); }} placeholder="Search or type URL" autoComplete="url" /></label>
                          <label><span>Text</span><input type="text" value={linkEditor.text} onChange={(event) => setLinkEditor({ ...linkEditor, text: event.target.value })} /></label>
                        </div>
                        <details className="link-editor-advanced" open={linkEditor.advancedOpen} onToggle={(event) => setLinkEditor({ ...linkEditor, advancedOpen: event.currentTarget.open })}><summary>Advanced</summary><label className="link-editor-checkbox"><input type="checkbox" checked={linkEditor.opensInNewTab} onChange={(event) => setLinkEditor({ ...linkEditor, opensInNewTab: event.target.checked })} /><span>Open in new tab</span></label></details>
                        {linkError ? <p className="link-editor-error" role="alert">{linkError}</p> : null}
                        {linkSuggestions.length ? <div className="link-editor-suggestions" role="group" aria-label="Internal links">{linkSuggestions.map((target) => <button type="button" key={target.id} onMouseDown={preserveTextSelection} onClick={() => { setLinkEditor({ ...linkEditor, url: target.href }); setLinkError(null); }}><span className="link-target-mark" aria-hidden="true">{target.kind === "page" ? "P" : "A"}</span><span><strong>{target.title}</strong><small>{target.href}</small></span><em>{target.kind}</em></button>)}</div> : null}
                        <div className="link-editor-actions">{linkEditor.existingUrl ? <button className="link-editor-remove" type="button" onMouseDown={preserveTextSelection} onClick={removeLink}>Remove link</button> : <span /> }<span><StudioButton variant="secondary" type="button" onMouseDown={preserveTextSelection} onClick={() => closeLink(true)}>Cancel</StudioButton><StudioButton type="submit" disabled={!writable}>Apply</StudioButton></span></div>
                      </form>}</StudioAnchoredPopover> : null}
                      {htmlEditor?.blockId === block.id ? <form className="html-editor-popover" aria-label="Edit block as HTML" onSubmit={(event) => { event.preventDefault(); applyHtmlEditor(block); }}>
                        <label htmlFor={`html-editor-${block.id}`}><strong>Edit as HTML</strong><span>Supported markup only</span></label>
                        <textarea ref={htmlInputRef} id={`html-editor-${block.id}`} value={htmlEditor.draft} onChange={(event) => setHtmlEditor({ ...htmlEditor, draft: event.target.value, error: null })} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setHtmlEditor(null); } }} spellCheck={false} autoCapitalize="off" autoCorrect="off" />
                        {htmlEditor.error ? <p className="html-editor-error" role="alert">{htmlEditor.error}</p> : null}
                        <div className="html-editor-actions"><StudioButton variant="secondary" type="button" onClick={() => setHtmlEditor(null)}>Cancel</StudioButton><StudioButton className="html-editor-apply" type="submit" disabled={!writable}>Apply</StudioButton></div>
                      </form> : null}
    </>;
  }

  return (
    <RichTextEditingProvider writable={writable} onMathActivate={activateMathEditor} onImageActivate={activateInlineImage} onFeedback={onSetPublishFeedback} onCaretFormatsChange={reportCaretFormats}><section className={`block-editor${blockDragActive ? " is-block-dragging" : ""}${className ? ` ${className}` : ""}`} aria-label={`${activeDocument.kind} editor`} data-studio-document-id={activeDocument.id} data-readonly={!writable || undefined} onBeforeInputCapture={(event) => { if (!writable && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }} onPasteCapture={(event) => { if (!writable && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }} onCutCapture={(event) => { if (!writable && (event.target as HTMLElement).isContentEditable) event.preventDefault(); }}>
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
      {editorialDialog && findBlockById(activeDocument.blocks, editorialDialog.blockId) ? <BlockEditorialDialog key={`${editorialDialog.blockId}:${editorialDialog.kind}`} kind={editorialDialog.kind} value={findBlockById(activeDocument.blocks, editorialDialog.blockId)!.editorial ?? {}} writable={writable} trigger={editorialDialogTriggerRef} onClose={() => setEditorialDialog(null)} onApply={value => {
        if (!writable) return;
        onUpdateBlock(editorialDialog.blockId, current => ({ ...current, editorial: { ...value, name: value.name?.trim() || undefined, note: value.note?.trim() || undefined } }));
        if (editorialDialog.kind === "note") {
          setNoteOpenRequest(current => current + 1);
          focusInsertedBlock(editorialDialog.blockId);
        }
        setEditorialDialog(null);
      }} /> : null}
      {toolbarContent}
      <div className="editor-work-area">
      {showInserter && !previewing && !codeEditor ? <BlockInserter writable={writable} closing={inserterClosing} onCloseAnimationEnd={finishInserterClose} inserterQuery={inserterQuery} filteredBlocks={blockInserterOptions(filteredBlocks, inserterParentId ? findBlockById(activeDocument.blocks, inserterParentId) ?? undefined : undefined, inserterQuery, socialIconCatalogue, { allowTemplateContent: Boolean(onInsertTemplateContent) })} onSetQuery={onSetInserterQuery} onInsert={insertFromBlockInserter} onDragStart={beginBlockDrag} onDragEnd={finishBlockDrag} onDismiss={dismissInserter} /> : null}
      {!previewing && !showInserter && listViewOpen ? <button className="studio-list-backdrop" type="button" aria-label="Close List View" onClick={closeListView} /> : null}
      {!previewing && !showInserter && listViewOpen ? <StudioListView key={activeDocument.id} blocks={activeDocument.blocks} selectedBlockId={selectedBlockId} onSelectBlock={selectBlockFromList} onHoverBlock={setHoveredBlockId} onClose={closeListView} writable={writable} onShowBlock={id => onUpdateBlock(id, current => ({ ...current, editorial: { ...current.editorial, hidden: false } }))} onRemoveBlock={onRemoveBlock} canMoveItem={(id, direction) => { const block = findBlockById(activeDocument.blocks, id); return Boolean(block && canMove(block, direction)); }} onMoveItem={(id, direction) => { const block = findBlockById(activeDocument.blocks, id); if (block) moveSibling(block, direction); }} /> : null}

      <div className={`editor-canvas-area${visibleNote && !codeEditor ? " has-block-note" : ""}`}>
      <div ref={canvasScrollRef} className={`editor-canvas-scroll${hasMultiSelection ? " has-multi-block-selection" : ""}`} tabIndex={-1} onDragStartCapture={event => {
        const gesture = crossBlockSelectionRef.current;
        const editor = event.target instanceof Node ? listTextEditor(event.target) : null;
        // Extending a range across item editors can trigger native text dragging
        // and pointer cancellation. Keep an active List selection gesture alive.
        if (gesture?.active && gesture.listRoot && editor && gesture.listRoot.contains(editor)) event.preventDefault();
      }} onClickCapture={event => {
        if (previewing || codeEditor || !(event.target instanceof Element)) return;
        const reference = event.target.closest<HTMLElement>("[data-footnote-object]");
        if (!reference || !canvasScrollRef.current?.contains(reference)) return;
        event.preventDefault();
        focusFootnote(reference.dataset.footnoteObject ?? "");
      }} onBeforeInputCapture={event => {
        if (blockSelectionModeRef.current && selectedBlockIdsRef.current.length > 0 && event.target instanceof Element && event.target.closest('[contenteditable="true"]')) event.preventDefault();
      }} onCutCapture={event => {
        if (blockSelectionModeRef.current && selectedBlockIdsRef.current.length > 0 && event.target instanceof Element && event.target.closest('[contenteditable="true"]')) event.preventDefault();
      }} onPasteCapture={event => {
        if (!writable || previewing || codeEditor) return;
        if (currentListTextRange()) return; // The List owns replacement of its text range.
        const copied = readBlockClipboardPayload(event.clipboardData.getData("text/html")) ?? readBlockClipboardPayload(event.clipboardData.getData("text/plain"));
        if (!copied) return;
        event.preventDefault(); event.stopPropagation();
        const selected = selectedBlockId ? findBlockById(activeDocument.blocks, selectedBlockId) : undefined;
        const inAppender = event.target instanceof Element && Boolean(event.target.closest(".canvas-appender"));
        const parent = selected && !inAppender ? parentOfNestedBlock(activeDocument.blocks, selected.id) : null;
        const content = cloneClipboardPayloadForInsertion(copied);
        const copies = copiedBlocksForParent(content.blocks, parent?.type);
        const inserted = selected && !inAppender ? editBlockSiblings(activeDocument.blocks, selected.id, (siblings, index) => [...siblings.slice(0, index + 1), ...copies, ...siblings.slice(index + 1)]) : [...activeDocument.blocks, ...copies];
        const next = content.footnotes.length ? addDocumentFootnotes(inserted, copies[0], content.footnotes, crypto.randomUUID())?.blocks : inserted;
        if (next && applyBlockList(next)) focusInsertedBlock(copies[0].id);
      }} onKeyDownCapture={event => {
        const target = event.target instanceof Element ? event.target : null;
        if (previewing || codeEditor || target?.closest("input, textarea, select, [role=dialog]")) return;
        const block = selectedBlockId ? findBlockById(activeDocument.blocks, selectedBlockId) : null;
        const primary = event.metaKey || event.ctrlKey;
        const key = event.altKey && event.code.startsWith("Key") ? event.code.slice(3).toLowerCase() : event.key.toLowerCase();
        let action: BlockMenuAction | null = null;
        if (event.altKey && key === "z" && ((event.ctrlKey && !event.metaKey && !event.shiftKey) || (event.shiftKey && !primary))) action = "delete";
        else if (primary && event.altKey && !event.shiftKey) action = ({ t: "before", y: "after", m: "note", r: "rename" } as Record<string, BlockMenuAction>)[key] ?? null;
        else if (primary && event.shiftKey && !event.altKey && key === "d") action = "duplicate";
        else if (primary && event.shiftKey && !event.altKey && key === "h") action = "hide";
        else if (primary && !event.altKey && !event.shiftKey && ["c", "x"].includes(key) && (!target?.closest('[contenteditable="true"]') || blockSelectionModeRef.current)) action = key === "c" ? "copy" : "cut";
        if (action && block) { event.preventDefault(); event.stopPropagation(); void runBlockMenuAction(action, block); return; }
        if (target?.closest(".canvas-block-toolbar, .studio-block-options-menu, .multi-block-toolbar")) return;
        if (event.key === "Escape" && blockSelectionModeRef.current && selectedBlockIdsRef.current.length > 0) {
          event.preventDefault(); event.stopPropagation(); clearMultiSelection(); window.getSelection()?.removeAllRanges(); return;
        }
        if ((event.key === "Delete" || event.key === "Backspace") && blockSelectionModeRef.current && selectedBlockIdsRef.current.length > 0 && !event.nativeEvent.isComposing) {
          event.preventDefault(); event.stopPropagation(); removeSelectedBlocks(); return;
        }
        // Rich text retains native Shift+Arrow character selection. From a
        // block frame, Shift+Arrow extends the document's block selection.
        if (event.shiftKey && ["ArrowUp", "ArrowDown"].includes(event.key) && !target?.closest('[contenteditable="true"]')) {
          const currentId = selectionFocusRef.current ?? selectedBlockId;
          const index = selectionEntries.findIndex(entry => entry.id === currentId);
          const next = selectionEntries[index + (event.key === "ArrowUp" ? -1 : 1)];
          if (index >= 0 && next) {
            event.preventDefault(); event.stopPropagation(); selectBlockRange(selectionAnchorRef.current ?? currentId!, next.id);
          }
        }
      }} onPointerDownCapture={(event) => {
        const activeSelection = crossBlockSelectionRef.current;
        if (activeSelection && activeSelection.pointerId !== event.pointerId) return;
        const target = event.target instanceof Element ? event.target : event.target instanceof Node ? event.target.parentElement : null;
        const block = target?.closest<HTMLElement>(".canvas-block");
        if (previewing || codeEditor) { clearMultiSelection(); return; }
        if (target?.closest(".canvas-block-toolbar, .studio-block-options-menu, .multi-block-toolbar")) return;
        const selectionBlock = target?.closest<HTMLElement>("[data-studio-nested-block-id], [data-studio-block-anchor-id]");
        const clickedId = selectionBlock?.dataset.studioNestedBlockId ?? selectionBlock?.dataset.studioBlockAnchorId;
        const itemEditor = listTextEditor(target ?? null);
        const itemRoot = itemEditor?.closest<HTMLElement>("[data-list-root-id]");
        if (event.button === 0 && event.shiftKey && !event.metaKey && !event.ctrlKey && itemRoot) {
          const selection = window.getSelection();
          const anchorEditor = listTextEditor(selection?.anchorNode ?? null);
          const anchorRoot = listSelectionRoot(anchorEditor);
          const end = caretRangeAtPoint(event.clientX, event.clientY);
          if (selection?.anchorNode && anchorEditor && itemRoot.contains(anchorEditor) && end && itemRoot.contains(end.startContainer)) {
            const start = document.createRange(); start.setStart(selection.anchorNode, selection.anchorOffset); start.collapse(true);
            event.preventDefault(); event.stopPropagation(); clearMultiSelection();
            applyCrossBlockSelection(start, end);
            return;
          }
          if (anchorRoot && listSelectionRoot(itemEditor) === itemRoot && !anchorRoot.contains(itemRoot) && !itemRoot.contains(anchorRoot) && end && itemEditor?.contains(end.startContainer)) {
            event.preventDefault(); event.stopPropagation();
            crossBlockSelectionRef.current = null;
            setListTextRange(null);
            selectBlockRange(anchorRoot.dataset.listRootId!, itemRoot.dataset.listRootId!);
            window.getSelection()?.removeAllRanges();
            event.currentTarget.focus();
            return;
          }
        }
        if (event.button === 0 && clickedId && (event.shiftKey || event.metaKey || event.ctrlKey) && !target?.closest(".canvas-block-toolbar, input, textarea, select, .nested-add-block, .list-item-editor")) {
          event.preventDefault(); event.stopPropagation();
          crossBlockSelectionRef.current = null;
          if (event.shiftKey) selectBlockRange(selectionAnchorRef.current ?? selectedBlockId ?? clickedId, clickedId);
          else {
            const current = selectedBlockIdsRef.current.length ? selectedBlockIdsRef.current : selectedBlockId ? [selectedBlockId] : [];
            const next = current.includes(clickedId) ? current.filter(id => id !== clickedId) : [...current, clickedId];
            setBlockSelection(next);
            selectionAnchorRef.current = next[0] ?? null;
            selectionFocusRef.current = clickedId;
            if (next.length) onSelectBlock(next[next.length - 1]); else onClearBlockSelection();
          }
          window.getSelection()?.removeAllRanges();
          event.currentTarget.focus();
          return;
        }
        if (!target?.closest(".multi-block-toolbar")) clearMultiSelection();
        const emptyAppender = target?.closest<HTMLInputElement>(".canvas-appender input");
        if (event.button === 0 && emptyAppender && appenderValue.length === 0 && selectionEntries.length > 0) {
          crossBlockSelectionRef.current = { pointerId: event.pointerId, blockIdentity: emptyAppender, blockId: null, start: null, last: null, endBlockId: null, active: false };
          return;
        }
        // Template nodes own selection inside a rendered parent block. Do not
        // start cross-block text selection from their pointer event: its
        // pointer-up handler would otherwise select the outer canvas block.
        if (event.button !== 0 || !block || target?.closest(".template-node-selectable, .canvas-block-toolbar, button, input, textarea, select, [role=\"button\"]")) {
          crossBlockSelectionRef.current = null;
          return;
        }
        const caret = caretRangeAtPoint(event.clientX, event.clientY);
        const start = caret && block.contains(caret.startContainer) ? caret : null;
        const nestedBlock = target?.closest<HTMLElement>("[data-studio-nested-block-id]");
        const blockIdentity = nestedBlock ?? block;
        const blockId = nestedBlock?.dataset.studioNestedBlockId ?? block.dataset.studioBlockAnchorId;
        crossBlockSelectionRef.current = blockId ? { pointerId: event.pointerId, blockIdentity, blockId, start, last: start?.cloneRange() ?? null, endBlockId: blockId, active: false, pointerStart: { x: event.clientX, y: event.clientY }, ...(itemRoot && itemEditor ? { listRoot: itemRoot, listEditor: itemEditor, listText: true } : {}) } : null;
      }} onPointerMove={(event) => {
        const selectionDrag = crossBlockSelectionRef.current;
        if (!selectionDrag || selectionDrag.pointerId !== event.pointerId || (event.buttons & 1) !== 1) return;
        const target = document.elementFromPoint(event.clientX, event.clientY);
        if (selectionDrag.listRoot) {
          if (listSelectionRoot(selectionDrag.listEditor ?? null) !== selectionDrag.listRoot) { crossBlockSelectionRef.current = null; clearMultiSelection(); return; }
          if (target instanceof Element && target.closest('.canvas-block-toolbar, button, input, textarea, select, [role="button"]')) return;
          // Only a real item editor may change the gesture's owner. Ancestor
          // frames and toolbar chrome must never become deletion targets.
          const editor = listTextEditor(target);
          const root = listSelectionRoot(editor);
          const sameList = root === selectionDrag.listRoot;
          const separateList = root && !root.contains(selectionDrag.listRoot) && !selectionDrag.listRoot.contains(root);
          const end = editor && (sameList || separateList) ? caretRangeAtPoint(event.clientX, event.clientY) : null;
          if (end && editor?.contains(end.startContainer)) {
            selectionDrag.last = end;
            selectionDrag.listText = sameList;
            selectionDrag.endBlockId = root!.dataset.listRootId!;
            if (editor !== selectionDrag.listEditor) selectionDrag.active = true;
          } else {
            const boundary = blockSelectionPointerTarget(event.currentTarget, event.clientX, event.clientY);
            if (boundary && boundary.id !== selectionDrag.blockId && !boundary.element.contains(selectionDrag.listRoot) && !selectionDrag.listRoot.contains(boundary.element) && findBlockById(activeDocument.blocks, boundary.id)) {
              selectionDrag.active = true;
              selectionDrag.listText = false;
              selectionDrag.endBlockId = boundary.id;
            }
          }
          if (selectionDrag.active) {
            event.preventDefault();
            if (selectionDrag.listText) clearMultiSelection();
            else { setListTextRange(null); selectBlockRange(selectionDrag.listRoot.dataset.listRootId!, selectionDrag.endBlockId); }
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
              try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Already released. */ }
            }
            if (selectionDrag.listText && selectionDrag.start && selectionDrag.last) applyCrossBlockSelection(selectionDrag.start, selectionDrag.last);
            else window.getSelection()?.removeAllRanges();
          }
          return;
        }
        const block = target instanceof Element ? target.closest<HTMLElement>(".canvas-block") : null;
        const emptyAppender = target instanceof Element && appenderValue.length === 0 ? target.closest<HTMLInputElement>(".canvas-appender input") : null;
        if ((!block && !emptyAppender) || (!emptyAppender && target?.closest(".canvas-block-toolbar, button, input, textarea, select, [role=\"button\"]"))) return;
        const end = emptyAppender ? null : caretRangeAtPoint(event.clientX, event.clientY);
        if (end) selectionDrag.last = end;
        const nestedBlock = target instanceof Element ? target.closest("[data-studio-nested-block-id]") : null;
        const blockIdentity = emptyAppender ?? nestedBlock ?? block;
        selectionDrag.endBlockId = emptyAppender ? null : (nestedBlock as HTMLElement | null)?.dataset.studioNestedBlockId ?? block?.dataset.studioBlockAnchorId ?? selectionDrag.endBlockId;
        if (blockIdentity !== selectionDrag.blockIdentity) selectionDrag.active = true;
        if (selectionDrag.active && !event.currentTarget.hasPointerCapture(event.pointerId)) {
          try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* The pointer may already have been released. */ }
        }
        if (selectionDrag.active) {
          if (selectionDrag.blockId === null || selectionDrag.endBlockId === null) event.preventDefault();
          if (selectionDrag.listText) { event.preventDefault(); clearMultiSelection(); }
          else selectBlockRange(selectionDrag.blockId, selectionDrag.endBlockId);
          if (selectionDrag.start && selectionDrag.last) applyCrossBlockSelection(selectionDrag.start, selectionDrag.last);
        }
      }} onPointerUp={(event) => {
        const selectionDrag = crossBlockSelectionRef.current;
        if (!selectionDrag || selectionDrag.pointerId !== event.pointerId) return;
        if (selectionDrag.listRoot && listSelectionRoot(selectionDrag.listEditor ?? null) !== selectionDrag.listRoot) { crossBlockSelectionRef.current = null; clearMultiSelection(); return; }
        if (selectionDrag.listRoot) {
          const moved = selectionDrag.pointerStart && Math.hypot(event.clientX - selectionDrag.pointerStart.x, event.clientY - selectionDrag.pointerStart.y) >= 5;
          if (selectionDrag.active || moved) {
            const target = document.elementFromPoint(event.clientX, event.clientY);
            const boundary = target instanceof Element && target.closest('.canvas-block-toolbar, .multi-block-toolbar, button, input, textarea, select, [role="button"]') ? null : blockSelectionPointerTarget(event.currentTarget, event.clientX, event.clientY);
            // Coalesced moves may leave text mode active until release. A real
            // drag ending in another visible row still selects the block range.
            if (boundary && boundary.id !== selectionDrag.blockId && !boundary.element.contains(selectionDrag.listRoot) && !selectionDrag.listRoot.contains(boundary.element) && findBlockById(activeDocument.blocks, boundary.id)) {
              selectionDrag.active = true;
              selectionDrag.listText = false;
              selectionDrag.endBlockId = boundary.id;
            }
          }
        }
        if (selectionDrag.listRoot && selectionDrag.active && !selectionDrag.listText) {
          event.preventDefault();
          setListTextRange(null);
          selectBlockRange(selectionDrag.blockId, selectionDrag.endBlockId);
          window.getSelection()?.removeAllRanges();
          event.currentTarget.focus({ preventScroll: true });
          crossBlockSelectionRef.current = null;
          return;
        }
        const pointed = caretRangeAtPoint(event.clientX, event.clientY);
        const pointedEditor = pointed ? listTextEditor(pointed.startContainer) : null;
        const pointedRoot = listSelectionRoot(pointedEditor);
        const validListEndpoint = pointedRoot?.dataset.listRootId === selectionDrag.endBlockId && pointedEditor?.contains(pointed!.startContainer);
        const endpoint = selectionDrag.listRoot && !validListEndpoint ? selectionDrag.last : pointed ?? selectionDrag.last;
        selectionDrag.last = endpoint;
        if (selectionDrag.active) {
          if (selectionDrag.listText) { event.preventDefault(); clearMultiSelection(); onSelectBlock(selectionDrag.listRoot!.dataset.listRootId!); }
          else selectBlockRange(selectionDrag.blockId, selectionDrag.endBlockId);
          const start = selectionDrag.start;
          const end = selectionDrag.last;
          if (selectionDrag.blockId === null || selectionDrag.endBlockId === null) {
            setAppenderActive(false);
            window.getSelection()?.removeAllRanges();
            event.currentTarget.focus();
          } else if (start && end) window.requestAnimationFrame(() => applyCrossBlockSelection(start, end));
          else event.currentTarget.focus();
        } else if (selectionDrag.blockId !== null) onSelectBlock(selectionDrag.blockId);
        crossBlockSelectionRef.current = null;
      }} onLostPointerCapture={(event) => {
        const selectionDrag = crossBlockSelectionRef.current;
        if (selectionDrag?.pointerId === event.pointerId) crossBlockSelectionRef.current = null;
      }} onPointerCancel={(event) => {
        if (crossBlockSelectionRef.current?.pointerId === event.pointerId) crossBlockSelectionRef.current = null;
      }} onPointerLeave={(event) => {
        const selectionDrag = crossBlockSelectionRef.current;
        if (selectionDrag?.pointerId !== event.pointerId || selectionDrag.active) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        // Native text selection and overlay boundaries can dispatch leave while
        // the pointer remains inside the canvas. Keep that pending gesture.
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) crossBlockSelectionRef.current = null;
      }} onPointerDown={(event) => {
        if (event.target instanceof Element && !event.target.closest(".canvas-block, button, input, textarea, select, [contenteditable=\"true\"]")) onClearBlockSelection();
      }}>
        {hasMultiSelection && !previewing && !codeEditor ? <div className="multi-block-toolbar-anchor"><div className="multi-block-toolbar" role="toolbar" aria-label="Selected blocks">
          <span role="status">{selectedRoots.length} {selectedRoots.length === 1 ? "block" : "blocks"} selected</span>
          {multiMenuBlock ? <div className="block-options-control">
            <button ref={element => { if (element && blockMenuBlockId === multiMenuBlock.id) htmlEditorTriggerRef.current = element; }} className="block-options-trigger" type="button" aria-label="More selected block options" title="More selected block options" aria-haspopup="menu" aria-expanded={blockMenuBlockId === multiMenuBlock.id} onClick={event => {
              event.stopPropagation();
              htmlEditorTriggerRef.current = event.currentTarget;
              if (blockMenuBlockId === multiMenuBlock.id) closeBlockMenu(); else setBlockMenuBlockId(multiMenuBlock.id);
            }}><StudioHoverIcon name="action.more" vertical /></button>
            {blockMenuBlockId === multiMenuBlock.id ? <BlockOptionsMenu items={blockMenuItems(multiMenuBlock).filter(item => ["copy", "cut", "duplicate", "before", "after", "copy-styles", "paste-styles", "group", "delete"].includes(item.action))} trigger={htmlEditorTriggerRef} onClose={closeBlockMenu} onAction={action => { void runBlockMenuAction(action, multiMenuBlock); }} /> : null}
          </div> : null}
          <button type="button" disabled={!writable} onClick={removeSelectedBlocks}><StudioIcon name="trash" size={20} />Delete Selected Blocks</button>
          <button type="button" aria-label="Clear block selection" title="Clear selection" onClick={() => { clearMultiSelection(); window.getSelection()?.removeAllRanges(); canvasScrollRef.current?.focus(); }}><StudioIcon name="close" size={20} /></button>
        </div></div> : null}
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
            {presentation?.renderBlock ? activeDocument.blocks.filter(block => !block.editorial?.hidden).map((block) => presentation.renderBlock?.({ document: activeDocument, block, mediaUrls: mediaBlockUrls, mode: "preview", selectedBlockId, onSelectBlock, onUpdateBlock, onDocumentFieldChange, onFocusDocumentField }) ?? <BlockRenderer key={block.id} blocks={[block]} mediaUrls={mediaBlockUrls} variant="studio" hideDividers={presentation.hideDividers ?? true} document={activeDocument} buttonPreview={buttonPreview} />) : <BlockRenderer blocks={activeDocument.blocks} mediaUrls={mediaBlockUrls} variant="studio" hideDividers={presentation?.hideDividers ?? true} document={activeDocument} buttonPreview={buttonPreview} />}
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

            <div className="canvas-blocks" onDragOver={handleCanvasDragOver} onDrop={handleCanvasDrop} onDragLeave={event => {
              const bounds = event.currentTarget.getBoundingClientRect();
              if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) { onSetDragOverIndex(null); setColumnDrop(null); }
            }}>
              {columnDrop ? <div className="column-drop-indicator" aria-hidden="true" style={{ left: columnDrop.left, top: columnDrop.top, width: columnDrop.width, height: columnDrop.height }} /> : null}
              {allowCoverImage && showCoverImage && !hasDynamicCover ? <div className="cover-inserter-position"><button className="between-blocks cover-inserter" type="button" disabled={!writable} onClick={() => toggleInserter(-1)} aria-label="Add block below cover image" title="Add block below cover image"><span aria-hidden="true"><StudioIcon name="add" /></span></button></div> : null}
              {activeDocument.blocks.map((block, index) => (
                <div className="block-position" key={block.id} data-block-align={contentBlockAlignment(block)}
                >
                  {dragOverIndex === index ? <div className="drop-indicator" aria-hidden="true" /> : null}
                  {index > 0 ? <button className="between-blocks" type="button" disabled={!writable} onClick={() => toggleInserter(index - 1)} aria-label={`Add block before ${block.type === "group" ? groupVariationFor(block).label : blockLabel(block.type)}`}><span aria-hidden="true"><StudioIcon name="add" /></span></button> : null}
                  <article
                    className={`canvas-block is-${block.type}${contentBlockAlignment(block) ? ` has-block-align-${contentBlockAlignment(block)}` : ""}${selectedBlockId === block.id ? " is-selected" : ""}`}
                    style={block.type === "group" && block.position === "sticky" ? { position: "sticky", top: "0px", zIndex: 10 } : undefined}
                    data-studio-block-anchor-id={block.id}
                    tabIndex={0 /* eslint-disable-line jsx-a11y/no-noninteractive-tabindex -- Block frames expose keyboard range selection while preserving editable children. */}
                    aria-label={`${block.type === "group" ? groupVariationFor(block).label : blockLabel(block.type)} block`}
                    role="group"
                    data-studio-hovered={hoveredBlockId === block.id}
                    onPointerDown={(event) => {
                      if (crossBlockSelectionRef.current) return;
                      // Portalled menu events retain their React ancestry, not their DOM owner.
                      if (!(event.target instanceof Element) || !event.currentTarget.contains(event.target)) return;
                      const nestedBlockId = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-studio-nested-block-id]")?.dataset.studioNestedBlockId : undefined;
                      const targetId = nestedBlockId ?? block.id;
                      if (targetId !== selectedBlockId || !event.target.closest(".canvas-block-toolbar, .rich-text-editor, button, input, textarea, select, a")) selectBlockBoundary(targetId);
                      else onSelectBlock(targetId);
                      if (!(event.target instanceof Element) || !event.target.closest(".alignment-control")) setAlignmentMenuBlockId(null);
                      if (!(event.target instanceof Element) || !event.target.closest(".block-alignment-control")) setBlockAlignmentMenuBlockId(null);
                      if (!(event.target instanceof Element) || !event.target.closest(".rich-text-format-control")) setRichTextMenuBlockId(null);
                      if (!(event.target instanceof Element) || !event.target.closest(".transform-control")) setTransformMenuBlockId(null);
                      if (event.target instanceof Element && !event.target.closest(".link-editor-popover, .link-preview-popover, .block-options-menu, .html-editor-popover, .rich-text-editor a")) {
                        setLinkEditor(null);
                        setLinkError(null);
                      }
                      if (!(event.target instanceof Element) || !event.target.closest(".block-options-menu, .block-options-trigger")) setBlockMenuBlockId(null);
                    }}
                    onFocusCapture={(event) => {
                      if (crossBlockSelectionRef.current) return;
                      if (!(event.target instanceof Element) || !event.currentTarget.contains(event.target)) return;
                      if (event.target instanceof Element && event.target.closest(".mini-golf-nested-controls, .mini-golf-nested-block")) return;
                      const nestedBlockId = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-studio-nested-block-id]")?.dataset.studioNestedBlockId : undefined;
                      const targetId = nestedBlockId ?? block.id;
                      if (targetId !== selectedBlockId || event.target === event.currentTarget) selectBlockBoundary(targetId);
                      else onSelectBlock(targetId);
                    }}
                  >
                    {renderBlockControls(block)}
                      {block.editorial?.hidden ? <HiddenBlockPlaceholder label={blockOutlineLabel(block)} writable={writable} onShow={() => onUpdateBlock(block.id, current => ({ ...current, editorial: { ...current.editorial, hidden: false } }))} /> : htmlEditor?.blockId === block.id ? null : presentation?.renderBlock?.({ document: activeDocument, block, mediaUrls: mediaBlockUrls, mode: "edit", writable, selectedBlockId, hoveredBlockId, onTextSelection: recordTextSelection, onLinkActivate: activateTextLink, onTableCellFocus: (blockId, rowIndex, columnIndex) => { setTableCellSelections(current => ({ ...current, [blockId]: { rowIndex, columnIndex } })); setTableTextTargets(current => ({ ...current, [blockId]: { kind: "cell", rowIndex, columnIndex } })); }, onSelectBlock, onSelectListItem, onUpdateBlock, renderBlockControls, renderEditableBlock, onDocumentFieldChange, onFocusDocumentField, onSplitParagraphs, onExitList }) ?? renderEditableBlock(block, {}, index)}
                  </article>
                </div>
              ))}
              <div className={`canvas-appender${appenderActive ? " is-active" : ""}`}>
                {dragOverIndex === activeDocument.blocks.length ? <div className="drop-indicator is-at-end" aria-hidden="true" /> : null}
                <input
                  ref={appenderInputRef}
                  type="text"
                  value={appenderValue}
                  disabled={!writable}
                  placeholder="Type / to choose a block"
                  aria-label="Type / to choose a block"
                  onFocus={() => { if (writableRef.current) setAppenderActive(true); }}
                  onChange={(event) => {
                    if (!writableRef.current) return;
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
                    if (!writableRef.current) return;
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
                    if (!block) return;
                    onUpdateBlock(block.id, () => ({ ...block, text: appenderValue, runs: textToRuns(appenderValue) }));
                    setAppenderValue("");
                    setAppenderActive(false);
                  }}
                />
                {appenderActive ? <button className="canvas-appender-button" type="button" disabled={!writable} onClick={() => { if (!writableRef.current) return; setAppenderValue(""); setAppenderActive(false); toggleInserter(activeDocument.blocks.length - 1); }} aria-label="Add block" title="Add block"><StudioIcon name="add" /></button> : null}
              </div>
            </div>
            {presentation?.renderFooter?.({ document: activeDocument, mode: "edit", writable, selectedBlockId, hoveredBlockId, onTableCellFocus: (blockId, rowIndex, columnIndex) => setTableCellSelections(current => ({ ...current, [blockId]: { rowIndex, columnIndex } })), onSelectBlock, onUpdateBlock, onDocumentFieldChange, onFocusDocumentField })}
            </>, "edit")}
          </div>
        )}
      </div>
      {imageVisible && imageTarget ? imagePickerOpen ? <InlineImagePicker loadImages={loadInlineImages} replacing={Boolean(imageTarget.image)} returnFocus={imageTarget.editor} onChoose={value => changeInlineImage(value, true)} onClose={() => closeInlineImage(true)} /> : imageTarget.image ? <InlineImagePopover key={`${imageTarget.documentId}:${imageTarget.blockId}:${imageTarget.selection.start}`} value={imageTarget.image} anchor={() => {
        const point = richTextPointAtOffset(imageTarget.editor, imageTarget.selection.start);
        const node = point.node.nodeType === Node.ELEMENT_NODE ? point.node.childNodes[point.offset] : point.node.parentElement;
        return (node instanceof HTMLElement ? node.closest<HTMLElement>("[data-image-object]") : null) ?? imageTarget.editor;
      }} onApply={changeInlineImage} onReplace={() => setImagePickerOpen(true)} onClose={closeInlineImage} /> : null : null}
      {languageVisible && languageTarget ? <LanguagePopover key={`${languageTarget.documentId}:${languageTarget.blockId}:${languageTarget.selection.start}`} anchor={() => languageTarget.editor} anchorRect={() => languageTarget.range?.getBoundingClientRect() ?? null} onApply={applyLanguage} onClose={closeLanguage} /> : null}
      {mathVisible && mathTarget ? <MathPopover key={`${mathTarget.documentId}:${mathTarget.blockId}:${mathTarget.start}`} value={mathTarget.math} anchor={() => {
        const point = richTextPointAtOffset(mathTarget.editor, mathTarget.start);
        const node = point.node.nodeType === Node.ELEMENT_NODE ? point.node.childNodes[point.offset] : point.node.parentElement;
        return (node instanceof HTMLElement ? node.closest<HTMLElement>("[data-math-object], [data-math-legacy]") : null) ?? mathTarget.editor;
      }} editor={mathTarget.editor} onChange={updateMath} onClose={closeMath} onReturnToEditor={() => closeMath(true)} /> : null}
      {highlightVisible && highlightTarget && highlightedContent ? <HighlightPopover editor={highlightTarget.editor} anchor={highlightTarget.anchor} colours={highlightTarget.selection.start === highlightTarget.selection.end ? highlightColoursAtRange([{ text: "x", marks: displayedCaretFormats(highlightTarget.blockId, highlightedContent, highlightTarget.selection.start, highlightTarget.itemIndex, highlightTarget.listId, highlightTarget.cell) }], 0, 1) : highlightColoursAtRange(highlightedContent.runs?.length ? highlightedContent.runs : textToRuns(highlightedContent.text), highlightTarget.selection.start, highlightTarget.selection.end)} disabled={!writable} onChange={changeHighlight} onClose={closeHighlight} /> : null}
      {visibleNote && notedBlock && !codeEditor ? <BlockNoteCard key={`${notedBlock.id}:${noteOpenRequest}`} label={blockOutlineLabel(notedBlock)} note={visibleNote} writable={writable} escapeBlocked={Boolean(imageVisible || mathVisible || highlightVisible || editorialDialog || htmlEditor || languageVisible || linkEditor || blockMenuBlockId || transformMenuBlockId || alignmentMenuBlockId || blockAlignmentMenuBlockId || richTextMenuBlockId || tableAlignmentMenuBlockId || listViewOpen || showInserter)} onEdit={trigger => {
        editorialDialogTriggerRef.current = trigger;
        setEditorialDialog({ blockId: notedBlock.id, kind: "note" });
      }} onBackToBlock={() => focusInsertedBlock(notedBlock.id)} /> : null}
      </div>
      </div>

    </section></RichTextEditingProvider>
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
      <div className="html-editor-actions"><StudioButton variant="secondary" type="button" onClick={onExit}>Cancel</StudioButton><StudioButton className="html-editor-apply" type="button" onClick={onApply} disabled={!writable}>Apply</StudioButton></div>
    </div>
  </div>;
}

function StudioListView({ blocks, selectedBlockId, onSelectBlock, onHoverBlock, onClose, onMoveItem, canMoveItem, onRemoveBlock, writable, onShowBlock }: {
  blocks: ContentBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  onHoverBlock: (blockId: string | null) => void;
  onClose: () => void;
  onMoveItem: (id: string, direction: -1 | 1) => void;
  canMoveItem: (id: string, direction: -1 | 1) => boolean;
  onRemoveBlock: (blockId: string) => void;
  writable: boolean;
  onShowBlock: (blockId: string) => void;
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

  function renderBlock(block: ContentBlock): ReactNode {
    const children = blockChildren(block);
    const expanded = expandedIds.has(block.id);
    return <li key={block.id}>
      <div className={`studio-list-item${selectedBlockId === block.id ? " is-selected" : ""}`} onPointerEnter={() => onHoverBlock(block.id)} onPointerLeave={() => onHoverBlock(null)}>
        {children.length ? <button className={`studio-list-disclosure${expanded ? " is-expanded" : ""}`} type="button" aria-label={`${expanded ? "Collapse" : "Expand"} ${blockOutlineLabel(block)}`} aria-expanded={expanded} onClick={() => toggleExpanded(block.id)}><StudioIcon name="chevron-right" size={16} /></button> : <span className="studio-list-disclosure-spacer" aria-hidden="true" />}
        <button className="studio-list-select" type="button" aria-current={selectedBlockId === block.id ? "true" : undefined} onClick={() => onSelectBlock(block.id)}>
          <span className="studio-list-icon" aria-hidden="true"><BlockTypeIcon type={block.type === "group" ? groupVariationFor(block).type : block.type} /></span>
          <span>{blockOutlineLabel(block)}{block.editorial?.hidden ? " (hidden)" : ""}</span>{block.editorial?.lock?.move || block.editorial?.lock?.remove ? <StudioIcon name="lock" size={16} /> : null}
        </button>
        {selectedBlockId === block.id ? <div className="studio-list-actions">
          <button type="button" aria-label={`Move ${blockOutlineLabel(block)} up`} disabled={!canMoveItem(block.id, -1)} onClick={() => onMoveItem(block.id, -1)}><StudioHoverIcon name="arrange.move-up" size={16} /></button>
          <button type="button" aria-label={`Move ${blockOutlineLabel(block)} down`} disabled={!canMoveItem(block.id, 1)} onClick={() => onMoveItem(block.id, 1)}><StudioHoverIcon name="arrange.move-down" size={16} /></button>
          {block.editorial?.hidden ? <button type="button" disabled={!writable} aria-label={`Show ${blockOutlineLabel(block)}`} onClick={() => onShowBlock(block.id)}><StudioIcon name="visibility" size={16} /></button> : null}
          <button type="button" disabled={!writable || !preservesBlockLocks([block], []) || !canRemoveFootnoteOwners(blocks, [block.id])} aria-label={`Remove ${blockOutlineLabel(block)}`} title={!canRemoveFootnoteOwners(blocks, [block.id]) ? "Remove the footnote references before deleting their notes." : undefined} onClick={() => onRemoveBlock(block.id)}><StudioIcon name="trash" size={16} /></button>
        </div> : null}
      </div>
      {children.length && expanded ? <ol>{children.map(child => renderBlock(child))}</ol> : null}
    </li>;
  }

  return <aside className="studio-list-view" aria-label="List View">
    <header><h2>List View</h2><button type="button" onClick={onClose} aria-label="Close List View" title="Close List View"><StudioIcon name="close" size={18} /></button></header>
    <nav aria-label="Block structure"><ol>{blocks.map(block => renderBlock(block))}</ol></nav>
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

function LinkPreviewPopover({ editor, onEdit, onRemove, onClose }: { editor: LinkEditorState; onEdit: () => void; onRemove: () => void; onClose: () => void }) {
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
    <div className="link-preview-popover">
      <div className="link-preview-target"><span className="link-preview-mark" aria-hidden="true"><StudioIcon name="globe" size={17} /></span><span><strong>{editor.text || editor.url}</strong><small>{editor.url}</small></span></div>
      <div className="link-preview-actions"><button type="button" onClick={onEdit} aria-label="Edit link" title="Edit link"><StudioIcon name="pencil" size={18} /></button><button type="button" onClick={onRemove} aria-label="Remove link" title="Remove link"><StudioIcon name="link-off" size={18} /></button><button type="button" onClick={() => void copyLink()} aria-label={copyState === "copied" ? "Link copied" : "Copy link"} title={copyState === "copied" ? "Link copied" : "Copy link"}><StudioIcon name="copy" size={18} /></button><button type="button" onClick={onClose} aria-label="Close link options" title="Close"><StudioIcon name="close" size={18} /></button></div>
      {copyState !== "idle" ? <span className="visually-hidden" role="status">{copyState === "copied" ? "Link copied to clipboard." : "Unable to copy link."}</span> : null}
    </div>
  );
}

function BlockTransformControl({ block, parent, writable, open, onOpenChange, onTransform }: { block: ContentBlock; parent?: ContentBlock | null; writable: boolean; open: boolean; onOpenChange: (open: boolean) => void; onTransform: (transform: BlockTransform) => void }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const transforms = availableBlockTransforms(block, parent);

  useLayoutEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      onOpenChange(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  if (!transforms.length) return block.type === "table" ? <div className="table-block-type" aria-hidden="true"><HoverBlockTypeIcon type="table" /></div> : null;
  return <div className="transform-control"><button ref={triggerRef} className={open ? "is-active" : ""} type="button" disabled={!writable} onMouseDown={preserveTextSelection} onClick={() => onOpenChange(!open)} aria-haspopup="menu" aria-expanded={open} aria-label={`Transform ${blockOutlineLabel(block)} block`} title="Transform block"><HoverBlockTypeIcon type={block.type === "group" ? groupVariationFor(block).type : block.type} headingLevel={block.type === "heading" ? block.level : undefined} /></button>{open ? <div className="transform-menu" role="menu" aria-label="Transform block"><strong>Transform to</strong>{transforms.map((transform) => <button type="button" role="menuitem" key={transform.id} disabled={!writable} onMouseDown={preserveTextSelection} onClick={() => onTransform(transform)}><TransformIcon transform={transform} /><span>{transform.label}</span></button>)}</div> : null}</div>;
}

function TransformIcon({ transform }: { transform: BlockTransform }) {
  if (transform.target === "group" && transform.layout) return <BlockLibraryIcon type={groupVariations.find(variation => variation.layout === transform.layout)?.type ?? "group"} />;
  if (transform.target === "heading" && transform.level) return <HeadingLevelIcon level={transform.level} />;
  return <BlockLibraryIcon type={transform.target} />;
}

function BlockTypeIcon({ type }: { type: import("./block-library-icons").BlockIconType }) {
  return <BlockLibraryIcon type={type} />;
}

function HoverBlockTypeIcon({ type, headingLevel }: { type: import("./block-library-icons").BlockIconType; headingLevel?: HeadingLevel }) {
  if (type === "heading") return <HeadingLevelIcon level={headingLevel ?? 2} />;
  return <BlockTypeIcon type={type} />;
}

function BlockInserter({ writable, closing, onCloseAnimationEnd, inserterQuery, filteredBlocks, onSetQuery, onInsert, onDragStart, onDragEnd, onDismiss }: { writable: boolean; closing: boolean; onCloseAnimationEnd: () => void; inserterQuery: string; filteredBlocks: StudioCanvasProps["filteredBlocks"]; onSetQuery: (query: string) => void; onInsert: (type: BlockLibraryItemType) => void; onDragStart: (type: BlockLibraryItemType) => void; onDragEnd: () => void; onDismiss: () => void }) {
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
          {blockCatalogueGroups.map((group) => {
            const items = filteredBlocks.filter((item) => item.group === group);
            if (!items.length) return null;
            return <div className="inserter-group" key={group}><h3>{group}</h3><div>{items.map((item) => <button type="button" disabled={!writable} draggable={writable} key={item.type} title={item.description} onDragStart={event => { if (!writable) { event.preventDefault(); return; } event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-acm-studio-block", item.type); onDragStart(item.type); }} onDragEnd={onDragEnd} onClick={() => { if (writable) onInsert(item.type); }}><span><BlockTypeIcon type={item.type} /></span><strong>{item.label}</strong></button>)}</div></div>;
          })}
      </Pane>
    </div>
  );
}

function NestedBlockAppender({ parentId, writable, onOpen }: { parentId: string; writable: boolean; onOpen?: (parentId: string) => void }) {
  return <button type="button" className="nested-add-block" disabled={!writable || !onOpen} onClick={() => { if (writable) onOpen?.(parentId); }}><StudioIcon name="add" size={16} /> Add block</button>;
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

function indentFromPreviousParagraph(blocks: ContentBlock[], index: number): string | undefined {
  const previousBlock = blocks[index - 1];
  return previousBlock?.type === "paragraph" ? previousBlock.style?.textIndent : undefined;
}

type BlockFieldProps = { htmlEditorBlockId?: string; renderBlockControls?: (block: ContentBlock) => ReactNode; block: ContentBlock; rootBlocks?: ContentBlock[]; document?: StudioDocument; templatePlaceholder?: boolean; selectedBlockId?: string | null; hoveredBlockId?: string | null; previousParagraphIndent?: string; spacerOrientation?: SpacerOrientation; writable?: boolean; buttonPreview?: { blockId: string; state: ButtonInteractionState } | null; pendingColumnsLayoutBlockId?: string | null; onColumnsLayoutSelected?: () => void; pendingGroupLayoutBlockId?: string | null; onGroupLayoutSelected?: (blockId: string) => void; mediaUrl?: string; mediaUrls?: Record<string, string>; coverImageUrl?: string; onOpenCoverMediaLibrary?: () => void; onRemoveCoverImage?: () => void; onTableCellFocus: (rowIndex: number, columnIndex: number) => void; onTextSelection: (selection: TextSelection | null, rowIndex?: number, columnIndex?: number) => void; onLinkActivate: (selection: TextSelection, rowIndex?: number, columnIndex?: number) => void; onListItemSelection?: (list: EditableListBlock, index: number, selection: TextSelection | null) => void; onListItemLinkActivate?: (list: EditableListBlock, index: number, selection: TextSelection) => void; onSplitParagraph?: (blockId: string, beforeRuns: RichTextRun[], afterRuns: RichTextRun[]) => string | null; onMergeParagraphBackward?: (blockId: string) => { blockId: string; offset: number } | null; onSplitParagraphs?: (blockId: string, paragraphs: RichTextRun[][]) => string[] | null; onExitList?: (blockId: string, itemIndex: number, operation?: "return" | "backward" | "forward", listId?: string) => BlockCommandFocusTarget; onOpenNestedInserter?: (parentId: string) => void; onInsertNestedBlock?: (type: InsertableBlockType, parentId: string) => void; onChange: (block: ContentBlock, requireSourceMatch?: boolean) => void };

function SocialIconsEditorBlock({ htmlEditorBlockId, renderBlockControls, block, selectedBlockId, hoveredBlockId, writable, onInsert, onChange }: { htmlEditorBlockId?: string; renderBlockControls?: (block: ContentBlock) => ReactNode; block: Extract<ContentBlock, { type: "social-icons" }>; selectedBlockId?: string | null; hoveredBlockId?: string | null; writable: boolean; onInsert?: (type: InsertableBlockType) => void; onChange: (block: Extract<ContentBlock, { type: "social-icons" }>) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const choices = socialIconCatalogue.filter(item => `${item.label} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()));

  useLayoutEffect(() => {
    if (writable && onInsert) return;
    // Close the picker before paint when insertion ownership is revoked.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  return <nav className={socialIconsBlockClassName(block, true)} style={socialIconsColourStyle(block)} aria-label="Social links"><ul style={socialIconsGapStyle(block)}>{block.children.map(child => <li id={paragraphStyleAnchor(child.visualStyle)} className={`studio-nested-block${paragraphStyleClassName(child.visualStyle) ? ` ${paragraphStyleClassName(child.visualStyle)}` : ""}`} style={paragraphStyleToCss(child.visualStyle) as React.CSSProperties} data-block-align={"blockAlign" in child ? child.blockAlign : undefined} data-studio-nested-block-id={child.id} data-studio-selected={selectedBlockId === child.id} data-studio-hovered={hoveredBlockId === child.id} tabIndex={0 /* eslint-disable-line jsx-a11y/no-noninteractive-tabindex -- Block frames expose keyboard selection while preserving nested controls. */} aria-label={`${blockLabel(child.type)} icon block`} key={child.id}>{renderBlockControls?.(child)}{htmlEditorBlockId === child.id ? null : child.editorial?.hidden ? <HiddenBlockPlaceholder label={blockOutlineLabel(child)} writable={writable} onShow={() => onChange({ ...block, children: block.children.map(candidate => candidate.id === child.id ? { ...candidate, editorial: { ...candidate.editorial, hidden: false } } : candidate) })} /> : <SocialIconView block={child} showLabel={block.showLabels} editing />}</li>)}<li className="social-icons-appender"><button ref={triggerRef} className="social-icons-add" type="button" disabled={!writable || !onInsert} onClick={() => { setOpen(value => !value); setQuery(""); }} aria-haspopup="dialog" aria-expanded={open} aria-controls={`social-icon-picker-${block.id}`} aria-label="Add social icon" title="Add social icon"><StudioIcon name="add" size={18} /></button>{open ? <div ref={popoverRef} id={`social-icon-picker-${block.id}`} className="social-icon-picker" role="dialog" aria-label="Choose a social icon"><div className="social-icon-picker-header"><input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search" aria-label="Search social icons" /><button type="button" aria-label="Close social icon picker" title="Close" onClick={() => { setOpen(false); setQuery(""); requestAnimationFrame(() => triggerRef.current?.focus()); }}><StudioIcon name="close" size={18} /></button></div><div className="social-icon-picker-options">{choices.map(item => <button type="button" key={item.type} disabled={!writable || !onInsert} onClick={() => insert(item.type as InsertableBlockType)}><BlockTypeIcon type={item.type} /><strong>{item.label}</strong></button>)}{choices.length === 0 ? <p>No social icons found.</p> : null}</div></div> : null}</li></ul></nav>;
}

export function BlockField(props: BlockFieldProps) {
  const { block } = props;
  if (props.htmlEditorBlockId === block.id) return null;
  if (block.editorial?.hidden) return <HiddenBlockPlaceholder label={blockOutlineLabel(block)} writable={props.writable ?? true} onShow={() => props.onChange({ ...block, editorial: { ...block.editorial, hidden: false } })} />;
  if (props.templatePlaceholder && block.type === "group" && block.data?.templateElement === "content") return <TemplateContentLayout layout={block} visualStyle={block.visualStyle} align={block.data.align === "centre" || block.data.align === "right" ? block.data.align : "left"} mediaUrls={props.mediaUrls} editorFocusable><TemplateContentSlot /></TemplateContentLayout>;
  if (block.type === "group" && block.children.length === 0) {
    if (props.pendingGroupLayoutBlockId === block.id) return <GroupLayoutChooser onSelect={layout => { props.onChange(changeGroupLayout(block, layout)); props.onGroupLayoutSelected?.(block.id); }} />;
    return <section className="group-layout-empty" aria-labelledby={`group-layout-title-${block.id}`}>
      <div className="group-layout-empty-heading"><span aria-hidden="true"><BlockLibraryIcon type={groupVariationFor(block).type} /></span><strong id={`group-layout-title-${block.id}`}>{groupVariationFor(block).label}</strong></div>
      <p>Add blocks to this container.</p>
      <GroupLayoutSelection value={block.layout} onChange={layout => props.onChange(changeGroupLayout(block, layout))} />
      <NestedBlockAppender parentId={block.id} writable={props.writable ?? true} onOpen={props.onOpenNestedInserter} />
    </section>;
  }
  const content = <BlockFieldContent {...props} />;
  if (!block.visualStyle || block.type === "spacer") return content;
  const style = block.visualStyle;
  const backgroundImageUrl = ["quote", "group", "heading", "code", "document-title"].includes(block.type) && style.backgroundImageMediaId ? props.mediaUrls?.[style.backgroundImageMediaId] : undefined;
  const css = block.type === "table" ? tablePresentation(style).wrapper : block.type === "image" ? imageWrapperStyle(block) : block.type === "button" ? (style.margin ? { margin: style.margin } : {}) : paragraphStyleToCss(style, backgroundImageUrl);
  if (block.type === "buttons") delete css.textDecoration;
  if (block.type === "social-icons" || block.type === "divider") { delete css.backgroundColor; delete css.backgroundImage; }
  if (block.type === "cover-image" && style.borderRadius) css.overflow = "hidden";
  const coverFrameClass = block.type === "cover-image"
    ? ` cover-image-visual-style-frame${style.borderRadius || style.borderStyle !== undefined ? " has-cover-image-frame-override" : ""}`
    : "";
  const className = `${visualStyleClassName(style)}${coverFrameClass}`;
  return <div id={paragraphStyleAnchor(style)} className={className} style={css}>{content}</div>;
}

function BlockFieldContent({ htmlEditorBlockId, renderBlockControls, block, rootBlocks = [block], document, templatePlaceholder = false, selectedBlockId, hoveredBlockId, previousParagraphIndent, spacerOrientation = "vertical", writable = true, buttonPreview = null, pendingColumnsLayoutBlockId, onColumnsLayoutSelected, pendingGroupLayoutBlockId, onGroupLayoutSelected, mediaUrl, mediaUrls = {}, coverImageUrl, onOpenCoverMediaLibrary, onRemoveCoverImage, onTableCellFocus, onTextSelection, onLinkActivate, onListItemSelection, onListItemLinkActivate, onSplitParagraph, onMergeParagraphBackward, onSplitParagraphs, onExitList, onOpenNestedInserter, onInsertNestedBlock, onChange }: BlockFieldProps) {
  const footnoteNumbers = useFootnoteNumbers();
  const documentContext: DocumentRenderContext = document ?? { kind: "page" };
  if (
    block.type === "reading-time" && !documentFieldVisible(documentContext, "readingTime") ||
    block.type === "post-author" && !documentFieldVisible(documentContext, "author") ||
    block.type === "post-date" && !documentFieldVisible(documentContext, "publicationDate")
  ) return null;
  if (block.type === "paragraph") return <ParagraphEditField block={block} previousParagraphIndent={previousParagraphIndent} onChange={onChange} onSelectionChange={onTextSelection} onLinkActivate={onLinkActivate} onSplitParagraph={onSplitParagraph} onMergeParagraphBackward={onMergeParagraphBackward} onSplitParagraphs={onSplitParagraphs} mediaUrls={mediaUrls} />;
  if (block.type === "heading") return <RichTextEditor mediaUrls={mediaUrls} className={`block-textarea heading-field is-h${block.level} align-${block.align ?? "left"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}${fitTextEnabled(block.visualStyle) ? " has-fit-text" : ""}`} fitText={fitTextEnabled(block.visualStyle)} fitTextSignature={JSON.stringify(block.visualStyle ?? {})} text={block.text} runs={block.runs} onChange={(text, runs) => onChange({ ...block, text, runs })} onSelectionChange={onTextSelection} onLinkActivate={onLinkActivate} data-studio-block-id={block.id} onSplitParagraph={onSplitParagraph ? (before, after) => onSplitParagraph(block.id, before, after) : undefined} onMergeParagraphBackward={onMergeParagraphBackward ? () => onMergeParagraphBackward(block.id) : undefined} onSplitParagraphs={onSplitParagraphs ? paragraphs => onSplitParagraphs(block.id, paragraphs) : undefined} data-placeholder="Heading" aria-label="Heading text" />;
  if (block.type === "quote") return <QuoteEditorBlock {...{ block, rootBlocks, document, buttonPreview, selectedBlockId, hoveredBlockId, writable, mediaUrls, onTableCellFocus, onTextSelection, onLinkActivate, onListItemSelection, onListItemLinkActivate, onSplitParagraph, onMergeParagraphBackward, onSplitParagraphs, onExitList, onOpenNestedInserter, onInsertNestedBlock, onChange, renderBlockControls, htmlEditorBlockId }} />;
  if (block.type === "buttons") return <div className={`content-buttons${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`} style={buttonsPresentationStyle(block)}>{block.children.map(child => {
    const presentation = buttonItemPresentation(block, child, buttonPreview?.blockId === child.id ? buttonPreview.state : undefined);
    return <div className={`${presentation.className} studio-nested-block`} style={presentation.style} data-studio-nested-block-id={child.id} data-studio-selected={selectedBlockId === child.id} tabIndex={-1} role="group" aria-label={child.label ? `Button: ${child.label}` : "Button"} key={child.id}>
      {renderBlockControls?.(child)}
      <BlockField {...{ rootBlocks, document, buttonPreview, selectedBlockId, hoveredBlockId, writable, mediaUrls, onTableCellFocus, onTextSelection, onLinkActivate, renderBlockControls, htmlEditorBlockId }} block={child} onChange={(next, requireSourceMatch) => onChange({ ...block, children: block.children.map(candidate => candidate.id === child.id ? next as typeof child : candidate) }, requireSourceMatch)} />
    </div>;
  })}<button type="button" className="nested-add-block" aria-label="Add button" disabled={!writable || block.children.length >= 100} onClick={() => onInsertNestedBlock?.("button", block.id)}><StudioIcon name="add" size={16} /></button></div>;

  if (block.type === "list") return <ListField htmlEditorBlockId={htmlEditorBlockId} renderBlockControls={renderBlockControls} selectedBlockId={selectedBlockId} hoveredBlockId={hoveredBlockId} onExitList={onExitList} block={block} rootBlocks={rootBlocks} mediaUrls={mediaUrls} writable={writable} onSelectionChange={onListItemSelection} onLinkActivate={onListItemLinkActivate} onChange={onChange} labelForBlock={blockOutlineLabel} />;
  if (block.type === "table") return <TableField block={block} mediaUrls={mediaUrls} writable={writable} showCaptionControl={!renderBlockControls && selectedBlockId === block.id && !rootBlocks.some(root => root.id === block.id)} onCellFocus={onTableCellFocus} onCaptionFocus={() => onTextSelection(null)} onTextSelection={onTextSelection} onLinkActivate={onLinkActivate} onChange={onChange} />;
  if (block.type === "code") return <CodeEditor className={blockAlignmentClass(block)} value={block.code} language={block.language} writable={writable} onChange={(code) => onChange({ ...block, code })} />;
  // User-supplied URLs cannot be known to Next's image optimiser in this local editor.
  if (block.type === "image") {
    const imageSource = block.mediaId ? safeImageSource(mediaUrl ?? "", { allowBlob: true }) : safeImageSource(block.src);
    const linkDestination = block.linkDestination ?? (block.linkUrl ? "custom" : "none");
    const imageLink = linkDestination === "media" ? imageSource : linkDestination === "custom" && block.linkUrl ? safeTextLink(block.linkUrl) : null;
    // Managed browser-local images must retain their resolved blob URLs.
    // eslint-disable-next-line @next/next/no-img-element
    const image = imageSource ? <img draggable={false} src={imageSource} alt={block.decorative ? "" : block.alt} title={block.title} style={imageDisplayStyle(block)} /> : null;
    return <figure className={`image-field${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`}>{image ? (imageLink ? <a href={imageLink} target={block.opensInNewTab ? "_blank" : undefined} rel={block.opensInNewTab ? "noopener noreferrer" : undefined} aria-label={block.decorative || !block.alt ? block.title || block.alt || "Open linked image" : undefined} onClick={(event) => event.preventDefault()}>{image}</a> : image) : <div><span><StudioIcon name="image" /></span><strong>Image block</strong><small>Choose a managed file or add an image URL.</small></div>}<figcaption><RichTextEditor mediaUrls={mediaUrls} as="span" className="image-caption-editor" text={block.caption ?? ""} runs={block.captionRuns} onChange={(caption, captionRuns) => onChange({ ...block, caption: caption || undefined, captionRuns: captionRuns.length ? captionRuns : undefined })} onSelectionChange={onTextSelection} onLinkActivate={onLinkActivate} data-studio-block-id={block.id} data-placeholder="Write caption…" aria-label="Image caption" /></figcaption></figure>;
  }
  if (block.type === "embed") return <EmbedUrlField key={`${block.id}-${block.url}`} mediaUrls={mediaUrls} rootBlocks={rootBlocks} block={block} selected={selectedBlockId === block.id} writable={writable} onTextSelection={onTextSelection} onLinkActivate={onLinkActivate} onChange={onChange} />;
  if (block.type === "button") {
    const previewState = buttonPreview?.blockId === block.id ? buttonPreview.state : undefined;
    const interactionClass = buttonInteractionClassName(block.interactionStyles, previewState);
    const className = ["content-button", `is-${block.style}`, interactionClass].filter(Boolean).join(" ");
    const style = buttonVisualCss(block.visualStyle, block.interactionStyles);
    return <div className={`button-field align-${block.align ?? "centre"}${block.width ? ` has-width-${block.width}` : ""} ${interactionClass}`} style={buttonInteractionLayoutCss(block.interactionStyles) as React.CSSProperties}>
      {writable ? <RichTextEditor as="span" className={className} style={style} text={block.label} runs={block.labelRuns} mediaUrls={mediaUrls} withoutInteractiveFormatting onChange={(label, labelRuns) => onChange({ ...block, label, labelRuns: labelRuns.length ? labelRuns : undefined })} onSelectionChange={onTextSelection} onLinkActivate={onLinkActivate} data-studio-block-id={block.id} data-placeholder="Add text…" aria-label="Button text" /> : <span className={className} style={style}>{renderText(block.label, block.labelRuns, mediaUrls, footnoteNumbers)}</span>}
    </div>;
  }
  if (block.type === "field") return <label className="content-field"><span>{block.label}</span>{block.control === "select" ? <select value={block.value} disabled={!writable} onChange={(event) => { if (writable) onChange({ ...block, value: event.target.value }); }}>{fieldSelectOptions(block).map((option) => <option key={option}>{option}</option>)}</select> : <input value={block.value} readOnly={!writable} onChange={(event) => { if (writable) onChange({ ...block, value: event.target.value }); }} />}</label>;
  if (block.type === "footnotes") return <section className="footnotes-field" aria-label="Footnotes"><strong>Footnotes</strong><ol>{orderedFootnoteEntries(block.notes, footnoteNumbers).map(({ note, number }) => <li key={note.id} value={number} className={number === undefined ? "is-unreferenced" : undefined}>{number === undefined ? <span>Unreferenced footnote</span> : null}<textarea data-studio-footnote-id={note.id} aria-label={number === undefined ? "Unreferenced footnote" : `Footnote ${number}`} rows={2} readOnly={!writable} value={note.text} onChange={event => onChange({ ...block, notes: block.notes.map(item => item.id === note.id ? { ...item, text: event.target.value } : item) })} /></li>)}</ol></section>;
  if (block.type === "document-title") {
    const TitleElement = block.level === 0 ? "p" : `h${block.level ?? 2}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    const title = templatePlaceholder ? "Title" : document?.title || "Add a title in Document settings.";
    const href = document?.slug ? (document.kind === "post" ? `/writing/${document.slug}` : `/${document.slug}`) : null;
    return documentFieldVisible(documentContext, "title") ? <TitleElement className={`metadata-block-editor document-dynamic-title${templatePlaceholder ? " template-dynamic-placeholder" : ""} align-${block.align ?? "left"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`}>{block.isLink && href ? <a href={href} onClick={(event) => event.preventDefault()}>{title}</a> : title}</TitleElement> : null;
  }
  if (block.type === "document-subtitle") return documentFieldVisible(documentContext, "subtitle") ? <p className={`metadata-block-editor document-dynamic-field template-subtitle${templatePlaceholder ? " template-dynamic-placeholder" : ""} align-${block.align ?? "left"}`}>{templatePlaceholder ? "Subtitle" : document?.subtitle || "Add a subtitle in Document settings."}</p> : null;
  if (block.type === "cover-image") {
    if (!documentFieldVisible(documentContext, "coverImage")) return null;
    const imageSource = resolveImageSource(document?.coverImage, mediaUrls, coverImageUrl);
    return <div className={`canvas-cover-wrap document-dynamic-cover align-${block.align ?? "left"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`}>
      <div className={`canvas-cover-image${imageSource ? " is-source" : ""}`} role="img" aria-label={document?.coverImage?.alt || "Mock cover image"}>
        {imageSource ? <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="document-featured-image" draggable={false} src={imageSource} alt={document?.coverImage?.alt || ""} style={imageDisplayStyle(block, { includeFrame: false })} />
        </> : null}
      </div>
      {onOpenCoverMediaLibrary || onRemoveCoverImage ? <div className="canvas-cover-actions">
        {onOpenCoverMediaLibrary ? <button className="cover-action-button" type="button" onClick={(event) => { event.stopPropagation(); onOpenCoverMediaLibrary(); }} aria-label="Change cover image" title="Change cover image"><StudioIcon name="image" /></button> : null}
        {onRemoveCoverImage ? <button className="cover-action-button is-destructive" type="button" onClick={(event) => { event.stopPropagation(); onRemoveCoverImage(); }} aria-label="Remove cover image" title="Remove cover image"><StudioIcon name="trash" /></button> : null}
      </div> : null}
    </div>;
  }
  if (block.type === "spacer") return <button type="button" id={paragraphStyleAnchor(block.visualStyle)} className={`spacer-field${paragraphStyleClassName(block.visualStyle) ? ` ${paragraphStyleClassName(block.visualStyle)}` : ""}`} style={{ ...spacerDimensions(block, spacerOrientation), margin: block.visualStyle?.margin }} data-studio-block-id={block.id} aria-label="Spacer block" />;
  if (block.type === "reading-time") return <div className={`metadata-block-editor reading-time-block-editor${block.presentation === "plain" ? " is-plain" : ""} align-${block.align ?? "left"}`}>{block.presentation !== "plain" ? <span className="reading-time-badge">{block.prefix ?? "Reading Time:"} {readingTimeDisplay(rootBlocks, block)}</span> : <span>{block.prefix ?? "Reading Time:"} {readingTimeDisplay(rootBlocks, block)}</span>}</div>;
  if (block.type === "post-author") { const author = documentAuthor(documentContext); return <div className={`metadata-block-editor article-byline align-${block.align ?? "left"}`}>{author ? <>{block.avatar !== false ? <span className="article-author-avatar" aria-hidden="true">{authorInitials(author)}</span> : null}<span>{block.prefix ?? "By"} <strong>{author}</strong></span></> : <span className="metadata-missing">Add an author in Document settings.</span>}</div>; }
  if (block.type === "post-date") { const date = formatDocumentDate(documentContext, block.format, block); const value = date ? <>{block.showIcon !== false ? <ArticleMetaIcon name="clock" /> : null}<time dateTime={block.dateSource === "modified" ? documentContext.updatedAt : documentContext.publishAt ?? documentContext.publishedAt}>{date}</time></> : <span className="metadata-missing">{block.dateSource === "modified" ? "No confirmed modification date is available." : "Add a publication date in Document settings."}</span>; const href = document?.slug ? (document.kind === "post" ? `/writing/${document.slug}` : `/${document.slug}`) : null; return <div className={`metadata-block-editor article-byline-detail align-${block.align ?? "left"}`}>{block.isLink && href ? <a href={href} onClick={(event) => event.preventDefault()}>{value}</a> : value}</div>; }
  if (block.type === "social-icons") return <SocialIconsEditorBlock htmlEditorBlockId={htmlEditorBlockId} renderBlockControls={renderBlockControls} block={block} selectedBlockId={selectedBlockId} hoveredBlockId={hoveredBlockId} writable={writable} onChange={onChange} onInsert={type => onInsertNestedBlock?.(type, block.id)} />;
  if (block.type === "social-linkedin" || block.type === "social-tiktok") return <SocialIconView block={block} showLabel editing />;
  if (block.type === "columns") {
    if (block.id === pendingColumnsLayoutBlockId) return <ColumnsLayoutChooser block={block} onSelect={widths => {
      onChange(setColumnsLayout(block, widths, index => `column-${crypto.randomUUID()}-${index + 1}`));
      onColumnsLayoutSelected?.();
    }} />;
    return <div id={paragraphStyleAnchor(block.style)} className={`studio-columns${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}${paragraphStyleClassName(block.style) ? ` ${paragraphStyleClassName(block.style)}` : ""}`} style={{ ...columnsLayoutStyle(block), ...paragraphStyleToCss(block.style) }} {...layoutDataAttributes(block)}>{block.children.map((column) => <div className="studio-column-block studio-nested-block" data-studio-nested-block-id={column.id} data-studio-selected={selectedBlockId === column.id} data-studio-hovered={hoveredBlockId === column.id} key={column.id}>{renderBlockControls?.(column)}<BlockField htmlEditorBlockId={htmlEditorBlockId} renderBlockControls={renderBlockControls} block={column} rootBlocks={rootBlocks} document={document} templatePlaceholder={templatePlaceholder} buttonPreview={buttonPreview} selectedBlockId={selectedBlockId} hoveredBlockId={hoveredBlockId}  pendingColumnsLayoutBlockId={pendingColumnsLayoutBlockId} onColumnsLayoutSelected={onColumnsLayoutSelected} pendingGroupLayoutBlockId={pendingGroupLayoutBlockId} onGroupLayoutSelected={onGroupLayoutSelected} coverImageUrl={coverImageUrl} onOpenCoverMediaLibrary={onOpenCoverMediaLibrary} onRemoveCoverImage={onRemoveCoverImage} mediaUrls={mediaUrls} onListItemSelection={onListItemSelection} onListItemLinkActivate={onListItemLinkActivate} onTableCellFocus={onTableCellFocus} onTextSelection={onTextSelection} onLinkActivate={onLinkActivate} onSplitParagraph={onSplitParagraph} onMergeParagraphBackward={onMergeParagraphBackward} onSplitParagraphs={onSplitParagraphs} onExitList={onExitList} onOpenNestedInserter={onOpenNestedInserter} writable={writable} onInsertNestedBlock={onInsertNestedBlock} onChange={(next, requireSourceMatch) => onChange({ ...block, children: block.children.map((candidate) => candidate.id === column.id ? next as typeof column : candidate) }, requireSourceMatch)} /></div>)}</div>;
  }
  if (block.type === "column") return <div id={paragraphStyleAnchor(block.style)} data-studio-column-drop-id={block.id} className={`studio-column-content${paragraphStyleClassName(block.style) ? ` ${paragraphStyleClassName(block.style)}` : ""}`} style={{ ...layoutStyleProperties(block), ...(block.verticalAlign ? { alignSelf: block.verticalAlign === "centre" ? "center" : block.verticalAlign === "bottom" ? "end" : block.verticalAlign === "top" ? "start" : "stretch" } : {}), ...paragraphStyleToCss(block.style) }}>{block.children.map((child, index) => <div className="studio-nested-block" data-block-align={"blockAlign" in child ? child.blockAlign : undefined} data-studio-nested-block-id={child.id} data-studio-selected={selectedBlockId === child.id} data-studio-hovered={hoveredBlockId === child.id} key={child.id}>{renderBlockControls?.(child)}<BlockField htmlEditorBlockId={htmlEditorBlockId} renderBlockControls={renderBlockControls} block={child} rootBlocks={rootBlocks} document={document} templatePlaceholder={templatePlaceholder} buttonPreview={buttonPreview} selectedBlockId={selectedBlockId} hoveredBlockId={hoveredBlockId} previousParagraphIndent={indentFromPreviousParagraph(block.children, index)} pendingColumnsLayoutBlockId={pendingColumnsLayoutBlockId} onColumnsLayoutSelected={onColumnsLayoutSelected} pendingGroupLayoutBlockId={pendingGroupLayoutBlockId} onGroupLayoutSelected={onGroupLayoutSelected} coverImageUrl={coverImageUrl} onOpenCoverMediaLibrary={onOpenCoverMediaLibrary} onRemoveCoverImage={onRemoveCoverImage} mediaUrls={mediaUrls} mediaUrl={child.type === "image" && child.mediaId ? mediaUrls[child.mediaId] : undefined} onListItemSelection={onListItemSelection} onListItemLinkActivate={onListItemLinkActivate} onTableCellFocus={onTableCellFocus} onTextSelection={onTextSelection} onLinkActivate={onLinkActivate} onSplitParagraph={onSplitParagraph} onMergeParagraphBackward={onMergeParagraphBackward} onSplitParagraphs={onSplitParagraphs} onExitList={onExitList} onOpenNestedInserter={onOpenNestedInserter} writable={writable} onInsertNestedBlock={onInsertNestedBlock} onChange={(next, requireSourceMatch) => onChange({ ...block, children: block.children.map((candidate) => candidate.id === child.id ? next : candidate) }, requireSourceMatch)} /></div>)}<NestedBlockAppender parentId={block.id} writable={writable} onOpen={onOpenNestedInserter} /></div>;
  if (block.type === "section" || block.type === "group") { const Group = block.type === "section" ? "section" : block.tagName ?? "div"; return <Group className={`studio-nested-group layout-${block.layout}${hasLayoutOptions(block) ? " has-layout-options" : ""}${block.type === "group" && blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`} style={layoutStyleProperties(block)} {...layoutDataAttributes(block)} data-section-role={block.type === "section" ? block.role : undefined} aria-label={block.type === "group" ? block.ariaLabel || undefined : undefined}>{block.children.map((child, index) => <div className="studio-nested-block" data-block-align={"blockAlign" in child ? child.blockAlign : undefined} data-studio-nested-block-id={child.id} data-studio-selected={selectedBlockId === child.id} data-studio-hovered={hoveredBlockId === child.id} key={child.id}>{renderBlockControls?.(child)}<BlockField htmlEditorBlockId={htmlEditorBlockId} renderBlockControls={renderBlockControls} block={child} rootBlocks={rootBlocks} document={document} templatePlaceholder={templatePlaceholder} buttonPreview={buttonPreview} selectedBlockId={selectedBlockId} hoveredBlockId={hoveredBlockId} previousParagraphIndent={indentFromPreviousParagraph(block.children, index)} spacerOrientation={spacerOrientationForChildren(block)} pendingColumnsLayoutBlockId={pendingColumnsLayoutBlockId} onColumnsLayoutSelected={onColumnsLayoutSelected} pendingGroupLayoutBlockId={pendingGroupLayoutBlockId} onGroupLayoutSelected={onGroupLayoutSelected} coverImageUrl={coverImageUrl} onOpenCoverMediaLibrary={onOpenCoverMediaLibrary} onRemoveCoverImage={onRemoveCoverImage} mediaUrls={mediaUrls} mediaUrl={child.type === "image" && child.mediaId ? mediaUrls[child.mediaId] : undefined} onListItemSelection={onListItemSelection} onListItemLinkActivate={onListItemLinkActivate} onTableCellFocus={onTableCellFocus} onTextSelection={onTextSelection} onLinkActivate={onLinkActivate} onSplitParagraph={onSplitParagraph} onMergeParagraphBackward={onMergeParagraphBackward} onSplitParagraphs={onSplitParagraphs} onExitList={onExitList} onOpenNestedInserter={onOpenNestedInserter} writable={writable} onInsertNestedBlock={onInsertNestedBlock} onChange={(next, requireSourceMatch) => onChange({ ...block, children: block.children.map((candidate) => candidate.id === child.id ? next : candidate) }, requireSourceMatch)} /></div>)}<NestedBlockAppender parentId={block.id} writable={writable} onOpen={onOpenNestedInserter} /></Group>; }
  const divider = block.type === "divider" ? block : undefined;
  const DividerElement = divider?.tagName ?? "hr";
  return <div className={`divider-field${divider && blockAlignmentClass(divider) ? ` ${blockAlignmentClass(divider)}` : ""}`}><DividerElement className={`content-divider is-${divider?.style ?? "default"}`} style={dividerRuleStyle(divider?.visualStyle, divider?.style) as React.CSSProperties} role={DividerElement === "div" ? "separator" : undefined} aria-orientation={DividerElement === "div" ? "horizontal" : undefined} /></div>;
}

function QuoteEditorBlock(props: BlockFieldProps & { block: Extract<ContentBlock, { type: "quote" }> }) {
  const { block, onChange } = props;
  const legacyParagraphId = useId();
  const [materialisedParagraphId, setMaterialisedParagraphId] = useState<string | null>(null);
  const children: ContentBlock[] = block.children ?? [{ id: `paragraph-${legacyParagraphId}`, type: "paragraph", text: block.text, runs: block.runs }];
  return <figure className={`quote-field align-${block.align ?? "left"}${block.quoteStyle === "plain" ? " is-style-plain" : ""}`}>
    <blockquote>{children.map(child => <div className="studio-nested-block" data-studio-nested-block-id={block.children ? child.id : block.id} data-studio-selected={props.selectedBlockId === child.id} key={!block.children || child.id === materialisedParagraphId ? legacyParagraphId : child.id}>{block.children ? props.renderBlockControls?.(child) : null}<BlockField {...props} mediaUrl={child.type === "image" && child.mediaId ? props.mediaUrls?.[child.mediaId] : undefined} block={child} onSplitParagraph={block.children ? props.onSplitParagraph : (_id, before, after) => {
      const nextId = `paragraph-${crypto.randomUUID()}`;
      const beforeId = `paragraph-${crypto.randomUUID()}`;
      setMaterialisedParagraphId(beforeId);
      onChange({ ...block, text: "", runs: undefined, children: [{ id: beforeId, type: "paragraph", text: plainTextFromRuns(before), runs: before }, { id: nextId, type: "paragraph", text: plainTextFromRuns(after), runs: after }] });
      return nextId;
    }} onChange={(next, requireSourceMatch) => {
      const persisted = block.children ? next : { ...next, id: `paragraph-${crypto.randomUUID()}` };
      if (!block.children) setMaterialisedParagraphId(persisted.id);
      const activeEditor = document.activeElement instanceof HTMLElement && document.activeElement.dataset.studioBlockId === child.id ? document.activeElement : null;
      const selection = activeEditor ? selectionWithinEditor(activeEditor) : null;
      onChange({ ...block, text: "", runs: undefined, children: children.map(candidate => candidate.id === child.id ? persisted : candidate) }, requireSourceMatch);
      if (!block.children && selection) requestAnimationFrame(() => {
        const editor = [...document.querySelectorAll<HTMLElement>(".rich-text-editor[data-studio-block-id]")].find(element => element.dataset.studioBlockId === persisted.id);
        if (editor) { editor.focus(); restoreEditorSelection(editor, selection); }
      });
    }} /></div>)}<button type="button" className="nested-add-block" disabled={!props.writable} onClick={() => props.onInsertNestedBlock?.("paragraph", block.id)}><StudioIcon name="add" size={16} /> Add paragraph</button></blockquote>
    <RichTextEditor as="span" className="quote-citation quote-citation-editor" text={block.attribution ?? ""} runs={block.attributionRuns} mediaUrls={props.mediaUrls} data-studio-block-id={block.id} data-list-context-id={block.id} data-list-item-index={-1} data-quote-citation="true" data-placeholder="Add citation…" aria-label="Quote citation" onChange={(attribution, attributionRuns) => onChange({ ...block, attribution: attribution || undefined, attributionRuns: attributionRuns.length ? attributionRuns : undefined })} onSelectionChange={props.onTextSelection} onLinkActivate={props.onLinkActivate} />
  </figure>;
}

function EmbedUrlField({ block, rootBlocks, selected, writable, mediaUrls, onTextSelection, onLinkActivate, onChange }: {
  block: Extract<ContentBlock, { type: "embed" }>;
  rootBlocks: ContentBlock[];
  mediaUrls: Record<string, string>;
  selected: boolean;
  writable: boolean;
  onTextSelection: BlockFieldProps["onTextSelection"];
  onLinkActivate: BlockFieldProps["onLinkActivate"];
  onChange: BlockFieldProps["onChange"];
}) {
  const footnoteNumbers = useFootnoteNumbers();
  const inputId = useId();
  const helpId = useId();
  const errorId = useId();
  const [draftUrl, setDraftUrl] = useState(block.url);
  const [editingUrl, setEditingUrl] = useState(false);
  const [error, setError] = useState(block.url && !safeTextLink(block.url) ? "Enter a valid web address." : "");
  const url = safeTextLink(block.url);
  const linkParagraph = embedLinkParagraph(block, rootBlocks);

  function convertToLink() {
    if (!writable || !linkParagraph) return;
    onChange(linkParagraph, true);
  }

  function submitUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!writable) return;
    const safeUrl = safeTextLink(draftUrl);
    if (!safeUrl) {
      setError("Enter a valid web address.");
      return;
    }
    setError("");
    setEditingUrl(false);
    onChange({ ...block, url: safeUrl });
  }

  if (url && !editingUrl) return <figure className={`embed-player-block${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`}>
    <EmbedContent url={block.url} title={block.title} />
    {selected && writable ? <label className="embed-title-setting"><span>Player title</span><input aria-label="Embed player title" value={block.title} onChange={event => onChange({ ...block, title: event.target.value })} /></label> : null}
    {selected && writable ? <><button type="button" className="embed-edit-url" onClick={() => { setDraftUrl(block.url); setError(""); setEditingUrl(true); }}>Edit URL</button>{!resolveEmbedProvider(block.url) ? <button type="button" disabled={!linkParagraph} onClick={convertToLink}>Convert to link</button> : null}<RichTextEditor mediaUrls={mediaUrls} as="span" className="embed-caption-editor" text={block.caption ?? ""} runs={block.captionRuns} onChange={(caption, captionRuns) => onChange({ ...block, caption: caption || undefined, captionRuns: captionRuns.length ? captionRuns : undefined })} onSelectionChange={onTextSelection} onLinkActivate={onLinkActivate} data-studio-block-id={block.id} data-placeholder="Write a caption…" aria-label="Embed caption" /></> : block.caption ? <figcaption>{renderText(block.caption, block.captionRuns, mediaUrls, footnoteNumbers)}</figcaption> : null}
  </figure>;

  return <section className={`embed-url-placeholder${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`} aria-labelledby={`${inputId}-title`}>
    <div className="embed-url-placeholder-heading"><span aria-hidden="true" className="embed-url-placeholder-icon"><BlockLibraryIcon type="embed" /></span><h2 id={`${inputId}-title`}>Embed URL</h2></div>
    <p className="embed-url-placeholder-description">Paste a link to the content you want to display on your site.</p>
    <form className="embed-url-placeholder-form" onSubmit={submitUrl} noValidate>
      <label className="visually-hidden" htmlFor={inputId}>Enter URL to embed</label>
      <input id={inputId} type="url" inputMode="url" autoCapitalize="off" spellCheck={false} disabled={!writable} aria-invalid={Boolean(error)} aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`} value={draftUrl} onChange={event => { const value = event.target.value; setDraftUrl(value); if (error && safeTextLink(value)) setError(""); }} placeholder="Enter URL to embed here…" />
      <button type="submit" disabled={!writable}>Embed</button>
      {url ? <button className="embed-cancel-url" type="button" disabled={!writable} onClick={() => { setDraftUrl(block.url); setError(""); setEditingUrl(false); }}>Cancel</button> : null}
    </form>
    <p className="embed-url-placeholder-help" id={helpId}><a href="https://wordpress.org/documentation/article/embed-block/" target="_blank" rel="noopener noreferrer">Learn more about embeds <StudioIcon name="external" size={18} /></a></p>
    {error ? <p className="embed-url-placeholder-error" id={errorId} role="alert">{error}</p> : null}
  </section>;
}

function CodeEditor({ value, language, className, writable, onChange }: { value: string; language?: string; className?: string; writable: boolean; onChange: (value: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const highlighted = highlightCode(value, language);

  // Measure after every render: inspector and inherited typography can change
  // wrapping and line height even when the code and available width stay equal.
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
  });

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
        readOnly={!writable}
        onChange={(event) => { if (writable) onChange(event.target.value); }}
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
