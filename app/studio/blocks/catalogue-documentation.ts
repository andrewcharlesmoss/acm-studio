import type { BlockCapabilityProfile, CapabilityBlockType, InspectorControlProfile } from "./capability-profiles";
import { studioControlEntryById } from "../controls/library-catalogue";

/** Disclosure-only projection. Never pass this metadata to inspector or validation code. */
export type CatalogueControl = InspectorControlProfile & {
  documentationStatus?: "Hidden retained attribute" | "Summary control" | "Model only";
};

type BlockDocumentation = {
  nesting?: string;
  context: string;
  notes: readonly string[];
  insertionDefaults?: string;
};

const documentContext = "Values come from the current document and its display overrides. The block controls presentation, not the document’s metadata; missing or hidden metadata is omitted from normal preview.";
const blockDocumentation: Record<CapabilityBlockType, BlockDocumentation> = {
  paragraph: {
    context: "Indent context follows the adjacent previous Paragraph. Inline formatting and links belong to text runs; document footnote references are separate from the block inspector.",
    notes: ["Text alignment and None/Wide/Full block alignment are canvas toolbar controls.", "Drop cap is disabled for centre/right alignment without deleting the saved value. Fit text is paused for vertical writing.", "Minimum height, minimum width and shadow are retained ACM attributes hidden by the current shared-style source filter.", "Typography and Elements colours use PaletteColourSetting, which composes Colour picker."],
  },
  heading: {
    context: "The semantic level determines the default heading size. Inline formatting and alignment are canvas actions.",
    notes: ["Heading level is in the block summary; use Transform to in the canvas toolbar to choose H1–H6, outside the Content accordion.", "A new Heading does not expose image selection in Background; a saved background image exposes its detail controls.", "Font family, writing orientation and text shadow are unavailable in the captured theme configuration."],
    insertionDefaults: "New Headings use H2 unless another level is selected.",
  },
  list: {
    nesting: "Contains item-scoped List Items. An item may contain a nested List; List Item is not a top-level ContentBlock.",
    context: "Selecting an item exposes its own style and Advanced settings. Ordered-list settings depend on the parent List type.",
    notes: ["Bullets/numbers are in List; ordered numbering, start and reverse order are in Settings.", "List Item permits both ACM and Gutenberg-origin style controls. Footnote and inline-image insertion target a single item; their forms are unavailable across multiple items.", "Nested Lists share the parent’s recursive item model; not every nested container selection exposes the full formatting toolbar."],
  },
  quote: {
    nesting: "Contains recursively editable Paragraph, Heading, List, Quote and Image children. Editing legacy flat quote text materialises Paragraph children.",
    context: "Citation has rich-text runs on the canvas. The plain attribution input replaces that rich attribution when edited.",
    notes: ["Default/Plain style and plain attribution are in Quote. Text and block alignment live in the canvas toolbar.", "Citation has its own rich-text selection and supports guarded inline-image insertion and editing. Block gap between nested quote paragraphs remains unsupported."],
  },
  code: {
    context: "Code text is edited on the canvas; the stored language attribute supports rendering but has no inspector editor.",
    notes: ["The block toolbar offers None/Wide alignment; Full alignment and minimum dimensions are unavailable."],
  },
  table: {
    context: "Header and footer controls require a non-empty table. Enabling a section adds an empty row; disabling or resetting it removes its section rows while retaining body rows. Undo restores the removed section content.",
    notes: ["Settings contains fixed cell width, conditional Header/Footer and full Advanced fields. Styles contains plain Default/Stripes buttons, typography, background, dimensions and border controls.", "Caption is edited on the canvas and stores plain caption plus captionRuns. Per-column alignment is a canvas table action.", "New Tables begin with Column count and Row count, both 2; Create Table makes the editable grid. Counts accept whole numbers from 1 to 100; blank uses 2. Uncreated Tables remain editor placeholders and render no table in Preview.", "Drag resizing and double-click fitting are removed. Older saved row heights and column widths still render; no resize controls are exposed.", "Cell spanning and direct inspector editing of cell tags/header scope remain unsupported."],
  },
  image: {
    context: "Managed media is resolved by mediaId; otherwise a safe external src may be used. File selection requires the caller’s canOpenFiles permission.",
    notes: ["Image contains source, alternative text and link settings; Styles, Dimensions, Border & shadow and Advanced follow. Caption is edited on the canvas and preserves captionRuns.", "Decorative disables alternative-text editing, and linked images cannot be decorative. A custom link input appears only for Custom URL; new-tab applies to custom/media links.", "Scale requires a non-original ratio. Focal controls additionally require a source and Cover scaling.", "Margin uses Paragraph length. Border settings composes Box dimensions; a resolved safe external source can be the image-file link destination."],
  },
  embed: {
    context: "URL, accessible player title and rich caption are canvas controls. The pane contains Dimensions and Advanced.",
    notes: ["Provider playback is bounded to supported HTTPS YouTube, Vimeo and TikTok URLs. Other URLs show an unavailable preview and a source link; generic oEmbed is unsupported.", "Retry remounts the provider preview and cannot guarantee playback. Caption stores caption and captionRuns.", "Margin uses Paragraph length."],
  },
  divider: {
    context: "Separator Styles controls Default/Wide/Dots. Advanced contains Gutenberg's hr/div HTML element choice.",
    notes: ["The hr/div selector follows the pinned Gutenberg Advanced control. Studio currently gives div a separator ARIA role; Gutenberg's div has no separator semantics.", "Margin uses Paragraph length. Background selection owns the separator colour/gradient presentation."],
  },
  footnotes: {
    context: "Notes are linked to footnote references in the document’s rich-text runs. The inspector does not create those references.",
    notes: ["Note text is edited on the canvas as notes containing id and text. Inline reference storage is Studio’s own model, not Gutenberg’s storage format."],
  },
  buttons: {
    nesting: "Button-only parent. New Button insertions are wrapped in Buttons; legacy standalone Button blocks remain readable.",
    context: "Parent orientation, wrapping, justification and spacing determine child arrangement.",
    notes: ["Outer None/Left/Centre/Right/Wide/Full alignment is in the canvas toolbar.", "Horizontal and vertical spacing use the shared Spacing slider, with presets and a custom pixel input (0–120, default 8)."],
  },
  button: {
    nesting: "Normally a child of Buttons. New insertions create or join that parent; legacy standalone Button blocks remain supported.",
    context: "The summary selects Default/Hover/Focus/Active. Non-default styles are stored separately in interactionStyles.",
    notes: ["Show state on canvas is temporary preview state and is not saved in the block.", "Width is a select control, not Preset number. A native button element remains unsupported because this block has no action contract."],
  },
  field: {
    context: "The canvas edits a local example value. Preview is read-only/disabled; no form submission or native action contract is provided.",
    notes: ["Options appears only for Select. Field is Studio-specific and has no exact Gutenberg core counterpart."],
  },
  spacer: {
    nesting: "Leaf block whose immediate Group or Section parent determines its axis.",
    context: "Row exposes Width; other layouts expose Height. The axis follows the parent’s layout setting even when responsive styling stacks a Row.",
    notes: ["Size uses a native number and unit input; Margin uses Paragraph length. Neither is Preset number or Box dimensions.", "Flex-child fill and a canvas drag handle remain unsupported."],
    insertionDefaults: "Studio inserts a 32px height; the recorded Gutenberg height default is 100px.",
  },
  "document-title": {
    context: `${documentContext} Post links require the current document destination; new-tab and rel appear only when linking is enabled.`,
    notes: ["The presentation defaults to H2. Configured managed backgrounds include the shared background-repeat toggle."],
    insertionDefaults: "The title is inherited from document metadata; default level is H2 and linking is off.",
  },
  "document-subtitle": {
    context: documentContext,
    notes: ["This Studio-specific metadata block uses ACM-origin shared style controls. It has no exact Gutenberg core counterpart."],
  },
  "cover-image": {
    context: `${documentContext} Media comes from the document’s cover image. New-tab and rel require Post link.`,
    notes: ["This is Post Featured Image, not the content-bearing Cover block.", "Saved align and focal attributes are retained for rendering; there is no Alignment or Focal position inspector editor.", "Dimensions provides Original/named ratios and width/height. Non-original ratios expose Cover, Contain and Fill scaling."],
    insertionDefaults: "Default scale is Cover; the media source is inherited from the document.",
  },
  "reading-time": {
    context: "Calculated from the current document body using ACM word counting; it is not document metadata entered in this pane.",
    notes: ["The default estimate is 220 words/minute, rounded up to at least one minute. Range uses 200–250 words/minute. Words mode suppresses the range setting.", "Studio inserts a single estimate with a Reading Time: prefix and Badge presentation. Exact upstream estimator/default parity is not claimed. There is no Advanced pane."],
    insertionDefaults: "Single estimate; Reading Time: prefix; Badge presentation.",
  },
  "post-author": {
    context: documentContext,
    notes: ["Studio uses an initials avatar, not a profile image. Gutenberg avatar size, biography and author-link options are unsupported."],
    insertionDefaults: "Prefix By and initials avatar enabled; author text is inherited.",
  },
  "post-date": {
    context: `${documentContext} Date source selects published or modified time; legacy publication snapshots may lack modified time.`,
    notes: ["Custom format input appears only for Custom. Its token subset is bounded; relative dates are unsupported."],
    insertionDefaults: "Published date, Long format and clock icon enabled.",
  },
  "social-icons": {
    nesting: "Contains LinkedIn and TikTok children; other networks are unsupported.",
    context: "The parent owns labels, new-tab behaviour, style, icon size and layout. Children provide URL, label and rel.",
    notes: ["Outer None/Left/Centre/Right alignment is a canvas toolbar action.", "Spacing → Gap sets both axes, supports Mixed/clear, and coexists with separate horizontal/vertical Spacing slider controls."],
  },
  "social-linkedin": {
    nesting: "New insertions are wrapped in Social Icons. Legacy standalone widgets remain supported.",
    context: "Inside Social Icons, the parent owns label visibility and new-tab behaviour. URL, label and rel remain child settings.",
    notes: ["Saved Advanced attributes are retained in the model but there is no child Advanced pane."],
  },
  "social-tiktok": {
    nesting: "New insertions are wrapped in Social Icons. Legacy standalone widgets remain supported.",
    context: "Inside Social Icons, the parent owns label visibility and new-tab behaviour. URL, label and rel remain child settings.",
    notes: ["Saved Advanced attributes are retained in the model but there is no child Advanced pane."],
  },
  section: {
    context: "Studio semantic container with site role and recorded source provenance. Role is editable; source is read-only and arbitrary data/source editing is unavailable.",
    notes: ["Grid settings depend on layout. Section role follows Advanced.", "Converting Section to a template node does not carry visualStyle; do not assume every presentation setting round-trips through that conversion."],
  },
  group: {
    context: "Enclosing layout and document content/wide widths affect children. Sticky positioning is available only for a root Group; Grid and Row controls depend on layout.",
    notes: ["The Group/Row/Stack/Grid chooser is in the summary. None/Wide/Full alignment is a canvas action.", "Pane order is Typography, Background, Layout, Dimensions, Border, Elements, Position, Advanced, then Allowed Blocks.", "Legacy Columns layout and responsive stacking remain model-only. Template lock, flex-child sizing and manual grid placement remain unsupported."],
  },
  columns: {
    context: "Parent owns Column count, axis gaps, stacking and vertical alignment. Stack on mobile preserves an existing tablet breakpoint.",
    notes: ["The initial layout chooser is a canvas control for empty Columns; this populated fixture does not show it.", "Removing a Column retains its content in the last surviving Column. Destination restrictions and block locks can disable removal, with an explanation in the pane.", "Gaps use Spacing slider; padding uses Box dimensions. Columns does not use Preset number."],
  },
  column: {
    context: "Width editing requires a Columns parent with at least two children and updates that parent through the shared command. The catalogue fixture uses the same command in temporary history. The maximum reserves at least 5% for each sibling. Vertical alignment can inherit from the parent.",
    notes: ["Width uses a native percentage input, not Preset number. Block gap uses Spacing slider.", "Allowed Blocks follows Advanced; sibling width changes belong to the Columns parent."],
  },
  component: {
    context: "Integration owns component identity and behaviour. The library shows an inactive specimen without invoking product integrations.",
    notes: ["The inspector edits only whitelisted string properties for a registered component; identity and arbitrary data are not editable.", "Ordinary published content rendering omits Component. Template conversion rejects integration components."],
  },
  "template-content": {
    context: "The current document body is projected through a template slot with inherited widths, layout settings and visualStyle. It is not a saved document ContentBlock.",
    notes: ["Layout follows Background. Content and wide widths use Paragraph length; block spacing uses Spacing slider.", "Studio has no Query Loop context. This fixture’s temporary body is rendered through the production Content slot."],
    insertionDefaults: "Content widths are inherited by default.",
  },
};

const retainedStyleIds = new Set(["min-height", "min-width", "shadow"]);
const hiddenByBlock: Partial<Record<CapabilityBlockType, readonly string[]>> = {
  "cover-image": ["text-alignment", "focal-position"],
};
const conditionByControl: Record<string, string> = {
  "paragraph:drop-cap": "Disabled for centre/right alignment; saved value is retained.",
  "table:header-footer": "Available only for a non-empty table.",
  "heading:background": "Image detail controls appear for a saved managed image; a new Heading has no image picker.",
  "image:source": "File selection requires canOpenFiles; external URL entry is available only without mediaId.",
  "image:alternative-text": "Alt editing is disabled for Decorative; linked images cannot be Decorative.",
  "image:link-destination": "Custom URL input appears only for Custom; new-tab applies to custom/media links.",
  "document-title:link": "New-tab and rel appear only when Post link is enabled; the document destination determines whether the link renders.",
  "cover-image:link": "New-tab and rel appear only when Post link is enabled.",
  "reading-time:range": "Available in reading-time mode; hidden in Words mode.",
  "post-date:format": "Custom format input appears only when Custom is selected.",
  "column:width": "Requires at least two Columns children and the parent-width command; available in this specimen. The maximum reserves 5% per sibling.",
};

function projectControl(type: CapabilityBlockType, control: InspectorControlProfile): CatalogueControl {
  let next: CatalogueControl = { ...control };
  if ((type !== "document-subtitle" && control.source === "studio" && retainedStyleIds.has(control.id)) || hiddenByBlock[type]?.includes(control.id)) {
    next = { ...next, documentationStatus: "Hidden retained attribute" };
  } else if (control.availability === "model-only") next.documentationStatus = "Model only";
  if (type === "heading" && control.id === "level") next.documentationStatus = "Summary control";
  if (type === "group" && control.id === "layout") next.documentationStatus = "Summary control";
  if (type === "quote" && control.id === "text-alignment") next.placement = "canvas";
  if (["image", "table"].includes(type) && control.id === "caption") next.placement = "canvas";
  if (["image", "table", "embed"].includes(type) && control.id === "caption") next.fields = ["caption", "captionRuns"];
  if (type === "section" && control.id === "role") {
    next.label = "Site role (editable) and source provenance (read-only)";
    next.fields = ["role", "source"];
  }
  if (type === "component" && control.id === "data") next.availableWhen = "Only whitelisted string properties for the registered component.";
  if (control.id === "advanced" && next.fields.some(field => field.endsWith("additionalCss"))) next.label = "HTML anchor, CSS classes and Additional CSS";
  const condition = conditionByControl[`${type}:${control.id}`];
  if (condition) next.availableWhen = condition;
  return next;
}

function canvasControl(id: string, label: string, fields: readonly string[]): CatalogueControl {
  return { id, label, fields, source: "gutenberg", section: "content", placement: "canvas", resetFields: [] };
}

const additionalControls: Partial<Record<CapabilityBlockType, readonly CatalogueControl[]>> = {
  paragraph: [canvasControl("text-alignment", "Text alignment", ["align"]), canvasControl("block-alignment", "None/Wide/Full block alignment", ["blockAlign"])],
  quote: [canvasControl("citation", "Rich citation", ["attribution", "attributionRuns"])],
  footnotes: [canvasControl("footnote-notes", "Editable note text", ["notes[].id", "notes[].text"])],
  buttons: [canvasControl("outer-alignment", "None/Left/Centre/Right/Wide/Full alignment", ["blockAlign"])],
  button: [{ id: "interaction-state", label: "Default/Hover/Focus/Active style state", source: "studio", section: "content", fields: ["interactionStyles"], resetFields: [], documentationStatus: "Summary control", availableWhen: "Show state on canvas is a temporary preview option." }],
  "social-icons": [canvasControl("outer-alignment", "None/Left/Centre/Right alignment", ["blockAlign"]), { id: "scalar-gap", label: "Spacing → Gap (both axes)", source: "gutenberg", section: "dimensions", fields: ["horizontalGap", "verticalGap"], resetFields: [], availableWhen: "Mixed when the axes differ; clear removes both overrides." }],
  group: [canvasControl("block-alignment", "None/Wide/Full block alignment", ["blockAlign"])],
};

const dependencyRemovals: Partial<Record<CapabilityBlockType, readonly string[]>> = {
  paragraph: ["paragraph-background"], buttons: ["layout-spacing"], button: ["preset-number"],
  spacer: ["box-length", "preset-number"], divider: ["box-length"], embed: ["box-length"],
  "cover-image": ["focal-position"], columns: ["preset-number"], column: ["preset-number"],
};
const dependencyAdditions: Partial<Record<CapabilityBlockType, readonly string[]>> = {
  image: ["paragraph-length"], divider: ["paragraph-length"], embed: ["paragraph-length"], spacer: ["paragraph-length"],
  heading: ["focal-position"], quote: ["focal-position"], code: ["focal-position"],
  "document-title": ["focal-position"], "template-content": ["focal-position"],
  group: ["preset-number", "focal-position"], section: ["preset-number"],
};

export function blockCatalogueDocumentation(profile: BlockCapabilityProfile) {
  const type = profile.type;
  const documentation = blockDocumentation[type];
  const controls = [...profile.controls.map(control => projectControl(type, control)), ...(additionalControls[type] ?? [])];
  const dependencyIds = new Set(profile.dependencies.map(dependency => dependency.id));
  for (const id of dependencyRemovals[type] ?? []) dependencyIds.delete(id);
  for (const id of dependencyAdditions[type] ?? []) dependencyIds.add(id);
  const dependencies = [...dependencyIds].flatMap(id => {
    const entry = studioControlEntryById[id];
    return entry ? [{ id, label: entry.title, href: `/studio/ui/controls#${id}`, purpose: entry.purpose }] : [];
  });
  const unsupported = profile.unsupported.filter(item => !(type === "image" && item === "Image file destination without managed media"));
  return {
    ...profile, ...documentation, controls, dependencies, unsupported,
    sections: profile.sections.filter(section => controls.some(control => control.section === section.id && control.placement !== "canvas" && control.documentationStatus !== "Summary control")),
    summaryControls: controls.filter(control => control.documentationStatus === "Summary control"),
    hasAdditionalCss: controls.some(control => !control.documentationStatus && control.fields.some(field => field.endsWith("additionalCss"))),
  };
}

export const additionalCssCompatibility = "Additional CSS accepts a validated subset of property/value declarations. Selectors, at-rules, external URLs, escapes and !important are unsupported. It is not an unrestricted stylesheet editor.";
