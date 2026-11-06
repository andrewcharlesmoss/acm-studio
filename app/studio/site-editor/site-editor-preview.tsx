"use client";
import { useRouter } from "next/navigation";
import { createDepartureLinkHandler } from "../departure-link";
import { flushSitesDisclosureSaves } from "../sites-disclosure-repository.mjs";
import { UNIVERSAL_STYLE_PRESET } from "../ui/styles/canonical-style-guide";
import "./website-design-surface.css";
import { SavingRecoveryNotice } from "../controls/saving-recovery-notice";
import { LocalWebsiteNotice } from "../controls/local-website-notice";
import { useLocalWebsiteNotice } from "../controls/use-local-website-notice";
import { SettingsConflictNotice } from "./settings-conflict-notice";
import type { HostedSaveStatus } from "./hosted-home-contract";
import type { HostedSitePreview } from "./hosted-home-contract";
import { effectiveWebsiteDesign } from "./website-design";
import { SiteHomeFrame, type SiteHomeFrameHandle } from "./site-home-frame";
import { studioContentDocumentPath, studioContextPath, studioLibraryPath, studioSiteEditorPath, type StudioTemplateTarget } from "../use-studio-screen-navigation";
import { localFixtureName, localFixtureSites, type LocalFixtureSiteId } from "../test-site/sites";
import type { StyleViewport } from "../../content/responsive-styles";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { BlockRenderer } from "../../components/content";
import { AcmIcon } from "@acm/icons/react";
import { TwoLeftPaneWorkspace } from "../panes/two-left-pane-workspace";
import { StudioNavigationWorkspace } from "../panes/studio-navigation-workspace";
import { StudioNavigationFrame } from "../studio-navigation-frame";
import { LibraryDragHandle } from "../library-drag-handle";
import { DragPlacementIndicator } from "../drag-placement-indicator";
import { useLibraryReordering } from "../use-library-reordering";
import { orderedLibraryDocuments, reorderLibraryDocuments } from "../library-reordering";
import { getStudioNavigationPreview, saveStudioNavigationPreview } from "../navigation-continuity";
import { templateLibraryEntries, templateNameInitial } from "../template-library";
import { Pane } from "../panes/pane-components";
import { SelectControl } from "../controls/native-fields";
import { BackAction } from "../controls/back-action";
import { StudioIcon } from "../studio-icons";
import { SiteEditorApplicationHeader } from "../application-section-headers";
import { ProjectLocalDocumentButton, useProjectLocalVisit } from "../project-local-links";
import { viewportWidthFor, type StudioViewport } from "../studio-view-menu";
import { useBlobUrlsWithReadiness } from "../controls/use-blob-urls";
import { useWebsiteDesign } from "./use-website-design";
import { SiteReviewDialog, type SiteReviewItem } from "./site-review-dialog";
import { StudioButton } from "../controls/button";
import { IdentityImagePicker, SavedWebsiteSettingsContext } from "./identity-image-picker";
import { handleStudioHistoryShortcut } from "../studio-history-shortcuts.mjs";
import { resolveIdentityPreview, type IdentityImage, type PreviewScope, type SiteIdentity } from "./identity-preview-state";
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
import { navigationVisualPresentation } from "../navigation-visual-presentation";
import { SiteNavigationEditor } from "../site-navigation-editor";
import { NavigationOverview } from "./navigation-overview";
import { templateId, isNavigationSpacer } from "../template-model";
import "../templates.css";
import { SiteEditorPagesSection } from "./site-editor-pages-section";
import { PagesSidebar } from "./pages-catalogue";
import type { PageStatusView } from "./pages-model.mjs";
import { testDocumentHref } from "../test-site/contract";
import "./style-reference-fonts.css";
import "./site-editor-preview.css";

const scopes = [{ id: "global", name: "Universal Defaults" }, ...localFixtureSites] as const;
let hostedPreviewImageSequence = 0;
let hostedPreviewSequence = 0;
const hostedPreviewImageKeys = new WeakMap<object, string>();
function hostedPreviewImageKey(image: IdentityImage) {
  let key = hostedPreviewImageKeys.get(image.blob);
  if (!key) { key = `hosted-preview-image-${++hostedPreviewImageSequence}`; hostedPreviewImageKeys.set(image.blob, key); }
  return key;
}
export function SiteEditorPreview({ initialScope = "test", initialDocumentId, initialLibraryKind = "page", initialDesignView = false }: { initialScope?: PreviewScope; initialDocumentId?: string; initialLibraryKind?: "page" | "post" | "templates"; initialDesignView?: boolean }) {
  const router = useRouter();
  const sessions = useSiteEditorSessions();
  const [navigationMenuSelections, setNavigationMenuSelections] = useState<Partial<Record<LocalFixtureSiteId, string>>>({});
  const testContext = useTestSiteContext(sessions.test, sessions.browser, undefined, sessions.globals.library, sessions.globals.initialised, navigationMenuSelections.test);
  const test2Context = useTestSiteContext(sessions.test2, sessions.browser, undefined, sessions.globals.library, sessions.globals.initialised, navigationMenuSelections.test2);
  const siteContexts = { test: testContext, test2: test2Context };
  const [navigationWidth, setNavigationWidth] = useState(240);
  const [studioNavigationWidth, setStudioNavigationWidth] = useState(290);
  const [settingsWidth, setSettingsWidth] = useState(280);
  const [pagesNavigationWidth, setPagesNavigationWidth] = useState(300);
  const [pagesListWidth, setPagesListWidth] = useState(380);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const [studioNavigationCollapsed, setStudioNavigationCollapsed] = useState(false);
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const [dismissedLocalNotice, dismissLocalNotice, localNoticeError] = useLocalWebsiteNotice();
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
  const [scope, setScope] = useState<PreviewScope>(initialScope);
  const [section, setSection] = useState<"Identity" | "Styles" | "Pages" | "Navigation" | "Patterns" | "Templates">(initialDocumentId && !initialDesignView ? "Pages" : "Identity");
  const [patternArea, setPatternArea] = useState<"all" | "header" | "footer">("all");
  const [navigationPaneOpen, setNavigationPaneOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigationLeave = useRef<(() => Promise<boolean>) | null>(null);
  const navigationHistory = useRef<(() => void) | null>(null);
  const navigationTransition = useRef(false);
  const [pageStatus, setPageStatus] = useState<PageStatusView>("all");
  const [studioLibraryKind, updateStudioLibraryKind] = useState<"page" | "post" | "templates">(initialLibraryKind);
  function setStudioLibraryKind(kind: "page" | "post" | "templates", cacheScope: PreviewScope = scope) {
    updateStudioLibraryKind(kind);
    const url = new URL(window.location.href);
    url.searchParams.set("library", kind);
    window.history.replaceState(window.history.state, "", url);
    if (cacheScope !== "global") {
      const cached = getStudioNavigationPreview(cacheScope);
      if (cached) saveStudioNavigationPreview(cacheScope, { ...cached, libraryKind: kind });
    }
  }
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
  const designSettings = useWebsiteDesign(sessions, true);
  const { history, dispatch, stylesHistory, dispatchStyle } = designSettings;
  const designScopeReady = designSettings.scopeReady?.[scope] ?? designSettings.ready;
  const identityPersistence = { ready: designScopeReady, status: designSettings.status, startup: designSettings.startup };
  const [picker, setPicker] = useState<{ site: PreviewScope; field: "logo" | "icon"; opener: HTMLElement } | null>(null);
  const name = scopes.find(item => item.id === scope)!.name;
  const siteContext = scope === "global" ? null : siteContexts[scope];
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewOpener, setReviewOpener] = useState<HTMLElement | null>(null);
  const designReviewChanges = designSettings.reviewChanges ?? [];
  const reviewItems: SiteReviewItem[] = scopes.flatMap(item => {
    const change = designReviewChanges.find(value => value.scope === item.id);
    const navigation = item.id !== "global" && siteContexts[item.id]?.navigationReviewPending;
    if (!change && !navigation) return [];
    const details = [change?.identity ? `Identity: ${change.identityFields.join(", ")}` : "", change?.styles ? `Styles: ${change.styleFields.join(", ")}` : "", navigation ? "Navigation menus" : ""].filter(Boolean);
    details.push(item.id === "global" ? "Saving also includes other pending shared template changes." : "Saving also includes any other pending changes for this site.");
    return [{ scope: item.id, label: item.name, details }];
  });
  function showReview(opener?: HTMLElement | null) { setReviewOpener(opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)); setReviewOpen(true); }
  async function requestReview(opener?: HTMLElement | null) {
    if (siteContext?.navigationReviewPending && navigationLeave.current) { await navigationLeave.current(); return; }
    showReview(opener);
  }
  async function saveReview(selected: PreviewScope[]) {
    const settingsScopes = selected.filter(item => designReviewChanges.some(change => change.scope === item));
    const navigationScopes = selected.filter((item): item is LocalFixtureSiteId => item !== "global" && siteContexts[item].navigationReviewPending);
    const generations = Object.fromEntries(navigationScopes.map(item => [item, siteContexts[item].getNavigationReviewGeneration()]));
    await designSettings.saveReviewedScopes(settingsScopes, navigationScopes.filter(item => settingsScopes.includes(item)));
    for (const item of navigationScopes) {
      if (!settingsScopes.includes(item)) await siteContexts[item].session.flush();
      siteContexts[item].finishNavigationReview(generations[item]);
    }
  }

  async function discardReview(selected: PreviewScope[]) {
    const settings = selected.filter(item => designReviewChanges.some(change => change.scope === item));
    const navigation = selected.filter((item): item is LocalFixtureSiteId => item !== "global" && siteContexts[item].navigationReviewPending);
    if (settings.length) designSettings.checkDiscardReviewedScopes(settings);
    for (const site of navigation) siteContexts[site].checkNavigationDiscard();
    for (const site of navigation) { siteContexts[site].discardNavigationDraft(); siteContexts[site].finishNavigationReview(); }
    if (settings.length) designSettings.discardReviewedScopes(settings);
  }

  const navigationActive = section === "Navigation" && (navigationPaneOpen || navigationOpen || Boolean(siteContext?.navigationReviewPending));
  const requestedPageId = initialScope === scope && initialDocumentId && siteContext?.collection?.documents.some(document => document.id === initialDocumentId && document.kind === "page") ? initialDocumentId : undefined;
  const selectedPageId = siteContext ? pageSelections[scope as LocalFixtureSiteId] ?? requestedPageId ?? (siteContext.collection ? siteContext.homeDocumentId : undefined) : undefined;
  const selectedPage = siteContext && selectedPageId ? siteContext.collection?.documents.find(document => document.id === selectedPageId && document.kind === "page") : undefined;
  const selectedPageIsPublished = Boolean(selectedPage && siteContext?.publicationFor(selectedPage.id).status === "published");
  const localPageVisit = useProjectLocalVisit(scope, selectedPage ? testDocumentHref(selectedPage.id) : "/");
  useEffect(() => {
    const listener = (event: KeyboardEvent) => (section === "Patterns" || section === "Templates") ? undefined : handleStudioHistoryShortcut(event, navigator.platform,
      () => { if (section === "Styles") dispatchStyle({ type: "undo" }); else if (section === "Pages" || section === "Navigation") { if (section === "Pages" || navigationActive && !navigationTransition.current && !departurePending.current) { navigationHistory.current?.(); siteContext?.session.undo(); } } else if (identityPersistence.ready) dispatch({ type: "undo" }); },
      () => { if (section === "Styles") dispatchStyle({ type: "redo" }); else if (section === "Pages" || section === "Navigation") { if (section === "Pages" || navigationActive && !navigationTransition.current && !departurePending.current) { navigationHistory.current?.(); siteContext?.session.redo(); } } else if (identityPersistence.ready) dispatch({ type: "redo" }); });
    // These shortcuts also reach portalled menus while preserving native editing.
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [section, navigationActive, siteContext, identityPersistence.ready, dispatch, dispatchStyle]);
  const displayIdentity = designSettings.hydrated ? history.present : identityPersistence.startup ?? history.present;
  const identity = resolveIdentityPreview(displayIdentity, scope);
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
  const canResetStyles = designScopeReady && Boolean(!designSettings.failure || designSettings.canResetAfterValidationFailure) && Object.keys(currentStyleScope).length > 0;
  const backgroundImage = stylesHistory.present[scope].background?.image === undefined ? stylesHistory.present.global.background?.image : stylesHistory.present[scope].background?.image;
  const images = useMemo(() => {
    const found = new Map<string, IdentityImage>();
    const visit = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      if ("id" in value && typeof value.id === "string" && "blob" in value && value.blob instanceof Blob) {
        const image = value as unknown as IdentityImage;
        found.set(hostedPreviewImageKey(image), { ...image, id: hostedPreviewImageKey(image) });
        return;
      }
      if (Array.isArray(value)) value.forEach(visit);
      else Object.values(value).forEach(visit);
    };
    visit(displayIdentity);
    visit(stylesHistory.present);
    return [...found.values()];
  }, [displayIdentity, stylesHistory.present]);
  const retainsHostedImages = scope !== "global" && !showStyleBook && Boolean(selectedPage);
  const appliedHostedImages = useRef(new Set<string>());
  const sentHostedImages = useRef<{ previewId: number; ids: Set<string> } | null>(null);
  const [retainedHostedRevision, setRetainedHostedRevision] = useState(0);
  const imageRetention = useCallback(() => retainsHostedImages ? new Set([...appliedHostedImages.current, ...(sentHostedImages.current?.ids ?? [])]) : new Set<string>(), [retainsHostedImages]);
  useEffect(() => {
    if (!retainsHostedImages) { appliedHostedImages.current.clear(); sentHostedImages.current = null; }
  }, [retainsHostedImages]);
  const [imageRetry, setImageRetry] = useState(0);
  const imageRecords = useMemo(() => {
    // A retry needs a fresh resource generation even when its Blobs are unchanged.
    void imageRetry;
    return [...images];
  }, [images, imageRetry]);
  const imageResources = useBlobUrlsWithReadiness(imageRecords, true, imageRetention, retainedHostedRevision);
  const imageUrls = imageResources.urls;
  const imageFailure = imageResources.ready && images.some(image => !imageUrls[image.id]);
  const imageUrlFor = useCallback((image: IdentityImage | undefined) => image ? imageUrls[hostedPreviewImageKey(image)] : undefined, [imageUrls]);
  const sampleIdentity = useMemo(() => ({ ...identity, logo: identity.logo ? { ...identity.logo, id: hostedPreviewImageKey(identity.logo) } : undefined, icon: identity.icon ? { ...identity.icon, id: hostedPreviewImageKey(identity.icon) } : undefined }), [identity]);
  const navigationJson = siteContext?.collection ? JSON.stringify({ menus: siteContext.collection.navigationMenus, defaultMenuId: siteContext.collection.defaultNavigationMenuId, assignments: siteContext.collection.navigationAssignments }) : "";
  const hostedNavigation = useMemo<HostedSitePreview["navigation"] | null>(() => navigationJson ? JSON.parse(navigationJson) : null, [navigationJson]);
  const rawHostedPreview = useMemo<Omit<HostedSitePreview, "previewId"> | undefined>(() => {
    if (scope === "global" || !hostedNavigation || !designSettings.hydrated) return undefined;
    const rawDesign = effectiveWebsiteDesign(
      { identity: displayIdentity.global, styles: stylesHistory.present.global } as never,
      { identity: displayIdentity[scope], styles: stylesHistory.present[scope] } as never,
    );
    const portableImages = (value: unknown): unknown => {
      if (!value || typeof value !== "object") return value;
      if ("blob" in value && "id" in value && typeof value.id === "string") {
        const src = imageUrlFor(value as IdentityImage);
        if (!src) return undefined;
        const image = value as unknown as { id: string; name: string; altText: string };
        return { id: image.id, name: image.name, altText: image.altText, src };
      }
      if (Array.isArray(value)) return value.map(portableImages);
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, portableImages(child)]).filter(([, child]) => child !== undefined));
    };
    const design = portableImages(rawDesign) as HostedSitePreview["design"];
    // Wait for object URLs before replacing the saved preview; this avoids a
    // transient missing logo or background while newly selected files load.
    const hasUnresolvedImages = images.some(image => !imageUrls[image.id]);
    if (hasUnresolvedImages) return undefined;
    return { design, navigation: hostedNavigation };
  }, [scope, hostedNavigation, designSettings.hydrated, displayIdentity, stylesHistory.present, imageUrls, imageUrlFor, images]);
  const hostedPreviewJson = rawHostedPreview ? JSON.stringify(rawHostedPreview) : "";
  const hostedSitePreview = useMemo<HostedSitePreview | undefined>(() => hostedPreviewJson ? { ...JSON.parse(hostedPreviewJson), previewId: ++hostedPreviewSequence } : undefined, [hostedPreviewJson]);
  const rememberSentPreview = useCallback((previewId: number) => {
    if (previewId !== hostedSitePreview?.previewId) return;
    sentHostedImages.current = { previewId, ids: new Set(images.map(image => image.id)) };
    setRetainedHostedRevision(revision => revision + 1);
  }, [hostedSitePreview, images]);
  const acknowledgeHostedPreview = useCallback((previewId: number) => {
    if (previewId !== sentHostedImages.current?.previewId) return;
    appliedHostedImages.current = sentHostedImages.current.ids;
    sentHostedImages.current = null;
    setRetainedHostedRevision(revision => revision + 1);
  }, []);
  const rejectHostedPreview = useCallback((previewId: number) => {
    if (previewId !== sentHostedImages.current?.previewId) return;
    sentHostedImages.current = null;
    setRetainedHostedRevision(revision => revision + 1);
  }, []);
  const resetHostedPreview = useCallback(() => {
    appliedHostedImages.current.clear();
    sentHostedImages.current = null;
    setRetainedHostedRevision(revision => revision + 1);
  }, []);
  const backgroundUrl = backgroundImage ? imageUrlFor(backgroundImage) : undefined;
  async function selectPage(document: NonNullable<typeof selectedPage>, edit = false) {
    if (!siteContext || document.kind !== "page" || !siteContext.collection?.documents.some(item => item.id === document.id && item.kind === "page")) return false;
    if (homeEditing && selectedPageId !== document.id && homeFrame.current && !await homeFrame.current.prepareLeave()) return false;
    if (homeEditing && selectedPageId !== document.id) homeEditingChanged(false);
    siteContext.session.setActiveDocument(document.id);
    setPageSelections(current => ({ ...current, [scope as LocalFixtureSiteId]: document.id }));
    if (edit) setPageEditRequest(request => request + 1);
    return true;
  }
  useEffect(() => {
    if (navigationOpen) rootRef.current?.querySelector<HTMLButtonElement>('[aria-label="Close navigation editor"]')?.focus();
    else if (navigationPaneOpen && section === "Navigation") rootRef.current?.querySelector<HTMLButtonElement>('[aria-label="Edit navigation visually"]')?.focus();
  }, [navigationOpen, navigationPaneOpen, section, scope]);
  async function settleNavigation() {
    if (!navigationActive) return true;
    if (siteContext?.navigationReviewPending && !navigationPaneOpen && !navigationOpen && !navigationLeave.current) {
      showReview();
      return false;
    }
    return Boolean(navigationLeave.current && await navigationLeave.current());
  }
  async function closeNavigation() {
    if (navigationTransition.current || departurePending.current) return;
    navigationTransition.current = true;
    try {
      if (!await settleNavigation()) return;
      if (navigationOpen) setNavigationOpen(false);
      else {
        setNavigationPaneOpen(false);
        requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>(".site-navigation-overview-entry")?.focus());
      }
    } finally { navigationTransition.current = false; }
  }
  async function openNavigation(visual = false, menuId?: string) {
    if (!siteContext?.siteNavigation || navigationTransition.current || departurePending.current) return;
    if (menuId) setNavigationMenuSelections(current => ({ ...current, [scope as LocalFixtureSiteId]: menuId }));
    navigationTransition.current = true;
    try {
      try { await designSettings.flush(); } catch { return; }
      if (homeEditing && homeFrame.current && !await homeFrame.current.prepareLeave()) return;
      if (!await settleNavigation()) return;
      if (homeEditing) homeEditingChanged(false);
      setNavigationPaneOpen(true);
      setNavigationOpen(visual);
    } finally { navigationTransition.current = false; }
  }
  function mutateNavigationMenus(update: (current: { menus: import("../test-site/contract").SiteNavigationMenu[]; defaultMenuId: string; assignments: import("../test-site/contract").SiteNavigationAssignment[] }) => { menus: import("../test-site/contract").SiteNavigationMenu[]; defaultMenuId: string; assignments: import("../test-site/contract").SiteNavigationAssignment[] }) {
    if (!siteContext) return false;
    return siteContext.commitNavigationMenus(update);
  }
  function duplicateNavigation(menuId: string) {
    return mutateNavigationMenus(current => {
      if (current.menus.length >= 100) throw new Error("This site already has 100 navigation menus.");
      const source = current.menus.find(menu => menu.id === menuId);
      if (!source) throw new Error("The navigation menu is no longer available.");
      const duplicateLinks = (links: typeof source.links): typeof source.links => links.map(link => ({ ...link, id: templateId(), ...(!isNavigationSpacer(link) && link.children ? { children: duplicateLinks(link.children) } : {}) }));
      const baseName = `Copy of ${source.name}`.slice(0, 80);
      let name = baseName; let suffix = 2;
      while (current.menus.some(menu => menu.name.toLocaleLowerCase() === name.toLocaleLowerCase())) name = `${baseName.slice(0, 76)} ${suffix++}`;
      const id = templateId();
      setNavigationMenuSelections(value => ({ ...value, [scope as LocalFixtureSiteId]: id }));
      return { ...current, menus: [...current.menus, { id, name, links: duplicateLinks(source.links) }] };
    });
  }
  function renameNavigation(menuId: string, name: string) {
    if (!name.trim() || name.length > 80) return false;
    return mutateNavigationMenus(current => {
      if (current.menus.some(menu => menu.id !== menuId && menu.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase())) throw new Error("A navigation menu already uses that name.");
      return { ...current, menus: current.menus.map(menu => menu.id === menuId ? { ...menu, name: name.trim() } : menu) };
    });
  }
  function deleteNavigation(menuId: string) {
    return mutateNavigationMenus(current => {
      if (current.menus.length <= 1) throw new Error("The site must keep at least one navigation menu.");
      const menus = current.menus.filter(menu => menu.id !== menuId);
      const defaultMenuId = menuId === current.defaultMenuId ? menus[0].id : current.defaultMenuId;
      setNavigationMenuSelections(value => ({ ...value, [scope as LocalFixtureSiteId]: defaultMenuId }));
      return { ...current, menus, defaultMenuId, assignments: current.assignments.map(item => item.menuId === menuId ? { ...item, menuId: defaultMenuId } : item) };
    });
  }
  function createNavigationMenu() {
    return mutateNavigationMenus(current => {
      if (current.menus.length >= 100) throw new Error("This site already has 100 navigation menus.");
      const id = templateId(); let name = "New menu"; let suffix = 2;
      while (current.menus.some(menu => menu.name.toLocaleLowerCase() === name.toLocaleLowerCase())) name = `New menu ${suffix++}`;
      setNavigationMenuSelections(value => ({ ...value, [scope as LocalFixtureSiteId]: id }));
      return { ...current, menus: [...current.menus, { id, name, links: [] }] };
    });
  }
  async function selectSection(next: typeof section) {
    if (navigationTransition.current || departurePending.current) return;
    if (next === section) {
      if (next === "Styles") { setStylesView("menu"); setTypographyNavigation({ view: "menu", role: "text" }); }
      return;
    }
    navigationTransition.current = true;
    try {
      if (homeEditing && homeFrame.current && !await homeFrame.current.prepareLeave()) return;
      if (!await settleNavigation()) return;
      if (homeEditing) homeEditingChanged(false);
      if (next === "Patterns" || next === "Templates") setPageEditRequest(0);
      setSection(next);
      if (next === "Styles") { setStylesView("menu"); setTypographyNavigation({ view: "menu", role: "text" }); }
      else if (next === "Identity") setTypographyNavigation({ view: "menu", role: "text" });
    } finally { navigationTransition.current = false; }
  }
  async function selectScope(next: PreviewScope) {
    if (next === scope || navigationTransition.current || departurePending.current) return;
    navigationTransition.current = true;
    try {
      try { await designSettings.flush(); } catch { return; }
      if (scope !== "global" && homeEditing && homeFrame.current && !await homeFrame.current.prepareLeave()) return;
      if (!await settleNavigation()) return;
      if (homeEditing) homeEditingChanged(false);
      if (next === "global") { setNavigationOpen(false); setNavigationPaneOpen(false); if (section === "Navigation") setSection("Identity"); }
      setStudioLibraryKind(next === "global" ? "page" : getStudioNavigationPreview(next)?.libraryKind ?? "page", next);
      const url = new URL(window.location.href);
      url.searchParams.set("site", next);
      url.searchParams.delete("documentId");
      window.history.replaceState(window.history.state, "", url);
      setScope(next); setPageStatus("all"); setTypographyNavigation({ view: "menu", role: "text" });
    } finally { navigationTransition.current = false; }
  }
  const departurePending = useRef(false);
  function departureHandler(event: import("react").MouseEvent, link: HTMLAnchorElement | null) {
    const handleDeparture = createDepartureLinkHandler(async () => {
      if (navigationTransition.current) return false;
      if (!await flushSitesDisclosureSaves()) return false;
      await designSettings.flush();
      if (reviewItems.length) { await requestReview(link); return false; }
      if (homeEditing && homeFrame.current && !await homeFrame.current.prepareLeave()) return false;
      return await settleNavigation();
    }, href => router.push(href), undefined, departurePending);
    handleDeparture(event, link);
  }
  function change(patch: Partial<SiteIdentity>) { dispatch({ type: "change", site: scope, patch }); }
  const hostedSaveKey = `${scope}:${selectedPage?.id ?? ""}`;
  const documentSaveStatus = scope !== "global" && !showStyleBook && hostedSave?.key === hostedSaveKey ? hostedSave.status : null;
  const cachedStudioNavigation = scope === "global" ? undefined : getStudioNavigationPreview(scope);
  const studioNavigationReady = Boolean(siteContext?.collection);
  const liveTemplateStore = sessions.globals.library?.templates;
  const templateEntries = liveTemplateStore ? templateLibraryEntries(liveTemplateStore).filter(({ entry }) => entry.kind === "page" || entry.kind === "post") : [];
  const patternParts = liveTemplateStore ? templateLibraryEntries(liveTemplateStore).filter(({ entry }) => entry.kind === "header" || entry.kind === "footer") : [];
  const liveStudioDocuments = siteContext?.session.workspace.documents;
  const cachedStudioDocuments = cachedStudioNavigation?.documents;
  const studioDocuments = useMemo(() => studioNavigationReady ? liveStudioDocuments ?? [] : cachedStudioDocuments ?? [], [studioNavigationReady, liveStudioDocuments, cachedStudioDocuments]);
  const studioPageDocuments = useMemo(() => orderedLibraryDocuments(studioDocuments, "page"), [studioDocuments]);
  const studioPageIds = useMemo(() => studioPageDocuments.map(document => document.id), [studioPageDocuments]);
  const studioPageReordering = useLibraryReordering(studioPageIds, studioNavigationReady && studioLibraryKind === "page" && Boolean(siteContext?.session.writable), move =>
    siteContext?.session.commit(current => reorderLibraryDocuments(current, "page", move)) ?? false,
    `${scope}/site-editor-pages`);
  const liveStudioTemplates = useMemo(() => liveTemplateStore ? templateLibraryEntries(liveTemplateStore).map(({ set, entry }) => ({ id: entry.id, setId: set.id, name: entry.name, kind: entry.kind })) : undefined, [liveTemplateStore]);
  const liveStudioTemplateCount = sessions.globals.library?.templates.sets.reduce((count, set) => count + set.templates.length + set.parts.length, 0) ?? null;
  const studioTemplateCount = liveStudioTemplateCount ?? cachedStudioNavigation?.templateCount ?? null;
  const studioBinCount = studioNavigationReady ? siteContext!.session.workspace.bin.length + siteContext!.templates.store.bin.length + (sessions.globals.library?.templates.bin.length ?? 0) : cachedStudioNavigation?.binCount ?? 0;
  useEffect(() => {
    if (scope === "global" || !studioNavigationReady) return;
    saveStudioNavigationPreview(scope, {
      documents: studioDocuments.map(({ id, kind, title, slug, status, pageOrder }) => ({ id, kind, title, slug, status, ...(pageOrder === undefined ? {} : { pageOrder }) })),
      templates: liveStudioTemplates ?? cachedStudioNavigation?.templates ?? [],
      libraryKind: studioLibraryKind,
      templateCount: liveStudioTemplateCount,
      binCount: studioBinCount,
    });
  }, [scope, studioNavigationReady, studioDocuments, studioLibraryKind, liveStudioTemplateCount, liveStudioTemplates, cachedStudioNavigation?.templates, studioBinCount]);
  function navigateToStudioMode(mode: "files" | "backup" | "bin") {
    const query = new URLSearchParams();
    if (scope !== "global") query.set("site", scope);
    query.set("mode", mode);
    window.location.assign(`/studio?${query.toString()}`);
  }
  const studioLibraryDocuments = studioLibraryKind === "page" ? studioPageDocuments : studioDocuments.filter(document => document.kind === studioLibraryKind);
  const studioTemplateEntries = liveStudioTemplates ?? cachedStudioNavigation?.templates ?? [];
  const studioTemplateList = <div className="document-list site-editor-studio-document-list">
    {studioTemplateEntries.map(entry => <button className="document-item template-target-item" key={`${entry.setId}/${entry.id}`} type="button" disabled={!liveStudioTemplates} onClick={() => {
      if (!liveStudioTemplates) return;
      const target = { setId: entry.setId, targetId: entry.id, scope: "global" as const };
      if (scope === "global") { if (reviewItems.length) void requestReview(); else router.push(studioContextPath(null, "templates", target)); }
      else openTemplate(scope, target);
    }}>
      <span className="document-kind-mark" aria-hidden="true">{templateNameInitial(entry.name)}</span>
      <span><strong>{entry.name}</strong><small>{entry.kind === "header" || entry.kind === "footer" || entry.kind === "overlay" ? `Shared ${entry.kind}` : `${entry.kind} template`}</small></span>
      <LibraryDragHandle enabled={false} />
    </button>)}
    {liveStudioTemplates && studioTemplateEntries.length === 0 ? <p className="document-list-empty">No templates yet.</p> : null}
  </div>;
  const studioDocumentList = studioLibraryKind === "templates" ? studioTemplateList : <div className="document-list site-editor-studio-document-list" {...(studioLibraryKind === "page" ? studioPageReordering.listProps : {})}>
    {studioLibraryKind === "page" ? <DragPlacementIndicator line={studioPageReordering.line} /> : null}
    {scope === "global" ? <p className="document-list-empty">Select a site to view its {studioLibraryKind === "page" ? "pages" : "posts"}.</p> : studioLibraryDocuments.map(document => {
      const reorderProps = document.kind === "page" ? studioPageReordering.rowProps(document.id) : { "data-library-entry-id": document.id };
      const row = <>
        <span className="document-kind-mark">{document.kind === "page" ? "P" : "A"}</span>
        <span><strong>{document.title}</strong><small>/{document.slug}</small></span>
        <span className={`document-status is-${document.status}`}>{document.status.charAt(0).toUpperCase() + document.status.slice(1)}</span>
        <LibraryDragHandle enabled={document.kind === "page" && studioPageReordering.canReorder} />
      </>;
      return document.kind === "page" ? <button
        {...reorderProps}
        className={`document-item${document.id === selectedPageId ? " is-active" : ""}${!studioNavigationReady ? " is-navigation-preview" : ""}`}
        key={document.id}
        type="button"
        disabled={!studioNavigationReady}
        onClick={() => { const liveDocument = siteContext?.session.workspace.documents.find(item => item.id === document.id); if (!liveDocument) return; void selectPage(liveDocument).then(selected => { if (selected) { setPageStatus("all"); void selectSection("Pages"); } }); }}
        aria-label={`Open ${document.title} in Site Editor`}
      >{row}</button> : <button {...reorderProps} className="document-item is-navigation-preview" key={document.id} type="button" disabled aria-disabled="true" tabIndex={-1}>{row}</button>;
    })}
    {scope !== "global" && studioLibraryKind === "post" ? <a className="button-secondary site-editor-open-content-link" data-studio-departure href={studioContextPath(scope, "post")}>Open Posts in Content Studio</a> : null}
    {studioLibraryKind === "page" ? <span className="visually-hidden" role="status">{studioPageReordering.message}</span> : null}
    {scope !== "global" && studioNavigationReady && studioDocuments.every(document => document.kind !== studioLibraryKind) ? <p className="document-list-empty">No {studioLibraryKind === "page" ? "pages" : "posts"} yet.</p> : null}
  </div>;
  return <SavedWebsiteSettingsContext value={true}><div className={`site-editor-preview site-editor-preview-page${homeEditing ? " is-home-editing" : ""}`} ref={rootRef} onClickCapture={event => departureHandler(event, (event.target as Element).closest<HTMLAnchorElement>("a.studio-app-brand, a[data-studio-departure]"))}>
    <SiteEditorApplicationHeader scopeLabel={name} backHref={studioLibraryPath(scope === "global" ? null : scope, studioLibraryKind)} onReturnToPreview={homeEditing ? () => homeFrame.current?.returnToPreview() : undefined} draftPreview={scope !== "global" && !showStyleBook && Boolean(selectedPage) && !selectedPageIsPublished} saveStatus={navigationActive && siteContext ? siteContext.templates.saveLabel : designSettings.failure ? identityPersistence.status : reviewItems.length ? "Unsaved changes" : identityPersistence.status === "Saving website settings…" ? identityPersistence.status : documentSaveStatus?.label ?? (identityPersistence.status === "Website settings saved locally." ? "Saved locally" : identityPersistence.status === "Saving website settings…" ? "Saving…" : identityPersistence.status)} saveFailure={Boolean(navigationActive ? siteContext?.templates.error : designSettings.failure)} onRetry={navigationActive ? siteContext?.templates.retryConnection : designSettings.canRetrySave ? designSettings.retrySave : designSettings.retry} retryLabel={designSettings.canRetrySave && !navigationActive ? "Retry Save" : "Reload Settings"} viewport={siteViewport} onViewportChange={setSiteViewport} showTemplate={showTemplate} hasTemplate={scope !== "global"} onShowTemplateChange={setShowTemplate}
      reviewAction={reviewItems.length ? <StudioButton type="button" onClick={event => { void requestReview(event.currentTarget); }}>Review {reviewItems.length} {reviewItems.length === 1 ? "change" : "changes"}…</StudioButton> : undefined}
      onPreviewInNewTab={selectedPageIsPublished ? () => { void localPageVisit.openLocal(); } : undefined} previewInNewTabDisabled={!localPageVisit.canVisit || localPageVisit.opening || !selectedPageIsPublished} viewPageAction={selectedPageIsPublished ? <ProjectLocalDocumentButton visit={localPageVisit} label="View page" className="button-secondary studio-header-action" iconOnly /> : undefined} />
    {reviewOpen && reviewItems.length ? <SiteReviewDialog items={reviewItems} opener={reviewOpener} onClose={() => setReviewOpen(false)} onSave={saveReview} onDiscard={discardReview} /> : null}
    {localNoticeError ? <div className="studio-notice" role="alert">{localNoticeError}</div> : null}
    {scope !== "global" && !dismissedLocalNotice ? <LocalWebsiteNotice siteName={localFixtureName(scope)} onDismiss={dismissLocalNotice} /> : null}
    {stylesHistory.notice ? <div className="studio-notice" role="alert">{stylesHistory.notice}</div> : null}
    {designSettings.settingsConflict ? <SettingsConflictNotice scope={scopes.find(item => item.id === designSettings.settingsConflict?.scope)!.name} conflict={designSettings.settingsConflict.conflict} onResolve={designSettings.resolveSettingsConflict} /> : null}
    {documentSaveStatus?.warning ? <SavingRecoveryNotice message={documentSaveStatus.warning} reconnecting={documentSaveStatus.reconnecting} onExportDraft={() => homeFrame.current?.exportDraft()} onReconnect={() => homeFrame.current?.reconnect()} /> : null}
    <main>
    <StudioNavigationWorkspace className="site-editor-studio-shell" label="Site Editor workspace" navigation={<StudioNavigationFrame width={studioNavigationWidth} collapsed={studioNavigationCollapsed} onWidthChange={setStudioNavigationWidth} onCollapsedChange={setStudioNavigationCollapsed}
        selectedSite={scope === "global" ? null : scope} onSelectSite={site => { void selectScope(site); }} onSelectWorkspace={() => { if (reviewItems.length) void requestReview(); else router.push(studioLibraryPath(null, studioLibraryKind)); }}
        contentEditorHref={scope !== "global" && selectedPage && studioLibraryKind === "page" ? studioContentDocumentPath(scope, "page", selectedPage.id) : studioLibraryPath(scope === "global" ? null : scope, studioLibraryKind)}
        siteEditorHref={studioSiteEditorPath(scope, studioLibraryKind === "page" ? selectedPage?.id : undefined, studioLibraryKind, true)}
        libraryKind={studioLibraryKind} onSelectLibraryKind={setStudioLibraryKind}
        counts={{ post: studioDocuments.filter(document => document.kind === "post").length, page: studioDocuments.filter(document => document.kind === "page").length, templates: studioTemplateCount }}
        binCount={studioBinCount} studioSection="site-editor" writable={false} templateWritable={false}
        onOpenFiles={() => navigateToStudioMode("files")} onOpenBackup={() => navigateToStudioMode("backup")} onOpenBin={() => navigateToStudioMode("bin")}
        onOpenTemplates={() => { if (reviewItems.length) void requestReview(); else router.push(studioContextPath(scope === "global" ? null : scope, "templates")); }}
        onExportContent={() => navigateToStudioMode("backup")}>
        {studioDocumentList}
      </StudioNavigationFrame>}>
    {navigationOpen && siteContext?.siteNavigation ? <div className="site-editor-navigation-workspace"><SiteNavigationEditor key={scope} presentation="visual" visual={navigationVisualPresentation(siteContext.templates.store, siteContext.headerReference)} siteId={siteContext.siteId} navigation={siteContext.siteNavigation} templates={siteContext.templates} documents={siteContext.session.workspace.documents} reviewPending={siteContext.navigationReviewPending} onReviewSaved={siteContext.finishNavigationReview} onRequestReview={showReview} prepareToLeaveRef={navigationLeave} historyChangeRef={navigationHistory} onSave={() => siteContext.session.flush()} onClose={() => { void closeNavigation(); }} closeTitle="Back to Navigation" targetControls={<label className="site-editor-preview-scope"><span>Website</span><SelectControl value={scope} onChange={event => { void selectScope(event.currentTarget.value as PreviewScope); }}>{scopes.filter(item => item.id !== "global").map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</SelectControl></label>} /></div> : <TwoLeftPaneWorkspace precedingPaneCount={1} className={`site-editor-preview-layout${showStyleBook ? " is-style-book" : ""}${section === "Pages" ? " is-pages" : ""}`} contentClassName={`site-preview-workspace${showStyleBook ? " site-style-book-workspace" : ""}`} label="Site Editor workspace" primary={

      <Pane label="Site Editor Navigation" side="left" width={section === "Pages" ? pagesNavigationWidth : navigationWidth} minWidth={section === "Pages" ? 250 : 220} maxWidth={section === "Pages" ? 560 : 360} onWidthChange={section === "Pages" ? setPagesNavigationWidth : setNavigationWidth} collapsed={navigationCollapsed} onCollapsedChange={setNavigationCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} className={section === "Pages" ? "site-editor-pages-navigation-pane" : undefined} flushRegions={section === "Pages" ? ["body"] : []} header={section === "Pages" ? null : <div className="site-editor-design-heading"><BackAction href={studioLibraryPath(scope === "global" ? null : scope, studioLibraryKind)} label="Back to Studio" onClick={(event: import("react").MouseEvent<HTMLAnchorElement>) => departureHandler(event, event.currentTarget)} /><h2>Design</h2></div>}>
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
          ] as const).map(item => <button type="button" key={item.label} className={`library-tool-button${item.label === section ? " is-active" : ""}`} aria-current={item.label === section ? "page" : undefined} disabled={item.label !== "Identity" && item.label !== "Styles" && item.label !== "Patterns" && item.label !== "Templates" && !((item.label === "Pages" || item.label === "Navigation") && scope !== "global")} onClick={() => { if (item.label === "Identity" || item.label === "Styles" || item.label === "Patterns" || item.label === "Templates" || (item.label === "Pages" || item.label === "Navigation") && scope !== "global") { void selectSection(item.label); } }}>
            <span><AcmIcon name={item.icon} scale="Regular-M" size={24} /></span><strong>{item.label}</strong><small>{item.label === "Identity" ? "Site title, tagline, and images" : item.label === "Styles" ? "Browse Styles" : item.label === "Pages" ? scope === "global" ? "Select a site" : "Manage website pages" : item.label === "Navigation" ? scope === "global" ? "Select a site" : "Manage website menu" : item.label === "Patterns" ? "Browse template parts" : "Browse templates"}</small>
          </button>)}
        </nav>
        </>}
      </Pane>} secondary={
      <Pane label={`Site Editor ${section === "Navigation" ? "Menu" : section}`} side="left" width={section === "Pages" ? pagesListWidth : settingsWidth} minWidth={section === "Pages" ? 360 : 240} maxWidth={section === "Pages" ? 900 : 420} onWidthChange={section === "Pages" ? setPagesListWidth : setSettingsWidth} collapsed={settingsCollapsed} onCollapsedChange={setSettingsCollapsed} inspectorPopoverOwner={section === "Styles" || section === "Navigation"} className={section === "Pages" ? "site-editor-pages-list-pane" : undefined} flushRegions={section === "Pages" ? ["body"] : []} style={section === "Styles" ? { "--pane-inline-space": "28px" } as CSSProperties : undefined} collapseIcon={<StudioIcon name="chevron-right" size={18} />} header={section === "Pages" || section === "Navigation" && navigationPaneOpen ? null : <><h2>{section}</h2>{section === "Styles" ? <StylesPaneHeaderActions onAdditionalCss={() => setStylesView("css")} styleBookOpen={styleBookOpen} onToggleStyleBook={() => setStyleBookOpen(open => !open)} canReset={canResetStyles} onReset={() => dispatchStyle({ type: "reset", scope })} /> : null}</>}>
        {siteContext ? <div hidden={section !== "Pages"}>
          {siteContext.collection ? <SiteEditorPagesSection key={scope} context={siteContext} siteName={name} selectedId={selectedPageId ?? ""} status={pageStatus} onStatusChange={setPageStatus} onSelectPage={async document => { if (!await selectPage(document)) throw new Error("The page could not be selected. Its current draft has been kept."); }} onEditPage={async document => { if (!await selectPage(document, true)) throw new Error("The page could not be opened. Its current draft has been kept."); }} onViewPublished={document => { void localPageVisit.openLocal(testDocumentHref(document.id)); }} /> : <p role={siteContext.session.loadError ? "alert" : "status"}>{siteContext.session.loadError || `Loading ${name} pages…`}</p>}
        </div> : <p hidden={section !== "Pages"}>Select a site to manage its pages.</p>}
        {section === "Navigation" ? siteContext ? navigationPaneOpen && siteContext.siteNavigation ? <SiteNavigationEditor key={`${scope}:${siteContext.selectedNavigationMenuId}`} presentation="pane" siteId={siteContext.siteId} navigation={siteContext.siteNavigation} templates={siteContext.templates} documents={siteContext.session.workspace.documents} reviewPending={siteContext.navigationReviewPending} onReviewSaved={siteContext.finishNavigationReview} onRequestReview={showReview} prepareToLeaveRef={navigationLeave} historyChangeRef={navigationHistory} onSave={() => siteContext.session.flush()} onClose={() => { void closeNavigation(); }} onEdit={() => { void openNavigation(true); }} /> : <NavigationOverview hideReviewAction siteName={name} ready={Boolean(siteContext.siteNavigation && siteContext.templates.ready)} error={siteContext.session.loadError} menus={siteContext.collection?.navigationMenus} defaultMenuId={siteContext.collection?.defaultNavigationMenuId} reviewPending={siteContext.navigationReviewPending} onReviewSaved={async () => { await siteContext.session.flush(); siteContext.finishNavigationReview(); }} onRetry={() => { void siteContext.reconnect(); }} onOpen={menuId => { void openNavigation(false, menuId); }} onSelect={menuId => setNavigationMenuSelections(current => ({ ...current, [scope as LocalFixtureSiteId]: menuId }))} onCreate={createNavigationMenu} onRename={renameNavigation} onDuplicate={duplicateNavigation} onDelete={deleteNavigation} /> : <p>Select a site to manage its navigation.</p> : null}
        {section === "Patterns" ? <nav className="site-pattern-areas" aria-label="Template part categories">{([["all", "All Template Parts"], ["header", "Header"], ["footer", "Footer"]] as const).map(([area, label]) => <button key={area} type="button" aria-current={patternArea === area ? "page" : undefined} onClick={() => setPatternArea(area)}><span>{label}</span><span>{sessions.globals.library ? patternParts.filter(({ entry }) => area === "all" || entry.kind === area).length : ""}</span></button>)}</nav> : null}
        {section === "Templates" ? <nav className="site-pattern-areas" aria-label="Template categories"><button type="button" aria-current="page"><span>All Templates</span><span>{liveTemplateStore ? templateEntries.length : ""}</span></button></nav> : null}
        <div hidden={section === "Pages" || section === "Navigation" || section === "Patterns" || section === "Templates"}>
        <fieldset className="site-identity-persistence-fields" disabled={!designScopeReady || Boolean(designSettings.failure)}><legend hidden>Website settings</legend>{section === "Styles" ? stylesView === "blocks" ? <BlocksPreview key={scope} viewport={blockViewport} onViewportChange={setBlockViewport} variation={selectedBlockVariation} onVariationChange={setSelectedBlockVariation} selected={selectedBlock} onSelect={id => { setSelectedBlock(id); setSelectedBlockVariation(undefined); }} selection={styleSelection} authored={currentStyleScope} scope={scope} dispatch={dispatchStyle} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('[data-styles-blocks]')?.focus()); }} /> : stylesView === "shadows" ? <ShadowsPreview key={scope} selection={styleSelection} authored={currentStyleScope} scope={scope} dispatch={dispatchStyle} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.site-editor-styles-categories button:nth-child(4)')?.focus()); }} /> : stylesView === "layout" ? <LayoutPreview key={scope} defaultPadding={scope === "global" ? undefined : `0px ${UNIVERSAL_STYLE_PRESET.layout.spacing}px`} selection={styleSelection} authored={currentStyleScope} scope={scope} dispatch={dispatchStyle} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.site-editor-styles-categories button:nth-child(5)')?.focus()); }} /> : stylesView === "background" ? <BackgroundPreview key={scope} selection={styleSelection} authored={currentStyleScope} scope={scope} dispatch={dispatchStyle} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.site-editor-styles-categories button:nth-child(3)')?.focus()); }} /> : (stylesView === "colours" || stylesView === "palette") ? <ColoursPreview view={stylesView === "palette" ? "palette" : "menu"} onViewChange={view => setStylesView(view === "palette" ? "palette" : "colours")} selection={styleSelection} authored={currentStyleScope} scope={scope} dispatch={dispatchStyle} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.site-editor-styles-categories button:nth-child(2)')?.focus()); }} /> : stylesView === "css" ? <AdditionalCssPane key={scope} value={styleSelection.additionalCss ?? ""} authored={currentStyleScope.additionalCss !== undefined} inherited={scope !== "global" && currentStyleScope.additionalCss === undefined && styleSelection.additionalCss !== undefined} onChange={additionalCss => dispatchStyle({ type: "change", scope, patch: { additionalCss } })} onReset={() => dispatchStyle({ type: "reset-css", scope })} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('[aria-label="More Styles actions"]')?.focus()); }} /> : stylesView === "typography" ? <TypographyPreview key={scope} navigation={typographyNavigation} onNavigate={setTypographyNavigation} selection={styleSelection} scope={scope} dispatch={dispatchStyle} authoredTypography={stylesHistory.present[scope].typography ?? {}} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.site-editor-styles-categories button')?.focus()); }} /> : stylesView === "browse" ? <BrowseStyles selection={styleSelection} onChange={patch => dispatchStyle({ type: "change", scope, patch })} onBack={() => { setStylesView("menu"); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>(".site-editor-styles-menu > button")?.focus()); }} inherited={scope !== "global" && Object.keys(stylesHistory.present[scope]).length === 0} onInherit={scope === "global" ? undefined : () => dispatchStyle({ type: "inherit", scope })} /> : <StylesPreviewMenu onBlocks={() => { setSelectedBlock(null); setSelectedBlockVariation(undefined); setStyleBookOpen(true); setStylesView("blocks"); }} onBrowse={() => setStylesView("browse")} onTypography={() => openTypography()} onColours={() => setStylesView("colours")} onBackground={() => setStylesView("background")} onShadows={() => setStylesView("shadows")} onLayout={() => setStylesView("layout")} /> : !identityPersistence.ready && !identityPersistence.startup ? <p aria-busy="true">Loading identity…</p> : <fieldset className="site-identity-persistence-fields" disabled={!identityPersistence.ready}><legend hidden>Identity settings</legend><IdentityControls saved values={displayIdentity} scope={scope} onChange={change} onHide={(field,hidden)=>dispatch({type:"set-hidden",site:scope,field,hidden})} onReset={field=>dispatch({type:"reset-field",site:scope,field})} onResetAll={() => dispatch({ type: "reset-all", site: scope })} onRemoveImage={field=>dispatch({type:"remove-image",site:scope,field})} onChooseImage={(field,opener)=>setPicker({site:scope,field,opener})}/></fieldset> }</fieldset>
        </div>
      </Pane>}>
      <section className="site-editor-preview-book" aria-label={section === "Templates" ? "Templates" : section === "Patterns" ? "Template parts" : `${name} ${showStyleBook ? "Style Book" : "website preview"}`}>
        {imageFailure ? <p role="alert">A preview image could not be loaded. <StudioButton variant="text" onClick={() => setImageRetry(attempt => attempt + 1)}>Retry preview images</StudioButton></p> : null}
        {section === "Templates" ? <div className="site-pattern-catalogue"><h2>All Templates</h2><p>Shared templates are available to every site.</p>{sessions.globals.session.error ? <p role="alert">{sessions.globals.session.error}</p> : !liveTemplateStore || !sessions.globals.session.ready ? <p role="status">Loading templates…</p> : <div className="site-pattern-list">{templateEntries.map(({ set, entry }) => <a key={`${set.id}/${entry.id}`} data-studio-departure href={studioContextPath(scope === "global" ? null : scope, "templates", { setId: set.id, targetId: entry.id, scope: "global" })}><AcmIcon name={entry.kind === "page" ? "document.new-page" : "document.new-post"} size={24} /><span><strong>{entry.name}</strong><small>Shared {entry.kind} template</small></span></a>)}{templateEntries.length === 0 ? <p>No templates in this section.</p> : null}</div>}</div> : section === "Patterns" ? <div className="site-pattern-catalogue"><h2>{patternArea === "all" ? "All Template Parts" : patternArea === "header" ? "Header" : "Footer"}</h2><p>Shared template parts are available to every site.</p>{sessions.globals.session.error ? <p role="alert">{sessions.globals.session.error}</p> : !liveTemplateStore || !sessions.globals.session.ready ? <p role="status">Loading template parts…</p> : <div className="site-pattern-list">{patternParts.filter(({ entry }) => patternArea === "all" || entry.kind === patternArea).map(({ set, entry }) => <a key={`${set.id}/${entry.id}`} data-studio-departure href={studioContextPath(scope === "global" ? null : scope, "templates", { setId: set.id, targetId: entry.id, scope: "global" })}><AcmIcon name={entry.kind === "header" ? "layout.header" : "layout.footer"} size={24} /><span><strong>{entry.name}</strong><small>Shared {entry.kind}</small></span></a>)}{patternParts.filter(({ entry }) => patternArea === "all" || entry.kind === patternArea).length === 0 ? <p>No template parts in this section.</p> : null}</div>}</div> : scope !== "global" && !showStyleBook ? selectedPage ? <SiteHomeFrame key={`${scope}:${selectedPage.id}`} site={scope} documentId={selectedPage.id === siteContext?.homeDocumentId ? undefined : selectedPage.id} documentTitle={selectedPage.title} editRequest={pageEditRequest || undefined} handleRef={homeFrame} onEditing={homeEditingChanged} onReopenPanes={reopenSiteEditorPanes} onOpenTemplate={openTemplate} viewportWidth={homeEditing ? undefined : viewportWidthFor(siteViewport)} showTemplate={showTemplate} onSaveStatus={status => setHostedSave({ key: hostedSaveKey, status })} onPreviewApplied={acknowledgeHostedPreview} onPreviewSent={rememberSentPreview} onPreviewReset={resetHostedPreview} onPreviewRejected={rejectHostedPreview} preview={hostedSitePreview} /> : <p className="site-editor-unavailable-page" role={siteContext?.session.loadError ? "alert" : "status"}>{siteContext?.session.loadError || (siteContext?.collection ? "This page is no longer available. Return to Pages and choose another page." : `Loading ${name} pages…`)}</p> : <ResizablePreviewFrame preferredWidth={viewportWidthFor(showStyleBook && stylesView === "blocks" ? blockViewport : siteViewport)} className="site-preview-stage" style={showStyleBook ? { backgroundColor: palette.colours[0], color: palette.text } : undefined}><AdditionalCssPreview source={section === "Styles" ? styleSelection.additionalCss ?? "" : ""}>{!designSettings.hydrated && !identityPersistence.startup ? <p aria-busy="true">Loading identity…</p> : showStyleBook ? <StyleBook backgroundImageUrl={backgroundUrl} selection={styleSelection} onBlock={id => { setSelectedBlock(id); setSelectedBlockVariation(undefined); setStylesView("blocks"); }} context={stylesView === "blocks" ? { block: selectedBlock, variation: selectedBlockVariation } : stylesView === "colours" || stylesView === "palette" ? "colours" : stylesView === "typography" ? typographyNavigation.view === "element" ? typographyNavigation.role : "typography" : "overview"} onTypography={openTypography} onColours={() => setStylesView("palette")} onBrowse={() => setStylesView("browse")} /> : <div className="site-identity-page"><IdentityPreviewTab identity={sampleIdentity} scope={scope} imageUrls={imageUrls}/><BackgroundPreviewSurface enabled={section === "Styles"} className={section === "Styles" ? "site-style-preview has-site-layout" : undefined} background={section === "Styles" ? styleSelection.background : undefined} palette={palette} colours={styleSelection.colours} imageUrl={section === "Styles" ? backgroundUrl : undefined} style={section === "Styles" ? { ...stylePreviewVars, ...roleStyle("text"), ...previewLayoutCss(styleSelection.layout) } : undefined}><IdentityPreviewHeader identity={sampleIdentity} scope={scope} imageUrls={imageUrls} titleStyle={section === "Styles" ? roleStyle("h2") : undefined}/>{section === "Styles" ? <ComparisonHome selection={styleSelection} /> : <BlockRenderer variant="studio" blocks={[{ id: "identity-preview-body", type: "paragraph", text: "This sample page shows your identity changes as you make them. Your existing sites and templates stay unchanged." }]} />}</BackgroundPreviewSurface>
        </div>}</AdditionalCssPreview></ResizablePreviewFrame>}
      </section>

    </TwoLeftPaneWorkspace>}
    </StudioNavigationWorkspace>
    </main>
    {picker ? <IdentityImagePicker saved title={`Choose ${picker.field === "logo" ? "Logo" : "Icon"}`} opener={picker.opener} onClose={() => setPicker(null)} onChoose={image => { dispatch({ type: "change", site: picker.site, patch: { [picker.field]: image } }); setPicker(null); }} /> : null}
  </div></SavedWebsiteSettingsContext>;
}
