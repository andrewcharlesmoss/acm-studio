import { createStudioPreferenceRepository } from "./studio-preference-repository.mjs";

export const focusOutlinePreferenceKey = "acm-studio-focus-outline-v1";
export const focusOutlineModes = ["on", "off", "keyboard"];
export function readFocusOutlinePreference(storage) {
  const value = storage.getItem(focusOutlinePreferenceKey);
  return focusOutlineModes.includes(value) ? value : "keyboard";
}

export function createFocusOutlineRepository(options) {
  return createStudioPreferenceRepository({ ...options, key: focusOutlinePreferenceKey, read: readFocusOutlinePreference, validate: value => focusOutlineModes.includes(value) });
}
