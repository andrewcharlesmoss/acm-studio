"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createStudioPreferenceRepository } from "./studio-preference-repository.mjs";
import { updateStudioNavigationVisibilityThroughOwner } from "./studio-preference-broker.mjs";
import {
  readStudioNavigationHiddenTools,
  studioNavigationVisibilityChangedEvent,
  studioNavigationVisibilityKey,
  validStudioNavigationHiddenTools,
} from "./studio-navigation-visibility-contract.mjs";

type NavigationVisibility = {
  hiddenTools: string[];
  isVisible: (id: string) => boolean;
  setVisible: (id: string, visible: boolean) => void;
  status: string;
};

const NavigationVisibilityContext = createContext<NavigationVisibility | null>(null);

export function StudioNavigationVisibilityProvider({ children }: { children: ReactNode }) {
  const [hiddenTools, setHiddenTools] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const queue = useRef<Promise<void>>(Promise.resolve());

  useLayoutEffect(() => {
    const refresh = () => {
      try {
        setHiddenTools(readStudioNavigationHiddenTools(window.localStorage));
        setStatus("");
      } catch {
        setStatus("This browser cannot read the saved navigation preference.");
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === studioNavigationVisibilityKey || event.key === null) refresh();
    };
    refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(studioNavigationVisibilityChangedEvent, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(studioNavigationVisibilityChangedEvent, refresh);
    };
  }, []);

  function setVisible(id: string, visible: boolean) {
    setHiddenTools(current => visible
      ? current.filter(item => item !== id)
      : current.includes(id) ? current : [...current, id]);
    setStatus("");
    queue.current = queue.current.then(async () => {
      try {
        const repository = createStudioPreferenceRepository({
          storage: window.localStorage,
          key: studioNavigationVisibilityKey,
          read: readStudioNavigationHiddenTools,
          validate: validStudioNavigationHiddenTools,
        });
        let result = await repository.update((latestValue: unknown) => {
          const latestHidden: string[] = Array.isArray(latestValue) ? latestValue as string[] : [];
          const merged = visible
            ? latestHidden.filter((item: string) => item !== id)
            : latestHidden.includes(id) ? latestHidden : [...latestHidden, id];
          return JSON.stringify(merged);
        });
        if (!result.saved && result.reason === "blocked") {
          result = await updateStudioNavigationVisibilityThroughOwner(id, visible);
        }
        if (!result.saved) setStatus("These navigation settings apply to this page but could not be saved.");
      } catch {
        setStatus("These navigation settings apply to this page but could not be saved.");
      }
    });
  }

  const value: NavigationVisibility = {
    hiddenTools,
    isVisible: id => !hiddenTools.includes(id),
    setVisible,
    status,
  };
  return <NavigationVisibilityContext.Provider value={value}>{children}</NavigationVisibilityContext.Provider>;
}

export function useStudioNavigationVisibility() {
  return useContext(NavigationVisibilityContext);
}
