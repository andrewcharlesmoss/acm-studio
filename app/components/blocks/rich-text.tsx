import { footnoteFragment, footnoteReferenceAnchor, type FootnoteFieldLocation } from "../../content/footnote-blocks";
import { validFootnoteReference } from "../../content/footnote-runs";
import { Fragment, useId, type ReactNode } from "react";
import { mathObjectHtml, legacyMathHtml, mathPresentation } from "../../content/math-presentation";
import { mathRenderEntries, validMathRun } from "../../content/math-runs";
import { inlineImageHtml, validInlineImageRun } from "../../content/inline-image";
import { safeImageSource, safeTextLink, textToRuns } from "../../content/rich-text";
import { type HeadingLevel, type RichTextRun, type TextMark } from "../../content/model";

export function renderHeading(level: HeadingLevel, className: string, key: string, content: ReactNode) {
  if (level === 1) return <h1 className={className} key={key}>{content}</h1>;
  if (level === 2) return <h2 className={className} key={key}>{content}</h2>;
  if (level === 3) return <h3 className={className} key={key}>{content}</h3>;
  if (level === 4) return <h4 className={className} key={key}>{content}</h4>;
  if (level === 5) return <h5 className={className} key={key}>{content}</h5>;
  return <h6 className={className} key={key}>{content}</h6>;
}

export function renderText(text: string, runs?: RichTextRun[], mediaUrls: Record<string, string> = {}, footnoteNumbers: Map<string, number> = new Map(), field?: FootnoteFieldLocation) {
  return mathRenderEntries(runs?.length ? runs : textToRuns(text)).map(({ run, index, legacyRuns }) => {
    if (validInlineImageRun(run)) return <Fragment key={index}><span dangerouslySetInnerHTML={{ __html: inlineImageHtml(run.inline, mediaUrls) }} /></Fragment>;
    if (legacyRuns) return <Fragment key={index}><span dangerouslySetInnerHTML={{ __html: legacyMathHtml(legacyRuns) ?? "" }} /></Fragment>;
    if (validMathRun(run)) return <Fragment key={index}><span dangerouslySetInnerHTML={{ __html: mathObjectHtml(run.inline) }} /></Fragment>;
    if (run.inline && validFootnoteReference(run)) {
      const id = run.inline.id;
      const number = footnoteNumbers.get(id);
      return <FootnoteReference key={`${index}-${id}`} id={id} number={number} anchor={field ? footnoteReferenceAnchor(id, field, index) : undefined} atomic />;
    }
    let content: ReactNode = run.text;
    for (const [markIndex, mark] of (run.marks ?? []).entries()) content = renderMark(content, mark, mediaUrls, footnoteNumbers, typeof mark !== "string" && mark.type === "footnote" && field ? footnoteReferenceAnchor(mark.id, field, index, markIndex) : undefined);
    return <Fragment key={`${index}-${run.text}`}>{content}</Fragment>;
  });
}

function FootnoteReference({ id, number, anchor, atomic = false }: { id: string; number?: number; anchor?: string; atomic?: boolean }) {
  const fallback = useId();
  return <sup data-footnote-object={atomic ? id : undefined}><a id={anchor ?? `footnote-ref-${fallback}`} href={footnoteFragment(`footnote-${id}`)} aria-label={number ? `Footnote ${number}` : "Footnote"}>{number ?? "†"}</a></sup>;
}

function renderMark(content: ReactNode, mark: TextMark, mediaUrls: Record<string, string>, footnoteNumbers: Map<string, number>, footnoteAnchor?: string): ReactNode {
  if (mark === "bold") return <strong>{content}</strong>;
  if (mark === "italic") return <em>{content}</em>;
  if (mark === "strikethrough") return <s>{content}</s>;
  if (mark === "inline-code") return <code>{content}</code>;
  if (mark === "subscript") return <sub>{content}</sub>;
  if (mark === "superscript") return <sup>{content}</sup>;
  if (mark === "keyboard") return <kbd>{content}</kbd>;
  if (typeof mark !== "string" && mark.type === "highlight") return <mark style={{ color: mark.textColor ?? "inherit", backgroundColor: mark.backgroundColor ?? "transparent" }}>{content}</mark>;
  if (typeof mark !== "string" && mark.type === "language") return <bdo lang={mark.language} dir={mark.direction}>{content}</bdo>;
  if (typeof mark !== "string" && mark.type === "math") {
    const { html } = mathPresentation(mark);
    return html ? <span className="inline-math" aria-label={mark.alternativeText || mark.latex} dangerouslySetInnerHTML={{ __html: html }} /> : <span className="inline-math-fallback">{mark.alternativeText || mark.latex || ""}</span>;
  }
  if (typeof mark !== "string" && mark.type === "inline-image") {
    const src = safeImageSource(mark.mediaId ? mediaUrls[mark.mediaId] ?? "" : "", { allowBlob: true }) ?? safeImageSource(mark.src ?? "");
    return src ? <img className="inline-rich-image" src={src} alt={mark.alt} width={mark.width} /> : <span className="inline-rich-image-fallback">{mark.alt}</span>;
  }
  if (typeof mark !== "string" && mark.type === "footnote") {
    const number = footnoteNumbers.get(mark.id);
    return <>{content}<FootnoteReference id={mark.id} number={number} anchor={footnoteAnchor} /></>;
  }
  const href = safeTextLink(mark.url);
  return href ? <a href={href} target={mark.opensInNewTab ? "_blank" : undefined} rel={mark.opensInNewTab ? "noopener noreferrer" : undefined}>{content}</a> : content;
}
