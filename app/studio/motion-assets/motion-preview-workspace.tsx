"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { motionPreset, motionProject, type MotionClip } from "./motion-asset";

export const wave = motionPreset("wave");
export const projectKey = (asset: MotionClip) => JSON.stringify(motionProject(asset));

export type MotionDraft = {
  asset: MotionClip;
  original: MotionClip;
  baseline: string;
  preset?: string;
};
type MotionMovExport = { message: string; cancel?: () => void } | { error: string };

export function makeDraft(asset: MotionClip, { preset, unsaved = false }: { preset?: string; unsaved?: boolean } = {}): MotionDraft {
  return { asset, original: asset, baseline: unsaved ? "" : projectKey(asset), preset };
}

export function focusedMotionField() {
  const field = document.activeElement;
  return field instanceof HTMLInputElement && field.closest(".motion-field") ? field : null;
}

export function hasPendingFieldEdit() {
  const field = focusedMotionField();
  return field && field.value !== field.dataset.committedValue;
}

function useWorkspaceState() {
  const [workspace, setWorkspace] = useState(() => ({
    draft: makeDraft(wave, { preset: wave.name }),
    parked: new Map<string, MotionDraft>(),
  }));
  const [autoplay, setAutoplay] = useState(true);
  const [movExport, setMovExport] = useState<MotionMovExport>();
  return useMemo(() => ({ workspace, setWorkspace, autoplay, setAutoplay, movExport, setMovExport }), [workspace, autoplay, movExport]);
}

const MotionPreviewWorkspace = createContext<ReturnType<typeof useWorkspaceState> | null>(null);

export function MotionPreviewWorkspaceProvider({ children }: { children: ReactNode }) {
  const state = useWorkspaceState();
  const { draft, parked } = state.workspace;
  const activeDirty = projectKey(draft.asset) !== draft.baseline;
  const parkedDirty = useMemo(() => [...parked.values()].some(item => projectKey(item.asset) !== item.baseline), [parked]);
  useEffect(() => {
    function protectDrafts(event: BeforeUnloadEvent) {
      if (!activeDirty && !parkedDirty && !hasPendingFieldEdit()) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", protectDrafts);
    return () => window.removeEventListener("beforeunload", protectDrafts);
  }, [activeDirty, parkedDirty]);
  return <MotionPreviewWorkspace.Provider value={state}>{children}</MotionPreviewWorkspace.Provider>;
}

export function useMotionPreviewWorkspace() {
  const state = useContext(MotionPreviewWorkspace);
  if (!state) throw new Error("Motion preview requires the Studio UI Library workspace.");
  return state;
}
