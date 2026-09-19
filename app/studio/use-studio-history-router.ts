"use client";
import { useEffect, useRef, useState } from "react";

type Owner = "document" | "template";
type HistoryActions = { undo: () => boolean | void; redo: () => boolean | void };
/** Orders two independently persisted domains without mixing their records. */
export function useStudioHistoryRouter(document: HistoryActions, template: HistoryActions, generation: number) {
  const past = useRef<Owner[]>([]); const future = useRef<Owner[]>([]);
  const [available, setAvailable] = useState({ undo: false, redo: false });
  useEffect(() => { let cancelled = false; queueMicrotask(() => { if (!cancelled) { past.current = []; future.current = []; setAvailable({ undo: false, redo: false }); } }); return () => { cancelled = true; }; }, [generation]);
  function record(owner: Owner) { past.current = [...past.current.slice(-59), owner]; future.current = []; setAvailable({ undo: true, redo: false }); }
  function undo() {
    const owner = past.current.at(-1); if (!owner) return;
    if ((owner === "document" ? document : template).undo() === false) return;
    past.current.pop(); future.current.push(owner); setAvailable({ undo: past.current.length > 0, redo: true });
  }
  function redo() {
    const owner = future.current.at(-1); if (!owner) return;
    if ((owner === "document" ? document : template).redo() === false) return;
    future.current.pop(); past.current.push(owner); setAvailable({ undo: true, redo: future.current.length > 0 });
  }
  return { record, undo, redo, canUndo: available.undo, canRedo: available.redo };
}
