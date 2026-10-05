"use client";

import { useState } from "react";
import { TemplateEditor } from "../../../template-editor";
import { createTemplateSet, validateTemplateSet, type TemplateSet } from "../../../template-model";
import { createWorkspacePreviewDocument } from "../../../editor-model";
import { StudioUiSectionHost } from "../../studio-ui-section-host";
import { useStudioHistoryShortcuts } from "../../../use-studio-history-shortcuts";

function exampleSet() {
  const set = createTemplateSet();
  set.parts[0].nodes = [
    { id: "template-drag-source", type: "paragraph", text: "Drag this template paragraph into a column." },
    { id: "template-drop-columns", type: "columns", children: [
      { id: "template-drop-left", type: "column", children: [{ id: "template-existing", type: "paragraph", text: "Existing template column item" }] },
      { id: "template-drop-right", type: "column", children: [] },
    ] },
    { id: "template-list", type: "list", style: "unordered", items: ["Template first item", "Template second item"] },
    { id: "template-table", type: "table", rows: [["First template cell", "Second template cell"], ["Third template cell", "Fourth template cell"]], caption: "Template caption" },
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
  const [writable, setWritable] = useState(true);
  const target = [...set.templates, ...set.parts].find(item => item.kind === targetKind)!;
  function change(next: TemplateSet) {
    if (!writable) return false;
    validateTemplateSet(next);
    setPast([...past, set]); setFuture([]); setSet(next); return true;
  }
  function undo() { const previous = past.at(-1); if (previous) { setPast(past.slice(0, -1)); setFuture([set, ...future]); setSet(previous); } }
  function redo() { const next = future[0]; if (next) { setPast([...past, set]); setFuture(future.slice(1)); setSet(next); } }
  useStudioHistoryShortcuts(undo, redo, writable);
  return <StudioUiSectionHost section="workspace"><section className="selection-library-specimen">
    <h1>Template insertion and column drops</h1>
    <p>This example uses the production Template editor. Content and history remain on this page.</p>
    <button type="button" onClick={() => { setSet(exampleSet()); setPast([]); setFuture([]); }}>Reset Example</button>
    <label>Example target<select value={targetKind} onChange={event => setTargetKind(event.target.value as typeof targetKind)}><option value="header">Header</option><option value="footer">Footer</option><option value="page">Page</option><option value="post">Post</option></select></label>
    <label><input type="checkbox" checked={!writable} onChange={event => setWritable(!event.target.checked)} />Read-only example</label>
    <TemplateEditor key={target.id} set={set} target={target} documents={[document]} mediaUrls={{}} writable={writable} onChange={change} onEditPart={() => {}} onOpenMedia={() => {}} undo={undo} redo={redo} canUndo={past.length > 0} canRedo={future.length > 0} />
  </section></StudioUiSectionHost>;
}
