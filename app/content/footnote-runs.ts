import { validRichTextRun } from "./rich-text-validation.ts";
import type { RichTextRun, TextMark } from "./model";
import { normaliseTextRuns, plainTextFromRuns } from "./rich-text.ts";

export const INLINE_OBJECT_CHARACTER = "\uFFFC";

export function validFootnoteId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 160;
}

/** Existing IDs are retained by migration; a document operation owns new IDs. */
export function footnoteReferenceRun(id: string): RichTextRun {
  return { text: INLINE_OBJECT_CHARACTER, inline: { type: "footnote", id } };
}

export function validFootnoteReference(run: RichTextRun): run is RichTextRun & { inline: { type: "footnote"; id: string } } {
  return run.text === INLINE_OBJECT_CHARACTER && run.inline?.type === "footnote"
    && validFootnoteId(run.inline.id)
    && Object.keys(run.inline).every(key => key === "type" || key === "id")
    && !run.marks?.length;
}

/** Gutenberg inserts the reference at selection.end, retaining selected text. */
export function insertFootnoteReference(runs: RichTextRun[], offset: number, id: string): RichTextRun[] | null {
  if (runs.some(run => run.inline && !validRichTextRun(run))) return null;
  const source = normaliseTextRuns(runs);
  const reference = footnoteReferenceRun(id);
  if (!validFootnoteReference(reference) || !Number.isInteger(offset) || offset < 0 || offset > plainTextFromRuns(source).length) return null;
  let cursor = 0;
  let inserted = false;
  const next: RichTextRun[] = [];
  for (const run of source) {
    const end = cursor + run.text.length;
    if (!inserted && offset >= cursor && offset <= end) {
      const within = offset - cursor;
      if (within > 0) next.push({ ...run, text: run.text.slice(0, within) });
      next.push(reference);
      if (within < run.text.length) next.push({ ...run, text: run.text.slice(within) });
      inserted = true;
    } else next.push(run);
    cursor = end;
  }
  if (!inserted) next.push(reference);
  return normaliseTextRuns(next);
}

/** An active object occupies its own slot; an adjacent text caret is not active. */
export function footnoteReferenceAtRange(runs: RichTextRun[], start: number, end: number): { id: string; offset: number } | null {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > plainTextFromRuns(runs).length) return null;
  let cursor = 0;
  for (const run of runs) {
    const offset = cursor;
    cursor += run.text.length;
    if (run.inline && validFootnoteReference(run) && offset === start && (start === end || end === cursor)) return { id: (run.inline as { type: "footnote"; id: string }).id, offset };
  }
  return null;
}

function legacyReferences(marks: TextMark[] | undefined) {
  return [...new Set((marks ?? []).filter((mark): mark is Extract<TextMark, { type: "footnote" }> => typeof mark !== "string" && mark.type === "footnote").map(mark => mark.id))];
}

/**
 * Preserve legacy visible text and its non-reference formats. Contiguous runs
 * carrying one reference become one object after that text, even when Bold or
 * Highlight split the original marked range. Document reconciliation handles
 * repeated IDs across distinct occurrences and missing note content.
 */
export function migrateLegacyFootnoteRuns(runs: RichTextRun[]): RichTextRun[] {
  const next: RichTextRun[] = [];
  const pendingIds = new Set<string>();
  function flushAbsentFrom(ids: string[]) {
    for (const id of pendingIds) if (!ids.includes(id)) {
      next.push(footnoteReferenceRun(id));
      pendingIds.delete(id);
    }
  }
  for (const run of runs) {
    if (!run.text) continue;
    const ids = run.inline ? [] : legacyReferences(run.marks);
    flushAbsentFrom(ids);
    if (run.inline) {
      next.push(run);
      continue;
    }
    const marks = run.marks?.filter(mark => typeof mark === "string" || mark.type !== "footnote");
    next.push({ text: run.text, marks: marks?.length ? marks : undefined });
    for (const id of ids) pendingIds.add(id);
  }
  flushAbsentFrom([]);
  return normaliseTextRuns(next);
}

/** The logical placeholder is never visible article prose or a search word. */
export function readableTextFromFootnoteRuns(runs: RichTextRun[]): string {
  return runs.map(run => run.inline?.type === "math" ? run.inline.alternativeText || run.inline.latex || "" : run.inline ? "" : run.text).join("");
}

/** Keep editing offsets logical while excluding references from prose metadata. */
export function readableRichText(text: string | undefined, runs?: RichTextRun[]): string {
  return runs?.length ? readableTextFromFootnoteRuns(runs) : text ?? "";
}
