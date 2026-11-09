"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ContentBlock } from "../../content/model";
import { CanvasInserterButton } from "../controls/canvas-inserter-button";
import { gridTrackTemplateCount } from "./grid-track-geometry";

type GroupBlock = Extract<ContentBlock, { type: "group" }>;

/** Empty layout affordances are editor UI; they never become saved children. */
export function GroupEmptyAppender({ block, selected, writable, showAppender = true, onOpen }: {
  block: GroupBlock;
  selected: boolean;
  writable: boolean;
  showAppender?: boolean;
  onOpen?: (parentId: string, anchor?: HTMLElement) => void;
}) {
  return <>
    {block.layout === "grid" ? <GroupGridGuides block={block} /> : null}
    {showAppender ? <div className="group-empty-appender" data-selected={selected}>
      <CanvasInserterButton className="canvas-appender-button group-empty-add" iconSize={20} disabled={!writable || !onOpen} onClick={event => { if (writable) onOpen?.(block.id, event.currentTarget); }} />
    </div> : null}
  </>;
}

/** Tracks are authoring guides only and never become saved Grid children. */
export function GroupGridGuides({ block }: { block: Pick<GroupBlock, "layout" | "gridMode" | "fillAvailableSpace" | "columns" | "minColumnWidth" | "minColumnWidthUnit" | "columnGap" | "gap" | "stackAt"> }) {
  const guidesRef = useRef<HTMLDivElement>(null);
  const [tracks, setTracks] = useState({ columns: "1fr", rows: "minmax(0, 1fr)", columnCount: 1, rowCount: 1 });

  useLayoutEffect(() => {
    if (block.layout !== "grid") return;
    const grid = guidesRef.current?.parentElement;
    if (!grid) return;
    // Read resolved tracks so guides follow auto/manual columns, units and resizing.
    const updateTracks = () => {
      const computed = getComputedStyle(grid);
      const columns = computed.gridTemplateColumns;
      const rows = computed.gridTemplateRows;
      const columnCount = columns === "none" ? 1 : gridTrackTemplateCount(columns);
      const rowCount = rows === "none" ? 1 : gridTrackTemplateCount(rows);
      setTracks({ columns: columns === "none" ? "1fr" : columns, rows: rows === "none" ? "minmax(0, 1fr)" : rows, columnCount, rowCount });
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

  if (block.layout !== "grid") return null;
  return <div ref={guidesRef} className="group-empty-grid-guides" aria-hidden="true" style={{ gridTemplateColumns: tracks.columns, gridTemplateRows: tracks.rows }}>{Array.from({ length: tracks.columnCount * tracks.rowCount }, (_, index) => <span key={index} />)}</div>;
}
