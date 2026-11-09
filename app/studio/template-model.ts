import { containsGeneralTemplatePart } from "./reference-template-parts-contract";
import { containsSiteTitle } from "./site-title-contract";
import { containsWebsiteFont } from "../content/website-fonts";
import { containsBoxSideOverrides } from "../content/box-lengths";
import { containsPullquote } from "../content/pullquote-block";
import { containsButtonsAlignment } from "../content/buttons-alignment";
import { containsCoreSocialLink } from "../content/social-services";
import { containsAuthoredAuthorDuotone, containsAuthoredFeaturedImageDuotone, containsAuthoredImageDuotone } from "../content/image-duotone";
import { containsAuthoredFeaturedImageOverlay } from "../content/featured-image-overlay";
import { containsAuthoredCoverCrop, containsAuthoredImageCrop } from "../content/image-edit";
import { containsAuthorBlockPresentation } from "../content/author-profile-presentation";
import { containsImageResolution } from "../content/image-resolution";
import { containsColumnWidthUnit } from "../content/columns";
import { containsExtendedGroupShadow, containsExtraBlackAppearance, containsGroupHeadingStyles, containsQuotePresentation } from "../content/quote-presentation";
import { containsCodeRuns, containsCodeMonospaceFont } from "../content/code-runs";
import { containsCoverBlock, containsCoverContentPosition, containsCoverInnerContentWidth, containsCoverVideoBackground, containsNativeCoverVideoSource } from "../content/cover-block";
import { containsDetailsPresentation, validDetailsPresentation } from "../content/details-block";
import { containsExtendedImageAspectRatio } from "../content/image-aspect-ratios";
import { containsTableCellAlignment } from "../content/table-cell-metadata";
import { containsResponsiveStyles } from "../content/responsive-styles";
import { containsTemplateContentButtonStyle, hasTemplateContentButtonStyle } from "../content/template-content-button-style";
import { containsRichTextInlineObjects, containsExtendedLanguage } from "../content/rich-text-contract";
import { containsPostDateTimeOverride, validDocumentDisplay } from "../content/document-metadata";
import { migrateLegacyFootnoteBlocks } from "../content/footnote-blocks";
import { validBlockEditorial, type BlockEditorial } from "../content/block-editorial";
import { GROUP_ALLOWED_BLOCK_TYPES, migrateLegacyBlockTypeNames, type ColumnBlock, type ContentBlock, type DocumentDisplayField, type DocumentDisplayMode, type GroupAllowedBlockType, type GroupLayoutOptions, type LayoutMode, type LayoutOptions, type ParagraphStyle, type SiteSectionRole } from "../content/model";
import { contentMediaIds, historicalContentMediaIds } from "../content/media-references";
import { containsGroupGridFillAvailableSpace, containsFlexItemSizing, containsScopedFlexItemSizing, validLayoutOptions } from "../content/layout";
import { containsGridItemSizing } from "../content/grid-child-sizing";
import type { StudioDocument, StudioDocumentKind, StudioWorkspace } from "./editor-model";
import { FEATURED_IMAGE_LABEL } from "./editor-model";
import { safeImageSource, safeTextLink } from "../content/rich-text";
import { containsVideoBlock } from "../content/video-block";
import { isRecord, PUBLICATION_VERSION, validContentBlocks, validParagraphStyle, validatePublicationSnapshot } from "./workspace-validation";
import { validateUniversalStylePreset } from "@acm/styles";
import { createUniversalStylePreset, UNIVERSAL_STYLE_PRESET } from "./ui/styles/canonical-style-guide";
import type { UniversalStylePreset } from "@acm/styles";

export const LEGACY_TEMPLATE_VERSION = "0.1.0" as const;
export const TEMPLATE_VERSION = "0.76.0" as const;
export const LEGACY_TEMPLATE_VERSION_75 = "0.75.0" as const;
export const LEGACY_TEMPLATE_VERSION_74 = "0.74.0" as const;
export const LEGACY_TEMPLATE_VERSION_73 = "0.73.0" as const;
export const LEGACY_TEMPLATE_VERSION_72 = "0.72.0" as const;
export const LEGACY_TEMPLATE_VERSION_71 = "0.71.0" as const;
export const LEGACY_TEMPLATE_VERSION_70 = "0.70.0" as const;
export const LEGACY_TEMPLATE_VERSION_69 = "0.69.0" as const;
export const LEGACY_TEMPLATE_VERSION_68 = "0.68.0" as const;
export const LEGACY_TEMPLATE_VERSION_67 = "0.67.0" as const;
export const LEGACY_TEMPLATE_VERSION_66 = "0.66.0" as const;
export const LEGACY_TEMPLATE_VERSION_65 = "0.65.0" as const;
export const LEGACY_TEMPLATE_VERSION_64 = "0.64.0" as const;
export const LEGACY_TEMPLATE_VERSION_63 = "0.63.0" as const;
export const LEGACY_TEMPLATE_VERSION_62 = "0.62.0" as const;
export const LEGACY_TEMPLATE_VERSION_61 = "0.61.0" as const;
export const LEGACY_TEMPLATE_VERSION_60 = "0.60.0" as const;
export const LEGACY_TEMPLATE_VERSION_59 = "0.59.0" as const;
export const LEGACY_TEMPLATE_VERSION_58 = "0.58.0" as const;
export const LEGACY_TEMPLATE_VERSION_57 = "0.57.0" as const;
export const LEGACY_TEMPLATE_VERSION_56 = "0.56.0" as const;
export const LEGACY_TEMPLATE_VERSION_55 = "0.55.0" as const;
export const LEGACY_TEMPLATE_VERSION_54 = "0.54.0" as const;
export const LEGACY_TEMPLATE_VERSION_53 = "0.53.0" as const;
export const LEGACY_TEMPLATE_VERSION_52 = "0.52.0" as const;
export const LEGACY_TEMPLATE_VERSION_51 = "0.51.0" as const;
export const LEGACY_TEMPLATE_VERSION_50 = "0.50.0" as const;
export const LEGACY_TEMPLATE_VERSION_49 = "0.49.0" as const;
export const LEGACY_TEMPLATE_VERSION_48 = "0.48.0" as const;
export const LEGACY_TEMPLATE_VERSION_47 = "0.47.0" as const;
export const LEGACY_TEMPLATE_VERSION_46 = "0.46.0" as const;
export const LEGACY_TEMPLATE_VERSION_45 = "0.45.0" as const;
export const LEGACY_TEMPLATE_VERSION_44 = "0.44.0" as const;
export const LEGACY_TEMPLATE_VERSION_43 = "0.43.0" as const;
export const LEGACY_TEMPLATE_VERSION_42 = "0.42.0" as const;
export const LEGACY_TEMPLATE_VERSION_41 = "0.41.0" as const;
export const LEGACY_TEMPLATE_VERSION_40 = "0.40.0" as const;
export const LEGACY_TEMPLATE_VERSION_39 = "0.39.0" as const;
export const LEGACY_TEMPLATE_VERSION_38 = "0.38.0" as const;
export const LEGACY_TEMPLATE_VERSION_37 = "0.37.0" as const;
export const LEGACY_TEMPLATE_VERSION_36 = "0.36.0" as const;
export const LEGACY_TEMPLATE_VERSION_35 = "0.35.0" as const;
export const LEGACY_TEMPLATE_VERSION_34 = "0.34.0" as const;
export const LEGACY_TEMPLATE_VERSION_33 = "0.33.0" as const;
export const LEGACY_TEMPLATE_VERSION_32 = "0.32.0" as const;
export const LEGACY_TEMPLATE_VERSION_31 = "0.31.0" as const;
export const LEGACY_TEMPLATE_VERSION_30 = "0.30.0" as const;
export const LEGACY_TEMPLATE_VERSION_29 = "0.29.0" as const;
export const LEGACY_TEMPLATE_VERSION_28 = "0.28.0" as const;
export const LEGACY_TEMPLATE_VERSION_27 = "0.27.0" as const;
export const LEGACY_TEMPLATE_VERSION_26 = "0.26.0" as const;
export const LEGACY_TEMPLATE_VERSION_25 = "0.25.0" as const;
export const LEGACY_TEMPLATE_VERSION_24 = "0.24.0" as const;
export const LEGACY_TEMPLATE_VERSION_23 = "0.23.0" as const;
export const LEGACY_TEMPLATE_VERSION_22 = "0.22.0" as const;
export const LEGACY_TEMPLATE_VERSION_21 = "0.21.0" as const;
export const LEGACY_TEMPLATE_VERSION_20 = "0.20.0" as const;
export const LEGACY_TEMPLATE_VERSION_19 = "0.19.0" as const;
export const LEGACY_TEMPLATE_VERSION_18 = "0.18.0" as const;
export const LEGACY_TEMPLATE_VERSION_17 = "0.17.0" as const;
export const LEGACY_TEMPLATE_VERSION_16 = "0.16.0" as const;
export const LEGACY_TEMPLATE_VERSION_15 = "0.15.0" as const;
export const LEGACY_TEMPLATE_VERSION_14 = "0.14.0" as const;
export const LEGACY_TEMPLATE_VERSION_13 = "0.13.0" as const;
export const LEGACY_TEMPLATE_VERSION_12 = "0.12.0" as const;
export const LEGACY_TEMPLATE_VERSION_11 = "0.11.0" as const;
export const LEGACY_TEMPLATE_VERSION_10 = "0.10.0" as const;
export const LEGACY_TEMPLATE_VERSION_9 = "0.9.0" as const;
export const LEGACY_TEMPLATE_VERSION_8 = "0.8.0" as const;
export const LEGACY_TEMPLATE_VERSION_7 = "0.7.0" as const;
export const LEGACY_TEMPLATE_VERSION_6 = "0.6.0" as const;
export const LEGACY_TEMPLATE_VERSION_5 = "0.5.0" as const;
export const LEGACY_TEMPLATE_VERSION_4 = "0.4.0" as const;
export const LEGACY_TEMPLATE_VERSION_2 = "0.2.0" as const;
export const LEGACY_TEMPLATE_VERSION_3 = "0.3.0" as const;
export const TEMPLATE_STORAGE_KEY = "acm-studio-templates-v1";
export const templateElements = ["site-identity", "site-title", "site-tagline", "site-logo", "navigation", "document-title", "subtitle", "cover-image", "post-metadata", "content", "copyright", "social-links", "site-credit"] as const;
export type TemplateElement = typeof templateElements[number];
export type TemplateImage = { src: string; mediaId?: string; alt: string };
type TemplateElementNode =
  | { id: string; type: "element"; element: Exclude<TemplateElement, "cover-image" | "document-title" | "subtitle" | "content" | "navigation" | "site-title" | "site-logo" | "site-tagline">; align?: "left" | "centre" | "right" }
  | { id: string; type: "element"; element: "site-title"; align?: "left" | "centre" | "right"; tagName?: "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"; linkToHome?: boolean; opensInNewTab?: boolean; visualStyle?: ParagraphStyle }
  | { id: string; type: "element"; element: "site-tagline"; align?: "left" | "centre" | "right"; visualStyle?: ParagraphStyle }
  | { id: string; type: "element"; element: "site-credit"; align?: "left" | "centre" | "right"; visualStyle?: ParagraphStyle }
  | { id: string; type: "element"; element: "site-logo"; align?: "left" | "centre" | "right"; visualStyle?: ParagraphStyle }
  | NavigationTemplateNode
  | ({ id: string; type: "element"; element: "content"; align?: "left" | "centre" | "right"; visualStyle?: ParagraphStyle; tagName?: "div" | "main" | "section" | "article" } & GroupLayoutOptions)
  | (Omit<Extract<ContentBlock, { type: "title" }>, "type"> & { type: "element"; element: "document-title" })
  | { id: string; type: "element"; element: "subtitle"; align?: "left" | "centre" | "right"; style?: ParagraphStyle; visualStyle?: ParagraphStyle }
  | (Omit<Extract<ContentBlock, { type: "cover-image" }>, "type"> & { type: "element"; element: "cover-image"; fixedImage?: TemplateImage; coverImageHidden?: boolean });
export type TemplateNode = (Exclude<ContentBlock, { type: "group" | "section" | "columns" | "column" | "component" | "query-loop" | "post-template" | "no-results" }>
  | ({ id: string; type: "group"; layout: LayoutMode; children: TemplateNode[]; position?: "sticky"; visualStyle?: ParagraphStyle; allowedBlocks?: GroupAllowedBlockType[] } & GroupLayoutOptions & Pick<Extract<ContentBlock, { type: "group" }>, "tagName" | "ariaLabel" | "blockAlign" | "detailsSummary" | "openByDefault">)
  | ({ id: string; type: "section"; layout: LayoutMode; role?: SiteSectionRole; children: TemplateNode[]; visualStyle?: ParagraphStyle } & LayoutOptions)
  | ({ id: string; type: "columns"; children: TemplateColumn[]; style?: ParagraphStyle } & Omit<LayoutOptions, "columns" | "horizontalAlign" | "minColumnWidth"> & Pick<Extract<ContentBlock, { type: "columns" }>, "blockAlign">)
  | TemplateColumn
  | TemplateElementNode
  | (Omit<Extract<ContentBlock, { type: "query-loop" }>, "children"> & { children: TemplateNode[] })
  | (Omit<Extract<ContentBlock, { type: "post-template" }>, "children"> & { children: TemplateNode[] })
  | (Omit<Extract<ContentBlock, { type: "no-results" }>, "children"> & { children: TemplateNode[] })
  | { id: string; type: "part"; partId: string }) & { editorial?: BlockEditorial };
type TemplateColumn = Omit<ColumnBlock, "children"> & { children: TemplateNode[] };
export type PageTemplate = { id: string; name: string; kind: StudioDocumentKind; nodes: TemplateNode[]; defaults?: TemplateDefaults; displayDefaults?: Partial<Record<DocumentDisplayField, DocumentDisplayMode>>; isDefault?: boolean };
export type TemplatePart = { id: string; name: string; kind: "header" | "footer" | "overlay" | "general"; nodes: TemplateNode[] };
export type SiteStyles = UniversalStylePreset;
export function resetTemplatePaletteColour(styles: SiteStyles, key: keyof SiteStyles["palette"]): SiteStyles {
  return { ...styles, palette: { ...styles.palette, [key]: UNIVERSAL_STYLE_PRESET.palette[key] } };
}
export type LegacySiteStyles = { background: string; text: string; accent: string; border: string; font: "inter" | "serif"; fontSize: number; spacing: number; contentWidth: number; radius: number; borderWidth: number };
export type SiteLink = { id: string; label: string; url: string; homeLink?: true; opensInNewTab?: boolean; rel?: string; description?: string; visualStyle?: ParagraphStyle; children?: NavigationItem[] };
/** A non-link child in an authored Navigation menu. */
export type NavigationSpacer = { id: string; type: "spacer"; width: number; height: number };
export type NavigationItem = SiteLink | NavigationSpacer;
export function isNavigationSpacer(item: NavigationItem): item is NavigationSpacer { return "type" in item && item.type === "spacer"; }
export function containsNavigationSpacer(value: unknown): boolean {
  const visitItems = (items: unknown): boolean => Array.isArray(items) && items.some(item => isRecord(item) && (item.type === "spacer" && typeof item.width === "number" && typeof item.height === "number" || visitItems(item.children)));
  const visit = (current: unknown, seen = new Set<object>()): boolean => {
    if (!current || typeof current !== "object" || seen.has(current)) return false;
    seen.add(current);
    if (Array.isArray(current)) return current.some(item => visit(item, seen));
    if (!isRecord(current)) return false;
    if (visitItems(current.navigation)) return true;
    if (Array.isArray(current.navigationMenus) && current.navigationMenus.some(menu => isRecord(menu) && visitItems(menu.links))) return true;
    return ["set", "sets", "navigationRecovery", "templates", "globalTemplates", "migrations", "bases", "workspace", "publications", "bin", "entry", "setSnapshot", "templateSnapshot"].some(key => visit(current[key], seen));
  };
  return visit(value);
}
export type NavigationSearchWidthUnit = "px" | "%" | "em" | "rem" | "vw" | "vh";
export type NavigationPageListBlock = Extract<ContentBlock, { type: "navigation-page-list" }> & { position?: number };
export type NavigationTemplateNode = { id: string; type: "element"; element: "navigation"; align?: "left" | "centre" | "right"; layout?: "row" | "stack"; horizontalAlign?: "left" | "centre" | "right" | "space-between" | "stretch"; allowWrap?: boolean; gap?: number; visualStyle?: ParagraphStyle; overlayMenu?: "never" | "mobile" | "always"; showIcon?: boolean; icon?: "handle" | "menu"; overlayPartId?: string; submenuOpenOnClick?: boolean; showSubmenuIcon?: boolean; ariaLabel?: string; submenuTextColor?: string; submenuBackgroundColor?: string; pageListBlock?: NavigationPageListBlock; automaticPageList?: boolean; automaticPageListPosition?: number; searchEnabled?: boolean; searchPosition?: number; searchButtonUseIcon?: boolean; searchLabelVisible?: boolean; searchButtonPosition?: "outside" | "inside" | "no-button" | "button-only"; searchPlaceholder?: string; searchWidth?: number; searchDisplayWidth?: number; searchDisplayWidthUnit?: NavigationSearchWidthUnit; searchVisualStyle?: ParagraphStyle };
function legacyPageListId(nodeId: string, reservedIds: Set<string>) {
  let hash = 2166136261;
  for (let index = 0; index < nodeId.length; index += 1) hash = Math.imul(hash ^ nodeId.charCodeAt(index), 16777619);
  const base = `page-list-${(hash >>> 0).toString(36)}`;
  let candidate = base;
  let suffix = 2;
  while (reservedIds.has(candidate)) candidate = `${base}-${suffix++}`;
  reservedIds.add(candidate);
  return candidate;
}

export function navigationPageListBlock(node: NavigationTemplateNode, reservedIds = new Set([node.id])): NavigationPageListBlock | undefined {
  if (node.pageListBlock) return node.pageListBlock;
  if (node.automaticPageList) return { id: legacyPageListId(node.id, reservedIds), type: "navigation-page-list", position: node.automaticPageListPosition };
  return undefined;
}
export function containsNavigationPageListBlock(value: unknown): boolean {
  const seen = new Set<object>();
  const visit = (current: unknown): boolean => {
    if (!current || typeof current !== "object" || seen.has(current)) return false;
    seen.add(current);
    if (Array.isArray(current)) return current.some(visit);
    if (!isRecord(current)) return false;
    if (current.type === "navigation-page-list" || isRecord(current.pageListBlock) && current.pageListBlock.type === "navigation-page-list") return true;
    return Object.values(current).some(visit);
  };
  return visit(value);
}
export type TemplateDefaults = { author?: string; category?: string; tags?: string[]; parentPageId?: string };
export type TemplateSet = {
  id: string; name: string; templates: PageTemplate[]; parts: TemplatePart[]; styles: SiteStyles;
  identity: { name: string; homeUrl: string; logo?: { mediaId?: string; src: string; alt: string }; copyright: string };
  navigation: NavigationItem[]; socialLinks: SiteLink[]; defaults?: TemplateDefaults;
};
export type TemplateAssignment = { documentId: string; setId: string; templateId: string; kind: StudioDocumentKind };
export type StudioBinnedTemplate = { id: string; deletedAt: string; kind: "template"; setId: string; setName: string; entry: PageTemplate | TemplatePart; setSnapshot: TemplateSet } | { id: string; deletedAt: string; kind: "set"; set: TemplateSet };
export type TemplateSchemaVersion = typeof TEMPLATE_VERSION | typeof LEGACY_TEMPLATE_VERSION_75 | typeof LEGACY_TEMPLATE_VERSION_74 | typeof LEGACY_TEMPLATE_VERSION_73 | typeof LEGACY_TEMPLATE_VERSION_72 | typeof LEGACY_TEMPLATE_VERSION_71 | typeof LEGACY_TEMPLATE_VERSION_70 | typeof LEGACY_TEMPLATE_VERSION_69 | typeof LEGACY_TEMPLATE_VERSION_68 | typeof LEGACY_TEMPLATE_VERSION_67 | typeof LEGACY_TEMPLATE_VERSION_64 | typeof LEGACY_TEMPLATE_VERSION_65 | typeof LEGACY_TEMPLATE_VERSION_61 | typeof LEGACY_TEMPLATE_VERSION_60 | typeof LEGACY_TEMPLATE_VERSION_59 | typeof LEGACY_TEMPLATE_VERSION_58 | typeof LEGACY_TEMPLATE_VERSION_56 | typeof LEGACY_TEMPLATE_VERSION_55 | typeof LEGACY_TEMPLATE_VERSION_53 | typeof LEGACY_TEMPLATE_VERSION_52 | typeof LEGACY_TEMPLATE_VERSION_51 | typeof LEGACY_TEMPLATE_VERSION_50 | typeof LEGACY_TEMPLATE_VERSION_49 | typeof LEGACY_TEMPLATE_VERSION_48 | typeof LEGACY_TEMPLATE_VERSION_46 | typeof LEGACY_TEMPLATE_VERSION_45 | typeof LEGACY_TEMPLATE_VERSION_44 | typeof LEGACY_TEMPLATE_VERSION_43 | typeof LEGACY_TEMPLATE_VERSION_42 | typeof LEGACY_TEMPLATE_VERSION_41 | typeof LEGACY_TEMPLATE_VERSION_40 | typeof LEGACY_TEMPLATE_VERSION_39 | typeof LEGACY_TEMPLATE_VERSION_38 | typeof LEGACY_TEMPLATE_VERSION_37 | typeof LEGACY_TEMPLATE_VERSION_36 | typeof LEGACY_TEMPLATE_VERSION_35 | typeof LEGACY_TEMPLATE_VERSION_34 | typeof LEGACY_TEMPLATE_VERSION_33 | typeof LEGACY_TEMPLATE_VERSION_32 | typeof LEGACY_TEMPLATE_VERSION_31 | typeof LEGACY_TEMPLATE_VERSION_30 | typeof LEGACY_TEMPLATE_VERSION_29 | typeof LEGACY_TEMPLATE_VERSION_28 | typeof LEGACY_TEMPLATE_VERSION_27 | typeof LEGACY_TEMPLATE_VERSION_26 | typeof LEGACY_TEMPLATE_VERSION_25 | typeof LEGACY_TEMPLATE_VERSION_24 | typeof LEGACY_TEMPLATE_VERSION_23 | typeof LEGACY_TEMPLATE_VERSION_22 | typeof LEGACY_TEMPLATE_VERSION_21 | typeof LEGACY_TEMPLATE_VERSION_20 | typeof LEGACY_TEMPLATE_VERSION_19 | typeof LEGACY_TEMPLATE_VERSION_18 | typeof LEGACY_TEMPLATE_VERSION_17 | typeof LEGACY_TEMPLATE_VERSION_16 | typeof LEGACY_TEMPLATE_VERSION_15 | typeof LEGACY_TEMPLATE_VERSION_14 | typeof LEGACY_TEMPLATE_VERSION_13 | typeof LEGACY_TEMPLATE_VERSION_12 | typeof LEGACY_TEMPLATE_VERSION_11 | typeof LEGACY_TEMPLATE_VERSION_10 | typeof LEGACY_TEMPLATE_VERSION_9 | typeof LEGACY_TEMPLATE_VERSION_8 | typeof LEGACY_TEMPLATE_VERSION_7 | typeof LEGACY_TEMPLATE_VERSION_6 | typeof LEGACY_TEMPLATE_VERSION_5 | typeof LEGACY_TEMPLATE_VERSION_4 | typeof LEGACY_TEMPLATE_VERSION_3 | typeof LEGACY_TEMPLATE_VERSION_2 | typeof LEGACY_TEMPLATE_VERSION;
export type TemplateLibraryOrderEntry = { id: string; setId: string; entryId: string };
export type TemplateStore = { libraryOrder?: TemplateLibraryOrderEntry[]; version: TemplateSchemaVersion; sets: TemplateSet[]; assignments: TemplateAssignment[]; bin: StudioBinnedTemplate[]; defaultTemplateIds?: { page?: string; post?: string } };
export type TemplateSnapshot = { version: TemplateSchemaVersion; set: TemplateSet; templateId: string };
export const emptyTemplateStore = (): TemplateStore => ({ version: TEMPLATE_VERSION, sets: [], assignments: [], bin: [], defaultTemplateIds: {}, libraryOrder: [] });
export const templateId = () => `t-${crypto.randomUUID()}`;
export const templateElementLabel = (value: string) => value === "cover-image" ? FEATURED_IMAGE_LABEL : value === "time-to-read" ? "Time to Read" : value.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
export const copyTemplateData = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function visitTemplateNodes(nodes: TemplateNode[], visit: (node: TemplateNode) => void) {
  for (const node of nodes) { visit(node); if (node.type === "group" || node.type === "section" || node.type === "columns" || node.type === "column" || node.type === "social-icons" || (node.type === "quote" || node.type === "pullquote") || node.type === "buttons" || node.type === "cover" || node.type === "query-loop" || node.type === "post-template" || node.type === "no-results") visitTemplateNodes((node.children ?? []) as TemplateNode[], visit); }
}

/** Renew IDs for template nodes and any separately identified Navigation child blocks. */
export function renewTemplateNodeIds(nodes: TemplateNode[]) {
  visitTemplateNodes(nodes, node => {
    node.id = templateId();
    if (node.type === "element" && node.element === "navigation" && node.pageListBlock) node.pageListBlock.id = templateId();
  });
}

export function createDocumentTemplateNodes(kind: StudioDocumentKind): TemplateNode[] {
  const element = (element: TemplateElement): TemplateNode => ({ id: templateId(), type: "element", element });
  const title: TemplateNode = { id: templateId(), type: "element", element: "document-title", level: 1 };
  const postMetadata: TemplateNode[] = kind === "post" ? [{ id: templateId(), type: "group", layout: "row", gap: 16, stackAt: "mobile", children: [
    { id: templateId(), type: "author-name", prefix: "By", avatar: true },
    { id: templateId(), type: "post-date", format: "long", showIcon: true },
    { id: templateId(), type: "time-to-read", prefix: "Reading Time:", presentation: "plain" },
  ] }] : [];
  return [title, element("subtitle"), ...(kind === "post" ? [element("cover-image"), ...postMetadata] : []), element("content")];
}

export function createTemplateSet(name = "ACM Neutral"): TemplateSet {
  const element = (element: TemplateElement): TemplateNode => ({ id: templateId(), type: "element", element });
  const header: TemplatePart = { id: templateId(), name: "Header", kind: "header", nodes: [{ id: templateId(), type: "group", layout: "row", children: [element("site-identity"), element("navigation")] }] };
  const footer: TemplatePart = { id: templateId(), name: "Footer", kind: "footer", nodes: [{ id: templateId(), type: "group", layout: "columns", columns: 3, children: [element("site-identity"), element("copyright"), element("social-links")] }] };
  return { id: templateId(), name, defaults: {}, parts: [header, footer], templates: (["page", "post"] as const).map(kind => ({ id: templateId(), name: kind === "page" ? "Page" : "Post", kind, isDefault: true, nodes: [
    { id: templateId(), type: "part", partId: header.id }, ...createDocumentTemplateNodes(kind), { id: templateId(), type: "part", partId: footer.id },
  ] })), identity: { name: "Your Site", homeUrl: "/", copyright: "© 2026 Andrew Moss. All Rights Reserved." }, navigation: [], socialLinks: [], styles: createUniversalStylePreset() };
}

const safeId = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/.test(value) && !["__proto__", "prototype", "constructor"].includes(value);
const text = (value: unknown, max = 2000): value is string => typeof value === "string" && value.length <= max;
function validTemplateImage(value: unknown): value is TemplateImage { return isRecord(value) && text(value.src) && text(value.alt) && (value.src === "" || Boolean(safeImageSource(value.src))) && (value.mediaId === undefined || safeId(value.mediaId)); }
function invalid(message: string): never { throw new Error(message); }
function claimId(value: unknown, ids: Set<string>) { if (!safeId(value) || ids.has(value)) invalid("Template identifiers must be safe and unique."); ids.add(value as string); }


export function migrateLegacySiteStyles(value: unknown): SiteStyles {
  const keys = ["background", "text", "accent", "border", "font", "fontSize", "spacing", "contentWidth", "radius", "borderWidth"];
  if (!isRecord(value) || Object.keys(value).some(key => !keys.includes(key))) invalid("Legacy template styles are invalid.");
  const styles = value as unknown as LegacySiteStyles;
  if (![styles.background, styles.text, styles.accent, styles.border].every(colour => typeof colour === "string" && /^#[0-9a-f]{6}$/i.test(colour))
    || !["inter", "serif"].includes(styles.font)) invalid("Use valid legacy template colours and typography.");
  for (const [key, min, max] of [["fontSize", 13, 40], ["spacing", 0, 120], ["contentWidth", 320, 1800], ["radius", 0, 80], ["borderWidth", 0, 12]] as const) {
    if (typeof styles[key] !== "number" || !Number.isFinite(styles[key]) || styles[key] < min || styles[key] > max) invalid("Invalid " + key + " in legacy template styles.");
  }
  const preset = createUniversalStylePreset();
  preset.palette.surface = styles.background;
  preset.palette.surfaceRaised = styles.background;
  preset.palette.textPrimary = styles.text;
  preset.palette.accent = styles.accent;
  preset.palette.border = styles.border;
  const family = styles.font === "inter" ? "inter" : "georgia";
  const bodySize = { value: styles.fontSize / 16, unit: "rem" as const };
  preset.typography.body.family = family;
  preset.typography.body.size.desktop = bodySize;
  preset.typography.body.lineHeight.desktop = { value: 1.6, unit: "number" };
  preset.typography.navigation.family = family;
  preset.typography.navigation.size.desktop = { ...bodySize };
  preset.typography.navigation.weight = 400;
  preset.typography.navigation.lineHeight.desktop = { value: 1.6, unit: "number" };
  preset.typography.metadata.family = family;
  preset.typography.metadata.size.desktop = { value: 1.15, unit: "em" };
  preset.typography.metadata.lineHeight.desktop = { value: 1.45, unit: "number" };
  preset.typography.h1.family = family;
  preset.typography.h1.weight = 600;
  preset.typography.h1.size.desktop = { value: 2.5, unit: "em" };
  preset.typography.h1.lineHeight.desktop = { value: 1.15, unit: "number" };
  for (const [key, size] of [["h2", 1.5], ["h3", 1.17], ["h4", 1], ["h5", 0.83], ["h6", 0.67]] as const) {
    preset.typography[key].family = family;
    preset.typography[key].size.desktop = { value: size, unit: "em" };
    preset.typography[key].lineHeight.desktop = { value: 1.6, unit: "number" };
  }
  preset.typography.button.family = "system-sans";
  preset.typography.button.weight = 650;
  preset.typography.button.size.desktop = { value: 13, unit: "px" };
  preset.typography.button.lineHeight.desktop = { value: 1.55, unit: "number" };
  preset.buttons.base = { background: "#171A1D", foreground: "#FFFFFF", border: "#171A1D", borderWidth: 0, hoverBackground: "#171A1D", hoverForeground: "#FFFFFF" };
  preset.buttons.secondary = { background: "#E7E6E0", foreground: "#171A1D", border: "#E7E6E0", borderWidth: 0, hoverBackground: "#E7E6E0", hoverForeground: "#171A1D" };
  preset.buttons.outline.borderWidth = 0;
  preset.layout.spacing = styles.spacing;
  preset.layout.contentWidth = styles.contentWidth;
  preset.layout.radius = styles.radius;
  preset.layout.borderWidth = styles.borderWidth;
  return validateUniversalStylePreset(preset);
}

/** Navigation children expose typography and bounded Advanced presentation fields. */
function validPageLinkStyle(value: unknown): boolean {
  const fields = ["fontFamily", "fontSize", "fontSizeCustom", "appearance", "lineHeight", "letterSpacing", "textTransform", "textDecoration", "className", "anchor", "additionalCss"];
  return validParagraphStyle(value) && (value === undefined || isRecord(value) && Object.keys(value).every(key => key === "responsive" || fields.includes(key)) && (value.responsive === undefined || isRecord(value.responsive) && Object.values(value.responsive).every(override => isRecord(override) && Object.keys(override).every(key => fields.includes(key)))));
}

export function validateTemplateSet(value: unknown): TemplateSet {
  value = migrateLegacyBlockTypeNames(value);
  if (!isRecord(value) || !safeId(value.id) || !text(value.name, 160) || !value.name.trim() || !Array.isArray(value.templates) || value.templates.length > 100 || !Array.isArray(value.parts) || value.parts.length > 100) invalid("The template set is invalid.");
  const source = value as unknown as TemplateSet;
  const set = { ...source, styles: isRecord(source.styles) && Object.hasOwn(source.styles, "version") ? validateUniversalStylePreset(source.styles) : migrateLegacySiteStyles(source.styles) };
  if (set.defaults !== undefined && !validTemplateDefaults(set.defaults)) invalid("Template defaults are invalid.");
  const ids = new Set<string>([set.id]);
  if (!isRecord(set.identity) || !text(set.identity.name, 160) || !text(set.identity.copyright) || !text(set.identity.homeUrl) || !safeTextLink(set.identity.homeUrl)) invalid("Site identity needs a safe home address.");
  if (set.identity.logo) {
    const logo = set.identity.logo;
    if (!isRecord(logo) || !text(logo.alt) || !text(logo.src) || (logo.src && !safeImageSource(logo.src)) || (logo.mediaId !== undefined && !safeId(logo.mediaId))) invalid("The site logo is invalid.");
  }
  for (const links of [set.navigation, set.socialLinks]) {
    if (!Array.isArray(links) || links.length > 100) invalid("The navigation is invalid.");
    let linkCount = 0;
    function validateLinks(items: unknown, depth = 0) {
      if (!Array.isArray(items) || depth > 5) invalid("Navigation submenus may be nested at most five levels.");
      for (const link of items) {
        if (!isRecord(link) || ++linkCount > 100) invalid("The navigation is invalid.");
        if (link.type === "spacer") {
          if (links === set.socialLinks || !safeId(link.id) || !Number.isInteger(link.width) || (link.width as number) < 0 || (link.width as number) > 2000 || !Number.isInteger(link.height) || (link.height as number) < 0 || (link.height as number) > 2000 || Object.keys(link).some(key => !["id", "type", "width", "height"].includes(key))) invalid("Navigation spacers need bounded pixel dimensions.");
          claimId(link.id, ids);
          continue;
        }
        if (!text(link.label, 160) || !text(link.url) || !safeTextLink(link.url)
          || (link.homeLink !== undefined && (link.homeLink !== true || links === set.socialLinks))
          || (link.opensInNewTab !== undefined && typeof link.opensInNewTab !== "boolean")
          || (link.rel !== undefined && (!text(link.rel, 200) || !/^[a-zA-Z0-9_\s-]*$/.test(link.rel)))
          || (link.description !== undefined && !text(link.description, 2000))
          || !validPageLinkStyle(link.visualStyle)) invalid("Each link needs a safe destination and supported settings.");
        if (links === set.socialLinks && link.visualStyle !== undefined) invalid("Page link presentation belongs to Navigation.");
        claimId(link.id, ids);
        if (link.children !== undefined) {
          if (links === set.socialLinks) invalid("Social links cannot contain submenus.");
          validateLinks(link.children, depth + 1);
        }
      }
    }
    validateLinks(links);
  }
  let count = 0;
  function nodes(items: unknown, depth = 0, parentType?: string) {
    if (!Array.isArray(items) || depth > 8) invalid("Template nesting is too deep.");
    for (const node of items as unknown[]) {
      if (!isRecord(node) || ++count > 3000) invalid("The template contains invalid or too many elements.");
      claimId(node.id, ids);
      if (!validBlockEditorial(node.editorial)) invalid("Invalid block editorial settings.");
      if (node.type !== "group" && !(node.type === "element" && node.element === "content") && (hasTemplateContentButtonStyle(node.visualStyle) || hasTemplateContentButtonStyle(node.style))) invalid("Button element colours belong only to Group blocks or the template Content slot.");
      if (node.type === "element") {
        if (!templateElements.includes(node.element as TemplateElement) || (node.align !== undefined && !["left", "centre", "right"].includes(node.align as string))) invalid("Unknown template element.");
        if (node.element === "site-title" && (!validParagraphStyle(node.visualStyle)
          || (node.tagName !== undefined && !["p", "h1", "h2", "h3", "h4", "h5", "h6"].includes(node.tagName as string))
          || (node.linkToHome !== undefined && typeof node.linkToHome !== "boolean")
          || (node.opensInNewTab !== undefined && typeof node.opensInNewTab !== "boolean")
          || Object.keys(node).some(key => !["editorial", "id", "type", "element", "align", "visualStyle", "tagName", "linkToHome", "opensInNewTab"].includes(key)))) invalid("The Site Title settings are invalid.");
        if (node.element === "site-logo" && (!validParagraphStyle(node.visualStyle) || Object.keys(node).some(key => !["editorial", "id", "type", "element", "align", "visualStyle"].includes(key)))) invalid("Invalid Site Logo settings.");
        if (node.element === "navigation" && (!validLayoutOptions(node, true) || !validParagraphStyle(node.visualStyle) || hasTemplateContentButtonStyle(node.visualStyle)
          || (node.pageListBlock !== undefined && (!isRecord(node.pageListBlock) || !safeId(node.pageListBlock.id) || node.pageListBlock.type !== "navigation-page-list" || (node.pageListBlock.position !== undefined && (typeof node.pageListBlock.position !== "number" || !Number.isInteger(node.pageListBlock.position) || node.pageListBlock.position < 0 || node.pageListBlock.position > 100)) || (node.pageListBlock.parentPageId !== undefined && !safeId(node.pageListBlock.parentPageId)) || !validParagraphStyle(node.pageListBlock.visualStyle) || hasTemplateContentButtonStyle(node.pageListBlock.visualStyle) || Object.keys(node.pageListBlock).some(key => !["id", "type", "position", "parentPageId", "visualStyle"].includes(key))))
          || (node.automaticPageList !== undefined && typeof node.automaticPageList !== "boolean")
          || (node.automaticPageListPosition !== undefined && (!Number.isInteger(node.automaticPageListPosition) || (node.automaticPageListPosition as number) < 0 || (node.automaticPageListPosition as number) > 100 || node.automaticPageList !== true))
          || (node.searchEnabled !== undefined && typeof node.searchEnabled !== "boolean")
          || (node.searchPosition !== undefined && (!Number.isInteger(node.searchPosition) || (node.searchPosition as number) < 0 || (node.searchPosition as number) > 100 || node.searchEnabled !== true))
          || (node.searchButtonUseIcon !== undefined && (typeof node.searchButtonUseIcon !== "boolean" || node.searchEnabled !== true))
          || (node.searchLabelVisible !== undefined && (typeof node.searchLabelVisible !== "boolean" || node.searchEnabled !== true))
          || (node.searchButtonPosition !== undefined && (!['outside', 'inside', 'no-button', 'button-only'].includes(node.searchButtonPosition as string) || node.searchEnabled !== true))
          || (node.searchPlaceholder !== undefined && (!text(node.searchPlaceholder, 160) || node.searchEnabled !== true))
          || (node.searchWidth !== undefined && (typeof node.searchWidth !== "number" || !Number.isFinite(node.searchWidth) || node.searchWidth < 25 || node.searchWidth > 100 || node.searchEnabled !== true))
          || (node.searchDisplayWidth !== undefined && (typeof node.searchDisplayWidth !== "number" || !Number.isFinite(node.searchDisplayWidth) || node.searchDisplayWidth < 1 || node.searchDisplayWidth > 2000 || node.searchEnabled !== true || !["px", "%", "em", "rem", "vw", "vh"].includes(node.searchDisplayWidthUnit as string) || node.searchDisplayWidthUnit === "%" && node.searchDisplayWidth > 100))
          || (node.searchDisplayWidthUnit !== undefined && (node.searchDisplayWidth === undefined || !["px", "%", "em", "rem", "vw", "vh"].includes(node.searchDisplayWidthUnit as string)))
          || !validParagraphStyle(node.searchVisualStyle) || (node.searchVisualStyle !== undefined && (node.searchEnabled !== true || hasTemplateContentButtonStyle(node.searchVisualStyle)))
          || (node.layout !== undefined && !["row", "stack"].includes(node.layout as string))
          || (node.overlayMenu !== undefined && !["never", "mobile", "always"].includes(node.overlayMenu as string))
          || (node.showIcon !== undefined && typeof node.showIcon !== "boolean")
          || (node.icon !== undefined && !["handle", "menu"].includes(node.icon as string))
          || (node.overlayPartId !== undefined && !safeId(node.overlayPartId))
          || (node.submenuOpenOnClick !== undefined && typeof node.submenuOpenOnClick !== "boolean")
          || (node.showSubmenuIcon !== undefined && typeof node.showSubmenuIcon !== "boolean")
          || (node.ariaLabel !== undefined && !text(node.ariaLabel, 160))
          || !validParagraphStyle({ textColor: node.submenuTextColor, backgroundColor: node.submenuBackgroundColor })
          || Object.keys(node).some(key => !["editorial", "id", "type", "element", "align", "layout", "horizontalAlign", "allowWrap", "gap", "visualStyle", "overlayMenu", "showIcon", "icon", "overlayPartId", "submenuOpenOnClick", "showSubmenuIcon", "ariaLabel", "submenuTextColor", "submenuBackgroundColor", "pageListBlock", "automaticPageList", "automaticPageListPosition", "searchEnabled", "searchPosition", "searchButtonUseIcon", "searchLabelVisible", "searchButtonPosition", "searchPlaceholder", "searchWidth", "searchDisplayWidth", "searchDisplayWidthUnit", "searchVisualStyle"].includes(key)))) invalid("The Navigation settings are invalid.");
        if (node.element === "navigation" && isRecord(node.pageListBlock)) claimId(node.pageListBlock.id, ids);
        if (node.element === "content" && (!validLayoutOptions(node, true) || !validParagraphStyle(node.visualStyle) || (node.tagName !== undefined && !["div", "main", "section", "article"].includes(node.tagName as string)) || Object.keys(node).some(key => !["editorial", "id", "type", "element", "align", "visualStyle", "tagName", "horizontalAlign", "verticalAlign", "gap", "columnGap", "rowGap", "paddingX", "paddingY", "contentWidth", "columns", "minColumnWidth", "stackAt", "contentSize", "wideSize", "inheritLayout", "allowWrap", "gridMode", "fillAvailableSpace", "allowSizingOnChildren", "minColumnWidthUnit"].includes(key)))) invalid("The template Content settings are invalid.");
        if (node.element === "document-title" && ((node.blockAlign !== undefined && typeof node.blockAlign !== "string") || !validContentBlocks([{ ...node, type: "title" }]))) invalid("The template Document Title settings are invalid.");
        if (node.element === "subtitle" && (!validParagraphStyle(node.style) || !validParagraphStyle(node.visualStyle) || hasTemplateContentButtonStyle(node.style) || hasTemplateContentButtonStyle(node.visualStyle))) invalid("The template Subtitle settings are invalid.");
        if (node.element === "cover-image" && ((node.blockAlign !== undefined && typeof node.blockAlign !== "string") || !validContentBlocks([{ ...node, type: "cover-image" }]))) invalid("The template Featured Image settings are invalid.");
        if (node.element === "cover-image" && node.fixedImage !== undefined && !validTemplateImage(node.fixedImage)) invalid("The fixed template featured image is invalid.");
        if (node.element === "cover-image" && node.coverImageHidden !== undefined && typeof node.coverImageHidden !== "boolean") invalid("The template featured image visibility is invalid.");
        if (node.element !== "cover-image" && ("fixedImage" in node || "coverImageHidden" in node)) invalid("Only a Featured Image element can use featured image settings.");
      } else if (node.type === "part") { if (!safeId(node.partId)) invalid("Invalid shared-part reference."); }
      else if (node.type === "group" || node.type === "section") { const supportedKeys = ["editorial", "id", "type", "layout", "role", "children", "visualStyle", "horizontalAlign", "verticalAlign", "gap", "columnGap", "rowGap", "paddingX", "paddingY", "contentWidth", "columns", "minColumnWidth", "stackAt"]; if (node.type === "group") supportedKeys.push("position", "tagName", "ariaLabel", "blockAlign", "detailsSummary", "openByDefault", "allowedBlocks", "contentSize", "wideSize", "inheritLayout", "allowWrap", "gridMode", "fillAvailableSpace", "allowSizingOnChildren", "minColumnWidthUnit"); if (Object.keys(node).some(key => !supportedKeys.includes(key)) || (node.type === "group" && (node.position !== undefined && node.position !== "sticky" || !validParagraphStyle(node.visualStyle) || !validDetailsPresentation(node) || (node.allowedBlocks !== undefined && (!Array.isArray(node.allowedBlocks) || new Set(node.allowedBlocks).size !== node.allowedBlocks.length || node.allowedBlocks.some(type => !GROUP_ALLOWED_BLOCK_TYPES.includes(type as typeof GROUP_ALLOWED_BLOCK_TYPES[number])))))) || (node.blockAlign !== undefined && typeof node.blockAlign !== "string") || !validContentBlocks([{ ...node, children: [] }]) || !["flow", "stack", "row", "columns", "grid"].includes(node.layout as string) || (node.role !== undefined && !["account", "setup", "scorecard", "leaderboard", "share", "hero", "hero-copy", "account-copy", "scorecard-heading", "scorecard-actions", "leaderboard-card", "leaderboard-score", "leaderboard-metrics", "metric", "footer", "footer-brand", "footer-links", "social-link"].includes(node.role as string)) || !validLayoutOptions(node, node.type === "group")) invalid("Invalid template layout or unsupported group metadata."); nodes(node.children, depth + 1, parentType === "post-template" || parentType === "no-results" ? parentType : undefined); }
      else if (node.type === "columns") { if (Object.keys(node).some(key => !["editorial", "id", "type", "children", "style", "blockAlign", "verticalAlign", "gap", "columnGap", "rowGap", "paddingX", "paddingY", "contentWidth", "stackAt"].includes(key)) || !validLayoutOptions(node) || !validParagraphStyle(node.style) || !Array.isArray(node.children) || node.children.length < 1 || node.children.length > 6 || node.children.some(child => !isRecord(child) || child.type !== "column") || (node.blockAlign !== undefined && typeof node.blockAlign !== "string") || !validContentBlocks([{ ...node, children: node.children.map(child => ({ ...child as Record<string, unknown>, children: [] })) }])) invalid("Columns blocks need between one and six Column blocks and supported layout settings."); nodes(node.children, depth + 1, "columns"); }
      else if (node.type === "column") { if (parentType !== "columns" || (node.allowedBlocks !== undefined && (!Array.isArray(node.allowedBlocks) || new Set(node.allowedBlocks).size !== node.allowedBlocks.length || node.allowedBlocks.some(type => !GROUP_ALLOWED_BLOCK_TYPES.includes(type as typeof GROUP_ALLOWED_BLOCK_TYPES[number])))) || Object.keys(node).some(key => !["editorial", "id", "type", "children", "width", "widthUnit", "verticalAlign", "gap", "columnGap", "rowGap", "style", "allowedBlocks"].includes(key)) || (node.width !== undefined && (typeof node.width !== "number" || node.width < (node.widthUnit ? 1 : 5) || node.width > 2000)) || (node.widthUnit !== undefined && !["px", "em", "rem", "vw", "vh"].includes(node.widthUnit as string)) || (node.widthUnit === undefined && node.width !== undefined && node.width > 100) || (node.verticalAlign !== undefined && !["top", "centre", "bottom", "stretch"].includes(node.verticalAlign as string)) || !validLayoutOptions(node) || !validParagraphStyle(node.style) || !Array.isArray(node.children)) invalid("Invalid Column block settings."); nodes(node.children, depth + 1, "column"); }
      else if (node.type === "query-loop") {
        if (parentType === "query-loop" || parentType === "post-template" || parentType === "no-results" || !validContentBlocks([node])) invalid("Invalid Query Loop settings.");
        nodes(node.children, depth + 1, "query-loop");
      }
      else if (node.type === "post-template") {
        if (parentType !== "query-loop") invalid(`Post Template ${node.id} has unexpected parent ${parentType ?? "root"}.`);
        nodes(node.children, depth + 1, "post-template");
      }
      else if (node.type === "no-results") {
        if (parentType !== "query-loop" || !Array.isArray(node.children) || node.children.length > 100 || node.children.some(child => !isRecord(child) || child.type === "query-loop" || child.type === "post-template" || child.type === "no-results")) invalid("Invalid No Results settings.");
        nodes(node.children, depth + 1, "no-results");
      }
      else {
        if (parentType === "post-template" && !["title", "post-date", "paragraph", "spacer", "group"].includes(node.type as string)) invalid("Post Template children may only use post fields and supported layout blocks.");
        if (node.type === "component" || node.type === "column" || !validContentBlocks([node])) invalid("Invalid ordinary template block.");
        if ((node.type === "button" || node.type === "embed") && node.url && !safeTextLink(node.url as string)) invalid("Unsafe template link.");
        if (node.type === "image" && ((node.src && !safeImageSource(node.src as string)) || (node.mediaId !== undefined && !safeId(node.mediaId)))) invalid("Invalid template image.");
        for (const runs of [node.runs, node.attributionRuns, node.captionRuns]) if (Array.isArray(runs)) for (const run of runs) if (Array.isArray(run.marks)) for (const mark of run.marks) if (isRecord(mark) && mark.type === "link" && !safeTextLink(mark.url as string)) invalid("Unsafe text link.");
        if (((node.type === "quote" || node.type === "pullquote") || node.type === "buttons" || node.type === "cover") && node.children !== undefined) nodes(node.children, depth + 1, node.type);
      }
    }
  }
  for (const item of [...set.templates, ...set.parts]) {
    if (!isRecord(item) || !text(item.name, 160) || !item.name.trim()) invalid("Name every template and shared part.");
    if ((item.kind === "page" || item.kind === "post") && item.isDefault !== undefined && typeof item.isDefault !== "boolean") invalid("Template default flags are invalid.");
    if ((item.kind === "page" || item.kind === "post") && item.defaults !== undefined && !validTemplateDefaults(item.defaults)) invalid("Template defaults are invalid.");
    if ((item.kind === "page" || item.kind === "post") && item.displayDefaults !== undefined && !validDisplayDefaults(item.displayDefaults)) invalid("Template display defaults are invalid.");
    claimId(item.id, ids); nodes(item.nodes);
  }
  if (set.templates.some(t => !["page", "post"].includes(t.kind)) || set.parts.some(p => !["header", "footer", "overlay", "general"].includes(p.kind))) invalid("Invalid template or part kind.");
  const partMap = new Map(set.parts.map(part => [part.id, part]));
  let expansion = 0;
  function countContent(items: TemplateNode[], ancestors: Set<string>, depth = 0, overlay = false): number {
    if (depth > 16) return invalid("Shared-part nesting is too deep.");
    let slots = 0;
    for (const node of items) {
      if (++expansion > 10000) invalid("Shared parts expand to too many elements. Simplify their references.");
      if (node.type === "part") {
        const part = partMap.get(node.partId);
        if (!part || ancestors.has(part.id)) invalid("Shared parts must exist in this set and cannot form cycles.");
        slots += countContent(part!.nodes, new Set([...ancestors, part!.id]), depth + 1, overlay);
      } else if (node.type === "element" && node.element === "navigation") {
        if (overlay && (node.overlayPartId || node.overlayMenu && node.overlayMenu !== "never")) invalid("Navigation inside an overlay cannot open another overlay.");
        if (node.overlayPartId) {
          const part = partMap.get(node.overlayPartId);
          if (!part || part.kind !== "overlay" || ancestors.has(part.id)) invalid("The navigation overlay must reference an overlay part in this set without cycles.");
          slots += countContent(part.nodes, new Set([...ancestors, part.id]), depth + 1, true);
        }
      } else if (node.type === "element" && node.element === "content") slots++;
      else if (node.type === "group" || node.type === "section" || node.type === "columns" || node.type === "column" || node.type === "social-icons" || (node.type === "quote" || node.type === "pullquote") || node.type === "buttons" || node.type === "cover" || node.type === "query-loop" || node.type === "post-template" || node.type === "no-results") slots += countContent((node.children ?? []) as TemplateNode[], ancestors, depth + 1, overlay);
    }
    return slots;
  }
  for (const part of set.parts) { expansion = 0; if (countContent(part.nodes, new Set([part.id]), 0, part.kind === "overlay") !== 0) invalid("Content belongs in a page or post template, not a shared part."); }
  for (const template of set.templates) { expansion = 0; if (countContent(template.nodes, new Set()) > 1) invalid("Each template may contain at most one Content element."); }
  return { ...set, defaults: set.defaults ?? {},
    templates: set.templates.map(template => ({ ...template, defaults: template.defaults ?? set.defaults ?? {}, nodes: migrateTemplateFootnoteNodes(template.nodes) })),
    parts: set.parts.map(part => ({ ...part, nodes: containsTemplateV73Features(part.nodes) ? part.nodes : migrateTemplateFootnoteNodes(part.nodes) })),
  };
}

/** Preserve template-only nodes and layout metadata while reusing rich fields. */
function migrateTemplateFootnoteNodes(nodes: TemplateNode[]): TemplateNode[] {
  let changed = false;
  const next = nodes.map(node => {
    let migrated = node;
    if (node.type === "group" || node.type === "section" || node.type === "columns" || node.type === "column" || node.type === "query-loop" || node.type === "post-template" || node.type === "no-results") {
      const children = migrateTemplateFootnoteNodes(node.children);
      if (children !== node.children) migrated = { ...node, children } as TemplateNode;
    } else if (node.type !== "element" && node.type !== "part") {
      migrated = migrateLegacyFootnoteBlocks([node as ContentBlock])[0] as TemplateNode;
    }
    changed ||= migrated !== node;
    return migrated;
  });
  return changed ? next : nodes;
}

function optionalTemplateString(value: unknown) { return value === undefined || (typeof value === "string" && value.length <= 2000); }
function validTemplateDefaults(value: unknown): value is TemplateDefaults { return isRecord(value) && optionalTemplateString(value.author) && optionalTemplateString(value.category) && optionalTemplateString(value.parentPageId) && (value.tags === undefined || (Array.isArray(value.tags) && value.tags.length <= 100 && value.tags.every(item => typeof item === "string" && item.length <= 160))); }
function validDisplayDefaults(value: unknown): value is Partial<Record<DocumentDisplayField, DocumentDisplayMode>> {
  return validDocumentDisplay(value);
}

function hasOnlySupportedPlaceholderFields(node: Record<string, unknown>, supported: readonly string[]) {
  return Object.keys(node).every(key => supported.includes(key));
}

function mergeParagraphStyles(...styles: (ParagraphStyle | undefined)[]): ParagraphStyle | undefined {
  const present = styles.filter((style): style is ParagraphStyle => Boolean(style));
  return present.length ? Object.assign({}, ...present.map(copyTemplateData)) : undefined;
}

function migrateDefaultTitlePlaceholders(nodes: TemplateNode[], headerPartIds: ReadonlySet<string>): TemplateNode[] {
  const hasHeaderReference = nodes[0]?.type === "part" && headerPartIds.has(nodes[0].partId);
  const titleIndex = hasHeaderReference ? 1 : 0;
  const title = nodes[titleIndex];
  const subtitle = nodes[titleIndex + 1];
  const hasRootContentAfterPair = nodes.slice(titleIndex + 2).some(node => node.type === "element" && node.element === "content");
  const isPlaceholderPair = hasRootContentAfterPair && title?.type === "heading" && title.text === "Title" && title.runs === undefined && title.blockAlign === undefined
    && hasOnlySupportedPlaceholderFields(title as unknown as Record<string, unknown>, ["id", "type", "text", "level", "align", "runs", "blockAlign", "visualStyle"])
    && subtitle?.type === "paragraph" && subtitle.text === "Subtitle" && subtitle.runs === undefined && subtitle.blockAlign === undefined
    && hasOnlySupportedPlaceholderFields(subtitle as unknown as Record<string, unknown>, ["id", "type", "text", "align", "runs", "blockAlign", "style", "visualStyle"]);
  if (!isPlaceholderPair || title.type !== "heading" || subtitle.type !== "paragraph") return nodes;
  const migrated = nodes.slice();
  migrated.splice(titleIndex, 2,
    { id: title.id, type: "element", element: "document-title", level: title.level, ...(title.align ? { align: title.align } : {}), ...(title.visualStyle ? { visualStyle: copyTemplateData(title.visualStyle) } : {}) },
    { id: subtitle.id, type: "element", element: "subtitle", ...(subtitle.align ? { align: subtitle.align } : {}), ...(subtitle.style ? { style: copyTemplateData(subtitle.style) } : {}), ...(subtitle.visualStyle ? { visualStyle: copyTemplateData(subtitle.visualStyle) } : {}) },
  );
  return migrated;
}

function migrateLegacySubtitleStyles(nodes: TemplateNode[]): TemplateNode[] {
  return nodes.map(node => {
    if (node.type === "element" && node.element === "subtitle" && node.style) {
      const { style, ...withoutLegacyStyle } = node;
      const visualStyle = mergeParagraphStyles(style, node.visualStyle);
      return { ...withoutLegacyStyle, ...(visualStyle ? { visualStyle } : {}) };
    }
    if (node.type === "columns") return { ...node, children: node.children.map(column => ({ ...column, children: migrateLegacySubtitleStyles(column.children) })) };
    if (node.type === "group" || node.type === "section" || node.type === "column" || node.type === "query-loop" || node.type === "post-template" || node.type === "no-results") return { ...node, children: migrateLegacySubtitleStyles(node.children) };
    return node;
  });
}

function containsPageLinkPresentation(value: Record<string, unknown>): boolean {
  const nestedTemplates = isRecord(value.templates) ? value.templates : undefined;
  const sets = [...(Array.isArray(value.sets) ? value.sets : []), ...(nestedTemplates && Array.isArray(nestedTemplates.sets) ? nestedTemplates.sets : []), value.set,
    ...(Array.isArray(value.bin) ? value.bin.flatMap(item => isRecord(item) ? [item.set, item.setSnapshot] : []) : [])];
  function hasStyle(items: unknown, depth = 0): boolean {
    if (!Array.isArray(items) || depth > 5) return false;
    return items.some(link => isRecord(link) && (link.visualStyle !== undefined || hasStyle(link.children, depth + 1)));
  }
  return sets.some(set => isRecord(set) && (hasStyle(set.navigation) || hasStyle(set.socialLinks)));
}

function containsPageLinkAdvancedFields(value: Record<string, unknown>): boolean {
  const sets = [...(Array.isArray(value.sets) ? value.sets : []), value.set,
    ...(Array.isArray(value.bin) ? value.bin.flatMap(item => isRecord(item) ? [item.set, item.setSnapshot] : []) : [])];
  function hasFields(items: unknown, depth = 0): boolean {
    if (!Array.isArray(items) || depth > 5) return false;
    return items.some(link => isRecord(link) && (isRecord(link.visualStyle) &&
      (link.visualStyle.anchor !== undefined || link.visualStyle.additionalCss !== undefined) || hasFields(link.children, depth + 1)));
  }
  return sets.some(set => isRecord(set) && hasFields(set.navigation));
}

/** Implicit overlay edges share the ordinary part dependency contract. */
export function templatePartReference(node: TemplateNode): string | undefined {
  return node.type === "part" ? node.partId : node.type === "element" && node.element === "navigation" ? node.overlayPartId : undefined;
}

function containsNavigationOverlaySettings(value: Record<string, unknown>): boolean {
  const bin = Array.isArray(value.bin) ? value.bin.filter(isRecord) : [];
  const sets = [...(Array.isArray(value.sets) ? value.sets : []), value.set, ...bin.flatMap(item => [item.set, item.setSnapshot])];
  function hasSettings(nodes: unknown, depth = 0): boolean {
    if (!Array.isArray(nodes) || depth > 8) return false;
    return nodes.some(node => isRecord(node) && (node.type === "element" && node.element === "navigation" &&
      (node.showIcon !== undefined || node.icon !== undefined || node.overlayPartId !== undefined) || hasSettings(node.children, depth + 1)));
  }
  const entries = [...bin.map(item => item.entry), ...sets.flatMap(set => isRecord(set)
    ? [...(Array.isArray(set.templates) ? set.templates : []), ...(Array.isArray(set.parts) ? set.parts : [])] : [])];
  return entries.some(entry => isRecord(entry) && (entry.kind === "overlay" || hasSettings(entry.nodes)));
}

export function containsTemplateContentTagName(value: unknown): boolean {
  const pending: unknown[] = [value];
  const seen = new WeakSet<object>();
  let inspected = 0;
  while (pending.length && inspected < 100000) {
    const current = pending.pop();
    inspected += 1;
    if (!Array.isArray(current) && (!isRecord(current) || seen.has(current))) continue;
    if (!Array.isArray(current)) {
      seen.add(current);
      if (current.type === "element" && current.element === "content" && current.tagName !== undefined) return true;
    }
    const children = Array.isArray(current) ? current : Object.values(current);
    for (const child of children) {
      if (pending.length + inspected >= 100000) return true;
      pending.push(child);
    }
  }
  // An incomplete walk must fail closed so an older envelope cannot discard
  // a supported setting hidden beyond the inspection bound.
  return pending.length > 0;
}

export function containsAutomaticNavigationPageList(value: unknown): boolean {
  const pending: unknown[] = [value];
  const visited = new Set<object>();
  let inspected = 0;
  while (pending.length && inspected < 100000) {
    const current = pending.pop();
    inspected += 1;
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    if (!Array.isArray(current) && isRecord(current) && current.type === "element" && current.element === "navigation" && current.automaticPageList === true) return true;
    for (const child of Array.isArray(current) ? current : Object.values(current)) pending.push(child);
  }
  // An incomplete walk must fail closed so an older envelope cannot discard
  // a setting hidden beyond the inspection bound.
  return pending.length > 0;
}

export function containsNavigationSearch(value: unknown): boolean {
  const pending: unknown[] = [value];
  const visited = new Set<object>();
  let inspected = 0;
  while (pending.length && inspected < 100000) {
    const current = pending.pop();
    inspected += 1;
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    if (!Array.isArray(current) && isRecord(current) && current.type === "element" && current.element === "navigation" && current.searchEnabled === true) return true;
    for (const child of Array.isArray(current) ? current : Object.values(current)) pending.push(child);
  }
  return pending.length > 0;
}

export function containsNavigationSearchStyle(value: unknown): boolean {
  const pending: unknown[] = [value];
  const visited = new Set<object>();
  let inspected = 0;
  while (pending.length && inspected < 100000) {
    const current = pending.pop();
    inspected += 1;
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    if (!Array.isArray(current) && isRecord(current) && current.type === "element" && current.element === "navigation" && current.searchVisualStyle !== undefined) return true;
    for (const child of Array.isArray(current) ? current : Object.values(current)) pending.push(child);
  }
  return pending.length > 0;
}

export function containsNavigationSearchDisplayWidth(value: unknown): boolean {
  const pending: unknown[] = [value];
  const visited = new Set<object>();
  let inspected = 0;
  while (pending.length && inspected < 100000) {
    const current = pending.pop();
    inspected += 1;
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    if (!Array.isArray(current) && isRecord(current) && current.type === "element" && current.element === "navigation" && current.searchDisplayWidth !== undefined) return true;
    for (const child of Array.isArray(current) ? current : Object.values(current)) pending.push(child);
  }
  return pending.length > 0;
}

/** True when a saved menu contains a destination that follows the owning site's home page. */
export function containsNavigationHomeLink(value: unknown): boolean {
  const pending: unknown[] = [value];
  const visited = new Set<object>();
  let inspected = 0;
  while (pending.length && inspected < 100000) {
    const current = pending.pop();
    inspected += 1;
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    if (!Array.isArray(current) && isRecord(current) && current.homeLink === true) return true;
    for (const child of Array.isArray(current) ? current : Object.values(current)) pending.push(child);
  }
  return pending.length > 0;
}

export { containsSiteTitle } from "./site-title-contract";

export function containsTemplateV73Features(value: unknown): boolean {
  const pending: unknown[] = [value];
  const seen = new Set<object>();
  let inspected = 0;
  while (pending.length && inspected++ < 100000) {
    const current = pending.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    if (!Array.isArray(current)) {
      const record = current as Record<string, unknown>;
      if (record.type === "query-loop" || record.type === "element" && (record.element === "site-tagline" || record.element === "site-credit")) return true;
    }
    for (const child of Array.isArray(current) ? current : Object.values(current)) pending.push(child);
  }
  return false;
}

export function validateTemplateStore(value: unknown, documents?: Pick<StudioDocument, "id" | "kind">[]): TemplateStore {
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && containsScopedFlexItemSizing(value)) invalid("Scoped flex child sizing requires template v0.76.0. Original data has been retained.");
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_75) value = { ...value, version: TEMPLATE_VERSION };
  // v0.74.0 is the complete previous writer envelope; validation always returns the current writer version.
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_74) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && containsTemplateV73Features(value)) invalid("Query Loop, Site Tagline and credit elements require template v0.73.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && containsGroupHeadingStyles(value)) invalid("Per-level Group heading styles require template v0.74.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && containsExtendedGroupShadow(value)) invalid("Expanded Group shadow presets require template v0.74.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && containsExtraBlackAppearance(value)) invalid("Extra Black font appearance requires template v0.74.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && containsGeneralTemplatePart(value)) invalid("General template parts require template v0.72.0.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && containsSiteTitle(value)) invalid("Site Title requires template v0.71.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && containsWebsiteFont(value)) invalid("Website fonts require template v0.70.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && containsBoxSideOverrides(value)) throw new Error("Per-side spacing or border values require template v0.69.0.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && containsPullquote(value)) throw new Error("Pullquote requires template v0.68.0. Original data has been retained.");
  value = migrateLegacyBlockTypeNames(value);
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && containsCoreSocialLink(value)) invalid("Social Link services require template v0.61.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && containsAuthorBlockPresentation(value)) invalid("Author profile presentation requires template v0.59.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && containsAuthoredAuthorDuotone(value)) invalid("Author Duotone requires template v0.60.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && containsVideoBlock(value)) invalid("Video blocks require template v0.66.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && containsNativeCoverVideoSource(value)) invalid("Native Cover video sources require template v0.67.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_65 && containsCoverVideoBackground(value)) invalid("Cover video backgrounds require template v0.65.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && containsAuthoredCoverCrop(value)) invalid("Cover crop edits require template v0.64.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && containsAuthoredImageCrop(value)) invalid("Image crop edits require template v0.58.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && containsCoverInnerContentWidth(value)) invalid("Cover inner-content width requires template v0.63.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && containsCoverContentPosition(value)) invalid("Cover content position requires template v0.62.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_57 && containsCoverBlock(value)) invalid("Cover blocks require template v0.57.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_57 && value.version !== LEGACY_TEMPLATE_VERSION_56 && containsCodeMonospaceFont(value)) invalid("Code monospace font requires template v0.56.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_55 && value.version !== LEGACY_TEMPLATE_VERSION_56 && containsCodeRuns(value)) invalid("Code inline formatting requires template v0.55.0. Original data has been retained.");
  if (isRecord(value) && (value.version === LEGACY_TEMPLATE_VERSION_55 || value.version === LEGACY_TEMPLATE_VERSION_56)) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_54) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_53 && containsNavigationHomeLink(value)) invalid("Navigation Home Links require template v0.53.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && containsNavigationSpacer(value)) invalid("Navigation spacers require template v0.54.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && containsNavigationSearchDisplayWidth(value)) invalid("Navigation Search display widths require template v0.52.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && containsGridItemSizing(value)) invalid("Grid child spans require template v0.51.0. Original data has been retained.");
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_53) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_52) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_51) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && containsDetailsPresentation(value)) invalid("Details blocks require template v0.50.0. Original data has been retained.");
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_50) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_49 && containsAuthoredFeaturedImageOverlay(value)) invalid("Featured Image overlays require template v0.49.0. Original data has been retained.");
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_49) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_48) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && containsNavigationSearchStyle(value)) invalid("Navigation Search styles require template v0.48.0. Original data has been retained.");
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_47) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && containsNavigationSearch(value)) invalid("Navigation Search requires template v0.47.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_46 && value.version !== LEGACY_TEMPLATE_VERSION_45 && containsPostDateTimeOverride(value)) invalid("Post Date overrides require template v0.45.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_46 && containsAutomaticNavigationPageList(value)) invalid("Automatic Navigation Page Lists require template v0.46.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && containsNavigationPageListBlock(value)) invalid("Page List blocks require template v0.74.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_46 && value.version !== LEGACY_TEMPLATE_VERSION_45 && value.version !== LEGACY_TEMPLATE_VERSION_44 && containsColumnWidthUnit(value)) invalid("Column width units require template v0.44.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && containsFlexItemSizing(value)) invalid("Flex child sizing requires template v0.43.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_41 && containsTemplateContentTagName(value)) invalid("Content HTML elements require template v0.41.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && containsTemplateContentButtonStyle(value)) invalid("Content Button element colours require template v0.42.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && value.version !== LEGACY_TEMPLATE_VERSION_37 && containsButtonsAlignment(value)) invalid("Buttons alignment requires template v0.37.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && containsGroupGridFillAvailableSpace(value)) invalid("Grid Fill available space requires template v0.40.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && containsImageResolution(value)) invalid("Image size selections require template v0.39.0. Original data has been retained.");
  if (!isRecord(value) || !([TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_73, LEGACY_TEMPLATE_VERSION_72, LEGACY_TEMPLATE_VERSION_71, LEGACY_TEMPLATE_VERSION_70, LEGACY_TEMPLATE_VERSION_69, LEGACY_TEMPLATE_VERSION_68, LEGACY_TEMPLATE_VERSION_67, LEGACY_TEMPLATE_VERSION_66, LEGACY_TEMPLATE_VERSION_64, LEGACY_TEMPLATE_VERSION_65, LEGACY_TEMPLATE_VERSION_63, LEGACY_TEMPLATE_VERSION_62, LEGACY_TEMPLATE_VERSION_61, LEGACY_TEMPLATE_VERSION_60, LEGACY_TEMPLATE_VERSION_59, LEGACY_TEMPLATE_VERSION_58, LEGACY_TEMPLATE_VERSION_57, LEGACY_TEMPLATE_VERSION_56, LEGACY_TEMPLATE_VERSION_55, LEGACY_TEMPLATE_VERSION_54, LEGACY_TEMPLATE_VERSION_53, LEGACY_TEMPLATE_VERSION_50, LEGACY_TEMPLATE_VERSION_46, LEGACY_TEMPLATE_VERSION_45, LEGACY_TEMPLATE_VERSION_44, LEGACY_TEMPLATE_VERSION_43, LEGACY_TEMPLATE_VERSION_42, LEGACY_TEMPLATE_VERSION_41, LEGACY_TEMPLATE_VERSION_40, LEGACY_TEMPLATE_VERSION_39, LEGACY_TEMPLATE_VERSION_38, LEGACY_TEMPLATE_VERSION_37, LEGACY_TEMPLATE_VERSION_36, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29, LEGACY_TEMPLATE_VERSION_28, LEGACY_TEMPLATE_VERSION_27, LEGACY_TEMPLATE_VERSION_26, LEGACY_TEMPLATE_VERSION_25, LEGACY_TEMPLATE_VERSION_24, LEGACY_TEMPLATE_VERSION_23, LEGACY_TEMPLATE_VERSION_22, LEGACY_TEMPLATE_VERSION_21, LEGACY_TEMPLATE_VERSION_20, LEGACY_TEMPLATE_VERSION_19, LEGACY_TEMPLATE_VERSION_18, LEGACY_TEMPLATE_VERSION_17, LEGACY_TEMPLATE_VERSION_16, LEGACY_TEMPLATE_VERSION_15, LEGACY_TEMPLATE_VERSION_14, LEGACY_TEMPLATE_VERSION_13, LEGACY_TEMPLATE_VERSION_12, LEGACY_TEMPLATE_VERSION_11, LEGACY_TEMPLATE_VERSION_10, LEGACY_TEMPLATE_VERSION_9, LEGACY_TEMPLATE_VERSION_8, LEGACY_TEMPLATE_VERSION_7, LEGACY_TEMPLATE_VERSION_6, LEGACY_TEMPLATE_VERSION_5, LEGACY_TEMPLATE_VERSION_4, LEGACY_TEMPLATE_VERSION_3, LEGACY_TEMPLATE_VERSION_2, LEGACY_TEMPLATE_VERSION] as readonly string[]).includes(value.version as string) || !Array.isArray(value.sets) || value.sets.length > 100 || !Array.isArray(value.assignments) || value.assignments.length > 10000 || (value.bin !== undefined && (!Array.isArray(value.bin) || value.bin.length > 10000))) invalid("Unsupported or invalid saved template data. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && value.version !== LEGACY_TEMPLATE_VERSION_37 && value.version !== LEGACY_TEMPLATE_VERSION_36 && containsAuthoredImageDuotone(value)) invalid("Image Duotone requires template v0.36.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && containsAuthoredFeaturedImageDuotone(value)) invalid("Featured Image Duotone requires template v0.38.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && value.version !== LEGACY_TEMPLATE_VERSION_37 && value.version !== LEGACY_TEMPLATE_VERSION_36 && value.version !== LEGACY_TEMPLATE_VERSION_35 && containsQuotePresentation(value)) invalid("Quote presentation requires template v0.35.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && value.version !== LEGACY_TEMPLATE_VERSION_37 && value.version !== LEGACY_TEMPLATE_VERSION_36 && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && containsExtendedImageAspectRatio(value)) invalid("These aspect ratios require template v0.34.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && value.version !== LEGACY_TEMPLATE_VERSION_37 && value.version !== LEGACY_TEMPLATE_VERSION_36 && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && value.version !== LEGACY_TEMPLATE_VERSION_33 && containsTableCellAlignment(value)) invalid("Cell alignment requires template v0.33.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && value.version !== LEGACY_TEMPLATE_VERSION_37 && value.version !== LEGACY_TEMPLATE_VERSION_36 && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && value.version !== LEGACY_TEMPLATE_VERSION_33 && value.version !== LEGACY_TEMPLATE_VERSION_32 && containsResponsiveStyles(value)) invalid("Responsive styles require template v0.32.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && value.version !== LEGACY_TEMPLATE_VERSION_37 && value.version !== LEGACY_TEMPLATE_VERSION_36 && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && value.version !== LEGACY_TEMPLATE_VERSION_33 && value.version !== LEGACY_TEMPLATE_VERSION_32 && value.version !== LEGACY_TEMPLATE_VERSION_31 && containsPageLinkAdvancedFields(value)) invalid("Page link anchors and Additional CSS require template v0.31.0. Original data has been retained.");
  if (![TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_74, LEGACY_TEMPLATE_VERSION_73, LEGACY_TEMPLATE_VERSION_72, LEGACY_TEMPLATE_VERSION_71, LEGACY_TEMPLATE_VERSION_70, LEGACY_TEMPLATE_VERSION_69, LEGACY_TEMPLATE_VERSION_68, LEGACY_TEMPLATE_VERSION_67, LEGACY_TEMPLATE_VERSION_66, LEGACY_TEMPLATE_VERSION_64, LEGACY_TEMPLATE_VERSION_65, LEGACY_TEMPLATE_VERSION_63, LEGACY_TEMPLATE_VERSION_62, LEGACY_TEMPLATE_VERSION_61, LEGACY_TEMPLATE_VERSION_60, LEGACY_TEMPLATE_VERSION_59, LEGACY_TEMPLATE_VERSION_58, LEGACY_TEMPLATE_VERSION_57, LEGACY_TEMPLATE_VERSION_56, LEGACY_TEMPLATE_VERSION_55, LEGACY_TEMPLATE_VERSION_54, LEGACY_TEMPLATE_VERSION_53, LEGACY_TEMPLATE_VERSION_52, LEGACY_TEMPLATE_VERSION_51, LEGACY_TEMPLATE_VERSION_50, LEGACY_TEMPLATE_VERSION_46, LEGACY_TEMPLATE_VERSION_45, LEGACY_TEMPLATE_VERSION_44, LEGACY_TEMPLATE_VERSION_40, LEGACY_TEMPLATE_VERSION_39, LEGACY_TEMPLATE_VERSION_38, LEGACY_TEMPLATE_VERSION_37, LEGACY_TEMPLATE_VERSION_36, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29].includes(value.version as typeof TEMPLATE_VERSION) && containsNavigationOverlaySettings(value)) invalid("Navigation overlay settings require template v0.29.0. Original data has been retained.");
  if (![TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_74, LEGACY_TEMPLATE_VERSION_73, LEGACY_TEMPLATE_VERSION_72, LEGACY_TEMPLATE_VERSION_71, LEGACY_TEMPLATE_VERSION_70, LEGACY_TEMPLATE_VERSION_69, LEGACY_TEMPLATE_VERSION_68, LEGACY_TEMPLATE_VERSION_67, LEGACY_TEMPLATE_VERSION_66, LEGACY_TEMPLATE_VERSION_64, LEGACY_TEMPLATE_VERSION_65, LEGACY_TEMPLATE_VERSION_63, LEGACY_TEMPLATE_VERSION_62, LEGACY_TEMPLATE_VERSION_61, LEGACY_TEMPLATE_VERSION_60, LEGACY_TEMPLATE_VERSION_59, LEGACY_TEMPLATE_VERSION_58, LEGACY_TEMPLATE_VERSION_57, LEGACY_TEMPLATE_VERSION_56, LEGACY_TEMPLATE_VERSION_55, LEGACY_TEMPLATE_VERSION_54, LEGACY_TEMPLATE_VERSION_53, LEGACY_TEMPLATE_VERSION_50, LEGACY_TEMPLATE_VERSION_46, LEGACY_TEMPLATE_VERSION_45, LEGACY_TEMPLATE_VERSION_44, LEGACY_TEMPLATE_VERSION_40, LEGACY_TEMPLATE_VERSION_39, LEGACY_TEMPLATE_VERSION_38, LEGACY_TEMPLATE_VERSION_37, LEGACY_TEMPLATE_VERSION_36, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29, LEGACY_TEMPLATE_VERSION_28].includes(value.version as typeof TEMPLATE_VERSION) && containsPageLinkPresentation(value)) invalid("Page link presentation requires template v0.28.0. Original data has been retained.");
  if ((![TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_74, LEGACY_TEMPLATE_VERSION_73, LEGACY_TEMPLATE_VERSION_72, LEGACY_TEMPLATE_VERSION_71, LEGACY_TEMPLATE_VERSION_70, LEGACY_TEMPLATE_VERSION_69, LEGACY_TEMPLATE_VERSION_68, LEGACY_TEMPLATE_VERSION_67, LEGACY_TEMPLATE_VERSION_66, LEGACY_TEMPLATE_VERSION_64, LEGACY_TEMPLATE_VERSION_65, LEGACY_TEMPLATE_VERSION_63, LEGACY_TEMPLATE_VERSION_62, LEGACY_TEMPLATE_VERSION_61, LEGACY_TEMPLATE_VERSION_60, LEGACY_TEMPLATE_VERSION_59, LEGACY_TEMPLATE_VERSION_58, LEGACY_TEMPLATE_VERSION_57, LEGACY_TEMPLATE_VERSION_56, LEGACY_TEMPLATE_VERSION_55, LEGACY_TEMPLATE_VERSION_54, LEGACY_TEMPLATE_VERSION_53, LEGACY_TEMPLATE_VERSION_50, LEGACY_TEMPLATE_VERSION_46, LEGACY_TEMPLATE_VERSION_45, LEGACY_TEMPLATE_VERSION_44, LEGACY_TEMPLATE_VERSION_40, LEGACY_TEMPLATE_VERSION_39, LEGACY_TEMPLATE_VERSION_38, LEGACY_TEMPLATE_VERSION_37, LEGACY_TEMPLATE_VERSION_36, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29, LEGACY_TEMPLATE_VERSION_28, LEGACY_TEMPLATE_VERSION_27, LEGACY_TEMPLATE_VERSION_26, LEGACY_TEMPLATE_VERSION_25, LEGACY_TEMPLATE_VERSION_24].includes(value.version as typeof TEMPLATE_VERSION) && containsRichTextInlineObjects(value) || ![TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_73, LEGACY_TEMPLATE_VERSION_72, LEGACY_TEMPLATE_VERSION_71, LEGACY_TEMPLATE_VERSION_70, LEGACY_TEMPLATE_VERSION_69, LEGACY_TEMPLATE_VERSION_68, LEGACY_TEMPLATE_VERSION_67, LEGACY_TEMPLATE_VERSION_66, LEGACY_TEMPLATE_VERSION_64, LEGACY_TEMPLATE_VERSION_65, LEGACY_TEMPLATE_VERSION_63, LEGACY_TEMPLATE_VERSION_62, LEGACY_TEMPLATE_VERSION_61, LEGACY_TEMPLATE_VERSION_60, LEGACY_TEMPLATE_VERSION_59, LEGACY_TEMPLATE_VERSION_58, LEGACY_TEMPLATE_VERSION_57, LEGACY_TEMPLATE_VERSION_56, LEGACY_TEMPLATE_VERSION_55, LEGACY_TEMPLATE_VERSION_54, LEGACY_TEMPLATE_VERSION_53, LEGACY_TEMPLATE_VERSION_50, LEGACY_TEMPLATE_VERSION_46, LEGACY_TEMPLATE_VERSION_45, LEGACY_TEMPLATE_VERSION_44, LEGACY_TEMPLATE_VERSION_40, LEGACY_TEMPLATE_VERSION_39, LEGACY_TEMPLATE_VERSION_38, LEGACY_TEMPLATE_VERSION_37, LEGACY_TEMPLATE_VERSION_36, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29, LEGACY_TEMPLATE_VERSION_28, LEGACY_TEMPLATE_VERSION_27, LEGACY_TEMPLATE_VERSION_26, LEGACY_TEMPLATE_VERSION_25].includes(value.version as typeof TEMPLATE_VERSION) && (containsRichTextInlineObjects(value, "math") || containsRichTextInlineObjects(value, "image") || containsExtendedLanguage(value)))) invalid("Inline objects require the current template format. Original data has been retained.");
  if (value.defaultTemplateIds !== undefined && (!isRecord(value.defaultTemplateIds) || (value.defaultTemplateIds.page !== undefined && !safeId(value.defaultTemplateIds.page)) || (value.defaultTemplateIds.post !== undefined && !safeId(value.defaultTemplateIds.post)))) invalid("The default template selection is invalid.");
  const migrateLegacyDefaultTitles = value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && value.version !== LEGACY_TEMPLATE_VERSION_37 && value.version !== LEGACY_TEMPLATE_VERSION_36 && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && value.version !== LEGACY_TEMPLATE_VERSION_33 && value.version !== LEGACY_TEMPLATE_VERSION_32 && value.version !== LEGACY_TEMPLATE_VERSION_31 && value.version !== LEGACY_TEMPLATE_VERSION_30 && value.version !== LEGACY_TEMPLATE_VERSION_29 && value.version !== LEGACY_TEMPLATE_VERSION_28 && value.version !== LEGACY_TEMPLATE_VERSION_27 && value.version !== LEGACY_TEMPLATE_VERSION_26 && value.version !== LEGACY_TEMPLATE_VERSION_25 && value.version !== LEGACY_TEMPLATE_VERSION_24 && value.version !== LEGACY_TEMPLATE_VERSION_23 && value.version !== LEGACY_TEMPLATE_VERSION_22 && value.version !== LEGACY_TEMPLATE_VERSION_21 && value.version !== LEGACY_TEMPLATE_VERSION_20 && value.version !== LEGACY_TEMPLATE_VERSION_19 && value.version !== LEGACY_TEMPLATE_VERSION_18 && value.version !== LEGACY_TEMPLATE_VERSION_17 && value.version !== LEGACY_TEMPLATE_VERSION_16 && value.version !== LEGACY_TEMPLATE_VERSION_15 && value.version !== LEGACY_TEMPLATE_VERSION_14 && value.version !== LEGACY_TEMPLATE_VERSION_13 && value.version !== LEGACY_TEMPLATE_VERSION_12;
  const store = { ...(value as unknown as TemplateStore), version: TEMPLATE_VERSION, bin: ((value.bin ?? []) as unknown[]).map(item => { if (!isRecord(item)) return item; if (item.kind === "set") return { ...item, set: validateTemplateSet(item.set) }; if (item.kind === "template") return { ...item, setSnapshot: validateTemplateSet(item.setSnapshot) }; return item; }), sets: (value.sets as unknown[]).map(item => {
    if (!isRecord(item)) return item;
    const set = validateTemplateSet({ ...item, defaults: item.defaults ?? {} });
    const headerPartIds = new Set(set.parts.filter(part => part.kind === "header").map(part => part.id));
    const templates = set.templates.map(template => {
      const isDefault = template.isDefault ?? (!set.templates.some(candidate => candidate.kind === template.kind && candidate.isDefault) && template.id === set.templates.find(candidate => candidate.kind === template.kind)?.id);
      const titleMigratedNodes = migrateLegacyDefaultTitles && isDefault ? migrateDefaultTitlePlaceholders(template.nodes, headerPartIds) : template.nodes;
      return { ...template, nodes: migrateLegacySubtitleStyles(titleMigratedNodes), isDefault };
    });
    const parts = set.parts.map(part => ({ ...part, nodes: migrateLegacySubtitleStyles(part.nodes) }));
    return { ...set, templates, parts };
  }) } as unknown as TemplateStore;
  const ids = new Set<string>();
  for (const set of store.sets) { validateTemplateSet(set); claimId(set.id, ids); }
  const binIds = new Set<string>();
  for (const item of store.bin) {
    if (!isRecord(item) || !safeId(item.id) || binIds.has(item.id) || typeof item.deletedAt !== "string" || !Number.isFinite(Date.parse(item.deletedAt))) invalid("The Bin contains an invalid template item.");
    binIds.add(item.id as string);
    if (item.kind === "set") validateTemplateSet(item.set);
    else if (item.kind === "template") {
      const snapshot = validateTemplateSet(item.setSnapshot);
      if (!safeId(item.setId) || !text(item.setName, 160) || !isRecord(item.entry) || ![...snapshot.templates, ...snapshot.parts].some(entry => entry.id === item.entry!.id && entry.kind === item.entry!.kind)) invalid("The Bin contains an invalid template item.");
    } else invalid("The Bin contains an unknown item.");
  }
  const assigned = new Set<string>();
  for (const assignment of store.assignments) {
    if (!isRecord(assignment) || !safeId(assignment.documentId) || assigned.has(assignment.documentId)) invalid("Invalid or duplicate template assignment.");
    const set = store.sets.find(s => s.id === assignment.setId);
    const template = set?.templates.find(t => t.id === assignment.templateId);
    if (!template || !["page", "post"].includes(template.kind)) invalid("The assigned template is missing or has the wrong kind.");
    if (documents && !documents.some(d => d.id === assignment.documentId && d.kind === assignment.kind)) invalid("A template assignment refers to a missing document.");
    assigned.add(assignment.documentId);
  }
  const bin = store.bin.map(item => {
    if (item.kind !== "template") return item;
    // The entry is the actual restore payload. Validate it in its saved set,
    // rather than substituting the possibly different snapshot entry by ID.
    const snapshot = validateTemplateSet({ ...item.setSnapshot,
      templates: item.setSnapshot.templates.map(entry => entry.id === item.entry.id ? item.entry : entry),
      parts: item.setSnapshot.parts.map(entry => entry.id === item.entry.id ? item.entry : entry),
    });
    const entry = [...snapshot.templates, ...snapshot.parts].find(entry => entry.id === item.entry.id)!;
    return { ...item, entry };
  });
  const libraryOrder = store.libraryOrder ?? [];
  if (!Array.isArray(libraryOrder) || libraryOrder.length > 20000 || libraryOrder.some(item => !isRecord(item) || !safeId(item.setId) || !safeId(item.entryId) || item.id !== `${item.setId}/${item.entryId}` || Object.keys(item).some(key => !["id", "setId", "entryId"].includes(key))) || new Set(libraryOrder.map(item => item.id)).size !== libraryOrder.length) invalid("The template library order is invalid. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_46 && value.version !== LEGACY_TEMPLATE_VERSION_45 && value.version !== LEGACY_TEMPLATE_VERSION_44 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && value.version !== LEGACY_TEMPLATE_VERSION_37 && value.version !== LEGACY_TEMPLATE_VERSION_36 && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && value.version !== LEGACY_TEMPLATE_VERSION_33 && value.version !== LEGACY_TEMPLATE_VERSION_32 && value.version !== LEGACY_TEMPLATE_VERSION_31 && value.version !== LEGACY_TEMPLATE_VERSION_30 && Array.isArray(value.libraryOrder) && value.libraryOrder.length > 0) invalid("Template library ordering requires template v0.30.0.");
  // Keep removed/Bin references inert so restoration recovers their position.
  const orderedIds = new Set(libraryOrder.map(item => item.id));
  const missing = store.sets.flatMap(set => [...set.templates, ...set.parts].map(entry => ({ id: `${set.id}/${entry.id}`, setId: set.id, entryId: entry.id }))).filter(item => !orderedIds.has(item.id));
  if (libraryOrder.length + missing.length > 20000) invalid("The template library order exceeds its recovery limit.");
  return { ...store, bin, defaultTemplateIds: store.defaultTemplateIds ?? {}, libraryOrder: [...libraryOrder, ...missing] };
}

export function validateTemplateSnapshot(value: unknown): TemplateSnapshot {
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && containsScopedFlexItemSizing(value)) invalid("Scoped flex child sizing requires template v0.76.0. Original data has been retained.");
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_75) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_74) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && containsTemplateV73Features(value)) invalid("Query Loop, Site Tagline and credit elements require template v0.73.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && containsGroupHeadingStyles(value)) invalid("Per-level Group heading styles require template v0.74.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && containsExtendedGroupShadow(value)) invalid("Expanded Group shadow presets require template v0.74.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && containsExtraBlackAppearance(value)) invalid("Extra Black font appearance requires template v0.74.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && containsGeneralTemplatePart(value)) invalid("General template parts require template v0.72.0.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && containsSiteTitle(value)) invalid("Site Title requires template v0.71.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && containsWebsiteFont(value)) invalid("Website fonts require template v0.70.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && containsBoxSideOverrides(value)) throw new Error("Per-side spacing or border values require template v0.69.0.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && containsPullquote(value)) throw new Error("Pullquote requires template v0.68.0. Original data has been retained.");
  value = migrateLegacyBlockTypeNames(value);
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && containsNativeCoverVideoSource(value)) invalid("Native Cover video sources require template v0.67.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && containsCoreSocialLink(value)) invalid("Social Link services require template v0.61.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && containsAuthorBlockPresentation(value)) invalid("Author profile presentation requires template v0.59.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && containsAuthoredAuthorDuotone(value)) invalid("Author Duotone requires template v0.60.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && containsVideoBlock(value)) invalid("Video blocks require template v0.66.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_65 && containsCoverVideoBackground(value)) invalid("Cover video backgrounds require template v0.65.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && containsAuthoredCoverCrop(value)) invalid("Cover crop edits require template v0.64.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && containsAuthoredImageCrop(value)) invalid("Image crop edits require template v0.58.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && containsCoverInnerContentWidth(value)) invalid("Cover inner-content width requires template v0.63.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && containsCoverContentPosition(value)) invalid("Cover content position requires template v0.62.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_57 && containsCoverBlock(value)) invalid("Cover blocks require template v0.57.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_57 && value.version !== LEGACY_TEMPLATE_VERSION_56 && containsCodeMonospaceFont(value)) invalid("Code monospace font requires template v0.56.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_55 && value.version !== LEGACY_TEMPLATE_VERSION_56 && containsCodeRuns(value)) invalid("Code inline formatting requires template v0.55.0. Original data has been retained.");
  if (isRecord(value) && (value.version === LEGACY_TEMPLATE_VERSION_55 || value.version === LEGACY_TEMPLATE_VERSION_56)) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_53 && containsNavigationHomeLink(value)) invalid("Navigation Home Links require template v0.53.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && containsNavigationSpacer(value)) invalid("Navigation spacers require template v0.54.0. Original data has been retained.");
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_53) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_52) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && containsGridItemSizing(value)) invalid("Grid child spans require template v0.51.0. Original data has been retained.");
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_50) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && containsAuthoredFeaturedImageOverlay(value.set)) invalid("Featured Image overlays require template v0.49.0. Original data has been retained.");
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_49) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_48) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && containsNavigationSearchStyle(value)) invalid("Navigation Search styles require template v0.48.0. Original data has been retained.");
  if (isRecord(value) && value.version === LEGACY_TEMPLATE_VERSION_47) value = { ...value, version: TEMPLATE_VERSION };
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && containsNavigationSearch(value)) invalid("Navigation Search requires template v0.47.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_46 && containsAutomaticNavigationPageList(value)) invalid("Automatic Navigation Page Lists require template v0.46.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && containsNavigationPageListBlock(value)) invalid("Page List blocks require template v0.74.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_46 && value.version !== LEGACY_TEMPLATE_VERSION_45 && containsPostDateTimeOverride(value)) invalid("Post Date overrides require template v0.45.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_46 && value.version !== LEGACY_TEMPLATE_VERSION_45 && value.version !== LEGACY_TEMPLATE_VERSION_44 && containsColumnWidthUnit(value)) invalid("Column width units require template v0.44.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && containsTemplateContentTagName(value)) invalid("Content HTML elements require template v0.41.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && value.version !== LEGACY_TEMPLATE_VERSION_37 && containsButtonsAlignment(value)) invalid("Buttons alignment requires template v0.37.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && containsGroupGridFillAvailableSpace(value)) invalid("Grid Fill available space requires template v0.40.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && containsImageResolution(value)) invalid("Image size selections require template v0.39.0. Original data has been retained.");
  if (!isRecord(value) || !([TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_73, LEGACY_TEMPLATE_VERSION_72, LEGACY_TEMPLATE_VERSION_71, LEGACY_TEMPLATE_VERSION_70, LEGACY_TEMPLATE_VERSION_69, LEGACY_TEMPLATE_VERSION_68, LEGACY_TEMPLATE_VERSION_67, LEGACY_TEMPLATE_VERSION_66, LEGACY_TEMPLATE_VERSION_64, LEGACY_TEMPLATE_VERSION_65, LEGACY_TEMPLATE_VERSION_63, LEGACY_TEMPLATE_VERSION_62, LEGACY_TEMPLATE_VERSION_61, LEGACY_TEMPLATE_VERSION_60, LEGACY_TEMPLATE_VERSION_59, LEGACY_TEMPLATE_VERSION_58, LEGACY_TEMPLATE_VERSION_57, LEGACY_TEMPLATE_VERSION_56, LEGACY_TEMPLATE_VERSION_55, LEGACY_TEMPLATE_VERSION_54, LEGACY_TEMPLATE_VERSION_53, LEGACY_TEMPLATE_VERSION_50, LEGACY_TEMPLATE_VERSION_46, LEGACY_TEMPLATE_VERSION_45, LEGACY_TEMPLATE_VERSION_44, LEGACY_TEMPLATE_VERSION_43, LEGACY_TEMPLATE_VERSION_42, LEGACY_TEMPLATE_VERSION_41, LEGACY_TEMPLATE_VERSION_40, LEGACY_TEMPLATE_VERSION_39, LEGACY_TEMPLATE_VERSION_38, LEGACY_TEMPLATE_VERSION_37, LEGACY_TEMPLATE_VERSION_36, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29, LEGACY_TEMPLATE_VERSION_28, LEGACY_TEMPLATE_VERSION_27, LEGACY_TEMPLATE_VERSION_26, LEGACY_TEMPLATE_VERSION_25, LEGACY_TEMPLATE_VERSION_24, LEGACY_TEMPLATE_VERSION_23, LEGACY_TEMPLATE_VERSION_22, LEGACY_TEMPLATE_VERSION_21, LEGACY_TEMPLATE_VERSION_20, LEGACY_TEMPLATE_VERSION_19, LEGACY_TEMPLATE_VERSION_18, LEGACY_TEMPLATE_VERSION_17, LEGACY_TEMPLATE_VERSION_16, LEGACY_TEMPLATE_VERSION_15, LEGACY_TEMPLATE_VERSION_14, LEGACY_TEMPLATE_VERSION_13, LEGACY_TEMPLATE_VERSION_12, LEGACY_TEMPLATE_VERSION_11, LEGACY_TEMPLATE_VERSION_10, LEGACY_TEMPLATE_VERSION_9, LEGACY_TEMPLATE_VERSION_8, LEGACY_TEMPLATE_VERSION_7, LEGACY_TEMPLATE_VERSION_6, LEGACY_TEMPLATE_VERSION_5, LEGACY_TEMPLATE_VERSION_4, LEGACY_TEMPLATE_VERSION_3, LEGACY_TEMPLATE_VERSION_2, LEGACY_TEMPLATE_VERSION] as readonly string[]).includes(value.version as string)) invalid("Unsupported published template snapshot.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && containsTemplateContentButtonStyle(value)) invalid("Content Button element colours require template v0.42.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && value.version !== LEGACY_TEMPLATE_VERSION_37 && value.version !== LEGACY_TEMPLATE_VERSION_36 && containsAuthoredImageDuotone(value)) invalid("Image Duotone requires template v0.36.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && containsAuthoredFeaturedImageDuotone(value)) invalid("Featured Image Duotone requires template v0.38.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && value.version !== LEGACY_TEMPLATE_VERSION_37 && value.version !== LEGACY_TEMPLATE_VERSION_36 && value.version !== LEGACY_TEMPLATE_VERSION_35 && containsQuotePresentation(value)) invalid("Quote presentation requires template v0.35.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && value.version !== LEGACY_TEMPLATE_VERSION_37 && value.version !== LEGACY_TEMPLATE_VERSION_36 && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && containsExtendedImageAspectRatio(value)) invalid("These aspect ratios require template v0.34.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && value.version !== LEGACY_TEMPLATE_VERSION_37 && value.version !== LEGACY_TEMPLATE_VERSION_36 && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && value.version !== LEGACY_TEMPLATE_VERSION_33 && containsTableCellAlignment(value)) invalid("Cell alignment requires template v0.33.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && value.version !== LEGACY_TEMPLATE_VERSION_37 && value.version !== LEGACY_TEMPLATE_VERSION_36 && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && value.version !== LEGACY_TEMPLATE_VERSION_33 && value.version !== LEGACY_TEMPLATE_VERSION_32 && containsResponsiveStyles(value)) invalid("Responsive styles require template v0.32.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_50 && value.version !== LEGACY_TEMPLATE_VERSION_43 && value.version !== LEGACY_TEMPLATE_VERSION_42 && value.version !== LEGACY_TEMPLATE_VERSION_40 && value.version !== LEGACY_TEMPLATE_VERSION_39 && value.version !== LEGACY_TEMPLATE_VERSION_38 && value.version !== LEGACY_TEMPLATE_VERSION_37 && value.version !== LEGACY_TEMPLATE_VERSION_36 && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && value.version !== LEGACY_TEMPLATE_VERSION_33 && value.version !== LEGACY_TEMPLATE_VERSION_32 && value.version !== LEGACY_TEMPLATE_VERSION_31 && containsPageLinkAdvancedFields(value)) invalid("Page link anchors and Additional CSS require template v0.31.0. Original data has been retained.");
  if (![TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_74, LEGACY_TEMPLATE_VERSION_73, LEGACY_TEMPLATE_VERSION_72, LEGACY_TEMPLATE_VERSION_71, LEGACY_TEMPLATE_VERSION_70, LEGACY_TEMPLATE_VERSION_69, LEGACY_TEMPLATE_VERSION_68, LEGACY_TEMPLATE_VERSION_67, LEGACY_TEMPLATE_VERSION_66, LEGACY_TEMPLATE_VERSION_64, LEGACY_TEMPLATE_VERSION_65, LEGACY_TEMPLATE_VERSION_63, LEGACY_TEMPLATE_VERSION_62, LEGACY_TEMPLATE_VERSION_61, LEGACY_TEMPLATE_VERSION_60, LEGACY_TEMPLATE_VERSION_59, LEGACY_TEMPLATE_VERSION_58, LEGACY_TEMPLATE_VERSION_57, LEGACY_TEMPLATE_VERSION_56, LEGACY_TEMPLATE_VERSION_55, LEGACY_TEMPLATE_VERSION_54, LEGACY_TEMPLATE_VERSION_53, LEGACY_TEMPLATE_VERSION_50, LEGACY_TEMPLATE_VERSION_46, LEGACY_TEMPLATE_VERSION_45, LEGACY_TEMPLATE_VERSION_44, LEGACY_TEMPLATE_VERSION_40, LEGACY_TEMPLATE_VERSION_39, LEGACY_TEMPLATE_VERSION_38, LEGACY_TEMPLATE_VERSION_37, LEGACY_TEMPLATE_VERSION_36, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29].includes(value.version as typeof TEMPLATE_VERSION) && containsNavigationOverlaySettings(value)) invalid("Navigation overlay settings require template v0.29.0. Original data has been retained.");
  if (![TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_74, LEGACY_TEMPLATE_VERSION_73, LEGACY_TEMPLATE_VERSION_72, LEGACY_TEMPLATE_VERSION_71, LEGACY_TEMPLATE_VERSION_70, LEGACY_TEMPLATE_VERSION_69, LEGACY_TEMPLATE_VERSION_68, LEGACY_TEMPLATE_VERSION_67, LEGACY_TEMPLATE_VERSION_66, LEGACY_TEMPLATE_VERSION_64, LEGACY_TEMPLATE_VERSION_65, LEGACY_TEMPLATE_VERSION_63, LEGACY_TEMPLATE_VERSION_62, LEGACY_TEMPLATE_VERSION_61, LEGACY_TEMPLATE_VERSION_60, LEGACY_TEMPLATE_VERSION_59, LEGACY_TEMPLATE_VERSION_58, LEGACY_TEMPLATE_VERSION_57, LEGACY_TEMPLATE_VERSION_56, LEGACY_TEMPLATE_VERSION_55, LEGACY_TEMPLATE_VERSION_54, LEGACY_TEMPLATE_VERSION_53, LEGACY_TEMPLATE_VERSION_50, LEGACY_TEMPLATE_VERSION_46, LEGACY_TEMPLATE_VERSION_45, LEGACY_TEMPLATE_VERSION_44, LEGACY_TEMPLATE_VERSION_40, LEGACY_TEMPLATE_VERSION_39, LEGACY_TEMPLATE_VERSION_38, LEGACY_TEMPLATE_VERSION_37, LEGACY_TEMPLATE_VERSION_36, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29, LEGACY_TEMPLATE_VERSION_28].includes(value.version as typeof TEMPLATE_VERSION) && containsPageLinkPresentation(value)) invalid("Page link presentation requires template v0.28.0. Original data has been retained.");
  if ((![TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_74, LEGACY_TEMPLATE_VERSION_73, LEGACY_TEMPLATE_VERSION_72, LEGACY_TEMPLATE_VERSION_71, LEGACY_TEMPLATE_VERSION_70, LEGACY_TEMPLATE_VERSION_69, LEGACY_TEMPLATE_VERSION_68, LEGACY_TEMPLATE_VERSION_67, LEGACY_TEMPLATE_VERSION_66, LEGACY_TEMPLATE_VERSION_64, LEGACY_TEMPLATE_VERSION_65, LEGACY_TEMPLATE_VERSION_63, LEGACY_TEMPLATE_VERSION_62, LEGACY_TEMPLATE_VERSION_61, LEGACY_TEMPLATE_VERSION_60, LEGACY_TEMPLATE_VERSION_59, LEGACY_TEMPLATE_VERSION_58, LEGACY_TEMPLATE_VERSION_57, LEGACY_TEMPLATE_VERSION_56, LEGACY_TEMPLATE_VERSION_55, LEGACY_TEMPLATE_VERSION_54, LEGACY_TEMPLATE_VERSION_53, LEGACY_TEMPLATE_VERSION_50, LEGACY_TEMPLATE_VERSION_46, LEGACY_TEMPLATE_VERSION_45, LEGACY_TEMPLATE_VERSION_44, LEGACY_TEMPLATE_VERSION_40, LEGACY_TEMPLATE_VERSION_39, LEGACY_TEMPLATE_VERSION_38, LEGACY_TEMPLATE_VERSION_37, LEGACY_TEMPLATE_VERSION_36, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29, LEGACY_TEMPLATE_VERSION_28, LEGACY_TEMPLATE_VERSION_27, LEGACY_TEMPLATE_VERSION_26, LEGACY_TEMPLATE_VERSION_25, LEGACY_TEMPLATE_VERSION_24].includes(value.version as typeof TEMPLATE_VERSION) && containsRichTextInlineObjects(value) || ![TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_73, LEGACY_TEMPLATE_VERSION_72, LEGACY_TEMPLATE_VERSION_71, LEGACY_TEMPLATE_VERSION_70, LEGACY_TEMPLATE_VERSION_69, LEGACY_TEMPLATE_VERSION_68, LEGACY_TEMPLATE_VERSION_67, LEGACY_TEMPLATE_VERSION_66, LEGACY_TEMPLATE_VERSION_64, LEGACY_TEMPLATE_VERSION_65, LEGACY_TEMPLATE_VERSION_63, LEGACY_TEMPLATE_VERSION_62, LEGACY_TEMPLATE_VERSION_61, LEGACY_TEMPLATE_VERSION_60, LEGACY_TEMPLATE_VERSION_59, LEGACY_TEMPLATE_VERSION_58, LEGACY_TEMPLATE_VERSION_57, LEGACY_TEMPLATE_VERSION_56, LEGACY_TEMPLATE_VERSION_55, LEGACY_TEMPLATE_VERSION_54, LEGACY_TEMPLATE_VERSION_53, LEGACY_TEMPLATE_VERSION_50, LEGACY_TEMPLATE_VERSION_46, LEGACY_TEMPLATE_VERSION_45, LEGACY_TEMPLATE_VERSION_44, LEGACY_TEMPLATE_VERSION_40, LEGACY_TEMPLATE_VERSION_39, LEGACY_TEMPLATE_VERSION_38, LEGACY_TEMPLATE_VERSION_37, LEGACY_TEMPLATE_VERSION_36, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29, LEGACY_TEMPLATE_VERSION_28, LEGACY_TEMPLATE_VERSION_27, LEGACY_TEMPLATE_VERSION_26, LEGACY_TEMPLATE_VERSION_25].includes(value.version as typeof TEMPLATE_VERSION) && (containsRichTextInlineObjects(value, "math") || containsRichTextInlineObjects(value, "image") || containsExtendedLanguage(value)))) invalid("Inline objects require the current template snapshot.");
  const snapshot = value as unknown as TemplateSnapshot;
  const set = validateTemplateSet(snapshot.set);
  if (!set.templates.some(t => t.id === snapshot.templateId && ["page", "post"].includes(t.kind))) invalid("Invalid published template.");
  return { ...snapshot, version: TEMPLATE_VERSION, set };
}

/** Publication boundary validation; content-only validators remain independent. */
export function validateTemplatePublicationSnapshot(value: unknown) {
  value = migrateLegacyBlockTypeNames(value);
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && containsNativeCoverVideoSource(value)) invalid("Native Cover video sources require template v0.67.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && containsCoreSocialLink(value)) invalid("Social Link services require template v0.61.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && containsAuthorBlockPresentation(value)) invalid("Author profile presentation requires template v0.59.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && containsAuthoredAuthorDuotone(value)) invalid("Author Duotone requires template v0.60.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && containsVideoBlock(value)) invalid("Video blocks require template v0.66.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_65 && containsCoverVideoBackground(value)) invalid("Cover video backgrounds require template v0.65.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && containsAuthoredCoverCrop(value)) invalid("Cover crop edits require template v0.64.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && containsAuthoredImageCrop(value)) invalid("Image crop edits require template v0.58.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && containsCoverInnerContentWidth(value)) invalid("Cover inner-content width requires template v0.63.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && containsCoverContentPosition(value)) invalid("Cover content position requires template v0.62.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_57 && containsCoverBlock(value)) invalid("Cover blocks require template v0.57.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_57 && value.version !== LEGACY_TEMPLATE_VERSION_56 && containsCodeMonospaceFont(value)) invalid("Code monospace font requires template v0.56.0. Original data has been retained.");
  if (isRecord(value) && value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_74 && value.version !== LEGACY_TEMPLATE_VERSION_73 && value.version !== LEGACY_TEMPLATE_VERSION_72 && value.version !== LEGACY_TEMPLATE_VERSION_71 && value.version !== LEGACY_TEMPLATE_VERSION_70 && value.version !== LEGACY_TEMPLATE_VERSION_69 && value.version !== LEGACY_TEMPLATE_VERSION_68 && value.version !== LEGACY_TEMPLATE_VERSION_67 && value.version !== LEGACY_TEMPLATE_VERSION_66 && value.version !== LEGACY_TEMPLATE_VERSION_64 && value.version !== LEGACY_TEMPLATE_VERSION_65 && value.version !== LEGACY_TEMPLATE_VERSION_63 && value.version !== LEGACY_TEMPLATE_VERSION_62 && value.version !== LEGACY_TEMPLATE_VERSION_61 && value.version !== LEGACY_TEMPLATE_VERSION_60 && value.version !== LEGACY_TEMPLATE_VERSION_59 && value.version !== LEGACY_TEMPLATE_VERSION_58 && value.version !== LEGACY_TEMPLATE_VERSION_55 && value.version !== LEGACY_TEMPLATE_VERSION_56 && containsCodeRuns(value)) invalid("Code inline formatting requires template v0.55.0. Original data has been retained.");
  if (isRecord(value) && (value.version === LEGACY_TEMPLATE_VERSION_55 || value.version === LEGACY_TEMPLATE_VERSION_56)) value = { ...value, version: TEMPLATE_VERSION };
  const canonical = validatePublicationSnapshot(value);
  const posts = canonical.posts.map(post => {
    if (post.templateSnapshot !== undefined) {
      const snapshot = validateTemplateSnapshot(post.templateSnapshot);
      if (snapshot.set.templates.find(template => template.id === snapshot.templateId)?.kind !== (post.kind ?? "post")) invalid("The published template does not match its document kind.");
      // Require the index that this saved format actually wrote, then repair
      // newly discovered references in the returned projection only.
      if (historicalTemplateMediaIds(snapshot.set, post.templateSnapshot.version).some(id => !post.mediaIds.includes(id))) invalid("Published template media references are incomplete.");
      const mediaIds = Array.from(new Set([...post.mediaIds, ...contentMediaIds(post.blocks), ...templateMediaIds(snapshot.set)]));
      return { ...post, mediaIds, templateSnapshot: snapshot };
    }
    const mediaIds = Array.from(new Set([...post.mediaIds, ...contentMediaIds(post.blocks)]));
    return mediaIds.length === post.mediaIds.length && mediaIds.every((id, index) => id === post.mediaIds[index]) ? post : { ...post, mediaIds };
  });
  return { ...canonical, posts };
}

/** Apply template-owned validation after the portable workspace envelope passes. */
export function validateWorkspacePublicationTemplates(workspace: StudioWorkspace): StudioWorkspace {
  let changed = false;
  const bin = workspace.bin.map(item => {
    if (!item.publication) return item;
    const publication = validateTemplatePublicationSnapshot({ version: PUBLICATION_VERSION, posts: [item.publication] }).posts[0];
    changed = true;
    return { ...item, publication };
  });
  return changed ? { ...workspace, bin } : workspace;
}

export function duplicateTemplateSet(source: TemplateSet, name = `${source.name} Copy`): TemplateSet {
  validateTemplateSet(source);
  const copy = copyTemplateData(source);
  copy.id = templateId(); copy.name = name;
  const parts = new Map(copy.parts.map(part => [part.id, templateId()]));
  for (const item of [...copy.templates, ...copy.parts]) {
    item.id = parts.get(item.id) ?? templateId();
    renewTemplateNodeIds(item.nodes);
    visitTemplateNodes(item.nodes, node => { if (node.type === "part") node.partId = parts.get(node.partId)!; if (node.type === "element" && node.element === "navigation" && node.overlayPartId) node.overlayPartId = parts.get(node.overlayPartId)!; });
  }
  const renewLinks = (links: NavigationItem[]) => links.forEach(link => { link.id = templateId(); if (!isNavigationSpacer(link) && link.children) renewLinks(link.children); });
  renewLinks(copy.navigation); renewLinks(copy.socialLinks);
  return validateTemplateSet(copy);
}

export function resolveTemplate(store: TemplateStore, document: Pick<StudioDocument, "id" | "kind">): TemplateSnapshot | undefined {
  const assignment = store.assignments.find(a => a.documentId === document.id);
  if (!assignment) return undefined;
  const set = store.sets.find(s => s.id === assignment.setId);
  if (!set || !set.templates.some(t => t.id === assignment.templateId && ["page", "post"].includes(t.kind))) return invalid("This document's template is unavailable.");
  return copyTemplateData({ version: TEMPLATE_VERSION, set, templateId: assignment.templateId });
}

export function templateMediaIds(set: TemplateSet): string[] {
  return collectTemplateMediaIds(set);
}

/** v0.14.0 and earlier indexed block assets, but no rich-field images. */
function historicalTemplateMediaIds(set: TemplateSet, version: string): string[] {
  const minor = Number(version.split(".")[1]);
  return collectTemplateMediaIds(set, minor <= 14 ? "block-assets" : "rich-fields");
}

function collectTemplateMediaIds(set: TemplateSet, historical?: "block-assets" | "rich-fields"): string[] {
  const ids = new Set<string>();
  if (set.identity.logo?.mediaId) ids.add(set.identity.logo.mediaId);
  for (const item of [...set.templates, ...set.parts]) visitTemplateNodes(item.nodes, node => {
    if (historical !== "block-assets" && node.type !== "element" && node.type !== "part" && node.type !== "group" && node.type !== "section" && node.type !== "columns" && node.type !== "column" && node.type !== "query-loop" && node.type !== "post-template" && node.type !== "no-results") for (const id of (historical ? historicalContentMediaIds : contentMediaIds)([node])) ids.add(id);
    if (node.type === "image" && node.mediaId) ids.add(node.mediaId);
    const style = historical === "block-assets" ? (node.type === "group" || (node.type === "quote" || node.type === "pullquote") ? node.visualStyle : undefined)
      : !historical && (node.type === "columns" || node.type === "column") ? node.style
      : "visualStyle" in node ? node.visualStyle : undefined;
    if (style?.backgroundImageMediaId) ids.add(style.backgroundImageMediaId);
    if (node.type === "element" && node.element === "cover-image" && node.fixedImage?.mediaId) ids.add(node.fixedImage.mediaId);
  });
  return Array.from(ids);
}

type TitlePresentation = Omit<Extract<ContentBlock, { type: "title" }>, "id" | "type">;
type CoverPresentation = Omit<Extract<ContentBlock, { type: "cover-image" }>, "id" | "type">;

function titlePresentation(node: TitlePresentation): TitlePresentation {
  const { align, blockAlign, level, isLink, linkTarget, rel, visualStyle, siteRole } = node;
  return copyTemplateData({ align, blockAlign, level, isLink, linkTarget, rel, visualStyle, siteRole });
}
function coverPresentation(node: CoverPresentation): CoverPresentation {
  const { align, blockAlign, isLink, linkTarget, rel, duotone, aspectRatio, scale,
    displayWidth, displayHeight, focalX, focalY, visualStyle, siteRole } = node;
  return copyTemplateData({ align, blockAlign, isLink, linkTarget, rel, duotone, aspectRatio, scale,
    displayWidth, displayHeight, focalX, focalY, visualStyle, siteRole });
}

/** Projection for shared block commands only; never stored as a content document. */
function templateNavigationEditorBlock(node: NavigationTemplateNode & { editorial?: ContentBlock["editorial"] }, reservedIds: Set<string>): ContentBlock {
  const pageListBlock = navigationPageListBlock(node, reservedIds);
  return {
    editorial: node.editorial,
    id: node.id,
    type: "group",
    layout: node.layout ?? "row",
    children: pageListBlock ? [copyTemplateData(pageListBlock)] : [],
    horizontalAlign: node.horizontalAlign ?? node.align ?? "left",
    allowWrap: node.allowWrap ?? true,
    gap: node.gap,
    visualStyle: node.visualStyle,
    searchVisualStyle: node.searchVisualStyle ? copyTemplateData(node.searchVisualStyle) : undefined,
    data: {
      templateElement: "navigation",
      align: node.align ?? "left",
      overlayMenu: node.overlayMenu ?? "never",
      submenuOpenOnClick: node.submenuOpenOnClick ?? false,
      showSubmenuIcon: node.showSubmenuIcon ?? true,
      ...(node.showIcon !== undefined ? { showIcon: node.showIcon } : {}),
      ...(node.icon ? { icon: node.icon } : {}),
      ...(node.overlayPartId ? { overlayPartId: node.overlayPartId } : {}),
      ariaLabel: node.ariaLabel ?? "Site navigation",
      ...(node.submenuTextColor ? { submenuTextColor: node.submenuTextColor } : {}),
      ...(node.submenuBackgroundColor ? { submenuBackgroundColor: node.submenuBackgroundColor } : {}),
      ...(node.searchEnabled ? { searchEnabled: true } : {}),
      ...(node.searchPosition !== undefined ? { searchPosition: node.searchPosition } : {}),
      ...(node.searchButtonUseIcon ? { searchButtonUseIcon: true } : {}),
      ...(node.searchLabelVisible !== undefined ? { searchLabelVisible: node.searchLabelVisible } : {}),
      ...(node.searchButtonPosition ? { searchButtonPosition: node.searchButtonPosition } : {}),
      ...(node.searchPlaceholder !== undefined ? { searchPlaceholder: node.searchPlaceholder } : {}),
      ...(node.searchWidth !== undefined ? { searchWidth: node.searchWidth } : {}),
      ...(node.searchDisplayWidth !== undefined ? { searchDisplayWidth: node.searchDisplayWidth, searchDisplayWidthUnit: node.searchDisplayWidthUnit } : {}),
    },
  };
}

function templateEditorBlocksWithIds(nodes: TemplateNode[], reservedIds: Set<string>): ContentBlock[] {
  return nodes.map((node): ContentBlock => node.type === "element" && node.element === "document-title"
    ? { ...titlePresentation(node), editorial: node.editorial, id: node.id, type: "title" }
    : node.type === "element" && node.element === "subtitle"
      ? { editorial: node.editorial, id: node.id, type: "subtitle", align: node.align, visualStyle: mergeParagraphStyles(node.style, node.visualStyle) }
      : node.type === "element" && node.element === "cover-image"
        ? { ...coverPresentation(node), editorial: node.editorial, id: node.id, type: "cover-image" }
        : node.type === "element" && node.element === "content"
          ? { ...pickLayoutOptions(node), ...(node.tagName ? { tagName: node.tagName } : {}), inheritLayout: node.inheritLayout ?? true, editorial: node.editorial, id: node.id, type: "group", layout: "flow", children: [], visualStyle: node.visualStyle ? copyTemplateData(node.visualStyle) : undefined, data: { templateElement: "content", align: node.align ?? "left" } }
        : node.type === "element" && node.element === "site-title"
          ? { editorial: node.editorial, id: node.id, type: "group", layout: "stack", children: [], visualStyle: node.visualStyle ? copyTemplateData(node.visualStyle) : undefined, data: { templateElement: "site-title", align: node.align ?? "left", tagName: node.tagName ?? "h1", linkToHome: node.linkToHome ?? true, opensInNewTab: node.opensInNewTab ?? false } }
        : node.type === "element" && node.element === "navigation"
          ? templateNavigationEditorBlock(node, reservedIds)
        : node.type === "element" || node.type === "part"
          ? { editorial: node.editorial, id: node.id, type: "group", layout: "stack", children: [], ...("visualStyle" in node && node.visualStyle ? { visualStyle: copyTemplateData(node.visualStyle) } : {}), data: node.type === "part" ? { templatePart: node.partId } : { templateElement: node.element, align: node.align ?? "left" } }
    : node.type === "group" ? { editorial: node.editorial, id: node.id, type: node.type, layout: node.layout, ...groupSemanticPresentation(node), ...(node.position ? { position: node.position } : {}), ...(node.visualStyle ? { visualStyle: copyTemplateData(node.visualStyle) } : {}), ...(node.allowedBlocks ? { allowedBlocks: [...node.allowedBlocks] } : {}), ...pickLayoutOptions(node), children: templateEditorBlocksWithIds(node.children, reservedIds) }
      : node.type === "section" ? { editorial: node.editorial, id: node.id, type: node.type, layout: node.layout, ...(node.visualStyle ? { visualStyle: copyTemplateData(node.visualStyle) } : {}), ...(node.role ? { role: node.role } : {}), ...pickLayoutOptions(node), children: templateEditorBlocksWithIds(node.children, reservedIds) }
    : node.type === "columns" ? { ...node, children: node.children.map(column => ({ ...column, children: templateEditorBlocksWithIds(column.children, reservedIds) })) as ColumnBlock[] }
      : node.type === "query-loop" ? { ...node, children: templateEditorBlocksWithIds(node.children, reservedIds) }
        : node.type === "post-template" ? { ...node, children: templateEditorBlocksWithIds(node.children, reservedIds) }
          : node.type === "no-results" ? { ...node, children: templateEditorBlocksWithIds(node.children, reservedIds) }
        : node.type === "column" ? { ...node, children: templateEditorBlocksWithIds(node.children, reservedIds) } : node);
}

export function templateEditorBlocks(nodes: TemplateNode[], owningSet?: TemplateSet): ContentBlock[] {
  const reservedIds = new Set<string>();
  for (const entry of [...(owningSet?.templates ?? []), ...(owningSet?.parts ?? [])]) visitTemplateNodes(entry.nodes, node => {
    reservedIds.add(node.id);
    if (node.type === "element" && node.element === "navigation" && node.pageListBlock) reservedIds.add(node.pageListBlock.id);
  });
  visitTemplateNodes(nodes, node => {
    reservedIds.add(node.id);
    if (node.type === "element" && node.element === "navigation" && node.pageListBlock) reservedIds.add(node.pageListBlock.id);
  });
  return templateEditorBlocksWithIds(nodes, reservedIds);
}
export function templateNodesFromBlocks(blocks: ContentBlock[], sourceNodes: TemplateNode[] = [], parentType?: "post-template" | "no-results"): TemplateNode[] {
  const sourceById = new Map<string, TemplateNode>();
  visitTemplateNodes(sourceNodes, node => sourceById.set(node.id, node));
  return blocks.map((block): TemplateNode => {
    if (block.type === "title") return parentType === "post-template"
      ? { ...block, ...(block.level === undefined ? { level: 2 } : {}) }
      : { ...titlePresentation(block), editorial: block.editorial, id: block.id, type: "element", element: "document-title" };
    if (block.type === "subtitle") return { editorial: block.editorial, id: block.id, type: "element", element: "subtitle", align: block.align ?? "left", ...(block.visualStyle ? { visualStyle: copyTemplateData(block.visualStyle) } : {}) };
    if (block.type === "cover-image") {
      const source = sourceById.get(block.id);
      return { ...coverPresentation(block), editorial: block.editorial, id: block.id, type: "element", element: "cover-image", ...(source?.type === "element" && source.element === "cover-image" ? {
        ...(source.fixedImage ? { fixedImage: copyTemplateData(source.fixedImage) } : {}),
        ...(source.coverImageHidden ? { coverImageHidden: true } : {}),
      } : {}) };
    }
    if (block.type === "group" && typeof block.data?.templatePart === "string") return { editorial: block.editorial, id: block.id, type: "part", partId: block.data.templatePart };
    if (block.type === "group" && block.data?.templateElement === "content") return { editorial: block.editorial, id: block.id, type: "element", element: "content", align: block.data.align as "left" | "centre" | "right", ...pickLayoutOptions(block), ...(block.tagName ? { tagName: block.tagName as "div" | "main" | "section" | "article" } : {}), ...(block.visualStyle ? { visualStyle: copyTemplateData(block.visualStyle) } : {}) };
    if (block.type === "group" && block.data?.templateElement === "site-logo") return { id: block.id, type: "element", element: "site-logo", align: block.data.align as "left" | "centre" | "right", ...(block.visualStyle ? { visualStyle: copyTemplateData(block.visualStyle) } : {}) };
    if (block.type === "group" && block.data?.templateElement === "site-title") return { editorial: block.editorial, id: block.id, type: "element", element: "site-title", align: block.data.align as "left" | "centre" | "right", tagName: block.data.tagName as "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6", linkToHome: block.data.linkToHome as boolean, opensInNewTab: block.data.opensInNewTab as boolean, ...(block.visualStyle ? { visualStyle: copyTemplateData(block.visualStyle) } : {}) };
    if (block.type === "group" && block.data?.templateElement === "navigation") {
      const child = block.children.find((item): item is NavigationPageListBlock => item.type === "navigation-page-list");
      return {
        editorial: block.editorial,
        id: block.id,
        type: "element",
        element: "navigation",
        align: block.data.align as "left" | "centre" | "right",
        layout: block.layout === "stack" ? "stack" : "row",
        horizontalAlign: block.horizontalAlign,
        allowWrap: block.allowWrap,
        gap: block.gap,
        visualStyle: block.visualStyle,
        overlayMenu: block.data.overlayMenu as NavigationTemplateNode["overlayMenu"],
        showIcon: block.data.showIcon as boolean | undefined,
        icon: block.data.icon as NavigationTemplateNode["icon"],
        overlayPartId: block.data.overlayPartId as string | undefined,
        submenuOpenOnClick: block.data.submenuOpenOnClick as boolean,
        showSubmenuIcon: block.data.showSubmenuIcon as boolean,
        ariaLabel: block.data.ariaLabel as string,
        submenuTextColor: block.data.submenuTextColor as string | undefined,
        submenuBackgroundColor: block.data.submenuBackgroundColor as string | undefined,
        pageListBlock: child ? copyTemplateData(child) : undefined,
        searchEnabled: block.data.searchEnabled === true || undefined,
        searchPosition: typeof block.data.searchPosition === "number" ? block.data.searchPosition : undefined,
        searchButtonUseIcon: block.data.searchButtonUseIcon === true || undefined,
        searchLabelVisible: typeof block.data.searchLabelVisible === "boolean" ? block.data.searchLabelVisible : undefined,
        searchButtonPosition: block.data.searchButtonPosition as NavigationTemplateNode["searchButtonPosition"],
        searchPlaceholder: typeof block.data.searchPlaceholder === "string" ? block.data.searchPlaceholder : undefined,
        searchWidth: typeof block.data.searchWidth === "number" ? block.data.searchWidth : undefined,
        searchDisplayWidth: typeof block.data.searchDisplayWidth === "number" ? block.data.searchDisplayWidth : undefined,
        searchDisplayWidthUnit: block.data.searchDisplayWidthUnit as NavigationSearchWidthUnit | undefined,
        searchVisualStyle: block.searchVisualStyle,
      };
    }
    if (block.type === "group" && typeof block.data?.templateElement === "string") return { editorial: block.editorial, id: block.id, type: "element", element: block.data.templateElement as "site-identity" | "site-tagline" | "site-credit" | "copyright" | "post-metadata" | "social-links", align: block.data.align as "left" | "centre" | "right", ...(block.visualStyle ? { visualStyle: copyTemplateData(block.visualStyle) } : {}) };
    if (block.type === "group") return { editorial: block.editorial, id: block.id, type: block.type, layout: block.layout, ...groupSemanticPresentation(block), ...(block.position ? { position: block.position } : {}), ...(block.visualStyle ? { visualStyle: copyTemplateData(block.visualStyle) } : {}), ...(block.allowedBlocks ? { allowedBlocks: [...block.allowedBlocks] } : {}), ...pickLayoutOptions(block), children: templateNodesFromBlocks(block.children, sourceNodes, parentType) };
    if (block.type === "section") return { editorial: block.editorial, id: block.id, type: block.type, layout: block.layout, ...(block.visualStyle ? { visualStyle: copyTemplateData(block.visualStyle) } : {}), ...(block.role ? { role: block.role } : {}), ...pickLayoutOptions(block), children: templateNodesFromBlocks(block.children, sourceNodes, parentType) };
    if (block.type === "columns") return { ...block, children: block.children.map(column => ({ ...column, children: templateNodesFromBlocks(column.children, sourceNodes, parentType) })) };
    if (block.type === "query-loop") return { ...block, children: templateNodesFromBlocks(block.children, sourceNodes) };
    if (block.type === "post-template") return { ...block, children: templateNodesFromBlocks(block.children, sourceNodes, "post-template") };
    if (block.type === "no-results") return { ...block, children: templateNodesFromBlocks(block.children, sourceNodes, "no-results") };
    if (block.type === "column") return { ...block, children: templateNodesFromBlocks(block.children, sourceNodes, parentType) };
    if (block.type === "component") return invalid("Product components are not template blocks.");
    return block;
  });
}

type LayoutOptionKey = "horizontalAlign" | "verticalAlign" | "gap" | "columnGap" | "rowGap" | "paddingX" | "paddingY" | "contentWidth" | "columns" | "minColumnWidth" | "stackAt" | "contentSize" | "wideSize" | "inheritLayout" | "allowWrap" | "gridMode" | "fillAvailableSpace" | "allowSizingOnChildren" | "minColumnWidthUnit";
function pickLayoutOptions<T extends LayoutOptions | GroupLayoutOptions>(block: T): Pick<T, Extract<keyof T, LayoutOptionKey>> {
  return Object.fromEntries(Object.entries(block).filter(([key, value]) => ["horizontalAlign", "verticalAlign", "gap", "columnGap", "rowGap", "paddingX", "paddingY", "contentWidth", "columns", "minColumnWidth", "stackAt", "contentSize", "wideSize", "inheritLayout", "allowWrap", "gridMode", "fillAvailableSpace", "allowSizingOnChildren", "minColumnWidthUnit"].includes(key) && value !== undefined)) as Pick<T, Extract<keyof T, LayoutOptionKey>>;
}

function groupSemanticPresentation(group: Pick<Extract<ContentBlock, { type: "group" }>, "tagName" | "ariaLabel" | "blockAlign" | "detailsSummary" | "openByDefault">) {
  return {
    ...(group.tagName !== undefined ? { tagName: group.tagName } : {}),
    ...(group.ariaLabel !== undefined ? { ariaLabel: group.ariaLabel } : {}),
    ...(group.blockAlign !== undefined ? { blockAlign: group.blockAlign } : {}),
    ...(group.detailsSummary !== undefined ? { detailsSummary: group.detailsSummary } : {}),
    ...(group.openByDefault !== undefined ? { openByDefault: group.openByDefault } : {}),
  };
}
