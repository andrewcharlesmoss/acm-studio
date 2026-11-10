import { AcmIcon } from "@acm/icons/react";
import type { ContentBlock } from "../content/model";
import { isNavigationSpacer, type NavigationItem, type SiteLink } from "./template-model";
import type { StudioListViewEntry } from "./studio-presentation";

export function navigationListViewEntries(block: ContentBlock, links: NavigationItem[], selection: { blockId: string; linkId: string | null; child?: "search" | "page-list" } | null, onSelectLink: (ownerId: string, linkId: string) => void, onSelectSearch: (ownerId: string) => void, pageListContext?: { ownerId: string; links: SiteLink[]; onSelect: (ownerId: string, blockId: string) => void }): StudioListViewEntry[] | undefined {
  if (block.type === "navigation-page-list" && pageListContext) {
    const pageEntry = (page: SiteLink): StudioListViewEntry => ({ id: `${block.id}:page:${page.id}`, label: page.label, icon: <AcmIcon name="view.pages" size={16} />, onSelect: () => pageListContext.onSelect(pageListContext.ownerId, block.id), children: page.children?.filter((child): child is SiteLink => !isNavigationSpacer(child)).map(pageEntry) });
    return pageListContext.links.map(pageEntry);
  }
  if (block.type !== "group" || block.data?.templateElement !== "navigation") return undefined;
  const ownerId = block.id;
  const entry = (link: NavigationItem): StudioListViewEntry => ({
    id: `${ownerId}:navigation:${link.id}`,
    label: isNavigationSpacer(link) ? "Spacer" : link.label,
    icon: <AcmIcon name={isNavigationSpacer(link) ? "layout.spacer" : "action.link"} size={16} />,
    selected: selection?.blockId === ownerId && !selection.child && selection.linkId === link.id,
    onSelect: () => onSelectLink(ownerId, link.id),
    children: !isNavigationSpacer(link) && link.children ? link.children.map(entry) : undefined,
  });
  const rows = links.map(entry);
  const pageList = block.children.find(child => child.type === "navigation-page-list");
  if (pageList?.type === "navigation-page-list") rows.splice(Math.min(pageList.position ?? 0, rows.length), 0, { id: pageList.id, label: "Page List", blockId: pageList.id });
  if (block.data.searchEnabled === true) rows.splice(Math.min(Number(block.data.searchPosition ?? 0), rows.length), 0, { id: `${ownerId}:search`, label: "Search", icon: <AcmIcon name="action.search" size={16} />, selected: selection?.blockId === ownerId && selection.child === "search", onSelect: () => onSelectSearch(ownerId) });
  return rows;
}
