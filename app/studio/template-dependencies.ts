import { draftGlobalTemplateBindings } from "./draft-global-templates";
import { effectiveGlobalTemplates, migrateGlobalTemplateBindings, type GlobalTemplateBinding, type GlobalTemplateLibrary } from "./global-template-contract";
import { copyTemplateData, templatePartReference, validateTemplateStore, visitTemplateNodes, type TemplateAssignment, type TemplateStore } from "./template-model";
import { resolveDocumentFields } from "./document-fields";
import type { StudioDocument, StudioWorkspace } from "./editor-model";

export type TemplateDependencyOwner = "drafts" | "test" | "test2";
export type TemplateDependencyTarget = { setId: string; entryId: string };
export type TemplateReference = Pick<TemplateAssignment, "setId" | "templateId" | "kind">;
export type TemplateDependencySnapshot = {
  owner: TemplateDependencyOwner; workspace: StudioWorkspace; templates: TemplateStore;
  bindings: GlobalTemplateBinding[]; publications?: { document: StudioDocument; assignment?: TemplateAssignment }[];
  siteNavigation?: { setId: string; partId: string };
};
export type TemplateDependency = {
  key: string; owner: TemplateDependencyOwner | "global"; label: string;
  kind: "document" | "publication" | "bin" | "default" | "part" | "navigation" | "recovery";
  manageable: boolean; blocking: boolean; baseline: string;
  documentId?: string; binId?: string; defaultKind?: "page" | "post";
};
export const dependencyOwnerName = (owner: TemplateDependency["owner"]) => owner === "drafts" ? "Studio Drafts" : owner === "global" ? "Global templates" : owner === "test" ? "Test" : "Test2";
export function dependencyBindings(owner: TemplateDependencyOwner, templates: TemplateStore, library: GlobalTemplateLibrary, retained?: GlobalTemplateBinding[]) {
  if (owner === "drafts") return draftGlobalTemplateBindings(templates, library);
  const bindings = copyTemplateData(retained ?? migrateGlobalTemplateBindings(templates, library, owner));
  for (const set of library.templates.sets) if (!bindings.some(item => item.globalSetId === set.id)) bindings.push({ setId: set.id, globalSetId: set.id, ids: {}, overrides: [] });
  return bindings;
}
export function localTemplateTarget(target: TemplateDependencyTarget, bindings: GlobalTemplateBinding[]) {
  const binding = bindings.find(item => item.globalSetId === target.setId);
  return { setId: binding?.setId ?? target.setId, entryId: binding?.ids[target.entryId] ?? target.entryId };
}
function matches(reference: { setId: string; templateId: string } | undefined, target: TemplateDependencyTarget, bindings: GlobalTemplateBinding[]) {
  const local = localTemplateTarget(target, bindings);
  return Boolean(reference && (reference.setId === local.setId && reference.templateId === local.entryId || reference.setId === target.setId && reference.templateId === target.entryId));
}
export function collectOwnerTemplateDependencies(source: TemplateDependencySnapshot, target: TemplateDependencyTarget): TemplateDependency[] {
  const rows: TemplateDependency[] = [];
  const add = (kind: TemplateDependency["kind"], id: string, label: string, reference: unknown, details: Partial<TemplateDependency> = {}) => rows.push({ key: `${source.owner}:${kind}:${id}`, owner: source.owner, label, kind, baseline: JSON.stringify(reference), manageable: true, blocking: true, ...details });
  for (const assignment of source.templates.assignments) if (matches(assignment, target, source.bindings)) {
    const document = source.workspace.documents.find(item => item.id === assignment.documentId);
    if (!document) throw new Error(`${dependencyOwnerName(source.owner)} has an assignment without a document. Its data was kept.`);
    add("document", document.id, document.title, assignment, { documentId: document.id });
  }
  for (const item of source.workspace.bin) if (matches(item.assignment, target, source.bindings)) add("bin", item.id, item.document.title, item.assignment, { documentId: item.document.id, binId: item.id });
  for (const item of source.publications ?? []) if (matches(item.assignment, target, source.bindings)) add("publication", item.document.id, item.document.title, item.assignment, { documentId: item.document.id });
  const local = localTemplateTarget(target, source.bindings);
  for (const kind of ["page", "post"] as const) if (source.templates.defaultTemplateIds?.[kind] === local.entryId) add("default", kind, `Default ${kind} template`, source.templates.defaultTemplateIds[kind], { defaultKind: kind });
  if (source.siteNavigation && matches({ setId: source.siteNavigation.setId, templateId: source.siteNavigation.partId }, target, source.bindings)) add("navigation", "site", "Site navigation", source.siteNavigation, { manageable: false });
  const retained = source.templates.sets.find(set => set.id === local.setId);
  if (retained && [...retained.templates, ...retained.parts].some(entry => entry.id === local.entryId)) add("recovery", local.entryId, "Retained original design", local, { manageable: false, blocking: false });
  return rows;
}
export function collectGlobalTemplateDependencies(library: GlobalTemplateLibrary, target: TemplateDependencyTarget, sources: TemplateDependencySnapshot[]): TemplateDependency[] {
  const rows = sources.flatMap(source => collectOwnerTemplateDependencies(source, target));
  const set = library.templates.sets.find(item => item.id === target.setId);
  for (const entry of [...(set?.templates ?? []), ...(set?.parts ?? [])]) {
    let count = 0; visitTemplateNodes(entry.nodes, node => { if (templatePartReference(node) === target.entryId) count++; });
    if (count) rows.push({ key: `global:part:${set!.id}/${entry.id}`, owner: "global", label: entry.name, kind: "part", manageable: false, blocking: true, baseline: JSON.stringify(entry.nodes) });
  }
  return rows;
}

/** Detaching freezes inherited editorial values, using the single-document policy. */
function detachedDocument(document: StudioDocument, assignment: TemplateAssignment | undefined, effective: TemplateStore): StudioDocument {
  const set = effective.sets.find(item => item.id === assignment?.setId);
  const template = set?.templates.find(item => item.id === assignment?.templateId);
  if (!set || !template) throw new Error("The current template is unavailable. Refresh dependencies before detaching.");
  const { author, category, tags, parentPageId } = resolveDocumentFields(document, set, template.defaults);
  return { ...document, author, category, tags, parentPageId, templateOverrides: { author: true, category: true, tags: true, parentPageId: true } };
}
function retainAssignmentRecords(source: TemplateStore, effective: TemplateStore, references: TemplateReference[]) {
  const sets = copyTemplateData(source.sets);
  for (const reference of references) {
    const original = effective.sets.find(set => set.id === reference.setId);
    const entry = original?.templates.find(item => item.id === reference.templateId && item.kind === reference.kind);
    if (!original || !entry) throw new Error("Choose an available replacement of the same document kind.");
    const retained = sets.find(set => set.id === original.id);
    if (!retained) { sets.push(copyTemplateData(original)); continue; }
    for (const template of original.templates) if (!retained.templates.some(item => item.id === template.id)) retained.templates.push(copyTemplateData(template));
    for (const part of original.parts) if (!retained.parts.some(item => item.id === part.id)) retained.parts.push(copyTemplateData(part));
  }
  return sets;
}
/** Pure, fresh-source plan; content bodies, statuses and recovery designs stay intact. */
export function changeTemplateDependencies(source: TemplateDependencySnapshot, library: GlobalTemplateLibrary, target: TemplateDependencyTarget, selected: TemplateDependency[], replacement: TemplateDependencyTarget | null) {
  const current = collectOwnerTemplateDependencies(source, target);
  const rows = selected.filter(item => item.owner === source.owner);
  if (!rows.length) throw new Error("Select a dependency to change.");
  for (const row of rows) if (!row.manageable || !current.some(item => item.key === row.key && item.baseline === row.baseline)) throw new Error("Dependencies changed. Refresh and review the current assignments before applying.");
  const entry = library.templates.sets.find(set => set.id === target.setId)?.templates.find(item => item.id === target.entryId);
  if (!entry) throw new Error("Document assignments can only be changed for a Page or Post template.");
  let nextReference: TemplateReference | undefined;
  if (replacement) {
    const next = library.templates.sets.find(set => set.id === replacement.setId)?.templates.find(item => item.id === replacement.entryId);
    if (!next || next.kind !== entry.kind || replacement.setId === target.setId && replacement.entryId === target.entryId) throw new Error("Choose another template of the same kind.");
    const local = localTemplateTarget(replacement, source.bindings);
    nextReference = { setId: local.setId, templateId: local.entryId, kind: next.kind };
  }
  const effective = effectiveGlobalTemplates(source.templates, library, source.bindings);
  const selectedKey = (kind: TemplateDependency["kind"], id: string) => rows.some(row => row.key === `${source.owner}:${kind}:${id}`);
  const assignmentFor = (documentId: string) => nextReference ? { ...nextReference, documentId } : undefined;
  const documents = source.workspace.documents.map(document => !selectedKey("document", document.id) || replacement ? document : detachedDocument(document, source.templates.assignments.find(item => item.documentId === document.id), effective));
  const bin = source.workspace.bin.map(item => !selectedKey("bin", item.id) ? item : { ...item, document: replacement ? item.document : detachedDocument(item.document, item.assignment, effective), assignment: assignmentFor(item.document.id) });
  const publications = source.publications?.map(item => {
    if (!selectedKey("publication", item.document.id)) return item;
    const assignment = assignmentFor(item.document.id);
    return { document: replacement ? item.document : detachedDocument(item.document, item.assignment, effective), ...(assignment ? { assignment } : {}) };
  });
  const assignments = source.templates.assignments.flatMap(item => !selectedKey("document", item.documentId) ? [item] : nextReference ? [{ ...nextReference, documentId: item.documentId }] : []);
  const defaultTemplateIds = { ...source.templates.defaultTemplateIds };
  for (const kind of ["page", "post"] as const) if (selectedKey("default", kind)) { if (nextReference) defaultTemplateIds[kind] = nextReference.templateId; else delete defaultTemplateIds[kind]; }
  const sets = retainAssignmentRecords(source.templates, effective, nextReference ? [nextReference] : []);
  const templates = validateTemplateStore({ ...source.templates, sets, assignments, defaultTemplateIds });
  return { workspace: { ...source.workspace, documents, bin }, templates, publications };
}

export function ownerTemplateReferences(source: TemplateDependencySnapshot): TemplateReference[] {
  const refs: TemplateReference[] = [...source.templates.assignments, ...source.workspace.bin.flatMap(item => item.assignment ? [item.assignment] : []), ...(source.publications ?? []).flatMap(item => item.assignment ? [item.assignment] : [])];
  for (const kind of ["page", "post"] as const) {
    const id = source.templates.defaultTemplateIds?.[kind]; const set = source.templates.sets.find(set => set.templates.some(item => item.id === id));
    if (id && set) refs.push({ setId: set.id, templateId: id, kind });
  }
  return refs.map(({ setId, templateId, kind }) => ({ setId, templateId, kind }));
}
/** A stale peer may retain raw artwork, but cannot make a removed original active again. */
export function assertActiveGlobalReferences(library: GlobalTemplateLibrary, references: TemplateReference[], bindings: GlobalTemplateBinding[]) {
  for (const reference of references) {
    const binding = bindings.find(item => item.setId === reference.setId);
    const setId = binding?.globalSetId ?? reference.setId;
    const id = Object.entries(binding?.ids ?? {}).find(([, local]) => local === reference.templateId)?.[0] ?? reference.templateId;
    const set = library.templates.sets.find(item => item.id === setId);
    if (set && !set.templates.some(item => item.id === id && item.kind === reference.kind)) throw new Error("An assigned global template is unavailable. Refresh and reassign it before saving.");
  }
}
