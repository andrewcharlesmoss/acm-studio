import type { StudioDocument } from "./editor-model";
import { templateId, type NavigationItem, type SiteLink } from "./template-model";
import { navigationEntries } from "./navigation-items";

/** Derive the live Page List from the current site's page records. */
export function navigationPageListLinks(documents: readonly StudioDocument[], href: (document: StudioDocument) => string): SiteLink[] {
  const pages = documents.filter(document => document.kind === "page");
  const ids = new Set(pages.map(page => page.id));
  const children = new Map<string | undefined, StudioDocument[]>();
  for (const page of pages) {
    const parentId = page.parentPageId && ids.has(page.parentPageId) ? page.parentPageId : undefined;
    children.set(parentId, [...(children.get(parentId) ?? []), page]);
  }
  const build = (parentId: string | undefined, ancestors = new Set<string>()): SiteLink[] =>
    (children.get(parentId) ?? []).filter(page => !ancestors.has(page.id)).map(page => {
      const nextAncestors = new Set(ancestors).add(page.id);
      const nested = build(page.id, nextAncestors);
      return { id: `page-list-${page.id}`, label: page.title || "Untitled", url: href(page), ...(nested.length ? { children: nested } : {}) };
    });
  return build(undefined);
}

/** Turn the current generated Page List into ordinary, independently editable menu links. */
export function canMaterializeNavigationPageList(menu: readonly NavigationItem[], pages: readonly SiteLink[], position: number): boolean {
  if (!pages.length || !Number.isInteger(position) || position < 0 || position > menu.length) return false;
  const existingEntries = navigationEntries([...menu]);
  const pageEntries = navigationEntries([...pages]);
  return existingEntries.length + pageEntries.length <= 100 && pageEntries.every(entry => entry.depth <= 5);
}

/** Turn the current generated Page List into ordinary, independently editable menu links. */
export function materializeNavigationPageList(menu: readonly NavigationItem[], pages: readonly SiteLink[], position: number): NavigationItem[] | null {
  if (!canMaterializeNavigationPageList(menu, pages, position)) return null;

  const makeLink = (page: SiteLink): SiteLink => ({
    ...page,
    id: templateId(),
    children: page.children?.filter((child): child is SiteLink => !("type" in child && child.type === "spacer")).map(makeLink),
  });
  const next = [...menu];
  next.splice(position, 0, ...pages.map(makeLink));
  return next;
}
