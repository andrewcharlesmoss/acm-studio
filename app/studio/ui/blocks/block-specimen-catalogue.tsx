"use client";

import { childContentBlocks } from "../../../content/block-tree";
import { findColumnsParent, maximumColumnWidth } from "../../../content/columns";
import { editBlockSiblings } from "../../block-sibling-operations";

import { useStudioBlockCommands } from "../../use-studio-block-commands";
import { handleStudioHistoryShortcut } from "../../studio-history-shortcuts.mjs";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ButtonInteractionState, ContentBlock, RichTextRun, SocialIconBlock } from "../../../content/model";
import { spacerOrientationFor } from "../../../content/spacer";
import { BlockRenderer } from "../../../components/content";
import { createBlock, type InsertableBlockType, type StudioDocument } from "../../editor-model";
import { TableCaptionControl, TableCaptionProvider } from "../../table-caption-control";
import { BlockField } from "../../studio-canvas";
import { BlockInspector } from "../../studio-inspectors";
import { StudioIcon } from "../../studio-icons";
import { BlockLibraryIcon } from "../../block-library-icons";
import { blockLibraryEntries, blockLibraryEntryByType } from "../../blocks/library-catalogue";
import { createTemplateSet, templateNodesFromBlocks, type TemplateNode, type TemplateSet } from "../../template-model";
import { TemplateNodes, TemplateSurface } from "../../template-renderer";
import { BlockLibraryNavigation } from "./block-library-navigation";
import { additionalCssCompatibility, blockCatalogueDocumentation } from "../../blocks/catalogue-documentation";

type SpecimenData = { blocks: ContentBlock[]; document: StudioDocument };
type SpecimenSnapshot = { past: SpecimenData[]; future: SpecimenData[]; lastEdit?: { key: string; at: number } };
export type BlockType = keyof typeof blockLibraryEntryByType;

const initialParagraphRuns: RichTextRun[] = [
  { text: "A block specimen with a " },
  { text: "linked phrase", marks: [{ type: "link", url: "https://example.test/studio-library" }] },
  { text: " and room to try its inspector settings." },
];

function paragraph(id: string, text = "Write a short example of your own."): Extract<ContentBlock, { type: "paragraph" }> {
  return { id, type: "paragraph", text };
}

function makeDocument(blocks: ContentBlock[]): StudioDocument {
  return {
    id: "studio-ui-library-example", kind: "post", title: "A sample document title", subtitle: "Temporary metadata for this local example", slug: "sample-document", excerpt: "Example excerpt.",
    author: "Andrew Moss", status: "draft", updatedAt: "2026-09-30T09:00:00.000Z", publishedAt: "2026-09-16T11:30:00.000Z", blocks,
    tags: [], seoTitle: "A sample document title", seoDescription: "A local Studio UI Library document example.",
  };
}

function fixtureFor(type: BlockType): { data: SpecimenData; selectedId: string; note: string } {
  const id = `${type}-library-specimen`;
  let blocks: ContentBlock[];
  let selectedId = id;
  let note = "Edit this local example, change inspector options and switch to Preview. Reset Example restores the fixture.";

  if (type === "template-content") {
    blocks = [{ id, type: "group", layout: "flow", inheritLayout: true, data: { templateElement: "content" }, children: [
      { ...paragraph("content-slot-heading", "Content supplied by the current document."), type: "paragraph" },
      { ...paragraph("content-slot-body", "This body is projected into the template Content slot during local preview.") },
      { ...paragraph("content-slot-linked", "The document body remains typed content, with links and formatting stored in runs."), runs: initialParagraphRuns },
    ] }];
    selectedId = id;
    note = "This specimen uses the real Content slot inspector with a temporary example body. The current document body is projected into the slot; the projection itself is not saved as a content block.";
  } else if (type === "paragraph") {
    blocks = [{ id, type, text: initialParagraphRuns.map(run => run.text).join(""), runs: structuredClone(initialParagraphRuns) }];
  } else if (type === "heading") {
    blocks = [{ id, type, level: 2, text: "A clear section heading" }];
  } else if (type === "quote") {
    blocks = [{ id, type, text: "", children: [paragraph(`${id}-paragraph`, "A useful idea deserves a little space.")], attribution: "A Studio reader", quoteStyle: "default" }, { id: `${id}-legacy`, type, text: "A legacy quote remains editable.", attribution: "Legacy content", quoteStyle: "plain" }];
  } else if (type === "list") {
    blocks = [{ id, type, style: "ordered", marker: "a", start: 3, items: [{ text: "A first item", children: [{ id: `${id}-nested`, type: "list", style: "unordered", visualStyle: { backgroundColor: "#fff3cd" }, items: ["A nested item", "Another nested item"] }] }, "A second item", "A third item"] }];
  } else if (type === "table") {
    blocks = [
      { id: "table-populated", type, hasHeader: true, rows: [["Item", "Status"], ["Library profiles", "In progress"], ["Controls", "Planned"]], caption: "Example settings inventory", tableStyle: "stripes" },
      { id: "table-sections", type, hasHeader: true, headerRowCount: 2, hasFooter: true, footerRowCount: 2, rows: [["Category", "Status"], ["Section", "Detail"], ["Shared controls", "Reviewed"], ["Subtotal", "One item"], ["Total", "One item"]], caption: "Multiple header and footer rows", cellRuns: [[[{ text: "Category", marks: ["bold"] }], [{ text: "Status" }]], [[{ text: "Section" }], [{ text: "Detail" }]], [[{ text: "Shared controls" }], [{ text: "Reviewed" }]], [[{ text: "Subtotal" }], [{ text: "One item" }]], [[{ text: "Total" }], [{ text: "One item" }]]] },
      { id: "table-empty", type, rows: [] },
    ];
    selectedId = "table-populated";
    note = "Choose a table in the specimen selector. Populated, multiple-section and empty cases share the live table editor and inspector.";
  } else if (type === "code") {
    blocks = [{ id, type, language: "typescript", code: "type Example = {\n  local: true;\n  saved: false;\n};" }];
  } else if (type === "image") {
    blocks = [{ id, type, src: "", mediaId: "library-local-image", alt: "Illustrated green hill with a blue sky", caption: "A local SVG fixture", aspectRatio: "landscape", scale: "cover", displayWidth: 640, displayHeight: 360 }];
  } else if (type === "embed") {
    blocks = [{ id, type, url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", title: "YouTube example", caption: "A provider player with an original-content fallback." }, { id: `${id}-unsupported`, type, url: "https://example.test/reference", title: "Unsupported provider example", caption: "The original URL remains available when embedding is unsupported.", editorial: { name: "Reference", note: "Retain this source when converting it to a link.", lock: { move: true, remove: true } }, visualStyle: { anchor: "reference-link", margin: "16px" } }];
  } else if (type === "divider") {
    blocks = [{ id, type, style: "wide", tagName: "hr" }];
  } else if (type === "buttons") {
    const child = (childId: string, width: 25 | 50 | 75 | 100, style: "primary" | "secondary" = "primary"): Extract<ContentBlock, { type: "button" }> => ({ id: childId, type: "button", label: style === "secondary" ? "Outline" : "Fill", url: "https://example.test/guide", style, width });
    blocks = [
      { id, type, horizontalGap: 24, verticalGap: 12, visualStyle: { fontSizeCustom: "24px", appearance: "bold", textColor: "#123456" }, children: [{ ...child(`${id}-fill`, 50), visualStyle: { backgroundColor: "#fff3cd" } }, { ...child(`${id}-outline`, 50, "secondary"), interactionStyles: { hover: { width: 25 }, focus: { width: 75 } } }] },
      { id: `${id}-quarters`, type, horizontalGap: 24, children: Array.from({ length: 4 }, (_, index) => child(`${id}-quarter-${index}`, 25, index % 2 ? "secondary" : "primary")) },
      { id: `${id}-vertical`, type, orientation: "vertical", horizontalGap: 24, verticalGap: 12, children: [child(`${id}-vertical-half`, 50), child(`${id}-vertical-full`, 100, "secondary")] },
    ];
    note = "The group owns layout and inherited typography. Compare half-width, quarter-width and vertical buttons; the Outline child's Hover and Focus widths use the same group boundary. Changes remain temporary.";
  } else if (type === "button") {
    blocks = [{ id, type, label: "Read the guide", url: "https://example.test/guide", style: "primary", width: 50, title: "Open the example guide" }];
  } else if (type === "field") {
    blocks = [{ id, type, control: "select", label: "Preferred layout", value: "Stack", options: ["Stack", "Row", "Grid"] }];
  } else if (type === "spacer") {
    blocks = [
      { id, type, height: 48, heightUnit: "px" },
      { id: "spacer-row-parent", type: "group", layout: "row", gap: 16, children: [
        { id: "spacer-row-child", type, height: 48, heightUnit: "px", width: 240, widthUnit: "px" },
        paragraph("spacer-row-label", "The spacer sits between these Row children."),
      ] },
    ];
    note = "Select the standalone Spacer to edit Height, or the nested Spacer to edit Width inside a Row. The Row setting determines the axis, even when the layout stacks at a narrow viewport.";
  } else if (type === "document-title" || type === "document-subtitle" || type === "cover-image" || type === "reading-time" || type === "post-author" || type === "post-date") {
    blocks = [
      { id: "document-title-fixture", type: "document-title", level: 2 },
      { id: "document-subtitle-fixture", type: "document-subtitle" },
      { id: "cover-image-fixture", type: "cover-image", aspectRatio: "wide", scale: "cover" },
      { id: "reading-time-fixture", type: "reading-time", prefix: "Reading time:", presentation: "badge" },
      { id: "post-author-fixture", type: "post-author", prefix: "By", avatar: true },
      { id: "post-date-fixture", type: "post-date", format: "long", showIcon: true },
      paragraph("metadata-body-fixture", "This temporary body text contributes to the reading estimate and word count. Edit it to see those values update."),
    ];
    selectedId = `${type}-fixture`;
    note = "The adjacent form edits only this specimen’s temporary example document. Its dynamic blocks update in Edit and Preview.";
  } else if (type === "social-icons") {
    const children: SocialIconBlock[] = [
      { id: "social-linkedin-fixture", type: "social-linkedin", url: "https://www.linkedin.com/in/example", label: "LinkedIn" },
      { id: "social-tiktok-fixture", type: "social-tiktok", url: "https://www.tiktok.com/@example", label: "TikTok" },
    ];
    blocks = [{ id, type, children, socialStyle: "pill-shape", justification: "left", iconSize: "normal", showLabels: true, openInNewTab: true }];
  } else if (type === "social-linkedin" || type === "social-tiktok") {
    blocks = [{ id, type, url: type === "social-linkedin" ? "https://www.linkedin.com/in/example" : "https://www.tiktok.com/@example", label: type === "social-linkedin" ? "LinkedIn profile" : "TikTok profile" }];
  } else if (type === "footnotes") {
    const reference = { id: "footnote-reference", type: "paragraph" as const, text: "This sentence points to a source.", runs: [{ text: "This sentence points to a source", marks: [{ type: "footnote" as const, id: "source-note" }] }, { text: "." }] };
    blocks = [reference, { id, type, notes: [{ id: "source-note", text: "A temporary source note, referenced from the sentence above." }] }];
    note = "The paragraph contains a real footnote reference and the system-managed Footnotes block contains its editable note.";
  } else if (type === "column") {
    const firstColumn: Extract<ContentBlock, { type: "column" }> = { id, type, width: 62, verticalAlign: "top", children: [paragraph("column-child-one", "This Column is nested in Columns.")] };
    const secondColumn: Extract<ContentBlock, { type: "column" }> = { id: "column-sibling", type: "column", width: 38, verticalAlign: "centre", children: [paragraph("column-child-two", "Its sibling keeps an independent width.")] };
    blocks = [{ id: "column-parent", type: "columns", children: [firstColumn, secondColumn], stackAt: "mobile" }];
    note = "Select the nested Column in the example selector. It retains its owning Columns layout and sibling context.";
  } else if (type === "component") {
    blocks = [{ id, type, component: "mini-golf-scorecard", data: { heading: "Sample scorecard", player1: "Player one", player2: "Player two" } }];
    note = "The component is displayed in its supported inactive state. Its real integration is not invoked by a library fixture.";
  } else if (type === "group" || type === "section") {
    const children: ContentBlock[] = [
      { id: `${type}-child-heading`, type: "heading", level: 3, text: "Selectable child heading" },
      paragraph(`${type}-child-copy`, "Edit this child independently from its containing block."),
    ];
    blocks = type === "group"
      ? [
        { id, type, layout: "flow", inheritLayout: true, children: [] },
        { id: "group-row-example", type, layout: "row", gap: 20, columnGap: 20, rowGap: 12, stackAt: "mobile", children },
      ]
      : [{ id, type, layout: "stack", children }];
    note = type === "group"
      ? "The first Group starts empty so you can try the layout chooser. The second Group has editable children and a responsive Row layout."
      : "Select either nested child above the specimen to inspect it. The container and child edits share local history.";
  } else if (type === "columns") {
    const columnsBlock = createBlock("columns", id);
    if (columnsBlock.type === "columns") {
      columnsBlock.children = columnsBlock.children.map((column, index) => ({ ...column, children: [paragraph(`${id}-child-${index + 1}`, `Editable content in Column ${index + 1}.`)] }));
      blocks = [columnsBlock];
    } else blocks = [columnsBlock];
    note = "Select a nested Column or its child content above the specimen. Column widths and layout remain independent.";
  } else {
    const insertableType = type as InsertableBlockType;
    const created = createBlock(insertableType, id);
    blocks = [created];
  }

  const document = makeDocument(blocks);
  document.coverImage = { src: "", mediaId: "library-local-image", alt: "Illustrated green hill with a blue sky" };
  return { data: { blocks, document }, selectedId, note };
}

function allBlocks(blocks: ContentBlock[]): ContentBlock[] {
  const result: ContentBlock[] = [];
  const visit = (block: ContentBlock) => {
    result.push(block);
    childContentBlocks(block).forEach(visit);
  };
  blocks.forEach(visit);
  return result;
}

function replaceBlock(blocks: ContentBlock[], replacement: ContentBlock): ContentBlock[] {
  return editBlockSiblings(blocks, replacement.id, (siblings, index) => siblings.map((block, position) => position === index ? replacement : block));
}

function specimenLabel(block: ContentBlock): string {
  if (block.type === "paragraph") return block.text.length > 42 ? `${block.text.slice(0, 42).trimEnd()}…` : block.text || "Paragraph";
  if (block.type === "heading") return block.text || "Heading";
  if (block.type === "table") return !block.rows.length ? "Empty Table" : (block.headerRowCount ?? 0) > 1 || (block.footerRowCount ?? 0) > 1 ? "Table with sections" : "Populated Table";
  if (block.type === "buttons") return block.orientation === "vertical" ? "Vertical Buttons" : block.children.length && block.children.every(child => child.width === block.children[0].width) && block.children[0].width ? `Buttons (${block.children[0].width}%)` : "Buttons";
  if (block.type === "button") return `${block.label || "Button"}${block.width ? ` (${block.width}%)` : ""}`;
  if (block.type === "column") return "Nested Column";
  if (block.type === "divider") return "Separator";
  if (block.type === "social-linkedin" || block.type === "social-tiktok") return block.label ?? (block.type === "social-linkedin" ? "LinkedIn" : "TikTok");
  return block.type.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function cloneData(data: SpecimenData): SpecimenData { return structuredClone(data); }

function createStableExampleTemplateSet(): TemplateSet {
  const set = createTemplateSet("Studio UI Library Example");
  const ids = new Map<string, string>();
  let sequence = 0;
  const stableId = (id: string) => {
    const existing = ids.get(id);
    if (existing) return existing;
    const next = `ui-library-${sequence++}`;
    ids.set(id, next);
    return next;
  };
  const stabiliseNodes = (nodes: TemplateNode[]) => nodes.forEach(node => {
    node.id = stableId(node.id);
    if (node.type === "part") node.partId = stableId(node.partId);
    else if (node.type === "group" || node.type === "section" || node.type === "columns" || node.type === "column") stabiliseNodes(node.children);
  });
  set.id = stableId(set.id);
  set.parts.forEach(part => { part.id = stableId(part.id); stabiliseNodes(part.nodes); });
  set.templates.forEach(template => { template.id = stableId(template.id); stabiliseNodes(template.nodes); });
  return set;
}

const exampleTemplateSet = createStableExampleTemplateSet();

export function BlockLibraryCatalogue({ initialType }: { initialType: BlockType | null }) {
  const [selectedType, setSelectedType] = useState<BlockType | null>(initialType);
  const [initialRouteType, setInitialRouteType] = useState(initialType);
  const selectType = useCallback((type: BlockType | null) => {
    setInitialRouteType(null);
    setSelectedType(type);
  }, []);
  const groups = blockLibraryEntries.reduce<Map<string, typeof blockLibraryEntries>>((result, entry) => {
    const entries = result.get(entry.group) ?? [];
    result.set(entry.group, [...entries, entry]);
    return result;
  }, new Map());

  return <div className="ui-blocks-layout">
    <BlockLibraryNavigation active={selectedType ?? "all"} onSelect={selectType} />
    {selectedType
      ? <BlockSpecimenDetail key={selectedType} type={selectedType} onBack={() => selectType(null)} handleInitialHash={initialRouteType === selectedType} />
      : <section className="ui-blocks-main ui-page-intro" aria-labelledby="ui-blocks-title">
        <p className="rl-eyebrow">Block Library</p><h1 id="ui-blocks-title">Blocks</h1>
        <p>Choose a block from the menu to inspect its editable specimen, controls and compatibility notes.</p>
        {[...groups].map(([group, entries]) => <section className="ui-block-index-group" key={group}><h2>{group}</h2><div className="ui-block-index-grid">{entries.map((entry) => <article className="ui-catalogue-card" key={entry.type}><div><p className="rl-eyebrow">{entry.type === "template-content" ? "Template element" : entry.profile.mapping}</p><h3>{entry.label}</h3><p>{entry.description}</p></div><button type="button" onClick={() => selectType(entry.type)}>Open {entry.label} <span aria-hidden="true">→</span></button></article>)}</div></section>)}
      </section>}
  </div>;
}

function BlockSpecimenDetail({ type, onBack, handleInitialHash }: { type: BlockType; onBack: () => void; handleInitialHash: boolean }) {
  const entry = blockLibraryEntryByType[type];
  const profile = blockCatalogueDocumentation(entry.profile);
  const fixture = fixtureFor(type);
  const [data, setData] = useState<SpecimenData>(() => cloneData(fixture.data));
  const dataRef = useRef(data);
  const historyRef = useRef<SpecimenSnapshot>({ past: [], future: [] });
  const [selectedId, setSelectedId] = useState(fixture.selectedId);
  const [selectedListItem, setSelectedListItem] = useState<{ blockId: string; listId: string; itemIndex: number } | null>(null);
  const [buttonPreview, setButtonPreview] = useState<{ blockId: string; state: ButtonInteractionState } | null>(null);
  const [fontSizeViewModes, setFontSizeViewModes] = useState<Record<string, "presets" | "custom">>({});
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [useTemplateStyles, setUseTemplateStyles] = useState(false);
  const [resetRevision, setResetRevision] = useState(0);
  const [historyAvailability, setHistoryAvailability] = useState({ canUndo: false, canRedo: false });
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const specimenRef = useRef<HTMLElement>(null);
  const blocks = allBlocks(data.blocks);
  const activeBlock = blocks.find(block => block.id === selectedId) ?? blocks[0];

  useEffect(() => {
    const samples = {
      "library-local-image": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#cbe8f4"/><circle cx="500" cy="78" r="40" fill="#f3ca69"/><path d="M0 270 165 120l132 150 120-132 223 222H0Z" fill="#769a7d"/><path d="m0 310 192-108 140 101 136-78 172 90v45H0Z" fill="#456f5d"/></svg>`,
      "library-local-image-two": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#f8e7d6"/><circle cx="318" cy="180" r="94" fill="#e6a56d"/><circle cx="318" cy="180" r="56" fill="#f8d370"/><path d="M318 274v86" stroke="#587a54" stroke-width="18"/><path d="M318 330c-58-32-101-24-130 8 54 11 98 7 130-8Zm0 12c58-32 101-24 130 8-54 11-98 7-130-8Z" fill="#769a66"/></svg>`,
    };
    const urls = Object.fromEntries(Object.entries(samples).map(([id, svg]) => [id, URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))]));
    const frame = window.requestAnimationFrame(() => setMediaUrls(urls));
    return () => { window.cancelAnimationFrame(frame); Object.values(urls).forEach(URL.revokeObjectURL); };
  }, []);

  useEffect(() => {
    if (!handleInitialHash) return;
    function openHashDisclosure() {
      if (!window.location.hash) return;
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = document.getElementById(id);
      const disclosure = target?.closest("details");
      if (!target || !disclosure) return;
      disclosure.open = true;
      requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
    }
    openHashDisclosure();
    window.addEventListener("hashchange", openHashDisclosure);
    return () => window.removeEventListener("hashchange", openHashDisclosure);
  }, [handleInitialHash]);

  const publish = useCallback((next: SpecimenData, editKey?: string) => {
    const history = historyRef.current;
    const now = Date.now();
    const coalesce = Boolean(editKey && history.lastEdit?.key === editKey && now - history.lastEdit.at < 900);
    if (!coalesce) history.past = [...history.past, cloneData(dataRef.current)].slice(-60);
    history.future = [];
    history.lastEdit = editKey ? { key: editKey, at: now } : undefined;
    const cloned = cloneData(next);
    dataRef.current = cloned;
    setData(cloned);
    setHistoryAvailability({ canUndo: history.past.length > 0, canRedo: false });
  }, []);

  const commands = useStudioBlockCommands({ activeDocument: { ...data.document, blocks: data.blocks }, updateActiveDocument: update => {
    const current = dataRef.current;
    const currentDocument = { ...current.document, blocks: current.blocks };
    const nextDocument = update(currentDocument);
    if (nextDocument === currentDocument) return;
    publish({ ...current, document: nextDocument, blocks: nextDocument.blocks });
  } });
  const updateBlock = useCallback((replacement: ContentBlock, textEdit = false, expectedSource?: ContentBlock) => {
    if (expectedSource && JSON.stringify(allBlocks(dataRef.current.blocks).find(block => block.id === expectedSource.id)) !== JSON.stringify(expectedSource)) return;
    const nextBlocks = replaceBlock(dataRef.current.blocks, replacement);
    const next: SpecimenData = { ...dataRef.current, blocks: nextBlocks, document: { ...dataRef.current.document, blocks: nextBlocks } };
    publish(next, textEdit ? replacement.id : undefined);
  }, [publish]);

  const updateDocument = useCallback((patch: Partial<StudioDocument>, key: string) => {
    publish({ ...dataRef.current, document: { ...dataRef.current.document, ...patch } }, key);
  }, [publish]);

  const chooseFixtureMedia = useCallback(() => {
    const target = allBlocks(dataRef.current.blocks).find(block => block.id === selectedId);
    if (target?.type === "image") {
      const mediaId = target.mediaId === "library-local-image" ? "library-local-image-two" : "library-local-image";
      updateBlock({ ...target, src: "", mediaId, alt: mediaId === "library-local-image" ? "Illustrated green hill with a blue sky" : "Illustrated flower in a warm field", caption: mediaId === "library-local-image" ? "A local landscape sample" : "A local flower sample", decorative: false });
    } else if (target?.type === "quote" || target?.type === "group" || target?.type === "heading" || target?.type === "code" || target?.type === "document-title") {
      const style = target.visualStyle ?? {};
      const backgroundImageMediaId = style.backgroundImageMediaId === "library-local-image" ? "library-local-image-two" : "library-local-image";
      updateBlock({ ...target, visualStyle: { ...style, backgroundImageMediaId } });
    }
  }, [selectedId, updateBlock]);

  const applyHistory = useCallback((snapshot: SpecimenData, past: SpecimenData[], future: SpecimenData[]) => {
    const next = cloneData(snapshot);
    historyRef.current.lastEdit = undefined;
    historyRef.current.past = past;
    historyRef.current.future = future;
    dataRef.current = next;
    setData(next);
    setHistoryAvailability({ canUndo: past.length > 0, canRedo: future.length > 0 });
  }, []);

  const undo = useCallback(() => {
    const history = historyRef.current;
    const previous = history.past.at(-1);
    if (!previous) return;
    applyHistory(previous, history.past.slice(0, -1), [...history.future, cloneData(dataRef.current)]);
  }, [applyHistory]);
  const redo = useCallback(() => {
    const history = historyRef.current;
    const next = history.future.at(-1);
    if (!next) return;
    applyHistory(next, [...history.past, cloneData(dataRef.current)], history.future.slice(0, -1));
  }, [applyHistory]);

  useEffect(() => {
    const root = specimenRef.current;
    if (!root) return;
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      handleStudioHistoryShortcut(event, navigator.platform, undo, redo);
    }
    root.addEventListener("keydown", handleKeyDown);
    return () => root.removeEventListener("keydown", handleKeyDown);
  }, [redo, undo, resetRevision]);

  function resetExample() {
    const fresh = cloneData(fixture.data);
    dataRef.current = fresh;
    setData(fresh);
    historyRef.current = { past: [], future: [] };
    setSelectedId(fixture.selectedId);
    setSelectedListItem(null);
    setButtonPreview(null);
    setUseTemplateStyles(false);
    setFontSizeViewModes({});
    setHistoryAvailability({ canUndo: false, canRedo: false });
    setResetRevision(revision => revision + 1);
  }

  const addNestedParagraph = (parentId: string) => {
    const parent = allBlocks(dataRef.current.blocks).find(block => block.id === parentId);
    if (!parent || !(parent.type === "columns" || parent.type === "column" || parent.type === "group" || parent.type === "section" || parent.type === "component" || parent.type === "quote")) return;
    const target = parent.type === "columns" ? parent.children[0] : parent;
    if (target) commands.insertBlock("paragraph", null, target.id);
  };
  const insertNestedBlock = (childType: InsertableBlockType, parentId: string) => {
    if (childType === "paragraph" || childType === "button") {
      const added = commands.insertBlock(childType, null, parentId);
      if (added) { setSelectedListItem(null); setSelectedId(added.id); }
      return;
    }
    if (childType === "social-linkedin" || childType === "social-tiktok") {
      const parent = allBlocks(dataRef.current.blocks).find(item => item.id === parentId);
      if (parent?.type === "social-icons") {
        const nextChild: SocialIconBlock = { id: `added-${childType}-${Date.now()}`, type: childType, url: "", label: childType === "social-linkedin" ? "LinkedIn" : "TikTok" };
        updateBlock({ ...parent, children: [...parent.children, nextChild] });
      }
    }
  };

  const specimenBlocks = blocks;
  const currentTypeIsMetadata = ["document-title", "document-subtitle", "cover-image", "reading-time", "post-author", "post-date"].includes(type);
  const inspectorBlock = activeBlock ?? data.blocks[0];
  const selectedColumnParent = inspectorBlock?.type === "column" ? findColumnsParent(data.blocks, inspectorBlock.id) : undefined;
  const entryTitle = type === "template-content" ? "Content" : entry.label;
  const editLabel = type === "template-content" ? "Template Content projection" : `${entryTitle} editing specimen`;
  const previewLabel = type === "template-content" ? "Document body in a template Content slot" : `${entryTitle} preview specimen`;
  const specimenContent = <>
{mode === "edit" ? data.blocks.map(block => block.type === "component"
              ? <div className="ui-component-inactive" key={block.id} data-studio-block-id={block.id}><BlockLibraryIcon type="component" /><div><strong>{block.component.replace("mini-golf-", "Mini Golf ")}</strong><p>Inactive integration specimen</p><p>{Object.values(block.data ?? {}).filter(value => typeof value === "string").join(" · ")}</p></div></div>
              : <div key={`${block.id}-${resetRevision}`} className="ui-block-editable"><BlockField onSplitParagraph={commands.splitParagraph} onMergeParagraphBackward={commands.mergeParagraphBackward} onSplitParagraphs={commands.splitParagraphs} onExitList={commands.exitList} block={block} rootBlocks={data.blocks} spacerOrientation={spacerOrientationFor(data.blocks, block.id)} document={data.document} selectedBlockId={selectedId} buttonPreview={buttonPreview} mediaUrl={block.type === "image" && block.mediaId ? mediaUrls[block.mediaId] : undefined} mediaUrls={mediaUrls} coverImageUrl={mediaUrls["library-local-image"]} onTableCellFocus={() => setSelectedId(block.id)} onTextSelection={() => { setSelectedListItem(null); setSelectedId(block.id); }} onListItemSelection={(list, itemIndex) => { setSelectedId(list.id); setSelectedListItem({ blockId: list.id, listId: list.id, itemIndex }); }} onLinkActivate={() => {}} onChange={(next, requireSourceMatch) => updateBlock(next, !requireSourceMatch, requireSourceMatch ? block : undefined)} onOpenNestedInserter={addNestedParagraph} onInsertNestedBlock={insertNestedBlock} /></div>)
              : type === "component"
                ? <div className="ui-component-inactive" data-studio-block-id={data.blocks[0]?.id}><BlockLibraryIcon type="component" /><div><strong>{data.blocks[0]?.type === "component" ? data.blocks[0].component.replace("mini-golf-", "Mini Golf ") : "Component"}</strong><p>Inactive integration specimen</p><p>{data.blocks[0]?.type === "component" ? Object.values(data.blocks[0].data ?? {}).filter(value => typeof value === "string").join(" · ") : ""}</p></div></div>
                : type === "template-content" && exampleTemplateSet.templates.find(template => template.kind === data.document.kind)
                  ? <TemplateSurface set={exampleTemplateSet}><TemplateNodes set={exampleTemplateSet} document={data.document} nodes={templateNodesFromBlocks(data.blocks)} content={<BlockRenderer blocks={data.blocks[0]?.type === "group" ? data.blocks[0].children : []} mediaUrls={mediaUrls} variant="studio" hideDividers={false} document={data.document} />} mediaUrls={mediaUrls} templatePreview /></TemplateSurface>
                : <BlockRenderer blocks={data.blocks} mediaUrls={mediaUrls} variant="studio" showMissingMetadata={false} document={data.document} buttonPreview={buttonPreview} />}
  </>;
  return <TableCaptionProvider key={`${type}-${resetRevision}`}><section className="ui-blocks-main ui-page-intro ui-block-detail-page" aria-labelledby="ui-block-detail-title">
      <p className="rl-eyebrow"><button type="button" onClick={onBack}>Blocks</button> / {entryTitle}</p>
      <h1 id="ui-block-detail-title">{entryTitle}</h1>
      <p>{entry.description}</p>
      <section className="ui-block-specimen" aria-labelledby="ui-block-specimen-title" data-studio-document-id={`${data.document.id}:${resetRevision}`} data-studio-rich-text-history ref={specimenRef}>
        <header className="ui-block-specimen-header"><div><p className="rl-eyebrow">Temporary state only</p><h2 id="ui-block-specimen-title">Editable specimen</h2></div><div className="ui-block-actions">
          {mode === "edit" && activeBlock?.type === "table" ? <TableCaptionControl block={activeBlock} onChange={next => updateBlock(next)} /> : null}
          <button type="button" aria-label="Undo specimen change" title="Undo (⌘Z / Ctrl+Z)" disabled={!historyAvailability.canUndo} onClick={undo}><StudioIcon name="undo" size={18} /></button>
          <button type="button" aria-label="Redo specimen change" title="Redo (⌘⇧Z / Ctrl+Y)" disabled={!historyAvailability.canRedo} onClick={redo}><StudioIcon name="redo" size={18} /></button>
          <div role="group" aria-label="Specimen view"><button type="button" aria-pressed={mode === "edit"} onClick={() => setMode("edit")}>Edit</button><button type="button" aria-pressed={mode === "preview"} onClick={() => setMode("preview")}>Preview</button></div>
          {type === "buttons" || type === "button" ? <label><input type="checkbox" checked={useTemplateStyles} onChange={event => setUseTemplateStyles(event.target.checked)} />Use Template Styles</label> : null}
          <button type="button" onClick={resetExample}><StudioIcon name="rotate" size={18} />Reset Example</button>
        </div></header>
        {specimenBlocks.length > 1 ? <div className="ui-specimen-selection" role="group" aria-label="Select an example block">{specimenBlocks.map(block => <button key={block.id} type="button" aria-pressed={selectedId === block.id} onClick={() => { setSelectedListItem(null); setSelectedId(block.id); }}>{specimenLabel(block)}</button>)}</div> : null}
        {currentTypeIsMetadata ? <fieldset className="ui-specimen-document-fields"><legend>Temporary example document</legend><label>Title<input value={data.document.title} onChange={event => updateDocument({ title: event.target.value, seoTitle: event.target.value }, "document-title")} /></label><label>Subtitle<input value={data.document.subtitle ?? ""} onChange={event => updateDocument({ subtitle: event.target.value }, "document-subtitle")} /></label><label>Author<input value={data.document.author ?? ""} onChange={event => updateDocument({ author: event.target.value }, "document-author")} /></label><label>Publication date<input type="date" value={(data.document.publishedAt ?? "").slice(0, 10)} onChange={event => updateDocument({ publishedAt: event.target.value ? `${event.target.value}T11:30:00.000Z` : undefined }, "document-date")} /></label></fieldset> : null}
        <div className="ui-block-editor-layout">
          <div className={`ui-block-canvas${type === "template-content" ? " is-content-projection" : ""}`} aria-label={mode === "edit" ? editLabel : previewLabel}>
            {useTemplateStyles ? <TemplateSurface set={exampleTemplateSet} editing={mode === "edit"}>{specimenContent}</TemplateSurface> : specimenContent}
            {type === "template-content" ? <p className="ui-template-projection-note">Edit the temporary document body above. Preview renders that body through the production template Content slot.</p> : null}
          </div>
          {inspectorBlock ? <aside data-inspector-popover-owner="" className="ui-block-inspector" aria-label={`${specimenLabel(inspectorBlock)} settings`}><BlockInspector contentSlot={type === "template-content" && inspectorBlock?.id === `${type}-library-specimen`} key={`${inspectorBlock.id}-${resetRevision}`} block={inspectorBlock} selectedListItem={selectedListItem?.blockId === inspectorBlock.id ? selectedListItem : null} canSetSticky={inspectorBlock.type === "group" && data.blocks.some(block => block.id === inspectorBlock.id)} spacerOrientation={spacerOrientationFor(data.blocks, inspectorBlock.id)} onChange={next => updateBlock(next)} onColumnCountChange={inspectorBlock.type === "columns" ? count => commands.updateColumnCount(inspectorBlock, count) : undefined} columnWidthMax={maximumColumnWidth(selectedColumnParent?.children.length ?? 2)} onColumnWidthChange={selectedColumnParent && selectedColumnParent.children.length > 1 ? (columnId, width) => commands.updateColumnWidth(selectedColumnParent, columnId, width) : undefined} onButtonPreviewChange={setButtonPreview} onOpenFiles={chooseFixtureMedia} canOpenFiles={inspectorBlock.type === "image"} onOpenBackgroundMedia={chooseFixtureMedia} fontSizeModeScope={`library-${type}`} fontSizeViewModes={fontSizeViewModes} onFontSizeViewModeChange={(key, viewMode) => setFontSizeViewModes(current => ({ ...current, [key]: viewMode }))} /></aside> : null}
        </div>
        <p className="ui-block-sample-note">{fixture.note}</p>
        <p className="ui-block-isolation-note">Undo and Redo apply to the temporary block and example document, including rich text. Form fields keep the browser’s native text history. This specimen does not access Studio documents, browser storage or the write-ownership lock.</p>
      </section>

      <details id="control-inventory" className="ui-block-inventory ui-block-disclosure"><summary><span>Inspector controls and dependencies<small>Capability categories, availability and origin</small></span><StudioIcon name="chevron-right" size={16} /></summary>
        <p>This is a capability inventory grouped by category, not the pane’s visual order. Gutenberg and ACM identify each setting’s origin; they do not imply separate panes. Optional settings may need enabling in a section menu. Hidden and model-only attributes are listed for compatibility, not as editable controls. Unprefixed style keys belong to style (Paragraph, Columns and Column) or visualStyle (other styled blocks); other fields belong to the block. Button state styles also use interactionStyles.</p>
        {profile.sections.map(section => <section id={section.id} key={section.id}><h2>{section.label}</h2><div className="ui-block-inventory-columns"><span>Control</span><span>Origin</span><span>Stored fields</span></div><ol>{profile.controls.filter(control => control.placement !== "canvas" && control.documentationStatus !== "Summary control" && control.section === section.id).map(control => <li key={`${control.source}-${control.id}`}><span>{control.label}{control.documentationStatus ? ` — ${control.documentationStatus}` : control.enabled === false ? " — Theme unavailable" : control.availableWhen ? " — Conditional" : ""}</span><span>{control.source === "gutenberg" ? "Gutenberg" : "ACM"}</span><span>{control.unavailableReason ? `${control.unavailableReason} ` : ""}{control.fields.length ? control.fields.join(", ") : control.availableWhen ?? control.dependency ?? "Block setting"}{control.availableWhen ? ` · ${control.availableWhen}` : ""}</span></li>)}</ol></section>)}
        {profile.summaryControls.length ? <section><h2>Summary controls</h2><ul>{profile.summaryControls.map(control => <li key={control.id}>{control.label} · {control.fields.join(", ")}{control.availableWhen ? ` · ${control.availableWhen}` : ""}</li>)}</ul></section> : null}
        {profile.controls.some(control => control.placement === "canvas") ? <section><h2>Canvas controls</h2><ul>{profile.controls.filter(control => control.placement === "canvas").map(control => <li key={control.id}>{control.label} · {control.fields.join(", ")}</li>)}</ul><p>These controls live on the canvas or in its block toolbar, outside the inspector pane.</p></section> : null}
        {profile.nestedProfiles?.map(nested => <section className="ui-block-nested-profile" key={nested.type}><h2>{nested.label}</h2><p>Nested in {nested.parentType}; this profile describes the selected item settings and does not make List Item a top-level ContentBlock.</p>{nested.sections.map(section => <section key={section.id}><h3>{section.label}</h3><div className="ui-block-inventory-columns"><span>Control</span><span>Origin</span><span>Stored fields</span></div><ol>{nested.controls.filter(control => control.section === section.id).map(control => <li key={`${control.source}-${control.id}`}><span>{control.label}</span><span>{control.source === "gutenberg" ? "Gutenberg" : "ACM"}</span><span>{control.fields.join(", ") || "Block setting"}</span></li>)}</ol></section>)}<h3>Reusable controls</h3><ul>{nested.dependencies.map(dependency => <li key={dependency.id}><a href={dependency.href} title={dependency.purpose}>{dependency.label}</a></li>)}</ul></section>)}
        <h2>Direct and composed reusable controls</h2><p>Some dependencies are composed inside another control, such as Custom font size inside Font size and Appearance, or Box dimensions inside Border settings. Follow an entry for its composition and caller contract.</p><ul>{profile.dependencies.map(dependency => <li key={dependency.id}><a href={dependency.href} title={dependency.purpose}>{dependency.label}</a></li>)}</ul>
      </details>

      <details id="compatibility-notes" className="ui-block-compatibility-notes ui-block-disclosure"><summary><span>Compatibility and supported gaps<small>Mapping, theme variation and Studio-specific behaviour</small></span><StudioIcon name="chevron-right" size={16} /></summary>
        <dl className="ui-block-compatibility"><div><dt>Gutenberg mapping</dt><dd>{profile.mapping}</dd></div><div><dt>Inspector</dt><dd>Availability follows the current Studio implementation and caller context. The inventory records conditional, hidden retained, model-only and captured-theme unavailable settings separately.</dd></div><div><dt>Nesting</dt><dd>{profile.nesting}</dd></div><div><dt>Context</dt><dd>{profile.context}</dd></div></dl>
        <p>Recorded reference baseline: <a href="https://github.com/WordPress/gutenberg/tree/e3ac73cd69d472341b66c43cb77be36e838f868e/packages/block-library/src">Gutenberg v24.1.0-rc.1 at the pinned commit</a>. These are recorded mappings, not a fresh upstream parity certification. Gutenberg options depend on block supports and theme settings; local behaviour and limitations are documented below.</p>
        {Object.keys(profile.attributeDefaults).length ? <p className="ui-block-attribute-defaults">Recorded Gutenberg attribute defaults (not Studio insertion defaults): {Object.entries(profile.attributeDefaults).map(([field, value]) => `${field}=${String(value)}`).join(", ")}.</p> : null}
        {profile.insertionDefaults ? <p><strong>Studio insertion defaults:</strong> {profile.insertionDefaults}</p> : null}
        <ul>{profile.notes.map(note => <li key={note}>{note}</li>)}</ul>
        {profile.hasAdditionalCss || profile.nestedProfiles?.some(nested => nested.controls.some(control => control.fields.includes("additionalCss"))) ? <p>{additionalCssCompatibility}</p> : null}
        {profile.unsupported.length ? <ul>{profile.unsupported.map(item => <li key={item}>{item}</li>)}</ul> : <p>No additional model gap is recorded for this profile.</p>}
        {type === "component" ? <p>Components remain inactive because the library does not invoke product integrations.</p> : null}
        {type === "template-content" ? <p>Content is a template projection element, not a typed ContentBlock. This route shows a temporary document body passing through that slot.</p> : null}
      </details>
    </section></TableCaptionProvider>;
}
