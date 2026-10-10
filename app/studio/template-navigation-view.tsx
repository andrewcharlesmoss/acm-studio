"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import { safeTextLink } from "../content/rich-text";
import { paragraphStyleToCss, paragraphStyleClassName } from "../content/paragraph-styles";
import type { NavigationTemplateNode, SiteLink } from "./template-model";
import { StudioIcon } from "./studio-icons";
import { attachNavigationRuntime } from "./navigation-runtime";
import { navigationLinkRel } from "./navigation-items";

export function TemplateNavigationView({ node, links, documentHref, renderLink, overlayContent }: {
  node: NavigationTemplateNode; links: SiteLink[]; documentHref?: string; renderLink?: (link: SiteLink) => ReactNode; overlayContent?: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    return attachNavigationRuntime(element);
  }, [node.overlayMenu, node.showIcon, node.icon, node.overlayPartId, overlayContent]);
  const list = (items: SiteLink[]): ReactNode => <ul className="template-navigation-items">{items.map(link => <li key={link.id} className={[link.children?.length ? "has-submenu" : "", paragraphStyleClassName(link.visualStyle)].filter(Boolean).join(" ") || undefined}>
    {/* Dynamic rel retains authored tokens and always adds both isolation tokens for _blank. */}
    {/* eslint-disable-next-line react/jsx-no-target-blank */}
    <div className="template-navigation-link-row"><span className="template-navigation-link-label" style={paragraphStyleToCss(link.visualStyle)}>{renderLink?.(link) ?? <a href={safeTextLink(link.url) ?? undefined} aria-current={link.url === documentHref ? "page" : undefined} target={link.opensInNewTab ? "_blank" : undefined} rel={navigationLinkRel(link)} title={link.description || undefined}>{link.label}</a>}</span>
      {link.children?.length ? <details className="template-navigation-submenu"><summary aria-label={`Open ${link.label} submenu`}><StudioIcon name="chevron-down" size={16} /><span className="visually-hidden">{link.label} submenu</span></summary>{list(link.children)}</details> : null}
    </div>
  </li>)}</ul>;
  return <nav ref={root} aria-label={node.ariaLabel || "Site navigation"} className="template-navigation acm-navigation" data-navigation-layout={node.layout ?? "row"} data-navigation-align={node.horizontalAlign ?? node.align ?? "left"} data-navigation-overlay={node.overlayMenu ?? "never"} data-navigation-custom-overlay={overlayContent ? "true" : undefined} data-submenu-click={node.submenuOpenOnClick || undefined} data-submenu-icon={node.showSubmenuIcon === false ? "hidden" : undefined} style={{ ...paragraphStyleToCss(node.visualStyle), "--navigation-submenu-text": node.submenuTextColor, "--navigation-submenu-background": node.submenuBackgroundColor, justifyContent: node.horizontalAlign === "centre" || !node.horizontalAlign && node.align === "centre" ? "center" : node.horizontalAlign === "right" || !node.horizontalAlign && node.align === "right" ? "flex-end" : node.horizontalAlign === "space-between" ? "space-between" : "flex-start", flexWrap: node.allowWrap === false ? "nowrap" : "wrap", gap: node.gap === undefined ? undefined : `${node.gap}px` } as CSSProperties}>
    <div className="template-navigation-desktop">{list(links)}</div>
    <details className="template-navigation-overlay"><summary aria-label="Open menu">{node.showIcon === false ? "Menu" : <><AcmIcon name={node.icon === "handle" ? "navigation.menu-compact" : "navigation.menu"} size={24} /><span className="visually-hidden">Menu</span></>}</summary><div className="template-navigation-overlay-content"><button type="button" data-navigation-close aria-label="Close menu" title="Close menu">{node.showIcon === false ? "Close" : <StudioIcon name="close" />}</button>{overlayContent ?? list(links)}</div></details>
  </nav>;
}
