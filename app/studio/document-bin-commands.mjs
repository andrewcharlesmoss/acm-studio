function newBinId() {
  if (typeof globalThis.crypto?.randomUUID !== "function") throw new Error("A secure identifier could not be generated.");
  return `document-bin-${globalThis.crypto.randomUUID()}`;
}

/** Build one workspace/template transaction for moving documents into Bin. */
export function moveFixtureDocumentsToBin(workspace, templates, documentIds, { protectedDocumentIds = [], createId = newBinId, now = () => new Date().toISOString() } = {}) {
  const ids = [...new Set(documentIds)];
  if (!ids.length || ids.length !== documentIds.length) throw new Error("Select one or more distinct documents.");
  const protectedIds = new Set(protectedDocumentIds);
  const documents = ids.map(id => workspace.documents.find(document => document.id === id));
  if (documents.some(document => !document)) throw new Error("A selected document is no longer available. The Bin was not changed.");
  if (documents.some(document => protectedIds.has(document.id))) throw new Error("The home page cannot be moved to the Bin.");
  const assignments = new Map(templates.assignments.filter(item => ids.includes(item.documentId)).map(item => [item.documentId, item]));
  const moved = documents.map(document => ({ id: createId(), deletedAt: now(), document,
    ...(assignments.has(document.id) ? { assignment: assignments.get(document.id) } : {}) }));
  const movedIds = new Set(ids);
  const remaining = workspace.documents.filter(document => !movedIds.has(document.id));
  const activeDocumentId = movedIds.has(workspace.activeDocumentId)
    ? (remaining.find(document => document.kind === documents[0].kind) ?? remaining[0])?.id ?? ""
    : workspace.activeDocumentId;
  return {
    workspace: { ...workspace, documents: remaining, bin: [...workspace.bin, ...moved], activeDocumentId },
    templates: { ...templates, assignments: templates.assignments.filter(item => !movedIds.has(item.documentId)) },
    moved,
  };
}

/** Restore selected entries atomically, retaining their original assignments. */
export function restoreFixtureDocumentsFromBin(workspace, templates, binIds) {
  const ids = [...new Set(binIds)];
  if (!ids.length || ids.length !== binIds.length) throw new Error("Select one or more distinct Bin items.");
  const selected = ids.map(id => workspace.bin.find(item => item.id === id));
  if (selected.some(item => !item)) throw new Error("A selected Bin item is no longer available. The Bin was not changed.");
  const existingIds = new Set(workspace.documents.map(document => document.id));
  if (selected.some(item => existingIds.has(item.document.id))) throw new Error("A document with this ID already exists. The binned copy has been kept.");
  for (const item of selected) {
    if (!item.assignment) continue;
    const set = templates.sets.find(candidate => candidate.id === item.assignment.setId);
    if (!set?.templates.some(template => template.id === item.assignment.templateId && template.kind === item.assignment.kind)) {
      throw new Error("Restore the template assigned to this document before restoring it.");
    }
  }
  const selectedIds = new Set(ids);
  const restored = selected.map(item => item.document);
  const assignments = selected.flatMap(item => item.assignment ? [item.assignment] : []);
  return {
    workspace: { ...workspace, bin: workspace.bin.filter(item => !selectedIds.has(item.id)), documents: [...workspace.documents, ...restored] },
    templates: { ...templates, assignments: [...templates.assignments.filter(item => !restored.some(document => document.id === item.documentId)), ...assignments] },
    restored,
  };
}
