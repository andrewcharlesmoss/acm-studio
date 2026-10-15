"use client";

import { SelectControl } from "../../controls/native-fields";
import { useState } from "react";
import { StudioIcon } from "../../studio-icons";
import { createWorkspacePreviewDocument } from "../../editor-model";
import { TemplateEditor } from "../../template-editor";
import { validateTemplateSet, type TemplateSet } from "../../template-model";
import { ToggleSetting } from "../../controls/toggle-setting";
import type { StudioViewport } from "../../studio-view-menu";
import { createBlockEditorPlaygroundExample } from "./block-editor-playground-example";
import { handleStudioHistoryShortcut } from "../../studio-history-shortcuts.mjs";

export const blockEditorPlayground = {
  id: "block-editor-playground",
  title: "Block editor playground",
  purpose: "Try blocks, inspect their contents, and compare appender positioning in Header, Navigation, and empty templates.",
  owner: "ACM Studio editor",
  consumers: "Content editor, Template editor, Site editors, and Workspace Library playground",
  dependencies: "TemplateEditor, StudioEditor, and StudioCanvas supply the canvas, inspector, appender, insertion, selection, focus, zoom, and history controls.",
  href: "/studio/ui/workspace#block-editor-playground",
};

export function BlockEditorPlaygroundExample() {
  const [revision, setRevision] = useState(0);
  return <section id={blockEditorPlayground.id} className="ui-control-entry ui-workspace-example" aria-labelledby="block-editor-playground-title">
    <header className="ui-control-entry-header">
      <div><p className="rl-eyebrow">Workspace example</p><h2 id="block-editor-playground-title">{blockEditorPlayground.title}</h2><p>{blockEditorPlayground.purpose}</p></div>
      <button className="ui-control-reset" type="button" onClick={() => setRevision(value => value + 1)}><StudioIcon name="rotate" size={18} />Reset example</button>
    </header>
    <div className="ui-control-detail-card">
      <div className="ui-control-detail-header"><h3>Live playground</h3></div>
      <div className="ui-control-detail-example is-wide"><BlockEditorPlayground key={revision} /></div>
      <p className="ui-control-detail-note">Changes stay in this page’s temporary example state and do not edit a document or save block content.</p>
    </div>
    <details className="ui-control-facts"><summary><span>Ownership, consumers, dependencies and compatibility</span><StudioIcon name="chevron-right" size={16} /></summary><dl>
      <div><dt>Ownership</dt><dd>{blockEditorPlayground.owner}</dd></div>
      <div><dt>Consumers</dt><dd>{blockEditorPlayground.consumers}</dd></div>
      <div><dt>Dependencies</dt><dd>{blockEditorPlayground.dependencies}</dd></div>
      <div><dt>Supported states</dt><dd>Header, Navigation, empty template, desktop/tablet/mobile canvas widths, zoom, typing, slash insertion, plus chooser, keyboard, read-only, Undo/Redo, and Reset.</dd></div>
      <div><dt>Compatibility</dt><dd>Uses isolated in-memory templates and history. Product templates, content, saving, and write ownership are untouched.</dd></div>
    </dl></details>
  </section>;
}

/** The production editor owns the appender and insertion. Only fixtures and history live here. */
export function BlockEditorPlayground() {
  const [fixture] = useState(createBlockEditorPlaygroundExample);
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
  return <div className="ui-block-editor-specimen" role="group" aria-label="Block editor playground" onKeyDown={event => { if (!readOnly) handleStudioHistoryShortcut(event, navigator.platform, () => restore(-1), () => restore(1)); }}>
    <div className="ui-rotation-tools">
      <label>Template <SelectControl aria-label="Playground template" value={targetKind} onChange={event => setTargetKind(event.target.value as typeof targetKind)}><option value="header">Header</option><option value="navigation">Navigation</option><option value="empty">Empty</option></SelectControl></label>
      <label>Viewport <SelectControl aria-label="Playground viewport" value={viewport} onChange={event => setViewport(event.target.value as StudioViewport)}><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></SelectControl></label>
      <ToggleSetting label="Read-only example" checked={readOnly} onChange={setReadOnly} />
    </div>
    <p>Try blocks using the plus button, type / to choose a block, or type text and press Enter. Select a block to inspect its contents and settings. Compare appender positioning across the three templates; the production editor supplies the canvas, inspector, insertion, focus, and Undo/Redo.</p>
    <div className="ui-block-editor-viewport">
      <div className="ui-block-editor-workspace template-workspace">
        <TemplateEditor key={target.id} globalOriginal set={set} target={target} documents={[document]} mediaUrls={{}} writable={!readOnly} viewControls={{ viewport, onViewportChange: setViewport }} inspectorPaneCollapsed={inspectorCollapsed} onInspectorPaneCollapsedChange={setInspectorCollapsed} onChange={change} onEditPart={() => {}} onOpenMedia={() => {}} canChooseFixedImage={false} undo={() => restore(-1)} redo={() => restore(1)} canUndo={history.index > 0} canRedo={history.index < history.values.length - 1} />
      </div>
    </div>
    <p role="status">{target.name}: {target.nodes.length} top-level {target.nodes.length === 1 ? "block" : "blocks"}. History position {history.index} of {history.values.length - 1}. Changes stay in this example.</p>
  </div>;
}
