export type ProjectStatus = "Active" | "Exploring" | "Available" | "Prototype";

export type TextAlignment = "left" | "centre" | "right";
export type BlockAlignment = "left" | "center" | "right" | "wide" | "full";
export type DocumentDisplayField = "title" | "subtitle" | "coverImage" | "author" | "publicationDate" | "readingTime";
export type DocumentDisplayMode = "show" | "hide";
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type InlineTextMark = "bold" | "italic" | "strikethrough" | "inline-code" | "subscript" | "superscript" | "keyboard";
export type TextMark = InlineTextMark
  | { type: "link"; url: string; opensInNewTab?: boolean }
  | { type: "highlight"; textColor?: string; backgroundColor?: string }
  | { type: "language"; language: string; direction: "ltr" | "rtl" }
  | { type: "math"; latex?: string; mathml?: string; alternativeText: string }
  | { type: "inline-image"; mediaId?: string; src?: string; alt: string; width?: number }
  | { type: "footnote"; id: string };
export type RichTextRun = { text: string; marks?: TextMark[] };
export type ListItem = string | { text: string; runs?: RichTextRun[] };
export function listItemText(item: ListItem): string { return typeof item === "string" ? item : item.text; }
export type OrderedListMarker = "1" | "A" | "a" | "I" | "i";
export type Footnote = { id: string; text: string };
export type ParagraphFontSize = "small" | "medium" | "large" | "x-large" | "xx-large";
export type ParagraphWeight = "thin" | "extra-light" | "light" | "regular" | "medium" | "semi-bold" | "bold" | "extra-bold" | "black";
export type ParagraphAppearance = ParagraphWeight | "italic" | `${Exclude<ParagraphWeight, "regular">}-italic`;
export type ParagraphBorderStyle = "none" | "solid" | "dashed" | "dotted";
export type ParagraphBackgroundGradient = "sunrise" | "ocean" | "forest" | "violet";
export type ParagraphFontFamily = "inter" | "helvetica-neue" | "helvetica" | "arial";
export type ParagraphTextTransform = "none" | "uppercase" | "lowercase" | "capitalize";
export type ParagraphTextDecoration = "none" | "underline" | "line-through";
export type ParagraphShadow = "none" | "soft" | "strong";
export type ParagraphOrientation = "horizontal-tb" | "vertical-rl";
export type SpacerUnit = "px" | "em" | "rem" | "vw" | "vh";
export function listNumber(block: { items: ListItem[]; start?: number; reversed?: boolean }, index: number): number {
  const first = block.start ?? (block.reversed ? block.items.length : 1);
  return first + (block.reversed ? -index : index);
}
export function listMarker(block: { items: ListItem[]; start?: number; reversed?: boolean; marker?: OrderedListMarker }, index: number): string {
  const number = listNumber(block, index);
  if (number < 1) return `${number}.`;
  if (block.marker === "A" || block.marker === "a") {
    let remainder = number;
    let letters = "";
    while (remainder > 0) {
      remainder -= 1;
      letters = String.fromCharCode(65 + remainder % 26) + letters;
      remainder = Math.floor(remainder / 26);
    }
    return `${block.marker === "a" ? letters.toLowerCase() : letters}.`;
  }
  if (block.marker === "I" || block.marker === "i") {
    if (number > 3999) return `${number}.`;
    let remainder = number;
    let roman = "";
    for (const [value, symbol] of [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]] as const) {
      while (remainder >= value) { roman += symbol; remainder -= value; }
    }
    return `${block.marker === "i" ? roman.toLowerCase() : roman}.`;
  }
  return `${number}.`;
}
export type ParagraphStyle = {
  fontFamily?: ParagraphFontFamily;
  fontSize?: ParagraphFontSize;
  fontSizeCustom?: string;
  appearance?: ParagraphAppearance;
  textTransform?: ParagraphTextTransform;
  textDecoration?: ParagraphTextDecoration;
  lineHeight?: string;
  letterSpacing?: string;
  textIndent?: string;
  textColumns?: number;
  dropCap?: boolean;
  fitText?: boolean;
  orientation?: ParagraphOrientation;
  minHeight?: string;
  minWidth?: string;
  textColor?: string;
  backgroundColor?: string;
  backgroundGradient?: ParagraphBackgroundGradient;
  linkColor?: string;
  padding?: string;
  margin?: string;
  borderStyle?: ParagraphBorderStyle;
  borderWidth?: string;
  borderColor?: string;
  shadow?: ParagraphShadow;
  textShadow?: ParagraphShadow;
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
export type LayoutMode = "stack" | "row" | "columns" | "grid";
export type LayoutHorizontalAlignment = "left" | "centre" | "right" | "stretch";
export type LayoutVerticalAlignment = "top" | "centre" | "bottom" | "stretch";
export type LayoutContentWidth = "full" | "constrained";
export type LayoutStackAt = "tablet" | "mobile" | "never";
export type LayoutOptions = {
  horizontalAlign?: LayoutHorizontalAlignment;
  verticalAlign?: LayoutVerticalAlignment;
  gap?: number;
  columnGap?: number;
  rowGap?: number;
  paddingX?: number;
  paddingY?: number;
  contentWidth?: LayoutContentWidth;
  columns?: number;
  minColumnWidth?: number;
  stackAt?: LayoutStackAt;
};
export type ColumnBlock = { id: string; type: "column"; width?: number; verticalAlign?: LayoutVerticalAlignment; gap?: number; columnGap?: number; rowGap?: number; style?: ParagraphStyle; children: ContentBlock[] };

export type DocumentRenderContext = {
  kind: "page" | "post";
  slug?: string;
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
export type ButtonWidth = 25 | 50 | 75 | 100;

export type SocialIconBlock = { id: string; type: "social-linkedin" | "social-tiktok"; url: string; label?: string; rel?: string; visualStyle?: ParagraphStyle };

export type ContentBlock = (
  | { id: string; type: "paragraph"; text: string; runs?: RichTextRun[]; align?: TextAlignment; blockAlign?: BlockAlignment; style?: ParagraphStyle }
  | { id: string; type: "heading"; level: HeadingLevel; text: string; runs?: RichTextRun[]; align?: TextAlignment; blockAlign?: BlockAlignment }
  | { id: string; type: "quote"; text: string; runs?: RichTextRun[]; attribution?: string; align?: TextAlignment; blockAlign?: BlockAlignment; quoteStyle?: "default" | "plain" }
  | { id: string; type: "list"; style: "ordered" | "unordered"; items: ListItem[]; marker?: OrderedListMarker; start?: number; reversed?: boolean; blockAlign?: BlockAlignment }
  | { id: string; type: "table"; rows: string[][]; hasHeader?: boolean; hasFooter?: boolean; fixedWidth?: boolean; tableStyle?: "default" | "stripes"; caption?: string; columnWidths?: number[]; rowHeights?: number[]; columnAlignments?: TextAlignment[]; blockAlign?: BlockAlignment }
  | { id: string; type: "code"; language?: string; code: string; blockAlign?: BlockAlignment }
  | { id: string; type: "image"; src: string; mediaId?: string; alt: string; caption?: string; wide?: boolean; blockAlign?: BlockAlignment; decorative?: boolean; title?: string; aspectRatio?: "original" | "square" | "portrait" | "landscape" | "wide"; scale?: "cover" | "contain"; displayWidth?: number; displayHeight?: number; focalX?: number; focalY?: number; linkUrl?: string; linkDestination?: "none" | "custom" | "media" | "lightbox"; opensInNewTab?: boolean; imageStyle?: "default" | "rounded" }
  | { id: string; type: "embed"; url: string; title: string; caption?: string; blockAlign?: BlockAlignment }
  | { id: string; type: "divider"; style?: "default" | "wide" | "dots"; tagName?: "hr" | "div"; blockAlign?: BlockAlignment }
  | { id: string; type: "footnotes"; notes: Footnote[] }
  | { id: string; type: "button"; label: string; url: string; style: "primary" | "secondary"; opensInNewTab?: boolean; align?: TextAlignment; width?: ButtonWidth; title?: string; rel?: string }
  | { id: string; type: "field"; control: ContentFieldControl; label: string; value: string; options?: string[] }
  | { id: string; type: "spacer"; height: number; heightUnit?: SpacerUnit; width?: number; widthUnit?: SpacerUnit }
  | { id: string; type: "document-title"; align?: TextAlignment; blockAlign?: BlockAlignment; level?: HeadingLevel; isLink?: boolean; linkTarget?: "_self" | "_blank"; rel?: string }
  | { id: string; type: "document-subtitle"; align?: TextAlignment }
  | { id: string; type: "cover-image"; align?: TextAlignment; blockAlign?: BlockAlignment; isLink?: boolean; linkTarget?: "_self" | "_blank"; rel?: string; aspectRatio?: "original" | "square" | "portrait" | "landscape" | "wide"; scale?: "cover" | "contain"; displayWidth?: number; displayHeight?: number; focalX?: number; focalY?: number }
  | { id: string; type: "reading-time"; prefix?: string; presentation?: ReadingTimePresentation; align?: TextAlignment }
  | { id: string; type: "post-author"; prefix?: string; avatar?: boolean; align?: TextAlignment }
  | { id: string; type: "post-date"; format?: PostDateFormat; showIcon?: boolean; align?: TextAlignment; isLink?: boolean }
  | { id: string; type: "social-icons"; children: SocialIconBlock[]; justification?: "left" | "centre" | "right" | "space-between"; orientation?: "horizontal" | "vertical"; allowWrap?: boolean; iconSize?: "small" | "normal" | "large"; socialStyle?: "default" | "logos-only" | "pill-shape"; horizontalGap?: number; verticalGap?: number; blockAlign?: Extract<BlockAlignment, "left" | "center" | "right">; showLabels?: boolean; openInNewTab?: boolean }
  | SocialIconBlock
  | ({ id: string; type: "section"; role?: SiteSectionRole; layout: LayoutMode; children: ContentBlock[]; data?: SiteComponentData; source?: SiteComponentSource } & LayoutOptions)
  | ({ id: string; type: "group"; layout: LayoutMode; children: ContentBlock[]; data?: SiteComponentData; source?: SiteComponentSource; blockAlign?: BlockAlignment; tagName?: "div" | "main" | "section" | "article" | "aside" | "header" | "footer" | "nav"; ariaLabel?: string } & LayoutOptions)
  | ({ id: string; type: "columns"; children: ColumnBlock[]; style?: ParagraphStyle; blockAlign?: BlockAlignment } & Omit<LayoutOptions, "columns" | "horizontalAlign" | "minColumnWidth">)
  | ColumnBlock
  | { id: string; type: "component"; component: SiteComponentName; data?: SiteComponentData; source?: SiteComponentSource; children?: ContentBlock[] }) & { siteRole?: SiteContentRole; visualStyle?: ParagraphStyle };

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
