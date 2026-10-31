"use client";
import { useMemoryImageFiles } from "./use-memory-image-files";
import { ImageRenditionProvider } from "../../../components/blocks/image-rendition-context";
import { ImageResolutionChoicesProvider } from "../../controls/image-resolution-setting";

import { CheckboxControl } from "../../controls/checkbox-control";
import { TextInput } from "../../controls/native-fields";
import { HistoryActions } from "../../controls/history-actions";

import { setListItemBackgroundImage, type ListItemBackgroundTarget } from "../../list-item-background";

import { createGroupVariation, groupVariationFor, isGroupVariation } from "../../blocks/group-variations";

import { childContentBlocks } from "../../../content/block-tree";
import { findColumnsParent, maximumColumnWidth } from "../../../content/columns";
import { parentOfNestedBlock } from "../../block-inserter-options";
import { editBlockSiblings } from "../../block-sibling-operations";

import { useStudioBlockCommands } from "../../use-studio-block-commands";
import { handleStudioHistoryShortcut } from "../../studio-history-shortcuts.mjs";

import { useCallback, useEffect, useId, useReducer, useRef, useState, type ReactNode } from "react";
import type { ButtonInteractionState, ContentBlock, RichTextRun, SocialIconBlock } from "../../../content/model";
import { spacerOrientationFor } from "../../../content/spacer";
import { BlockRenderer } from "../../../components/content";
import { blockCatalogue, createBlock, FEATURED_IMAGE_LABEL, type InsertableBlockType, type StudioDocument } from "../../editor-model";
import { socialIconTypeLabel } from "../../../content/social-services";
import { documentCharacterCount, documentWordCount } from "../../studio-editor";
import { TableCaptionProvider } from "../../table-caption-control";
import { StudioCanvas } from "../../studio-canvas";
import { FootnoteNumbersProvider } from "../../footnote-numbers-context";
import { BlockInspector } from "../../studio-inspectors";
import { InspectorContentDisabledProvider } from "../../inspector-accordion";
import { imageReplacementTarget, replaceImageMedia } from "../../image-replacement";
import { ListInspectorCanvasContext } from "../../list-inspector-navigation";
import { StudioIcon } from "../../studio-icons";
import { blockLibraryEntryByType } from "../../blocks/library-catalogue";
import { describeToolbarAvailability } from "../../blocks/toolbar-registry";
import { createTemplateSet, isNavigationSpacer, templateEditorBlocks, templateNodesFromBlocks, type NavigationTemplateNode, type NavigationItem, type TemplateNode, type TemplateSet } from "../../template-model";
import { PageLinkInspector } from "../../page-link-inspector";
import { NavigationCanvasEditor, NavigationInspector, NavigationSearchInspector, NavigationSpacerInspector } from "../../template-navigation-editor";
import { TemplateNodes, TemplateSurface } from "../../template-renderer";
import { templateContentProjectionBlocks } from "../../template-content-slot";
import { BlockLibraryNavigation } from "./block-library-navigation";
import { additionalCssCompatibility, blockCatalogueDocumentation } from "../../blocks/catalogue-documentation";

type SpecimenData = { blocks: ContentBlock[]; document: StudioDocument; navigation?: NavigationItem[] };
type SpecimenSnapshot = { past: SpecimenData[]; future: SpecimenData[]; lastEdit?: { key: string; at: number } };
import { blockContextEntries, blockContextEntryByType, blockContexts, initialBlockContext, activateBlockContext, blockContextCanvasStyles, type EditorBlockType } from "./block-contexts";
import { Pane, PaneTabs, PaneTabPanel } from "../../panes/pane-components";
import { WebsiteDesignSurface } from "../../site-editor/website-design-surface";
import { effectiveWebsiteDesign } from "../../site-editor/website-design";
import { BlockStyleSpecimen } from "../../site-editor/block-style-specimen";
import type { StyleHistory, StyleAction } from "../../site-editor/styles-preview-state";
import type { Dispatch, CSSProperties } from "react";
import type { ButtonPseudoState } from "../../controls/viewport-states-menu";
import { BlocksPreview } from "../../site-editor/blocks-preview";
import { createStylesPreview, stylesPreviewReducer, resolvePreviewStyle } from "../../site-editor/styles-preview-state";
import type { PreviewBlockId } from "../../site-editor/blocks-preview-model";
import type { StyleViewport } from "../../../content/responsive-styles";
import { isNativeEditingTarget, workspaceHistoryShortcut } from "../../workspace-shortcuts.mjs";
import "../../site-editor/site-editor-preview.css";
export type BlockType = string;

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

function fixtureFor(type: EditorBlockType): { data: SpecimenData; selectedId: string; note: string } {
  const id = `${type}-library-specimen`;
  let blocks: ContentBlock[];
  let selectedId = id;
  let navigation: NavigationItem[] | undefined;
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
  } else if (type === "pullquote") {
    blocks = [{ id, type, text: "A useful idea deserves a little space.", attribution: "A Studio reader", align: "centre", quoteStyle: "plain" }];
  } else if (type === "quote") {
    blocks = [{ id, type, text: "", children: [{ ...paragraph(`${id}-paragraph`, "A useful idea deserves a little space."), style: { textIndent: "2em" } }, paragraph(`${id}-following`, "This paragraph inherits the preceding paragraph’s indentation.")], attribution: "A Studio reader", quoteStyle: "default" }, { id: `${id}-legacy`, type, text: "A legacy quote remains editable.", attribution: "Legacy content", quoteStyle: "plain" }, { id: `${id}-presentation`, type, text: "", children: [
      { id: `${id}-presentation-heading`, type: "heading", level: 2, text: "An inherited Quote heading" },
      { id: `${id}-presentation-own`, type: "heading", level: 3, text: "An explicitly coloured heading", visualStyle: { textColor: "#008800", backgroundColor: "#ffeedd" } },
      paragraph(`${id}-presentation-body`, "Quote presentation body."),
      { id: `${id}-presentation-nested`, type: "quote", text: "", visualStyle: { headingColor: "#880088" }, children: [{ id: `${id}-presentation-nested-heading`, type: "heading", level: 4, text: "A nearer Quote heading" }] },
    ], attribution: "Presentation source" }];
  } else if (type === "list") {
    blocks = [{ id, type, style: "ordered", marker: "a", start: 3, items: [{ text: "A first item", children: [{ id: `${id}-nested`, type: "list", style: "unordered", visualStyle: { backgroundColor: "#fff3cd" }, items: ["A nested item", "Another nested item"] }] }, "A second item", "A third item"] }, { id: `${id}-plain`, type, style: "unordered", items: ["Plain first item", "Plain second item"] }];
  } else if (type === "table") {
    blocks = [
      { id: "table-populated", type, hasHeader: true, rows: [["Item", "Status"], ["Library profiles", "In progress"], ["Controls", "Planned"]], cellRuns: [[[{ text: "Item" }], [{ text: "Status" }]], [[{ text: "Library profiles", marks: ["bold"] }], [{ text: "In progress" }]], [[{ text: "Controls" }], [{ text: "Planned" }]]], caption: "Example settings inventory", captionRuns: [{ text: "Example settings inventory", marks: ["italic"] }], tableStyle: "stripes" },
      { id: "table-sections", type, hasHeader: true, headerRowCount: 2, hasFooter: true, footerRowCount: 2, rows: [["Category", "Status"], ["Section", "Detail"], ["Shared controls", "Reviewed"], ["Subtotal", "One item"], ["Total", "One item"]], caption: "Multiple header and footer rows", cellRuns: [[[{ text: "Category", marks: ["bold"] }], [{ text: "Status" }]], [[{ text: "Section" }], [{ text: "Detail" }]], [[{ text: "Shared controls" }], [{ text: "Reviewed" }]], [[{ text: "Subtotal" }], [{ text: "One item" }]], [[{ text: "Total" }], [{ text: "One item" }]]] },
      { id: "table-height", type, hasHeader: true, rows: [["Alignment", "Content"], ["Tall row", "A short entry"], ["Growing row", "First line\nSecond line\nThird line"]], rowHeights: [40, 130, 40], caption: "Cell alignment and minimum row heights" },
      { id: "table-empty", type, rows: [] },
    ];
    selectedId = "table-populated";
    note = "Choose a table, then focus a cell to try shared horizontal and vertical alignment. Row heights expand around content in Edit and Preview. Reset Example restores the fixture.";
  } else if (type === "code") {
    blocks = [{ id, type, language: "typescript", code: "type Example = {\n  local: true;\n  saved: false;\n};" }, { id: `${id}-wrapped`, type, code: "A long line of code that wraps naturally as the available specimen width changes, followed by a retained trailing blank line.\n\n", visualStyle: { fontSizeCustom: "21px", lineHeight: "1.4" } }];
  } else if (type === "image") {
    blocks = [{ id, type, src: "", mediaId: "library-local-image", alt: "Illustrated green hill with a blue sky", caption: "A local PNG fixture", aspectRatio: "landscape", scale: "cover", displayWidth: 640, displayHeight: 360 }];
  } else if (type === "cover") {
    blocks = [
      { id, type, src: "", mediaId: "library-local-image", alt: "Illustrated green hills beneath a blue sky and yellow sun", dimRatio: 50, aspectRatio: "landscape", scale: "cover", displayWidth: 640, displayHeight: 360, children: [{ id: `${id}-text`, type: "paragraph", text: "Add text over image" }] },
      { id: `${id}-empty`, type, src: "", alt: "", dimRatio: 50, children: [] },
    ];
    note = "The first Cover shows the populated state. Select the empty Cover below to try its media choices and theme colour swatches. Changes stay in this temporary specimen.";
  } else if (type === "embed") {
    blocks = [{ id, type, url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", title: "YouTube example", caption: "A provider player with an original-content fallback." }, { id: `${id}-unsupported`, type, url: "https://example.test/reference", title: "Unsupported provider example", caption: "The original URL remains available when embedding is unsupported.", editorial: { name: "Reference", note: "Retain this source when converting it to a link.", lock: { move: true, remove: true } }, visualStyle: { anchor: "reference-link", margin: "16px" } }];
  } else if (type === "separator") {
    blocks = [{ id, type, style: "wide", tagName: "hr" }];
  } else if (type === "buttons") {
    const child = (childId: string, width: 25 | 50 | 75 | 100, style: "primary" | "secondary" = "primary"): Extract<ContentBlock, { type: "button" }> => ({ id: childId, type: "button", label: style === "secondary" ? "Outline" : "Fill", url: "https://example.test/guide", style, width });
    blocks = [
      { id, type, horizontalGap: 24, verticalGap: 12, visualStyle: { fontSizeCustom: "24px", appearance: "bold", textColor: "#123456" }, children: [{ ...child(`${id}-fill`, 50), visualStyle: { backgroundColor: "#fff3cd" } }, { ...child(`${id}-outline`, 50, "secondary"), interactionStyles: { hover: { width: 25 }, focus: { width: 75 } } }] },
      { id: `${id}-quarters`, type, horizontalGap: 24, children: Array.from({ length: 4 }, (_, index) => child(`${id}-quarter-${index}`, 25, index % 2 ? "secondary" : "primary")) },
      { id: `${id}-vertical`, type, orientation: "vertical", horizontalGap: 24, verticalGap: 12, children: [child(`${id}-vertical-half`, 50), child(`${id}-vertical-full`, 100, "secondary")] },
    ];
    note = "The group owns layout and inherited typography. Its bottom-right add-button control is an inert visual specimen in Edit. Compare half-width, quarter-width and vertical buttons; the Outline child's Hover and Focus widths use the same group boundary. Changes remain temporary.";
  } else if (type === "button") {
    blocks = [{ id: `${id}-parent`, type: "buttons", children: [{ id, type, label: "Read the guide", url: "https://example.test/guide", style: "primary", width: 50, title: "Open the example guide" }, { id: `${id}-sibling`, type, label: "Another guide with a longer label", url: "https://example.test/another", style: "secondary", width: 50, visualStyle: { fontSizeCustom: "28px" } }] }];
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
  } else if (type === "title" || type === "subtitle" || type === "cover-image" || type === "time-to-read" || type === "author-name" || type === "post-date") {
    blocks = [
      { id: "document-title-fixture", type: "title", level: 2 },
      { id: "document-subtitle-fixture", type: "subtitle" },
      { id: "cover-image-fixture", type: "cover-image", aspectRatio: "wide", scale: "cover" },
      { id: "reading-time-fixture", type: "time-to-read", prefix: "Reading time:", presentation: "badge" },
      { id: "post-author-fixture", type: "author-name", prefix: "By", avatar: true, profileImage: { src: "", mediaId: "library-local-image", alt: "Illustrated green hill with a blue sky" } },
      { id: "post-date-fixture", type: "post-date", format: "long", showIcon: true },
      paragraph("metadata-body-fixture", "This temporary body text contributes to the reading estimate and word count. Edit it to see those values update."),
    ];
    selectedId = `${type}-fixture`;
    note = "The adjacent form edits only this specimen’s temporary example document. Its dynamic blocks update in Edit and Preview.";
  } else if (type === "social-icons") {
    const children: SocialIconBlock[] = [
      { id: "social-linkedin-fixture", type: "social-link", service: "linkedin", url: "https://www.linkedin.com/in/example" },
      { id: "social-bluesky-fixture", type: "social-link", service: "bluesky", url: "https://bsky.app/profile/example.test" },
      { id: "social-link-fixture", type: "social-link", service: "chain", url: "example.test", label: "Project site" },
      { id: "social-mail-fixture", type: "social-link", service: "mail", url: "hello@example.test", label: "Email" },
    ];
    blocks = [{ id, type, children, socialStyle: "pill-shape", justification: "left", iconSize: "normal", showLabels: true, openInNewTab: true }];
    selectedId = "social-link-fixture";
    note = "Choose among all 47 built-in services with the plus button. The example includes a profile, a web Link, and a Mail link; new-tab behaviour is inherited from Social Icons.";
  } else if (type === "social-linkedin" || type === "social-tiktok") {
    const target: SocialIconBlock = type === "social-linkedin"
      ? { id, type, url: "https://www.linkedin.com/in/example", label: "LinkedIn profile" }
      : { id, type, url: "https://www.tiktok.com/@example", label: "TikTok profile" };
    const sibling: SocialIconBlock = type === "social-linkedin"
      ? { id: `${id}-sibling`, type: "social-tiktok", url: "https://www.tiktok.com/@example", label: "TikTok profile" }
      : { id: `${id}-sibling`, type: "social-linkedin", url: "https://www.linkedin.com/in/another-example", label: "Another LinkedIn profile" };
    blocks = [{ id: `${id}-social-parent`, type: "social-icons", orientation: "horizontal", children: type === "social-linkedin" ? [target, sibling] : [sibling, target], showLabels: true, justification: "left" }];
    note = "The selected icon sits inside a temporary Social Icons parent. Use its toolbar to select the parent, set alignment or justification directly, and move in the parent’s orientation. Changes and Undo stay within this specimen.";
  } else if (type === "footnotes") {
    const reference = { id: "footnote-reference", type: "paragraph" as const, text: "This sentence points to a source.", runs: [{ text: "This sentence points to a source", marks: [{ type: "footnote" as const, id: "source-note" }] }, { text: "." }] };
    blocks = [reference, { id, type, notes: [{ id: "source-note", text: "A temporary source note, referenced from the sentence above." }] }];
    note = "The paragraph contains a real footnote reference and the system-managed Footnotes block contains its editable note.";
  } else if (type === "column") {
    const firstColumn: Extract<ContentBlock, { type: "column" }> = { id, type, width: 62, verticalAlign: "top", children: [paragraph("column-child-one", "This Column is nested in Columns.")] };
    const secondColumn: Extract<ContentBlock, { type: "column" }> = { id: "column-sibling", type: "column", width: 38, verticalAlign: "centre", children: [paragraph("column-child-two", "Its sibling keeps an independent width.")] };
    blocks = [{ id: "column-parent", type: "columns", children: [firstColumn, secondColumn], stackAt: "mobile" }];
    note = "Select the nested Column in the example selector. It retains its owning Columns layout and sibling context.";
  } else if (isGroupVariation(type) || type === "section") {
    const children: ContentBlock[] = [
      { id: `${type}-child-heading`, type: "heading", level: 3, text: "Selectable child heading" },
      paragraph(`${type}-child-copy`, "Edit this child independently from its containing block."),
    ];
    blocks = isGroupVariation(type)
      ? [
        createGroupVariation(type, id),
        { ...createGroupVariation(type === "group" ? "row" : type, type === "group" ? "group-row-example" : `${type}-populated-example`), gap: 20, columnGap: 20, rowGap: 12, stackAt: "mobile", children },
      ]
      : [{ id, type, layout: "stack", children }];
    note = isGroupVariation(type)
      ? `The first ${groupVariationFor(createGroupVariation(type, id)).label} starts empty so you can try the layout chooser. The second example has editable children. Transform either container without losing its children.`
      : "Select either nested child above the specimen to inspect it. The container and child edits share local history.";
  } else if (type === "columns") {
    const columnsBlock = createBlock("columns", id);
    if (columnsBlock.type === "columns") {
      columnsBlock.children = columnsBlock.children.map((column, index) => ({ ...column, children: [paragraph(`${id}-child-${index + 1}`, `Editable content in Column ${index + 1}.`)] }));
      blocks = [columnsBlock];
    } else blocks = [columnsBlock];
    note = "Select a nested Column or its child content above the specimen. Column widths and layout remain independent.";
  } else if ((type === "navigation" || type === "page-link")) {
    blocks = templateEditorBlocks([{ id, type: "element", element: "navigation", overlayMenu: "mobile", gap: 16 }]);
    navigation = [
      { id: "navigation-home", label: "Home", url: "#home", homeLink: true },
      { id: "navigation-about", label: "About", url: "#about" },
      { id: "navigation-guides", label: "Guides", url: "#guides", children: [{ id: "navigation-studio", label: "Studio guide", url: "#studio-guide" }] },
    ];
    note = type === "page-link" ? "Select a Page link to edit Content, Settings and Styles. Try its item toolbar, select the parent Navigation, and compare Edit with Preview. All changes remain temporary." : "Try the production Menu, Settings and Styles controls. Select a link or Spacer to inspect its settings. The menu and its children share this specimen’s temporary Undo history.";
  } else {
    const insertableType = type as InsertableBlockType;
    const created = createBlock(insertableType, id);
    blocks = [created];
  }

  const document = makeDocument(blocks);
  document.coverImage = { src: "", mediaId: "library-local-image", alt: "Illustrated green hill with a blue sky" };
  return { data: { blocks, document, navigation }, selectedId, note };
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
  if (block.type === "cover-image") return FEATURED_IMAGE_LABEL;
  if (block.type === "time-to-read") return "Time to Read";
  if (block.type === "group" && !block.data?.templateElement) return `${block.children.length ? "" : "Empty "}${groupVariationFor(block).label}`;
  if (block.type === "paragraph") return block.text.length > 42 ? `${block.text.slice(0, 42).trimEnd()}…` : block.text || "Paragraph";
  if (block.type === "heading") return block.text || "Heading";
  if (block.type === "table") return block.id === "table-height" ? "Table with row heights" : !block.rows.length ? "Empty Table" : (block.headerRowCount ?? 0) > 1 || (block.footerRowCount ?? 0) > 1 ? "Table with sections" : "Populated Table";
  if (block.type === "buttons") return block.orientation === "vertical" ? "Vertical Buttons" : block.children.length && block.children.every(child => child.width === block.children[0].width) && block.children[0].width ? `Buttons (${block.children[0].width}%)` : "Buttons";
  if (block.type === "button") return `${block.label || "Button"}${block.width ? ` (${block.width}%)` : ""}`;
  if (block.type === "column") return "Nested Column";
  if (block.type === "separator") return "Separator";
  if (block.type === "social-link" || block.type === "social-linkedin" || block.type === "social-tiktok") return block.label ?? socialIconTypeLabel(block);
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
  const groups = blockContextEntries.reduce<Map<string, typeof blockContextEntries>>((result, entry) => {
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
        {[...groups].map(([group, entries]) => <section className="ui-block-index-group" key={group}><h2>{group}</h2><div className="ui-block-index-grid">{entries.map((entry) => <article className="ui-catalogue-card" key={entry.type}><div><p className="rl-eyebrow">{entry.type === "template-content" ? "Template element" : entry.profile?.mapping ?? "Site editor styles"}</p><h3>{entry.label}</h3><p>{entry.description}</p></div><button type="button" onClick={() => selectType(entry.type)}>Open {entry.label} <span aria-hidden="true">→</span></button></article>)}</div></section>)}
      </section>}
  </div>;
}

function BlockEditorSpecimenDetail({ type, handleInitialHash, design, viewport, renderInspector }: { type: EditorBlockType; handleInitialHash: boolean; design: ReturnType<typeof effectiveWebsiteDesign>; viewport: StyleViewport; renderInspector: (inspector: ReactNode, actions: ReactNode) => ReactNode }) {
  const entry = blockLibraryEntryByType[type];
  const profile = blockCatalogueDocumentation(entry.profile, type === "navigation" ? "navigation" : type === "page-link" ? "page-link" : undefined);
  const fixture = fixtureFor(type);
  const [data, setData] = useState<SpecimenData>(() => cloneData(fixture.data));
  const dataRef = useRef(data);
  const historyRef = useRef<SpecimenSnapshot>({ past: [], future: [] });
  const [selectedId, setSelectedId] = useState<string | null>(fixture.selectedId);
  const [selectedNavigationLinkId, setSelectedNavigationLinkId] = useState<string | null>(type === "page-link" ? "navigation-home" : null);
  const [selectedNavigationSearch, setSelectedNavigationSearch] = useState(false);
  const [selectedNavigationPageList, setSelectedNavigationPageList] = useState(false);
  const [selectedListItem, setSelectedListItem] = useState<{ blockId: string; listId: string; itemIndex: number } | null>(null);
  const [buttonPreview, setButtonPreview] = useState<{ blockId: string; state: ButtonInteractionState } | null>(null);
  const [fontSizeViewModes, setFontSizeViewModes] = useState<Record<string, "presets" | "custom">>({});
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [readOnlyExample, setReadOnlyExample] = useState(false);
  const [useTemplateStyles, setUseTemplateStyles] = useState(false);
  const [resetRevision, setResetRevision] = useState(0);
  const [historyAvailability, setHistoryAvailability] = useState({ canUndo: false, canRedo: false });
  const [canvasInserter, setCanvasInserter] = useState<{ open: boolean; query: string }>({ open: false, query: "" });
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const specimenRef = useRef<HTMLElement>(null);
  useEffect(() => { specimenRef.current?.setAttribute("data-ready", "true"); }, []);
  const blocks = allBlocks(data.blocks);
  const activeBlock = blocks.find(block => block.id === selectedId) ?? blocks[0];

  useEffect(() => {
    const samples = {
      "library-local-image-two": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#f8e7d6"/><circle cx="318" cy="180" r="94" fill="#e6a56d"/><circle cx="318" cy="180" r="56" fill="#f8d370"/><path d="M318 274v86" stroke="#587a54" stroke-width="18"/><path d="M318 330c-58-32-101-24-130 8 54 11 98 7 130-8Zm0 12c58-32 101-24 130 8-54 11-98 7-130-8Z" fill="#769a66"/></svg>`,
    };
    const urls = Object.fromEntries(Object.entries(samples).map(([id, svg]) => [id, URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))]));
    const frame = window.requestAnimationFrame(() => setMediaUrls({ "library-local-image": "/specimens/landscape.png", ...urls }));
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

  const imageFiles = useMemoryImageFiles({ document: { ...data.document, blocks: data.blocks }, writable: !readOnlyExample, enableSizes: type === "image" || type === "author-name", onSelectBlock: setSelectedId, updateDocument: update => {
    if (readOnlyExample) return false;
    const current = dataRef.current;
    const before = { ...current.document, blocks: current.blocks };
    const next = update(before);
    if (next !== before) publish({ ...current, document: next, blocks: next.blocks });
    return true;
  } });
  const commands = useStudioBlockCommands({ activeDocument: { ...data.document, blocks: data.blocks }, updateActiveDocument: update => {
    const current = dataRef.current;
    const currentDocument = { ...current.document, blocks: current.blocks };
    const nextDocument = update(currentDocument);
    if (nextDocument === currentDocument) return;
    publish({ ...current, document: nextDocument, blocks: nextDocument.blocks });
  } });
  const updateBlock = useCallback((replacement: ContentBlock, textEdit = false, expectedSource?: ContentBlock) => {
    if (readOnlyExample) return;
    if (expectedSource && JSON.stringify(allBlocks(dataRef.current.blocks).find(block => block.id === expectedSource.id)) !== JSON.stringify(expectedSource)) return;
    const nextBlocks = replaceBlock(dataRef.current.blocks, replacement);
    const next: SpecimenData = { ...dataRef.current, blocks: nextBlocks, document: { ...dataRef.current.document, blocks: nextBlocks } };
    publish(next, textEdit ? replacement.id : undefined);
  }, [publish, readOnlyExample]);

  const updateDocument = useCallback((patch: Partial<StudioDocument>, key: string) => {
    publish({ ...dataRef.current, document: { ...dataRef.current.document, ...patch } }, key);
  }, [publish]);

  const chooseFixtureMedia = useCallback((item?: ListItemBackgroundTarget) => {
    const target = allBlocks(dataRef.current.blocks).find(block => block.id === selectedId);
    if (target?.type === "list") {
      const mediaId = "library-local-image";
      const next = item ? setListItemBackgroundImage(target, item, mediaId) : { ...target, visualStyle: { ...target.visualStyle, backgroundImageMediaId: mediaId } };
      if (next) updateBlock(next);
    } else if (target?.type === "image") {
      const mediaId = target.mediaId === "library-local-image" ? "library-local-image-two" : "library-local-image";
      const replacement = replaceImageMedia(target, imageReplacementTarget(target)!, { id: mediaId, name: "Library image", caption: mediaId === "library-local-image" ? "A local landscape sample" : "A local flower sample" }, mediaId === "library-local-image" ? "Illustrated green hill with a blue sky" : "Illustrated flower in a warm field");
      if (replacement && replacement !== target) updateBlock(replacement, false, target);
    } else if ((target?.type === "quote" || target?.type === "pullquote") || target?.type === "group" || target?.type === "heading" || target?.type === "code" || target?.type === "title" || target?.type === "buttons") {
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
    imageFiles.cancel();
    const fresh = cloneData(fixture.data);
    dataRef.current = fresh;
    setData(fresh);
    historyRef.current = { past: [], future: [] };
    setSelectedId(fixture.selectedId);
    setSelectedNavigationLinkId(type === "page-link" ? "navigation-home" : null);
    setSelectedNavigationSearch(false);
    setSelectedNavigationPageList(false);
    setSelectedListItem(null);
    setButtonPreview(null);
    setReadOnlyExample(false);
    setUseTemplateStyles(false);
    setFontSizeViewModes({});
    setCanvasInserter({ open: false, query: "" });
    setHistoryAvailability({ canUndo: false, canRedo: false });
    setResetRevision(revision => revision + 1);
  }

  const specimenBlocks = blocks;
  const currentTypeIsMetadata = ["title", "subtitle", "cover-image", "time-to-read", "author-name", "post-date"].includes(type);
  const inspectorBlock = activeBlock ?? data.blocks[0];
  const selectedColumnParent = inspectorBlock?.type === "column" ? findColumnsParent(data.blocks, inspectorBlock.id) : undefined;
  const selectedFlexParent = inspectorBlock ? parentOfNestedBlock(data.blocks, inspectorBlock.id) : null;
  const entryTitle = type === "template-content" ? "Content" : entry.label;
  const editLabel = type === "template-content" ? "Template Content projection" : `${entryTitle} editing specimen`;
  const previewLabel = type === "template-content" ? "Document body in a template Content slot" : `${entryTitle} preview specimen`;
  const navigationSuggestions = [{ id: "home", title: "Home", href: "#home", kind: "page" as const }, { id: "about", title: "About", href: "#about", kind: "page" as const }, { id: "guides", title: "Guides", href: "#guides", kind: "page" as const }];
  const navigationSearchEntries = () => navigationSuggestions.map(item => ({ title: item.title, href: item.href, text: `${item.title} example page for the Navigation specimen.` }));
  const navigationProps = {
    links: data.navigation ?? [], selectedId: selectedNavigationLinkId, selectedSearch: selectedNavigationSearch, selectedPageList: selectedNavigationPageList, writable: !readOnlyExample,
    suggestions: navigationSuggestions,
    pageListLinks: navigationSuggestions.map(item => ({ id: item.id, label: item.title, url: item.href })),
    onSelect: (id: string | null) => { setSelectedNavigationLinkId(id); setSelectedNavigationSearch(false); setSelectedNavigationPageList(false); },
    onSelectSearch: () => { setSelectedNavigationLinkId(null); setSelectedNavigationSearch(true); setSelectedNavigationPageList(false); },
    onSelectPageList: () => { setSelectedNavigationLinkId(null); setSelectedNavigationSearch(false); setSelectedNavigationPageList(true); },
    onChange: (navigation: NavigationItem[]) => { publish({ ...dataRef.current, navigation }); return true; },
    onNodeChange: (node: NavigationTemplateNode) => { const projected = templateEditorBlocks([node])[0]; if (projected.type === "group") updateBlock(projected); },
    onConvertPageList: (navigation: NavigationItem[], node: NavigationTemplateNode) => {
      const current = dataRef.current;
      const projected = templateEditorBlocks([node])[0];
      if (projected.type !== "group" || !current.blocks.some(block => block.id === projected.id)) return false;
      const blocks = replaceBlock(current.blocks, projected);
      publish({ ...current, navigation, blocks, document: { ...current.document, blocks } });
      return true;
    },
  };
  const selectedNavigationItem = data.navigation?.find(item => item.id === selectedNavigationLinkId);
  const setSelectedBlockLocked = (locked: boolean) => {
    const target = allBlocks(dataRef.current.blocks).find(block => block.id === selectedId);
    if (!target) return;
    const editorial = target.editorial ?? {};
    const lock = { ...editorial.lock, move: locked ? true : undefined, remove: locked ? true : undefined };
    const hasLock = Object.values(lock).some(Boolean);
    updateBlock({ ...target, editorial: { ...editorial, lock: hasLock ? lock : undefined } });
  };
  const libraryCanvasBlocks = blockCatalogue.filter(item => `${item.label} ${item.description} ${item.type}`.toLowerCase().includes(canvasInserter.query.trim().toLowerCase()));
  const insertLibraryBlock = (blockType: InsertableBlockType, parentId?: string, insertionIndex?: number | null) => {
    const next = commands.insertBlock(blockType, insertionIndex === undefined || insertionIndex === null ? null : insertionIndex - 1, parentId);
    if (next) { setSelectedListItem(null); setSelectedId(next.id); setCanvasInserter({ open: false, query: "" }); }
    return next;
  };
  const libraryEditorPresentation = {
    allowCoverImage: false,
    showPublicationDetails: false,
    hideDividers: false,
    renderHeader: () => <></>,
  };
  const editorActions = <header className="ui-block-specimen-header"><div><p className="rl-eyebrow">Temporary state only</p><h2 id="ui-block-specimen-title">Editable specimen</h2></div><div className="ui-block-actions">
      <HistoryActions onUndo={undo} onRedo={redo} canUndo={historyAvailability.canUndo} canRedo={historyAvailability.canRedo} undoLabel="Undo specimen change" redoLabel="Redo specimen change" />
          <div role="group" aria-label="Specimen view"><button type="button" aria-pressed={mode === "edit"} onClick={() => setMode("edit")}>Edit</button><button type="button" aria-pressed={mode === "preview"} onClick={() => setMode("preview")}>Preview</button></div>
          {mode === "edit" ? <CheckboxControl checked={readOnlyExample} onChange={setReadOnlyExample} label={<>Read-only example</>} /> : null}
          {mode === "edit" && type !== "navigation" && type !== "page-link" && activeBlock ? <CheckboxControl checked={Boolean(activeBlock.editorial?.lock?.move || activeBlock.editorial?.lock?.remove)} onChange={setSelectedBlockLocked} disabled={readOnlyExample} label={<>Lock move and remove</>} /> : null}
          {type === "buttons" || type === "button" ? <CheckboxControl checked={useTemplateStyles} onChange={checked => setUseTemplateStyles(checked)} label={<>Use Template Styles</>} /> : null}
          <button type="button" onClick={resetExample}><StudioIcon name="rotate" size={18} />Reset Example</button>
        </div></header>;
  const specimenContent = <>
    {imageFiles.picker}
    {imageFiles.feedback ? <p role="status">{imageFiles.feedback}</p> : null}
{(type === "navigation" || type === "page-link") ? <TemplateSurface set={{ ...exampleTemplateSet, navigation: data.navigation ?? [] }} editing={mode === "edit"} editorCanvas={mode === "edit"}>{data.blocks.map(block => {
  const node = templateNodesFromBlocks([block])[0] as NavigationTemplateNode;
  return mode === "edit" ? <NavigationCanvasEditor key={`${block.id}-${resetRevision}`} node={node} {...navigationProps} /> : <TemplateNodes key={block.id} set={{ ...exampleTemplateSet, navigation: data.navigation ?? [] }} document={data.document} nodes={[node]} navigationPageListLinks={() => navigationProps.suggestions.filter(item => item.kind === "page").map(item => ({ id: `page-list-${item.id}`, label: item.title, url: item.href }))} navigationSearchEntries={() => navigationSearchEntries()} templatePreview />;
})}</TemplateSurface> : mode === "edit" || type === "paragraph" || type === "heading" ? <StudioCanvas
              className="ui-library-canvas"
              allowHtmlEditing={false}
              activeDocument={data.document}
              previewing={mode === "preview"}
              onPreviewChange={next => setMode(next ? "preview" : "edit")}
              wordCount={documentWordCount(data.document)}
              characterCount={documentCharacterCount(data.document)}
              linkTargets={[]}
              showCoverImage={false}
              coverImageUrl={mediaUrls["library-local-image"]}
              mediaBlockUrls={{ ...mediaUrls, ...imageFiles.urls }}
              onReplaceImage={imageFiles.choose}
              selectedBlockId={selectedId}
              dragOverIndex={null}
              showInserter={canvasInserter.open}
              inserterQuery={canvasInserter.query}
              filteredBlocks={libraryCanvasBlocks}
              publishFeedback={null}
              presentation={libraryEditorPresentation}
              writable={!readOnlyExample}
              onUndo={undo}
              onRedo={redo}
              canUndo={historyAvailability.canUndo}
              canRedo={historyAvailability.canRedo}
              onOpenInserter={(_afterIndex, query = "") => setCanvasInserter({ open: true, query })}
              onSetPublishFeedback={() => {}}
              onDocumentFieldChange={(field, value) => updateDocument({ [field]: value }, `document-${field}`)}
              onApplyDocumentCode={next => publish({ ...dataRef.current, blocks: next, document: { ...dataRef.current.document, blocks: next } })}
              onFocusDocumentField={() => {}}
              onOpenCoverMediaLibrary={() => chooseFixtureMedia()}
              onRemoveCoverImage={() => {}}
              onSelectBlock={blockId => { setSelectedListItem(null); setSelectedId(blockId); }}
              onSelectListItem={selection => setSelectedListItem({ blockId: selection.blockId, listId: selection.listId, itemIndex: selection.itemIndex })}
              onClearBlockSelection={() => { setSelectedListItem(null); setSelectedId(null); }}
              onSetDragOverIndex={() => {}}
              onMoveBlockTo={commands.moveBlockTo}
              onMoveBlock={commands.moveBlock}
              onDuplicateBlock={commands.duplicateBlock}
              onRemoveBlock={commands.removeBlock}
              onRemoveBlocks={commands.removeBlocks}
              onUpdateBlock={!readOnlyExample ? commands.updateBlock : () => {}}
              onSplitParagraph={commands.splitParagraph}
              onMergeParagraphBackward={commands.mergeParagraphBackward}
              onSplitParagraphs={commands.splitParagraphs}
              onExitList={commands.exitList}
              onInsertBlock={(blockType, parentId) => insertLibraryBlock(blockType, parentId)}
              onInsertBlockAt={(blockType, insertionIndex, parentId) => insertLibraryBlock(blockType, parentId, insertionIndex)}
              onSetShowInserter={open => setCanvasInserter(current => ({ ...current, open }))}
              onSetInserterQuery={query => setCanvasInserter(current => ({ ...current, query }))}
            />
              : type === "template-content" && exampleTemplateSet.templates.find(template => template.kind === data.document.kind)
                  ? <TemplateNodes set={exampleTemplateSet} document={data.document} nodes={templateNodesFromBlocks(data.blocks)} content={<BlockRenderer blocks={templateContentProjectionBlocks(data.blocks) ?? []} mediaUrls={{ ...mediaUrls, ...imageFiles.urls }} variant="studio" hideDividers={false} document={data.document} />} mediaUrls={{ ...mediaUrls, ...imageFiles.urls }} templatePreview />
                : <BlockRenderer blocks={data.blocks} mediaUrls={{ ...mediaUrls, ...imageFiles.urls }} variant="studio" showMissingMetadata={false} resolveRemoteEmbeds={type === "embed"} document={data.document} buttonPreview={buttonPreview} />}
  </>;
  return <ImageResolutionChoicesProvider choices={imageFiles.resolutionChoices}><ImageRenditionProvider urls={imageFiles.renditionUrls}><ListInspectorCanvasContext.Provider value={mode === "edit" ? specimenRef : null}><FootnoteNumbersProvider blocks={data.blocks}><TableCaptionProvider key={`${type}-${resetRevision}`}><section className="ui-block-editor-context">
      <section className="ui-block-specimen" data-block-type={type} aria-labelledby="ui-block-specimen-title" data-studio-document-id={`${data.document.id}:${resetRevision}`} data-studio-rich-text-history ref={specimenRef}>

        {specimenBlocks.length > 1 ? <div className="ui-specimen-selection" role="group" aria-label="Select an example block">{specimenBlocks.map(block => <button key={block.id} type="button" aria-pressed={selectedId === block.id} onClick={() => { setSelectedListItem(null); setSelectedId(block.id); }}>{specimenLabel(block)}</button>)}</div> : null}
        {currentTypeIsMetadata ? <fieldset className="ui-specimen-document-fields"><legend>Temporary example document</legend><label>Title<TextInput value={data.document.title} onChange={event => updateDocument({ title: event.target.value, seoTitle: event.target.value }, "title")} /></label><label>Subtitle<TextInput value={data.document.subtitle ?? ""} onChange={event => updateDocument({ subtitle: event.target.value }, "subtitle")} /></label><label>Author<TextInput value={data.document.author ?? ""} onChange={event => updateDocument({ author: event.target.value }, "document-author")} /></label><label>Publication date<input type="date" value={(data.document.publishedAt ?? "").slice(0, 10)} onChange={event => updateDocument({ publishedAt: event.target.value ? `${event.target.value}T11:30:00.000Z` : undefined }, "document-date")} /></label></fieldset> : null}
        <div className="ui-block-editor-layout">
          <div className={`ui-block-canvas${type === "template-content" ? " is-content-projection" : (type === "navigation" || type === "page-link") ? " is-navigation-specimen" : ""}`} aria-label={mode === "edit" ? editLabel : previewLabel}>
            <div className={`ui-library-website-preview is-${viewport}`}><WebsiteDesignSurface design={design}>{(useTemplateStyles || type === "template-content") ? <TemplateSurface set={exampleTemplateSet} editing={mode === "edit"}>{specimenContent}</TemplateSurface> : specimenContent}</WebsiteDesignSurface></div>
            {type === "template-content" ? <p className="ui-template-projection-note">Edit the temporary document body above. Preview renders that body through the production template Content slot.</p> : null}
          </div>
          <div className="ui-block-inspector">{renderInspector(inspectorBlock ? <fieldset disabled={readOnlyExample && inspectorBlock.type !== "image"} style={{ border: 0, margin: 0, minWidth: 0, padding: 0 }}><InspectorContentDisabledProvider disabled={readOnlyExample}>{(type === "navigation" || type === "page-link") && inspectorBlock.type === "group" ? selectedNavigationSearch ? <NavigationSearchInspector key="search" block={inspectorBlock} writable={!readOnlyExample} onBlockChange={next => updateBlock(next)} /> : selectedNavigationPageList ? <div className="navigation-search-inspector inspector-sections"><div className="navigation-block-summary"><h3>Page List</h3><p>Automatically displays published pages in the menu.</p></div><section><h3>Page List</h3><p className="setting-note">This block follows the example page hierarchy. Use Edit Page List in its canvas toolbar to convert the current pages into editable menu links.</p></section></div> : selectedNavigationLinkId ? selectedNavigationItem && isNavigationSpacer(selectedNavigationItem) ? <NavigationSpacerInspector key={`${resetRevision}:${selectedNavigationLinkId}`} {...navigationProps} /> : <PageLinkInspector onView={() => setMode("preview")} key={`${resetRevision}:${selectedNavigationLinkId}`} {...navigationProps} /> : <NavigationInspector key={resetRevision} block={inspectorBlock} {...navigationProps} onBlockChange={next => updateBlock(next)} /> : <BlockInspector contentSlot={type === "template-content" && inspectorBlock?.id === `${type}-library-specimen`} key={`${inspectorBlock.id}-${resetRevision}`} block={inspectorBlock} selectedListItem={selectedListItem?.blockId === inspectorBlock.id ? selectedListItem : null} canSetSticky={inspectorBlock.type === "group" && data.blocks.some(block => block.id === inspectorBlock.id)} spacerOrientation={spacerOrientationFor(data.blocks, inspectorBlock.id)} flexItemParent={selectedFlexParent?.type === "group" && selectedFlexParent.allowSizingOnChildren === true && (selectedFlexParent.layout === "row" || selectedFlexParent.layout === "stack")} gridItemParent={selectedFlexParent?.type === "group" && selectedFlexParent.layout === "grid"} onChange={next => updateBlock(next)} onColumnCountChange={inspectorBlock.type === "columns" ? count => commands.updateColumnCount(inspectorBlock, count) : undefined} columnWidthMax={maximumColumnWidth(selectedColumnParent?.children.filter(column => !column.widthUnit).length ?? 2)} onColumnWidthChange={selectedColumnParent && selectedColumnParent.children.length > 1 ? (columnId, width) => commands.updateColumnWidth(selectedColumnParent, columnId, width) : undefined} onColumnWidthUnitChange={selectedColumnParent ? (columnId, width, unit) => commands.updateColumnWidthUnit(selectedColumnParent, columnId, width, unit) : undefined} onButtonPreviewChange={setButtonPreview} onOpenFiles={trigger => inspectorBlock.type === "image" || inspectorBlock.type === "cover" ? imageFiles.choose(inspectorBlock.id, trigger) : inspectorBlock.type === "author-name" ? imageFiles.chooseAuthorProfile(inspectorBlock.id, trigger) : chooseFixtureMedia()} canOpenFiles={inspectorBlock.type === "image" || inspectorBlock.type === "cover" || inspectorBlock.type === "author-name"} onOpenBackgroundMedia={chooseFixtureMedia} fontSizeModeScope={`library-${type}`} fontSizeViewModes={fontSizeViewModes} onFontSizeViewModeChange={(key, viewMode) => setFontSizeViewModes(current => ({ ...current, [key]: viewMode }))} />}</InspectorContentDisabledProvider></fieldset> : <p>Select a block to inspect its content settings.</p>, editorActions)}</div>
        </div>
        <p className="ui-block-sample-note">{fixture.note}</p>
        {type === "image" ? <p className="ui-block-sample-note">Resolution choices in this specimen are temporary and are not saved to Studio documents.</p> : null}
        <p className="ui-block-isolation-note">Undo and Redo apply to the temporary block and example document, including rich text. Form fields keep the browser’s native text history. The specimen does not change saved Studio documents or read publication storage; Navigation Search uses only its temporary example pages.</p>
      </section>

      <details id="control-inventory" className="ui-block-inventory ui-block-disclosure"><summary><span>Inspector controls and dependencies<small>Capability categories, availability and origin</small></span><StudioIcon name="chevron-right" size={16} /></summary>
        <p>This is a capability inventory grouped by category, not the pane’s visual order. Gutenberg and ACM identify each setting’s origin; they do not imply separate panes. Optional settings may need enabling in a section menu. Hidden and model-only attributes are listed for compatibility, not as editable controls. Unprefixed style keys belong to style (Paragraph, Columns and Column) or visualStyle (other styled blocks); other fields belong to the block. Button state styles also use interactionStyles.</p>
        {profile.sections.map(section => <section id={section.id} key={section.id}><h2>{section.label}</h2><div className="ui-block-inventory-columns"><span>Control</span><span>Origin</span><span>Stored fields</span></div><ol>{profile.controls.filter(control => control.placement !== "canvas" && control.documentationStatus !== "Summary control" && control.section === section.id).map(control => <li key={`${control.source}-${control.id}`}><span>{control.label}{control.documentationStatus ? ` — ${control.documentationStatus}` : control.enabled === false ? " — Theme unavailable" : control.availableWhen ? " — Conditional" : ""}</span><span>{control.source === "gutenberg" ? "Gutenberg" : "ACM"}</span><span>{control.unavailableReason ? `${control.unavailableReason} ` : ""}{control.fields.length ? control.fields.join(", ") : control.availableWhen ?? control.dependency ?? "Block setting"}{control.availableWhen ? ` · ${control.availableWhen}` : ""}</span></li>)}</ol></section>)}
        {profile.summaryControls.length ? <section><h2>Summary controls</h2><ul>{profile.summaryControls.map(control => <li key={control.id}>{control.label} · {control.fields.join(", ")}{control.availableWhen ? ` · ${control.availableWhen}` : ""}</li>)}</ul></section> : null}
        {profile.toolbar ? <section className="ui-block-toolbar-inventory"><h2>Toolbar controls</h2><p>The production editor and this inventory use the same toolbar definition. Availability follows the selected block and editor context. Commands and saved changes remain owned by the editor adapter.</p>{profile.toolbar.groups.map(group => {
          const actions = profile.toolbar!.actions.filter(item => item.group === group.id).sort((first, second) => first.order - second.order);
          if (!actions.length) return null;
          return <section key={group.id}><h3>{group.label}</h3><ol>{actions.map(item => <li key={item.id}><strong>{item.label}</strong><span>{describeToolbarAvailability(item.availability)}</span><span>{item.fields.length ? `Affects ${item.fields.join(", ")}` : "Selection or structure action; no block field is saved."}</span></li>)}</ol></section>;
        })}{profile.toolbar.referenceNotes?.length ? <p>Reference differences: {profile.toolbar.referenceNotes.join("; ")}</p> : null}</section> : profile.controls.some(control => control.placement === "canvas") ? <section><h2>Canvas controls</h2><ul>{profile.controls.filter(control => control.placement === "canvas").map(control => <li key={control.id}>{control.label} · {control.fields.join(", ")}</li>)}</ul><p>These controls live on the canvas outside the inspector pane.</p></section> : null}
        {profile.nestedProfiles?.map(nested => <section className="ui-block-nested-profile" key={nested.type}><h2>{nested.label}</h2><p>Nested in {nested.parentType}; this profile describes the selected item settings and does not make List Item a top-level ContentBlock.</p>{nested.sections.map(section => <section key={section.id}><h3>{section.label}</h3><div className="ui-block-inventory-columns"><span>Control</span><span>Origin</span><span>Stored fields</span></div><ol>{nested.controls.filter(control => control.section === section.id).map(control => <li key={`${control.source}-${control.id}`}><span>{control.label}</span><span>{control.source === "gutenberg" ? "Gutenberg" : "ACM"}</span><span>{control.fields.join(", ") || "Block setting"}</span></li>)}</ol></section>)}<h3>Reusable controls</h3><ul>{nested.dependencies.map(dependency => <li key={dependency.id}><a href={dependency.href} title={dependency.purpose}>{dependency.label}</a></li>)}</ul></section>)}
        <h2>Direct and composed reusable controls</h2><p>Some dependencies are composed inside another control, such as Custom font size inside Font size and Appearance, or Box dimensions inside Border settings. Follow an entry for its composition and caller contract.</p><ul>{profile.dependencies.map(dependency => <li key={dependency.id}><a href={dependency.href} title={dependency.purpose}>{dependency.label}</a></li>)}</ul>
      </details>

      <details id="compatibility-notes" className="ui-block-compatibility-notes ui-block-disclosure"><summary><span>Compatibility and supported gaps<small>Mapping, theme variation and Studio-specific behaviour</small></span><StudioIcon name="chevron-right" size={16} /></summary>
        <dl className="ui-block-compatibility"><div><dt>Gutenberg mapping</dt><dd>{profile.mapping}</dd></div><div><dt>Inspector</dt><dd>Availability follows the current Studio implementation and caller context. The inventory records conditional, hidden retained, model-only and captured-theme unavailable settings separately.</dd></div><div><dt>Nesting</dt><dd>{profile.nesting}</dd></div><div><dt>Context</dt><dd>{profile.context}</dd></div></dl>
        <p>Recorded reference baseline: Gutenberg v24.1.0-rc.1 at the pinned commit. These are recorded mappings, not a fresh upstream parity certification. Gutenberg options depend on block supports and theme settings; local behaviour and limitations are documented below.</p>
        {Object.keys(profile.attributeDefaults).length ? <p className="ui-block-attribute-defaults">Recorded Gutenberg attribute defaults (not Studio insertion defaults): {Object.entries(profile.attributeDefaults).map(([field, value]) => `${field}=${String(value)}`).join(", ")}.</p> : null}
        {profile.insertionDefaults ? <p><strong>Studio insertion defaults:</strong> {profile.insertionDefaults}</p> : null}
        <ul>{profile.notes.map(note => <li key={note}>{note}</li>)}</ul>
        {profile.hasAdditionalCss || profile.nestedProfiles?.some(nested => nested.controls.some(control => control.fields.includes("additionalCss"))) ? <p>{additionalCssCompatibility}</p> : null}
        {profile.unsupported.length ? <ul>{profile.unsupported.map(item => <li key={item}>{item}</li>)}</ul> : <p>No additional model gap is recorded for this profile.</p>}
        {type === "template-content" ? <p>Content is a template projection element, not a typed ContentBlock. This route shows a temporary document body passing through that slot.</p> : null}
      </details>
    </section></TableCaptionProvider></FootnoteNumbersProvider></ListInspectorCanvasContext.Provider></ImageRenditionProvider></ImageResolutionChoicesProvider>;
}

function BlockSpecimenDetail({ type, onBack, handleInitialHash }: { type: BlockType; onBack: () => void; handleInitialHash: boolean }) {
  const entry = blockContextEntryByType[type];
  const contexts = blockContexts(entry);
  const [context, setContext] = useState(() => initialBlockContext(contexts));
  const [history, dispatch] = useReducer(stylesPreviewReducer, undefined, createStylesPreview);
  const [variation, setVariation] = useState<string>();
  const [viewport, setViewport] = useState<StyleViewport>("desktop");
  const [revision, setRevision] = useState(0);
  const [styleButtonState, setStyleButtonState] = useState<ButtonPseudoState>("default");
  const tabId = useId();
  const selection = resolvePreviewStyle(history.present, "global");
  const canvasSelection = blockContextCanvasStyles(selection, entry.styleTarget, variation, viewport, styleButtonState);
  const design = { ...effectiveWebsiteDesign(undefined, undefined), styles: canvasSelection };
  const inspector = (content: ReactNode, actions: ReactNode) => <Pane label={`${entry.label} inspector`} side="right" width={300} collapsed={false} onCollapsedChange={() => {}} collapseIcon={<StudioIcon name="chevron-right" size={18} />} collapsible={false} flushRegions={context.active === "block-editor" ? ["body"] : []} style={{width: "100%", ...(context.active === "site-editor-styles" ? {"--pane-inline-space": "28px"} : {})} as CSSProperties} tabs={<PaneTabs id={tabId} label="Block context" className="ui-block-context-tabs" tabs={contexts.map(value => ({id: value, label: value === "block-editor" ? "Block editor" : "Site editor styles"}))} active={context.active} onChange={value => setContext(current => activateBlockContext(current, value as typeof context.active, contexts))} />} >
    {entry.editorType ? <PaneTabPanel id={tabId} tab="block-editor" active={context.active}>{actions}{content}</PaneTabPanel> : null}
    {entry.styleTarget ? <PaneTabPanel id={tabId} tab="site-editor-styles" active={context.active}>
      <BlockSiteStylesInspector key={revision} target={entry.styleTarget} buttonState={styleButtonState} onButtonStateChange={setStyleButtonState} history={history} dispatch={dispatch} variation={variation} onVariationChange={setVariation} viewport={viewport} onViewportChange={setViewport} onReset={() => { dispatch({type: "hydrate", values: createStylesPreview().present}); setVariation(undefined); setViewport("desktop"); setStyleButtonState("default"); setRevision(value => value + 1); }} />
    </PaneTabPanel> : null}
  </Pane>;
  return <section className="ui-blocks-main ui-page-intro ui-block-detail-page" aria-labelledby={`${tabId}-title`}>
    <p className="rl-eyebrow"><button type="button" onClick={onBack}>Blocks</button> / {entry.label}</p>
    <h1 id={`${tabId}-title`}>{entry.label}</h1><p>{entry.description}</p>
    {entry.editorType ? <BlockEditorSpecimenDetail type={entry.editorType} handleInitialHash={handleInitialHash} design={design} viewport={viewport} renderInspector={inspector} /> : <section className="ui-block-specimen ui-block-style-only"><div className="ui-block-editor-layout">
      <div className="ui-block-canvas" aria-label={`${entry.label} main preview`}><BlockStyleSpecimen id={entry.styleTarget!} selection={selection} viewport={viewport} variation={variation} /></div>
      <div className="ui-block-inspector">{inspector(null,null)}</div>
    </div></section>}
  </section>;
}

function BlockSiteStylesInspector({ target, buttonState, onButtonStateChange, history, dispatch, variation, onVariationChange, viewport, onViewportChange, onReset }: { target: PreviewBlockId; buttonState: ButtonPseudoState; onButtonStateChange: (state: ButtonPseudoState) => void; history: StyleHistory; dispatch: Dispatch<StyleAction>; variation?: string; onVariationChange: (value?: string) => void; viewport: StyleViewport; onViewportChange: (value: StyleViewport) => void; onReset: () => void }) {
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Temporary style history uses the canonical workspace shortcut contract.
  return <section className="ui-library-styles-inspector site-editor-preview" aria-label="Site editor styles specimen" onKeyDown={event => {
    if (isNativeEditingTarget(event.target) || event.target instanceof Element && event.target.closest('dialog')) return;
    const action = workspaceHistoryShortcut(event); if (!action) return;
    event.preventDefault(); event.stopPropagation(); dispatch({type: action});
  }}>
    <div className="ui-block-actions ui-library-style-history"><HistoryActions canUndo={history.past.length > 0} canRedo={history.future.length > 0} onUndo={() => dispatch({type: "undo"})} onRedo={() => dispatch({type: "redo"})} undoLabel="Undo site style specimen change" redoLabel="Redo site style specimen change" /><button type="button" onClick={onReset}><StudioIcon name="rotate" size={18} />Reset styles example</button></div>
    {history.notice ? <p role="alert">{history.notice}</p> : null}
    <BlocksPreview buttonState={buttonState} onButtonStateChange={onButtonStateChange} autoFocusHeading={false} showSpecimen={false} selected={target} onSelect={() => {}} showBack={Boolean(variation)} onBack={() => {}} variation={variation} onVariationChange={onVariationChange} viewport={viewport} onViewportChange={onViewportChange} selection={resolvePreviewStyle(history.present, "global")} authored={history.present.global} scope="global" dispatch={dispatch} />
  </section>;
}
