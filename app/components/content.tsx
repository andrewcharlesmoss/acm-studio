import { Fragment, type ReactNode } from "react";
import katex from "katex";
import { highlightCode } from "../content/code-highlighting.mjs";
import { safeImageSource, safeTextLink, textToRuns } from "../content/rich-text";
import { listItemText, listMarker, normaliseTableColumnWidths, normaliseTableRowHeights, type Article, type ContentBlock, type DocumentRenderContext, type HeadingLevel, type Project, type RichTextRun, type TextMark } from "../content/model";
import { safeMathMLMarkup } from "../content/mathml";
import { buttonVisualCss, paragraphStyleAnchor, paragraphStyleClassName, paragraphStyleToCss, visualStyleClassName } from "../content/paragraph-styles";
import { spacerDimensions } from "../content/spacer";
import { layoutDataAttributes, layoutStyleProperties, hasLayoutOptions } from "../content/layout";
import { columnsLayoutStyle } from "../content/columns";
import { authorInitials, documentAuthor, documentFieldVisible, formatDocumentDate } from "../content/document-metadata";
import { readingTimeLabel } from "../content/reading-time";
import { imageDisplayStyle } from "../content/image-style";
import { ArticleMetaIcon } from "./article-meta-icon";
import { FitTextHeading, FitTextParagraph } from "./fit-text-paragraph";
import { StudioIcon } from "../studio/studio-icons";

export function StatusPill({ status }: { status: Project["status"] }) {
  return <span className={`status-pill status-${status.toLowerCase()}`}>{status}</span>;
}

export function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <article className="project-card" style={{ "--project-accent": project.accent } as React.CSSProperties}>
      <div className="project-card-topline">
        <span className="project-number">{String(index + 1).padStart(2, "0")}</span>
        <StatusPill status={project.status} />
      </div>
      <div>
        <p className="eyebrow">{project.eyebrow}</p>
        <h3><a href={`/projects/${project.slug}`}>{project.name}</a></h3>
        <p>{project.summary}</p>
      </div>
      <a className="card-link" href={`/projects/${project.slug}`} aria-label={`View ${project.name}`}>
        View project <span aria-hidden="true">→</span>
      </a>
    </article>
  );
}

export function ArticleRow({ article, passwordProtected = false }: { article: Article; passwordProtected?: boolean }) {
  return (
    <article className="article-row">
      <div className="article-meta">
        <span>{article.section}</span>
        <time dateTime={article.publishedAt}>{article.displayDate}</time>
      </div>
      <div className="article-summary">
        <h3><a href={`/writing/${article.slug}`}>{article.title}</a></h3>
        <p>{passwordProtected ? "Password protected · Enter the password to read this post." : article.summary}</p>
      </div>
      <span className="article-arrow" aria-hidden="true">↗</span>
    </article>
  );
}

export function BlockRenderer({ blocks, mediaUrls = {}, variant = "article", hideDividers = false, document, readingTimeBlocks, showMissingMetadata = variant === "studio" }: { blocks: ContentBlock[]; mediaUrls?: Record<string, string>; variant?: "article" | "studio"; hideDividers?: boolean; document?: DocumentRenderContext; readingTimeBlocks?: ContentBlock[]; showMissingMetadata?: boolean }) {
  const studio = variant === "studio";
  const footnoteNumbers = new Map<string, number>();
  let nextFootnoteNumber = 1;
  function collectFootnoteNumbers(source: ContentBlock[]) {
    for (const block of source) {
      if (block.type === "footnotes") block.notes.forEach((note) => footnoteNumbers.set(note.id, nextFootnoteNumber++));
      if ((block.type === "section" || block.type === "group" || block.type === "columns" || block.type === "column" || block.type === "component") && block.children) collectFootnoteNumbers(block.children);
    }
  }
  collectFootnoteNumbers(blocks);
  function renderBlock(block: ContentBlock) {
    const content = renderBlockContent(block);
    if (!block.visualStyle || block.type === "spacer") return content;
    const style = block.visualStyle;
    return <div key={block.id} id={paragraphStyleAnchor(style)} className={visualStyleClassName(style)} style={block.type === "button" || block.type === "image" ? (style.margin ? { margin: style.margin } : undefined) : paragraphStyleToCss(style)}>{content}</div>;
  }
  function renderBlockContent(block: ContentBlock) {
        const blockUrl = block.type === "embed" || block.type === "button" ? safeTextLink(block.url) : null;
        if (block.type === "paragraph") {
          const className = `${studio ? "block-textarea paragraph-field preview-rich-text " : ""}align-${block.align ?? "left"}${paragraphStyleClassName(block.style) ? ` ${paragraphStyleClassName(block.style)}` : ""}`;
          const style = paragraphStyleToCss(block.style) as React.CSSProperties;
          const children = renderText(block.text, block.runs, mediaUrls, footnoteNumbers);
          return block.style?.fitText
            ? <FitTextParagraph id={paragraphStyleAnchor(block.style)} className={className} style={style} key={block.id}>{children}</FitTextParagraph>
            : <p id={paragraphStyleAnchor(block.style)} className={className} style={style} key={block.id}>{children}</p>;
        }
        if (block.type === "heading") {
          const className = `${studio ? `block-textarea heading-field is-h${block.level} preview-rich-text ` : ""}align-${block.align ?? "left"}${block.visualStyle?.fitText ? " has-fit-text" : ""}`;
          const content = renderText(block.text, block.runs, mediaUrls, footnoteNumbers);
          return block.visualStyle?.fitText
            ? <FitTextHeading level={block.level} className={className} styleSignature={JSON.stringify(block.visualStyle ?? {})} key={block.id}>{content}</FitTextHeading>
            : renderHeading(block.level, className, block.id, content);
        }
        if (block.type === "quote") {
          return (
            <figure className={`${studio ? "quote-field" : "pull-quote"} align-${block.align ?? "left"}${block.quoteStyle === "plain" ? " is-style-plain" : ""}`} key={block.id}>
              <blockquote className={studio ? "block-textarea preview-rich-text" : undefined}>{renderText(block.text, block.runs, mediaUrls, footnoteNumbers)}</blockquote>
              {block.attribution ? <figcaption>— {block.attribution}</figcaption> : null}
            </figure>
          );
        }
        if (block.type === "list") {
          const items = block.items.map((item, index) => {
            const content = typeof item === "string" ? item : renderText(listItemText(item), item.runs, mediaUrls, footnoteNumbers);
            return studio
              ? <li className="list-field-row" key={index}><span className="list-field-marker" aria-hidden="true">{block.style === "ordered" ? listMarker(block, index) : "•"}</span><span className="list-item-text">{content}</span></li>
              : <li key={index}>{content}</li>;
          });
          return block.style === "ordered"
            ? <ol className={studio ? "list-field-preview" : undefined} type={block.marker} start={block.start} reversed={block.reversed || undefined} key={block.id}>{items}</ol>
            : <ul className={studio ? "list-field-preview" : undefined} key={block.id}>{items}</ul>;
        }
        if (block.type === "table") return <ContentTable block={block} key={block.id} />;
        if (block.type === "code") {
          const highlighted = highlightCode(block.code, block.language);
          return <pre className={studio ? "studio-code-preview" : undefined} key={block.id} data-language={highlighted.language}><code dangerouslySetInnerHTML={{ __html: highlighted.html }} /></pre>;
        }
        if (block.type === "image") {
          const imageSource = block.mediaId
            ? safeImageSource(mediaUrls[block.mediaId] ?? "", { allowBlob: true })
            : safeImageSource(block.src);
          const imageLink = block.linkUrl ? safeTextLink(block.linkUrl) : null;
          // Sample and local editor content use externally supplied image URLs only.
          // eslint-disable-next-line @next/next/no-img-element
          const image = imageSource ? <img src={imageSource} alt={block.decorative ? "" : block.alt} title={block.title} style={imageDisplayStyle(block)} /> : null;
          return (
            <figure key={block.id} className={`${studio ? "image-field" : "article-image"}${block.wide ? " is-wide" : ""}`}>
              {image ? (imageLink ? <a href={imageLink} target={block.opensInNewTab ? "_blank" : undefined} rel={block.opensInNewTab ? "noopener noreferrer" : undefined} aria-label={block.decorative || !block.alt ? block.title || block.alt || "Open linked image" : undefined}>{image}</a> : image) : studio ? <div><span><StudioIcon name="image" /></span><strong>Image block</strong><small>Choose a managed file or add an image URL.</small></div> : <div className="image-placeholder" role="img" aria-label={block.alt || "Image placeholder"}>Image</div>}
              {block.caption ? <figcaption>{block.caption}</figcaption> : null}
            </figure>
          );
        }
        if (block.type === "footnotes") return <section className="article-footnotes" key={block.id} aria-label="Footnotes"><ol>{block.notes.map((note) => <li key={note.id} id={`footnote-${note.id}`}><span>{note.text}</span> <a href={`#footnote-ref-${note.id}`} aria-label="Return to footnote reference">↩</a></li>)}</ol></section>;
        if (block.type === "embed" && studio) return <aside className="embed-field" key={block.id}><span aria-hidden="true"><StudioIcon name="external" /></span><div>{blockUrl ? <a href={blockUrl}>{block.title}</a> : <span>{block.title}</span>}<small>{blockUrl ?? (block.url ? "Enter a valid URL" : "Add a URL in Block settings")}</small>{block.caption ? <p className="embed-caption">{block.caption}</p> : null}</div></aside>;
        if (block.type === "embed") return (
          <aside className="embed-card" key={block.id}>
            <span>External resource</span>
            {blockUrl ? <a href={blockUrl}>{block.title} ↗</a> : <span>{block.title}</span>}
            {block.caption ? <p className="embed-caption">{block.caption}</p> : null}
          </aside>
        );
        if (block.type === "button") return (
          <p className={studio ? "button-field" : "button-block"} key={block.id}>
            {blockUrl ? <a className={`content-button is-${block.style}`} style={buttonVisualCss(block.visualStyle)} href={blockUrl} target={block.opensInNewTab ? "_blank" : undefined} rel={block.opensInNewTab ? "noopener noreferrer" : undefined}>{block.label}</a> : <span className={`content-button is-${block.style}`} style={buttonVisualCss(block.visualStyle)}>{block.label}</span>}
          </p>
        );
        if (block.type === "field") return <label className="content-field" key={block.id}><span>{block.label}</span>{block.control === "select" ? <select value={block.value} disabled><option>{block.value}</option></select> : <input value={block.value} readOnly />}</label>;
        if (block.type === "document-title") {
          if (!document || !documentFieldVisible(document, "title")) return null;
          return <div className={`document-dynamic-field align-${block.align ?? "left"}`} key={block.id}>{document.title ? <h1>{document.title}</h1> : <span className="metadata-missing">Add a title in Document settings.</span>}</div>;
        }
        if (block.type === "document-subtitle") {
          if (!document || !documentFieldVisible(document, "subtitle")) return null;
          return <div className={`document-dynamic-field align-${block.align ?? "left"}`} key={block.id}>{document.subtitle ? <p>{document.subtitle}</p> : <span className="metadata-missing">Add a subtitle in Document settings.</span>}</div>;
        }
        if (block.type === "cover-image") {
          if (!document || !documentFieldVisible(document, "coverImage") || !document.coverImage) return null;
          const source = safeImageSource(document.coverImage.src);
          return <figure className={`document-dynamic-cover align-${block.align ?? "left"}`} key={block.id}>{source ? <img src={source} alt={document.coverImage.alt} /> : <div className="image-placeholder" role="img" aria-label={document.coverImage.alt || "Cover image placeholder"}>Cover image</div>}</figure>;
        }
        if (block.type === "reading-time") {
          if (!documentFieldVisible(document, "readingTime")) return null;
          const label = `${block.prefix ?? "Reading Time:"} ${readingTimeLabel(readingTimeBlocks ?? blocks)}`;
          return <p className={`article-reading-time metadata-block${block.presentation === "plain" ? " is-plain" : ""} align-${block.align ?? "left"}`} key={block.id}>{block.presentation !== "plain" ? <span className="reading-time-badge">{label}</span> : label}</p>;
        }
        if (block.type === "post-author") {
          if (!documentFieldVisible(document, "author")) return null;
          const author = document ? documentAuthor(document) : null;
          return author || showMissingMetadata ? <div className={`article-byline metadata-block align-${block.align ?? "left"}`} key={block.id}>{author ? <>{block.avatar !== false ? <span className="article-author-avatar" aria-hidden="true">{authorInitials(author)}</span> : null}<span>{block.prefix ?? "By"} <strong>{author}</strong></span></> : <span className="metadata-missing">Add an author in Document settings.</span>}</div> : null;
        }
        if (block.type === "post-date") {
          if (!documentFieldVisible(document, "publicationDate")) return null;
          const date = document ? formatDocumentDate(document, block.format) : null;
          return date || showMissingMetadata ? <div className={`article-byline-detail metadata-block align-${block.align ?? "left"}`} key={block.id}>{date ? <>{block.showIcon !== false ? <ArticleMetaIcon name="clock" /> : null}<time dateTime={document ? document.publishAt ?? document.publishedAt : undefined}>{date}</time></> : <span className="metadata-missing">Add a publication date in Document settings.</span>}</div> : null;
        }
        if (block.type === "section") return <section className={`content-section layout-${block.layout}${hasLayoutOptions(block) ? " has-layout-options" : ""}`} style={layoutStyleProperties(block)} {...layoutDataAttributes(block)} data-section-role={block.role} key={block.id}>{block.children.map((child) => <div className="content-section-child" data-preview-block-id={child.id} key={child.id}>{renderBlock(child)}</div>)}</section>;
        if (block.type === "group") return <div className={`content-group layout-${block.layout}${hasLayoutOptions(block) ? " has-layout-options" : ""}`} style={layoutStyleProperties(block)} {...layoutDataAttributes(block)} key={block.id}>{block.children.map((child) => renderBlock(child))}</div>;
        if (block.type === "columns") return <div id={paragraphStyleAnchor(block.style)} className={`content-columns${paragraphStyleClassName(block.style) ? ` ${paragraphStyleClassName(block.style)}` : ""}`} style={{ ...columnsLayoutStyle(block), ...paragraphStyleToCss(block.style) }} {...layoutDataAttributes(block)} key={block.id}>{block.children.map((column) => renderBlock(column))}</div>;
        if (block.type === "column") return <div id={paragraphStyleAnchor(block.style)} className={`content-column${paragraphStyleClassName(block.style) ? ` ${paragraphStyleClassName(block.style)}` : ""}`} style={{ ...(block.verticalAlign ? { alignSelf: block.verticalAlign === "centre" ? "center" : block.verticalAlign === "bottom" ? "end" : block.verticalAlign === "top" ? "start" : "stretch" } : {}), ...paragraphStyleToCss(block.style) }} key={block.id}>{block.children.map((child) => renderBlock(child))}</div>;
        if (block.type === "spacer") return <div id={paragraphStyleAnchor(block.visualStyle)} className={`content-spacer${paragraphStyleClassName(block.visualStyle) ? ` ${paragraphStyleClassName(block.visualStyle)}` : ""}`} style={{ ...spacerDimensions(block), margin: block.visualStyle?.margin }} aria-hidden="true" key={block.id} />;
        if (block.type === "component") return null;
        return studio ? <div className="divider-field" key={block.id}><hr className={`content-divider is-${block.style ?? "default"}`} /></div> : <hr className={`content-divider is-${block.style ?? "default"}`} key={block.id} />;
  }
  return (
    <div className={studio ? "studio-block-preview" : "prose"}>
      {blocks.map((block) => {
        if (hideDividers && block.type === "divider") return null;
        return studio
          ? <div className={`content-block is-${block.type}`} key={block.id} data-preview-block-id={block.id}>{renderBlock(block)}</div>
          : renderBlock(block);
      })}
    </div>
  );
}

function ContentTable({ block }: { block: Extract<ContentBlock, { type: "table" }> }) {
  const rows = block.rows.length ? block.rows : [[""]];
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const normalisedRows = rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] ?? ""));
  const columnWidths = normaliseTableColumnWidths(columnCount, block.columnWidths);
  const rowHeights = normaliseTableRowHeights(normalisedRows.length, block.rowHeights);
  const headerRows = block.hasHeader ? normalisedRows.slice(0, 1) : [];
  const hasFooterRow = Boolean(block.hasFooter && normalisedRows.length > (block.hasHeader ? 1 : 0));
  const footerRows = hasFooterRow ? normalisedRows.slice(-1) : [];
  const bodyStart = block.hasHeader ? 1 : 0;
  const bodyEnd = hasFooterRow ? Math.max(bodyStart, normalisedRows.length - 1) : normalisedRows.length;

  function renderRow(row: string[], rowIndex: number, header = false) {
    const Cell = header ? "th" : "td";
    return (
      <tr key={rowIndex} style={{ height: rowHeights[rowIndex] }}>
        {row.map((cell, cellIndex) => (
          <Cell key={cellIndex} scope={header ? "col" : undefined}>
            {/* Scroll containers need keyboard focus without pretending to be editable controls. */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
            <div className="content-table-cell" tabIndex={cell ? 0 : undefined}>
              {cell}
            </div>
          </Cell>
        ))}
      </tr>
    );
  }

  return (
    <div className={`content-table-frame${block.tableStyle === "stripes" ? " is-striped" : ""}`}>
      <table className={`content-table${block.fixedWidth === false ? " is-auto-layout" : ""}`}>
        {block.caption ? <caption>{block.caption}</caption> : null}
        {block.fixedWidth !== false ? <colgroup>{columnWidths.map((width, index) => <col key={`column-${index}`} style={{ width: `${width}%` }} />)}</colgroup> : null}
        {headerRows.length ? <thead>{headerRows.map((row, index) => renderRow(row, index, true))}</thead> : null}
        <tbody>{normalisedRows.slice(bodyStart, bodyEnd).map((row, index) => renderRow(row, index + bodyStart))}</tbody>
        {footerRows.length ? <tfoot>{footerRows.map((row, index) => renderRow(row, normalisedRows.length - footerRows.length + index))}</tfoot> : null}
      </table>
    </div>
  );
}

function renderHeading(level: HeadingLevel, className: string, key: string, content: ReactNode) {
  if (level === 1) return <h1 className={className} key={key}>{content}</h1>;
  if (level === 2) return <h2 className={className} key={key}>{content}</h2>;
  if (level === 3) return <h3 className={className} key={key}>{content}</h3>;
  if (level === 4) return <h4 className={className} key={key}>{content}</h4>;
  if (level === 5) return <h5 className={className} key={key}>{content}</h5>;
  return <h6 className={className} key={key}>{content}</h6>;
}

export function renderText(text: string, runs?: RichTextRun[], mediaUrls: Record<string, string> = {}, footnoteNumbers: Map<string, number> = new Map()) {
  return (runs?.length ? runs : textToRuns(text)).map((run, index) => {
    let content: ReactNode = run.text;
    for (const mark of run.marks ?? []) content = renderMark(content, mark, mediaUrls, footnoteNumbers);
    return <Fragment key={`${index}-${run.text}`}>{content}</Fragment>;
  });
}

function renderMark(content: ReactNode, mark: TextMark, mediaUrls: Record<string, string>, footnoteNumbers: Map<string, number>): ReactNode {
  if (mark === "bold") return <strong>{content}</strong>;
  if (mark === "italic") return <em>{content}</em>;
  if (mark === "strikethrough") return <s>{content}</s>;
  if (mark === "inline-code") return <code>{content}</code>;
  if (mark === "subscript") return <sub>{content}</sub>;
  if (mark === "superscript") return <sup>{content}</sup>;
  if (mark === "keyboard") return <kbd>{content}</kbd>;
  if (typeof mark !== "string" && mark.type === "highlight") return <mark style={{ color: mark.textColor, backgroundColor: mark.backgroundColor }}>{content}</mark>;
  if (typeof mark !== "string" && mark.type === "language") return <span lang={mark.language} dir={mark.direction}>{content}</span>;
  if (typeof mark !== "string" && mark.type === "math") {
    if (mark.latex) return <span className="inline-math" aria-label={mark.alternativeText} dangerouslySetInnerHTML={{ __html: katex.renderToString(mark.latex, { displayMode: false, throwOnError: false, strict: "warn", trust: false, output: "htmlAndMathml" }) }} />;
    const mathml = mark.mathml ? safeMathMLMarkup(mark.mathml) : null;
    return mathml ? <span className="inline-math" aria-label={mark.alternativeText} dangerouslySetInnerHTML={{ __html: mathml }} /> : <span className="inline-math-fallback" aria-label={mark.alternativeText}>{mark.alternativeText}</span>;
  }
  if (typeof mark !== "string" && mark.type === "inline-image") {
    const src = safeImageSource(mark.mediaId ? mediaUrls[mark.mediaId] ?? "" : "", { allowBlob: true }) ?? safeImageSource(mark.src ?? "");
    return src ? <img className="inline-rich-image" src={src} alt={mark.alt} width={mark.width} /> : <span className="inline-rich-image-fallback">{mark.alt}</span>;
  }
  if (typeof mark !== "string" && mark.type === "footnote") {
    const number = footnoteNumbers.get(mark.id);
    return <>{content}<sup><a id={`footnote-ref-${mark.id}`} href={`#footnote-${mark.id}`} aria-label={number ? `Footnote ${number}` : "Footnote"}>{number ?? "†"}</a></sup></>;
  }
  const href = safeTextLink(mark.url);
  return href ? <a href={href} target={mark.opensInNewTab ? "_blank" : undefined} rel={mark.opensInNewTab ? "noopener noreferrer" : undefined}>{content}</a> : content;
}
