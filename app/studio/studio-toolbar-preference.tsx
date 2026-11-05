"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createStudioPreferenceRepository } from "./studio-preference-repository.mjs";
import { saveStudioPreferenceThroughOwner } from "./studio-preference-broker.mjs";

const key = "acm-studio-toolbar-spacing-v1";
const changed = "acm-studio-toolbar-spacing-saved";
const outlineKey = "acm-studio-block-selection-outline-v1";
const outlineChanged = "acm-studio-block-selection-outline-saved";
const outlineModes = ["toolbar-hover", "always", "off"] as const;
export type BlockSelectionOutlineMode = typeof outlineModes[number];
const valid = (value: string) => value === "on" || value === "off";
const validOutline = (value: string): value is BlockSelectionOutlineMode => outlineModes.includes(value as BlockSelectionOutlineMode);
const read = (storage: Storage) => storage.getItem(key) === "on" ? "on" : "off";
const readOutline = (storage: Storage): BlockSelectionOutlineMode => {
  const value = storage.getItem(outlineKey);
  return value && validOutline(value) ? value : "always";
};
type ToolbarPreference = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  status: string;
  outlineMode: BlockSelectionOutlineMode;
  setOutlineMode: (value: BlockSelectionOutlineMode) => void;
  outlineStatus: string;
};
export const ToolbarPreferenceContext = createContext<ToolbarPreference | null>(null);

export function StudioToolbarPreferenceProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("");
  const [outlineMode, setOutlineModeState] = useState<BlockSelectionOutlineMode>("always");
  const [outlineStatus, setOutlineStatus] = useState("");
  const generation = useRef(0);
  const outlineGeneration = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const outlineQueue = useRef<Promise<void>>(Promise.resolve());
  useLayoutEffect(() => {
    const refreshToolbarSpacing = () => {
      try { setEnabled(read(window.localStorage) === "on"); }
      catch { setStatus("This browser cannot read the saved preference."); }
    };
    const refreshBlockSelectionOutline = () => {
      try { setOutlineModeState(readOutline(window.localStorage)); }
      catch { setOutlineStatus("This browser cannot read the saved preference."); }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) refreshToolbarSpacing();
      if (event.key === outlineKey || event.key === null) refreshBlockSelectionOutline();
    };
    refreshToolbarSpacing();
    refreshBlockSelectionOutline();
    window.addEventListener("storage", onStorage);
    window.addEventListener(changed, refreshToolbarSpacing);
    window.addEventListener(outlineChanged, refreshBlockSelectionOutline);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(changed, refreshToolbarSpacing);
      window.removeEventListener(outlineChanged, refreshBlockSelectionOutline);
    };
  }, []);
  useLayoutEffect(() => {
    document.documentElement.dataset.studioToolbarSpacing = enabled ? "on" : "off";
    return () => { delete document.documentElement.dataset.studioToolbarSpacing; };
  }, [enabled]);
  useLayoutEffect(() => {
    document.documentElement.dataset.studioBlockSelectionOutline = outlineMode;
    return () => { delete document.documentElement.dataset.studioBlockSelectionOutline; };
  }, [outlineMode]);
  function change(value: boolean) {
    setEnabled(value);
    setStatus("");
    const current = ++generation.current;
    queue.current = queue.current.then(async () => {
      if (current !== generation.current) return;
      try {
        const repository = createStudioPreferenceRepository({ storage: window.localStorage, key, read, validate: valid });
        const mode = value ? "on" : "off";
        let result = await repository.save(mode);
        if (!result.saved && result.reason === "blocked") result = await saveStudioPreferenceThroughOwner("toolbarSpacing", mode);
        if (current !== generation.current) return;
        if (result.saved) window.dispatchEvent(new Event(changed));
        else setStatus("This preference applies to this page but could not be saved.");
      } catch { if (current === generation.current) setStatus("This preference applies to this page but could not be saved."); }
    });
  }
  function changeOutlineMode(value: BlockSelectionOutlineMode) {
    if (!validOutline(value)) return;
    setOutlineModeState(value);
    setOutlineStatus("");
    const current = ++outlineGeneration.current;
    outlineQueue.current = outlineQueue.current.then(async () => {
      if (current !== outlineGeneration.current) return;
      try {
        const repository = createStudioPreferenceRepository({ storage: window.localStorage, key: outlineKey, read: readOutline, validate: validOutline });
        let result = await repository.save(value);
        if (!result.saved && result.reason === "blocked") result = await saveStudioPreferenceThroughOwner("blockSelectionOutline", value);
        if (current !== outlineGeneration.current) return;
        if (result.saved) window.dispatchEvent(new Event(outlineChanged));
        else setOutlineStatus("This preference applies to this page but could not be saved.");
      } catch { if (current === outlineGeneration.current) setOutlineStatus("This preference applies to this page but could not be saved."); }
    });
  }
  return <ToolbarPreferenceContext.Provider value={{ enabled, setEnabled: change, status, outlineMode, setOutlineMode: changeOutlineMode, outlineStatus }}>{children}</ToolbarPreferenceContext.Provider>;
}

export function useStudioToolbarPreference() { return useContext(ToolbarPreferenceContext); }
