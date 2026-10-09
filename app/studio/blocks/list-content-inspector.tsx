"use client";

import { useContext, useLayoutEffect, useRef, useState } from "react";
import { AcmIcon } from "@acm/icons/react";
import type { ContentBlock, ListBlock } from "../../content/model";
import { focusInspectorListItem, ListInspectorCanvasContext } from "../list-inspector-navigation";

export function appendInspectorListItem(block: ListBlock): ListBlock {
  // An empty legacy List already displays one editable, empty item.
  return { ...block, items: [...(block.items.length ? block.items : [""]), ""] };
}

export function ListContentInspector({ block, onChange }: { block: ListBlock; onChange: (block: ContentBlock) => void }) {
  const canvas = useContext(ListInspectorCanvasContext);
  const [pendingItem, setPendingItem] = useState<{ listId: string; items: string; index: number } | null>(null);
  const handledItem = useRef<typeof pendingItem>(null);
  useLayoutEffect(() => {
    if (!pendingItem || handledItem.current === pendingItem) return;
    handledItem.current = pendingItem;
    // Focus only an accepted update. A rejected or superseded change must not
    // select an unrelated item at the same index.
    if (pendingItem.listId === block.id && pendingItem.items === JSON.stringify(block.items)) {
      focusInspectorListItem(canvas?.current ?? null, block.id, pendingItem.index);
    }
  }, [block.id, block.items, canvas, pendingItem]);
  const items = block.items.length ? block.items : [""];
  return <div className="list-content-inspector">
    <ol aria-label="List items">
      {items.map((_, index) => <li key={index}>
        <button type="button" disabled={!canvas} aria-label={`Select List Item ${index + 1}`} onClick={() => focusInspectorListItem(canvas?.current ?? null, block.id, index)}>
          <AcmIcon name="text.list-bulleted" scale="Regular-M" size={24} /><span>List Item</span>
        </button>
      </li>)}
    </ol>
    <button className="button-primary list-inspector-add" type="button" aria-label="Add List Item" title="Add List Item" disabled={!canvas} onClick={() => {
      const next = appendInspectorListItem(block);
      setPendingItem({ listId: block.id, items: JSON.stringify(next.items), index: next.items.length - 1 });
      onChange(next);
    }}><AcmIcon name="action.add" scale="Regular-M" size={24} /></button>
  </div>;
}
