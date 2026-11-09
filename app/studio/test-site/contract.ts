import { containsGeneralTemplatePart } from "../reference-template-parts-contract";
import { containsWebsiteFont } from "../../content/website-fonts";
import { containsBoxSideOverrides } from "../../content/box-lengths";
import { containsPullquote } from "../../content/pullquote-block";
import { containsCodeRuns, containsCodeMonospaceFont } from "../../content/code-runs";
import { containsCoreSocialLink } from "../../content/social-services";
import { containsCoverBlock, containsCoverContentPosition, containsCoverInnerContentWidth, containsCoverVideoBackground, containsNativeCoverVideoSource } from "../../content/cover-block";
import { containsVideoBlock } from "../../content/video-block";
import { containsButtonsAlignment } from "../../content/buttons-alignment";
import { containsAuthoredAuthorDuotone, containsAuthoredFeaturedImageDuotone, containsAuthoredImageDuotone } from "../../content/image-duotone";
import { containsAuthoredFeaturedImageOverlay } from "../../content/featured-image-overlay";
import { containsDetailsPresentation } from "../../content/details-block";
import { containsImageResolution } from "../../content/image-resolution";
import { containsAuthorBlockPresentation } from "../../content/author-profile-presentation";
import { containsAuthoredCoverCrop, containsAuthoredImageCrop } from "../../content/image-edit";
import { containsGroupGridFillAvailableSpace, containsFlexItemSizing, containsScopedFlexItemSizing } from "../../content/layout";
import { containsColumnWidthUnit } from "../../content/columns";
import { containsPostDateTimeOverride } from "../../content/document-metadata";
import { containsExtendedGroupShadow, containsExtraBlackAppearance, containsGroupHeadingStyles, containsQuotePresentation } from "../../content/quote-presentation";
import { containsExtendedImageAspectRatio } from "../../content/image-aspect-ratios";
import { containsTableCellAlignment } from "../../content/table-cell-metadata";
import { containsUnsetWebsiteGradient, validateWebsiteDesign, type WebsiteDesign } from "../site-editor/website-design";
import { containsResponsiveStyles } from "../../content/responsive-styles";
import { validGlobalTemplateBindings, type GlobalTemplateBinding } from "../global-template-contract";
import { createUniversalStylePreset } from "../ui/styles/canonical-style-guide";
import { navigationEntries } from "../navigation-items";
import { isLocalFixtureSiteId, localFixtureName, type LocalFixtureSiteId } from "./sites";
import { migrateLegacyBlockTypeNames, type ContentBlock } from "../../content/model";
import type { NavigationItem } from "../template-model";
import type { StudioWorkspace, StudioDocument } from "../editor-model";
import { containsQueryLoop, validContentBlocks, validateStudioWorkspace } from "../workspace-validation";

import { containsSiteTitle, containsAutomaticNavigationPageList, containsNavigationSearch, containsNavigationSearchStyle, containsNavigationSearchDisplayWidth, containsNavigationHomeLink, containsNavigationSpacer, containsNavigationPageListBlock, containsTemplateContentTagName, emptyTemplateStore, resolveTemplate, validateTemplateStore, type TemplateStore, type TemplateSet, type TemplateAssignment } from "../template-model";
import { containsTemplateContentButtonStyle } from "../../content/template-content-button-style";
import { containsGridItemSizing } from "../../content/grid-child-sizing";

export const TEST_REGIONS = ["header", "main", "footer"] as const;
type Group = Extract<ContentBlock, { type: "group" }>;
type LegacyTestSiteDocument = { format: "acm-test-site"; version: 1; siteId: "test"; regions: Record<typeof TEST_REGIONS[number], Group> };
export type SiteNavigationReference = { setId: string; partId: string };
export type SiteNavigationMenu = { id: string; name: string; links: NavigationItem[] };
export type SiteNavigationAssignment = { navigationId: string; menuId: string };
type LegacyTestSiteCollection = {
  format: "acm-test-site"; version: 3; siteId: LocalFixtureSiteId;
  documents: StudioWorkspace["documents"]; categories: StudioWorkspace["categories"]; bin: StudioWorkspace["bin"];
  activeDocumentId: string; homeDocumentId: string; templates: TemplateStore;
  browserImportComplete: boolean;
};
export type LocalSitePublication = { document: StudioDocument; assignment?: TemplateAssignment };
type LegacyVersionedTestSiteCollection = Omit<LegacyTestSiteCollection, "version"> & { siteNavigation: SiteNavigationReference } & ({ version: 4; globalTemplates?: never } | { version: 5; globalTemplates: GlobalTemplateBinding[] } | { version: 6; globalTemplates: GlobalTemplateBinding[]; publications: LocalSitePublication[] } | { version: 7; globalTemplates: GlobalTemplateBinding[]; publications: LocalSitePublication[] } | { version: 8; globalTemplates: GlobalTemplateBinding[]; publications: LocalSitePublication[]; websiteDesign?: WebsiteDesign } | { version: 9; globalTemplates: GlobalTemplateBinding[]; publications: LocalSitePublication[]; websiteDesign?: WebsiteDesign } | { version: 10; globalTemplates: GlobalTemplateBinding[]; publications: LocalSitePublication[]; websiteDesign?: WebsiteDesign } | { version: 11; globalTemplates: GlobalTemplateBinding[]; publications: LocalSitePublication[]; websiteDesign?: WebsiteDesign });
export type CurrentTestSiteCollection = Omit<LegacyTestSiteCollection, "version"> & { siteNavigation: SiteNavigationReference; globalTemplates: GlobalTemplateBinding[]; publications: LocalSitePublication[]; websiteDesign?: WebsiteDesign; version: 55; navigationMenus: SiteNavigationMenu[]; defaultNavigationMenuId: string; navigationAssignments: SiteNavigationAssignment[] };
type LegacyNavigationSiteCollection = Omit<CurrentTestSiteCollection, "version"> & ({ version: 12 } | { version: 13 } | { version: 14 } | { version: 15 } | { version: 16 } | { version: 17 } | { version: 18 } | { version: 19 } | { version: 20 } | { version: 21 } | { version: 22 } | { version: 23 } | { version: 24 } | { version: 25 } | { version: 26 } | { version: 27 } | { version: 28 } | { version: 29 } | { version: 30 } | { version: 31 } | { version: 32 } | { version: 33 } | { version: 34 } | { version: 35 } | { version: 36 } | { version: 37 } | { version: 38 } | { version: 39 } | { version: 40 } | { version: 41 } | { version: 42 } | { version: 43 } | { version: 44 } | { version: 45 } | { version: 46 } | { version: 47 } | { version: 48 } | { version: 49 } | { version: 50 } | { version: 51 } | { version: 52 } | { version: 53 } | { version: 54 });
export type TestSiteCollection = LegacyVersionedTestSiteCollection | LegacyNavigationSiteCollection | CurrentTestSiteCollection;
export type TestSiteDocument = TestSiteCollection | LegacyTestSiteCollection | LegacyTestSiteDocument | { format: "acm-test-site"; version: 2; siteId: "test"; document: StudioDocument };
export type TestSnapshot = { revision: string; document: TestSiteDocument; previewRevision: string };
function record(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function hasLocalMedia(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasLocalMedia);
  if (!record(value)) return false;
  return Object.entries(value).some(([key, child]) => ((key === "mediaId" || key === "backgroundImageMediaId") && typeof child === "string" && child.length > 0) || (["src", "url", "backgroundImage", "backgroundImageUrl", "href"].includes(key) && typeof child === "string" && child.startsWith("blob:")) || hasLocalMedia(child));
}
function hasPageOrder(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasPageOrder);
  if (!record(value)) return false;
  return Object.hasOwn(value, "pageOrder") || Object.values(value).some(hasPageOrder);
}
function templateNavigationNodeIds(value: unknown, ids = new Set<string>()): Set<string> {
  if (Array.isArray(value)) { for (const child of value) templateNavigationNodeIds(child, ids); return ids; }
  if (!record(value)) return ids;
  if (value.type === "element" && value.element === "navigation" && typeof value.id === "string") ids.add(value.id);
  for (const child of Object.values(value)) templateNavigationNodeIds(child, ids);
  return ids;
}
export function validTestSiteDocument(value: unknown): value is TestSiteDocument {
  if (record(value) && (value.version as number) < 53 && containsNavigationPageListBlock(value)) return false;
  if (record(value) && (value.version as number) < 55 && containsScopedFlexItemSizing(value)) return false;
  if (record(value) && (value.version as number) < 52 && containsQueryLoop(value)) return false;
  if (record(value) && (value.version as number) < 51 && containsGeneralTemplatePart(value)) return false;
  if (record(value) && (value.version as number) < 50 && containsSiteTitle(value)) return false;
  if (record(value) && (value.version as number) < 49 && containsUnsetWebsiteGradient(value.websiteDesign)) return false;
  if (record(value) && (value.version as number) < 48 && containsWebsiteFont(value)) return false;
  if (record(value) && (value.version as number) < 47 && containsBoxSideOverrides(value)) return false;
  if (record(value) && (value.version as number) < 46 && containsPullquote(value)) return false;
  value = migrateLegacyBlockTypeNames(value);
  if (record(value) && (value.version as number) < 45 && containsNativeCoverVideoSource(value)) return false;
  if (record(value) && (value.version as number) < 44 && containsVideoBlock(value)) return false;
  if (record(value) && (value.version as number) < 43 && containsCoverVideoBackground(value)) return false;
  if (record(value) && (value.version as number) < 42 && containsAuthoredCoverCrop(value)) return false;
  if (record(value) && (value.version as number) < 39 && containsCoreSocialLink(value)) return false;
  if (record(value) && (value.version as number) < 35 && containsCoverBlock(value)) return false;
  if (record(value) && (value.version as number) < 41 && containsCoverInnerContentWidth(value)) return false;
  if (record(value) && (value.version as number) < 40 && containsCoverContentPosition(value)) return false;
  if (record(value) && (value.version as number) < 34 && containsCodeMonospaceFont(value)) return false;
  if (record(value) && (value.version as number) < 32 && containsNavigationSpacer(value)) return false;
  if (record(value) && (value.version as number) < 31 && containsNavigationHomeLink(value)) return false;
  if (record(value) && (value.version as number) < 30 && containsNavigationSearchDisplayWidth(value)) return false;
  if (record(value) && (value.version as number) < 29 && containsGridItemSizing(value)) return false;
  if (record(value) && (value.version as number) < 27 && containsAuthoredFeaturedImageOverlay(value)) return false;
  if (record(value) && (value.version as number) < 26 && containsNavigationSearchStyle(value)) return false;
  if (record(value) && (value.version as number) < 24 && containsAutomaticNavigationPageList(value)) return false;
  if (record(value) && (value.version as number) < 25 && containsNavigationSearch(value)) return false;
  if (record(value) && (value.version as number) < 23 && containsPostDateTimeOverride(value)) return false;
  if (record(value) && (value.version as number) < 22 && containsColumnWidthUnit(value)) return false;
  if (record(value) && (value.version as number) < 21 && containsFlexItemSizing(value)) return false;
  if (record(value) && (value.version as number) < 20 && containsTemplateContentButtonStyle(value)) return false;
  if (record(value) && (value.version as number) < 37 && containsAuthorBlockPresentation(value)) return false;
  if (record(value) && (value.version as number) < 38 && containsAuthoredAuthorDuotone(value)) return false;
  if (record(value) && (value.version as number) < 36 && containsAuthoredImageCrop(value)) return false;
  if (containsImageResolution(value)) return false;
  if (record(value) && (value.version as number) < 19 && containsTemplateContentTagName(value)) return false;
  if (record(value) && (value.version as number) < 18 && containsGroupGridFillAvailableSpace(value)) return false;
  if (record(value) && (value.version as number) < 16 && containsButtonsAlignment(value)) return false;
  if (record(value) && (value.version as number) < 15 && containsAuthoredImageDuotone(value)) return false;
  if (record(value) && (value.version as number) < 17 && containsAuthoredFeaturedImageDuotone(value)) return false;
  if (record(value) && (value.version as number) < 14 && containsQuotePresentation(value)) return false;
  if (record(value) && (value.version as number) < 53 && containsGroupHeadingStyles(value)) return false;
  if (record(value) && (value.version as number) < 53 && containsExtendedGroupShadow(value)) return false;
  if (record(value) && (value.version as number) < 53 && containsExtraBlackAppearance(value)) return false;
  if (record(value) && (value.version as number) < 13 && containsExtendedImageAspectRatio(value)) return false;
  if (record(value) && (value.version as number) < 10 && containsTableCellAlignment(value)) return false;
  if (hasLocalMedia(value) || record(value) && (value.version as number) < 8 && containsResponsiveStyles(value)) return false;
  if (record(value) && (value.version as number) < 11 && hasPageOrder(value)) return false;
  if (record(value) && (value.version as number) < 33 && containsCodeRuns(value)) return false;
  if (record(value) && (value.version as number) < 28 && containsDetailsPresentation(value)) return false;
  if (!record(value) || value.format !== "acm-test-site" || !isLocalFixtureSiteId(value.siteId) || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55].includes(value.version as number) || ((value.version as number) < 3 && value.siteId !== "test")) return false;
  if (value.version === 1) {
    if (!record(value.regions) || Object.keys(value).sort().join() !== "format,regions,siteId,version" || Object.keys(value.regions).sort().join() !== "footer,header,main") return false;
    const blocks = TEST_REGIONS.map(region => (value.regions as Record<string, unknown>)[region]);
    return validContentBlocks(blocks) && blocks.every((block, index) => block.type === "group" && block.id === `test-${TEST_REGIONS[index]}` && block.tagName === TEST_REGIONS[index]);
  }
  if ([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55].includes(value.version as number)) {
    const version = value.version as number;
    const hasPublications = version >= 6;
    const hasNavigation = version >= 4;
    const hasBindings = version >= 5;
    const hasDesign = version >= 8;
    const keys = ["activeDocumentId", "bin", "browserImportComplete", "categories", "documents", "format", "homeDocumentId", "siteId", "templates", "version"];
    if (hasNavigation) keys.push("siteNavigation");
    if (hasBindings) keys.push("globalTemplates");
    if (hasPublications) keys.push("publications");
    if (hasDesign && value.websiteDesign !== undefined) keys.push("websiteDesign");
    if (version >= 12) keys.push("defaultNavigationMenuId", "navigationAssignments", "navigationMenus");
    if (Object.keys(value).sort().join() !== keys.sort().join()
      || typeof value.browserImportComplete !== "boolean" || typeof value.homeDocumentId !== "string") return false;
    try {
      if (hasDesign && value.websiteDesign !== undefined) validateWebsiteDesign(value.websiteDesign);
      const workspaceVersion = version >= 55 ? 64 : version >= 53 ? 63 : version >= 52 ? 62 : version >= 51 ? 61 : version >= 50 ? 60 : version >= 48 ? 59 : version >= 47 ? 58 : version >= 46 ? 57 : version >= 45 ? 56 : version >= 44 ? 55 : version >= 43 ? 54 : version >= 42 ? 53 : version >= 41 ? 52 : version >= 40 ? 51 : version >= 39 ? 50 : version >= 38 ? 49 : version >= 37 ? 48 : version >= 36 ? 47 : version >= 35 ? 46 : version >= 34 ? 44 : version >= 33 ? 43 : version >= 29 ? 42 : version >= 28 ? 41 : version >= 27 ? 40 : version >= 23 ? 39 : version >= 22 ? 38 : version >= 21 ? 37 : version >= 18 ? 36 : version >= 17 ? 35 : version >= 16 ? 33 : version >= 15 ? 32 : version >= 14 ? 31 : version >= 13 ? 30 : version >= 11 ? 29 : 28;
      const workspace = validateStudioWorkspace({ ...value, version: workspaceVersion });
      if (!workspace.documents.some(document => document.id === value.homeDocumentId && document.kind === "page")) return false;
      const templates = validateTemplateStore(value.templates, workspace.documents);
      if (version >= 12) {
        const menus = value.navigationMenus;
        if (!Array.isArray(menus) || menus.length < 1 || menus.length > 100 || typeof value.defaultNavigationMenuId !== "string" || !Array.isArray(value.navigationAssignments) || value.navigationAssignments.length > 1000) return false;
        if (!templates.sets.length) return false;
        const menuIds = new Set<string>();
        for (const menu of menus) {
          if (!record(menu) || Object.keys(menu).sort().join() !== "id,links,name" || typeof menu.id !== "string" || !menu.id || menu.id.length > 160 || menuIds.has(menu.id)
            || typeof menu.name !== "string" || !menu.name.trim() || menu.name.length > 80 || !Array.isArray(menu.links) || menu.links.length > 100) return false;
          menuIds.add(menu.id);
          validateTemplateStore({ ...templates, sets: templates.sets.map((set, index) => index === 0 ? { ...set, navigation: menu.links } : set) }, workspace.documents);
        }
        if (!menuIds.has(value.defaultNavigationMenuId)) return false;
        const assignments = new Set<string>();
        const navigationNodeIds = templateNavigationNodeIds(templates.sets);
        for (const assignment of value.navigationAssignments) {
          if (!record(assignment) || Object.keys(assignment).sort().join() !== "menuId,navigationId" || typeof assignment.navigationId !== "string" || !assignment.navigationId || assignment.navigationId.length > 160
            || assignments.has(assignment.navigationId) || !navigationNodeIds.has(assignment.navigationId) || typeof assignment.menuId !== "string" || !menuIds.has(assignment.menuId)) return false;
          assignments.add(assignment.navigationId);
        }
      }
      if (hasNavigation) {
        if (hasBindings && !validGlobalTemplateBindings(value.globalTemplates)) return false;
        const reference = value.siteNavigation;
        if (!record(reference) || Object.keys(reference).sort().join() !== "partId,setId"
          || !templates.sets.find(set => set.id === reference.setId)?.parts.some(part => part.id === reference.partId && part.kind === "header")) return false;
      }
      if (hasPublications) {
        if (!Array.isArray(value.publications) || value.publications.length > 1000) return false;
        const ids = new Set<string>();
        const retainedDocuments = [...workspace.documents, ...workspace.bin.map(item => item.document)];
        for (const entry of value.publications) {
          if (!record(entry) || Object.keys(entry).sort().join() !== (entry.assignment ? "assignment,document" : "document") || !record(entry.document)) return false;
          const page = entry.document as StudioDocument;
          if (version >= 7 && (page.status !== "published" && page.status !== "scheduled" || page.status === "scheduled" && !page.publishAt)) return false;
          if (ids.has(page.id) || !retainedDocuments.some(document => document.id === page.id && document.kind === page.kind)) return false;
          ids.add(page.id);
          const categories = (page.categoryIds ?? []).map(id => ({ id, name: id }));
          if (page.parentPageId !== undefined && typeof page.parentPageId !== "string") return false;
          validateStudioWorkspace({ version: version >= 51 ? 61 : version >= 50 ? 60 : version >= 48 ? 59 : version >= 47 ? 58 : version >= 46 ? 57 : version >= 45 ? 56 : version >= 44 ? 55 : version >= 43 ? 54 : version >= 42 ? 53 : version >= 38 ? 49 : version >= 37 ? 48 : version >= 36 ? 47 : version >= 33 ? 43 : version >= 29 ? 42 : version >= 28 ? 41 : version >= 27 ? 40 : version >= 23 ? 39 : version >= 22 ? 38 : version >= 21 ? 37 : version >= 17 ? 34 : version >= 16 ? 33 : version >= 15 ? 32 : version >= 14 ? 31 : version >= 13 ? 30 : version >= 11 ? 29 : 28, documents: [{ ...page, parentPageId: undefined }], categories, bin: [], activeDocumentId: page.id });
          if (entry.assignment) {
            const a = entry.assignment;
            if (!record(a) || Object.keys(a).sort().join() !== "documentId,kind,setId,templateId" || a.documentId !== page.id || a.kind !== page.kind || typeof a.setId !== "string" || typeof a.templateId !== "string") return false;
          }
        }
        if (value.version === 6 && !ids.has(value.homeDocumentId)) return false;
      }
      return true;
    } catch { return false; }
  }
  if (value.version !== 2 || Object.keys(value).sort().join() !== "document,format,siteId,version" || !record(value.document) || value.document.id !== "test-site" || hasLocalMedia(value.document)) return false;
  try {
    const categoryIds = Array.isArray(value.document.categoryIds) ? value.document.categoryIds : [];
    validateStudioWorkspace({ version: 28, documents: [value.document], activeDocumentId: "test-site", bin: [], categories: categoryIds.map(id => ({ id, name: id })) });
    return true;
  } catch { return false; }
}
export function testDocumentToEditor(document: TestSiteDocument, documentId?: string): StudioDocument {
  if ("documents" in document) return document.documents.find(item => item.id === (documentId ?? document.activeDocumentId)) ?? document.documents.find(item => item.id === document.homeDocumentId)!;
  if (document.version === 2) return document.document;
  if (!("regions" in document)) throw new Error("The site document is invalid.");
  return { id: "test-site", kind: "page", title: "Test", slug: "", excerpt: "", status: "draft", updatedAt: "2026-10-07T00:00:00.000Z", tags: [], seoTitle: "Test", seoDescription: "", documentShellVersion: 1, blocks: TEST_REGIONS.map(region => document.regions[region]) };
}
/** Stable IDs keep read-only normalisation and peer-tab migrations identical. */
function withSiteNavigation(collection: LegacyTestSiteCollection): LegacyVersionedTestSiteCollection {
  if (collection.templates.sets.length >= 100) throw new Error("The site already has 100 template sets. Navigation migration needs a free set slot; the original source was kept.");
  const occupied = new Set([...collection.templates.sets.map(set => set.id), ...collection.templates.bin.map(item => item.kind === "set" ? item.set.id : item.setId)]);
  const baseId = `fixture-${collection.siteId}-navigation`;
  let setId = baseId;
  for (let suffix = 1; occupied.has(setId); suffix++) setId = `${baseId}-${suffix}`;
  const partId = `${baseId}-part`;
  const styles = createUniversalStylePreset();
  styles.palette.surface = "#f5f4ef";
  styles.palette.textPrimary = "#171a1d";
  const navigation: TemplateSet = {
    id: setId, name: "Site Navigation", templates: [],
    parts: [{ id: partId, name: "Navigation", kind: "header", nodes: [{ id: `${baseId}-block`, type: "element", element: "navigation", align: "left" }] }],
    identity: { name: collection.siteId === "test2" ? "Test2" : "Test", homeUrl: "/", copyright: "" },
    navigation: collection.documents.slice(0, 100).map((document, index) => ({ id: `${baseId}-link-${index}`, label: (document.title || "Untitled").slice(0, 160), url: testDocumentHref(document.id) })),
    socialLinks: [], styles,
  };
  return { ...collection, version: 4, siteNavigation: { setId, partId }, templates: { ...collection.templates, sets: [...collection.templates.sets, navigation] } };
}
/** v12 moves named menu content and per-block assignments into the site-owned source. */
function withNavigationMenus(collection: LegacyVersionedTestSiteCollection): CurrentTestSiteCollection {
  const menu = collection.templates.sets.find(set => set.id === collection.siteNavigation.setId);
  if (!menu) throw new Error("The site navigation source is missing. Its original data was kept.");
  const id = `fixture-${collection.siteId}-navigation-menu`;
  const publications = "publications" in collection ? collection.publications.map(item => collection.version === 6 ? { ...item, document: { ...item.document, status: "published" as const } } : item) : collection.documents.map(document => {
    const published = { ...structuredClone(document), status: "published" as const };
    const resolved = resolveTemplate(collection.templates, published);
    return { document: published, ...(resolved ? { assignment: { documentId: published.id, kind: published.kind, setId: resolved.set.id, templateId: resolved.templateId } } : {}) };
  });
  return { ...collection, version: 55, navigationMenus: [{ id, name: "Navigation", links: menu.navigation }], defaultNavigationMenuId: id, navigationAssignments: [], globalTemplates: "globalTemplates" in collection ? collection.globalTemplates ?? [] : [], publications };
}
/** Legacy envelopes remain readable. Navigation is seeded once, then explicitly authored. */
export function testSiteCollection(document: TestSiteDocument): CurrentTestSiteCollection {
  if (document.version < 55 && containsScopedFlexItemSizing(document)) throw new Error("Scoped flex child sizing requires local site source v55. Original data has been retained.");
  if (document.version < 53 && containsNavigationPageListBlock(document)) throw new Error("Page List blocks require local site source v53.");
  if (document.version < 52 && containsQueryLoop(document)) throw new Error("Query Loop template blocks require local site source v52.");
  if (document.version < 53 && containsGroupHeadingStyles(document)) throw new Error("Per-level Group heading styles require local site source v53.");
  if (document.version < 53 && containsExtendedGroupShadow(document)) throw new Error("Expanded Group shadow presets require local site source v53.");
  if (document.version < 53 && containsExtraBlackAppearance(document)) throw new Error("Extra Black font appearance requires local site source v53.");
  if (document.version < 51 && containsGeneralTemplatePart(document)) throw new Error("General template parts require local site source v51.");
  if (document.version < 50 && containsSiteTitle(document)) throw new Error("Site Title requires local site source v50.");
  if (document.version < 49 && "websiteDesign" in document && containsUnsetWebsiteGradient(document.websiteDesign)) throw new Error("Unset custom gradients require local site source v49.");
  if ("documents" in document && document.version === 55) {
    const migrated = migrateLegacyBlockTypeNames(document) as CurrentTestSiteCollection;
    if (!validTestSiteDocument(migrated)) throw new Error(`The saved ${localFixtureName(document.siteId)} site is invalid or uses an unsupported version.`);
    return JSON.stringify(migrated) === JSON.stringify(document) ? document : migrated;
  }
  if ("documents" in document && document.version === 54) {
    if (!validTestSiteDocument(document)) throw new Error("The saved site is invalid or uses unsupported content. Its original data has been retained.");
    const migrated = { ...migrateLegacyBlockTypeNames(document), version: 55, templates: validateTemplateStore(document.templates, document.documents) } as CurrentTestSiteCollection;
    if (!validTestSiteDocument(migrated)) throw new Error(`The saved ${localFixtureName(document.siteId)} site could not be migrated safely. Its original data has been retained.`);
    return migrated;
  }
  if ("documents" in document && document.version === 53) {
    const migrated = { ...migrateLegacyBlockTypeNames(document), version: 55, templates: validateTemplateStore(document.templates, document.documents) } as CurrentTestSiteCollection;
    if (!validTestSiteDocument(migrated)) throw new Error(`The saved ${localFixtureName(document.siteId)} site is invalid or uses an unsupported version.`);
    return migrated;
  }
  if ("documents" in document && (document.version === 51 || document.version === 52)) {
    const migrated = { ...migrateLegacyBlockTypeNames(document), version: 55, templates: validateTemplateStore(document.templates, document.documents) } as CurrentTestSiteCollection;
    if (!validTestSiteDocument(migrated)) throw new Error(`The saved ${localFixtureName(document.siteId)} site could not be migrated safely. Its original data has been retained.`);
    return migrated;
  }
  if ("documents" in document && (document.version === 44 || document.version === 45)) {
    if (!validTestSiteDocument(document)) throw new Error("The saved site is invalid or uses an unsupported version.");
    const workspace = validateStudioWorkspace({ ...document, version: document.version === 45 ? 56 : 55 });
    const migrated: CurrentTestSiteCollection = {
      ...document,
      version: 55,
      documents: workspace.documents,
      categories: workspace.categories,
      bin: workspace.bin,
      templates: validateTemplateStore(document.templates, workspace.documents),
    };
    if (!validTestSiteDocument(migrated)) throw new Error(`The saved ${localFixtureName(document.siteId)} site could not be migrated safely. Its original data has been retained.`);
    return migrated;
  }
  if ("documents" in document && typeof document.version === "number" && document.version >= 3 && document.version <= 49) {
    const sourceVersion = document.version;
    const workspaceVersion = sourceVersion >= 50 ? 60 : sourceVersion >= 48 ? 59 : sourceVersion >= 47 ? 58 : sourceVersion >= 46 ? 57 : sourceVersion >= 45 ? 56 : sourceVersion >= 44 ? 55 : sourceVersion >= 43 ? 54 : sourceVersion >= 42 ? 53 : sourceVersion >= 41 ? 52 : sourceVersion >= 40 ? 51 : sourceVersion >= 39 ? 50 : sourceVersion >= 38 ? 49 : sourceVersion >= 37 ? 48 : sourceVersion >= 36 ? 47 : sourceVersion >= 35 ? 46 : sourceVersion >= 34 ? 44 : sourceVersion >= 33 ? 43 : sourceVersion >= 29 ? 42 : sourceVersion >= 28 ? 41 : sourceVersion >= 27 ? 40 : sourceVersion >= 23 ? 39 : sourceVersion >= 22 ? 38 : sourceVersion >= 21 ? 37 : sourceVersion >= 18 ? 36 : sourceVersion >= 17 ? 35 : sourceVersion >= 16 ? 33 : sourceVersion >= 15 ? 32 : sourceVersion >= 14 ? 31 : sourceVersion >= 13 ? 30 : sourceVersion >= 11 ? 29 : 28;
    const workspace = validateStudioWorkspace({ ...document, version: workspaceVersion });
    const collection = { ...document, documents: workspace.documents, categories: workspace.categories, bin: workspace.bin,
      templates: validateTemplateStore(document.templates, workspace.documents) };
    if (collection.version >= 12) return { ...collection, version: 55 } as CurrentTestSiteCollection;
    const withNavigation = collection.version >= 4 ? collection as LegacyVersionedTestSiteCollection : withSiteNavigation(collection as LegacyTestSiteCollection);
    return withNavigationMenus(withNavigation);
  }
  const page = testDocumentToEditor(document);
  return withNavigationMenus(withSiteNavigation({ format: "acm-test-site", version: 3, siteId: "test", documents: [page],
    activeDocumentId: page.id, homeDocumentId: page.id, bin: [],
    categories: (page.categoryIds ?? []).map(id => ({ id, name: id })),
    templates: emptyTemplateStore(), browserImportComplete: false }));
}
export function testSiteWorkspace(document: CurrentTestSiteCollection, selectedId = document.activeDocumentId): StudioWorkspace {
  return { version: 64, documents: document.documents, categories: document.categories, bin: document.bin,
    activeDocumentId: document.documents.some(item => item.id === selectedId) ? selectedId : document.homeDocumentId };
}
/** Explicit restore completes the import decision, including for older backups. */
export function testSiteBackupSource(value: unknown, expectedSiteId: LocalFixtureSiteId = "test"): TestSiteCollection {
  if (!validTestSiteDocument(value) || value.siteId !== expectedSiteId) throw new Error("This backup belongs to another site or contains unsupported content. The site was kept.");
  return { ...testSiteCollection(value), browserImportComplete: true };
}
export function testDocumentFromEditor(document: StudioDocument, source?: TestSiteDocument): TestSiteDocument | null {
  const candidate = source ? { ...testSiteCollection(source), documents: testSiteCollection(source).documents.map(item => item.id === document.id ? document : item) }
    : { format: "acm-test-site", version: 2, siteId: "test", document };
  return validTestSiteDocument(candidate) ? candidate : null;
}
/** A single source transaction imports authorised drafts without consuming their recovery copies. */
export function importBrowserTestContent(source: TestSiteDocument, workspace: StudioWorkspace, templates: TemplateStore): TestSiteCollection {
  const collection = testSiteCollection(source);
  if (collection.browserImportComplete) return collection;
  const ids = new Set([...collection.documents, ...collection.bin.map(item => item.document)].map(item => item.id));
  if (workspace.documents.some(item => ids.has(item.id)) || workspace.bin.some(item => ids.has(item.document.id))) throw new Error(`As ${localFixtureName(collection.siteId)} already has a document with a browser draft’s ID, the browser originals were kept.`);
  if (collection.templates.sets.some(set => set.id !== collection.siteNavigation.setId || set.templates.length > 0)
    || collection.templates.bin.length || collection.templates.assignments.length || Object.values(collection.templates.defaultTemplateIds ?? {}).some(Boolean)) throw new Error(`${localFixtureName(collection.siteId)} already has templates. The browser originals were kept; import needs review.`);
  const categoryIds = new Set(collection.categories.map(item => item.id));
  if (workspace.categories.some(item => {
    const existing = collection.categories.find(category => category.id === item.id);
    return existing && (existing.name !== item.name || existing.parentId !== item.parentId);
  })) throw new Error(`${localFixtureName(collection.siteId)} has a different category with a browser draft’s ID. The browser originals were kept.`);
  const merged: TestSiteCollection = { ...collection, documents: [...collection.documents, ...workspace.documents],
    bin: [...collection.bin, ...workspace.bin], categories: [...collection.categories, ...workspace.categories.filter(item => !categoryIds.has(item.id))],
    templates: { ...templates, sets: [...templates.sets, ...collection.templates.sets.filter(set => set.id === collection.siteNavigation.setId)] }, browserImportComplete: true };
  const defaultMenu = merged.navigationMenus.find(menu => menu.id === merged.defaultNavigationMenuId)!;
  const entries = navigationEntries(defaultMenu.links);
  if (entries.length + workspace.documents.length > 100) throw new Error("The imported documents would exceed the menu’s 100-link limit. All browser originals were kept.");
  const linkIds = new Set(entries.map(entry => entry.link.id));
  const importedLinks = workspace.documents.map((document, index) => {
    const baseId = `fixture-${collection.siteId}-import-link-${index}`;
    let id = baseId;
    for (let suffix = 1; linkIds.has(id); suffix++) id = `${baseId}-${suffix}`;
    linkIds.add(id);
    return { id, label: (document.title || "Untitled").slice(0, 160), url: testDocumentHref(document.id) };
  });
  const links = [...defaultMenu.links, ...importedLinks];
  const importedPublications = workspace.documents.map(document => {
    const published = { ...structuredClone(document), status: "published" as const };
    const resolved = resolveTemplate(merged.templates, published);
    return { document: published, ...(resolved ? { assignment: { documentId: published.id, kind: published.kind, setId: resolved.set.id, templateId: resolved.templateId } } : {}) };
  });
  const candidate: CurrentTestSiteCollection = { ...merged,
    publications: [...merged.publications.filter(item => !workspace.documents.some(document => document.id === item.document.id)), ...importedPublications],
    navigationMenus: merged.navigationMenus.map(menu => menu.id === defaultMenu.id ? { ...menu, links } : menu),
    templates: { ...merged.templates, sets: merged.templates.sets.map(set => set.id === collection.siteNavigation.setId ? { ...set, navigation: links } : set) } };
  if (!validTestSiteDocument(candidate)) throw new Error(`The browser drafts could not be copied to ${localFixtureName(collection.siteId)}. Browser-managed media needs a portable URL; all originals were kept.`);
  return candidate;
}
export function testDocumentHref(documentId: string) { return `/#document=${encodeURIComponent(documentId)}`; }

/** Editing Undo/Redo never republishes an older aggregate snapshot. */
export function retainLocalPublications(next: TestSiteDocument, current: TestSiteDocument): TestSiteDocument {
  if (current.version < 6 || current.version > 53 || !("publications" in current)) return next;
  const target = testSiteCollection(next);
  const ids = new Set([...target.documents, ...target.bin.map(item => item.document)].map(document => document.id));
  const publications = current.publications.filter(item => ids.has(item.document.id));
  const documents = target.documents.map(document => {
    const live = current.documents.find(item => item.id === document.id);
    // Undo edits draft content/dates, but cannot undo explicit publication commands.
    return live ? { ...document, status: live.status, publishedAt: live.publishedAt } : document;
  });
  const retained = { ...target, documents, version: current.version, globalTemplates: target.globalTemplates ?? current.globalTemplates, publications };
  if (current.version >= 12) return { ...retained, version: 55 };
  // Undo must keep legacy capture semantics without attaching newer envelope fields.
  const result: Record<string, unknown> = { ...retained };
  delete result.navigationMenus;
  delete result.defaultNavigationMenuId;
  delete result.navigationAssignments;
  if (current.version < 8) delete result.websiteDesign;
  if (!validTestSiteDocument(result)) throw new Error("The retained revision is incompatible with this source version. The current site was kept.");
  return result;
}
