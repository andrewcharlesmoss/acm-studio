import { GROUP_ALLOWED_BLOCK_TYPES } from "./model";

/** Content presentation fields deliberately excluded from older portable envelopes.
 * Website Block Styles already used similarly named settings in a separate domain. */
export const QUOTE_PRESENTATION_FIELDS = ["blockGap", "headingColor", "headingBackgroundColor", "headingBackgroundGradient"] as const;
const contentNodeTypes = new Set<string>([...GROUP_ALLOWED_BLOCK_TYPES, "column", "component", "footnotes"]);
function record(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
export function styleHasQuotePresentation(value: unknown): boolean {
  return record(value) && (QUOTE_PRESENTATION_FIELDS.some(field => value[field] !== undefined)
    || record(value.responsive) && Object.values(value.responsive).some(styleHasQuotePresentation));
}
export function containsQuotePresentation(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsQuotePresentation);
  if (!record(value)) return false;
  const visualOwner = typeof value.type === "string" && (contentNodeTypes.has(value.type)
    || value.type === "element" && ["navigation", "content", "document-title", "subtitle", "cover-image"].includes(value.element as string));
  const styleOwner = ["paragraph", "column", "columns"].includes(value.type as string)
    || value.type === "element" && value.element === "subtitle";
  if (typeof value.id === "string"
    && (visualOwner && styleHasQuotePresentation(value.visualStyle) || styleOwner && styleHasQuotePresentation(value.style)
      || value.type === "list" && Array.isArray(value.items) && value.items.some(item => record(item) && styleHasQuotePresentation(item.style)))) return true;
  // Recovery overrides identify their content owner through a nodes/style path;
  // unrelated website-design settings do not use this path.
  if (Array.isArray(value.path) && value.path.includes("nodes") && value.path.some(part => part === "visualStyle" || part === "style")) {
    if (QUOTE_PRESENTATION_FIELDS.includes(value.path.at(-1) as typeof QUOTE_PRESENTATION_FIELDS[number]) && value.value !== undefined) return true;
    if (styleHasQuotePresentation(value.value)) return true;
  }
  return Object.values(value).some(containsQuotePresentation);
}

/** Only authored presentation owners opt into these rules. Website-only and
 * legacy unstyled Quotes retain their existing painted surfaces. */
function quoteRules(owner: string, colour: boolean, background: boolean, gap: boolean): string {
  let rules = "";
  for (const level of [1,2,3,4,5,6]) {
    const target = `${owner} :is(h${level},.heading-field.is-h${level})`;
    if (colour) rules += `${target}{color:var(--studio-heading-own-color,var(--studio-quote-heading-color,var(--site-container-heading-${level}-color,inherit)))!important}`;
    if (background) rules += `${target}{background-color:var(--studio-heading-own-background-color,var(--studio-quote-heading-background-color,transparent))!important;background-image:var(--studio-heading-own-background-image,var(--studio-quote-heading-background-image,none))!important}`;
  }
  if (gap) {
    rules += `${owner}>blockquote{display:flow-root}`;
    const body = `:is(${owner}>blockquote,${owner}>blockquote>.prose)>.quote-body-block`;
    rules += `${body}+ .quote-body-block{margin-block-start:var(--studio-quote-block-gap)}${owner}>.quote-citation{margin-block-start:var(--studio-quote-block-gap)}`;
    // Default painted-surface margins must not add an extra gap. Explicit child margins
    // remain inline on the child or its visual frame and retain precedence.
    const surface = ":is(p,h1,h2,h3,h4,h5,h6,figure,blockquote,ul,ol,.paragraph-field,.heading-field,.block-visual-style)";
    rules += `${body}>${surface},${body}>.block-visual-style>${surface}{margin-block:0}`;
    // Public List item end margins remain inside their painted List box. The
    // authoring and Studio preview Lists keep their existing grid layout.
    const list = ':is(ul,ol):not(.list-field-editor):not(.list-field-preview)';
    rules += `${body}>${list},${body}>.block-visual-style>${list}{display:flow-root}`;
  }
  return rules;
}
function scopedQuoteRules(viewport?: "tablet" | "mobile", editor = false): string {
  const prefix = viewport ? `${viewport}-` : "";
  const owner = (kind: string) => `${editor ? ".studio-responsive-container " : ""}:is(.quote-field,.pull-quote).has-quote-${prefix}${kind}${viewport && !editor ? ":not(.studio-responsive-container *)" : ""}`;
  return quoteRules(owner("heading-colour"),true,false,false) + quoteRules(owner("heading-background"),false,true,false) + quoteRules(owner("block-gap"),false,false,true);
}
export const quotePresentationCss = ":is(.quote-field,.pull-quote){--studio-quote-block-gap:initial}" + scopedQuoteRules()
  + `@media(max-width:480px){${scopedQuoteRules("mobile")}}@media(min-width:480.01px) and (max-width:782px){${scopedQuoteRules("tablet")}}`
  + `@container studio-document (max-width:480px){${scopedQuoteRules("mobile",true)}}@container studio-document (min-width:480.01px) and (max-width:782px){${scopedQuoteRules("tablet",true)}}`;
