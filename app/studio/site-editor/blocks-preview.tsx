"use client";
import { useEffect, useRef, useState, type Dispatch } from "react";
import { AcmIcon } from "@acm/icons/react";
import { editableViewportStyle, type StyleViewport } from "../../content/responsive-styles";
import { ViewportStatesMenu } from "../controls/viewport-states-menu";
import { ResponsiveStyleProvider } from "../responsive-style-context";
import { BlockLibraryIcon } from "../block-library-icons";
import { StudioButton } from "../controls/button";
import { SearchInput } from "../controls/native-fields";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { StudioMenuItem } from "../overlays/menu";
import { ParagraphInspector } from "../blocks/inspectors/paragraph-inspector";
import { capabilityProfileFor } from "../blocks/capability-profiles";
import { blockPreviewStyle, previewBlockStyleDelta, previewBlockTargets, type PreviewBlockId } from "./blocks-preview-model";
import { styleBookExamples } from "./style-book-model";
import type { PreviewScope } from "./identity-preview-state";
import type { StyleAction, StyleSelection } from "./styles-preview-state";
import "./blocks-preview.css";

export function BlocksPreview({ selected, onSelect, viewport = "desktop", onViewportChange, selection, authored, scope, dispatch, onBack }: { viewport?: StyleViewport; onViewportChange?: (viewport: StyleViewport) => void; selected: PreviewBlockId | null; onSelect: (id: PreviewBlockId | null) => void; selection: StyleSelection; authored: Partial<StyleSelection>; scope: PreviewScope; dispatch: Dispatch<StyleAction>; onBack: () => void }) {
  const [query, setQuery] = useState("");
  const [fontMode, setFontMode] = useState<"presets" | "custom" | null>(null);
  const [menu, setMenu] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const target = previewBlockTargets.find(item => item.id === selected);
  useEffect(() => { heading.current?.focus(); setMenu(false); setFontMode(null); }, [selected]);
  useEffect(() => { setFontMode(null); }, [viewport]);
  function back() {
    if (!selected) { onBack(); return; }
    const previous = selected;
    onSelect(null);
    requestAnimationFrame(() => list.current?.querySelector<HTMLButtonElement>(`[data-block-target="${previous}"]`)?.focus());
  }
  const fixture = target && styleBookExamples({ block: target.id })[0]?.blocks?.[0];
  const base = fixture && target?.id === "button" && fixture.type === "buttons" ? fixture.children[0] : fixture;
  const synthetic = target?.id === "search" ? { id: "style-book-search", type: "paragraph" as const, text: "Search" } : base;
  const effective = selected ? selection.blockStyles?.[selected] ?? {} : {};
  const block = synthetic && (synthetic.type === "paragraph" ? { ...synthetic, style: effective } : { ...synthetic, visualStyle: effective });
  const originalProfile = target ? capabilityProfileFor(target.id === "search" ? "code" : target.type) : null;
  // Content, asset selection and button width remain editor-owned.
  const supported = (id: string) => !["width", "fit-text", "background-image"].includes(id);
  const profile = originalProfile && { ...originalProfile, controls: originalProfile.controls.filter(control => supported(control.id)), defaults: { typography: originalProfile.defaults.typography.filter(supported), dimensions: originalProfile.defaults.dimensions.filter(supported), border: originalProfile.defaults.border.filter(supported), elements: originalProfile.defaults.elements.filter(supported) } };
  const canReset = selected ? Boolean(Object.keys(editableViewportStyle(authored.blockStyles?.[selected], viewport)).length) : Boolean(Object.keys(authored.blockStyles ?? {}).length);
  return <div className="site-browse-styles site-blocks-preview" ref={list}>
    <div className="site-browse-styles-heading"><StudioButton variant="text" aria-label={selected ? "Back to Blocks" : "Back to Styles"} onClick={back}><AcmIcon name="navigation.chevron-left" size={20} /></StudioButton><h3 ref={heading} tabIndex={-1}>{target?.label ?? "Blocks"}</h3><button ref={menuTrigger} className="inspector-tools-trigger" type="button" aria-label="Block style options" aria-expanded={menu} onClick={() => setMenu(open => !open)}><AcmIcon name="action.more-vertical" size={20} /></button>
      {menu ? <StudioAnchoredMenu anchor={() => menuTrigger.current} aria-label="Block style actions" onClose={restore => { setMenu(false); if (restore !== false) menuTrigger.current?.focus(); }}><StudioMenuItem disabled={!canReset} onClick={() => { dispatch({ type: "reset-block-style", scope, block: selected ?? undefined, viewport: selected ? viewport : undefined }); setMenu(false); menuTrigger.current?.focus(); }}>Reset</StudioMenuItem></StudioAnchoredMenu> : null}
    </div>
    {selected ? <ViewportStatesMenu viewport={viewport} onChange={onViewportChange ?? (() => {})} /> : null}
    <p>{target ? viewport === "desktop" ? "Set styles for this block type." : `${viewport === "tablet" ? "Tablet" : "Mobile"} styles. Unset values inherit Default.` : "Customise the blocks shown in the Style Book."}</p>
    {block && profile && selected ? <ResponsiveStyleProvider key={`${scope}-${selected}-${viewport}`} viewport={viewport} initialEnabled><ParagraphInspector key={`${scope}-${selected}-${viewport}`} profileOverride={profile} block={block} fontSizeViewMode={fontMode} onFontSizeViewModeChange={setFontMode} onChange={next => dispatch({ type: "block-style", scope, block: selected, viewport, patch: previewBlockStyleDelta(editableViewportStyle(effective, viewport), editableViewportStyle(blockPreviewStyle(next), viewport)) })} /></ResponsiveStyleProvider> : <>
      <label><span className="visually-hidden">Search blocks</span><SearchInput placeholder="Search" aria-label="Search blocks" value={query} onChange={event => setQuery(event.currentTarget.value)} /></label>
      <div className="site-blocks-list">{previewBlockTargets.filter(item => item.label.toLowerCase().includes(query.trim().toLowerCase())).map(item => <button type="button" key={item.id} data-block-target={item.id} onClick={() => onSelect(item.id)}>{item.id === "search" ? <AcmIcon name="action.search" size={24} /> : <BlockLibraryIcon type={item.type} />}<span>{item.label}</span><AcmIcon name="navigation.chevron-right" size={20} /></button>)}</div>
      {query && !previewBlockTargets.some(item => item.label.toLowerCase().includes(query.trim().toLowerCase())) ? <p role="status">No blocks found.</p> : null}
    </>}
  </div>;
}
