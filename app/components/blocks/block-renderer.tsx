import { footnoteFragment, visibleFootnoteReferenceAnchors, orderedFootnoteEntries, visibleFootnoteNumbers } from "../../content/footnote-blocks";
import { fieldSelectOptions } from "../../content/field-options";
import { buttonItemPresentation, buttonsPresentationStyle } from "../../content/buttons-presentation";
import { EmbedContent } from "../embed-content";
import { tablePresentation } from "../../content/table-presentation";
import { highlightCode } from "../../content/code-highlighting.mjs";
import { safeImageSource, safeTextLink } from "../../content/rich-text";
import { type ButtonInteractionState, type ContentBlock, type DocumentRenderContext } from "../../content/model";
import { buttonInteractionClassName, buttonInteractionLayoutCss, buttonVisualCss, fitTextEnabled, paragraphStyleAnchor, paragraphStyleClassName, paragraphStyleToCss, visualStyleClassName } from "../../content/paragraph-styles";
import { spacerDimensions, spacerOrientationForChildren, type SpacerOrientation } from "../../content/spacer";
import { layoutDataAttributes, layoutStyleProperties, hasLayoutOptions } from "../../content/layout";
import { blockAlignmentClass, contentBlockAlignment } from "../../content/block-alignment";
import { columnsLayoutStyle } from "../../content/columns";
import { authorInitials, documentAuthor, documentFieldVisible, formatDocumentDate } from "../../content/document-metadata";
import { readingTimeDisplay } from "../../content/reading-time";
import { imageDisplayStyle, imageWrapperStyle } from "../../content/image-style";
import { resolveImageSource } from "../../content/image-source";
import { dividerRuleStyle } from "../../content/divider-style";
import { ImageLightbox } from "../image-lightbox";
import { ArticleMetaIcon } from "../article-meta-icon";
import { FitTextHeading, FitTextParagraph } from "../fit-text-paragraph";
import { StudioIcon } from "../../studio/studio-icons";
import { SocialIconView, socialIconsBlockClassName, socialIconsColourStyle, socialIconsGapStyle } from "../social-icons";
import { renderHeading, renderText } from "./rich-text";
import { ContentTable, renderListBlock } from "./list-table";

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
          // Managed cover images can resolve to browser-local blob URLs.
          // eslint-disable-next-line @next/next/no-img-element
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
