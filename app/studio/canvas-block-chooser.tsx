"use client";

import { SearchInput } from "./controls/native-fields";
import type { BlockLibraryItemType, blockCatalogue } from "./editor-model";
import { BlockLibraryIcon } from "./block-library-icons";
import { AcmIcon } from "@acm/icons/react";
import { StudioIcon } from "./studio-icons";
import { StudioAnchoredPopover } from "./overlays/anchored-popover";

export function CanvasBlockChooser({ anchor, query, choices, onQueryChange, onInsert, onBrowseAll, onClose, inline = false, activeIndex = 0, listId }: {
  anchor: HTMLElement;
  inline?: boolean;
  activeIndex?: number;
  listId?: string;
  query: string;
  choices: typeof blockCatalogue;
  onQueryChange: (query: string) => void;
  onInsert: (type: BlockLibraryItemType) => void;
  onBrowseAll?: () => void;
  onClose: (restoreFocus: boolean) => void;
}) {
  return <StudioAnchoredPopover anchor={() => anchor} label="Choose a block" focusOnMount={!inline} onClose={onClose} className="canvas-block-chooser">
    {inline ? <button type="button" className="canvas-block-chooser-close" aria-label="Close block suggestions" onMouseDown={event => event.preventDefault()} onClick={() => onClose(true)}><StudioIcon name="close" size={18} /></button> : null}
    {!inline ? <div className="canvas-block-chooser-search"><AcmIcon name="action.search" size={20} /><SearchInput  aria-label="Search blocks" placeholder="Search" value={query} onChange={event => onQueryChange(event.target.value)} /><button type="button" aria-label="Close block chooser" title="Close" onClick={() => onClose(true)}><StudioIcon name="close" size={20} /></button></div> : null}
    <div className={`canvas-block-chooser-options${inline ? " is-inline" : ""}`} id={inline ? listId : undefined} role={inline ? "listbox" : undefined} aria-label={inline ? "Suggested blocks" : undefined}>{choices.map((item, index) => <button type="button" id={inline ? `${listId}-${index}` : undefined} key={item.type} title={item.description} role={inline ? "option" : undefined} aria-selected={inline ? choices[activeIndex]?.type === item.type : undefined} onMouseDown={inline ? event => event.preventDefault() : undefined} onClick={() => onInsert(item.type)}><BlockLibraryIcon type={item.type} /><span>{item.label}</span></button>)}{choices.length === 0 ? <p>No blocks found.</p> : null}</div>
    {onBrowseAll ? <button className="canvas-block-chooser-browse" type="button" onClick={onBrowseAll}>Browse All</button> : null}
  </StudioAnchoredPopover>;
}
