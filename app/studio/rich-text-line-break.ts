import type { RichTextRun, TextMark } from "../content/model";
import { marksAtCaret } from "../content/caret-formatting";
import { replaceRichTextRuns } from "../content/math-runs";

// Authored breaks belong to content. The terminal filler only gives the
// browser somewhere to display a caret on an otherwise empty final line.
export const AUTHORED_LINE_BREAK_HTML = '<br data-studio-line-break="true">';
export const LINE_BREAK_FILLER_HTML = '<br data-studio-line-break-filler="true">';

export function isRichTextLineBreakFiller(element: HTMLElement): boolean {
  return element.tagName === "BR" && element.dataset.studioLineBreakFiller === "true";
}

export function insertRichTextLineBreak(runs: RichTextRun[], start: number, end: number, pendingMarks?: TextMark[]): RichTextRun[] | null {
  const marks = pendingMarks ?? marksAtCaret(runs, start);
  return replaceRichTextRuns(runs, start, end, [{ text: "\n", marks: marks.length ? marks : undefined }]);
}
