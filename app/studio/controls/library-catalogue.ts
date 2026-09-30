export type StudioControlEntry = {
  id: string;
  title: string;
  group: "Colour" | "Typography" | "Sizing" | "Style" | "Media" | "Inspector";
  purpose: string;
  owner: string;
  consumers: string[];
  states: string;
  compatibility: string;
};

export const studioControlEntries: StudioControlEntry[] = [
  { id: "colour-picker", title: "Colour picker", group: "Colour", purpose: "Choose a preset or custom colour, including independent Default and Hover values.", owner: "ACM Studio controls", consumers: ["Paragraph text and links", "Divider colour", "Block backgrounds"], states: "Unset and explicit colours, selected swatches, focus, contrast warning, Default/Hover, clear and disabled.", compatibility: "Uses the shared ACM palette and preserves explicit custom colour values." },
  { id: "background-selection", title: "Background colour and gradient", group: "Colour", purpose: "Choose a solid palette colour or a supported gradient preset.", owner: "ACM Studio controls", consumers: ["Paragraph", "Quote", "Group"], states: "Colour and gradient modes, preset gradients, clear colour and reset background.", compatibility: "Gradient names and colour values are stored in the existing ParagraphStyle contract." },
  { id: "custom-font-size", title: "Custom font size", group: "Typography", purpose: "Edit supported custom font-size units with a compact range control.", owner: "ACM Studio controls", consumers: ["Paragraph and shared Typography inspectors"], states: "px, em, rem, vw and vh; numeric entry, unit menu, range adjustment, pointer drag and reset.", compatibility: "Normalises values through the existing custom font-size contract." },
  { id: "font-size-appearance", title: "Font size and Appearance", group: "Typography", purpose: "Switch between named font-size presets and custom sizing, then choose a font weight or italic appearance.", owner: "ACM Studio controls", consumers: ["Paragraph and shared Typography inspectors"], states: "Preset and custom modes, size selection, default Appearance, regular through black weights and italic variants.", compatibility: "Stores the existing fontSize, fontSizeCustom and appearance fields without changing their values." },
  { id: "paragraph-length", title: "Paragraph length", group: "Sizing", purpose: "Set a scalar length for paragraph-specific spacing and indentation.", owner: "ACM Studio controls", consumers: ["Paragraph line indent", "Shared legacy inspector settings"], states: "Empty/default, positive and negative values, supported units, range and reset.", compatibility: "Keeps supported CSS length units and preserves the block style value." },
  { id: "box-length", title: "Box dimensions", group: "Sizing", purpose: "Edit linked or separate sides, axes and corners.", owner: "ACM Studio controls", consumers: ["Padding", "Margin", "Border width", "Border radius"], states: "Linked and split values, units, custom number entry, keyboard focus and reset.", compatibility: "Expands and serialises the existing CSS shorthand length fields." },
  { id: "preset-number", title: "Preset number", group: "Sizing", purpose: "Choose a common pixel value, keep the current custom number, or return to Default.", owner: "ACM Studio controls", consumers: ["Columns gaps and padding", "Grid minimum column width"], states: "Default, every configured preset, custom value, bounds and reset.", compatibility: "Stores pixel numbers in the existing numeric layout fields." },
  { id: "image-dimensions", title: "Image dimensions", group: "Media", purpose: "Set image aspect ratio, explicit dimensions and fit behaviour.", owner: "ACM Studio controls", consumers: ["Image", "Cover"], states: "Original and named aspect ratios, automatic and explicit width/height, conditional Cover/Contain scale.", compatibility: "Conditional scale remains available only when a non-original aspect ratio is selected." },
  { id: "focal-position", title: "Focal position", group: "Media", purpose: "Set the horizontal and vertical position used when an image is cropped.", owner: "ACM Studio controls", consumers: ["Image", "Cover", "Background images"], states: "Separate horizontal and vertical values, numeric and range presentations, 0–100 bounds.", compatibility: "Image focal controls are available only when a crop ratio is selected; backgrounds retain their range inputs." },
  { id: "border-settings", title: "Border settings", group: "Style", purpose: "Set border colour, style, width, radius and optional shadow as one grouped capability.", owner: "ACM Studio controls", consumers: ["Styled blocks", "Image", "Cover"], states: "Default and explicit colour, none/solid/dashed/dotted style, linked or split measurements, radius, shadow and reset.", compatibility: "Writes the current ParagraphStyle fields; legacy colour values remain editable through the colour field." },
  { id: "inspector-tools", title: "Inspector options and reset", group: "Inspector", purpose: "Show or hide optional controls in Gutenberg and Studio groups and reset a section.", owner: "ACM Studio inspector", consumers: ["Blocks with shared style inspectors"], states: "Optional controls, source grouping, menu dismissal, section reset and unavailable reset.", compatibility: "Option availability is generated from each block capability profile." },
  { id: "inspector-accordion", title: "Accordion section", group: "Inspector", purpose: "Group related inspector settings behind a collapsible section heading.", owner: "ACM Studio inspector", consumers: ["Block, template and document inspector sections"], states: "Expanded and collapsed; semantic disclosure control and contained settings.", compatibility: "The catalogue uses the shared production accordion component." },
];

export const studioControlGroups = ["Colour", "Typography", "Sizing", "Style", "Media", "Inspector"] as const;
export function controlGroupId(group: string) {
  return `control-group-${group.toLocaleLowerCase("en-GB")}`;
}
export const studioControlEntryById = Object.fromEntries(studioControlEntries.map(entry => [entry.id, entry])) as Record<string, StudioControlEntry | undefined>;
