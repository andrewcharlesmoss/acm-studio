import type { ContentBlock, ParagraphStyle } from "../../content/model";

export type CapabilityBlockType = ContentBlock["type"] | "template-content";
export type InspectorSource = "gutenberg" | "studio";
export type InspectorControlPlacement = "inspector" | "canvas";
export type InspectorSectionId = "text" | "typography" | "background" | "dimensions" | "border" | "elements" | "advanced" | "layout" | "media" | "links" | "content" | "metadata";
export type InspectorControlProfile = {
  id: string;
  label: string;
  source: InspectorSource;
  placement?: InspectorControlPlacement;
  section: InspectorSectionId;
  fields: readonly string[];
  resetFields: readonly string[];
  /** False when Gutenberg supports the control but the captured editor configuration does not expose it. */
  enabled?: boolean;
  defaultVisible?: boolean;
  availableWhen?: string;
  dependency?: string;
};
export type BlockCapabilityProfile = {
  type: CapabilityBlockType;
  label: string;
  mapping: string;
  sections: readonly { id: InspectorSectionId; label: string; source: InspectorSource }[];
  controls: readonly InspectorControlProfile[];
  defaults: { typography: readonly string[]; dimensions: readonly string[]; border: readonly string[]; elements: readonly string[] };
  /** Raw attribute defaults in the pinned Gutenberg implementation. */
  attributeDefaults: Readonly<Record<string, unknown>>;
  resetFields: readonly string[];
  dependencies: readonly { id: string; label: string; href: string; purpose: string }[];
  unsupported: readonly string[];
  sharedStyleInspector: boolean;
  nesting: string;
  context: string;
  inventorySections: readonly { id: string; label: string; source: InspectorSource; fields: readonly string[] }[];
  transforms: readonly { type: string; label: string }[];
  description?: string;
  intendedUse?: string;
};

type StyleControlId = "colour" | "size" | "family" | "appearance" | "line-height" | "letter-spacing" | "line-indent" | "columns" | "decoration" | "orientation" | "letter-case" | "drop-cap" | "fit-text" | "text-shadow" | "padding" | "margin" | "min-height" | "min-width" | "border" | "radius" | "shadow" | "link-colour";
const styleControlFields: Record<StyleControlId, { label: string; section: InspectorSectionId; fields: readonly (keyof ParagraphStyle)[] }> = {
  colour: { label: "Colour", section: "typography", fields: ["textColor"] },
  size: { label: "Size", section: "typography", fields: ["fontSize", "fontSizeCustom"] },
  family: { label: "Font family", section: "typography", fields: ["fontFamily"] },
  appearance: { label: "Appearance", section: "typography", fields: ["appearance"] },
  "line-height": { label: "Line height", section: "typography", fields: ["lineHeight"] },
  "letter-spacing": { label: "Letter spacing", section: "typography", fields: ["letterSpacing"] },
  "line-indent": { label: "Line indent", section: "typography", fields: ["textIndent"] },
  columns: { label: "Columns", section: "typography", fields: ["textColumns"] },
  decoration: { label: "Decoration", section: "typography", fields: ["textDecoration"] },
  orientation: { label: "Orientation", section: "typography", fields: ["orientation"] },
  "letter-case": { label: "Letter case", section: "typography", fields: ["textTransform"] },
  "drop-cap": { label: "Drop cap", section: "typography", fields: ["dropCap"] },
  "fit-text": { label: "Fit text", section: "typography", fields: ["fitText"] },
  "text-shadow": { label: "Text shadow", section: "typography", fields: ["textShadow"] },
  padding: { label: "Padding", section: "dimensions", fields: ["padding"] },
  margin: { label: "Margin", section: "dimensions", fields: ["margin"] },
  "min-height": { label: "Minimum height", section: "dimensions", fields: ["minHeight"] },
  "min-width": { label: "Minimum width", section: "dimensions", fields: ["minWidth"] },
  border: { label: "Border", section: "border", fields: ["borderColor", "borderStyle", "borderWidth"] },
  radius: { label: "Radius", section: "border", fields: ["borderRadius"] },
  shadow: { label: "Shadow", section: "border", fields: ["shadow"] },
  "link-colour": { label: "Link colour", section: "elements", fields: ["linkColor", "linkHoverColor"] },
};
export function retainedLegacyStyleControls(profile: BlockCapabilityProfile, style: ParagraphStyle | undefined): InspectorControlProfile[] {
  if (!style) return [];
  const ownedFields = new Set(profile.controls.flatMap(control => control.fields.map(field => field.split(".").at(-1) ?? field)));
  return (Object.entries(styleControlFields) as Array<[StyleControlId, (typeof styleControlFields)[StyleControlId]]>)
    .filter(([, definition]) => definition.fields.some(field => !ownedFields.has(field)) && definition.fields.some(field => style[field] !== undefined && style[field] !== "" && style[field] !== false))
    .map(([id]) => ({ ...makeStyleControl(id, "studio"), availableWhen: "Retained saved value; surfaced for editing and reset." }));
}
const makeStyleControl = (id: StyleControlId, source: InspectorSource = "gutenberg", availableWhen?: string): InspectorControlProfile => {
  const definition = styleControlFields[id];
  return { id, label: definition.label, source, section: definition.section, fields: definition.fields, resetFields: definition.fields, ...(availableWhen ? { availableWhen } : {}) };
};
const makeSpecificControl = (id: string, label: string, section: InspectorSectionId, source: InspectorSource = "gutenberg", availableWhen?: string, dependency?: string, placement: InspectorControlPlacement = "inspector"): InspectorControlProfile => ({ id, label, source, placement, section, fields: [], resetFields: [], ...(availableWhen ? { availableWhen } : {}), ...(dependency ? { dependency } : {}) });

const controlFieldsByBlock: Partial<Record<CapabilityBlockType, Record<string, readonly string[]>>> = {
  heading: { level: ["level"], "text-alignment": ["align"], "block-alignment": ["blockAlign"], advanced: ["visualStyle.anchor", "visualStyle.className"] },
  quote: { attribution: ["attribution"], "text-alignment": ["align"], style: ["quoteStyle"], "block-alignment": ["blockAlign"] },
  list: { "list-style": ["style"], "ordered-style": ["marker"], "start-reverse": ["start", "reversed"], "block-alignment": ["blockAlign"] },
  table: { "table-alignment": ["blockAlign"], "column-alignment": ["columnAlignments"], "fixed-width": ["fixedWidth"], "header-footer": ["hasHeader", "hasFooter"], caption: ["caption"], "table-style": ["tableStyle"] },
  code: { "block-alignment": ["blockAlign"], language: ["language"] },
  image: { source: ["src", "mediaId"], "alternative-text": ["alt", "decorative"], caption: ["caption"], "link-destination": ["linkDestination", "linkUrl", "opensInNewTab"], "display-dimensions": ["displayWidth", "displayHeight"], "aspect-ratio": ["aspectRatio"], scale: ["scale"], "focal-position": ["focalX", "focalY"], "image-style": ["imageStyle"], "block-alignment": ["blockAlign"], advanced: ["title", "visualStyle.anchor", "visualStyle.className"] },
  embed: { url: ["url"], caption: ["caption"], "block-alignment": ["blockAlign"], advanced: ["visualStyle.anchor", "visualStyle.className"], "card-title": ["title"] },
  divider: { "divider-style": ["style"], element: ["tagName"], "block-alignment": ["blockAlign"], colour: ["visualStyle.textColor"], margin: ["visualStyle.margin"], advanced: ["visualStyle.anchor", "visualStyle.className"] },
  footnotes: { "footnote-notes": ["notes"] },
  button: { label: ["label"], url: ["url"], "new-tab": ["opensInNewTab"], appearance: ["style"], width: ["width"], "text-alignment": ["align"], "title-rel": ["title", "rel"] },
  field: { label: ["label"], control: ["control"], value: ["value"], options: ["options"] },
  spacer: { height: ["height", "heightUnit"], margin: ["visualStyle.margin"], advanced: ["visualStyle.anchor", "visualStyle.className"], width: ["width", "widthUnit"] },
  "document-title": { level: ["level"], link: ["isLink", "linkTarget", "rel"], "text-alignment": ["align"], "block-alignment": ["blockAlign"] },
  "document-subtitle": { "text-alignment": ["align"] },
  "cover-image": { "block-alignment": ["blockAlign"], "text-alignment": ["align"], link: ["isLink", "linkTarget", "rel"], "display-dimensions": ["displayWidth", "displayHeight"], "aspect-ratio": ["aspectRatio"], scale: ["scale"], "focal-position": ["focalX", "focalY"] },
  "reading-time": { alignment: ["align"], prefix: ["prefix"], presentation: ["presentation"] },
  "post-author": { alignment: ["align"], prefix: ["prefix"], avatar: ["avatar"] },
  "post-date": { format: ["format"], link: ["isLink"], alignment: ["align"], "show-icon": ["showIcon"] },
  "social-icons": { children: ["children"], style: ["socialStyle"], justification: ["justification"], orientation: ["orientation"], wrap: ["allowWrap"], "icon-size": ["iconSize"], labels: ["showLabels"], "new-tab": ["openInNewTab"], gap: ["horizontalGap", "verticalGap"], "axis-gaps": ["horizontalGap", "verticalGap"] },
  "social-linkedin": { "profile-url": ["url"], label: ["label"], rel: ["rel"], advanced: ["visualStyle.anchor", "visualStyle.className"] },
  "social-tiktok": { "profile-url": ["url"], label: ["label"], rel: ["rel"], advanced: ["visualStyle.anchor", "visualStyle.className"] },
  section: { layout: ["layout"], alignment: ["horizontalAlign", "verticalAlign"], gaps: ["gap", "columnGap", "rowGap"], padding: ["paddingX", "paddingY"], "content-width": ["contentWidth"], columns: ["columns"], grid: ["columns", "minColumnWidth"], role: ["role", "data", "source"] },
  group: { layout: ["layout"], alignment: ["horizontalAlign", "verticalAlign"], gaps: ["gap", "columnGap", "rowGap"], padding: ["paddingX", "paddingY"], "content-width": ["contentWidth"], columns: ["columns"], grid: ["columns", "minColumnWidth"], sticky: ["position"], "responsive-stack": ["stackAt"], "semantic-element": ["tagName", "ariaLabel"], "background-image": ["visualStyle.backgroundImageMediaId", "visualStyle.backgroundPositionX", "visualStyle.backgroundPositionY", "visualStyle.backgroundSize", "visualStyle.backgroundRepeat"] },
  columns: { "outer-alignment": ["blockAlign"], preset: ["children"], "column-count": ["children"], "stack-on-mobile": ["stackAt"], "content-width": ["contentWidth"], "vertical-alignment": ["verticalAlign"], gaps: ["gap", "columnGap", "rowGap"], advanced: ["style.anchor", "style.className"], "responsive-stack": ["stackAt"] },
  column: { width: ["width"], "vertical-alignment": ["verticalAlign"], gap: ["rowGap", "gap"] },
  component: { component: ["component"], data: ["data"] },
  "template-content": { projection: ["document.blocks"] },
};

function addFieldsAndConditions(type: CapabilityBlockType, control: InspectorControlProfile): InspectorControlProfile {
  const advancedStyleFields = type === "columns" || type === "column"
    ? ["style.anchor", "style.className"]
    : type === "group"
      ? ["visualStyle.anchor", "visualStyle.className", "tagName", "ariaLabel"]
      : ["visualStyle.anchor", "visualStyle.className"];
  const fields = control.fields.length ? control.fields : controlFieldsByBlock[type]?.[control.id] ?? (control.id === "advanced" ? advancedStyleFields : []);
  const conditional: Record<string, { availableWhen: string; dependency?: string }> = {
    "image:scale": { availableWhen: "When a non-original aspect ratio is selected.", dependency: "aspect-ratio" },
    "image:focal-position": { availableWhen: "When an image source is set, a non-original aspect ratio is selected and Scale is Cover.", dependency: "aspect-ratio" },
    "cover-image:scale": { availableWhen: "When a non-original aspect ratio is selected.", dependency: "aspect-ratio" },
    "cover-image:focal-position": { availableWhen: "Studio-only when a non-original aspect ratio is selected and Scale is Cover.", dependency: "aspect-ratio" },
    "list:ordered-style": { availableWhen: "When the list is ordered.", dependency: "list-style" },
    "list:start-reverse": { availableWhen: "When the list is ordered.", dependency: "list-style" },
    "group:grid": { availableWhen: "When the layout is Grid.", dependency: "layout" },
    "section:grid": { availableWhen: "When the layout is Grid.", dependency: "layout" },
    "group:columns": { availableWhen: "When the layout is Columns.", dependency: "layout" },
    "section:columns": { availableWhen: "When the layout is Columns.", dependency: "layout" },
    "group:sticky": { availableWhen: "For a root Group in the post editor.", dependency: "root-group" },
    "field:options": { availableWhen: "When the control type is Select.", dependency: "control" },
    "paragraph:drop-cap": { availableWhen: "When text alignment is left or unset.", dependency: "text-alignment" },
    "social-icons:colour": { availableWhen: "Studio provides its palette; Gutenberg shows this when the theme supports colours or gradients and no style variation is selected.", dependency: "style" },
    "social-icons:background": { availableWhen: "Studio provides its palette; Gutenberg shows this when the theme supports colours or gradients and no style variation is selected. Icon background is omitted in Logos Only mode.", dependency: "style" },
    "quote:managed-background-image": { availableWhen: "When the Studio background-image picker is available.", dependency: "background" },
    "group:background-image": { availableWhen: "When the Studio background-image picker is available.", dependency: "background" },
  };
  const condition = conditional[`${type}:${control.id}`];
  return { ...control, fields, resetFields: control.resetFields.length ? control.resetFields : fields, ...(condition ? { availableWhen: condition.availableWhen, dependency: condition.dependency } : {}) };
}

export function resetInspectorStyleFields<T extends object>(style: T, controlIds: Iterable<string>, controls: readonly InspectorControlProfile[]): T {
  const selectedIds = new Set(controlIds);
  const fieldsToClear = new Set(controls.filter(control => selectedIds.has(control.id)).flatMap(control => control.resetFields));
  const next = { ...style } as T & Record<string, unknown>;
  for (const field of fieldsToClear) delete next[field];
  return next;
}

const sharedStyleSections = new Set<InspectorSectionId>(["typography", "background", "dimensions", "border", "elements"]);
const sharedStyleSectionOrder: InspectorSectionId[] = ["typography", "background", "dimensions", "border", "elements"];
export function scopedStyleSectionIds(profile: BlockCapabilityProfile, style: ParagraphStyle | undefined, source: InspectorSource): InspectorSectionId[] {
  const controls = [...profile.controls, ...retainedLegacyStyleControls(profile, style)];
  const available = new Set(controls.filter(control => control.enabled !== false && control.source === source && sharedStyleSections.has(control.section) && (control.section !== "background" || control.id === "background") && control.fields.length > 0).map(control => control.section));
  const profileOrder = profile.sections.filter(section => available.has(section.id)).map(section => section.id);
  const ordered = new Set(profileOrder);
  return [...profileOrder, ...[...available].filter(section => !ordered.has(section))]
    .sort((first, second) => sharedStyleSectionOrder.indexOf(first) - sharedStyleSectionOrder.indexOf(second));
}
export function hasScopedStyleControls(profile: BlockCapabilityProfile, source: InspectorSource): boolean {
  return profile.sharedStyleInspector && scopedStyleSectionIds(profile, undefined, source).length > 0;
}

const defaults = (typography: readonly string[] = [], dimensions: readonly string[] = [], border: readonly string[] = [], elements: readonly string[] = []) => ({ typography, dimensions, border, elements });
const menuDependencies = [
  { id: "colour-picker", label: "Colour picker", href: "/studio/ui/controls/colour-picker", purpose: "Choose a preset or custom colour." },
  { id: "background-selection", label: "Background selection", href: "/studio/ui/controls/background-selection", purpose: "Choose a solid colour or gradient." },
  { id: "custom-font-size", label: "Custom font size", href: "/studio/ui/controls/custom-font-size", purpose: "Choose a preset or custom size and unit." },
  { id: "font-size-appearance", label: "Font size and Appearance", href: "/studio/ui/controls/font-size-appearance", purpose: "Choose font size and appearance." },
  { id: "box-length", label: "Box dimensions", href: "/studio/ui/controls/box-length", purpose: "Set linked or separate dimensions." },
  { id: "paragraph-length", label: "Paragraph length", href: "/studio/ui/controls/paragraph-length", purpose: "Edit text indent and other compact numeric values." },
  { id: "preset-number", label: "Preset number", href: "/studio/ui/controls/preset-number", purpose: "Choose a common pixel value or enter a custom value." },
  { id: "image-dimensions", label: "Image dimensions", href: "/studio/ui/controls/image-dimensions", purpose: "Set aspect ratio, display dimensions and scale." },
  { id: "focal-position", label: "Focal position", href: "/studio/ui/controls/focal-position", purpose: "Position the crop around its subject." },
  { id: "border-settings", label: "Border settings", href: "/studio/ui/controls/border-settings", purpose: "Set border colour, width, style and radius." },
  { id: "inspector-tools", label: "Inspector options and reset", href: "/studio/ui/controls/inspector-tools", purpose: "Show optional controls and reset their owned fields." },
  { id: "inspector-accordion", label: "Accordion section", href: "/studio/ui/controls/inspector-accordion", purpose: "Group settings into collapsible sections." },
] as const;

function dependenciesFor(controls: readonly InspectorControlProfile[], includeInspectorTools: boolean) {
  const ids = new Set(controls.map(control => control.id));
  const fields = new Set(controls.flatMap(control => control.fields));
  const required = new Set<string>(["inspector-accordion"]);
  if (ids.has("colour") || ids.has("link-colour") || ids.has("colour")) required.add("colour-picker");
  if (ids.has("background")) required.add("background-selection");
  if (ids.has("size")) { required.add("custom-font-size"); required.add("font-size-appearance"); }
  if (["padding", "margin", "border", "radius"].some(id => ids.has(id))) required.add("box-length");
  if (ids.has("line-indent") || ids.has("paragraph-length")) required.add("paragraph-length");
  if (["gaps", "grid", "width", "height", "preset", "axis-gaps"].some(id => ids.has(id))) required.add("preset-number");
  if (ids.has("display-dimensions") || ids.has("aspect-ratio")) required.add("image-dimensions");
  if (ids.has("focal-position")) required.add("focal-position");
  if (["borderColor", "borderStyle", "borderWidth"].some(field => fields.has(field))) required.add("border-settings");
  if (includeInspectorTools) required.add("inspector-tools");
  return menuDependencies.filter(dependency => required.has(dependency.id));
}

const paraSections = [
  { id: "typography", label: "Typography", source: "gutenberg" },
  { id: "background", label: "Background", source: "gutenberg" },
  { id: "dimensions", label: "Dimensions", source: "gutenberg" },
  { id: "border", label: "Border", source: "gutenberg" },
  { id: "elements", label: "Elements", source: "gutenberg" },
  { id: "advanced", label: "Advanced", source: "gutenberg" },
] as const;
const paragraphControls: InspectorControlProfile[] = [
  ...(["colour", "size", "appearance", "line-height", "letter-spacing", "line-indent", "columns", "decoration", "letter-case", "drop-cap", "fit-text"] as StyleControlId[]).map(id => makeStyleControl(id)),
  { ...makeStyleControl("family"), enabled: false, availableWhen: "Gutenberg theme typography settings provide font families; not enabled in Andrew's current reference.", dependency: "theme-font-families" },
  { ...makeStyleControl("orientation"), enabled: false, availableWhen: "Gutenberg writing mode is enabled in editor settings; not enabled in Andrew's current reference.", dependency: "writing-mode-setting" },
  makeStyleControl("text-shadow"),
  { ...makeSpecificControl("background", "Background colour or gradient", "background"), fields: ["backgroundColor", "backgroundGradient"], resetFields: ["backgroundColor", "backgroundGradient"] },
  makeStyleControl("padding"), makeStyleControl("margin"), makeStyleControl("min-height", "studio"), makeStyleControl("min-width", "studio"),
  makeStyleControl("border"), makeStyleControl("radius"), makeStyleControl("shadow", "studio"), makeStyleControl("link-colour"),
  { ...makeSpecificControl("advanced", "HTML anchor", "advanced"), fields: ["anchor"], resetFields: ["anchor"] },
  { ...makeSpecificControl("class-name", "Additional CSS class(es)", "advanced"), fields: ["className"], resetFields: ["className"] },
  { ...makeSpecificControl("additional-css", "Additional CSS declarations", "advanced"), fields: ["additionalCss"], resetFields: ["additionalCss"] },
];
export const paragraphInspectorProfile: BlockCapabilityProfile = {
  type: "paragraph", label: "Paragraph", mapping: "core/paragraph",
  sections: paraSections,
  inventorySections: paraSections.map(section => ({ ...section, fields: section.id === "background" ? ["backgroundColor", "backgroundGradient"] : section.id === "advanced" ? ["anchor", "className", "additionalCss"] : [] })),
  controls: paragraphControls,
  transforms: [],
  defaults: defaults(["colour", "size"], [], [], []),
  attributeDefaults: {},
  sharedStyleInspector: true,
  resetFields: ["fontSize", "fontSizeCustom", "fontFamily", "appearance", "textTransform", "textDecoration", "lineHeight", "letterSpacing", "textIndent", "textColumns", "dropCap", "fitText", "orientation", "minHeight", "minWidth", "textColor", "backgroundColor", "backgroundGradient", "linkColor", "linkHoverColor", "padding", "margin", "borderStyle", "borderWidth", "borderColor", "borderRadius", "shadow", "textShadow"],
  dependencies: [
    ...dependenciesFor(paragraphControls, true),
    { id: "paragraph-background", label: "Background adapter", href: "#background", purpose: "Compose solid colour and gradient backgrounds." },
  ],
  unsupported: ["Theme-defined font and colour presets", "Registered block style variations", "Managed background images for Paragraph"],
  nesting: "Paragraph is a leaf block.", context: "Indent context follows the adjacent previous Paragraph block.",
  description: "Start with the basic building block of all narrative.",
  intendedUse: "Use Paragraph for ordinary prose and inline formatted text.",
};

function makeProfile(type: CapabilityBlockType, label: string, mapping: string, options: {
  block: readonly InspectorControlProfile[];
  studio?: readonly InspectorControlProfile[];
  style?: { typography?: readonly StyleControlId[]; dimensions?: readonly StyleControlId[]; border?: readonly StyleControlId[]; elements?: readonly StyleControlId[] };
  styleSource?: InspectorSource;
  studioStyle?: readonly StyleControlId[];
  background?: InspectorSource | false;
  defaults?: { typography?: readonly string[]; dimensions?: readonly string[]; border?: readonly string[]; elements?: readonly string[] };
  attributeDefaults?: Readonly<Record<string, unknown>>;
  unsupported?: readonly string[];
  nesting?: string;
  context?: string;
  sharedStyleInspector?: boolean;
}): BlockCapabilityProfile {
  const style = options.style ?? {};
  const generic = [
    ...[...(style.typography ?? []), ...(style.dimensions ?? []), ...(style.border ?? []), ...(style.elements ?? [])].map(id => makeStyleControl(id, options.studioStyle?.includes(id) ? "studio" : options.styleSource)),
  ];
  const sharedStyleInspector = options.sharedStyleInspector ?? ["heading", "quote", "list", "table", "code", "button", "footnotes", "document-title", "document-subtitle", "reading-time", "post-author", "post-date", "social-icons", "group", "section", "columns", "column"].includes(type);
  const backgroundSource = options.background === false ? undefined : options.background ?? options.styleSource ?? "gutenberg";
  const backgroundControl = sharedStyleInspector && backgroundSource ? [{ ...makeSpecificControl("background", "Background colour or gradient", "background", backgroundSource), fields: ["backgroundColor", "backgroundGradient"], resetFields: ["backgroundColor", "backgroundGradient"] }] : [];
  const blockControls = options.block.filter(control => control.id !== "advanced");
  const advancedBlockControls = options.block.filter(control => control.id === "advanced");
  const hasAdvancedControl = [...options.block, ...(options.studio ?? [])].some(control => control.id === "advanced");
  const advancedControl = advancedBlockTypes.has(type) && !hasAdvancedControl ? [makeSpecificControl("advanced", "HTML anchor and CSS classes", "advanced")] : [];
  const controls = [
    ...blockControls,
    ...generic.filter(control => control.section === "typography"),
    ...backgroundControl,
    ...generic.filter(control => control.section !== "typography"),
    ...(options.studio ?? []),
    ...advancedBlockControls,
    ...advancedControl,
  ].map(control => addFieldsAndConditions(type, control));
  const inspectorControls = controls.filter(control => control.placement !== "canvas");
  const sectionIds = [...new Set(inspectorControls.map(control => control.section))];
  const labels: Record<InspectorSectionId, string> = { text: "Text", typography: "Typography", background: "Background", dimensions: "Dimensions", border: "Border", elements: "Elements", advanced: "Advanced", layout: "Layout", media: "Media", links: "Links", content: "Content", metadata: "Metadata" };
  return {
    type, label, mapping, sections: sectionIds.map(id => ({ id, label: labels[id], source: inspectorControls.find(control => control.section === id)?.source ?? "gutenberg" })),
    inventorySections: sectionIds.map(id => ({ id, label: labels[id], source: inspectorControls.find(control => control.section === id)?.source ?? "gutenberg", fields: [] })),
    controls,
    transforms: [],
    defaults: defaults(options.defaults?.typography, options.defaults?.dimensions, options.defaults?.border, options.defaults?.elements),
    attributeDefaults: options.attributeDefaults ?? {},
    resetFields: [...new Set(controls.flatMap(control => control.resetFields))],
    dependencies: dependenciesFor(controls, sharedStyleInspector),
    unsupported: options.unsupported ?? [],
    sharedStyleInspector,
    nesting: options.nesting ?? "Leaf block.", context: options.context ?? "No additional block context.",
  };
}

const block = (section: InspectorSectionId, ...controls: Array<[string, string, string?]>) => controls.map(([id, label, condition]) => makeSpecificControl(id, label, id === "advanced" ? "advanced" : section, "gutenberg", condition, undefined, ["block-alignment", "outer-alignment", "table-alignment", "column-alignment", "children"].includes(id) ? "canvas" : "inspector"));
const studio = (section: InspectorSectionId, ...controls: Array<[string, string, string?]>) => controls.map(([id, label, condition]) => makeSpecificControl(id, label, section, "studio", condition));
const advancedBlockTypes = new Set<CapabilityBlockType>(["heading", "quote", "list", "table", "code", "image", "embed", "button", "divider", "spacer", "group", "section", "columns", "column", "footnotes", "social-icons", "social-linkedin", "social-tiktok", "document-title", "cover-image", "post-date", "post-author"]);

export const blockCapabilityProfiles: Record<CapabilityBlockType, BlockCapabilityProfile> = {
  paragraph: paragraphInspectorProfile,
  heading: makeProfile("heading", "Heading", "core/heading", { block: block("text", ["text-alignment", "Text alignment"], ["level", "Level"], ["block-alignment", "Block alignment"]), style: { typography: ["colour", "size", "family", "appearance", "line-height", "letter-spacing", "decoration", "orientation", "letter-case", "text-shadow", "fit-text"], dimensions: ["padding", "margin"], border: ["border", "radius", "shadow"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"] }, attributeDefaults: { level: 2 }, unsupported: ["Theme font presets", "Theme-dependent colour presets", "Managed Gutenberg background images", "WordPress-specific fit-to-container metrics"] }),
  quote: makeProfile("quote", "Quote", "core/quote", { block: block("text", ["style", "Style"], ["attribution", "Attribution text"], ["text-alignment", "Text alignment"], ["block-alignment", "Block alignment"]), style: { typography: ["colour", "size", "appearance", "line-height", "letter-spacing", "decoration", "letter-case"], dimensions: ["padding", "margin", "min-height"], border: ["border", "radius", "shadow"] }, studioStyle: ["min-height"], defaults: { typography: ["colour", "size"], border: ["border", "radius"] }, unsupported: ["Multi-paragraph quote editing", "Block gap between nested quote paragraphs"] }),
  list: makeProfile("list", "List", "core/list", { block: block("text", ["list-style", "Bullets or numbers"], ["ordered-style", "Ordered numbering style", "When the list is ordered"], ["start-reverse", "Start value and reverse order", "When the list is ordered"], ["block-alignment", "Block alignment"]), style: { typography: ["colour", "size", "appearance", "line-height", "letter-spacing", "decoration", "letter-case"], dimensions: ["padding", "margin"], border: ["border", "radius"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"] }, unsupported: ["Nested List Item blocks", "Per-item inspector settings", "List indent toolbar", "Rich-text list cells"] }),
  table: makeProfile("table", "Table", "core/table", { block: block("content", ["table-alignment", "Table alignment"], ["column-alignment", "Per-column content alignment"], ["fixed-width", "Fixed or adaptive cell width"], ["header-footer", "Header and footer rows"], ["table-style", "Default or Stripes"], ["caption", "Caption"]), style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["padding", "margin"], border: ["border"] }, defaults: { typography: ["colour", "size"], border: ["border"] }, attributeDefaults: { hasFixedLayout: true }, unsupported: ["Rich-text cells", "Cell links", "Header scope and spanning attributes"] }),
  code: makeProfile("code", "Code", "core/code", { block: block("text", ["block-alignment", "None or Wide alignment"]), style: { typography: ["colour", "size", "family", "appearance", "line-height"], dimensions: ["padding", "margin"], border: ["border", "shadow"] }, defaults: { typography: ["colour", "size"], border: ["border"] }, studio: studio("content", ["language", "Language and syntax highlighting"]), unsupported: ["Full block alignment", "Minimum dimensions", "Managed Gutenberg background images"] }),
  image: makeProfile("image", "Image", "core/image", { block: block("media", ["source", "Image source"], ["alternative-text", "Alternative text or decorative state"], ["caption", "Caption"], ["link-destination", "Link destination"], ["image-style", "Default or Rounded"], ["display-dimensions", "Display width and height"], ["aspect-ratio", "Aspect ratio"], ["scale", "Cover or contain"], ["focal-position", "Focal position"], ["block-alignment", "Block alignment"], ["advanced", "Advanced HTML attributes"]), style: { dimensions: ["margin"], border: ["border", "radius", "shadow"] }, unsupported: ["Resolution variants", "Media crop, rotate and flip", "Duotone derivative", "Image file destination without managed media"] }),
  embed: makeProfile("embed", "Embed", "core/embed", { block: block("media", ["url", "Resource URL"], ["caption", "Plain text caption"], ["block-alignment", "Block alignment"], ["advanced", "HTML anchor and classes"]), style: { dimensions: ["margin"] }, studio: studio("content", ["card-title", "Safe resource card title"]), unsupported: ["Fetched provider embed", "Rich-text caption", "Provider-specific transforms"] }),
  divider: makeProfile("divider", "Divider", "core/separator", { block: block("layout", ["divider-style", "Default, wide or dots style"], ["block-alignment", "Block alignment"], ["margin", "Margin"], ["advanced", "Advanced HTML attributes"]), studio: studio("layout", ["element", "HTML element (hr or div)"], ["colour", "Studio divider colour; Gutenberg uses background colour and gradient"]), unsupported: ["Gutenberg background colour and gradient are not exposed by the current separator renderer", "Theme-dependent alignment presets"] }),
  footnotes: makeProfile("footnotes", "Footnotes", "core/footnotes (system block; inserter:false)", { block: [], style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["padding", "margin"], border: ["border", "radius", "shadow"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"], elements: ["link-colour"] }, unsupported: ["Inline note creation from the specimen inspector", "Gutenberg inline-reference storage", "Managed Gutenberg background images"] }),
  button: makeProfile("button", "Button", "core/buttons → core/button", { block: block("links", ["label", "Button label"], ["url", "Link destination"], ["new-tab", "Open in a new tab"], ["appearance", "Fill or Outline appearance"], ["width", "25, 50, 75 or 100% width"], ["text-alignment", "Text alignment"], ["title-rel", "Title and rel attributes"]), style: { typography: ["colour", "size", "appearance", "line-height", "letter-case"], dimensions: ["padding"], border: ["border", "radius", "shadow"] }, defaults: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] }, unsupported: ["Nested Buttons container", "Per-state hover, focus and active styles"] }),
  field: makeProfile("field", "Field", "Studio-specific", { block: [], studio: studio("content", ["label", "Field label"], ["control", "Text or select control"], ["value", "Example value"], ["options", "Select options", "When the control is a select"]), unsupported: ["No exact Gutenberg core counterpart"] }),
  spacer: makeProfile("spacer", "Spacer", "core/spacer", { block: block("dimensions", ["height", "Height and unit"], ["margin", "Margin"], ["advanced", "HTML anchor and classes"]), studio: studio("dimensions", ["width", "Width and unit; Gutenberg shows width only in horizontal layouts"]), attributeDefaults: { height: "100px" }, unsupported: ["Parent-orientation dependent width/height switching", "Flex-child fill and drag handle", "Percent units"] }),
  "document-title": makeProfile("document-title", "Document Title", "core/post-title", { block: [...block("text", ["text-alignment", "Text alignment"], ["level", "Heading level"], ["block-alignment", "Block alignment"]), ...block("links", ["link", "Post link, new tab and rel"])], style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["padding", "margin"], border: ["border", "radius", "shadow"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"], border: ["border", "radius"], elements: ["link-colour"] }, attributeDefaults: { level: 2 }, unsupported: ["Document title text is owned by document metadata", "Theme font presets", "Managed Gutenberg background images"] }),
  "document-subtitle": makeProfile("document-subtitle", "Document Subtitle", "Studio-specific", { block: [], studio: studio("text", ["text-alignment", "Text alignment"]), style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["margin"] }, styleSource: "studio", defaults: { typography: ["colour", "size"] }, sharedStyleInspector: true, unsupported: ["No exact Gutenberg core counterpart"] }),
  "cover-image": makeProfile("cover-image", "Cover Image", "core/post-featured-image", { block: block("media", ["block-alignment", "Block alignment"], ["link", "Post link, new tab and rel"], ["display-dimensions", "Display width and height"], ["aspect-ratio", "Aspect ratio"], ["scale", "Cover, Contain or Fill"]), studio: studio("media", ["text-alignment", "Alignment"], ["focal-position", "Studio focal position", "When a non-original aspect ratio is selected with Cover scaling"]), style: { dimensions: ["padding", "margin"], border: ["border", "radius", "shadow"] }, defaults: { dimensions: ["padding", "margin"], border: ["border", "radius"] }, attributeDefaults: { scale: "cover" }, sharedStyleInspector: true, unsupported: ["Size variants", "First-image fallback", "Overlay and duotone", "Not the content-bearing Cover block", "No Gutenberg focal-position attribute or control"] }),
  "reading-time": makeProfile("reading-time", "Reading Time", "Studio-specific", { block: [], studio: studio("text", ["alignment", "Alignment"], ["prefix", "Prefix"], ["presentation", "Badge or plain text"]), style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["margin"] }, styleSource: "studio", defaults: { typography: ["colour", "size"] }, sharedStyleInspector: true, unsupported: ["No exact Gutenberg core counterpart"] }),
  "post-author": makeProfile("post-author", "Post Author", "core/post-author (legacy system block; inserter:false)", { block: block("metadata", ["alignment", "Alignment"]), studio: studio("metadata", ["prefix", "Prefix"], ["avatar", "Initials avatar"]), style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["padding", "margin"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"], elements: ["link-colour"] }, unsupported: ["Gutenberg avatar size, biography and author-link options", "Current Gutenberg uses separate author sub-blocks", "Profile image"] }),
  "post-date": makeProfile("post-date", "Post Date", "core/post-date", { block: block("metadata", ["format", "Date format"], ["link", "Post link"], ["alignment", "Alignment"]), studio: studio("metadata", ["show-icon", "Clock icon"]), style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["padding", "margin"], border: ["border", "radius"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"], border: ["border", "radius"], elements: ["link-colour"] }, unsupported: ["Publication date is owned by document metadata"] }),
  "social-icons": makeProfile("social-icons", "Social Icons", "core/social-links", { block: block("content", ["children", "LinkedIn and TikTok children"], ["style", "Default, Logos Only or Pill Shape"], ["justification", "Justification"], ["orientation", "Orientation"], ["wrap", "Allow wrapping"], ["icon-size", "Small, Normal, Large or Huge"], ["labels", "Text labels"], ["new-tab", "Open links in a new tab"], ["gap", "Shared gap"]), studio: studio("layout", ["axis-gaps", "Separate horizontal and vertical gaps"]), style: { typography: ["colour"], dimensions: ["margin"], border: ["border", "radius"] }, defaults: { typography: ["colour"], dimensions: ["margin"], border: ["border", "radius"] }, unsupported: ["Other social networks", "Studio keeps separate horizontal and vertical gaps"] }),
  "social-linkedin": makeProfile("social-linkedin", "LinkedIn", "core/social-link (parent restricted)", { block: block("links", ["profile-url", "Profile URL"], ["label", "Text label"], ["rel", "Link rel"]), studio: [
    { ...makeSpecificControl("advanced", "Studio HTML anchor and classes", "advanced", "studio"), fields: ["visualStyle.anchor", "visualStyle.className"], resetFields: ["visualStyle.anchor", "visualStyle.className"] },
  ], unsupported: ["Other social networks", "Gutenberg URL toolbar interaction"], nesting: "Gutenberg requires a Social Links parent; Studio also permits a standalone widget."}),
  "social-tiktok": makeProfile("social-tiktok", "TikTok", "core/social-link (parent restricted)", { block: block("links", ["profile-url", "Profile URL"], ["label", "Text label"], ["rel", "Link rel"]), studio: [
    { ...makeSpecificControl("advanced", "Studio HTML anchor and classes", "advanced", "studio"), fields: ["visualStyle.anchor", "visualStyle.className"], resetFields: ["visualStyle.anchor", "visualStyle.className"] },
  ], unsupported: ["Other social networks", "Gutenberg URL toolbar interaction"], nesting: "Gutenberg requires a Social Links parent; Studio also permits a standalone widget."}),
  section: makeProfile("section", "Section", "Studio-specific semantic Group", { block: block("layout", ["layout", "Arrangement"], ["alignment", "Horizontal and vertical alignment"], ["gaps", "Horizontal and vertical gaps"], ["padding", "Horizontal and vertical padding"], ["content-width", "Content width"], ["columns", "Column count", "When the layout is Columns"], ["grid", "Grid columns and minimum width", "When the layout is Grid"]), studio: studio("metadata", ["role", "Site role and source"]), style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["padding", "min-height", "min-width"], border: ["border", "radius", "shadow"] }, studioStyle: ["min-width"], defaults: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] }, unsupported: ["Per-instance Additional CSS", "Allowed-block and template-lock controls"], nesting: "Contains child blocks."}),
  group: makeProfile("group", "Group", "core/group", { block: block("layout", ["layout", "Arrangement"], ["sticky", "Sticky positioning", "For a root group"], ["alignment", "Horizontal and vertical alignment"], ["gaps", "Horizontal and vertical gaps"], ["padding", "Horizontal and vertical padding"], ["content-width", "Content width"], ["columns", "Column count", "When the layout is Columns"], ["grid", "Grid columns and minimum width", "When the layout is Grid"], ["semantic-element", "HTML element and ARIA label"], ["background-image", "Managed background image", "When a local background image is selected"]), studio: studio("layout", ["responsive-stack", "Responsive stacking breakpoint"]), style: { typography: ["colour", "size", "appearance", "line-height", "columns"], dimensions: ["padding", "margin", "min-height", "min-width"], border: ["border", "radius", "shadow"] }, studioStyle: ["min-width"], defaults: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] }, unsupported: ["Per-instance Additional CSS", "Allowed-block and template-lock controls", "Grid column minimum width units", "Theme-dependent background-image presets"], nesting: "Contains child blocks."}),
  columns: makeProfile("columns", "Columns", "core/columns", { block: block("layout", ["column-count", "Add or remove columns"], ["stack-on-mobile", "Stack on mobile"], ["vertical-alignment", "Vertical alignment"], ["outer-alignment", "Outer alignment"], ["advanced", "HTML anchor and classes"]), studio: studio("layout", ["preset", "Column layout presets"], ["gaps", "Horizontal and vertical gaps"], ["content-width", "Inner content width"], ["responsive-stack", "Responsive stacking breakpoint"]), style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["padding", "margin"], border: ["border", "radius", "shadow"] }, defaults: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] }, attributeDefaults: { isStackedOnMobile: true }, unsupported: ["Theme-specific width and style presets", "Per-instance Additional CSS", "Allowed-block and template-lock controls"], nesting: "Contains Column children, each with its own inspector."}),
  column: makeProfile("column", "Column", "core/column", { block: block("layout", ["width", "Column width"], ["vertical-alignment", "Vertical alignment"], ["gap", "Block gap"]), style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["padding"], border: ["border", "radius", "shadow"] }, defaults: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] }, unsupported: ["Theme-specific layout presets", "Gutenberg width CSS units beyond the current percentage control"], nesting: "Nested within Columns; contains child blocks."}),
  component: makeProfile("component", "Component", "Studio-specific integration type", { block: [], studio: studio("content", ["component", "Registered component"], ["data", "Component data"]), unsupported: ["No Gutenberg counterpart", "Active integrations run outside the specimen"], nesting: "Integration-owned content; shown inactive in the library specimen."}),
  "template-content": makeProfile("template-content", "Content", "Studio template content slot", { block: [], studio: studio("content", ["projection", "Current document content projection"]), unsupported: ["Not a ContentBlock; this is a template element", "Projection is supplied by a document at render time"], nesting: "Projects the current document body into a template."}),
};

export function capabilityProfileFor(type: CapabilityBlockType): BlockCapabilityProfile {
  return blockCapabilityProfiles[type];
}
