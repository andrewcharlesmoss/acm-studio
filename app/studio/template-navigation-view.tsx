"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import { safeTextLink } from "../content/rich-text";
import { paragraphStyleToCss, paragraphStyleClassName, paragraphStyleAnchor } from "../content/paragraph-styles";
import { isNavigationSpacer, type NavigationTemplateNode, type NavigationItem, type SiteLink } from "./template-model";
import { StudioIcon } from "./studio-icons";
import { attachNavigationRuntime } from "./navigation-runtime";
import { navigationLinkRel } from "./navigation-items";
import { navigationSearchStyleTargets } from "./navigation-search";

export function TemplateNavigationView({ node, links, pageListLinks = [], documentHref, homeHref = "/", renderLink, overlayContent, suppressLinkAnchors = false, searchEntries }: {
  node: NavigationTemplateNode; links: NavigationItem[]; pageListLinks?: SiteLink[]; documentHref?: string; homeHref?: string; renderLink?: (link: SiteLink) => ReactNode; overlayContent?: ReactNode; suppressLinkAnchors?: boolean; searchEntries?: () => Array<{ title: string; href: string; text: string }>;
}) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    return attachNavigationRuntime(element, searchEntries);
  }, [node.overlayMenu, node.showIcon, node.icon, node.overlayPartId, overlayContent, links, suppressLinkAnchors, pageListLinks, searchEntries]);
  const list = (items: NavigationItem[], anchors = true, includePageList = false): ReactNode => {
    const hasPageList = includePageList && node.automaticPageList && pageListLinks.length > 0;
    const pageListPosition = Math.max(0, Math.min(items.length, node.automaticPageListPosition ?? items.length));
    const hasSearch = includePageList && node.searchEnabled === true;
    const searchPosition = Math.max(0, Math.min(items.length, node.searchPosition ?? items.length));
    const entries: ReactNode[] = [];
    const appendExtras = (index: number) => {
      if (hasSearch && searchPosition === index) {
        const buttonPosition = node.searchButtonPosition ?? "outside";
        const buttonOnly = buttonPosition === "button-only";
        const target = navigationSearchStyleTargets(node.searchVisualStyle, buttonPosition);
        const fieldId = `navigation-search-${node.id}-${anchors ? "menu" : "overlay"}`;
        const displayWidth = node.searchDisplayWidth === undefined ? undefined : `${node.searchDisplayWidth}${node.searchDisplayWidthUnit ?? "px"}`;
        entries.push(<li key="navigation-search" id={anchors ? paragraphStyleAnchor(target.rootStyle) : undefined} className={["template-navigation-search-item", paragraphStyleClassName(target.rootStyle)].filter(Boolean).join(" ")} style={{ ...paragraphStyleToCss(target.rootStyle), ...(displayWidth ? { width: displayWidth, flexBasis: displayWidth } : {}) }}><form data-navigation-search data-button-position={buttonPosition} style={{ "--navigation-search-width": `${node.searchWidth ?? 100}%` } as CSSProperties}>
          <label htmlFor={fieldId} style={paragraphStyleToCss(target.labelStyle)}><span className={node.searchLabelVisible === false ? "visually-hidden" : undefined}>Search</span></label>
          <div className="template-navigation-search-inside-wrapper" style={paragraphStyleToCss(target.wrapperStyle)}>
            <input id={fieldId} type="search" name="s" placeholder={node.searchPlaceholder || undefined} aria-label={node.searchLabelVisible === false ? "Search" : undefined} hidden={buttonOnly} style={{ ...paragraphStyleToCss(target.fieldStyle), width: "var(--navigation-search-width, 100%)" }} />
            {buttonPosition !== "no-button" ? <button type={buttonOnly ? "button" : "submit"} aria-label={buttonOnly ? "Open search" : "Search"} title={buttonOnly ? "Open search" : "Search"} aria-expanded={buttonOnly ? false : undefined} data-navigation-search-reveal={buttonOnly ? "true" : undefined} data-icon={node.searchButtonUseIcon ? "true" : undefined} style={paragraphStyleToCss(target.buttonStyle)}>{node.searchButtonUseIcon ? <AcmIcon name="action.search" size={20} /> : "Search"}</button> : null}
          </div>
          <div className="template-navigation-search-results" data-navigation-search-results aria-live="polite" hidden />
        </form></li>);
      }
      if (hasPageList && pageListPosition === index) entries.push(<li key="automatic-page-list" className="template-navigation-page-list" data-navigation-page-list>{pageList(pageListLinks, anchors)}</li>);
    };
    items.forEach((link, index) => {
      appendExtras(index);
      if (isNavigationSpacer(link)) {
        entries.push(<li key={link.id} className="template-navigation-spacer-item" data-navigation-axis={node.layout === "stack" ? "vertical" : "horizontal"} aria-hidden="true"><span className="template-navigation-spacer" style={{ width: `${link.width}px`, height: `${link.height}px`, flex: "0 0 auto" }} /></li>);
        return;
      }
      entries.push(<li key={link.id} id={anchors ? paragraphStyleAnchor(link.visualStyle) : undefined} data-navigation-anchor={paragraphStyleAnchor(link.visualStyle)} style={paragraphStyleToCss(link.visualStyle)} className={[link.children?.length ? "has-submenu" : "", paragraphStyleClassName(link.visualStyle)].filter(Boolean).join(" ") || undefined}>
        {/* Dynamic rel retains authored tokens and always adds both isolation tokens for _blank. */}
        {/* eslint-disable-next-line react/jsx-no-target-blank */}
        <div className="template-navigation-link-row"><span className="template-navigation-link-label" style={paragraphStyleToCss({ ...link.visualStyle, additionalCss: undefined })}>{renderLink?.(link) ?? <a href={safeTextLink(link.homeLink ? homeHref : link.url) ?? undefined} aria-current={(link.homeLink ? homeHref : link.url) === documentHref ? "page" : undefined} target={link.opensInNewTab ? "_blank" : undefined} rel={navigationLinkRel(link)} title={link.description || undefined}>{link.label}</a>}</span>
          {link.children?.length ? <details className="template-navigation-submenu"><summary aria-label={`Open ${link.label} submenu`}><StudioIcon name="chevron-down" size={16} /><span className="visually-hidden">{link.label} submenu</span></summary>{list(link.children, anchors)}</details> : null}
        </div>
      </li>);
    });
    appendExtras(items.length);
    return <ul className="template-navigation-items">{entries}</ul>;
  };
  const pageList = (items: NavigationItem[], anchors = true): ReactNode => <ul className="template-navigation-items template-navigation-page-list-items">{items.filter(link => !isNavigationSpacer(link)).map(link => { if (isNavigationSpacer(link)) return null; return <li key={link.id} id={anchors ? paragraphStyleAnchor(link.visualStyle) : undefined} data-navigation-anchor={paragraphStyleAnchor(link.visualStyle)} style={paragraphStyleToCss(link.visualStyle)}>
    {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
    <span className="template-navigation-link-label" style={paragraphStyleToCss({ ...link.visualStyle, additionalCss: undefined })}>{renderLink?.(link) ?? <a href={safeTextLink(link.url) ?? undefined} aria-current={link.url === documentHref ? "page" : undefined}>{link.label}</a>}</span>
    {link.children?.length ? pageList(link.children, anchors) : null}
  </li>;})}</ul>;
  return <nav ref={root} id={paragraphStyleAnchor(node.visualStyle)} data-navigation-anchor={paragraphStyleAnchor(node.visualStyle)} aria-label={node.ariaLabel || "Site navigation"} className={["template-navigation acm-navigation", paragraphStyleClassName(node.visualStyle)].filter(Boolean).join(" ")} data-navigation-layout={node.layout ?? "row"} data-navigation-align={node.horizontalAlign ?? node.align ?? "left"} data-navigation-overlay={node.overlayMenu ?? "never"} data-navigation-custom-overlay={overlayContent ? "true" : undefined} data-submenu-click={node.submenuOpenOnClick || undefined} data-submenu-icon={node.showSubmenuIcon === false ? "hidden" : undefined} style={{ ...paragraphStyleToCss(node.visualStyle), "--navigation-submenu-text": node.submenuTextColor, "--navigation-submenu-background": node.submenuBackgroundColor, justifyContent: node.horizontalAlign === "centre" || !node.horizontalAlign && node.align === "centre" ? "center" : node.horizontalAlign === "right" || !node.horizontalAlign && node.align === "right" ? "flex-end" : node.horizontalAlign === "space-between" ? "space-between" : "flex-start", flexWrap: node.allowWrap === false ? "nowrap" : "wrap", gap: node.gap === undefined ? undefined : `${node.gap}px` } as CSSProperties}>
    <div className="template-navigation-desktop">{list(links, !suppressLinkAnchors, true)}</div>
    <details className="template-navigation-overlay"><summary aria-label="Open menu">{node.showIcon === false ? "Menu" : <><AcmIcon name={node.icon === "handle" ? "navigation.menu-compact" : "navigation.menu"} size={24} /><span className="visually-hidden">Menu</span></>}</summary><div className="template-navigation-overlay-content"><button type="button" data-navigation-close aria-label="Close menu" title="Close menu">{node.showIcon === false ? "Close" : <StudioIcon name="close" />}</button>{overlayContent ?? list(links, false, true)}</div></details>
  </nav>;
}
