"use client";
import { useMemoryImageFiles } from "../../blocks/use-memory-image-files";

import { CheckboxControl } from "../../../controls/checkbox-control";

import { SelectControl } from "../../../controls/native-fields";
import { useState } from "react";
import { TemplateEditor } from "../../../template-editor";
import { createTemplateSet, validateTemplateSet, type TemplateSet } from "../../../template-model";
import { createWorkspacePreviewDocument } from "../../../editor-model";
import { StudioUiSectionHost } from "../../studio-ui-section-host";
import { ResponsiveStyleProvider } from "../../../responsive-style-context";
import type { StudioViewport } from "../../../studio-view-menu";
import { useStudioHistoryShortcuts } from "../../../use-studio-history-shortcuts";

function exampleSet() {
  const set = createTemplateSet();
  set.navigation = [
    { id: "drag-menu-first", label: "First link", url: "/first" },
    { id: "drag-menu-second", label: "Second link", url: "/second", children: [
      { id: "drag-submenu-first", label: "First child", url: "/child-first" },
      { id: "drag-submenu-second", label: "Second child", url: "/child-second" },
      { id: "drag-submenu-third", label: "Third child", url: "/child-third" },
    ] },
    { id: "drag-menu-third", label: "Third link", url: "/third" },
  ];
  set.parts[0].nodes = [
    { id: "template-post-date", type: "post-date", format: "iso", isLink: true, showIcon: false },
    { id: "template-reading-time", type: "reading-time", prefix: "About", showRange: false, presentation: "plain" },
    { id: "template-title", type: "element", element: "document-title", level: 2, isLink: true, linkTarget: "_blank", rel: "nofollow" },
    { id: "template-drag-source", type: "paragraph", text: "Drag this template paragraph into a column." },
    { id: "template-drop-columns", type: "columns", children: [
      { id: "template-drop-left", type: "column", children: [{ id: "template-existing", type: "paragraph", text: "Existing template column item" }] },
      { id: "template-drop-right", type: "column", children: [] },
    ] },
    { id: "template-drop-navigation", type: "element", element: "navigation", layout: "row" },
    { id: "template-code", type: "code", language: "typescript", code: "const specimen = true;\n\n" },
    { id: "template-quote", type: "quote", text: "", children: [{ id: "template-quote-body", type: "paragraph", text: "Template quote body", runs: [{ text: "Template quote body", marks: ["bold"] }] }, { id: "template-quote-heading", type: "heading", level: 2, text: "Template Quote heading" }], attribution: "Template quote citation", attributionRuns: [{ text: "Template quote citation", marks: ["italic"] }] },
    { id: "template-list", type: "list", style: "unordered", items: ["Template first item", "Template second item"] },
    { id: "template-table", type: "table", rows: [["First template cell", "Second template cell"], ["Third template cell", "Fourth template cell"]], cellRuns: [[[{ text: "First template cell", marks: ["bold"] }], [{ text: "Second template cell" }]], [[{ text: "Third template cell" }], [{ text: "Fourth template cell" }]]], caption: "Template caption", captionRuns: [{ text: "Template caption", marks: ["italic"] }] },
    { id: "template-image", type: "image", src: "/specimens/landscape.svg", alt: "Template landscape example", caption: "Template image caption" },
    { id: "template-spacer", type: "spacer", height: 48, heightUnit: "px" },
    { id: "template-row", type: "group", layout: "row", children: [
      { id: "template-row-text", type: "paragraph", text: "Nested template text" },
      { id: "template-row-spacer", type: "spacer", height: 32, heightUnit: "px", width: 32, widthUnit: "px" },
      { id: "template-nested-list", type: "list", style: "unordered", items: ["Nested first item", "Nested second item"] },
      { id: "template-nested-table", type: "table", rows: [["Nested first cell", "Nested second cell"], ["Nested third cell", "Nested fourth cell"]], caption: "Nested template caption" },
    ] },
  ];
  for (const template of set.templates) template.nodes = [
    { id: `${template.kind}-template-paragraph`, type: "paragraph", text: "Content belongs to this template, not the sample document." },
    { id: `${template.kind}-template-group`, type: "group", layout: "stack", children: [{ id: `${template.kind}-template-group-text`, type: "paragraph", text: "Select this group to add Content here." }] },
    { id: `${template.kind}-template-columns`, type: "columns", children: [
      { id: `${template.kind}-template-left`, type: "column", children: [] },
      { id: `${template.kind}-template-right`, type: "column", children: [] },
    ] },
  ];
  return set;
}

/** The real Template adapter, with isolated in-memory content and history. */
export default function TemplateDropSpecimen() {
  const [set, setSet] = useState(exampleSet);
  const [past, setPast] = useState<TemplateSet[]>([]);
  const [future, setFuture] = useState<TemplateSet[]>([]);
  const [document] = useState(() => createWorkspacePreviewDocument("post"));
  const [targetKind, setTargetKind] = useState<"header" | "footer" | "page" | "post">("header");
  const [viewport, setViewport] = useState<StudioViewport>("desktop");
  const [writable, setWritable] = useState(true);
  const target = [...set.templates, ...set.parts].find(item => item.kind === targetKind)!;
  function change(next: TemplateSet) {
    if (!writable) return false;
    validateTemplateSet(next);
    setPast([...past, set]); setFuture([]); setSet(next); return true;
  }
  const imageFiles = useMemoryImageFiles({ document, writable, onSelectBlock: () => {}, updateDocument: () => false, template: { set, targetId: target.id, change } });
  function undo() { const previous = past.at(-1); if (previous) { setPast(past.slice(0, -1)); setFuture([set, ...future]); setSet(previous); } }
  function redo() { const next = future[0]; if (next) { setPast([...past, set]); setFuture(future.slice(1)); setSet(next); } }
  useStudioHistoryShortcuts(undo, redo, writable);
  return <StudioUiSectionHost section="workspace"><section className="selection-library-specimen">
    <h1>Template insertion and column drops</h1>
    <p>This example uses the production Template editor with responsive style editing enabled. Content, device choices, and history remain on this page.</p>
    <button type="button" onClick={() => { imageFiles.cancel(); setSet(exampleSet()); setPast([]); setFuture([]); setViewport("desktop"); }}>Reset Example</button>
    <label>Example target<SelectControl value={targetKind} onChange={event => setTargetKind(event.target.value as typeof targetKind)}><option value="header">Header</option><option value="footer">Footer</option><option value="page">Page</option><option value="post">Post</option></SelectControl></label>
    <label>Width<SelectControl value={viewport} onChange={event => setViewport(event.target.value as StudioViewport)}><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></SelectControl></label>
    <CheckboxControl checked={!writable} onChange={checked => setWritable(!checked)} label={<>Read-only example</>} />
    <ResponsiveStyleProvider viewport={viewport} initialEnabled><TemplateEditor viewControls={{ viewport, onViewportChange: setViewport }} key={target.id} set={set} target={target} documents={[document]} mediaUrls={imageFiles.urls} writable={writable} canOpenImageFiles onChange={change} onEditPart={() => {}} onOpenMedia={(blockId, _logo, _background, _item, trigger) => { if (blockId) imageFiles.choose(blockId, trigger); }} undo={undo} redo={redo} canUndo={past.length > 0} canRedo={future.length > 0} /></ResponsiveStyleProvider>
    {imageFiles.picker}
    {imageFiles.feedback ? <p role="status">{imageFiles.feedback}</p> : null}
  </section></StudioUiSectionHost>;
}
