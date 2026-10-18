"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { BlockRenderer } from "../../components/content";
import { AcmIcon } from "@acm/icons/react";
import { TwoLeftPaneWorkspace } from "../panes/two-left-pane-workspace";
import { Pane } from "../panes/pane-components";
import { SelectControl, TextInput } from "../controls/native-fields";
import { StudioIcon } from "../studio-icons";
import { StudioAppHeader } from "../studio-app-header";
import { StudioButton } from "../controls/button";
import { useBlobUrls } from "../controls/use-blob-urls";
import { IdentityImagePicker } from "./identity-image-picker";
import { HistoryActions } from "../controls/history-actions";
import { handleStudioHistoryShortcut } from "../studio-history-shortcuts.mjs";
import { createIdentityPreview, identityPreviewReducer, type PreviewScope, type SiteIdentity } from "./identity-preview-state";
import "./site-editor-preview.css";

const scopes = [{ id: "global", name: "Global Defaults" }, { id: "test", name: "Test" }, { id: "test2", name: "Test 2" }] as const;
export function SiteEditorPreview() {
  const [navigationWidth, setNavigationWidth] = useState(240);
  const [settingsWidth, setSettingsWidth] = useState(280);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useState<PreviewScope>("test");
  const [history, dispatch] = useReducer(identityPreviewReducer, undefined, createIdentityPreview);
  const [picker, setPicker] = useState<{ site: "test" | "test2"; field: "logo" | "icon"; opener: HTMLElement } | null>(null);
  useEffect(() => {
    const root = rootRef.current;
    const listener = (event: KeyboardEvent) => handleStudioHistoryShortcut(event, navigator.platform, () => { dispatch({ type: "undo" }); }, () => { dispatch({ type: "redo" }); });
    root?.addEventListener("keydown", listener);
    return () => root?.removeEventListener("keydown", listener);
  }, []);
  const name = scopes.find(item => item.id === scope)!.name;
  const identity = scope === "global" ? null : history.present[scope];
  const images = useMemo(() => [identity?.logo, identity?.icon].filter((image): image is NonNullable<typeof image> => Boolean(image)), [identity?.logo, identity?.icon]);
  const imageUrls = useBlobUrls(images);
  function change(patch: Partial<SiteIdentity>) { if (scope !== "global") dispatch({ type: "change", site: scope, patch }); }
  function travel(type: "undo" | "redo") { dispatch({ type }); }
  return <div className="site-editor-preview" ref={rootRef}>
    <StudioAppHeader section="Site Editor"><span className="prototype-pill">Preview</span><a href="/studio">Back to Studio</a></StudioAppHeader>
    <div className="studio-notice" role="note"><strong>Preview only.</strong> Changes last until you leave or reload this page. Existing sites, content, templates, and saved styles are unaffected.</div>
    <main>
    <TwoLeftPaneWorkspace className="site-editor-preview-layout" label="Site Editor workspace" primary={

      <Pane label="Site Editor Navigation" side="left" width={navigationWidth} minWidth={220} maxWidth={360} onWidthChange={setNavigationWidth} collapsed={navigationCollapsed} onCollapsedChange={setNavigationCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} header={<h2>Design</h2>}>
        <label className="site-editor-preview-scope"><span>Design Scope</span><SelectControl value={scope} onChange={event => { setScope(event.currentTarget.value as PreviewScope); }}>{scopes.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</SelectControl></label>
        <p>Explore the appearance of {scope === "global" ? "all sites" : name}.</p>
        <nav className="library-tools" aria-label="Site design sections">
          {([
            { label: "Identity", icon: "account.record", siteOnly: true },
            { label: "Styles", icon: "view.styles", siteOnly: false },
            { label: "Pages", icon: "view.pages", siteOnly: true },
            { label: "Navigation", icon: "navigation.menu", siteOnly: true },
            { label: "Patterns", icon: "component.block", siteOnly: false },
            { label: "Templates", icon: "document.from-template", siteOnly: false },
          ] as const).map(item => <button type="button" key={item.label} className={`library-tool-button${item.label === "Identity" ? " is-active" : ""}`} aria-current={item.label === "Identity" ? "page" : undefined} disabled={item.label !== "Identity"}>
            <span><AcmIcon name={item.icon} scale="Regular-M" size={24} /></span><strong>{item.label}</strong><small>{item.label === "Identity" ? "Site title, tagline, and images" : scope === "global" && item.siteOnly ? "Select a site · Coming Soon" : "Coming Soon"}</small>
          </button>)}
        </nav>
      </Pane>} secondary={
      <Pane label="Site Editor Identity" side="left" width={settingsWidth} minWidth={240} maxWidth={420} onWidthChange={setSettingsWidth} collapsed={settingsCollapsed} onCollapsedChange={setSettingsCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} header={<h2>Identity</h2>}>
        <div className="site-editor-preview-settings">
          {identity ? <><p>Editing: <strong>{name}</strong></p><p>Sample identity only; saved site settings are unchanged.</p>
            <label htmlFor="site-identity-title"><span>Site Title</span><TextInput id="site-identity-title" maxLength={200} value={identity.title} onChange={event => change({ title: event.currentTarget.value })} /></label><p>Shown in the sample website header.</p>
            <label htmlFor="site-identity-tagline"><span>Tagline</span><TextInput id="site-identity-tagline" maxLength={500} value={identity.tagline} onChange={event => change({ tagline: event.currentTarget.value })} /></label><p>A short description of the site.</p>
            {(["logo", "icon"] as const).map(field => <section className="site-identity-image-setting" key={field} aria-label={field === "logo" ? "Site Logo" : "Site Icon"}><h3>{field === "logo" ? "Site Logo" : "Site Icon"}</h3>
              {/* Existing Files bytes stay in memory; useBlobUrls owns preview URL lifetimes. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {identity[field] && imageUrls[identity[field].id] ? <img src={imageUrls[identity[field].id]} alt={`${field === "logo" ? "Logo" : "Icon"} preview`} /> : <p>No {field} selected.</p>}
              <div className="site-identity-image-actions"><StudioButton variant="secondary" onClick={event => { if (scope !== "global") setPicker({ site: scope, field, opener: event.currentTarget }); }}>{`${identity[field] ? "Replace" : "Choose"} ${field === "logo" ? "Logo" : "Icon"}`}</StudioButton>{identity[field] ? <StudioButton variant="text" onClick={() => change({ [field]: undefined })}>{`Remove ${field === "logo" ? "Logo" : "Icon"}`}</StudioButton> : null}</div>
              <p>{field === "logo" ? "Shown in the sample website header." : "Shown in the sample browser tab, without changing Studio’s actual tab icon."}</p>
            </section>)}
          </> : <><h2>Select a site</h2><p>Identity belongs to each site. Choose Test or Test 2 to try its title, tagline, logo, and icon. Global style defaults will return later.</p></>}
        </div>
      </Pane>}>
      <section className="site-editor-preview-book" aria-labelledby="site-editor-preview-title"><header><div><p>Website Preview</p><h1 id="site-editor-preview-title">{name}</h1></div><div className="site-editor-preview-history"><HistoryActions canUndo={history.past.length > 0} canRedo={history.future.length > 0} onUndo={() => travel("undo")} onRedo={() => travel("redo")} /></div></header>
        {identity ? <div className="site-identity-page"><div className="site-identity-browser-tab" aria-label="Sample browser tab">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {identity.icon && imageUrls[identity.icon.id] ? <img src={imageUrls[identity.icon.id]} alt="Site icon" /> : null}<span>{identity.title || "Untitled site"}</span></div>
          <div className="site-identity-page-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {identity.logo && imageUrls[identity.logo.id] ? <img src={imageUrls[identity.logo.id]} alt={identity.logo.altText || identity.title || "Site logo"} /> : null}
            <div><h2>{identity.title || "Untitled site"}</h2>{identity.tagline ? <p>{identity.tagline}</p> : null}</div>
          </div><BlockRenderer variant="studio" blocks={[{ id: "identity-preview-body", type: "paragraph", text: "This sample page shows your identity changes as you make them. Your existing sites and templates stay unchanged." }]} />
        </div> : <p>Select a site to preview its identity.</p>}
      </section>

    </TwoLeftPaneWorkspace>
    </main>
    {picker ? <IdentityImagePicker title={`Choose ${picker.field === "logo" ? "Logo" : "Icon"}`} opener={picker.opener} onClose={() => setPicker(null)} onChoose={image => { dispatch({ type: "change", site: picker.site, patch: { [picker.field]: image } }); setPicker(null); }} /> : null}
  </div>;
}
