import type { ContentBlock, ParagraphStyle } from "../content/model";

const appearanceKeys = ["visualStyle", "style", "align", "blockAlign", "quoteStyle", "tableStyle", "imageStyle", "width", "height", "heightUnit", "widthUnit", "aspectRatio", "scale", "displayWidth", "displayHeight", "focalX", "focalY", "layout", "horizontalAlign", "verticalAlign", "justification", "orientation", "allowWrap", "gap", "columnGap", "rowGap", "horizontalGap", "verticalGap", "paddingX", "paddingY", "contentWidth", "contentSize", "wideSize", "inheritLayout", "columns", "minColumnWidth", "minColumnWidthUnit", "stackAt", "gridMode", "position", "iconSize", "socialStyle", "showLabels", "interactionStyles"] as const;

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
    if (key === "style") next.visualStyle = target.visualStyle?.anchor ? { anchor: target.visualStyle.anchor } : undefined;
    const textAligned = ["paragraph", "heading", "quote", "document-title", "document-subtitle", "post-date", "post-author", "reading-time"];
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
  return next as unknown as ContentBlock;
}
