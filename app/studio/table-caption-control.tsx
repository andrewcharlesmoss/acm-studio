"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import type { ContentBlock } from "../content/model";

type TableBlock = Extract<ContentBlock, { type: "table" }>;
type ImageBlock = Extract<ContentBlock, { type: "image" }>;
type CaptionState = {
  requestedIds: ReadonlySet<string>;
  focusId: string | null;
  show: (id: string) => void;
  hide: (id: string) => void;
  focusHandled: (id: string) => void;
};

const TableCaptionContext = createContext<CaptionState | null>(null);

// An empty caption is an editing prompt, not a new persisted block attribute.
export function TableCaptionProvider({ children }: { children: ReactNode }) {
  const [requestedIds, setRequestedIds] = useState<ReadonlySet<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  return <TableCaptionContext.Provider value={{
    requestedIds,
    focusId,
    show(id) {
      setRequestedIds(current => new Set([...current, id]));
      setFocusId(id);
    },
    hide(id) {
      setRequestedIds(current => { const next = new Set(current); next.delete(id); return next; });
      setFocusId(current => current === id ? null : current);
    },
    focusHandled(id) { setFocusId(current => current === id ? null : current); },
  }}>{children}</TableCaptionContext.Provider>;
}

function useCaption(block: TableBlock | ImageBlock, includeRuns: boolean) {
  const state = useContext(TableCaptionContext);
  return {
    visible: Boolean(block.caption || (includeRuns && block.captionRuns?.length)) || Boolean(state?.requestedIds.has(block.id)),
    focusRequested: state?.focusId === block.id,
    focusHandled: () => state?.focusHandled(block.id),
  };
}

export function useTableCaption(block: TableBlock) { return useCaption(block, false); }
export function useImageCaption(block: ImageBlock) { return useCaption(block, true); }

function CaptionControl<T extends TableBlock | ImageBlock>({ block, writable = true, onChange }: {
  block: T;
  writable?: boolean;
  onChange: (block: T) => void;
}) {
  const state = useContext(TableCaptionContext);
  const { visible } = useCaption(block, block.type === "image");
  if (!state || (block.type === "table" && !block.rows.length)) return null;
  const label = visible ? "Remove caption" : "Add caption";
  return <button className={`table-caption-toggle${visible ? " is-active" : ""}`} type="button"
    data-studio-nested-block-id={block.id} aria-label={label} title={label} aria-pressed={visible} disabled={!writable}
    onMouseDown={event => event.preventDefault()} onClick={event => {
      if (visible) {
        event.currentTarget.focus();
        state.hide(block.id);
        if (block.caption || block.captionRuns?.length) onChange({ ...block, caption: undefined, captionRuns: undefined });
      } else state.show(block.id);
    }}><AcmIcon name="text.caption" scale="Regular-M" size={24} /></button>;
}

export function ImageCaptionControl(props: { block: ImageBlock; writable?: boolean; onChange: (block: ImageBlock) => void }) {
  return <CaptionControl {...props} />;
}

export function TableCaptionControl(props: {
  block: TableBlock;
  writable?: boolean;
  onChange: (block: TableBlock) => void;
}) {
  return <CaptionControl {...props} />;
}
