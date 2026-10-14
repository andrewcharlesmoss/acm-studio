import { draftGlobalTemplateBindings, draftGlobalTemplates } from "./draft-global-templates";
import { retainLegacyNavigationPresentation, type GlobalTemplateLibrary } from "./global-template-contract";
import { copyTemplateData, validateTemplateStore, type TemplateStore } from "./template-model";

/** Resolve the shared Navigation role by stable ancestry, never by its name. */
export function draftNavigationReference(source: TemplateStore, library: GlobalTemplateLibrary) {
  const binding = draftGlobalTemplateBindings(source, library).find(item => item.globalSetId === "studio-global-navigation");
  if (!binding) throw new Error("The shared Navigation template is unavailable. Your menu was kept.");
  return { setId: binding.setId, partId: binding.ids["studio-global-navigation-part"] ?? "studio-global-navigation-part" };
}

/** Only authored links may change; recovery designs and other local data survive. */
export function retainDraftNavigation(source: TemplateStore, next: TemplateStore, library: GlobalTemplateLibrary): TemplateStore {
  const reference = draftNavigationReference(source, library);
  const effective = draftGlobalTemplates(source, library);
  const before = effective.sets.find(item => item.id === reference.setId)!;
  const changed = next.sets.find(item => item.id === reference.setId);
  if (!changed || JSON.stringify({ ...next, sets: next.sets.map(item => item.id === reference.setId ? { ...item, navigation: before.navigation } : item) }) !== JSON.stringify(effective)) {
    throw new Error("Only this menu’s links can change. Shared designs and recovery data were kept.");
  }
  const retained = source.sets.find(item => item.id === reference.setId);
  const navigation = retainLegacyNavigationPresentation(changed.navigation, retained?.navigation ?? before.navigation);
  const sets = retained ? source.sets.map(item => item.id === retained.id ? { ...item, navigation } : item)
    : [...source.sets, { ...copyTemplateData(before), navigation }];
  return validateTemplateStore({ ...source, sets });
}
