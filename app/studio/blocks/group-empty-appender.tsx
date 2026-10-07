"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ContentBlock } from "../../content/model";
import { StudioIcon } from "../studio-icons";

type GroupBlock = Extract<ContentBlock, { type: "group" }>;

/** Empty layout affordances are editor UI; they never become saved children. */
export function GroupEmptyAppender({ block, selected, writable, onOpen }: {
  block: GroupBlock;
  selected: boolean;
  writable: boolean;
  onOpen?: (parentId: string) => void;
}) {
  const appenderRef = useRef<HTMLDivElement>(null);
  const [trackCount, setTrackCount] = useState(1);

  useLayoutEffect(() => {
    if (block.layout !== "grid") return;
    const grid = appenderRef.current?.parentElement;
    if (!grid) return;
    // Read resolved tracks so guides follow auto/manual columns, units and resizing.
    const updateTracks = () => {
      const tracks = getComputedStyle(grid).gridTemplateColumns;
      setTrackCount(tracks === "none" ? 1 : Math.max(1, tracks.trim().split(/\s+/).length));
    };
    updateTracks();
    const observer = new ResizeObserver(updateTracks);
    observer.observe(grid);
    // A responsive breakpoint may change tracks while the editor keeps its width.
    window.addEventListener("resize", updateTracks);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateTracks);
    };
  }, [block.layout, block.gridMode, block.columns, block.minColumnWidth, block.minColumnWidthUnit, block.columnGap, block.gap, block.stackAt]);

  return <>
    {block.layout === "grid" && <div className="group-empty-grid-guides" aria-hidden="true">{Array.from({ length: trackCount }, (_, index) => <span key={index} />)}</div>}
    <div ref={appenderRef} className="group-empty-appender" data-selected={selected}>
      <button type="button" className="nested-add-block group-empty-add" aria-label="Add block" title="Add block" disabled={!writable || !onOpen} onClick={() => { if (writable) onOpen?.(block.id); }}>
        <StudioIcon name="add" size={24} />
      </button>
    </div>
  </>;
}
