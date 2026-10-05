import { footnoteFragment, footnoteReferenceAnchor, visibleFootnoteReferenceAnchors, orderedFootnoteEntries, visibleFootnoteNumbers, type FootnoteFieldLocation } from "../content/footnote-blocks";
import { validFootnoteReference } from "../content/footnote-runs";
import { tableRowSections } from "../content/table-row-sections";
import { fieldSelectOptions } from "../content/field-options";
import { buttonItemPresentation, buttonsPresentationStyle } from "../content/buttons-presentation";
import { EmbedContent } from "./embed-content";
import { tablePresentation } from "../content/table-presentation";
import { Fragment, useId, type ReactNode } from "react";
import { mathObjectHtml, legacyMathHtml, mathPresentation } from "../content/math-presentation";
import { mathRenderEntries, validMathRun } from "../content/math-runs";
import { inlineImageHtml, validInlineImageRun } from "../content/inline-image";
import { highlightCode } from "../content/code-highlighting.mjs";
import { safeImageSource, safeTextLink, textToRuns } from "../content/rich-text";
import { listItemText, listMarker, normaliseTableColumnWidths, type Article, type ButtonInteractionState, type ContentBlock, type DocumentRenderContext, type HeadingLevel, type Project, type RichTextRun, type TextMark } from "../content/model";
import { buttonInteractionClassName, buttonInteractionLayoutCss, buttonVisualCss, fitTextEnabled, listItemTextStyle, paragraphStyleAnchor, paragraphStyleClassName, paragraphStyleToCss, visualStyleClassName } from "../content/paragraph-styles";
import { spacerDimensions, spacerOrientationForChildren, type SpacerOrientation } from "../content/spacer";
import { layoutDataAttributes, layoutStyleProperties, hasLayoutOptions } from "../content/layout";
import { blockAlignmentClass, contentBlockAlignment } from "../content/block-alignment";
import { columnsLayoutStyle } from "../content/columns";
import { authorInitials, documentAuthor, documentFieldVisible, formatDocumentDate } from "../content/document-metadata";
import { readingTimeDisplay } from "../content/reading-time";
import { imageDisplayStyle, imageWrapperStyle } from "../content/image-style";
import { resolveImageSource } from "../content/image-source";
import { dividerRuleStyle } from "../content/divider-style";
import { tableCellMetadataAt, tableCellScopeFor, tableCellTagFor } from "../content/table-cell-metadata";
import { ImageLightbox } from "./image-lightbox";
import { ArticleMetaIcon } from "./article-meta-icon";
import { FitTextHeading, FitTextParagraph } from "./fit-text-paragraph";
import { StudioIcon } from "../studio/studio-icons";
import { SocialIconView, socialIconsBlockClassName, socialIconsColourStyle, socialIconsGapStyle } from "./social-icons";

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

export function BlockRenderer({ blocks, mediaUrls = {}, variant = "article", hideDividers = false, document, readingTimeBlocks, showMissingMetadata = variant === "studio", spacerOrientation = "vertical", buttonPreview = null }: { blocks: ContentBlock[]; mediaUrls?: Record<string, string>; variant?: "article" | "studio"; hideDividers?: boolean; document?: DocumentRenderContext; readingTimeBlocks?: ContentBlock[]; showMissingMetadata?: boolean; spacerOrientation?: SpacerOrientation; buttonPreview?: { blockId: string; state: ButtonInteractionState } | null }) {
  const studio = variant === "studio";
  const footnoteNumbers = visibleFootnoteNumbers(readingTimeBlocks ?? blocks);
  const footnoteAnchors = visibleFootnoteReferenceAnchors(readingTimeBlocks ?? blocks);
  function renderBlock(block: ContentBlock, previousSibling?: ContentBlock, blockSpacerOrientation = spacerOrientation): React.ReactNode {
    if (block.editorial?.hidden || (block.type === "table" && !block.rows.length)) return null;
    const previousParagraphIndent = previousSibling?.type === "paragraph" ? previousSibling.style?.textIndent : undefined;
    const content = renderBlockContent(block, previousParagraphIndent, blockSpacerOrientation);
    if (!block.visualStyle || block.type === "spacer") return content;
    const style = block.visualStyle;
    const backgroundImageUrl = ["quote", "group", "heading", "code", "document-title"].includes(block.type) && style.backgroundImageMediaId ? mediaUrls[style.backgroundImageMediaId] : undefined;
    const css = block.type === "table" ? tablePresentation(style).wrapper : block.type === "image" ? imageWrapperStyle(block) : block.type === "button" ? (style.margin ? { margin: style.margin } : {}) : paragraphStyleToCss(style, backgroundImageUrl);
    if (block.type === "buttons") delete css.textDecoration;
    if (block.type === "social-icons" || block.type === "divider") { delete css.backgroundColor; delete css.backgroundImage; }
    if (block.type === "cover-image" && style.borderRadius) css.overflow = "hidden";
    const coverFrameClass = block.type === "cover-image"
      ? ` cover-image-visual-style-frame${style.borderRadius || style.borderStyle !== undefined ? " has-cover-image-frame-override" : ""}`
      : "";
    const className = `${visualStyleClassName(style)}${coverFrameClass}`;
    return <div key={block.id} id={paragraphStyleAnchor(style)} className={className} data-block-align={"blockAlign" in block ? block.blockAlign : undefined} style={css}>{content}</div>;
  }
  function renderBlockContent(block: ContentBlock, previousParagraphIndent?: string, spacerOrientation: SpacerOrientation = "vertical"): React.ReactNode {
        const blockUrl = block.type === "embed" || block.type === "button" ? safeTextLink(block.url) : null;
        if (block.type === "paragraph") {
          const paragraphClasses = paragraphStyleClassName(block.style, block.align);
          const className = `${studio ? "block-textarea paragraph-field preview-rich-text " : "paragraph-content "}align-${block.align ?? "left"}${block.blockAlign ? ` align${block.blockAlign}` : ""}${paragraphClasses ? ` ${paragraphClasses}` : ""}`;
          const style = paragraphStyleToCss(block.style, undefined, previousParagraphIndent) as React.CSSProperties;
          const children = renderText(block.text, block.runs, mediaUrls, footnoteNumbers, { blockId: block.id, kind: "text" });
          return fitTextEnabled(block.style)
            ? <FitTextParagraph id={paragraphStyleAnchor(block.style)} className={className} style={style} key={block.id}>{children}</FitTextParagraph>
            : <p id={paragraphStyleAnchor(block.style)} className={className} style={style} key={block.id}>{children}</p>;
        }
        if (block.type === "heading") {
          const className = `${studio ? `block-textarea heading-field is-h${block.level} preview-rich-text ` : ""}align-${block.align ?? "left"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}${fitTextEnabled(block.visualStyle) ? " has-fit-text" : ""}`;
          const content = renderText(block.text, block.runs, mediaUrls, footnoteNumbers, { blockId: block.id, kind: "text" });
          return fitTextEnabled(block.visualStyle)
            ? <FitTextHeading level={block.level} className={className} styleSignature={JSON.stringify(block.visualStyle ?? {})} key={block.id}>{content}</FitTextHeading>
            : renderHeading(block.level, className, block.id, content);
        }
        if (block.type === "quote") {
          return (
            <figure className={`${studio ? "quote-field" : "pull-quote"} align-${block.align ?? "left"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}${block.quoteStyle === "plain" ? " is-style-plain" : ""}`} key={block.id}>
              <blockquote className={studio ? "block-textarea preview-rich-text" : undefined}>{block.children ? <BlockRenderer blocks={block.children} mediaUrls={mediaUrls} document={document} variant={variant} readingTimeBlocks={readingTimeBlocks ?? blocks} buttonPreview={buttonPreview} /> : renderText(block.text, block.runs, mediaUrls, footnoteNumbers, { blockId: block.id, kind: "text" })}</blockquote>
              {block.attribution ? <figcaption className="quote-citation">{renderText(block.attribution, block.attributionRuns, mediaUrls, footnoteNumbers, { blockId: block.id, kind: "attribution" })}</figcaption> : null}
            </figure>
          );
        }
        if (block.type === "list") return renderListBlock(block, studio, mediaUrls, footnoteNumbers, child => renderBlock(child));
        if (block.type === "table") return <ContentTable block={block} key={block.id} mediaUrls={mediaUrls} footnoteNumbers={footnoteNumbers} />;
        if (block.type === "code") {
          const highlighted = highlightCode(block.code, block.language);
          return <pre className={[studio ? "studio-code-preview" : "", blockAlignmentClass(block)].filter(Boolean).join(" ") || undefined} key={block.id} data-language={highlighted.language}><code dangerouslySetInnerHTML={{ __html: highlighted.html }} /></pre>;
        }
        if (block.type === "image") {
          const imageSource = block.mediaId
            ? safeImageSource(mediaUrls[block.mediaId] ?? "", { allowBlob: true })
            : safeImageSource(block.src);
          const linkDestination = block.linkDestination ?? (block.linkUrl ? "custom" : "none");
          const imageLink = linkDestination === "media" ? imageSource : linkDestination === "custom" && block.linkUrl ? safeTextLink(block.linkUrl) : null;
          // Sample and local editor content use externally supplied image URLs only.
          // eslint-disable-next-line @next/next/no-img-element
          const image = imageSource ? <img src={imageSource} alt={block.decorative ? "" : block.alt} title={block.title} style={imageDisplayStyle(block)} /> : null;
          return (
            <figure key={block.id} className={`${studio ? "image-field" : "article-image"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`}>
              {image ? (linkDestination === "lightbox" && imageSource ? <ImageLightbox src={imageSource} alt={block.alt} style={imageDisplayStyle(block)} /> : imageLink ? <a href={imageLink} target={block.opensInNewTab ? "_blank" : undefined} rel={block.opensInNewTab ? "noopener noreferrer" : undefined} aria-label={block.decorative || !block.alt ? block.title || block.alt || "Open linked image" : undefined}>{image}</a> : image) : studio ? <div><span><StudioIcon name="image" /></span><strong>Image block</strong><small>Choose a managed file or add an image URL.</small></div> : <div className="image-placeholder" role="img" aria-label={block.alt || "Image placeholder"}>Image</div>}
              {block.caption ? <figcaption>{renderText(block.caption, block.captionRuns, mediaUrls, footnoteNumbers, { blockId: block.id, kind: "caption" })}</figcaption> : null}
            </figure>
          );
        }
        if (block.type === "footnotes") {
          const entries = orderedFootnoteEntries(block.notes, footnoteNumbers).filter(entry => entry.number !== undefined);
          return entries.length ? <section className="article-footnotes" key={block.id} aria-label="Footnotes"><ol>{entries.map(({ note, number }) => <li key={note.id} value={number} id={`footnote-${note.id}`}><span>{note.text}</span> <a className="footnote-backlink" href={footnoteFragment(footnoteAnchors.get(note.id)!)} aria-label="Return to footnote reference"><StudioIcon name="arrow-left" size={16} /></a></li>)}</ol></section> : null;
        }
        if (block.type === "embed") return <figure className={`embed-player-block${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`} key={block.id}><EmbedContent url={block.url} title={block.title} />{block.caption ? <figcaption>{renderText(block.caption, block.captionRuns, mediaUrls, footnoteNumbers, { blockId: block.id, kind: "caption" })}</figcaption> : null}</figure>;
        if (block.type === "buttons") return <div key={block.id} className={["content-buttons", blockAlignmentClass(block)].filter(Boolean).join(" ")} style={buttonsPresentationStyle(block)}><>{block.children.filter(child => !child.editorial?.hidden).map(child => <div {...buttonItemPresentation(block, child, buttonPreview?.blockId === child.id ? buttonPreview.state : undefined)} key={child.id}><BlockRenderer blocks={[child]} mediaUrls={mediaUrls} document={document} variant={variant} readingTimeBlocks={readingTimeBlocks ?? blocks} buttonPreview={buttonPreview} /></div>)}</></div>;
        if (block.type === "button") {
          const buttonPreviewState = buttonPreview?.blockId === block.id ? buttonPreview.state : undefined;
          const interactionClassName = buttonInteractionClassName(block.interactionStyles, buttonPreviewState);
          return (
          <p className={`${studio ? "button-field" : "button-block"} align-${block.align ?? "centre"}${block.width ? ` has-width-${block.width}` : ""} ${interactionClassName}`} style={buttonInteractionLayoutCss(block.interactionStyles) as React.CSSProperties} key={block.id}>
            {/* Link relationships are normalised from typed settings above. */}
            {/* eslint-disable-next-line react/jsx-no-target-blank */}
            {blockUrl ? <a className={["content-button", `is-${block.style}`, interactionClassName].filter(Boolean).join(" ")} style={buttonVisualCss(block.visualStyle, block.interactionStyles)} href={blockUrl} title={block.title} target={block.opensInNewTab ? "_blank" : undefined} rel={[block.rel, block.opensInNewTab ? "noopener noreferrer" : ""].filter(Boolean).join(" ") || undefined}>{renderText(block.label, block.labelRuns, mediaUrls, footnoteNumbers, { blockId: block.id, kind: "label" })}</a> : <span className={["content-button", `is-${block.style}`, interactionClassName].filter(Boolean).join(" ")} style={buttonVisualCss(block.visualStyle, block.interactionStyles)}>{renderText(block.label, block.labelRuns, mediaUrls, footnoteNumbers, { blockId: block.id, kind: "label" })}</span>}
          </p>
          );
        }
        if (block.type === "field") return <label className="content-field" key={block.id}><span>{block.label}</span>{block.control === "select" ? <select value={block.value} disabled>{fieldSelectOptions(block).map(option => <option key={option}>{option}</option>)}</select> : <input value={block.value} readOnly />}</label>;
        if (block.type === "document-title") {
          if (!document || !documentFieldVisible(document, "title")) return null;
          const href = document.slug ? (document.kind === "post" ? `/writing/${document.slug}` : `/${document.slug}`) : null;
          // eslint-disable-next-line react/jsx-no-target-blank
          const title = block.isLink && href ? <a href={href} target={block.linkTarget === "_blank" ? "_blank" : undefined} rel={[block.rel, block.linkTarget === "_blank" ? "noopener noreferrer" : ""].filter(Boolean).join(" ") || undefined}>{document.title}</a> : document.title;
          return <div className={`document-dynamic-field align-${block.align ?? "left"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`} key={block.id}>{document.title ? block.level === 0 ? <p>{title}</p> : renderHeading(block.level ?? 2, "", block.id, title) : <span className="metadata-missing">Add a title in Document settings.</span>}</div>;
        }
        if (block.type === "document-subtitle") {
          if (!document || !documentFieldVisible(document, "subtitle")) return null;
          return <div className={`document-dynamic-field align-${block.align ?? "left"}`} key={block.id}>{document.subtitle ? <p>{document.subtitle}</p> : <span className="metadata-missing">Add a subtitle in Document settings.</span>}</div>;
        }
        if (block.type === "cover-image") {
          if (!document || !documentFieldVisible(document, "coverImage") || !document.coverImage) return null;
          const source = resolveImageSource(document.coverImage, mediaUrls);
          const href = document.slug ? (document.kind === "post" ? `/writing/${document.slug}` : `/${document.slug}`) : null;
          const image = source ? <img className="document-featured-image" src={source} alt={document.coverImage.alt} style={imageDisplayStyle(block, { includeFrame: false })} /> : <div className="image-placeholder" role="img" aria-label={document.coverImage.alt || "Cover image placeholder"}>Cover image</div>;
          // eslint-disable-next-line react/jsx-no-target-blank
          return <figure className={`document-dynamic-cover align-${block.align ?? "left"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`} key={block.id}>{block.isLink && href ? <a href={href} target={block.linkTarget === "_blank" ? "_blank" : undefined} rel={[block.rel, block.linkTarget === "_blank" ? "noopener noreferrer" : ""].filter(Boolean).join(" ") || undefined}>{image}</a> : image}</figure>;
        }
        if (block.type === "reading-time") {
          if (!documentFieldVisible(document, "readingTime")) return null;
          const label = `${block.prefix ?? "Reading Time:"} ${readingTimeDisplay(readingTimeBlocks ?? blocks, block)}`;
          return <p className={`article-reading-time metadata-block${block.presentation === "plain" ? " is-plain" : ""} align-${block.align ?? "left"}`} key={block.id}>{block.presentation !== "plain" ? <span className="reading-time-badge">{label}</span> : label}</p>;
        }
        if (block.type === "post-author") {
          if (!documentFieldVisible(document, "author")) return null;
          const author = document ? documentAuthor(document) : null;
          return author || showMissingMetadata ? <div className={`article-byline metadata-block align-${block.align ?? "left"}`} key={block.id}>{author ? <>{block.avatar !== false ? <span className="article-author-avatar" aria-hidden="true">{authorInitials(author)}</span> : null}<span>{block.prefix ?? "By"} <strong>{author}</strong></span></> : <span className="metadata-missing">Add an author in Document settings.</span>}</div> : null;
        }
        if (block.type === "post-date") {
          if (!documentFieldVisible(document, "publicationDate")) return null;
          const date = document ? formatDocumentDate(document, block.format, block) : null;
          const href = document?.slug ? (document.kind === "post" ? `/writing/${document.slug}` : `/${document.slug}`) : null;
          const value = date ? <>{block.showIcon !== false ? <ArticleMetaIcon name="clock" /> : null}<time dateTime={document ? block.dateSource === "modified" ? document.updatedAt : document.publishAt ?? document.publishedAt : undefined}>{date}</time></> : <span className="metadata-missing">{block.dateSource === "modified" ? "No confirmed modification date is available." : "Add a publication date in Document settings."}</span>;
          return date || showMissingMetadata ? <div className={`article-byline-detail metadata-block align-${block.align ?? "left"}`} key={block.id}>{block.isLink && href ? <a href={href}>{value}</a> : value}</div> : null;
        }
        if (block.type === "social-icons") {
          const links = block.children.filter(child => !child.editorial?.hidden && Boolean(safeTextLink(child.url)));
          return links.length ? <nav className={socialIconsBlockClassName(block)} style={socialIconsColourStyle(block)} aria-label="Social links" key={block.id}><ul style={socialIconsGapStyle(block)}>{links.map(child => <li key={child.id} id={paragraphStyleAnchor(child.visualStyle)} className={paragraphStyleClassName(child.visualStyle) || undefined} style={paragraphStyleToCss(child.visualStyle)}><SocialIconView block={child} showLabel={block.showLabels} openInNewTab={block.openInNewTab} /></li>)}</ul></nav> : null;
        }
        if (block.type === "social-linkedin" || block.type === "social-tiktok") return <SocialIconView block={block} showLabel key={block.id} />;
        if (block.type === "section") return <section className={`content-section layout-${block.layout}${hasLayoutOptions(block) ? " has-layout-options" : ""}`} style={layoutStyleProperties(block)} {...layoutDataAttributes(block)} data-section-role={block.role} key={block.id}>{block.children.filter(child => !child.editorial?.hidden).map((child, index) => <div className="content-section-child" data-preview-block-id={child.id} key={child.id}>{renderBlock(child, index > 0 ? block.children[index - 1] : undefined, spacerOrientationForChildren(block))}</div>)}</section>;
        if (block.type === "group") {
          const GroupElement = block.tagName ?? "div";
          return <GroupElement className={`content-group layout-${block.layout}${hasLayoutOptions(block) ? " has-layout-options" : ""}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`} style={layoutStyleProperties(block)} {...layoutDataAttributes(block)} aria-label={block.ariaLabel || undefined} key={block.id}>{block.children.map((child, index) => renderBlock(child, index > 0 ? block.children[index - 1] : undefined, spacerOrientationForChildren(block)))}</GroupElement>;
        }
        if (block.type === "columns") return <div id={paragraphStyleAnchor(block.style)} className={`content-columns${paragraphStyleClassName(block.style) ? ` ${paragraphStyleClassName(block.style)}` : ""}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`} style={{ ...columnsLayoutStyle({ ...block, children: block.children.filter(column => !column.editorial?.hidden) }), ...paragraphStyleToCss(block.style) }} {...layoutDataAttributes(block)} key={block.id}>{block.children.map((column) => renderBlock(column))}</div>;
        if (block.type === "column") return <div id={paragraphStyleAnchor(block.style)} className={`content-column${paragraphStyleClassName(block.style) ? ` ${paragraphStyleClassName(block.style)}` : ""}`} style={{ ...layoutStyleProperties(block), ...(block.verticalAlign ? { alignSelf: block.verticalAlign === "centre" ? "center" : block.verticalAlign === "bottom" ? "end" : block.verticalAlign === "top" ? "start" : "stretch" } : {}), ...paragraphStyleToCss(block.style) }} key={block.id}>{block.children.map((child, index) => renderBlock(child, index > 0 ? block.children[index - 1] : undefined))}</div>;
        if (block.type === "spacer") return <div id={paragraphStyleAnchor(block.visualStyle)} className={`content-spacer${paragraphStyleClassName(block.visualStyle) ? ` ${paragraphStyleClassName(block.visualStyle)}` : ""}`} style={{ ...spacerDimensions(block, spacerOrientation), ...paragraphStyleToCss(block.visualStyle) }} aria-hidden="true" key={block.id} />;
        if (block.type === "component") return null;
        if (block.type === "divider") {
          const DividerElement = block.tagName ?? "hr";
          const dividerClass = `content-divider is-${block.style ?? "default"}`;
          const alignment = blockAlignmentClass(block);
          const ruleStyle = dividerRuleStyle(block.visualStyle, block.style) as React.CSSProperties;
          const divider = <DividerElement className={dividerClass} style={ruleStyle} role={DividerElement === "div" ? "separator" : undefined} aria-orientation={DividerElement === "div" ? "horizontal" : undefined} />;
          return studio ? <div className={`divider-field${alignment ? ` ${alignment}` : ""}`} key={block.id}>{divider}</div> : <DividerElement className={`${dividerClass}${alignment ? ` ${alignment}` : ""}`} style={ruleStyle} role={DividerElement === "div" ? "separator" : undefined} aria-orientation={DividerElement === "div" ? "horizontal" : undefined} key={block.id} />;
        }
        return null;
  }
  return (
    <div className={studio ? "studio-block-preview" : "prose"}>
      {blocks.filter(block => !block.editorial?.hidden).map((block, index) => {
        if (hideDividers && block.type === "divider") return null;
        return studio
          ? <div className={`content-block is-${block.type}${contentBlockAlignment(block) ? ` has-block-align-${contentBlockAlignment(block)}` : ""}`} key={block.id} data-block-align={"blockAlign" in block ? block.blockAlign : undefined} data-preview-block-id={block.id}>{renderBlock(block, index > 0 ? blocks[index - 1] : undefined)}</div>
          : renderBlock(block, index > 0 ? blocks[index - 1] : undefined);
      })}
    </div>
  );
}

function renderListBlock(block: Extract<ContentBlock, { type: "list" }>, studio: boolean, mediaUrls: Record<string, string>, footnoteNumbers: Map<string, number>, renderChild: (child: Extract<ContentBlock, { type: "list" }>) => React.ReactNode): React.ReactNode {
  const items = block.items.map((item, index) => {
    const content = typeof item === "string" ? item : renderText(listItemText(item), item.runs, mediaUrls, footnoteNumbers, { blockId: block.id, kind: "list-item", itemIndex: index });
    const nestedLists = typeof item === "string" ? null : item.children?.filter(child => !child.editorial?.hidden).map(child => renderChild(child));
    const itemStyle = typeof item === "string" ? undefined : item.style;
    const itemPresentation = { id: paragraphStyleAnchor(itemStyle), className: paragraphStyleClassName(itemStyle) || undefined, style: paragraphStyleToCss(itemStyle) as React.CSSProperties };
    const itemTextStyle = listItemTextStyle(itemStyle) as React.CSSProperties;
    return studio
      ? <li {...itemPresentation} className={`list-field-row${itemStyle ? ` ${visualStyleClassName(itemStyle)}` : ""}`} key={`${block.id}-${index}`}><span className="list-field-marker" aria-hidden="true">{block.style === "ordered" ? listMarker(block, index) : "•"}</span><div className="list-field-item-content"><span className="list-item-text" style={itemTextStyle}>{content}</span>{nestedLists}</div></li>
      : <li {...itemPresentation} key={`${block.id}-${index}`}>{itemStyle ? <span style={itemTextStyle}>{content}</span> : content}{nestedLists}</li>;
  });
  return block.style === "ordered"
    ? <ol className={[studio ? "list-field-preview" : "", blockAlignmentClass(block)].filter(Boolean).join(" ") || undefined} type={block.marker} start={block.start} reversed={block.reversed || undefined} key={block.id}>{items}</ol>
    : <ul className={[studio ? "list-field-preview" : "", blockAlignmentClass(block)].filter(Boolean).join(" ") || undefined} key={block.id}>{items}</ul>;
}

function ContentTable({ block, mediaUrls, footnoteNumbers }: { block: Extract<ContentBlock, { type: "table" }>; mediaUrls: Record<string, string>; footnoteNumbers: Map<string, number> }) {
  const captionId = useId();
  const rows = block.rows;
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const normalisedRows = rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] ?? ""));
  const columnWidths = normaliseTableColumnWidths(columnCount, block.columnWidths);
  const rowHeights = block.rowHeights;
  const { headerRowCount, footerRowCount, bodyStart, bodyEnd } = tableRowSections(block);
  const headerRows = normalisedRows.slice(0, headerRowCount);
  const footerRows = footerRowCount ? normalisedRows.slice(bodyEnd) : [];


  function renderRow(row: string[], rowIndex: number, header = false) {
    const defaultTag = header ? "th" : "td";
    return (
      <tr key={rowIndex} className={rowHeights?.[rowIndex] ? "has-explicit-row-height" : undefined} style={rowHeights?.[rowIndex] ? { height: rowHeights[rowIndex] } : undefined}>
        {row.map((cell, cellIndex) => {
          const metadata = tableCellMetadataAt(block.cellMetadata, rowIndex, cellIndex);
          const Cell = tableCellTagFor(metadata, defaultTag) === "th" ? "th" : "td";
          return <Cell key={cellIndex} scope={tableCellScopeFor(metadata, defaultTag)} style={block.columnAlignments?.[cellIndex] && block.columnAlignments[cellIndex] !== "left" ? { textAlign: block.columnAlignments[cellIndex] === "centre" ? "center" : block.columnAlignments[cellIndex] } : undefined}>
            {/* Scroll containers need keyboard focus without pretending to be editable controls. */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
            <div className="content-table-cell" tabIndex={cell ? 0 : undefined}>
              {renderText(cell, block.cellRuns?.[rowIndex]?.[cellIndex], mediaUrls, footnoteNumbers, { blockId: block.id, kind: "table-cell", row: rowIndex, column: cellIndex })}
            </div>
          </Cell>;
        })}
      </tr>
    );
  }

  if (!rows.length) return null;

  return (
    <figure className={`content-table-frame${tablePresentation(block.visualStyle).hasBorder ? " has-table-border" : ""}${block.tableStyle === "stripes" ? " is-striped" : ""}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`}>
      <table className={`content-table${block.fixedWidth === false ? " is-auto-layout" : ""}`} style={tablePresentation(block.visualStyle).table} aria-labelledby={block.caption ? captionId : undefined}>
        {block.fixedWidth !== false ? <colgroup>{columnWidths.map((width, index) => <col key={`column-${index}`} style={{ width: `${width}%` }} />)}</colgroup> : null}
        {headerRows.length ? <thead>{headerRows.map((row, index) => renderRow(row, index, true))}</thead> : null}
        <tbody>{normalisedRows.slice(bodyStart, bodyEnd).map((row, index) => renderRow(row, index + bodyStart))}</tbody>
        {footerRows.length ? <tfoot>{footerRows.map((row, index) => renderRow(row, normalisedRows.length - footerRows.length + index))}</tfoot> : null}
      </table>
      {block.caption ? <figcaption id={captionId}>{renderText(block.caption, block.captionRuns, mediaUrls, footnoteNumbers, { blockId: block.id, kind: "caption" })}</figcaption> : null}
    </figure>
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
