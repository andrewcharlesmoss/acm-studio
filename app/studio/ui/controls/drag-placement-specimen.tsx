"use client";

import { useState, type KeyboardEvent } from "react";
import { useGapReordering } from "../../use-gap-reordering";
import { movedLibraryIds, type LibraryMove } from "../../library-reordering";
import { DragPlacementIndicator } from "../../drag-placement-indicator";
import { LibraryDragHandle } from "../../library-drag-handle";
import { StudioIcon } from "../../studio-icons";

const items = [
  { id: "first", label: "First item", detail: "A compact item." },
  { id: "second", label: "Second item", detail: "A taller item with a longer description to test unequal boundaries." },
  { id: "third", label: "Third item", detail: "Cross either edge of its gap." },
  { id: "fourth", label: "Fourth item", detail: "Try moving here, then Undo." },
];
type History = { orders: string[][]; cursor: number };
export function applyExampleMove(history: History, move: LibraryMove): History {
  const next = movedLibraryIds(history.orders[history.cursor], move);
  return next ? { orders: [...history.orders.slice(0, history.cursor + 1), next], cursor: history.cursor + 1 } : history;
}

/** Memory-only consumer of the production placement controller and renderer. */
export function DragPlacementSpecimen() {
  const [history, setHistory] = useState<History>({ orders: [items.map(item => item.id)], cursor: 0 });
  const [layout, setLayout] = useState("vertical");
  const [readOnly, setReadOnly] = useState(false);
  const [message, setMessage] = useState("No moves yet.");
  const ids = history.orders[history.cursor];
  function move(command: LibraryMove) {
    const next = applyExampleMove(history, command);
    if (readOnly || next === history) return false;
    setHistory(next); setMessage(`Moved ${items.find(item => item.id === command.id)!.label.toLowerCase()} to position ${next.orders[next.cursor].indexOf(command.id) + 1}.`);
    return true;
  }
  const drag = useGapReordering({ ids, version: JSON.stringify([history, layout]), writable: !readOnly, axis: layout === "vertical" ? "y" : "x", accepts: command => Boolean(movedLibraryIds(ids, command)), onMove: move });
  function restore(offset: number) {
    const cursor = history.cursor + offset;
    if (readOnly || cursor < 0 || cursor >= history.orders.length) return;
    drag.cancel(); setHistory({ ...history, cursor }); setMessage(offset < 0 ? "Move undone." : "Move redone.");
  }
  function shortcut(event: KeyboardEvent) {
    if ((event.target as HTMLElement).closest("input, textarea, select, [contenteditable=true]")) return;
    const key = event.key.toLowerCase();
    if ((event.metaKey || event.ctrlKey) && (key === "z" || (event.ctrlKey && key === "y"))) {
      event.preventDefault(); event.stopPropagation(); restore(key === "y" || event.shiftKey ? 1 : -1);
    }
  }
  return <div className="ui-drag-specimen" role="group" aria-label="Drag-to-position controls" onKeyDown={shortcut}>
    <div className="ui-drag-tools">
      <label>Layout <select value={layout} onChange={event => setLayout(event.target.value)}><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option><option value="wrapped">Wrapped</option></select></label>
      <label><input type="checkbox" checked={readOnly} onChange={event => setReadOnly(event.target.checked)} />Read-only example</label>
      <button type="button" disabled={readOnly || history.cursor === 0} onClick={() => restore(-1)}><StudioIcon name="undo" size={18} />Undo</button>
      <button type="button" disabled={readOnly || history.cursor === history.orders.length - 1} onClick={() => restore(1)}><StudioIcon name="redo" size={18} />Redo</button>
    </div>
    <p>Drag a six-dot handle across both edges or the space between items. One centred line marks a genuine move. Returning to the original position shows no line. Escape cancels.</p>
    <div className="ui-drag-scroll">
      <ol className={`ui-drag-list is-${layout}`} aria-label="Drag-to-position example items" {...drag.listProps}>
        {ids.map(id => { const item = items.find(value => value.id === id)!; return <li key={id} {...drag.rowProps(id)}>
          <button type="button" aria-label={`Reorder ${item.label.toLowerCase()}`} disabled={readOnly} draggable={!readOnly} {...drag.handleProps(id)} onDragStart={event => drag.start(event, id)} onDragEnd={drag.cancel} onKeyDown={event => {
            const backwards = layout === "vertical" ? "ArrowUp" : "ArrowLeft";
            const forwards = layout === "vertical" ? "ArrowDown" : "ArrowRight";
            if (!event.altKey || ![backwards, forwards].includes(event.key)) return;
            event.preventDefault(); const index = ids.indexOf(id), target = index + (event.key === backwards ? -1 : 1);
            if (target >= 0 && target < ids.length) move({ id, targetId: ids[target], edge: target < index ? "before" : "after", baseline: ids });
          }}><LibraryDragHandle enabled={!readOnly} /></button>
          <div><strong>{item.label}</strong><p>{item.detail}</p></div>
        </li>; })}
        <DragPlacementIndicator as="li" line={drag.line} />
      </ol>
    </div>
    <p role="status">{message} History position {history.cursor} of {history.orders.length - 1}.</p>
    <p>Keyboard: Alt + Up/Down in Vertical; Alt + Left/Right in Horizontal or Wrapped. Command/Ctrl + Z undoes; Command + Shift + Z or Ctrl + Y redoes while this example has focus.</p>
  </div>;
}
