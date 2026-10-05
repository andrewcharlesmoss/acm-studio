import type { InlineMath, RichTextRun, TextMark } from "./model";
import { normaliseTextRuns, plainTextFromRuns } from "./rich-text";
import { validRichTextRun } from "./rich-text-validation";

export const mathSource = (math: InlineMath | Extract<TextMark, { type: "math" }>) => math.latex ?? math.mathml ?? "";
export const mathRun = (math: InlineMath): RichTextRun => ({ text: "\uFFFC", inline: math });
export function validMathRun(run: unknown): run is RichTextRun & { inline: InlineMath } {
  return validRichTextRun(run) && run.inline?.type === "math";
}
export function sliceTextRuns(runs: RichTextRun[], start: number, end: number): RichTextRun[] {
  let cursor = 0;
  return normaliseTextRuns(runs.flatMap(run => {
    const from = Math.max(0, start - cursor);
    const to = Math.min(run.text.length, end - cursor);
    cursor += run.text.length;
    return to > from ? [{ ...run, text: run.text.slice(from, to) }] : [];
  }));
}
/** Replacement is structural: generated equation markup never enters the model. */
export function replaceRichTextRuns(runs: RichTextRun[], start: number, end: number, replacement: RichTextRun[]): RichTextRun[] | null {
  const length = plainTextFromRuns(runs).length;
  if (![start, end].every(Number.isInteger) || start < 0 || end < start || end > length || ![...runs, ...replacement].every(validRichTextRun)) return null;
  return normaliseTextRuns([...sliceTextRuns(runs, 0, start), ...replacement, ...sliceTextRuns(runs, end, length)]);
}
export function mathAtRange(runs: RichTextRun[], start: number, end: number) {
  let offset = 0;
  for (const run of runs) {
    if (validMathRun(run) && offset === start && (end === start || end === start + 1)) return { math: run.inline, start, end: start + 1 };
    offset += run.text.length;
  }
  return null;
}
/** Preserve selected formatting until syntax is deliberately changed. */
export function createMathFromRange(runs: RichTextRun[], start: number, end: number): RichTextRun[] | null {
  const sourceRuns = sliceTextRuns(runs, start, end);
  if (sourceRuns.some(run => run.inline || run.marks?.some(mark => typeof mark !== "string" && ["math", "footnote", "link", "inline-image"].includes(mark.type)))) return null;
  const latex = plainTextFromRuns(sourceRuns);
  return replaceRichTextRuns(runs, start, end, [mathRun({ type: "math", latex, alternativeText: "", ...(sourceRuns.length ? { sourceRuns } : {}) })]);
}
export function restoreMathSource(runs: RichTextRun[], start: number, end: number): { runs: RichTextRun[]; end: number } | null {
  const active = mathAtRange(runs, start, end);
  if (!active) return null;
  const replacement = active.math.sourceRuns ?? (mathSource(active.math) ? [{ text: mathSource(active.math) }] : []);
  const next = replaceRichTextRuns(runs, active.start, active.end, replacement);
  return next ? { runs: next, end: start + plainTextFromRuns(replacement).length } : null;
}
/** Legacy marks are retained losslessly; conversion back reveals authored prose. */
export function legacyMathAtRange(runs: RichTextRun[], start: number, end: number) {
  let offset = 0;
  const ranges = runs.map(run => { const from = offset; offset += run.text.length; return { run, start: from, end: offset }; });
  if (![start, end].every(Number.isInteger) || start < 0 || end < start) return null;
  const hit = ranges.find(({ run, start: from, end: to }) => !run.inline && start >= from && start < to && run.marks?.some(mark => typeof mark !== "string" && mark.type === "math"));
  if (!hit) return null;
  const math = hit.run.marks!.find((mark): mark is Extract<TextMark, { type: "math" }> => typeof mark !== "string" && mark.type === "math")!;
  let first = ranges.indexOf(hit), last = first;
  const same = (run: RichTextRun) => !run.inline && run.marks?.some(mark => typeof mark !== "string" && mark.type === "math" && JSON.stringify(mark) === JSON.stringify(math));
  while (first > 0 && same(ranges[first - 1].run)) first--;
  while (last + 1 < ranges.length && same(ranges[last + 1].run)) last++;
  if (end > ranges[last].end) return null;
  const selected = ranges.slice(first, last + 1).map(({ run }) => ({ ...run, marks: run.marks?.filter(mark => typeof mark === "string" || mark.type !== "math") }));
  return { math, start: ranges[first].start, end: ranges[last].end, sourceRuns: selected };
}

export function mathObjectFromData(data: string | undefined): InlineMath | null {
  if (!data || data.length > 150000) return null;
  try { const math = JSON.parse(data); return validMathRun({ text: "\uFFFC", inline: math }) ? math : null; } catch { return null; }
}

export function legacyMathFromData(data: string | undefined): RichTextRun[] | null {
  if (!data) return null;
  try {
    const parsed = JSON.parse(data), runs = Array.isArray(parsed) ? parsed : [parsed];
    return runs.length > 0 && runs.every(run => validRichTextRun(run) && !run.inline && run.marks?.some((mark: TextMark) => typeof mark !== "string" && mark.type === "math")) ? runs : null;
  } catch { return null; }
}
/** A format boundary must not duplicate one legacy equation visually. */
export function mathRenderEntries(runs: RichTextRun[]) {
  const entries: { run: RichTextRun; index: number; legacyRuns?: RichTextRun[] }[] = [];
  const equation = (run: RichTextRun) => run.inline ? undefined : run.marks?.find(mark => typeof mark !== "string" && mark.type === "math");
  runs.forEach((run, index) => {
    const mark = equation(run), last = entries.at(-1);
    if (mark && last?.legacyRuns && JSON.stringify(equation(last.run)) === JSON.stringify(mark)) last.legacyRuns.push(run);
    else entries.push({ run, index, ...(mark ? { legacyRuns: [run] } : {}) });
  });
  return entries;
}
