"use client";

import { useState } from "react";
import { createWorkspacePreviewDocument } from "../../editor-model";
import { TemplateEditor } from "../../template-editor";
import { validateTemplateSet, type TemplateSet } from "../../template-model";
import { ToggleSetting } from "../../controls/toggle-setting";
import type { StudioViewport } from "../../studio-view-menu";
import { createBlockAppenderExample } from "./block-appender-example";
import { handleStudioHistoryShortcut } from "../../studio-history-shortcuts.mjs";

/** The production editor owns the appender and insertion. Only fixtures and history live here. */
export function BlockAppenderSpecimen() {
  const [fixture] = useState(createBlockAppenderExample);
  const [history, setHistory] = useState({ values: [fixture.set], index: 0 });
  const [targetKind, setTargetKind] = useState<keyof typeof fixture.targets>("header");
  const [readOnly, setReadOnly] = useState(false);
  const [viewport, setViewport] = useState<StudioViewport>("tablet");
  const [inspectorCollapsed, setInspectorCollapsed] = useState(true);
  const [document] = useState(() => ({ ...createWorkspacePreviewDocument("page"), title: "Example page" }));
  const set = history.values[history.index];
  const target = set.parts.find(part => part.id === fixture.targets[targetKind])!;
  function change(next: TemplateSet) {
    if (readOnly) return false;
    validateTemplateSet(next);
    setHistory(current => ({ values: [...current.values.slice(0, current.index + 1), next], index: current.index + 1 }));
    return true;
  }
  function restore(offset: number) {
    if (readOnly) return;
    setHistory(current => ({ ...current, index: Math.max(0, Math.min(current.values.length - 1, current.index + offset)) }));
  }
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- History shortcuts are scoped to this temporary editor.
  return <div className="ui-appender-specimen" role="group" aria-label="Block appender example" onKeyDown={event => { if (!readOnly) handleStudioHistoryShortcut(event, navigator.platform, () => restore(-1), () => restore(1)); }}>
    <div className="ui-rotation-tools">
      <label>Template <select aria-label="Appender example template" value={targetKind} onChange={event => setTargetKind(event.target.value as typeof targetKind)}><option value="header">Header</option><option value="navigation">Navigation</option><option value="empty">Empty</option></select></label>
      <label>Viewport <select aria-label="Appender example viewport" value={viewport} onChange={event => setViewport(event.target.value as StudioViewport)}><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select></label>
      <ToggleSetting label="Read-only example" checked={readOnly} onChange={setReadOnly} />
    </div>
    <p>The prompt follows the last top-level block. Compare the taller Header row with Navigation, then type text and press Enter, type / to choose a block, or use the plus button. The production editor supplies spacing, focus, insertion, and Undo/Redo.</p>
    <div className="ui-appender-viewport">
      <div className="ui-appender-workspace template-workspace">
        <TemplateEditor key={target.id} globalOriginal set={set} target={target} documents={[document]} mediaUrls={{}} writable={!readOnly} viewControls={{ viewport, onViewportChange: setViewport }} inspectorPaneCollapsed={inspectorCollapsed} onInspectorPaneCollapsedChange={setInspectorCollapsed} onChange={change} onEditPart={() => {}} onOpenMedia={() => {}} canChooseFixedImage={false} undo={() => restore(-1)} redo={() => restore(1)} canUndo={history.index > 0} canRedo={history.index < history.values.length - 1} />
      </div>
    </div>
    <p role="status">{target.name}: {target.nodes.length} top-level {target.nodes.length === 1 ? "block" : "blocks"}. History position {history.index} of {history.values.length - 1}. Changes stay in this example.</p>
  </div>;
}
