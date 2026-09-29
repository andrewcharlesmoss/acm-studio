import type { ContentBlock, ParagraphStyle } from "../../../content/model";
import { availableBlockTransforms } from "../../block-transforms";

export type ParagraphInspectorControl = {
  id: string;
  label: string;
  source: "gutenberg" | "studio";
  section: "typography" | "dimensions" | "border" | "elements";
  fields: readonly (keyof ParagraphStyle)[];
};

/**
 * Paragraph's capability profile drives the inspector ordering and library
 * inventory. Stored values and their rendering stay in the content model.
 */
export const paragraphInspectorProfile = {
  inventorySections: [
    { id: "typography", label: "Typography", source: "gutenberg", fields: [] },
    { id: "background", label: "Background", source: "gutenberg", fields: ["backgroundColor", "backgroundGradient"] },
    { id: "dimensions", label: "Dimensions", source: "gutenberg", fields: [] },
    { id: "border", label: "Border", source: "gutenberg", fields: [] },
    { id: "elements", label: "Elements", source: "gutenberg", fields: [] },
    { id: "advanced", label: "Advanced", source: "gutenberg", fields: ["anchor", "className", "additionalCss"] },
  ],
  defaults: {
    typography: ["colour", "size"] as const,
    dimensions: [] as const,
    border: [] as const,
    elements: [] as const,
  },
  controls: [
    { id: "colour", label: "Colour", source: "gutenberg", section: "typography", fields: ["textColor"] },
    { id: "size", label: "Size", source: "gutenberg", section: "typography", fields: ["fontSize", "fontSizeCustom"] },
    { id: "family", label: "Font family", source: "studio", section: "typography", fields: ["fontFamily"] },
    { id: "appearance", label: "Appearance", source: "gutenberg", section: "typography", fields: ["appearance"] },
    { id: "line-height", label: "Line height", source: "gutenberg", section: "typography", fields: ["lineHeight"] },
    { id: "letter-spacing", label: "Letter spacing", source: "gutenberg", section: "typography", fields: ["letterSpacing"] },
    { id: "line-indent", label: "Line indent", source: "gutenberg", section: "typography", fields: ["textIndent"] },
    { id: "columns", label: "Columns", source: "gutenberg", section: "typography", fields: ["textColumns"] },
    { id: "decoration", label: "Decoration", source: "gutenberg", section: "typography", fields: ["textDecoration"] },
    { id: "orientation", label: "Orientation", source: "studio", section: "typography", fields: ["orientation"] },
    { id: "letter-case", label: "Letter case", source: "gutenberg", section: "typography", fields: ["textTransform"] },
    { id: "drop-cap", label: "Drop cap", source: "gutenberg", section: "typography", fields: ["dropCap"] },
    { id: "fit-text", label: "Fit text", source: "gutenberg", section: "typography", fields: ["fitText"] },
    { id: "text-shadow", label: "Text shadow", source: "studio", section: "typography", fields: ["textShadow"] },
    { id: "padding", label: "Padding", source: "gutenberg", section: "dimensions", fields: ["padding"] },
    { id: "margin", label: "Margin", source: "gutenberg", section: "dimensions", fields: ["margin"] },
    { id: "min-height", label: "Minimum height", source: "studio", section: "dimensions", fields: ["minHeight"] },
    { id: "min-width", label: "Minimum width", source: "studio", section: "dimensions", fields: ["minWidth"] },
    { id: "border", label: "Border", source: "gutenberg", section: "border", fields: ["borderColor", "borderStyle", "borderWidth"] },
    { id: "radius", label: "Radius", source: "gutenberg", section: "border", fields: ["borderRadius"] },
    { id: "shadow", label: "Shadow", source: "studio", section: "border", fields: ["shadow"] },
    { id: "link-colour", label: "Link", source: "gutenberg", section: "elements", fields: ["linkColor", "linkHoverColor"] },
  ] satisfies readonly ParagraphInspectorControl[],
  dependencies: [
    { id: "colour-picker", label: "Colour picker", href: "/studio/ui/controls#colour-picker", purpose: "Choose preset or custom text, link and background colours, including link hover state." },
    { id: "paragraph-background", label: "Background adapter", href: "#background", purpose: "Compose the Paragraph block's solid colour and gradient backgrounds." },
    { id: "paragraph-length", label: "Paragraph length", href: "/studio/ui/controls#paragraph-length", purpose: "Edit line indent and custom spacing values." },
    { id: "box-length", label: "Box dimensions", href: "/studio/ui/controls#box-length", purpose: "Edit linked or separate padding and border dimensions." },
    { id: "custom-font-size", label: "Custom font size", href: "/studio/ui/controls#custom-font-size", purpose: "Edit font sizes with supported units and presets." },
    { id: "inspector-tools", label: "Inspector options and reset", href: "/studio/ui/controls#inspector-tools", purpose: "Show, hide and reset optional inspector controls." },
    { id: "inspector-accordion", label: "Accordion section", href: "/studio/ui/controls#inspector-accordion", purpose: "Group settings into the inspector's collapsible sections." },
  ],
  transforms: availableBlockTransforms({ id: "paragraph-library", type: "paragraph", text: "" } as ContentBlock)
    .map(transform => ({ type: transform.target, label: transform.label })),
  nesting: "Paragraph is a leaf block. Its content is independent; indentation may inherit from an adjacent preceding Paragraph.",
  context: "When the previous sibling is a Paragraph, its line indent supplies the following Paragraph's indent context.",
  description: "Start with the basic building block of all narrative.",
  intendedUse: "Use Paragraph for ordinary prose and inline formatted text.",
} as const;

export const paragraphBlockDefinition = {
  type: "paragraph" as const,
  label: "Paragraph",
  description: paragraphInspectorProfile.description,
  libraryHref: "/studio/ui/blocks/paragraph",
  librarySummary: "Ordinary prose with inline formatting, Gutenberg-aligned settings and separate Studio additions.",
  create: (id: string): Extract<ContentBlock, { type: "paragraph" }> => ({ id, type: "paragraph", text: "Start writing here." }),
  inspector: paragraphInspectorProfile,
};
