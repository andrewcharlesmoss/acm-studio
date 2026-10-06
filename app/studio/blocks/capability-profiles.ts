import type { ContentBlock, ParagraphStyle } from "../../content/model";

export type CapabilityBlockType = ContentBlock["type"] | "template-content";
export type InspectorSource = "gutenberg" | "studio";
export type InspectorControlPlacement = "inspector" | "canvas";
export type InspectorSectionId = "text" | "typography" | "background" | "layout" | "dimensions" | "border" | "elements" | "position" | "advanced" | "allowed-blocks" | "media" | "links" | "content" | "metadata";
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
  availability?: "available" | "model-only";
  unavailableReason?: string;
  defaultVisible?: boolean;
  availableWhen?: string;
  /** Describes the controlling field or editor context; it is not a visibility predicate. */
  dependency?: string;
};
export type NestedBlockCapabilityProfile = {
  type: "list-item";
  parentType: "list";
  label: string;
  sections: readonly { id: InspectorSectionId; label: string; source: InspectorSource }[];
  controls: readonly InspectorControlProfile[];
  resetFields: readonly string[];
  unsupported: readonly string[];
  dependencies: readonly { id: string; label: string; href: string; purpose: string }[];
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
  nestedProfiles?: readonly NestedBlockCapabilityProfile[];
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
  "link-colour": { label: "Link", section: "elements", fields: ["linkColor", "linkHoverColor"] },
};
export function retainedLegacyStyleControls(profile: BlockCapabilityProfile, style: ParagraphStyle | undefined): InspectorControlProfile[] {
  if (!style) return [];
  const ownedFields = new Set(profile.controls.flatMap(control => control.fields.map(field => field.split(".").at(-1) ?? field)));
  return (Object.entries(styleControlFields) as Array<[StyleControlId, (typeof styleControlFields)[StyleControlId]]>)
    .filter(([id]) => !(profile.type === "paragraph" && id === "shadow"))
    .filter(([, definition]) => definition.fields.some(field => !ownedFields.has(field)) && definition.fields.some(field => style[field] !== undefined && style[field] !== "" && style[field] !== false))
    .map(([id]) => ({ ...makeStyleControl(id, "studio"), availableWhen: "Retained saved value; surfaced for editing and reset." }));
}
const makeStyleControl = (id: StyleControlId, source: InspectorSource = "gutenberg", availableWhen?: string): InspectorControlProfile => {
  const definition = styleControlFields[id];
  return { id, label: definition.label, source, section: definition.section, fields: definition.fields, resetFields: definition.fields, ...(availableWhen ? { availableWhen } : {}) };
};
const makeSpecificControl = (id: string, label: string, section: InspectorSectionId, source: InspectorSource = "gutenberg", availableWhen?: string, dependency?: string, placement: InspectorControlPlacement = "inspector"): InspectorControlProfile => ({ id, label, source, placement, section, fields: [], resetFields: [], ...(availableWhen ? { availableWhen } : {}), ...(dependency ? { dependency } : {}) });

const controlFieldsByBlock: Partial<Record<CapabilityBlockType, Record<string, readonly string[]>>> = {
  heading: { level: ["level"], "text-alignment": ["align"], "block-alignment": ["blockAlign"], advanced: ["visualStyle.anchor", "visualStyle.className", "visualStyle.additionalCss"] },
  quote: { attribution: ["attribution"], "text-alignment": ["align"], style: ["quoteStyle"], "block-alignment": ["blockAlign"] },
  list: { "list-style": ["style"], "ordered-style": ["marker"], "start-reverse": ["start", "reversed"], "block-alignment": ["blockAlign"] },
  table: { "table-alignment": ["blockAlign"], "column-alignment": ["columnAlignments"], "fixed-width": ["fixedWidth"], "header-footer": ["hasHeader", "hasFooter", "headerRowCount", "footerRowCount"], caption: ["caption"], "table-style": ["tableStyle"] },
  code: { "block-alignment": ["blockAlign"], language: ["language"] },
  image: { source: ["src", "mediaId"], "alternative-text": ["alt", "decorative"], caption: ["caption"], "link-destination": ["linkDestination", "linkUrl", "opensInNewTab"], "display-dimensions": ["displayWidth", "displayHeight"], "aspect-ratio": ["aspectRatio"], scale: ["scale"], "focal-position": ["focalX", "focalY"], "image-style": ["imageStyle"], "block-alignment": ["blockAlign"], advanced: ["title", "visualStyle.anchor", "visualStyle.className", "visualStyle.additionalCss"] },
  embed: { url: ["url"], caption: ["caption"], "block-alignment": ["blockAlign"], advanced: ["visualStyle.anchor", "visualStyle.className", "visualStyle.additionalCss"], "card-title": ["title"] },
  divider: { "divider-style": ["style"], element: ["tagName"], "block-alignment": ["blockAlign"], background: ["visualStyle.backgroundColor", "visualStyle.backgroundGradient"], margin: ["visualStyle.margin"], advanced: ["visualStyle.anchor", "visualStyle.className", "visualStyle.additionalCss"] },
  footnotes: { "footnote-notes": ["notes"] },
  buttons: { justification: ["justification"], orientation: ["orientation"], wrapping: ["allowWrap"], gap: ["horizontalGap", "verticalGap"] },
  button: { label: ["label"], url: ["url"], "new-tab": ["opensInNewTab"], appearance: ["style"], width: ["width"], "text-alignment": ["align"], "title-rel": ["title", "rel"], advanced: ["visualStyle.anchor", "visualStyle.className", "visualStyle.additionalCss"] },
  field: { label: ["label"], control: ["control"], value: ["value"], options: ["options"] },
  spacer: { size: ["height", "heightUnit", "width", "widthUnit"], margin: ["visualStyle.margin"], advanced: ["visualStyle.anchor", "visualStyle.className", "visualStyle.additionalCss"] },
  "document-title": { level: ["level"], link: ["isLink", "linkTarget", "rel"], "text-alignment": ["align"], "block-alignment": ["blockAlign"] },
  "document-subtitle": { "text-alignment": ["align"] },
  "cover-image": { "block-alignment": ["blockAlign"], "text-alignment": ["align"], link: ["isLink", "linkTarget", "rel"], "display-dimensions": ["displayWidth", "displayHeight"], "aspect-ratio": ["aspectRatio"], scale: ["scale"], "focal-position": ["focalX", "focalY"] },
  "reading-time": { mode: ["mode"], range: ["showRange"], alignment: ["align"], prefix: ["prefix"], presentation: ["presentation"] },
  "post-author": { alignment: ["align"], prefix: ["prefix"], avatar: ["avatar"] },
  "post-date": { "date-source": ["dateSource"], format: ["format", "customFormat"], link: ["isLink"], alignment: ["align"], "show-icon": ["showIcon"] },
  "social-icons": { children: ["children"], style: ["socialStyle"], justification: ["justification"], orientation: ["orientation"], wrap: ["allowWrap"], "icon-size": ["iconSize"], labels: ["showLabels"], "new-tab": ["openInNewTab"], gap: ["horizontalGap", "verticalGap"], "axis-gaps": ["horizontalGap", "verticalGap"] },
  "social-linkedin": { "profile-url": ["url"], label: ["label"], rel: ["rel"], advanced: ["visualStyle.anchor", "visualStyle.className", "visualStyle.additionalCss"] },
  "social-tiktok": { "profile-url": ["url"], label: ["label"], rel: ["rel"], advanced: ["visualStyle.anchor", "visualStyle.className", "visualStyle.additionalCss"] },
  section: { layout: ["layout"], alignment: ["horizontalAlign", "verticalAlign"], gaps: ["gap", "columnGap", "rowGap"], padding: ["paddingX", "paddingY"], "content-width": ["contentWidth"], columns: ["columns"], grid: ["columns", "minColumnWidth"], role: ["role", "data", "source"] },
  group: { wrapping: ["allowWrap"], layout: ["layout"], alignment: ["horizontalAlign", "verticalAlign"], gaps: ["gap", "columnGap", "rowGap"], padding: ["paddingX", "paddingY"], "content-width": ["inheritLayout", "contentSize", "wideSize"], columns: ["columns"], grid: ["columns", "gridMode", "minColumnWidth", "minColumnWidthUnit"], sticky: ["position"], "responsive-stack": ["stackAt"], "semantic-element": ["tagName", "ariaLabel"], "background-image": ["visualStyle.backgroundImageMediaId", "visualStyle.backgroundPositionX", "visualStyle.backgroundPositionY", "visualStyle.backgroundSize", "visualStyle.backgroundRepeat"], "link-colour": ["visualStyle.linkColor"], "allowed-blocks": ["allowedBlocks"] },
  columns: { "outer-alignment": ["blockAlign"], preset: ["children"], "column-count": ["children"], "stack-on-mobile": ["stackAt"], "content-width": ["contentWidth"], "vertical-alignment": ["verticalAlign"], gaps: ["gap", "columnGap", "rowGap"], advanced: ["style.anchor", "style.className", "style.additionalCss"], "responsive-stack": ["stackAt"] },
  column: { "allowed-blocks": ["allowedBlocks"], width: ["width"], "vertical-alignment": ["verticalAlign"], gap: ["rowGap", "gap"] },
  component: { component: ["component"], data: ["data"] },
  "template-content": { "content-width": ["inheritLayout", "contentSize", "wideSize"], gaps: ["gap", "columnGap", "rowGap"] },
};

function addFieldsAndConditions(type: CapabilityBlockType, control: InspectorControlProfile): InspectorControlProfile {
  const advancedStyleFields = type === "columns" || type === "column"
    ? ["style.anchor", "style.className", "style.additionalCss"]
    : type === "group"
      ? ["visualStyle.anchor", "visualStyle.className", "visualStyle.additionalCss", "tagName", "ariaLabel"]
      : ["visualStyle.anchor", "visualStyle.className", "visualStyle.additionalCss"];
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
    "group:sticky": { availableWhen: "When Position is enabled for a root Group.", dependency: "root-group" },
    "group:alignment": { availableWhen: "When the Group uses the Row or Stack layout.", dependency: "layout" },
    "group:wrapping": { availableWhen: "When the layout is Row.", dependency: "layout" },
    "group:content-width": { availableWhen: "When the layout is Group or Stack.", dependency: "layout" },
    "group:gaps": { availableWhen: "Available for Group, Row, Stack and Grid layouts.", dependency: "layout" },
    "field:options": { availableWhen: "When the control type is Select.", dependency: "control" },
    "paragraph:drop-cap": { availableWhen: "When text alignment is left or unset.", dependency: "text-alignment" },
    "social-icons:colour": { availableWhen: "Studio provides its palette; Gutenberg shows this when the theme supports colours or gradients and no style variation is selected.", dependency: "style" },
    "social-icons:background": { availableWhen: "Studio provides its palette; Gutenberg shows this when the theme supports colours or gradients and no style variation is selected. Icon background is omitted in Logos Only mode.", dependency: "style" },
    "quote:managed-background-image": { availableWhen: "When the Studio background-image picker is available.", dependency: "background" },
    "group:background-image": { availableWhen: "When the Studio background-image picker is available.", dependency: "background" },
  };
  const condition = conditional[`${type}:${control.id}`];
  if (type === "columns" && control.id === "preset") return { ...control, fields, resetFields: fields, placement: "canvas", availableWhen: "When this newly inserted Columns block has a pending layout choice.", dependency: "pending-columns-layout" };
  const modelOnly = new Set(["code:language", "group:responsive-stack", "group:columns", "columns:content-width", "columns:responsive-stack", "social-linkedin:advanced", "social-tiktok:advanced", "component:component", "section:min-width"]);
  if (modelOnly.has(`${type}:${control.id}`)) return { ...control, fields, resetFields: fields, availability: "model-only", unavailableReason: "Stored or supported internally; no inspector control is implemented." };

  if (["paragraph", "heading", "list", "quote", "table", "code"].includes(type) && control.source === "gutenberg" && ["family", "orientation", "text-shadow"].includes(control.id)) {
    return { ...control, fields, resetFields: control.resetFields.length ? control.resetFields : fields, enabled: false, availableWhen: "Requires typography configuration absent from the captured Gutenberg theme.", dependency: "theme-typography-configuration" };
  }
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
export function scopedStyleSectionIds(profile: BlockCapabilityProfile, style: ParagraphStyle | undefined, source: InspectorSource | undefined): InspectorSectionId[] {
  const controls = [...profile.controls, ...retainedLegacyStyleControls(profile, style)];
  const available = new Set(controls.filter(control => control.enabled !== false && (source === undefined || control.source === source) && sharedStyleSections.has(control.section) && (control.section !== "background" || control.id === "background") && control.fields.length > 0).map(control => control.section));
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
  { id: "font-family", label: "Font", href: "/studio/ui/controls#font-family", purpose: "Override or inherit the block font." },
  { id: "line-height", label: "Line height", href: "/studio/ui/controls#line-height", purpose: "Set or clear text line height." },
  { id: "box-length", label: "Box dimensions", href: "/studio/ui/controls/box-length", purpose: "Set linked or separate dimensions." },
  { id: "paragraph-length", label: "Paragraph length", href: "/studio/ui/controls/paragraph-length", purpose: "Edit text indent and other compact numeric values." },
  { id: "layout-spacing", label: "Layout spacing", href: "/studio/ui/controls/layout-spacing", purpose: "Shared spacing slider with presets and a custom value." },
  { id: "preset-number", label: "Preset number", href: "/studio/ui/controls/preset-number", purpose: "Choose a common pixel value or enter a custom value." },
  { id: "image-dimensions", label: "Image dimensions", href: "/studio/ui/controls/image-dimensions", purpose: "Set aspect ratio, display dimensions and scale." },
  { id: "focal-position", label: "Focal position", href: "/studio/ui/controls/focal-position", purpose: "Position the crop around its subject." },
  { id: "border-settings", label: "Border settings", href: "/studio/ui/controls/border-settings", purpose: "Set border colour, width, style and radius." },
  { id: "toggle", label: "Toggle setting", href: "/studio/ui/controls/toggle", purpose: "Switch a named setting on or off." },
  { id: "style-variation", label: "Style variation", href: "/studio/ui/controls/style-variation", purpose: "Choose a named block appearance from previews." },
  { id: "inspector-tools", label: "Inspector options and reset", href: "/studio/ui/controls/inspector-tools", purpose: "Show optional controls and reset their owned fields." },
  { id: "inspector-accordion", label: "Accordion section", href: "/studio/ui/controls/inspector-accordion", purpose: "Group settings into collapsible sections." },
] as const;

function dependenciesFor(controls: readonly InspectorControlProfile[], includeInspectorTools: boolean) {
  const availableControls = controls.filter(control => control.enabled !== false && control.availability !== "model-only");
  const ids = new Set(availableControls.map(control => control.id));
  const fields = new Set(availableControls.flatMap(control => control.fields));
  const required = new Set<string>(["inspector-accordion"]);
  if (ids.has("colour") || ids.has("link-colour") || ids.has("colour")) required.add("colour-picker");
  if (ids.has("background")) required.add("background-selection");
  if (ids.has("size")) { required.add("custom-font-size"); required.add("font-size-appearance"); }
  if (ids.has("family")) required.add("font-family");
  if (ids.has("line-height")) required.add("line-height");
  if (["padding", "margin", "border", "radius"].some(id => ids.has(id))) required.add("box-length");
  if (ids.has("line-indent") || ids.has("paragraph-length")) required.add("paragraph-length");
  if (["grid", "width", "height", "preset"].some(id => ids.has(id))) required.add("preset-number");
  if (["gaps", "gap", "axis-gaps"].some(id => ids.has(id))) required.add("layout-spacing");
  if (fields.has("contentSize") || fields.has("wideSize")) required.add("paragraph-length");
  if (ids.has("display-dimensions") || ids.has("aspect-ratio")) required.add("image-dimensions");
  if (ids.has("focal-position")) required.add("focal-position");
  if (["borderColor", "borderStyle", "borderWidth"].some(field => fields.has(field))) required.add("border-settings");
  if (fields.has("backgroundRepeat") || ["drop-cap", "fit-text", "start-reverse", "fixed-width", "header-footer"].some(id => ids.has(id))) required.add("toggle");
  if (["quoteStyle", "tableStyle"].some(field => fields.has(field))) required.add("style-variation");
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
  ...(["colour", "size"] as StyleControlId[]).map(id => makeStyleControl(id)),
  { ...makeStyleControl("family"), label: "Font" },
  ...(["appearance", "line-height", "letter-spacing", "line-indent", "columns", "decoration", "letter-case", "drop-cap", "fit-text"] as StyleControlId[]).map(id => makeStyleControl(id)),
  { ...makeStyleControl("orientation"), enabled: false, availableWhen: "Gutenberg writing mode is enabled in editor settings; not enabled in Andrew's current reference.", dependency: "writing-mode-setting" },
  { ...makeSpecificControl("background", "Background colour or gradient", "background"), fields: ["backgroundColor", "backgroundGradient"], resetFields: ["backgroundColor", "backgroundGradient"] },
  makeStyleControl("padding"), makeStyleControl("margin"), makeStyleControl("min-height", "studio"), makeStyleControl("min-width", "studio"),
  makeStyleControl("border"), makeStyleControl("radius"), makeStyleControl("link-colour"),
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
  exposeBackgroundControl?: boolean;
  nestedProfiles?: readonly NestedBlockCapabilityProfile[];
}): BlockCapabilityProfile {
  const style = options.style ?? {};
  const generic = [
    ...[...(style.typography ?? []), ...(style.dimensions ?? []), ...(style.border ?? []), ...(style.elements ?? [])].map(id => makeStyleControl(id, options.studioStyle?.includes(id) ? "studio" : options.styleSource)),
  ];
  const sharedStyleInspector = options.sharedStyleInspector ?? ["heading", "quote", "list", "table", "code", "button", "buttons", "footnotes", "document-title", "document-subtitle", "reading-time", "post-author", "post-date", "social-icons", "group", "section", "columns", "column"].includes(type);
  const backgroundSource = options.background === false ? undefined : options.background ?? options.styleSource ?? "gutenberg";
  const backgroundControl = (sharedStyleInspector || options.exposeBackgroundControl) && backgroundSource ? [{ ...makeSpecificControl("background", "Background colour or gradient", "background", backgroundSource), fields: ["backgroundColor", "backgroundGradient", ...(["heading", "quote", "code", "group", "document-title", "template-content"].includes(type) ? ["backgroundImageMediaId", "backgroundSize", "backgroundRepeat", "backgroundFixedSize", "backgroundPositionX", "backgroundPositionY"] : [])], resetFields: ["backgroundColor", "backgroundGradient", ...(["heading", "quote", "code", "group", "document-title", "template-content"].includes(type) ? ["backgroundImageMediaId", "backgroundSize", "backgroundRepeat", "backgroundFixedSize", "backgroundPositionX", "backgroundPositionY"] : [])] }] : [];
  const blockControls = options.block.filter(control => control.id !== "advanced" && control.section !== "advanced");
  const trailingAdvancedControls = options.block.filter(control => control.id !== "advanced" && control.section === "advanced");
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
    ...trailingAdvancedControls,
  ].map(control => addFieldsAndConditions(type, control));
  const inspectorControls = controls.filter(control => control.placement !== "canvas");
  const sectionIds = [...new Set(inspectorControls.map(control => control.section))];
  const labels: Record<InspectorSectionId, string> = { text: "Text", typography: "Typography", background: "Background", layout: type === "divider" ? "Styles" : "Layout", dimensions: "Dimensions", border: "Border", elements: "Elements", position: "Position", advanced: "Advanced", "allowed-blocks": "Allowed Blocks", media: "Media", links: "Links", content: "Content", metadata: "Metadata" };
  return {
    type, label, mapping, sections: sectionIds.map(id => ({ id, label: labels[id], source: inspectorControls.find(control => control.section === id)?.source ?? "gutenberg" })),
    inventorySections: sectionIds.map(id => ({ id, label: labels[id], source: inspectorControls.find(control => control.section === id)?.source ?? "gutenberg", fields: [] })),
    controls,
    transforms: [],
    defaults: defaults(options.defaults?.typography, options.defaults?.dimensions, options.defaults?.border, options.defaults?.elements),
    attributeDefaults: options.attributeDefaults ?? {},
    resetFields: [...new Set(controls.flatMap(control => control.resetFields))],
    dependencies: [...dependenciesFor(controls, sharedStyleInspector || type === "embed"), ...(type === "heading" ? [{ id: "heading-level", label: "Heading level", href: "/studio/ui/controls/heading-level", purpose: "Choose H1–H6 in the block summary." }] : [])],
    unsupported: options.unsupported ?? [],
    sharedStyleInspector,
    ...(options.nestedProfiles?.length ? { nestedProfiles: options.nestedProfiles } : {}),
    nesting: options.nesting ?? "Leaf block.", context: options.context ?? "No additional block context.",
  };
}

const block = (section: InspectorSectionId, ...controls: Array<[string, string, string?]>) => controls.map(([id, label, condition]) => makeSpecificControl(id, label, id === "advanced" ? "advanced" : section, "gutenberg", condition, undefined, ["block-alignment", "outer-alignment", "table-alignment", "column-alignment", "children"].includes(id) ? "canvas" : "inspector"));
const studio = (section: InspectorSectionId, ...controls: Array<[string, string, string?]>) => controls.map(([id, label, condition]) => makeSpecificControl(id, label, section, "studio", condition));
const advancedBlockTypes = new Set<CapabilityBlockType>(["heading", "quote", "list", "table", "code", "image", "embed", "button", "divider", "spacer", "group", "section", "columns", "column", "footnotes", "social-icons", "social-linkedin", "social-tiktok", "document-title", "cover-image", "post-date", "post-author"]);

const listItemControls: InspectorControlProfile[] = [
  { ...makeSpecificControl("background", "Background", "background"), fields: ["backgroundColor", "backgroundGradient"], resetFields: ["backgroundColor", "backgroundGradient"] },
  ...(["colour", "size", "family", "appearance", "line-height", "letter-spacing", "decoration", "letter-case", "padding", "margin", "border", "radius", "link-colour"] as StyleControlId[]).map(id => makeStyleControl(id, id === "colour" ? "studio" : "gutenberg")),
  { ...makeSpecificControl("advanced", "HTML anchor", "advanced"), fields: ["anchor"], resetFields: ["anchor"] },
  { ...makeSpecificControl("advanced-css", "Additional CSS classes and declarations", "advanced", "studio"), fields: ["className", "additionalCss"], resetFields: ["className", "additionalCss"] },
];

export const listItemCapabilityProfile: NestedBlockCapabilityProfile = {
  type: "list-item",
  parentType: "list",
  label: "List Item",
  sections: [
    { id: "typography", label: "Typography", source: "gutenberg" },
    { id: "background", label: "Background", source: "gutenberg" },
    { id: "dimensions", label: "Dimensions", source: "gutenberg" },
    { id: "border", label: "Border", source: "gutenberg" },
    { id: "elements", label: "Elements", source: "gutenberg" },
    { id: "advanced", label: "Advanced", source: "gutenberg" },
  ],
  controls: listItemControls,
  resetFields: Array.from(new Set(listItemControls.flatMap(control => control.resetFields))),
  unsupported: ["Footnote and inline-image insertion across multiple List Items"],
  dependencies: dependenciesFor(listItemControls, true),
};

export const listItemSupportedStyleFields = Array.from(new Set(
  listItemCapabilityProfile.controls.flatMap(control => control.fields),
));

export const blockCapabilityProfiles: Record<CapabilityBlockType, BlockCapabilityProfile> = {
  paragraph: paragraphInspectorProfile,
  heading: makeProfile("heading", "Heading", "core/heading", { block: [...block("content", ["level", "Level"]), ...block("text", ["text-alignment", "Text alignment"], ["block-alignment", "Block alignment"]).map(control => ({ ...control, placement: "canvas" as const }))], style: { typography: ["colour", "size", "family", "appearance", "line-height", "letter-spacing", "decoration", "orientation", "letter-case", "text-shadow", "fit-text"], dimensions: ["padding", "margin"], border: ["border", "radius", "shadow"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"] }, attributeDefaults: { level: 2 }, unsupported: ["Theme font presets", "Theme-dependent colour presets", "WordPress-specific fit-to-container metrics"] }),
  quote: makeProfile("quote", "Quote", "core/quote", { block: block("text", ["style", "Style"], ["attribution", "Attribution text"], ["text-alignment", "Text alignment"], ["block-alignment", "Block alignment"]), style: { typography: ["colour", "size", "family", "appearance", "line-height", "letter-spacing", "decoration", "letter-case"], dimensions: ["padding", "margin", "min-height"], border: ["border", "radius", "shadow"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"], dimensions: ["padding", "margin"], border: ["border", "radius"] }, unsupported: ["Block gap between nested quote paragraphs", "Heading colour Elements", "Allowed Blocks for nested quote children"] }),
  list: makeProfile("list", "List", "core/list", { block: block("text", ["list-style", "Bullets or numbers"], ["ordered-style", "Ordered numbering style", "When the list is ordered"], ["start-reverse", "Start value and reverse order", "When the list is ordered"], ["block-alignment", "Block alignment"]), style: { typography: ["colour", "size", "family", "appearance", "line-height", "letter-spacing", "decoration", "letter-case"], dimensions: ["padding", "margin"], border: ["border", "radius"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"] }, nestedProfiles: [listItemCapabilityProfile], unsupported: ["Footnote and inline-image insertion across multiple List Items"] }),
  table: makeProfile("table", "Table", "core/table", { block: block("content", ["table-alignment", "Table alignment"], ["column-alignment", "Per-column content alignment"], ["fixed-width", "Fixed or adaptive cell width"], ["header-footer", "Header and footer rows"], ["table-style", "Default or Stripes"], ["caption", "Caption"]), style: { typography: ["colour", "size", "family", "appearance", "line-height", "letter-spacing", "decoration", "letter-case"], dimensions: ["padding", "margin"], border: ["border"] }, defaults: { typography: ["colour", "size"], border: ["border"] }, attributeDefaults: { hasFixedLayout: true }, unsupported: ["Cell spanning attributes", "Direct inspector editing of cell tag and header scope"] }),
  code: makeProfile("code", "Code", "core/code", { block: block("text", ["block-alignment", "None or Wide alignment"]), style: { typography: ["colour", "size", "family", "appearance", "line-height", "letter-spacing", "decoration", "letter-case"], dimensions: ["padding", "margin"], border: ["border", "radius", "shadow"] }, defaults: { typography: ["colour", "size"], border: ["border"] }, studio: studio("content", ["language", "Language and syntax highlighting"]), unsupported: ["Full block alignment", "Minimum dimensions"] }),
  image: makeProfile("image", "Image", "core/image", { block: block("media", ["source", "Image source"], ["alternative-text", "Alternative text or decorative state"], ["caption", "Caption"], ["link-destination", "Link destination"], ["image-style", "Default or Rounded"], ["display-dimensions", "Display width and height"], ["aspect-ratio", "Aspect ratio"], ["scale", "Cover or contain"], ["focal-position", "Focal position"], ["block-alignment", "Block alignment"], ["advanced", "Advanced HTML attributes"]), style: { dimensions: ["margin"], border: ["border", "radius", "shadow"] }, unsupported: ["Resolution variants", "Media crop, rotate and flip", "Duotone derivative", "Image file destination without managed media"] }),
  embed: makeProfile("embed", "Embed", "core/embed", { block: block("media", ["url", "Resource URL"], ["caption", "Rich-text caption"], ["block-alignment", "Block alignment"], ["advanced", "HTML anchor and classes"]).map(control => control.id === "advanced" ? control : { ...control, placement: "canvas" as const }), style: { dimensions: ["margin"] }, defaults: { dimensions: ["margin"] }, studio: studio("content", ["card-title", "Accessible player title"]).map(control => ({ ...control, placement: "canvas" as const })), unsupported: ["Generic oEmbed and unsupported providers", "Provider-specific transforms"] }),
  divider: makeProfile("divider", "Separator", "core/separator", { block: [...block("layout", ["divider-style", "Default, wide or dots style"], ["block-alignment", "Block alignment"], ["advanced", "Advanced HTML attributes"]), ...block("advanced", ["element", "HTML element (hr or div)"])], style: { dimensions: ["margin"] }, exposeBackgroundControl: true, unsupported: ["Theme-dependent alignment presets"] }),
  footnotes: makeProfile("footnotes", "Footnotes", "core/footnotes (system block; inserter:false)", { block: [], style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["padding", "margin"], border: ["border", "radius", "shadow"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"], elements: ["link-colour"] }, unsupported: ["Inline note creation from the specimen inspector", "Gutenberg inline-reference storage", "Managed Gutenberg background images"] }),
  buttons: makeProfile("buttons", "Buttons", "core/buttons", { block: block("layout", ["justification", "Justification"], ["orientation", "Orientation"], ["wrapping", "Allow wrapping"], ["gap", "Button spacing"]), style: { typography: ["colour", "size", "appearance"], dimensions: ["padding", "margin"], border: ["border", "radius"] }, defaults: { typography: ["size"], dimensions: [], border: ["border", "radius"] } }),
  button: makeProfile("button", "Button", "core/button", { block: [...block("links", ["label", "Button label"], ["url", "Link destination"], ["new-tab", "Open in a new tab"], ["appearance", "Fill or Outline appearance"], ["text-alignment", "Text alignment"], ["title-rel", "Title and rel attributes"]), ...block("dimensions", ["width", "Button width"])], style: { typography: ["colour", "size", "appearance", "line-height", "letter-case", "letter-spacing", "decoration"], dimensions: ["padding", "margin"], border: ["border", "radius", "shadow"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"], dimensions: ["padding", "width"], border: ["border", "radius"] }, unsupported: ["HTML element selection because Button has no action contract for a native button element"] }),
  field: makeProfile("field", "Field", "Studio-specific", { block: [], studio: studio("content", ["label", "Field label"], ["control", "Text or select control"], ["value", "Example value"], ["options", "Select options", "When the control is a select"]), unsupported: ["No exact Gutenberg core counterpart"] }),
  spacer: makeProfile("spacer", "Spacer", "core/spacer", { block: block("dimensions", ["size", "Height or width according to parent orientation"], ["margin", "Margin"], ["advanced", "HTML anchor and classes"]), attributeDefaults: { height: "100px" }, unsupported: ["Flex-child fill and drag handle"], nesting: "The immediate parent Group or Section determines the axis: Row exposes Width; other layouts expose Height. The axis follows the parent layout setting when responsive styles stack a Row." }),
  "document-title": makeProfile("document-title", "Title", "core/post-title", { block: [...block("text", ["text-alignment", "Text alignment"], ["level", "Heading or Paragraph level"], ["block-alignment", "Block alignment"]), ...block("links", ["link", "Post link, new tab and rel"])], style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["padding", "margin"], border: ["border", "radius", "shadow"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"], border: ["border", "radius"], elements: ["link-colour"] }, attributeDefaults: { level: 2 }, unsupported: ["Document title text is owned by document metadata", "Theme font presets"] }),
  "document-subtitle": makeProfile("document-subtitle", "Document Subtitle", "Studio-specific", { block: [], studio: studio("text", ["text-alignment", "Text alignment"]), style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["margin"] }, styleSource: "studio", defaults: { typography: ["colour", "size"] }, sharedStyleInspector: true, unsupported: ["No exact Gutenberg core counterpart"] }),
  "cover-image": makeProfile("cover-image", "Featured Image", "core/post-featured-image", { block: block("media", ["block-alignment", "Block alignment"], ["link", "Post link, new tab and rel"], ["display-dimensions", "Display width and height"], ["aspect-ratio", "Aspect ratio"], ["scale", "Cover, Contain or Fill"]), studio: studio("media", ["text-alignment", "Alignment"], ["focal-position", "Studio focal position", "When a non-original aspect ratio is selected with Cover scaling"]), style: { dimensions: ["padding", "margin"], border: ["border", "radius", "shadow"] }, defaults: { dimensions: ["padding", "margin"], border: ["border", "radius"] }, attributeDefaults: { scale: "cover" }, sharedStyleInspector: true, unsupported: ["Size variants", "First-image fallback", "Overlay and duotone", "Not the content-bearing Cover block", "No Gutenberg focal-position attribute or control"] }),
  "reading-time": makeProfile("reading-time", "Reading Time", "core/post-time-to-read (ACM estimator adaptation)", { block: block("text", ["mode", "Reading time or word count"], ["range", "Show time range"], ["alignment", "Alignment"]), studio: studio("text", ["prefix", "Prefix"], ["presentation", "Badge or plain text"]), style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["margin"] }, defaults: { typography: ["colour", "size"] }, sharedStyleInspector: true, unsupported: ["Uses ACM word counting and a 220 words/minute default; range uses 200–250 words/minute. No exact upstream estimator parity is claimed."] }),
  "post-author": makeProfile("post-author", "Author", "core/post-author (legacy system block; inserter:false)", { block: block("metadata", ["alignment", "Alignment"]), studio: studio("metadata", ["prefix", "Prefix"], ["avatar", "Initials avatar"]), style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["padding", "margin"] }, defaults: { typography: ["colour", "size"] }, unsupported: ["Gutenberg avatar size, biography and author-link options", "Current Gutenberg uses separate author sub-blocks", "Profile image"] }),
  "post-date": makeProfile("post-date", "Date", "core/post-date", { block: block("metadata", ["format", "Date format"], ["date-source", "Published or modified date"], ["link", "Post link"], ["alignment", "Alignment"]), studio: studio("metadata", ["show-icon", "Clock icon"]), style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["padding", "margin"], border: ["border", "radius"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"], border: ["border", "radius"], elements: ["link-colour"] }, unsupported: ["Publication date is owned by document metadata", "Relative date format", "Custom formats support a bounded token subset; legacy publication snapshots have no confirmed modified date"] }),
  "social-icons": makeProfile("social-icons", "Social Icons", "core/social-links", { block: block("content", ["children", "LinkedIn and TikTok children"], ["style", "Default, Logos Only or Pill Shape"], ["justification", "Justification"], ["orientation", "Orientation"], ["wrap", "Allow wrapping"], ["icon-size", "Small, Normal, Large or Huge"], ["labels", "Text labels"], ["new-tab", "Open links in a new tab"], ["axis-gaps", "Separate horizontal and vertical gaps"]), style: { typography: ["colour"], dimensions: ["margin"], border: ["border", "radius"] }, defaults: { typography: ["colour"], dimensions: ["margin"], border: ["border", "radius"] }, unsupported: ["Other social networks"] }),
  "social-linkedin": makeProfile("social-linkedin", "LinkedIn", "core/social-link (parent restricted)", { block: block("links", ["profile-url", "Profile URL"], ["label", "Text label"], ["rel", "Link rel"]), studio: [
    { ...makeSpecificControl("advanced", "Studio HTML anchor and classes", "advanced", "studio"), fields: ["visualStyle.anchor", "visualStyle.className"], resetFields: ["visualStyle.anchor", "visualStyle.className"] },
  ], unsupported: ["Other social networks", "Gutenberg URL toolbar interaction"], nesting: "Gutenberg requires a Social Links parent; Studio also permits a standalone widget."}),
  "social-tiktok": makeProfile("social-tiktok", "TikTok", "core/social-link (parent restricted)", { block: block("links", ["profile-url", "Profile URL"], ["label", "Text label"], ["rel", "Link rel"]), studio: [
    { ...makeSpecificControl("advanced", "Studio HTML anchor and classes", "advanced", "studio"), fields: ["visualStyle.anchor", "visualStyle.className"], resetFields: ["visualStyle.anchor", "visualStyle.className"] },
  ], unsupported: ["Other social networks", "Gutenberg URL toolbar interaction"], nesting: "Gutenberg requires a Social Links parent; Studio also permits a standalone widget."}),
  section: makeProfile("section", "Section", "Studio-specific semantic Group", { block: block("layout", ["layout", "Arrangement"], ["alignment", "Horizontal and vertical alignment"], ["gaps", "Horizontal and vertical gaps"], ["padding", "Horizontal and vertical padding"], ["content-width", "Content width"], ["columns", "Column count", "When the layout is Columns"], ["grid", "Grid columns and minimum width", "When the layout is Grid"]), studio: studio("metadata", ["role", "Site role and source"]), style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["padding", "min-height", "min-width"], border: ["border", "radius", "shadow"] }, studioStyle: ["min-width"], defaults: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] }, unsupported: ["Allowed-block and template-lock controls"], nesting: "Contains child blocks."}),
  group: makeProfile("group", "Group", "core/group", { block: [...block("layout", ["layout", "Group, Row, Stack or Grid layout"], ["alignment", "Justification and alignment"], ["wrapping", "Allow wrapping", "When the layout is Row"], ["content-width", "Inherited or custom content and wide widths", "When the layout is Group or Stack"], ["grid", "Grid columns and minimum width", "When the layout is Grid"]), ...block("dimensions", ["gaps", "Block spacing", "Available for Group, Row, Stack and Grid"], ["padding", "Padding"]), ...block("position", ["sticky", "Sticky positioning", "For a root Group"]), ...block("advanced", ["semantic-element", "HTML element and ARIA label"]), ...block("allowed-blocks", ["allowed-blocks", "Allowed blocks"])], studio: [...studio("layout", ["responsive-stack", "Responsive stacking breakpoint"], ["columns", "Legacy Columns layout"]), ...studio("background", ["background-image", "Managed background image"])], style: { typography: ["colour", "size", "appearance", "line-height", "columns"], dimensions: ["padding", "margin", "min-height", "min-width"], border: ["border", "radius", "shadow"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] }, unsupported: ["Template lock controls", "Flex child Fill, Fit and fixed sizes", "Grid child spans and manual placement", "Theme-dependent background-image presets"], nesting: "Contains child blocks."}),
  columns: makeProfile("columns", "Columns", "core/columns", { block: block("layout", ["column-count", "Add or remove columns"], ["stack-on-mobile", "Stack on mobile"], ["vertical-alignment", "Vertical alignment"], ["gaps", "Horizontal and vertical gaps"], ["outer-alignment", "Outer alignment"], ["advanced", "HTML anchor and classes"]), studio: studio("layout", ["preset", "Column layout presets"], ["content-width", "Inner content width"], ["responsive-stack", "Responsive stacking breakpoint"]), style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["padding", "margin"], border: ["border", "radius", "shadow"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] }, attributeDefaults: { isStackedOnMobile: true }, unsupported: ["Theme-specific width and style presets", "Allowed-block and template-lock controls"], nesting: "Contains Column children, each with its own inspector."}),
  column: makeProfile("column", "Column", "core/column", { block: block("layout", ["width", "Column width"], ["vertical-alignment", "Vertical alignment"], ["gap", "Block gap"], ["allowed-blocks", "Allowed blocks"]), style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["padding"], border: ["border", "radius", "shadow"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] }, unsupported: ["Theme-specific layout presets", "Gutenberg width CSS units beyond the current percentage control"], nesting: "Nested within Columns; contains child blocks."}),
  component: makeProfile("component", "Component", "Studio-specific integration type", { block: [], studio: studio("content", ["component", "Registered component"], ["data", "Component data"]), unsupported: ["No Gutenberg counterpart", "Active integrations run outside the specimen"], nesting: "Integration-owned content; shown inactive in the library specimen."}),
  "template-content": makeProfile("template-content", "Content", "core/post-content (typed template slot)", { block: block("layout", ["content-width", "Inherited or custom content and wide widths"], ["gaps", "Block spacing"], ["advanced", "HTML anchor, classes and Additional CSS"]), style: { typography: ["colour", "size", "appearance", "line-height"], dimensions: ["padding", "margin", "min-height"], border: ["border", "radius", "shadow"], elements: ["link-colour"] }, defaults: { typography: ["colour", "size"], dimensions: ["padding", "margin"], border: ["border", "radius"] }, sharedStyleInspector: true, exposeBackgroundControl: true, unsupported: ["Template element, not a saved document body block", "Uses inherited document context; no Query Loop"], nesting: "Projects the current document body into a styled template slot." }),
};

export function capabilityProfileFor(type: CapabilityBlockType): BlockCapabilityProfile {
  return blockCapabilityProfiles[type];
}

/** List items share the same style editor while retaining their own storage owner. */
export const listItemStyleInspectorProfile: BlockCapabilityProfile = {
  ...blockCapabilityProfiles.list,
  label: "List Item",
  sections: listItemCapabilityProfile.sections,
  controls: listItemControls,
  defaults: { typography: ["colour", "size"], dimensions: [], border: [], elements: [] },
  resetFields: listItemCapabilityProfile.resetFields,
  dependencies: listItemCapabilityProfile.dependencies,
  nestedProfiles: undefined,
};
