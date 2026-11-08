/**
 * Return a v43-and-earlier fixture without the generated v44 reference library.
 * Tests use this only when the downgraded envelope is meant to isolate an
 * unrelated historical feature gate.
 */
export function legacyGlobalTemplateLibrary(value, headerSet) {
  const library = structuredClone(value);
  const removedSets = new Set(["studio-twenty-twenty-five-parts"]);
  const removedPartIds = new Set();
  const collect = set => {
    if (removedSets.has(set.id)) for (const part of set.parts ?? []) removedPartIds.add(part.id);
  };
  for (const set of library.templates?.sets ?? []) collect(set);
  for (const migration of Object.values(library.migrations ?? {})) for (const set of migration.bases ?? []) collect(set);
  const stripGeneratedPartReferences = set => ({
    ...set,
    templates: (set.templates ?? []).map(template => ({
      ...template,
      nodes: (template.nodes ?? []).filter(node => node.type !== "part" || !removedPartIds.has(node.partId)),
    })),
  });
  const stripCollection = collection => ({
    ...collection,
    sets: (collection.sets ?? []).filter(set => !removedSets.has(set.id)).map(stripGeneratedPartReferences),
  });

  if (library.templates) library.templates = stripCollection(library.templates);
  for (const migration of Object.values(library.migrations ?? {})) {
    if (Array.isArray(migration.bases)) migration.bases = migration.bases.filter(set => !removedSets.has(set.id)).map(stripGeneratedPartReferences);
  }
  if (headerSet) library.header = { setId: headerSet.id, partId: headerSet.parts[0].id };
  else if (removedSets.has(library.header?.setId)) {
    const fallback = library.templates.sets.find(set => set.parts?.some(part => part.kind === "header"));
    library.header = fallback ? { setId: fallback.id, partId: fallback.parts.find(part => part.kind === "header").id } : undefined;
  }
  return library;
}
