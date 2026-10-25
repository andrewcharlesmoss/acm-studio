"use client";
import { createDepartureLinkHandler } from "../departure-link";
import { flushSitesDisclosureSaves } from "../sites-disclosure-repository.mjs";
import { UNIVERSAL_STYLE_PRESET } from "../ui/styles/canonical-style-guide";
import "./website-design-surface.css";
import { SavingRecoveryNotice } from "../controls/saving-recovery-notice";
import type { HostedSaveStatus } from "./hosted-home-contract";
import { SiteHomeFrame, type SiteHomeFrameHandle } from "./site-home-frame";
import { studioContextPath, type StudioTemplateTarget } from "../use-studio-screen-navigation";
import { localFixtureName, type LocalFixtureSiteId } from "../test-site/sites";
import type { StyleViewport } from "../../content/responsive-styles";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { BlockRenderer } from "../../components/content";
import { AcmIcon } from "@acm/icons/react";
import { TwoLeftPaneWorkspace } from "../panes/two-left-pane-workspace";
import { Pane } from "../panes/pane-components";
import { SelectControl } from "../controls/native-fields";
import { BackAction } from "../controls/back-action";
import { StudioIcon } from "../studio-icons";
import { SiteEditorApplicationHeader } from "../application-section-headers";
import { ProjectLocalDocumentButton, useProjectLocalVisit } from "../project-local-links";
import { viewportWidthFor, type StudioViewport } from "../studio-view-menu";
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
import { useSiteEditorSessions } from "./use-site-editor-sessions";
import { useTestSiteContext } from "../test-site/use-test-site-context";
import { SiteEditorPagesSection } from "./site-editor-pages-section";
import { PagesSidebar } from "./pages-catalogue";
import type { PageStatusView } from "./pages-model.mjs";
import { testDocumentHref } from "../test-site/contract";
import "./style-reference-fonts.css";
import "./site-editor-preview.css";

const scopes = [{ id: "global", name: "Global Defaults" }, { id: "test", name: "Test" }, { id: "test2", name: "Test 2" }] as const;
export function SiteEditorPreview() {
  const sessions = useSiteEditorSessions();
  const testContext = useTestSiteContext(sessions.test, sessions.browser, undefined, sessions.globals.library, sessions.globals.initialised);
  const test2Context = useTestSiteContext(sessions.test2, sessions.browser, undefined, sessions.globals.library, sessions.globals.initialised);
  const siteContexts = { test: testContext, test2: test2Context };
  const [navigationWidth, setNavigationWidth] = useState(240);
  const [settingsWidth, setSettingsWidth] = useState(280);
  const [pagesNavigationWidth, setPagesNavigationWidth] = useState(300);
  const [pagesListWidth, setPagesListWidth] = useState(380);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const homeFrame = useRef<SiteHomeFrameHandle>(null);
  const paneBeforeHome = useRef({ navigation: false, settings: false });
  const [homeEditing, setHomeEditing] = useState(false);
  const [hostedSave, setHostedSave] = useState<{ key: string; status: HostedSaveStatus } | null>(null);
  const paneState = useRef({ navigation: navigationCollapsed, settings: settingsCollapsed });
  useLayoutEffect(() => { paneState.current = { navigation: navigationCollapsed, settings: settingsCollapsed }; }, [navigationCollapsed, settingsCollapsed]);
  const homeEditingChanged = useCallback((editing: boolean) => {
    if (editing) { paneBeforeHome.current = paneState.current; setNavigationCollapsed(true); setSettingsCollapsed(true); }
    else { setNavigationCollapsed(paneBeforeHome.current.navigation); setSettingsCollapsed(paneBeforeHome.current.settings); }
    setHomeEditing(editing);
  }, [setNavigationCollapsed, setSettingsCollapsed]);
  const reopenSiteEditorPanes = useCallback(() => {
    setNavigationCollapsed(false);
    setSettingsCollapsed(false);
    requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('[aria-label="Hide Site Editor Navigation"]')?.focus());
  }, [setNavigationCollapsed, setSettingsCollapsed]);
  const openTemplate = useCallback((site: LocalFixtureSiteId, target: StudioTemplateTarget) => {
    window.location.assign(studioContextPath(site, "templates", target));
  }, []);
  const [scope, setScope] = useState<PreviewScope>("test");
  const [section, setSection] = useState<"Identity" | "Styles" | "Pages">("Identity");
  const [pageStatus, setPageStatus] = useState<PageStatusView>("all");
  const [pageSelections, setPageSelections] = useState<Partial<Record<LocalFixtureSiteId, string>>>({});
  const [pageEditRequest, setPageEditRequest] = useState(0);
  const [stylesView, setStylesView] = useState<"menu" | "browse" | "typography" | "css" | "colours" | "palette" | "background" | "shadows" | "layout" | "blocks">("menu");
  const [siteViewport, setSiteViewport] = useState<StudioViewport>("desktop");
  const [showTemplate, setShowTemplate] = useState(true);
  const [blockViewport, setBlockViewport] = useState<StyleViewport>("desktop");
  const [selectedBlockVariation, setSelectedBlockVariation] = useState<string>();
  const [selectedBlock, setSelectedBlock] = useState<PreviewBlockId | null>(null);
  const [styleBookOpen, setStyleBookOpen] = useState(false);
  const [typographyNavigation, setTypographyNavigation] = useState<TypographyPreviewNavigation>({ view: "menu", role: "text" });
  const designSettings = useWebsiteDesign(sessions);
  const { history, dispatch, stylesHistory, dispatchStyle } = designSettings;
  const identityPersistence = { ready: designSettings.ready, status: designSettings.status, startup: designSettings.startup };
  const [picker, setPicker] = useState<{ site: PreviewScope; field: "logo" | "icon"; opener: HTMLElement } | null>(null);
  const name = scopes.find(item => item.id === scope)!.name;
  const siteContext = scope === "global" ? null : siteContexts[scope];
  const selectedPageId = siteContext ? pageSelections[scope as LocalFixtureSiteId] ?? (siteContext.collection ? siteContext.homeDocumentId : undefined) : undefined;
  const selectedPage = siteContext && selectedPageId ? siteContext.collection?.documents.find(document => document.id === selectedPageId && document.kind === "page") : undefined;
  const selectedPageIsPublished = Boolean(selectedPage && siteContext?.publicationFor(selectedPage.id).status === "published");
  const localPageVisit = useProjectLocalVisit(scope, selectedPage ? testDocumentHref(selectedPage.id) : "/");
  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleStudioHistoryShortcut(event, navigator.platform,
      () => { if (section === "Styles") dispatchStyle({ type: "undo" }); else if (section === "Pages") siteContext?.session.undo(); else if (identityPersistence.ready) dispatch({ type: "undo" }); },
      () => { if (section === "Styles") dispatchStyle({ type: "redo" }); else if (section === "Pages") siteContext?.session.redo(); else if (identityPersistence.ready) dispatch({ type: "redo" }); });
    // These shortcuts also reach portalled menus while preserving native editing.
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [section, siteContext, identityPersistence.ready, dispatch, dispatchStyle]);
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
  async function selectPage(document: NonNullable<typeof selectedPage>, edit = false) {
    if (!siteContext || document.kind !== "page" || !siteContext.collection?.documents.some(item => item.id === document.id && item.kind === "page")) return false;
    if (homeEditing && selectedPageId !== document.id && homeFrame.current && !await homeFrame.current.prepareLeave()) return false;
    if (homeEditing && selectedPageId !== document.id) homeEditingChanged(false);
    siteContext.session.setActiveDocument(document.id);
    setPageSelections(current => ({ ...current, [scope as LocalFixtureSiteId]: document.id }));
    if (edit) setPageEditRequest(request => request + 1);
    return true;
  }
  async function selectScope(next: PreviewScope) {
    if (next === scope) return;
    try { await designSettings.flush(); } catch { return; }
    if (scope !== "global" && homeEditing && homeFrame.current && !await homeFrame.current.prepareLeave()) return;
    if (homeEditing) homeEditingChanged(false);
    setScope(next); setPageStatus("all"); setTypographyNavigation({ view: "menu", role: "text" });
  }
  const departurePending = useRef(false);
  function departureHandler(event: import("react").MouseEvent, link: HTMLAnchorElement | null) {
    const handleDeparture = createDepartureLinkHandler(async () => {
      if (!await flushSitesDisclosureSaves()) return false;
      await designSettings.flush();
      return !homeEditing || !homeFrame.current || await homeFrame.current.prepareLeave();
    }, href => window.location.assign(href), undefined, departurePending);
    handleDeparture(event, link);
  }
  function change(patch: Partial<SiteIdentity>) { dispatch({ type: "change", site: scope, patch }); }
  const hostedSaveKey = `${scope}:${selectedPage?.id ?? ""}`;
  const documentSaveStatus = scope !== "global" && !showStyleBook && hostedSave?.key === hostedSaveKey ? hostedSave.status : null;
  return <SavedWebsiteSettingsContext value={true}><div className={`site-editor-preview site-editor-preview-page${homeEditing ? " is-home-editing" : ""}`} ref={rootRef} onClickCapture={event => departureHandler(event, (event.target as Element).closest<HTMLAnchorElement>("a.studio-app-brand, a[data-studio-departure]"))}>
    <SiteEditorApplicationHeader onReturnToPreview={homeEditing ? () => homeFrame.current?.returnToPreview() : undefined} draftPreview={scope !== "global" && !showStyleBook && Boolean(selectedPage) && !selectedPageIsPublished} saveStatus={designSettings.failure || identityPersistence.status === "Saving website settings…" ? identityPersistence.status : documentSaveStatus?.label ?? (identityPersistence.status === "Website settings saved locally." ? "Saved locally" : identityPersistence.status === "Saving website settings…" ? "Saving…" : identityPersistence.status)} saveFailure={Boolean(designSettings.failure)} onRetry={designSettings.retry} viewport={siteViewport} onViewportChange={setSiteViewport} showTemplate={showTemplate} hasTemplate={scope !== "global"} onShowTemplateChange={setShowTemplate}
      onPreviewInNewTab={selectedPageIsPublished ? () => { void localPageVisit.openLocal(); } : undefined} previewInNewTabDisabled={!localPageVisit.canVisit || localPageVisit.opening || !selectedPageIsPublished} viewPageAction={selectedPageIsPublished ? <ProjectLocalDocumentButton visit={localPageVisit} label="View page" className="button-secondary studio-header-action" iconOnly /> : undefined} />
    {scope !== "global" ? <div className="studio-notice" role="note"><strong>Local {localFixtureName(scope)} website.</strong> Saved changes are stored on this workstation and update its local preview. The live website is unchanged.</div> : null}
    {documentSaveStatus?.warning ? <SavingRecoveryNotice message={documentSaveStatus.warning} reconnecting={documentSaveStatus.reconnecting} onExportDraft={() => homeFrame.current?.exportDraft()} onReconnect={() => homeFrame.current?.reconnect()} /> : null}
    <main>
    <TwoLeftPaneWorkspace className={`site-editor-preview-layout${showStyleBook ? " is-style-book" : ""}${section === "Pages" ? " is-pages" : ""}`} contentClassName={`site-preview-workspace${showStyleBook ? " site-style-book-workspace" : ""}`} label="Site Editor workspace" primary={

      <Pane label="Site Editor Navigation" side="left" width={section === "Pages" ? pagesNavigationWidth : navigationWidth} minWidth={section === "Pages" ? 250 : 220} maxWidth={section === "Pages" ? 560 : 360} onWidthChange={section === "Pages" ? setPagesNavigationWidth : setNavigationWidth} collapsed={navigationCollapsed} onCollapsedChange={setNavigationCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} className={section === "Pages" ? "site-editor-pages-navigation-pane" : undefined} flushRegions={section === "Pages" ? ["body"] : []} header={section === "Pages" ? null : <div className="site-editor-design-heading"><BackAction href="/studio" label="Back to Studio" onClick={event => departureHandler(event, event.currentTarget)} /><h2>Design</h2></div>}>
        {section === "Pages" ? <PagesSidebar value={pageStatus} onChange={setPageStatus} onBack={() => setSection("Identity")} disabled={!siteContext?.collection} /> : <>
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
          ] as const).map(item => <button type="button" key={item.label} className={`library-tool-button${item.label === section ? " is-active" : ""}`} aria-current={item.label === section ? "page" : undefined} disabled={item.label !== "Identity" && item.label !== "Styles" && !(item.label === "Pages" && scope !== "global")} onClick={() => { if (item.label === "Identity" || item.label === "Styles" || item.label === "Pages" && scope !== "global") { setSection(item.label); if (item.label === "Styles") { setStylesView("menu"); setTypographyNavigation({ view: "menu", role: "text" }); } else if (item.label === "Identity" && item.label !== section) setTypographyNavigation({ view: "menu", role: "text" }); } }}>
            <span><AcmIcon name={item.icon} scale="Regular-M" size={24} /></span><strong>{item.label}</strong><small>{item.label === "Identity" ? "Site title, tagline, and images" : item.label === "Styles" ? "Browse Styles" : item.label === "Pages" ? scope === "global" ? "Select a site" : "Manage website pages" : "Coming Soon"}</small>
          </button>)}
        </nav>
        </>}
      </Pane>} secondary={
      <Pane label={`Site Editor ${section}`} side="left" width={section === "Pages" ? pagesListWidth : settingsWidth} minWidth={section === "Pages" ? 360 : 240} maxWidth={section === "Pages" ? 900 : 420} onWidthChange={section === "Pages" ? setPagesListWidth : setSettingsWidth} collapsed={settingsCollapsed} onCollapsedChange={setSettingsCollapsed} inspectorPopoverOwner={section === "Styles"} className={section === "Pages" ? "site-editor-pages-list-pane" : undefined} flushRegions={section === "Pages" ? ["body"] : []} style={section === "Styles" ? { "--pane-inline-space": "28px" } as CSSProperties : undefined} collapseIcon={<StudioIcon name="chevron-right" size={18} />} header={section === "Pages" ? null : <><h2>{section}</h2>{section === "Styles" ? <StylesPaneHeaderActions onAdditionalCss={() => setStylesView("css")} styleBookOpen={styleBookOpen} onToggleStyleBook={() => setStyleBookOpen(open => !open)} canReset={canResetStyles} onReset={() => dispatchStyle({ type: "reset", scope })} /> : null}</>}>
        {siteContext ? <div hidden={section !== "Pages"}>
          {siteContext.collection ? <SiteEditorPagesSection key={scope} context={siteContext} siteName={name} selectedId={selectedPageId ?? ""} status={pageStatus} onStatusChange={setPageStatus} onSelectPage={async document => { if (!await selectPage(document)) throw new Error("The page could not be selected. Its current draft has been kept."); }} onEditPage={async document => { if (!await selectPage(document, true)) throw new Error("The page could not be opened. Its current draft has been kept."); }} onViewPublished={document => { void localPageVisit.openLocal(testDocumentHref(document.id)); }} /> : <p role={siteContext.session.loadError ? "alert" : "status"}>{siteContext.session.loadError || `Loading ${name} pages…`}</p>}
        </div> : <p hidden={section !== "Pages"}>Select a site to manage its pages.</p>}
        <div hidden={section === "Pages"}>
        <fieldset className="site-identity-persistence-fields" disabled={!designSettings.ready || Boolean(designSettings.failure)}><legend hidden>Website settings</legend>{section === "Styles" ? stylesView === "blocks" ? <BlocksPreview key={scope} viewport={blockViewport} onViewportChange={setBlockViewport} variation={selectedBlockVariation} onVariationChange={setSelectedBlockVariation} selected={selectedBlock} onSelect={id => { setSelectedBlock(id); setSelectedBlockVariation(undefined); }} selection={styleSelection} authored={currentStyleScope} scope={scope} dispatch={dispatchStyle} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('[data-styles-blocks]')?.focus()); }} /> : stylesView === "shadows" ? <ShadowsPreview key={scope} selection={styleSelection} authored={currentStyleScope} scope={scope} dispatch={dispatchStyle} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.site-editor-styles-categories button:nth-child(4)')?.focus()); }} /> : stylesView === "layout" ? <LayoutPreview key={scope} defaultPadding={scope === "global" ? undefined : `0px ${UNIVERSAL_STYLE_PRESET.layout.spacing}px`} selection={styleSelection} authored={currentStyleScope} scope={scope} dispatch={dispatchStyle} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.site-editor-styles-categories button:nth-child(5)')?.focus()); }} /> : stylesView === "background" ? <BackgroundPreview key={scope} selection={styleSelection} authored={currentStyleScope} scope={scope} dispatch={dispatchStyle} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.site-editor-styles-categories button:nth-child(3)')?.focus()); }} /> : (stylesView === "colours" || stylesView === "palette") ? <ColoursPreview key={scope} view={stylesView === "palette" ? "palette" : "menu"} onViewChange={view => setStylesView(view === "palette" ? "palette" : "colours")} selection={styleSelection} authored={currentStyleScope} scope={scope} dispatch={dispatchStyle} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.site-editor-styles-categories button:nth-child(2)')?.focus()); }} /> : stylesView === "css" ? <AdditionalCssPane key={scope} value={styleSelection.additionalCss ?? ""} authored={currentStyleScope.additionalCss !== undefined} onChange={additionalCss => dispatchStyle({ type: "change", scope, patch: { additionalCss } })} onReset={() => dispatchStyle({ type: "reset-css", scope })} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('[aria-label="More Styles actions"]')?.focus()); }} /> : stylesView === "typography" ? <TypographyPreview key={scope} navigation={typographyNavigation} onNavigate={setTypographyNavigation} selection={styleSelection} scope={scope} dispatch={dispatchStyle} authoredTypography={stylesHistory.present[scope].typography ?? {}} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.site-editor-styles-categories button')?.focus()); }} /> : stylesView === "browse" ? <BrowseStyles selection={styleSelection} onChange={patch => dispatchStyle({ type: "change", scope, patch })} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>(".site-editor-styles-menu > button")?.focus()); }} inherited={scope !== "global" && Object.keys(stylesHistory.present[scope]).length === 0} onInherit={scope === "global" ? undefined : () => dispatchStyle({ type: "inherit", scope })} /> : <StylesPreviewMenu onBlocks={() => { setSelectedBlock(null); setSelectedBlockVariation(undefined); setStyleBookOpen(true); setStylesView("blocks"); }} onBrowse={() => setStylesView("browse")} onTypography={() => openTypography()} onColours={() => setStylesView("colours")} onBackground={() => setStylesView("background")} onShadows={() => setStylesView("shadows")} onLayout={() => setStylesView("layout")} /> : !identityPersistence.ready && !identityPersistence.startup ? <p aria-busy="true">Loading identity…</p> : <fieldset className="site-identity-persistence-fields" disabled={!identityPersistence.ready}><legend hidden>Identity settings</legend><IdentityControls saved values={identityPersistence.startup ?? history.present} scope={scope} onChange={change} onHide={(field,hidden)=>dispatch({type:"set-hidden",site:scope,field,hidden})} onReset={field=>dispatch({type:"reset-field",site:scope,field})} onResetAll={() => dispatch({ type: "reset-all", site: scope })} onRemoveImage={field=>dispatch({type:"remove-image",site:scope,field})} onChooseImage={(field,opener)=>setPicker({site:scope,field,opener})}/></fieldset> }</fieldset>
        </div>
      </Pane>}>
      <section className="site-editor-preview-book" aria-label={`${name} ${showStyleBook ? "Style Book" : "website preview"}`}>
        {scope !== "global" && !showStyleBook ? selectedPage ? <SiteHomeFrame key={`${scope}:${selectedPage.id}`} site={scope} documentId={selectedPage.id === siteContext?.homeDocumentId ? undefined : selectedPage.id} documentTitle={selectedPage.title} editRequest={pageEditRequest || undefined} handleRef={homeFrame} onEditing={homeEditingChanged} onReopenPanes={reopenSiteEditorPanes} onOpenTemplate={openTemplate} viewportWidth={homeEditing ? undefined : viewportWidthFor(siteViewport)} showTemplate={showTemplate} onSaveStatus={status => setHostedSave({ key: hostedSaveKey, status })} /> : <p className="site-editor-unavailable-page" role={siteContext?.session.loadError ? "alert" : "status"}>{siteContext?.session.loadError || (siteContext?.collection ? "This page is no longer available. Return to Pages and choose another page." : `Loading ${name} pages…`)}</p> : <ResizablePreviewFrame preferredWidth={viewportWidthFor(showStyleBook && stylesView === "blocks" ? blockViewport : siteViewport)} className="site-preview-stage" style={showStyleBook ? { backgroundColor: palette.colours[0], color: palette.text } : undefined}><AdditionalCssPreview source={section === "Styles" ? styleSelection.additionalCss ?? "" : ""}>{!identityPersistence.ready && !identityPersistence.startup ? <p aria-busy="true">Loading identity…</p> : showStyleBook ? <StyleBook backgroundImageUrl={backgroundUrl} selection={styleSelection} onBlock={id => { setSelectedBlock(id); setSelectedBlockVariation(undefined); setStylesView("blocks"); }} context={stylesView === "blocks" ? { block: selectedBlock, variation: selectedBlockVariation } : stylesView === "colours" || stylesView === "palette" ? "colours" : stylesView === "typography" ? typographyNavigation.view === "element" ? typographyNavigation.role : "typography" : "overview"} onTypography={openTypography} onColours={() => setStylesView("palette")} onBrowse={() => setStylesView("browse")} /> : <div className="site-identity-page"><IdentityPreviewTab identity={identity} scope={scope} imageUrls={imageUrls}/><BackgroundPreviewSurface enabled={section === "Styles"} className={section === "Styles" ? "site-style-preview has-site-layout" : undefined} background={section === "Styles" ? styleSelection.background : undefined} palette={palette} colours={styleSelection.colours} imageUrl={section === "Styles" ? backgroundUrl : undefined} style={section === "Styles" ? { ...stylePreviewVars, ...roleStyle("text"), ...previewLayoutCss(styleSelection.layout) } : undefined}><IdentityPreviewHeader identity={identity} scope={scope} imageUrls={imageUrls} titleStyle={section === "Styles" ? roleStyle("h2") : undefined}/>{section === "Styles" ? <ComparisonHome selection={styleSelection} /> : <BlockRenderer variant="studio" blocks={[{ id: "identity-preview-body", type: "paragraph", text: "This sample page shows your identity changes as you make them. Your existing sites and templates stay unchanged." }]} />}</BackgroundPreviewSurface>
        </div>}</AdditionalCssPreview></ResizablePreviewFrame>}
      </section>

    </TwoLeftPaneWorkspace>
    </main>
    {picker ? <IdentityImagePicker saved title={`Choose ${picker.field === "logo" ? "Logo" : "Icon"}`} opener={picker.opener} onClose={() => setPicker(null)} onChoose={image => { dispatch({ type: "change", site: picker.site, patch: { [picker.field]: image } }); setPicker(null); }} /> : null}
  </div></SavedWebsiteSettingsContext>;
}
