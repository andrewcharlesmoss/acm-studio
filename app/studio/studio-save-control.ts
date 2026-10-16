export type StudioSaveControlState = "draft" | "saving" | "saved" | "unavailable";

export function studioSaveControlState(saveLabel: string): StudioSaveControlState {
  const label = saveLabel.trim().toLowerCase();
  if (label.startsWith("saving")) return "saving";
  if (label.startsWith("saved locally") || label.startsWith("published locally")
    || label.startsWith("draft saved locally") || label.startsWith("post scheduled locally") || label.startsWith("page scheduled locally")
    || label.startsWith("synced with another ")) return "saved";
  if (/\b(preparing|waiting|connecting|reconnecting|conflict|conflicting|connection lost|review required|read-only|read only|unavailable)\b/.test(label)) return "unavailable";
  return "draft";
}
