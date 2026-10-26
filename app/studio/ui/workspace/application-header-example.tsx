"use client";

import { useSyncExternalStore, useState } from "react";
import { SavingRecoveryNotice } from "../../controls/saving-recovery-notice";
import { StudioHeader } from "../../studio-header";
import { DashboardApplicationHeader, DesignApplicationHeader, LibraryApplicationHeader, SiteEditorApplicationHeader } from "../../application-section-headers";
import { FocusPreferenceContext, type FocusMode } from "../../focus-outline-context";
import { ResponsiveStyleProvider } from "../../responsive-style-context";
import { createWorkspacePreviewDocument } from "../../editor-model";
import type { StudioViewport } from "../../studio-view-menu";
import { SelectControl } from "../../controls/native-fields";
import { StudioIcon } from "../../studio-icons";

export const applicationHeaderExample = {
  title: "Application header",
  purpose: "Shared ACM Studio identity with section-owned breadcrumbs, status, and actions.",
  owner: "ACM Studio application chrome",
  consumers: "Dashboard, content and template editors, Files, Backup, Site Editor, Design Canvas, Design Library, and UI Library",
  dependencies: "StudioHeader, production section headers and SavingRecoveryNotice; temporary commands and context providers replace persistence and navigation owners.",
  href: "/studio/ui/workspace#application-header",
};

const examples = {
  content: "Content Studio",
  templates: "Templates",
  files: "Files",
  bin: "Bin",
  backup: "Backup",
  siteEditor: "Site Editor",
  library: "Studio UI Library",
  designs: "Design Canvas",
  designLibrary: "Design Library",
  dashboard: "Control Centre",
} as const;
type ExampleId = keyof typeof examples;
type Scenario = "published" | "draft" | "synced" | "readonly" | "editing" | "paused";

/** Production presentation with temporary commands, focus preferences and viewport state. */
export function ApplicationHeaderSpecimen() {
  const ready = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [exampleId, setExampleId] = useState<ExampleId>("content");
  const [scenario, setScenario] = useState<Scenario>("published");
  const [width, setWidth] = useState("full");
  const [message, setMessage] = useState("");
  const [focusMode, setFocusMode] = useState<FocusMode>("keyboard");
  const [viewport, setViewport] = useState<StudioViewport>("desktop");
  const [showTemplate, setShowTemplate] = useState(true);
  const [revision, setRevision] = useState(0);
  const document = { ...createWorkspacePreviewDocument("page"), title: "Example page", slug: "example-page", status: scenario === "draft" || scenario === "synced" ? "draft" as const : "published" as const };
  const announce = (action: string) => setMessage(`${action} completed in this example only.`);
  function reset() {
    setExampleId("content"); setScenario("published"); setWidth("full"); setMessage("");
    setFocusMode("keyboard"); setViewport("desktop"); setShowTemplate(true); setRevision(value => value + 1);
  }
  const editorSection = exampleId === "content" || exampleId === "templates" || exampleId === "files" || exampleId === "backup" || exampleId === "bin";

  return <div className="ui-application-header-example" data-ready={ready}>
    <div className="ui-workspace-tools">
      <label>Section <SelectControl aria-label="Header example section" value={exampleId} onChange={event => { setExampleId(event.target.value as ExampleId); if (scenario === "paused") setScenario("published"); setMessage(""); setRevision(value => value + 1); }}>{Object.entries(examples).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</SelectControl></label>
      <label>Scenario <SelectControl aria-label="Header example scenario" value={scenario} onChange={event => { setScenario(event.target.value as Scenario); setMessage(""); setRevision(value => value + 1); }}>{exampleId === "siteEditor" ? <option value="paused">Saving paused</option> : null}<option value="published">Published</option><option value="draft">Draft</option><option value="synced">Synced Test tab</option><option value="readonly">Read-only</option><option value="editing">Editing page</option></SelectControl></label>
      <label>Width <SelectControl aria-label="Header example width" value={width} onChange={event => setWidth(event.target.value)}><option value="full">Available width</option><option value="768">768px</option><option value="390">390px</option></SelectControl></label>
      <button type="button" className="ui-control-reset" onClick={reset}><StudioIcon name="rotate" size={18} />Reset example</button>
    </div>
    <div className="ui-application-header-surface" style={{ width: width === "full" ? "100%" : `${width}px`, maxWidth: "100%" }} onAuxClickCapture={event => {
      if ((event.target as HTMLElement).closest("a")) event.preventDefault();
    }} onClickCapture={event => {
      const link = (event.target as HTMLElement).closest("a");
      if (link) { event.preventDefault(); setMessage(`${link.textContent?.trim() || "ACM Studio home"} selected in this example.`); }
    }}>
      <FocusPreferenceContext.Provider value={{ mode: focusMode, setMode: setFocusMode, status: "" }}>
        <ResponsiveStyleProvider key={revision} viewport={viewport}>
          {editorSection ? <StudioHeader
            studioSection={exampleId} libraryKind={exampleId === "templates" ? "templates" : "page"}
            hasContentDocuments activeDocument={document} templateTargetName="Header"
            saveLabel={scenario === "synced" ? "Synced with another Test tab" : scenario === "readonly" ? "Read-only" : "Saved locally"}
            templateSession={{ saveLabel: "Global templates saved locally" }}
            writable={scenario !== "readonly"} canRetryEditing={scenario === "readonly"}
            retryEditing={() => { setScenario("published"); announce("Try Editing Here"); }}
            previewWindow={false} viewViewport={viewport} setViewViewport={setViewport}
            templateViewport={viewport} onTemplateViewportChange={setViewport}
            showTemplate={showTemplate} hasTemplate setShowTemplate={setShowTemplate}
            onPreviewInNewTab={() => announce("Preview in new tab")}
            onBreadcrumbNavigate={target => announce(`Navigate to ${target}`)}
            switchStudioMode={() => { setExampleId("content"); announce("Content"); }}
            publishing={{ publish: () => { setScenario("published"); announce("Publish"); } }}
            onSaveDocument={() => announce(document.status === "draft" ? "Save Draft" : "Save")}
            siteContext={scenario === "synced" ? { siteId: "test", writable: true, publishing: false, onSave: () => announce("Save Draft"), onPublish: () => { setScenario("published"); announce("Publish"); } } : undefined}
          /> : exampleId === "siteEditor" ? <SiteEditorApplicationHeader scopeLabel="Test" saveFailure={scenario === "paused"} retryLabel="Retry Save" onRetry={() => { setScenario("published"); announce("Retry Save"); }} onReturnToPreview={scenario === "editing" ? () => { setScenario("published"); announce("Return to Preview"); } : undefined} draftPreview={scenario === "draft"} saveStatus={scenario === "paused" ? "Saving paused" : "Saved locally"} viewport={viewport} onViewportChange={setViewport}
            showTemplate={showTemplate} hasTemplate onShowTemplateChange={next => { setShowTemplate(next); announce(next ? "Show template" : "Hide template"); }}
            onPreviewInNewTab={scenario === "draft" ? undefined : () => announce("Preview in new tab")} previewInNewTabDisabled={scenario === "draft"} viewPageAction={scenario === "draft" ? undefined : <button className="button-secondary studio-header-action is-icon-only" type="button" aria-label="View page" title="View page" onClick={() => announce("View page")}><StudioIcon name="external" size={20} /></button>} />
            : exampleId === "library" ? <LibraryApplicationHeader />
            : exampleId === "dashboard" ? <DashboardApplicationHeader /> : <DesignApplicationHeader section={exampleId === "designLibrary" ? "Design Library" : "Design Canvas"} />}
          {exampleId === "siteEditor" && scenario === "paused" ? <SavingRecoveryNotice message="Test sync is paused while its saving tab is unavailable. Your draft remains in this tab." onExportDraft={() => announce("Export Draft")} onReconnect={() => { setScenario("published"); announce("Reconnect"); }} /> : null}
        </ResponsiveStyleProvider>
      </FocusPreferenceContext.Provider>
    </div>
    <p role="status">{message || "Temporary example — navigation and actions stay here."}</p>
  </div>;
}

export function ApplicationHeaderExample() {
  return <section id="application-header" className="ui-control-entry ui-workspace-example" aria-labelledby="application-header-title">
    <header className="ui-control-entry-header"><div><p className="rl-eyebrow">Workspace example</p><h2 id="application-header-title">{applicationHeaderExample.title}</h2><p>{applicationHeaderExample.purpose}</p></div></header>
    <div className="ui-control-detail-card"><div className="ui-control-detail-example is-wide"><ApplicationHeaderSpecimen /></div></div>
    <p>Change sections or document scenarios, follow a breadcrumb, try an action, or narrow the preview. The production header supplies its layout, typography, wrapping, and focus behaviour. Website Header and Navigation templates remain separate.</p>
  </section>;
}
