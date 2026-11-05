import { isLocalFixtureSiteId, type LocalFixtureSiteId } from "../test-site/sites";
import { testSiteCollection, type TestSiteDocument } from "../test-site/contract";
import type { SiteNavigationAssignment, SiteNavigationMenu } from "../test-site/contract";
import type { GlobalTemplateLibrary } from "../global-template-contract";
import { validateWebsiteStyles } from "./website-style-validation";
import { stylePalettes, styleTypography } from "./style-reference-data";
import { compileSavedWebsiteCss } from "./additional-css";
import type { effectiveWebsiteDesign } from "./website-design";
import { safeTextLink } from "../../content/rich-text";
import { validParagraphStyle } from "../workspace-validation";
export const hostedHomeProtocol = "acm-site-editor-home-v1";
export type HostedSitePreview = {
  previewId: number;
  design: ReturnType<typeof effectiveWebsiteDesign>;
  navigation: { menus: SiteNavigationMenu[]; defaultMenuId: string; assignments: SiteNavigationAssignment[] };
};
export function hostedHomeHref(site: LocalFixtureSiteId) { return `/studio?site=${site}&siteEditorHome=1`; }
export function hostedPageHref(site: LocalFixtureSiteId, documentId: string) {
  if (!documentId || documentId.length > 200) throw new Error("The selected page is unavailable.");
  return `/studio?site=${site}&siteEditorPage=1&documentId=${encodeURIComponent(documentId)}`;
}
/** Resolve a rendered fixture template target back to its editable shared original. */
export function hostedHomeTemplateTarget(library: GlobalTemplateLibrary | null | undefined, site: LocalFixtureSiteId, setId: string, targetId: string) {
  if (!library) return null;
  const binding = library.migrations[site]?.bindings.find(item => item.setId === setId);
  const canonicalSetId = binding?.globalSetId ?? setId;
  const canonicalTargetId = binding
    ? Object.entries(binding.ids).find(([, fixtureId]) => fixtureId === targetId)?.[0] ?? targetId
    : targetId;
  const set = library.templates.sets.find(item => item.id === canonicalSetId);
  const targetExists = set && [...set.templates, ...set.parts].some(entry => entry.id === canonicalTargetId);
  return targetExists ? { setId: canonicalSetId, targetId: canonicalTargetId, scope: "global" as const } : null;
}
export function authoredHome(document: TestSiteDocument, site: LocalFixtureSiteId) {
  const collection = testSiteCollection(document);
  if (collection.siteId !== site) throw new Error("The home page belongs to another site.");
  const home = collection.documents.find(item => item.id === collection.homeDocumentId);
  if (!home || home.kind !== "page") throw new Error("The authored home page is unavailable.");
  return home;
}
export function authoredPage(document: TestSiteDocument, site: LocalFixtureSiteId, documentId: string) {
  const collection = testSiteCollection(document);
  if (collection.siteId !== site) throw new Error("The page belongs to another site.");
  const page = collection.documents.find(item => item.id === documentId);
  if (!page || page.kind !== "page") throw new Error("The selected page is unavailable.");
  return page;
}
export function validHostedHomeMessage(event: Pick<MessageEvent, "source" | "origin" | "data">, source: MessageEventSource | null, origin: string, site: LocalFixtureSiteId, targetId?: string) {
  const data = event.data;
  return event.source === source && source !== null && event.origin === origin && data && typeof data === "object" && data.protocol === hostedHomeProtocol && isLocalFixtureSiteId(data.site) && data.site === site
    && (targetId === undefined ? data.documentId === undefined : data.documentId === targetId);
}

/** Validate presentation-only data before it crosses into the hosted preview frame. */
export function validHostedSitePreview(value: unknown, origin: string): value is HostedSitePreview {
  const record = (item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item));
  const image = (item: unknown) => {
    if (!record(item) || Object.keys(item).sort().join() !== "altText,id,name,src") return false;
    if (typeof item.id !== "string" || item.id.length > 160 || typeof item.name !== "string" || item.name.length > 500 || typeof item.altText !== "string" || item.altText.length > 2000 || typeof item.src !== "string") return false;
    try { const url = new URL(item.src); return url.protocol === "blob:" && url.origin === origin; } catch { return false; }
  };
  if (!record(value) || Object.keys(value).sort().join() !== "design,navigation,previewId" || !Number.isSafeInteger(value.previewId) || (value.previewId as number) < 1 || !record(value.design) || !record(value.navigation)) return false;
  const design = value.design;
  if (Object.keys(design).some(key => !["identity", "styles", "legacy", "paletteAuthored", "paletteSelected", "typographySelected"].includes(key))
    || typeof design.legacy !== "boolean" || typeof design.paletteAuthored !== "boolean" || typeof design.paletteSelected !== "boolean" || typeof design.typographySelected !== "boolean"
    || !record(design.identity) || Object.keys(design.identity).some(key => !["title", "tagline", "logo", "icon", "hidden"].includes(key))
    || !record(design.styles) || Object.keys(design.styles).some(key => !["paletteId", "typographyId", "typography", "additionalCss", "colours", "background", "shadows", "layout", "blockStyles"].includes(key))) return false;
  for (const [field, limit] of [["title", 200], ["tagline", 500]] as const) if (design.identity[field] !== undefined && design.identity[field] !== null && (typeof design.identity[field] !== "string" || design.identity[field].length > limit)) return false;
  for (const field of ["logo", "icon"] as const) if (design.identity[field] !== undefined && design.identity[field] !== null && !image(design.identity[field])) return false;
  if (design.identity.hidden !== undefined && (!record(design.identity.hidden) || Object.entries(design.identity.hidden).some(([key, hidden]) => !["title", "tagline", "logo", "icon"].includes(key) || typeof hidden !== "boolean"))) return false;
  const styles = design.styles;
  if (styles.paletteId !== undefined && !stylePalettes.some(item => item.id === styles.paletteId) || styles.typographyId !== undefined && !styleTypography.some(item => item.id === styles.typographyId)) return false;
  if (styles.additionalCss !== undefined && (typeof styles.additionalCss !== "string" || compileSavedWebsiteCss(styles.additionalCss).error)) return false;
  try { validateWebsiteStyles(styles, image); } catch { return false; }
  const navigation = value.navigation;
  if (Object.keys(navigation).sort().join() !== "assignments,defaultMenuId,menus" || typeof navigation.defaultMenuId !== "string" || navigation.defaultMenuId.length > 160 || !Array.isArray(navigation.menus) || navigation.menus.length > 100 || !Array.isArray(navigation.assignments) || navigation.assignments.length > 1000) return false;
  const menuIds = new Set<string>();
  const validLinks = (links: unknown, depth = 0, count = { value: 0 }): boolean => {
    if (!Array.isArray(links) || depth > 5 || links.length > 100) return false;
    for (const link of links) {
      if (!record(link) || ++count.value > 100 || typeof link.id !== "string" || !link.id || link.id.length > 160) return false;
      if (link.type === "spacer") {
        if (Object.keys(link).sort().join() !== "height,id,type,width" || !Number.isInteger(link.width) || (link.width as number) < 0 || (link.width as number) > 2000 || !Number.isInteger(link.height) || (link.height as number) < 0 || (link.height as number) > 2000) return false;
        continue;
      }
      const allowed = ["id", "label", "url", "homeLink", "opensInNewTab", "rel", "description", "visualStyle", "children"];
      if (Object.keys(link).some(key => !allowed.includes(key)) || typeof link.label !== "string" || link.label.length > 160 || typeof link.url !== "string" || !safeTextLink(link.url)
        || link.homeLink !== undefined && link.homeLink !== true || link.opensInNewTab !== undefined && typeof link.opensInNewTab !== "boolean"
        || link.rel !== undefined && (typeof link.rel !== "string" || link.rel.length > 200 || !/^[a-zA-Z0-9_\s-]*$/.test(link.rel))
        || link.description !== undefined && (typeof link.description !== "string" || link.description.length > 2000)) return false;
      if (link.visualStyle !== undefined) {
        const styleFields = ["fontFamily", "fontSize", "fontSizeCustom", "appearance", "lineHeight", "letterSpacing", "textTransform", "textDecoration", "className", "anchor", "additionalCss", "responsive"];
        if (!validParagraphStyle(link.visualStyle) || !record(link.visualStyle) || Object.keys(link.visualStyle).some(key => !styleFields.includes(key))) return false;
        if (record(link.visualStyle.responsive) && Object.values(link.visualStyle.responsive).some(override => !record(override) || Object.keys(override).some(key => !styleFields.includes(key)))) return false;
      }
      if (link.children !== undefined && !validLinks(link.children, depth + 1, count)) return false;
    }
    return true;
  };
  for (const menu of navigation.menus) {
    if (!record(menu) || Object.keys(menu).sort().join() !== "id,links,name" || typeof menu.id !== "string" || !menu.id || menu.id.length > 160 || menuIds.has(menu.id) || typeof menu.name !== "string" || !menu.name.trim() || menu.name.length > 80 || !validLinks(menu.links)) return false;
    menuIds.add(menu.id);
  }
  if (!menuIds.has(navigation.defaultMenuId)) return false;
  for (const assignment of navigation.assignments) if (!record(assignment) || Object.keys(assignment).sort().join() !== "menuId,navigationId" || typeof assignment.navigationId !== "string" || !assignment.navigationId || assignment.navigationId.length > 160 || typeof assignment.menuId !== "string" || !menuIds.has(assignment.menuId)) return false;
  // A fixture and its global design can each occupy up to 1 MiB of source.
  try { return JSON.stringify(value).length <= 2 * 1024 * 1024; } catch { return false; }
}
export async function flushHostedHome(adapter: { discardCode(): boolean; prepareNavigation(): Promise<boolean>; flush(): Promise<void>; failed(): boolean; pause?(paused: boolean): void }) {
  let accepted = false;
  try {
    if (!adapter.discardCode() || !await adapter.prepareNavigation()) return false;
    adapter.pause?.(true);
    await adapter.flush(); accepted = !adapter.failed(); return accepted;
  } catch { return false; }
  finally { if (!accepted) adapter.pause?.(false); }
}

export function hostedHomeCanMutate(hosted: boolean, editing: boolean, busy: boolean, prepared: boolean) { return !hosted || editing && !busy && !prepared; }

/** Presentation-only status; recovery still runs in the embedded document owner. */
export type HostedSaveStatus = { label: string; warning: string | null; reconnecting: boolean };
export function validHostedSaveStatus(value: unknown): value is HostedSaveStatus {
  if (!value || typeof value !== "object") return false;
  const status = value as Record<string, unknown>;
  return typeof status.label === "string" && status.label.length > 0 && status.label.length <= 200
    && (status.warning === null || typeof status.warning === "string" && status.warning.length > 0 && status.warning.length <= 2000)
    && typeof status.reconnecting === "boolean";
}

export function boundedHostedSaveStatus(status: HostedSaveStatus): HostedSaveStatus {
  const bound = (text: string, limit: number) => text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
  return { label: bound(status.label || "Saving status unavailable", 200), warning: status.warning ? bound(status.warning, 2000) : null, reconnecting: status.reconnecting };
}
