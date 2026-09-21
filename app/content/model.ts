export type ProjectStatus = "Active" | "Exploring" | "Available" | "Prototype";

export type TextAlignment = "left" | "centre" | "right";
export type DocumentDisplayField = "title" | "subtitle" | "coverImage" | "author" | "publicationDate" | "readingTime";
export type DocumentDisplayMode = "show" | "hide";
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type TextMark = "bold" | "italic" | { type: "link"; url: string; opensInNewTab?: boolean };
export type RichTextRun = { text: string; marks?: TextMark[] };
export type ParagraphFontSize = "small" | "medium" | "large" | "x-large" | "xx-large";
export type ParagraphAppearance = "regular" | "italic" | "bold" | "bold-italic";
export type ParagraphBorderStyle = "none" | "solid" | "dashed";
export type ParagraphStyle = {
  fontSize?: ParagraphFontSize;
  appearance?: ParagraphAppearance;
  lineHeight?: string;
  letterSpacing?: string;
  textColor?: string;
  backgroundColor?: string;
  linkColor?: string;
  padding?: string;
  margin?: string;
  borderStyle?: ParagraphBorderStyle;
  borderWidth?: string;
  borderColor?: string;
  borderRadius?: string;
  anchor?: string;
  className?: string;
};

export type SiteComponentName =
  | "mini-golf-account"
  | "mini-golf-setup"
  | "mini-golf-scorecard"
  | "mini-golf-leaderboard"
  | "mini-golf-share";
export type SiteComponentData = Record<string, string | number | boolean | string[]>;
export type SiteComponentSource = {
  module: string;
  exportName: string;
  revision: string;
};
export type SiteSectionRole = "account" | "setup" | "scorecard" | "leaderboard" | "share"
  | "hero" | "hero-copy" | "account-copy" | "scorecard-heading" | "scorecard-actions"
  | "leaderboard-card" | "leaderboard-score" | "leaderboard-metrics" | "metric"
  | "footer" | "footer-brand" | "footer-links" | "social-link";
export type SiteContentRole = "logo" | "title" | "eyebrow" | "status" | "progress" | "table-size" | "auto-resize" | "new-game" | "holes" | "players" | "reset-scores" | "export-excel" | "export-image" | "export-html" | "metric-average" | "metric-deviation" | "metric-holes"
  | "player-name" | "score-value" | "score-label" | "metric-label" | "metric-value"
  | "footer-name" | "copyright" | "social-icon" | "social-action";
export type ContentFieldControl = "text" | "select";
export type LayoutMode = "stack" | "row" | "columns";
export type LayoutHorizontalAlignment = "left" | "centre" | "right" | "stretch";
export type LayoutVerticalAlignment = "top" | "centre" | "bottom" | "stretch";
export type LayoutContentWidth = "full" | "constrained";
export type LayoutStackAt = "tablet" | "mobile" | "never";
export type LayoutOptions = {
  horizontalAlign?: LayoutHorizontalAlignment;
  verticalAlign?: LayoutVerticalAlignment;
  gap?: number;
  paddingX?: number;
  paddingY?: number;
  contentWidth?: LayoutContentWidth;
  columns?: number;
  stackAt?: LayoutStackAt;
};

export type DocumentRenderContext = {
  kind: "page" | "post";
  title?: string;
  subtitle?: string;
  coverImage?: { src: string; alt: string } | null;
  author?: string;
  publishAt?: string;
  publishedAt?: string;
  displayOverrides?: Partial<Record<DocumentDisplayField, DocumentDisplayMode>>;
};

export type ReadingTimePresentation = "badge" | "plain";
export type PostDateFormat = "long" | "short" | "iso";

export type ContentBlock = (
  | { id: string; type: "paragraph"; text: string; runs?: RichTextRun[]; align?: TextAlignment; style?: ParagraphStyle }
  | { id: string; type: "heading"; level: HeadingLevel; text: string; runs?: RichTextRun[]; align?: TextAlignment }
  | { id: string; type: "quote"; text: string; runs?: RichTextRun[]; attribution?: string; align?: TextAlignment }
  | { id: string; type: "list"; style: "ordered" | "unordered"; items: string[] }
  | { id: string; type: "table"; rows: string[][]; hasHeader?: boolean; hasFooter?: boolean; columnWidths?: number[]; rowHeights?: number[] }
  | { id: string; type: "code"; language?: string; code: string }
  | { id: string; type: "image"; src: string; mediaId?: string; alt: string; caption?: string; wide?: boolean }
  | { id: string; type: "embed"; url: string; title: string }
  | { id: string; type: "divider" }
  | { id: string; type: "button"; label: string; url: string; style: "primary" | "secondary" }
  | { id: string; type: "field"; control: ContentFieldControl; label: string; value: string; options?: string[] }
  | { id: string; type: "spacer"; height: number }
  | { id: string; type: "document-title"; align?: TextAlignment }
  | { id: string; type: "document-subtitle"; align?: TextAlignment }
  | { id: string; type: "cover-image"; align?: TextAlignment }
  | { id: string; type: "reading-time"; prefix?: string; presentation?: ReadingTimePresentation; align?: TextAlignment }
  | { id: string; type: "post-author"; prefix?: string; avatar?: boolean; align?: TextAlignment }
  | { id: string; type: "post-date"; format?: PostDateFormat; showIcon?: boolean; align?: TextAlignment }
  | ({ id: string; type: "section"; role?: SiteSectionRole; layout: LayoutMode; children: ContentBlock[]; data?: SiteComponentData; source?: SiteComponentSource } & LayoutOptions)
  | ({ id: string; type: "group"; layout: LayoutMode; children: ContentBlock[]; data?: SiteComponentData; source?: SiteComponentSource } & LayoutOptions)
  | { id: string; type: "component"; component: SiteComponentName; data?: SiteComponentData; source?: SiteComponentSource; children?: ContentBlock[] }) & { siteRole?: SiteContentRole };

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
  author?: string;
  section: string;
  projectSlug?: string;
  blocks: ContentBlock[];
};

export const DEFAULT_TABLE_ROW_HEIGHT = 42;
const MINIMUM_TABLE_COLUMN_WIDTH = 6;

export function normaliseTableColumnWidths(columnCount: number, widths?: number[]) {
  if (!widths || widths.length !== columnCount || widths.some((width) => !Number.isFinite(width) || width <= 0)) {
    return Array.from({ length: columnCount }, () => 100 / columnCount);
  }

  const total = widths.reduce((sum, width) => sum + width, 0);
  return widths.map((width) => (width / total) * 100);
}

export function resizeTableColumn(widths: number[], index: number, amount: number) {
  const next = [...widths];
  const pairTotal = next[index] + next[index + 1];
  const minimum = Math.min(MINIMUM_TABLE_COLUMN_WIDTH, pairTotal / 2);
  const resizedWidth = Math.min(Math.max(next[index] + amount, minimum), pairTotal - minimum);
  next[index] = resizedWidth;
  next[index + 1] = pairTotal - resizedWidth;
  return next;
}

// Keep the table within its canvas while sharing the remaining width among
// the other columns, without allowing any of them to collapse.
export function fitTableColumn(widths: number[], index: number, desiredWidth: number) {
  if (widths.length === 1) return [100];
  const minimum = Math.min(MINIMUM_TABLE_COLUMN_WIDTH, 100 / widths.length);
  const fitted = Math.max(minimum, Math.min(desiredWidth, 100 - minimum * (widths.length - 1)));
  const flexibleWidths = widths.map((width, i) => i === index ? 0 : Math.max(0, width - minimum));
  const flexibleTotal = flexibleWidths.reduce((total, width) => total + width, 0);
  const remaining = 100 - fitted - minimum * (widths.length - 1);
  return widths.map((_, i) => i === index ? fitted : minimum + remaining * (flexibleTotal ? flexibleWidths[i] / flexibleTotal : 1 / (widths.length - 1)));
}

export function normaliseTableRowHeights(rowCount: number, heights?: number[]) {
  return Array.from({ length: rowCount }, (_, index) => Math.max(DEFAULT_TABLE_ROW_HEIGHT, heights?.[index] ?? DEFAULT_TABLE_ROW_HEIGHT));
}
