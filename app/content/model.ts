export type ProjectStatus = "Active" | "Exploring" | "Available" | "Prototype";

export type TextAlignment = "left" | "centre" | "right";
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type TextMark = "bold" | "italic" | { type: "link"; url: string };
export type RichTextRun = { text: string; marks?: TextMark[] };

export type ContentBlock =
  | { id: string; type: "paragraph"; text: string; runs?: RichTextRun[]; align?: TextAlignment }
  | { id: string; type: "heading"; level: HeadingLevel; text: string; runs?: RichTextRun[]; align?: TextAlignment }
  | { id: string; type: "quote"; text: string; runs?: RichTextRun[]; attribution?: string; align?: TextAlignment }
  | { id: string; type: "list"; style: "ordered" | "unordered"; items: string[] }
  | { id: string; type: "code"; language?: string; code: string }
  | { id: string; type: "image"; src: string; mediaId?: string; alt: string; caption?: string; wide?: boolean }
  | { id: string; type: "embed"; url: string; title: string }
  | { id: string; type: "divider" }
  | { id: string; type: "button"; label: string; url: string; style: "primary" | "secondary" };

export type Project = {
  slug: string;
  name: string;
  eyebrow: string;
  summary: string;
  description: string;
  status: ProjectStatus;
  year: string;
  url?: string;
  accent: string;
  tags: string[];
  highlights: string[];
};

export type Article = {
  slug: string;
  title: string;
  subtitle?: string;
  summary: string;
  publishedAt: string;
  displayDate: string;
  readingTime: string;
  section: "Technology" | "Excel" | "Personal";
  projectSlug?: string;
  blocks: ContentBlock[];
};
