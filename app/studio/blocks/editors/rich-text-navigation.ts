type VerticalDirection = "ArrowUp" | "ArrowDown";

type CaretRect = Pick<DOMRect, "top" | "bottom" | "left" | "height">;
type LineRect = Pick<DOMRect, "top" | "bottom" | "height">;
type EditorRect = Pick<DOMRect, "top" | "bottom">;

/** Empty contenteditable blocks have no measurable caret rectangle. */
export function isCaretAtVerticalEditorEdge(
  direction: VerticalDirection,
  caretRect: CaretRect,
  lineRects: LineRect[],
  editorRect: EditorRect,
  isEmpty: boolean,
  lineHeight: number,
) {
  if (isEmpty) return true;
  if (!Number.isFinite(caretRect.height) || caretRect.height <= 0) return false;

  const visibleLines = lineRects.filter(rect => rect.height > 0);
  const firstLineTop = visibleLines.length ? Math.min(...visibleLines.map(rect => rect.top)) : editorRect.top;
  const lastLineBottom = visibleLines.length ? Math.max(...visibleLines.map(rect => rect.bottom)) : editorRect.bottom;
  const edgeTolerance = Math.max(3, Math.min(caretRect.height, lineHeight * 0.7));
  return direction === "ArrowUp"
    ? caretRect.top <= firstLineTop + edgeTolerance
    : caretRect.bottom >= lastLineBottom - edgeTolerance;
}

/** Preserve the caret's natural direction when a browser cannot hit-test a blank block. */
export function verticalTargetFallbackOffset(direction: VerticalDirection, targetLength: number) {
  return direction === "ArrowUp" ? targetLength : 0;
}

/** One reading order for text fields and leaf blocks; layout wrappers are not stops. */
export function writingFlowTargets(root: ParentNode): HTMLElement[] {
  const selector = '.rich-text-editor, [data-studio-block-anchor-id], [data-studio-nested-block-id]';
  return [...root.querySelectorAll<HTMLElement>(selector)].filter(target => {
    if (!target.getClientRects().length) return false;
    if (target.classList.contains('rich-text-editor')) return target.isContentEditable;
    return !target.querySelector(selector);
  });
}

export function focusWritingFlowFrame(target: HTMLElement) {
  if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
  target.ownerDocument.getSelection()?.removeAllRanges();
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'nearest' });
}
