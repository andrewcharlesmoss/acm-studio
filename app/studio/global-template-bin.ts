import { copyTemplateData, templateId, templatePartReference, validateTemplateStore, visitTemplateNodes, type TemplateStore, type TemplatePart } from "./template-model";
import type { TemplateDependencyTarget } from "./template-dependencies";

export function moveGlobalTemplateToBin(store: TemplateStore, target: TemplateDependencyTarget, id = templateId(), deletedAt = new Date().toISOString()) {
  const set = store.sets.find(item => item.id === target.setId);
  const entry = set && [...set.templates, ...set.parts].find(item => item.id === target.entryId);
  if (!set || !entry) throw new Error("The template is no longer available.");
  for (const item of [...set.templates, ...set.parts]) visitTemplateNodes(item.nodes, node => {
    if (templatePartReference(node) === entry.id) throw new Error(`Remove or replace the reference in ${item.name} before moving this part to the Bin.`);
  });
  const defaultTemplateIds = { ...store.defaultTemplateIds };
  for (const kind of ["page", "post"] as const) if (defaultTemplateIds[kind] === entry.id) delete defaultTemplateIds[kind];
  return validateTemplateStore({ ...store, defaultTemplateIds,
    bin: [...store.bin, { id, kind: "template", deletedAt, setId: set.id, setName: set.name, entry: copyTemplateData(entry), setSnapshot: copyTemplateData(set) }],
    sets: store.sets.map(item => item.id !== set.id ? item : { ...item, templates: item.templates.filter(item => item.id !== entry.id), parts: item.parts.filter(item => item.id !== entry.id) }),
  });
}
export function restoreGlobalTemplate(store: TemplateStore, id: string) {
  const item = store.bin.find(item => item.id === id);
  if (!item || item.kind !== "template") throw new Error("This global template is no longer in the Bin.");
  const set = store.sets.find(set => set.id === item.setId);
  if (!set) throw new Error("The template’s recovery context is unavailable. Its Bin copy was kept.");
  if ([...set.templates, ...set.parts].some(entry => entry.id === item.entry.id)) throw new Error("An entry with this ID already exists. The Bin copy was kept.");
  const parts = copyTemplateData(set.parts);
  const restoredIds = new Set([item.entry.id]);
  const include = (nodes: typeof item.entry.nodes) => visitTemplateNodes(nodes, node => {
    const partId = templatePartReference(node);
    if (!partId || parts.some(part => part.id === partId)) return;
    const saved = store.bin.find(candidate => candidate.kind === "template" && candidate.setId === set.id && candidate.entry.id === partId);
    const part = saved?.kind === "template" ? saved.entry : item.setSnapshot.parts.find(part => part.id === partId);
    if (!part || part.kind === "page" || part.kind === "post") throw new Error("A required shared part is unavailable. The template remains in the Bin.");
    parts.push(copyTemplateData(part) as TemplatePart); restoredIds.add(partId); include(part.nodes);
  });
  if (item.entry.kind !== "page" && item.entry.kind !== "post") parts.push(copyTemplateData(item.entry) as TemplatePart);
  include(item.entry.nodes);
  return validateTemplateStore({ ...store, bin: store.bin.filter(candidate => candidate.kind !== "template" || candidate.setId !== set.id || !restoredIds.has(candidate.entry.id)),
    sets: store.sets.map(candidate => candidate.id !== set.id ? candidate : { ...candidate, parts,
      templates: item.entry.kind === "page" || item.entry.kind === "post" ? [...candidate.templates, copyTemplateData(item.entry)] : candidate.templates }),
  });
}
/** A removal is a preserved move, and Bin entries may leave only by restoration. */
export function assertRecoverableGlobalTransition(before: TemplateStore, after: TemplateStore) {
  for (const set of before.sets) {
    const next = after.sets.find(item => item.id === set.id);
    if (!next) throw new Error("Global backing contexts cannot be removed; their aliases remain recoverable.");
    for (const entry of [...set.templates, ...set.parts]) if (![...next.templates, ...next.parts].some(item => item.id === entry.id)) {
      const binned = after.bin.find(item => item.kind === "template" && item.setId === set.id && item.entry.id === entry.id);
      if (!binned || binned.kind !== "template" || JSON.stringify(binned.entry) !== JSON.stringify(entry) || ![...binned.setSnapshot.templates, ...binned.setSnapshot.parts].some(item => item.id === entry.id && JSON.stringify(item) === JSON.stringify(entry))) throw new Error("Move the complete original to the Bin instead of removing it.");
    }
  }
  for (const item of before.bin) {
    const retained = after.bin.find(candidate => candidate.id === item.id);
    if (retained && JSON.stringify(retained) !== JSON.stringify(item)) throw new Error("Existing global Bin records cannot be changed. Their recovery payload must be kept.");
    if (retained) continue;
    if (item.kind !== "template" || !after.sets.some(set => set.id === item.setId && [...set.templates, ...set.parts].some(entry => entry.id === item.entry.id && JSON.stringify(entry) === JSON.stringify(item.entry)))) throw new Error("Global Bin entries must remain recoverable or be restored. Permanent deletion is unavailable.");
  }
}
