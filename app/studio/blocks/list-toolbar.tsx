"use client";

import { useRef, useState } from "react";
import type { ContentBlock, ListBlock } from "../../content/model";
import { listItemText } from "../../content/model";
import { cloneBlocksForInsertion } from "../block-copy";
import { findListBlock, indentListItems, outdentListItems, replaceListItems } from "../list-structure";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { StudioHoverIcon } from "../studio-hover-icon";
import { preserveTextSelection } from "./editors/rich-text";

type ItemSelection = { listId: string; itemIndex: number };
type MoveResult = { block: ListBlock; listId: string; itemIndex: number };

export function ListItemSwitcher({ onSelectParent }: { onSelectParent: () => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  function close(restore = true) {
    setOpen(false);
    if (restore) triggerRef.current?.focus();
  }
  return <>
    <button type="button" onMouseDown={preserveTextSelection} onClick={onSelectParent} aria-label="Select parent block: List" title="Select parent block: List"><StudioHoverIcon name="block.list" /></button>
    <div className="transform-control">
      <button ref={triggerRef} type="button" onMouseDown={preserveTextSelection} onClick={() => { if (open) close(); else setOpen(true); }} aria-haspopup="menu" aria-expanded={open} aria-label="Change List Item block type or style" title="List Item"><StudioHoverIcon name="text.list-bulleted" /></button>
      {open ? <StudioAnchoredMenu anchor={() => triggerRef.current} className="rich-text-format-menu" aria-label="List Item transforms" onClose={close}>
        <button type="button" role="menuitem" aria-label="Close List Item transforms" onClick={() => close()}><StudioHoverIcon name="action.close" /><span>Close</span></button>
        <p>No transforms.</p>
      </StudioAnchoredMenu> : null}
    </div>
  </>;
}

export function ListToolbarControls({ root, list, selection, contextBlocks, writable, onChange }: {
  root: ListBlock; list: ListBlock; selection?: ItemSelection; contextBlocks: ContentBlock[]; writable: boolean;
  onChange: (result: MoveResult, focus?: number) => boolean;
}) {
  const first = selection?.itemIndex ?? 0;
  const last = selection?.itemIndex ?? Math.max(0, list.items.length - 1);
  const outdent = outdentListItems(root, list.id, first, last, contextBlocks);
  function move(direction: "indent" | "outdent") {
    if (!writable) return;
    const moved = direction === "indent" ? indentListItems(root, list.id, first, last, () => `list-${crypto.randomUUID()}`) : outdent;
    if (moved) onChange(moved, 0);
  }
  return <div className="list-toolbar-controls" role="group" aria-label="List controls">
    {!selection ? (["unordered", "ordered"] as const).map(style => <button key={style} type="button" onMouseDown={preserveTextSelection} disabled={!writable} aria-label={style === "ordered" ? "Convert to ordered list" : "Convert to unordered list"} title={style === "ordered" ? "Ordered" : "Unordered"} aria-pressed={list.style === style} className={list.style === style ? "is-active" : ""} onClick={() => onChange({ block: replaceListType(root, list.id, style), listId: list.id, itemIndex: first })}><StudioHoverIcon name={style === "ordered" ? "text.list-numbered" : "text.list-bulleted"} /></button>) : null}
    <button type="button" onMouseDown={preserveTextSelection} disabled={!writable || !outdent} aria-label="Outdent list item" title={selection ? "Outdent (Shift+Tab)" : "Outdent List"} onClick={() => move("outdent")}><StudioHoverIcon name="arrange.outdent" /></button>
    {selection ? <button type="button" onMouseDown={preserveTextSelection} disabled={!writable || first <= 0} aria-label="Indent list item" title="Indent (Tab)" onClick={() => move("indent")}><StudioHoverIcon name="arrange.indent" /></button> : null}
  </div>;
}

function replaceListType(root: ListBlock, listId: string, style: ListBlock["style"]): ListBlock {
  if (root.id === listId) return { ...root, style };
  return { ...root, items: root.items.map(item => typeof item === "string" ? item : { ...item, children: item.children?.map(child => replaceListType(child, listId, style)) }) };
}

export function ListItemActions({ root, selection, writable, onChange }: {
  root: ListBlock; selection: ItemSelection; writable: boolean; onChange: (result: MoveResult, focus?: number) => boolean;
}) {
  const found = findListBlock(root, selection.listId);
  if (!found) return null;
  const list: ListBlock = found;
  const items = list.items.length ? list.items : [""];
  const index = selection.itemIndex;
  function update(action: "up" | "down" | "duplicate" | "remove") {
    if (!writable || index < 0 || index >= items.length) return;
    const next = [...items];
    let targetIndex = index;
    if (action === "up" || action === "down") {
      targetIndex += action === "up" ? -1 : 1;
      if (targetIndex < 0 || targetIndex >= items.length) return;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    } else if (action === "duplicate") {
      const copy = cloneBlocksForInsertion([{ ...list, items: [items[index]] }])[0] as ListBlock;
      next.splice(index + 1, 0, copy.items[0]);
      targetIndex++;
    } else {
      next.splice(index, 1);
      targetIndex = Math.min(index, Math.max(0, next.length - 1));
    }
    const result = { block: replaceListItems(root, list.id, next), listId: list.id, itemIndex: targetIndex };
    onChange(result, action === "remove" ? listItemText(next[targetIndex] ?? "").length : 0);
  }
  return <div className="list-toolbar-controls" role="group" aria-label="List Item actions">
    <button type="button" onMouseDown={preserveTextSelection} disabled={!writable || index <= 0} aria-label="Move List Item up" title="Move up" onClick={() => update("up")}><StudioHoverIcon name="arrange.move-up" /></button>
    <button type="button" onMouseDown={preserveTextSelection} disabled={!writable || index >= items.length - 1} aria-label="Move List Item down" title="Move down" onClick={() => update("down")}><StudioHoverIcon name="arrange.move-down" /></button>
    <button type="button" onMouseDown={preserveTextSelection} disabled={!writable} aria-label="Duplicate List Item" title="Duplicate List Item" onClick={() => update("duplicate")}><StudioHoverIcon name="action.duplicate" /></button>
    <button type="button" onMouseDown={preserveTextSelection} disabled={!writable} aria-label="Remove List Item" title="Remove List Item" onClick={() => update("remove")}><StudioHoverIcon name="action.close" /></button>
  </div>;
}
