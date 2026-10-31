"use client";
import { useCodePresentation } from "./code-presentation-context";
import type { Ref } from "react";
import { highlightCode } from "../../content/code-highlighting.mjs";
import { safeTextLink } from "../../content/rich-text";
import type { RichTextRun, TextMark } from "../../content/model";

function applyCodeMarks(highlighted: string, runs: RichTextRun[] | undefined) {
  if (!runs?.some(run => run.marks?.length)) return highlighted;
  const ranges: { start: number; end: number; marks: TextMark[] }[] = [];
  let offset = 0;
  for (const run of runs) {
    ranges.push({ start: offset, end: offset + run.text.length, marks: run.marks ?? [] });
    offset += run.text.length;
  }
  let sourceOffset = 0;
  const escapeAttribute = (value: string) => value.replace(/&/g, "&amp;").replace(/\"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const wrap = (text: string, marks: TextMark[]) => {
    let html = text;
    for (const mark of marks) {
      if (mark === "bold") html = `<strong>${html}</strong>`;
      else if (mark === "italic") html = `<em>${html}</em>`;
      else if (mark === "strikethrough") html = `<s>${html}</s>`;
      else if (mark === "inline-code") html = `<code>${html}</code>`;
      else if (mark === "subscript") html = `<sub>${html}</sub>`;
      else if (mark === "superscript") html = `<sup>${html}</sup>`;
      else if (mark === "keyboard") html = `<kbd>${html}</kbd>`;
      else if (typeof mark !== "string" && mark.type === "link") {
        const href = safeTextLink(mark.url);
        if (href) html = `<a href=\"${escapeAttribute(href)}\"${mark.opensInNewTab ? " target=\"_blank\" rel=\"noopener noreferrer\"" : ""}>${html}</a>`;
      } else if (typeof mark !== "string" && mark.type === "highlight") {
        const safeColour = (value: string | undefined) => value && /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([^)]*\))$/i.test(value) ? escapeAttribute(value) : undefined;
        const color = safeColour(mark.textColor) ?? "inherit";
        const backgroundColor = safeColour(mark.backgroundColor) ?? "transparent";
        html = `<mark style=\"color:${color};background-color:${backgroundColor}\">${html}</mark>`;
      } else if (typeof mark !== "string" && mark.type === "language") {
        html = `<bdo lang=\"${escapeAttribute(mark.language)}\" dir=\"${mark.direction === "rtl" ? "rtl" : "ltr"}\">${html}</bdo>`;
      }
    }
    return html;
  };
  return highlighted.replace(/(<[^>]+>|[^<]+)/g, token => {
    if (token.startsWith("<")) return token;
    const units = token.match(/&(?:#\d+|#x[\da-f]+|[a-z]+);|[\s\S]/gi) ?? [];
    let output = "";
    let group = "";
    let groupMarks: TextMark[] = [];
    const same = (left: TextMark[], right: TextMark[]) => JSON.stringify(left) === JSON.stringify(right);
    for (const unit of units) {
      const marks = ranges.find(range => sourceOffset >= range.start && sourceOffset < range.end)?.marks ?? [];
      if (group && !same(groupMarks, marks)) { output += wrap(group, groupMarks); group = ""; }
      groupMarks = marks;
      group += unit;
      sourceOffset++;
    }
    if (group) output += wrap(group, groupMarks);
    return output;
  });
}

/** The painted code owns its intrinsic height in both editor and preview. */
export function CodeContent({ code, runs, language, className = "", editing = false, studio = true, ref }: {
  code: string;
  runs?: RichTextRun[];
  language?: string;
  className?: string;
  editing?: boolean;
  studio?: boolean;
  ref?: Ref<HTMLPreElement>;
}) {
  const style = useCodePresentation();
  const highlighted = highlightCode(code, language);
  return <pre className={[studio && "studio-code-preview", editing && "code-highlight", className].filter(Boolean).join(" ") || undefined} style={style} ref={ref} aria-hidden={editing || undefined} data-language={highlighted.language}>
    <code dangerouslySetInnerHTML={{ __html: applyCodeMarks(highlighted.html, runs) }} />
  </pre>;
}
