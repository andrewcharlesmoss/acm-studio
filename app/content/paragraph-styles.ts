import type { ParagraphStyle } from "./model";

const fontSizes: Record<NonNullable<ParagraphStyle["fontSize"]>, string> = {
  small: "14px",
  medium: "16px",
  large: "20px",
  "x-large": "24px",
  "xx-large": "32px",
};

const fontFamilies: Record<NonNullable<ParagraphStyle["fontFamily"]>, string> = {
  inter: 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif',
  "helvetica-neue": '"Helvetica Neue", Helvetica, Arial, sans-serif',
  helvetica: 'Helvetica, Arial, sans-serif',
  arial: 'Arial, sans-serif',
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
  if (style.fontFamily) css.fontFamily = fontFamilies[style.fontFamily];
  if (style.fontSize && !style.fitText) css.fontSize = fontSizes[style.fontSize];
  if (style.appearance === "italic" || style.appearance === "bold-italic") css.fontStyle = "italic";
  if (style.appearance === "bold" || style.appearance === "bold-italic") css.fontWeight = "700";
  if (style.lineHeight) css.lineHeight = style.lineHeight;
  if (style.letterSpacing) css.letterSpacing = style.letterSpacing;
  if (style.textIndent) css.textIndent = style.textIndent;
  if (style.textColumns && !style.fitText) { css.columnCount = String(style.textColumns); css.columnGap = "1.5em"; }
  if (style.textTransform) css.textTransform = style.textTransform;
  if (style.textDecoration) css.textDecoration = style.textDecoration;
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
  if (style.shadow) css.boxShadow = style.shadow === "soft" ? "0 4px 16px rgb(0 0 0 / 12%)" : style.shadow === "strong" ? "0 12px 32px rgb(0 0 0 / 22%)" : "none";
  return css;
}

export function buttonVisualCss(style?: ParagraphStyle): Record<string, string> {
  const css = paragraphStyleToCss(style);
  delete css.margin;
  return css;
}

export function paragraphStyleClassName(style?: ParagraphStyle) {
  return [style?.dropCap && "has-drop-cap", style?.fitText && "has-fit-text", style?.className?.trim().replace(/[^a-zA-Z0-9_-]+/g, " ").trim()].filter(Boolean).join(" ");
}

export function visualStyleClassName(style: ParagraphStyle) {
  return [
    "block-visual-style",
    style.fontFamily && "has-custom-font-family",
    style.fontSize && "has-custom-font-size",
    style.appearance && "has-custom-appearance",
    style.lineHeight && "has-custom-line-height",
    style.letterSpacing && "has-custom-letter-spacing",
    style.textColor && "has-custom-text-colour",
    (style.backgroundColor || style.backgroundGradient) && "has-custom-background",
    paragraphStyleClassName(style),
  ].filter(Boolean).join(" ");
}

export function paragraphStyleAnchor(style?: ParagraphStyle) {
  const anchor = style?.anchor?.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return anchor || undefined;
}
