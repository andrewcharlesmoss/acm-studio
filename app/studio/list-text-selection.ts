import { listItemText, type ListBlock, type ListItem, type RichTextRun, type TextMark } from "../content/model";
import { normaliseTextRuns, plainTextFromRuns, textToRuns, updateTextMark } from "../content/rich-text";
import { sliceTextRuns } from "../content/math-runs";
import { listItemWithTextRuns } from "../content/list-item-text";
import { findListBlock, replaceListItems, updateListItem } from "./list-structure";
import { richTextOffset, richTextPointAtOffset } from "./rich-text-dom";
import { validRichTextRun } from "../content/rich-text-validation";

export type ListTextPoint = { listId: string; itemIndex: number; offset: number };
export type ListTextSelection = { rootId: string; anchor: ListTextPoint; focus: ListTextPoint; baseline: string };
type ListTextField = { listId: string; itemIndex: number; item: ListItem; runs: RichTextRun[] };
export type ListTextSegment = ListTextField & { start: number; end: number };

function listTextFields(list: ListBlock): ListTextField[] {
  return list.items.flatMap((item, itemIndex) => [
    { listId: list.id, itemIndex, item, runs: typeof item === "string" ? textToRuns(item) : item.runs ?? textToRuns(item.text) },
    ...(typeof item === "string" ? [] : (item.children ?? []).filter(child => !child.editorial?.hidden).flatMap(listTextFields)),
  ]);
}

/** A text range never grants ownership of the containing List block. */
export function listTextSegments(root: ListBlock, selection: ListTextSelection): ListTextSegment[] | null {
  if (selection.rootId !== root.id || selection.baseline !== JSON.stringify(root)) return null;
  const fields = listTextFields(root);
  const indexOf = (point: ListTextPoint) => fields.findIndex(field => field.listId === point.listId && field.itemIndex === point.itemIndex);
  const anchorIndex = indexOf(selection.anchor), focusIndex = indexOf(selection.focus);
  if (anchorIndex < 0 || focusIndex < 0 || anchorIndex === focusIndex) return null;
  for (const [point, index] of [[selection.anchor, anchorIndex], [selection.focus, focusIndex]] as const) {
    if (!Number.isInteger(point.offset) || point.offset < 0 || point.offset > plainTextFromRuns(fields[index].runs).length) return null;
  }
  const forward = anchorIndex < focusIndex;
  const first = forward ? selection.anchor : selection.focus, last = forward ? selection.focus : selection.anchor;
  return fields.slice(Math.min(anchorIndex, focusIndex), Math.max(anchorIndex, focusIndex) + 1).map((field, index, selected) => ({
    ...field, start: index === 0 ? first.offset : 0,
    end: index === selected.length - 1 ? last.offset : plainTextFromRuns(field.runs).length,
  }));
}

export function listTextMarkState(root: ListBlock, selection: ListTextSelection, mark: TextMark): boolean | "mixed" {
  const states = (listTextSegments(root, selection) ?? []).flatMap(segment => sliceTextRuns(segment.runs, segment.start, segment.end))
    .filter(run => !run.inline && run.text.length).map(run => (run.marks ?? []).some(candidate => JSON.stringify(candidate) === JSON.stringify(mark)));
  return states.length && states.every(Boolean) ? true : states.some(Boolean) ? "mixed" : false;
}

export function listTextContainsFootnotes(root: ListBlock, selection: ListTextSelection): boolean {
  return (listTextSegments(root, selection) ?? []).some(segment => sliceTextRuns(segment.runs, segment.start, segment.end).some(run => run.inline?.type === "footnote" || run.marks?.some(mark => typeof mark !== "string" && mark.type === "footnote")));
}

export function formatListText(root: ListBlock, selection: ListTextSelection, mark: TextMark, mode: "toggle" | "set" | "remove" = "toggle"): ListBlock {
  const segments = listTextSegments(root, selection);
  if (!segments) return root;
  const operation = mode === "toggle" ? listTextMarkState(root, selection, mark) === true ? "remove" : "set" : mode;
  return segments.reduce((next, segment) => {
    if (segment.start === segment.end) return next;
    const runs = updateTextMark(segment.runs, segment.start, segment.end, mark, operation);
    return updateListItem(next, segment.listId, segment.itemIndex, item => listItemWithTextRuns(item, plainTextFromRuns(runs), runs));
  }, root);
}

/** Replace sibling text in one history transaction, retaining the first item's style. */
export function replaceListText(root: ListBlock, selection: ListTextSelection, replacement: RichTextRun[]): { block: ListBlock; caret: ListTextPoint } | null {
  const segments = listTextSegments(root, selection);
  if (!segments?.length || !replacement.every(validRichTextRun)) return null;
  const first = segments[0], last = segments[segments.length - 1];
  // Nested subtrees have independent structural owners. Selecting/copying and
  // formatting them is safe; destructive editing needs a structural command.
  if (segments.some(segment => segment.listId !== first.listId || (typeof segment.item !== "string" && segment.item.children?.length))) return null;
  const list = findListBlock(root, first.listId);
  if (!list) return null;
  const runs = normaliseTextRuns([...sliceTextRuns(first.runs, 0, first.start), ...replacement, ...sliceTextRuns(last.runs, last.end, plainTextFromRuns(last.runs).length)]);
  const items = [...list.items];
  items.splice(first.itemIndex, last.itemIndex - first.itemIndex + 1, listItemWithTextRuns(first.item, plainTextFromRuns(runs), runs));
  return { block: replaceListItems(root, first.listId, items), caret: { listId: first.listId, itemIndex: first.itemIndex, offset: first.start + plainTextFromRuns(replacement).length } };
}

export function listTextEditor(node: Node | null): HTMLElement | null {
  return (node?.nodeType === 1 ? node as Element : node?.parentElement)?.closest<HTMLElement>(".rich-text-editor[data-list-context-id][data-list-item-index]") ?? null;
}

export function readListTextSelection(root: ListBlock, element: HTMLElement, native = element.ownerDocument.getSelection()): ListTextSelection | null {
  const anchorEditor = listTextEditor(native?.anchorNode ?? null), focusEditor = listTextEditor(native?.focusNode ?? null);
  if (!native || !anchorEditor || !focusEditor || anchorEditor === focusEditor || !element.contains(anchorEditor) || !element.contains(focusEditor)) return null;
  const point = (editor: HTMLElement, node: Node, offset: number): ListTextPoint | null => {
    const logical = richTextOffset(editor, node, offset);
    return logical === null ? null : { listId: editor.dataset.listContextId!, itemIndex: Number(editor.dataset.listItemIndex), offset: logical };
  };
  const anchor = point(anchorEditor, native.anchorNode!, native.anchorOffset), focus = point(focusEditor, native.focusNode!, native.focusOffset);
  if (!anchor || !focus) return null;
  const selection = { rootId: root.id, anchor, focus, baseline: JSON.stringify(root) };
  return listTextSegments(root, selection) ? selection : null;
}

export function restoreListTextSelection(element: HTMLElement, selection: Pick<ListTextSelection, "anchor" | "focus">) {
  const editors = [...element.querySelectorAll<HTMLElement>(".rich-text-editor[data-list-context-id][data-list-item-index]")];
  const resolve = (point: ListTextPoint) => {
    const editor = editors.find(candidate => candidate.dataset.listContextId === point.listId && candidate.dataset.listItemIndex === String(point.itemIndex));
    return editor ? { editor, ...richTextPointAtOffset(editor, point.offset) } : null;
  };
  const anchor = resolve(selection.anchor), focus = resolve(selection.focus);
  if (!anchor || !focus) return;
  anchor.editor.focus({ preventScroll: true });
  element.ownerDocument.getSelection()?.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset);
}

/** Native selection works within a host; this bridges only its item boundary. */
export function listTextArrowOffset(text: string, offset: number, direction: number): number {
  const boundaries = [0, ...[...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map(segment => segment.index + segment.segment.length)];
  return direction > 0 ? boundaries.find(boundary => boundary > offset) ?? text.length : boundaries.filter(boundary => boundary < offset).at(-1) ?? 0;
}

export function extendListTextSelection(element: HTMLElement, key: string, root: ListBlock): boolean {
  const native = element.ownerDocument.getSelection();
  const editor = listTextEditor(native?.focusNode ?? null), anchorEditor = listTextEditor(native?.anchorNode ?? null);
  if (!native?.focusNode || !native.anchorNode || !editor || !anchorEditor || !element.contains(editor) || !element.contains(anchorEditor)) return false;
  const editors = [...element.querySelectorAll<HTMLElement>(".rich-text-editor[data-list-context-id][data-list-item-index]")].filter(candidate => candidate.getClientRects().length > 0);
  const offset = richTextOffset(editor, native.focusNode, native.focusOffset);
  if (offset === null) return false;
  const forward = key === "ArrowRight" || key === "ArrowDown";
  const direction = forward ? 1 : -1;
  const length = richTextOffset(editor, editor, editor.childNodes.length) ?? 0;
  const horizontal = key === "ArrowLeft" || key === "ArrowRight";
  const field = findListBlock(root, editor.dataset.listContextId ?? "")?.items[Number(editor.dataset.listItemIndex)];
  if (field === undefined) return false;
  let target = editor, targetOffset = listTextArrowOffset(listItemText(field), offset, direction);
  if (horizontal) {
    if ((forward && offset === length) || (!forward && offset === 0)) {
      target = editors[editors.indexOf(editor) + direction];
      if (!target) return false;
      targetOffset = forward ? 0 : richTextOffset(target, target, target.childNodes.length) ?? 0;
    } else if (editor === anchorEditor) return false;
  } else {
    const caret = element.ownerDocument.createRange(); caret.setStart(native.focusNode, native.focusOffset); caret.collapse(true);
    const rect = caret.getBoundingClientRect();
    const content = element.ownerDocument.createRange(); content.selectNodeContents(editor);
    const lines = [...content.getClientRects()].filter(line => line.height > 0);
    const bounds = editor.getBoundingClientRect();
    const top = lines.length ? Math.min(...lines.map(line => line.top)) : bounds.top;
    const bottom = lines.length ? Math.max(...lines.map(line => line.bottom)) : bounds.bottom;
    const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || rect.height || 20;
    const atEdge = length === 0 || (forward ? rect.bottom >= bottom - Math.min(3, lineHeight / 4) : rect.top <= top + Math.min(3, lineHeight / 4));
    if (atEdge) {
      target = editors[editors.indexOf(editor) + direction];
      if (!target) return false;
    } else if (editor === anchorEditor) return false;
    const targetBounds = target.getBoundingClientRect();
    const x = Math.max(targetBounds.left + 1, Math.min(rect.left || bounds.left, targetBounds.right - 1));
    const y = atEdge ? forward ? targetBounds.top + lineHeight / 2 : targetBounds.bottom - lineHeight / 2 : rect.top + rect.height / 2 + direction * lineHeight;
    const doc = element.ownerDocument as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null; caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
    const point = doc.caretPositionFromPoint?.(x, y), range = point ? null : doc.caretRangeFromPoint?.(x, y);
    const node = point?.offsetNode ?? range?.startContainer, domOffset = point?.offset ?? range?.startOffset;
    const logical = node && domOffset !== undefined ? richTextOffset(target, node, domOffset) : null;
    if (logical === null) return false;
    targetOffset = logical;
  }
  const focus = richTextPointAtOffset(target, targetOffset);
  native.setBaseAndExtent(native.anchorNode, native.anchorOffset, focus.node, focus.offset);
  return true;
}
