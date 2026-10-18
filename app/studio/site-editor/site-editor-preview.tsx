"use client";

import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from "react";
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
import { StylesPaneHeaderActions } from "./styles-pane-header-actions";
import { TypographyPreview, type TypographyPreviewNavigation } from "./typography-preview";
import { StyleBook } from "./style-book";
import { ResizablePreviewFrame } from "./resizable-preview-frame";
import type { TypographyRole } from "./typography-preview-model";
import { resolvedTypographyFields, typographyFieldsCss } from "./typography-preview-model";
import { BrowseStyles } from "./browse-styles";
import { createStylesPreview, stylesPreviewReducer, resolvePreviewStyle, previewStyleDetails } from "./styles-preview-state";
import "./style-reference-fonts.css";
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
  const [stylesView, setStylesView] = useState<"menu" | "browse" | "typography">("menu");
  const [styleBookOpen, setStyleBookOpen] = useState(false);
  const [typographyNavigation, setTypographyNavigation] = useState<TypographyPreviewNavigation>({ view: "menu", role: "text" });
  const [history, dispatch] = useReducer(identityPreviewReducer, undefined, createIdentityPreview);
  const [stylesHistory, dispatchStyle] = useReducer(stylesPreviewReducer, undefined, createStylesPreview);
  const [picker, setPicker] = useState<{ site: PreviewScope; field: "logo" | "icon"; opener: HTMLElement } | null>(null);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleStudioHistoryShortcut(event, navigator.platform, () => { if (section === "Styles") dispatchStyle({ type: "undo" }); else dispatch({ type: "undo" }); }, () => { if (section === "Styles") dispatchStyle({ type: "redo" }); else dispatch({ type: "redo" }); });
    // The Styles actions menu is portalled to document.body, so shortcuts must
    // also reach it while preserving the shared native-editing exclusions.
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [section]);
  const name = scopes.find(item => item.id === scope)!.name;
  const identity = history.present[scope];
  const headerTitle = websiteHeaderTitle(identity.title);
  const browserTabTitle = sampleBrowserTabTitle(identity.title);
  const styleSelection = resolvePreviewStyle(stylesHistory.present, scope);
  const { palette, typography } = previewStyleDetails(styleSelection);
  const stylePreviewVars = {
    "--site-style-base": palette.colours[0], "--site-style-contrast": palette.text, "--site-style-heading-colour": palette.heading, "--site-style-accent": palette.buttonBackground, "--site-style-on-accent": palette.buttonText,
    "--site-style-body-family": typography.bodyFamily, "--site-style-heading-family": typography.headingFamily,
    "--site-style-body-weight": typography.bodyWeight, "--site-style-heading-weight": typography.headingWeight,
    "--site-style-body-size": typography.bodySize, "--site-style-body-height": typography.bodyLineHeight,
    "--site-style-heading-height": typography.headingLineHeight, "--site-style-letter-spacing": typography.letterSpacing, "--site-style-heading-spacing": typography.headingLetterSpacing,
  } as CSSProperties;
  const typographySettings = styleSelection.typography ?? {};
  const roleStyle = (role: import("./typography-preview-model").TypographyRole) => typographyFieldsCss(resolvedTypographyFields(typography, typographySettings, role), typographySettings);
  const showStyleBook = section === "Styles" && styleBookOpen;
  useEffect(() => {
    if (showStyleBook) rootRef.current?.querySelector(".site-preview-frame-content")?.scrollTo(0, 0);
  }, [showStyleBook, stylesView, typographyNavigation]);
  function openTypography(role?: TypographyRole) {
    setTypographyNavigation({ view: role ? "element" : "menu", role: role ?? "text" });
    setStylesView("typography");
  }
  const activeHistory = section === "Styles" ? stylesHistory : history;
  const currentStyleScope = stylesHistory.present[scope];
  const canResetStyles = scope === "global"
    ? currentStyleScope.paletteId !== "default" || currentStyleScope.typographyId !== "default" || Boolean(currentStyleScope.typography)
    : Object.keys(currentStyleScope).length > 0;
  const images = useMemo(() => [identity?.logo, identity?.icon].filter((image): image is NonNullable<typeof image> => Boolean(image)), [identity?.logo, identity?.icon]);
  const imageUrls = useBlobUrls(images);
  function change(patch: Partial<SiteIdentity>) { dispatch({ type: "change", site: scope, patch }); }
  function travel(type: "undo" | "redo") { if (section === "Styles") dispatchStyle({ type }); else dispatch({ type }); }
  return <div className="site-editor-preview" ref={rootRef}>
    <StudioAppHeader section="Site Editor"><span className="prototype-pill">Preview</span><a href="/studio">Back to Studio</a></StudioAppHeader>
    <div className="studio-notice" role="note"><strong>Preview only.</strong> Changes last until you leave or reload this page. Existing sites, content, templates, and saved styles are unaffected.</div>
    <main>
    <TwoLeftPaneWorkspace className={`site-editor-preview-layout${showStyleBook ? " is-style-book" : ""}`} contentClassName={showStyleBook ? "site-style-book-workspace" : ""} label="Site Editor workspace" primary={

      <Pane label="Site Editor Navigation" side="left" width={navigationWidth} minWidth={220} maxWidth={360} onWidthChange={setNavigationWidth} collapsed={navigationCollapsed} onCollapsedChange={setNavigationCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} header={<h2>Design</h2>}>
        <label className="site-editor-preview-scope"><span>Design Scope</span><SelectControl value={scope} onChange={event => { setScope(event.currentTarget.value as PreviewScope); setTypographyNavigation({ view: "menu", role: "text" }); }}>{scopes.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</SelectControl></label>
        <p>{scope === "global" ? "Explore the appearance of all sites. Generic identity values are not inherited." : `Explore the appearance of ${name}.`}</p>
        <nav className="library-tools" aria-label="Site design sections">
          {([
            { label: "Identity", icon: "site.identity", siteOnly: false },
            { label: "Styles", icon: "view.styles", siteOnly: false },
            { label: "Pages", icon: "view.single", siteOnly: true },
            { label: "Navigation", icon: "navigation.compass", siteOnly: true },
            { label: "Patterns", icon: "symbol.outline", siteOnly: false },
            { label: "Templates", icon: "layout.template", siteOnly: false },
          ] as const).map(item => <button type="button" key={item.label} className={`library-tool-button${item.label === section ? " is-active" : ""}`} aria-current={item.label === section ? "page" : undefined} disabled={item.label !== "Identity" && item.label !== "Styles"} onClick={() => { if (item.label === "Identity" || item.label === "Styles") { setSection(item.label); if (item.label !== section) setTypographyNavigation({ view: "menu", role: "text" }); } }}>
            <span><AcmIcon name={item.icon} scale="Regular-M" size={24} /></span><strong>{item.label}</strong><small>{item.label === "Identity" ? "Site title, tagline, and images" : item.label === "Styles" ? "Browse Styles Preview" : scope === "global" && item.siteOnly ? "Select a site · Coming Soon" : "Coming Soon"}</small>
          </button>)}
        </nav>
      </Pane>} secondary={
      <Pane label={`Site Editor ${section}`} side="left" width={settingsWidth} minWidth={240} maxWidth={420} onWidthChange={setSettingsWidth} collapsed={settingsCollapsed} onCollapsedChange={setSettingsCollapsed} inspectorPopoverOwner={section === "Styles"} style={section === "Styles" ? { "--pane-inline-space": "28px" } as CSSProperties : undefined} collapseIcon={<StudioIcon name="chevron-right" size={18} />} header={<><h2>{section}</h2>{section === "Styles" ? <StylesPaneHeaderActions styleBookOpen={styleBookOpen} onToggleStyleBook={() => setStyleBookOpen(open => !open)} canReset={canResetStyles} onReset={() => dispatchStyle({ type: "reset", scope })} /> : null}</>}>
        {section === "Styles" ? stylesView === "typography" ? <TypographyPreview key={scope} navigation={typographyNavigation} onNavigate={setTypographyNavigation} selection={styleSelection} scope={scope} dispatch={dispatchStyle} authoredTypography={stylesHistory.present[scope].typography ?? {}} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.site-editor-styles-categories button')?.focus()); }} /> : stylesView === "browse" ? <BrowseStyles selection={styleSelection} onChange={patch => dispatchStyle({ type: "change", scope, patch })} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>(".site-editor-styles-menu > button")?.focus()); }} inherited={scope !== "global" && Object.keys(stylesHistory.present[scope]).length === 0} onInherit={scope === "global" ? undefined : () => dispatchStyle({ type: "inherit", scope })} /> : <StylesPreviewMenu onBrowse={() => setStylesView("browse")} onTypography={() => openTypography()} /> : <div className="site-editor-preview-settings">
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
      <section className="site-editor-preview-book" aria-labelledby="site-editor-preview-title"><header><div><p>{showStyleBook ? "Style Book" : "Website Preview"}</p><h1 id="site-editor-preview-title">{name}</h1></div><div className="site-editor-preview-history"><HistoryActions canUndo={activeHistory.past.length > 0} canRedo={activeHistory.future.length > 0} onUndo={() => travel("undo")} onRedo={() => travel("redo")} /></div></header>
        <ResizablePreviewFrame style={showStyleBook ? { backgroundColor: palette.colours[0], color: palette.text } : undefined}>{showStyleBook ? <StyleBook selection={styleSelection} context={stylesView === "typography" ? typographyNavigation.view === "element" ? typographyNavigation.role : "typography" : "overview"} onTypography={openTypography} onBrowse={() => setStylesView("browse")} /> : <div className="site-identity-page"><div className="site-identity-browser-tab" aria-label="Sample browser tab">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {identity.icon && imageUrls[identity.icon.id] ? <img src={imageUrls[identity.icon.id]} alt="Site icon" /> : scope === "global" ? <IdentityPlaceholder kind="icon" /> : null}{browserTabTitle ? <span>{browserTabTitle}</span> : null}</div>
          <div className={section === "Styles" ? "site-style-preview" : undefined} style={section === "Styles" ? { ...stylePreviewVars, ...roleStyle("text") } : undefined}><div className="site-identity-page-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {identity.logo && imageUrls[identity.logo.id] ? <img src={imageUrls[identity.logo.id]} alt={identity.logo.altText || identity.title || "Site logo"} /> : scope === "global" ? <IdentityPlaceholder kind="logo" /> : null}
            <div>{headerTitle ? <h2 style={section === "Styles" ? roleStyle("h2") : undefined}>{headerTitle}</h2> : null}{identity.tagline ? <p>{identity.tagline}</p> : null}</div>
          </div>{section === "Styles" ? <div className="site-style-preview-body"><h1 style={roleStyle("h1")}>Make something meaningful.</h1><p>A space for stories, ideas, and new perspectives. <a href="#site-typography-story" onClick={event => event.preventDefault()} style={roleStyle("links")}>Discover the story</a>.</p><button type="button" className="site-style-preview-accent" style={roleStyle("buttons")}>Explore the possibilities</button><figure><figcaption style={roleStyle("captions")}>A moment worth sharing.</figcaption></figure><section id="site-typography-story" aria-label="Heading specimens">{(["h2", "h3", "h4", "h5", "h6"] as const).map((Tag, index) => <Tag key={Tag} style={roleStyle(Tag)}>{["Stories that connect us", "A fresh perspective", "The details matter", "Something to remember", "Keep exploring"][index]}</Tag>)}</section></div> : <BlockRenderer variant="studio" blocks={[{ id: "identity-preview-body", type: "paragraph", text: "This sample page shows your identity changes as you make them. Your existing sites and templates stay unchanged." }]} />}</div>
        </div>}</ResizablePreviewFrame>
      </section>

    </TwoLeftPaneWorkspace>
    </main>
    {picker ? <IdentityImagePicker title={`Choose ${picker.field === "logo" ? "Logo" : "Icon"}`} opener={picker.opener} onClose={() => setPicker(null)} onChoose={image => { dispatch({ type: "change", site: picker.site, patch: { [picker.field]: image } }); setPicker(null); }} /> : null}
  </div>;
}

function IdentityPlaceholder({ kind, label = `Generic ${kind} placeholder`, showLabel = kind === "logo" }: { kind: "logo" | "icon"; label?: string; showLabel?: boolean }) {
  return <span className={`site-identity-placeholder site-identity-placeholder--${kind}`} role="img" aria-label={label || undefined}><AcmIcon name={kind === "logo" ? "insert.image" : "account.record"} size={kind === "logo" ? 40 : 24} scale="Regular-M" />{showLabel ? <span>{kind === "logo" ? "Logo" : "Icon"}</span> : null}</span>;
}
