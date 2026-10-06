import type { ButtonInteractionState, ButtonInteractionStyle, ParagraphStyle, ParagraphWeight, ParagraphGradientPreset } from "./model";

import { validBackgroundGradient } from "./background-gradient";

const fontSizes: Record<NonNullable<ParagraphStyle["fontSize"]>, string> = {
  small: "14px",
  medium: "16px",
  large: "20px",
  "x-large": "24px",
  "xx-large": "32px",
};

export const PARAGRAPH_FONT_FAMILIES: Record<NonNullable<ParagraphStyle["fontFamily"]>, { label: string; css: string }> = {
  inter: { label: "Inter", css: 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif' },
  "helvetica-neue": { label: "Helvetica Neue", css: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  helvetica: { label: "Helvetica", css: 'Helvetica, Arial, sans-serif' },
  arial: { label: "Arial", css: 'Arial, sans-serif' },
};

const fontWeights: Record<ParagraphWeight, string> = {
  thin: "100", "extra-light": "200", light: "300", regular: "400", medium: "500",
  "semi-bold": "600", bold: "700", "extra-bold": "800", black: "900",
};

export const PARAGRAPH_BACKGROUND_GRADIENTS: Record<ParagraphGradientPreset, string> = {
  sunrise: "linear-gradient(135deg, #fde68a, #fca5a5)",
  ocean: "linear-gradient(135deg, #bae6fd, #a5b4fc)",
  forest: "linear-gradient(135deg, #bbf7d0, #a7f3d0)",
  violet: "linear-gradient(135deg, #ddd6fe, #fbcfe8)",
};

export function paragraphBackgroundGradientCss(gradient: NonNullable<ParagraphStyle["backgroundGradient"]>) {
  if (!validBackgroundGradient(gradient)) return undefined;
  if (typeof gradient === "string") return PARAGRAPH_BACKGROUND_GRADIENTS[gradient];
  const stops = gradient.stops.map(stop => `${stop.colour} ${stop.position}%`).join(", ");
  return gradient.type === "radial" ? `radial-gradient(circle, ${stops})` : `linear-gradient(${gradient.angle}deg, ${stops})`;
}

type OpaqueRgb = [red: number, green: number, blue: number];

function parseColour(value?: string): { channels: OpaqueRgb; alpha: number } | null {
  if (!value) return null;
  const rgb = value.trim().match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgb) {
    const channels = rgb.slice(1, 4).map(Number);
    const alpha = rgb[4] === undefined ? 1 : Number(rgb[4]);
    return channels.every(channel => channel <= 255) && alpha >= 0 && alpha <= 1 ? { channels: channels as OpaqueRgb, alpha } : null;
  }
  const hex = value.trim().match(/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i)?.[1];
  if (!hex) return null;
  const alpha = hex.length === 4 ? Number.parseInt(hex[3] + hex[3], 16) / 255 : hex.length === 8 ? Number.parseInt(hex.slice(6), 16) / 255 : 1;
  const opaqueHex = hex.length === 4 ? hex.slice(0, 3) : hex.length === 8 ? hex.slice(0, 6) : hex;
  const expanded = opaqueHex.length === 3 ? opaqueHex.split("").map(character => character + character).join("") : opaqueHex;
  return { channels: [0, 2, 4].map(offset => Number.parseInt(expanded.slice(offset, offset + 2), 16)) as OpaqueRgb, alpha };
}

function parseOpaqueColour(value?: string): OpaqueRgb | null {
  const colour = parseColour(value);
  return colour?.alpha === 1 ? colour.channels : null;
}

function relativeLuminance([red, green, blue]: OpaqueRgb) {
  const linear = [red, green, blue].map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(first: OpaqueRgb, second: OpaqueRgb) {
  const luminances = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

function contrastFontSizePixels(value?: string) {
  if (!value) return 16;
  const match = value.trim().toLowerCase().match(/^([\d.]+)(px|rem|em|pt)?$/);
  if (!match) return 16;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return 16;
  if (match[2] === "rem" || match[2] === "em") return amount * 16;
  if (match[2] === "pt") return amount * (96 / 72);
  return amount;
}

function contrastFontWeightValue(value?: number | string) {
  if (typeof value === "number") return value;
  if (!value) return 400;
  const namedWeights: Record<string, number> = {
    thin: 100, "extra-light": 200, light: 300, regular: 400, medium: 500,
    "semi-bold": 600, bold: 700, "extra-bold": 800, black: 900,
  };
  return namedWeights[value] ?? (Number(value) || 400);
}

/** Returns null when either colour cannot be assessed as an opaque colour. */
export function paragraphTextColourHasPoorContrast(textColour: string | undefined, backgroundColour: string | undefined, fontSize?: string, fontWeight?: number | string): boolean | null {
  const foreground = parseOpaqueColour(textColour);
  const background = parseOpaqueColour(backgroundColour);
  if (!foreground || !background) return null;
  const pixels = contrastFontSizePixels(fontSize);
  const largeText = pixels >= 24 || (pixels >= 18.66 && contrastFontWeightValue(fontWeight) >= 700);
  return contrastRatio(foreground, background) < (largeText ? 3 : 4.5);
}

export type BlockContrastWarning = { message: string; target: "text" | "link"; kind: "contrast" | "transparency" };

/** Gutenberg-style block warning: text takes priority over the first nonempty link, with AA small text by default. */
export function blockContrastWarning({ backgroundColor, textColor, linkColor, fontSize, isLargeText, enableAlphaChecker = false }: {
  backgroundColor?: string | null;
  textColor?: string;
  linkColor?: string;
  fontSize?: number;
  isLargeText?: boolean;
  enableAlphaChecker?: boolean;
}): BlockContrastWarning | null {
  const background = parseColour(backgroundColor ?? undefined);
  if (!background || background.alpha < 1) return null;
  const threshold = isLargeText || (isLargeText !== false && fontSize !== undefined && fontSize >= 24) ? 3 : 4.5;
  let transparencyWarning: BlockContrastWarning | null = null;
  for (const [target, value] of [["text", textColor], ["link", linkColor]] as const) {
    const foreground = parseColour(value);
    if (!foreground) continue;
    if (contrastRatio(foreground.channels, background.channels) < threshold) {
      if (foreground.alpha < 1) continue;
      const textDescription = target === "link" ? "link colour" : "text colour";
      const darkerBackground = brightness(background.channels) < brightness(foreground.channels);
      return {
        target, kind: "contrast",
        message: darkerBackground
          ? `This colour combination may be hard for people to read. Try using a darker background colour and/or a brighter ${textDescription}.`
          : `This colour combination may be hard for people to read. Try using a brighter background colour and/or a darker ${textDescription}.`,
      };
    }
    if (foreground.alpha < 1 && enableAlphaChecker) transparencyWarning = { target, kind: "transparency", message: "Transparent text may be hard for people to read." };
  }
  return transparencyWarning;
}

function brightness([red, green, blue]: OpaqueRgb) {
  return red * 0.299 + green * 0.587 + blue * 0.114;
}

function gradientHasPoorContrast(foreground: OpaqueRgb, gradient: NonNullable<ParagraphStyle["backgroundGradient"]>) {
  const stopValues = (paragraphBackgroundGradientCss(gradient) ?? "").match(/#[\da-f]{3,8}\b/gi) ?? [];
  const stops = stopValues.map(parseOpaqueColour);
  if (stops.length < 2 || stops.some(stop => stop === null)) return null;
  const colours = stops as OpaqueRgb[];
  for (let stopIndex = 0; stopIndex < colours.length - 1; stopIndex += 1) {
    const start = colours[stopIndex];
    const end = colours[stopIndex + 1];
    for (let step = 0; step <= 32; step += 1) {
      const position = step / 32;
      const sample = start.map((channel, index) => Math.round(channel + (end[index] - channel) * position)) as OpaqueRgb;
      if (contrastRatio(foreground, sample) < 4.5) return true;
    }
  }
  return false;
}

/** Returns null when the active background cannot be assessed as an opaque colour. */
export function paragraphLinkColourHasPoorContrast(colour: string | undefined, style: ParagraphStyle | undefined, defaultBackground = "#FFFFFF"): boolean | null {
  const foreground = parseOpaqueColour(colour);
  if (!foreground || style?.backgroundImageMediaId) return null;
  if (style?.backgroundGradient) return gradientHasPoorContrast(foreground, style.backgroundGradient);
  const background = parseOpaqueColour(style?.backgroundColor ?? defaultBackground);
  return background ? contrastRatio(foreground, background) < 4.5 : null;
}

// Gutenberg's per-block Additional CSS field accepts declarations, not a
// selector. Keep Studio on that safe subset: rules, URLs and CSS escapes must
// not escape the selected block or trigger external resource loads.
export function parseAdditionalCssDeclarations(source?: string): Record<string, string> {
  if (!source || source.length > 6000 || /[{}<>\\@]/.test(source) || /\/\*|\*\//.test(source)
    || /url\s*\(|expression\s*\(|javascript\s*:/i.test(source) || /!\s*important/i.test(source)) return {};

  const declarations: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote && source[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === "'" || character === '"') { quote = character; continue; }
    if (character === "(") depth += 1;
    else if (character === ")") { depth -= 1; if (depth < 0) return {}; }
    else if (character === ";" && depth === 0) { declarations.push(source.slice(start, index)); start = index + 1; }
  }
  if (quote || depth !== 0) return {};
  declarations.push(source.slice(start));

  const css: Record<string, string> = {};
  for (const declaration of declarations) {
    let colon = -1;
    let valueQuote: "'" | '"' | null = null;
    let valueDepth = 0;
    for (let index = 0; index < declaration.length; index += 1) {
      const character = declaration[index];
      if (valueQuote) {
        if (character === valueQuote && declaration[index - 1] !== "\\") valueQuote = null;
        continue;
      }
      if (character === "'" || character === '"') { valueQuote = character; continue; }
      if (character === "(") valueDepth += 1;
      else if (character === ")") valueDepth -= 1;
      else if (character === ":" && valueDepth === 0) { colon = index; break; }
    }
    if (colon < 1) continue;
    const property = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (!/^--[a-zA-Z0-9_-]+$/.test(property) && !/^-?[a-zA-Z][a-zA-Z0-9-]*$/.test(property)) continue;
    const hasControlCharacter = Array.from(value).some(character => {
      const code = character.charCodeAt(0);
      return code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31);
    });
    if (!value || hasControlCharacter) continue;
    const reactProperty = property.startsWith("--") ? property : property.toLowerCase() === "colour" ? "color" : property === "float" ? "cssFloat" : property.replace(/^-([a-z])/i, (_match, letter: string) => letter.toUpperCase()).replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
    css[reactProperty] = value;
  }
  return css;
}

export function paragraphStyleToCss(style?: ParagraphStyle, backgroundImageUrl?: string, previousParagraphIndent?: string): Record<string, string> {
  if (!style && !previousParagraphIndent) return {};
  style ??= {};
  const css: Record<string, string> = {};
  if (style.fontFamily) css.fontFamily = PARAGRAPH_FONT_FAMILIES[style.fontFamily]?.css;
  if (!fitTextEnabled(style)) {
    if (style.fontSizeCustom) css.fontSize = style.fontSizeCustom;
    else if (style.fontSize) css.fontSize = fontSizes[style.fontSize];
  }
  if (style.appearance) {
    const italic = style.appearance === "italic" || style.appearance.endsWith("-italic");
    const weight = (style.appearance === "italic" ? "regular" : italic ? style.appearance.slice(0, -7) : style.appearance) as ParagraphWeight;
    css.fontStyle = italic ? "italic" : "normal";
    css.fontWeight = fontWeights[weight];
  }
  if (style.lineHeight) css.lineHeight = style.lineHeight;
  if (style.letterSpacing) css.letterSpacing = style.letterSpacing;
  if (previousParagraphIndent) css.textIndent = previousParagraphIndent;
  if (style.textColumns && !fitTextEnabled(style)) { css.columnCount = String(style.textColumns); css.columnGap = "1.5em"; }
  if (style.orientation) { css.writingMode = style.orientation; css.textOrientation = "mixed"; }
  if (style.textTransform) css.textTransform = style.textTransform;
  if (style.textDecoration) css.textDecoration = style.textDecoration;
  if (style.textColor) css.color = style.textColor;
  if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
  const backgroundLayers = [
    style.backgroundGradient ? paragraphBackgroundGradientCss(style.backgroundGradient) : undefined,
    backgroundImageUrl ? `url(${JSON.stringify(backgroundImageUrl)})` : undefined,
  ].filter((value): value is string => Boolean(value));
  if (backgroundLayers.length) {
    const imageSize = style.backgroundSize === "fixed" ? `${style.backgroundFixedSize ?? 200}px auto` : style.backgroundSize ?? "cover";
    const repeat = style.backgroundRepeat ?? (style.backgroundSize === "fixed" ? "repeat" : "no-repeat");
    css.backgroundImage = backgroundLayers.join(", ");
    if (backgroundLayers.length > 1) {
      css.backgroundSize = `auto, ${imageSize}`;
      css.backgroundRepeat = `no-repeat, ${repeat}`;
      css.backgroundPosition = `center, ${style.backgroundPositionX ?? 50}% ${style.backgroundPositionY ?? 50}%`;
    } else if (backgroundImageUrl) {
      css.backgroundSize = imageSize;
      css.backgroundPosition = `${style.backgroundPositionX ?? 50}% ${style.backgroundPositionY ?? 50}%`;
      css.backgroundRepeat = repeat;
    }
  }
  if (style.linkColor) css["--studio-paragraph-link-color"] = style.linkColor;
  if (style.linkHoverColor) {
    css["--studio-paragraph-link-hover-color"] = style.linkHoverColor;
    css["--studio-paragraph-link-hover-filter"] = "none";
  }
  if (style.padding) css.padding = style.padding;
  if (style.margin) css.margin = style.margin;
  if (style.minHeight) css.minHeight = style.minHeight;
  if (style.minWidth) css.minWidth = style.minWidth;
  if (style.borderStyle && style.borderStyle !== "none") {
    css.borderStyle = style.borderStyle;
    css.borderWidth = style.borderWidth || "1px";
    css.borderColor = style.borderColor || "#d1cfc7";
  }
  if (style.borderRadius) css.borderRadius = style.borderRadius;
  if (style.shadow) css.boxShadow = style.shadow === "soft" ? "0 4px 16px rgb(0 0 0 / 12%)" : style.shadow === "strong" ? "0 12px 32px rgb(0 0 0 / 22%)" : "none";
  if (style.textShadow) css.textShadow = style.textShadow === "soft" ? "0 1px 2px rgb(0 0 0 / 28%)" : style.textShadow === "strong" ? "0 2px 5px rgb(0 0 0 / 40%)" : "none";
  Object.assign(css, parseAdditionalCssDeclarations(style.additionalCss));
  return css;
}

export function listItemTextStyle(style?: ParagraphStyle): Record<string, string> {
  if (!style) return {};
  return paragraphStyleToCss({
    textColor: style.textColor,
    fontFamily: style.fontFamily,
    appearance: style.appearance,
    letterSpacing: style.letterSpacing,
    textTransform: style.textTransform,
    textDecoration: style.textDecoration,
    fontSize: style.fontSize,
    fontSizeCustom: style.fontSizeCustom,
    lineHeight: style.lineHeight,
    linkColor: style.linkColor,
    linkHoverColor: style.linkHoverColor,
  });
}

const buttonInteractionProperties = new Set([
  "fontFamily", "fontSize", "fontStyle", "fontWeight", "lineHeight", "letterSpacing", "textTransform", "textDecoration",
  "color", "backgroundColor", "backgroundImage", "padding", "margin", "width", "borderStyle", "borderWidth", "borderColor", "borderRadius", "boxShadow",
]);

function buttonStateCss(style: ButtonInteractionStyle): Record<string, string> {
  const css = paragraphStyleToCss(style);
  if (style.width) css.width = `${style.width}%`;
  if (style.backgroundColor && !style.backgroundGradient) css.backgroundImage = "none";
  if (style.borderStyle === "none") css.borderStyle = "none";
  return Object.fromEntries(Object.entries(css).filter(([property]) => buttonInteractionProperties.has(property)));
}

function buttonStatePropertyName(property: string) {
  return property.replace(/[A-Z]/g, character => `-${character.toLowerCase()}`);
}

export function buttonInteractionClassName(styles?: Partial<Record<ButtonInteractionState, ButtonInteractionStyle>>, previewState?: ButtonInteractionState): string {
  if (!styles || !Object.values(styles).some(style => style && Object.keys(buttonStateCss(style)).length > 0)) return "";
  const classes = ["has-button-interaction-styles"];
  for (const state of ["hover", "focus", "active"] as const) {
    const style = styles[state];
    if (!style) continue;
    for (const property of Object.keys(buttonStateCss(style))) classes.push(`has-button-${state}-${buttonStatePropertyName(property)}`);
  }
  if (previewState && styles[previewState] && Object.keys(buttonStateCss(styles[previewState])).length) classes.push(`is-button-state-preview-${previewState}`);
  return classes.join(" ");
}

export function buttonVisualCss(style?: ParagraphStyle, interactionStyles?: Partial<Record<ButtonInteractionState, ButtonInteractionStyle>>): Record<string, string> {
  const css = paragraphStyleToCss(style);
  delete css.margin;
  if (style?.borderStyle === "none") css.borderStyle = "none";
  if (!interactionStyles) return css;

  for (const state of ["hover", "focus", "active"] as const) {
    const stateStyle = interactionStyles[state];
    if (!stateStyle) continue;
    for (const [property, value] of Object.entries(buttonStateCss(stateStyle))) {
      if (css[property] !== undefined) {
        css[`--button-base-${buttonStatePropertyName(property)}`] = css[property];
        delete css[property];
      }
      css[`--button-${state}-${buttonStatePropertyName(property)}`] = value;
    }
  }
  return css;
}

export function buttonInteractionLayoutCss(styles?: Partial<Record<ButtonInteractionState, ButtonInteractionStyle>>): Record<string, string> {
  const css: Record<string, string> = {};
  for (const state of ["hover", "focus", "active"] as const) {
    const width = styles?.[state]?.width;
    if (width) css[`--button-${state}-width`] = `${width}%`;
  }
  return css;
}

export function paragraphStyleClassName(style?: ParagraphStyle, align?: "left" | "centre" | "right") {
  const dropCapIsAvailable = align !== "centre" && align !== "right";
  return [style?.dropCap && dropCapIsAvailable && "has-drop-cap", fitTextEnabled(style) && "has-fit-text", style?.className?.trim().replace(/[^a-zA-Z0-9_-]+/g, " ").trim()].filter(Boolean).join(" ");
}

// Fit text measures horizontal width; keep its setting while vertical text is selected.
export function fitTextEnabled(style?: ParagraphStyle) {
  return Boolean(style?.fitText && style.orientation !== "vertical-rl");
}

export function visualStyleClassName(style: ParagraphStyle) {
  return [
    "block-visual-style",
    style.fontFamily && "has-custom-font-family",
    (style.fontSize || style.fontSizeCustom) && "has-custom-font-size",
    style.appearance && "has-custom-appearance",
    style.lineHeight && "has-custom-line-height",
    style.letterSpacing && "has-custom-letter-spacing",
    style.textColor && "has-custom-text-colour",
    (style.backgroundColor || style.backgroundGradient || style.backgroundImageMediaId) && "has-custom-background",
    paragraphStyleClassName(style),
  ].filter(Boolean).join(" ");
}

export function paragraphStyleAnchor(style?: ParagraphStyle) {
  const anchor = style?.anchor?.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return anchor || undefined;
}
