"use client";
import { useEffect, useRef, useState } from "react";
import { copyTemplateData, emptyTemplateStore, type TemplateStore } from "./template-model";
import { loadTemplates, saveTemplates } from "./template-store";
import { studioWriteOwnership } from "./write-ownership";

/** The host owns the lock lifecycle; this hook only loads after each acquisition. */
export function useTemplates(generation: number, writable: boolean) {
  const [store, setStore] = useState<TemplateStore>(emptyTemplateStore);
  const current = useRef(store);
  const [ready, setReady] = useState(false);
  const [loadedGeneration, setLoadedGeneration] = useState<number | null>(null);
  const currentGeneration = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveLabel, setSaveLabel] = useState("Loading templates…");
  const history = useRef<TemplateStore[]>([]);
  const future = useRef<TemplateStore[]>([]);
  const [availability, setAvailability] = useState({ undo: false, redo: false });
  const sequence = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const next = loadTemplates(); current.current = next; currentGeneration.current = generation; setLoadedGeneration(generation); setStore(next); setReady(true); setError(null); setSaveLabel("Templates ready"); history.current = []; future.current = []; setAvailability({ undo: false, redo: false });
      } catch (reason) { setReady(false); setError(reason instanceof Error ? reason.message : "Templates could not be loaded."); setSaveLabel("Templates need attention"); }
    });
    return () => { cancelled = true; if (timer.current) clearTimeout(timer.current); };
  }, [generation]);

  function install(next: TemplateStore) {
    if (!ready || loadedGeneration !== generation || currentGeneration.current !== generation || !writable || !studioWriteOwnership.canWrite()) return false;
    const saveSequence = ++sequence.current;
    if (timer.current) clearTimeout(timer.current);
    try {
      saveTemplates(next);
      current.current = next; setStore(next); setError(null); setSaveLabel("Saving…");
      timer.current = setTimeout(() => { if (sequence.current === saveSequence) setSaveLabel("Saved locally"); }, 500);
      return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save templates locally."); setSaveLabel("Could not save locally"); return false; }
  }
  function commit(update: (store: TemplateStore) => TemplateStore) {
    const before = current.current;
    try {
      const next = update(copyTemplateData(before));
      if (!install(next)) return false;
      history.current = [...history.current.slice(-59), before]; future.current = [];
      setAvailability({ undo: true, redo: false });
      return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The template change could not be applied."); setSaveLabel("Could not save locally"); return false; }
  }
  function undo() {
    const next = history.current.at(-1); if (!next) return false;
    const before = current.current;
    if (!install(next)) return false;
    history.current.pop(); future.current.push(before); setAvailability({ undo: history.current.length > 0, redo: true }); return true;
  }
  function redo() {
    const next = future.current.at(-1); if (!next) return false;
    const before = current.current;
    if (!install(next)) return false;
    future.current.pop(); history.current.push(before); setAvailability({ undo: true, redo: future.current.length > 0 }); return true;
  }
  return { store, ready: ready && loadedGeneration === generation, error, saveLabel, commit, undo, redo, canUndo: writable && availability.undo, canRedo: writable && availability.redo, writable: writable && ready && loadedGeneration === generation };
}
