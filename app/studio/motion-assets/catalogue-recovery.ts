"use client";

import { useSyncExternalStore } from "react";
import { createStudioPreferenceRepository } from "../studio-preference-repository.mjs";
import { saveStudioPreferenceThroughOwner } from "../studio-preference-broker.mjs";
import { motionCatalogueKey, motionCatalogueChanged, readMotionCatalogue, validMotionCatalogue } from "./catalogue-preferences.mjs";

export type PresetPreferences = Record<string, { name?: string; hidden?: boolean; deletedAt?: string; favourite?: boolean }>;

export function readCatalogue(source = readMotionCatalogue(window.localStorage)) {
  if (!validMotionCatalogue(source)) throw new Error("Motion asset settings are invalid and have been preserved.");
  return { source, values: JSON.parse(source) as PresetPreferences };
}

export function subscribeToMotionCatalogue(refresh: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === motionCatalogueKey || event.key === null) refresh();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(motionCatalogueChanged, refresh);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(motionCatalogueChanged, refresh);
  };
}

export function useMotionCatalogueSource() {
  return useSyncExternalStore(subscribeToMotionCatalogue, () => {
    try { return readMotionCatalogue(window.localStorage); }
    catch { return ""; }
  }, () => "{}");
}

export async function changePreset(key: string, expected: PresetPreferences[string], next: PresetPreferences[string]) {
  const { source, values } = readCatalogue();
  const actual = values[key] ?? {};
  if (actual.name !== expected.name || actual.hidden !== expected.hidden || actual.deletedAt !== expected.deletedAt || actual.favourite !== expected.favourite) {
    throw new Error("This motion asset changed in another tab. Review the current asset before trying again.");
  }
  if (Object.keys(next).length) values[key] = next;
  else delete values[key];
  const after = JSON.stringify(values);
  const repository = createStudioPreferenceRepository({ storage: window.localStorage, key: motionCatalogueKey,
    read: readMotionCatalogue, validate: validMotionCatalogue });
  let result = await repository.update((current: string) => {
    if (current !== source) throw new Error("Motion assets changed in another tab. Please try again.");
    return after;
  });
  if (!result.saved && result.reason === "blocked") {
    result = await saveStudioPreferenceThroughOwner("motionCatalogue", JSON.stringify({ before: source, after }));
  }
  if (!result.saved) throw new Error("The motion catalogue could not be saved. Please try again.");
  window.dispatchEvent(new Event(motionCatalogueChanged));
}
