import type { RichTextRun, TextMark } from "./model";

export function textToRuns(text: string): RichTextRun[] {
  return text ? [{ text }] : [];
}

export function plainTextFromRuns(runs: RichTextRun[]): string {
  return runs.map((run) => run.text).join("");
}

export function safeTextLink(value: string): string | null {
  const url = value.trim();
  if (/^(https?:\/\/|mailto:)/i.test(url) || url.startsWith("/") || url.startsWith("#")) return url;
  if (/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+(?:[/:?#][^\s]*)?$/i.test(url)) return `https://${url}`;
  return null;
}

function marksEqual(first: TextMark[] = [], second: TextMark[] = []) {
  if (first.length !== second.length) return false;
  return first.every((mark, index) => {
    const other = second[index];
    if (typeof mark === "string" || typeof other === "string") return mark === other;
    return mark.type === other.type && mark.url === other.url;
  });
}

export function normaliseTextRuns(runs: RichTextRun[]): RichTextRun[] {
  return runs.filter((run) => run.text).reduce<RichTextRun[]>((result, run) => {
    const previous = result[result.length - 1];
    if (previous && marksEqual(previous.marks, run.marks)) previous.text += run.text;
    else result.push({ text: run.text, marks: run.marks?.length ? [...run.marks] : undefined });
    return result;
  }, []);
}

function hasMark(marks: TextMark[] | undefined, mark: TextMark) {
  return (marks ?? []).some((candidate) => {
    if (typeof candidate === "string" || typeof mark === "string") return candidate === mark;
    return candidate.type === mark.type;
  });
}

export function linkAtTextRange(runs: RichTextRun[], start: number, end: number): string | null {
  let cursor = 0;
  const links = runs.flatMap((run) => {
    const runStart = cursor;
    cursor += run.text.length;
    if (runStart >= end || cursor <= start) return [];
    return (run.marks ?? []).filter((mark): mark is { type: "link"; url: string } => typeof mark !== "string" && mark.type === "link");
  });
  return links.length && links.every((link) => link.url === links[0].url) ? links[0].url : null;
}

export function updateTextMark(runs: RichTextRun[], start: number, end: number, mark: TextMark, mode: "toggle" | "set" | "remove" = "toggle"): RichTextRun[] {
  const source = normaliseTextRuns(runs);
  if (start >= end) return source;
  const selectedRuns = [] as RichTextRun[];
  let cursor = 0;
  for (const run of source) {
    const runStart = cursor;
    cursor += run.text.length;
    if (runStart < end && cursor > start) selectedRuns.push(run);
  }
  const removeMark = mode === "toggle" && typeof mark === "string" && selectedRuns.length > 0 && selectedRuns.every((run) => hasMark(run.marks, mark));

  const next: RichTextRun[] = [];
  cursor = 0;
  for (const run of source) {
    const runStart = cursor;
    const runEnd = cursor + run.text.length;
    cursor = runEnd;
    const boundaries = [runStart, Math.max(runStart, Math.min(runEnd, start)), Math.max(runStart, Math.min(runEnd, end)), runEnd]
      .filter((boundary, index, values) => values.indexOf(boundary) === index)
      .sort((first, second) => first - second);
    for (let index = 0; index < boundaries.length - 1; index += 1) {
      const segmentStart = boundaries[index];
      const segmentEnd = boundaries[index + 1];
      if (segmentStart === segmentEnd) continue;
      const selected = segmentStart >= start && segmentEnd <= end;
      let marks = [...(run.marks ?? [])];
      if (selected && typeof mark === "string") {
        marks = marks.filter((candidate) => candidate !== mark);
        if (!removeMark) marks.push(mark);
      }
      if (selected && typeof mark !== "string") {
        marks = marks.filter((candidate) => typeof candidate === "string" || candidate.type !== "link");
        if (mode !== "remove") marks.push(mark);
      }
      next.push({ text: run.text.slice(segmentStart - runStart, segmentEnd - runStart), marks: marks.length ? marks : undefined });
    }
  }
  return normaliseTextRuns(next);
}
