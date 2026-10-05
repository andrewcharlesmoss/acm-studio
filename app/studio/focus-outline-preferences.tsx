"use client";

import { useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { installStudioFocusPolicy } from "./focus-outline-policy.mjs";
import { createFocusOutlineRepository } from "./focus-outline-repository.mjs";
import { FocusPreferenceContext, type FocusMode } from "./focus-outline-context";
import "./focus-outline.css";

export function StudioFocusOutlineProvider({ children }: { children: ReactNode }) {
  const [mode, updateMode] = useState<FocusMode>("keyboard");
  const [status, setStatus] = useState("");
  const policyRef = useRef<ReturnType<typeof installStudioFocusPolicy> | null>(null);
  const repositoryRef = useRef<ReturnType<typeof createFocusOutlineRepository> | null>(null);
  const generationRef = useRef(0);
  useLayoutEffect(() => {
    let active = true;
    const generationCounter = generationRef;
    const policy = installStudioFocusPolicy(document);
    policyRef.current = policy;
    try {
      const repository = createFocusOutlineRepository({ storage: window.localStorage });
      repositoryRef.current = repository;
      const initial = repository.read() as FocusMode;
      queueMicrotask(() => { if (active) updateMode(initial); });
      policy.setMode(initial);
    } catch { queueMicrotask(() => { if (active) setStatus("Applies to this page; this browser cannot save the preference."); }); }
    return () => {
      active = false;
      generationCounter.current++;
      policy.dispose();
      policyRef.current = null;
      repositoryRef.current = null;
    };
  }, []);
  function setMode(next: FocusMode) {
    updateMode(next);
    policyRef.current?.setMode(next);
    const generation = ++generationRef.current;
    setStatus("");
    const repository = repositoryRef.current;
    if (!repository) { setStatus("Applies to this page; this browser cannot save the preference."); return; }
    void repository.save(next).then(result => {
      if (generation !== generationRef.current) return;
      if (!result.saved) setStatus(result.reason === "blocked"
        ? "Applies to this page; another Studio tab prevents saving."
        : "Applies to this page; this browser cannot save the preference.");
    });
  }
  return <FocusPreferenceContext.Provider value={{ mode, setMode, status }}>{children}</FocusPreferenceContext.Provider>;
}

export function StudioFocusOutlineSetting() {
  const preference = useContext(FocusPreferenceContext);
  if (!preference) return null;
  return <div className="studio-focus-preference">
    <label className="studio-focus-setting">Focus Outline
      <select value={preference.mode} onChange={event => preference.setMode(event.target.value as FocusMode)}>
        <option value="on">On</option><option value="off">Off</option><option value="keyboard">Keyboard Only</option>
      </select>
    </label>
    {preference.status ? <span className="studio-focus-setting-status" role="status">{preference.status}</span> : null}
  </div>;
}
