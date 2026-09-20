import type { ContentBlock } from "../content/model";
import { readingTimeMinutes } from "../content/reading-time";
import type { StudioDocument, StudioDocumentKind } from "./editor-model";
import type { TemplateDefaults, TemplateNode, TemplateSet } from "./template-model";

export type DocumentFieldId = "type" | "title" | "slug" | "parentPageId" | "subtitle" | "excerpt" | "coverImage" | "author" | "publicationDate" | "status" | "category" | "tags" | "template" | "seoTitle" | "seoDescription" | "readingTime";
export type DocumentFieldSection = "Document Identity" | "Content Fields" | "Publishing" | "Taxonomy" | "Template" | "Search and Sharing";
export type DocumentField = {
  id: DocumentFieldId;
  label: string;
  section: DocumentFieldSection;
  appliesTo: "both" | StudioDocumentKind;
  source: "document" | "template-or-document" | "calculated" | "settings";
  displayBlocks?: ContentBlock["type"][];
  templateElements?: string[];
};

export const DOCUMENT_FIELD_CATALOGUE: readonly DocumentField[] = [
  { id: "type", label: "Type", section: "Document Identity", appliesTo: "both", source: "document" },
  { id: "title", label: "Title", section: "Document Identity", appliesTo: "both", source: "document", templateElements: ["document-title"] },
  { id: "slug", label: "Address", section: "Document Identity", appliesTo: "both", source: "document" },
  { id: "parentPageId", label: "Parent page", section: "Document Identity", appliesTo: "page", source: "document" },
  { id: "subtitle", label: "Subtitle", section: "Content Fields", appliesTo: "both", source: "document", templateElements: ["subtitle"] },
  { id: "excerpt", label: "Excerpt", section: "Content Fields", appliesTo: "both", source: "document" },
  { id: "coverImage", label: "Cover image", section: "Content Fields", appliesTo: "both", source: "document", templateElements: ["cover-image"] },
  { id: "author", label: "Author", section: "Content Fields", appliesTo: "both", source: "template-or-document", displayBlocks: ["post-author"] },
  { id: "publicationDate", label: "Publication date", section: "Publishing", appliesTo: "both", source: "template-or-document", displayBlocks: ["post-date"] },
  { id: "status", label: "Status", section: "Publishing", appliesTo: "both", source: "document" },
  { id: "category", label: "Category", section: "Taxonomy", appliesTo: "post", source: "template-or-document", templateElements: ["post-metadata"] },
  { id: "tags", label: "Tags", section: "Taxonomy", appliesTo: "post", source: "template-or-document" },
  { id: "template", label: "Template", section: "Template", appliesTo: "both", source: "settings" },
  { id: "readingTime", label: "Reading time", section: "Content Fields", appliesTo: "post", source: "calculated", displayBlocks: ["reading-time"] },
  { id: "seoTitle", label: "SEO title", section: "Search and Sharing", appliesTo: "both", source: "settings" },
  { id: "seoDescription", label: "SEO description", section: "Search and Sharing", appliesTo: "both", source: "settings" },
];

export type ResolvedDocumentFields = {
  author?: string;
  category?: StudioDocument["category"];
  tags: string[];
  authorSource: "document" | "template";
  categorySource: "document" | "template";
  tagsSource: "document" | "template";
};

export function resolveDocumentFields(document: StudioDocument, set?: TemplateSet, templateDefaults?: TemplateDefaults): ResolvedDocumentFields {
  const defaults = templateDefaults ?? set?.defaults ?? {};
  const usesTemplateDefault = (field: "author" | "category" | "tags") => Boolean(set && document.templateOverrides?.[field] !== true);
  return {
    author: usesTemplateDefault("author") ? defaults.author : document.author,
    category: usesTemplateDefault("category") ? defaults.category : document.category,
    tags: usesTemplateDefault("tags") ? [...(defaults.tags ?? [])] : [...document.tags],
    authorSource: usesTemplateDefault("author") ? "template" : "document",
    categorySource: usesTemplateDefault("category") ? "template" : "document",
    tagsSource: usesTemplateDefault("tags") ? "template" : "document",
  };
}

export type FieldUsage = { document: number; template: number; total: number };

function countBlockUsage(blocks: ContentBlock[], wanted: ContentBlock["type"]): number {
  return blocks.reduce((count, block) => count + (block.type === wanted ? 1 : 0) + ("children" in block && Array.isArray(block.children) ? countBlockUsage(block.children, wanted) : 0), 0);
}

function countTemplateUsage(nodes: TemplateNode[], set: TemplateSet, wanted: DocumentField): number {
  let count = 0;
  for (const node of nodes) {
    if (wanted.displayBlocks?.includes(node.type as ContentBlock["type"])) count++;
    if (node.type === "element" && wanted.templateElements?.includes(node.element)) count++;
    if (node.type === "group" || node.type === "section") count += countTemplateUsage(node.children, set, wanted);
    if (node.type === "part") {
      const part = set.parts.find(item => item.id === node.partId);
      if (part) count += countTemplateUsage(part.nodes, set, wanted);
    }
  }
  return count;
}

export function documentFieldUsage(document: StudioDocument, set?: TemplateSet, templateId?: string): Record<DocumentFieldId, FieldUsage> {
  const result = Object.fromEntries(DOCUMENT_FIELD_CATALOGUE.map(field => [field.id, { document: 0, template: 0, total: 0 }])) as Record<DocumentFieldId, FieldUsage>;
  for (const field of DOCUMENT_FIELD_CATALOGUE) {
    const documentCount = field.displayBlocks?.reduce((count, type) => count + countBlockUsage(document.blocks, type), 0) ?? 0;
    const templateCount = set && (field.templateElements || field.displayBlocks) ? set.templates.filter(template => template.kind === document.kind && (!templateId || template.id === templateId)).reduce((count, template) => count + countTemplateUsage(template.nodes, set, field), 0) : 0;
    result[field.id] = { document: documentCount, template: templateCount, total: documentCount + templateCount };
  }
  return result;
}

export function readingTimeSummary(document: StudioDocument) {
  return { minutes: readingTimeMinutes(document.blocks), rate: 220 };
}
