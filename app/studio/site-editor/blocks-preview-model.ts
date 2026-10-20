import { editableViewportStyle, replaceViewportStyle, RESPONSIVE_STYLE_FIELDS, type StyleViewport } from "../../content/responsive-styles";
import { paragraphStyleToCss } from "../../content/paragraph-styles";
import type { ContentBlock, ParagraphStyle } from "../../content/model";

/** Only the block families already demonstrated by the Style Book. */
export const previewBlockTargets = [
  { id: "paragraph", type: "paragraph", label: "Paragraph", example: "paragraph" },
  { id: "image", type: "image", label: "Image", example: "image" },
  { id: "heading", type: "heading", label: "Heading", example: "headings" },
  { id: "list", type: "list", label: "List", example: "list" },
  { id: "quote", type: "quote", label: "Quote", example: "quote" },
  { id: "button", type: "button", label: "Button", example: "buttons" },
  { id: "buttons", type: "buttons", label: "Buttons", example: "buttons" },
  { id: "code", type: "code", label: "Code", example: "code" },
  { id: "pullquote", type: "quote", label: "Pullquote", example: "pullquote" },
  { id: "search", type: "paragraph", label: "Search", example: "search" },
  { id: "divider", type: "divider", label: "Separator", example: "separator" },
  { id: "table", type: "table", label: "Table", example: "table" },
] as const;
export type PreviewBlockId = typeof previewBlockTargets[number]["id"];
export type PreviewBlockExtras = {
  previewVariant?: string; websiteFont?: string; websitePreset?: string; websiteWeight?: number; websiteItalic?: boolean;
  textAlign?: "left" | "center" | "right" | "justify"; indentAll?: boolean;
  blockGap?: string; rowGap?: string; columnGap?: string; buttonWidth?: string;
  shadowPreset?: string; customShadows?: import("./shadows-preview-model").PreviewShadowLayer[]; headingColor?: string; duotone?: { dark: string; light: string } | null;
  enlargeOnClick?: boolean; backgroundImage?: import("./identity-preview-state").IdentityImage | null;
  imageSize?: "cover" | "contain" | "tile"; imageRepeat?: boolean; imageFocalX?: number; imageFocalY?: number;
};
export type PreviewBlockStyle = ParagraphStyle & PreviewBlockExtras & {
  previewResponsive?: Partial<Record<"tablet" | "mobile", PreviewBlockExtras>>;
  variations?: Record<string, PreviewBlockStyle>;
};
export type PreviewBlockStyles = Partial<Record<PreviewBlockId, PreviewBlockStyle>>;
export function editablePreviewBlockStyle(style: PreviewBlockStyle = {}, viewport: StyleViewport): PreviewBlockStyle {
  const values: PreviewBlockStyle = viewport === "desktop" ? { ...style } : { ...editableViewportStyle(style, viewport), ...style.previewResponsive?.[viewport] };
  delete values.responsive; delete values.previewResponsive; delete values.variations;
  return values;
}
export function effectivePreviewBlockStyle(style: PreviewBlockStyle = {}, viewport: StyleViewport): PreviewBlockStyle {
  return mergeStyleFields(editablePreviewBlockStyle(style, "desktop"), viewport === "desktop" ? {} : editablePreviewBlockStyle(style, viewport));
}
export function replacePreviewBlockStyle(current: PreviewBlockStyle, viewport: StyleViewport, values: PreviewBlockStyle): PreviewBlockStyle {
  if (viewport === "desktop") return { ...values, ...(current.responsive ? { responsive: current.responsive } : {}), ...(current.previewResponsive ? { previewResponsive: current.previewResponsive } : {}), ...(current.variations ? { variations: current.variations } : {}) };
  const canonical = Object.fromEntries(Object.entries(values).filter(([key]) => RESPONSIVE_STYLE_FIELDS.includes(key as typeof RESPONSIVE_STYLE_FIELDS[number])));
  const deviceExtras = new Set(['websiteFont','websitePreset','websiteWeight','websiteItalic','textAlign','indentAll','blockGap','rowGap','columnGap','buttonWidth','shadowPreset','customShadows','headingColor','duotone']);
  const extras = Object.fromEntries(Object.entries(values).filter(([key]) => deviceExtras.has(key)));
  const result: PreviewBlockStyle = replaceViewportStyle(current, viewport, canonical) ?? {};
  const previewResponsive = { ...current.previewResponsive };
  if (Object.keys(extras).length) previewResponsive[viewport] = extras; else delete previewResponsive[viewport];
  if (Object.keys(previewResponsive).length) result.previewResponsive = previewResponsive; else delete result.previewResponsive;
  return result;
}
export function variantPreviewDefaults(id: string): PreviewBlockStyle {
  if (id === "display") return { fontSizeCustom: "clamp(2.2rem, calc(1.9334rem + 1.333cqw), 3.5rem)", lineHeight: "1.2" };
  if (id === "subtitle") return { fontSizeCustom: "clamp(1.5rem, calc(1.4216rem + .392cqw), 1.75rem)", lineHeight: "1.2" };
  if (id === "annotation") return { websitePreset: "small", lineHeight: "1.5", borderColor: "currentColor", borderStyle: "solid", borderWidth: "1px", borderRadius: "16px", padding: ".2rem .6rem .25rem", linkColor: undefined };
  if (id === "rounded") return { borderRadius: "9999px" };
  return {};
}
export function resolvePreviewBlockVariant(style: PreviewBlockStyle = {}, variant?: string): PreviewBlockStyle {
  return variant ? { ...mergePreviewBlockStyles({paragraph: mergePreviewBlockStyles({paragraph: style}, {paragraph: variantPreviewDefaults(variant)}).paragraph}, {paragraph: style.variations?.[variant]}).paragraph, previewVariant: variant } : style;
}


function mergeStyleFields(global: PreviewBlockStyle = {}, local: PreviewBlockStyle = {}): PreviewBlockStyle {
  const merged = { ...global, ...local };
  if (local.websitePreset) { delete merged.fontSize; delete merged.fontSizeCustom; }
  if (local.fontSizeCustom || local.fontSize) delete merged.websitePreset;
  if (local.websiteFont) delete merged.fontFamily;
  if (local.fontFamily) delete merged.websiteFont;
  if (local.websiteWeight !== undefined) delete merged.appearance;
  if (local.appearance) { delete merged.websiteWeight; delete merged.websiteItalic; }
  if (local.fontSize) delete merged.fontSizeCustom;
  if (local.fontSizeCustom) delete merged.fontSize;
  if (local.backgroundColor && !local.backgroundGradient) delete merged.backgroundGradient;
  if (local.backgroundGradient && !local.backgroundColor) delete merged.backgroundColor;
  return merged;
}

export function mergePreviewBlockStyles(global: PreviewBlockStyles = {}, local: PreviewBlockStyles = {}): PreviewBlockStyles {
  return Object.fromEntries([...new Set([...Object.keys(global), ...Object.keys(local)])].map(key => {
    const id = key as PreviewBlockId;
    const merged = mergeStyleFields(global[id], local[id]);
    if (global[id]?.previewResponsive || local[id]?.previewResponsive) merged.previewResponsive = { tablet: mergeStyleFields(global[id]?.previewResponsive?.tablet, local[id]?.previewResponsive?.tablet), mobile: mergeStyleFields(global[id]?.previewResponsive?.mobile, local[id]?.previewResponsive?.mobile) };
    if (global[id]?.variations || local[id]?.variations) {
      merged.variations = {};
      for (const variant of new Set([...Object.keys(global[id]?.variations ?? {}), ...Object.keys(local[id]?.variations ?? {})])) merged.variations[variant] = mergePreviewBlockStyles({ [id]: global[id]?.variations?.[variant] }, { [id]: local[id]?.variations?.[variant] })[id]!;
    }
    if (global[id]?.responsive || local[id]?.responsive) {
      merged.responsive = {};
      for (const device of ["tablet", "mobile"] as const) {
        const values = mergeStyleFields(global[id]?.responsive?.[device], local[id]?.responsive?.[device]);
        if (Object.keys(values).length) merged.responsive[device] = values;
      }
    }
    return [id, merged];
  }));
}

/** Patch only locally authored device fields; inherited siblings remain unowned. */
export function patchPreviewBlockViewport(current: PreviewBlockStyle = {}, viewport: StyleViewport, patch: Partial<PreviewBlockStyle>): PreviewBlockStyle {
  return replacePreviewBlockStyle(current, viewport, patchPreviewBlockStyle(editablePreviewBlockStyle(current, viewport), patch));
}

/** Removed inspector fields resume inheritance; unchanged inherited fields stay unowned. */
export function previewBlockStyleDelta(before: PreviewBlockStyle, after: PreviewBlockStyle): Partial<PreviewBlockStyle> {
  return Object.fromEntries([...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => JSON.stringify(before[key as keyof PreviewBlockStyle]) !== JSON.stringify(after[key as keyof PreviewBlockStyle])).map(key => [key, after[key as keyof PreviewBlockStyle]]));
}
export function patchPreviewBlockStyle(current: PreviewBlockStyle = {}, patch: Partial<PreviewBlockStyle>): PreviewBlockStyle {
  const result = { ...current, ...patch };
  for (const field of Object.keys(result) as (keyof PreviewBlockStyle)[]) if (result[field] === undefined) delete result[field];
  return result;
}
export function blockPreviewStyle(block: ContentBlock): ParagraphStyle {
  return block.type === "paragraph" ? block.style ?? {} : block.visualStyle ?? {};
}

function projectedStyle(defaults: PreviewBlockStyle, authored: ParagraphStyle = {}): ParagraphStyle {
  const style = mergeStyleFields(defaults, authored);
  // The book's role rules must yield to these properties on canonical wrappers.
  const authoredMarkers = Object.keys(paragraphStyleToCss(authored)).map(property => `site-block-authored-${property.replace(/[A-Z]/g, character => `-${character.toLowerCase()}`)}`);
  const markers = [...authoredMarkers, style.textTransform && "site-block-style-transform", style.textDecoration && "site-block-style-decoration"].filter(Boolean);
  if (markers.length) style.className = [style.className, ...markers].filter(Boolean).join(" ");
  return style;
}

/** Project shared defaults into fresh canonical blocks, preserving authored content styles. */
export function applyPreviewBlockStyles(blocks: ContentBlock[], styles: PreviewBlockStyles = {}): ContentBlock[] {
  return blocks.map(source => {
    const id = source.type === "quote" && source.quoteStyle === "plain" ? "pullquote" : source.type;
    const defaults = styles[id as PreviewBlockId] ?? (id === "code" ? { websiteFont: '"TT5 Fira Code", monospace' } : undefined);
    const marker = `site-block-style-${id}`;
    let block = defaults ? source.type === "paragraph" ? { ...source, style: projectedStyle(defaults, source.style) } : { ...source, visualStyle: projectedStyle(defaults, source.visualStyle) } : { ...source };
    if (defaults) {
      const style = block.type === "paragraph" ? block.style! : block.visualStyle!;
      style.className = [style.className, marker].filter(Boolean).join(" ");
    }
    if (block.type === "image" && defaults?.enlargeOnClick !== undefined) block = { ...block, linkDestination: defaults.enlargeOnClick ? "lightbox" : "none" };
    if (block.type === "quote" && defaults?.previewVariant === "plain") block = { ...block, quoteStyle: "plain" };
    if (block.type === "table" && defaults?.previewVariant === "stripes") block = { ...block, tableStyle: "stripes" };
    if (block.type === "divider" && defaults?.previewVariant) block = { ...block, style: defaults.previewVariant === "dots" ? "dots" : "wide" };
    if (block.type === "button" && defaults?.previewVariant === "outline") block = { ...block, style: "secondary" };
    if (block.type === "image" && defaults?.previewVariant === "rounded") block = { ...block, imageStyle: "rounded" };

    if (block.type === "buttons") block = { ...block, children: applyPreviewBlockStyles(block.children, styles) as typeof block.children };
    if (block.type === "quote" && block.children) block = { ...block, children: applyPreviewBlockStyles(block.children, styles) as typeof block.children };
    return block;
  });
}
