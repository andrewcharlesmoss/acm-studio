import type { StudioDocumentKind, StudioWorkspace } from "./editor-model";
import { templateLibraryEntries } from "./template-library";
import type { TemplateStore } from "./template-model";

export type LibraryMove = { id: string; targetId: string; edge: "before" | "after"; baseline: string[] };
/** Pages use their saved manual order; ties retain their workspace order. */
export function orderedLibraryDocuments<T extends { id: string; kind: StudioDocumentKind; pageOrder?: number }>(documents: readonly T[], kind: StudioDocumentKind): T[] {
  const entries = documents.filter(item => item.kind === kind);
  if (kind !== "page") return entries;
  return entries.map((document, index) => ({ document, index })).sort((left, right) =>
    (left.document.pageOrder ?? 0) - (right.document.pageOrder ?? 0) || left.index - right.index,
  ).map(item => item.document);
}
export function movedLibraryIds(current: string[], move: LibraryMove): string[] | null {
  if (JSON.stringify(current) !== JSON.stringify(move.baseline) || move.id === move.targetId || !current.includes(move.id) || !current.includes(move.targetId)) return null;
  const result = current.filter(id => id !== move.id);
  result.splice(result.indexOf(move.targetId) + (move.edge === "after" ? 1 : 0), 0, move.id);
  return JSON.stringify(result) === JSON.stringify(current) ? null : result;
}
/** Apply a complete category order while preserving the workspace's interleaved slots. */
export function orderLibraryDocuments(workspace: StudioWorkspace, kind: StudioDocumentKind, orderedIds: string[]): StudioWorkspace {
  const entries = workspace.documents.filter(item => item.kind === kind);
  const currentIds = entries.map(item => item.id);
  if (orderedIds.length !== currentIds.length || new Set(orderedIds).size !== currentIds.length || orderedIds.some(id => !currentIds.includes(id))) return workspace;
  const byId = new Map(entries.map(item => [item.id, item]));
  let index = 0;
  return { ...workspace, documents: workspace.documents.map(item => {
    if (item.kind !== kind) return item;
    const reordered = byId.get(orderedIds[index])!;
    const order = index++;
    return kind === "page" ? { ...reordered, pageOrder: order } : reordered;
  }) };
}
/** Move only occupied slots of this category; no editorial fields are changed. */
export function reorderLibraryDocuments(workspace: StudioWorkspace, kind: StudioDocumentKind, move: LibraryMove): StudioWorkspace {
  const entries = orderedLibraryDocuments(workspace.documents, kind);
  const ids = movedLibraryIds(entries.map(item => item.id), move);
  if (!ids) return workspace;
  return orderLibraryDocuments(workspace, kind, ids);
}
/** Presentation order is independent of each entry's retained owner context. */
export function reorderLibraryTemplates(store: TemplateStore, move: LibraryMove): TemplateStore {
  const entries = templateLibraryEntries(store);
  const ids = movedLibraryIds(entries.map(item => `${item.set.id}/${item.entry.id}`), move);
  if (!ids) return store;
  const existing = [...(store.libraryOrder ?? [])];
  for (const { set, entry } of entries) if (!existing.some(item => item.id === `${set.id}/${entry.id}`)) existing.push({ id: `${set.id}/${entry.id}`, setId: set.id, entryId: entry.id });
  const byId = new Map(existing.map(item => [item.id, item]));
  const active = new Set(ids);
  let index = 0;
  return { ...store, libraryOrder: existing.map(item => active.has(item.id) ? byId.get(ids[index++])! : item) };
}
