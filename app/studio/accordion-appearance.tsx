"use client";

import { useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AccordionAppearanceContext, DEFAULT_ACCORDION_HOVER } from "./accordion-appearance-context";
import { createStudioPreferenceRepository } from "./studio-preference-repository.mjs";
import { PaletteColourSetting } from "./controls/palette-colour-setting";
import { StudioButton } from "./controls/button";

const preferenceKey = "acm-studio-accordion-hover-v1";
const validColour = (value: unknown): value is string => typeof value === "string" && /^#[\da-f]{6}$/i.test(value);

function readPreference(storage: Storage) {
  const value = storage.getItem(preferenceKey);
  return validColour(value) ? value.toUpperCase() : DEFAULT_ACCORDION_HOVER;
}

export function StudioAccordionAppearanceProvider({ children }: { children: ReactNode }) {
  const [colour, updateColour] = useState(DEFAULT_ACCORDION_HOVER);
  const [status, setStatus] = useState("");
  const repositoryRef = useRef<ReturnType<typeof createStudioPreferenceRepository> | null>(null);
  const generationRef = useRef(0);
  const pendingRef = useRef(0);
  useLayoutEffect(() => {
    let active = true;
    const generationCounter = generationRef;
    const root = document.documentElement;
    const previous = root.style.getPropertyValue("--studio-control-hover-background");
    const apply = (value: string) => root.style.setProperty("--studio-control-hover-background", value);
    try {
      const storage = window.localStorage;
      const repository = createStudioPreferenceRepository({ storage, key: preferenceKey, read: readPreference, validate: validColour });
      repositoryRef.current = repository;
      const initial = repository.read();
      apply(initial);
      queueMicrotask(() => { if (active) updateColour(initial); });
    } catch {
      apply(DEFAULT_ACCORDION_HOVER);
      queueMicrotask(() => { if (active) setStatus("Applies to this page; this browser cannot save the preference."); });
    }
    function refresh(event: StorageEvent) {
      if ((event.key !== preferenceKey && event.key !== null) || pendingRef.current > 0) return;
      try {
        const next = readPreference(window.localStorage);
        generationRef.current++;
        apply(next);
        updateColour(next);
        setStatus("");
      } catch { setStatus("This browser cannot load the saved preference."); }
    }
    window.addEventListener("storage", refresh);
    return () => {
      active = false;
      generationCounter.current++;
      repositoryRef.current = null;
      window.removeEventListener("storage", refresh);
      if (previous) root.style.setProperty("--studio-control-hover-background", previous);
      else root.style.removeProperty("--studio-control-hover-background");
    };
  }, []);

  function setColour(next: string) {
    if (!validColour(next)) return;
    next = next.toUpperCase();
    updateColour(next);
    document.documentElement.style.setProperty("--studio-control-hover-background", next);
    const generation = ++generationRef.current;
    setStatus("");
    const repository = repositoryRef.current;
    if (!repository) { setStatus("Applies to this page; this browser cannot save the preference."); return; }
    pendingRef.current++;
    void repository.save(next).then(result => {
      pendingRef.current--;
      if (generation !== generationRef.current) return;
      if (!result.saved) setStatus(result.reason === "blocked"
        ? "Applies to this page; another Studio tab prevents saving."
        : "Applies to this page; this browser cannot save the preference.");
      else {
        try {
          const saved = repository.read();
          updateColour(saved);
          document.documentElement.style.setProperty("--studio-control-hover-background", saved);
          setStatus("Saved for this browser. Applies across Studio.");
        } catch { setStatus("Saved, but this browser cannot confirm the preference. Reload to check it."); }
      }
    });
  }
  return <AccordionAppearanceContext.Provider value={{ colour, setColour, status }}>{children}</AccordionAppearanceContext.Provider>;
}

export function StudioAccordionHoverSetting() {
  const preference = useContext(AccordionAppearanceContext);
  if (!preference) return null;
  return <div className="ui-control-live">
    <PaletteColourSetting row label="Accordion Hover Colour" value={preference.colour} onChange={value => preference.setColour(value ?? DEFAULT_ACCORDION_HOVER)} />
    <StudioButton type="button" variant="text" onClick={() => preference.setColour(DEFAULT_ACCORDION_HOVER)}>Reset Hover Colour</StudioButton>
    <p>This browser preference controls every inspector accordion heading across Studio. Default: {DEFAULT_ACCORDION_HOVER}.</p>
    {preference.status ? <p role="status">{preference.status}</p> : null}
  </div>;
}
