import { isLocalFixtureSiteId, type LocalFixtureSiteId } from "./sites";
import type { ContentBlock } from "../../content/model";
import type { StudioWorkspace, StudioDocument } from "../editor-model";
import { validContentBlocks, validateStudioWorkspace } from "../workspace-validation";

import { emptyTemplateStore, validateTemplateStore, type TemplateStore } from "../template-model";

export const TEST_REGIONS = ["header", "main", "footer"] as const;
type Group = Extract<ContentBlock, { type: "group" }>;
type LegacyTestSiteDocument = { format: "acm-test-site"; version: 1; siteId: "test"; regions: Record<typeof TEST_REGIONS[number], Group> };
export type TestSiteCollection = {
  format: "acm-test-site"; version: 3; siteId: LocalFixtureSiteId;
  documents: StudioWorkspace["documents"]; categories: StudioWorkspace["categories"]; bin: StudioWorkspace["bin"];
  activeDocumentId: string; homeDocumentId: string; templates: TemplateStore;
  browserImportComplete: boolean;
};
export type TestSiteDocument = TestSiteCollection | LegacyTestSiteDocument | { format: "acm-test-site"; version: 2; siteId: "test"; document: StudioDocument };
export type TestSnapshot = { revision: string; document: TestSiteDocument; previewRevision: string };
function record(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function hasLocalMedia(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasLocalMedia);
  if (!record(value)) return false;
  return Object.entries(value).some(([key, child]) => ((key === "mediaId" || key === "backgroundImageMediaId") && typeof child === "string" && child.length > 0) || (["src", "url", "backgroundImage", "backgroundImageUrl", "href"].includes(key) && typeof child === "string" && child.startsWith("blob:")) || hasLocalMedia(child));
}
export function validTestSiteDocument(value: unknown): value is TestSiteDocument {
  if (hasLocalMedia(value)) return false;
  if (!record(value) || value.format !== "acm-test-site" || !isLocalFixtureSiteId(value.siteId) || value.version !== 3 && value.siteId !== "test") return false;
  if (value.version === 1) {
    if (!record(value.regions) || Object.keys(value).sort().join() !== "format,regions,siteId,version" || Object.keys(value.regions).sort().join() !== "footer,header,main") return false;
    const blocks = TEST_REGIONS.map(region => (value.regions as Record<string, unknown>)[region]);
    return validContentBlocks(blocks) && blocks.every((block, index) => block.type === "group" && block.id === `test-${TEST_REGIONS[index]}` && block.tagName === TEST_REGIONS[index]);
  }
  if (value.version === 3) {
    if (Object.keys(value).sort().join() !== "activeDocumentId,bin,browserImportComplete,categories,documents,format,homeDocumentId,siteId,templates,version"
      || typeof value.browserImportComplete !== "boolean" || typeof value.homeDocumentId !== "string") return false;
    try {
      const workspace = validateStudioWorkspace({ ...value, version: 24 });
      if (!workspace.documents.some(document => document.id === value.homeDocumentId && document.kind === "page")) return false;
      validateTemplateStore(value.templates, workspace.documents);
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
  if (document.version === 3) return document.documents.find(item => item.id === (documentId ?? document.activeDocumentId)) ?? document.documents.find(item => item.id === document.homeDocumentId)!;
  if (document.version === 2) return document.document;
  return { id: "test-site", kind: "page", title: "Test", slug: "", excerpt: "", status: "draft", updatedAt: "2026-10-07T00:00:00.000Z", tags: [], seoTitle: "Test", seoDescription: "", documentShellVersion: 1, blocks: TEST_REGIONS.map(region => document.regions[region]) };
}
/** Legacy envelopes stay readable; every editable tab uses the same collection shape. */
export function testSiteCollection(document: TestSiteDocument): TestSiteCollection {
  if (document.version === 3) {
    const workspace = validateStudioWorkspace({ ...document, version: 24 });
    return { ...document, documents: workspace.documents, categories: workspace.categories, bin: workspace.bin,
      templates: validateTemplateStore(document.templates, workspace.documents) };
  }
  const page = testDocumentToEditor(document);
  return { format: "acm-test-site", version: 3, siteId: "test", documents: [page],
    activeDocumentId: page.id, homeDocumentId: page.id, bin: [],
    categories: (page.categoryIds ?? []).map(id => ({ id, name: id })),
    templates: emptyTemplateStore(), browserImportComplete: false };
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
  if (collection.browserImportComplete) return source as TestSiteCollection;
  const ids = new Set([...collection.documents, ...collection.bin.map(item => item.document)].map(item => item.id));
  if (workspace.documents.some(item => ids.has(item.id)) || workspace.bin.some(item => ids.has(item.document.id))) throw new Error("Test already has a document with a browser draft’s ID. The browser originals were kept.");
  if (collection.templates.sets.length || collection.templates.bin.length) throw new Error("Test already has templates. The browser originals were kept; import needs review.");
  const categoryIds = new Set(collection.categories.map(item => item.id));
  if (workspace.categories.some(item => {
    const existing = collection.categories.find(category => category.id === item.id);
    return existing && (existing.name !== item.name || existing.parentId !== item.parentId);
  })) throw new Error("Test has a different category with a browser draft’s ID. The browser originals were kept.");
  const candidate: TestSiteCollection = { ...collection, documents: [...collection.documents, ...workspace.documents],
    bin: [...collection.bin, ...workspace.bin], categories: [...collection.categories, ...workspace.categories.filter(item => !categoryIds.has(item.id))],
    templates, browserImportComplete: true };
  if (!validTestSiteDocument(candidate)) throw new Error("The browser drafts could not be copied to Test. Browser-managed media needs a portable URL; all originals were kept.");
  return candidate;
}
export function testDocumentHref(documentId: string) { return `/#document=${encodeURIComponent(documentId)}`; }
