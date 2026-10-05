"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ContentBlock, RichTextRun, SocialIconBlock } from "../content/model";
import { BlockRenderer } from "../components/content";
import { blockCatalogue, createBlock, createWorkspacePreviewDocument, socialIconCatalogue, templateContentBlock, type BlockLibraryItemType, type StudioDocument } from "./editor-model";
import { StudioEditor } from "./studio-editor";
import { BlockField } from "./studio-canvas";
import { TemplateInspector } from "./template-inspector";
import { TemplateNodes, TemplatePartRegion, TemplateSurface } from "./template-renderer";
import { copyTemplateData, templateEditorBlocks, templateNodesFromBlocks, templateElements, templateElementLabel, templateId, visitTemplateNodes, type PageTemplate, type TemplatePart, type TemplateSet, type TemplateNode } from "./template-model";
import { resolveDocumentDisplay, resolveDocumentFields } from "./document-fields";
import { useStudioBlockCommands } from "./use-studio-block-commands";
import { insertedBlockSelectionId } from "./button-insertion";
import { blockInserterOptions, groupAllowsChild } from "./block-inserter-options";
import { findBlockById } from "./studio-command-operations.mjs";
import { changeTemplateZoom, TEMPLATE_ZOOM_DEFAULT, TEMPLATE_ZOOM_MAX, TEMPLATE_ZOOM_MIN, templateZoomShortcut } from "./template-zoom";
import { StudioIcon } from "./studio-icons";
import { insertTemplateContent, templateContentAvailable } from "./template-content-insertion";
import { TemplateContentSlot } from "./template-content-slot";
import { reconcileFootnoteBlocks } from "../content/footnote-reconciliation";

export function TemplateEditor({ set, target, documents, mediaUrls, writable, onChange, onEditPart, onOpenMedia, loadInlineImages, inspectorTab, onInspectorTabChange, inspectorPaneWidth, onInspectorPaneWidthChange, inspectorPaneCollapsed, onInspectorPaneCollapsedChange, undo, redo, canUndo, canRedo }: {
  set: TemplateSet; target: PageTemplate | TemplatePart; documents: StudioDocument[]; mediaUrls: Record<string, string>; writable: boolean;
  onChange: (set: TemplateSet) => boolean; onEditPart: (id: string) => void; onOpenMedia: (blockId: string | null, logo?: boolean, background?: boolean) => void;
  loadInlineImages?: import("./inline-image-picker").InlineImageLibrary;
  inspectorTab?: "template" | "block" | "styles"; onInspectorTabChange?: (tab: "template" | "block" | "styles") => void;
  inspectorPaneWidth?: number; onInspectorPaneWidthChange?: (width: number) => void; inspectorPaneCollapsed?: boolean; onInspectorPaneCollapsedChange?: (collapsed: boolean) => void;
  undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean;
}) {
  const candidates = documents.filter(document => target.kind === "page" || target.kind === "post" ? document.kind === target.kind : true);
  const [sampleId, setSampleId] = useState(candidates[0]?.id);
  const sample = candidates.find(document => document.id === sampleId) ?? candidates[0] ?? documents[0]
    ?? createWorkspacePreviewDocument(target.kind === "post" ? "post" : "page");
  const resolvedSample = {
    ...sample,
    ...resolveDocumentFields(sample, set, target.kind === "page" || target.kind === "post" ? target.defaults : undefined),
    displayOverrides: resolveDocumentDisplay(sample, target.kind === "page" || target.kind === "post" ? target : undefined),
  };
  const templatePreviewDocument = { ...resolvedSample, title: "", subtitle: "", coverImage: { src: "", alt: "" }, author: undefined, publishAt: undefined, publishedAt: undefined, blocks: [] };
  const [selected, setSelected] = useState<string | null>(null);
  const [localInspectorTab, setLocalInspectorTab] = useState<"template" | "block" | "styles">("template");
  const [previewing, setPreviewing] = useState(false);
  const [width, setWidth] = useState(1200);
  const [zoom, setZoom] = useState(TEMPLATE_ZOOM_DEFAULT);
  const templateWorkspaceActiveRef = useRef(false);
  const [showInserter, setShowInserter] = useState(false);
  const [query, setQuery] = useState("");
  const [insertAfter, setInsertAfter] = useState<number | null>(null);
  const [inserterParentId, setInserterParentId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const blocks = templateEditorBlocks(target.nodes);
  // Metadata blocks are ordinary dynamic blocks and can be placed in a
  // template. Their values come from the preview document at render time.
  const allowTemplateContent = templateContentAvailable(target);
  const templateBlockCatalogue = target.kind === "page" || target.kind === "post" ? [...blockCatalogue, templateContentBlock] : blockCatalogue;
  const selectedBlock = selected ? findBlockById(blocks, selected) : null;
  const activeInspectorTab = inspectorTab ?? localInspectorTab;
  const editingProjection = { ...resolvedSample, blocks };
  const nodesRef = useRef(target.nodes);
  function selectInspectorTab(tab: "template" | "block" | "styles") {
    setLocalInspectorTab(tab);
    onInspectorTabChange?.(tab);
  }
  function selectBlock(blockId: string) {
    setSelected(blockId);
    selectInspectorTab("block");
  }
  function clearBlockSelection() {
    setSelected(null);
    if (activeInspectorTab === "block") selectInspectorTab("template");
  }
  useLayoutEffect(() => { nodesRef.current = target.nodes; }, [target.nodes]);
  useEffect(() => {
    const isWithinTemplateWorkspace = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest(".template-editing"));
    const onPointerDown = (event: PointerEvent) => { templateWorkspaceActiveRef.current = isWithinTemplateWorkspace(event.target); };
    const onFocusIn = (event: FocusEvent) => { templateWorkspaceActiveRef.current = isWithinTemplateWorkspace(event.target); };
    const onBlur = () => { templateWorkspaceActiveRef.current = false; };
    const onKeyDown = (event: KeyboardEvent) => {
      const action = templateZoomShortcut(event, templateWorkspaceActiveRef.current);
      if (!action) return;
      event.preventDefault();
      setZoom(value => changeTemplateZoom(value, action));
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
  const updateNodes = (nodes: TemplateNode[]) => {
    const projected = templateEditorBlocks(nodes);
    const blocks = reconcileFootnoteBlocks(templateEditorBlocks(nodesRef.current), projected);
    if (!blocks) return false;
    if (blocks !== projected) nodes = templateNodesFromBlocks(blocks, nodes);
    if (onChange({ ...set, templates: set.templates.map(item => item.id === target.id ? { ...item, nodes } : item), parts: set.parts.map(item => item.id === target.id ? { ...item, nodes } : item) })) { nodesRef.current = nodes; return true; }
    return false;
  };
  const commands = useStudioBlockCommands({ activeDocument: editingProjection, updateActiveDocument: update => { if (writable) updateNodes(templateNodesFromBlocks(update({ ...sample, blocks: templateEditorBlocks(nodesRef.current) }).blocks, nodesRef.current)); } });
  function splitParagraph(id: string, beforeRuns: RichTextRun[], afterRuns: RichTextRun[]) {
    const nextId = writable ? commands.splitParagraph(id, beforeRuns, afterRuns) : null;
    if (nextId) selectBlock(nextId);
    return nextId;
  }
  function splitParagraphs(id: string, paragraphs: RichTextRun[][]) {
    const ids = writable ? commands.splitParagraphs(id, paragraphs) : null;
    if (ids?.[0]) selectBlock(ids[0]);
    return ids;
  }
  function findTemplateNode(id: string): TemplateNode | undefined {
    let found: TemplateNode | undefined;
    visitTemplateNodes(nodesRef.current, node => { if (node.id === id) found = node; });
    return found;
  }
  function clearCoverImage(id: string) {
    const next = copyTemplateData(nodesRef.current);
    visitTemplateNodes(next, candidate => {
      if (candidate.id !== id || candidate.type !== "element" || candidate.element !== "cover-image") return;
      delete candidate.fixedImage;
      candidate.coverImageHidden = true;
    });
    updateNodes(next);
  }
  function insertContent(index: number | null, parentId?: string, keepInserterOpen = true) {
    if (!writable) return null;
    const proposal = insertTemplateContent(set, target, nodesRef.current, index, parentId, templateId());
    if (!proposal || !updateNodes(proposal.nodes)) return null;
    selectBlock(proposal.block.id);
    if (!parentId && index !== null) setInsertAfter(index);
    if (!keepInserterOpen) { setShowInserter(false); setQuery(""); setInserterParentId(null); }
    return proposal.block;
  }
  function insertContentFromLibrary(index: number | null, parentId?: string) {
    // Clicks retain the template renderer's nested inserter; a numeric drag
    // boundary explicitly selects its root or Column destination.
    const owner = parentId ?? (index === null ? inserterParentId ?? undefined : undefined);
    return insertContent(index ?? (owner || insertAfter === null ? null : insertAfter + 1), owner);
  }
  function insertNode(node: TemplateNode, afterIndex = insertAfter, atRoot = false, keepInserterOpen = false) {
    if (node.type === "element" && node.element === "content") {
      const parent = !atRoot && selectedBlock && (selectedBlock.type === "group" && !selectedBlock.data?.templateElement && !selectedBlock.data?.templatePart || selectedBlock.type === "column" || selectedBlock.type === "section") ? selectedBlock : null;
      return insertContent(parent ? null : afterIndex === null ? null : afterIndex + 1, parent?.id, keepInserterOpen);
    }
    const projected = templateEditorBlocks([node])[0];
    if (!writable) return null;
    const currentSelected = selectedBlock ? findBlockById(templateEditorBlocks(nodesRef.current), selectedBlock.id) : null;
    if (!atRoot && (selectedBlock?.type === "group" || selectedBlock?.type === "column") && !currentSelected) return null;
    if (!atRoot && (currentSelected?.type === "group" || currentSelected?.type === "column") && (currentSelected.type === "column" || !currentSelected.data?.templateElement && !currentSelected.data?.templatePart)) {
      if (!groupAllowsChild(currentSelected, projected.type)) return null;
      commands.updateBlock(currentSelected.id, block => block.type === "group" || block.type === "column" ? { ...block, children: [...block.children, projected] } : block);
    }
    else {
      const next = [...nodesRef.current]; next.splice(afterIndex === null ? next.length : afterIndex + 1, 0, node); updateNodes(next);
    }
    if (!findTemplateNode(projected.id)) return null;
    selectBlock(insertedBlockSelectionId(projected));
    if (keepInserterOpen && afterIndex !== null) setInsertAfter(afterIndex + 1);
    if (!keepInserterOpen) { setShowInserter(false); setQuery(""); }
    return projected;
  }
  function insertBlock(type: BlockLibraryItemType, parentId?: string, options?: { keepInserterOpen?: boolean }) {
    if (!writable) return null;
    if (type === "template-content") return insertContent(parentId ? null : insertAfter === null ? null : insertAfter + 1, parentId, Boolean(options?.keepInserterOpen));
    const keepInserterOpen = Boolean(options?.keepInserterOpen);
    const finishInsertion = () => { if (!keepInserterOpen) { setShowInserter(false); setQuery(""); setInserterParentId(null); } };
    const parent = parentId ? findBlockById(templateEditorBlocks(nodesRef.current), parentId) : undefined;
    if (parentId && !parent) return null;
    if (parent && !groupAllowsChild(parent, type)) return null;
    if (parent?.type === "quote" || parent?.type === "buttons") {
      const added = commands.insertBlock(type, null, parent.id);
      if (!added || !findTemplateNode(added.id)) return null;
      selectBlock(insertedBlockSelectionId(added)); finishInsertion(); return added;
    }
    if (type === "social-linkedin" || type === "social-tiktok") {
      const socialIcon = createBlock(type, templateId()) as SocialIconBlock;
      if (parent?.type === "social-icons") {
        commands.updateBlock(parent.id, block => block.type === "social-icons" ? { ...block, children: [...block.children, socialIcon] } : block);
        if (!findTemplateNode(socialIcon.id)) return null;
        selectBlock(socialIcon.id); finishInsertion();
        return socialIcon;
      }
      const socialGroup = { id: templateId(), type: "social-icons" as const, children: [socialIcon] };
      const socialNode = templateNodesFromBlocks([socialGroup])[0];
      const projectedSocialGroup = templateEditorBlocks([socialNode])[0];
      if (parent && (parent.type === "group" || parent.type === "column") && (parent.type === "column" || !parent.data?.templateElement && !parent.data?.templatePart)) {
        commands.updateBlock(parent.id, block => {
          if (block.type === "group") return { ...block, children: [...block.children, projectedSocialGroup] };
          if (block.type === "column") return { ...block, children: [...block.children, projectedSocialGroup] };
          return block;
        });
        if (!findTemplateNode(socialIcon.id)) return null;
        selectBlock(socialIcon.id); finishInsertion();
        return socialIcon;
      }
      if (!keepInserterOpen) setInserterParentId(null);
      if (!insertNode(socialNode, insertAfter, keepInserterOpen, keepInserterOpen)) return null;
      selectBlock(socialIcon.id);
      return socialIcon;
    }
    const ordinary = createBlock(type, templateId());
    const insertion = ordinary?.type === "button" ? { id: templateId(), type: "buttons" as const, children: [ordinary] } : ordinary;
    const node = templateNodesFromBlocks([insertion])[0];
    const projected = templateEditorBlocks([node])[0];
    if (parent && ((parent.type === "group" || parent.type === "column") && (parent.type === "column" || !parent.data?.templateElement && !parent.data?.templatePart) || parent.type === "social-icons" && (projected.type === "social-linkedin" || projected.type === "social-tiktok"))) {
      commands.updateBlock(parent.id, block => block.type === "group" || block.type === "column" ? { ...block, children: [...block.children, projected] } : block.type === "social-icons" && (projected.type === "social-linkedin" || projected.type === "social-tiktok") ? { ...block, children: [...block.children, projected] } : block);
      if (!findTemplateNode(projected.id)) return null;
      selectBlock(insertedBlockSelectionId(projected)); finishInsertion();
      return projected;
    }
    if (!keepInserterOpen) setInserterParentId(null);
    return insertNode(node, insertAfter, keepInserterOpen, keepInserterOpen);
  }
  const users: string[] = [];
  for (const template of set.templates) {
    const seen = new Set<string>();
    const references = (nodes: TemplateNode[]): boolean => {
      let found = false;
      visitTemplateNodes(nodes, node => { if (node.type !== "part") return; if (node.partId === target.id) found = true; if (seen.has(node.partId)) return; seen.add(node.partId); const part = set.parts.find(p => p.id === node.partId); if (part && references(part.nodes)) found = true; });
      return found;
    };
    if (references(template.nodes)) users.push(template.name);
  }
  const toolbar = <div className="template-toolbar">
    <label>Preview Content<select value={sample.id} disabled={!candidates.length} onChange={event => setSampleId(event.target.value)}>{candidates.length ? candidates.map(document => <option key={document.id} value={document.id}>{document.title}</option>) : <option value={sample.id}>No pages or posts yet</option>}</select></label>
    <label>Width<select value={width} onChange={event => setWidth(Number(event.target.value))}><option value={1200}>Desktop</option><option value={768}>Tablet</option><option value={390}>Mobile</option></select></label>
    <div className="template-zoom-control" role="group" aria-label="Template canvas zoom">
      <span className="template-zoom-label">Zoom</span>
      <button type="button" onClick={() => setZoom(value => changeTemplateZoom(value, "out"))} disabled={zoom <= TEMPLATE_ZOOM_MIN} aria-label="Zoom out" title="Zoom out"><StudioIcon name="zoom-out" size={18} /></button>
      <button type="button" className="template-zoom-value" onClick={() => setZoom(TEMPLATE_ZOOM_DEFAULT)} aria-label={`Reset template zoom to 100 percent (currently ${zoom} percent)`} title="Reset zoom to 100 percent">{zoom}%</button>
      <button type="button" onClick={() => setZoom(value => changeTemplateZoom(value, "in"))} disabled={zoom >= TEMPLATE_ZOOM_MAX} aria-label="Zoom in" title="Zoom in"><StudioIcon name="zoom-in" size={18} /></button>
    </div>
    {!previewing ? <label>Add Template Element<select value="" disabled={!writable} onChange={event => { const value = event.target.value; if (value.startsWith("part:")) insertNode({ id: templateId(), type: "part", partId: value.slice(5) }); else insertNode({ id: templateId(), type: "element", element: value as typeof templateElements[number] }); }}><option value="" disabled>Choose Element</option>{templateElements.filter(element => element !== "post-metadata" && (element !== "content" || allowTemplateContent)).map(element => <option key={element} value={element}>{templateElementLabel(element)}</option>)}{set.parts.filter(part => part.id !== target.id).map(part => <option key={part.id} value={`part:${part.id}`}>{part.name} Reference</option>)}</select></label> : null}
    {selectedBlock?.type === "group" && !selectedBlock.data?.templateElement && !selectedBlock.data?.templatePart ? <span>New blocks will be inserted into the selected group.</span> : null}
  </div>;
  return <StudioEditor writable={writable} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}
    target={{ kind: target.kind === "page" || target.kind === "post" ? "template" : "part", id: target.id, name: target.name, blocks, inspector: selectedListItem => <TemplateInspector set={set} target={target} selectedBlock={selectedBlock} selectedListItem={selectedListItem} tab={activeInspectorTab} onTabChange={selectInspectorTab} paneWidth={inspectorPaneWidth} onPaneWidthChange={onInspectorPaneWidthChange} paneCollapsed={inspectorPaneCollapsed} onPaneCollapsedChange={onInspectorPaneCollapsedChange} writable={writable} onChange={onChange} onBlockChange={block => commands.updateBlock(block.id, () => block)} onColumnCountChange={commands.updateColumnCount} onColumnWidthChange={commands.updateColumnWidth} onOpenMedia={(logo, background) => onOpenMedia(selectedBlock?.id ?? null, logo, background)} onEditPart={onEditPart} users={users} /> }}
    canvas={{ activeDocument: editingProjection, className: "template-editing", toolbarContent: toolbar, viewportWidth: width, viewportWidthCanOverflow: true, canvasZoom: zoom, previewing, onPreviewChange: setPreviewing, wordCount: 0, characterCount: 0, linkTargets: documents.map(d => ({ id: d.id, title: d.title, kind: d.kind, href: d.kind === "post" ? `/writing/${d.slug}` : `/${d.slug}` })), showCoverImage: false, mediaBlockUrls: mediaUrls, selectedBlockId: selected, dragOverIndex: dragOver, showInserter, inserterQuery: query, filteredBlocks: blockInserterOptions(templateBlockCatalogue, inserterParentId ? findBlockById(blocks, inserterParentId) ?? undefined : undefined, query, socialIconCatalogue, { allowTemplateContent }), publishFeedback: null,
      presentation: { renderHeader: () => <></>, allowCoverImage: false, showPublicationDetails: false, hideDividers: false, renderDocument: (context, content) => <TemplateSurface set={set} editing={context.mode === "edit"} editorCanvas={context.mode === "edit"}>{target.kind === "header" || target.kind === "footer" ? <TemplatePartRegion part={target}>{content}</TemplatePartRegion> : content}</TemplateSurface>, renderBlock: context => {
        if (!context.block) return null;
        const currentBlock = context.block;
        const previewDynamicPlaceholder = context.mode === "preview" && ["document-title", "document-subtitle"].includes(currentBlock.type);
        if (!["group", "section", "columns", "column", "cover-image"].includes(currentBlock.type)) {
          if (context.mode === "edit" && writable) return context.renderEditableBlock?.(currentBlock, { document: resolvedSample, templatePlaceholder: true }) ?? null;
          if (previewDynamicPlaceholder) return <BlockField block={currentBlock} rootBlocks={editingProjection.blocks} document={templatePreviewDocument} templatePlaceholder writable={false} onChange={() => {}} onTableCellFocus={() => {}} onTextSelection={() => {}} onLinkActivate={() => {}} />;
          return <BlockRenderer blocks={[currentBlock]} mediaUrls={mediaUrls} variant="studio" hideDividers={false} document={templatePreviewDocument} readingTimeBlocks={templatePreviewDocument.blocks} />;
        }
        const contentSlot = <TemplateContentSlot />;
        const sourceNode = currentBlock.type === "cover-image" ? findTemplateNode(currentBlock.id) : undefined;
        const nodes = sourceNode ? [sourceNode] : templateNodesFromBlocks([currentBlock]);
        return <TemplateNodes key={currentBlock.id} set={set} document={context.mode === "edit" ? resolvedSample : templatePreviewDocument} nodes={nodes} mediaUrls={mediaUrls} content={contentSlot} editingDocument={context.mode === "edit" && writable} templatePreview={context.mode === "preview"} onChangeCover={context.mode === "edit" && writable && currentBlock.type === "cover-image" ? () => onOpenMedia(currentBlock.id) : undefined} onRemoveCoverImage={context.mode === "edit" && writable && currentBlock.type === "cover-image" ? () => clearCoverImage(currentBlock.id) : undefined} onRemoveCoverBlock={context.mode === "edit" && writable && currentBlock.type === "cover-image" ? () => commands.removeBlock(currentBlock.id) : undefined} onEditPart={context.mode === "edit" ? onEditPart : undefined}
          renderOrdinary={context.mode === "edit" && writable ? (node, spacerOrientation) => context.renderEditableBlock?.(templateEditorBlocks([node])[0] as ContentBlock, { document: resolvedSample, templatePlaceholder: true, spacerOrientation }) : undefined}
          decorate={context.mode === "edit" ? (node, result) => {
            if (!findBlockById(blocks, node.id)) return result;
            const label = node.type === "element" ? templateElementLabel(node.element) : node.type === "part" ? "Shared Part" : templateElementLabel(node.type);
            // This named focusable group preserves editable descendants without nesting them in a button.
            /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
            const selectionFrame = <div
              className={`template-node-selectable${node.id !== currentBlock.id ? " studio-nested-block" : ""}`}
              data-studio-nested-block-id={node.id}
              data-studio-selected={selected === node.id}
              role="group"
              aria-label={`Template node: ${label}`}
              tabIndex={0}
              onPointerDown={event => { event.stopPropagation(); const nestedId = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-studio-nested-block-id]")?.dataset.studioNestedBlockId : undefined; selectBlock(nestedId ?? node.id); }}
              onFocusCapture={event => { const nestedId = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-studio-nested-block-id]")?.dataset.studioNestedBlockId : undefined; selectBlock(nestedId ?? node.id); }}
              onKeyDown={event => {
                if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                selectBlock(node.id);
              }}
            >{node.id !== currentBlock.id ? context.renderBlockControls?.(findBlockById(blocks, node.id)!) : null}{result}</div>;
            /* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
            return selectionFrame;
          } : undefined} />;
      } },
      loadInlineImages,
      onOpenInserter: (index, search = "", parentId) => { setInsertAfter(index); setQuery(search); setInserterParentId(parentId ?? null); setShowInserter(true); }, onSetPublishFeedback: () => {}, onDocumentFieldChange: () => {}, onApplyDocumentCode: next => { if (writable) updateNodes(templateNodesFromBlocks(next, nodesRef.current)); }, onFocusDocumentField: () => {}, onOpenCoverMediaLibrary: () => {}, onRemoveCoverImage: () => {}, onSelectBlock: selectBlock, onClearBlockSelection: clearBlockSelection, onSetDragOverIndex: setDragOver, onMoveBlockTo: commands.moveBlockTo, onMoveBlock: commands.moveBlock, onDuplicateBlock: commands.duplicateBlock, onRemoveBlock: commands.removeBlock, onRemoveBlocks: commands.removeBlocks, onUpdateBlock: commands.updateBlock, onSplitParagraph: splitParagraph, onMergeParagraphBackward: (id) => { const merged = commands.mergeParagraphBackward(id); if (merged) selectBlock(merged.blockId); return merged; }, onSplitParagraphs: splitParagraphs, onExitList: (id, index, operation, listId) => writable ? commands.exitList(id, index, operation, listId) : null, onInsertBlock: (type, parentId, options) => insertBlock(type, parentId ?? inserterParentId ?? undefined, options), onSetShowInserter: setShowInserter, onSetInserterQuery: setQuery,
      onInsertTemplateContent: allowTemplateContent ? insertContentFromLibrary : undefined,
      onInsertBlockAt: (type, insertionIndex, parentId) => {
        if (!writable) return null;
        if (parentId) {
          const block = commands.insertBlock(type, null, parentId, insertionIndex);
          if (!block || !findTemplateNode(block.id)) return null;
          selectBlock(insertedBlockSelectionId(block));
          return block;
        }
        const block = createBlock(type, templateId());
        const node = templateNodesFromBlocks([block.type === "button" ? { id: templateId(), type: "buttons", children: [block] } : block])[0];
        return insertNode(node, insertionIndex - 1, true, true);
      },
    }} />;
}
