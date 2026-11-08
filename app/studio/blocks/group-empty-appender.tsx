"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ContentBlock } from "../../content/model";
import { CanvasInserterButton } from "../controls/canvas-inserter-button";

type GroupBlock = Extract<ContentBlock, { type: "group" }>;

/** Empty layout affordances are editor UI; they never become saved children. */
export function GroupEmptyAppender({ block, selected, writable, onOpen }: {
  block: GroupBlock;
  selected: boolean;
  writable: boolean;
  onOpen?: (parentId: string, anchor?: HTMLElement) => void;
}) {
  return <><div className="group-empty-appender" data-selected={selected}>
    <CanvasInserterButton className="canvas-appender-button group-empty-add" iconSize={20} disabled={!writable || !onOpen} onClick={event => { if (writable) onOpen?.(block.id, event.currentTarget); }} />
  </div></>;
}

/** Tracks are authoring guides only and never become saved Grid children. */
export function GroupGridGuides({ block }: { block: Pick<GroupBlock, "layout" | "gridMode" | "fillAvailableSpace" | "columns" | "minColumnWidth" | "minColumnWidthUnit" | "columnGap" | "gap" | "stackAt"> }) {
  const guideRef = useRef<HTMLDivElement>(null);
  const [tracks, setTracks] = useState("1fr");

  useLayoutEffect(() => {
    if (block.layout !== "grid") return;
    const grid = guideRef.current?.parentElement;
    if (!grid) return;
    // Read resolved tracks so guides follow auto/manual columns, units and resizing.
    const updateTracks = () => {
      const resolvedTracks = getComputedStyle(grid).gridTemplateColumns;
      // Collapsed auto-fit tracks have no gap and must not create guide cells.
      const visibleTracks = resolvedTracks.split(/\s+/).filter(track => parseFloat(track) > 0);
      setTracks(visibleTracks.length ? visibleTracks.join(" ") : "1fr");
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
  }, [block.layout, block.gridMode, block.fillAvailableSpace, block.columns, block.minColumnWidth, block.minColumnWidthUnit, block.columnGap, block.gap, block.stackAt]);

  return <div ref={guideRef} className="group-empty-grid-guides" style={{ gridTemplateColumns: tracks }} aria-hidden="true">{Array.from({ length: tracks.trim().split(/\s+/).length }, (_, index) => <span key={index} />)}</div>;
}
