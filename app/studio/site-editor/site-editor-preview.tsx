"use client";
import { createDepartureLinkHandler } from "../departure-link";
import { flushSitesDisclosureSaves } from "../sites-disclosure-repository.mjs";
import { UNIVERSAL_STYLE_PRESET } from "../ui/styles/canonical-style-guide";
import "./website-design-surface.css";
import { SiteHomeFrame, type SiteHomeFrameHandle } from "./site-home-frame";
import { studioContextPath, type StudioTemplateTarget } from "../use-studio-screen-navigation";
import type { LocalFixtureSiteId } from "../test-site/sites";
import type { StyleViewport } from "../../content/responsive-styles";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { BlockRenderer } from "../../components/content";
import { AcmIcon } from "@acm/icons/react";
import { TwoLeftPaneWorkspace } from "../panes/two-left-pane-workspace";
import { Pane } from "../panes/pane-components";
import { SelectControl } from "../controls/native-fields";
import { BackAction } from "../controls/back-action";
import { StudioIcon } from "../studio-icons";
import { StudioAppHeader } from "../studio-app-header";
import { useBlobUrls } from "../controls/use-blob-urls";
import { useWebsiteDesign } from "./use-website-design";
import { IdentityImagePicker, SavedWebsiteSettingsContext } from "./identity-image-picker";
import { handleStudioHistoryShortcut } from "../studio-history-shortcuts.mjs";
import { resolveIdentityPreview, type PreviewScope, type SiteIdentity } from "./identity-preview-state";
import { IdentityControls, IdentityPreviewHeader, IdentityPreviewTab } from "./identity-controls";
import { ShadowsPreview } from "./shadows-preview";
import { LayoutPreview } from "./layout-preview";
import { previewLayoutCss } from "./layout-preview-model";
import { BackgroundPreview } from "./background-preview";
import { BackgroundPreviewSurface } from "./background-preview-surface";
import { ColoursPreview } from "./colours-preview";
import { previewColourVariables } from "./colours-preview-model";
import { AdditionalCssPane } from "./additional-css-pane";
import { AdditionalCssPreview } from "./additional-css-preview";
import { StylesPreviewMenu } from "./styles-preview-menu";
import { StylesPaneHeaderActions } from "./styles-pane-header-actions";
import { TypographyPreview, type TypographyPreviewNavigation } from "./typography-preview";
import { BlocksPreview } from "./blocks-preview";
import type { PreviewBlockId } from "./blocks-preview-model";
import { StyleBook } from "./style-book";
import { ComparisonHome } from "./comparison-home";
import { ResizablePreviewFrame } from "../controls/resizable-preview-frame";
import "./resizable-preview-frame.css";
import type { TypographyRole } from "./typography-preview-model";
import { resolvedTypographyFields, typographyFieldsCss, availableTypographyFamily } from "./typography-preview-model";
import { BrowseStyles } from "./browse-styles";
import { resolvePreviewStyle, previewStyleDetails } from "./styles-preview-state";
import "./style-reference-fonts.css";
import "./site-editor-preview.css";

const scopes = [{ id: "global", name: "Global Defaults" }, { id: "test", name: "Test" }, { id: "test2", name: "Test 2" }] as const;
export function SiteEditorPreview() {
  const [navigationWidth, setNavigationWidth] = useState(240);
  const [settingsWidth, setSettingsWidth] = useState(280);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const homeFrame = useRef<SiteHomeFrameHandle>(null);
  const paneBeforeHome = useRef({ navigation: false, settings: false });
  const [homeEditing, setHomeEditing] = useState(false);
  const paneState = useRef({ navigation: navigationCollapsed, settings: settingsCollapsed });
  useLayoutEffect(() => { paneState.current = { navigation: navigationCollapsed, settings: settingsCollapsed }; }, [navigationCollapsed, settingsCollapsed]);
  const homeEditingChanged = useCallback((editing: boolean) => {
    if (editing) { paneBeforeHome.current = paneState.current; setNavigationCollapsed(true); setSettingsCollapsed(true); }
    else { setNavigationCollapsed(paneBeforeHome.current.navigation); setSettingsCollapsed(paneBeforeHome.current.settings); }
    setHomeEditing(editing);
  }, []);
  const openTemplate = useCallback((site: LocalFixtureSiteId, target: StudioTemplateTarget) => {
    window.location.assign(studioContextPath(site, "templates", target));
  }, []);
  const [scope, setScope] = useState<PreviewScope>("test");
  const [section, setSection] = useState<"Identity" | "Styles">("Identity");
  const [stylesView, setStylesView] = useState<"menu" | "browse" | "typography" | "css" | "colours" | "palette" | "background" | "shadows" | "layout" | "blocks">("menu");
  const [blockViewport, setBlockViewport] = useState<StyleViewport>("desktop");
  const [selectedBlockVariation, setSelectedBlockVariation] = useState<string>();
  const [selectedBlock, setSelectedBlock] = useState<PreviewBlockId | null>(null);
  const [styleBookOpen, setStyleBookOpen] = useState(false);
  const [typographyNavigation, setTypographyNavigation] = useState<TypographyPreviewNavigation>({ view: "menu", role: "text" });
  const designSettings = useWebsiteDesign();
  const { history, dispatch, stylesHistory, dispatchStyle } = designSettings;
  const identityPersistence = { ready: designSettings.ready, status: designSettings.status, startup: designSettings.startup };
  const [picker, setPicker] = useState<{ site: PreviewScope; field: "logo" | "icon"; opener: HTMLElement } | null>(null);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleStudioHistoryShortcut(event, navigator.platform, () => { if (section === "Styles") dispatchStyle({ type: "undo" }); else if (identityPersistence.ready) dispatch({ type: "undo" }); }, () => { if (section === "Styles") dispatchStyle({ type: "redo" }); else if (identityPersistence.ready) dispatch({ type: "redo" }); });
    // The Styles actions menu is portalled to document.body, so shortcuts must
    // also reach it while preserving the shared native-editing exclusions.
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [section, identityPersistence.ready, dispatch, dispatchStyle]);
  const name = scopes.find(item => item.id === scope)!.name;
  const identity = resolveIdentityPreview(identityPersistence.startup ?? history.present, scope);
  const styleSelection = resolvePreviewStyle(stylesHistory.present, scope);
  const { palette, typography } = previewStyleDetails(styleSelection);
  const stylePreviewVars = {
    ...previewColourVariables(palette, styleSelection.colours),
    "--site-style-base": palette.colours[0], "--site-style-contrast": palette.text, "--site-style-heading-colour": palette.heading, "--site-style-accent": palette.buttonBackground, "--site-style-on-accent": palette.buttonText,
    "--site-style-body-family": availableTypographyFamily(typography.bodyFamily, styleSelection.typography ?? {}), "--site-style-heading-family": availableTypographyFamily(typography.headingFamily, styleSelection.typography ?? {}),
    "--site-style-body-weight": typography.bodyWeight, "--site-style-heading-weight": typography.headingWeight,
    "--site-style-body-size": typography.bodySize, "--site-style-body-height": typography.bodyLineHeight,
    "--site-style-heading-height": typography.headingLineHeight, "--site-style-letter-spacing": typography.letterSpacing, "--site-style-heading-spacing": typography.headingLetterSpacing,
  } as CSSProperties;
  const typographySettings = styleSelection.typography ?? {};
  const roleStyle = (role: import("./typography-preview-model").TypographyRole) => typographyFieldsCss(resolvedTypographyFields(typography, typographySettings, role), typographySettings);
  const showStyleBook = section === "Styles" && styleBookOpen;
  useEffect(() => {
    if (showStyleBook) rootRef.current?.querySelector(".studio-preview-frame-content")?.scrollTo(0, 0);
  }, [showStyleBook, stylesView, typographyNavigation, selectedBlock]);
  function openTypography(role?: TypographyRole) {
    setTypographyNavigation({ view: role ? "element" : "menu", role: role ?? "text" });
    setStylesView("typography");
  }
  const currentStyleScope = stylesHistory.present[scope];
  const canResetStyles = Object.keys(currentStyleScope).length > 0;
  const backgroundImage = stylesHistory.present[scope].background?.image === undefined ? stylesHistory.present.global.background?.image : stylesHistory.present[scope].background?.image;
  const images = useMemo(() => [identity?.logo, identity?.icon, backgroundImage].filter((image): image is NonNullable<typeof image> => Boolean(image)), [identity?.logo, identity?.icon, backgroundImage]);
  const imageUrls = useBlobUrls(images);
  const backgroundUrl = backgroundImage ? imageUrls[backgroundImage.id] : undefined;
  async function selectScope(next: PreviewScope) {
    if (next === scope) return;
    try { await designSettings.flush(); } catch { return; }
    if (scope !== "global" && homeFrame.current && !await homeFrame.current.prepareLeave()) return;
    if (homeEditing) homeEditingChanged(false);
    setScope(next); setTypographyNavigation({ view: "menu", role: "text" });
  }
  const departurePending = useRef(false);
  const departureHandler = useMemo(() => createDepartureLinkHandler(async () => {
    if (!await flushSitesDisclosureSaves()) return false;
    await designSettings.flush();
    return !homeFrame.current || await homeFrame.current.prepareLeave();
  }, href => window.location.assign(href), undefined, departurePending), [designSettings]);
  function change(patch: Partial<SiteIdentity>) { dispatch({ type: "change", site: scope, patch }); }
  return <SavedWebsiteSettingsContext value={true}><div className={`site-editor-preview${homeEditing ? " is-home-editing" : ""}`} ref={rootRef}>
    <StudioAppHeader section="Site Editor"><div className="studio-state"><a href="/studio" onClick={event => { event.preventDefault(); void (async () => { try { await designSettings.flush(); if (!homeFrame.current || await homeFrame.current.prepareLeave()) window.location.assign("/studio"); } catch { /* Saving status preserves and explains the current draft. */ } })(); }}>Back to Studio</a><span className="prototype-pill">Local</span></div></StudioAppHeader>
    <p className="site-editor-identity-save-status" role={designSettings.failure ? "alert" : "status"}>{identityPersistence.status}{designSettings.failure ? <button type="button" onClick={designSettings.retry}>Reload Settings</button> : null}</p>
    <main>
    <TwoLeftPaneWorkspace className={`site-editor-preview-layout${showStyleBook ? " is-style-book" : ""}`} contentClassName={`site-preview-workspace${showStyleBook ? " site-style-book-workspace" : ""}`} label="Site Editor workspace" primary={

      <Pane label="Site Editor Navigation" side="left" width={navigationWidth} minWidth={220} maxWidth={360} onWidthChange={setNavigationWidth} collapsed={navigationCollapsed} onCollapsedChange={setNavigationCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} header={<div className="site-editor-design-heading"><BackAction href="/studio" label="Back to Studio" onClick={event => departureHandler(event, event.currentTarget)} /><h2>Design</h2></div>}>
        <p className="site-editor-design-description">Customise the appearance of your website using the block editor.</p>
        <label className="site-editor-preview-scope"><span>Design Scope</span><SelectControl value={scope} onChange={event => { void selectScope(event.currentTarget.value as PreviewScope); }}>{scopes.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</SelectControl></label>
        {scope === "global" ? <p>Unset site identity fields inherit these defaults.</p> : null}
        <nav className="library-tools" aria-label="Site design sections">
          {([
            { label: "Identity", icon: "site.identity", siteOnly: false },
            { label: "Styles", icon: "view.styles", siteOnly: false },
            { label: "Pages", icon: "view.single", siteOnly: true },
            { label: "Navigation", icon: "navigation.compass", siteOnly: true },
            { label: "Patterns", icon: "symbol.outline", siteOnly: false },
            { label: "Templates", icon: "layout.template", siteOnly: false },
          ] as const).map(item => <button type="button" key={item.label} className={`library-tool-button${item.label === section ? " is-active" : ""}`} aria-current={item.label === section ? "page" : undefined} disabled={item.label !== "Identity" && item.label !== "Styles"} onClick={() => { if (item.label === "Identity" || item.label === "Styles") { setSection(item.label); if (item.label === "Styles") { setStylesView("menu"); setTypographyNavigation({ view: "menu", role: "text" }); } else if (item.label !== section) setTypographyNavigation({ view: "menu", role: "text" }); } }}>
            <span><AcmIcon name={item.icon} scale="Regular-M" size={24} /></span><strong>{item.label}</strong><small>{item.label === "Identity" ? "Site title, tagline, and images" : item.label === "Styles" ? "Browse Styles" : scope === "global" && item.siteOnly ? "Select a site · Coming Soon" : "Coming Soon"}</small>
          </button>)}
        </nav>
      </Pane>} secondary={
      <Pane label={`Site Editor ${section}`} side="left" width={settingsWidth} minWidth={240} maxWidth={420} onWidthChange={setSettingsWidth} collapsed={settingsCollapsed} onCollapsedChange={setSettingsCollapsed} inspectorPopoverOwner={section === "Styles"} style={section === "Styles" ? { "--pane-inline-space": "28px" } as CSSProperties : undefined} collapseIcon={<StudioIcon name="chevron-right" size={18} />} header={<><h2>{section}</h2>{section === "Styles" ? <StylesPaneHeaderActions onAdditionalCss={() => setStylesView("css")} styleBookOpen={styleBookOpen} onToggleStyleBook={() => setStyleBookOpen(open => !open)} canReset={canResetStyles} onReset={() => dispatchStyle({ type: "reset", scope })} /> : null}</>}>
        <fieldset className="site-identity-persistence-fields" disabled={!designSettings.ready || Boolean(designSettings.failure)}><legend hidden>Website settings</legend>{section === "Styles" ? stylesView === "blocks" ? <BlocksPreview key={scope} viewport={blockViewport} onViewportChange={setBlockViewport} variation={selectedBlockVariation} onVariationChange={setSelectedBlockVariation} selected={selectedBlock} onSelect={id => { setSelectedBlock(id); setSelectedBlockVariation(undefined); }} selection={styleSelection} authored={currentStyleScope} scope={scope} dispatch={dispatchStyle} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('[data-styles-blocks]')?.focus()); }} /> : stylesView === "shadows" ? <ShadowsPreview key={scope} selection={styleSelection} authored={currentStyleScope} scope={scope} dispatch={dispatchStyle} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.site-editor-styles-categories button:nth-child(4)')?.focus()); }} /> : stylesView === "layout" ? <LayoutPreview key={scope} defaultPadding={scope === "global" ? undefined : `0px ${UNIVERSAL_STYLE_PRESET.layout.spacing}px`} selection={styleSelection} authored={currentStyleScope} scope={scope} dispatch={dispatchStyle} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.site-editor-styles-categories button:nth-child(5)')?.focus()); }} /> : stylesView === "background" ? <BackgroundPreview key={scope} selection={styleSelection} authored={currentStyleScope} scope={scope} dispatch={dispatchStyle} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.site-editor-styles-categories button:nth-child(3)')?.focus()); }} /> : (stylesView === "colours" || stylesView === "palette") ? <ColoursPreview key={scope} view={stylesView === "palette" ? "palette" : "menu"} onViewChange={view => setStylesView(view === "palette" ? "palette" : "colours")} selection={styleSelection} authored={currentStyleScope} scope={scope} dispatch={dispatchStyle} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.site-editor-styles-categories button:nth-child(2)')?.focus()); }} /> : stylesView === "css" ? <AdditionalCssPane key={scope} value={styleSelection.additionalCss ?? ""} authored={currentStyleScope.additionalCss !== undefined} onChange={additionalCss => dispatchStyle({ type: "change", scope, patch: { additionalCss } })} onReset={() => dispatchStyle({ type: "reset-css", scope })} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('[aria-label="More Styles actions"]')?.focus()); }} /> : stylesView === "typography" ? <TypographyPreview key={scope} navigation={typographyNavigation} onNavigate={setTypographyNavigation} selection={styleSelection} scope={scope} dispatch={dispatchStyle} authoredTypography={stylesHistory.present[scope].typography ?? {}} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.site-editor-styles-categories button')?.focus()); }} /> : stylesView === "browse" ? <BrowseStyles selection={styleSelection} onChange={patch => dispatchStyle({ type: "change", scope, patch })} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>(".site-editor-styles-menu > button")?.focus()); }} inherited={scope !== "global" && Object.keys(stylesHistory.present[scope]).length === 0} onInherit={scope === "global" ? undefined : () => dispatchStyle({ type: "inherit", scope })} /> : <StylesPreviewMenu onBlocks={() => { setSelectedBlock(null); setSelectedBlockVariation(undefined); setStyleBookOpen(true); setStylesView("blocks"); }} onBrowse={() => setStylesView("browse")} onTypography={() => openTypography()} onColours={() => setStylesView("colours")} onBackground={() => setStylesView("background")} onShadows={() => setStylesView("shadows")} onLayout={() => setStylesView("layout")} /> : !identityPersistence.ready && !identityPersistence.startup ? <p aria-busy="true">Loading identity…</p> : <fieldset className="site-identity-persistence-fields" disabled={!identityPersistence.ready}><legend hidden>Identity settings</legend><IdentityControls saved values={identityPersistence.startup ?? history.present} scope={scope} onChange={change} onHide={(field,hidden)=>dispatch({type:"set-hidden",site:scope,field,hidden})} onReset={field=>dispatch({type:"reset-field",site:scope,field})} onResetAll={() => dispatch({ type: "reset-all", site: scope })} onRemoveImage={field=>dispatch({type:"remove-image",site:scope,field})} onChooseImage={(field,opener)=>setPicker({site:scope,field,opener})}/></fieldset> }</fieldset>
      </Pane>}>
      <section className="site-editor-preview-book" aria-label={`${name} ${showStyleBook ? "Style Book" : "website preview"}`}>
        {scope !== "global" && !showStyleBook ? <SiteHomeFrame key={scope} site={scope} handleRef={homeFrame} onEditing={homeEditingChanged} onOpenTemplate={openTemplate} /> : <ResizablePreviewFrame preferredWidth={section === "Styles" && stylesView === "blocks" ? blockViewport === "desktop" ? null : blockViewport === "tablet" ? 768 : 390 : undefined} className="site-preview-stage" style={showStyleBook ? { backgroundColor: palette.colours[0], color: palette.text } : undefined}><AdditionalCssPreview source={section === "Styles" ? styleSelection.additionalCss ?? "" : ""}>{!identityPersistence.ready && !identityPersistence.startup ? <p aria-busy="true">Loading identity…</p> : showStyleBook ? <StyleBook backgroundImageUrl={backgroundUrl} selection={styleSelection} onBlock={id => { setSelectedBlock(id); setSelectedBlockVariation(undefined); setStylesView("blocks"); }} context={stylesView === "blocks" ? { block: selectedBlock, variation: selectedBlockVariation } : stylesView === "colours" || stylesView === "palette" ? "colours" : stylesView === "typography" ? typographyNavigation.view === "element" ? typographyNavigation.role : "typography" : "overview"} onTypography={openTypography} onColours={() => setStylesView("palette")} onBrowse={() => setStylesView("browse")} /> : <div className="site-identity-page"><IdentityPreviewTab identity={identity} scope={scope} imageUrls={imageUrls}/><BackgroundPreviewSurface enabled={section === "Styles"} className={section === "Styles" ? "site-style-preview has-site-layout" : undefined} background={section === "Styles" ? styleSelection.background : undefined} palette={palette} colours={styleSelection.colours} imageUrl={section === "Styles" ? backgroundUrl : undefined} style={section === "Styles" ? { ...stylePreviewVars, ...roleStyle("text"), ...previewLayoutCss(styleSelection.layout) } : undefined}><IdentityPreviewHeader identity={identity} scope={scope} imageUrls={imageUrls} titleStyle={section === "Styles" ? roleStyle("h2") : undefined}/>{section === "Styles" ? <ComparisonHome selection={styleSelection} /> : <BlockRenderer variant="studio" blocks={[{ id: "identity-preview-body", type: "paragraph", text: "This sample page shows your identity changes as you make them. Your existing sites and templates stay unchanged." }]} />}</BackgroundPreviewSurface>
        </div>}</AdditionalCssPreview></ResizablePreviewFrame>}
      </section>

    </TwoLeftPaneWorkspace>
    </main>
    {picker ? <IdentityImagePicker saved title={`Choose ${picker.field === "logo" ? "Logo" : "Icon"}`} opener={picker.opener} onClose={() => setPicker(null)} onChoose={image => { dispatch({ type: "change", site: picker.site, patch: { [picker.field]: image } }); setPicker(null); }} /> : null}
  </div></SavedWebsiteSettingsContext>;
}
