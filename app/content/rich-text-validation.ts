import { validLanguageCode } from "./language-runs.ts";
import type { RichTextRun } from "./model";
import { safeMathMLMarkup } from "./mathml.ts";
import { safeImageSource } from "./rich-text.ts";
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const optionalString = (value: unknown) => value === undefined || typeof value === "string";
const optionalBoolean = (value: unknown) => value === undefined || typeof value === "boolean";
const optionalParagraphColour = (value: unknown) => value === undefined || typeof value === "string" && /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([^)]*\))$/i.test(value);
export const validRichTextMark = (mark: unknown): boolean => ["bold", "italic", "strikethrough", "inline-code", "subscript", "superscript", "keyboard"].includes(mark as string)
    || (isRecord(mark) && (
      (mark.type === "link" && typeof mark.url === "string" && optionalBoolean(mark.opensInNewTab))
      || (mark.type === "highlight" && optionalParagraphColour(mark.textColor) && optionalParagraphColour(mark.backgroundColor))
      || (mark.type === "language" && validLanguageCode(mark.language) && ["ltr", "rtl"].includes(mark.direction as string))
      || (mark.type === "math" && optionalString(mark.latex) && optionalString(mark.mathml) && typeof mark.alternativeText === "string" && mark.alternativeText.length <= 500 && (Boolean(mark.latex) !== Boolean(mark.mathml)) && (mark.latex === undefined || mark.latex.length <= 12000) && (mark.mathml === undefined || Boolean(safeMathMLMarkup(mark.mathml))))
      || (mark.type === "inline-image" && optionalString(mark.mediaId) && optionalString(mark.src) && Boolean(mark.mediaId || mark.src) && (mark.src === undefined || Boolean(safeImageSource(mark.src))) && typeof mark.alt === "string" && mark.alt.length <= 1000 && (mark.width === undefined || (typeof mark.width === "number" && Number.isInteger(mark.width) && mark.width >= 1 && mark.width <= 2400)))
      || (mark.type === "footnote" && typeof mark.id === "string" && mark.id.length > 0 && mark.id.length <= 160)
    ));

export function validRichTextRun(value: unknown): value is RichTextRun {
  if (!isRecord(value) || typeof value.text !== "string" || value.marks !== undefined && (!Array.isArray(value.marks) || !value.marks.every(validRichTextMark))) return false;
  if (value.inline === undefined) return true;
  if (value.text !== "\uFFFC" || Array.isArray(value.marks) && value.marks.length || !isRecord(value.inline)) return false;
  const object = value.inline;
  if (object.type === "footnote") return typeof object.id === "string" && object.id.length > 0 && object.id.length <= 160 && Object.keys(object).every(key => ["type", "id"].includes(key));
  if (object.type === "image") return Object.keys(object).every(key => ["type", "mediaId", "src", "alt", "width"].includes(key))
    && (object.mediaId === undefined || typeof object.mediaId === "string" && object.mediaId.trim().length > 0 && object.mediaId.length <= 160)
    && (object.src === undefined || typeof object.src === "string" && object.src.length <= 12000 && Boolean(safeImageSource(object.src)))
    && Boolean(object.mediaId || object.src) && typeof object.alt === "string" && object.alt.length <= 1000
    && (object.width === undefined || typeof object.width === "number" && Number.isInteger(object.width) && object.width >= 1 && object.width <= 2400);
  if (object.type !== "math" || Object.keys(object).some(key => !["type", "latex", "mathml", "alternativeText", "sourceRuns"].includes(key))) return false;
  if (typeof object.alternativeText !== "string" || object.alternativeText.length > 500 || (typeof object.latex === "string") === (typeof object.mathml === "string")) return false;
  if (object.latex !== undefined && (typeof object.latex !== "string" || object.latex.length > 12000) || object.mathml !== undefined && (typeof object.mathml !== "string" || object.mathml.length > 12000 || object.mathml !== "" && !safeMathMLMarkup(object.mathml))) return false;
  if (object.sourceRuns !== undefined && (!Array.isArray(object.sourceRuns) || object.sourceRuns.length > 1000 || object.sourceRuns.reduce((sum: number, run: unknown) => sum + (isRecord(run) && typeof run.text === "string" ? run.text.length : 12001), 0) > 12000 || !object.sourceRuns.every(run => isRecord(run) && run.inline === undefined && validRichTextRun(run) && Object.keys(run).every(key => ["text", "marks"].includes(key)) && (run.marks ?? []).every(mark => typeof mark === "string" || !["math", "footnote", "link", "inline-image"].includes(mark.type))))) return false;
  try { if (JSON.stringify(object).length > 150000) return false; } catch { return false; }
  return true;
}
export function validRichTextRuns(value: unknown): value is RichTextRun[] | undefined {
  return value === undefined || Array.isArray(value) && value.every(validRichTextRun);
}
