"use client";

import type { ContentBlock, TextAlignment } from "../content/model";
import type { StudioDocument } from "./editor-model";

function blockLabel(type: ContentBlock["type"]) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export type StudioInspectorProps = {
  inspectorTab: "document" | "block";
  selectedBlock: ContentBlock | null;
  activeDocument: StudioDocument;
  pages: StudioDocument[];
  canDelete: boolean;
  onSelectTab: (tab: "document" | "block") => void;
  onDocumentChange: <K extends keyof StudioDocument>(field: K, value: StudioDocument[K]) => void;
  onBlockChange: (block: ContentBlock) => void;
  onOpenFiles: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function StudioInspector({ inspectorTab, selectedBlock, activeDocument, pages, canDelete, onSelectTab, onDocumentChange, onBlockChange, onOpenFiles, onPublish, onUnpublish, onDuplicate, onDelete }: StudioInspectorProps) {
  return (
    <aside className="studio-inspector">
      <div className="inspector-tabs" role="tablist" aria-label="Editor settings">
        <button className={inspectorTab === "document" ? "is-active" : ""} type="button" role="tab" aria-selected={inspectorTab === "document"} onClick={() => onSelectTab("document")}>Document</button>
        <button className={inspectorTab === "block" ? "is-active" : ""} type="button" role="tab" aria-selected={inspectorTab === "block"} onClick={() => onSelectTab("block")} disabled={!selectedBlock}>Block</button>
      </div>
      <div className="inspector-scroll">
        {inspectorTab === "document" ? (
          <DocumentInspector document={activeDocument} pages={pages} onChange={onDocumentChange} onPublish={onPublish} onUnpublish={onUnpublish} onDuplicate={onDuplicate} onDelete={onDelete} canDelete={canDelete} />
        ) : selectedBlock ? (
          <BlockInspector block={selectedBlock} onChange={onBlockChange} onOpenFiles={onOpenFiles} />
        ) : (
          <div className="inspector-empty"><span>◫</span><p>Select a block to see its settings.</p></div>
        )}
      </div>
    </aside>
  );
}

type DocumentInspectorProps = {
  document: StudioDocument;
  pages: StudioDocument[];
  onChange: <K extends keyof StudioDocument>(field: K, value: StudioDocument[K]) => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
};

function DocumentInspector({ document, pages, onChange, onPublish, onUnpublish, onDuplicate, onDelete, canDelete }: DocumentInspectorProps) {
  return (
    <div className="inspector-sections">
      <section><h2>Summary</h2><div className="document-summary"><span className={`kind-badge is-${document.kind}`}>{document.kind === "page" ? "P" : "A"}</span><div><strong>{document.title}</strong><small>{document.kind} · {document.status}</small></div></div></section>
      <section><h2>Publishing</h2><div className="local-publish-status"><i className={`document-status is-${document.status}`} /><div><strong>{document.status === "published" ? "Published locally" : "Draft"}</strong><small>{document.status === "published" && document.publishedAt ? `Since ${new Date(document.publishedAt).toLocaleDateString("en-GB")}` : "Only visible in Studio"}</small></div></div>{document.kind === "post" ? <div className="publishing-actions"><button className="publish-action" type="button" onClick={onPublish}>{document.status === "published" ? "Update published post" : "Publish post"}</button>{document.status === "published" ? <button type="button" onClick={onUnpublish}>Return to draft</button> : null}</div> : <p className="setting-note">Page publishing will follow after the post workflow is proven.</p>}<p className="setting-note">Local publication is visible only in this browser.</p></section>
      <section><h2>Address</h2><label><span>Slug</span><input value={document.slug} onChange={(event) => onChange("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))} /></label></section>
      <section><h2>Description</h2><label><span>Excerpt</span><textarea rows={4} value={document.excerpt} onChange={(event) => onChange("excerpt", event.target.value)} placeholder="A short public summary" /></label></section>
      <section><h2>Subtitle</h2><label><span>Subtitle</span><textarea rows={3} value={document.subtitle ?? ""} onChange={(event) => onChange("subtitle", event.target.value)} placeholder="A line beneath the title" /></label></section>
      {document.kind === "post" ? (
        <section><h2>Post settings</h2><label><span>Category</span><select value={document.category} onChange={(event) => onChange("category", event.target.value as StudioDocument["category"])}><option>Technology</option><option>Excel</option><option>Personal</option></select></label><label><span>Tags</span><input value={document.tags.join(", ")} onChange={(event) => onChange("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))} placeholder="CMS, Building" /></label></section>
      ) : (
        <section><h2>Page settings</h2><label><span>Template</span><select value={document.template} onChange={(event) => onChange("template", event.target.value as StudioDocument["template"])}><option value="default">Default</option><option value="wide">Wide</option><option value="landing">Landing</option></select></label><label><span>Parent page</span><select value={document.parentPageId ?? ""} onChange={(event) => onChange("parentPageId", event.target.value || undefined)}><option value="">None</option>{pages.filter((page) => page.id !== document.id).map((page) => <option value={page.id} key={page.id}>{page.title}</option>)}</select></label></section>
      )}
      <section><h2>Search preview</h2><label><span>SEO title</span><input value={document.seoTitle} onChange={(event) => onChange("seoTitle", event.target.value)} /></label><label><span>SEO description</span><textarea rows={4} value={document.seoDescription} onChange={(event) => onChange("seoDescription", event.target.value)} /></label></section>
      <section className="document-operations"><h2>Document actions</h2><button type="button" onClick={onDuplicate}>Duplicate {document.kind}</button><button className="danger-button" type="button" onClick={onDelete} disabled={!canDelete}>Delete {document.kind}</button></section>
    </div>
  );
}

function BlockInspector({ block, onChange, onOpenFiles }: { block: ContentBlock; onChange: (block: ContentBlock) => void; onOpenFiles: () => void }) {
  const alignment = block.type === "paragraph" || block.type === "heading" ? block.align ?? "left" : null;
  return (
    <div className="inspector-sections">
      <section><h2>{blockLabel(block.type)} block</h2><p className="setting-note">Changes apply to the selected block.</p></section>
      {alignment ? <section><h2>Text</h2><label><span>Alignment</span><select value={alignment} onChange={(event) => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label>{block.type === "heading" ? <label><span>Level</span><select value={block.level} onChange={(event) => onChange({ ...block, level: Number(event.target.value) as 2 | 3 })}><option value={2}>Heading 2</option><option value={3}>Heading 3</option></select></label> : null}</section> : null}
      {block.type === "quote" ? <section><h2>Quote</h2><label><span>Attribution</span><input value={block.attribution ?? ""} onChange={(event) => onChange({ ...block, attribution: event.target.value })} placeholder="Optional name" /></label></section> : null}
      {block.type === "list" ? <section><h2>List</h2><label><span>Style</span><select value={block.style} onChange={(event) => onChange({ ...block, style: event.target.value as "ordered" | "unordered" })}><option value="unordered">Bullets</option><option value="ordered">Numbers</option></select></label><p className="setting-note">Edit each item directly in the canvas.</p></section> : null}
      {block.type === "code" ? <section><h2>Code</h2><label><span>Language</span><input value={block.language ?? ""} onChange={(event) => onChange({ ...block, language: event.target.value })} placeholder="javascript" /></label></section> : null}
      {block.type === "image" ? <section><h2>Image</h2><button className="choose-media-button" type="button" onClick={onOpenFiles}>Choose from files</button>{block.mediaId ? <p className="setting-note">This block uses a managed local file.</p> : <label><span>Image URL</span><input type="url" value={block.src} onChange={(event) => onChange({ ...block, src: event.target.value })} placeholder="https://…" /></label>}<label><span>Alternative text</span><input value={block.alt} onChange={(event) => onChange({ ...block, alt: event.target.value })} /></label><label><span>Caption</span><input value={block.caption ?? ""} onChange={(event) => onChange({ ...block, caption: event.target.value })} /></label><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.wide)} onChange={(event) => onChange({ ...block, wide: event.target.checked })} /><span>Wide display</span></label></section> : null}
      {block.type === "embed" ? <section><h2>Embed</h2><label><span>Title</span><input value={block.title} onChange={(event) => onChange({ ...block, title: event.target.value })} /></label><label><span>URL</span><input type="url" value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} /></label></section> : null}
      {block.type === "button" ? <section><h2>Button</h2><label><span>Label</span><input value={block.label} onChange={(event) => onChange({ ...block, label: event.target.value })} /></label><label><span>URL</span><input value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} /></label><label><span>Style</span><select value={block.style} onChange={(event) => onChange({ ...block, style: event.target.value as "primary" | "secondary" })}><option value="primary">Primary</option><option value="secondary">Secondary</option></select></label></section> : null}
      {block.type === "divider" ? <section><p className="setting-note">This divider has no additional settings.</p></section> : null}
    </div>
  );
}
