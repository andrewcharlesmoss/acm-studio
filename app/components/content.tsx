import { Fragment, type ReactNode } from "react";
import { highlightCode } from "../content/code-highlighting.mjs";
import { safeImageSource, safeTextLink, textToRuns } from "../content/rich-text";
import { normaliseTableColumnWidths, normaliseTableRowHeights, type Article, type ContentBlock, type DocumentRenderContext, type HeadingLevel, type Project, type RichTextRun, type TextMark } from "../content/model";
import { paragraphStyleAnchor, paragraphStyleClassName, paragraphStyleToCss } from "../content/paragraph-styles";
import { layoutDataAttributes, layoutStyleProperties, hasLayoutOptions } from "../content/layout";
import { authorInitials, documentAuthor, formatDocumentDate } from "../content/document-metadata";
import { readingTimeLabel } from "../content/reading-time";
import { ArticleMetaIcon } from "./article-meta-icon";
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

export function ArticleRow({ article }: { article: Article }) {
  return (
    <article className="article-row">
      <div className="article-meta">
        <span>{article.section}</span>
        <time dateTime={article.publishedAt}>{article.displayDate}</time>
      </div>
      <div className="article-summary">
        <h3><a href={`/writing/${article.slug}`}>{article.title}</a></h3>
        <p>{article.summary}</p>
      </div>
      <span className="article-arrow" aria-hidden="true">↗</span>
    </article>
  );
}

export function BlockRenderer({ blocks, mediaUrls = {}, variant = "article", hideDividers = false, document }: { blocks: ContentBlock[]; mediaUrls?: Record<string, string>; variant?: "article" | "studio"; hideDividers?: boolean; document?: DocumentRenderContext }) {
  const studio = variant === "studio";
  function renderBlock(block: ContentBlock) {
        const blockUrl = block.type === "embed" || block.type === "button" ? safeTextLink(block.url) : null;
        if (block.type === "paragraph") return <p id={paragraphStyleAnchor(block.style)} className={`${studio ? "block-textarea paragraph-field preview-rich-text " : ""}align-${block.align ?? "left"}${paragraphStyleClassName(block.style) ? ` ${paragraphStyleClassName(block.style)}` : ""}`} style={paragraphStyleToCss(block.style) as React.CSSProperties} key={block.id}>{renderText(block.text, block.runs)}</p>;
        if (block.type === "heading") {
          return renderHeading(block.level, `${studio ? `block-textarea heading-field is-h${block.level} preview-rich-text ` : ""}align-${block.align ?? "left"}`, block.id, renderText(block.text, block.runs));
        }
        if (block.type === "quote") {
          return (
            <figure className={`${studio ? "quote-field" : "pull-quote"} align-${block.align ?? "left"}`} key={block.id}>
              <blockquote className={studio ? "block-textarea preview-rich-text" : undefined}>{renderText(block.text, block.runs)}</blockquote>
              {block.attribution ? <figcaption>— {block.attribution}</figcaption> : null}
            </figure>
          );
        }
        if (block.type === "list") {
          const items = block.items.map((item, index) => studio
            ? <li className="list-field-row" key={index}><span className="list-field-marker" aria-hidden="true">{block.style === "ordered" ? `${index + 1}.` : "•"}</span><span className="list-item-text">{item}</span></li>
            : <li key={index}>{item}</li>);
          return block.style === "ordered"
            ? <ol className={studio ? "list-field-preview" : undefined} key={block.id}>{items}</ol>
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
          return (
            <figure key={block.id} className={`${studio ? "image-field" : "article-image"}${block.wide ? " is-wide" : ""}`}>
              {imageSource ? (
                // Sample and local editor content use externally supplied image URLs only.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageSource} alt={block.alt} />
              ) : studio ? <div><span><StudioIcon name="image" /></span><strong>Image block</strong><small>Choose a managed file or add an image URL.</small></div> : <div className="image-placeholder" role="img" aria-label={block.alt || "Image placeholder"}>Image</div>}
              {block.caption ? <figcaption>{block.caption}</figcaption> : null}
            </figure>
          );
        }
        if (block.type === "embed" && studio) return <aside className="embed-field" key={block.id}><span aria-hidden="true"><StudioIcon name="external" /></span><div>{blockUrl ? <a href={blockUrl}>{block.title}</a> : <span>{block.title}</span>}<small>{blockUrl ?? (block.url ? "Enter a valid URL" : "Add a URL in Block settings")}</small></div></aside>;
        if (block.type === "embed") return (
          <aside className="embed-card" key={block.id}>
            <span>External resource</span>
            {blockUrl ? <a href={blockUrl}>{block.title} ↗</a> : <span>{block.title}</span>}
          </aside>
        );
        if (block.type === "button") return (
          <p className={studio ? "button-field" : "button-block"} key={block.id}>
            {blockUrl ? <a className={`content-button is-${block.style}`} href={blockUrl}>{block.label}</a> : <span className={`content-button is-${block.style}`}>{block.label}</span>}
          </p>
        );
        if (block.type === "field") return <label className="content-field" key={block.id}><span>{block.label}</span>{block.control === "select" ? <select value={block.value} disabled><option>{block.value}</option></select> : <input value={block.value} readOnly />}</label>;
        if (block.type === "reading-time") {
          const label = `${block.prefix ?? "Reading Time:"} ${readingTimeLabel(blocks)}`;
          return <p className={`article-reading-time metadata-block${block.presentation === "plain" ? " is-plain" : ""} align-${block.align ?? "left"}`} key={block.id}>{block.presentation !== "plain" ? <span className="reading-time-badge">{label}</span> : label}</p>;
        }
        if (block.type === "post-author") {
          const author = document ? documentAuthor(document) : null;
          if (!author) return null;
          return <div className={`article-byline metadata-block align-${block.align ?? "left"}`} key={block.id}>{block.avatar !== false ? <span className="article-author-avatar" aria-hidden="true">{authorInitials(author)}</span> : null}<span>{block.prefix ?? "By"} <strong>{author}</strong></span></div>;
        }
        if (block.type === "post-date") {
          const date = document ? formatDocumentDate(document, block.format) : null;
          if (!date) return null;
          return <div className={`article-byline-detail metadata-block align-${block.align ?? "left"}`} key={block.id}>{block.showIcon !== false ? <ArticleMetaIcon name="clock" /> : null}<time dateTime={document ? document.publishAt ?? document.publishedAt : undefined}>{date}</time></div>;
        }
        if (block.type === "section") return <section className={`content-section layout-${block.layout}${hasLayoutOptions(block) ? " has-layout-options" : ""}`} style={layoutStyleProperties(block)} {...layoutDataAttributes(block)} data-section-role={block.role} key={block.id}>{block.children.map((child) => <div className="content-section-child" data-preview-block-id={child.id} key={child.id}>{renderBlock(child)}</div>)}</section>;
        if (block.type === "group") return <div className={`content-group layout-${block.layout}${hasLayoutOptions(block) ? " has-layout-options" : ""}`} style={layoutStyleProperties(block)} {...layoutDataAttributes(block)} key={block.id}>{block.children.map((child) => renderBlock(child))}</div>;
        if (block.type === "spacer") return <div className="content-spacer" style={{ height: `${block.height}px` }} aria-hidden="true" key={block.id} />;
        if (block.type === "component") return null;
        return studio ? <div className="divider-field" key={block.id}><hr className="content-divider" /></div> : <hr className="content-divider" key={block.id} />;
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
    <div className="content-table-frame">
      <table className="content-table">
        <colgroup>{columnWidths.map((width, index) => <col key={`column-${index}`} style={{ width: `${width}%` }} />)}</colgroup>
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

export function renderText(text: string, runs?: RichTextRun[]) {
  return (runs?.length ? runs : textToRuns(text)).map((run, index) => {
    let content: ReactNode = run.text;
    for (const mark of run.marks ?? []) content = renderMark(content, mark);
    return <Fragment key={`${index}-${run.text}`}>{content}</Fragment>;
  });
}

function renderMark(content: ReactNode, mark: TextMark): ReactNode {
  if (mark === "bold") return <strong>{content}</strong>;
  if (mark === "italic") return <em>{content}</em>;
  const href = safeTextLink(mark.url);
  return href ? <a href={href} target={mark.opensInNewTab ? "_blank" : undefined} rel={mark.opensInNewTab ? "noopener noreferrer" : undefined}>{content}</a> : content;
}
