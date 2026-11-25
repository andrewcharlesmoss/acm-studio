export const builtInSoundPreferenceKey = "acm-studio-built-in-sound-v1";
export const builtInSoundPreferenceChanged = "acm-studio-built-in-sound-saved";
export const validBuiltInSoundPreference = mode => mode === "shown" || mode === "hidden";

export function readBuiltInSoundPreference(storage) {
  return storage.getItem(builtInSoundPreferenceKey) === "hidden" ? "hidden" : "shown";
}
