import type { RichTextRun } from "../content/model";
import { validRichTextRun } from "../content/rich-text-validation";

/** Native paste may flatten protected objects. Decode their typed source instead. */
export function readInlineObjectClipboardRuns(html: string, readRuns: (root: HTMLElement) => RichTextRun[]): { handled: false } | { handled: true; runs: RichTextRun[] } | { handled: true; error: string } {
  if (!/data-(?:math-object|math-legacy|inline-math|image-object|inline-image)\s*=/i.test(html)) return { handled: false };
  const error = "This inline clipboard content could not be read. The current text has been retained.";
  if (html.length > 1000000) return { handled: true, error };
  try {
    // Parsing is detached. Only validated typed runs reach the live editor.
    const body = new DOMParser().parseFromString(html, "text/html").body;
    if (!body.querySelector("[data-math-object], [data-math-legacy], [data-inline-math], [data-image-object], [data-inline-image]")) return { handled: false };
    if (body.querySelector("script, style, iframe, object, embed")) return { handled: true, error };
    const runs = readRuns(body);
    if (!runs.every(validRichTextRun) || !runs.some(run => run.inline?.type === "math" || run.inline?.type === "image" || run.marks?.some(mark => typeof mark !== "string" && (mark.type === "math" || mark.type === "inline-image")))) return { handled: true, error };
    if (runs.some(run => run.inline?.type === "footnote" || run.marks?.some(mark => typeof mark !== "string" && mark.type === "footnote"))) return { handled: true, error: "Copy inline objects and Footnotes together with the block Copy action to retain their note content." };
    return { handled: true, runs };
  } catch { return { handled: true, error }; }
}

/** Compatibility API for existing editor and List paste consumers. */
export const readMathClipboardRuns = readInlineObjectClipboardRuns;
