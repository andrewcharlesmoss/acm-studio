"use client";
import { useEffect, useReducer, useRef, useState } from "react";
import { StyleBook } from "../../site-editor/style-book";
import { BlocksPreview } from "../../site-editor/blocks-preview";
import type { PreviewBlockId } from "../../site-editor/blocks-preview-model";
import { createStylesPreview, resolvePreviewStyle, stylesPreviewReducer } from "../../site-editor/styles-preview-state";
import { HistoryActions } from "../../controls/history-actions";
import { StudioButton } from "../../controls/button";
import { isNativeEditingTarget, workspaceHistoryShortcut } from "../../workspace-shortcuts.mjs";
import '../../site-editor/site-editor-preview.css';
export function BlockStylePanelsSpecimen() {
    const root = useRef<HTMLDivElement>(null);
    useEffect(() => { root.current?.setAttribute("data-ready", "true"); }, []);
    const [history, dispatch] = useReducer(stylesPreviewReducer, undefined, createStylesPreview);
    const [selected, setSelected] = useState<PreviewBlockId | null>(null);
    const [variation, setVariation] = useState<string>();
    const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [open, setOpen] = useState(true);
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Shared history shortcuts delegate from the temporary specimen controls.
    return <div className="site-editor-preview ui-block-style-panels-example" ref={root} data-inspector-popover-owner role="group" aria-label="Block Styles panes example" onKeyDown={event => {
            if (isNativeEditingTarget(event.target) || (event.target instanceof Element && event.target.closest('dialog')))
                return;
            const action = workspaceHistoryShortcut(event);
            if (!action)
                return;
            event.preventDefault();
            event.stopPropagation();
            dispatch({ type: action });
        }}>
    <HistoryActions canUndo={history.past.length > 0} canRedo={history.future.length > 0} onUndo={() => dispatch({ type: 'undo' })} onRedo={() => dispatch({ type: 'redo' })}/>
    <StudioButton onClick={() => { dispatch({ type: "reset", scope: "global" }); setSelected(null); setVariation(undefined); setViewport("desktop"); setOpen(true); }}>Reset example</StudioButton>
    <StudioButton onClick={() => { dispatch({ type: "block-style", scope: "global", block: "group", patch: { textColor: "#123456", fontSizeCustom: "24px", padding: "16px" } }); setSelected("row"); setVariation(undefined); setViewport("desktop"); setOpen(true); }}>Show Group inheritance</StudioButton>
    {open ? <BlocksPreview selected={selected} onSelect={id => { setSelected(id); setVariation(undefined); }} variation={variation} onVariationChange={setVariation} viewport={viewport} onViewportChange={setViewport} selection={resolvePreviewStyle(history.present, 'global')} authored={history.present.global} scope="global" dispatch={dispatch} onBack={() => setOpen(false)}/> : <StudioButton onClick={() => setOpen(true)}>Open Blocks</StudioButton>}
    {selected ? <details><summary>Compare Style Book</summary><StyleBook selection={resolvePreviewStyle(history.present, "global")} context={{ block: selected }} onTypography={() => {}} onBrowse={() => {}} /></details> : null}
  </div>;
}
