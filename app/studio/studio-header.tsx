"use client";
import { localFixtureName, type LocalFixtureSiteId } from "./test-site/sites";
import { StudioIcon } from "./studio-icons";
import { StudioViewMenu, type StudioViewport, type StudioViewMode } from "./studio-view-menu";
import type { StudioDocument } from "./editor-model";
import { studioSaveControlState } from "./studio-save-control";

export function StudioHeader({ studioSection, hasContentDocuments, activeDocument, saveLabel, templateSession,
  canRetryEditing, retryEditing, previewWindow, viewViewport, setViewViewport, showTemplate, hasTemplate,
  setShowTemplate, switchStudioMode, publishing, writable, onSaveDocument, onExportDocument, siteContext, viewMode, onViewModeChange,
}: {
  viewMode?: StudioViewMode; onViewModeChange?: (mode: StudioViewMode) => void;
  studioSection: string; hasContentDocuments: boolean; activeDocument: StudioDocument; saveLabel: string;
  templateSession: { saveLabel: string }; canRetryEditing: boolean; retryEditing: () => void;
  previewWindow: boolean; viewViewport: StudioViewport; setViewViewport: (viewport: StudioViewport) => void;
  showTemplate: boolean; hasTemplate: boolean; setShowTemplate: (show: boolean) => void;
  switchStudioMode: (mode: "content") => void; publishing: { publish: () => void };
  siteContext?: { siteId: LocalFixtureSiteId; writable: boolean; onSave: () => void };
  writable: boolean; onSaveDocument: () => void; onExportDocument: () => void;
}) {
  const showSaveControl = studioSection === "content" && hasContentDocuments && !previewWindow;
  const canSave = siteContext ? siteContext.writable : writable;
  const saveUnavailable = studioSaveControlState(saveLabel) === "unavailable";
  return (
      <header className="studio-header">
        <a className="studio-brand" href="/"><span>AM</span><strong>ACM Studio</strong></a>
        <div className="studio-breadcrumbs">{siteContext && studioSection === "content" ? <><span>Sites</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>{localFixtureName(siteContext.siteId)}</strong><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><span>{activeDocument.kind === "page" ? "Pages" : "Posts"}</span><strong>{activeDocument.title}</strong></> : studioSection === "templates" ? <><span>Templates</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>Shared presentation</strong></> : studioSection !== "content" ? <><span>Studio</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>{studioSection === "files" ? "Files" : studioSection === "bin" ? "Bin" : "Backup"}</strong></> : hasContentDocuments ? <><span>{activeDocument.kind === "page" ? "Pages" : "Posts"}</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>{activeDocument.title}</strong></> : <><span>Content</span><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><strong>Empty workspace</strong></>}</div>
        <div className="studio-state"><span className="prototype-pill">LOCAL</span>{!showSaveControl ? <span aria-live="polite">{studioSection === "templates" ? templateSession.saveLabel : saveLabel}</span> : null}{canRetryEditing ? <button type="button" className="text-button" onClick={retryEditing}>Try Editing Here</button> : null}</div>
        <div className="studio-actions">
          {studioSection === "content" && hasContentDocuments && !previewWindow ? <StudioViewMenu viewMode={viewMode} onViewModeChange={onViewModeChange} viewport={viewViewport} onViewportChange={setViewViewport} showTemplate={showTemplate} hasTemplate={hasTemplate} onShowTemplateChange={setShowTemplate} onPreviewInNewTab={() => {
            const query = new URLSearchParams(siteContext ? { preview: "1", site: siteContext.siteId, documentId: activeDocument.id, viewport: viewViewport, template: showTemplate ? "1" : "0" } : { preview: "1", documentId: activeDocument.id, viewport: viewViewport, template: showTemplate ? "1" : "0" });
            window.open(`/studio?${query.toString()}`, "_blank", "noopener,noreferrer");
          }} /> : null}
          {studioSection === "templates" ? (
            <button className="button-secondary" type="button" onClick={() => switchStudioMode("content")}>Content</button>
          ) : studioSection !== "content" ? (
            <button className="button-secondary" type="button" onClick={() => switchStudioMode("content")}>Back to Content</button>
          ) : siteContext ? (<><button className="button-secondary" type="button" onClick={onExportDocument}>Export</button><StudioSaveControl saveLabel={saveLabel} writable={canSave && !previewWindow} unavailable={saveUnavailable} onSave={siteContext.onSave} /></>) : hasContentDocuments ? activeDocument.kind === "post" ? (
            <>
              {activeDocument.status === "published" ? <a className="button-secondary" href={`/writing/${activeDocument.publishedSlug ?? activeDocument.slug}`}>View post <StudioIcon name="external" size={16} /></a> : null}
              <button className="button-primary" type="button" onClick={publishing.publish} disabled={!writable}>{activeDocument.status === "published" ? "Update" : "Publish"}</button>
              <StudioSaveControl saveLabel={saveLabel} writable={canSave} unavailable={saveUnavailable} onSave={onSaveDocument} />
            </>
          ) : (
            <>
              <button className="button-secondary" type="button" onClick={() => onExportDocument()}>Export</button>
              <StudioSaveControl saveLabel={saveLabel} writable={canSave} unavailable={saveUnavailable} onSave={onSaveDocument} />
            </>
          ) : null}
        </div>
      </header>
  );
}

function StudioSaveControl({ saveLabel, writable, unavailable, onSave }: { saveLabel: string; writable: boolean; unavailable: boolean; onSave: () => void }) {
  const saving = saveLabel === "Saving…" || saveLabel === "Saving";
  return (
    <div className="studio-save-group">
      <span className="studio-save-status" aria-live="polite">{saveLabel}</span>
      <button className="button-primary studio-save-button" type="button" title="Save (⌘S / Ctrl+S)" aria-keyshortcuts="Meta+s Control+s" disabled={!writable || unavailable || saving} onClick={onSave}>Save</button>
    </div>
  );
}
