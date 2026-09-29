"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentBlock, RichTextRun } from "../../../../content/model";
import { BlockRenderer } from "../../../../components/content";
import { paragraphBlockDefinition, paragraphInspectorProfile } from "../../../blocks/paragraph/definition";
import { BlockInspector } from "../../../studio-inspectors";
import { ParagraphEditField } from "../../../studio-canvas";
import { StudioIcon } from "../../../studio-icons";
import { StudioUiLibrary } from "../../studio-ui-library";

const initialRuns: RichTextRun[] = [
  { text: "Paragraph is the everyday text block. This specimen keeps an " },
  { text: "example link", marks: [{ type: "link", url: "https://example.test/paragraph" }] },
  { text: " in its content so you can try inline editing." },
];
const initialParagraph: Extract<ContentBlock, { type: "paragraph" }> = {
  id: "paragraph-library-specimen",
  type: "paragraph",
  text: initialRuns.map(run => run.text).join(""),
  runs: initialRuns,
};
const precedingParagraph: Extract<ContentBlock, { type: "paragraph" }> = {
  id: "paragraph-library-previous",
  type: "paragraph",
  text: "A preceding paragraph can supply the next paragraph’s first-line indent.",
  style: { textIndent: "1.5em" },
};
const followingParagraph: Extract<ContentBlock, { type: "paragraph" }> = {
  id: "paragraph-library-following",
  type: "paragraph",
  text: "This adjacent paragraph demonstrates the stored indent context in Preview.",
};

type InspectorSnapshot = Pick<Extract<ContentBlock, { type: "paragraph" }>, "align" | "blockAlign" | "style" | "visualStyle" | "siteRole">;
const inspectorSnapshot = (block: Extract<ContentBlock, { type: "paragraph" }>): InspectorSnapshot => ({ align: block.align, blockAlign: block.blockAlign, style: block.style, visualStyle: block.visualStyle, siteRole: block.siteRole });

export function ParagraphBlockCatalogue() {
  const [block, setBlock] = useState(initialParagraph);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [resetRevision, setResetRevision] = useState(0);
  const [historyAvailability, setHistoryAvailability] = useState({ canUndo: false, canRedo: false });
  const specimenRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef(block);
  const historyRef = useRef<{ past: InspectorSnapshot[]; future: InspectorSnapshot[] }>({ past: [], future: [] });

  const updateText = useCallback((next: Extract<ContentBlock, { type: "paragraph" }>) => {
    currentRef.current = next;
    setBlock(next);
  }, []);
  const updateInspector = useCallback((next: ContentBlock) => {
    if (next.type !== "paragraph") return;
    historyRef.current = { past: [...historyRef.current.past, inspectorSnapshot(currentRef.current)].slice(-60), future: [] };
    currentRef.current = next;
    setBlock(next);
    setHistoryAvailability({ canUndo: historyRef.current.past.length > 0, canRedo: historyRef.current.future.length > 0 });
  }, []);
  const applySnapshot = useCallback((snapshot: InspectorSnapshot) => {
    const next = { ...currentRef.current, ...snapshot };
    currentRef.current = next;
    setBlock(next);
    setHistoryAvailability({ canUndo: historyRef.current.past.length > 0, canRedo: historyRef.current.future.length > 0 });
  }, []);
  const undo = useCallback(() => {
    const previous = historyRef.current.past.at(-1);
    if (!previous) return;
    historyRef.current = { past: historyRef.current.past.slice(0, -1), future: [...historyRef.current.future, inspectorSnapshot(currentRef.current)] };
    applySnapshot(previous);
  }, [applySnapshot]);
  const redo = useCallback(() => {
    const next = historyRef.current.future.at(-1);
    if (!next) return;
    historyRef.current = { past: [...historyRef.current.past, inspectorSnapshot(currentRef.current)], future: historyRef.current.future.slice(0, -1) };
    applySnapshot(next);
  }, [applySnapshot]);

  useEffect(() => {
    const root = specimenRef.current;
    if (!root) return;
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.matches("input, textarea, select, [role='textbox']"))) return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    }
    root.addEventListener("keydown", handleKeyDown);
    return () => root.removeEventListener("keydown", handleKeyDown);
  }, [redo, undo]);

  function resetExample() {
    historyRef.current = { past: [], future: [] };
    setHistoryAvailability({ canUndo: false, canRedo: false });
    currentRef.current = initialParagraph;
    setBlock(initialParagraph);
    setResetRevision(value => value + 1);
  }

  const studioBlock = block as ContentBlock;
  const previousIndent = precedingParagraph.style?.textIndent;
  return <StudioUiLibrary section="blocks"><main className="ui-page-intro ui-paragraph-page">
    <p className="rl-eyebrow"><a href="/studio/ui/blocks">Blocks</a> / Paragraph</p>
    <h1>Paragraph</h1>
    <p>{paragraphBlockDefinition.description} {paragraphBlockDefinition.inspector.intendedUse}</p>
    <section className="ui-paragraph-overview" aria-labelledby="ui-paragraph-overview-title">
      <div><h2 id="ui-paragraph-overview-title">Identity and ownership</h2><dl><div><dt>Block type</dt><dd><code>{paragraphBlockDefinition.type}</code></dd></div><div><dt>Creation default</dt><dd><code>{paragraphBlockDefinition.create("example").text}</code></dd></div><div><dt>Saved content</dt><dd>Typed Paragraph block with text, rich-text runs and the existing ParagraphStyle fields.</dd></div></dl></div>
      <div><h2>Relationships</h2><p>{paragraphInspectorProfile.nesting}</p><p>{paragraphInspectorProfile.context}</p><p>Transforms are resolved from the editor’s registered block transform definitions.</p><ul>{paragraphInspectorProfile.transforms.map(item => <li key={item.type}>{item.label} (<code>{item.type}</code>)</li>)}</ul></div>
    </section>

    <section className="ui-paragraph-specimen" aria-labelledby="ui-paragraph-specimen-title">
      <header className="ui-paragraph-specimen-header"><div><p className="rl-eyebrow">Temporary state only</p><h2 id="ui-paragraph-specimen-title">Editable specimen</h2></div><div className="ui-paragraph-actions">
        <button type="button" aria-label="Undo specimen inspector change" title="Undo (⌘Z / Ctrl+Z)" disabled={!historyAvailability.canUndo} onClick={undo}><StudioIcon name="undo" size={18} /></button>
        <button type="button" aria-label="Redo specimen inspector change" title="Redo (⌘⇧Z / Ctrl+Y)" disabled={!historyAvailability.canRedo} onClick={redo}><StudioIcon name="redo" size={18} /></button>
        <div role="group" aria-label="Specimen view"><button type="button" aria-pressed={mode === "edit"} onClick={() => setMode("edit")}>Edit</button><button type="button" aria-pressed={mode === "preview"} onClick={() => setMode("preview")}>Preview</button></div>
        <button type="button" onClick={resetExample}><StudioIcon name="rotate" size={18} />Reset Example</button>
      </div></header>
      <div className="ui-paragraph-editor-layout" ref={specimenRef}>
        <div className="ui-paragraph-canvas" aria-label={mode === "edit" ? "Paragraph edit specimen" : "Paragraph preview specimen"}>
          {mode === "edit" ? <>
            <BlockRenderer blocks={[precedingParagraph]} variant="studio" showMissingMetadata={false} />
            <ParagraphEditField key={`edit-${resetRevision}`} block={block} previousParagraphIndent={previousIndent} onChange={updateText} onSelectionChange={() => {}} onLinkActivate={() => {}} navigationRootRef={specimenRef} />
            <BlockRenderer blocks={[followingParagraph]} variant="studio" showMissingMetadata={false} />
          </> : <BlockRenderer blocks={[precedingParagraph, studioBlock, followingParagraph]} variant="studio" showMissingMetadata={false} />}
          <p className="ui-paragraph-sample-note">The preceding paragraph has a line indent; its value is applied to the following Paragraph according to Studio’s existing adjacency rule.</p>
        </div>
        <aside className="ui-paragraph-inspector" aria-label="Paragraph block inspector">
          <BlockInspector key={`${block.id}-${resetRevision}`} block={block} onChange={updateInspector} onOpenFiles={() => {}} canOpenFiles={false} fontSizeModeScope="paragraph-library" fontSizeViewModes={{}} onFontSizeViewModeChange={() => {}} />
        </aside>
      </div>
      <p className="ui-paragraph-isolation">Inspector Undo/Redo records specimen settings only. Text editing keeps the browser’s native text history. Reset Example restores this local sample; no document, settings store or write lock is involved.</p>
    </section>

    <section className="ui-paragraph-inventory" aria-labelledby="ui-paragraph-controls-title">
      <h2 id="ui-paragraph-controls-title">Inspector controls and dependencies</h2>
      <p>The rows follow the live inspector’s section and menu order. Block and Studio options remain separate tabs inside the inspector.</p>
      {paragraphInspectorProfile.inventorySections.map(section => <section id={section.id} key={section.id}><h3>{section.label}</h3><ol>{paragraphInspectorProfile.controls.filter(control => control.section === section.id).map(control => <li key={control.id}><span>{control.label}</span><span>{control.source === "gutenberg" ? "Block" : "Studio"}</span><span>{control.fields.join(", ")}</span></li>)}{section.fields.length > 0 ? <li><span>{section.label} settings</span><span>{section.source === "gutenberg" ? "Block" : "Studio"}</span><span>{section.fields.join(", ")}</span></li> : null}</ol></section>)}
      <h3>Dependencies</h3><ul>{paragraphInspectorProfile.dependencies.map(dependency => <li key={dependency.id}><a href={dependency.href} title={dependency.purpose}>{dependency.label}</a></li>)}</ul>
    </section>

    <section className="ui-paragraph-reference"><h2>Reference and compatibility</h2><p>Gutenberg is the default behaviour and visual reference. Core Paragraph options stay in Block; ACM additions such as Font family, Orientation, Text shadow and minimum dimensions stay in Studio.</p><p>ACM Studio retains its typed content model, managed media and safe style handling. The inspector catalogue is a current implementation profile, not a second saved format. Full Ribbon, inserter, publication and document workflows are outside this specimen.</p></section>
  </main></StudioUiLibrary>;
}
