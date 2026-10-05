import type { RichTextRun, TextMark } from "./model";
import { normaliseTextRuns, plainTextFromRuns } from "./rich-text.ts";

export function marksAtCaret(runs: RichTextRun[], offset: number): TextMark[] {
  const at = (position: number) => {
    let end = 0;
    for (const run of runs) {
      end += run.text.length;
      if (position >= 0 && position < end) return run.inline ? [] : run.marks ?? [];
    }
    return [];
  };
  const before = at(offset - 1), after = at(offset);
  // Gutenberg defaults to outside a format boundary; equal counts favour right.
  return [...(before.length < after.length ? before : after)];
}

export function changeCaretMark(marks: TextMark[], mark: TextMark, mode: "toggle" | "set" | "remove" = "toggle") {
  const sameType = (candidate: TextMark) => typeof candidate === "string" || typeof mark === "string" ? candidate === mark : candidate.type === mark.type;
  const remove = mode === "remove" || mode === "toggle" && marks.some(sameType);
  const next = marks.filter(candidate => !sameType(candidate));
  return remove ? next : [...next, mark];
}

/** Pending formats apply only to insertion at their captured caret. */
export function formatCaretInsertion(previousText: string, nextRuns: RichTextRun[], offset: number, marks: TextMark[]) {
  const text = plainTextFromRuns(nextRuns);
  const added = text.length - previousText.length;
  if (added <= 0 || text.slice(0, offset) !== previousText.slice(0, offset) || text.slice(offset + added) !== previousText.slice(offset)) return null;
  let cursor = 0;
  const runs: RichTextRun[] = [];
  for (const run of nextRuns) {
    const from = cursor; cursor += run.text.length;
    if (run.inline) {
      runs.push(run);
      continue;
    }
    const boundaries = [...new Set([from, Math.max(from, Math.min(cursor, offset)), Math.max(from, Math.min(cursor, offset + added)), cursor])].sort((a, b) => a - b);
    for (let index = 0; index < boundaries.length - 1; index++) {
      const left = boundaries[index], right = boundaries[index + 1];
      runs.push({ text: run.text.slice(left - from, right - from), marks: left >= offset && right <= offset + added ? marks : run.marks });
    }
  }
  return { runs: normaliseTextRuns(runs), offset: offset + added, text };
}
