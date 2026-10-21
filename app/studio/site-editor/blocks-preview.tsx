"use client";
import { useEffect, useRef, useState, type Dispatch } from "react";
import { AcmIcon } from "@acm/icons/react";
import { type StyleViewport } from "../../content/responsive-styles";
import { ViewportStatesMenu, type ButtonPseudoState } from "../controls/viewport-states-menu";
import { BlockStyleSections } from "./block-style-sections";
import { BlockStyleSpecimen } from "./block-style-specimen";
import { StyleVariationList } from "../controls/style-variation-setting";
import { blockStyleProfiles } from "./block-style-profiles";
import { BlockLibraryIcon } from "../block-library-icons";
import { StudioButton } from "../controls/button";
import { SearchInput } from "../controls/native-fields";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { StudioMenuItem } from "../overlays/menu";


import { editablePreviewBlockStyle, effectivePreviewBlockStyle, previewBlockFontSelection, resolvePreviewBlockVariant, referencePreviewBlockStyles, previewBlockTargets, type PreviewBlockId } from "./blocks-preview-model";

import type { PreviewScope } from "./identity-preview-state";
import type { StyleAction, StyleSelection } from "./styles-preview-state";
import "./blocks-preview.css";

export function BlocksPreview({ selected, onSelect, variation, onVariationChange, viewport = "desktop", onViewportChange, selection, authored, scope, dispatch, onBack }: { variation?: string; onVariationChange?: (variation?: string) => void; viewport?: StyleViewport; onViewportChange?: (viewport: StyleViewport) => void; selected: PreviewBlockId | null; onSelect: (id: PreviewBlockId | null) => void; selection: StyleSelection; authored: Partial<StyleSelection>; scope: PreviewScope; dispatch: Dispatch<StyleAction>; onBack: () => void }) {
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [pseudoState, setPseudoState] = useState<ButtonPseudoState>("default");
  const heading = useRef<HTMLHeadingElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const target = previewBlockTargets.find(item => item.id === selected);
  useEffect(() => { heading.current?.focus(); }, [selected, variation]);
  function back() {
    setMenu(false);
    if (variation) { onVariationChange?.(undefined); return; }
    if (!selected) { onBack(); return; }
    const previous = selected;
    onSelect(null);
    requestAnimationFrame(() => list.current?.querySelector<HTMLButtonElement>(`[data-block-target="${previous}"]`)?.focus());
  }
  const effective = selected ? resolvePreviewBlockVariant(referencePreviewBlockStyles(selection.blockStyles)[selected], variation) : {};
  const ownBase = selected ? authored.blockStyles?.[selected] : undefined;
  const own = variation ? ownBase?.variations?.[variation] : ownBase;
  const authoredState = pseudoState === "default" ? own : own?.interactionStates?.[pseudoState];
  const effectiveState = pseudoState === "default" ? effective : { ...effective, ...effectivePreviewBlockStyle(effective.interactionStates?.[pseudoState] ?? {}, viewport) };
  const fontSelectionValue = previewBlockFontSelection(authoredState, viewport);
  const canReset = selected ? Boolean(Object.keys(editablePreviewBlockStyle(authoredState, viewport)).length) : Boolean(Object.keys(authored.blockStyles ?? {}).length);
  const profile = selected ? blockStyleProfiles[selected] : undefined;
  const title = profile?.variations.find(item => item.id === variation)?.label ?? target?.label ?? "Blocks";
  return <div className="site-browse-styles site-blocks-preview" ref={list}>
    <div className="site-browse-styles-heading"><StudioButton variant="text" aria-label={selected ? "Back to Blocks" : "Back to Styles"} onClick={back}><AcmIcon name="navigation.chevron-left" size={20} /></StudioButton><h3 ref={heading} tabIndex={-1}>{title}</h3>{selected ? <ViewportStatesMenu viewport={viewport} onChange={onViewportChange ?? (() => {})} pseudoState={selected === "button" ? pseudoState : undefined} onPseudoStateChange={selected === "button" ? setPseudoState : undefined} /> : null}{!selected ? <button ref={menuTrigger} className="inspector-tools-trigger" type="button" aria-label="Block style options" aria-expanded={menu} onClick={() => setMenu(open => !open)}><AcmIcon name="action.more-vertical" size={20} /></button> : null}
      {menu ? <StudioAnchoredMenu anchor={() => menuTrigger.current} aria-label="Block style actions" onClose={restore => { setMenu(false); if (restore !== false) menuTrigger.current?.focus(); }}><StudioMenuItem disabled={!canReset} onClick={() => { dispatch({ type: "reset-block-style", scope, block: selected ?? undefined, variation, viewport: selected ? viewport : undefined, pseudoState: pseudoState === "default" ? undefined : pseudoState }); setMenu(false); menuTrigger.current?.focus(); }}>Reset</StudioMenuItem></StudioAnchoredMenu> : null}
    </div>
    {selected && profile ? <>
      <BlockStyleSpecimen id={selected} selection={selection} viewport={viewport} variation={variation} buttonPreviewState={selected === "button" ? pseudoState : "default"} />
      {!variation && profile.variations.length ? <section className="site-block-variations"><h4>STYLE VARIATIONS</h4><StyleVariationList choices={profile.variations} onChoose={onVariationChange ?? (() => {})} /></section> : null}
      <BlockStyleSections key={`${scope}-${selected}-${variation ?? 'default'}-${viewport}-${pseudoState}`} id={selected} value={effectivePreviewBlockStyle(effectiveState, viewport)} authored={editablePreviewBlockStyle(authoredState, viewport)} fontSelectionValue={fontSelectionValue} selection={selection} viewport={viewport} onChange={patch => dispatch({type: "block-style", scope, block: selected, variation, viewport, pseudoState: pseudoState === "default" ? undefined : pseudoState, patch})} />
    </> : <>
      <p>Customise the blocks shown in the Style Book.</p>
      <label><span className="visually-hidden">Search blocks</span><SearchInput placeholder="Search" aria-label="Search blocks" value={query} onChange={event => setQuery(event.currentTarget.value)} /></label>
      <div className="site-blocks-list">{previewBlockTargets.filter(item => item.label.toLowerCase().includes(query.trim().toLowerCase())).map(item => <button type="button" key={item.id} data-block-target={item.id} onClick={() => onSelect(item.id)}>{item.id === "search" ? <AcmIcon name="action.search" size={24} /> : <BlockLibraryIcon type={item.type} />}<span>{item.label}</span><AcmIcon name="navigation.chevron-right" size={20} /></button>)}</div>
      {query && !previewBlockTargets.some(item => item.label.toLowerCase().includes(query.trim().toLowerCase())) ? <p role="status">No blocks found.</p> : null}
    </>}
  </div>;
}
