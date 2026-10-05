import type { InlineImage, RichTextRun } from "./model";
import { validRichTextRun } from "./rich-text-validation";
import { replaceRichTextRuns } from "./math-runs";
import { safeImageSource } from "./rich-text";

export const inlineImageRun = (image: InlineImage): RichTextRun => ({ text: "\uFFFC", inline: image });
export function validInlineImageRun(run: unknown): run is RichTextRun & { inline: InlineImage } {
  return validRichTextRun(run) && run.inline?.type === "image";
}

/** Only an exactly selected object offers Replace image; adjacent carets do not. */
export function inlineImageAtRange(runs: RichTextRun[], start: number, end: number) {
  if (!Number.isInteger(start) || end !== start + 1) return null;
  let offset = 0;
  for (const run of runs) {
    if (offset === start && validInlineImageRun(run)) return { image: run.inline, start, end };
    offset += run.text.length;
  }
  return null;
}

export function insertInlineImage(runs: RichTextRun[], start: number, end: number, image: InlineImage): RichTextRun[] | null {
  return replaceRichTextRuns(runs, start, end, [inlineImageRun(image)]);
}

export function inlineImageFromData(data: string | undefined): InlineImage | null {
  // JSON escapes can use six characters for each bounded descriptor character.
  if (!data || data.length > 80000) return null;
  try {
    const image = JSON.parse(data);
    return validInlineImageRun(inlineImageRun(image)) ? image : null;
  } catch { return null; }
}

const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** The descriptor survives missing files; resolved blob URLs are presentation only. */
export function inlineImageHtml(image: InlineImage, mediaUrls: Record<string, string> = {}, editing = false): string {
  if (!validInlineImageRun(inlineImageRun(image))) return "";
  const resolved = image.mediaId && Object.hasOwn(mediaUrls, image.mediaId) ? mediaUrls[image.mediaId] : null;
  const managed = typeof resolved === "string" ? safeImageSource(resolved, { allowBlob: true }) : null;
  const src = managed ?? safeImageSource(image.src ?? "");
  const attributes = `class="inline-image-object"${editing ? ' contenteditable="false" draggable="false"' : ""} data-image-object="${escape(JSON.stringify(image))}"`;
  if (!src) return `<span ${attributes} role="img" aria-label="${escape(image.alt || "Image unavailable")}">${escape(image.alt || "Image unavailable")}</span>`;
  return `<img ${attributes} src="${escape(src)}" alt="${escape(image.alt)}"${image.width === undefined ? "" : ` width="${image.width}"`} style="max-width:100%;height:auto;vertical-align:middle" />`;
}
