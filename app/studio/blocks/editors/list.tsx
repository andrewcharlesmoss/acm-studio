"use client";

import { readMathClipboardRuns } from "../../math-clipboard";
import { useRichTextFeedback } from "../../rich-text-editing-context";
import { editBlockSiblings } from "../../block-sibling-operations";
import { mergeListItemBoundary } from "../../list-boundary";
import { readBlockClipboardPayload } from "../../block-clipboard";
import { useLayoutEffect, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type ReactNode } from "react";
import { listItemTextStyle, paragraphStyleAnchor, paragraphStyleToCss, visualStyleClassName } from "../../../content/paragraph-styles";
import { plainTextFromRuns, textToRuns } from "../../../content/rich-text";
import { listItemText, listMarker, type ContentBlock, type RichTextRun } from "../../../content/model";
import { listItemWithTextRuns } from "../../../content/list-item-text";
import { blockToHtml } from "../../studio-html-editor";
import { blockAlignmentClass } from "../../../content/block-alignment";
import { findListBlock, indentListItem, listItemAfterSplit, listItemIsEmpty, outdentListItem, replaceListItems, updateListItem } from "../../list-structure";
import { extendListTextSelection, formatListText, listTextContainsFootnotes, listTextSegments, readListTextSelection, replaceListText, restoreListTextSelection, type ListTextSelection } from "../../list-text-selection";
import { sliceTextRuns } from "../../../content/math-runs";
import { scheduleBlockCommandFocus, type BlockCommandFocusTarget } from "../../block-command-focus";
import { editorToRuns, editorTextOffset, focusRichTextEditorAtOffset, preserveTextSelection, RichTextEditor } from "./rich-text";
import { StudioHoverIcon } from "../../studio-hover-icon";
import { HiddenBlockPlaceholder } from "../hidden-block-placeholder";

type TextSelection = { start: number; end: number };
type EditableListBlock = Extract<ContentBlock, { type: "list" }>;

function ListItemIndentControls({ block, rootBlocks, selection, writable, onChange, onSelectionChange }: {
  block: EditableListBlock;
  rootBlocks: ContentBlock[];
  selection: { listId: string; itemIndex: number };
  writable: boolean;
  onChange: (block: EditableListBlock) => void;
  onSelectionChange: (list: EditableListBlock, itemIndex: number) => void;
}) {
  const list = findListBlock(block, selection.listId);
  if (!list) return null;
  const canIndent = selection.itemIndex > 0 && selection.itemIndex < list.items.length;
  const canOutdent = list.id !== block.id && Boolean(outdentListItem(block, list.id, selection.itemIndex, rootBlocks));

  function move(direction: "indent" | "outdent") {
    if (!list) return;
    const moved = direction === "indent"
      ? indentListItem(block, list.id, selection.itemIndex, () => `list-${crypto.randomUUID()}`)
      : outdentListItem(block, list.id, selection.itemIndex, rootBlocks);
    if (!moved) return;
    onChange(moved.block);
    const movedList = findListBlock(moved.block, moved.listId);
    if (movedList) onSelectionChange(movedList, moved.itemIndex);
    requestAnimationFrame(() => {
      const item = [...document.querySelectorAll<HTMLElement>("[data-studio-block-id][data-list-context-id][data-list-item-index]")]
        .find(element => element.dataset.studioBlockId === moved.listId && element.dataset.listContextId === moved.listId && element.dataset.listItemIndex === String(moved.itemIndex));
      item?.focus();
    });
  }

  return <div className="list-item-indent-controls" role="group" aria-label="List item indentation">
    <button type="button" onMouseDown={preserveTextSelection} onClick={event => { event.stopPropagation(); move("outdent"); }} disabled={!writable || !canOutdent} aria-label="Outdent list item" title="Outdent"><StudioHoverIcon name="arrange.outdent" size={20} /></button>
    <button type="button" onMouseDown={preserveTextSelection} onClick={event => { event.stopPropagation(); move("indent"); }} disabled={!writable || !canIndent} aria-label="Indent list item" title="Indent"><StudioHoverIcon name="arrange.indent" size={20} /></button>
  </div>;
}

export function ListField({ htmlEditorBlockId, renderBlockControls, selectedBlockId, hoveredBlockId, block, rootBlocks, mediaUrls, writable, onExitList, onSelectionChange, onLinkActivate, onChange, labelForBlock }: { htmlEditorBlockId?: string; renderBlockControls?: (block: ContentBlock) => ReactNode; selectedBlockId?: string | null; hoveredBlockId?: string | null; block: EditableListBlock; rootBlocks: ContentBlock[]; mediaUrls: Record<string, string>; writable: boolean; onExitList?: (blockId: string, itemIndex: number, operation?: "return" | "backward" | "forward", listId?: string) => BlockCommandFocusTarget; onSelectionChange?: (block: EditableListBlock, index: number, selection: TextSelection | null) => void; onLinkActivate?: (block: EditableListBlock, index: number, selection: TextSelection) => void; onChange: (block: ContentBlock, requireSourceMatch?: boolean) => void; labelForBlock: (block: ContentBlock) => string }) {
  const listRef = useRef<HTMLDivElement>(null);
  const feedback = useRichTextFeedback();
  const currentRef = useRef({ block, writable, onChange });
  useLayoutEffect(() => { currentRef.current = { block, writable, onChange }; });
  const [activeItem, setActiveItem] = useState<{ listId: string; itemIndex: number } | null>(null);
  const [compositionRevision, setCompositionRevision] = useState(0);
  const listCompositionRef = useRef<ListTextSelection | null>(null);
  const blockedListInputRef = useRef(false);

  function textRange() { return listRef.current && readListTextSelection(currentRef.current.block, listRef.current); }

  function replaceSelection(selection: ListTextSelection, replacement: RichTextRun[]) {
    const current = currentRef.current;
    if (!current.writable) return false;
    const result = replaceListText(current.block, selection, replacement);
    if (!result) { feedback?.("Text across nested Lists can be selected, copied and formatted. Edit each List Item separately to change its content."); return false; }
    current.onChange(result.block);
    requestAnimationFrame(() => {
      if (listRef.current && currentRef.current.block.id === selection.rootId) restoreListTextSelection(listRef.current, { anchor: result.caret, focus: result.caret });
    });
    return true;
  }

  // Separate contenteditable hosts cannot safely perform a native replacement:
  // its input event would save just one item. Capture the operation at the List.
  useLayoutEffect(() => {
    const element = listRef.current;
    if (!element) return;
    const beforeInput = (event: InputEvent) => {
      if (listCompositionRef.current) return; // IME DOM changes are staged until compositionend.
      const selection = textRange();
      if (!selection || !/^(insert|delete|format)/.test(event.inputType)) return;
      if (!event.cancelable) {
        blockedListInputRef.current = true;
        feedback?.("Place the caret within one List Item for this input method.");
        return;
      }
      event.preventDefault(); event.stopPropagation();
      if (!currentRef.current.writable) return;
      if (["insertText", "insertReplacementText"].includes(event.inputType)) {
        const text = event.data ?? event.dataTransfer?.getData("text/plain");
        if (text === undefined || text === null) { feedback?.("This replacement did not include text. The selected List Items were retained."); return; }
        replaceSelection(selection, textToRuns(text));
      }
      else if (event.inputType.startsWith("delete")) replaceSelection(selection, []);
      else feedback?.("Choose a text-formatting control, or edit within one List Item for this operation.");
    };
    element.addEventListener("beforeinput", beforeInput, true);
    return () => element.removeEventListener("beforeinput", beforeInput, true);
  });

  function copySelection(event: ReactClipboardEvent<HTMLDivElement>, cut = false) {
    const selection = textRange();
    if (!selection) return;
    event.preventDefault(); event.stopPropagation();
    if (listTextContainsFootnotes(currentRef.current.block, selection)) { feedback?.("Use the List block’s Copy or Cut action to include its Footnote text."); return; }
    const segments = listTextSegments(currentRef.current.block, selection);
    if (!segments) return;
    const selectedRuns = segments.map(segment => sliceTextRuns(segment.runs, segment.start, segment.end));
    const plain = selectedRuns.map(plainTextFromRuns).join("\n");
    event.clipboardData.setData("text/plain", plain);
    event.clipboardData.setData("text/html", blockToHtml({ id: "selected-list-text", type: "list", style: currentRef.current.block.style, items: selectedRuns.map(runs => listItemWithTextRuns("", plainTextFromRuns(runs), runs)) }));
    // Source removal is allowed only after both clipboard representations exist.
    if (cut) replaceSelection(selection, []);
  }
  function selectItem(list: EditableListBlock, index: number, selection: TextSelection | null = null) {
    setActiveItem({ listId: list.id, itemIndex: index });
    onSelectionChange?.(list, index, selection);
  }

  function focusItem(listId: string, index: number, offset = 0) {
    requestAnimationFrame(() => {
      const target = [...(listRef.current?.querySelectorAll<HTMLElement>("[data-list-context-id][data-list-item-index]") ?? [])]
        .find(element => element.dataset.listContextId === listId && element.dataset.listItemIndex === String(index));
      if (target) focusRichTextEditorAtOffset(target, offset);
    });
  }

  function updateItem(list: EditableListBlock, index: number, value: string, runs: RichTextRun[]) {
    onChange(updateListItem(block, list.id, index, item => listItemWithTextRuns(item, value, runs)));
  }

  function renderList(list: EditableListBlock, depth: number): ReactNode {
    const items = list.items.length ? list.items : [""];
    return <div className={`list-field-editor is-${list.style}${depth ? " is-nested" : ""}${blockAlignmentClass(list) ? ` ${blockAlignmentClass(list)}` : ""}`} data-list-context-id={list.id}>
      {items.map((item, index) => {
        const children = typeof item === "string" ? [] : item.children ?? [];
        const label = `${list.style === "ordered" ? "Numbered" : "Bulleted"} list item ${index + 1}${depth ? `, level ${depth + 1}` : ""}`;
        const itemStyle = typeof item === "string" ? undefined : item.style;
        return <div id={paragraphStyleAnchor(itemStyle)} className={`list-field-row${itemStyle ? ` ${visualStyleClassName(itemStyle)}` : ""}`} style={paragraphStyleToCss(itemStyle) as React.CSSProperties} key={`${list.id}-item-${index}`}>
          <span className="list-field-marker" aria-hidden="true">{list.style === "ordered" ? listMarker(list, index) : "•"}</span>
          <div className="list-field-item-content">
            <RichTextEditor key={JSON.stringify([block.id, list.id, list.items.length, compositionRevision])} className="list-item-editor" style={listItemTextStyle(itemStyle) as React.CSSProperties} data-studio-block-id={list.id} data-list-context-id={list.id} data-list-item-index={index} text={listItemText(item)} runs={typeof item === "string" ? undefined : item.runs} mediaUrls={mediaUrls} onChange={(text, runs) => updateItem(list, index, text, runs)} onFocus={() => selectItem(list, index)} onSelectionChange={(selection) => selectItem(list, index, selection)} onLinkActivate={(selection) => onLinkActivate?.(list, index, selection)} onSplitParagraph={(beforeRuns, afterRuns) => {
              if (listItemIsEmpty(item)) {
                if (depth > 0) {
                  const moved = outdentListItem(block, list.id, index, rootBlocks);
                  if (moved) { onChange(moved.block); focusItem(moved.listId, moved.itemIndex); }
                  return null;
                }
                return onExitList?.(block.id, index) ?? null;
              }
              const nextItems = [...items];
              nextItems[index] = listItemWithTextRuns(item, plainTextFromRuns(beforeRuns), beforeRuns);
              nextItems.splice(index + 1, 0, listItemAfterSplit(item, plainTextFromRuns(afterRuns), afterRuns));
              onChange(replaceListItems(block, list.id, nextItems));
              focusItem(list.id, index + 1);
              return null;
            }} onKeyDown={(event) => {
              if (!writable || event.defaultPrevented || event.nativeEvent?.isComposing) return;
              if (event.key === "Tab") {
                const moved = event.shiftKey
                  ? outdentListItem(block, list.id, index, rootBlocks)
                  : indentListItem(block, list.id, index, () => `list-${crypto.randomUUID()}`);
                if (moved) { event.preventDefault(); onChange(moved.block); focusItem(moved.listId, moved.itemIndex); }
                return;
              }
              if (!["Backspace", "Delete"].includes(event.key) || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;
              const selection = window.getSelection();
              const editor = event.currentTarget;
              if (!selection?.isCollapsed || !selection.anchorNode || !editor.contains(selection.anchorNode)) return;
              const offset = editorTextOffset(editor, selection.anchorNode, selection.anchorOffset);
              const backward = event.key === "Backspace";
              if ((backward && offset !== 0) || (!backward && offset !== listItemText(item).length)) return;
              if (backward && list.id === block.id && index === 0) {
                event.preventDefault();
                const focusTarget = onExitList?.(block.id, index, "backward");
                if (focusTarget) scheduleBlockCommandFocus(editor, focusTarget, listRef.current ?? document,
                  target => focusRichTextEditorAtOffset(target, typeof focusTarget === "string" ? 0 : focusTarget.offset ?? 0));
                return;
              }
              const merged = mergeListItemBoundary(block, list.id, index, backward ? "backward" : "forward", rootBlocks);
              if (!merged) {
                event.preventDefault();
                const focusTarget = !backward ? onExitList?.(block.id, index, "forward", list.id) : null;
                if (focusTarget) scheduleBlockCommandFocus(editor, focusTarget, listRef.current ?? document,
                  target => focusRichTextEditorAtOffset(target, typeof focusTarget === "string" ? 0 : focusTarget.offset ?? 0));
                return;
              }
              event.preventDefault(); onChange(merged.block, true);
              scheduleBlockCommandFocus(editor, { blockId: merged.listId, listItemIndex: merged.itemIndex,
                isAccepted: () => currentRef.current.writable && JSON.stringify(currentRef.current.block) === JSON.stringify(merged.block),
              }, listRef.current ?? document, target => focusRichTextEditorAtOffset(target, merged.offset));

            }} aria-label={label} data-placeholder="List item" />
            {activeItem?.listId === list.id && activeItem.itemIndex === index ? <ListItemIndentControls block={block} rootBlocks={rootBlocks} selection={activeItem} writable={writable} onChange={next => onChange(next)} onSelectionChange={(nextList, nextIndex) => selectItem(nextList, nextIndex)} /> : null}
            {children.map(child => <div className="list-field-nested studio-nested-block" data-studio-nested-block-id={child.id} data-studio-selected={selectedBlockId === child.id} data-studio-hovered={hoveredBlockId === child.id} key={child.id}>
              {renderBlockControls?.(child)}
              {htmlEditorBlockId === child.id ? null : child.editorial?.hidden ? <HiddenBlockPlaceholder label={labelForBlock(child)} writable={writable} onShow={() => onChange(editBlockSiblings([block], child.id, (siblings, position) => siblings.map((candidate, siblingIndex) => siblingIndex === position ? { ...candidate, editorial: { ...candidate.editorial, hidden: false } } : candidate))[0])} /> : <div id={paragraphStyleAnchor(child.visualStyle)} className={child.visualStyle ? visualStyleClassName(child.visualStyle) : undefined} style={paragraphStyleToCss(child.visualStyle) as React.CSSProperties}>{renderList(child, depth + 1)}</div>}
            </div>)}
          </div>
        </div>;
      })}
    </div>;
  }

  return <div ref={listRef} className="list-field-root" data-list-root-id={block.id} onCompositionStartCapture={() => { listCompositionRef.current = textRange(); }} onCompositionEndCapture={event => {
    const selection = listCompositionRef.current;
    if (!selection) return;
    listCompositionRef.current = null;
    blockedListInputRef.current = true;
    if (event.data) replaceSelection(selection, textToRuns(event.data));
    // Remount the hosts even after cancellation/rejection to discard unsaved
    // composition DOM, including a native edit in a different item host.
    setCompositionRevision(revision => revision + 1);
    requestAnimationFrame(() => { blockedListInputRef.current = false; });
  }} onInputCapture={event => {
    if (!listCompositionRef.current && !blockedListInputRef.current) return;
    event.stopPropagation();
    if (!listCompositionRef.current) { blockedListInputRef.current = false; setCompositionRevision(revision => revision + 1); }
  }} onCopyCapture={event => copySelection(event)} onCutCapture={event => copySelection(event, true)} onPasteCapture={event => {
    const selection = textRange();
    if (!selection) return;
    event.preventDefault(); event.stopPropagation();
    if (!currentRef.current.writable) return;
    if (readBlockClipboardPayload(event.clipboardData.getData("text/html")) || readBlockClipboardPayload(event.clipboardData.getData("text/plain"))) { feedback?.("Paste copied blocks at a block boundary. Place the caret within one List Item to paste text."); return; }
    const parsed = readMathClipboardRuns(event.clipboardData.getData("text/html"), editorToRuns);
    if (parsed.handled && "error" in parsed) { feedback?.(parsed.error); return; }
    const runs = parsed.handled ? parsed.runs : textToRuns(event.clipboardData.getData("text/plain"));
    replaceSelection(selection, runs);
  }} onKeyDownCapture={event => {
    if (event.target instanceof Element && !event.target.closest(".list-item-editor")) return;
    if (event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) && listRef.current && extendListTextSelection(listRef.current, event.key, currentRef.current.block)) {
      event.preventDefault(); event.stopPropagation(); return;
    }
    const selection = textRange();
    if (!selection) return;
    const primary = event.metaKey || event.ctrlKey;
    if (primary && !event.altKey && !event.shiftKey && ["b", "i"].includes(event.key.toLowerCase())) {
      event.preventDefault(); event.stopPropagation();
      if (!currentRef.current.writable) return;
      const next = formatListText(currentRef.current.block, selection, event.key.toLowerCase() === "b" ? "bold" : "italic");
      currentRef.current.onChange(next);
      requestAnimationFrame(() => { if (listRef.current && currentRef.current.block.id === selection.rootId) restoreListTextSelection(listRef.current, selection); });
    } else if (!event.nativeEvent.isComposing && ["Backspace", "Delete"].includes(event.key)) {
      event.preventDefault(); event.stopPropagation(); replaceSelection(selection, []);
    } else if (!event.shiftKey && !primary && !event.altKey && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Escape"].includes(event.key)) {
      const segments = listTextSegments(currentRef.current.block, selection);
      const backward = ["ArrowLeft", "ArrowUp", "Escape"].includes(event.key);
      const edge = backward ? segments?.[0] : segments?.at(-1);
      if (edge && listRef.current) {
        event.preventDefault(); event.stopPropagation();
        const caret = { listId: edge.listId, itemIndex: edge.itemIndex, offset: backward ? edge.start : edge.end };
        restoreListTextSelection(listRef.current, { anchor: caret, focus: caret });
      }
    } else if (["Enter", "Tab"].includes(event.key)) {
      event.preventDefault(); event.stopPropagation(); feedback?.("Place the caret within one List Item to split or indent it.");
    }
  }}>{renderList(block, 0)}</div>;
}
