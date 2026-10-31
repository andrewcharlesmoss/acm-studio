"use client";

import type { NavigationTemplateNode, SiteLink } from "../template-model";
import type { PreviewBlockStyle } from "./blocks-preview-model";
import { TemplateNavigationView } from "../template-navigation-view";

const links: SiteLink[] = [
  { id: "style-book-navigation-home", label: "Home", url: "#home" },
  {
    id: "style-book-navigation-stories",
    label: "Stories",
    url: "#stories",
    children: [{ id: "style-book-navigation-latest", label: "Latest", url: "#latest" }],
  },
  { id: "style-book-navigation-about", label: "About", url: "#about" },
];

/** Shared, non-persistent Navigation specimen for the Site Editor Style Book. */
export function NavigationStyleSpecimen({ style = {} }: { style?: PreviewBlockStyle }) {
  const node: NavigationTemplateNode = {
    id: "style-book-navigation",
    type: "element",
    element: "navigation",
    layout: "row",
    horizontalAlign: "left",
    overlayMenu: "never",
    showSubmenuIcon: true,
    visualStyle: { className: "site-block-style-navigation" },
  };
  // Submenu colours are dedicated Navigation fields in the production renderer.
  node.submenuTextColor = style.navigationSubmenuTextColor;
  node.submenuBackgroundColor = style.navigationSubmenuBackgroundColor;
  return <div className="template-surface" data-preview-block-id="navigation"><TemplateNavigationView node={node} links={links} suppressLinkAnchors /></div>;
}
