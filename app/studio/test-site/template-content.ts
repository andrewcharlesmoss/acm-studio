import { retainLegacyNavigationPresentation } from "../global-template-contract";
import type { TemplateStore } from "../template-model";

/** Projected menus read one owner; saving a document never copies them into recovery sets. */
export function retainFixtureTemplateContent(source: TemplateStore, effective: TemplateStore, next: TemplateStore, menuSetId: string) {
  const design = (store: TemplateStore) => store.sets.map(({ identity: _identity, navigation: _navigation, socialLinks: _social, ...original }) => { void _identity; void _navigation; void _social; return original; });
  if (JSON.stringify(design(next)) !== JSON.stringify(design(effective))) throw new Error("Templates are global. Edit their original in Templates; site design changes are unavailable.");
  for (const set of next.sets) {
    retainLegacyNavigationPresentation(set.navigation, []); retainLegacyNavigationPresentation(set.socialLinks, []);
    if (set.id !== menuSetId && JSON.stringify(set.navigation) !== JSON.stringify(effective.sets.find(item => item.id === set.id)?.navigation)) throw new Error("Edit this site's canonical menu. Shared Header previews cannot save separate links.");
  }
  const sets = source.sets.map(retained => {
    const local = next.sets.find(item => item.id === retained.id);
    return local ? { ...retained, identity: local.identity, navigation: retained.id === menuSetId ? retainLegacyNavigationPresentation(local.navigation, retained.navigation) : retained.navigation, socialLinks: retainLegacyNavigationPresentation(local.socialLinks, retained.socialLinks) } : retained;
  });
  for (const entry of next.sets) if (!sets.some(set => set.id === entry.id)) sets.push(entry);
  return sets;
}
