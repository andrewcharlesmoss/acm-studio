import type { ContentBlock } from "../content/model";
import type { StudioIconName } from "./studio-icons";

export type StudioDocumentKind = "post" | "page";
export type StudioDocumentStatus = "draft" | "pending" | "private" | "published";
export type StudioCoverImage = { src: string; mediaId?: string; alt: string };

export type StudioDocument = {
  id: string;
  kind: StudioDocumentKind;
  title: string;
  subtitle?: string;
  coverImage?: StudioCoverImage | null;
  slug: string;
  excerpt: string;
  status: StudioDocumentStatus;
  /** The date/time selected for the next local publication. */
  publishAt?: string;
  publishedAt?: string;
  publishedSlug?: string;
  updatedAt: string;
  blocks: ContentBlock[];
  category?: "Technology" | "Excel" | "Personal";
  tags: string[];
  template?: "default" | "wide" | "landing";
  parentPageId?: string;
  seoTitle: string;
  seoDescription: string;
};

export type StudioWorkspace = {
  version: 2;
  activeDocumentId: string;
  documents: StudioDocument[];
};

export type InsertableBlockType = Exclude<ContentBlock["type"], "component">;

export const blockCatalogue: Array<{
  type: InsertableBlockType;
  label: string;
  description: string;
  group: "Text" | "Media" | "Design";
  icon: StudioIconName;
}> = [
  { type: "group", label: "Group", description: "Combine blocks into a stack, row or columns.", group: "Design", icon: "block" },
  { type: "section", label: "Section", description: "Create a semantic page section with nested blocks.", group: "Design", icon: "block" },
  { type: "paragraph", label: "Paragraph", description: "Start with ordinary text.", group: "Text", icon: "paragraph" },
  { type: "heading", label: "Heading", description: "Introduce a new section.", group: "Text", icon: "heading" },
  { type: "list", label: "List", description: "Create an ordered or bullet list.", group: "Text", icon: "list" },
  { type: "quote", label: "Quote", description: "Emphasise a quotation.", group: "Text", icon: "quote" },
  { type: "table", label: "Table", description: "Create structured content in rows and columns.", group: "Text", icon: "block" },
  { type: "code", label: "Code", description: "Display code or a formula.", group: "Text", icon: "code" },
  { type: "image", label: "Image", description: "Add an image by URL for now.", group: "Media", icon: "image" },
  { type: "embed", label: "Embed", description: "Link to an external resource.", group: "Media", icon: "external" },
  { type: "button", label: "Button", description: "Add a call to action.", group: "Design", icon: "button" },
  { type: "field", label: "Field", description: "Add a labelled text or select field.", group: "Design", icon: "block" },
  { type: "divider", label: "Divider", description: "Separate two sections.", group: "Design", icon: "separator" },
  { type: "spacer", label: "Spacer", description: "Add responsive empty space between blocks.", group: "Design", icon: "separator" },
];

const fixedDate = "2026-08-20T00:00:00.000Z";

export const initialStudioWorkspace: StudioWorkspace = {
  version: 2,
  activeDocumentId: "page-home",
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
      tags: [],
      template: "landing",
      seoTitle: "Andrew Charles Moss — Projects and writing",
      seoDescription: "Independent products, experiments and useful writing by Andrew Charles Moss.",
      blocks: [
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
      tags: [],
      template: "default",
      seoTitle: "About Andrew Moss",
      seoDescription: "About Andrew Moss and his independent projects.",
      blocks: [
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
      tags: ["CMS", "Building"],
      seoTitle: "Building the publishing foundation",
      seoDescription: "Why Andrew's publishing system begins with structured, portable content.",
      blocks: [
        { id: "foundation-intro", type: "paragraph", text: "The first version should prove the writing and publishing experience before it accumulates integrations and settings." },
        { id: "foundation-heading", type: "heading", level: 2, text: "Start with the content" },
        { id: "foundation-list", type: "list", style: "unordered", items: ["Pages and posts", "Portable content blocks", "A clear live preview"] },
        { id: "foundation-divider", type: "divider" },
        { id: "foundation-quote", type: "quote", text: "A coherent first version is more valuable than a catalogue of disconnected features." },
      ],
    },
  ],
};

export function cloneWorkspace(workspace: StudioWorkspace): StudioWorkspace {
  return JSON.parse(JSON.stringify(workspace)) as StudioWorkspace;
}

export function createBlock(type: InsertableBlockType, id = `${type}-${Date.now()}`): ContentBlock {
  if (type === "group") return { id, type, layout: "stack", children: [] };
  if (type === "section") return { id, type, layout: "stack", children: [] };
  if (type === "heading") return { id, type, level: 2, text: "A new section" };
  if (type === "quote") return { id, type, text: "A useful thought worth emphasising." };
  if (type === "list") return { id, type, style: "unordered", items: ["First item", "Second item"] };
  if (type === "table") return { id, type, rows: [["", "", ""], ["", "", ""]] };
  if (type === "code") return { id, type, language: "text", code: "" };
  if (type === "image") return { id, type, src: "", alt: "", caption: "" };
  if (type === "embed") return { id, type, url: "", title: "External resource" };
  if (type === "button") return { id, type, label: "Learn more", url: "#", style: "primary" };
  if (type === "field") return { id, type, control: "text", label: "Label", value: "" };
  if (type === "divider") return { id, type };
  if (type === "spacer") return { id, type, height: 32 };
  return { id, type, text: "Start writing here." };
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
    status: "draft",
    updatedAt: new Date().toISOString(),
    blocks: [createBlock("paragraph", `${id}-paragraph-1`)],
    category: kind === "post" ? "Technology" : undefined,
    tags: [],
    template: kind === "page" ? "default" : undefined,
    seoTitle: title,
    seoDescription: "",
  };
}
