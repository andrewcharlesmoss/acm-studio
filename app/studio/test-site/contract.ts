import { validGlobalTemplateBindings, type GlobalTemplateBinding } from "../global-template-contract";
import { createUniversalStylePreset } from "@acm/styles";
import { navigationEntries } from "../navigation-items";
import { isLocalFixtureSiteId, type LocalFixtureSiteId } from "./sites";
import type { ContentBlock } from "../../content/model";
import type { StudioWorkspace, StudioDocument } from "../editor-model";
import { validContentBlocks, validateStudioWorkspace } from "../workspace-validation";

import { emptyTemplateStore, validateTemplateStore, type TemplateStore, type TemplateSet, type TemplateAssignment } from "../template-model";

export const TEST_REGIONS = ["header", "main", "footer"] as const;
type Group = Extract<ContentBlock, { type: "group" }>;
type LegacyTestSiteDocument = { format: "acm-test-site"; version: 1; siteId: "test"; regions: Record<typeof TEST_REGIONS[number], Group> };
export type SiteNavigationReference = { setId: string; partId: string };
type LegacyTestSiteCollection = {
  format: "acm-test-site"; version: 3; siteId: LocalFixtureSiteId;
  documents: StudioWorkspace["documents"]; categories: StudioWorkspace["categories"]; bin: StudioWorkspace["bin"];
  activeDocumentId: string; homeDocumentId: string; templates: TemplateStore;
  browserImportComplete: boolean;
};
export type LocalSitePublication = { document: StudioDocument; assignment?: TemplateAssignment };
export type TestSiteCollection = Omit<LegacyTestSiteCollection, "version"> & { siteNavigation: SiteNavigationReference } & ({ version: 4; globalTemplates?: never } | { version: 5; globalTemplates: GlobalTemplateBinding[] } | { version: 6; globalTemplates: GlobalTemplateBinding[]; publications: LocalSitePublication[] } | { version: 7; globalTemplates: GlobalTemplateBinding[]; publications: LocalSitePublication[] });
export type TestSiteDocument = TestSiteCollection | LegacyTestSiteCollection | LegacyTestSiteDocument | { format: "acm-test-site"; version: 2; siteId: "test"; document: StudioDocument };
export type TestSnapshot = { revision: string; document: TestSiteDocument; previewRevision: string };
function record(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function hasLocalMedia(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasLocalMedia);
  if (!record(value)) return false;
  return Object.entries(value).some(([key, child]) => ((key === "mediaId" || key === "backgroundImageMediaId") && typeof child === "string" && child.length > 0) || (["src", "url", "backgroundImage", "backgroundImageUrl", "href"].includes(key) && typeof child === "string" && child.startsWith("blob:")) || hasLocalMedia(child));
}
export function validTestSiteDocument(value: unknown): value is TestSiteDocument {
  if (hasLocalMedia(value)) return false;
  if (!record(value) || value.format !== "acm-test-site" || !isLocalFixtureSiteId(value.siteId) || value.version !== 3 && value.version !== 4 && value.version !== 5 && value.version !== 6 && value.version !== 7 && value.siteId !== "test") return false;
  if (value.version === 1) {
    if (!record(value.regions) || Object.keys(value).sort().join() !== "format,regions,siteId,version" || Object.keys(value.regions).sort().join() !== "footer,header,main") return false;
    const blocks = TEST_REGIONS.map(region => (value.regions as Record<string, unknown>)[region]);
    return validContentBlocks(blocks) && blocks.every((block, index) => block.type === "group" && block.id === `test-${TEST_REGIONS[index]}` && block.tagName === TEST_REGIONS[index]);
  }
  if (value.version === 3 || value.version === 4 || (value.version === 5 || (value.version === 6 || value.version === 7))) {
    const keys = (value.version === 6 || value.version === 7) ? "activeDocumentId,bin,browserImportComplete,categories,documents,format,globalTemplates,homeDocumentId,publications,siteId,siteNavigation,templates,version" : value.version === 5 ? "activeDocumentId,bin,browserImportComplete,categories,documents,format,globalTemplates,homeDocumentId,siteId,siteNavigation,templates,version" : value.version === 4 ? "activeDocumentId,bin,browserImportComplete,categories,documents,format,homeDocumentId,siteId,siteNavigation,templates,version" : "activeDocumentId,bin,browserImportComplete,categories,documents,format,homeDocumentId,siteId,templates,version";
    if (Object.keys(value).sort().join() !== keys
      || typeof value.browserImportComplete !== "boolean" || typeof value.homeDocumentId !== "string") return false;
    try {
      const workspace = validateStudioWorkspace({ ...value, version: 24 });
      if (!workspace.documents.some(document => document.id === value.homeDocumentId && document.kind === "page")) return false;
      const templates = validateTemplateStore(value.templates, workspace.documents);
      if (value.version === 4 || (value.version === 5 || (value.version === 6 || value.version === 7))) {
        if ((value.version === 5 || (value.version === 6 || value.version === 7)) && !validGlobalTemplateBindings(value.globalTemplates)) return false;
        const reference = value.siteNavigation;
        if (!record(reference) || Object.keys(reference).sort().join() !== "partId,setId"
          || !templates.sets.find(set => set.id === reference.setId)?.parts.some(part => part.id === reference.partId && part.kind === "header")) return false;
      }
      if ((value.version === 6 || value.version === 7)) {
        if (!Array.isArray(value.publications) || value.publications.length > 1000) return false;
        const ids = new Set<string>();
        const retainedDocuments = [...workspace.documents, ...workspace.bin.map(item => item.document)];
        for (const entry of value.publications) {
          if (!record(entry) || Object.keys(entry).sort().join() !== (entry.assignment ? "assignment,document" : "document") || !record(entry.document)) return false;
          const page = entry.document as StudioDocument;
          if (value.version === 7 && (page.status !== "published" && page.status !== "scheduled" || page.status === "scheduled" && !page.publishAt)) return false;
          if (ids.has(page.id) || !retainedDocuments.some(document => document.id === page.id && document.kind === page.kind)) return false;
          ids.add(page.id);
          const categories = (page.categoryIds ?? []).map(id => ({ id, name: id }));
          if (page.parentPageId !== undefined && typeof page.parentPageId !== "string") return false;
          validateStudioWorkspace({ version: 24, documents: [{ ...page, parentPageId: undefined }], categories, bin: [], activeDocumentId: page.id });
          if (entry.assignment) {
            const a = entry.assignment;
            if (!record(a) || Object.keys(a).sort().join() !== "documentId,kind,setId,templateId" || a.documentId !== page.id || a.kind !== page.kind || typeof a.setId !== "string" || typeof a.templateId !== "string") return false;
          }
        }
        if (value.version === 6 && !ids.has(value.homeDocumentId)) return false;
      }
      return true;
    } catch { return false; }
  }
  if (value.version !== 2 || Object.keys(value).sort().join() !== "document,format,siteId,version" || !record(value.document) || value.document.id !== "test-site" || hasLocalMedia(value.document)) return false;
  try {
    const categoryIds = Array.isArray(value.document.categoryIds) ? value.document.categoryIds : [];
    validateStudioWorkspace({ version: 24, documents: [value.document], activeDocumentId: "test-site", bin: [], categories: categoryIds.map(id => ({ id, name: id })) });
    return true;
  } catch { return false; }
}
export function testDocumentToEditor(document: TestSiteDocument, documentId?: string): StudioDocument {
  if (document.version === 3 || document.version === 4 || (document.version === 5 || document.version === 6 || document.version === 7)) return document.documents.find(item => item.id === (documentId ?? document.activeDocumentId)) ?? document.documents.find(item => item.id === document.homeDocumentId)!;
  if (document.version === 2) return document.document;
  return { id: "test-site", kind: "page", title: "Test", slug: "", excerpt: "", status: "draft", updatedAt: "2026-10-07T00:00:00.000Z", tags: [], seoTitle: "Test", seoDescription: "", documentShellVersion: 1, blocks: TEST_REGIONS.map(region => document.regions[region]) };
}
/** Stable IDs keep read-only normalisation and peer-tab migrations identical. */
function withSiteNavigation(collection: LegacyTestSiteCollection): TestSiteCollection {
  if (collection.templates.sets.length >= 100) throw new Error("The site already has 100 template sets. Navigation migration needs a free set slot; the original source was kept.");
  const occupied = new Set([...collection.templates.sets.map(set => set.id), ...collection.templates.bin.map(item => item.kind === "set" ? item.set.id : item.setId)]);
  const baseId = `fixture-${collection.siteId}-navigation`;
  let setId = baseId;
  for (let suffix = 1; occupied.has(setId); suffix++) setId = `${baseId}-${suffix}`;
  const partId = `${baseId}-part`;
  const styles = createUniversalStylePreset();
  styles.palette.surface = "#f5f4ef";
  styles.palette.textPrimary = "#171a1d";
  const navigation: TemplateSet = {
    id: setId, name: "Site Navigation", templates: [],
    parts: [{ id: partId, name: "Navigation", kind: "header", nodes: [{ id: `${baseId}-block`, type: "element", element: "navigation", align: "left" }] }],
    identity: { name: collection.siteId === "test2" ? "Test2" : "Test", homeUrl: "/", copyright: "" },
    navigation: collection.documents.slice(0, 100).map((document, index) => ({ id: `${baseId}-link-${index}`, label: (document.title || "Untitled").slice(0, 160), url: testDocumentHref(document.id) })),
    socialLinks: [], styles,
  };
  return { ...collection, version: 4, siteNavigation: { setId, partId }, templates: { ...collection.templates, sets: [...collection.templates.sets, navigation] } };
}
/** Legacy envelopes remain readable. Navigation is seeded once, then explicitly authored. */
export function testSiteCollection(document: TestSiteDocument): TestSiteCollection {
  if (document.version === 3 || document.version === 4 || (document.version === 5 || document.version === 6 || document.version === 7)) {
    const workspace = validateStudioWorkspace({ ...document, version: 24 });
    const collection = { ...document, documents: workspace.documents, categories: workspace.categories, bin: workspace.bin,
      templates: validateTemplateStore(document.templates, workspace.documents) };
    return collection.version === 4 || (collection.version === 5 || collection.version === 6 || collection.version === 7) ? collection : withSiteNavigation(collection);
  }
  const page = testDocumentToEditor(document);
  return withSiteNavigation({ format: "acm-test-site", version: 3, siteId: "test", documents: [page],
    activeDocumentId: page.id, homeDocumentId: page.id, bin: [],
    categories: (page.categoryIds ?? []).map(id => ({ id, name: id })),
    templates: emptyTemplateStore(), browserImportComplete: false });
}
export function testSiteWorkspace(document: TestSiteCollection, selectedId = document.activeDocumentId): StudioWorkspace {
  return { version: 24, documents: document.documents, categories: document.categories, bin: document.bin,
    activeDocumentId: document.documents.some(item => item.id === selectedId) ? selectedId : document.homeDocumentId };
}
/** Explicit restore completes the import decision, including for older backups. */
export function testSiteBackupSource(value: unknown, expectedSiteId: LocalFixtureSiteId = "test"): TestSiteCollection {
  if (!validTestSiteDocument(value) || value.siteId !== expectedSiteId) throw new Error("This backup belongs to another site or contains unsupported content. The site was kept.");
  return { ...testSiteCollection(value), browserImportComplete: true };
}
export function testDocumentFromEditor(document: StudioDocument, source?: TestSiteDocument): TestSiteDocument | null {
  const candidate: TestSiteDocument = source ? { ...testSiteCollection(source), documents: testSiteCollection(source).documents.map(item => item.id === document.id ? document : item) }
    : { format: "acm-test-site", version: 2, siteId: "test", document };
  return validTestSiteDocument(candidate) ? candidate : null;
}
/** A single source transaction imports authorised drafts without consuming their recovery copies. */
export function importBrowserTestContent(source: TestSiteDocument, workspace: StudioWorkspace, templates: TemplateStore): TestSiteCollection {
  const collection = testSiteCollection(source);
  if (collection.browserImportComplete) return collection;
  const ids = new Set([...collection.documents, ...collection.bin.map(item => item.document)].map(item => item.id));
  if (workspace.documents.some(item => ids.has(item.id)) || workspace.bin.some(item => ids.has(item.document.id))) throw new Error("Test already has a document with a browser draft’s ID. The browser originals were kept.");
  if (collection.templates.sets.some(set => set.id !== collection.siteNavigation.setId || set.templates.length > 0)
    || collection.templates.bin.length || collection.templates.assignments.length || Object.values(collection.templates.defaultTemplateIds ?? {}).some(Boolean)) throw new Error("Test already has templates. The browser originals were kept; import needs review.");
  const categoryIds = new Set(collection.categories.map(item => item.id));
  if (workspace.categories.some(item => {
    const existing = collection.categories.find(category => category.id === item.id);
    return existing && (existing.name !== item.name || existing.parentId !== item.parentId);
  })) throw new Error("Test has a different category with a browser draft’s ID. The browser originals were kept.");
  const merged: TestSiteCollection = { ...collection, documents: [...collection.documents, ...workspace.documents],
    bin: [...collection.bin, ...workspace.bin], categories: [...collection.categories, ...workspace.categories.filter(item => !categoryIds.has(item.id))],
    templates: { ...templates, sets: [...templates.sets, ...collection.templates.sets.filter(set => set.id === collection.siteNavigation.setId)] }, browserImportComplete: true };
  // Legacy import seeds from the complete imported document list; authored v4 links stay intact.
  const candidate = source.version === 4 || (source.version === 5 || source.version === 6 || source.version === 7) ? { ...merged, templates: { ...merged.templates, sets: merged.templates.sets.map(set => {
    if (set.id !== collection.siteNavigation.setId) return set;
    const entries = navigationEntries(set.navigation);
    if (entries.length + workspace.documents.length > 100) throw new Error("The imported documents would exceed the menu’s 100-link limit. All browser originals were kept.");
    const ids = new Set(entries.map(entry => entry.link.id));
    const importedLinks = workspace.documents.map((document, index) => {
      const baseId = `fixture-${collection.siteId}-import-link-${index}`;
      let id = baseId;
      for (let suffix = 1; ids.has(id); suffix++) id = `${baseId}-${suffix}`;
      ids.add(id);
      return { id, label: (document.title || "Untitled").slice(0, 160), url: testDocumentHref(document.id) };
    });
    return { ...set, navigation: [...set.navigation, ...importedLinks] };
  }) } } : withSiteNavigation({ ...merged, version: 3, templates });
  if (!validTestSiteDocument(candidate)) throw new Error("The browser drafts could not be copied to Test. Browser-managed media needs a portable URL; all originals were kept.");
  return candidate;
}
export function testDocumentHref(documentId: string) { return `/#document=${encodeURIComponent(documentId)}`; }

/** Editing Undo/Redo never republishes an older aggregate snapshot. */
export function retainLocalPublications(next: TestSiteDocument, current: TestSiteDocument): TestSiteDocument {
  if (current.version !== 6 && current.version !== 7) return next;
  const target = testSiteCollection(next);
  const ids = new Set([...target.documents, ...target.bin.map(item => item.document)].map(document => document.id));
  const publications = current.publications.filter(item => ids.has(item.document.id));
  const documents = target.documents.map(document => {
    const live = current.documents.find(item => item.id === document.id);
    // Undo edits draft content/dates, but cannot undo explicit publication commands.
    return live ? { ...document, status: live.status, publishedAt: live.publishedAt } : document;
  });
  return { ...target, documents, version: current.version, globalTemplates: target.globalTemplates ?? current.globalTemplates, publications };
}
