"use client";

import type { ContentBlock } from "../content/model";
import { childContentBlocks } from "../content/block-tree";
import { StudioIcon } from "./studio-icons";

export function selectedBlockPath(blocks: ContentBlock[], selectedId: string | null): ContentBlock[] {
  if (!selectedId) return [];
  for (const block of blocks) {
    if (block.id === selectedId) return [block];
    const descendants = selectedBlockPath(childContentBlocks(block), selectedId);
    if (descendants.length) return [block, ...descendants];
  }
  return [];
}

/** Selection navigation is transient editor chrome, never part of saved blocks. */
export function BlockSelectionBreadcrumbs({ root, rootBlockId, blocks, selectedId, labelFor, onSelect, onSelectRoot }: {
  root: { label: string; name: string };
  rootBlockId?: string;
  blocks: ContentBlock[];
  selectedId: string | null;
  labelFor: (block: ContentBlock) => string;
  onSelect: (id: string) => void;
  onSelectRoot: () => void;
}) {
  const selectedPath = selectedBlockPath(blocks, selectedId);
  const path = rootBlockId && selectedPath[0]?.id === rootBlockId ? selectedPath.slice(1) : selectedPath;
  return <nav className="block-selection-breadcrumbs" aria-label="Block selection path"><ol>
    <li><span>{root.label}</span></li>
    <li><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><button type="button" aria-current={path.length ? undefined : "location"} onClick={onSelectRoot}>{root.name}</button></li>
    {path.map((block, index) => <li key={block.id}><StudioIcon name="chevron-right" size={14} aria-hidden="true" /><button type="button" aria-current={index === path.length - 1 ? "location" : undefined} onClick={() => onSelect(block.id)}>{labelFor(block)}</button></li>)}
  </ol></nav>;
}
