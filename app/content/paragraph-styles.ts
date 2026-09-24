import type { ParagraphStyle } from "./model";

const fontSizes: Record<NonNullable<ParagraphStyle["fontSize"]>, string> = {
  small: "14px",
  medium: "16px",
  large: "20px",
  "x-large": "24px",
  "xx-large": "32px",
};

export const PARAGRAPH_BACKGROUND_GRADIENTS: Record<NonNullable<ParagraphStyle["backgroundGradient"]>, string> = {
  sunrise: "linear-gradient(135deg, #fde68a, #fca5a5)",
  ocean: "linear-gradient(135deg, #bae6fd, #a5b4fc)",
  forest: "linear-gradient(135deg, #bbf7d0, #a7f3d0)",
  violet: "linear-gradient(135deg, #ddd6fe, #fbcfe8)",
};

export function paragraphBackgroundGradientCss(gradient: NonNullable<ParagraphStyle["backgroundGradient"]>) {
  return PARAGRAPH_BACKGROUND_GRADIENTS[gradient];
}

export function paragraphStyleToCss(style?: ParagraphStyle): Record<string, string> {
  if (!style) return {};
  const css: Record<string, string> = {};
  if (style.fontSize) css.fontSize = fontSizes[style.fontSize];
  if (style.appearance === "italic" || style.appearance === "bold-italic") css.fontStyle = "italic";
  if (style.appearance === "bold" || style.appearance === "bold-italic") css.fontWeight = "700";
  if (style.lineHeight) css.lineHeight = style.lineHeight;
  if (style.letterSpacing) css.letterSpacing = style.letterSpacing;
  if (style.textColor) css.color = style.textColor;
  if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
  if (style.backgroundGradient) css.backgroundImage = paragraphBackgroundGradientCss(style.backgroundGradient);
  if (style.linkColor) css["--studio-paragraph-link-color"] = style.linkColor;
  if (style.padding) css.padding = style.padding;
  if (style.margin) css.margin = style.margin;
  if (style.borderStyle && style.borderStyle !== "none") {
    css.borderStyle = style.borderStyle;
    css.borderWidth = style.borderWidth || "1px";
    css.borderColor = style.borderColor || "#d1cfc7";
  }
  if (style.borderRadius) css.borderRadius = style.borderRadius;
  return css;
}

export function paragraphStyleClassName(style?: ParagraphStyle) {
  return style?.className?.trim().replace(/[^a-zA-Z0-9_-]+/g, " ").trim() || "";
}

export function paragraphStyleAnchor(style?: ParagraphStyle) {
  const anchor = style?.anchor?.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return anchor || undefined;
}
