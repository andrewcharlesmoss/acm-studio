import type { CSSProperties, ReactNode } from "react";
import { BlockRenderer } from "../components/content";
import { documentFieldVisible } from "../content/document-metadata";
import { readingTimeLabel } from "../content/reading-time";
import { safeImageSource, safeTextLink } from "../content/rich-text";
import { hasLayoutOptions, layoutDataAttributes, layoutStyleProperties } from "../content/layout";
import type { ContentBlock } from "../content/model";
import type { StudioDocument } from "./editor-model";
import type { SiteStyles, TemplateNode, TemplatePart, TemplateSet, TemplateSnapshot } from "./template-model";
import { StudioIcon } from "./studio-icons";

function hasDocumentMetadataBlocks(blocks: StudioDocument["blocks"]): boolean {
  return blocks.some(block => ["reading-time", "post-author", "post-date"].includes(block.type)
    || ((block.type === "section" || block.type === "group" || block.type === "component") && hasDocumentMetadataBlocks(block.children ?? [])));
}

function templateHasElement(nodes: TemplateNode[], set: TemplateSet, wanted: string, seen = new Set<string>()): boolean {
  return nodes.some(node => node.type === "element" && node.element === wanted
    || (node.type === "group" || node.type === "section") && templateHasElement(node.children, set, wanted, seen)
    || node.type === "part" && !seen.has(node.partId) && Boolean(set.parts.find(part => part.id === node.partId && templateHasElement(part.nodes, set, wanted, new Set([...seen, part.id])))));
}

function templateHasBlockType(nodes: TemplateNode[], set: TemplateSet, wanted: ContentBlock["type"], seen = new Set<string>()): boolean {
  return nodes.some(node => node.type === wanted
    || (node.type === "group" || node.type === "section") && templateHasBlockType(node.children, set, wanted, seen)
    || node.type === "part" && !seen.has(node.partId) && Boolean(set.parts.find(part => part.id === node.partId && templateHasBlockType(part.nodes, set, wanted, new Set([...seen, part.id])))));
}

function removeTemplateShellBlocks(blocks: ContentBlock[], set: TemplateSet, nodes: TemplateNode[]): ContentBlock[] {
  const hidden = new Set<ContentBlock["type"]>();
  if (templateHasElement(nodes, set, "document-title")) hidden.add("document-title");
  if (templateHasElement(nodes, set, "subtitle")) hidden.add("document-subtitle");
  if (templateHasElement(nodes, set, "cover-image")) hidden.add("cover-image");
  for (const type of ["reading-time", "post-author", "post-date"] as const) if (templateHasBlockType(nodes, set, type)) hidden.add(type);
  if (!hidden.size) return blocks;
  return blocks.filter(block => !hidden.has(block.type)).map(block => block.type === "group" || block.type === "section" || block.type === "component"
    ? { ...block, children: removeTemplateShellBlocks(block.children ?? [], set, nodes) }
    : block);
}

export function templateDocumentBodyBlocks(document: StudioDocument, set: TemplateSet, nodes: TemplateNode[]): ContentBlock[] {
  return removeTemplateShellBlocks(document.blocks, set, nodes);
}

export function templateStyleProperties(styles: SiteStyles): CSSProperties {
  return { "--template-background": styles.background, "--template-text": styles.text, "--template-accent": styles.accent, "--template-border": styles.border, "--template-font": styles.font === "inter" ? 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif' : "Georgia, serif", "--template-font-size": `${styles.fontSize / 16}rem`, "--template-spacing": `${styles.spacing}px`, "--template-content-width": `${styles.contentWidth}px`, "--template-radius": `${styles.radius}px`, "--template-border-width": `${styles.borderWidth}px` } as CSSProperties;
}

export function TemplateSurface({ set, children, editing = false }: { set: TemplateSet; children: ReactNode; editing?: boolean }) {
  return <div className="template-surface" style={templateStyleProperties(set.styles)} onClickCapture={event => { if (editing && event.target instanceof Element && event.target.closest("a")) event.preventDefault(); }}>{children}</div>;
}

/** Shared by composed references and the standalone shared-part editor. */
export function TemplatePartRegion({ part, children, onEditPart }: { part: TemplatePart; children: ReactNode; onEditPart?: (id: string) => void }) {
  const Region = part.kind === "header" ? "header" : "footer";
  return <Region className={`template-part template-${part.kind}`} data-template-part={part.id}>
    {onEditPart ? <button className="template-edit-part" type="button" onClick={() => onEditPart(part.id)}><StudioIcon name="pencil" size={16} />Edit {part.name}</button> : null}
    <div className="template-part-content">{children}</div>
  </Region>;
}

function brandInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? `${words[0][0]}${words.at(-1)?.[0] ?? ""}` : words[0]?.[0] ?? "";
  return (initials || "S").toUpperCase();
}

function TemplateImage({ src, alt }: { src: string; alt: string }) {
  // Managed browser blobs and authored URLs are resolved locally.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} />;
}

export type TemplateRenderContext = {
  set: TemplateSet;
  document: StudioDocument;
  mediaUrls?: Record<string, string>;
  content?: ReactNode;
  editingDocument?: boolean;
  onDocumentChange?: (field: "title" | "subtitle", value: string) => void;
  onChangeCover?: () => void;
  onRemoveCover?: () => void;
  onEditPart?: (id: string) => void;
  renderOrdinary?: (node: TemplateNode) => ReactNode;
  decorate?: (node: TemplateNode, result: ReactNode) => ReactNode;
};

export function TemplateNodes({ nodes, ...context }: TemplateRenderContext & { nodes: TemplateNode[] }) {
  const { set, document, mediaUrls = {}, content, editingDocument, onDocumentChange, onChangeCover, onRemoveCover, onEditPart, renderOrdinary, decorate } = context;
  const documentBodyBlocks = templateDocumentBodyBlocks(document, set, nodes);
  let rendered = 0;
  function render(node: TemplateNode, ancestors: Set<string>, depth: number, shared = false): ReactNode {
    if (++rendered > 10000 || depth > 16) return <p role="alert">Template expansion limit reached.</p>;
    let result: ReactNode;
    if (node.type === "part") {
      const part = set.parts.find(p => p.id === node.partId);
      if (!part || ancestors.has(part.id)) return <p role="alert">This shared part is unavailable.</p>;
      result = <TemplatePartRegion part={part} onEditPart={onEditPart}>
        {part.nodes.map(child => <div key={child.id}>{render(child, new Set([...ancestors, part.id]), depth + 1, true)}</div>)}
      </TemplatePartRegion>;
    } else if (node.type === "group" || node.type === "section") {
      const Group = node.type === "section" ? "section" : "div";
      result = <Group className={`template-group layout-${node.layout}${hasLayoutOptions(node) ? " has-layout-options" : ""}`} style={layoutStyleProperties(node)} {...layoutDataAttributes(node)} data-section-role={node.type === "section" ? node.role : undefined}>{node.children.map(child => <div key={child.id}>{render(child, ancestors, depth + 1, shared)}</div>)}</Group>;
    } else if (node.type === "element") {
      const align = node.align === "centre" ? "center" : node.align;
      let element: ReactNode;
      switch (node.element) {
        case "content": element = content ?? <BlockRenderer blocks={documentBodyBlocks} mediaUrls={mediaUrls} variant="studio" hideDividers={false} document={document} />; break;
        case "document-title": element = documentFieldVisible(document, "title") ? (editingDocument ? <input className="template-title-input" aria-label="Document title" value={document.title} onChange={event => onDocumentChange?.("title", event.target.value)} /> : <h1>{document.title}</h1>) : null; break;
        case "subtitle": element = documentFieldVisible(document, "subtitle") && (editingDocument ? <input className="template-subtitle-input" aria-label="Document subtitle" placeholder="Add a subtitle" value={document.subtitle ?? ""} onChange={event => onDocumentChange?.("subtitle", event.target.value)} /> : document.subtitle ? <p className="template-subtitle">{document.subtitle}</p> : null); break;
        case "post-metadata": {
          const metadataBlocks = document.metadataBlocksVersion === 2 || hasDocumentMetadataBlocks(document.blocks);
          element = document.kind === "post" ? <p className="template-metadata">{document.category}{metadataBlocks ? "" : ` · ${readingTimeLabel(document.blocks)}${document.publishedAt ? ` · ${new Date(document.publishedAt).toLocaleDateString("en-GB")}` : ""}`}</p> : null;
          break;
        }
        case "cover-image": {
          const cover = document.coverImage;
          const src = cover?.mediaId ? safeImageSource(mediaUrls[cover.mediaId] ?? "", { allowBlob: true }) : safeImageSource(cover?.src ?? "");
          element = documentFieldVisible(document, "coverImage") ? editingDocument ? <div className="canvas-cover-wrap document-dynamic-cover">
            <div className={`canvas-cover-image${src ? " is-source" : ""}`} role="img" aria-label={cover?.alt || "Mock cover image"}>{src ? <TemplateImage src={src} alt={cover?.alt ?? ""} /> : null}</div>
            <div className="canvas-cover-actions">
              <button className="cover-action-button" type="button" onClick={onChangeCover} aria-label="Change cover image" title="Change cover image"><StudioIcon name="image" /></button>
              {cover !== null ? <button className="cover-action-button is-destructive" type="button" onClick={onRemoveCover} aria-label="Remove cover image" title="Remove cover image"><StudioIcon name="trash" /></button> : null}
            </div>
          </div> : <>{src ? <figure className="template-cover"><TemplateImage src={src} alt={cover?.alt ?? ""} /></figure> : cover !== null && document.kind === "post" ? <div className="template-cover-placeholder" role="img" aria-label="Mock cover image" /> : null}</> : null;
          break;
        }
        case "site-identity": {
          const logo = set.identity.logo;
          const src = logo?.mediaId ? safeImageSource(mediaUrls[logo.mediaId] ?? "", { allowBlob: true }) : safeImageSource(logo?.src ?? "");
          element = <a className="template-brand" href={safeTextLink(set.identity.homeUrl) ?? undefined}>{src ? <TemplateImage src={src} alt={logo?.alt ?? ""} /> : <span className="template-brand-mark" aria-hidden="true">{brandInitials(set.identity.name)}</span>}<span className="template-brand-name">{set.identity.name}</span></a>; break;
        }
        case "navigation": element = <nav aria-label="Site navigation" className="template-navigation">{set.navigation.map(link => <a key={link.id} href={safeTextLink(link.url) ?? undefined}>{link.label}</a>)}</nav>; break;
        case "copyright": element = <p className="template-copyright">{set.identity.copyright}</p>; break;
        case "social-links": element = <nav className="template-social" aria-label="Social and support links">{set.socialLinks.map(link => <a key={link.id} href={safeTextLink(link.url) ?? undefined} target="_blank" rel="noopener noreferrer">{link.label}</a>)}</nav>; break;
      }
      result = <div className={`template-element template-${node.element}`} data-template-element={node.element} style={{ textAlign: align }}>{element}</div>;
    } else result = (!shared ? renderOrdinary?.(node) : undefined) ?? <BlockRenderer blocks={[node]} mediaUrls={mediaUrls} variant="studio" hideDividers={false} document={document} readingTimeBlocks={document.blocks} />;
    return (!shared ? decorate?.(node, result) : undefined) ?? result;
  }
  return <>{nodes.map(node => <div className="template-node" key={node.id}>{render(node, new Set(), 0)}</div>)}</>;
}

export function TemplateDocument({ snapshot, ...context }: Omit<TemplateRenderContext, "set"> & { snapshot: TemplateSnapshot }) {
  const template = snapshot.set.templates.find(item => item.id === snapshot.templateId);
  if (!template) return <p role="alert">This template is unavailable.</p>;
  return <TemplateSurface set={snapshot.set} editing={context.editingDocument}><TemplateNodes {...context} set={snapshot.set} nodes={template.nodes} /></TemplateSurface>;
}
