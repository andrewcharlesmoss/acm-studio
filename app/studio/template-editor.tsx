"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ContentBlock } from "../content/model";
import { BlockRenderer } from "../components/content";
import { blockCatalogue, createBlock, type StudioDocument, type InsertableBlockType } from "./editor-model";
import { StudioEditor } from "./studio-editor";
import { BlockField } from "./studio-canvas";
import { TemplateInspector } from "./template-inspector";
import { TemplateNodes, TemplatePartRegion, TemplateSurface } from "./template-renderer";
import { templateEditorBlocks, templateNodesFromBlocks, templateElements, templateElementLabel, templateId, visitTemplateNodes, type PageTemplate, type TemplatePart, type TemplateSet, type TemplateNode } from "./template-model";
import { useStudioBlockCommands } from "./use-studio-block-commands";
import { findBlockById } from "./studio-command-operations.mjs";
import { changeTemplateZoom, TEMPLATE_ZOOM_DEFAULT, TEMPLATE_ZOOM_MAX, TEMPLATE_ZOOM_MIN, templateZoomShortcut } from "./template-zoom";
import { StudioIcon } from "./studio-icons";

export function TemplateEditor({ set, target, documents, mediaUrls, writable, onChange, onEditPart, onOpenMedia, undo, redo, canUndo, canRedo }: {
  set: TemplateSet; target: PageTemplate | TemplatePart; documents: StudioDocument[]; mediaUrls: Record<string, string>; writable: boolean;
  onChange: (set: TemplateSet) => boolean; onEditPart: (id: string) => void; onOpenMedia: (blockId: string | null, logo?: boolean) => void;
  undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean;
}) {
  const candidates = documents.filter(document => target.kind === "page" || target.kind === "post" ? document.kind === target.kind : true);
  const [sampleId, setSampleId] = useState(candidates[0]?.id);
  const sample = candidates.find(document => document.id === sampleId) ?? candidates[0] ?? documents[0];
  const [selected, setSelected] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [width, setWidth] = useState(1200);
  const [zoom, setZoom] = useState(TEMPLATE_ZOOM_DEFAULT);
  const templateWorkspaceActiveRef = useRef(false);
  const [showInserter, setShowInserter] = useState(false);
  const [query, setQuery] = useState("");
  const [insertAfter, setInsertAfter] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const blocks = templateEditorBlocks(target.nodes);
  // Document metadata blocks belong to page/post bodies. Template nodes already
  // have explicit document-title, subtitle and post-metadata elements, so do
  // not offer body-owned metadata blocks in this separate target.
  const templateBlockCatalogue = blockCatalogue.filter(block => !["reading-time", "post-author", "post-date"].includes(block.type));
  const selectedBlock = selected ? findBlockById(blocks, selected) : null;
  const editingProjection = { ...sample, blocks };
  const nodesRef = useRef(target.nodes);
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
    if (onChange({ ...set, templates: set.templates.map(item => item.id === target.id ? { ...item, nodes } : item), parts: set.parts.map(item => item.id === target.id ? { ...item, nodes } : item) })) nodesRef.current = nodes;
  };
  const commands = useStudioBlockCommands({ activeDocument: editingProjection, updateActiveDocument: update => { if (writable) updateNodes(templateNodesFromBlocks(update({ ...sample, blocks: templateEditorBlocks(nodesRef.current) }).blocks)); } });
  function insertNode(node: TemplateNode) {
    if (!writable) return;
    const projected = templateEditorBlocks([node])[0];
    if (selectedBlock?.type === "group" && !selectedBlock.data?.templateElement && !selectedBlock.data?.templatePart) commands.updateBlock(selectedBlock.id, block => block.type === "group" ? { ...block, children: [...block.children, projected] } : block);
    else {
      const next = [...target.nodes]; next.splice(insertAfter === null ? next.length : insertAfter + 1, 0, node); updateNodes(next);
    }
    setSelected(node.id); setShowInserter(false); setQuery("");
    return projected;
  }
  function insertBlock(type: InsertableBlockType) {
    const block = createBlock(type, templateId()); insertNode(templateNodesFromBlocks([block])[0]); return block;
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
    <label>Preview Content<select value={sample.id} onChange={event => setSampleId(event.target.value)}>{candidates.map(document => <option key={document.id} value={document.id}>{document.title}</option>)}</select></label>
    <label>Width<select value={width} onChange={event => setWidth(Number(event.target.value))}><option value={1200}>Desktop</option><option value={768}>Tablet</option><option value={390}>Mobile</option></select></label>
    <div className="template-zoom-control" role="group" aria-label="Template canvas zoom">
      <span className="template-zoom-label">Zoom</span>
      <button type="button" onClick={() => setZoom(value => changeTemplateZoom(value, "out"))} disabled={zoom <= TEMPLATE_ZOOM_MIN} aria-label="Zoom out" title="Zoom out"><StudioIcon name="zoom-out" size={18} /></button>
      <button type="button" className="template-zoom-value" onClick={() => setZoom(TEMPLATE_ZOOM_DEFAULT)} aria-label={`Reset template zoom to 100 percent (currently ${zoom} percent)`} title="Reset zoom to 100 percent">{zoom}%</button>
      <button type="button" onClick={() => setZoom(value => changeTemplateZoom(value, "in"))} disabled={zoom >= TEMPLATE_ZOOM_MAX} aria-label="Zoom in" title="Zoom in"><StudioIcon name="zoom-in" size={18} /></button>
    </div>
    {!previewing ? <label>Add Template Element<select value="" disabled={!writable} onChange={event => { const value = event.target.value; if (value.startsWith("part:")) insertNode({ id: templateId(), type: "part", partId: value.slice(5) }); else insertNode({ id: templateId(), type: "element", element: value as typeof templateElements[number] }); }}><option value="" disabled>Choose Element</option>{templateElements.filter(element => element !== "content" || target.kind === "page" || target.kind === "post").map(element => <option key={element} value={element}>{templateElementLabel(element)}</option>)}{set.parts.filter(part => part.id !== target.id).map(part => <option key={part.id} value={`part:${part.id}`}>{part.name} Reference</option>)}</select></label> : null}
    {selectedBlock?.type === "group" && !selectedBlock.data?.templateElement && !selectedBlock.data?.templatePart ? <span>New blocks will be inserted into the selected group.</span> : null}
  </div>;
  return <StudioEditor writable={writable} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}
    target={{ kind: target.kind === "page" || target.kind === "post" ? "template" : "part", id: target.id, name: target.name, blocks, inspector: <TemplateInspector set={set} target={target} selectedBlock={selectedBlock} writable={writable} onChange={onChange} onBlockChange={block => commands.updateBlock(block.id, () => block)} onOpenMedia={logo => onOpenMedia(selectedBlock?.id ?? null, logo)} onEditPart={onEditPart} users={users} /> }}
    canvas={{ activeDocument: sample, className: "template-editing", toolbarContent: toolbar, viewportWidth: width, viewportWidthCanOverflow: true, canvasZoom: zoom, previewing, onPreviewChange: setPreviewing, wordCount: 0, characterCount: 0, linkTargets: documents.map(d => ({ id: d.id, title: d.title, kind: d.kind, href: d.kind === "post" ? `/writing/${d.slug}` : `/${d.slug}` })), showCoverImage: false, mediaBlockUrls: mediaUrls, selectedBlockId: selected, dragOverIndex: dragOver, showInserter, inserterQuery: query, filteredBlocks: templateBlockCatalogue.filter(block => `${block.label} ${block.description}`.toLowerCase().includes(query.toLowerCase())), publishFeedback: null,
      presentation: { renderHeader: () => <></>, allowCoverImage: false, showPublicationDetails: false, hideDividers: false, renderDocument: (context, content) => <TemplateSurface set={set} editing={context.mode === "edit"}>{target.kind === "header" || target.kind === "footer" ? <TemplatePartRegion part={target}>{content}</TemplatePartRegion> : content}</TemplateSurface>, renderBlock: context => {
        if (!context.block) return null;
        if (!["group", "section"].includes(context.block.type)) return null;
        return <TemplateNodes key={context.block.id} set={set} document={sample} nodes={templateNodesFromBlocks([context.block])} mediaUrls={mediaUrls} content={<BlockRenderer blocks={sample.blocks} mediaUrls={mediaUrls} variant="studio" hideDividers={false} document={sample} />} onEditPart={context.mode === "edit" ? onEditPart : undefined}
          renderOrdinary={context.mode === "edit" && writable ? node => <BlockField block={node as ContentBlock} selectedBlockId={selected} mediaUrl={node.type === "image" && node.mediaId ? mediaUrls[node.mediaId] : undefined} onTableCellFocus={() => {}} onTextSelection={() => {}} onLinkActivate={() => {}} onChange={block => commands.updateBlock(block.id, () => block)} /> : undefined}
          decorate={context.mode === "edit" ? (node, result) => {
            if (!findBlockById(blocks, node.id)) return result;
            const label = node.type === "element" ? templateElementLabel(node.element) : node.type === "part" ? "Shared Part" : templateElementLabel(node.type);
            // This named focusable group preserves editable descendants without nesting them in a button.
            /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
            const selectionFrame = <div
              className={`template-node-selectable${selected === node.id ? " template-node-selected" : ""}`}
              data-studio-nested-block-id={node.id}
              role="group"
              aria-label={`Template node: ${label}`}
              tabIndex={0}
              onPointerDown={event => { event.stopPropagation(); setSelected(node.id); }}
              onFocusCapture={() => setSelected(node.id)}
              onKeyDown={event => {
                if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                setSelected(node.id);
              }}
            >{result}</div>;
            /* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
            return selectionFrame;
          } : undefined} />;
      } },
      onOpenInserter: (index, search = "") => { setInsertAfter(index); setQuery(search); setShowInserter(true); }, onSetPublishFeedback: () => {}, onDocumentFieldChange: () => {}, onApplyDocumentCode: () => {}, onFocusDocumentField: () => {}, onOpenCoverMediaLibrary: () => {}, onRemoveCoverImage: () => {}, onSelectBlock: setSelected, onClearBlockSelection: () => setSelected(null), onSetDragOverIndex: setDragOver, onMoveBlockTo: commands.moveBlockTo, onMoveBlock: commands.moveBlock, onDuplicateBlock: commands.duplicateBlock, onRemoveBlock: commands.removeBlock, onUpdateBlock: commands.updateBlock, onInsertBlock: insertBlock, onSetShowInserter: setShowInserter, onSetInserterQuery: setQuery,
    }} />;
}
