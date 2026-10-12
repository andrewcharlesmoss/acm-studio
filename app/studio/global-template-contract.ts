import { copyTemplateData, validateTemplateStore, type SiteLink, type TemplateSet, type TemplateStore } from "./template-model";
import type { LocalFixtureSiteId } from "./test-site/sites";

export type TemplatePropertyOverride = { path: string[]; value?: unknown; remove?: true; order?: string[]; added?: unknown[]; removed?: string[] };
export type GlobalTemplateBinding = { setId: string; globalSetId: string; ids: Record<string, string>; overrides: TemplatePropertyOverride[] };
export type GlobalTemplateLibrary = { format: "acm-global-templates"; version: 1; templates: TemplateStore; migrations: Record<LocalFixtureSiteId, { bindings: GlobalTemplateBinding[]; bases: TemplateSet[] }> };
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const safeKey = (key: string) => key !== "__proto__" && key !== "constructor" && key !== "prototype";

/** Shared original creation is retained: an inverse may edit, but not remove it. */
export function globalTemplateChangeCanUndo(before: TemplateStore, after: TemplateStore): boolean {
  return after.sets.every(set => {
    const previous = before.sets.find(item => item.id === set.id);
    return previous && [...set.templates, ...set.parts].every(entry => [...previous.templates, ...previous.parts].some(item => item.id === entry.id && item.kind === entry.kind));
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
export function globalSiteNavigation(links: SiteLink[]): SiteLink[] {
  return links.map(({ visualStyle: _presentation, children, ...content }) => {
    void _presentation;
    return { ...content, ...(children ? { children: globalSiteNavigation(children) } : {}) };
  });
}
export function retainLegacyNavigationPresentation(links: SiteLink[], originals: SiteLink[]): SiteLink[] {
  const retained = new Map<string, SiteLink>();
  const visit = (items: SiteLink[]) => { for (const item of items) { retained.set(item.id, item); if (item.children) visit(item.children); } };
  visit(originals);
  const restore = (items: SiteLink[]): SiteLink[] => items.map(link => {
    if (Object.keys(link).some(key => !["id", "label", "url", "opensInNewTab", "rel", "description", "children"].includes(key))) throw new Error("Menu presentation is global. Site links may change content only.");
    const original = retained.get(link.id);
    return { ...link, ...(original?.visualStyle ? { visualStyle: copyTemplateData(original.visualStyle) } : {}), ...(link.children ? { children: restore(link.children) } : {}) };
  });
  return restore(links);
}
export function effectiveGlobalTemplates(store: TemplateStore, library: GlobalTemplateLibrary, bindings: GlobalTemplateBinding[]): TemplateStore {
  if (!validGlobalTemplateBindings(bindings) || new Set(bindings.map(binding => binding.setId)).size !== bindings.length || new Set(bindings.map(binding => binding.globalSetId)).size !== bindings.length) throw new Error("Invalid or duplicate global template bindings.");
  const sets = library.templates.sets.map(original => {
    const binding = bindings.find(item => item.globalSetId === original.id) ?? { setId: original.id, globalSetId: original.id, ids: {}, overrides: [] };
    const local = store.sets.find(set => set.id === binding.setId) ?? store.sets[0];
    // Legacy override patches remain recoverable in the source, but never change a global design.
    return { ...globalTemplateBase(library, binding), identity: local?.identity ?? { name: "Your Site", homeUrl: "/", copyright: "" }, navigation: globalSiteNavigation(local?.navigation ?? []), socialLinks: globalSiteNavigation(local?.socialLinks ?? []) };
  });
  return validateTemplateStore({ ...store, sets });
}
export function validateGlobalTemplateLibrary(value: unknown): GlobalTemplateLibrary {
  if (!object(value) || value.format !== "acm-global-templates" || value.version !== 1 || !object(value.migrations)) throw new Error("Unsupported global template library.");
  const templates = validateTemplateStore(value.templates);
  if (templates.assignments.length || templates.bin.length) throw new Error("Global templates cannot contain site assignments or site Bin records.");
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
  return { ...value, templates } as GlobalTemplateLibrary;
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
  return validateGlobalTemplateLibrary({ format: "acm-global-templates", version: 1, templates, migrations });
}

/** Scope navigation uses the same global-to-site aliases as materialisation. */
export function globalTemplateScopeTarget(binding: GlobalTemplateBinding | undefined, setId: string, targetId: string, scope: "global" | "site") {
  return {
    setId: scope === "site" ? binding?.setId ?? setId : binding?.globalSetId ?? setId,
    targetId: scope === "site" ? binding?.ids[targetId] ?? targetId : Object.entries(binding?.ids ?? {}).find(([, siteId]) => siteId === targetId)?.[0] ?? targetId,
    scope,
  };
}
