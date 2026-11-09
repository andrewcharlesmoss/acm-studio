"use client";

import { useReducer, useState } from "react";
import { StudioButton } from "../../controls/button";
import { HistoryActions } from "../../controls/history-actions";
import { ShadowPresetSelect, GROUP_SHADOW_PRESETS } from "../../controls/shadow-preset-select";
import { ShadowsPreview } from "../../site-editor/shadows-preview";
import { createStylesPreview, resolvePreviewStyle, stylesPreviewReducer } from "../../site-editor/styles-preview-state";
import { isNativeEditingTarget, workspaceHistoryShortcut } from "../../workspace-shortcuts.mjs";
import "../../site-editor/site-editor-preview.css";

/** The production feature with isolated example state; catalogue Reset remounts it. */
export function ShadowPresetsSpecimen() {
  const [open, setOpen] = useState(true);
  const [blockShadow, setBlockShadow] = useState<string | undefined>();
  const [history, dispatch] = useReducer(stylesPreviewReducer, undefined, createStylesPreview);
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Delegates history shortcuts from specimen controls, including portalled children.
  return <div className="site-editor-preview ui-shadow-presets-example" role="group" aria-label="Shadow presets example" onKeyDown={event => {
    if (isNativeEditingTarget(event.target) || (event.target instanceof Element && event.target.closest("dialog"))) return;
    const action = workspaceHistoryShortcut(event);
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    dispatch({ type: action });
  }}>
    <HistoryActions canUndo={history.past.length > 0} canRedo={history.future.length > 0} onUndo={() => dispatch({ type: "undo" })} onRedo={() => dispatch({ type: "redo" })} />
    <section aria-label="Group block shadow presets"><h3>Group block</h3><ShadowPresetSelect value={blockShadow} onChange={setBlockShadow} allowCustom={false} unsetLabel="Unset" clearLabel="Clear" choices={GROUP_SHADOW_PRESETS} /><StudioButton variant="text" onClick={() => setBlockShadow(undefined)}>Reset Example</StudioButton></section>
    {open ? <ShadowsPreview selection={resolvePreviewStyle(history.present, "global")} authored={history.present.global} scope="global" dispatch={dispatch} onBack={() => setOpen(false)} /> : <StudioButton onClick={() => setOpen(true)}>Open Shadows</StudioButton>}
  </div>;
}
