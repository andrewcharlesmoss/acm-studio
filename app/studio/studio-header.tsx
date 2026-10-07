"use client";
import { StudioIcon } from "./studio-icons";
import { StudioViewMenu, type StudioViewport } from "./studio-view-menu";
import type { StudioDocument } from "./editor-model";

export function StudioHeader({ studioSection, hasContentDocuments, activeDocument, saveLabel, templateSession,
  canRetryEditing, retryEditing, previewWindow, viewViewport, setViewViewport, showTemplate, hasTemplate,
  setShowTemplate, switchStudioMode, publishing, writable, savePageDraft, onExportDocument, siteContext,
}: {
  studioSection: string; hasContentDocuments: boolean; activeDocument: StudioDocument; saveLabel: string;
  templateSession: { saveLabel: string }; canRetryEditing: boolean; retryEditing: () => void;
  previewWindow: boolean; viewViewport: StudioViewport; setViewViewport: (viewport: StudioViewport) => void;
  showTemplate: boolean; hasTemplate: boolean; setShowTemplate: (show: boolean) => void;
  switchStudioMode: (mode: "content") => void; publishing: { publish: () => void };
  siteContext?: { writable: boolean; onSave: () => void };
  writable: boolean; savePageDraft: () => void; onExportDocument: () => void;
}) {
  return (
      <header className="studio-header">
        <a className="studio-brand" href="/"><span>AM</span><strong>ACM Studio</strong></a>
        <div className="studio-breadcrumbs">{siteContext && studioSection === "content" ? <><span>Sites</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>Test</strong></> : studioSection === "templates" ? <><span>Templates</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>Shared presentation</strong></> : studioSection !== "content" ? <><span>Studio</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>{studioSection === "files" ? "Files" : studioSection === "bin" ? "Bin" : "Backup"}</strong></> : hasContentDocuments ? <><span>{activeDocument.kind === "page" ? "Pages" : "Posts"}</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>{activeDocument.title}</strong></> : <><span>Content</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>Empty workspace</strong></>}</div>
        <div className="studio-state"><span className="prototype-pill">LOCAL</span><span aria-live="polite">{studioSection === "templates" ? templateSession.saveLabel : saveLabel}</span>{canRetryEditing ? <button type="button" className="text-button" onClick={retryEditing}>Try Editing Here</button> : null}</div>
        <div className="studio-actions">
          {studioSection === "content" && hasContentDocuments && !previewWindow ? <StudioViewMenu viewport={viewViewport} onViewportChange={setViewViewport} showTemplate={showTemplate} hasTemplate={!siteContext && hasTemplate} onShowTemplateChange={setShowTemplate} onPreviewInNewTab={() => {
            const query = new URLSearchParams(siteContext ? { preview: "1", site: "test", viewport: viewViewport } : { preview: "1", documentId: activeDocument.id, viewport: viewViewport, template: showTemplate ? "1" : "0" });
            window.open(`/studio?${query.toString()}`, "_blank", "noopener,noreferrer");
          }} /> : null}
          {studioSection === "templates" ? (
            <button className="button-secondary" type="button" onClick={() => switchStudioMode("content")}>Content</button>
          ) : studioSection !== "content" ? (
            <button className="button-secondary" type="button" onClick={() => switchStudioMode("content")}>Back to Content</button>
          ) : siteContext ? (<><button className="button-primary" type="button" onClick={siteContext.onSave} disabled={!siteContext.writable || previewWindow}>Save Local Site</button><button className="button-secondary" type="button" onClick={onExportDocument}>Export</button></>) : hasContentDocuments ? activeDocument.kind === "post" ? (
            <>
              {activeDocument.status === "published" ? <a className="button-secondary" href={`/writing/${activeDocument.publishedSlug ?? activeDocument.slug}`}>View post <StudioIcon name="external" size={16} /></a> : null}
              <button className="button-primary" type="button" onClick={publishing.publish} disabled={!writable}>{activeDocument.status === "published" ? "Update" : "Publish"}</button>
            </>
          ) : (
            <>
              <button className="button-primary" type="button" onClick={savePageDraft} disabled={!writable}>Save draft</button>
              <button className="button-secondary" type="button" onClick={() => onExportDocument()}>Export</button>
            </>
          ) : null}
        </div>
      </header>
  );
}
