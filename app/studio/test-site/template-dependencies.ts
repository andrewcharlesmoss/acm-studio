import type { GlobalTemplateLibrary } from "../global-template-contract";
import { changeTemplateDependencies, dependencyBindings, type TemplateDependency, type TemplateDependencySnapshot, type TemplateDependencyTarget } from "../template-dependencies";
import { localSitePublicationSnapshots } from "./local-publication";
import { testSiteCollection, testSiteWorkspace, validTestSiteDocument, type TestSiteDocument } from "./contract";

export function fixtureTemplateDependencySnapshot(document: TestSiteDocument, library: GlobalTemplateLibrary): TemplateDependencySnapshot {
  const source = testSiteCollection(document);
  const bindings = dependencyBindings(source.siteId, source.templates, library, "globalTemplates" in source ? source.globalTemplates : undefined);
  return { owner: source.siteId, workspace: testSiteWorkspace(source, source.homeDocumentId), templates: source.templates, bindings,
    publications: localSitePublicationSnapshots(source), siteNavigation: "siteNavigation" in source ? source.siteNavigation : undefined };
}
export function changeFixtureTemplateDependencies(document: TestSiteDocument, library: GlobalTemplateLibrary, target: TemplateDependencyTarget, selected: TemplateDependency[], replacement: TemplateDependencyTarget | null): TestSiteDocument {
  const source = testSiteCollection(document);
  const snapshot = fixtureTemplateDependencySnapshot(document, library);
  const next = changeTemplateDependencies(snapshot, library, target, selected, replacement);
  const saved = { ...source, version: 13 as const, documents: next.workspace.documents, bin: next.workspace.bin,
    templates: next.templates, globalTemplates: snapshot.bindings, publications: next.publications ?? [] };
  if (!validTestSiteDocument(saved)) throw new Error("The assignment change is invalid. The site source was kept.");
  return saved;
}
