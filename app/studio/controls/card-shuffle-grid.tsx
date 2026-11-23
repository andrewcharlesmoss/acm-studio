"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { LibraryDragHandle } from "../library-drag-handle";
import { useDragPlacement } from "../use-drag-placement";
import { dropContainerScale } from "../drop-container-scale";
import type { LibraryMove } from "../library-reordering";
import "./card-shuffle-grid.css";

type Props = {
  ids: string[];
  className: string;
  label: string;
  name: (id: string) => string;
  renderCard: (id: string) => ReactNode;
  writable: boolean;
  onMove: (move: LibraryMove) => boolean;
};

type Point = { x: number; y: number };
type Preview = { source: string; destination: number; offsets: Point[] };

// Measure stationary slots. Moving card faces must never become new hit targets.
function nearestSlot(boxes: DOMRect[], x: number, y: number) {
  let nearest = 0;
  let rowDistance = Infinity;
  let columnDistance = Infinity;
  boxes.forEach((box, index) => {
    const dy = Math.max(box.top - y, y - box.bottom, 0);
    const dx = Math.max(box.left - x, x - box.right, 0);
    if (dy < rowDistance || (dy === rowDistance && dx < columnDistance)) {
      nearest = index;
      rowDistance = dy;
      columnDistance = dx;
    }
  });
  return nearest;
}

export function CardShuffleGrid({ ids, className, label, name, renderCard, writable, onMove }: Props) {
  const gridRef = useRef<HTMLElement | null>(null);
  const grip = useRef<Point | null>(null);
  const releasedFaces = useRef<{ face: Element; box: DOMRect; lifted: boolean }[]>([]);
  const settling = useRef<Animation[]>([]);
  function stopSettling() {
    for (const animation of settling.current) animation.cancel();
    settling.current = [];
  }
  useLayoutEffect(() => stopSettling, []);
  // The consumer can reorder the keyed cards on release. Continue from their
  // last visible positions after React lays out the committed order.
  useLayoutEffect(() => {
    const released = releasedFaces.current;
    releasedFaces.current = [];
    const grid = gridRef.current;
    if (!grid || !released.length) return;
    const scale = dropContainerScale(grid);
    for (const { face, box, lifted } of released) {
      const slot = face.parentElement;
      if (slot?.parentElement !== grid) continue;
      const end = face.getBoundingClientRect();
      const x = (box.left - end.left) / scale;
      const y = (box.top - end.top) / scale;
      if (Math.hypot(x, y) < 0.5) continue;
      const timing = { duration: 170, easing: "ease-out" };
      if (lifted) settling.current.push(slot.animate({ zIndex: ["2", "2"] }, timing));
      settling.current.push(face.animate([
        { transform: `translate(${x}px, ${y}px)` },
        { transform: "none" },
      ], timing));
    }
  });
  const [message, setMessage] = useState("");
  const enabled = writable && ids.length > 1;
  function move(id: string, destination: number) {
    const from = ids.indexOf(id);
    if (!enabled || from < 0 || destination === from || !ids[destination]) return false;
    const saved = onMove({ id, baseline: [...ids], targetId: ids[destination], edge: from < destination ? "after" : "before" });
    if (saved) setMessage(`${name(id)} moved to position ${destination + 1} of ${ids.length}.`);
    return saved;
  }
  const drag = useDragPlacement<string, Preview>({
    version: JSON.stringify(ids), writable: enabled, captureTouch: true, scrollViewport: true, reserveSpace: false,
    canStart: id => ids.includes(id),
    resolve(id, grid, x, y) {
      const bounds = grid.getBoundingClientRect();
      if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null;
      const slots = Array.from(grid.children) as HTMLElement[];
      if (slots.length !== ids.length || slots.some((slot, i) => slot.dataset.libraryEntryId !== ids[i])) return null;
      const boxes = slots.map(slot => slot.getBoundingClientRect());
      const scale = dropContainerScale(grid);
      const from = ids.indexOf(id);
      const destination = nearestSlot(boxes, x, y);
      const offsets = boxes.map((box, index) => {
        if (index === from && grip.current) {
          return { x: (x - box.left) / scale - grip.current.x, y: (y - box.top) / scale - grip.current.y };
        }
        let slot = index;
        if (index === from) slot = destination;
        else if (index > from && index <= destination) slot--;
        else if (index < from && index >= destination) slot++;
        return { x: (boxes[slot].left - box.left) / scale, y: (boxes[slot].top - box.top) / scale };
      });
      return { target: { source: id, destination, offsets }, line: null };
    },
    onActivate: stopSettling,
    onCancel: () => { grip.current = null; },
    commit(id, preview) {
      const grid = gridRef.current;
      if (grid && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        releasedFaces.current = Array.from(grid.querySelectorAll(":scope > .card-shuffle-slot > .card-shuffle-face"), face => ({
          face, box: face.getBoundingClientRect(), lifted: face.parentElement!.dataset.libraryEntryId === id,
        }));
      }
      return move(id, preview.destination);
    },
  });
  const preview = drag.placement;
  return <>
    <div className={`card-shuffle-grid ${className}`} role="group" aria-label={label} {...drag.listProps}
      ref={element => { gridRef.current = element; drag.listProps.ref(element); }}>
      {ids.map((id, index) => {
        const offset = preview?.offsets[index];
        const handle = drag.handleProps(id);
        return <div key={id} className="card-shuffle-slot" data-library-entry-id={id}
          data-lifted={preview?.source === id || undefined} data-destination={preview?.destination === index || undefined}>
          <div className="card-shuffle-face" style={offset ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined}>
            {renderCard(id)}
            <button className="card-shuffle-grip studio-site-drag-button" type="button"
              aria-label={`Reorder ${name(id)}`} aria-disabled={!enabled} draggable={enabled}
              title="Drag to reorder, or press Alt and an arrow key" {...handle}
              onPointerDown={event => {
                if (!event.isPrimary || event.button !== 0 || !enabled) return;
                const slot = event.currentTarget.closest<HTMLElement>(".card-shuffle-slot")!;
                const box = event.currentTarget.parentElement!.getBoundingClientRect();
                const scale = dropContainerScale(slot);
                grip.current = { x: (event.clientX - box.left) / scale, y: (event.clientY - box.top) / scale };
                handle.onPointerDown(event);
              }}
              onDragStart={event => drag.start(event, id)} onDragEnd={drag.cancel}
              onKeyDown={event => {
                if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
                const direction = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[event.key];
                if (direction) { event.preventDefault(); move(id, index + direction); }
              }}><LibraryDragHandle enabled={enabled} /></button>
          </div>
        </div>;
      })}
    </div>
    <span className="visually-hidden" role="status">{message}</span>
  </>;
}
