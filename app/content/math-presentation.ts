import katex from "katex";
import type { InlineMath, TextMark } from "./model";
import { safeMathMLMarkup } from "./mathml";

type MathExpression = InlineMath | Extract<TextMark, { type: "math" }>;
export function mathPresentation(math: MathExpression): { html: string; error: string | null } {
  const source = math.latex ?? math.mathml ?? "";
  if (!source) return { html: "", error: null };
  if (source.length > 12000) return { html: "", error: "Use an expression of 12,000 characters or fewer." };
  if (math.latex !== undefined) {
    try { return { html: katex.renderToString(math.latex, { displayMode: false, throwOnError: true, strict: "warn", trust: false, output: "htmlAndMathml", maxExpand: 1000 }), error: null }; }
    catch { return { html: "", error: "This LaTeX expression could not be parsed. Check the syntax." }; }
  }
  const html = safeMathMLMarkup(source);
  return { html: html ?? "", error: html ? null : "Use supported MathML without executable markup." };
}
const escape = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
/** The encoded typed descriptor is authoritative; descendants are presentation only. */
export function mathObjectHtml(math: InlineMath, editing = false): string {
  const { html, error } = mathPresentation(math);
  const source = math.latex ?? math.mathml ?? "";
  const label = math.alternativeText || source || "Empty mathematical expression";
  return `<span class="inline-math${!source && editing ? " is-empty" : ""}"${editing ? ' contenteditable="false"' : ""} data-math-object="${escape(JSON.stringify(math))}" aria-label="${escape(label)}">${html || (source ? escape(math.alternativeText || source) : editing ? "Math" : "")}${error && editing ? '<span class="sr-only">Invalid expression</span>' : ""}</span>`;
}

export function legacyMathHtml(runs: import("./model").RichTextRun[], editing = false): string | null {
  const run = runs[0];
  const text = runs.map(run => run.text).join("");
  const math = run.marks?.find((mark): mark is Extract<TextMark, { type: "math" }> => typeof mark !== "string" && mark.type === "math");
  if (!math) return null;
  const { html } = mathPresentation(math);
  return `<span class="inline-math"${editing ? ' contenteditable="false"' : ""} data-math-legacy="${escape(JSON.stringify(runs))}" data-inline-text="${escape(text)}" aria-label="${escape(math.alternativeText || math.latex || run.text)}">${html || escape(math.alternativeText || run.text)}</span>`;
}
