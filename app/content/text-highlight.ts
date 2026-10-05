import type { RichTextRun, TextMark } from "./model";
import { normaliseTextRuns } from "./rich-text";
import { marksAtCaret } from "./caret-formatting";

export type HighlightChannel = "textColor" | "backgroundColor";
type HighlightMark = Extract<TextMark, { type: "highlight" }>;
const highlightMark = (run: RichTextRun) => run.marks?.find((mark): mark is HighlightMark => typeof mark !== "string" && mark.type === "highlight");

export function highlightRangeAtCaret(runs: RichTextRun[], caret: number) {
  let offset = 0;
  const spans = runs.map(run => { const start = offset; offset += run.text.length; return { start, end: offset, mark: highlightMark(run) }; });
  const active = marksAtCaret(runs, caret).find(mark => typeof mark !== "string" && mark.type === "highlight");
  if (!active) return null;
  const signature = JSON.stringify(active);
  const at = spans.findIndex(span => span.start <= caret && span.end >= caret && JSON.stringify(span.mark) === signature);
  if (at < 0 || !spans[at].mark) return null;
  let first = at, last = at;
  while (first > 0 && JSON.stringify(spans[first - 1].mark) === signature) first--;
  while (last < spans.length - 1 && JSON.stringify(spans[last + 1].mark) === signature) last++;
  return { start: spans[first].start, end: spans[last].end };
}

export function highlightColoursAtRange(runs: RichTextRun[], start: number, end: number) {
  let offset = 0;
  const selected = runs.filter(run => {
    const from = offset;
    offset += run.text.length;
    return !run.inline && from < end && offset > start;
  });
  const channel = (key: HighlightChannel) => {
    const values = selected.map(run => highlightMark(run)?.[key]);
    const mixed = values.some(value => value !== values[0]);
    return { value: mixed ? undefined : values[0], mixed, hasColour: values.some(Boolean) };
  };
  return { textColor: channel("textColor"), backgroundColor: channel("backgroundColor") };
}

/** Change one colour across the captured range, preserving each run's other marks. */
export function updateHighlightColour(runs: RichTextRun[], start: number, end: number, channel: HighlightChannel, value?: string): RichTextRun[] {
  if (start >= end) return normaliseTextRuns(runs);
  let offset = 0;
  const next: RichTextRun[] = [];
  for (const run of runs) {
    const from = offset;
    const to = from + run.text.length;
    offset = to;
    if (run.inline) {
      next.push(run);
      continue;
    }
    const boundaries = [...new Set([from, Math.max(from, Math.min(to, start)), Math.max(from, Math.min(to, end)), to])].sort((a, b) => a - b);
    for (let index = 0; index < boundaries.length - 1; index += 1) {
      const left = boundaries[index];
      const right = boundaries[index + 1];
      let marks = run.marks;
      if (left >= start && right <= end) {
        const highlight: HighlightMark = { type: "highlight", ...highlightMark(run) };
        if (value) highlight[channel] = value;
        else delete highlight[channel];
        marks = (marks ?? []).filter(mark => typeof mark === "string" || mark.type !== "highlight");
        if (highlight.textColor || highlight.backgroundColor) marks = [...marks, highlight];
      }
      next.push({ text: run.text.slice(left - from, right - from), marks: marks?.length ? marks : undefined });
    }
  }
  return normaliseTextRuns(next);
}
