import type { ContentBlock, DocumentDisplayField, DocumentDisplayMode, LayoutOptions, SiteSectionRole } from "../content/model";
import { validLayoutOptions } from "../content/layout";
import type { StudioDocument, StudioDocumentKind } from "./editor-model";
import { safeImageSource, safeTextLink } from "../content/rich-text";
import { isRecord, validContentBlocks, validatePublicationSnapshot } from "./workspace-validation";

export const LEGACY_TEMPLATE_VERSION = "0.1.0" as const;
export const TEMPLATE_VERSION = "0.3.0" as const;
export const LEGACY_TEMPLATE_VERSION_2 = "0.2.0" as const;
export const TEMPLATE_STORAGE_KEY = "acm-studio-templates-v1";
export const templateElements = ["site-identity", "navigation", "document-title", "subtitle", "cover-image", "post-metadata", "content", "copyright", "social-links"] as const;
export type TemplateElement = typeof templateElements[number];
export type TemplateNode = Exclude<ContentBlock, { type: "group" | "section" | "component" }>
  | ({ id: string; type: "group"; layout: "stack" | "row" | "columns"; children: TemplateNode[] } & LayoutOptions)
  | ({ id: string; type: "section"; layout: "stack" | "row" | "columns"; role?: SiteSectionRole; children: TemplateNode[] } & LayoutOptions)
  | { id: string; type: "element"; element: TemplateElement; align?: "left" | "centre" | "right" }
  | { id: string; type: "part"; partId: string };
export type PageTemplate = { id: string; name: string; kind: StudioDocumentKind; nodes: TemplateNode[]; defaults?: TemplateDefaults; displayDefaults?: Partial<Record<DocumentDisplayField, DocumentDisplayMode>>; isDefault?: boolean };
export type TemplatePart = { id: string; name: string; kind: "header" | "footer"; nodes: TemplateNode[] };
export type SiteStyles = { background: string; text: string; accent: string; border: string; font: "inter" | "serif"; fontSize: number; spacing: number; contentWidth: number; radius: number; borderWidth: number };
export type SiteLink = { id: string; label: string; url: string };
export type TemplateDefaults = { author?: string; category?: string; tags?: string[]; parentPageId?: string };
export type TemplateSet = {
  id: string; name: string; templates: PageTemplate[]; parts: TemplatePart[]; styles: SiteStyles;
  identity: { name: string; homeUrl: string; logo?: { mediaId?: string; src: string; alt: string }; copyright: string };
  navigation: SiteLink[]; socialLinks: SiteLink[]; defaults?: TemplateDefaults;
};
export type TemplateAssignment = { documentId: string; setId: string; templateId: string; kind: StudioDocumentKind };
export type TemplateStore = { version: typeof TEMPLATE_VERSION | typeof LEGACY_TEMPLATE_VERSION | typeof LEGACY_TEMPLATE_VERSION_2; sets: TemplateSet[]; assignments: TemplateAssignment[]; defaultTemplateIds?: { page?: string; post?: string } };
export type TemplateSnapshot = { version: typeof TEMPLATE_VERSION | typeof LEGACY_TEMPLATE_VERSION | typeof LEGACY_TEMPLATE_VERSION_2; set: TemplateSet; templateId: string };
export const emptyTemplateStore = (): TemplateStore => ({ version: TEMPLATE_VERSION, sets: [], assignments: [], defaultTemplateIds: {} });
export const templateId = () => `t-${crypto.randomUUID()}`;
export const templateElementLabel = (value: string) => value.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
export const copyTemplateData = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function visitTemplateNodes(nodes: TemplateNode[], visit: (node: TemplateNode) => void) {
  for (const node of nodes) { visit(node); if (node.type === "group" || node.type === "section") visitTemplateNodes(node.children, visit); }
}

export function createTemplateSet(name = "ACM Neutral"): TemplateSet {
  const element = (element: TemplateElement): TemplateNode => ({ id: templateId(), type: "element", element });
  const header: TemplatePart = { id: templateId(), name: "Header", kind: "header", nodes: [{ id: templateId(), type: "group", layout: "row", children: [element("site-identity"), element("navigation")] }] };
  const footer: TemplatePart = { id: templateId(), name: "Footer", kind: "footer", nodes: [{ id: templateId(), type: "group", layout: "columns", columns: 3, children: [element("site-identity"), element("copyright"), element("social-links")] }] };
  const postMetadata: TemplateNode = { id: templateId(), type: "group", layout: "row", gap: 16, stackAt: "mobile", children: [
    { id: templateId(), type: "post-author", prefix: "By", avatar: true },
    { id: templateId(), type: "post-date", format: "long", showIcon: true },
    { id: templateId(), type: "reading-time", prefix: "Reading Time:", presentation: "plain" },
  ] };
  return { id: templateId(), name, defaults: {}, parts: [header, footer], templates: (["page", "post"] as const).map(kind => ({ id: templateId(), name: kind === "page" ? "Page" : "Post", kind, isDefault: true, nodes: [
    { id: templateId(), type: "part", partId: header.id }, element("document-title"), element("subtitle"), ...(kind === "post" ? [element("cover-image"), postMetadata] : []), element("content"), { id: templateId(), type: "part", partId: footer.id },
  ] })), identity: { name: "Your Site", homeUrl: "/", copyright: "© Your Site" }, navigation: [], socialLinks: [], styles: { background: "#FFFFFF", text: "#1C1C1E", accent: "#2457C5", border: "#D1D1D6", font: "inter", fontSize: 17, spacing: 24, contentWidth: 1040, radius: 8, borderWidth: 1 } };
}

const safeId = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/.test(value) && !["__proto__", "prototype", "constructor"].includes(value);
const text = (value: unknown, max = 2000): value is string => typeof value === "string" && value.length <= max;
function invalid(message: string): never { throw new Error(message); }
function claimId(value: unknown, ids: Set<string>) { if (!safeId(value) || ids.has(value)) invalid("Template identifiers must be safe and unique."); ids.add(value as string); }

export function validateTemplateSet(value: unknown): TemplateSet {
  if (!isRecord(value) || !safeId(value.id) || !text(value.name, 160) || !value.name.trim() || !Array.isArray(value.templates) || !value.templates.length || value.templates.length > 100 || !Array.isArray(value.parts) || value.parts.length > 100) invalid("The template set is invalid.");
  const set = value as unknown as TemplateSet;
  if (set.defaults !== undefined && !validTemplateDefaults(set.defaults)) invalid("Template defaults are invalid.");
  const ids = new Set<string>([set.id]);
  const styles = set.styles;
  if (!isRecord(styles) || ![styles.background, styles.text, styles.accent, styles.border].every(v => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) || !["inter", "serif"].includes(styles.font)) invalid("Use valid template colours and typography.");
  for (const [key, min, max] of [["fontSize", 13, 40], ["spacing", 0, 120], ["contentWidth", 320, 1800], ["radius", 0, 80], ["borderWidth", 0, 12]] as const) {
    if (typeof styles[key] !== "number" || !Number.isFinite(styles[key]) || styles[key] < min || styles[key] > max) invalid(`Invalid ${key} in template styles.`);
  }
  if (!isRecord(set.identity) || !text(set.identity.name, 160) || !text(set.identity.copyright) || !text(set.identity.homeUrl) || !safeTextLink(set.identity.homeUrl)) invalid("Site identity needs a safe home address.");
  if (set.identity.logo) {
    const logo = set.identity.logo;
    if (!isRecord(logo) || !text(logo.alt) || !text(logo.src) || (logo.src && !safeImageSource(logo.src)) || (logo.mediaId !== undefined && !safeId(logo.mediaId))) invalid("The site logo is invalid.");
  }
  for (const links of [set.navigation, set.socialLinks]) {
    if (!Array.isArray(links) || links.length > 100) invalid("The navigation is invalid.");
    for (const link of links) { if (!isRecord(link) || !text(link.label, 160) || !text(link.url) || !safeTextLink(link.url)) invalid("Each link needs a safe destination."); claimId(link.id, ids); }
  }
  let count = 0;
  function nodes(items: unknown, depth = 0) {
    if (!Array.isArray(items) || depth > 8) invalid("Template nesting is too deep.");
    for (const node of items as unknown[]) {
      if (!isRecord(node) || ++count > 3000) invalid("The template contains invalid or too many elements.");
      claimId(node.id, ids);
      if (node.type === "element") {
        if (!templateElements.includes(node.element as TemplateElement) || (node.align !== undefined && !["left", "centre", "right"].includes(node.align as string))) invalid("Unknown template element.");
      } else if (node.type === "part") { if (!safeId(node.partId)) invalid("Invalid shared-part reference."); }
      else if (node.type === "group" || node.type === "section") { if (Object.keys(node).some(key => !["id", "type", "layout", "role", "children", "horizontalAlign", "verticalAlign", "gap", "paddingX", "paddingY", "contentWidth", "columns", "stackAt"].includes(key)) || !["stack", "row", "columns"].includes(node.layout as string) || (node.role !== undefined && !["account", "setup", "scorecard", "leaderboard", "share", "hero", "hero-copy", "account-copy", "scorecard-heading", "scorecard-actions", "leaderboard-card", "leaderboard-score", "leaderboard-metrics", "metric", "footer", "footer-brand", "footer-links", "social-link"].includes(node.role as string)) || !validLayoutOptions(node)) invalid("Invalid template layout or unsupported group metadata."); nodes(node.children, depth + 1); }
      else {
        if (node.type === "component" || !validContentBlocks([node])) invalid("Invalid ordinary template block.");
        if ((node.type === "button" || node.type === "embed") && node.url && !safeTextLink(node.url as string)) invalid("Unsafe template link.");
        if (node.type === "image" && ((node.src && !safeImageSource(node.src as string)) || (node.mediaId !== undefined && !safeId(node.mediaId)))) invalid("Invalid template image.");
        if (Array.isArray(node.runs)) for (const run of node.runs) if (Array.isArray(run.marks)) for (const mark of run.marks) if (isRecord(mark) && mark.type === "link" && !safeTextLink(mark.url as string)) invalid("Unsafe text link.");
      }
    }
  }
  for (const item of [...set.templates, ...set.parts]) {
    if (!isRecord(item) || !text(item.name, 160) || !item.name.trim()) invalid("Name every template and shared part.");
    if ((item.kind === "page" || item.kind === "post") && item.isDefault !== undefined && typeof item.isDefault !== "boolean") invalid("Template default flags are invalid.");
    if ((item.kind === "page" || item.kind === "post") && item.defaults !== undefined && !validTemplateDefaults(item.defaults)) invalid("Template defaults are invalid.");
    if ((item.kind === "page" || item.kind === "post") && item.displayDefaults !== undefined && !validDisplayDefaults(item.displayDefaults)) invalid("Template display defaults are invalid.");
    claimId(item.id, ids); nodes(item.nodes);
  }
  if (set.templates.some(t => !["page", "post"].includes(t.kind)) || set.parts.some(p => !["header", "footer"].includes(p.kind))) invalid("Invalid template or part kind.");
  const partMap = new Map(set.parts.map(part => [part.id, part]));
  let expansion = 0;
  function countContent(items: TemplateNode[], ancestors: Set<string>, depth = 0): number {
    if (depth > 16) return invalid("Shared-part nesting is too deep.");
    let slots = 0;
    for (const node of items) {
      if (++expansion > 10000) invalid("Shared parts expand to too many elements. Simplify their references.");
      if (node.type === "part") {
        const part = partMap.get(node.partId);
        if (!part || ancestors.has(part.id)) invalid("Shared parts must exist in this set and cannot form cycles.");
        slots += countContent(part!.nodes, new Set([...ancestors, part!.id]), depth + 1);
      } else if (node.type === "element" && node.element === "content") slots++;
      else if (node.type === "group" || node.type === "section") slots += countContent(node.children, ancestors, depth + 1);
    }
    return slots;
  }
  for (const part of set.parts) { expansion = 0; if (countContent(part.nodes, new Set([part.id])) !== 0) invalid("Content belongs in a page or post template, not a shared part."); }
  for (const template of set.templates) { expansion = 0; if (countContent(template.nodes, new Set()) !== 1) invalid("Each template must contain exactly one Content element."); }
  return { ...set, defaults: set.defaults ?? {}, templates: set.templates.map(template => ({ ...template, defaults: template.defaults ?? set.defaults ?? {} })) };
}

function optionalTemplateString(value: unknown) { return value === undefined || (typeof value === "string" && value.length <= 2000); }
function validTemplateDefaults(value: unknown): value is TemplateDefaults { return isRecord(value) && optionalTemplateString(value.author) && optionalTemplateString(value.category) && optionalTemplateString(value.parentPageId) && (value.tags === undefined || (Array.isArray(value.tags) && value.tags.length <= 100 && value.tags.every(item => typeof item === "string" && item.length <= 160))); }
function validDisplayDefaults(value: unknown): value is Partial<Record<DocumentDisplayField, DocumentDisplayMode>> {
  return isRecord(value) && Object.entries(value).every(([key, candidate]) => ["title", "subtitle", "coverImage", "author", "publicationDate", "readingTime"].includes(key) && ["show", "hide"].includes(candidate as string));
}

export function validateTemplateStore(value: unknown, documents?: Pick<StudioDocument, "id" | "kind">[]): TemplateStore {
  if (!isRecord(value) || !([TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_2, LEGACY_TEMPLATE_VERSION] as readonly string[]).includes(value.version as string) || !Array.isArray(value.sets) || value.sets.length > 100 || !Array.isArray(value.assignments) || value.assignments.length > 10000) invalid("Unsupported or invalid saved template data. Original data has been retained.");
  if (value.defaultTemplateIds !== undefined && (!isRecord(value.defaultTemplateIds) || (value.defaultTemplateIds.page !== undefined && !safeId(value.defaultTemplateIds.page)) || (value.defaultTemplateIds.post !== undefined && !safeId(value.defaultTemplateIds.post)))) invalid("The default template selection is invalid.");
  const store = { ...(value as unknown as TemplateStore), version: TEMPLATE_VERSION, sets: (value.sets as unknown[]).map(item => {
    if (!isRecord(item)) return item;
    const set = validateTemplateSet({ ...item, defaults: item.defaults ?? {} });
    const templates = set.templates.map(template => ({ ...template, isDefault: template.isDefault ?? (!set.templates.some(candidate => candidate.kind === template.kind && candidate.isDefault) && template.id === set.templates.find(candidate => candidate.kind === template.kind)?.id) }));
    return { ...set, templates };
  }) } as unknown as TemplateStore;
  const ids = new Set<string>();
  for (const set of store.sets) { validateTemplateSet(set); claimId(set.id, ids); }
  const assigned = new Set<string>();
  for (const assignment of store.assignments) {
    if (!isRecord(assignment) || !safeId(assignment.documentId) || assigned.has(assignment.documentId)) invalid("Invalid or duplicate template assignment.");
    const set = store.sets.find(s => s.id === assignment.setId);
    const template = set?.templates.find(t => t.id === assignment.templateId);
    if (!template || !["page", "post"].includes(template.kind)) invalid("The assigned template is missing or has the wrong kind.");
    if (documents && !documents.some(d => d.id === assignment.documentId && d.kind === assignment.kind)) invalid("A template assignment refers to a missing document.");
    assigned.add(assignment.documentId);
  }
  return { ...store, defaultTemplateIds: store.defaultTemplateIds ?? {} };
}

export function validateTemplateSnapshot(value: unknown): TemplateSnapshot {
  if (!isRecord(value) || !([TEMPLATE_VERSION, LEGACY_TEMPLATE_VERSION_2, LEGACY_TEMPLATE_VERSION] as readonly string[]).includes(value.version as string)) invalid("Unsupported published template snapshot.");
  const snapshot = { ...(value as unknown as TemplateSnapshot), version: TEMPLATE_VERSION };
  const set = validateTemplateSet(snapshot.set);
  if (!set.templates.some(t => t.id === snapshot.templateId && ["page", "post"].includes(t.kind))) invalid("Invalid published template.");
  return { ...snapshot, set };
}

/** Publication boundary validation; content-only validators remain independent. */
export function validateTemplatePublicationSnapshot(value: unknown): void {
  validatePublicationSnapshot(value);
  for (const post of (value as { posts: { templateSnapshot?: unknown; mediaIds: string[] }[] }).posts) {
    if (post.templateSnapshot !== undefined) {
      const snapshot = validateTemplateSnapshot(post.templateSnapshot);
      if (templateMediaIds(snapshot.set).some(id => !post.mediaIds.includes(id))) invalid("Published template media references are incomplete.");
    }
  }
}

export function duplicateTemplateSet(source: TemplateSet, name = `${source.name} Copy`): TemplateSet {
  validateTemplateSet(source);
  const copy = copyTemplateData(source);
  copy.id = templateId(); copy.name = name;
  const parts = new Map(copy.parts.map(part => [part.id, templateId()]));
  for (const item of [...copy.templates, ...copy.parts]) {
    item.id = parts.get(item.id) ?? templateId();
    visitTemplateNodes(item.nodes, node => { node.id = templateId(); if (node.type === "part") node.partId = parts.get(node.partId)!; });
  }
  [...copy.navigation, ...copy.socialLinks].forEach(link => { link.id = templateId(); });
  return validateTemplateSet(copy);
}

export function resolveTemplate(store: TemplateStore, document: Pick<StudioDocument, "id" | "kind">): TemplateSnapshot | undefined {
  const assignment = store.assignments.find(a => a.documentId === document.id);
  if (!assignment) return undefined;
  const set = store.sets.find(s => s.id === assignment.setId);
  if (!set || !set.templates.some(t => t.id === assignment.templateId && ["page", "post"].includes(t.kind))) return invalid("This document's template is unavailable.");
  return copyTemplateData({ version: TEMPLATE_VERSION, set, templateId: assignment.templateId });
}

export function templateMediaIds(set: TemplateSet): string[] {
  const ids = new Set<string>();
  if (set.identity.logo?.mediaId) ids.add(set.identity.logo.mediaId);
  for (const item of [...set.templates, ...set.parts]) visitTemplateNodes(item.nodes, node => { if (node.type === "image" && node.mediaId) ids.add(node.mediaId); });
  return Array.from(ids);
}

/** Projection for shared block commands only; never stored as a content document. */
export function templateEditorBlocks(nodes: TemplateNode[]): ContentBlock[] {
  return nodes.map((node): ContentBlock => node.type === "element" && node.element === "document-title"
    ? { id: node.id, type: "document-title", align: node.align }
    : node.type === "element" && node.element === "subtitle"
      ? { id: node.id, type: "document-subtitle", align: node.align }
      : node.type === "element" && node.element === "cover-image"
        ? { id: node.id, type: "cover-image", align: node.align }
        : node.type === "element" || node.type === "part"
          ? { id: node.id, type: "group", layout: "stack", children: [], data: node.type === "part" ? { templatePart: node.partId } : { templateElement: node.element, align: node.align ?? "left" } }
    : node.type === "group" || node.type === "section" ? { id: node.id, type: node.type, layout: node.layout, ...(node.type === "section" && node.role ? { role: node.role } : {}), ...pickLayoutOptions(node), children: templateEditorBlocks(node.children) } : node);
}
export function templateNodesFromBlocks(blocks: ContentBlock[]): TemplateNode[] {
  return blocks.map((block): TemplateNode => {
    if (block.type === "document-title") return { id: block.id, type: "element", element: "document-title", align: block.align ?? "left" };
    if (block.type === "document-subtitle") return { id: block.id, type: "element", element: "subtitle", align: block.align ?? "left" };
    if (block.type === "cover-image") return { id: block.id, type: "element", element: "cover-image", align: block.align ?? "left" };
    if (block.type === "group" && typeof block.data?.templatePart === "string") return { id: block.id, type: "part", partId: block.data.templatePart };
    if (block.type === "group" && typeof block.data?.templateElement === "string") return { id: block.id, type: "element", element: block.data.templateElement as TemplateElement, align: block.data.align as "left" | "centre" | "right" };
    if (block.type === "group" || block.type === "section") return { id: block.id, type: block.type, layout: block.layout, ...(block.type === "section" && block.role ? { role: block.role } : {}), ...pickLayoutOptions(block), children: templateNodesFromBlocks(block.children) };
    if (block.type === "component") return invalid("Product components are not template blocks.");
    return block;
  });
}

function pickLayoutOptions(block: LayoutOptions): LayoutOptions {
  return Object.fromEntries(Object.entries(block).filter(([key, value]) => ["horizontalAlign", "verticalAlign", "gap", "paddingX", "paddingY", "contentWidth", "columns", "stackAt"].includes(key) && value !== undefined)) as LayoutOptions;
}
