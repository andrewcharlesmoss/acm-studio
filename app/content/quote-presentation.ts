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

/** Per-level heading maps belong to typed Group content, not WebsiteDesign. */
export function containsGroupHeadingStyles(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsGroupHeadingStyles);
  if (!record(value)) return false;
  const hasMaps = (style: unknown): boolean => record(style) && (
    record(style.headingColors) && Object.keys(style.headingColors).length > 0
    || record(style.headingBackgrounds) && Object.keys(style.headingBackgrounds).length > 0
    || record(style.responsive) && Object.values(style.responsive).some(hasMaps)
  );
  if (value.type === "group" && typeof value.id === "string" && hasMaps(value.visualStyle)) return true;
  if (Array.isArray(value.path) && value.path.includes("nodes") && value.path.includes("visualStyle")
    && (hasMaps(value.value) || ["headingColors", "headingBackgrounds"].includes(String(value.path.at(-1))) && record(value.value) && Object.keys(value.value).length > 0)) return true;
  return Object.values(value).some(containsGroupHeadingStyles);
}

/** Expanded Group shadow presets require the current content envelopes. */
const extendedGroupShadows = new Set(["natural", "deep", "sharp", "outlined", "crisp"]);
export function containsExtendedGroupShadow(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsExtendedGroupShadow);
  if (!record(value)) return false;
  const hasShadow = (style: unknown): boolean => record(style) && (
    extendedGroupShadows.has(style.shadow as string)
    || record(style.responsive) && Object.values(style.responsive).some(hasShadow)
  );
  if (value.type === "group" && typeof value.id === "string" && hasShadow(value.visualStyle)) return true;
  if (Array.isArray(value.path) && value.path.includes("nodes") && value.path.includes("visualStyle")
    && (hasShadow(value.value) || value.path.at(-1) === "shadow" && extendedGroupShadows.has(value.value as string))) return true;
  return Object.values(value).some(containsExtendedGroupShadow);
}

/** Extra Black is gated only when it belongs to a recognised content style owner. */
export function containsExtraBlackAppearance(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsExtraBlackAppearance);
  if (!record(value)) return false;
  const hasAppearance = (style: unknown): boolean => record(style) && (
    style.appearance === "extra-black" || style.appearance === "extra-black-italic"
    || ["responsive", "previewResponsive", "variations", "interactionStates"].some(key => record(style[key]) && Object.values(style[key] as Record<string, unknown>).some(hasAppearance))
  );
  const visualOwner = typeof value.type === "string" && contentNodeTypes.has(value.type)
    || value.type === "element" && ["navigation", "content", "document-title", "subtitle", "cover-image"].includes(value.element as string);
  const styleOwner = ["paragraph", "column", "columns"].includes(value.type as string)
    || value.type === "element" && value.element === "subtitle";
  const siteLinkOwner = typeof value.id === "string" && typeof value.label === "string" && typeof value.url === "string";
  const buttonInteractionOwner = value.type === "button" && record(value.interactionStyles) && Object.values(value.interactionStyles).some(hasAppearance);
  const searchStyleOwner = (value.type === "group" && record(value.data) && value.data.templateElement === "navigation" && value.data.searchEnabled === true
    || value.type === "element" && value.element === "navigation" && value.searchEnabled === true) && hasAppearance(value.searchVisualStyle);
  const websiteBlockStyles = record(value.styles) && record(value.styles.blockStyles) ? value.styles.blockStyles : undefined;
  if (typeof value.id === "string" && (
    visualOwner && hasAppearance(value.visualStyle)
    || styleOwner && hasAppearance(value.style)
    || siteLinkOwner && hasAppearance(value.visualStyle)
    || buttonInteractionOwner
    || searchStyleOwner
    || value.type === "list" && Array.isArray(value.items) && value.items.some(item => record(item) && hasAppearance(item.style))
  )) return true;
  if (websiteBlockStyles && Object.values(websiteBlockStyles).some(hasAppearance)) return true;
  if (Array.isArray(value.path) && value.path.includes("nodes") && value.path.some(part => part === "visualStyle" || part === "style" || part === "interactionStyles" || part === "searchVisualStyle")) {
    if (hasAppearance(value.value) || value.path.at(-1) === "appearance" && (value.value === "extra-black" || value.value === "extra-black-italic")) return true;
  }
  if (Array.isArray(value.path) && value.path.includes("blockStyles") && value.path.at(-1) === "appearance"
    && (value.value === "extra-black" || value.value === "extra-black-italic")) return true;
  return Object.values(value).some(containsExtraBlackAppearance);
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
  + `@media(max-width:480px){${scopedQuoteRules("mobile")}}@media(max-width:782px){@media not all and (max-width:480px){${scopedQuoteRules("tablet")}}}`
  + `@container studio-document (max-width:480px){${scopedQuoteRules("mobile",true)}}@container studio-document (width > 480px) and (max-width:782px){${scopedQuoteRules("tablet",true)}}`;

function groupHeadingRules(viewport?: "tablet" | "mobile", editor = false) {
  return [1, 2, 3, 4, 5, 6].map(level => {
    const ownerBase = ":is(.content-group,.template-group,.studio-nested-group,.quote-field,.pull-quote)";
    const owner = `${editor ? ".studio-responsive-container " : ""}${ownerBase}`;
    const suffix = `${viewport ? `-${viewport}` : ""}-h${level}`;
    const target = `:is(h${level},.heading-field.is-h${level})`;
    const colour = `${owner}.has-group-heading-colour${suffix} ${target}`;
    const background = `${owner}.has-group-heading-background${suffix} ${target}`;
    const outsideEditor = viewport && !editor ? ":not(.studio-responsive-container *)" : "";
    const colourRule = `${colour}${outsideEditor}{color:var(--studio-heading-own-color,var(--studio-group-heading-${level}-color,var(--studio-quote-heading-color,var(--site-container-heading-${level}-color,inherit))))!important}`;
    const backgroundRule = `${background}${outsideEditor}{background-color:var(--studio-heading-own-background-color,var(--studio-group-heading-${level}-background-color,var(--studio-quote-heading-background-color,var(--site-container-heading-${level}-background-color,transparent))))!important;background-image:var(--studio-heading-own-background-image,var(--studio-group-heading-${level}-background-image,var(--studio-quote-heading-background-image,var(--site-container-heading-${level}-background-image,none))))!important}`;
    return colourRule + backgroundRule;
  }).join("");
}
const groupHeadingPresentationCss = groupHeadingRules()
  + `@media(max-width:782px){@media not all and (max-width:480px){${groupHeadingRules("tablet")}}}`
  + `@media(max-width:480px){${groupHeadingRules("mobile")}}`
  + `@container studio-document (width > 480px) and (max-width:782px){${groupHeadingRules("tablet", true)}}`
  + `@container studio-document (max-width:480px){${groupHeadingRules("mobile", true)}}`;
export { groupHeadingPresentationCss };
