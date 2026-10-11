"use client";

import { useId, useRef, useState } from "react";
import { AcmIcon } from "@acm/icons/react";
import type { ContentBlock } from "../content/model";
import { safeTextLink } from "../content/rich-text";
import { equivalentLinkDestination, updatedLinkDestination } from "../content/link-destination";
import { PaneTabs, paneTabTarget } from "./panes/pane-components";
import { AdvancedFieldsControl } from "./controls/advanced-fields-control";
import { LinkDestinationPopover } from "./controls/link-destination-popover";
import { ToggleSetting } from "./controls/toggle-setting";
import { ParagraphInspector } from "./blocks/inspectors/paragraph-inspector";
import { pageLinkStyleProfile } from "./blocks/capability-profiles";
import { InspectorAccordionSection } from "./inspector-accordion";
import { StudioIcon } from "./studio-icons";
import { navigationEntries, updateNavigationItem } from "./navigation-items";
import { LinkSetting, type NavigationEditingProps } from "./template-navigation-editor";
import type { SiteLink } from "./template-model";
import { ProjectLocalDocumentLink } from "./project-local-links";
import type { LocalFixtureSiteId } from "./test-site/sites";

/** Selection is transient; every edit targets the canonical Navigation entry. */
export function PageLinkInspector(props: NavigationEditingProps & { onView?: (link: SiteLink) => void; siteId?: LocalFixtureSiteId; contentOnly?: boolean }) {
  const tabId = useId();
  const [tab, setTab] = useState("content");
  const [linkOpen, setLinkOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontSizeMode, setFontSizeMode] = useState<"presets" | "custom" | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const link = navigationEntries(props.links).find(entry => entry.link.id === props.selectedId)?.link;
  if (!link) return null;
  const update = (patch: Partial<SiteLink>) => props.writable && props.onChange(updateNavigationItem(props.links, link.id, current => ({ ...current, ...patch })));
  const close = (focus: boolean) => { setLinkOpen(false); if (focus) trigger.current?.focus(); };
  const styleBlock: Extract<ContentBlock, { type: "group" }> = { id: link.id, type: "group", layout: "row", children: [], visualStyle: link.visualStyle };
  const destination = safeTextLink(link.url);
  return <div className="navigation-inspector page-link-inspector inspector-sections">
    <div className="page-link-summary"><button type="button" aria-label="Select parent block: Navigation" title="Go to Navigation" onClick={() => props.onSelect(null)}><StudioIcon name="chevron-right" size={20} style={{ transform: "rotate(180deg)" }} /></button><AcmIcon name="view.pages" size={20} /><h3>Page link</h3></div>
    {!props.contentOnly ? <PaneTabs id={tabId} label="Page link controls" indicatorVariant="selected" className="navigation-inspector-tabs" tabs={[{ id: "content", label: "Content" }, { id: "settings", label: "Settings" }, { id: "styles", label: "Styles" }]} active={tab} onChange={setTab} renderLabel={item => <><AcmIcon name={item.id === "content" ? "view.pages" : item.id === "settings" ? "action.settings" : "view.styles"} size={24} /><span className="visually-hidden">{item.label}</span></>} /> : null}
    <div role={props.contentOnly ? undefined : "tabpanel"} id={paneTabTarget(tabId, tab, "panel")} aria-labelledby={props.contentOnly ? undefined : paneTabTarget(tabId, tab, "tab")}>
      {props.contentOnly || tab === "content" ? <section className="page-link-content"><h2>Settings</h2><fieldset disabled={!props.writable}>
        <LinkSetting label="Text" value={link.label} maxLength={160} onCommit={label => update({ label })} />
        <div className="page-link-destination"><span>Link to</span><button ref={trigger} type="button" aria-label={`Link to: ${link.label || link.url}`} aria-haspopup="dialog" aria-expanded={linkOpen} onClick={() => setLinkOpen(true)}><strong>{props.suggestions.find(item => item.href === link.url)?.title ?? link.label ?? "Link"}</strong><span>{link.url}</span><StudioIcon name="chevron-down" size={16} /></button></div>
        <ToggleSetting label="Open in new tab" checked={Boolean(link.opensInNewTab)} disabled={!props.writable} onChange={opensInNewTab => update({ opensInNewTab })} />
      </fieldset>
        {props.siteId && props.suggestions.some(item => item.href === link.url) ? <ProjectLocalDocumentLink siteId={props.siteId} destination={link.url} /> : props.onView && props.suggestions.some(item => item.href === link.url) ? <button type="button" className="page-link-view" onClick={() => props.onView?.(link)}>View <StudioIcon name="external" size={16} /></button> : destination ? <a className="page-link-view" href={destination} target="_blank" rel="noopener noreferrer">View <StudioIcon name="external" size={16} /></a> : null}
      <fieldset disabled={!props.writable}>
        <label>Description<textarea key={link.description} defaultValue={link.description ?? ""} maxLength={2000} rows={4} onBlur={event => { if (event.target.value !== (link.description ?? "")) update({ description: event.target.value }); }} /></label>
        <p className="setting-note">The description appears as the link’s title.</p>
        <LinkSetting label="Rel attribute" value={link.rel ?? ""} maxLength={200} onDraftChange={rel => { if (/^[a-zA-Z0-9_\s-]*$/.test(rel)) setError(null); }} onCommit={rel => { if (/^[a-zA-Z0-9_\s-]*$/.test(rel)) { update({ rel }); setError(null); } else setError("Use space-separated relationship names."); }} />
        <p className="setting-note">The relationship of the linked URL as space-separated link types.</p>
        {error ? <p role="alert">{error}</p> : null}
      </fieldset></section> : tab === "settings" ? <InspectorAccordionSection title="Advanced" defaultOpen={false} contentDisabled={!props.writable}><AdvancedFieldsControl fields={{ anchor: false, className: true, additionalCss: false }} style={link.visualStyle ?? {}} blockName="Page link" onChange={(field, value) => update({ visualStyle: { ...link.visualStyle, [field]: value || undefined } })} /></InspectorAccordionSection> : <fieldset disabled={!props.writable} className="navigation-style-settings"><ParagraphInspector profileOverride={pageLinkStyleProfile} block={styleBlock} onChange={next => update({ visualStyle: next.visualStyle })} fontSizeViewMode={fontSizeMode} onFontSizeViewModeChange={setFontSizeMode} /></fieldset>}
    </div>
    {linkOpen && props.writable ? <LinkDestinationPopover inspectorPlacement key={link.id} value={link} mode="edit" anchor={() => trigger.current} focusOnMount suggestions={props.suggestions} onEdit={() => {}} onRemove={() => close(true)} onClose={close} onApply={(draft, baseline) => {
      const current = navigationEntries(props.links).find(entry => entry.link.id === link.id)?.link;
      if (!current || !equivalentLinkDestination(current, baseline)) return "This link changed. Close and reopen to edit its latest version.";
      const next = updatedLinkDestination(current, draft);
      if (!next) return "Use a full URL, email link, /path or #anchor.";
      if (!update(next)) return "The link could not be saved. Your draft is still here.";
      close(true); return null;
    }} /> : null}
  </div>;
}
