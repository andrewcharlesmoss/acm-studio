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
import { sampleBrowserTabTitle, websiteHeaderTitle } from "./identity-preview-presentation";
import { StylesPreviewMenu } from "./styles-preview-menu";
import "./site-editor-preview.css";

const scopes = [{ id: "global", name: "Global Defaults" }, { id: "test", name: "Test" }, { id: "test2", name: "Test 2" }] as const;
export function SiteEditorPreview() {
  const [navigationWidth, setNavigationWidth] = useState(240);
  const [settingsWidth, setSettingsWidth] = useState(280);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useState<PreviewScope>("test");
  const [section, setSection] = useState<"Identity" | "Styles">("Identity");
  const [history, dispatch] = useReducer(identityPreviewReducer, undefined, createIdentityPreview);
  const [picker, setPicker] = useState<{ site: PreviewScope; field: "logo" | "icon"; opener: HTMLElement } | null>(null);
  useEffect(() => {
    const root = rootRef.current;
    const listener = (event: KeyboardEvent) => handleStudioHistoryShortcut(event, navigator.platform, () => { dispatch({ type: "undo" }); }, () => { dispatch({ type: "redo" }); });
    root?.addEventListener("keydown", listener);
    return () => root?.removeEventListener("keydown", listener);
  }, []);
  const name = scopes.find(item => item.id === scope)!.name;
  const identity = history.present[scope];
  const headerTitle = websiteHeaderTitle(identity.title);
  const browserTabTitle = sampleBrowserTabTitle(identity.title);
  const images = useMemo(() => [identity?.logo, identity?.icon].filter((image): image is NonNullable<typeof image> => Boolean(image)), [identity?.logo, identity?.icon]);
  const imageUrls = useBlobUrls(images);
  function change(patch: Partial<SiteIdentity>) { dispatch({ type: "change", site: scope, patch }); }
  function travel(type: "undo" | "redo") { dispatch({ type }); }
  return <div className="site-editor-preview" ref={rootRef}>
    <StudioAppHeader section="Site Editor"><span className="prototype-pill">Preview</span><a href="/studio">Back to Studio</a></StudioAppHeader>
    <div className="studio-notice" role="note"><strong>Preview only.</strong> Changes last until you leave or reload this page. Existing sites, content, templates, and saved styles are unaffected.</div>
    <main>
    <TwoLeftPaneWorkspace className="site-editor-preview-layout" label="Site Editor workspace" primary={

      <Pane label="Site Editor Navigation" side="left" width={navigationWidth} minWidth={220} maxWidth={360} onWidthChange={setNavigationWidth} collapsed={navigationCollapsed} onCollapsedChange={setNavigationCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} header={<h2>Design</h2>}>
        <label className="site-editor-preview-scope"><span>Design Scope</span><SelectControl value={scope} onChange={event => { setScope(event.currentTarget.value as PreviewScope); }}>{scopes.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</SelectControl></label>
        <p>{scope === "global" ? "Explore the appearance of all sites. Generic identity values are not inherited." : `Explore the appearance of ${name}.`}</p>
        <nav className="library-tools" aria-label="Site design sections">
          {([
            { label: "Identity", icon: "site.identity", siteOnly: false },
            { label: "Styles", icon: "view.styles", siteOnly: false },
            { label: "Pages", icon: "view.single", siteOnly: true },
            { label: "Navigation", icon: "navigation.compass", siteOnly: true },
            { label: "Patterns", icon: "symbol.outline", siteOnly: false },
            { label: "Templates", icon: "layout.template", siteOnly: false },
          ] as const).map(item => <button type="button" key={item.label} className={`library-tool-button${item.label === section ? " is-active" : ""}`} aria-current={item.label === section ? "page" : undefined} disabled={item.label !== "Identity" && item.label !== "Styles"} onClick={() => { if (item.label === "Identity" || item.label === "Styles") setSection(item.label); }}>
            <span><AcmIcon name={item.icon} scale="Regular-M" size={24} /></span><strong>{item.label}</strong><small>{item.label === "Identity" ? "Site title, tagline, and images" : item.label === "Styles" ? "Menu Preview" : scope === "global" && item.siteOnly ? "Select a site · Coming Soon" : "Coming Soon"}</small>
          </button>)}
        </nav>
      </Pane>} secondary={
      <Pane label={`Site Editor ${section}`} side="left" width={settingsWidth} minWidth={240} maxWidth={420} onWidthChange={setSettingsWidth} collapsed={settingsCollapsed} onCollapsedChange={setSettingsCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} header={<h2>{section}</h2>}>
        {section === "Styles" ? <StylesPreviewMenu /> : <div className="site-editor-preview-settings">
            <label htmlFor="site-identity-title"><span>Site Title</span><TextInput id="site-identity-title" maxLength={200} value={identity.title} onChange={event => change({ title: event.currentTarget.value })} /></label><p className="site-identity-field-help">Shown in the sample website header.</p>
            <label htmlFor="site-identity-tagline"><span>Site Tagline</span><TextInput id="site-identity-tagline" maxLength={500} value={identity.tagline} onChange={event => change({ tagline: event.currentTarget.value })} /></label><p className="site-identity-field-help">In a few words, explain what this site is about. It appears in the sample website header.</p>
            {(["logo", "icon"] as const).map(field => <section className="site-identity-image-setting" key={field} aria-label={field === "logo" ? "Site Logo" : "Site Icon"}><h3>{field === "logo" ? "Site Logo" : "Site Icon"}</h3>
              <div className="site-identity-image-frame">
                <div className="site-identity-image-preview">
                  <button className={`site-identity-image-choose${identity[field] ? " has-image" : ""}`} type="button" aria-label={(identity[field] ? "Replace " : "Choose ") + (field === "logo" ? "logo" : "icon")} onClick={event => { setPicker({ site: scope, field, opener: event.currentTarget }); }}>
                  {/* Existing Files bytes stay in memory; useBlobUrls owns preview URL lifetimes. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                    {identity[field] && imageUrls[identity[field].id] ? <img src={imageUrls[identity[field].id]} alt="" /> : <IdentityPlaceholder kind={field} label="" showLabel />}
                  </button>
                  {identity[field] ? <StudioButton variant="text" type="button" className="site-identity-image-remove" aria-label={"Remove " + (field === "logo" ? "logo" : "icon")} title={"Remove " + (field === "logo" ? "logo" : "icon")} onClick={() => change({ [field]: undefined })}><StudioIcon name="close" size={20} /></StudioButton> : null}
                </div>
              </div>
              <p className="site-identity-field-help">{field === "logo" ? "Displays in the sample website header." : "Shown only in the sample browser tab. It will not change Studio’s tab icon. Use a square image at least 512 by 512 pixels."}</p>
            </section>)}

        </div>}
      </Pane>}>
      <section className="site-editor-preview-book" aria-labelledby="site-editor-preview-title"><header><div><p>Website Preview</p><h1 id="site-editor-preview-title">{name}</h1></div><div className="site-editor-preview-history"><HistoryActions canUndo={history.past.length > 0} canRedo={history.future.length > 0} onUndo={() => travel("undo")} onRedo={() => travel("redo")} /></div></header>
        <div className="site-identity-page"><div className="site-identity-browser-tab" aria-label="Sample browser tab">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {identity.icon && imageUrls[identity.icon.id] ? <img src={imageUrls[identity.icon.id]} alt="Site icon" /> : scope === "global" ? <IdentityPlaceholder kind="icon" /> : null}{browserTabTitle ? <span>{browserTabTitle}</span> : null}</div>
          <div className="site-identity-page-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {identity.logo && imageUrls[identity.logo.id] ? <img src={imageUrls[identity.logo.id]} alt={identity.logo.altText || identity.title || "Site logo"} /> : scope === "global" ? <IdentityPlaceholder kind="logo" /> : null}
            <div>{headerTitle ? <h2>{headerTitle}</h2> : null}{identity.tagline ? <p>{identity.tagline}</p> : null}</div>
          </div><BlockRenderer variant="studio" blocks={[{ id: "identity-preview-body", type: "paragraph", text: "This sample page shows your identity changes as you make them. Your existing sites and templates stay unchanged." }]} />
        </div>
      </section>

    </TwoLeftPaneWorkspace>
    </main>
    {picker ? <IdentityImagePicker title={`Choose ${picker.field === "logo" ? "Logo" : "Icon"}`} opener={picker.opener} onClose={() => setPicker(null)} onChoose={image => { dispatch({ type: "change", site: picker.site, patch: { [picker.field]: image } }); setPicker(null); }} /> : null}
  </div>;
}

function IdentityPlaceholder({ kind, label = `Generic ${kind} placeholder`, showLabel = kind === "logo" }: { kind: "logo" | "icon"; label?: string; showLabel?: boolean }) {
  return <span className={`site-identity-placeholder site-identity-placeholder--${kind}`} role="img" aria-label={label || undefined}><AcmIcon name={kind === "logo" ? "insert.image" : "account.record"} size={kind === "logo" ? 40 : 24} scale="Regular-M" />{showLabel ? <span>{kind === "logo" ? "Logo" : "Icon"}</span> : null}</span>;
}
