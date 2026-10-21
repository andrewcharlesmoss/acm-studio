"use client";

import { useSyncExternalStore } from "react";
import type { UniversalStylePreset } from "@acm/styles";
import { UNIVERSAL_STYLE_PRESET } from "./canonical-style-guide";

let savedPreset = UNIVERSAL_STYLE_PRESET;
const listeners = new Set<() => void>();

/** Publish only validated saved source; preview drafts never become defaults. */
export function publishSharedStylePreset(preset: UniversalStylePreset) {
  savedPreset = preset;
  listeners.forEach(listener => listener());
}

export function useSharedStylePreset() {
  return useSyncExternalStore(
    listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => savedPreset,
    () => UNIVERSAL_STYLE_PRESET,
  );
}
