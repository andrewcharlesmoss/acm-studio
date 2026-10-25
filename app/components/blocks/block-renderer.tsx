"use client";
import { useWebsiteDesignContext, projectWebsiteDesignBlocks } from "../../studio/site-editor/website-design-surface";
import { localPublicationHref } from "../../content/publication-address";
import { DocumentAuthorContent, DocumentFieldLink, DocumentSubtitleContent, DocumentTitleContent, PublicationDateContent, ReadingTimeContent } from "./document-field-content";
import { footnoteFragment, visibleFootnoteReferenceAnchors, orderedFootnoteEntries, visibleFootnoteNumbers } from "../../content/footnote-blocks";
import { fieldSelectOptions } from "../../content/field-options";
import { buttonItemPresentation, buttonsPresentationStyle } from "../../content/buttons-presentation";
import { EmbedContent } from "../embed-content";
import { BlockVisualFrame } from "./block-visual-frame";
import { QuoteContent } from "./quote-content";
import { CodeContent } from "./code-content";
import { highlightCode } from "../../content/code-highlighting.mjs";
import { safeImageSource, safeTextLink } from "../../content/rich-text";
import { type ButtonInteractionState, type ContentBlock, type DocumentRenderContext } from "../../content/model";
import { buttonInteractionClassName, buttonInteractionLayoutCss, buttonVisualCss, fitTextEnabled, paragraphStyleAnchor, paragraphStyleClassName, paragraphStyleToCss } from "../../content/paragraph-styles";
import { spacerDimensions, spacerOrientationForChildren, type SpacerOrientation } from "../../content/spacer";
import { layoutDataAttributes, layoutStyleProperties, hasLayoutOptions } from "../../content/layout";
import { blockAlignmentClass, contentBlockAlignment } from "../../content/block-alignment";
import { columnsLayoutStyle } from "../../content/columns";
import { documentAuthor, documentFieldVisible, formatDocumentDate } from "../../content/document-metadata";
import { imageDisplayStyle } from "../../content/image-style";
import { resolveImageSource } from "../../content/image-source";
import { FeaturedImage } from "./featured-image";
import { dividerRuleStyle } from "../../content/divider-style";
import { ImageLightbox } from "../image-lightbox";
import { FitTextHeading, FitTextParagraph } from "../fit-text-paragraph";
import { StudioIcon } from "../../studio/studio-icons";
import { SocialIconView, socialIconsBlockClassName, socialIconsColourStyle, socialIconsGapStyle } from "../social-icons";
import { renderHeading, renderText } from "./rich-text";
import { ContentTable, renderListBlock } from "./list-table";

export function BlockRenderer({ blocks: sourceBlocks, mediaUrls = {}, variant = "article", hideDividers = false, documentHref, document, readingTimeBlocks, showMissingMetadata = variant === "studio", spacerOrientation = "vertical", buttonPreview = null, externalEmbedPlaceholder = false, groupLeadingContent }: { blocks: ContentBlock[]; externalEmbedPlaceholder?: boolean; mediaUrls?: Record<string, string>; variant?: "article" | "studio"; hideDividers?: boolean; document?: DocumentRenderContext; documentHref?: string; readingTimeBlocks?: ContentBlock[]; showMissingMetadata?: boolean; spacerOrientation?: SpacerOrientation; buttonPreview?: { blockId: string; state: ButtonInteractionState } | null; groupLeadingContent?: { blockId: string; content: React.ReactNode } }) {
  const website = useWebsiteDesignContext();
  const blocks = website ? projectWebsiteDesignBlocks(sourceBlocks,website.design.styles) : sourceBlocks;
  const studio = variant === "studio";
  const footnoteNumbers = visibleFootnoteNumbers(readingTimeBlocks ?? blocks);
  const footnoteAnchors = visibleFootnoteReferenceAnchors(readingTimeBlocks ?? blocks);
  function renderBlock(block: ContentBlock, previousSibling?: ContentBlock, blockSpacerOrientation = spacerOrientation): React.ReactNode {
    if (block.editorial?.hidden || (block.type === "table" && !block.rows.length)) return null;
    const previousParagraphIndent = previousSibling?.type === "paragraph" ? previousSibling.style?.textIndent : undefined;
    const content = renderBlockContent(block, previousParagraphIndent, blockSpacerOrientation);
    return <BlockVisualFrame key={block.id} block={block} mediaUrls={mediaUrls}>{content}</BlockVisualFrame>;
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
          const citation = block.attribution ? renderText(block.attribution, block.attributionRuns, mediaUrls, footnoteNumbers, { blockId: block.id, kind: "attribution" }) : undefined;
          const children = block.children ?? (studio ? [{ id: `${block.id}-text`, type: "paragraph" as const, text: block.text, runs: block.runs, align: block.align }] : undefined);
          return <QuoteContent key={block.id} block={block} studio={studio} citation={citation}>
            {children ? studio
              ? children.map((child, index) => child.editorial?.hidden ? null : <div key={child.id} className="quote-body-block">{renderBlock(child, index > 0 ? children[index - 1] : undefined)}</div>)
              : <BlockRenderer externalEmbedPlaceholder={externalEmbedPlaceholder} blocks={children} mediaUrls={mediaUrls} document={document} variant={variant} readingTimeBlocks={readingTimeBlocks ?? blocks} buttonPreview={buttonPreview} />
              : renderText(block.text, block.runs, mediaUrls, footnoteNumbers, { blockId: block.id, kind: "text" })}
          </QuoteContent>;
        }
        if (block.type === "list") return renderListBlock(block, studio, mediaUrls, footnoteNumbers, child => renderBlock(child));
        if (block.type === "table") return <ContentTable block={block} key={block.id} mediaUrls={mediaUrls} footnoteNumbers={footnoteNumbers} />;
        if (block.type === "code") {
          if (studio) return <CodeContent key={block.id} code={block.code} language={block.language} className={blockAlignmentClass(block)} />;
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
        if (block.type === "embed") return <figure className={`embed-player-block${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`} key={block.id}><EmbedContent url={block.url} title={block.title} placeholder={externalEmbedPlaceholder} />{block.caption ? <figcaption>{renderText(block.caption, block.captionRuns, mediaUrls, footnoteNumbers, { blockId: block.id, kind: "caption" })}</figcaption> : null}</figure>;
        if (block.type === "buttons") return <div key={block.id} className={["content-buttons", blockAlignmentClass(block)].filter(Boolean).join(" ")} style={buttonsPresentationStyle(block)}><>{block.children.filter(child => !child.editorial?.hidden).map(child => <div {...buttonItemPresentation(block, child, buttonPreview?.blockId === child.id ? buttonPreview.state : undefined)} key={child.id}>{renderBlock(child)}</div>)}</></div>;
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
          const href = safeTextLink(documentHref ?? (document.slug ? (localPublicationHref(document)) : ""));
          const title = <DocumentFieldLink href={href} enabled={block.isLink} target={block.linkTarget === "_blank" ? "_blank" : undefined} rel={block.rel}>{document.title}</DocumentFieldLink>;
          return <div className={`document-dynamic-field${studio ? " studio-document-field" : ""} align-${block.align ?? "left"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`} key={block.id}>{document.title ? <DocumentTitleContent level={block.level ?? 2} className={studio ? `block-textarea ${block.level === 0 ? "paragraph-field" : `heading-field is-h${block.level ?? 2}`}` : block.level === 0 ? undefined : ""}>{title}</DocumentTitleContent> : studio ? null : <span className="metadata-missing">Add a title in Document settings.</span>}</div>;
        }
        if (block.type === "document-subtitle") {
          if (!document || !documentFieldVisible(document, "subtitle")) return null;
          return <div className={`document-dynamic-field${studio ? " studio-document-field" : ""} align-${block.align ?? "left"}`} key={block.id}>{document.subtitle ? <DocumentSubtitleContent className={studio ? "template-subtitle" : undefined}>{document.subtitle}</DocumentSubtitleContent> : studio ? null : <span className="metadata-missing">Add a subtitle in Document settings.</span>}</div>;
        }
        if (block.type === "cover-image") {
          if (!document || !documentFieldVisible(document, "coverImage") || document.coverImage === null || (!studio && !document.coverImage)) return null;
          const source = resolveImageSource(document.coverImage, mediaUrls);
          const href = safeTextLink(documentHref ?? (document.slug ? (localPublicationHref(document)) : ""));
          const image = <FeaturedImage source={source} alt={document.coverImage?.alt} style={imageDisplayStyle(block, { includeFrame: false })} />;
          return <figure className={`document-dynamic-cover align-${block.align ?? "left"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`} key={block.id}><DocumentFieldLink href={href} enabled={block.isLink} target={block.linkTarget === "_blank" ? "_blank" : undefined} rel={block.rel}>{image}</DocumentFieldLink></figure>;
        }
        if (block.type === "reading-time") {
          if (!documentFieldVisible(document, "readingTime")) return null;
          return <p className={`article-reading-time metadata-block${block.presentation === "plain" ? " is-plain" : ""} align-${block.align ?? "left"}`} key={block.id}><ReadingTimeContent blocks={readingTimeBlocks ?? blocks} block={block} /></p>;
        }
        if (block.type === "post-author") {
          if (!documentFieldVisible(document, "author")) return null;
          const author = document ? documentAuthor(document) : null;
          return author || showMissingMetadata ? <div className={`article-byline metadata-block align-${block.align ?? "left"}`} key={block.id}><DocumentAuthorContent author={author} avatar={block.avatar !== false} prefix={block.prefix} /></div> : null;
        }
        if (block.type === "post-date") {
          if (!documentFieldVisible(document, "publicationDate")) return null;
          const date = document ? formatDocumentDate(document, block.format, block) : null;
          const href = safeTextLink(documentHref ?? (document?.slug ? (localPublicationHref(document)) : ""));
          const value = <PublicationDateContent label={date} dateTime={document ? block.dateSource === "modified" ? document.updatedAt : document.publishAt ?? document.publishedAt : undefined} showIcon={block.showIcon !== false} modified={block.dateSource === "modified"} />;
          return date || showMissingMetadata ? <div className={`article-byline-detail metadata-block align-${block.align ?? "left"}`} key={block.id}><DocumentFieldLink href={href} enabled={block.isLink}>{value}</DocumentFieldLink></div> : null;
        }
        if (block.type === "social-icons") {
          const links = block.children.filter(child => !child.editorial?.hidden && Boolean(safeTextLink(child.url)));
          return links.length ? <nav className={socialIconsBlockClassName(block)} style={socialIconsColourStyle(block)} aria-label="Social links" key={block.id}><ul style={socialIconsGapStyle(block)}>{links.map(child => <li key={child.id} id={paragraphStyleAnchor(child.visualStyle)} className={paragraphStyleClassName(child.visualStyle) || undefined} style={paragraphStyleToCss(child.visualStyle)}><SocialIconView block={child} showLabel={block.showLabels} openInNewTab={block.openInNewTab} /></li>)}</ul></nav> : null;
        }
        if (block.type === "social-linkedin" || block.type === "social-tiktok") return <SocialIconView block={block} showLabel key={block.id} />;
        if (block.type === "section") return <section className={`content-section layout-${block.layout}${hasLayoutOptions(block) ? " has-layout-options" : ""}`} style={layoutStyleProperties(block)} {...layoutDataAttributes(block)} data-section-role={block.role} key={block.id}>{block.children.map((child, index) => child.editorial?.hidden ? null : <div className="content-section-child" data-preview-block-id={child.id} key={child.id}>{renderBlock(child, index > 0 ? block.children[index - 1] : undefined, spacerOrientationForChildren(block))}</div>)}</section>;
        if (block.type === "group") {
          const GroupElement = block.tagName ?? "div";
          return <GroupElement className={`content-group layout-${block.layout}${hasLayoutOptions(block) ? " has-layout-options" : ""}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`} style={layoutStyleProperties(block)} {...layoutDataAttributes(block)} aria-label={block.ariaLabel || undefined} key={block.id}>{groupLeadingContent?.blockId === block.id ? groupLeadingContent.content : null}{block.children.map((child, index) => renderBlock(child, index > 0 ? block.children[index - 1] : undefined, spacerOrientationForChildren(block)))}</GroupElement>;
        }
        if (block.type === "columns") return <div id={paragraphStyleAnchor(block.style)} className={`content-columns${paragraphStyleClassName(block.style) ? ` ${paragraphStyleClassName(block.style)}` : ""}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`} style={{ ...columnsLayoutStyle({ ...block, children: block.children.filter(column => !column.editorial?.hidden) }), ...paragraphStyleToCss(block.style) }} {...layoutDataAttributes(block)} key={block.id}>{block.children.map((column) => renderBlock(column))}</div>;
        if (block.type === "column") return <div id={paragraphStyleAnchor(block.style)} className={`content-column${paragraphStyleClassName(block.style) ? ` ${paragraphStyleClassName(block.style)}` : ""}`} style={{ ...layoutStyleProperties(block), ...(block.verticalAlign ? { alignSelf: block.verticalAlign === "centre" ? "center" : block.verticalAlign === "bottom" ? "end" : block.verticalAlign === "top" ? "start" : "stretch" } : {}), ...paragraphStyleToCss(block.style) }} key={block.id}>{block.children.map((child, index) => renderBlock(child, index > 0 ? block.children[index - 1] : undefined))}</div>;
        if (block.type === "spacer") return <div className="content-spacer" style={spacerDimensions(block, spacerOrientation)} aria-hidden="true" key={block.id} />;
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
      {blocks.map((block, index) => {
        if (block.editorial?.hidden) return null;
        if (hideDividers && block.type === "divider") return null;
        return studio
          ? <div className={`content-block is-${block.type}${contentBlockAlignment(block) ? ` has-block-align-${contentBlockAlignment(block)}` : ""}`} key={block.id} data-block-align={"blockAlign" in block ? block.blockAlign : undefined} data-preview-block-id={block.id}>{renderBlock(block, index > 0 ? blocks[index - 1] : undefined)}</div>
          : renderBlock(block, index > 0 ? blocks[index - 1] : undefined);
      })}
    </div>
  );
}
