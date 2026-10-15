"use client";

import { SearchInput } from "./controls/native-fields";
import type { BlockLibraryItemType, blockCatalogue } from "./editor-model";
import { BlockLibraryIcon } from "./block-library-icons";
import { AcmIcon } from "@acm/icons/react";
import { StudioIcon } from "./studio-icons";
import { StudioAnchoredPopover } from "./overlays/anchored-popover";

export function CanvasBlockChooser({ anchor, query, choices, onQueryChange, onInsert, onBrowseAll, onClose }: {
  anchor: HTMLElement;
  query: string;
  choices: typeof blockCatalogue;
  onQueryChange: (query: string) => void;
  onInsert: (type: BlockLibraryItemType) => void;
  onBrowseAll: () => void;
  onClose: (restoreFocus: boolean) => void;
}) {
  return <StudioAnchoredPopover anchor={() => anchor} label="Choose a block" focusOnMount onClose={onClose} className="canvas-block-chooser">
    <div className="canvas-block-chooser-search"><AcmIcon name="action.search" size={20} /><SearchInput  aria-label="Search blocks" placeholder="Search" value={query} onChange={event => onQueryChange(event.target.value)} /><button type="button" aria-label="Close block chooser" title="Close" onClick={() => onClose(true)}><StudioIcon name="close" size={20} /></button></div>
    <div className="canvas-block-chooser-options">{choices.map(item => <button type="button" key={item.type} title={item.description} onClick={() => onInsert(item.type)}><BlockLibraryIcon type={item.type} /><span>{item.label}</span></button>)}{choices.length === 0 ? <p>No blocks found.</p> : null}</div>
    <button className="canvas-block-chooser-browse" type="button" onClick={onBrowseAll}>Browse All</button>
  </StudioAnchoredPopover>;
}
