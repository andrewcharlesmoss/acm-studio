import type { GlobalTemplateLibrary } from "./global-template-contract";
import { collectGlobalTemplateDependencies, localTemplateTarget, type TemplateReference } from "./template-dependencies";
import { fixtureTemplateDependencySnapshot } from "./test-site/template-dependencies";
import type { TestSiteDocument } from "./test-site/contract";
import type { TemplateStore } from "./template-model";
import { assertRecoverableGlobalTransition } from "./global-template-bin";

export function checkedTemplateReferences(value: unknown): TemplateReference[] {
  if (!Array.isArray(value) || value.length > 30000 || value.some(item => !item || typeof item !== "object" || Object.keys(item).sort().join() !== "kind,setId,templateId" || !["page", "post"].includes(item.kind) || [item.setId, item.templateId].some(id => typeof id !== "string" || !id.length || id.length > 160))) throw new Error("Current browser template references are required before removal.");
  return value;
}
export function assertGlobalTemplateRemoval(before: GlobalTemplateLibrary, next: TemplateStore, sites: Record<"test" | "test2", TestSiteDocument>, browserReferences: unknown) {
  if (before.header && !next.sets.find(set => set.id === before.header!.setId)?.parts.some(part => part.id === before.header!.partId && part.kind === "header")) throw new Error("The shared Header supplies site navigation and cannot be removed.");
  assertRecoverableGlobalTransition(before.templates, next);
  const removed = before.templates.sets.flatMap(set => [...set.templates, ...set.parts].filter(entry => !next.sets.find(item => item.id === set.id)?.[entry.kind === "page" || entry.kind === "post" ? "templates" : "parts"].some(item => item.id === entry.id)).map(entry => ({ setId: set.id, entryId: entry.id })));
  if (!removed.length) return;
  const references = checkedTemplateReferences(browserReferences);
  const sources = [fixtureTemplateDependencySnapshot(sites.test, before), fixtureTemplateDependencySnapshot(sites.test2, before)];
  for (const target of removed) {
    if (collectGlobalTemplateDependencies(before, target, sources).some(item => item.blocking)) throw new Error("This global template still has site dependencies. Reassign or detach them before moving it to the Bin.");
    const aliases = [{ setId: target.setId, entryId: target.entryId }, ...Object.values(before.migrations).flatMap(migration => migration.bindings.filter(binding => binding.globalSetId === target.setId).map(binding => localTemplateTarget(target, [binding])))];
    if (references.some(reference => aliases.some(alias => alias.setId === reference.setId && alias.entryId === reference.templateId))) throw new Error("Studio Drafts still depends on this template. Reassign or detach its uses before moving it to the Bin.");
  }
}
