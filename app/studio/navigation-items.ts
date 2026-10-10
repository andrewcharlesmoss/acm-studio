import type { SiteLink } from "./template-model";

export function navigationEntries(links: SiteLink[], depth = 0): { link: SiteLink; depth: number; siblings: SiteLink[]; index: number }[] {
  return links.flatMap((link, index) => [{ link, depth, siblings: links, index }, ...navigationEntries(link.children ?? [], depth + 1)]);
}

export function updateNavigationItem(links: SiteLink[], id: string, update: (link: SiteLink) => SiteLink): SiteLink[] {
  return links.map(link => link.id === id ? update(link) : link.children ? { ...link, children: updateNavigationItem(link.children, id, update) } : link);
}

export function removeNavigationItem(links: SiteLink[], id: string): SiteLink[] {
  return links.filter(link => link.id !== id).map(link => link.children ? { ...link, children: removeNavigationItem(link.children, id) } : link);
}

export function moveNavigationItem(links: SiteLink[], id: string, direction: -1 | 1): SiteLink[] {
  const index = links.findIndex(link => link.id === id);
  if (index >= 0) {
    const next = [...links];
    if (index + direction >= 0 && index + direction < next.length) [next[index], next[index + direction]] = [next[index + direction], next[index]];
    return next;
  }
  return links.map(link => link.children ? { ...link, children: moveNavigationItem(link.children, id, direction) } : link);
}

export function insertNavigationItem(links: SiteLink[], item: SiteLink, parentId?: string, afterId?: string): SiteLink[] {
  if (parentId) return updateNavigationItem(links, parentId, link => ({ ...link, children: insertNavigationItem(link.children ?? [], item, undefined, afterId) }));
  const index = afterId ? links.findIndex(link => link.id === afterId) : -1;
  if (index >= 0) return [...links.slice(0, index + 1), item, ...links.slice(index + 1)];
  if (afterId) return links.map(link => link.children ? { ...link, children: insertNavigationItem(link.children, item, undefined, afterId) } : link);
  return [...links, item];
}

export function navigationLinkRel(link: SiteLink): string | undefined {
  return [...new Set([...(link.rel ?? "").split(/\s+/).filter(Boolean), ...(link.opensInNewTab ? ["noopener", "noreferrer"] : [])])].join(" ") || undefined;
}

/** Dragging moves within the existing sibling list; it never reparents a submenu. */
export function reorderNavigationItem(links: SiteLink[], id: string, targetId: string): SiteLink[] | null {
  const entries = navigationEntries(links);
  const source = entries.find(entry => entry.link.id === id);
  const target = entries.find(entry => entry.link.id === targetId);
  if (!source || !target || source.siblings !== target.siblings || source.index === target.index) return null;
  const reordered = [...source.siblings];
  reordered.splice(source.index, 1);
  reordered.splice(target.index, 0, source.link);
  const replace = (items: SiteLink[]): SiteLink[] => items === source.siblings ? reordered : items.map(link => link.children ? { ...link, children: replace(link.children) } : link);
  return replace(links);
}
