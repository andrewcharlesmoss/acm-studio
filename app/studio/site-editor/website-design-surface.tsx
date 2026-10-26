"use client";
import { TEXT_STYLE_VARIATIONS, textStyleVariation } from "../../content/text-style-variations";
import { createContext, useContext, useId, type CSSProperties, type ReactNode } from "react";
import { expandBoxLengths } from "../../content/box-lengths";
import type { ContentBlock } from "../../content/model";
import { safeTextLink } from "../../content/rich-text";
import { BlockPreviewRules } from "./block-preview-rules";
import { sectionStyleReference } from "./section-style-variations";
import { applyPreviewBlockStyles, previewBlockTarget, previewBlockVariation, projectedStyle, referencePreviewBlockStyles, resolvePreviewBlockVariant, type PreviewBlockId } from "./blocks-preview-model";
import { previewBackgroundCss } from "./background-preview-model";
import { previewColourValue, previewRoleBackground } from "./colours-preview-model";
import { previewStyleDetails, type StyleSelection } from "./styles-preview-state";
import { resolvedTypographyFields, typographyFieldsCss, type TypographyRole } from "./typography-preview-model";
import type { PortableDesignImage, effectiveWebsiteDesign } from "./website-design";
/* eslint-disable @next/next/no-img-element -- The same portable markup is rendered into static local fixture HTML. */

type EffectiveDesign = ReturnType<typeof effectiveWebsiteDesign>;
const identityUrl = (src: string) => src;
export const WebsiteDesignContext = createContext<{ design: EffectiveDesign; imageUrl: (src: string) => string } | null>(null);
export const useWebsiteDesignContext = () => useContext(WebsiteDesignContext);
const cssName = (name: string) => name.replace(/[A-Z]/g, character => `-${character.toLowerCase()}`);
const declarations = (styles: CSSProperties) => Object.entries(styles).filter(([, value]) => value !== undefined && value !== null).map(([property, value]) => `${cssName(property)}:${value}`).join(";");

// A render-local marker prevents recursive renderers from treating inherited values as authored.
// Symbols are never serialised into documents, backups, or save transactions.
const projectedBlock = Symbol("website-design-projection");
function blockVariation(source: ContentBlock): string | undefined {
  const block = previewBlockVariation(source);
  if (block) return block;
  const style = source.type === "paragraph" ? source.style : source.visualStyle;
  const variation = source.type === "paragraph" || source.type === "heading" ? textStyleVariation(style) : "default";
  return variation === "default" ? undefined : variation;
}

/** A fresh render projection. The editor must retain its canonical document for all commands. */
export function projectWebsiteDesignBlocks(blocks: ContentBlock[], selection: StyleSelection, previousSibling?: ContentBlock, inheritedSection = false): ContentBlock[] {
  return blocks.map((source, index) => {
    if ((source as ContentBlock & { [projectedBlock]?: boolean })[projectedBlock]) return source;
    // The shared mapper owns authored-property precedence and block-specific variations.
    const variant = blockVariation(source);
    const blockId = previewBlockTarget(source);
    const base = selection.blockStyles?.[blockId];
    const inSection = inheritedSection || Boolean(sectionStyleReference(variant));
    const styles = variant && (base?.variations?.[variant] || source.type === "paragraph" || source.type === "heading") ? { ...selection.blockStyles, [blockId]: resolvePreviewBlockVariant(base, variant) } : selection.blockStyles;
    let block = applyPreviewBlockStyles([source], styles, "default", false, index === 0 ? previousSibling : blocks[index - 1], inheritedSection)[0];
    const original = source.type === "paragraph" || source.type === "column" || source.type === "columns" ? source.style : source.visualStyle;
    const projected = block.type === "paragraph" || block.type === "column" || block.type === "columns" ? block.style : block.visualStyle;
    const authoredAlignment = "align" in source && source.align !== undefined;
    if (projected || original || variant || authoredAlignment) {
      const markers = [projectedStyle({}, original ?? {}).className, authoredAlignment ? "site-block-authored-text-align" : undefined].filter(Boolean).join(" ");
      const className = [...new Set([projected?.className, original?.className, `site-block-style-${blockId}`, markers, variant ? `site-block-variation-${variant}` : undefined].filter(Boolean).flatMap(value => value!.split(/\s+/)))].join(" ");
      const style = { ...projected, ...original, ...(className ? { className } : {}) };
      block = block.type === "paragraph" || block.type === "column" || block.type === "columns" ? { ...block, style } : { ...block, visualStyle: style };
    }
    if ("children" in source && Array.isArray(source.children)) {
      block = { ...block, children: projectWebsiteDesignBlocks(source.children, selection, undefined, inSection) } as ContentBlock;
    }
    Object.defineProperty(block, projectedBlock, { value: true });
    return block;
  });
}

function portableImage(value: unknown): PortableDesignImage | undefined {
  return value && typeof value === "object" && "src" in value ? value as PortableDesignImage : undefined;
}

/** Shared by static output and React previews; image bytes remain with their existing owner. */
export function WebsiteDesignIdentity({ design, homeUrl, imageUrl = identityUrl }: { design: EffectiveDesign; homeUrl: string; imageUrl?: (src: string) => string }) {
  const identity = design.identity;
  const hidden = identity.hidden ?? {};
  const title = hidden.title || identity.title === null ? "" : identity.title ?? "";
  const tagline = hidden.tagline || identity.tagline === null ? "" : identity.tagline ?? "";
  const logo = !hidden.logo && portableImage(identity.logo);
  const initials = title.trim().split(/\s+/).filter(Boolean).map(word => word[0]).slice(0, 2).join("").toUpperCase();
  if (!title && !tagline && !logo && (hidden.logo || !initials)) return null;
  return <a className="template-brand website-design-identity" href={safeTextLink(homeUrl) ?? undefined}>
    {logo ? <img src={imageUrl(logo.src)} alt={logo.altText} /> : !hidden.logo && initials ? <span className="template-brand-mark" aria-hidden="true">{initials}</span> : null}
    {title || tagline ? <span className="website-design-identity-copy">{title ? <span className="template-brand-name">{title}</span> : null}{tagline ? <span className="website-design-tagline">{tagline}</span> : null}</span> : null}
  </a>;
}

const roleTargets: Partial<Record<TypographyRole, string[]>> = {
  text: [".paragraph-field", ".list-item-text", ".list-item-editor", ".list-field-marker", ".content-table", ".table-field-grid", ".studio-code-preview", ".code-highlight", ".code-input"],
  links: [".paragraph-field a", ".preview-rich-text a", ".list-item-text a", ".template-navigation a"],
  captions: ["figcaption", ".image-caption", ".quote-citation-editor"],
  buttons: [".content-button"],
};

/** Canonical role resolvers supply both previews and generated output, without specimen layout. */
export function websiteDesignRules(selection: StyleSelection, scopeId: string, legacy = false, families: { paletteSelected?: boolean; typographySelected?: boolean; referenceDefaults?: boolean } = {}): string {
  const scope = `[data-website-design="${scopeId.replace(/[^a-zA-Z0-9_-]/g, "")}"]`;
  const { palette, typography } = previewStyleDetails(selection);
  const settings = selection.typography ?? {};
  const paletteSelected = families.paletteSelected ?? !legacy;
  const typographySelected = families.typographySelected ?? !legacy;
  const rules: string[] = [];
  const emit = (selectors: string[], css: CSSProperties, authored = true) => {
    for (const [property, value] of Object.entries(css)) {
      if (value === undefined || value === null) continue;
      const name = cssName(property);
      const protectedSelectors = selectors.map(selector => `${scope} ${selector}${authored ? `:not(.site-block-authored-${name})` : ""}`);
      rules.push(`${protectedSelectors.join(",")}{${name}:${value}}`);
    }
  };
  for (const role of ["text", "links", "captions", "buttons", "h1", "h2", "h3", "h4", "h5", "h6"] as const) {
    const ownFields = { ...(role.startsWith("h") ? settings.elements?.headings : {}), ...settings.elements?.[role] };
    const fields = !typographySelected ? ownFields : resolvedTypographyFields(typography, settings, role);
    const css = typographyFieldsCss(fields, settings);
    if (!typographySelected && ownFields.fontStyle === undefined) delete css.fontStyle;
    // Typography's Colour field is also the foreground owner exposed in Colours → Elements.
    // Emit it explicitly so authored website colours can override browser/theme link defaults.
    const roleColour = previewColourValue(fields.colour, palette, selection.colours);
    if (roleColour) css.color = roleColour;
    if (paletteSelected || selection.colours?.theme?.["1"] !== undefined) css.color ??= role === "buttons" ? palette.buttonText : role.startsWith("h") ? palette.heading : palette.text;
    const background = previewRoleBackground(selection.colours ?? {}, role);
    if (background) css.background = background;
    const targets = roleTargets[role] ?? [`.heading-field.is-${role}`, role === "h1" ? ".preview-title" : `.preview-title.is-${role}`, `.content-heading.is-${role}`];
    // Author markers live on canonical block wrappers, while text is painted by their fields.
    for (const [property, value] of Object.entries(css)) {
      if (value === undefined || value === null) continue;
      const name = cssName(property);
      const referenceNavigationProperty = role === "links" && families.referenceDefaults && (
        property === "textDecoration" && settings.elements?.links?.decoration === undefined ||
        property === "fontSize" && settings.elements?.links?.size === undefined && settings.elements?.links?.preset === undefined);
      const availableTargets = referenceNavigationProperty
        ? targets.filter(target => target !== ".template-navigation a") : targets;
      // Table headers keep their semantic centred alignment, while data cells
      // keep the browser's start alignment. A site-wide Text alignment must
      // not flatten those table-specific defaults.
      const propertyTargets = role === "text" && ["textAlign", "fontWeight"].includes(property)
        ? targets.filter(target => !target.includes("content-table-cell") && !target.includes("table-field-grid .table-cell-editor") && (property !== "textAlign" || (!target.includes("content-table") && !target.includes("table-field-grid"))))
        : role === "text" && property === "background"
          ? targets.filter(target => target !== ".code-input")
          : availableTargets;
      const buttonStates = role === "buttons" ? ["hover", "focus", "active"].map(state => `:not(.has-button-${state}-${name}:is(:${state},.is-button-state-preview-${state}))`).join("") : "";
      const buttonValue = name === "color" && !roleColour ? `var(--button-base-color,${value})` : value;
      const roleValue = role === "buttons" ? `var(--button-group-${name},${buttonValue})` : value;
      if (propertyTargets.length) rules.push(`${scope} :is(${propertyTargets.join(",")}):not(.site-block-authored-${name}):not(.site-block-authored-${name} *)${buttonStates}{${name}:${roleValue}}`);
    }
    if (role === "text") emit([".template-surface", ".test-site-page"], css, false);
  }
  const hover = selection.colours?.elements?.links?.hover;
  if (hover) emit([".paragraph-field a:hover", ".preview-rich-text a:hover", ".list-item-text a:hover", ".template-navigation a:hover"], { color: previewColourValue(hover, palette, selection.colours) }, false);
  if (families.referenceDefaults && settings.elements?.links?.decoration === undefined) {
    emit([".template-navigation a:not(.site-block-authored-text-decoration *)"], { textDecoration: "none" });
    emit([".template-navigation a:hover:not(.site-block-authored-text-decoration *)"], { textDecoration: "underline" });
  }
  if (families.referenceDefaults && settings.elements?.links?.size === undefined && settings.elements?.links?.preset === undefined) {
    emit([".template-navigation"], { fontSize: typographyFieldsCss({ preset: "medium" }, settings).fontSize });
  }
  const layout = selection.layout;
  if (layout?.contentWidth) emit([".test-site-page"], { maxWidth: layout.contentWidth, marginInline: "auto" }, false);
  else if (families.referenceDefaults) {
    const [, right, , left] = layout?.padding !== undefined ? expandBoxLengths(layout.padding) : [];
    const width = left !== undefined && right !== undefined ? `calc(645px + ${left} + ${right})` : "calc(645px + 2 * var(--acm-layout-spacing, 24px))";
    emit([".test-site-page"], { maxWidth: width, marginInline: "auto" }, false);
  }
  if (layout?.wideWidth) emit([".test-document-navigation", '[data-block-align="wide"]', ".block-align-wide"], { maxWidth: layout.wideWidth, marginInline: "auto" }, false);
  if (layout?.padding !== undefined) {
    const [, right, , left] = expandBoxLengths(layout.padding);
    emit([".test-site-page"], { padding: layout.padding, boxSizing: "border-box", "--studio-canvas-inline-padding": right === left ? right : "0px" } as CSSProperties, false);
  } else {
    // The page root owns the gutter in both modes, including legacy main bodies and their appender.
    emit([".test-site-page"], { paddingInline: "var(--acm-layout-spacing, 24px)", boxSizing: "border-box", "--studio-canvas-inline-padding": "var(--acm-layout-spacing, 24px)" } as CSSProperties, false);
  }
  // Avoid doubling the legacy stylesheet gutter; authored inline Group padding still wins.
  emit([".test-site-page main"], { paddingInline: "0px" }, false);
  // Flow Groups fall back to the website rhythm when they have no authored gap.
  // Keep the inherited default in the same presentation path as explicit Layout values.
  const blockSpacing = layout?.blockSpacing ?? "1.2rem";
  emit([".test-site-page"], { "--studio-block-gap": blockSpacing, "--studio-block-margin": blockSpacing } as CSSProperties, false);
  return rules.join("\n");
}

/** Presentation only: persistence, validation, history, and edit commands remain with the host. */
export function WebsiteDesignSurface({ design, children, imageUrl = identityUrl, scopeId, legacy = false, referenceDefaults = false, compiledCss = "" }: { design: EffectiveDesign; children: ReactNode; imageUrl?: (src: string) => string; scopeId?: string; legacy?: boolean; referenceDefaults?: boolean; compiledCss?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const scope = (scopeId ?? `website-${id}`).replace(/[^a-zA-Z0-9_-]/g, "");
  // Test/Test2 opt into the same render-only theme defaults as the comparison
  // page. Saved selections and canonical content remain untouched.
  const selection = referenceDefaults ? { ...design.styles, blockStyles: referencePreviewBlockStyles(design.styles.blockStyles) } : design.styles;
  const { palette } = previewStyleDetails(selection);
  const vars: Record<string, string> = {};
  palette.colours.forEach((colour, index) => { vars[`--site-palette-theme-${index}`] = colour; });
  for (const [key, value] of Object.entries(selection.colours?.retired ?? {})) vars[`--site-palette-${key}`] = value;
  for (const value of Object.values(selection.colours?.custom ?? {})) if (value) vars[`--site-palette-${value.id}`] = value.colour;
  const image = portableImage(selection.background?.image);
  const background = previewBackgroundCss(selection.background, palette, selection.colours, image ? imageUrl(image.src) : undefined);
  const imageUrls: Record<string, string> = {};
  const collectImages = (value: unknown): void => {
    const image = portableImage(value);
    if (image) { imageUrls[image.id] = imageUrl(image.src); return; }
    if (Array.isArray(value)) value.forEach(collectImages);
    else if (value && typeof value === "object") Object.values(value).forEach(collectImages);
  };
  collectImages(selection.blockStyles);
  const paletteSelected = referenceDefaults || ("paletteSelected" in design ? Boolean(design.paletteSelected) : !legacy);
  const typographySelected = referenceDefaults || ("typographySelected" in design ? Boolean(design.typographySelected) : !legacy);
  const paintBackground = paletteSelected || selection.colours?.theme?.["0"] !== undefined || selection.background && Object.keys(selection.background).length > 0;
  return <WebsiteDesignContext value={{ design: { ...design, styles: selection }, imageUrl }}><div className="website-design-surface studio-responsive-container" data-website-design={scope} data-block-preview-scope={scope} data-site-custom-css-root style={vars as CSSProperties}>
    <style>{websiteDesignRules(selection, scope, legacy, { paletteSelected, typographySelected, referenceDefaults }) + (paintBackground ? `[data-website-design="${scope}"]{${declarations(background)}}[data-website-design="${scope}"] :is(.test-site-page,.template-surface){background:transparent}` : "") + compiledCss}</style>
    {/* CSS resolution keeps the authored selection separate from context's projection. */}
    <BlockPreviewRules selection={design.styles} scopeId={scope} referenceDefaults={referenceDefaults} imageUrls={imageUrls} />
    {[...new Set(["paragraph", "heading", ...Object.keys(design.styles.blockStyles ?? {})])].flatMap(blockId => { const style = design.styles.blockStyles?.[blockId as PreviewBlockId]; const variants = new Set([...(blockId === "paragraph" || blockId === "heading" ? TEXT_STYLE_VARIATIONS.map(choice => choice.id) : []), ...Object.keys(style?.variations ?? {})]); return [...variants].map(variant => <BlockPreviewRules key={`${blockId}-${variant}`} onlyBlock={blockId as PreviewBlockId} selection={{ ...design.styles, blockStyles: { [blockId]: resolvePreviewBlockVariant(style, variant) } }} scopeId={scope} referenceDefaults={referenceDefaults} imageUrls={imageUrls} selectorSuffix={`.site-block-variation-${variant}`} />); })}
    {children}
  </div></WebsiteDesignContext>;
}
