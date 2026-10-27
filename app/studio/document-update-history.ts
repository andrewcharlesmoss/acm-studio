import type { StudioDocument } from "./editor-model";

/** Route history only after the owning document accepted an effective change. */
export function updateDocumentWithHistory(
  writable: boolean,
  commit: (update: (document: StudioDocument) => StudioDocument) => boolean,
  record: () => void,
  update: (document: StudioDocument) => StudioDocument,
): boolean {
  if (!writable) return false;
  let changed = false;
  const accepted = commit(current => {
    const next = update(current);
    changed = JSON.stringify(next) !== JSON.stringify(current);
    return next;
  });
  if (accepted && changed) record();
  return accepted;
}
