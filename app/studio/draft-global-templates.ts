import { effectiveGlobalTemplates, type GlobalTemplateBinding, type GlobalTemplateLibrary } from "./global-template-contract";
import { copyTemplateData, validateTemplateStore, type TemplateAssignment, type TemplateSnapshot, type TemplateStore } from "./template-model";

/** An explicit recovery choice may replace an unmatched assignment, never its design. */
export function recoverDraftTemplateAssignment(source: TemplateStore, documentId: string, assignment: TemplateAssignment | undefined, library: GlobalTemplateLibrary): TemplateStore {
  const sets = copyTemplateData(source.sets);
  if (assignment) {
    if (assignment.documentId !== documentId) throw new Error("The recovery assignment belongs to a different document.");
    const original = library.templates.sets.find(set => set.id === assignment.setId);
    const template = original?.templates.find(item => item.id === assignment.templateId && item.kind === assignment.kind);
    if (!original || !template) throw new Error("Choose an available shared template of the same document kind.");
    const retained = sets.find(set => set.id === original.id);
    if (!retained) sets.push(copyTemplateData(original));
    else {
      const existing = retained.templates.find(item => item.id === template.id);
      if (existing && existing.kind !== template.kind) throw new Error("The recovery template identity conflicts with the shared original. Export a Backup first.");
      for (const item of original.templates) if (!retained.templates.some(entry => entry.id === item.id)) retained.templates.push(copyTemplateData(item));
      for (const item of original.parts) if (!retained.parts.some(entry => entry.id === item.id)) retained.parts.push(copyTemplateData(item));
    }
  }
  return validateTemplateStore({ ...source, sets, assignments: [...source.assignments.filter(item => item.documentId !== documentId), ...(assignment ? [assignment] : [])] });
}

/** Shared IDs and retained fixture aliases establish ancestry; names never do. */
export function draftGlobalTemplateBindings(store: TemplateStore, library: GlobalTemplateLibrary): GlobalTemplateBinding[] {
  return library.templates.sets.map(original => {
    if (store.sets.some(set => set.id === original.id)) return { setId: original.id, globalSetId: original.id, ids: {}, overrides: [] };
    const candidates = [...library.migrations.test.bindings, ...library.migrations.test2.bindings]
      .filter(binding => binding.globalSetId === original.id && store.sets.some(set => set.id === binding.setId));
    let distinct = [...new Map(candidates.map(binding => [JSON.stringify([binding.setId, Object.entries(binding.ids).sort(([a], [b]) => a.localeCompare(b))]), binding])).values()];
    if (distinct.length > 1) distinct = distinct.filter(binding => store.assignments.some(assignment => assignment.setId === binding.setId));
    if (distinct.length > 1) throw new Error("A browser template has ambiguous global ancestry. Its recovery originals were kept.");
    return distinct[0] ? { ...copyTemplateData(distinct[0]), overrides: [] } : { setId: original.id, globalSetId: original.id, ids: {}, overrides: [] };
  });
}

/** The source remains a recovery record; only global designs are active. */
export function draftGlobalTemplates(store: TemplateStore, library: GlobalTemplateLibrary): TemplateStore {
  try {
    const effective = effectiveGlobalTemplates(store, library, draftGlobalTemplateBindings(store, library));
    for (const assignment of effective.assignments) {
      if (!effective.sets.find(set => set.id === assignment.setId)?.templates.some(template => template.id === assignment.templateId && template.kind === assignment.kind)) throw new Error("The assigned shared template has a different document kind.");
    }
    return effective;
  }
  catch (reason) { throw new Error(`Studio Drafts could not connect an existing template to the shared library. The originals and assignments were kept. ${reason instanceof Error ? reason.message : "Check the template recovery data."}`); }
}

/** Save local assignments without replacing any original browser design. */
export function retainDraftTemplateChanges(source: TemplateStore, next: TemplateStore, library: GlobalTemplateLibrary): TemplateStore {
  const effective = draftGlobalTemplates(source, library);
  if (JSON.stringify(next.sets) !== JSON.stringify(effective.sets)) throw new Error("Template designs are shared. Edit their originals in Templates; browser recovery designs cannot replace them.");
  const checked = validateTemplateStore(next);
  const sets = copyTemplateData(source.sets);
  for (const assignment of checked.assignments) {
    const active = checked.sets.find(set => set.id === assignment.setId)!;
    const retained = sets.find(set => set.id === active.id);
    if (!retained) { sets.push(copyTemplateData(active)); continue; }
    // New shared templates need a reader-valid local assignment record. Keep
    // existing artwork intact, including the transitive recovery references.
    for (const template of active.templates) if (!retained.templates.some(item => item.id === template.id)) retained.templates.push(copyTemplateData(template));
    for (const part of active.parts) if (!retained.parts.some(item => item.id === part.id)) retained.parts.push(copyTemplateData(part));
  }
  return validateTemplateStore({ ...source, sets, assignments: checked.assignments, bin: checked.bin, defaultTemplateIds: checked.defaultTemplateIds });
}

export function globalDraftSnapshot(snapshot: TemplateSnapshot | undefined, source: TemplateStore, library: GlobalTemplateLibrary): TemplateSnapshot | undefined {
  if (!snapshot) return;
  const binding = draftGlobalTemplateBindings(source, library).find(item => item.setId === snapshot.set.id);
  if (!binding) throw new Error("This draft template has no shared original. Its recovery copy was kept.");
  const set = library.templates.sets.find(item => item.id === binding.globalSetId)!;
  const templateId = Object.entries(binding.ids).find(([, local]) => local === snapshot.templateId)?.[0] ?? snapshot.templateId;
  if (!set.templates.some(item => item.id === templateId)) throw new Error("The shared template is unavailable. Its recovery copy was kept.");
  return copyTemplateData({ version: library.templates.version, set, templateId });
}
