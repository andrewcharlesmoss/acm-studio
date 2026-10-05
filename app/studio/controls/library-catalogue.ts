export type StudioControlEntry = {
  id: string;
  title: string;
  group: "Foundation" | "Colour" | "Typography" | "Sizing" | "Style" | "Media" | "Inspector";
  purpose: string;
  owner: string;
  consumers: string[];
  dependencies?: { kind: "inherits" | "uses"; label: string; entryId?: string; detail: string }[];
  states: string;
  compatibility: string;
};

const rangeDependency = {
  kind: "inherits" as const,
  label: "Slider foundation",
  entryId: "slider-foundation",
  detail: "Uses shared accent, hover and pressed colours, directly or through a composed range control. Focus outlines follow the Studio Focus Outline preference and focus tokens.",
};

export const studioControlEntries: StudioControlEntry[] = [
  {
    id: "font-family", title: "Font", group: "Typography",
    purpose: "Override one block's inherited font using Studio's supported families.",
    owner: "ACM Studio controls", consumers: ["Paragraph Typography", "Selected List Item", "Other inspectors with enabled font-family support"],
    dependencies: [{ kind: "uses", label: "Paragraph font families", detail: "Labels and CSS stacks share PARAGRAPH_FONT_FAMILIES with the content renderer." }],
    states: "Default inheritance, Inter, Helvetica Neue, Helvetica, Arial, keyboard focus and disabled.",
    compatibility: "Stores the existing fontFamily field. Default clears the override; the owning inspector supplies history, persistence and section reset. System fonts use their existing fallback stacks.",
  },
  {
    id: "inline-image", title: "Inline image", group: "Media",
    purpose: "Insert or replace an image inside rich text, then edit its width and alternative text.",
    owner: "ACM Studio rich-text controls", consumers: ["Studio Canvas rich fields", "Template editor", "Mini Golf editor", "Controls Library specimen"],
    dependencies: [{ kind: "uses", label: "Anchored popover and dialog", detail: "Shares viewport tracking, close controls, Escape dismissal and focus return." }, { kind: "uses", label: "Button styles and catalogue image icon", detail: "Uses shared Base/Secondary actions and existing ACM image artwork." }],
    states: "Caret insertion, exact-object replacement, initial natural width capped at 150px, automatic width, blank alternative text, changed-only Apply, invalid width, load failure and cancellation.",
    compatibility: "Callers own document freshness, write ownership and history. Media providers are explicit; Mini Golf uses URL selection without reading Studio media. Width accepts 1–2400px or blank for automatic size. The specimen is memory-only; the Workspace selection example exercises real Canvas commands.",
  },
  {
    id: "link-destination", title: "Link destination", group: "Foundation",
    purpose: "Edit an outer link destination without altering its rich label.",
    owner: "ACM Studio controls", consumers: ["Button toolbar", "Controls Library specimen"],
    dependencies: [{ kind: "uses", label: "Anchored popover", detail: "Shares menu viewport tracking and topmost dismissal, while preserving native form Tab navigation." }, { kind: "uses", label: "@acm/icons link actions", detail: "Uses catalogue Link, Unlink, Edit, Copy and Close symbols." }],
    states: "Empty/existing destination, preview/edit, internal suggestions, invalid URL, new-tab/nofollow, Apply, removal, copy, Cancel, Escape and outside dismissal.",
    compatibility: "Callers retain selection, history, write ownership and freshness checks. Button URL updates preserve its label runs, title and appearance. Unlink clears destination, target and rel. Existing inline-text link controls retain their separate range contract.",
  },
  {
    id: "anchored-menu", title: "Toolbar menu", group: "Foundation",
    purpose: "Open a keyboard-accessible menu beside its trigger and keep it within the viewport.",
    owner: "ACM Studio overlays", consumers: ["More text formatting", "Block options", "Controls Library specimen"],
    states: "Open/closed, disabled action, arrow/Home/End navigation, repeat-trigger dismissal, Escape and outside dismissal. Long menus scroll; placement follows resize and scrolling.",
    compatibility: "Commands and captured text ranges remain with the caller. Inspector menus retain their separate pane-edge positioning contract. This menu portals out of clipped editing surfaces.",
  },
  {
    id: "heading-level", title: "Heading level", group: "Typography",
    purpose: "Choose a semantic H1–H6 heading level in the block summary.",
    owner: "ACM Studio controls", consumers: ["Heading inspector"],
    dependencies: [{ kind: "uses", label: "@acm/icons heading marks", detail: "Supplies the shared H1–H6 artwork." }],
    states: "H1–H6, selected level, keyboard focus and disabled.",
    compatibility: "Changes the existing heading level. Selecting the active level keeps it selected; the canvas toolbar also provides level selection.",
  },
  {
    id: "toggle", title: "Toggle", group: "Foundation",
    purpose: "Switch a setting on or off using a labelled native checkbox with a compact track.",
    owner: "ACM Studio controls",
    consumers: ["Table fixed width/header/footer", "List reverse order", "Paragraph drop cap", "Paragraph and Heading Fit text", "Heading, Quote, Code, Group and Title background repeat"],
    states: "On, off, keyboard focus and disabled. Drop cap is disabled for centre/right alignment; Fit text is paused for vertical writing; Table header/footer require a non-empty table.",
    compatibility: "Preserves native checkbox semantics and controlled boolean values. Callers own availability, changes and reset actions.",
  },
  {
    id: "style-variation", title: "Style variation", group: "Style",
    purpose: "Choose a block style using Quote previews or plain Table buttons.",
    owner: "ACM Studio controls", consumers: ["Quote Default/Plain", "Table Default/Stripes"],
    states: "Default, selected variation, keyboard focus and disabled.",
    compatibility: "Uses the existing quoteStyle and tableStyle fields without changing content.",
  },
  {
    id: "slider-foundation", title: "Slider", group: "Foundation",
    purpose: "Preview shared range colours on this Controls page and change each state independently.",
    owner: "ACM Studio shared range styling",
    consumers: ["Direct native ranges: background image width in Studio inspectors", "Direct native ranges: Design canvas zoom, opacity, edge cleanup and arrowhead size", "Range specimens in the Ribbon catalogue (outside this page’s preview scope)"],
    dependencies: [{ kind: "uses", label: "Gutenberg accent token", detail: "The default accent comes from --gutenberg-accent. Native ranges use darker hover and pressed fallbacks; discrete spacing ranges have their own darker pressed fallback. Explicit state tokens override these fallbacks." }],
    states: "Accent, hover, pressed, keyboard focus and disabled. Each preview colour is independent; reset restores the default accent and its derived hover and pressed colours.",
    compatibility: "Colour edits affect standard sliders on this Controls page only and are not saved or applied to live editors. Consumers retain their values, bounds and steps. Gradient hue and alpha tracks are excluded. Focus outlines follow the Studio Focus Outline preference and focus tokens.",
  },
  {
    id: "colour-picker", title: "Colour picker", group: "Colour",
    purpose: "Choose a palette role or custom colour; callers may enable independent Default and Hover values.",
    owner: "ACM Studio controls",
    consumers: ["Enabled shared Typography and Elements colour settings through PaletteColourSetting", "Separator colours", "Solid block backgrounds", "Compact border colour settings"],
    dependencies: [{ kind: "uses", label: "@acm/styles palette", detail: "Palette roles and swatch values come from UNIVERSAL_STYLE_PRESET.palette; role identity is separate from the explicit colour value." }, { kind: "uses", label: "Custom colour editor and inspector popover positioning", detail: "The custom RGB/HSV editor uses GradientStopColour without alpha; floating editors use the shared pane positioning contract." }],
    states: "Unset, palette role, custom RGB/HSV, selected swatch, clear, disabled and keyboard focus. Default/Hover appears when a hover change callback is supplied. Contrast warnings are supplied by the caller.",
    compatibility: "Preserves explicit custom colours and semantic palette selections. The picker does not automatically assess contrast for every consumer.",
  },
  {
    id: "background-selection", title: "Background colour and gradient", group: "Colour",
    purpose: "Choose a solid palette colour or edit a linear or radial gradient, with an optional image row supplied by the caller.",
    owner: "ACM Studio controls",
    consumers: ["Blocks with enabled shared Background settings, including Paragraph, Heading, List, List Item, Quote, Table, Code, Group, Columns and template Content", "Separator background settings"],
    dependencies: [{ kind: "uses", label: "Colour picker", entryId: "colour-picker", detail: "Selects the solid background colour." }, { kind: "uses", label: "Gradient picker", detail: "Edits gradient type, stops, opacity and angle; hue and alpha tracks use specialist styling." }, { kind: "uses", label: "@acm/styles palette.textPrimary", detail: "Supplies the fallback text colour when the caller enables solid-colour contrast assessment and no image is present." }],
    states: "Colour and gradient rows, optional image row, twelve presets, colour stops, opacity, type and angle. Colour and gradient clear/reset actions call the supplied change callbacks; section reset is owned by the enclosing inspector.",
    compatibility: "Preserves legacy gradient names and validated custom gradient stops in ParagraphStyle. Managed image selection and image detail controls are supplied by the inspector.",
  },
  {
    id: "custom-font-size", title: "Custom font size", group: "Typography",
    purpose: "Edit a supported custom font size using numeric entry, units and a compact range.",
    owner: "ACM Studio controls", consumers: ["Font size and Appearance in enabled shared Typography inspectors"],
    dependencies: [rangeDependency],
    states: "px, em, rem, vw and vh; numeric entry, unit menu, range adjustment, pointer drag, clear and disabled.",
    compatibility: "Normalises values through the custom font-size contract. Empty numeric input clears the value; section and specimen reset are external actions, not an internal reset button.",
  },
  {
    id: "font-size-appearance", title: "Font size and Appearance", group: "Typography",
    purpose: "Switch between named sizes and custom sizing, then choose weight or italic appearance.",
    owner: "ACM Studio controls", consumers: ["Enabled shared Typography inspectors"],
    dependencies: [{ kind: "uses", label: "Custom font size", entryId: "custom-font-size", detail: "Shown in Custom mode; supplies the embedded range and unit menu." }, rangeDependency],
    states: "Preset/custom modes, active size, default Appearance, nine weights from Thin to Black and italic variants. Clicking an active size preset clears it.",
    compatibility: "Stores fontSize, fontSizeCustom and appearance. The enclosing inspector owns visibility and reset; custom mode inherits range styling through Custom font size.",
  },
  {
    id: "line-height", title: "Line height", group: "Typography",
    purpose: "Set or clear line height for a text block or selected List Item.",
    owner: "ACM Studio controls", consumers: ["Enabled shared Typography inspectors", "Selected List Item"],
    states: "Default/empty, free-form text entry, explicit value and disabled.",
    compatibility: "The input stores lineHeight. Persisted values must be non-negative unitless numbers or lengths in px, em, rem, %, ch, vw or vh; arbitrary CSS functions are not part of this contract.",
  },
  {
    id: "paragraph-length", title: "Paragraph length", group: "Sizing",
    purpose: "Edit a scalar CSS length for spacing, indentation or layout widths.",
    owner: "ACM Studio controls",
    consumers: ["Paragraph line indent", "Spacer, Image, Embed and Separator margins", "Shared minimum dimensions where available", "Group and template Content custom content/wide widths"],
    dependencies: [rangeDependency],
    states: "Empty/default, explicit zero, caller-bounded positive or negative values, px/em/rem/%/ch/vw/vh, numeric entry, range and reset.",
    compatibility: "Preserves supported CSS units. Callers supply bounds and determine whether negative values are allowed; this is not limited to Paragraph blocks.",
  },
  {
    id: "box-length", title: "Box dimensions", group: "Sizing",
    purpose: "Edit linked or separate sides, axes and corners.",
    owner: "ACM Studio controls", consumers: ["Shared padding and margin", "Border width and radius through Border settings"],
    dependencies: [{ kind: "uses", label: "SpacingRangeControl", detail: "Preset mode directly composes the segmented spacing range. Continuous mode uses native ranges. It shares this implementation with Spacing slider without composing LayoutSpacingSetting." }, rangeDependency],
    states: "Linked/split values, units, preset/custom modes, numeric entry, keyboard focus, disabled and reset.",
    compatibility: "Expands and serialises supported CSS shorthand lengths. Supported custom lengths remain stored until explicitly edited.",
  },
  {
    id: "layout-spacing", title: "Spacing slider", group: "Sizing",
    purpose: "Choose spacing from a segmented preset scale or enter a custom pixel value.",
    owner: "ACM Studio controls",
    consumers: ["Group and template Content layout gaps", "Section axis gaps and padding", "Columns axis gaps", "Column block gap", "Social Icons axis gaps", "Shared padding and margin use the same SpacingRangeControl through Box dimensions"],
    dependencies: [{ kind: "uses", label: "SpacingRangeControl", detail: "Provides the segmented track, keyboard stepping and custom value mode; also used directly by Box dimensions." }, rangeDependency],
    states: "Default, explicit zero, presets, custom values, keyboard adjustment and disabled. Linked/split sides belong to Box dimensions.",
    compatibility: "Keeps existing numeric layout values and custom values until edited. It does not own CSS shorthand serialisation or enclosing section reset.",
  },
  {
    id: "preset-number", title: "Preset number", group: "Sizing",
    purpose: "Choose a common numeric value, retain a custom number or return to Default.",
    owner: "ACM Studio controls", consumers: ["Group automatic Grid minimum column width", "Section Grid minimum column width"],
    states: "Default, caller-supplied presets, custom value, bounds, disabled and reset.",
    compatibility: "Stores the caller’s numeric field. Group supplies a separate px/em/rem/vw unit selector. Preset option labels currently say pixels even when Group selects another unit; this is a known label mismatch. Columns gaps and Column width use other controls.",
  },
  {
    id: "image-dimensions", title: "Image dimensions", group: "Media",
    purpose: "Set image aspect ratio, explicit pixel dimensions and fit behaviour.",
    owner: "ACM Studio controls", consumers: ["Image", "Featured Image"],
    states: "Original, Square, Portrait, Landscape and Wide ratios; automatic/explicit width and height; disabled. Non-original ratios expose Cover/Contain, and Featured Image also enables Fill.",
    compatibility: "Scale is conditional on a non-original aspect ratio. Featured Image maps to Gutenberg Post Featured Image, not the content-bearing Cover block.",
  },
  {
    id: "focal-position", title: "Focal position", group: "Media",
    purpose: "Set horizontal and vertical positioning when an image is cropped.",
    owner: "ACM Studio controls", consumers: ["Image crop", "Configured managed background images"],
    dependencies: [rangeDependency],
    states: "Horizontal/vertical values, numeric/range presentations, 0–100 bounds, keyboard focus and disabled.",
    compatibility: "Image controls require a source, a non-original ratio and Cover scaling. Managed backgrounds expose ranges when an image is configured. Featured Image retains saved focal attributes for rendering but has no focal inspector control.",
  },
  {
    id: "border-settings", title: "Border settings", group: "Style",
    purpose: "Set border colour, style, width and optional radius or shadow as a group.",
    owner: "ACM Studio controls", consumers: ["Blocks with enabled shared Border settings", "Image", "Featured Image"],
    dependencies: [{ kind: "uses", label: "Box dimensions", entryId: "box-length", detail: "Sets width and radius." }, { kind: "uses", label: "Colour picker", entryId: "colour-picker", detail: "Used directly for compact border colour. Non-compact mode composes BorderColourControl instead." }, rangeDependency],
    states: "Unset/explicit colour, None/Solid/Dashed/Dotted, linked/split measurements, optional radius/shadow, disabled and reset.",
    compatibility: "Writes existing ParagraphStyle fields. Entering colour or width activates Solid when style is absent or None. The legacy text colour field exists in non-compact mode; the compact catalogue specimen uses the picker.",
  },
  {
    id: "inspector-tools", title: "Inspector options and reset", group: "Inspector",
    purpose: "Show or hide caller-supplied optional settings and reset a section.",
    owner: "ACM Studio inspector", consumers: ["Shared style inspectors", "List settings", "Table settings", "Embed Dimensions", "Group Position", "List Item"],
    states: "Optional settings, source grouping where configured, visible close control, Escape dismissal, section reset and unavailable reset.",
    compatibility: "Callers own option lists, visibility and reset actions. Shared style sections derive options from capability profiles; dedicated settings also provide manual lists. Not every menu is generated from a profile.",
  },
  {
    id: "inspector-accordion", title: "Accordion section", group: "Inspector",
    purpose: "Group related inspector settings under a collapsible heading.",
    owner: "ACM Studio inspector", consumers: ["Block, template and document inspector sections"],
    states: "Expanded by default, collapsed and keyboard activation. Disabled settings do not disable the section toggle.",
    compatibility: "The specimen uses the production accordion. Collapsing keeps children mounted and preserves their local state; it does not clear saved settings.",
  },
];

export const studioControlGroups = ["Foundation", "Colour", "Typography", "Sizing", "Style", "Media", "Inspector"] as const;
export function controlGroupId(group: string) {
  return `control-group-${group.toLocaleLowerCase("en-GB")}`;
}
export const studioControlEntryById = Object.fromEntries(studioControlEntries.map(entry => [entry.id, entry])) as Record<string, StudioControlEntry | undefined>;
