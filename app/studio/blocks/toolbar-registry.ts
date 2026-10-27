import type { ContentBlock } from "../../content/model";
import type { IconName } from "@acm/icons";
import type { StudioIconName } from "../studio-icons";

type BlockToolbarIcon = IconName | StudioIconName;

/** A toolbar action is descriptive only. The owning editor supplies its command. */
export type BlockToolbarActionId =
  | "embed-edit-url" | "buttons-layout" | "transform" | "drag" | "move" | "block-alignment" | "list-item-switcher"
  | "list-controls" | "group-layout" | "column-vertical-alignment" | "table-column-alignment" | "table-cell-alignment"
  | "table-structure" | "table-caption" | "image-caption" | "image-link" | "image-replace" | "image-duotone" | "quote-alignment" | "quote-citation"
  | "title-level" | "reading-time-mode" | "date-source" | "text-alignment" | "bold" | "italic" | "link" | "text-formatting"
  | "duplicate" | "delete" | "options" | "clear-selection" | "list-item-actions"
  | "page-link-parent" | "page-link-reorder" | "page-link-edit" | "page-link-add"
  | "page-link-formatting" | "page-link-options";

export type BlockToolbarAvailability =
  | "always"
  | "not-preview"
  | "not-list-item"
  | "standard-block-action"
  | "block-alignable"
  | "list"
  | "group"
  | "column"
  | "table-populated"
  | "table-caption"
  | "quote"
  | "title"
  | "reading-time"
  | "date"
  | "rich-text"
  | "button"
  | "image"
  | "embed"
  | "embed-link"
  | "list-item-selected"
  | "page-link"
  | "page-link-selected"
  | "multiple-selection";

export type BlockToolbarActionDefinition = {
  id: BlockToolbarActionId;
  label: string;
  icon?: BlockToolbarIcon;
  group: string;
  order: number;
  availability: BlockToolbarAvailability;
  fields: readonly string[];
  description?: string;
};

export type BlockToolbarDefinition = {
  blockType: string;
  label: string;
  groups: readonly { id: string; label: string; order: number }[];
  actions: readonly BlockToolbarActionDefinition[];
  /** Existing feature owners provide the command and transaction adapters. */
  commandOwner: "studio-canvas" | "template-navigation-editor";
  referenceNotes?: readonly string[];
};

export type BlockToolbarContext = {
  block: ContentBlock | { type: string };
  previewing?: boolean;
  writable?: boolean;
  selected?: boolean;
  blockAlignable?: boolean;
  hasButtonsParent?: boolean;
  hasListItemSelection?: boolean;
  acrossListItems?: boolean;
  hasValidLink?: boolean;
  hasRows?: boolean;
  citationVisible?: boolean;
  moveLocked?: boolean;
  removeLocked?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  multipleSelection?: boolean;
};

export type ResolvedBlockToolbarAction = BlockToolbarActionDefinition & {
  visible: boolean;
  disabled: boolean;
  disabledReason?: string;
  pressed?: boolean;
};

const groups = [
  { id: "structure", label: "Block and structure", order: 0 },
  { id: "block-style", label: "Block style", order: 1 },
  { id: "content", label: "Content", order: 2 },
  { id: "formatting", label: "Text formatting", order: 3 },
  { id: "actions", label: "Block actions", order: 4 },
] as const;

const action = (
  id: BlockToolbarActionId,
  label: string,
  group: string,
  order: number,
  availability: BlockToolbarAvailability,
  fields: readonly string[] = [],
  icon?: BlockToolbarIcon,
  description?: string,
): BlockToolbarActionDefinition => ({ id, label, group, order, availability, fields, ...(icon ? { icon } : {}), ...(description ? { description } : {}) });

const common = [
  action("transform", "Transform", "structure", 0, "not-list-item", [], "block.default"),
  action("drag", "Drag to reorder", "structure", 1, "not-list-item", [], "arrange.reorder"),
  action("move", "Move block", "structure", 2, "not-list-item", [], "arrange.move-up"),
  action("block-alignment", "Align block", "block-style", 0, "block-alignable", ["blockAlign"], "layout.width-default"),
  action("duplicate", "Duplicate block", "actions", 0, "standard-block-action", [], "action.duplicate"),
  action("delete", "Remove block", "actions", 1, "standard-block-action", [], "action.close"),
  action("options", "More options", "actions", 2, "not-list-item", [], "action.more"),
] as const;

const textFormatting = [
  action("text-alignment", "Align text", "formatting", 0, "rich-text", ["textAlign"], "text.align-left"),
  action("bold", "Bold selected text", "formatting", 1, "rich-text", ["runs[].marks", "labelRuns[].marks"], "text.bold"),
  action("italic", "Italicise selected text", "formatting", 2, "rich-text", ["runs[].marks", "labelRuns[].marks"], "text.italic"),
  action("link", "Add or edit hyperlink", "formatting", 3, "rich-text", ["runs[].marks", "url"], "action.link"),
  action("text-formatting", "More text formatting", "formatting", 4, "rich-text", ["runs[].marks"], "navigation.disclosure"),
] as const;

const definitions: Record<string, BlockToolbarDefinition> = {};
function register(blockType: string, label: string, actions: readonly BlockToolbarActionDefinition[], commandOwner: BlockToolbarDefinition["commandOwner"] = "studio-canvas", referenceNotes?: readonly string[]) {
  definitions[blockType] = { blockType, label, groups, actions, commandOwner, ...(referenceNotes ? { referenceNotes } : {}) };
}

const richTextTypes = new Set(["paragraph", "heading", "button", "list", "embed", "image", "table"]);
const blockTypes = [
  "paragraph", "heading", "quote", "list", "table", "code", "image", "embed", "divider", "spacer",
  "button", "buttons", "group", "section", "columns", "column", "footnotes", "field", "component",
  "document-title", "document-subtitle", "cover-image", "reading-time", "post-author", "post-date",
  "social-icons", "social-linkedin", "social-tiktok", "template-content",
];

for (const blockType of blockTypes) {
  const actions: BlockToolbarActionDefinition[] = [...common];
  if (blockType === "button" || blockType === "buttons") actions.push(action("buttons-layout", "Buttons layout alignment", "block-style", 1, "always", ["justification", "verticalAlign"], "layout.justify-left"));
  if (blockType === "list") actions.push(action("list-controls", "List settings", "block-style", 1, "list", ["style", "marker", "start"], "block.list"));
  if (blockType === "group") actions.push(action("group-layout", "Group layout", "block-style", 1, "group", ["layout", "tagName"], "layout.template"));
  if (blockType === "column") actions.push(action("column-vertical-alignment", "Vertical alignment", "block-style", 1, "column", ["verticalAlign"], "layout.align-middle"));
  if (blockType === "table") actions.push(
    action("table-column-alignment", "Column alignment", "block-style", 1, "table-populated", ["columnAlignments", "columnStyles"], "table.columns"),
    action("table-cell-alignment", "Cell alignment", "block-style", 2, "table-populated", ["cellMetadata.textAlign", "cellMetadata.verticalAlign"], "table.cell"),
    action("table-structure", "Table controls", "content", 0, "table-populated", ["rows", "headerRowCount", "footerRowCount"], "table.both"),
    action("table-caption", "Caption", "content", 1, "table-caption", ["caption"], "text.paragraph"),
  );
  if (blockType === "image") actions.push(
    action("image-link", "Image link settings", "content", 0, "image", ["linkDestination", "linkUrl", "opensInNewTab"], "action.link"),
    action("image-replace", "Replace image", "content", 2, "image", ["src", "mediaId"], "insert.image"),
    action("image-duotone", "Duotone", "content", 1, "image", ["duotone"], "view.styles"),
    action("image-caption", "Caption", "content", 2, "image", ["caption", "captionRuns"], "text.caption"),
  );
  if (blockType === "embed") actions.push(action("embed-edit-url", "Edit URL", "content", 0, "embed", ["url"], "action.edit"));
  if (blockType === "post-date") actions.push(
    action("date-source", "Date variation", "block-style", 1, "date", ["dateSource"], "time.calendar"),
    action("text-alignment", "Align text", "formatting", 0, "date", ["align"], "text.align-left"),
  );
  if (blockType === "reading-time") actions.push(
    action("reading-time-mode", "Time to Read variation", "block-style", 1, "reading-time", ["mode"], "time.clock"),
    action("text-alignment", "Align text", "formatting", 0, "reading-time", ["align"], "text.align-left"),
  );
  if (blockType === "document-title") actions.push(
    action("title-level", "Heading level", "block-style", 1, "title", ["level"], "text.heading-two"),
    action("text-alignment", "Align text", "formatting", 0, "title", ["align"], "text.align-left"),
  );
  if (blockType === "quote") actions.push(
    action("quote-alignment", "Align quote text", "block-style", 1, "quote", ["textAlign"], "text.align-left"),
    action("quote-citation", "Add or remove citation", "content", 0, "quote", ["attribution", "attributionRuns"], "text.verse"),
  );
  if (richTextTypes.has(blockType)) actions.push(...textFormatting);
  if (blockType === "list") actions.push(action("list-item-switcher", "Switch between List and List Item", "structure", 0, "list-item-selected", [], "block.list"), action("list-item-actions", "List Item actions", "actions", 0, "list-item-selected", [], "action.more-vertical"));
  register(blockType, blockType === "template-content" ? "Content" : blockType.replaceAll("-", " ").replace(/\b\w/g, letter => letter.toUpperCase()), actions,
    blockType === "navigation" || blockType === "page-link" ? "template-navigation-editor" : "studio-canvas");
}

register("page-link", "Page link", [
  action("page-link-parent", "Select Navigation", "structure", 0, "page-link-selected", ["TemplateSet.navigation"], "navigation.menu"),
  action("page-link-reorder", "Reorder link", "structure", 1, "page-link-selected", ["TemplateSet.navigation[].order"], "arrange.reorder"),
  action("page-link-edit", "Edit link", "content", 0, "page-link-selected", ["label", "url"], "action.link"),
  action("page-link-add", "Add link", "content", 1, "page-link-selected", ["TemplateSet.navigation[]"], "add"),
  action("bold", "Bold link text", "formatting", 0, "page-link-selected", ["TemplateSet.navigation[].labelStyle"], "text.bold"),
  action("italic", "Italicise link text", "formatting", 1, "page-link-selected", ["TemplateSet.navigation[].labelStyle"], "text.italic"),
  action("page-link-options", "More link options", "actions", 0, "page-link-selected", ["opensInNewTab", "description", "rel", "className"], "action.more"),
], "template-navigation-editor");

register("navigation", "Navigation", [
  action("page-link-parent", "Select Navigation", "structure", 0, "always", ["TemplateSet.navigation"], "navigation.menu"),
  action("page-link-add", "Add link", "content", 0, "always", ["TemplateSet.navigation[]"], "add"),
], "template-navigation-editor");

register("multi-selection", "Selected blocks", [
  action("options", "More selected block options", "actions", 0, "multiple-selection", [], "action.more"),
  action("delete", "Delete selected blocks", "actions", 1, "multiple-selection", [], "action.close"),
  action("clear-selection", "Clear block selection", "actions", 2, "multiple-selection", [], "action.close"),
]);

/** Canonical toolbar metadata keyed by the editor-facing block type. */
export const blockToolbarRegistry: Readonly<Record<string, BlockToolbarDefinition>> = definitions;

export function blockToolbarDefinitionFor(blockType: string): BlockToolbarDefinition | undefined {
  return blockToolbarRegistry[blockType] ?? (["row", "stack", "grid"].includes(blockType) ? blockToolbarRegistry.group : undefined);
}

export function describeToolbarAvailability(rule: BlockToolbarAvailability): string {
  const descriptions: Record<BlockToolbarAvailability, string> = {
    always: "Always available in the toolbar.",
    "not-preview": "Available in Edit, hidden in Preview.",
    "not-list-item": "Available when the List block itself is selected.",
    "standard-block-action": "Available for blocks with standard block actions; hidden for List and Quote.",
    "block-alignable": "Available when that block type supports block alignment.",
    list: "Available on a List block.",
    group: "Available on a Group block.",
    column: "Available on a Column block nested in Columns.",
    "table-populated": "Available when the table has at least one row.",
    "table-caption": "Available when the table has at least one row.",
    quote: "Available on a Quote block.",
    title: "Available on a Title block.",
    "embed": "Available on an Embed block.",
    "reading-time": "Available on a Time to Read block.",
    date: "Available on a Date block.",
    "rich-text": "Available for editable rich text; Embed actions require a valid destination.",
    button: "Available on a Button block.",
    image: "Available on an Image block.",
    "embed-link": "Available when the Embed has a valid destination.",
    "list-item-selected": "Available while a List Item is selected.",
    "page-link": "Available while a Page link is selected in Navigation.",
    "page-link-selected": "Available while a Page link is selected in Navigation.",
    "multiple-selection": "Available while more than one block is selected.",
  };
  return descriptions[rule];
}

function availableWhen(rule: BlockToolbarAvailability, context: BlockToolbarContext): boolean {
  const type = context.block.type;
  switch (rule) {
    case "always": return true;
    case "not-preview": return !context.previewing;
    case "not-list-item": return !context.hasListItemSelection;
    case "standard-block-action": return !context.hasListItemSelection && type !== "list" && type !== "quote";
    case "block-alignable": return !context.previewing && Boolean(context.blockAlignable);
    case "list": return type === "list";
    case "group": return type === "group";
    case "column": return type === "column";
    case "table-populated": return type === "table" && Boolean(context.hasRows);
    case "table-caption": return type === "table" && Boolean(context.hasRows);
    case "quote": return type === "quote";
    case "title": return type === "document-title";
    case "reading-time": return type === "reading-time";
    case "date": return type === "post-date";
    case "rich-text": return !context.previewing && (
      type === "paragraph" || type === "heading" || type === "button" || type === "image"
      || (type === "list" && Boolean(context.hasListItemSelection))
      || (type === "table" && Boolean(context.hasRows))
      || (type === "embed" && Boolean(context.hasValidLink))
    );
    case "button": return type === "button";
    case "image": return type === "image";
    case "embed": return type === "embed";
    case "embed-link": return type === "embed" && Boolean(context.hasValidLink);
    case "list-item-selected": return type === "list" && Boolean(context.hasListItemSelection);
    case "page-link": return type === "page-link";
    case "page-link-selected": return type === "page-link" && Boolean(context.selected);
    case "multiple-selection": return type === "multi-selection" && Boolean(context.multipleSelection);
  }
}

/** Resolve display state only; command owners remain responsible for execution. */
export function resolveBlockToolbar(context: BlockToolbarContext): ResolvedBlockToolbarAction[] {
  const definition = blockToolbarDefinitionFor(context.block.type);
  if (!definition || context.previewing) return [];
  return definition.actions
    .map(item => {
      const visible = availableWhen(item.availability, context) && (item.id !== "buttons-layout" || context.block.type === "buttons" || Boolean(context.hasButtonsParent));
      const locked = item.id === "drag" || item.id === "move" ? Boolean(context.moveLocked)
        : item.id === "delete" ? Boolean(context.removeLocked) : false;
      let disabledReason: string | undefined;
      if (locked) disabledReason = item.id === "delete" ? "This block is locked against removal." : "This block is locked against moving.";
      else if (context.writable === false && ["embed-edit-url", "buttons-layout", "bold", "italic", "link", "text-formatting", "block-alignment", "quote-alignment", "quote-citation", "title-level", "reading-time-mode", "date-source", "text-alignment", "table-column-alignment", "table-cell-alignment", "table-structure", "table-caption", "image-caption", "image-link", "image-replace", "image-duotone", "list-controls", "group-layout", "column-vertical-alignment", "page-link-edit", "page-link-add", "page-link-options", "drag", "move", "duplicate", "delete", "options"].includes(item.id)) disabledReason = "This editor is read-only.";
      else if (context.acrossListItems && ["bold", "italic", "link", "text-formatting"].includes(item.id)) disabledReason = "Select text within one List Item for this action.";
      else if (item.id === "move" && !context.canMoveUp && !context.canMoveDown) disabledReason = "This block has no movable sibling.";
      const disabled = Boolean(disabledReason);
      const label = item.id === "quote-citation" ? context.citationVisible ? "Remove citation" : "Add citation" : item.label;
      return { ...item, label, visible, disabled, ...(disabledReason ? { disabledReason } : {}), ...(item.id === "quote-citation" ? { pressed: Boolean(context.citationVisible) } : {}) };
    })
    .filter(item => item.visible)
    .sort((first, second) => groups.find(group => group.id === first.group)!.order - groups.find(group => group.id === second.group)!.order || first.order - second.order);
}

