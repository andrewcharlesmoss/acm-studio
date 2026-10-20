import { editableViewportStyle, replaceViewportStyle, type StyleViewport } from "../../content/responsive-styles";
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
export type PreviewBlockStyles = Partial<Record<PreviewBlockId, ParagraphStyle>>;

function mergeStyleFields(global: ParagraphStyle = {}, local: ParagraphStyle = {}): ParagraphStyle {
  const merged = { ...global, ...local };
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
export function patchPreviewBlockViewport(current: ParagraphStyle = {}, viewport: StyleViewport, patch: Partial<ParagraphStyle>): ParagraphStyle {
  return replaceViewportStyle(current, viewport, patchPreviewBlockStyle(editableViewportStyle(current, viewport), patch)) ?? {};
}

/** Removed inspector fields resume inheritance; unchanged inherited fields stay unowned. */
export function previewBlockStyleDelta(before: ParagraphStyle, after: ParagraphStyle): Partial<ParagraphStyle> {
  return Object.fromEntries([...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => JSON.stringify(before[key as keyof ParagraphStyle]) !== JSON.stringify(after[key as keyof ParagraphStyle])).map(key => [key, after[key as keyof ParagraphStyle]]));
}
export function patchPreviewBlockStyle(current: ParagraphStyle = {}, patch: Partial<ParagraphStyle>): ParagraphStyle {
  const result = { ...current, ...patch };
  for (const field of Object.keys(result) as (keyof ParagraphStyle)[]) if (result[field] === undefined) delete result[field];
  return result;
}
export function blockPreviewStyle(block: ContentBlock): ParagraphStyle {
  return block.type === "paragraph" ? block.style ?? {} : block.visualStyle ?? {};
}

function projectedStyle(defaults: ParagraphStyle, authored: ParagraphStyle = {}): ParagraphStyle {
  const style = { ...defaults, ...authored };
  // The book's role rules must yield to these properties on canonical wrappers.
  const markers = [style.textTransform && "site-block-style-transform", style.textDecoration && "site-block-style-decoration"].filter(Boolean);
  if (markers.length) style.className = [style.className, ...markers].filter(Boolean).join(" ");
  return style;
}

/** Project shared defaults into fresh canonical blocks, preserving authored content styles. */
export function applyPreviewBlockStyles(blocks: ContentBlock[], styles: PreviewBlockStyles = {}): ContentBlock[] {
  return blocks.map(source => {
    const id = source.type === "quote" && source.quoteStyle === "plain" ? "pullquote" : source.type;
    const defaults = styles[id as PreviewBlockId];
    let block = defaults ? source.type === "paragraph" ? { ...source, style: projectedStyle(defaults, source.style) } : { ...source, visualStyle: projectedStyle(defaults, source.visualStyle) } : { ...source };
    if (block.type === "buttons") block = { ...block, children: applyPreviewBlockStyles(block.children, styles) as typeof block.children };
    if (block.type === "quote" && block.children) block = { ...block, children: applyPreviewBlockStyles(block.children, styles) as typeof block.children };
    return block;
  });
}
