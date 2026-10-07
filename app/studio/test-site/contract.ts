import type { ContentBlock } from "../../content/model";
import type { StudioDocument } from "../editor-model";
import { validContentBlocks, validateStudioWorkspace } from "../workspace-validation";

export const TEST_REGIONS = ["header", "main", "footer"] as const;
type Group = Extract<ContentBlock, { type: "group" }>;
type LegacyTestSiteDocument = { format: "acm-test-site"; version: 1; siteId: "test"; regions: Record<typeof TEST_REGIONS[number], Group> };
export type TestSiteDocument = LegacyTestSiteDocument | { format: "acm-test-site"; version: 2; siteId: "test"; document: StudioDocument };
export type TestSnapshot = { revision: string; document: TestSiteDocument; previewRevision: string };
function record(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function hasLocalMedia(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasLocalMedia);
  if (!record(value)) return false;
  return Object.entries(value).some(([key, child]) => ((key === "mediaId" || key === "backgroundImageMediaId") && typeof child === "string" && child.length > 0) || (["src", "url", "backgroundImage", "backgroundImageUrl", "href"].includes(key) && typeof child === "string" && child.startsWith("blob:")) || hasLocalMedia(child));
}
export function validTestSiteDocument(value: unknown): value is TestSiteDocument {
  if (hasLocalMedia(value)) return false;
  if (!record(value) || value.format !== "acm-test-site" || value.siteId !== "test") return false;
  if (value.version === 1) {
    if (!record(value.regions) || Object.keys(value).sort().join() !== "format,regions,siteId,version" || Object.keys(value.regions).sort().join() !== "footer,header,main") return false;
    const blocks = TEST_REGIONS.map(region => (value.regions as Record<string, unknown>)[region]);
    return validContentBlocks(blocks) && blocks.every((block, index) => block.type === "group" && block.id === `test-${TEST_REGIONS[index]}` && block.tagName === TEST_REGIONS[index]);
  }
  if (value.version !== 2 || Object.keys(value).sort().join() !== "document,format,siteId,version" || !record(value.document) || value.document.id !== "test-site" || hasLocalMedia(value.document)) return false;
  try {
    const categoryIds = Array.isArray(value.document.categoryIds) ? value.document.categoryIds : [];
    validateStudioWorkspace({ version: 24, documents: [value.document], activeDocumentId: "test-site", bin: [], categories: categoryIds.map(id => ({ id, name: id })) });
    return true;
  } catch { return false; }
}
export function testDocumentToEditor(document: TestSiteDocument): StudioDocument {
  if (document.version === 2) return document.document;
  return { id: "test-site", kind: "page", title: "Test", slug: "", excerpt: "", status: "draft", updatedAt: "2026-10-07T00:00:00.000Z", tags: [], seoTitle: "Test", seoDescription: "", documentShellVersion: 1, blocks: TEST_REGIONS.map(region => document.regions[region]) };
}
export function testDocumentFromEditor(document: StudioDocument): TestSiteDocument | null {
  const candidate = { format: "acm-test-site", version: 2, siteId: "test", document };
  return validTestSiteDocument(candidate) ? candidate : null;
}
