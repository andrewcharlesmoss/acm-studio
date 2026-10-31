"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createStudioPreferenceRepository } from "./studio-preference-repository.mjs";
import { saveStudioPreferenceThroughOwner } from "./studio-preference-broker.mjs";

const key = "acm-studio-toolbar-spacing-v1";
const changed = "acm-studio-toolbar-spacing-saved";
const valid = (value: string) => value === "on" || value === "off";
const read = (storage: Storage) => storage.getItem(key) === "on" ? "on" : "off";
type ToolbarPreference = { enabled: boolean; setEnabled: (value: boolean) => void; status: string };
export const ToolbarPreferenceContext = createContext<ToolbarPreference | null>(null);

export function StudioToolbarPreferenceProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("");
  const generation = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  useLayoutEffect(() => {
    const refresh = () => { try { setEnabled(read(window.localStorage) === "on"); } catch { setStatus("This browser cannot read the saved preference."); } };
    const onStorage = (event: StorageEvent) => { if (event.key === key || event.key === null) refresh(); };
    refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(changed, refresh);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(changed, refresh); };
  }, []);
  useLayoutEffect(() => {
    document.documentElement.dataset.studioToolbarSpacing = enabled ? "on" : "off";
    return () => { delete document.documentElement.dataset.studioToolbarSpacing; };
  }, [enabled]);
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
  return <ToolbarPreferenceContext.Provider value={{ enabled, setEnabled: change, status }}>{children}</ToolbarPreferenceContext.Provider>;
}

export function useStudioToolbarPreference() { return useContext(ToolbarPreferenceContext); }
