import { quotePresentationCss } from "./quote-presentation";
import type { ParagraphStyle } from "./model";

export type StyleViewport = "desktop" | "tablet" | "mobile";
export const RESPONSIVE_STYLE_FIELDS = [
  "fontFamily", "fontSize", "fontSizeCustom", "appearance", "textTransform", "textDecoration",
  "lineHeight", "letterSpacing", "textColumns", "orientation", "minHeight", "minWidth",
  "textColor", "backgroundColor", "backgroundGradient", "linkColor", "linkHoverColor", "blockGap", "headingColor", "headingBackgroundColor", "headingBackgroundGradient",
  "padding", "margin", "borderStyle", "borderWidth", "borderColor", "shadow", "textShadow", "borderRadius",
] as const;
export type ResponsiveStyleField = typeof RESPONSIVE_STYLE_FIELDS[number];
export type ResponsiveStyleOverride = Pick<ParagraphStyle, ResponsiveStyleField>;
export type ResponsiveStyles = Partial<Record<"tablet" | "mobile", ResponsiveStyleOverride>>;

export function styleForViewport(style: ParagraphStyle | undefined, viewport: StyleViewport): ParagraphStyle {
  const base = { ...style };
  delete base.responsive;
  if (viewport === "desktop") return base;
  const override = style?.responsive?.[viewport];
  const effective = { ...base, ...override };
  if (override?.fontSize) delete effective.fontSizeCustom;
  if (override?.fontSizeCustom) delete effective.fontSize;
  if (override?.backgroundColor && !override.backgroundGradient) delete effective.backgroundGradient;
  if (override?.headingBackgroundColor && !override.headingBackgroundGradient) delete effective.headingBackgroundGradient;
  if (override?.headingBackgroundGradient && !override.headingBackgroundColor) delete effective.headingBackgroundColor;
  if (override?.backgroundGradient && !override.backgroundColor) delete effective.backgroundColor;
  return effective;
}

/** The inspector edits explicit values only; deleting one restores Desktop inheritance. */
export function editableViewportStyle(style: ParagraphStyle | undefined, viewport: StyleViewport): ParagraphStyle {
  return viewport === "desktop" ? styleForViewport(style, viewport) : { ...style?.responsive?.[viewport] };
}

export function replaceViewportStyle(style: ParagraphStyle | undefined, viewport: StyleViewport, next: ParagraphStyle): ParagraphStyle | undefined {
  const values = { ...next };
  delete values.responsive;
  if (viewport === "desktop") {
    const result = { ...values, ...(style?.responsive ? { responsive: style.responsive } : {}) };
    return Object.keys(result).length ? result : undefined;
  }
  const override = Object.fromEntries(Object.entries(values).filter(([key, value]) => RESPONSIVE_STYLE_FIELDS.includes(key as ResponsiveStyleField) && value !== undefined && value !== ""));
  const responsive = { ...style?.responsive };
  if (Object.keys(override).length) responsive[viewport] = override;
  else delete responsive[viewport];
  const result = { ...style };
  if (Object.keys(responsive).length) result.responsive = responsive;
  else delete result.responsive;
  return Object.keys(result).length ? result : undefined;
}

export function containsResponsiveStyles(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsResponsiveStyles);
  return Object.entries(value).some(([key, child]) => key === "responsive" || containsResponsiveStyles(child));
}

/** Reuse each specialised block's canonical CSS mapper for its responsive surfaces. */
export function responsiveStyleCss(style: ParagraphStyle | undefined, map: (style: ParagraphStyle) => Record<string, string>): Record<string, string> {
  const base = map(styleForViewport(style, "desktop"));
  if (!style?.responsive) return base;
  const result = { ...base };
  for (const viewport of ["tablet", "mobile"] as const) {
    const effective = map(styleForViewport(style, viewport));
    for (const property of new Set([...Object.keys(base), ...Object.keys(effective)])) if (effective[property] !== base[property]) result[`--studio-rs-${viewport}-${responsiveCssVariable(property)}`] = effective[property] ?? "initial";
  }
  return result;
}

const cssProperties = [...["font-family", "font-size", "font-style", "font-weight", "line-height", "letter-spacing", "text-transform", "text-decoration", "color"].map(property => `--button-group-${property}`), "font-family", "font-size", "font-style", "font-weight", "line-height", "letter-spacing", "column-count", "column-gap", "writing-mode", "text-orientation", "text-transform", "text-decoration", "color", "background-color", "background-image", "background-size", "background-repeat", "background-position", "padding", "margin", "min-height", "min-width", "border-style", "border-width", "border-color", "border-top-color", "border", "height", "mask-image", "mask-position", "mask-repeat", "mask-size", "border-radius", "box-shadow", "text-shadow", "--studio-paragraph-link-color", "--studio-paragraph-link-hover-color", "--studio-paragraph-link-hover-filter", "--social-icon-background", "--social-icon-background-image", "--social-icon-colour", "--studio-quote-block-gap", "--studio-quote-heading-color", "--studio-quote-heading-background-color", "--studio-quote-heading-background-image", "--studio-heading-own-color", "--studio-heading-own-background-color", "--studio-heading-own-background-image"];
export function responsiveCssVariable(property: string) {
  return property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^--/, "");
}
function viewportRules(viewport: "tablet" | "mobile", editor: boolean) {
  return cssProperties.map(property => {
    const name = property.replace(/^--/, "");
    const selector = `[style*="--studio-rs-${viewport}-${name}:"]`;
    const scoped = editor ? `.studio-responsive-container ${selector}` : `${selector}:not(.studio-responsive-container *)`;
    const interaction = `.content-button:is(.has-button-hover-${name},.has-button-focus-${name},.has-button-active-${name})`;
    return `${scoped}:not(${interaction}){${property}:var(--studio-rs-${viewport}-${name})!important;}${scoped}${interaction}{--button-base-${name}:var(--studio-rs-${viewport}-${name})!important;}`;
  }).join("") + viewportInheritanceRules(viewport, editor);
}

const inheritedBlockElements = ":is(h1,h2,h3,h4,h5,h6,blockquote,ol,ul,pre,.block-textarea,.list-field-marker,.list-field-row textarea,.list-item-editor,.list-item-text,.quote-citation,.content-table,.content-table-cell,.table-field-grid .table-cell-editor,.code-highlight,.code-input,.studio-code-preview,.metadata-block,.metadata-block-editor,.document-dynamic-field,.document-dynamic-field p,.article-byline,.article-byline-detail,.reading-time-badge,.article-footnotes,.footnotes-field,.footnotes-field textarea)";
function viewportInheritanceRules(viewport: "tablet" | "mobile", editor: boolean) {
  const scope = (selector: string) => editor ? `.studio-responsive-container ${selector}` : `${selector}:not(.studio-responsive-container *)`;
  const typography = ["font-size", "font-family", "font-style", "font-weight", "line-height", "letter-spacing", "color", "text-transform", "text-decoration", "text-shadow"].map(property => `${scope(`:is(.block-visual-style,.content-table,.table-field-grid)[style*="--studio-rs-${viewport}-${property}:"]:is(.block-visual-style,.content-table,.table-field-grid) ${inheritedBlockElements}`)}{${property}:inherit;}`).join("");
  const background = ["background-color", "background-image"].map(property => `${scope(`.block-visual-style[style*="--studio-rs-${viewport}-${property}:"] :is(pre,.code-editor-shell,.code-highlight,.studio-code-preview)`)}{background:transparent;}`).join("");
  const borders = ["width", "style", "color"].map(property => {
    const table = `:is(.content-table,.table-field-grid)[style*="--studio-rs-${viewport}-border-${property}:"]`;
    return `${scope(`${table} :is(thead,tbody,tfoot,tr,th,td)`)}{border-${property}:inherit;}${scope(table)}{border-collapse:collapse;}${scope(`:is(.content-table-frame,.table-field):has(>${table})`)}{border:0;}`;
  }).join("");
  const clipping = `${scope(`:is(.template-cover,.cover-image-visual-style-frame)[style*="--studio-rs-${viewport}-border-radius:"]`)}{overflow:hidden;}${scope(`:is(.template-cover,.cover-image-visual-style-frame)[style*="--studio-rs-${viewport}-border-radius:"] .document-featured-placeholder`)}{border-radius:0;}`;
  const socialForeground = `${scope(`[style*="--studio-rs-${viewport}-social-icon-colour:"] .social-icon-item`)}{color:var(--social-icon-colour);}`;
  return typography + background + borders + clipping + socialForeground;
}
/** Static selectors only; authored values remain React-escaped inline data. */
export const responsiveBlockCss = quotePresentationCss + `
.studio-responsive-container{container-type:inline-size;container-name:studio-document;}
@media (max-width:480px){${viewportRules("mobile", false)}}
@media (min-width:480.01px) and (max-width:782px){${viewportRules("tablet", false)}}
@container studio-document (max-width:480px){${viewportRules("mobile", true)}}
@container studio-document (min-width:480.01px) and (max-width:782px){${viewportRules("tablet", true)}}
`;
