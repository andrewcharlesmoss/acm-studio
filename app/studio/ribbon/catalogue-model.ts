import type { IconName } from "@acm/icons";

export type ComponentName = "Ribbon" | "RibbonTabs" | "RibbonPanel" | "RibbonGroup" | "RibbonControls" | "RibbonButton" | "RibbonToggleButton" | "RibbonField";
export type ControlKind = "button" | "toggle" | "text" | "number" | "select" | "range" | "split" | "compound-range";
export type ControlDefinition = {
  id: string; label: string; kind: ControlKind; command: string; icon?: IconName;
  size?: "compact" | "standard" | "large"; initial?: string | number | boolean;
  options?: readonly { value: string; label: string }[]; min?: number; max?: number; step?: number;
  condition?: "handoff" | "linked"; disabled?: "selection" | "pages" | "editable" | "unlocked" | "undo" | "redo" | "loading" | "always";
  states?: readonly string[]; textOnlyReason?: string; iconOnly?: boolean; children?: ControlDefinition[];
  description?: string; iconVariants?: IconName[];
};
export type GroupDefinition = { id: string; label: string; controls: ControlDefinition[] };
export type TabDefinition = { id: string; label: string; groups: GroupDefinition[] };
export type ExampleDefinition = {
  id: "skeleton" | "studio" | "account"; label: string; description: string;
  initialTab: string; brand: boolean; tabs: TabDefinition[]; headerControls?: ControlDefinition[];
};
export type StructureNode = {
  id: string; label: string; component: ComponentName | "Header" | "Content" | "Composition";
  purpose: string; owner: string; selector: string; tab?: string; control?: ControlDefinition; children: StructureNode[];
};
const button = (id: string, label: string, icon: IconName, extra: Partial<ControlDefinition> = {}): ControlDefinition =>
  ({ id, label, icon, kind: "button", command: id, size: "standard", ...extra });
const toggle = (id: string, label: string, icon: IconName, extra: Partial<ControlDefinition> = {}): ControlDefinition =>
  button(id, label, icon, { kind: "toggle", initial: false, ...extra });
const select = (id: string, label: string, options: readonly { value: string; label: string }[], initial = options[0].value): ControlDefinition =>
  ({ id, label, kind: "select", command: id, options, initial, textOnlyReason: "A labelled native selector communicates its value without a decorative icon." });
const options = (...labels: string[]) => labels.map((label) => ({ value: label, label }));
const group = (id: string, label: string, controls: ControlDefinition[]): GroupDefinition => ({ id, label, controls });
export const shapeOptions = [
  { value: "rectangle", label: "Square" }, { value: "roundedRectangle", label: "Rounded Square" },
  { value: "circle", label: "Circle" }, { value: "triangle", label: "Triangle" },
  { value: "triangleDown", label: "Inverted Triangle" }, { value: "diamond", label: "Diamond" },
  { value: "pentagon", label: "Pentagon" }, { value: "hexagon", label: "Hexagon" }, { value: "octagon", label: "Octagon" },
] as const;
export const zoomOptions = Array.from({ length: 491 }, (_, index) => ({ value: String(index + 10), label: (index + 10) + "%" }));

const compoundRange = (id: string, label: string, icon: IconName, min: number, max: number, step: number, initial: number, scope: string): ControlDefinition => ({
  id, label, icon, kind: "compound-range", command: id, min, max, step, initial,
  description: "Product composition: native range input, output, scope toggle and reset. The shared package does not provide a slider primitive.",
  children: [
    toggle(id + ".scope", label + " Scope", "scope.all", { initial: scope === "all", states: ["All", "Selected"], iconVariants: ["scope.selected"] }),
    button(id + ".reset", "Reset " + label, "action.reset", { size: "compact", iconOnly: true }),
  ],
});

export const studioExample: ExampleDefinition = {
  id: "studio", label: "ACM Studio", description: "Design canvas command reference, with synthetic objects and pages.",
  initialTab: "home", brand: true,
  headerControls: [
    button("studio.home", "Back to ACM Studio", "navigation.back", { description: "Header navigation is simulated." }),
    { id: "studio.name", label: "Design Name", kind: "text", command: "studio.name", initial: "Summer Notes", textOnlyReason: "Editable name in the brand slot.", disabled: "unlocked" },
  ],
  tabs: [
    { id: "file", label: "File", groups: [group("studio.designs", "Designs", [button("studio.library", "All Designs", "library.designs", { size: "large" })])] },
    { id: "home", label: "Home", groups: [
      group("studio.history", "History", [button("studio.undo", "Undo", "action.undo", { size: "large", disabled: "undo" }), button("studio.redo", "Redo", "action.redo", { size: "large", disabled: "redo" })]),
      group("studio.pages", "Pages", [toggle("studio.pages.toggle", "Hide Pages", "view.pages", { size: "large", initial: true, states: ["Show Pages", "Hide Pages"], iconVariants: ["view.hide"] })]),
      group("studio.media", "Studio", [
        button("studio.save-media", "Save to Studio Media", "media.save", { disabled: "unlocked" }),
        button("studio.handoff.block", "Insert into Document", "document.insert", { condition: "handoff" }),
        button("studio.handoff.cover", "Use as Cover", "document.cover", { condition: "handoff" }),
      ]),
    ] },
    { id: "insert", label: "Insert", groups: [group("studio.insert", "Insert", [
      toggle("studio.select", "Select", "tool.select", { size: "large", initial: true }),
      button("studio.image", "Image", "insert.image", { size: "large", disabled: "unlocked" }),
      { ...select("studio.shapes", "Shapes", shapeOptions), icon: "insert.shapes", disabled: "unlocked" },
      ...(["arrow", "text", "step", "highlight", "redaction"] as const).map((name) =>
        toggle("studio." + name, ({ arrow: "Arrow", text: "Text", step: "Numbered Step", highlight: "Highlight", redaction: "Redaction" })[name], ("insert." + name) as IconName, { size: "large", disabled: "unlocked" })),
      button("studio.files", "Studio Files", "library.files", { size: "large", disabled: "unlocked" }),
      toggle("studio.border", "Purple Border", "view.selection", { size: "large", states: ["Off", "On"] }),
    ])] },
    { id: "arrange", label: "Arrange", groups: [group("studio.arrange", "Arrange", [
      button("studio.backward", "Send Backward", "arrange.backward", { disabled: "editable" }),
      button("studio.forward", "Bring Forward", "arrange.forward", { disabled: "editable" }),
      button("studio.back", "Send to Back", "arrange.back", { disabled: "editable" }),
      button("studio.front", "Bring to Front", "arrange.front", { disabled: "editable" }),
      button("studio.duplicate", "Duplicate", "action.duplicate", { disabled: "selection" }),
    ])] },
    { id: "view", label: "View", groups: [group("studio.canvas", "Canvas View", [
      button("studio.zoom-out", "Zoom Out", "view.zoom-out"),
      select("studio.zoom", "Zoom", zoomOptions, "100"),
      button("studio.zoom-in", "Zoom In", "view.zoom-in"), button("studio.fit", "Fit Canvas", "view.fit"),
      toggle("studio.all-pages", "All Pages", "view.pages", { states: ["All Pages", "Single Page"], iconVariants: ["view.single"] }),
      toggle("studio.snap", "Snap On", "view.snap", { initial: true, states: ["Snap Off", "Snap On"], iconVariants: ["view.snap-off"] }),
    ])] },
    { id: "export", label: "Export", groups: [
      group("studio.export-settings", "Export Settings", [
        select("studio.format", "Format", options("PNG", "JPEG", "WebP")),
        select("studio.scale", "Scale", options("100%", "200%")),
        select("studio.quality", "Quality", options("High Quality", "Smaller File")),
      ]),
      group("studio.export", "Export", [
        button("studio.export.page", "Export Page", "output.page"),
        button("studio.export.selected", "Export Selected", "output.selected", { disabled: "pages" }),
        button("studio.export.all", "Export All Pages", "output.all"),
        button("studio.backup", "Editable Backup", "output.backup"),
        button("studio.update-media", "Update Linked Media", "media.update", { condition: "linked", disabled: "unlocked" }),
      ]),
    ] },
  ],
};
export const accountExample: ExampleDefinition = {
  id: "account", label: "ACM Account", description: "Control Centre reference with fictitious account rows.",
  initialTab: "view", brand: false, tabs: [
    { id: "file", label: "File", groups: [] }, { id: "home", label: "Home", groups: [] },
    { id: "view", label: "View", groups: [
      group("account.highlighting", "Highlighting", [
        toggle("account.cell", "Cell Selection", "table.cell", { initial: true }),
        toggle("account.highlight", "Rows", "table.rows", { kind: "split", iconVariants: ["table.columns", "table.both"], states: ["Off", "Rows", "Columns", "Rows & Columns"], children: [
          button("account.highlight.menu", "Choose Highlight Mode", "navigation.disclosure", { size: "compact" }),
          button("account.highlight.row", "Rows", "table.rows"),
          button("account.highlight.column", "Columns", "table.columns"),
          button("account.highlight.both", "Rows & Columns", "table.both"),
          button("account.highlight.close", "Close Highlight Menu", "action.close", { size: "compact" }),
        ] }),
      ]),
      group("account.editing", "Editing", [
        button("account.edit", "Edit Cell", "action.edit", { disabled: "editable" }),
        button("account.delete", "Delete Row", "action.delete", { disabled: "editable" }),
        toggle("account.lock", "Unlock Fields", "security.lock", { initial: true, states: ["Lock Fields", "Unlock Fields"], iconVariants: ["security.unlock"] }),
      ]),
      group("account.layout", "Layout", [
        button("account.columns", "Columns", "layout.columns", { children: [button("account.columns.close", "Close Columns", "action.close", { size: "compact" })] }),
        toggle("account.record", "Account Record", "account.record"),
        compoundRange("account.row-height", "Row Height", "layout.row-height", 44, 140, 4, 44, "all"),
        compoundRange("account.column-width", "Column Width", "layout.column-width", 110, 420, 5, 150, "selected"),
      ]),
    ] },
    { id: "data", label: "Data", groups: [
      group("account.search-group", "Search", [{ id: "account.search-input", label: "Search Name, Username or Email", kind: "text", command: "account.search-input", initial: "", textOnlyReason: "Text entry retains its explicit accessible label.", max: 120 }]),
      group("account.filter-group", "Filter", [select("account.status", "Account Status", [
        { value: "", label: "All Statuses" }, { value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }, { value: "pending_deletion", label: "Pending Deletion" }, { value: "deleted", label: "Deleted" },
      ])]),
      group("account.actions", "Actions", [
        button("account.search", "Search", "action.search"),
        button("account.clear", "Clear Search and Filters", "action.clear"),
        button("account.refresh", "Refresh", "action.refresh", { disabled: "loading", states: ["Refresh", "Refreshing…"] }),
      ]),
    ] },
  ],
};
export const skeletonExample: ExampleDefinition = {
  id: "skeleton", label: "Ribbon Skeleton", description: "The eight public components, assembled with native fields.",
  initialTab: "controls", brand: true, tabs: [
    { id: "controls", label: "Controls", groups: [
      group("specimen.buttons", "Buttons", [
        button("specimen.compact", "Compact", "action.undo", { size: "compact" }),
        button("specimen.standard", "Standard", "insert.image"),
        button("specimen.large", "Large", "insert.text", { size: "large" }),
        button("specimen.icon", "Icon Only", "view.zoom-in", { iconOnly: true, size: "compact" }),
      ]),
      group("specimen.states", "States", [
        toggle("specimen.toggle", "Toggle", "security.unlock", { initial: true }),
        button("specimen.active", "Selected", "state.selected", { initial: true }),
        button("specimen.disabled", "Disabled", "action.delete", { disabled: "always" }),
      ]),
    ] },
    { id: "fields", label: "Fields", groups: [
      group("specimen.fields", "Native Fields", [
        { id: "specimen.text", label: "Text", command: "specimen.text", kind: "text", initial: "Example", textOnlyReason: "Native text input." },
        { id: "specimen.number", label: "Number", command: "specimen.number", kind: "number", initial: 24, min: 1, max: 100, step: 1, textOnlyReason: "Native numeric input." },
        select("specimen.select", "Select", options("Small", "Medium", "Large"), "Medium"),
        { id: "specimen.range", label: "Range", command: "specimen.range", kind: "range", initial: 50, min: 0, max: 100, step: 5, textOnlyReason: "Native range inside RibbonField; no dedicated package slider." },
      ]),
    ] },
  ],
};
export const examples = [skeletonExample, studioExample, accountExample];
export function flattenControls(example: ExampleDefinition): ControlDefinition[] {
  const flatten = (items: ControlDefinition[]): ControlDefinition[] => items.flatMap((item) => [item, ...flatten(item.children ?? [])]);
  return flatten([...(example.headerControls ?? []), ...example.tabs.flatMap((tab) => tab.groups.flatMap((item) => item.controls))]);
}
export const commandInventory = examples.flatMap((example) => flattenControls(example).map((control) => ({ ...control, product: example.id })));
export const componentDescriptions: Record<ComponentName, string> = {
  Ribbon: "Accessible container, optional brand/status header, automatic tabs and fixed-height content.",
  RibbonTabs: "The tablist generated by Ribbon; arrow keys and Home/End move focus and selection.",
  RibbonPanel: "A labelled tab panel; inactive panels are hidden and removed from keyboard navigation.",
  RibbonGroup: "A labelled group with shared spacing and a visual separator.",
  RibbonControls: "Container for a related run of controls; layout is supplied by the consumer.",
  RibbonButton: "Native button with compact, standard and large sizing, selected and disabled states.",
  RibbonToggleButton: "A button with an explicit pressed state.",
  RibbonField: "A semantic label wrapping a native input or selector.",
};
export const ribbonTokens = ["panel-height", "tab-height", "control-height", "large-control-height", "border", "surface", "hover", "text", "muted", "accent"].map((name) => "--acm-ribbon-" + name);

export function structureFor(example: ExampleDefinition): StructureNode {
  const node = (id: string, label: string, component: StructureNode["component"], children: StructureNode[] = [], extra: Partial<StructureNode> = {}): StructureNode =>
    ({ id, label, component, purpose: component in componentDescriptions ? componentDescriptions[component as ComponentName] : "Product composition built around the shared Ribbon.", owner: component === "Composition" || component === "Header" ? example.label : "@acm/ribbon", selector: '[data-region="' + id + '"]', children, ...extra });
  const controlNode = (control: ControlDefinition, tab?: string): StructureNode => node(control.id, control.label,
    control.kind === "split" || control.kind === "compound-range" ? "Composition" : control.kind === "toggle" ? "RibbonToggleButton" : control.kind === "button" ? "RibbonButton" : "RibbonField",
    (control.children ?? []).map((child) => controlNode(child, tab)), { control, tab, purpose: control.description ?? control.textOnlyReason ?? "Demonstrate " + control.label.toLowerCase() + " using temporary state." });
  return node(example.id, example.label, "Ribbon", [
    ...(example.brand ? [node(example.id + ".header", "Brand and Status", "Header", (example.headerControls ?? []).map((item) => controlNode(item)), { selector: ".acm-ribbon-header" })] : []),
    node(example.id + ".tabs", "Tabs", "RibbonTabs", [], { selector: ".acm-ribbon-tabs" }),
    node(example.id + ".content", "Content Region", "Content", example.tabs.map((tab) =>
      node(example.id + ".panel." + tab.id, tab.label + " Panel", "RibbonPanel", tab.groups.map((item) =>
        node(item.id, item.label, "RibbonGroup", [node(item.id + ".controls", "Controls", "RibbonControls", item.controls.map((control) => controlNode(control, tab.id)), { tab: tab.id })], { tab: tab.id })),
      { tab: tab.id, ...(!tab.groups.length ? { purpose: "This product panel is currently empty in the recorded source." } : {}) })), { selector: ".acm-ribbon-content" }),
  ]);
}
export function flattenStructure(node: StructureNode): StructureNode[] {
  return [node, ...node.children.flatMap(flattenStructure)];
}
