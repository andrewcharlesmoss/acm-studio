import { createWorkspacePreviewDocument, type StudioDocument } from "./editor-model";
import { effectiveGlobalTemplates, migrateGlobalTemplateBindings, type GlobalTemplateLibrary } from "./global-template-contract";
import type { TemplateSet } from "./template-model";
import { testSiteCollection, type TestSiteDocument } from "./test-site/contract";
import { localFixtureName, type LocalFixtureSiteId } from "./test-site/sites";

export type GlobalTemplatePreviewSite = "neutral" | LocalFixtureSiteId;
export type GlobalTemplatePreviewSource = { document: TestSiteDocument | null; error: string | null };

/** These examples are a render projection, never template or site source data. */
export function neutralGlobalTemplatePreview(set: TemplateSet): { set: TemplateSet; documents: StudioDocument[] } {
  const documents = (["page", "post"] as const).map(kind => ({
    ...createWorkspacePreviewDocument(kind, `studio-neutral-${kind}`),
    title: kind === "page" ? "Sample Page" : "Sample Post",
    subtitle: "Sample subtitle",
    author: "Sample Author",
    publishedAt: "2026-01-01T12:00:00.000Z",
    templateOverrides: { author: true, category: true, tags: true, parentPageId: true },
  }));
  return {
    set: { ...set, identity: { name: "Your Site", homeUrl: "/", copyright: "© {year} Your Site" },
      navigation: ["Home", "About", "Blog", "Contact"].map(label => ({ id: `studio-neutral-${label.toLowerCase()}`, label, url: label === "Home" ? "/" : `/${label.toLowerCase()}` })),
      socialLinks: [{ id: "studio-neutral-social", label: "LinkedIn", url: "https://www.linkedin.com/" }],
    },
    documents,
  };
}

/** Site content is projected onto the original design and its canonical IDs. */
export function siteGlobalTemplatePreview(set: TemplateSet, library: GlobalTemplateLibrary, source: TestSiteDocument): { set: TemplateSet; documents: StudioDocument[] } {
  const collection = testSiteCollection(source);
  const bindings = collection.globalTemplates ?? migrateGlobalTemplateBindings(collection.templates, library, source.siteId);
  const effective = effectiveGlobalTemplates(collection.templates, library, bindings);
  const binding = bindings.find(item => item.globalSetId === set.id);
  const content = effective.sets.find(item => item.id === (binding?.setId ?? set.id));
  if (!content) throw new Error("The site has no preview content for this template.");
  return { set: { ...set, identity: content.identity, navigation: content.navigation, socialLinks: content.socialLinks }, documents: collection.documents };
}

/** A loading or failed site never masquerades as ready sample content. */
export function resolveGlobalTemplatePreview(set: TemplateSet, site: GlobalTemplatePreviewSite, library?: GlobalTemplateLibrary | null, source?: GlobalTemplatePreviewSource) {
  const neutral = neutralGlobalTemplatePreview(set);
  if (site === "neutral") return { ...neutral, availability: "ready" as const, status: undefined, unavailableContent: undefined };
  const name = localFixtureName(site);
  const unavailable = () => ({ ...neutral, availability: "fallback" as const, status: `${name} preview unavailable. Showing neutral content.`, unavailableContent: `${name} content unavailable` });
  if (source?.error) return unavailable();
  if (!source?.document || !library) return { ...neutral, availability: "fallback" as const, status: `Loading ${name} preview…`, unavailableContent: `Loading ${name} content…` };
  try { return { ...siteGlobalTemplatePreview(set, library, source.document), availability: "ready" as const, status: undefined, unavailableContent: undefined }; }
  catch { return unavailable(); }
}
