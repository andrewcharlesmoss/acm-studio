import type { RichTextRun, TextMark } from "./model";

export function textToRuns(text: string): RichTextRun[] {
  return text ? [{ text }] : [];
}

export function plainTextFromRuns(runs: RichTextRun[]): string {
  return runs.map((run) => run.text).join("");
}

/** Text within a link or action cannot contain another interactive descendant. */
export function isInteractiveTextMark(mark: TextMark): boolean {
  return typeof mark !== "string" && (mark.type === "link" || mark.type === "footnote");
}

export function withoutInteractiveTextMarks(runs: RichTextRun[]): RichTextRun[] {
  return normaliseTextRuns(runs.filter(run => run.inline?.type !== "footnote").map(run => ({ ...run, marks: run.marks?.filter(mark => !isInteractiveTextMark(mark)) })));
}

export function safeTextLink(value: string): string | null {
  const url = value.trim();
  if (/^(https?:\/\/|mailto:)/i.test(url) || url.startsWith("/") || url.startsWith("#")) return url;
  if (/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+(?:[/:?#][^\s]*)?$/i.test(url)) return `https://${url}`;
  return null;
}

export function safeImageSource(value: string, { allowBlob = false } = {}): string | null {
  const source = value.trim();
  if (/^https?:\/\//i.test(source) || (source.startsWith("/") && !source.startsWith("//"))) return source;
  if (allowBlob && /^blob:/i.test(source)) return source;
  return null;
}

function marksEqual(first: TextMark[] = [], second: TextMark[] = []) {
  if (first.length !== second.length) return false;
  return first.every((mark, index) => {
    const other = second[index];
    if (typeof mark === "string" || typeof other === "string") return mark === other;
    return mark.type === other.type && JSON.stringify(mark) === JSON.stringify(other);
  });
}

function sameMarkType(first: TextMark, second: TextMark) {
  if (typeof first === "string" || typeof second === "string") return first === second;
  return first.type === second.type;
}

export function normaliseTextRuns(runs: RichTextRun[]): RichTextRun[] {
  return runs.filter((run) => run.text).reduce<RichTextRun[]>((result, run) => {
    const previous = result[result.length - 1];
    if (previous && !previous.inline && !run.inline && marksEqual(previous.marks, run.marks)) previous.text += run.text;
    else result.push({ text: run.text, marks: run.marks?.length ? [...run.marks] : undefined, ...(run.inline ? { inline: { ...run.inline } } : {}) });
    return result;
  }, []);
}

function hasMark(marks: TextMark[] | undefined, mark: TextMark) {
  return (marks ?? []).some((candidate) => sameMarkType(candidate, mark));
}

export function linkAtTextRange(runs: RichTextRun[], start: number, end: number): Extract<TextMark, { type: "link" }> | null {
  let cursor = 0;
  const links = runs.flatMap((run) => {
    const runStart = cursor;
    cursor += run.text.length;
    if (runStart >= end || cursor <= start) return [];
    return (run.marks ?? []).filter((mark): mark is Extract<TextMark, { type: "link" }> => typeof mark !== "string" && mark.type === "link");
  });
  return links.length && links.every((link) => link.url === links[0].url && link.opensInNewTab === links[0].opensInNewTab) ? { ...links[0] } : null;
}

export function replaceTextRange(runs: RichTextRun[], start: number, end: number, replacement: string): RichTextRun[] {
  const source = normaliseTextRuns(runs);
  if (start > end) return source;
  if (start === end) {
    let cursor = 0;
    let inserted = false;
    const next: RichTextRun[] = [];
    for (const run of source) {
      const runEnd = cursor + run.text.length;
      if (!inserted && start >= cursor && start <= runEnd) {
        const offset = start - cursor;
        if (offset > 0) next.push({ ...run, text: run.text.slice(0, offset) });
        if (replacement) next.push({ text: replacement, marks: run.marks });
        if (offset < run.text.length) next.push({ ...run, text: run.text.slice(offset) });
        inserted = true;
      } else next.push(run);
      cursor = runEnd;
    }
    if (!inserted && replacement && start === 0 && source.length === 0) next.push({ text: replacement });
    return normaliseTextRuns(next);
  }
  const next: RichTextRun[] = [];
  let cursor = 0;
  let inserted = false;

  for (const run of source) {
    const runStart = cursor;
    const runEnd = cursor + run.text.length;
    cursor = runEnd;
    if (runEnd <= start || runStart >= end) {
      next.push({ ...run, marks: run.marks?.length ? [...run.marks] : undefined });
      continue;
    }
    if (runStart < start) next.push({ ...run, text: run.text.slice(0, start - runStart), marks: run.marks?.length ? [...run.marks] : undefined });
    if (!inserted && replacement) {
      next.push({ text: replacement, marks: run.marks?.length ? [...run.marks] : undefined });
      inserted = true;
    }
    if (runEnd > end) next.push({ ...run, text: run.text.slice(end - runStart), marks: run.marks?.length ? [...run.marks] : undefined });
  }

  if (!inserted && replacement) {
    const before = source.find((run, index) => source.slice(0, index + 1).reduce((length, item) => length + item.text.length, 0) >= start);
    next.push({ text: replacement, marks: before?.marks?.length ? [...before.marks] : undefined });
  }
  return normaliseTextRuns(next);
}

export function updateTextMark(runs: RichTextRun[], start: number, end: number, mark: TextMark, mode: "toggle" | "set" | "remove" = "toggle"): RichTextRun[] {
  const source = normaliseTextRuns(runs);
  if (start >= end) return source;
  const selectedRuns = [] as RichTextRun[];
  let cursor = 0;
  for (const run of source) {
    const runStart = cursor;
    cursor += run.text.length;
    if (!run.inline && runStart < end && cursor > start) selectedRuns.push(run);
  }
  const removeMark = mode === "toggle" && selectedRuns.length > 0 && selectedRuns.every((run) => hasMark(run.marks, mark));

  const next: RichTextRun[] = [];
  cursor = 0;
  for (const run of source) {
    const runStart = cursor;
    const runEnd = cursor + run.text.length;
    cursor = runEnd;
    if (run.inline) {
      next.push(run);
      continue;
    }
    const boundaries = [runStart, Math.max(runStart, Math.min(runEnd, start)), Math.max(runStart, Math.min(runEnd, end)), runEnd]
      .filter((boundary, index, values) => values.indexOf(boundary) === index)
      .sort((first, second) => first - second);
    for (let index = 0; index < boundaries.length - 1; index += 1) {
      const segmentStart = boundaries[index];
      const segmentEnd = boundaries[index + 1];
      if (segmentStart === segmentEnd) continue;
      const selected = segmentStart >= start && segmentEnd <= end;
      let marks = [...(run.marks ?? [])];
      if (selected) {
        marks = marks.filter((candidate) => !sameMarkType(candidate, mark));
        if (!removeMark && mode !== "remove") marks.push(mark);
      }
      next.push({ text: run.text.slice(segmentStart - runStart, segmentEnd - runStart), marks: marks.length ? marks : undefined });
    }
  }
  return normaliseTextRuns(next);
}
