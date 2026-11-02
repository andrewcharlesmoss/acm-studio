"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { ContentBlock, ButtonInteractionState } from "../../content/model";
import type { StyleViewport } from "../../content/responsive-styles";
import { findContentBlock } from "../../content/block-tree";
import { parentOfNestedBlock } from "../block-inserter-options";
import { blockPreviewStyle, effectivePreviewBlockStyle, previewBlockTarget, previewBlockVariation, resolvePreviewBlockVariant, mergeStyleFields, type PreviewBlockStyle } from "../site-editor/blocks-preview-model";
import { previewStyleDetails, type StyleSelection } from "../site-editor/styles-preview-state";
import { type TypographyRole } from "../site-editor/typography-preview-model";
import { explicitTypographyFields, explicitPaletteColour, explicitBlockStyle } from "../site-editor/style-provenance";
import { previewColourValue } from "../site-editor/colours-preview-model";
import { useWebsiteDesignContext } from "../site-editor/website-design-surface";
import { inheritedSettingLabels } from "../controls/setting-inheritance";
import { textStyleVariation } from "../../content/text-style-variations";

const TreeContext = createContext<ContentBlock[]>([]);
export function StyleInheritanceTree({ blocks, children }: { blocks: ContentBlock[]; children: ReactNode }) {
  return <TreeContext.Provider value={blocks}>{children}</TreeContext.Provider>;
}
export const contentSettingFields = {
  Colour: ["textColor"], "Background colour": { fields: ["backgroundColor"], overrides: ["backgroundColor", "backgroundGradient"] }, Gradient: { fields: ["backgroundGradient"], overrides: ["backgroundColor", "backgroundGradient"] },
  "Font size": ["fontSize", "fontSizeCustom", "websitePreset"], Font: ["fontFamily", "websiteFont"], "Font family": ["fontFamily", "websiteFont"],
  Appearance: { fields: ["appearance", "websiteWeight", "websiteItalic"], independent: true }, "Line height": ["lineHeight"], "Letter spacing": ["letterSpacing"],
  "Line indent": ["textIndent"], Columns: ["textColumns"], Decoration: ["textDecoration"], Orientation: ["orientation"], "Letter case": ["textTransform"],
  "Text alignment": ["textAlign"], "Drop cap": ["dropCap"], "Fit text": ["fitText"], "Text shadow": ["textShadow"],
  Padding: ["padding"], Margin: ["margin"], "Block spacing": ["blockGap"], "Vertical block spacing": ["rowGap"], "Horizontal block spacing": ["columnGap"],
  "Minimum height": ["minHeight"], "Minimum width": ["minWidth"], Width: ["width", "buttonWidth"],
  Border: { fields: ["borderColor", "borderWidth", "borderStyle"], independent: true }, "Border colour": ["borderColor"], "Border width": ["borderWidth"], "Border style": ["borderStyle"],
  Radius: ["borderRadius"], Shadow: ["shadow", "shadowPreset", "customShadows"], "Drop shadow": ["shadow", "shadowPreset", "customShadows"],
  Link: { fields: ["linkColor", "linkHoverColor"], independent: true }, Heading: { fields: ["headingColor", "headingBackgroundColor", "headingBackgroundGradient", "headingColors", "headingBackgrounds"], independent: true },
  Button: { fields: ["buttonTextColor", "buttonBackgroundColor", "buttonBackgroundGradient"], independent: true }, "Link destination": ["enlargeOnClick"], Duotone: ["duotone"], "Aspect ratio": ["coverAspectRatio"],
  "Indent all paragraphs": ["indentAll"], "Enlarge on click": ["enlargeOnClick"], Image: ["backgroundImage", "backgroundImageMediaId"],
  Size: ["imageSize", "backgroundSize"], "Image size": ["imageSize", "backgroundSize"], Repeat: ["imageRepeat", "backgroundRepeat"], "Repeat background image": ["imageRepeat", "backgroundRepeat"], "Focal X (%)": ["imageFocalX", "backgroundImageFocalX"], "Focal Y (%)": ["imageFocalY", "backgroundImageFocalY"],
} as const;
const inheritable = ["fontFamily", "fontSize", "fontSizeCustom", "websiteFont", "websitePreset", "appearance", "websiteWeight", "websiteItalic", "textColor", "lineHeight", "letterSpacing", "textTransform", "textDecoration", "textIndent", "orientation", "textAlign", "linkColor", "linkHoverColor"];

export function typographySettingDefaults(selection: StyleSelection, role: TypographyRole): PreviewBlockStyle {
  const { typography, palette } = previewStyleDetails(selection);
  const fields = explicitTypographyFields(selection, role);
  return { websiteFont: fields.family, websitePreset: fields.preset, fontSizeCustom: fields.size, websiteWeight: fields.weight, websiteItalic: fields.fontStyle === undefined ? undefined : fields.fontStyle === "italic", lineHeight: fields.lineHeight, letterSpacing: fields.letterSpacing, textTransform: fields.transform, textDecoration: fields.decoration, textAlign: fields.align,
    textColor: fields.colour !== undefined || explicitPaletteColour(selection, role === "buttons" ? "buttonText" : role.startsWith("h") ? "heading" : "text") ? previewColourValue(fields.colour, palette, selection.colours) ?? (role === "buttons" ? palette.buttonText : role.startsWith("h") ? palette.heading : palette.text) : undefined };
}

/** Reference paint can override a role without becoming an explicitly authored source. */
export function blockSettingProvenance(role: PreviewBlockStyle, explicit: PreviewBlockStyle, painted: PreviewBlockStyle, selection: StyleSelection): PreviewBlockStyle {
  const source = { ...role };
  const alternatives = [["fontFamily", "websiteFont"], ["fontSize", "fontSizeCustom", "websitePreset"], ["appearance", "websiteWeight"], ["appearance", "websiteItalic"], ["backgroundColor", "backgroundGradient"]];
  for (const field of Object.keys(painted)) {
    if (Reflect.get(painted, field) === undefined) continue;
    if (["responsive", "previewResponsive", "variations", "interactionStates", "className"].includes(field)) continue;
    const matches = alternatives.filter(fields => fields.includes(field));
    const group = matches.length ? [...new Set(matches.flat())] : [field];
    for (const member of group) Reflect.deleteProperty(source, member);
  }
  const result = mergeStyleFields(source, explicit);
  for (const field of ["textColor", "backgroundColor", "linkColor", "linkHoverColor", "borderColor", "headingColor", "buttonTextColor", "buttonBackgroundColor"] as const) {
    const token = painted[field]?.match(/^var\(--site-palette-(theme-(\d+)|([^)]*))\)$/);
    if (token && (selection.paletteId !== undefined && selection.paletteId !== "default" || (token[2] !== undefined ? selection.colours?.theme?.[token[2]] !== undefined : selection.colours?.custom?.[token[3]] !== undefined))) result[field] = painted[field];
  }
  if (!painted.fontSizeCustom) {
    const preset = painted.websitePreset ?? painted.fontSize;
    if (preset && selection.typography?.presets?.[preset] !== undefined) result.websitePreset = preset;
  }
  return result;
}

/** Resolve provenance with the same website and viewport models used to paint content. */
export function effectiveContentSettingStyle(block: ContentBlock, selection: StyleSelection | undefined, viewport: StyleViewport, state: ButtonInteractionState | "default" = "default", blocks: ContentBlock[] = [], parentId?: string, paintedSelection = selection): PreviewBlockStyle {
  let result: PreviewBlockStyle = {};
  if (selection) {
    const role: TypographyRole = block.type === "heading" ? `h${block.level}` : block.type === "title" ? "h1" : block.type === "button" ? "buttons" : "text";
    result = typographySettingDefaults(selection, role);
    result.linkColor = typographySettingDefaults(selection, "links").textColor;
    const hover = selection.colours?.elements?.links?.hover;
    if (hover !== undefined) result.linkHoverColor = previewColourValue(hover, previewStyleDetails(selection).palette, selection.colours);
    const element = { ...(/^h[1-6]$/.test(role) ? selection.colours?.elements?.headings : {}), ...selection.colours?.elements?.[role] };
    if (element.background !== undefined) result.backgroundColor = element.background;
    if (element.gradient !== undefined) result.backgroundGradient = element.gradient;
    if (element.gradientId) result.backgroundGradient = selection.colours?.gradients?.[element.gradientId]?.gradient;
    if (role === "buttons" && element.background === undefined && !element.gradient && !element.gradientId && explicitPaletteColour(selection, "buttonBackground")) result.backgroundColor = previewStyleDetails(selection).palette.buttonBackground;
  }
  const ancestors: ContentBlock[] = [];
  let parent = parentId ? findContentBlock(blocks, parentId) : parentOfNestedBlock(blocks, block.id);
  while (parent) { ancestors.unshift(parent); parent = parentOfNestedBlock(blocks, parent.id); }
  for (const ancestor of ancestors) {
    const values = effectiveContentSettingStyle(ancestor, selection, viewport, "default", [], undefined, paintedSelection);
    const inherited: PreviewBlockStyle = {};
    for (const field of inheritable) if (Reflect.get(values, field) !== undefined) Reflect.set(inherited, field, Reflect.get(values, field));
    result = mergeStyleFields(result, inherited);
    if (block.type === "heading" && (ancestor.type === "quote" || ancestor.type === "pullquote")) {
      if (values.headingColor !== undefined) result.textColor = values.headingColor;
      if (values.headingBackgroundColor !== undefined) result.backgroundColor = values.headingBackgroundColor;
      if (values.headingBackgroundGradient !== undefined) result.backgroundGradient = values.headingBackgroundGradient;
    }
    if (block.type === "button") {
      if (values.buttonTextColor !== undefined) result.textColor = values.buttonTextColor;
      if (values.buttonBackgroundColor !== undefined) result.backgroundColor = values.buttonBackgroundColor;
      if (values.buttonBackgroundGradient !== undefined) result.backgroundGradient = values.buttonBackgroundGradient;
    }
  }
  const variation = previewBlockVariation(block) ?? (block.type === "paragraph" || block.type === "heading" ? textStyleVariation(blockPreviewStyle(block)) : undefined);
  const variant = !parentId && selection ? explicitBlockStyle(selection, previewBlockTarget(block), variation) : {};
  const paint = !parentId ? resolvePreviewBlockVariant(paintedSelection?.blockStyles?.[previewBlockTarget(block)], variation) : {};
  result = selection ? blockSettingProvenance(result, effectivePreviewBlockStyle(variant, viewport), effectivePreviewBlockStyle(paint, viewport), selection) : result;
  result = mergeStyleFields(result, effectivePreviewBlockStyle(blockPreviewStyle(block), viewport));
  if (block.type === "button" && block.width !== undefined) result.buttonWidth = `${block.width}%`;
  if (state !== "default" && block.type === "button") {
    result = mergeStyleFields(mergeStyleFields(result, effectivePreviewBlockStyle(variant?.interactionStates?.[state], viewport)), effectivePreviewBlockStyle(block.interactionStyles?.[state], viewport));
    const width = block.interactionStyles?.[state]?.width;
    if (width !== undefined) result.buttonWidth = `${width}%`;
  }
  return result;
}
export function contentSettingInheritance(block: ContentBlock, authored: object, selection: StyleSelection | undefined, viewport: StyleViewport, state: ButtonInteractionState | "default" = "default", blocks: ContentBlock[] = [], parentId?: string, paintedSelection = selection) {
  const owned = block.type === "button" ? { ...authored, width: state === "default" ? block.width : block.interactionStyles?.[state]?.width } : authored;
  return inheritedSettingLabels(effectiveContentSettingStyle(block, selection, viewport, state, blocks, parentId, paintedSelection), owned, contentSettingFields);
}
export function useContentSettingInheritance(block: ContentBlock, authored: object, viewport: StyleViewport, state: ButtonInteractionState | "default", parentId?: string) {
  const website = useWebsiteDesignContext();
  const blocks = useContext(TreeContext);
  return contentSettingInheritance(block, authored, website?.explicitStyles ?? website?.design.styles, viewport, state, blocks, parentId, website?.design.styles);
}
