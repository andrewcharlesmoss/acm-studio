"use client";

import { useSyncExternalStore } from "react";
import type { InterfaceStylePreset } from "@acm/styles";
import { INTERFACE_STYLE_PRESET } from "./canonical-style-guide";

let savedPreset = INTERFACE_STYLE_PRESET;
const listeners = new Set<() => void>();

/** Publish only validated saved source; interface drafts stay inside their editor. */
export function publishSharedInterfaceStylePreset(preset: InterfaceStylePreset) {
  savedPreset = preset;
  listeners.forEach(listener => listener());
}

export function useSharedInterfaceStylePreset() {
  return useSyncExternalStore(
    listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => savedPreset,
    () => INTERFACE_STYLE_PRESET,
  );
}
