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
  shadowPreset?: string; customShadows?: import("./shadows-preview-model").PreviewShadowLayer[]; headingColor?: string; headingColors?: Partial<Record<1 | 2 | 3 | 4 | 5 | 6, string>>; duotone?: { dark: string; light: string } | null;
  enlargeOnClick?: boolean; backgroundImage?: import("./identity-preview-state").IdentityImage | null;
  imageSize?: "cover" | "contain" | "tile"; imageRepeat?: boolean; imageFocalX?: number; imageFocalY?: number;
  interactionStates?: Partial<Record<"hover" | "focus" | "focus-visible" | "active", PreviewBlockInteractionStyle>>;
};
type PreviewBlockInteractionExtras = { websiteFont?: string; websitePreset?: string; websiteWeight?: number; websiteItalic?: boolean; textAlign?: "left" | "center" | "right" | "justify"; indentAll?: boolean; blockGap?: string; rowGap?: string; columnGap?: string; buttonWidth?: string; shadowPreset?: string; customShadows?: import("./shadows-preview-model").PreviewShadowLayer[]; headingColor?: string; headingColors?: Partial<Record<1 | 2 | 3 | 4 | 5 | 6, string>>; duotone?: { dark: string; light: string } | null };
export type PreviewBlockInteractionStyle = Partial<ParagraphStyle> & PreviewBlockInteractionExtras & { previewResponsive?: Partial<Record<"tablet" | "mobile", Partial<ParagraphStyle & PreviewBlockInteractionExtras>>> };
export type PreviewBlockStyle = ParagraphStyle & PreviewBlockExtras & {
  previewResponsive?: Partial<Record<"tablet" | "mobile", PreviewBlockExtras>>;
  variations?: Record<string, PreviewBlockStyle>;
};
export type PreviewBlockStyles = Partial<Record<PreviewBlockId, PreviewBlockStyle>>;
/** Pinned Twenty Twenty-Five theme.json (62c1082), separate from authored history. */
export const referenceBlockDefaults: PreviewBlockStyles = {
  quote: { websitePreset: "large", websiteWeight: 300, borderColor: "currentColor", borderStyle: "solid", borderWidth: "0px 0px 0px 2px", padding: "20px 30px", margin: "0px", blockGap: "20px" },
  code: { websiteFont: '"TT5 Fira Code", monospace', websitePreset: "medium", websiteWeight: 300, textColor: "var(--site-palette-theme-1)", backgroundColor: "var(--site-palette-theme-6)", padding: "30px" },
  pullquote: { websitePreset: "xx-large", websiteWeight: 300, lineHeight: "1.2", padding: "20px 0px" },
  search: { websitePreset: "medium", lineHeight: "1.6" },
  button: { websitePreset: "medium", backgroundColor: "var(--site-palette-theme-1)", textColor: "var(--site-palette-theme-0)", padding: "1rem 2.25rem" },
  buttons: { rowGap: "16px", columnGap: "16px" },
};
export function referencePreviewBlockStyles(styles: PreviewBlockStyles = {}): PreviewBlockStyles {
  return mergePreviewBlockStyles(referenceBlockDefaults, styles);
}
export function editablePreviewBlockStyle(style: PreviewBlockStyle = {}, viewport: StyleViewport): PreviewBlockStyle {
  const values: PreviewBlockStyle = viewport === "desktop" ? { ...style } : { ...editableViewportStyle(style, viewport), ...style.previewResponsive?.[viewport] };
  delete values.responsive; delete values.previewResponsive; delete values.variations; delete values.interactionStates;
  return values;
}
export function effectivePreviewBlockStyle(style: PreviewBlockStyle = {}, viewport: StyleViewport): PreviewBlockStyle {
  return mergeStyleFields(editablePreviewBlockStyle(style, "desktop"), viewport === "desktop" ? {} : editablePreviewBlockStyle(style, viewport));
}
export function replacePreviewBlockStyle(current: PreviewBlockStyle, viewport: StyleViewport, values: PreviewBlockStyle): PreviewBlockStyle {
  if (viewport === "desktop") return { ...values, ...(current.responsive ? { responsive: current.responsive } : {}), ...(current.previewResponsive ? { previewResponsive: current.previewResponsive } : {}), ...(current.variations ? { variations: current.variations } : {}), ...(current.interactionStates ? { interactionStates: current.interactionStates } : {}) };
  const canonical = Object.fromEntries(Object.entries(values).filter(([key]) => RESPONSIVE_STYLE_FIELDS.includes(key as typeof RESPONSIVE_STYLE_FIELDS[number])));
  const deviceExtras = new Set(['websiteFont','websitePreset','websiteWeight','websiteItalic','textAlign','indentAll','blockGap','rowGap','columnGap','buttonWidth','shadowPreset','customShadows','headingColor','headingColors','duotone']);
  const extras = Object.fromEntries(Object.entries(values).filter(([key]) => deviceExtras.has(key)));
  const result: PreviewBlockStyle = replaceViewportStyle(current, viewport, canonical) ?? {};
  if (current.interactionStates) result.interactionStates = current.interactionStates;
  const previewResponsive = { ...current.previewResponsive };
  if (Object.keys(extras).length) previewResponsive[viewport] = extras; else delete previewResponsive[viewport];
  if (Object.keys(previewResponsive).length) result.previewResponsive = previewResponsive; else delete result.previewResponsive;
  return result;
}
export function variantPreviewDefaults(id: string): PreviewBlockStyle {
  if (id === "display") return { fontSizeCustom: "clamp(2.2rem, calc(1.9334rem + 1.333cqw), 3.5rem)", lineHeight: "1.2" };
  if (id === "subtitle") return { fontSizeCustom: "clamp(1.5rem, calc(1.4216rem + .392cqw), 1.75rem)", lineHeight: "1.2" };
  if (id === "annotation") return { websitePreset: "small", lineHeight: "1.5", borderColor: "currentColor", borderStyle: "solid", borderWidth: "1px", borderRadius: "16px", padding: ".2rem .6rem .25rem", linkColor: undefined };
  if (id === "outline") return { backgroundColor: "transparent", textColor: "currentColor", borderColor: "currentColor", borderStyle: "solid", borderWidth: "1px", padding: "calc(1rem - 1px) calc(2.25rem - 1px)" };
  if (id === "plain") return { borderColor: "transparent", borderStyle: "none", borderWidth: "0px", borderRadius: "0px", padding: "0px" };
  if (id === "rounded") return { borderRadius: "9999px" };
  return {};
}
export function resolvePreviewBlockVariant(style: PreviewBlockStyle = {}, variant?: string): PreviewBlockStyle {
  return variant ? { ...mergePreviewBlockStyles({paragraph: mergePreviewBlockStyles({paragraph: style}, {paragraph: variantPreviewDefaults(variant)}).paragraph}, {paragraph: style.variations?.[variant]}).paragraph, previewVariant: variant } : style;
}


function mergeStyleFields(global: PreviewBlockStyle = {}, local: PreviewBlockStyle = {}): PreviewBlockStyle {
  const merged = { ...global, ...local };
  if (global.responsive || local.responsive) {
    merged.responsive = {
      tablet: mergeStyleFields(global.responsive?.tablet, local.responsive?.tablet),
      mobile: mergeStyleFields(global.responsive?.mobile, local.responsive?.mobile),
    };
    if (!Object.keys(merged.responsive.tablet ?? {}).length) delete merged.responsive.tablet;
    if (!Object.keys(merged.responsive.mobile ?? {}).length) delete merged.responsive.mobile;
    if (!Object.keys(merged.responsive).length) delete merged.responsive;
  }
  if (global.headingColors || local.headingColors) merged.headingColors = { ...global.headingColors, ...local.headingColors };
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
    if (global[id]?.interactionStates || local[id]?.interactionStates) {
      merged.interactionStates = {};
      for (const interaction of ["hover", "focus", "focus-visible", "active"] as const) {
        const base = global[id]?.interactionStates?.[interaction];
        const override = local[id]?.interactionStates?.[interaction];
        if (base || override) {
          const values = mergeStyleFields(base, override);
          if (base?.previewResponsive || override?.previewResponsive) values.previewResponsive = { tablet: mergeStyleFields(base?.previewResponsive?.tablet, override?.previewResponsive?.tablet), mobile: mergeStyleFields(base?.previewResponsive?.mobile, override?.previewResponsive?.mobile) };
          if (Object.keys(values).length) merged.interactionStates[interaction] = values;
        }
      }
    }
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
  if (patch.headingColors) {
    const headingColors = { ...current.headingColors, ...patch.headingColors };
    for (const level of [1,2,3,4,5,6] as const) if (headingColors[level] === undefined) delete headingColors[level];
    result.headingColors = Object.keys(headingColors).length ? headingColors : undefined;
  }
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
export function applyPreviewBlockStyles(blocks: ContentBlock[], styles: PreviewBlockStyles = {}, buttonPreviewState: "default" | "hover" | "focus" | "focus-visible" | "active" = "default"): ContentBlock[] {
  styles = referencePreviewBlockStyles(styles);
  return blocks.map(source => {
    const id = source.type === "quote" && source.quoteStyle === "plain" ? "pullquote" : source.type;
    const defaults = styles[id as PreviewBlockId] ?? (id === "code" ? { websiteFont: '"TT5 Fira Code", monospace' } : undefined);
    const marker = `site-block-style-${id}`;
    let block = defaults ? source.type === "paragraph" ? { ...source, style: projectedStyle(defaults, source.style) } : { ...source, visualStyle: projectedStyle(defaults, source.visualStyle) } : { ...source };
    if (defaults) {
      const style = block.type === "paragraph" ? block.style! : block.visualStyle!;
      style.className = [style.className, marker].filter(Boolean).join(" ");
    }
    if (block.type === "button" && buttonPreviewState !== "default") {
      const visualStyle = block.visualStyle ?? {};
      visualStyle.className = [visualStyle.className, `is-button-state-preview-${buttonPreviewState}`].filter(Boolean).join(" ");
      block = { ...block, visualStyle };
    }
    if (block.type === "image" && defaults?.enlargeOnClick !== undefined && (!block.linkDestination || block.linkDestination === "none" || block.linkDestination === "lightbox")) block = { ...block, linkDestination: defaults.enlargeOnClick ? "lightbox" : "none" };
    if (block.type === "quote" && defaults?.previewVariant === "plain") block = { ...block, quoteStyle: "plain" };
    if (block.type === "table" && defaults?.previewVariant === "stripes") block = { ...block, tableStyle: "stripes" };
    if (block.type === "divider" && defaults?.previewVariant) block = { ...block, style: defaults.previewVariant === "dots" ? "dots" : "wide" };
    if (block.type === "button" && defaults?.previewVariant === "outline") block = { ...block, style: "secondary" };
    if (block.type === "image" && defaults?.previewVariant === "rounded") block = { ...block, imageStyle: "rounded" };

    if (block.type === "buttons") block = { ...block, children: applyPreviewBlockStyles(block.children, styles, buttonPreviewState) as typeof block.children };
    if (block.type === "quote" && block.children) block = { ...block, children: applyPreviewBlockStyles(block.children, styles, buttonPreviewState) as typeof block.children };
    return block;
  });
}
