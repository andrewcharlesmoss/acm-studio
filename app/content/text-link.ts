import type { RichTextRun, TextMark } from "./model";
import { marksAtCaret } from "./caret-formatting";
import { replaceRichTextRuns, sliceTextRuns } from "./math-runs";
import { isInteractiveTextMark, normaliseTextRuns, plainTextFromRuns, safeTextLink, updateTextMark } from "./rich-text";
import { validRichTextRun } from "./rich-text-validation";

export type LinkMark = Extract<TextMark, { type: "link" }>;
type TextRange = { start: number; end: number };
const linkMark = (marks: TextMark[] = []) => marks.find((mark): mark is LinkMark => typeof mark !== "string" && mark.type === "link");
const sameLink = (left: LinkMark | undefined, right: LinkMark | undefined) => Boolean(left && right && left.url === right.url && Boolean(left.opensInNewTab) === Boolean(right.opensInNewTab));
const validRange = (runs: RichTextRun[], range: TextRange) => Number.isInteger(range.start) && Number.isInteger(range.end) && range.start >= 0 && range.end >= range.start && range.end <= plainTextFromRuns(runs).length;
const isInlineObject = (run: RichTextRun) => Boolean(run.inline || run.marks?.some(mark => typeof mark !== "string" && ["footnote", "math", "inline-image"].includes(mark.type)));

/** A mixed selection must not be presented as one existing link. */
export function textLinkAtRange(runs: RichTextRun[], range: TextRange, pending?: TextMark[]): { mark: LinkMark; start: number; end: number } | null {
  if (!validRange(runs, range)) return null;
  let cursor = 0;
  const spans = runs.map(run => { const start = cursor; cursor += run.text.length; return { start, end: cursor, mark: isInlineObject(run) ? undefined : linkMark(run.marks) }; }).filter(span => span.start < span.end);
  let active = range.start === range.end ? linkMark(pending ?? marksAtCaret(runs, range.start)) : undefined;
  if (range.start !== range.end) {
    for (const span of spans) {
      if (span.start >= range.end || span.end <= range.start) continue;
      if (!span.mark || active && !sameLink(active, span.mark)) return null;
      active = span.mark;
    }
  }
  if (!active) return null;
  const at = spans.findIndex(span => span.start <= range.start && span.end >= range.start && sameLink(span.mark, active));
  if (at < 0) return null;
  let first = at, last = at;
  while (first > 0 && sameLink(spans[first - 1].mark, active)) first--;
  while (last + 1 < spans.length && sameLink(spans[last + 1].mark, active)) last++;
  return { mark: active, start: spans[first].start, end: spans[last].end };
}

/** Keep unchanged rich text intact; caret insertion links only the new span. */
export function applyTextLink(runs: RichTextRun[], range: TextRange, draft: { url: string; text: string; opensInNewTab: boolean }, pending?: TextMark[]): { runs: RichTextRun[]; start: number; end: number } | null {
  const url = safeTextLink(draft.url);
  // Zero-length legacy objects must survive until a dedicated migration handles them.
  if (!url || !validRange(runs, range) || !runs.every(run => validRichTextRun(run) && run.text.length > 0)) return null;
  const text = draft.text || url;
  const selected = sliceTextRuns(runs, range.start, range.end);
  const unchanged = range.start !== range.end && plainTextFromRuns(selected) === text;
  if (unchanged && selected.every(isInlineObject)) return null;
  const mark: LinkMark = { type: "link", url, opensInNewTab: draft.opensInNewTab || undefined };
  if (unchanged && sameLink(textLinkAtRange(runs, range)?.mark, mark)) return { runs, start: range.start, end: range.end };
  if (!unchanged && selected.some(isInlineObject)) return null;
  const marks = (range.start === range.end ? pending ?? marksAtCaret(runs, range.start) : selected[0]?.marks ?? []).filter(mark => !isInteractiveTextMark(mark) && (typeof mark === "string" || !["math", "inline-image"].includes(mark.type)));
  const source = unchanged ? runs : replaceRichTextRuns(runs, range.start, range.end, [{ text, marks }]);
  if (!source) return null;
  const end = range.start + text.length;
  let cursor = 0;
  const next = source.flatMap(run => {
    const start = cursor; cursor += run.text.length;
    if (isInlineObject(run) || start >= end || cursor <= range.start) return [run];
    return updateTextMark([run], Math.max(0, range.start - start), Math.min(run.text.length, end - start), mark, "set");
  });
  return { runs: normaliseTextRuns(next), start: range.start, end };
}

export function removeTextLink(runs: RichTextRun[], range: TextRange): RichTextRun[] | null {
  if (!validRange(runs, range) || range.start === range.end || !runs.every(run => validRichTextRun(run) && run.text.length > 0)) return null;
  return updateTextMark(runs, range.start, range.end, { type: "link", url: "" }, "remove");
}
