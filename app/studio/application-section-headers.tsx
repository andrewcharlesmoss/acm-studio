"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { StudioAppHeader } from "./studio-app-header";
import { StudioFocusOutlineSetting } from "./focus-outline-preferences";
import { StudioIcon } from "./studio-icons";
import { StudioViewMenu, type StudioViewport } from "./studio-view-menu";

/** Section chrome owns presentation; hosts keep departure, saving and other commands. */
export function SiteEditorApplicationHeader({ scopeLabel, saveStatus, draftPreview = false, saveFailure = false, onRetry, viewport, onViewportChange, showTemplate, hasTemplate, onShowTemplateChange, onPreviewInNewTab, previewInNewTabDisabled, viewPageAction, onReturnToPreview }: {
	scopeLabel: string;
  saveStatus: string;
  draftPreview?: boolean;
  saveFailure?: boolean;
  onRetry?: () => void;
  viewport: StudioViewport;
  onViewportChange: (viewport: StudioViewport) => void;
  showTemplate: boolean;
  hasTemplate: boolean;
  onShowTemplateChange: (show: boolean) => void;
  onPreviewInNewTab?: () => void;
  previewInNewTabDisabled?: boolean;
  viewPageAction?: ReactNode;
  onReturnToPreview?: () => unknown | Promise<unknown>;
}) {
  const [returning, setReturning] = useState(false);
  const backLink = useRef<HTMLAnchorElement>(null);
  const returnFocused = useRef(false);
  useEffect(() => {
    if (!onReturnToPreview && returnFocused.current) { backLink.current?.focus(); returnFocused.current = false; }
  }, [onReturnToPreview]);
  return <StudioAppHeader section="Site Editor" className="site-editor-app-header">
    <div className="site-editor-header-scope" role="group" aria-label="Current design scope">{scopeLabel}</div>
    <div className="site-editor-header-controls">
      <div className="studio-state">{onReturnToPreview ? <button type="button" className="text-button" onFocus={() => { returnFocused.current = true; }} onBlur={event => { if (!returning || event.relatedTarget) returnFocused.current = false; }} disabled={returning} onClick={async () => { setReturning(true); try { await onReturnToPreview(); } finally { setReturning(false); } }}>Return to Preview</button> : <a ref={backLink} href="/studio" data-studio-departure>Back to Studio</a>}<span className="prototype-pill">Local</span></div>
      <div className="studio-actions">
        <StudioViewMenu viewport={viewport} onViewportChange={onViewportChange} showTemplate={showTemplate} hasTemplate={hasTemplate} onShowTemplateChange={onShowTemplateChange} showTemplateUnavailableMessage="Select a site to preview its template." responsiveStylesUnavailableMessage="Use Styles → Blocks for device-specific style changes." onPreviewInNewTab={onPreviewInNewTab} previewInNewTabDisabled={previewInNewTabDisabled} />
        {viewPageAction}
        <div className="studio-save-group" role={saveFailure ? "alert" : "status"} aria-live={saveFailure ? "assertive" : "polite"}>
          {draftPreview ? <span className="studio-save-status" title="This page has not been published.">Draft preview</span> : null}
          <span className="studio-save-status">{saveStatus}</span>
          {saveFailure && onRetry ? <button type="button" className="text-button" onClick={onRetry}>Reload Settings</button> : null}
        </div>
      </div>
    </div>
  </StudioAppHeader>;
}

export function DesignApplicationHeader({ section }: { section: "Design Canvas" | "Design Library" }) {
	return <StudioAppHeader section={section} className="design-topbar"><span className="design-environment" aria-label="Environment: local">Local</span></StudioAppHeader>;
}

export function LibraryApplicationHeader({ actions }: { actions?: ReactNode }) {
  return <StudioAppHeader section="Studio UI Library">
    <a className="studio-app-back" href="/studio" aria-label="Back to Studio"><StudioIcon name="arrow-left" size={20} />Back to Studio</a>
    <StudioFocusOutlineSetting />
    {actions ? <div className="ui-library-header-actions">{actions}</div> : null}
  </StudioAppHeader>;
}

export function DashboardApplicationHeader() {
  return <StudioAppHeader section="Control Centre">
    <div className="studio-state"><span className="prototype-pill">Local</span><span>Browser storage only</span></div>
    <div className="studio-actions"><a className="button-secondary" href="https://andrewmoss.me/">View Andrew Moss <StudioIcon name="external" size={16} /></a><a className="button-primary" href="/studio">Open Studio</a></div>
  </StudioAppHeader>;
}
