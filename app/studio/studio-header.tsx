"use client";
import { StudioAppHeader } from "./studio-app-header";
import type { MouseEvent } from "react";
import { studioContextPath, type StudioLibraryKind } from "./use-studio-screen-navigation";
import { localFixtureName, type LocalFixtureSiteId } from "./test-site/sites";
import { StudioIcon } from "./studio-icons";
import { StudioViewMenu, type StudioViewport } from "./studio-view-menu";
import type { StudioDocument } from "./editor-model";
import { StudioButton } from "./controls/button";
import { localPublicationHref } from "../content/publication-address";
import { studioSaveControlState } from "./studio-save-control";
import { ProjectLocalDocumentLink } from "./project-local-links";
import { testDocumentHref } from "./test-site/contract";

export type StudioBreadcrumbTarget = "sites" | "site" | "content" | StudioLibraryKind;

export function StudioHeader({ studioSection, hasContentDocuments, activeDocument, saveLabel, templateSession,
  canRetryEditing, retryEditing, previewWindow, viewViewport, setViewViewport, showTemplate, hasTemplate,
  setShowTemplate, switchStudioMode, publishing, writable, onSaveDocument, siteContext, templateViewport = "desktop", onTemplateViewportChange, onBreadcrumbNavigate, libraryKind, templateTargetName, onPreviewInNewTab,
}: {
  templateTargetName?: string;
  onPreviewInNewTab?: () => void;
  libraryKind?: StudioLibraryKind;
  onBreadcrumbNavigate?: (target: StudioBreadcrumbTarget) => void;
  templateViewport?: StudioViewport; onTemplateViewportChange?: (viewport: StudioViewport) => void;
  studioSection: string; hasContentDocuments: boolean; activeDocument: StudioDocument; saveLabel: string;
  templateSession: { saveLabel: string }; canRetryEditing: boolean; retryEditing: () => void;
  previewWindow: boolean; viewViewport: StudioViewport; setViewViewport: (viewport: StudioViewport) => void;
  showTemplate: boolean; hasTemplate: boolean; setShowTemplate: (show: boolean) => void;
  switchStudioMode: (mode: "content") => void; publishing: { publish: () => void };
  siteContext?: { siteId: LocalFixtureSiteId; writable: boolean; onSave: () => void; onPublish: () => void; publishing: boolean };
  writable: boolean; onSaveDocument: () => void;
}) {
  const showSaveControl = studioSection === "content" && hasContentDocuments && !previewWindow;
  const canSave = siteContext ? siteContext.writable : writable;
  const draft = activeDocument.status !== "published";
  const saveUnavailable = studioSaveControlState(saveLabel) === "unavailable";
  const tabSyncMessage = studioSection === "templates" && templateSession.saveLabel !== saveLabel && siteContext && saveLabel.startsWith("Synced with another ") ? saveLabel : null;
  return (
      <StudioAppHeader section={studioSection === "content" ? "Content Studio" : studioSection === "templates" ? "Templates" : studioSection === "files" ? "Files" : studioSection === "bin" ? "Bin" : "Backup"}>
        <StudioBreadcrumbs templateTargetName={templateTargetName} libraryKind={libraryKind} studioSection={studioSection} hasContentDocuments={hasContentDocuments} activeDocument={activeDocument} siteId={siteContext?.siteId} previewWindow={previewWindow} onNavigate={onBreadcrumbNavigate} />
        <div className="studio-state">{tabSyncMessage ? <span className="studio-sync-status" aria-live="polite">{tabSyncMessage}</span> : null}<span className="prototype-pill">Local</span>{!showSaveControl ? <span aria-live="polite">{studioSection === "templates" ? templateSession.saveLabel : saveLabel}</span> : null}{canRetryEditing ? <button type="button" className="text-button" onClick={retryEditing}>Try Editing Here</button> : null}</div>
        <div className="studio-actions">
          {studioSection === "templates" ? <StudioViewMenu viewport={templateViewport} onViewportChange={onTemplateViewportChange} /> : null}
          {studioSection === "content" && hasContentDocuments && !previewWindow ? <StudioViewMenu viewport={viewViewport} onViewportChange={setViewViewport} showTemplate={showTemplate} hasTemplate={hasTemplate} onShowTemplateChange={setShowTemplate} onPreviewInNewTab={onPreviewInNewTab ?? (() => {
            const query = new URLSearchParams(siteContext ? { preview: "1", site: siteContext.siteId, documentId: activeDocument.id, viewport: viewViewport, template: showTemplate ? "1" : "0" } : { preview: "1", documentId: activeDocument.id, viewport: viewViewport, template: showTemplate ? "1" : "0" });
            window.open(`/studio?${query.toString()}`, "_blank", "noopener,noreferrer");
          })} /> : null}
          {studioSection === "templates" ? (
            <button className="button-secondary" type="button" onClick={() => switchStudioMode("content")}>Content</button>
          ) : studioSection !== "content" ? (
            <button className="button-secondary" type="button" onClick={() => switchStudioMode("content")}>Back to Content</button>
          ) : hasContentDocuments ? (
            <>
              {siteContext && activeDocument.kind === "page" && activeDocument.status === "published" ? <ProjectLocalDocumentLink siteId={siteContext.siteId} destination={testDocumentHref(activeDocument.id)} label="View page" className="button-secondary studio-header-action" iconOnly /> : null}
              {!siteContext && activeDocument.kind !== "page" && activeDocument.status === "published" ? <a className="button-secondary" href={localPublicationHref({ ...activeDocument, slug: activeDocument.publishedSlug ?? activeDocument.slug })}>View post <StudioIcon name="external" size={16} /></a> : null}
              {!siteContext && activeDocument.kind === "page" && activeDocument.status === "published" ? <a className="button-secondary" href={localPublicationHref({ ...activeDocument, slug: activeDocument.publishedSlug ?? activeDocument.slug })}>View page <StudioIcon name="external" size={16} /></a> : null}
              <StudioSaveControl draft={draft} saveLabel={saveLabel} writable={canSave && !previewWindow && !siteContext?.publishing} unavailable={saveUnavailable} onSave={siteContext?.onSave ?? onSaveDocument} />
              {draft ? <StudioButton className="studio-header-action" type="button" onClick={siteContext?.onPublish ?? publishing.publish} disabled={!canSave || previewWindow || saveUnavailable || Boolean(siteContext?.publishing)}>{siteContext?.publishing ? "Publishing…" : siteContext ? (activeDocument.status === "scheduled" ? "Schedule" : activeDocument.status === "private" ? "Save private" : "Publish") : activeDocument.status === "scheduled" ? "Schedule" : "Publish"}</StudioButton> : null}
            </>
          ) : null}
        </div>
      </StudioAppHeader>
  );
}

function StudioSaveControl({ draft, saveLabel, writable, unavailable, onSave }: { draft: boolean; saveLabel: string; writable: boolean; unavailable: boolean; onSave: () => void }) {
  const action = draft ? "Save Draft" : "Save";
  const saving = saveLabel === "Saving…" || saveLabel === "Saving";
  return (
    <div className="studio-save-group">
      <span className="studio-save-status" aria-live="polite">{saveLabel}</span>
      <StudioButton variant={draft ? "text" : "base"} className="studio-save-button studio-header-action" type="button" title={`${action} (⌘S / Ctrl+S)`} aria-keyshortcuts="Meta+s Control+s" disabled={!writable || unavailable || saving} onClick={onSave}>{saving ? "Saving…" : action}</StudioButton>
    </div>
  );
}


export function StudioBreadcrumbs({ studioSection, hasContentDocuments, activeDocument, siteId, previewWindow, onNavigate, libraryKind = activeDocument.kind, templateTargetName }: {
  templateTargetName?: string;
  studioSection: string; hasContentDocuments: boolean; activeDocument: Pick<StudioDocument, "kind" | "title">;
  libraryKind?: StudioLibraryKind;
  siteId?: LocalFixtureSiteId; previewWindow: boolean; onNavigate?: (target: StudioBreadcrumbTarget) => void;
}) {
  const contentKind = libraryKind === "templates" ? activeDocument.kind : libraryKind;
  const collection = activeDocument.kind === "page" ? "Pages" : "Posts";
  const items: { label: string; href?: string; target?: StudioBreadcrumbTarget }[] =
    siteId && studioSection === "content" ? [
      { label: "Sites", href: "/", target: "sites" },
      { label: localFixtureName(siteId), href: studioContextPath(siteId, contentKind), target: "site" },
      { label: collection, href: studioContextPath(siteId, activeDocument.kind), target: activeDocument.kind },
      { label: activeDocument.title },
    ] : studioSection === "templates" ? [
      { label: "Templates", href: studioContextPath(siteId ?? null, "templates"), target: "templates" },
      { label: templateTargetName ?? "Template Library" },
    ] : studioSection !== "content" ? [
      { label: "Studio", href: studioContextPath(siteId ?? null, contentKind), target: "content" },
      { label: studioSection === "files" ? "Files" : studioSection === "bin" ? "Bin" : "Backup" },
    ] : hasContentDocuments ? [
      { label: collection, href: studioContextPath(null, activeDocument.kind), target: activeDocument.kind },
      { label: activeDocument.title },
    ] : [
      { label: "Content", href: studioContextPath(null, contentKind), target: "content" },
      { label: "Empty workspace" },
    ];
  function activate(event: MouseEvent<HTMLAnchorElement>, target: StudioBreadcrumbTarget) {
    if (previewWindow || !onNavigate || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    onNavigate(target);
  }
  return <nav className="studio-breadcrumbs" aria-label="Breadcrumb"><ol className="studio-breadcrumb-list">
    {items.map((item, index) => <li key={`${item.target ?? "current"}-${index}`}>
      {index > 0 ? <StudioIcon name="chevron-right" size={14} aria-hidden="true" /> : null}
      {item.href && item.target ? <a href={item.href} onClick={event => activate(event, item.target!)}>{item.label}</a> : <strong aria-current="page">{item.label}</strong>}
    </li>)}
  </ol></nav>;
}
