import { containsWebsiteFont } from "../content/website-fonts";
import { containsBoxSideOverrides } from "../content/box-lengths";
import { containsPullquote } from "../content/pullquote-block";
import { containsButtonsAlignment } from "../content/buttons-alignment";
import { containsCoreSocialLink } from "../content/social-services";
import { containsCoverContentPosition, containsCoverInnerContentWidth, containsCoverVideoBackground, containsNativeCoverVideoSource } from "../content/cover-block";
import { containsCodeRuns, containsCodeMonospaceFont } from "../content/code-runs";
import { containsAuthoredAuthorDuotone, containsAuthoredFeaturedImageDuotone, containsAuthoredImageDuotone } from "../content/image-duotone";
import { containsAuthoredFeaturedImageOverlay } from "../content/featured-image-overlay";
import { containsDetailsPresentation } from "../content/details-block";
import { containsImageResolution } from "../content/image-resolution";
import { containsAuthorBlockPresentation } from "../content/author-profile-presentation";
import { containsAuthoredCoverCrop, containsAuthoredImageCrop } from "../content/image-edit";
import { containsGroupGridFillAvailableSpace, containsFlexItemSizing } from "../content/layout";
import { containsGridItemSizing } from "../content/grid-child-sizing";
import { containsColumnWidthUnit } from "../content/columns";
import { containsPostDateTimeOverride } from "../content/document-metadata";
import { containsTemplateContentButtonStyle } from "../content/template-content-button-style";
import { containsQuotePresentation } from "../content/quote-presentation";
import { containsExtendedImageAspectRatio } from "../content/image-aspect-ratios";
import { containsUnsetWebsiteGradient, validateWebsiteDesign, type WebsiteDesign } from "./site-editor/website-design";
import { containsTemplateContentTagName, containsAutomaticNavigationPageList, containsNavigationSearch, containsNavigationSearchStyle, containsNavigationSearchDisplayWidth, containsNavigationHomeLink, containsNavigationSpacer, isNavigationSpacer, copyTemplateData, validateTemplateStore, visitTemplateNodes, type NavigationItem, type SiteLink, type TemplateNode, type TemplateSet, type TemplateStore } from "./template-model";
import { containsVideoBlock } from "../content/video-block";
import type { LocalFixtureSiteId } from "./test-site/sites";

export type TemplatePropertyOverride = { path: string[]; value?: unknown; remove?: true; order?: string[]; added?: unknown[]; removed?: string[] };
export type GlobalTemplateBinding = { setId: string; globalSetId: string; ids: Record<string, string>; overrides: TemplatePropertyOverride[] };
export type GlobalTemplateLibrary = { format: "acm-global-templates"; version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41; websiteDesignDefaults?: WebsiteDesign; header?: { setId: string; partId: string }; navigationRecovery?: TemplateSet; templates: TemplateStore; migrations: Record<LocalFixtureSiteId, { bindings: GlobalTemplateBinding[]; bases: TemplateSet[] }> };
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const safeKey = (key: string) => key !== "__proto__" && key !== "constructor" && key !== "prototype";

/** Shared original creation is retained: an inverse may edit, but not remove it. */
export function globalTemplateChangeCanUndo(before: TemplateStore, after: TemplateStore): boolean {
  return after.sets.every(set => {
    const previous = before.sets.find(item => item.id === set.id);
    return previous && [...set.templates, ...set.parts].every(entry => [...previous.templates, ...previous.parts].some(item => item.id === entry.id && item.kind === entry.kind) || before.bin.some(item => item.kind === "template" && item.setId === set.id && item.entry.id === entry.id && same(item.entry, entry)));
  });
}
function keyed(value: unknown[]): value is (Record<string, unknown> & { id: string })[] { return value.every(item => object(item) && typeof item.id === "string") && new Set(value.map(item => (item as { id: string }).id)).size === value.length; }

/** Legacy patch utilities remain for interpreting recovery data; effective designs never apply them. */
export function templatePropertyOverrides(base: unknown, next: unknown, path: string[] = []): TemplatePropertyOverride[] {
  if (same(base, next)) return [];
  if (base === undefined && object(next)) return templatePropertyOverrides({}, next, path);
  if (Array.isArray(base) && Array.isArray(next) && keyed(base) && keyed(next)) {
    const properties = base.flatMap(item => {
      const changed = next.find(candidate => candidate.id === item.id);
      return changed ? templatePropertyOverrides(item, changed, [...path, `@${item.id}`]) : [];
    });
    if (same(base.map(item => item.id), next.map(item => item.id))) return properties;
    return [{ path, order: next.map(item => item.id), added: copyTemplateData(next.filter(item => !base.some(original => original.id === item.id))), removed: base.filter(item => !next.some(changed => changed.id === item.id)).map(item => item.id) }, ...properties];
  }
  if (object(base) && object(next)) return [...new Set([...Object.keys(base), ...Object.keys(next)])].flatMap(key => {
    if (!safeKey(key)) throw new Error("Unsupported template property.");
    return key in next ? templatePropertyOverrides(base[key], next[key], [...path, key]) : [{ path: [...path, key], remove: true as const }];
  });
  return [{ path, value: next === undefined ? null : copyTemplateData(next) }];
}
export function applyTemplatePropertyOverrides<T>(base: T, overrides: TemplatePropertyOverride[]): T {
  let result = copyTemplateData(base) as unknown;
  for (const patch of overrides) {
    if (!patch.path.length) { result = copyTemplateData(patch.value); continue; }
    let current = result as Record<string, unknown>;
    let missing = false;
    for (const [index, key] of patch.path.entries()) {
      if (!safeKey(key)) throw new Error("Unsupported template override.");
      if (key.startsWith("@")) {
        if (!Array.isArray(current)) { missing = true; break; }
        const entry = current.find(item => object(item) && item.id === key.slice(1));
        if (!entry) { missing = true; break; }
        current = entry;
      } else if (index === patch.path.length - 1) {
        if (patch.order) {
          const inherited = Array.isArray(current[key]) ? current[key] as unknown[] : [];
          const remaining = inherited.filter(item => object(item) && !patch.removed?.includes(item.id as string));
          const combined = [...remaining, ...(patch.added ?? [])];
          const ordered = patch.order.flatMap(id => { const item = combined.find(item => object(item) && item.id === id); return item ? [item] : []; });
          current[key] = [...ordered, ...remaining.filter(item => object(item) && !patch.order!.includes(item.id as string))];
        } else if (patch.remove) delete current[key]; else current[key] = copyTemplateData(patch.value);
      } else {
        if (!object(current[key]) && !Array.isArray(current[key])) current[key] = {};
        current = current[key] as Record<string, unknown>;
      }
    }
    // Removed global nodes cannot be resurrected by stale property overrides.
    if (missing) continue;
  }
  return result as T;
}
export function remapTemplateIds<T>(value: T, ids: Record<string, string>): T {
  if (Array.isArray(value)) return value.map(item => remapTemplateIds(item, ids)) as T;
  if (object(value)) return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, typeof child === "string" && ["id", "partId", "overlayPartId", "setId", "templateId"].includes(key) ? ids[child] ?? child : remapTemplateIds(child, ids)])) as T;
  return value;
}
export function globalTemplateBase(library: GlobalTemplateLibrary, binding: GlobalTemplateBinding): TemplateSet {
  const original = library.templates.sets.find(set => set.id === binding.globalSetId);
  if (!original) throw new Error("A global template original is missing. The site and its overrides were preserved.");
  return { ...remapTemplateIds(original, binding.ids), id: binding.setId };
}
export function migrateGlobalTemplateBindings(store: TemplateStore, library: GlobalTemplateLibrary, siteId: LocalFixtureSiteId): GlobalTemplateBinding[] {
  const known = library.migrations[siteId].bindings.filter(binding => store.sets.some(set => set.id === binding.setId)).map(binding => {
    return { ...binding, overrides: [] };
  });
  for (const original of library.templates.sets) {
    if (!known.some(binding => binding.globalSetId === original.id)) known.push({ setId: original.id, globalSetId: original.id, ids: {}, overrides: [] });
  }
  return known;
}
/** Site menus supply content only; recovered presentation never affects global templates. */
export function globalSiteNavigation(links: SiteLink[]): SiteLink[];
export function globalSiteNavigation(links: NavigationItem[]): NavigationItem[];
export function globalSiteNavigation(links: NavigationItem[]): NavigationItem[] {
  return links.map(link => {
    if (isNavigationSpacer(link)) return { ...link };
    const { visualStyle: _presentation, children, ...content } = link;
    void _presentation;
    return { ...content, ...(children ? { children: globalSiteNavigation(children) } : {}) };
  });
}
export function retainLegacyNavigationPresentation(links: SiteLink[], originals: SiteLink[]): SiteLink[];
export function retainLegacyNavigationPresentation(links: NavigationItem[], originals: NavigationItem[]): NavigationItem[];
export function retainLegacyNavigationPresentation(links: NavigationItem[], originals: NavigationItem[]): NavigationItem[] {
  const retained = new Map<string, NavigationItem>();
  const visit = (items: NavigationItem[]) => { for (const item of items) { retained.set(item.id, item); if (!isNavigationSpacer(item) && item.children) visit(item.children); } };
  visit(originals);
  const restore = (items: NavigationItem[]): NavigationItem[] => items.map(link => {
    if (isNavigationSpacer(link)) return { ...link };
    if (Object.keys(link).some(key => !["id", "label", "url", "opensInNewTab", "rel", "description", "children"].includes(key))) throw new Error("Menu presentation is global. Site links may change content only.");
    const original = retained.get(link.id);
    return { ...link, ...(original && !isNavigationSpacer(original) && original.visualStyle ? { visualStyle: copyTemplateData(original.visualStyle) } : {}), ...(link.children ? { children: restore(link.children) } : {}) };
  });
  return restore(links);
}
export function effectiveGlobalTemplates(store: TemplateStore, library: GlobalTemplateLibrary, bindings: GlobalTemplateBinding[]): TemplateStore {
  if (!validGlobalTemplateBindings(bindings) || new Set(bindings.map(binding => binding.setId)).size !== bindings.length || new Set(bindings.map(binding => binding.globalSetId)).size !== bindings.length) throw new Error("Invalid or duplicate global template bindings.");
  const menuBinding = bindings.find(item => item.globalSetId === "studio-global-navigation");
  const menu = store.sets.find(set => set.id === menuBinding?.setId);
  const sets = library.templates.sets.map(original => {
    const binding = bindings.find(item => item.globalSetId === original.id) ?? { setId: original.id, globalSetId: original.id, ids: {}, overrides: [] };
    const local = store.sets.find(set => set.id === binding.setId) ?? store.sets[0];
    // Legacy override patches remain recoverable in the source, but never change a global design.
    return { ...globalTemplateBase(library, binding), identity: local?.identity ?? { name: "Your Site", homeUrl: "/", copyright: "" }, navigation: globalSiteNavigation(menu?.navigation ?? local?.navigation ?? []), socialLinks: globalSiteNavigation(local?.socialLinks ?? []) };
  });
  return validateTemplateStore({ ...store, sets });
}
export function validateGlobalTemplateLibrary(value: unknown): GlobalTemplateLibrary {
  if (object(value) && (value.version as number) < 41 && containsUnsetWebsiteGradient(value.websiteDesignDefaults)) throw new Error("Unset custom gradients require global template library v41.");
  if (object(value) && (value.version as number) < 40 && containsWebsiteFont(value)) throw new Error("Website fonts require global template library v40.");
  if (object(value) && (value.version as number) < 39 && containsBoxSideOverrides(value)) throw new Error("Per-side spacing or border values require global template library v39.");
  if (object(value) && (value.version as number) < 38 && containsPullquote(value)) throw new Error("Pullquote requires global template library v38.");
  if (object(value) && (value.version as number) < 37 && containsNativeCoverVideoSource(value)) throw new Error("Native Cover video sources require global template library v37.");
  if (object(value) && (value.version as number) < 36 && containsVideoBlock(value)) throw new Error("Video blocks require global template library v36.");
  if (object(value) && (value.version as number) < 35 && containsCoverVideoBackground(value)) throw new Error("Cover video backgrounds require global template library v35.");
  if (object(value) && (value.version as number) < 34 && containsAuthoredCoverCrop(value)) throw new Error("Cover crop edits require global template library v34.");
  if (object(value) && (value.version as number) < 33 && containsCoverInnerContentWidth(value)) throw new Error("Cover inner-content width requires global template library v33.");
  if (object(value) && (value.version as number) < 32 && containsCoverContentPosition(value)) throw new Error("Cover content position requires global template library v32.");
  if (object(value) && (value.version as number) < 31 && containsCoreSocialLink(value)) throw new Error("Social Link services require global template library v31.");
  if (object(value) && (value.version as number) < 29 && containsAuthorBlockPresentation(value)) throw new Error("Author profile presentation requires global template library v29.");
  if (object(value) && (value.version as number) < 30 && containsAuthoredAuthorDuotone(value)) throw new Error("Author Duotone requires global template library v30.");
  if (object(value) && (value.version as number) < 28 && containsAuthoredImageCrop(value)) throw new Error("Image crop edits require global template library v28.");
  if (object(value) && (value.version as number) < 27 && containsCodeMonospaceFont(value)) throw new Error("Code monospace font requires global template library v27.");
  if (object(value) && (value.version as number) < 26 && containsCodeRuns(value)) throw new Error("Code inline formatting requires global template library v26.");
  if (object(value) && (value.version as number) < 25 && containsNavigationSpacer(value)) throw new Error("Navigation spacers require global template library v25.");
  if (object(value) && (value.version as number) < 24 && containsNavigationHomeLink(value)) throw new Error("Navigation Home Links require global template library v24.");
  if (object(value) && (value.version as number) < 23 && containsNavigationSearchDisplayWidth(value)) throw new Error("Navigation Search display widths require global template library v23.");
  if (object(value) && (value.version as number) < 22 && containsGridItemSizing(value)) throw new Error("Grid child spans require global template library v22.");
  if (object(value) && (value.version as number) < 21 && containsDetailsPresentation(value)) throw new Error("Details blocks require global template library v21.");
  if (object(value) && (value.version as number) < 20 && containsAuthoredFeaturedImageOverlay(value)) throw new Error("Featured Image overlays require global template library v20.");
  if (object(value) && (value.version as number) < 19 && containsNavigationSearchStyle(value)) throw new Error("Navigation Search styles require global template library v19.");
  if (object(value) && (value.version as number) < 18 && containsNavigationSearch(value)) throw new Error("Navigation Search requires global template library v18.");
  if (object(value) && (value.version as number) < 17 && containsAutomaticNavigationPageList(value)) throw new Error("Automatic Navigation Page Lists require global template library v17.");
  if (object(value) && (value.version as number) < 16 && containsPostDateTimeOverride(value)) throw new Error("Post Date overrides require global template library v16.");
  if (object(value) && (value.version as number) < 15 && containsColumnWidthUnit(value)) throw new Error("Column width units require global template library v15.");
  if (object(value) && (value.version as number) < 14 && containsFlexItemSizing(value)) throw new Error("Flex child sizing requires global template library v14.");
  if (object(value) && (value.version as number) < 13 && containsTemplateContentButtonStyle(value)) throw new Error("Content Button element colours require global template library v13.");
  if (object(value) && (value.version as number) < 12 && containsTemplateContentTagName(value)) throw new Error("Content HTML elements require global template library v12.");
  if (object(value) && (value.version as number) < 11 && containsGroupGridFillAvailableSpace(value)) throw new Error("Grid Fill available space requires global template library v11.");
  if (object(value) && (value.version as number) < 10 && containsImageResolution(value)) throw new Error("Image size selections require global template library v10.");
  if (!object(value) || value.format !== "acm-global-templates" || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41].includes(value.version as number) || !object(value.migrations)) throw new Error("Unsupported global template library.");
  if ((value.version as number) < 8 && containsButtonsAlignment(value)) throw new Error("Buttons alignment requires global template library v8.");
  if ((value.version as number) < 5 && containsExtendedImageAspectRatio(value)) throw new Error("These aspect ratios require global template library v5.");
  if ((value.version as number) < 6 && containsQuotePresentation(value)) throw new Error("Quote presentation requires global template library v6.");
  if ((value.version as number) < 7 && containsAuthoredImageDuotone(value)) throw new Error("Image Duotone requires global template library v7.");
  if ((value.version as number) < 9 && containsAuthoredFeaturedImageDuotone(value)) throw new Error("Featured Image Duotone requires global template library v9.");
  const templates = validateTemplateStore(value.templates);
  if (templates.assignments.length || value.version === 1 && templates.bin.length || templates.bin.some(item => item.kind !== "template")) throw new Error("Global templates cannot contain site assignments; global Bin records require library v2.");
  for (const item of templates.bin) {
    if (item.kind !== "template") continue;
    const set = templates.sets.find(set => set.id === item.setId);
    if (!set || [...set.templates, ...set.parts].some(entry => entry.id === item.entry.id)) throw new Error("A global Bin entry conflicts with the active library. Its source was kept.");
  }
  for (const siteId of ["test", "test2"] as const) {
    const migration = value.migrations[siteId];
    if (!object(migration) || !Array.isArray(migration.bindings) || !Array.isArray(migration.bases)) throw new Error("Unsupported template migration.");
    for (const binding of migration.bindings) {
      if (!object(binding) || typeof binding.setId !== "string" || typeof binding.globalSetId !== "string" || !object(binding.ids) || !Array.isArray(binding.overrides) || binding.overrides.length) throw new Error("Unsupported template binding.");
      if (Object.entries(binding.ids).some(([key, id]) => !safeKey(key) || typeof id !== "string")) throw new Error("Unsupported template identity.");
      globalTemplateBase(value as GlobalTemplateLibrary, binding as GlobalTemplateBinding);
    }
    validateTemplateStore({ ...templates, sets: migration.bases });
  }
  const checked = { ...value, templates } as GlobalTemplateLibrary;
  if (value.version === 1 || value.version === 2) return migrateHeaderNavigation(checked);
  if (value.websiteDesignDefaults !== undefined) checked.websiteDesignDefaults = validateWebsiteDesign(value.websiteDesignDefaults);
  if (!checked.header || !templates.sets.find(set => set.id === checked.header!.setId)?.parts.some(part => part.id === checked.header!.partId && part.kind === "header")) throw new Error("The shared Header is required for site navigation.");
  const carrier = templates.sets.find(set => set.id === "studio-global-navigation");
  if (carrier && (carrier.parts.length || carrier.templates.length)) throw new Error("Navigation belongs inside the shared Header.");
  if (checked.navigationRecovery) validateTemplateStore({ ...templates, sets: [checked.navigationRecovery], bin: [], libraryOrder: [] });
  return { ...checked, version: 41 };
}
export function validGlobalTemplateBindings(value: unknown): value is GlobalTemplateBinding[] {
  if (!Array.isArray(value) || value.length > 100) return false;
  return value.every(binding => object(binding) && Object.keys(binding).sort().join() === "globalSetId,ids,overrides,setId" && typeof binding.setId === "string" && binding.setId.length > 0 && binding.setId.length <= 160 && typeof binding.globalSetId === "string" && binding.globalSetId.length > 0 && binding.globalSetId.length <= 160 && object(binding.ids)
    && Object.entries(binding.ids).every(([key, id]) => safeKey(key) && typeof id === "string") && Array.isArray(binding.overrides) && binding.overrides.length <= 5000 && binding.overrides.every(patch => object(patch) && Array.isArray(patch.path) && patch.path.length > 0 && patch.path.length <= 40 && ["name", "templates", "parts", "styles", "defaults"].includes(patch.path[0] as string) && patch.path.every(key => typeof key === "string" && safeKey(key)) && (patch.remove === true && Object.keys(patch).sort().join() === "path,remove" || "value" in patch && Object.keys(patch).sort().join() === "path,value" || Object.keys(patch).sort().join() === "added,order,path,removed" && Array.isArray(patch.order) && Array.isArray(patch.added) && keyed(patch.added) && Array.isArray(patch.removed) && [...patch.order, ...patch.removed].every(id => typeof id === "string" && id.length > 0 && id.length <= 160) && new Set(patch.order).size === patch.order.length)));
}

/** Existing shared IDs prove common ancestry; only the explicit navigation role aliases differing IDs. */
export function createGlobalTemplateLibrary(sites: Record<LocalFixtureSiteId, { templates: TemplateStore; siteNavigation: { setId: string; partId: string } }>): GlobalTemplateLibrary {
  const templates: TemplateStore = { ...sites.test.templates, sets: [], assignments: [], bin: [] };
  const migrations = { test: { bindings: [] as GlobalTemplateBinding[], bases: [] as TemplateSet[] }, test2: { bindings: [] as GlobalTemplateBinding[], bases: [] as TemplateSet[] } };
  for (const siteId of ["test", "test2"] as const) {
    for (const local of sites[siteId].templates.sets) {
      const isNavigation = local.id === sites[siteId].siteNavigation.setId;
      const globalId = isNavigation ? "studio-global-navigation" : local.id;
      let original = templates.sets.find(set => set.id === globalId);
      if (original && !isNavigation && !same([...original.templates, ...original.parts].map(entry => [entry.id, entry.kind]), [...local.templates, ...local.parts].map(entry => [entry.id, entry.kind]))) throw new Error("Existing template identities disagree between sites. Both originals were preserved.");
      const ids: Record<string, string> = { [globalId]: local.id };
      if (isNavigation) {
        ids["studio-global-navigation-part"] = sites[siteId].siteNavigation.partId;
        const part = local.parts.find(part => part.id === sites[siteId].siteNavigation.partId)!;
        if (part.nodes.length !== 1 || part.nodes[0].type !== "element" || part.nodes[0].element !== "navigation") throw new Error("Navigation migration requires review; the existing layout was preserved.");
        ids["studio-global-navigation-block"] = part.nodes[0].id;
      }
      if (!original) {
        const inverse = Object.fromEntries(Object.entries(ids).map(([global, site]) => [site, global]));
        original = remapTemplateIds(copyTemplateData(local), inverse);
        original.id = globalId;
        original.identity = { name: "Your Site", homeUrl: "/", copyright: "" }; original.navigation = []; original.socialLinks = [];
        if (isNavigation) {
          original.parts = [{ id: "studio-global-navigation-part", name: "Navigation", kind: "header", nodes: [{ id: "studio-global-navigation-block", type: "element", element: "navigation", align: "left", layout: "row", horizontalAlign: "left", allowWrap: true, overlayMenu: "never", submenuOpenOnClick: false, showSubmenuIcon: true, ariaLabel: "Site navigation" }] }];
        }
        templates.sets.push(original);
      }
      const binding = { setId: local.id, globalSetId: globalId, ids, overrides: [] };
      migrations[siteId].bindings.push(binding);
      migrations[siteId].bases.push({ ...remapTemplateIds(original, ids), id: local.id });
    }
  }
  return migrateHeaderNavigation({ format: "acm-global-templates", version: 41, templates, migrations });
}

/** Scope navigation uses the same global-to-site aliases as materialisation. */
export function globalTemplateScopeTarget(binding: GlobalTemplateBinding | undefined, setId: string, targetId: string, scope: "global" | "site") {
  return {
    setId: scope === "site" ? binding?.setId ?? setId : binding?.globalSetId ?? setId,
    targetId: scope === "site" ? binding?.ids[targetId] ?? targetId : Object.entries(binding?.ids ?? {}).find(([, siteId]) => siteId === targetId)?.[0] ?? targetId,
    scope,
  };
}

/** v3 retires only the dedicated original; site menu owners and aliases stay intact. */
export function migrateHeaderNavigation(source: GlobalTemplateLibrary): GlobalTemplateLibrary {
  const library = copyTemplateData(source);
  const carrier = library.templates.sets.find(set => set.id === "studio-global-navigation");
  const candidates = library.templates.sets.flatMap(set => set.id === "studio-global-navigation" ? [] : set.parts.filter(part => part.kind === "header").map(part => ({ set, part })));
  if (candidates.length > 1) throw new Error("The shared Header is ambiguous. Choose its role before migration; existing data was kept.");
  if (!candidates.length && carrier) {
    const set = { ...copyTemplateData(carrier), id: "studio-global-header", name: "Shared presentation", templates: [], parts: [{ id: "studio-global-header-part", name: "Header", kind: "header" as const, nodes: [{ id: "studio-global-header-row", type: "group" as const, layout: "row" as const, horizontalAlign: "space-between" as const, children: [{ id: "studio-global-header-identity", type: "element" as const, element: "site-identity" as const }, { id: "studio-global-header-menu", type: "element" as const, element: "navigation" as const }] }] }] };
    library.templates.sets.unshift(set); candidates.push({ set, part: set.parts[0] });
  }
  const headerSet = candidates[0]?.set;
  const header = candidates[0]?.part;
  if (!headerSet || !header) throw new Error("A shared Header is required before navigation can migrate. Existing data was kept.");
  const expandedNavigation = (nodes: TemplateNode[], seen = new Set<string>()): boolean => nodes.some(node => {
    if (node.type === "element" && node.element === "navigation") return true;
    if (node.type === "part" && !seen.has(node.partId)) {
      const part = headerSet.parts.find(part => part.id === node.partId);
      return Boolean(part && expandedNavigation(part.nodes, new Set([...seen, part.id])));
    }
    return "children" in node && Array.isArray(node.children) && expandedNavigation(node.children as TemplateNode[], seen);
  });
  if (!expandedNavigation(header.nodes)) {
    const ids = new Set<string>();
    for (const entry of [...headerSet.templates, ...headerSet.parts]) visitTemplateNodes(entry.nodes, node => ids.add(node.id));
    let id = "studio-header-navigation";
    for (let suffix = 1; ids.has(id); suffix++) id = `studio-header-navigation-${suffix}`;
    header.nodes.push({ id, type: "element", element: "navigation" });
  }
  // Keep the newest envelope version when normalising an already-current
  // library; older unversioned navigation migrations still materialise v8.
  library.version = source.version >= 41 ? 41 : source.version >= 40 ? 40 : source.version >= 39 ? 39 : source.version >= 38 ? 38 : source.version >= 37 ? 37 : source.version >= 36 ? 37 : source.version >= 35 ? 35 : source.version >= 34 ? 34 : source.version >= 33 ? 33 : source.version >= 32 ? 32 : source.version >= 31 ? 31 : source.version >= 30 ? 30 : source.version >= 29 ? 29 : source.version >= 28 ? 28 : source.version >= 27 ? 27 : source.version >= 26 ? 26 : source.version >= 17 ? 17 : source.version >= 12 ? 13 : 8;
  library.header = { setId: headerSet.id, partId: header.id };
  if (carrier) {
    library.navigationRecovery = copyTemplateData(carrier);
    carrier.parts = []; carrier.templates = [];
    library.templates.libraryOrder = library.templates.libraryOrder?.filter(item => item.setId !== carrier.id);
  }
  return validateGlobalTemplateLibrary(library);
}

export function sharedHeaderReference(store: TemplateStore, library: GlobalTemplateLibrary, bindings: GlobalTemplateBinding[]) {
  if (!library.header) return;
  const binding = bindings.find(item => item.globalSetId === library.header!.setId);
  const setId = binding?.setId ?? library.header.setId;
  const partId = binding?.ids[library.header.partId] ?? library.header.partId;
  return store.sets.find(set => set.id === setId)?.parts.some(part => part.id === partId) ? { setId, partId } : undefined;
}

export function templateContainsHeader(nodes: TemplateNode[], set: TemplateSet): boolean {
  return nodes.some(node => !node.editorial?.hidden && (node.type === "part" ? set.parts.some(part => part.id === node.partId && (part.kind === "header" || templateContainsHeader(part.nodes, set)))
    : "children" in node && Array.isArray(node.children) && templateContainsHeader(node.children as TemplateNode[], set)));
}
