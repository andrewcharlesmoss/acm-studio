import type { RichTextRun, TextMark } from "./model";
import { normaliseTextRuns, plainTextFromRuns, textToRuns } from "./rich-text";
import { safeTextLink } from "./rich-text";
import { validRichTextMark } from "./rich-text-validation";
import { formatCaretInsertion } from "./caret-formatting";

const codeMarks = new Set(["bold", "italic", "strikethrough", "inline-code", "subscript", "superscript", "keyboard"]);
const codeObjectMarks = new Set(["link", "highlight", "language"]);

export function containsCodeRuns(value: unknown): boolean {
  const seen = new WeakSet<object>();
  const visit = (candidate: unknown): boolean => {
    if (!candidate || typeof candidate !== "object") return false;
    if (seen.has(candidate)) return false;
    seen.add(candidate);
    if (Array.isArray(candidate)) return candidate.some(visit);
    const record = candidate as Record<string, unknown>;
    if (record.type === "code" && record.runs !== undefined) return true;
    return Object.values(record).some(visit);
  };
  return visit(value);
}

/** Detect the Code-only font-family extension inside any supported carrier. */
export function containsCodeMonospaceFont(value: unknown): boolean {
  const seen = new WeakSet<object>();
  const visit = (candidate: unknown): boolean => {
    if (!candidate || typeof candidate !== "object") return false;
    if (seen.has(candidate)) return false;
    seen.add(candidate);
    if (Array.isArray(candidate)) return candidate.some(visit);
    const record = candidate as Record<string, unknown>;
    if (record.type === "code" && record.visualStyle && typeof record.visualStyle === "object") {
      const visualStyle = record.visualStyle as Record<string, unknown>;
      if (visualStyle.fontFamily === "monospace") return true;
      const responsive = visualStyle.responsive;
      if (responsive && typeof responsive === "object" && Object.values(responsive as Record<string, unknown>).some(override =>
        !!override && typeof override === "object" && (override as Record<string, unknown>).fontFamily === "monospace")) return true;
    }
    return Object.values(record).some(visit);
  };
  return visit(value);
}

export type CodeEditSelection = { start: number; end: number; inputType?: string };
export type PendingCodeFormat = { offset: number; marks: TextMark[] };

export function validCodeRuns(code: unknown, runs: unknown): runs is RichTextRun[] | undefined {
  if (runs === undefined) return true;
  if (typeof code !== "string" || !Array.isArray(runs)) return false;
  const candidateRuns: unknown[] = runs;
  return candidateRuns.length > 0 && candidateRuns.every((candidate): candidate is RichTextRun => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
    const run = candidate as Record<string, unknown>;
    return Object.keys(run).every(key => key === "text" || key === "marks")
    && typeof run.text === "string" && run.text.length > 0
    && run.inline === undefined
    && (run.marks === undefined || Array.isArray(run.marks) && run.marks.every((candidateMark: unknown) => {
      const mark = candidateMark as TextMark;
      if (typeof mark === "string") return codeMarks.has(mark);
      if (!mark || typeof mark !== "object" || Array.isArray(mark) || !validRichTextMark(mark)) return false;
      const record = mark as Record<string, unknown>;
      if (typeof record.type !== "string" || !codeObjectMarks.has(record.type)) return false;
      const allowedKeys = record.type === "link" ? ["type", "url", "opensInNewTab"]
        : record.type === "highlight" ? ["type", "textColor", "backgroundColor"]
          : ["type", "language", "direction"];
      if (Object.keys(record).some(key => !allowedKeys.includes(key))) return false;
      if (record.type === "link") {
        const link = mark as Extract<TextMark, { type: "link" }>;
        return typeof link.url === "string" && safeTextLink(link.url) === link.url;
      }
      return true;
    }));
  }) && plainTextFromRuns(candidateRuns as RichTextRun[]) === code;
}

function marksAt(runs: RichTextRun[], offset: number): TextMark[] {
  let position = 0;
  for (const run of runs) {
    const end = position + run.text.length;
    if (offset < end || offset === end && end === plainTextFromRuns(runs).length) return run.marks ?? [];
    position = end;
  }
  return runs.at(-1)?.marks ?? [];
}

/** Preserve marks outside an edit and inherit the replaced/caret marks for inserted text. */
export function reconcileCodeRuns(previousCode: string, previousRuns: RichTextRun[] | undefined, nextCode: string, edit?: CodeEditSelection): RichTextRun[] | undefined {
  const source = previousRuns?.length ? previousRuns : textToRuns(previousCode);
  if (!source.some(run => run.marks?.length)) return undefined;
  let prefix = 0;
  while (prefix < previousCode.length && prefix < nextCode.length && previousCode[prefix] === nextCode[prefix]) prefix++;
  let suffix = 0;
  while (suffix < previousCode.length - prefix && suffix < nextCode.length - prefix
    && previousCode[previousCode.length - 1 - suffix] === nextCode[nextCode.length - 1 - suffix]) suffix++;
  let editStart = prefix;
  let oldMiddleEnd = previousCode.length - suffix;
  if (edit && Number.isInteger(edit.start) && Number.isInteger(edit.end) && edit.start >= 0 && edit.end >= edit.start && edit.end <= previousCode.length) {
    editStart = edit.start;
    oldMiddleEnd = edit.end;
    if (edit.start === edit.end && edit.inputType?.startsWith("deleteContent") && nextCode.length < previousCode.length) {
      const removed = previousCode.length - nextCode.length;
      if (edit.inputType === "deleteContentBackward") editStart = Math.max(0, edit.start - removed);
      else if (edit.inputType === "deleteContentForward") oldMiddleEnd = Math.min(previousCode.length, edit.end + removed);
    }
    const removedSuffixLength = previousCode.length - oldMiddleEnd;
    if (nextCode.slice(0, editStart) !== previousCode.slice(0, editStart)
      || nextCode.slice(nextCode.length - removedSuffixLength) !== previousCode.slice(oldMiddleEnd)) {
      editStart = prefix;
      oldMiddleEnd = previousCode.length - suffix;
    }
  }
  const newMiddleEnd = nextCode.length - (previousCode.length - oldMiddleEnd);
  const slice = (from: number, to: number) => {
    const output: RichTextRun[] = [];
    let offset = 0;
    for (const run of source) {
      const start = offset;
      const end = start + run.text.length;
      offset = end;
      const left = Math.max(start, from);
      const right = Math.min(end, to);
      if (right > left) output.push({ ...run, text: run.text.slice(left - start, right - start) });
    }
    return output;
  };
  const inherited = marksAt(source, Math.min(editStart, Math.max(0, previousCode.length - 1)));
  const result = normaliseTextRuns([
    ...slice(0, editStart),
    ...(newMiddleEnd > editStart ? [{ text: nextCode.slice(editStart, newMiddleEnd), marks: inherited }] : []),
    ...slice(oldMiddleEnd, previousCode.length),
  ]);
  return plainTextFromRuns(result) === nextCode ? result : textToRuns(nextCode);
}

/** Apply captured caret formats only to text inserted at their unchanged caret. */
export function applyCodeEdit(previousCode: string, previousRuns: RichTextRun[] | undefined, nextCode: string, edit: CodeEditSelection, pending?: PendingCodeFormat) {
  let runs = reconcileCodeRuns(previousCode, previousRuns, nextCode, edit);
  let nextPending: PendingCodeFormat | undefined;
  if (pending && edit.start === edit.end && edit.start === pending.offset && edit.inputType?.startsWith("insert")) {
    const formatted = formatCaretInsertion(previousCode, runs ?? textToRuns(nextCode), pending.offset, pending.marks);
    if (formatted) {
      runs = formatted.runs;
      nextPending = { offset: formatted.offset, marks: pending.marks };
    }
  }
  return { runs, pending: nextPending };
}
