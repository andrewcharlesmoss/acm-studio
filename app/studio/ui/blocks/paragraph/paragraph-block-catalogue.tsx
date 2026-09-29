"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentBlock, RichTextRun } from "../../../../content/model";
import { BlockRenderer } from "../../../../components/content";
import { paragraphBlockDefinition, paragraphInspectorProfile } from "../../../blocks/paragraph/definition";
import { BlockInspector } from "../../../studio-inspectors";
import { ParagraphEditField } from "../../../studio-canvas";
import { StudioIcon } from "../../../studio-icons";
import { BlockLibraryNavigation } from "../block-library-navigation";
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
const initialParagraphs = [precedingParagraph, initialParagraph, followingParagraph];
type ParagraphSpecimenBlock = Extract<ContentBlock, { type: "paragraph" }>;
const copyParagraphs = (paragraphs: ParagraphSpecimenBlock[]) => paragraphs.map(paragraph => structuredClone(paragraph));

export function ParagraphBlockCatalogue() {
  const [paragraphs, setParagraphs] = useState(() => copyParagraphs(initialParagraphs));
  const [activeId, setActiveId] = useState(initialParagraph.id);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [resetRevision, setResetRevision] = useState(0);
  const [historyAvailability, setHistoryAvailability] = useState({ canUndo: false, canRedo: false });
  const specimenRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef(paragraphs);
  const historyRef = useRef<{ past: ParagraphSpecimenBlock[][]; future: ParagraphSpecimenBlock[][]; lastTextEdit?: { id: string; time: number } }>({ past: [], future: [] });

  const updateParagraph = useCallback((next: ParagraphSpecimenBlock, textChange = false) => {
    const history = historyRef.current;
    const now = Date.now();
    const coalesceTextEdit = textChange && history.lastTextEdit?.id === next.id && now - history.lastTextEdit.time < 900;
    if (!coalesceTextEdit) history.past = [...history.past, copyParagraphs(currentRef.current)].slice(-60);
    history.future = [];
    history.lastTextEdit = textChange ? { id: next.id, time: now } : undefined;
    const updated = currentRef.current.map(paragraph => paragraph.id === next.id ? next : paragraph);
    currentRef.current = updated;
    setParagraphs(updated);
    setHistoryAvailability({ canUndo: history.past.length > 0, canRedo: false });
  }, []);
  const updateInspector = useCallback((next: ContentBlock) => {
    if (next.type !== "paragraph") return;
    updateParagraph(next);
  }, [updateParagraph]);
  const applySnapshot = useCallback((snapshot: ParagraphSpecimenBlock[]) => {
    const next = copyParagraphs(snapshot);
    historyRef.current.lastTextEdit = undefined;
    currentRef.current = next;
    setParagraphs(next);
    setHistoryAvailability({ canUndo: historyRef.current.past.length > 0, canRedo: historyRef.current.future.length > 0 });
  }, []);
  const undo = useCallback(() => {
    const previous = historyRef.current.past.at(-1);
    if (!previous) return;
    historyRef.current = { past: historyRef.current.past.slice(0, -1), future: [...historyRef.current.future, copyParagraphs(currentRef.current)] };
    applySnapshot(previous);
  }, [applySnapshot]);
  const redo = useCallback(() => {
    const next = historyRef.current.future.at(-1);
    if (!next) return;
    historyRef.current = { past: [...historyRef.current.past, copyParagraphs(currentRef.current)], future: historyRef.current.future.slice(0, -1) };
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
    setActiveId(initialParagraph.id);
    const resetParagraphs = copyParagraphs(initialParagraphs);
    currentRef.current = resetParagraphs;
    setParagraphs(resetParagraphs);
    setResetRevision(value => value + 1);
  }

  const activeParagraph = paragraphs.find(paragraph => paragraph.id === activeId) ?? paragraphs[1];
  const activeIndex = paragraphs.findIndex(paragraph => paragraph.id === activeParagraph.id);
  useEffect(() => {
    function openHashDisclosure() {
      if (!window.location.hash) return;
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = document.getElementById(id);
      if (!target) return;
      const parent = target.closest("details");
      if (!parent) return;
      parent.open = true;
      requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
    }
    openHashDisclosure();
    window.addEventListener("hashchange", openHashDisclosure);
    return () => window.removeEventListener("hashchange", openHashDisclosure);
  }, []);

  function paragraphIndent(index: number) {
    return index > 0 ? paragraphs[index - 1].style?.textIndent : undefined;
  }
  return <StudioUiLibrary section="blocks"><div className="ui-blocks-layout">
    <BlockLibraryNavigation active="paragraph" />
    <section className="ui-blocks-main ui-page-intro ui-paragraph-page">
    <p className="rl-eyebrow"><a href="/studio/ui/blocks">Blocks</a> / Paragraph</p>
    <h1>Paragraph</h1>
    <p>{paragraphBlockDefinition.description} {paragraphBlockDefinition.inspector.intendedUse}</p>
    <details className="ui-paragraph-overview ui-paragraph-disclosure"><summary><span>Identity and relationships</span><small>Block ownership, nesting and transforms</small></summary><div className="ui-paragraph-overview-content">
      <div><h2>Identity and ownership</h2><dl><div><dt>Block type</dt><dd><code>{paragraphBlockDefinition.type}</code></dd></div><div><dt>Creation default</dt><dd><code>{paragraphBlockDefinition.create("example").text}</code></dd></div><div><dt>Saved content</dt><dd>Typed Paragraph block with text, rich-text runs and the existing ParagraphStyle fields.</dd></div></dl></div>
      <div><h2>Relationships</h2><p>{paragraphInspectorProfile.nesting}</p><p>{paragraphInspectorProfile.context}</p><p>Transforms are resolved from the editor’s registered block transform definitions.</p><ul>{paragraphInspectorProfile.transforms.map(item => <li key={item.type}>{item.label} (<code>{item.type}</code>)</li>)}</ul></div>
    </div></details>
    <section className="ui-paragraph-specimen" aria-labelledby="ui-paragraph-specimen-title">
      <header className="ui-paragraph-specimen-header"><div><p className="rl-eyebrow">Temporary state only</p><h2 id="ui-paragraph-specimen-title">Editable specimen</h2></div><div className="ui-paragraph-actions">
        <button type="button" aria-label="Undo specimen change" title="Undo (⌘Z / Ctrl+Z)" disabled={!historyAvailability.canUndo} onClick={undo}><StudioIcon name="undo" size={18} /></button>
        <button type="button" aria-label="Redo specimen change" title="Redo (⌘⇧Z / Ctrl+Y)" disabled={!historyAvailability.canRedo} onClick={redo}><StudioIcon name="redo" size={18} /></button>
        <div role="group" aria-label="Specimen view"><button type="button" aria-pressed={mode === "edit"} onClick={() => setMode("edit")}>Edit</button><button type="button" aria-pressed={mode === "preview"} onClick={() => setMode("preview")}>Preview</button></div>
        <button type="button" onClick={resetExample}><StudioIcon name="rotate" size={18} />Reset Example</button>
      </div></header>
      <div className="ui-paragraph-editor-layout" ref={specimenRef}>
        <div className="ui-paragraph-canvas" aria-label={mode === "edit" ? "Paragraph edit specimen" : "Paragraph preview specimen"}>
          {mode === "edit" ? paragraphs.map((paragraph, index) => <div key={`${paragraph.id}-${resetRevision}`} className={`ui-paragraph-editable${activeId === paragraph.id ? " is-selected" : ""}`} onFocusCapture={() => setActiveId(paragraph.id)}>
            <ParagraphEditField block={paragraph} previousParagraphIndent={paragraphIndent(index)} onChange={next => updateParagraph(next, true)} onSelectionChange={() => setActiveId(paragraph.id)} onLinkActivate={() => {}} navigationRootRef={specimenRef} ariaLabel={`Paragraph ${index + 1} of ${paragraphs.length}`} />
          </div>) : <BlockRenderer blocks={paragraphs} variant="studio" showMissingMetadata={false} />}
        </div>
        <aside className="ui-paragraph-inspector" aria-label={`Paragraph ${activeIndex + 1} of ${paragraphs.length} settings`}>
          <BlockInspector key={`${activeParagraph.id}-${resetRevision}`} block={activeParagraph} onChange={updateInspector} onOpenFiles={() => {}} canOpenFiles={false} fontSizeModeScope="paragraph-library" fontSizeViewModes={{}} onFontSizeViewModeChange={() => {}} />
        </aside>
      </div>
      <p className="ui-paragraph-sample-note">The first paragraph’s line indent supplies the following paragraph’s indentation context. Select any paragraph to edit its text and settings.</p>
      <p className="ui-paragraph-isolation">Undo and Redo cover temporary specimen text and settings. Keyboard undo inside a paragraph stays with the browser’s native text history. Reset Example restores all three paragraphs; no document, settings store or write lock is involved.</p>
    </section>

    <details className="ui-paragraph-inventory ui-paragraph-disclosure" id="control-inventory">
      <summary><span>Inspector controls and dependencies</span><small>Control order, ownership and shared components</small></summary>
      <p>The rows follow the live inspector’s section and menu order. Block and Studio options remain separate tabs inside the inspector.</p>
      {paragraphInspectorProfile.inventorySections.map(section => <section id={section.id} key={section.id}><h3>{section.label}</h3><ol>{paragraphInspectorProfile.controls.filter(control => control.section === section.id).map(control => <li key={control.id}><span>{control.label}</span><span>{control.source === "gutenberg" ? "Block" : "Studio"}</span><span>{control.fields.join(", ")}</span></li>)}{section.fields.length > 0 ? <li><span>{section.label} settings</span><span>{section.source === "gutenberg" ? "Block" : "Studio"}</span><span>{section.fields.join(", ")}</span></li> : null}</ol></section>)}
      <h3>Dependencies</h3><ul>{paragraphInspectorProfile.dependencies.map(dependency => <li key={dependency.id}><a href={dependency.href} title={dependency.purpose}>{dependency.label}</a></li>)}</ul>
    </details>

    <details className="ui-paragraph-reference ui-paragraph-disclosure" id="compatibility-notes"><summary><span>Gutenberg compatibility and Studio additions</span><small>What matches the reference and what is specific to Studio</small></summary><div><p>Gutenberg is the default behaviour and visual reference. Core Paragraph options stay in Block; ACM additions such as Font family, Orientation, Text shadow and minimum dimensions stay in Studio.</p><p>ACM Studio retains its typed content model, managed media and safe style handling. The inspector catalogue is a current implementation profile, not a second saved format. Full Ribbon, inserter, publication and document workflows are outside this specimen.</p></div></details>
    </section>
  </div></StudioUiLibrary>;
}
