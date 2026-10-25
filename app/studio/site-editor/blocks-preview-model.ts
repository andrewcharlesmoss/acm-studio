import { TEXT_STYLE_VARIATION_DEFAULTS } from "../../content/text-style-variations";
import { editableViewportStyle, replaceViewportStyle, RESPONSIVE_STYLE_FIELDS, type StyleViewport } from "../../content/responsive-styles";
import { paragraphStyleToCss } from "../../content/paragraph-styles";
import type { ContentBlock, ParagraphStyle } from "../../content/model";

/** Styles targets for canonical blocks, with retained reference-only specimens. */
export const previewBlockTargets = [
  { id: "paragraph", type: "paragraph", label: "Paragraph", example: "paragraph" },
  { id: "image", type: "image", label: "Image", example: "image" },
  { id: "heading", type: "heading", label: "Heading", example: "headings" },
  { id: "list", type: "list", label: "List", example: "list" },
  { id: "quote", type: "quote", label: "Quote", example: "quote" },
  { id: "button", type: "button", label: "Button", example: "buttons" },
  { id: "buttons", type: "buttons", label: "Buttons", example: "buttons" },
  { id: "code", type: "code", label: "Code", example: "code" },
  { id: "pullquote", type: "quote", label: "Pullquote", example: "pullquote", referenceOnly: true },
  { id: "search", type: "paragraph", label: "Search", example: "search", referenceOnly: true },
  { id: "divider", type: "divider", label: "Separator", example: "separator" },
  { id: "table", type: "table", label: "Table", example: "table" },
  { id: "group", type: "group", label: "Group", example: "group" },
  { id: "row", type: "group", label: "Row", example: "row" },
  { id: "stack", type: "group", label: "Stack", example: "stack" },
  { id: "grid", type: "group", label: "Grid", example: "grid" },
  { id: "columns", type: "columns", label: "Columns", example: "columns" },
  { id: "column", type: "column", label: "Column", example: "column" },
  { id: "section", type: "section", label: "Section", example: "section" },
  { id: "spacer", type: "spacer", label: "Spacer", example: "spacer" },
  { id: "embed", type: "embed", label: "Embed", example: "embed" },
  { id: "footnotes", type: "footnotes", label: "Footnotes", example: "footnotes" },
  { id: "field", type: "field", label: "Field", example: "field" },
  { id: "document-title", type: "document-title", label: "Title", example: "document-title" },
  { id: "document-subtitle", type: "document-subtitle", label: "Subtitle", example: "document-subtitle" },
  { id: "cover-image", type: "cover-image", label: "Featured image", example: "cover-image" },
  { id: "reading-time", type: "reading-time", label: "Reading time", example: "reading-time" },
  { id: "post-author", type: "post-author", label: "Author", example: "post-author" },
  { id: "post-date", type: "post-date", label: "Date", example: "post-date" },
  { id: "social-icons", type: "social-icons", label: "Social Icons", example: "social-icons" },
  { id: "social-linkedin", type: "social-linkedin", label: "LinkedIn", example: "social-linkedin" },
  { id: "social-tiktok", type: "social-tiktok", label: "TikTok", example: "social-tiktok" },
] as const;
export type PreviewBlockId = typeof previewBlockTargets[number]["id"];
export type PreviewBlockExtras = {
  previewVariant?: string; websiteFont?: string; websitePreset?: string; websiteWeight?: number; websiteItalic?: boolean; cellPadding?: string;
  textAlign?: "left" | "center" | "right" | "justify"; indentAll?: boolean; textIndent?: string;
  buttonTextColor?: string; buttonBackgroundColor?: string; buttonBackgroundGradient?: import("../../content/model").ParagraphBackgroundGradient; buttonGradientId?: string;
  blockGap?: string; rowGap?: string; columnGap?: string; buttonWidth?: string;
  shadowPreset?: string; customShadows?: import("./shadows-preview-model").PreviewShadowLayer[]; headingColor?: string; headingColors?: Partial<Record<1 | 2 | 3 | 4 | 5 | 6, string>>; duotone?: { dark: string; light: string } | null;
  enlargeOnClick?: boolean; backgroundImage?: import("./identity-preview-state").IdentityImage | null;
  imageSize?: "cover" | "contain" | "tile"; imageRepeat?: boolean; imageFocalX?: number; imageFocalY?: number;
  interactionStates?: Partial<Record<"hover" | "focus" | "focus-visible" | "active", PreviewBlockInteractionStyle>>;
};
type PreviewBlockInteractionExtras = { websiteFont?: string; websitePreset?: string; websiteWeight?: number; websiteItalic?: boolean; textAlign?: "left" | "center" | "right" | "justify"; indentAll?: boolean; textIndent?: string; blockGap?: string; rowGap?: string; columnGap?: string; buttonWidth?: string; shadowPreset?: string; customShadows?: import("./shadows-preview-model").PreviewShadowLayer[]; headingColor?: string; headingColors?: Partial<Record<1 | 2 | 3 | 4 | 5 | 6, string>>; duotone?: { dark: string; light: string } | null };
export type PreviewBlockInteractionStyle = Partial<ParagraphStyle> & PreviewBlockInteractionExtras & { previewResponsive?: Partial<Record<"tablet" | "mobile", Partial<ParagraphStyle & PreviewBlockInteractionExtras>>> };
export type PreviewBlockStyle = ParagraphStyle & PreviewBlockExtras & {
  previewResponsive?: Partial<Record<"tablet" | "mobile", PreviewBlockExtras>>;
  variations?: Record<string, PreviewBlockStyle>;
};
export type PreviewBlockStyles = Partial<Record<PreviewBlockId, PreviewBlockStyle>>;
/** Pinned Twenty Twenty-Five theme.json (62c1082), separate from authored history. */
export const referenceBlockDefaults: PreviewBlockStyles = {
  quote: { websitePreset: "large", websiteWeight: 300, borderColor: "currentColor", borderStyle: "solid", borderWidth: "0px 0px 0px 2px", padding: "20px 30px", margin: "0px", blockGap: "20px" },
  code: { websiteFont: '"TT5 Fira Code", monospace', websitePreset: "medium", websiteWeight: 300, textColor: "var(--site-palette-theme-1)", backgroundColor: "var(--site-palette-theme-6)", borderRadius: "0px", padding: "30px" },
  pullquote: { websitePreset: "xx-large", websiteWeight: 300, lineHeight: "1.2", padding: "20px 0px" },
  search: { websitePreset: "medium", lineHeight: "1.6" },
  button: { websitePreset: "medium", backgroundColor: "var(--site-palette-theme-1)", textColor: "var(--site-palette-theme-0)", borderRadius: "999px", padding: "1rem 2.25rem", variations: { outline: { backgroundColor: "transparent", textColor: "var(--site-palette-theme-1)", borderColor: "currentColor", borderStyle: "solid", borderWidth: "1px" } } },
  buttons: { rowGap: "16px", columnGap: "16px" },
};
export function referencePreviewBlockStyles(styles: PreviewBlockStyles = {}): PreviewBlockStyles {
  return resolvePreviewBlockDefaults(styles, true);
}
/** Resolve family defaults once for inspectors, projection and painted rules. Never persist this map. */
export function resolvePreviewBlockDefaults(styles: PreviewBlockStyles = {}, referenceDefaults = false): PreviewBlockStyles {
  const resolved = referenceDefaults ? mergePreviewBlockStyles(referenceBlockDefaults, styles) : { ...styles };
  if (resolved.group) for (const id of ["row", "stack", "grid"] as const) {
    resolved[id] = mergePreviewBlockStyles({ [id]: resolved.group }, { [id]: resolved[id] })[id];
  }
  return resolved;
}
export function editablePreviewBlockStyle(style: PreviewBlockStyle = {}, viewport: StyleViewport): PreviewBlockStyle {
  const values: PreviewBlockStyle = viewport === "desktop" ? { ...style } : { ...editableViewportStyle(style, viewport), ...style.previewResponsive?.[viewport] };
  delete values.responsive; delete values.previewResponsive; delete values.variations; delete values.interactionStates;
  return values;
}
export function effectivePreviewBlockStyle(style: PreviewBlockStyle = {}, viewport: StyleViewport): PreviewBlockStyle {
  return mergeStyleFields(editablePreviewBlockStyle(style, "desktop"), viewport === "desktop" ? {} : editablePreviewBlockStyle(style, viewport));
}
/** Font authored in the current scope and viewport; an unset choice means Default. */
export function previewBlockFontSelection(style: PreviewBlockStyle = {}, viewport: StyleViewport): string {
  const authored = editablePreviewBlockStyle(style, viewport);
  return authored.websiteFont ?? authored.fontFamily ?? "";
}
export function replacePreviewBlockStyle(current: PreviewBlockStyle, viewport: StyleViewport, values: PreviewBlockStyle): PreviewBlockStyle {
  if (viewport === "desktop") return { ...values, ...(current.responsive ? { responsive: current.responsive } : {}), ...(current.previewResponsive ? { previewResponsive: current.previewResponsive } : {}), ...(current.variations ? { variations: current.variations } : {}), ...(current.interactionStates ? { interactionStates: current.interactionStates } : {}) };
  const canonical = Object.fromEntries(Object.entries(values).filter(([key]) => RESPONSIVE_STYLE_FIELDS.includes(key as typeof RESPONSIVE_STYLE_FIELDS[number])));
  const deviceExtras = new Set(['websiteFont','websitePreset','websiteWeight','websiteItalic','cellPadding','textAlign','textIndent','indentAll','blockGap','rowGap','columnGap','buttonWidth','shadowPreset','customShadows','headingColor','headingColors','duotone','buttonTextColor','buttonBackgroundColor','buttonBackgroundGradient','buttonGradientId']);
  const extras = Object.fromEntries(Object.entries(values).filter(([key]) => deviceExtras.has(key)));
  const result: PreviewBlockStyle = replaceViewportStyle(current, viewport, canonical) ?? {};
  if (current.interactionStates) result.interactionStates = current.interactionStates;
  const previewResponsive = { ...current.previewResponsive };
  if (Object.keys(extras).length) previewResponsive[viewport] = extras; else delete previewResponsive[viewport];
  if (Object.keys(previewResponsive).length) result.previewResponsive = previewResponsive; else delete result.previewResponsive;
  return result;
}
export function variantPreviewDefaults(id: string): PreviewBlockStyle {
  if (id === "display" || id === "subtitle") return { ...TEXT_STYLE_VARIATION_DEFAULTS[id] };
  if (id === "annotation") { const defaults = { ...TEXT_STYLE_VARIATION_DEFAULTS.annotation }; delete defaults.fontSize; return { ...defaults, websitePreset: "small" }; }
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
  if (local.buttonBackgroundColor !== undefined && !local.buttonBackgroundGradient) { delete merged.buttonBackgroundGradient; delete merged.buttonGradientId; }
  if ((local.buttonBackgroundGradient || local.buttonGradientId) && local.buttonBackgroundColor === undefined) delete merged.buttonBackgroundColor;
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
  return block.type === "paragraph" || block.type === "column" || block.type === "columns" ? block.style ?? {} : block.visualStyle ?? {};
}

export function projectedStyle(defaults: PreviewBlockStyle, authored: ParagraphStyle = {}): ParagraphStyle {
  const style = mergeStyleFields(defaults, authored);
  // The book yields only to explicit authored properties, not class-derived variation defaults.
  const authoredMarkers = Object.keys(paragraphStyleToCss({ ...authored, className: undefined })).map(property => `site-block-authored-${property.replace(/[A-Z]/g, character => `-${character.toLowerCase()}`)}`);
  const markers = [...authoredMarkers, style.textTransform && "site-block-style-transform", style.textDecoration && "site-block-style-decoration"].filter(Boolean);
  if (markers.length) style.className = [style.className, ...markers].filter(Boolean).join(" ");
  return style;
}

/** Plain Quote is a Quote variation; only the explicit reference specimen is a Pullquote. */
export function previewBlockTarget(block: ContentBlock): PreviewBlockId {
  if (block.type === "quote" && block.visualStyle?.className?.split(/\s+/).includes("is-pullquote")) return "pullquote";
  if (block.type === "group" && ["row", "stack", "grid"].includes(block.layout)) return block.layout as "row" | "stack" | "grid";
  return block.type as PreviewBlockId;
}

/** Legacy bare numbers represent percentages; new choices retain their authored unit. */
export function previewButtonWidth(value?: string): string | undefined {
  if (!value) return undefined;
  const match = /^(\d+(?:\.\d+)?)(px|%|em|rem|vw|vh)?$/.exec(value);
  return match && Number(match[1]) <= 10000 ? `${match[1]}${match[2] ?? "%"}` : undefined;
}
export function previewButtonItemWidth(value?: string): string | undefined {
  const width = previewButtonWidth(value);
  return width && parseFloat(width) !== 0 && width.endsWith("%") ? `calc(${width} - var(--site-block-button-gap,16px) * ${1 - parseFloat(width) / 100})` : width;
}

/** Resolve the selected viewport before the interaction delta, so base device values cannot overwrite it. */
export function previewBlockInspectorStyle(style: PreviewBlockStyle = {}, viewport: StyleViewport, state: "default" | "hover" | "focus" | "focus-visible" | "active" = "default"): PreviewBlockStyle {
  const base = effectivePreviewBlockStyle(style, viewport);
  return state === "default" ? base : mergeStyleFields(base, effectivePreviewBlockStyle(style.interactionStates?.[state], viewport));
}

/** Project shared defaults into fresh canonical blocks, preserving authored content styles. */
export function applyPreviewBlockStyles(blocks: ContentBlock[], styles: PreviewBlockStyles = {}, buttonPreviewState: "default" | "hover" | "focus" | "focus-visible" | "active" = "default", referenceDefaults = true, previousSibling?: ContentBlock): ContentBlock[] {
  styles = resolvePreviewBlockDefaults(styles, referenceDefaults);
  return blocks.map((source, index) => {
    const id = previewBlockTarget(source);
    const base = styles[id];
    const defaults = (source.type === "quote" && id === "quote" && source.quoteStyle === "plain" ? resolvePreviewBlockVariant(base, "plain") : source.type === "button" && source.style === "secondary" ? resolvePreviewBlockVariant(base, "outline") : base) ?? (referenceDefaults && id === "code" ? { websiteFont: '"TT5 Fira Code", monospace' } : undefined);
    const marker = `site-block-style-${id}`;
    // The reference Button text colour is designed for its filled variant.
    // Use the theme's contrast role for an outline button unless it has its
    // own authored text colour, so global Button defaults remain legible.
    const buttonDefaults = source.type === "button" && source.style === "secondary" && source.visualStyle?.textColor === undefined
      ? { ...defaults, textColor: "var(--site-palette-theme-1)" } as PreviewBlockStyle
      : defaults;
    let block = defaults ? (source.type === "paragraph" || source.type === "column" || source.type === "columns") ? { ...source, style: projectedStyle(defaults, source.style) } : { ...source, visualStyle: projectedStyle(buttonDefaults ?? defaults, source.visualStyle) } : { ...source };
    if (defaults || source.type === "button") {
      if (!defaults && source.type === "button") block = { ...block, visualStyle: projectedStyle({}, source.visualStyle) };
      const style = block.type === "paragraph" || block.type === "column" || block.type === "columns" ? block.style! : block.visualStyle!;
      const layoutMarkers = ["gap", "rowGap", "columnGap"].flatMap(field => field in source && source[field as keyof typeof source] !== undefined ? [`site-block-authored---block-layout-${field.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`] : []);
      const widthMarkers = source.type === "button" ? [source.width !== undefined ? "site-block-authored-button-width" : undefined, ...Object.entries(source.interactionStyles ?? {}).flatMap(([state, value]) => value.width !== undefined ? [`site-block-authored-button-${state}-width`] : [])].filter(Boolean) : [];
      const previous = index === 0 ? previousSibling : blocks[index - 1];
      const paragraphMarkers = source.type === "paragraph" && previous?.type === "paragraph" ? ["site-block-follows-paragraph", ...(previous.style?.textIndent !== undefined ? ["site-block-authored-text-indent"] : [])] : [];
      // A solid colour and a gradient are alternative owners of one background.
      // Protect both painted properties, including authored device overrides.
      const backgroundMarkers = source.type === 'button' ? (['desktop','tablet','mobile'] as const).flatMap(viewport => {
        const own = viewport === 'desktop' ? source.visualStyle : source.visualStyle?.responsive?.[viewport];
        return own?.backgroundColor !== undefined || own?.backgroundGradient !== undefined
          ? ['background-color','background-image'].map(property => `site-block-authored-${viewport === 'desktop' ? '' : `--studio-rs-${viewport}-`}${property}`) : [];
      }) : [];
      style.className = [style.className, marker, ...layoutMarkers, ...widthMarkers, ...paragraphMarkers, ...backgroundMarkers].filter(Boolean).join(" ");
    }
    if (block.type === "button" && buttonPreviewState !== "default") {
      const visualStyle = block.visualStyle ?? {};
      visualStyle.className = [visualStyle.className, `is-button-state-preview-${buttonPreviewState}`].filter(Boolean).join(" ");
      block = { ...block, visualStyle };
    }
    if (block.type === "image" && defaults?.enlargeOnClick !== undefined && block.linkDestination === undefined && !block.linkUrl) block = { ...block, linkDestination: defaults.enlargeOnClick ? "lightbox" : "none" };
    if (block.type === "quote" && defaults?.previewVariant === "plain") block = { ...block, quoteStyle: "plain" };
    if (block.type === "table" && defaults?.previewVariant === "stripes") block = { ...block, tableStyle: "stripes" };
    if (block.type === "divider" && defaults?.previewVariant) block = { ...block, style: defaults.previewVariant === "dots" ? "dots" : "wide" };
    if (block.type === "button" && defaults?.previewVariant === "outline") block = { ...block, style: "secondary" };
    if (block.type === "image" && defaults?.previewVariant === "rounded") block = { ...block, imageStyle: "rounded" };

    if ("children" in block && Array.isArray(block.children)) block = { ...block, children: applyPreviewBlockStyles(block.children, styles, buttonPreviewState, false) } as ContentBlock;
    return block;
  });
}
