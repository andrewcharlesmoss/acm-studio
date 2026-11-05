import type { NavigationItem } from "../template-model";
import type { HostedSitePreview } from "../site-editor/hosted-home-contract";
import type { CurrentTestSiteCollection } from "./contract";

/** Resolve a Navigation block against the current hosted draft, when available. */
export function fixtureNavigationMenuLinks(
  navigationId: string,
  site: CurrentTestSiteCollection,
  fallback: NavigationItem[],
  preview?: HostedSitePreview["navigation"] | null,
): NavigationItem[] {
  const assignments = preview?.assignments ?? site.navigationAssignments;
  const defaultMenuId = preview?.defaultMenuId ?? site.defaultNavigationMenuId;
  const menus = preview?.menus ?? site.navigationMenus;
  const menuId = assignments.find(item => item.navigationId === navigationId)?.menuId ?? defaultMenuId;
  return menus.find(menu => menu.id === menuId)?.links ?? fallback;
}
