"use client";
import { useState, type CSSProperties } from "react";
import type { StyleViewport } from "@acm/styles";
import type { WebsiteLayoutValues } from "../../website-layout";
import { TemplateEditor } from "../../template-editor";
import { validateTemplateSet, type TemplateSet } from "../../template-model";
import { createWorkspacePreviewDocument } from "../../editor-model";
import { handleStudioHistoryShortcut } from "../../studio-history-shortcuts.mjs";
import { createWebsiteEditorExample, websitePreviewGeometry } from "./website-layout-editor-example";

export function WebsiteLayoutEditorPreview({ layout, viewport, onViewportChange }: { layout: WebsiteLayoutValues; viewport: StyleViewport; onViewportChange: (viewport: StyleViewport) => void }) {
  const [fixture] = useState(createWebsiteEditorExample);
  const [history, setHistory] = useState({ values: [fixture.set], index: 0 });
  const [collapsed, setCollapsed] = useState(true);
  const [document] = useState(() => ({ ...createWorkspacePreviewDocument("page"), title: "Website example" }));
  const set = history.values[history.index];
  const target = set.templates.find(item => item.id === fixture.targetId)!;
  function change(next: TemplateSet) {
    validateTemplateSet(next);
    setHistory(current => ({ values: [...current.values.slice(0, current.index + 1), next].slice(-60), index: Math.min(current.index + 1, 59) }));
    return true;
  }
  function restore(offset: number) { setHistory(current => ({ ...current, index: Math.max(0, Math.min(current.values.length - 1, current.index + offset)) })); }
  const dimensions = websitePreviewGeometry(layout, viewport === "desktop" ? 1440 : viewport === "tablet" ? 768 : 390, layout.gutters[viewport] ?? layout.gutters.desktop);
  const style = { "--website-example-site": `${dimensions.site}px`, "--website-example-gutter": `${dimensions.gutter}px`, "--website-example-content": `${dimensions.content}px`, "--website-example-wide": `${dimensions.wide}px` } as CSSProperties;
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Temporary editor history stays inside its own workspace.
  return <div className="website-editor-example" role="group" aria-label="Website block editor preview" style={style} onKeyDown={event => handleStudioHistoryShortcut(event, navigator.platform, () => restore(-1), () => restore(1))}>
    <div className="ui-block-editor-viewport"><div className="ui-block-editor-workspace template-workspace">
      <TemplateEditor globalOriginal set={set} target={target} documents={[document]} mediaUrls={{}} writable viewControls={{ viewport, onViewportChange }} inspectorPaneCollapsed={collapsed} onInspectorPaneCollapsedChange={setCollapsed} onChange={change} onEditPart={() => {}} onOpenMedia={() => {}} canChooseFixedImage={false} undo={() => restore(-1)} redo={() => restore(1)} canUndo={history.index > 0} canRedo={history.index < history.values.length - 1} />
    </div></div>
    <p className="website-example-status" role="status">Example content only · Changes disappear when this preview is reset or reloaded.</p>
  </div>;
}
