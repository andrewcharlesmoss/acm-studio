import type { RichTextRun, TextMark } from "../content/model";

export const CARET_FORMAT_EVENT = "studio-caret-format";
export type CaretFormatRequest = { offset: number; marks?: TextMark[]; result?: TextMark[] };
export type CaretFormatSnapshot = { offset: number; marks: TextMark[]; text: string; baseline: string };

/** Render consumers use an observation only while its field content and caret match. */
export function observedCaretFormats(snapshot: CaretFormatSnapshot | undefined, text: string, runs: RichTextRun[], offset: number) {
  return snapshot && snapshot.offset === offset && snapshot.text === text && snapshot.baseline === JSON.stringify(runs)
    ? snapshot.marks
    : undefined;
}

/** The owning editor retains transient typing formats; toolbars query or update them. */
export function caretFormats(editor: HTMLElement | undefined | null, offset: number, marks?: TextMark[]) {
  const request: CaretFormatRequest = { offset, marks };
  editor?.dispatchEvent(new CustomEvent(CARET_FORMAT_EVENT, { detail: request }));
  return request.result;
}
