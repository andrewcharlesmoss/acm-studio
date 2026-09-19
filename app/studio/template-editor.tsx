"use client";
import { useLayoutEffect, useRef, useState } from "react";
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
  const [showInserter, setShowInserter] = useState(false);
  const [query, setQuery] = useState("");
  const [insertAfter, setInsertAfter] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const blocks = templateEditorBlocks(target.nodes);
  const selectedBlock = selected ? findBlockById(blocks, selected) : null;
  const editingProjection = { ...sample, blocks };
  const nodesRef = useRef(target.nodes);
  useLayoutEffect(() => { nodesRef.current = target.nodes; }, [target.nodes]);
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
    {!previewing ? <label>Add Template Element<select value="" disabled={!writable} onChange={event => { const value = event.target.value; if (value.startsWith("part:")) insertNode({ id: templateId(), type: "part", partId: value.slice(5) }); else insertNode({ id: templateId(), type: "element", element: value as typeof templateElements[number] }); }}><option value="" disabled>Choose Element</option>{templateElements.filter(element => element !== "content" || target.kind === "page" || target.kind === "post").map(element => <option key={element} value={element}>{templateElementLabel(element)}</option>)}{set.parts.filter(part => part.id !== target.id).map(part => <option key={part.id} value={`part:${part.id}`}>{part.name} Reference</option>)}</select></label> : null}
    {selectedBlock?.type === "group" && !selectedBlock.data?.templateElement && !selectedBlock.data?.templatePart ? <span>New blocks will be inserted into the selected group.</span> : null}
  </div>;
  return <StudioEditor writable={writable} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}
    target={{ kind: target.kind === "page" || target.kind === "post" ? "template" : "part", id: target.id, name: target.name, blocks, inspector: <TemplateInspector set={set} target={target} selectedBlock={selectedBlock} writable={writable} onChange={onChange} onBlockChange={block => commands.updateBlock(block.id, () => block)} onOpenMedia={logo => onOpenMedia(selectedBlock?.id ?? null, logo)} onEditPart={onEditPart} users={users} /> }}
    canvas={{ activeDocument: sample, className: "template-editing", toolbarContent: toolbar, viewportWidth: width, previewing, onPreviewChange: setPreviewing, wordCount: 0, characterCount: 0, linkTargets: documents.map(d => ({ id: d.id, title: d.title, kind: d.kind, href: d.kind === "post" ? `/writing/${d.slug}` : `/${d.slug}` })), showCoverImage: false, mediaBlockUrls: mediaUrls, selectedBlockId: selected, dragOverIndex: dragOver, showInserter, inserterQuery: query, filteredBlocks: blockCatalogue.filter(block => `${block.label} ${block.description}`.toLowerCase().includes(query.toLowerCase())), publishFeedback: null,
      presentation: { renderHeader: () => <></>, allowCoverImage: false, showPublicationDetails: false, hideDividers: false, renderDocument: (context, content) => <TemplateSurface set={set} editing={context.mode === "edit"}>{target.kind === "header" || target.kind === "footer" ? <TemplatePartRegion part={target}>{content}</TemplatePartRegion> : content}</TemplateSurface>, renderBlock: context => {
        if (!context.block) return null;
        if (!["group", "section"].includes(context.block.type)) return null;
        return <TemplateNodes key={context.block.id} set={set} document={sample} nodes={templateNodesFromBlocks([context.block])} mediaUrls={mediaUrls} content={<BlockRenderer blocks={sample.blocks} mediaUrls={mediaUrls} variant="studio" hideDividers={false} />} onEditPart={context.mode === "edit" ? onEditPart : undefined}
          renderOrdinary={context.mode === "edit" && writable ? node => <BlockField block={node as ContentBlock} selectedBlockId={selected} mediaUrl={node.type === "image" && node.mediaId ? mediaUrls[node.mediaId] : undefined} onTableCellFocus={() => {}} onTextSelection={() => {}} onLinkActivate={() => {}} onChange={block => commands.updateBlock(block.id, () => block)} /> : undefined}
          decorate={context.mode === "edit" ? (node, result) => findBlockById(blocks, node.id) ? <div className={selected === node.id ? "template-node-selected" : undefined} data-studio-nested-block-id={node.id}><button className="template-node-select" type="button" onClick={event => { event.stopPropagation(); setSelected(node.id); }}>{node.type === "element" ? templateElementLabel(node.element) : node.type === "part" ? "Shared Part" : templateElementLabel(node.type)}</button>{result}</div> : result : undefined} />;
      } },
      onOpenInserter: (index, search = "") => { setInsertAfter(index); setQuery(search); setShowInserter(true); }, onSetPublishFeedback: () => {}, onDocumentFieldChange: () => {}, onApplyDocumentCode: () => {}, onFocusDocumentField: () => {}, onOpenCoverMediaLibrary: () => {}, onRemoveCoverImage: () => {}, onSelectBlock: setSelected, onClearBlockSelection: () => setSelected(null), onSetDragOverIndex: setDragOver, onMoveBlockTo: commands.moveBlockTo, onMoveBlock: commands.moveBlock, onDuplicateBlock: commands.duplicateBlock, onRemoveBlock: commands.removeBlock, onUpdateBlock: commands.updateBlock, onInsertBlock: insertBlock, onSetShowInserter: setShowInserter, onSetInserterQuery: setQuery,
    }} />;
}
