import type { RichTextRun, TextMark } from "./model";
import { marksAtCaret } from "./caret-formatting.ts";

export type LanguageMark = Extract<TextMark, { type: "language" }>;
export const historicalLanguageCode = (value: string) => /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value);
/** Preserve historical tags; expanded syntax is bounded, not a registry lookup. */
export const validLanguageCode = (value: unknown): value is string => typeof value === "string" && (historicalLanguageCode(value) || value.length <= 255 && (value === "" || /^(?:[a-z]{2,8}(?:-[a-z0-9]{1,8})*|[xi](?:-[a-z0-9]{1,8})+)$/i.test(value)));
const languageMark = (marks: TextMark[] = []) => marks.find((mark): mark is LanguageMark => typeof mark !== "string" && mark.type === "language");
const sameLanguage = (left: LanguageMark | undefined, right: LanguageMark | undefined) => Boolean(left && right && left.language === right.language && left.direction === right.direction);

/** A selected range is active only when every logical slot has equal attributes. */
export function languageAtRange(runs: RichTextRun[], start: number, end: number, pending?: TextMark[]): LanguageMark | undefined {
  const length = runs.reduce((sum, run) => sum + run.text.length, 0);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > length) return;
  if (start === end) return languageMark(pending ?? marksAtCaret(runs, start));
  let cursor = 0, active: LanguageMark | undefined;
  for (const run of runs) {
    const left = cursor; cursor += run.text.length;
    if (left >= end || cursor <= start) continue;
    const mark = run.inline ? undefined : languageMark(run.marks);
    if (!mark || active && !sameLanguage(active, mark)) return;
    active = mark;
  }
  return active;
}

/** Remove the contiguous equal Language format, even across other mark boundaries. */
export function languageRangeAtCaret(runs: RichTextRun[], caret: number, active: LanguageMark) {
  let cursor = 0;
  const spans = runs.map(run => { const start = cursor; cursor += run.text.length; return { start, end: cursor, mark: run.inline ? undefined : languageMark(run.marks) }; });
  const at = spans.findIndex(span => span.start <= caret && span.end >= caret && sameLanguage(span.mark, active));
  if (at < 0) return null;
  let first = at, last = at;
  while (first > 0 && sameLanguage(spans[first - 1].mark, active)) first--;
  while (last < spans.length - 1 && sameLanguage(spans[last + 1].mark, active)) last++;
  return { start: spans[first].start, end: spans[last].end };
}
