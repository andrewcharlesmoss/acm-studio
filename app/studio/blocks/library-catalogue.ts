import { blockCatalogue } from "../editor-model";
import { paragraphBlockDefinition } from "./paragraph/definition";

const detailedBlockDefinitions = [paragraphBlockDefinition];

export const blockLibraryEntries = detailedBlockDefinitions.map((definition) => {
  const editorEntry = blockCatalogue.find((block) => block.type === definition.type);
  return {
    type: definition.type,
    label: definition.label,
    description: definition.librarySummary,
    group: editorEntry?.group ?? "Other",
    href: definition.libraryHref,
  };
});
