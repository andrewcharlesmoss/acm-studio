import { isNavigationSpacer, type NavigationItem, type SiteLink } from "./template-model";

export function navigationEntries(links: NavigationItem[], depth = 0): { link: NavigationItem; depth: number; siblings: NavigationItem[]; index: number }[] {
  return links.flatMap((link, index) => [{ link, depth, siblings: links, index }, ...navigationEntries(!isNavigationSpacer(link) ? link.children ?? [] : [], depth + 1)]);
}

export function updateNavigationItem(links: NavigationItem[], id: string, update: (link: NavigationItem) => NavigationItem): NavigationItem[] {
  return links.map(link => link.id === id ? update(link) : !isNavigationSpacer(link) && link.children ? { ...link, children: updateNavigationItem(link.children, id, update) } : link);
}

export function removeNavigationItem(links: NavigationItem[], id: string): NavigationItem[] {
  return links.filter(link => link.id !== id).map(link => !isNavigationSpacer(link) && link.children ? { ...link, children: removeNavigationItem(link.children, id) } : link);
}

export function moveNavigationItem(links: NavigationItem[], id: string, direction: -1 | 1): NavigationItem[] {
  const index = links.findIndex(link => link.id === id);
  if (index >= 0) {
    const next = [...links];
    if (index + direction >= 0 && index + direction < next.length) [next[index], next[index + direction]] = [next[index + direction], next[index]];
    return next;
  }
  return links.map(link => !isNavigationSpacer(link) && link.children ? { ...link, children: moveNavigationItem(link.children, id, direction) } : link);
}

export function insertNavigationItem(links: NavigationItem[], item: NavigationItem, parentId?: string, afterId?: string): NavigationItem[] {
  if (parentId) return updateNavigationItem(links, parentId, link => isNavigationSpacer(link) ? link : ({ ...link, children: insertNavigationItem(link.children ?? [], item, undefined, afterId) }));
  const index = afterId ? links.findIndex(link => link.id === afterId) : -1;
  if (index >= 0) return [...links.slice(0, index + 1), item, ...links.slice(index + 1)];
  if (afterId) return links.map(link => !isNavigationSpacer(link) && link.children ? { ...link, children: insertNavigationItem(link.children, item, undefined, afterId) } : link);
  return [...links, item];
}

export function navigationLinkRel(link: SiteLink): string | undefined {
  return [...new Set([...(link.rel ?? "").split(/\s+/).filter(Boolean), ...(link.opensInNewTab ? ["noopener", "noreferrer"] : [])])].join(" ") || undefined;
}

/** Dragging moves within the existing sibling list; it never reparents a submenu. */
export function reorderNavigationItem(links: NavigationItem[], id: string, targetId: string, edge?: "before" | "after"): NavigationItem[] | null {
  const entries = navigationEntries(links);
  const source = entries.find(entry => entry.link.id === id);
  const target = entries.find(entry => entry.link.id === targetId);
  if (!source || !target || source.siblings !== target.siblings || source.index === target.index) return null;
  const reordered = [...source.siblings];
  reordered.splice(source.index, 1);
  const targetIndex = reordered.findIndex(link => link.id === targetId);
  const insertion = edge ? targetIndex + (edge === "after" ? 1 : 0) : target.index;
  if (insertion === source.index) return null;
  reordered.splice(insertion, 0, source.link);
  const replace = (items: NavigationItem[]): NavigationItem[] => items === source.siblings ? reordered : items.map(link => !isNavigationSpacer(link) && link.children ? { ...link, children: replace(link.children) } : link);
  return replace(links);
}
