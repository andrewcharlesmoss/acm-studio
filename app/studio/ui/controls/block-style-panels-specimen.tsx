"use client";
import { useReducer, useState } from "react";
import { BlocksPreview } from "../../site-editor/blocks-preview";
import type { PreviewBlockId } from "../../site-editor/blocks-preview-model";
import { createStylesPreview, resolvePreviewStyle, stylesPreviewReducer } from "../../site-editor/styles-preview-state";
import { HistoryActions } from "../../controls/history-actions";
import { StudioButton } from "../../controls/button";
import { isNativeEditingTarget, workspaceHistoryShortcut } from "../../workspace-shortcuts.mjs";
import '../../site-editor/site-editor-preview.css';
export function BlockStylePanelsSpecimen() {
    const [history, dispatch] = useReducer(stylesPreviewReducer, undefined, createStylesPreview);
    const [selected, setSelected] = useState<PreviewBlockId | null>(null);
    const [variation, setVariation] = useState<string>();
    const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [open, setOpen] = useState(true);
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Shared history shortcuts delegate from the temporary specimen controls.
    return <div className="site-editor-preview ui-block-style-panels-example" data-inspector-popover-owner role="group" aria-label="Block Styles panes example" onKeyDown={event => {
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
    {open ? <BlocksPreview selected={selected} onSelect={id => { setSelected(id); setVariation(undefined); }} variation={variation} onVariationChange={setVariation} viewport={viewport} onViewportChange={setViewport} selection={resolvePreviewStyle(history.present, 'global')} authored={history.present.global} scope="global" dispatch={dispatch} onBack={() => setOpen(false)}/> : <StudioButton onClick={() => setOpen(true)}>Open Blocks</StudioButton>}
  </div>;
}
