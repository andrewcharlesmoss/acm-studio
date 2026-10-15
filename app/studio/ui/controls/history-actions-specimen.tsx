"use client";

import { useState } from "react";
import { HistoryActions } from "../../controls/history-actions";
import { StudioButton } from "../../controls/button";
import { ToggleSetting } from "../../controls/toggle-setting";
import { isNativeEditingTarget, workspaceHistoryShortcut } from "../../workspace-shortcuts.mjs";

/** Temporary history adapter; all three presentations use the production controls. */
export function HistoryActionsSpecimen() {
  const [history, setHistory] = useState({ values: [0], index: 0 });
  const [readOnly, setReadOnly] = useState(false);
  const value = history.values[history.index];
  const canUndo = history.index > 0;
  const canRedo = history.index < history.values.length - 1;
  function restore(direction: number) {
    if (readOnly) return;
    setHistory(current => ({ ...current, index: Math.max(0, Math.min(current.values.length - 1, current.index + direction)) }));
  }
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Delegates shortcuts from focusable specimen controls.
  return <div className="ui-history-example" role="group" aria-label="History actions example" onKeyDown={event => {
    if (isNativeEditingTarget(event.target)) return;
    const action = workspaceHistoryShortcut(event);
    if (!action) return;
    event.preventDefault();
    restore(action === "undo" ? -1 : 1);
  }}>
    <div className="ui-history-example-tools">
      <StudioButton disabled={readOnly} onClick={() => setHistory(current => ({ values: [...current.values.slice(0, current.index + 1), current.values[current.index] + 1], index: current.index + 1 }))}>Make change</StudioButton>
      <ToggleSetting label="Read-only example" checked={readOnly} onChange={setReadOnly} />
    </div>
    {(["compact", "labelled", "ribbon"] as const).map(presentation => <section className="ui-history-example-variant" key={presentation} aria-label={`${presentation} history actions`}>
      <h3>{presentation === "compact" ? "Compact" : presentation === "labelled" ? "Labelled" : "Ribbon"}</h3>
      <div className="ui-history-example-actions"><HistoryActions presentation={presentation} canUndo={canUndo} canRedo={canRedo} disabled={readOnly} onUndo={() => restore(-1)} onRedo={() => restore(1)} /></div>
    </section>)}
    <p role="status">Example value: {value}. Undo: {history.index}. Redo: {history.values.length - history.index - 1}.</p>
    <p>All three variants control the same temporary history. Make a change, then try Undo and Redo or their standard keyboard shortcuts. Reset example clears this history.</p>
  </div>;
}
