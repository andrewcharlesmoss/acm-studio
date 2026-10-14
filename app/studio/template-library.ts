import { createTemplateSet, copyTemplateData, templatePartReference, visitTemplateNodes, type PageTemplate, type TemplatePart, type TemplateSet, type TemplateStore } from "./template-model";

// Stored context IDs still resolve legacy styles, menus, references and assignments.
// They are compatibility data, not named groups in the template library.
const LIBRARY_CONTEXT_ID = "studio-template-library";
export function templateNameInitial(name: string) {
  return name.trim().match(/\p{L}/u)?.[0].toUpperCase() ?? "?";
}

export function templateLibraryEntries(store: TemplateStore) {
  const entries = store.sets.flatMap(set => [...set.templates, ...set.parts].map(entry => ({ set, entry })));
  const positions = new Map((store.libraryOrder ?? []).map((item, index) => [item.id, index]));
  return entries.sort((a, b) => (positions.get(`${a.set.id}/${a.entry.id}`) ?? Infinity) - (positions.get(`${b.set.id}/${b.entry.id}`) ?? Infinity));
}

/** Creation always uses the same unnamed library context, regardless of selection. */
export function templateLibraryContext(store: TemplateStore): TemplateSet {
  return store.sets.find(set => set.id === LIBRARY_CONTEXT_ID)
    ?? { ...createTemplateSet("Templates"), id: LIBRARY_CONTEXT_ID, templates: [], parts: [] };
}

export function replaceTemplateLibraryContext(store: TemplateStore, next: TemplateSet): TemplateStore {
  const previous = store.sets.find(set => set.id === next.id);
  const changedDefaults = next.templates.filter(template => template.isDefault
    && !previous?.templates.find(item => item.id === template.id)?.isDefault);
  return { ...store, sets: store.sets.map(set => set.id === next.id ? next : {
    ...set, templates: set.templates.map(template => changedDefaults.some(item => item.kind === template.kind)
      ? { ...template, isDefault: false } : template),
  }) };
}

/** Export one entry with its transitive shared-part/overlay dependencies. */
export function templateEntryExportContext(set: TemplateSet, entry: PageTemplate | TemplatePart): TemplateSet {
  const required = new Set<string>();
  function include(nodes: typeof entry.nodes) {
    visitTemplateNodes(nodes, node => {
      const id = templatePartReference(node);
      if (!id || required.has(id)) return;
      required.add(id);
      const part = set.parts.find(part => part.id === id);
      if (part) include(part.nodes);
    });
  }
  if (entry.kind !== "page" && entry.kind !== "post") required.add(entry.id);
  include(entry.nodes);
  return copyTemplateData({ ...set, name: entry.name,
    templates: entry.kind === "page" || entry.kind === "post" ? [entry] : [],
    parts: set.parts.filter(part => required.has(part.id)),
  });
}
