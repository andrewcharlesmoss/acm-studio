import { containsAuthoredImageDuotone } from "../content/image-duotone";
import { containsQuotePresentation } from "../content/quote-presentation";
import { containsExtendedImageAspectRatio } from "../content/image-aspect-ratios";
import { containsTableCellAlignment } from "../content/table-cell-metadata";
import { containsResponsiveStyles } from "../content/responsive-styles";
import { containsRichTextInlineObjects, containsExtendedLanguage } from "../content/rich-text-contract";
import { validDocumentDisplay } from "../content/document-metadata";
import { migrateLegacyFootnoteBlocks } from "../content/footnote-blocks";
import { validBlockEditorial, type BlockEditorial } from "../content/block-editorial";
import { GROUP_ALLOWED_BLOCK_TYPES, type ColumnBlock, type ContentBlock, type DocumentDisplayField, type DocumentDisplayMode, type GroupAllowedBlockType, type GroupLayoutOptions, type LayoutMode, type LayoutOptions, type ParagraphStyle, type SiteSectionRole } from "../content/model";
import { contentMediaIds, historicalContentMediaIds } from "../content/media-references";
import { validLayoutOptions } from "../content/layout";
import type { StudioDocument, StudioDocumentKind, StudioWorkspace } from "./editor-model";
import { FEATURED_IMAGE_LABEL } from "./editor-model";
import { safeImageSource, safeTextLink } from "../content/rich-text";
import { isRecord, PUBLICATION_VERSION, validContentBlocks, validParagraphStyle, validatePublicationSnapshot } from "./workspace-validation";
import { validateUniversalStylePreset } from "@acm/styles";
import { createUniversalStylePreset, UNIVERSAL_STYLE_PRESET } from "./ui/styles/canonical-style-guide";
import type { UniversalStylePreset } from "@acm/styles";

export const LEGACY_TEMPLATE_VERSION = "0.1.0" as const;
export const TEMPLATE_VERSION = "0.36.0" as const;
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
export const templateElements = ["site-identity", "navigation", "document-title", "subtitle", "cover-image", "post-metadata", "content", "copyright", "social-links"] as const;
export type TemplateElement = typeof templateElements[number];
export type TemplateImage = { src: string; mediaId?: string; alt: string };
type TemplateElementNode =
  | { id: string; type: "element"; element: Exclude<TemplateElement, "cover-image" | "document-title" | "subtitle" | "content" | "navigation">; align?: "left" | "centre" | "right" }
  | NavigationTemplateNode
  | ({ id: string; type: "element"; element: "content"; align?: "left" | "centre" | "right"; visualStyle?: ParagraphStyle } & GroupLayoutOptions)
  | (Omit<Extract<ContentBlock, { type: "document-title" }>, "type"> & { type: "element"; element: "document-title" })
  | { id: string; type: "element"; element: "subtitle"; align?: "left" | "centre" | "right"; style?: ParagraphStyle; visualStyle?: ParagraphStyle }
  | (Omit<Extract<ContentBlock, { type: "cover-image" }>, "type"> & { type: "element"; element: "cover-image"; fixedImage?: TemplateImage; coverImageHidden?: boolean });
export type TemplateNode = (Exclude<ContentBlock, { type: "group" | "section" | "columns" | "column" | "component" }>
  | ({ id: string; type: "group"; layout: LayoutMode; children: TemplateNode[]; position?: "sticky"; visualStyle?: ParagraphStyle; allowedBlocks?: GroupAllowedBlockType[] } & GroupLayoutOptions & Pick<Extract<ContentBlock, { type: "group" }>, "tagName" | "ariaLabel" | "blockAlign">)
  | ({ id: string; type: "section"; layout: LayoutMode; role?: SiteSectionRole; children: TemplateNode[]; visualStyle?: ParagraphStyle } & LayoutOptions)
  | ({ id: string; type: "columns"; children: TemplateColumn[]; style?: ParagraphStyle } & Omit<LayoutOptions, "columns" | "horizontalAlign" | "minColumnWidth"> & Pick<Extract<ContentBlock, { type: "columns" }>, "blockAlign">)
  | TemplateColumn
  | TemplateElementNode
  | { id: string; type: "part"; partId: string }) & { editorial?: BlockEditorial };
type TemplateColumn = Omit<ColumnBlock, "children"> & { children: TemplateNode[] };
export type PageTemplate = { id: string; name: string; kind: StudioDocumentKind; nodes: TemplateNode[]; defaults?: TemplateDefaults; displayDefaults?: Partial<Record<DocumentDisplayField, DocumentDisplayMode>>; isDefault?: boolean };
export type TemplatePart = { id: string; name: string; kind: "header" | "footer" | "overlay"; nodes: TemplateNode[] };
export type SiteStyles = UniversalStylePreset;
export function resetTemplatePaletteColour(styles: SiteStyles, key: keyof SiteStyles["palette"]): SiteStyles {
  return { ...styles, palette: { ...styles.palette, [key]: UNIVERSAL_STYLE_PRESET.palette[key] } };
}
export type LegacySiteStyles = { background: string; text: string; accent: string; border: string; font: "inter" | "serif"; fontSize: number; spacing: number; contentWidth: number; radius: number; borderWidth: number };
export type SiteLink = { id: string; label: string; url: string; opensInNewTab?: boolean; rel?: string; description?: string; visualStyle?: ParagraphStyle; children?: SiteLink[] };
export type NavigationTemplateNode = { id: string; type: "element"; element: "navigation"; align?: "left" | "centre" | "right"; layout?: "row" | "stack"; horizontalAlign?: "left" | "centre" | "right" | "space-between" | "stretch"; allowWrap?: boolean; gap?: number; visualStyle?: ParagraphStyle; overlayMenu?: "never" | "mobile" | "always"; showIcon?: boolean; icon?: "handle" | "menu"; overlayPartId?: string; submenuOpenOnClick?: boolean; showSubmenuIcon?: boolean; ariaLabel?: string; submenuTextColor?: string; submenuBackgroundColor?: string };
export type TemplateDefaults = { author?: string; category?: string; tags?: string[]; parentPageId?: string };
export type TemplateSet = {
  id: string; name: string; templates: PageTemplate[]; parts: TemplatePart[]; styles: SiteStyles;
  identity: { name: string; homeUrl: string; logo?: { mediaId?: string; src: string; alt: string }; copyright: string };
  navigation: SiteLink[]; socialLinks: SiteLink[]; defaults?: TemplateDefaults;
};
export type TemplateAssignment = { documentId: string; setId: string; templateId: string; kind: StudioDocumentKind };
export type StudioBinnedTemplate = { id: string; deletedAt: string; kind: "template"; setId: string; setName: string; entry: PageTemplate | TemplatePart; setSnapshot: TemplateSet } | { id: string; deletedAt: string; kind: "set"; set: TemplateSet };
export type TemplateSchemaVersion = typeof TEMPLATE_VERSION | typeof LEGACY_TEMPLATE_VERSION_33 | typeof LEGACY_TEMPLATE_VERSION_32 | typeof LEGACY_TEMPLATE_VERSION_31 | typeof LEGACY_TEMPLATE_VERSION_30 | typeof LEGACY_TEMPLATE_VERSION_29 | typeof LEGACY_TEMPLATE_VERSION_28 | typeof LEGACY_TEMPLATE_VERSION_27 | typeof LEGACY_TEMPLATE_VERSION_26 | typeof LEGACY_TEMPLATE_VERSION_25 | typeof LEGACY_TEMPLATE_VERSION_24 | typeof LEGACY_TEMPLATE_VERSION_23 | typeof LEGACY_TEMPLATE_VERSION_22 | typeof LEGACY_TEMPLATE_VERSION_21 | typeof LEGACY_TEMPLATE_VERSION_20 | typeof LEGACY_TEMPLATE_VERSION_19 | typeof LEGACY_TEMPLATE_VERSION_18 | typeof LEGACY_TEMPLATE_VERSION_17 | typeof LEGACY_TEMPLATE_VERSION_16 | typeof LEGACY_TEMPLATE_VERSION_15 | typeof LEGACY_TEMPLATE_VERSION_14 | typeof LEGACY_TEMPLATE_VERSION_13 | typeof LEGACY_TEMPLATE_VERSION_12 | typeof LEGACY_TEMPLATE_VERSION_11 | typeof LEGACY_TEMPLATE_VERSION_10 | typeof LEGACY_TEMPLATE_VERSION_9 | typeof LEGACY_TEMPLATE_VERSION_8 | typeof LEGACY_TEMPLATE_VERSION_7 | typeof LEGACY_TEMPLATE_VERSION_6 | typeof LEGACY_TEMPLATE_VERSION_5 | typeof LEGACY_TEMPLATE_VERSION_4 | typeof LEGACY_TEMPLATE_VERSION_3 | typeof LEGACY_TEMPLATE_VERSION_2 | typeof LEGACY_TEMPLATE_VERSION;
export type TemplateLibraryOrderEntry = { id: string; setId: string; entryId: string };
export type TemplateStore = { libraryOrder?: TemplateLibraryOrderEntry[]; version: TemplateSchemaVersion; sets: TemplateSet[]; assignments: TemplateAssignment[]; bin: StudioBinnedTemplate[]; defaultTemplateIds?: { page?: string; post?: string } };
export type TemplateSnapshot = { version: TemplateSchemaVersion; set: TemplateSet; templateId: string };
export const emptyTemplateStore = (): TemplateStore => ({ version: TEMPLATE_VERSION, sets: [], assignments: [], bin: [], defaultTemplateIds: {}, libraryOrder: [] });
export const templateId = () => `t-${crypto.randomUUID()}`;
export const templateElementLabel = (value: string) => value === "cover-image" ? FEATURED_IMAGE_LABEL : value === "reading-time" ? "Time to Read" : value.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
export const copyTemplateData = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function visitTemplateNodes(nodes: TemplateNode[], visit: (node: TemplateNode) => void) {
  for (const node of nodes) { visit(node); if (node.type === "group" || node.type === "section" || node.type === "columns" || node.type === "column" || node.type === "social-icons" || node.type === "quote" || node.type === "buttons") visitTemplateNodes((node.children ?? []) as TemplateNode[], visit); }
}

export function createDocumentTemplateNodes(kind: StudioDocumentKind): TemplateNode[] {
  const element = (element: TemplateElement): TemplateNode => ({ id: templateId(), type: "element", element });
  const title: TemplateNode = { id: templateId(), type: "element", element: "document-title", level: 1 };
  const postMetadata: TemplateNode[] = kind === "post" ? [{ id: templateId(), type: "group", layout: "row", gap: 16, stackAt: "mobile", children: [
    { id: templateId(), type: "post-author", prefix: "By", avatar: true },
    { id: templateId(), type: "post-date", format: "long", showIcon: true },
    { id: templateId(), type: "reading-time", prefix: "Reading Time:", presentation: "plain" },
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
        if (!isRecord(link) || ++linkCount > 100 || !text(link.label, 160) || !text(link.url) || !safeTextLink(link.url)
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
      if (node.type === "element") {
        if (!templateElements.includes(node.element as TemplateElement) || (node.align !== undefined && !["left", "centre", "right"].includes(node.align as string))) invalid("Unknown template element.");
        if (node.element === "navigation" && (!validLayoutOptions(node, true) || !validParagraphStyle(node.visualStyle)
          || (node.layout !== undefined && !["row", "stack"].includes(node.layout as string))
          || (node.overlayMenu !== undefined && !["never", "mobile", "always"].includes(node.overlayMenu as string))
          || (node.showIcon !== undefined && typeof node.showIcon !== "boolean")
          || (node.icon !== undefined && !["handle", "menu"].includes(node.icon as string))
          || (node.overlayPartId !== undefined && !safeId(node.overlayPartId))
          || (node.submenuOpenOnClick !== undefined && typeof node.submenuOpenOnClick !== "boolean")
          || (node.showSubmenuIcon !== undefined && typeof node.showSubmenuIcon !== "boolean")
          || (node.ariaLabel !== undefined && !text(node.ariaLabel, 160))
          || !validParagraphStyle({ textColor: node.submenuTextColor, backgroundColor: node.submenuBackgroundColor })
          || Object.keys(node).some(key => !["editorial", "id", "type", "element", "align", "layout", "horizontalAlign", "allowWrap", "gap", "visualStyle", "overlayMenu", "showIcon", "icon", "overlayPartId", "submenuOpenOnClick", "showSubmenuIcon", "ariaLabel", "submenuTextColor", "submenuBackgroundColor"].includes(key)))) invalid("The Navigation settings are invalid.");
        if (node.element === "content" && (!validLayoutOptions(node, true) || !validParagraphStyle(node.visualStyle) || Object.keys(node).some(key => !["editorial", "id", "type", "element", "align", "visualStyle", "horizontalAlign", "verticalAlign", "gap", "columnGap", "rowGap", "paddingX", "paddingY", "contentWidth", "columns", "minColumnWidth", "stackAt", "contentSize", "wideSize", "inheritLayout", "allowWrap", "gridMode", "minColumnWidthUnit"].includes(key)))) invalid("The template Content settings are invalid.");
        if (node.element === "document-title" && ((node.blockAlign !== undefined && typeof node.blockAlign !== "string") || !validContentBlocks([{ ...node, type: "document-title" }]))) invalid("The template Document Title settings are invalid.");
        if (node.element === "subtitle" && (!validParagraphStyle(node.style) || !validParagraphStyle(node.visualStyle))) invalid("The template Document Subtitle settings are invalid.");
        if (node.element === "cover-image" && ((node.blockAlign !== undefined && typeof node.blockAlign !== "string") || !validContentBlocks([{ ...node, type: "cover-image" }]))) invalid("The template Featured Image settings are invalid.");
        if (node.element === "cover-image" && node.fixedImage !== undefined && !validTemplateImage(node.fixedImage)) invalid("The fixed template featured image is invalid.");
        if (node.element === "cover-image" && node.coverImageHidden !== undefined && typeof node.coverImageHidden !== "boolean") invalid("The template featured image visibility is invalid.");
        if (node.element !== "cover-image" && ("fixedImage" in node || "coverImageHidden" in node)) invalid("Only a Featured Image element can use featured image settings.");
      } else if (node.type === "part") { if (!safeId(node.partId)) invalid("Invalid shared-part reference."); }
      else if (node.type === "group" || node.type === "section") { const supportedKeys = ["editorial", "id", "type", "layout", "role", "children", "visualStyle", "horizontalAlign", "verticalAlign", "gap", "columnGap", "rowGap", "paddingX", "paddingY", "contentWidth", "columns", "minColumnWidth", "stackAt"]; if (node.type === "group") supportedKeys.push("position", "tagName", "ariaLabel", "blockAlign", "allowedBlocks", "contentSize", "wideSize", "inheritLayout", "allowWrap", "gridMode", "minColumnWidthUnit"); if (Object.keys(node).some(key => !supportedKeys.includes(key)) || (node.type === "group" && (node.position !== undefined && node.position !== "sticky" || !validParagraphStyle(node.visualStyle) || (node.allowedBlocks !== undefined && (!Array.isArray(node.allowedBlocks) || new Set(node.allowedBlocks).size !== node.allowedBlocks.length || node.allowedBlocks.some(type => !GROUP_ALLOWED_BLOCK_TYPES.includes(type as typeof GROUP_ALLOWED_BLOCK_TYPES[number])))))) || (node.blockAlign !== undefined && typeof node.blockAlign !== "string") || !validContentBlocks([{ ...node, children: [] }]) || !["flow", "stack", "row", "columns", "grid"].includes(node.layout as string) || (node.role !== undefined && !["account", "setup", "scorecard", "leaderboard", "share", "hero", "hero-copy", "account-copy", "scorecard-heading", "scorecard-actions", "leaderboard-card", "leaderboard-score", "leaderboard-metrics", "metric", "footer", "footer-brand", "footer-links", "social-link"].includes(node.role as string)) || !validLayoutOptions(node, node.type === "group")) invalid("Invalid template layout or unsupported group metadata."); nodes(node.children, depth + 1); }
      else if (node.type === "columns") { if (Object.keys(node).some(key => !["editorial", "id", "type", "children", "style", "blockAlign", "verticalAlign", "gap", "columnGap", "rowGap", "paddingX", "paddingY", "contentWidth", "stackAt"].includes(key)) || !validLayoutOptions(node) || !validParagraphStyle(node.style) || !Array.isArray(node.children) || node.children.length < 1 || node.children.length > 6 || node.children.some(child => !isRecord(child) || child.type !== "column") || (node.blockAlign !== undefined && typeof node.blockAlign !== "string") || !validContentBlocks([{ ...node, children: node.children.map(child => ({ ...child as Record<string, unknown>, children: [] })) }])) invalid("Columns blocks need between one and six Column blocks and supported layout settings."); nodes(node.children, depth + 1, "columns"); }
      else if (node.type === "column") { if (parentType !== "columns" || (node.allowedBlocks !== undefined && (!Array.isArray(node.allowedBlocks) || new Set(node.allowedBlocks).size !== node.allowedBlocks.length || node.allowedBlocks.some(type => !GROUP_ALLOWED_BLOCK_TYPES.includes(type as typeof GROUP_ALLOWED_BLOCK_TYPES[number])))) || Object.keys(node).some(key => !["editorial", "id", "type", "children", "width", "verticalAlign", "gap", "columnGap", "rowGap", "style", "allowedBlocks"].includes(key)) || (node.width !== undefined && (typeof node.width !== "number" || node.width < 5 || node.width > 100)) || (node.verticalAlign !== undefined && !["top", "centre", "bottom", "stretch"].includes(node.verticalAlign as string)) || !validLayoutOptions(node) || !validParagraphStyle(node.style) || !Array.isArray(node.children)) invalid("Invalid Column block settings."); nodes(node.children, depth + 1, "column"); }
      else {
        if (node.type === "component" || node.type === "column" || !validContentBlocks([node])) invalid("Invalid ordinary template block.");
        if ((node.type === "button" || node.type === "embed") && node.url && !safeTextLink(node.url as string)) invalid("Unsafe template link.");
        if (node.type === "image" && ((node.src && !safeImageSource(node.src as string)) || (node.mediaId !== undefined && !safeId(node.mediaId)))) invalid("Invalid template image.");
        for (const runs of [node.runs, node.attributionRuns, node.captionRuns]) if (Array.isArray(runs)) for (const run of runs) if (Array.isArray(run.marks)) for (const mark of run.marks) if (isRecord(mark) && mark.type === "link" && !safeTextLink(mark.url as string)) invalid("Unsafe text link.");
        if ((node.type === "quote" || node.type === "buttons") && node.children !== undefined) nodes(node.children, depth + 1, node.type);
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
  if (set.templates.some(t => !["page", "post"].includes(t.kind)) || set.parts.some(p => !["header", "footer", "overlay"].includes(p.kind))) invalid("Invalid template or part kind.");
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
      else if (node.type === "group" || node.type === "section" || node.type === "columns" || node.type === "column" || node.type === "social-icons" || node.type === "quote" || node.type === "buttons") slots += countContent((node.children ?? []) as TemplateNode[], ancestors, depth + 1, overlay);
    }
    return slots;
  }
  for (const part of set.parts) { expansion = 0; if (countContent(part.nodes, new Set([part.id]), 0, part.kind === "overlay") !== 0) invalid("Content belongs in a page or post template, not a shared part."); }
  for (const template of set.templates) { expansion = 0; if (countContent(template.nodes, new Set()) > 1) invalid("Each template may contain at most one Content element."); }
  return { ...set, defaults: set.defaults ?? {},
    templates: set.templates.map(template => ({ ...template, defaults: template.defaults ?? set.defaults ?? {}, nodes: migrateTemplateFootnoteNodes(template.nodes) })),
    parts: set.parts.map(part => ({ ...part, nodes: migrateTemplateFootnoteNodes(part.nodes) })),
  };
}

/** Preserve template-only nodes and layout metadata while reusing rich fields. */
function migrateTemplateFootnoteNodes(nodes: TemplateNode[]): TemplateNode[] {
  let changed = false;
  const next = nodes.map(node => {
    let migrated = node;
    if (node.type === "group" || node.type === "section" || node.type === "columns" || node.type === "column") {
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
    if (node.type === "group" || node.type === "section" || node.type === "column") return { ...node, children: migrateLegacySubtitleStyles(node.children) };
    return node;
  });
}

function containsPageLinkPresentation(value: Record<string, unknown>): boolean {
  const sets = [...(Array.isArray(value.sets) ? value.sets : []), value.set,
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

export function validateTemplateStore(value: unknown, documents?: Pick<StudioDocument, "id" | "kind">[]): TemplateStore {
  if (!isRecord(value) || !([TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29, LEGACY_TEMPLATE_VERSION_28, LEGACY_TEMPLATE_VERSION_27, LEGACY_TEMPLATE_VERSION_26, LEGACY_TEMPLATE_VERSION_25, LEGACY_TEMPLATE_VERSION_24, LEGACY_TEMPLATE_VERSION_23, LEGACY_TEMPLATE_VERSION_22, LEGACY_TEMPLATE_VERSION_21, LEGACY_TEMPLATE_VERSION_20, LEGACY_TEMPLATE_VERSION_19, LEGACY_TEMPLATE_VERSION_18, LEGACY_TEMPLATE_VERSION_17, LEGACY_TEMPLATE_VERSION_16, LEGACY_TEMPLATE_VERSION_15, LEGACY_TEMPLATE_VERSION_14, LEGACY_TEMPLATE_VERSION_13, LEGACY_TEMPLATE_VERSION_12, LEGACY_TEMPLATE_VERSION_11, LEGACY_TEMPLATE_VERSION_10, LEGACY_TEMPLATE_VERSION_9, LEGACY_TEMPLATE_VERSION_8, LEGACY_TEMPLATE_VERSION_7, LEGACY_TEMPLATE_VERSION_6, LEGACY_TEMPLATE_VERSION_5, LEGACY_TEMPLATE_VERSION_4, LEGACY_TEMPLATE_VERSION_3, LEGACY_TEMPLATE_VERSION_2, LEGACY_TEMPLATE_VERSION] as readonly string[]).includes(value.version as string) || !Array.isArray(value.sets) || value.sets.length > 100 || !Array.isArray(value.assignments) || value.assignments.length > 10000 || (value.bin !== undefined && (!Array.isArray(value.bin) || value.bin.length > 10000))) invalid("Unsupported or invalid saved template data. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && containsAuthoredImageDuotone(value)) invalid("Image Duotone requires template v0.36.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_35 && containsQuotePresentation(value)) invalid("Quote presentation requires template v0.35.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && containsExtendedImageAspectRatio(value)) invalid("These aspect ratios require template v0.34.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && value.version !== LEGACY_TEMPLATE_VERSION_33 && containsTableCellAlignment(value)) invalid("Cell alignment requires template v0.33.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && value.version !== LEGACY_TEMPLATE_VERSION_33 && value.version !== LEGACY_TEMPLATE_VERSION_32 && containsResponsiveStyles(value)) invalid("Responsive styles require template v0.32.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && value.version !== LEGACY_TEMPLATE_VERSION_33 && value.version !== LEGACY_TEMPLATE_VERSION_32 && value.version !== LEGACY_TEMPLATE_VERSION_31 && containsPageLinkAdvancedFields(value)) invalid("Page link anchors and Additional CSS require template v0.31.0. Original data has been retained.");
  if (![TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29].includes(value.version as typeof TEMPLATE_VERSION) && containsNavigationOverlaySettings(value)) invalid("Navigation overlay settings require template v0.29.0. Original data has been retained.");
  if (![TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29, LEGACY_TEMPLATE_VERSION_28].includes(value.version as typeof TEMPLATE_VERSION) && containsPageLinkPresentation(value)) invalid("Page link presentation requires template v0.28.0. Original data has been retained.");
  if ((![TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29, LEGACY_TEMPLATE_VERSION_28, LEGACY_TEMPLATE_VERSION_27, LEGACY_TEMPLATE_VERSION_26, LEGACY_TEMPLATE_VERSION_25, LEGACY_TEMPLATE_VERSION_24].includes(value.version as typeof TEMPLATE_VERSION) && containsRichTextInlineObjects(value) || ![TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29, LEGACY_TEMPLATE_VERSION_28, LEGACY_TEMPLATE_VERSION_27, LEGACY_TEMPLATE_VERSION_26, LEGACY_TEMPLATE_VERSION_25].includes(value.version as typeof TEMPLATE_VERSION) && (containsRichTextInlineObjects(value, "math") || containsRichTextInlineObjects(value, "image") || containsExtendedLanguage(value)))) invalid("Inline objects require the current template format. Original data has been retained.");
  if (value.defaultTemplateIds !== undefined && (!isRecord(value.defaultTemplateIds) || (value.defaultTemplateIds.page !== undefined && !safeId(value.defaultTemplateIds.page)) || (value.defaultTemplateIds.post !== undefined && !safeId(value.defaultTemplateIds.post)))) invalid("The default template selection is invalid.");
  const migrateLegacyDefaultTitles = value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && value.version !== LEGACY_TEMPLATE_VERSION_33 && value.version !== LEGACY_TEMPLATE_VERSION_32 && value.version !== LEGACY_TEMPLATE_VERSION_31 && value.version !== LEGACY_TEMPLATE_VERSION_30 && value.version !== LEGACY_TEMPLATE_VERSION_29 && value.version !== LEGACY_TEMPLATE_VERSION_28 && value.version !== LEGACY_TEMPLATE_VERSION_27 && value.version !== LEGACY_TEMPLATE_VERSION_26 && value.version !== LEGACY_TEMPLATE_VERSION_25 && value.version !== LEGACY_TEMPLATE_VERSION_24 && value.version !== LEGACY_TEMPLATE_VERSION_23 && value.version !== LEGACY_TEMPLATE_VERSION_22 && value.version !== LEGACY_TEMPLATE_VERSION_21 && value.version !== LEGACY_TEMPLATE_VERSION_20 && value.version !== LEGACY_TEMPLATE_VERSION_19 && value.version !== LEGACY_TEMPLATE_VERSION_18 && value.version !== LEGACY_TEMPLATE_VERSION_17 && value.version !== LEGACY_TEMPLATE_VERSION_16 && value.version !== LEGACY_TEMPLATE_VERSION_15 && value.version !== LEGACY_TEMPLATE_VERSION_14 && value.version !== LEGACY_TEMPLATE_VERSION_13 && value.version !== LEGACY_TEMPLATE_VERSION_12;
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
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && value.version !== LEGACY_TEMPLATE_VERSION_33 && value.version !== LEGACY_TEMPLATE_VERSION_32 && value.version !== LEGACY_TEMPLATE_VERSION_31 && value.version !== LEGACY_TEMPLATE_VERSION_30 && Array.isArray(value.libraryOrder) && value.libraryOrder.length > 0) invalid("Template library ordering requires template v0.30.0.");
  // Keep removed/Bin references inert so restoration recovers their position.
  const orderedIds = new Set(libraryOrder.map(item => item.id));
  const missing = store.sets.flatMap(set => [...set.templates, ...set.parts].map(entry => ({ id: `${set.id}/${entry.id}`, setId: set.id, entryId: entry.id }))).filter(item => !orderedIds.has(item.id));
  if (libraryOrder.length + missing.length > 20000) invalid("The template library order exceeds its recovery limit.");
  return { ...store, bin, defaultTemplateIds: store.defaultTemplateIds ?? {}, libraryOrder: [...libraryOrder, ...missing] };
}

export function validateTemplateSnapshot(value: unknown): TemplateSnapshot {
  if (!isRecord(value) || !([TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29, LEGACY_TEMPLATE_VERSION_28, LEGACY_TEMPLATE_VERSION_27, LEGACY_TEMPLATE_VERSION_26, LEGACY_TEMPLATE_VERSION_25, LEGACY_TEMPLATE_VERSION_24, LEGACY_TEMPLATE_VERSION_23, LEGACY_TEMPLATE_VERSION_22, LEGACY_TEMPLATE_VERSION_21, LEGACY_TEMPLATE_VERSION_20, LEGACY_TEMPLATE_VERSION_19, LEGACY_TEMPLATE_VERSION_18, LEGACY_TEMPLATE_VERSION_17, LEGACY_TEMPLATE_VERSION_16, LEGACY_TEMPLATE_VERSION_15, LEGACY_TEMPLATE_VERSION_14, LEGACY_TEMPLATE_VERSION_13, LEGACY_TEMPLATE_VERSION_12, LEGACY_TEMPLATE_VERSION_11, LEGACY_TEMPLATE_VERSION_10, LEGACY_TEMPLATE_VERSION_9, LEGACY_TEMPLATE_VERSION_8, LEGACY_TEMPLATE_VERSION_7, LEGACY_TEMPLATE_VERSION_6, LEGACY_TEMPLATE_VERSION_5, LEGACY_TEMPLATE_VERSION_4, LEGACY_TEMPLATE_VERSION_3, LEGACY_TEMPLATE_VERSION_2, LEGACY_TEMPLATE_VERSION] as readonly string[]).includes(value.version as string)) invalid("Unsupported published template snapshot.");
  if (value.version !== TEMPLATE_VERSION && containsAuthoredImageDuotone(value)) invalid("Image Duotone requires template v0.36.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_35 && containsQuotePresentation(value)) invalid("Quote presentation requires template v0.35.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && containsExtendedImageAspectRatio(value)) invalid("These aspect ratios require template v0.34.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && value.version !== LEGACY_TEMPLATE_VERSION_33 && containsTableCellAlignment(value)) invalid("Cell alignment requires template v0.33.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && value.version !== LEGACY_TEMPLATE_VERSION_33 && value.version !== LEGACY_TEMPLATE_VERSION_32 && containsResponsiveStyles(value)) invalid("Responsive styles require template v0.32.0. Original data has been retained.");
  if (value.version !== TEMPLATE_VERSION && value.version !== LEGACY_TEMPLATE_VERSION_35 && value.version !== LEGACY_TEMPLATE_VERSION_34 && value.version !== LEGACY_TEMPLATE_VERSION_33 && value.version !== LEGACY_TEMPLATE_VERSION_32 && value.version !== LEGACY_TEMPLATE_VERSION_31 && containsPageLinkAdvancedFields(value)) invalid("Page link anchors and Additional CSS require template v0.31.0. Original data has been retained.");
  if (![TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29].includes(value.version as typeof TEMPLATE_VERSION) && containsNavigationOverlaySettings(value)) invalid("Navigation overlay settings require template v0.29.0. Original data has been retained.");
  if (![TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29, LEGACY_TEMPLATE_VERSION_28].includes(value.version as typeof TEMPLATE_VERSION) && containsPageLinkPresentation(value)) invalid("Page link presentation requires template v0.28.0. Original data has been retained.");
  if ((![TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29, LEGACY_TEMPLATE_VERSION_28, LEGACY_TEMPLATE_VERSION_27, LEGACY_TEMPLATE_VERSION_26, LEGACY_TEMPLATE_VERSION_25, LEGACY_TEMPLATE_VERSION_24].includes(value.version as typeof TEMPLATE_VERSION) && containsRichTextInlineObjects(value) || ![TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_35, LEGACY_TEMPLATE_VERSION_34, LEGACY_TEMPLATE_VERSION_33, LEGACY_TEMPLATE_VERSION_32, LEGACY_TEMPLATE_VERSION_31, LEGACY_TEMPLATE_VERSION_30, LEGACY_TEMPLATE_VERSION_29, LEGACY_TEMPLATE_VERSION_28, LEGACY_TEMPLATE_VERSION_27, LEGACY_TEMPLATE_VERSION_26, LEGACY_TEMPLATE_VERSION_25].includes(value.version as typeof TEMPLATE_VERSION) && (containsRichTextInlineObjects(value, "math") || containsRichTextInlineObjects(value, "image") || containsExtendedLanguage(value)))) invalid("Inline objects require the current template snapshot.");
  const snapshot = value as unknown as TemplateSnapshot;
  const set = validateTemplateSet(snapshot.set);
  if (!set.templates.some(t => t.id === snapshot.templateId && ["page", "post"].includes(t.kind))) invalid("Invalid published template.");
  return { ...snapshot, version: TEMPLATE_VERSION, set };
}

/** Publication boundary validation; content-only validators remain independent. */
export function validateTemplatePublicationSnapshot(value: unknown) {
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
    visitTemplateNodes(item.nodes, node => { node.id = templateId(); if (node.type === "part") node.partId = parts.get(node.partId)!; if (node.type === "element" && node.element === "navigation" && node.overlayPartId) node.overlayPartId = parts.get(node.overlayPartId)!; });
  }
  const renewLinks = (links: SiteLink[]) => links.forEach(link => { link.id = templateId(); if (link.children) renewLinks(link.children); });
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
    if (historical !== "block-assets" && node.type !== "element" && node.type !== "part" && node.type !== "group" && node.type !== "section" && node.type !== "columns" && node.type !== "column") for (const id of (historical ? historicalContentMediaIds : contentMediaIds)([node])) ids.add(id);
    if (node.type === "image" && node.mediaId) ids.add(node.mediaId);
    const style = historical === "block-assets" ? (node.type === "group" || node.type === "quote" ? node.visualStyle : undefined)
      : !historical && (node.type === "columns" || node.type === "column") ? node.style
      : "visualStyle" in node ? node.visualStyle : undefined;
    if (style?.backgroundImageMediaId) ids.add(style.backgroundImageMediaId);
    if (node.type === "element" && node.element === "cover-image" && node.fixedImage?.mediaId) ids.add(node.fixedImage.mediaId);
  });
  return Array.from(ids);
}

type TitlePresentation = Omit<Extract<ContentBlock, { type: "document-title" }>, "id" | "type">;
type CoverPresentation = Omit<Extract<ContentBlock, { type: "cover-image" }>, "id" | "type">;

function titlePresentation(node: TitlePresentation): TitlePresentation {
  const { align, blockAlign, level, isLink, linkTarget, rel, visualStyle, siteRole } = node;
  return copyTemplateData({ align, blockAlign, level, isLink, linkTarget, rel, visualStyle, siteRole });
}
function coverPresentation(node: CoverPresentation): CoverPresentation {
  const { align, blockAlign, isLink, linkTarget, rel, aspectRatio, scale,
    displayWidth, displayHeight, focalX, focalY, visualStyle, siteRole } = node;
  return copyTemplateData({ align, blockAlign, isLink, linkTarget, rel, aspectRatio, scale,
    displayWidth, displayHeight, focalX, focalY, visualStyle, siteRole });
}

/** Projection for shared block commands only; never stored as a content document. */
export function templateEditorBlocks(nodes: TemplateNode[]): ContentBlock[] {
  return nodes.map((node): ContentBlock => node.type === "element" && node.element === "document-title"
    ? { ...titlePresentation(node), editorial: node.editorial, id: node.id, type: "document-title" }
    : node.type === "element" && node.element === "subtitle"
      ? { editorial: node.editorial, id: node.id, type: "document-subtitle", align: node.align, visualStyle: mergeParagraphStyles(node.style, node.visualStyle) }
      : node.type === "element" && node.element === "cover-image"
        ? { ...coverPresentation(node), editorial: node.editorial, id: node.id, type: "cover-image" }
        : node.type === "element" && node.element === "content"
          ? { ...pickLayoutOptions(node), inheritLayout: node.inheritLayout ?? true, editorial: node.editorial, id: node.id, type: "group", layout: "flow", children: [], visualStyle: node.visualStyle ? copyTemplateData(node.visualStyle) : undefined, data: { templateElement: "content", align: node.align ?? "left" } }
        : node.type === "element" && node.element === "navigation"
          ? { editorial: node.editorial, id: node.id, type: "group", layout: node.layout ?? "row", children: [], horizontalAlign: node.horizontalAlign ?? node.align ?? "left", allowWrap: node.allowWrap ?? true, gap: node.gap, visualStyle: node.visualStyle, data: { templateElement: "navigation", align: node.align ?? "left", overlayMenu: node.overlayMenu ?? "never", submenuOpenOnClick: node.submenuOpenOnClick ?? false, showSubmenuIcon: node.showSubmenuIcon ?? true, ...(node.showIcon !== undefined ? { showIcon: node.showIcon } : {}), ...(node.icon ? { icon: node.icon } : {}), ...(node.overlayPartId ? { overlayPartId: node.overlayPartId } : {}), ariaLabel: node.ariaLabel ?? "Site navigation", ...(node.submenuTextColor ? { submenuTextColor: node.submenuTextColor } : {}), ...(node.submenuBackgroundColor ? { submenuBackgroundColor: node.submenuBackgroundColor } : {}) } }
        : node.type === "element" || node.type === "part"
          ? { editorial: node.editorial, id: node.id, type: "group", layout: "stack", children: [], data: node.type === "part" ? { templatePart: node.partId } : { templateElement: node.element, align: node.align ?? "left" } }
    : node.type === "group" ? { editorial: node.editorial, id: node.id, type: node.type, layout: node.layout, ...groupSemanticPresentation(node), ...(node.position ? { position: node.position } : {}), ...(node.visualStyle ? { visualStyle: copyTemplateData(node.visualStyle) } : {}), ...(node.allowedBlocks ? { allowedBlocks: [...node.allowedBlocks] } : {}), ...pickLayoutOptions(node), children: templateEditorBlocks(node.children) }
      : node.type === "section" ? { editorial: node.editorial, id: node.id, type: node.type, layout: node.layout, ...(node.visualStyle ? { visualStyle: copyTemplateData(node.visualStyle) } : {}), ...(node.role ? { role: node.role } : {}), ...pickLayoutOptions(node), children: templateEditorBlocks(node.children) }
      : node.type === "columns" ? { ...node, children: node.children.map(column => ({ ...column, children: templateEditorBlocks(column.children) })) as ColumnBlock[] }
        : node.type === "column" ? { ...node, children: templateEditorBlocks(node.children) } : node);
}
export function templateNodesFromBlocks(blocks: ContentBlock[], sourceNodes: TemplateNode[] = []): TemplateNode[] {
  const sourceById = new Map<string, TemplateNode>();
  visitTemplateNodes(sourceNodes, node => sourceById.set(node.id, node));
  return blocks.map((block): TemplateNode => {
    if (block.type === "document-title") return { ...titlePresentation(block), editorial: block.editorial, id: block.id, type: "element", element: "document-title" };
    if (block.type === "document-subtitle") return { editorial: block.editorial, id: block.id, type: "element", element: "subtitle", align: block.align ?? "left", ...(block.visualStyle ? { visualStyle: copyTemplateData(block.visualStyle) } : {}) };
    if (block.type === "cover-image") {
      const source = sourceById.get(block.id);
      return { ...coverPresentation(block), editorial: block.editorial, id: block.id, type: "element", element: "cover-image", ...(source?.type === "element" && source.element === "cover-image" ? {
        ...(source.fixedImage ? { fixedImage: copyTemplateData(source.fixedImage) } : {}),
        ...(source.coverImageHidden ? { coverImageHidden: true } : {}),
      } : {}) };
    }
    if (block.type === "group" && typeof block.data?.templatePart === "string") return { editorial: block.editorial, id: block.id, type: "part", partId: block.data.templatePart };
    if (block.type === "group" && block.data?.templateElement === "content") return { editorial: block.editorial, id: block.id, type: "element", element: "content", align: block.data.align as "left" | "centre" | "right", ...pickLayoutOptions(block), ...(block.visualStyle ? { visualStyle: copyTemplateData(block.visualStyle) } : {}) };
    if (block.type === "group" && block.data?.templateElement === "navigation") return { editorial: block.editorial, id: block.id, type: "element", element: "navigation", align: block.data.align as "left" | "centre" | "right", layout: block.layout === "stack" ? "stack" : "row", horizontalAlign: block.horizontalAlign, allowWrap: block.allowWrap, gap: block.gap, visualStyle: block.visualStyle, overlayMenu: block.data.overlayMenu as NavigationTemplateNode["overlayMenu"], showIcon: block.data.showIcon as boolean | undefined, icon: block.data.icon as NavigationTemplateNode["icon"], overlayPartId: block.data.overlayPartId as string | undefined, submenuOpenOnClick: block.data.submenuOpenOnClick as boolean, showSubmenuIcon: block.data.showSubmenuIcon as boolean, ariaLabel: block.data.ariaLabel as string, submenuTextColor: block.data.submenuTextColor as string | undefined, submenuBackgroundColor: block.data.submenuBackgroundColor as string | undefined };
    if (block.type === "group" && typeof block.data?.templateElement === "string") return { editorial: block.editorial, id: block.id, type: "element", element: block.data.templateElement as Exclude<TemplateElement, "cover-image">, align: block.data.align as "left" | "centre" | "right" };
    if (block.type === "group") return { editorial: block.editorial, id: block.id, type: block.type, layout: block.layout, ...groupSemanticPresentation(block), ...(block.position ? { position: block.position } : {}), ...(block.visualStyle ? { visualStyle: copyTemplateData(block.visualStyle) } : {}), ...(block.allowedBlocks ? { allowedBlocks: [...block.allowedBlocks] } : {}), ...pickLayoutOptions(block), children: templateNodesFromBlocks(block.children, sourceNodes) };
    if (block.type === "section") return { editorial: block.editorial, id: block.id, type: block.type, layout: block.layout, ...(block.visualStyle ? { visualStyle: copyTemplateData(block.visualStyle) } : {}), ...(block.role ? { role: block.role } : {}), ...pickLayoutOptions(block), children: templateNodesFromBlocks(block.children, sourceNodes) };
    if (block.type === "columns") return { ...block, children: block.children.map(column => ({ ...column, children: templateNodesFromBlocks(column.children, sourceNodes) })) };
    if (block.type === "column") return { ...block, children: templateNodesFromBlocks(block.children, sourceNodes) };
    if (block.type === "component") return invalid("Product components are not template blocks.");
    return block;
  });
}

type LayoutOptionKey = "horizontalAlign" | "verticalAlign" | "gap" | "columnGap" | "rowGap" | "paddingX" | "paddingY" | "contentWidth" | "columns" | "minColumnWidth" | "stackAt" | "contentSize" | "wideSize" | "inheritLayout" | "allowWrap" | "gridMode" | "minColumnWidthUnit";
function pickLayoutOptions<T extends LayoutOptions | GroupLayoutOptions>(block: T): Pick<T, Extract<keyof T, LayoutOptionKey>> {
  return Object.fromEntries(Object.entries(block).filter(([key, value]) => ["horizontalAlign", "verticalAlign", "gap", "columnGap", "rowGap", "paddingX", "paddingY", "contentWidth", "columns", "minColumnWidth", "stackAt", "contentSize", "wideSize", "inheritLayout", "allowWrap", "gridMode", "minColumnWidthUnit"].includes(key) && value !== undefined)) as Pick<T, Extract<keyof T, LayoutOptionKey>>;
}

function groupSemanticPresentation(group: Pick<Extract<ContentBlock, { type: "group" }>, "tagName" | "ariaLabel" | "blockAlign">) {
  return {
    ...(group.tagName !== undefined ? { tagName: group.tagName } : {}),
    ...(group.ariaLabel !== undefined ? { ariaLabel: group.ariaLabel } : {}),
    ...(group.blockAlign !== undefined ? { blockAlign: group.blockAlign } : {}),
  };
}
