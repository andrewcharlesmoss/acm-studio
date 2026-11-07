"use client";
import { referenceComparisonMenuLinks, referencePartSetId } from "./reference-template-parts";
import { useWebsiteDesignContext, WebsiteDesignIdentity } from "./site-editor/website-design-surface";
import { localPublicationHref } from "../content/publication-address";
import { DocumentFieldLink, DocumentSubtitleContent, DocumentTitleContent } from "../components/blocks/document-field-content";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { BlockRenderer } from "../components/content";
import { FeaturedImage } from "../components/blocks/featured-image";
import { documentFieldVisible } from "../content/document-metadata";
import { readingTimeLabel } from "../content/reading-time";
import { safeImageSource, safeTextLink } from "../content/rich-text";
import { hasLayoutOptions, layoutDataAttributes, layoutStyleProperties } from "../content/layout";
import { groupGridItemStyle } from "../content/grid-child-sizing";
import { imageDisplayStyle } from "../content/image-style";
import { resolveImageSource } from "../content/image-source";
import { columnsLayoutStyle } from "../content/columns";
import { paragraphStyleAnchor, paragraphStyleClassName, paragraphStyleToCss } from "../content/paragraph-styles";
import type { ContentBlock } from "../content/model";
import type { SpacerOrientation } from "../content/spacer";
import type { StudioDocument } from "./editor-model";
import { templateEditorBlocks, type NavigationItem, type NavigationTemplateNode, type SiteLink, type SiteStyles, type TemplateNode, type TemplatePart, type TemplateSet, type TemplateSnapshot } from "./template-model";
import { TemplateNavigationView } from "./template-navigation-view";
import { StudioIcon } from "./studio-icons";
import { resolveTemplateCopyright } from "./template-placeholders";
import { TemplateContentLayout } from "./template-content-slot";
import { universalStylePresetToCss, universalStylePresetToCssVariables } from "@acm/styles";
import { projectedStyle } from "./site-editor/blocks-preview-model";
import type { QueryPost } from "../content/post-query";

function hasDocumentMetadataBlocks(blocks: StudioDocument["blocks"]): boolean {
  return blocks.some(block => ["time-to-read", "author-name", "post-date"].includes(block.type)
    || ((block.type === "section" || block.type === "group" || block.type === "columns" || block.type === "column" || block.type === "component" || (block.type === "quote" || block.type === "pullquote") || block.type === "buttons" || block.type === "cover") && hasDocumentMetadataBlocks(block.children ?? [])));
}

function templateHasElement(nodes: TemplateNode[], set: TemplateSet, wanted: string, seen = new Set<string>()): boolean {
  return nodes.some(node => node.type === "element" && node.element === wanted
    || (node.type === "group" || node.type === "section" || node.type === "columns" || node.type === "column") && templateHasElement(node.children, set, wanted, seen)
    || node.type === "part" && !seen.has(node.partId) && Boolean(set.parts.find(part => part.id === node.partId && templateHasElement(part.nodes, set, wanted, new Set([...seen, part.id])))));
}

function templateHasBlockType(nodes: TemplateNode[], set: TemplateSet, wanted: ContentBlock["type"], seen = new Set<string>()): boolean {
  return nodes.some(node => node.type === wanted
    || (node.type === "group" || node.type === "section" || node.type === "columns" || node.type === "column") && templateHasBlockType(node.children, set, wanted, seen)
    || node.type === "part" && !seen.has(node.partId) && Boolean(set.parts.find(part => part.id === node.partId && templateHasBlockType(part.nodes, set, wanted, new Set([...seen, part.id])))));
}

function removeTemplateShellBlocks(blocks: ContentBlock[], set: TemplateSet, nodes: TemplateNode[]): ContentBlock[] {
  const hidden = new Set<ContentBlock["type"]>();
  if (templateHasElement(nodes, set, "document-title")) hidden.add("title");
  if (templateHasElement(nodes, set, "subtitle")) hidden.add("subtitle");
  if (templateHasElement(nodes, set, "cover-image")) hidden.add("cover-image");
  for (const type of ["time-to-read", "author-name", "post-date"] as const) if (templateHasBlockType(nodes, set, type)) hidden.add(type);
  if (!hidden.size) return blocks;
  return blocks.filter(block => !hidden.has(block.type)).map(block => block.type === "group" || block.type === "section" || block.type === "component" || block.type === "column"
    ? { ...block, children: removeTemplateShellBlocks(block.children ?? [], set, nodes) }
    : block.type === "columns" ? { ...block, children: block.children.map(column => ({ ...column, children: removeTemplateShellBlocks(column.children, set, nodes) })) }
    : block);
}

export function templateDocumentBodyBlocks(document: StudioDocument, set: TemplateSet, nodes: TemplateNode[]): ContentBlock[] {
  return removeTemplateShellBlocks(document.blocks, set, nodes);
}

export function templateStyleProperties(styles: SiteStyles): CSSProperties {
  const variables = universalStylePresetToCssVariables(styles);
  const fixedVariables = Object.fromEntries(Object.entries(variables).filter(([name]) => !name.startsWith("--acm-type-")));
  return {
    ...fixedVariables,
    "--template-background": styles.palette.surface,
    "--template-text": styles.palette.textPrimary,
    "--template-accent": styles.palette.accent,
    "--template-border": styles.palette.border,
    "--template-font": variables["--acm-type-body-family"],
    "--template-font-size": variables["--acm-type-body-size"],
    "--template-spacing": variables["--acm-layout-spacing"],
    "--template-content-width": variables["--acm-layout-content-width"],
    "--template-radius": variables["--acm-layout-radius"],
    "--template-border-width": variables["--acm-layout-border-width"],
  } as CSSProperties;
}

export function TemplateSurface({ set, children, editing = false, editorCanvas = false, authoring = false }: { set: TemplateSet; children: ReactNode; editing?: boolean; editorCanvas?: boolean; authoring?: boolean }) {
  const styleKey = `acm-template-style-${stylePresetKey(set.styles)}`;
  // Rich-text fields handle links first; bubbling then prevents static editing links from navigating.
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
  return <><style>{universalStylePresetToCss(set.styles, `.${styleKey}`)}</style><div className={`template-surface${set.id === referencePartSetId ? " template-reference-surface" : ""}${authoring ? " template-authoring-surface" : ""}${editorCanvas ? "" : " acm-universal-style-preset"} ${styleKey}`} style={{ ...templateStyleProperties(set.styles), ...(set.id === referencePartSetId ? { fontFamily: '"TT5 Manrope", sans-serif', fontWeight: 300, color: "#111111", background: "#FFFFFF", "--acm-type-body-family": '"TT5 Manrope", sans-serif', "--acm-type-navigation-family": '"TT5 Manrope", sans-serif', "--acm-type-body-weight": 300, "--acm-type-navigation-weight": 300, "--template-content-width": "1340px", "--acm-layout-content-width": "1340px", "--acm-layout-spacing": "50px", "--acm-layout-radius": "0px", "--acm-type-body-line-height": 1.4, "--acm-type-body-letter-spacing": "-0.1px" } : {}) }} onClick={event => { if (editing && event.target instanceof Element && event.target.closest("a")) event.preventDefault(); }}>{children}</div></>;
}

function stylePresetKey(styles: SiteStyles): string {
  let hash = 2166136261;
  for (const character of JSON.stringify(styles)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return hash.toString(36);
}

/** Shared by composed references and the standalone shared-part editor. */
export function TemplatePartRegion({ part, children, onEditPart, onSelectPart, resizeFrame }: { part: TemplatePart; children: ReactNode; onEditPart?: (id: string) => void; onSelectPart?: () => void; resizeFrame?: { id: string; width: number; controls: ReactNode; resizing: "left" | "right" | null } }) {
  const [selected, setSelected] = useState(false);
  const region = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!selected) return;
    const dismiss = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("[data-template-part]") !== region.current) setSelected(false);
      else if (event.target instanceof Node && !region.current?.contains(event.target)) setSelected(false);
    };
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("focusin", dismiss, true);
    return () => { document.removeEventListener("pointerdown", dismiss, true); document.removeEventListener("focusin", dismiss, true); };
  }, [selected]);
  const select = () => { onSelectPart?.(); setSelected(true); };
  const Region = part.kind === "header" ? "header" : part.kind === "footer" ? "footer" : part.kind === "general" ? "aside" : "div";
  return <Region ref={element => { region.current = element; }} id={resizeFrame?.id} style={resizeFrame ? { width: resizeFrame.width, maxWidth: "100%", marginInline: "auto" } : undefined} className={`template-part template-${part.kind}${resizeFrame ? " studio-part-resize-frame" : ""}`} data-resizing={resizeFrame?.resizing || undefined} data-template-part={part.id} data-shared-part-selected={onSelectPart && selected || undefined} tabIndex={onSelectPart ? 0 : undefined} aria-label={onSelectPart ? `${part.name} shared template part` : undefined} onPointerDown={onSelectPart ? event => { if ((event.target as Element).closest("button, a, input, select, textarea")) return; event.stopPropagation(); select(); } : undefined} onKeyDown={onSelectPart ? event => { if (event.target !== event.currentTarget || event.key !== "Enter" && event.key !== " ") return; event.preventDefault(); event.stopPropagation(); select(); } : undefined}>
    {onEditPart ? <button className="template-edit-part" type="button" onClick={() => onEditPart(part.id)}><StudioIcon name="pencil" size={16} />Edit {part.name}</button> : null}
    <div className="template-part-content">{children}</div>
    {resizeFrame?.controls}
  </Region>;
}

function brandInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? `${words[0][0]}${words.at(-1)?.[0] ?? ""}` : words[0]?.[0] ?? "";
  return (initials || "S").toUpperCase();
}

function TemplateImage({ src, alt, style, className }: { src: string; alt: string; style?: CSSProperties; className?: string }) {
  // Managed browser blobs and authored URLs are resolved locally.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} style={style} className={className} />;
}

export type TemplateRenderContext = {
  documentHref?: string;
  set: TemplateSet;
  document: StudioDocument;
  queryCandidates?: readonly QueryPost[];
  staticQuerySchedule?: boolean;
  mediaUrls?: Record<string, string>;
  content?: ReactNode;
  editingDocument?: boolean;
  templatePreview?: boolean;
  previewSiteTitle?: string | null;
  authoring?: boolean;
  selectedDocumentField?: "title" | "subtitle" | null;
  onFocusDocumentField?: (field?: "title" | "subtitle") => void;
  onDocumentChange?: (field: "title" | "subtitle", value: string) => void;
  onChangeCover?: () => void;
  onRemoveCoverImage?: () => void;
  onRemoveCoverBlock?: () => void;
  onRestoreCoverImage?: () => void;
  onEditPart?: (id: string) => void;
  onSelectPart?: () => void;
  renderNavigationLink?: (link: SiteLink, node: NavigationTemplateNode) => ReactNode;
  renderNavigationOverlayAppender?: (node: NavigationTemplateNode) => ReactNode;
  showNavigationDesktopAppender?: (node: NavigationTemplateNode) => boolean;
  navigationMenuLinks?: (node: NavigationTemplateNode) => NavigationItem[];
  navigationPageListLinks?: (node: NavigationTemplateNode) => SiteLink[];
  navigationSearchEntries?: (node: NavigationTemplateNode) => Array<{ title: string; href: string; text: string }>;
  renderNavigation?: (node: NavigationTemplateNode) => ReactNode;
  renderOrdinary?: (node: TemplateNode, spacerOrientation: SpacerOrientation) => ReactNode;
  decorate?: (node: TemplateNode, result: ReactNode) => ReactNode;
};

export function TemplateNodes({ nodes, ...context }: TemplateRenderContext & { nodes: TemplateNode[] }) {
  const website = useWebsiteDesignContext();
  const { set, document, mediaUrls = {}, content, editingDocument, templatePreview, authoring, selectedDocumentField, onFocusDocumentField, onDocumentChange, onChangeCover, onRemoveCoverImage, onRemoveCoverBlock, onRestoreCoverImage, onEditPart, renderOrdinary, decorate } = context;
  const documentBodyBlocks = templateDocumentBodyBlocks(document, set, nodes);
  let rendered = 0;
  function render(node: TemplateNode, ancestors: Set<string>, depth: number, shared = false, spacerOrientation: SpacerOrientation = "vertical", suppressLinkAnchors = false): ReactNode {
    if (node.editorial?.hidden) return null;
    if (++rendered > 10000 || depth > 16) return <p role="alert">Template expansion limit reached.</p>;
    let result: ReactNode;
    if (node.type === "part") {
      const part = set.parts.find(p => p.id === node.partId);
      if (!part || ancestors.has(part.id)) return <p role="alert">This shared part is unavailable.</p>;
      result = <TemplatePartRegion part={part} onEditPart={onEditPart} onSelectPart={context.onSelectPart}>
        {part.nodes.map(child => <div key={child.id} data-block-align={"blockAlign" in child ? child.blockAlign : undefined}>{render(child, new Set([...ancestors, part.id]), depth + 1, true, "vertical", suppressLinkAnchors)}</div>)}
      </TemplatePartRegion>;
    } else if (node.type === "group" || node.type === "section") {
      const Group = node.type === "section" ? "section" : node.tagName ?? "div";
      const backgroundImageUrl = node.visualStyle?.backgroundImageMediaId ? mediaUrls[node.visualStyle.backgroundImageMediaId] : undefined;
      const style = node.visualStyle;
      const childSpacerOrientation = node.layout === "row" ? "horizontal" : "vertical";
      const visibleChildren = node.children.filter(child => !child.editorial?.hidden);
      // Keep a two-item identity/menu header compact only when its menu collapses.
      // An explicitly authored responsive stack still takes precedence.
      const compactNavigationRow = node.layout === "row" && (!node.stackAt || node.stackAt === "never")
        && visibleChildren.length === 2
        && visibleChildren[0].type === "element" && (visibleChildren[0].element === "site-identity" || visibleChildren[0].element === "site-title")
        && visibleChildren[1].type === "element" && visibleChildren[1].element === "navigation"
        && (visibleChildren[1].overlayMenu === "mobile" || visibleChildren[1].overlayMenu === "always");
      result = <Group data-compact-navigation-row={compactNavigationRow || undefined} id={paragraphStyleAnchor(style)} aria-label={node.type === "group" ? node.ariaLabel || undefined : undefined} data-block-align={node.type === "group" ? node.blockAlign : undefined} className={`template-group layout-${node.layout}${hasLayoutOptions(node) ? " has-layout-options" : ""}${style ? ` ${paragraphStyleClassName(style)}` : ""}`} style={{ ...layoutStyleProperties(node), ...paragraphStyleToCss(style, backgroundImageUrl) }} {...layoutDataAttributes(node)} data-section-role={node.type === "section" ? node.role : undefined} open={node.type === "group" && node.tagName === "details" ? node.openByDefault === true : undefined}>{node.type === "group" && node.tagName === "details" ? <summary>{node.detailsSummary || "Details"}</summary> : null}{visibleChildren.map(child => <div key={child.id} style={groupGridItemStyle(node, "visualStyle" in child ? child.visualStyle : undefined)} data-block-align={"blockAlign" in child ? child.blockAlign : undefined}>{render(child, ancestors, depth + 1, shared, childSpacerOrientation, suppressLinkAnchors)}</div>)}</Group>;
    } else if (node.type === "columns") {
      const className = paragraphStyleClassName(node.style);
      result = (!shared ? renderOrdinary?.(node, spacerOrientation) : undefined) ?? <div id={paragraphStyleAnchor(node.style)} data-block-align={node.blockAlign} className={`template-columns${className ? ` ${className}` : ""}`} style={{ ...columnsLayoutStyle({ ...node, children: node.children.filter(column => !column.editorial?.hidden) }), ...paragraphStyleToCss(node.style) }} {...layoutDataAttributes(node)}>{node.children.filter(column => !column.editorial?.hidden).map(column => {
        const columnClassName = paragraphStyleClassName(column.style);
        return <div id={paragraphStyleAnchor(column.style)} className={`template-column${columnClassName ? ` ${columnClassName}` : ""}`} key={column.id} style={{ ...layoutStyleProperties(column), ...(column.verticalAlign ? { alignSelf: column.verticalAlign === "centre" ? "center" : column.verticalAlign === "bottom" ? "end" : column.verticalAlign === "top" ? "start" : "stretch" } : {}), ...paragraphStyleToCss(column.style) }}>{column.children.filter(child => !child.editorial?.hidden).map(child => <div key={child.id} data-block-align={"blockAlign" in child ? child.blockAlign : undefined}>{render(child, ancestors, depth + 1, shared, "vertical", suppressLinkAnchors)}</div>)}</div>;
      })}</div>;
    } else if (node.type === "column") {
      const className = paragraphStyleClassName(node.style);
      result = <div id={paragraphStyleAnchor(node.style)} className={`template-column${className ? ` ${className}` : ""}`} style={{ ...layoutStyleProperties(node), ...(node.verticalAlign ? { alignSelf: node.verticalAlign === "centre" ? "center" : node.verticalAlign === "bottom" ? "end" : node.verticalAlign === "top" ? "start" : "stretch" } : {}), ...paragraphStyleToCss(node.style) }}>{node.children.filter(child => !child.editorial?.hidden).map(child => <div key={child.id} data-block-align={"blockAlign" in child ? child.blockAlign : undefined}>{render(child, ancestors, depth + 1, shared, "vertical", suppressLinkAnchors)}</div>)}</div>;
    } else if (node.type === "element") {
      const align = node.align === "centre" ? "center" : node.align;
      const fieldVisualStyle = (node.element === "document-title" || node.element === "cover-image") ? node.visualStyle
        : node.element === "subtitle" ? { ...(node.style ?? {}), ...(node.visualStyle ?? {}) }
          : undefined;
      const fieldVisualClassName = paragraphStyleClassName(fieldVisualStyle);
      const fieldVisualId = paragraphStyleAnchor(fieldVisualStyle);
      let element: ReactNode;
      switch (node.element) {
        case "content": {
          const websiteContentStyle = website?.design.styles.blockStyles?.content;
          const visualStyle = websiteContentStyle ? projectedStyle(websiteContentStyle, node.visualStyle) : node.visualStyle;
          const layout = websiteContentStyle ? {
            ...node,
            contentSize: node.contentSize ?? websiteContentStyle.contentSize,
            wideSize: node.wideSize ?? websiteContentStyle.wideSize,
            inheritLayout: node.inheritLayout ?? websiteContentStyle.inheritLayout,
            horizontalAlign: node.horizontalAlign ?? websiteContentStyle.horizontalAlign,
          } : node;
          element = <TemplateContentLayout layout={layout} visualStyle={visualStyle} align={node.align ?? "left"} tagName={node.tagName ?? "div"} mediaUrls={mediaUrls}>{content ?? <BlockRenderer blocks={documentBodyBlocks} mediaUrls={mediaUrls} variant="studio" hideDividers={false} document={document} documentHref={context.documentHref} queryCandidates={context.queryCandidates} staticQuerySchedule={context.staticQuerySchedule} />}</TemplateContentLayout>;
          break;
        }
        case "document-title": {
          const href = safeTextLink(context.documentHref ?? (document.slug ? (localPublicationHref({ ...document, slug: document.publishedSlug ?? document.slug })) : ""));
          const linkedTitle = <DocumentFieldLink href={href} enabled={node.isLink} target={node.linkTarget === "_blank" ? "_blank" : undefined} rel={node.rel}>{document.title}</DocumentFieldLink>;
          const titleClassName = ["template-dynamic-placeholder", fieldVisualClassName].filter(Boolean).join(" ");
          const titleInputClassName = ["template-title-input", fieldVisualClassName].filter(Boolean).join(" ");
          const titleStyle = paragraphStyleToCss(fieldVisualStyle, fieldVisualStyle?.backgroundImageMediaId ? mediaUrls[fieldVisualStyle.backgroundImageMediaId] : undefined);
          element = documentFieldVisible(document, "title") ? templatePreview ? <DocumentTitleContent level={node.level ?? 1} id={fieldVisualId} className={titleClassName} style={titleStyle}>Title</DocumentTitleContent> : editingDocument ? <input id={fieldVisualId} className={titleInputClassName} data-heading-level={node.level ?? 1} style={titleStyle} aria-label="Document title" value={document.title} onFocus={() => onFocusDocumentField?.("title")} onChange={event => onDocumentChange?.("title", event.target.value)} /> : <DocumentTitleContent level={node.level ?? 1} id={fieldVisualId} className={fieldVisualClassName || undefined} style={titleStyle}>{linkedTitle}</DocumentTitleContent> : null;
          break;
        }
        case "subtitle": {
          const subtitleStyle = paragraphStyleToCss(fieldVisualStyle);
          const subtitleClass = fieldVisualClassName ? ` ${fieldVisualClassName}` : "";
          element = documentFieldVisible(document, "subtitle") && (templatePreview ? <DocumentSubtitleContent id={fieldVisualId} className={`template-subtitle template-dynamic-placeholder${subtitleClass}`} style={subtitleStyle}>Subtitle</DocumentSubtitleContent> : editingDocument ? <input id={fieldVisualId} className={`template-subtitle-input${subtitleClass}`} style={subtitleStyle} aria-label="Subtitle" placeholder="Add a subtitle" value={document.subtitle ?? ""} onFocus={() => onFocusDocumentField?.("subtitle")} onChange={event => onDocumentChange?.("subtitle", event.target.value)} /> : document.subtitle ? <DocumentSubtitleContent id={fieldVisualId} className={`template-subtitle${subtitleClass}`} style={subtitleStyle}>{document.subtitle}</DocumentSubtitleContent> : null);
          break;
        }
        case "post-metadata": {
          const metadataBlocks = document.metadataBlocksVersion === 2 || hasDocumentMetadataBlocks(document.blocks);
          element = document.kind === "post" ? templatePreview ? <p className="template-metadata template-dynamic-placeholder">Author · Publication date · Reading time</p> : <p className="template-metadata">{document.category}{metadataBlocks ? "" : ` · ${readingTimeLabel(document.blocks)}${document.publishedAt ? ` · ${new Date(document.publishedAt).toLocaleDateString("en-GB")}` : ""}`}</p> : null;
          break;
        }
        case "cover-image": {
          const cover = node.fixedImage ?? document.coverImage;
          const src = resolveImageSource(cover, mediaUrls);
          const imageStyle = imageDisplayStyle(node, { includeFrame: false });
          const frameStyle = paragraphStyleToCss(node.visualStyle);
          if (node.visualStyle?.borderRadius) frameStyle.overflow = "hidden";
          const frameProps = { id: fieldVisualId, style: frameStyle };
          const frameClassName = ["template-cover", "document-dynamic-cover", editingDocument ? "canvas-cover-wrap" : "", node.visualStyle?.borderRadius !== undefined || node.visualStyle?.borderStyle !== undefined ? "has-cover-image-frame-override" : "", fieldVisualClassName].filter(Boolean).join(" ");
          const hidden = node.coverImageHidden === true;
          const fixed = Boolean(node.fixedImage);
          const isTemplateExample = Boolean(templatePreview || authoring);
          const image = <FeaturedImage source={isTemplateExample && !fixed ? null : src} alt={isTemplateExample && !fixed ? "" : cover?.alt} duotone={node.duotone} overlay={node.overlay} style={imageStyle} placeholderLabel={fixed ? "Fixed featured image placeholder" : "Featured image placeholder"} />;
          const href = safeTextLink(context.documentHref ?? (document.slug ? (localPublicationHref({ ...document, slug: document.publishedSlug ?? document.slug })) : ""));
          const linkedImage = <DocumentFieldLink href={href} enabled={!editingDocument && node.isLink} target={node.linkTarget === "_blank" ? "_blank" : undefined} rel={node.rel}>{image}</DocumentFieldLink>;
          const changeImageLabel = authoring ? "Choose fixed featured image" : "Change featured image";
          const actions = onChangeCover || onRemoveCoverImage || onRemoveCoverBlock ? <div className="canvas-cover-actions">
            {onChangeCover ? <button className="cover-action-button" type="button" onClick={onChangeCover} aria-label={changeImageLabel} title={changeImageLabel}><StudioIcon name="image" /></button> : null}
            {!hidden && onRemoveCoverImage ? <button className="cover-action-button" type="button" onClick={onRemoveCoverImage} aria-label="Remove featured image" title="Remove featured image"><StudioIcon name="close" /></button> : null}
            {onRemoveCoverBlock ? <button className="cover-action-button is-destructive" type="button" onClick={onRemoveCoverBlock} aria-label="Delete featured image block" title="Delete featured image block"><StudioIcon name="trash" /></button> : null}
          </div> : null;
          element = !hidden && documentFieldVisible(document, "coverImage") && (isTemplateExample || fixed || cover !== null)
            ? <figure {...frameProps} className={frameClassName}>{linkedImage}{editingDocument ? actions : null}</figure>
            : hidden && authoring && editingDocument && onRestoreCoverImage ? <div className="template-hidden-featured-image"><span>Featured image is hidden.</span><button type="button" onClick={onRestoreCoverImage}>Restore featured image</button></div> : null;
          break;
        }
        case "site-logo": {
          const identity = website?.design.identity;
          const logo = identity ? !identity.hidden?.logo && identity.logo : set.identity.logo;
          const raw = logo && typeof logo === "object" && "mediaId" in logo && logo.mediaId ? mediaUrls[logo.mediaId] ?? "" : logo && typeof logo === "object" && "src" in logo ? logo.src : "";
          const src = raw ? safeImageSource(website ? website.imageUrl(raw) : raw, { allowBlob: authoring }) : null;
          element = src ? <a href={safeTextLink(set.identity.homeUrl) ?? undefined} className={`template-site-logo ${paragraphStyleClassName(node.visualStyle)}`} style={paragraphStyleToCss(node.visualStyle)}><TemplateImage src={src} alt={logo && "altText" in logo ? logo.altText : logo && "alt" in logo ? logo.alt : ""} /></a> : authoring ? <span className="template-site-logo-placeholder" role="img" aria-label="Site logo placeholder" /> : null;
          break;
        }
        case "site-title": {
          const identity = website?.design.identity;
          const title = context.previewSiteTitle !== undefined ? context.previewSiteTitle ?? "" : identity ? (identity.hidden?.title || identity.title === null ? "" : identity.title ?? "") : set.identity.name;
          if (!title.trim()) { element = null; break; }
          const Tag = node.tagName ?? "h1";
          const href = node.linkToHome === false ? undefined : safeTextLink(set.identity.homeUrl) ?? undefined;
          element = <Tag className={["template-site-title-text", paragraphStyleClassName(node.visualStyle)].filter(Boolean).join(" ")} style={paragraphStyleToCss(node.visualStyle)}>{href ? <a href={href} target={node.opensInNewTab ? "_blank" : undefined} rel={node.opensInNewTab ? "noopener noreferrer" : undefined} onClick={authoring ? event => event.preventDefault() : undefined}>{title}</a> : title}</Tag>;
          break;
        }
        case "site-tagline": {
          const tagline = website?.design.identity.tagline ?? "";
          element = tagline ? <p className={`template-site-tagline ${paragraphStyleClassName(node.visualStyle)}`} style={paragraphStyleToCss(node.visualStyle)}>{tagline}</p> : authoring ? <p className="template-site-tagline is-placeholder">Write site tagline…</p> : null;
          break;
        }
        case "site-credit": {
          element = <div className="template-site-credit"><p>Twenty Twenty-Five</p><p>Designed with <a href="https://wordpress.org" rel="nofollow">WordPress</a></p></div>;
          break;
        }
        case "site-identity": {
          if (website) { element = <WebsiteDesignIdentity design={website.design} homeUrl={set.identity.homeUrl} imageUrl={website.imageUrl} />; break; }
          const logo = set.identity.logo;
          const src = logo?.mediaId ? safeImageSource(mediaUrls[logo.mediaId] ?? "", { allowBlob: true }) : safeImageSource(logo?.src ?? "");
          element = <a className="template-brand" href={safeTextLink(set.identity.homeUrl) ?? undefined}>{src ? <TemplateImage src={src} alt={logo?.alt ?? ""} /> : <span className="template-brand-mark" aria-hidden="true">{brandInitials(set.identity.name)}</span>}<span className="template-brand-name">{set.identity.name}</span></a>; break;
        }
        case "navigation": {
          const part = node.overlayPartId ? set.parts.find(part => part.id === node.overlayPartId && part.kind === "overlay") : undefined;
          const overlayContent = part && !ancestors.has(part.id)
            ? part.nodes.map(child => <div key={child.id} className="navigation-overlay-layout">{render(child, new Set([...ancestors, part.id]), depth + 1, true, "vertical", true)}</div>) : undefined;
          const referenceLinks = set.id === referencePartSetId ? referenceComparisonMenuLinks(node.id) : null;
          const links = context.navigationMenuLinks?.(node) ?? referenceLinks ?? set.navigation;
          const navigationStyle = website?.design.styles.blockStyles?.navigation;
          const visualStyle = navigationStyle ? projectedStyle(navigationStyle, node.visualStyle) : node.visualStyle;
          const navigationClasses = [
            visualStyle?.className,
            navigationStyle ? "site-block-style-navigation" : undefined,
            // Row and left are the Navigation defaults. Treat them as inherited
            // so Website Styles can supply a site-wide layout; preserve only
            // non-default values as explicit per-block choices.
            node.layout !== undefined && node.layout !== "row" ? "site-block-authored-navigation-layout" : undefined,
            (node.horizontalAlign !== undefined && node.horizontalAlign !== "left") || (node.align !== undefined && node.align !== "left") ? "site-block-authored-navigation-justification" : undefined,
            node.gap !== undefined ? "site-block-authored-navigation-gap" : undefined,
            node.submenuTextColor !== undefined ? "site-block-authored-navigation-submenu-text" : undefined,
            node.submenuBackgroundColor !== undefined ? "site-block-authored-navigation-submenu-background" : undefined,
          ].filter(Boolean).join(" ");
          const themedNode = navigationStyle ? {
            ...node,
            visualStyle: { ...visualStyle, className: navigationClasses },
            submenuTextColor: node.submenuTextColor ?? navigationStyle.navigationSubmenuTextColor,
            submenuBackgroundColor: node.submenuBackgroundColor ?? navigationStyle.navigationSubmenuBackgroundColor,
          } : node;
          element = (!shared ? context.renderNavigation?.(node) : undefined) ?? <TemplateNavigationView node={themedNode} links={links} pageListLinks={context.navigationPageListLinks?.(node) ?? []} searchEntries={context.navigationSearchEntries ? () => context.navigationSearchEntries!(node) : undefined} suppressLinkAnchors={suppressLinkAnchors} documentHref={context.documentHref} homeHref={set.identity.homeUrl} renderLink={context.renderNavigationLink ? link => context.renderNavigationLink?.(link, node) : undefined} overlayContent={overlayContent} overlayAppender={!shared ? context.renderNavigationOverlayAppender?.(node) : undefined} showDesktopAppender={context.showNavigationDesktopAppender?.(node)} />;
          break;
        }
        case "copyright": element = <p className="template-copyright">{resolveTemplateCopyright(set.identity.copyright, set.identity.name)}</p>; break;
        case "social-links": element = <nav className="template-social" aria-label="Social and support links">{set.socialLinks.map(link => <a key={link.id} href={safeTextLink(link.url) ?? undefined} target="_blank" rel="noopener noreferrer">{link.label}</a>)}</nav>; break;
      }
      const field = node.element === "document-title" ? "title" : node.element === "subtitle" ? "subtitle" : null;
      const isSelectedDocumentField = editingDocument && field !== null && selectedDocumentField === field;
      result = <div className={`template-element template-${node.element === "navigation" ? "navigation-frame" : node.element}${"blockAlign" in node && node.blockAlign ? ` align${node.blockAlign}` : ""}${isSelectedDocumentField ? " is-document-field-selected" : ""}`} data-template-element={node.element} data-document-field={field ?? undefined} onPointerDown={editingDocument && field ? () => onFocusDocumentField?.(field) : undefined} style={{ textAlign: align }}>{element}</div>;
    } else {
      const projectedNode: ContentBlock = node.type === "query-loop" || node.type === "post-template" || node.type === "no-results"
        ? { ...node, children: templateEditorBlocks(node.children) }
        : node;
      result = (!shared ? renderOrdinary?.(node, spacerOrientation) : undefined) ?? <BlockRenderer blocks={[projectedNode]} mediaUrls={mediaUrls} variant="studio" hideDividers={false} document={document} documentHref={context.documentHref} readingTimeBlocks={document.blocks} showMissingMetadata={Boolean(editingDocument)} spacerOrientation={spacerOrientation} queryCandidates={context.queryCandidates} staticQuerySchedule={context.staticQuerySchedule} />;
    }
    return (!shared ? decorate?.(node, result) : undefined) ?? result;
  }
  return <>{nodes.filter(node => !node.editorial?.hidden).map(node => <div className="template-node" data-block-align={"blockAlign" in node ? node.blockAlign : undefined} key={node.id} style={node.type === "group" && node.position === "sticky" ? { position: "sticky", top: "0px", zIndex: 10 } : undefined}>{render(node, new Set(), 0)}</div>)}</>;
}

export function TemplateDocument({ snapshot, editorCanvas = false, ...context }: Omit<TemplateRenderContext, "set"> & { snapshot: TemplateSnapshot; editorCanvas?: boolean }) {
  const template = snapshot.set.templates.find(item => item.id === snapshot.templateId);
  if (!template) return <p role="alert">This template is unavailable.</p>;
  // eslint-disable-next-line jsx-a11y/anchor-is-valid
  const renderNavigationLink = context.renderNavigationLink ?? (editorCanvas ? link => <a title={link.description || undefined}>{link.label}</a> : undefined);
  return <TemplateSurface set={snapshot.set} editing={context.editingDocument} editorCanvas={editorCanvas}><TemplateNodes {...context} renderNavigationLink={renderNavigationLink} set={snapshot.set} nodes={template.nodes} /></TemplateSurface>;
}
