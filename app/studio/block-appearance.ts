import type { ContentBlock, ParagraphStyle } from "../content/model";

const appearanceKeys = ["visualStyle", "style", "align", "blockAlign", "quoteStyle", "tableStyle", "imageStyle", "width", "height", "heightUnit", "widthUnit", "aspectRatio", "scale", "displayWidth", "displayHeight", "focalX", "focalY", "layout", "horizontalAlign", "verticalAlign", "justification", "orientation", "allowWrap", "gap", "columnGap", "rowGap", "horizontalGap", "verticalGap", "paddingX", "paddingY", "contentWidth", "contentSize", "wideSize", "inheritLayout", "columns", "minColumnWidth", "minColumnWidthUnit", "stackAt", "gridMode", "fillAvailableSpace", "position", "iconSize", "socialStyle", "showLabels", "interactionStyles"] as const;
function withoutContentButtonStyle(style?: ParagraphStyle): ParagraphStyle | undefined {
  if (!style) return style;
  const next = { ...style };
  delete next.buttonTextColor;
  delete next.buttonBackgroundColor;
  delete next.buttonBackgroundGradient;
  if (next.responsive) {
    const responsive = Object.fromEntries(Object.entries(next.responsive).flatMap(([viewport, values]) => {
      const cleaned = { ...values };
      delete cleaned.buttonTextColor;
      delete cleaned.buttonBackgroundColor;
      delete cleaned.buttonBackgroundGradient;
      return Object.keys(cleaned).length ? [[viewport, cleaned]] : [];
    })) as ParagraphStyle["responsive"];
    if (responsive && Object.keys(responsive).length) next.responsive = responsive;
    else delete next.responsive;
  }
  return Object.keys(next).length ? next : undefined;
}

/** Copy presentation only, retaining the destination's unique anchors and content. */
export function pasteBlockAppearance(target: ContentBlock, source: ContentBlock): ContentBlock {
  if (source.type !== target.type) {
    const next = { ...target } as unknown as Record<string, unknown>;
    const origin = source as unknown as Record<string, unknown>;
    const style = { ...source.visualStyle, ...(origin.style && typeof origin.style === "object" ? origin.style as ParagraphStyle : {}) };
    delete style.anchor;
    const key = ["paragraph", "columns", "column"].includes(target.type) ? "style" : "visualStyle";
    const current = next[key] as ParagraphStyle | undefined;
    next[key] = { ...style, ...(current?.anchor ? { anchor: current.anchor } : {}) };
    if (!(target.type === "group" && target.data?.templateElement === "content")) next[key] = withoutContentButtonStyle(next[key] as ParagraphStyle | undefined);
    if (key === "style") next.visualStyle = target.visualStyle?.anchor ? { anchor: target.visualStyle.anchor } : undefined;
    const textAligned = ["paragraph", "heading", "quote", "title", "subtitle", "post-date", "author-name", "time-to-read"];
    if (textAligned.includes(source.type) && textAligned.includes(target.type)) next.align = origin.align;
    return next as unknown as ContentBlock;
  }
  const next = { ...target } as unknown as Record<string, unknown>;
  const origin = source as unknown as Record<string, unknown>;
  for (const key of appearanceKeys) {
    const value = origin[key];
    if (value === undefined) delete next[key];
    else next[key] = structuredClone(value);
    if ((key === "style" || key === "visualStyle") && typeof next[key] === "object" && next[key] !== null) {
      const style = next[key] as ParagraphStyle;
      const original = (target as unknown as Record<string, unknown>)[key] as ParagraphStyle | undefined;
      delete style.anchor;
      if (original?.anchor) style.anchor = original.anchor;
    } else if (key === "style" || key === "visualStyle") {
      const original = (target as unknown as Record<string, unknown>)[key];
      if (original && typeof original === "object" && (original as ParagraphStyle).anchor) next[key] = { anchor: (original as ParagraphStyle).anchor };
    }
  }
  if (!(target.type === "group" && target.data?.templateElement === "content")) {
    const styleKey = ["paragraph", "columns", "column"].includes(target.type) ? "style" : "visualStyle";
    next[styleKey] = withoutContentButtonStyle(next[styleKey] as ParagraphStyle | undefined);
  }
  return next as unknown as ContentBlock;
}
