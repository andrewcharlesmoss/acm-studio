import { createGroupVariation, groupVariations, isGroupVariation, type GroupVariationType } from "./blocks/group-variations";
import type { ContentBlock, DocumentDisplayField, DocumentDisplayMode } from "../content/model";
import { createColumnsBlock } from "../content/columns";
import { createButtonForInsertion } from "./button-insertion";
import type { LocallyPublishedArticle } from "../content/local-publishing";
import type { TemplateAssignment } from "./template-model";
import { paragraphBlockDefinition } from "./blocks/paragraph/definition";
import { coreSocialServices, socialServiceFromInsertType, socialServiceInsertType, type SocialServiceInsertType } from "../content/social-services";

export type StudioDocumentKind = "post" | "page";
export type StudioDocumentStatus = "draft" | "pending" | "private" | "scheduled" | "published";
export type StudioPasswordProtection = { salt: string; hash: string };
export type StudioCoverImage = { src: string; mediaId?: string; alt: string };
export type StudioCategory = { id: string; name: string; parentId?: string };
export type StudioDocument = {
  id: string;
  kind: StudioDocumentKind;
  title: string;
  subtitle?: string;
  coverImage?: StudioCoverImage | null;
  slug: string;
  excerpt: string;
  author?: string;
  /** Set only on a publication projection created after metadata became blocks. */
  metadataBlocksVersion?: 2;
  /** Marks conversion of the former fixed title/subtitle/cover shell. */
  documentShellVersion?: 1;
  status: StudioDocumentStatus;
  passwordProtection?: StudioPasswordProtection | null;
  sticky?: boolean;
  /** The date/time selected for the next local publication. */
  publishAt?: string;
  publishedAt?: string;
  publishedSlug?: string;
  updatedAt: string;
  blocks: ContentBlock[];
  /** Selected category terms. The legacy category field mirrors the primary term. */
  categoryIds?: string[];
  category?: string;
  tags: string[];
  /** True means the document owns the value; false means it follows its template default. */
  templateOverrides?: { author?: boolean; category?: boolean; tags?: boolean; parentPageId?: boolean };
  /** Explicit presentation choices are separate from the stored field values. */
  displayOverrides?: Partial<Record<DocumentDisplayField, DocumentDisplayMode>>;
  template?: "default" | "wide" | "landing";
  parentPageId?: string;
  /** Numeric page ordering used by Site Editor's Pages view; zero is the default. */
  pageOrder?: number;
  seoTitle: string;
  seoDescription: string;
};

export type StudioWorkspace = {
  version: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60 | 61 | 62 | 63;
  documentRevisions?: import("./document-revisions").DocumentRevision[];
  /** Empty when the workspace has no pages or posts. */
  activeDocumentId: string;
  documents: StudioDocument[];
  bin: StudioBinnedDocument[];
  categories: StudioCategory[];
};

export type StudioBinnedDocument = {
  id: string;
  deletedAt: string;
  document: StudioDocument;
  assignment?: TemplateAssignment;
  publication?: LocallyPublishedArticle;
};


export type InsertableBlockType = Exclude<ContentBlock["type"], "component" | "footnotes" | "column" | "social-link" | "post-template" | "no-results"> | GroupVariationType | SocialServiceInsertType;
export type BlockLibraryItemType = InsertableBlockType | "template-content" | "navigation" | "page-link" | "navigation-page-list" | "site-title";

export const FEATURED_IMAGE_LABEL = "Featured Image";
export const blockCatalogueGroups = ["Text", "Media", "Design", "Widgets", "Theme", "Embeds", "Other"] as const;
export type BlockCatalogueGroup = (typeof blockCatalogueGroups)[number];

export const blockCatalogue: Array<{
  type: BlockLibraryItemType;
  label: string;
  description: string;
  group: BlockCatalogueGroup;
}> = [
  { type: paragraphBlockDefinition.type, label: paragraphBlockDefinition.label, description: paragraphBlockDefinition.description, group: "Text" },
  { type: "heading", label: "Heading", description: "Organise content into clear sections for visitors and search engines.", group: "Text" },
  { type: "list", label: "List", description: "An organised collection of items displayed in a specific order.", group: "Text" },
  { type: "quote", label: "Quote", description: "Emphasise a quotation.", group: "Text" },
  { type: "pullquote", label: "Pullquote", description: "Highlight a quotation with a prominent pullquote style.", group: "Text" },
  { type: "code", label: "Code", description: "Display code or a formula.", group: "Text" },
  { type: "table", label: "Table", description: "Create structured content in rows and columns to display information.", group: "Text" },
  { type: "image", label: "Image", description: "Insert an image to make a visual statement.", group: "Media" },
  { type: "video", label: "Video", description: "Add a video with playback controls.", group: "Media" },
  { type: "cover", label: "Cover", description: "Add text over an image to create a visual statement.", group: "Media" },
  { type: "buttons", label: "Buttons", description: "Prompt visitors to take action with a group of buttons.", group: "Design" },
  { type: "button", label: "Button", description: "Add a call to action.", group: "Design" },
  { type: "columns", label: "Columns", description: "Arrange blocks in adjustable, responsive columns.", group: "Design" },
  ...groupVariations.filter(variation => variation.type !== "details").map(variation => ({ type: variation.type, label: variation.label, description: variation.description, group: "Design" as const })),
  { type: "separator", label: "Separator", description: "Separate two sections.", group: "Design" },
  { type: "spacer", label: "Spacer", description: "Add responsive empty space between blocks.", group: "Design" },
  { type: "social-icons", label: "Social Icons", description: "Add links to your social profiles.", group: "Widgets" },
  { type: "title", label: "Title", description: "Display the current page or post title.", group: "Theme" },
  { type: "cover-image", label: FEATURED_IMAGE_LABEL, description: "Display the document featured image.", group: "Theme" },
  { type: "author-name", label: "Author Name", description: "Show the document author when one is set.", group: "Theme" },
  { type: "post-date", label: "Post Date", description: "Show the document publication date.", group: "Theme" },
  { type: "query-loop", label: "Query Loop", description: "Display posts that match a site query.", group: "Theme" },
  { type: "embed", label: "Embed", description: "Add a block that displays content from other sites, like YouTube, Vimeo, Spotify, or Mixcloud.", group: "Embeds" },
  { type: "section", label: "Section", description: "Create a semantic page section with nested blocks.", group: "Other" },
  { type: "field", label: "Field", description: "Add a labelled text or select field.", group: "Other" },
  { type: "time-to-read", label: "Time to Read", description: "Show the calculated reading time for this document.", group: "Other" },
  { type: "subtitle", label: "Subtitle", description: "Display the current page or post subtitle.", group: "Other" },
];

export const socialIconCatalogue: typeof blockCatalogue = [
  ...coreSocialServices.map(service => ({ type: socialServiceInsertType(service.id), label: service.label, description: `Add a ${service.label} social link.`, group: "Widgets" as const })),
];

/**
 * Blocks available in ordinary page and post editing. Social networks are
 * added through Social Icons; semantic Sections use a Group's element setting.
 */
export const contentEditorBlockCatalogue = blockCatalogue.filter(item =>
  item.type !== "section" && item.type !== "field" && item.type !== "query-loop",
);

/** Template authoring retains its ACM structural blocks but uses Social Icons for networks. */
export const templateEditorBlockCatalogue = blockCatalogue;

export const templateContentBlock = {
  type: "template-content" as const,
  label: "Content",
  description: "Show the body supplied by each document.",
  group: "Theme" as const,
};

export const templateSiteTitleBlock = {
  type: "site-title" as const,
  label: "Site Title",
  description: "Display the name of this site.",
  group: "Theme" as const,
};

export const templateNavigationBlock = {
  type: "navigation" as const,
  label: "Navigation",
  description: "Help visitors get around your site with links and submenus.",
  group: "Theme" as const,
};

/** A Navigation child authoring entry, not a document body block. */
export const templatePageLinkBlock = {
  type: "page-link" as const,
  label: "Page link",
  description: "Add an editable page or URL link to Navigation.",
  group: "Theme" as const,
};

export const templateNavigationPageListBlock = {
  type: "navigation-page-list" as const,
  label: "Page List",
  description: "Display a list of this site’s pages in Navigation.",
  group: "Theme" as const,
};

const fixedDate = "2026-08-20T00:00:00.000Z";

/** Transient editor context used when previewing a template without content. */
export function createWorkspacePreviewDocument(kind: StudioDocumentKind, id = "studio-empty-preview"): StudioDocument {
  return {
    id,
    kind,
    title: "",
    subtitle: "",
    slug: "",
    excerpt: "",
    status: "draft",
    updatedAt: fixedDate,
    blocks: [],
    tags: [],
    seoTitle: "",
    seoDescription: "",
  };
}

export const initialStudioWorkspace: StudioWorkspace = {
  version: 63,
  activeDocumentId: "page-home",
  bin: [],
  categories: [{ id: "category-uncategorised", name: "Uncategorised" }, { id: "category-technology", name: "Technology" }],
  documents: [
    {
      id: "page-home",
      kind: "page",
      title: "Home",
      subtitle: "",
      slug: "home",
      excerpt: "The project-led home of Andrew Charles Moss.",
      status: "draft",
      updatedAt: fixedDate,
      documentShellVersion: 1,
      tags: [],
      template: "landing",
      seoTitle: "Andrew Charles Moss — Projects and writing",
      seoDescription: "Independent products, experiments and useful writing by Andrew Charles Moss.",
      blocks: [
        { id: "page-home-document-title", type: "title" },
        { id: "page-home-document-subtitle", type: "subtitle" },
        { id: "page-home-cover-image", type: "cover-image" },
        { id: "home-heading", type: "heading", level: 2, text: "I make focused products and document the thinking behind them." },
        { id: "home-intro", type: "paragraph", text: "This is the home of my active projects, smaller experiments and a writing archive built over many years." },
        { id: "home-button", type: "button", label: "Explore the projects", url: "/projects", style: "primary" },
      ],
    },
    {
      id: "page-about",
      kind: "page",
      title: "About",
      subtitle: "",
      slug: "about",
      excerpt: "A concise introduction to Andrew and the work.",
      status: "draft",
      updatedAt: fixedDate,
      documentShellVersion: 1,
      tags: [],
      template: "default",
      seoTitle: "About Andrew Moss",
      seoDescription: "About Andrew Moss and his independent projects.",
      blocks: [
        { id: "page-about-document-title", type: "title" },
        { id: "page-about-document-subtitle", type: "subtitle" },
        { id: "page-about-cover-image", type: "cover-image" },
        { id: "about-heading", type: "heading", level: 2, text: "Useful things, made with care." },
        { id: "about-copy", type: "paragraph", text: "I build focused products and experiments, usually because a small question has become too interesting to leave alone." },
        { id: "about-quote", type: "quote", text: "The useful part should remain visible.", attribution: "Andrew Moss" },
      ],
    },
    {
      id: "post-foundation",
      kind: "post",
      title: "Building the publishing foundation",
      subtitle: "",
      slug: "building-publishing-foundation",
      excerpt: "Why the first version begins with portable blocks and a narrow editorial workflow.",
      status: "draft",
      updatedAt: fixedDate,
      category: "Technology",
      categoryIds: ["category-technology"],
      author: "Andrew Moss",
      documentShellVersion: 1,
      tags: ["CMS", "Building"],
      seoTitle: "Building the publishing foundation",
      seoDescription: "Why Andrew's publishing system begins with structured, portable content.",
      blocks: [
        { id: "post-foundation-document-title", type: "title" },
        { id: "post-foundation-document-subtitle", type: "subtitle" },
        { id: "post-foundation-cover-image", type: "cover-image" },
        { id: "foundation-reading-time", type: "time-to-read", prefix: "Reading Time:", presentation: "badge" },
        { id: "foundation-post-details", type: "group", layout: "row", gap: 16, stackAt: "mobile", children: [
          { id: "foundation-post-author", type: "author-name", prefix: "By", avatar: true },
          { id: "foundation-post-date", type: "post-date", format: "long", showIcon: true },
        ] },
        { id: "foundation-intro", type: "paragraph", text: "The first version should prove the writing and publishing experience before it accumulates integrations and settings." },
        { id: "foundation-heading", type: "heading", level: 2, text: "Start with the content" },
        { id: "foundation-list", type: "list", style: "unordered", items: ["Pages and posts", "Portable content blocks", "A clear live preview"] },
        { id: "foundation-divider", type: "separator" },
        { id: "foundation-quote", type: "quote", text: "A coherent first version is more valuable than a catalogue of disconnected features." },
      ],
    },
  ],
};

export function cloneWorkspace(workspace: StudioWorkspace): StudioWorkspace {
  return JSON.parse(JSON.stringify(workspace)) as StudioWorkspace;
}

export function createBlock(type: InsertableBlockType, id = `${type}-${Date.now()}`): ContentBlock {
  const socialService = socialServiceFromInsertType(type);
  if (socialService) return { id, type: "social-link", service: socialService, url: "" };
  if (type === "paragraph") return paragraphBlockDefinition.create(id);
  if (type === "social-icons") return { id, type, children: [] };
  if (type === "social-linkedin" || type === "social-tiktok") return { id, type, url: "" };
  if (isGroupVariation(type)) return createGroupVariation(type, id);
  if (type === "columns") return createColumnsBlock(id);
  if (type === "section") return { id, type, layout: "stack", children: [] };
  if (type === "heading") return { id, type, level: 2, text: "" };
  if (type === "pullquote") return { id, type, text: "A useful thought worth emphasising.", align: "centre", quoteStyle: "plain" };
  if (type === "quote") return { id, type, text: "", children: [{ id: `${id}-paragraph`, type: "paragraph", text: "A useful thought worth emphasising." }] };
  if (type === "list") return { id, type, style: "unordered", items: ["First item", "Second item"] };
  if (type === "table") return { id, type, rows: [] };
  if (type === "code") return { id, type, language: "text", code: "" };
  if (type === "image") return { id, type, src: "", alt: "", caption: "" };
  if (type === "video") return { id, type, src: "", controls: true, preload: "metadata" };
  if (type === "cover") return { id, type, src: "", alt: "", dimRatio: 50, children: [] };
  if (type === "embed") return { id, type, url: "", title: "External resource" };
  if (type === "buttons") return { id, type, children: [createBlock("button", `${id}-button`) as Extract<ContentBlock, { type: "button" }>], justification: "left", orientation: "horizontal", allowWrap: true };
  if (type === "button") return createButtonForInsertion(id);
  if (type === "field") return { id, type, control: "text", label: "Label", value: "" };
  if (type === "separator") return { id, type };
  if (type === "spacer") return { id, type, height: 32 };
  if (type === "title") return { id, type };
  if (type === "subtitle") return { id, type };
  if (type === "cover-image") return { id, type };
  if (type === "time-to-read") return { id, type, prefix: "Reading Time:", presentation: "badge" };
  if (type === "author-name") return { id, type, prefix: "By", avatar: true };
  if (type === "post-date") return { id, type, format: "long", showIcon: true };
  if (type === "query-loop") return { id, type, count: 4, order: "desc", stickyFirst: true, children: [
    { id: `${id}-post-template`, type: "post-template", children: [
      { id: `${id}-title`, type: "title", level: 2, isLink: true },
      { id: `${id}-date`, type: "post-date", format: "long", isLink: true },
    ] },
    { id: `${id}-no-results`, type: "no-results", children: [{ id: `${id}-empty`, type: "paragraph", text: "Sorry, but nothing was found. Please try a search with different keywords." }] },
  ] };
  return { id, type: "paragraph", text: "Start writing here." };
}

export function createPostStarterBlocks(id: string): ContentBlock[] {
  return [
    createBlock("time-to-read", `${id}-reading-time`),
    { id: `${id}-post-details`, type: "group", layout: "row", gap: 16, stackAt: "mobile", children: [
      createBlock("author-name", `${id}-post-author`),
      createBlock("post-date", `${id}-post-date`),
    ] },
    createBlock("paragraph", `${id}-paragraph-1`),
  ];
}

export function createDocumentShellBlocks(id: string): ContentBlock[] {
  return [
    createBlock("title", `${id}-document-title`),
    createBlock("subtitle", `${id}-document-subtitle`),
    createBlock("cover-image", `${id}-cover-image`),
  ];
}

export function createDocument(kind: StudioDocumentKind, id = `${kind}-${Date.now()}`): StudioDocument {
  const title = kind === "page" ? "Untitled page" : "Untitled post";
  return {
    id,
    kind,
    title,
    subtitle: "",
    slug: kind === "page" ? "untitled-page" : "untitled-post",
    excerpt: "",
    author: kind === "post" ? "Andrew Moss" : undefined,
    status: "draft",
    updatedAt: new Date().toISOString(),
    blocks: [...createDocumentShellBlocks(id), ...(kind === "post" ? createPostStarterBlocks(id) : [createBlock("paragraph", `${id}-paragraph-1`)])],
    category: kind === "post" ? "Technology" : undefined,
    categoryIds: kind === "post" ? ["category-technology"] : undefined,
    tags: [],
    template: kind === "page" ? "default" : undefined,
    seoTitle: title,
    seoDescription: "",
  };
}

/** A document created from a template owns its body, but starts with no personal content. */
export function createDocumentFromTemplate(kind: StudioDocumentKind, id = `${kind}-${Date.now()}`): StudioDocument {
  const title = kind === "page" ? "Untitled page" : "Untitled post";
  return {
    id, kind, title, subtitle: "", slug: kind === "page" ? "untitled-page" : "untitled-post", excerpt: "", status: "draft",
    updatedAt: new Date().toISOString(), blocks: [], tags: [], templateOverrides: { author: false, category: false, tags: false, parentPageId: false },
    seoTitle: "", seoDescription: "",
  };
}
