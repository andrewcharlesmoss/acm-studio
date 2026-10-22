"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type Dispatch } from "react";
import { type IdentityAction, type IdentityValues } from "./identity-preview-state";
import { readIdentityStartupCache } from "./identity-startup-cache";
import { createIdentityRepository, createIdentityStore, IdentityStorageError } from "./identity-repository";

export function identityPersistenceError(error: unknown) {
  const reason = error instanceof IdentityStorageError ? error.reason : "storage";
  if (reason === "conflict") return "Identity not saved: another tab changed it. Your edits remain here. Copy any text you need before reloading to load the saved identity.";
  if (reason === "corrupt") return "Saved identity could not be read safely. It has not been overwritten. Your changes apply only here; browser storage needs recovery.";
  if (reason === "blocked") return "Identity not saved: another Studio tab prevents saving. Your edits remain here. Close the other tab, copy any text you need, then reload.";
  return "Identity not saved: browser storage is unavailable or full. Your edits remain here. Check browser storage, copy any text you need, then reload.";
}
const subscribeStartupCache = () => () => {};
const serverStartupCache = () => null;
export function useIdentityPersistence(values: IdentityValues, dispatch: Dispatch<IdentityAction>) {
  const startupSnapshot = useMemo(() => {
    try { return typeof window === "undefined" ? null : readIdentityStartupCache(window.localStorage); } catch { return null; }
  }, []);
  const startup = useSyncExternalStore(subscribeStartupCache, () => startupSnapshot, serverStartupCache);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Loading saved identity…");
  const repository = useRef<ReturnType<typeof createIdentityRepository> | null>(null);
  const installed = useRef<IdentityValues | null>(null);
  const generation = useRef(0);
  const blocked = useRef(false);
  const unsaved = useRef(false);
  const initialValues = useRef(values);
  const startupUnavailable = useRef(false);
  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => { if (unsaved.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener?.("beforeunload", preventLoss);
    return () => window.removeEventListener?.("beforeunload", preventLoss);
  }, []);
  useEffect(() => {
    let active = true;
    const generationCounter = generation;
    ++generationCounter.current;
    try {
      let cache: Storage | undefined;
      try { cache = window.localStorage; } catch { /* Canonical IndexedDB saving remains available. */ }
      startupUnavailable.current = !cache;
      const current = createIdentityRepository({ store: createIdentityStore(window.indexedDB), cache });
      repository.current = current;
      void current.load().then(snapshot => {
        if (!active) return;
        installed.current = snapshot;
        dispatch({ type: "hydrate", values: snapshot });
        setStatus(startupUnavailable.current || current.cacheUnavailable() ? "Identity saved in this browser. Startup cache unavailable." : "Identity saved in this browser.");
        setReady(true);
      }).catch(error => {
        if (!active) return;
        blocked.current = true;
        installed.current = initialValues.current;
        setStatus(identityPersistenceError(error));
        setReady(true);
      });
    } catch (error) {
      blocked.current = true;
      installed.current = initialValues.current;
      queueMicrotask(() => { if (active) { setStatus(identityPersistenceError(error)); setReady(true); } });
    }
    return () => { active = false; generationCounter.current++; repository.current = null; };
  }, [dispatch]);
  useEffect(() => {
    if (!ready || installed.current === values) return;
    unsaved.current = true;
    installed.current = values;
    if (blocked.current || !repository.current) return;
    const currentGeneration = ++generation.current;
    queueMicrotask(() => { if (generation.current === currentGeneration) setStatus("Saving identity…"); });
    void repository.current.save(values).then(() => {
      if (generation.current === currentGeneration) { unsaved.current = false; setStatus(startupUnavailable.current || repository.current?.cacheUnavailable() ? "Identity saved in this browser. Startup cache unavailable." : "Identity saved in this browser."); }
    }).catch(error => {
      blocked.current = true;
      if (generation.current === currentGeneration) setStatus(identityPersistenceError(error));
    });
  }, [ready, values]);
  return { ready, status, startup: ready ? null : startup?.values ?? null };
}
