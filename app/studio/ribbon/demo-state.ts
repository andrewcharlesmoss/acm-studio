import type { IconName } from "@acm/icons";
import { flattenControls, type ControlDefinition, type ExampleDefinition } from "./catalogue-model.ts";

export type DemoRow = { id: string; name: string; username: string; email: string; status: string };
export type DemoObject = { id: number; label: string; kind: string };
export type DemoState = {
  values: Record<string, string | number | boolean>;
  selected: boolean; locked: boolean; linked: boolean; handoff: boolean; loading: boolean; empty: boolean;
  objects: DemoObject[]; history: DemoObject[][]; future: DemoObject[][]; selectedObjectId: number | null;
  selectedRow: string | null; selectedColumn: string; rows: DemoRow[];
  query: string; filter: string; highlight: "none" | "row" | "column" | "both"; lastHighlight: "row" | "column" | "both";
  rowHeights: Record<string, number>; columnWidths: Record<string, number>;
  allRowHeight: number; allColumnWidth: number; columns: string[];
  message: string; menu: string | null; editing: boolean;
};
export const fixtureColumns = ["name", "username", "email", "status"];
export const fixtureRows: DemoRow[] = [
  { id: "sample-1", name: "Maya Chen", username: "maya.example", email: "maya@example.invalid", status: "active" },
  { id: "sample-2", name: "Sam Okafor", username: "sam.example", email: "sam@example.invalid", status: "suspended" },
  { id: "sample-3", name: "Alex Patel", username: "alex.example", email: "alex@example.invalid", status: "pending_deletion" },
  { id: "sample-4", name: "Robin Silva", username: "robin.example", email: "robin@example.invalid", status: "deleted" },
];
export function initialDemo(example: ExampleDefinition): DemoState {
  return {
    values: Object.fromEntries(flattenControls(example).map((control) => [control.id, control.initial ?? false])),
    selected: true, locked: example.id === "account", linked: false, handoff: false, loading: false, empty: false,
    objects: [{ id: 1, label: "Summer Notes", kind: "text" }, { id: 2, label: "Amber Shape", kind: "rectangle" }],
    history: [], future: [], selectedObjectId: 2, selectedRow: "sample-1", selectedColumn: "name",
    rows: fixtureRows.map((row) => ({ ...row })), query: "", filter: "", highlight: "none", lastHighlight: "row",
    rowHeights: {}, columnWidths: {}, allRowHeight: 44, allColumnWidth: 150, columns: [...fixtureColumns],
    message: "Try the controls. Changes exist only in this demonstration.", menu: null, editing: false,
  };
}
export function visibleRows(state: DemoState): DemoRow[] {
  if (state.empty || state.loading) return [];
  const query = state.query.toLowerCase().trim();
  return state.rows.filter((row) => (!state.filter || row.status === state.filter) && (!query || [row.name, row.username, row.email].some((value) => value.toLowerCase().includes(query))));
}
export function rangeValue(control: ControlDefinition, state: DemoState): number {
  const all = Boolean(state.values[control.id + ".scope"]);
  if (control.id === "account.row-height") return all ? state.allRowHeight : state.rowHeights[state.selectedRow ?? ""] ?? state.allRowHeight;
  if (control.id === "account.column-width") return all ? state.allColumnWidth : state.columnWidths[state.selectedColumn] ?? state.allColumnWidth;
  return Number(state.values[control.id] ?? control.initial ?? 0);
}
export function hasAccountSelection(state: DemoState): boolean {
  return Boolean(state.values["account.cell"] && state.selected && state.columns.includes(state.selectedColumn) && visibleRows(state).some((row) => row.id === state.selectedRow));
}
export function setAccountColumns(state: DemoState, columns: string[]): DemoState {
  if (!columns.length || columns.some((column) => !fixtureColumns.includes(column))) return state;
  const next = { ...state, columns: [...columns] };
  return hasAccountSelection(next) ? next : { ...next, selected: false, selectedRow: null, editing: false };
}
export function setDemoSelection(state: DemoState, selected: boolean, account: boolean): DemoState {
  if (!account) return { ...state, selected };
  const row = visibleRows(state).find((item) => item.id === state.selectedRow) ?? visibleRows(state)[0];
  const available = Boolean(selected && state.values["account.cell"] && row);
  return { ...state, selected: available, selectedRow: available ? row.id : null, selectedColumn: state.columns.includes(state.selectedColumn) ? state.selectedColumn : state.columns[0], editing: false };
}
export function disabledReason(control: ControlDefinition, state: DemoState): string | undefined {
  if (control.id.startsWith("account.") && control.disabled === "editable" && !hasAccountSelection(state)) return "Select a visible editable cell and unlock the fixture.";
  if (control.id.startsWith("studio.") && ["selection", "editable"].includes(control.disabled ?? "") && !state.objects.some((object) => object.id === state.selectedObjectId)) return "Select an existing object.";
  if (control.id.endsWith(".reset") && !state.values[control.id.replace(/\.reset$/, ".scope")] && !hasAccountSelection(state)) return "Select a cell or use All scope.";
  if (control.kind === "compound-range" && !state.values[control.id + ".scope"] && !hasAccountSelection(state)) return "Select a cell or use All scope.";
  if (control.disabled === "always") return "Disabled-state specimen.";
  if (control.disabled === "undo" && !state.history.length) return "Make a canvas change first.";
  if (control.disabled === "redo" && !state.future.length) return "Undo a canvas change first.";
  if (control.disabled === "selection" && (!state.selected || state.locked)) return "Select an item in the unlocked fixture.";
  if (control.disabled === "pages" && !state.selected) return "Select a page for export.";
  if (control.disabled === "editable" && (!state.selected || state.locked || (control.id.startsWith("account.") && !["name", "username"].includes(state.selectedColumn)))) return "Select an editable item and unlock the fixture.";
  if (control.disabled === "unlocked" && state.locked) return "Unlock the fixture.";
  if (control.disabled === "loading" && state.loading) return "The loading scenario is active.";
}
export function controlPresentation(control: ControlDefinition, state: DemoState): { label: string; icon?: IconName; pressed: boolean } {
  const pressed = (control.kind === "button" || control.kind === "toggle" || control.kind === "split") && Boolean(state.values[control.id]);
  if (studioTools.includes(control.id)) return { label: control.label, icon: control.icon, pressed: (state.values["studio.tool"] ?? "select") === control.id.slice(7) };
  if (control.id === "account.lock") return { label: state.locked ? "Unlock Fields" : "Lock Fields", icon: state.locked ? "security.lock" : "security.unlock", pressed: state.locked };
  if (control.id === "account.highlight") return { label: ({ row: "Rows", column: "Columns", both: "Rows & Columns" })[state.lastHighlight], icon: ({ row: "table.rows", column: "table.columns", both: "table.both" } as const)[state.lastHighlight], pressed: state.highlight !== "none" };
  if (control.id.endsWith(".scope")) return { label: pressed ? "All" : "Selected", icon: pressed ? "scope.all" : "scope.selected", pressed };
  if (control.id === "studio.pages.toggle") return { label: pressed ? "Hide Pages" : "Show Pages", icon: pressed ? "view.hide" : "view.pages", pressed };
  if (control.id === "studio.all-pages") return { label: pressed ? "Single Page" : "All Pages", icon: pressed ? "view.single" : "view.pages", pressed };
  if (control.id === "studio.snap") return { label: pressed ? "Snap On" : "Snap Off", icon: pressed ? "view.snap" : "view.snap-off", pressed };
  if (control.id === "account.refresh") return { label: state.loading ? "Refreshing…" : "Refresh", icon: control.icon, pressed: false };
  return { label: control.label, icon: control.icon, pressed };
}
const objectChange = (state: DemoState, objects: DemoObject[]): DemoState => ({ ...state, objects, history: [...state.history, state.objects], future: [] });
const studioTools = ["studio.select", "studio.arrow", "studio.text", "studio.step", "studio.highlight", "studio.redaction"];
function moveSelection(state: DemoState, direction: "backward" | "forward" | "back" | "front"): DemoState {
  const objects = [...state.objects];
  const index = objects.findIndex((object) => object.id === state.selectedObjectId);
  if (index < 0) return state;
  const target = direction === "back" ? 0 : direction === "front" ? objects.length - 1 : Math.max(0, Math.min(objects.length - 1, index + (direction === "forward" ? 1 : -1)));
  if (target === index) return state;
  const [object] = objects.splice(index, 1); objects.splice(target, 0, object);
  return objectChange(state, objects);
}
type Handler = (state: DemoState, value?: string | number | boolean) => DemoState;
function restoreObjects(state: DemoState, objects: DemoObject[], history: DemoObject[][], future: DemoObject[][]): DemoState {
  const selectedObjectId = objects.some((object) => object.id === state.selectedObjectId) ? state.selectedObjectId : objects.at(-1)?.id ?? null;
  return { ...state, objects, history, future, selectedObjectId, selected: selectedObjectId !== null && state.selected };
}
const toggleValue = (id: string): Handler => (state) => ({ ...state, values: { ...state.values, [id]: !state.values[id] } });
const zoom = (step: number): Handler => (state) => ({ ...state, values: { ...state.values, "studio.zoom": String(Math.min(500, Math.max(10, Number(state.values["studio.zoom"]) + step))) } });
export const demoCommands: Record<string, Handler> = {
  "account.cell": (state) => ({ ...state, values: { ...state.values, "account.cell": !state.values["account.cell"] }, selected: false, selectedRow: null, editing: false }),
  "studio.undo": (state) => state.history.length ? restoreObjects(state, state.history.at(-1)!, state.history.slice(0, -1), [state.objects, ...state.future]) : state,
  "studio.redo": (state) => state.future.length ? restoreObjects(state, state.future[0], [...state.history, state.objects], state.future.slice(1)) : state,
  "studio.duplicate": (state) => {
    const selected = state.objects.find((object) => object.id === state.selectedObjectId);
    if (!selected) return state;
    const id = Math.max(...state.objects.map((object) => object.id)) + 1;
    return { ...objectChange(state, [...state.objects, { ...selected, id, label: selected.label + " Copy" }]), selectedObjectId: id };
  },
  "studio.backward": (state) => moveSelection(state, "backward"),
  "studio.forward": (state) => moveSelection(state, "forward"),
  "studio.back": (state) => moveSelection(state, "back"),
  "studio.front": (state) => moveSelection(state, "front"),
  "studio.zoom-in": zoom(1), "studio.zoom-out": zoom(-1),
  "studio.fit": (state) => ({ ...state, values: { ...state.values, "studio.zoom": "100" } }),
  "studio.save-media": (state) => ({ ...state, handoff: true, linked: true }),
  "studio.image": (state) => objectChange(state, [...state.objects, { id: Math.max(...state.objects.map((object) => object.id)) + 1, label: "Sample Image", kind: "image" }]),
  "account.lock": (state) => ({ ...state, locked: !state.locked, editing: false }),
  "account.highlight": (state) => ({ ...state, highlight: state.highlight === "none" ? state.lastHighlight : "none" }),
  "account.highlight.row": (state) => ({ ...state, highlight: "row", lastHighlight: "row", menu: null }),
  "account.highlight.column": (state) => ({ ...state, highlight: "column", lastHighlight: "column", menu: null }),
  "account.highlight.both": (state) => ({ ...state, highlight: "both", lastHighlight: "both", menu: null }),
  "account.highlight.menu": (state) => ({ ...state, menu: state.menu === "highlight" ? null : "highlight" }),
  "account.highlight.close": (state) => ({ ...state, menu: null }),
  "account.columns": (state) => ({ ...state, menu: state.menu === "columns" ? null : "columns" }),
  "account.columns.close": (state) => ({ ...state, menu: null }),
  "account.edit": (state) => ({ ...state, editing: true }),
  "account.delete": (state) => ({ ...state, rows: state.rows.filter((row) => row.id !== state.selectedRow), selected: false, selectedRow: null }),
  "account.search": (state) => ({ ...state, query: String(state.values["account.search-input"] ?? ""), filter: String(state.values["account.status"] ?? ""), empty: false, selected: false, selectedRow: null }),
  "account.clear": (state) => ({ ...state, query: "", filter: "", empty: false, values: { ...state.values, "account.search-input": "", "account.status": "" } }),
  "account.refresh": (state) => ({ ...state, rows: fixtureRows.map((row) => ({ ...row })), empty: false }),
};
export function runDemoCommand(state: DemoState, control: ControlDefinition, value?: string | number | boolean): DemoState {
  if (disabledReason(control, state)) return state;
  let next = state;
  if (control.kind === "compound-range") {
    const raw = Number(value); if (!Number.isFinite(raw)) return state;
    const amount = Math.min(control.max!, Math.max(control.min!, control.min! + Math.round((raw - control.min!) / control.step!) * control.step!));
    const all = Boolean(state.values[control.id + ".scope"]);
    next = control.id === "account.row-height"
      ? all ? { ...state, allRowHeight: amount, rowHeights: {} } : { ...state, rowHeights: { ...state.rowHeights, [state.selectedRow!]: amount } }
      : all ? { ...state, allColumnWidth: amount, columnWidths: {} } : { ...state, columnWidths: { ...state.columnWidths, [state.selectedColumn]: amount } };
  } else if (control.id.endsWith(".reset")) {
    const id = control.id.replace(/\.reset$/, "");
    const all = Boolean(state.values[id + ".scope"]);
    if (id === "account.row-height") {
      const rowHeights = { ...state.rowHeights }; delete rowHeights[state.selectedRow ?? ""];
      next = { ...state, rowHeights: all ? {} : rowHeights, allRowHeight: all ? 44 : state.allRowHeight };
    } else {
      const columnWidths = { ...state.columnWidths }; delete columnWidths[state.selectedColumn];
      next = { ...state, columnWidths: all ? {} : columnWidths, allColumnWidth: all ? 150 : state.allColumnWidth };
    }
  } else if (demoCommands[control.command]) next = demoCommands[control.command](state, value);
  else if (["text", "number", "select", "range"].includes(control.kind)) {
    next = { ...state, values: { ...state.values, [control.id]: value ?? "" } };
    if (control.id === "studio.shapes") next = { ...next, values: { ...next.values, "studio.tool": "shape" } };
  } else if (control.kind === "toggle") {
    next = toggleValue(control.id)(state);
    if (studioTools.includes(control.id)) next = { ...next, values: { ...next.values, "studio.tool": control.id.slice(7) } };
  }
  return { ...next, message: control.label + (control.command.includes("export") || control.condition || ["studio.library", "studio.home", "studio.files", "studio.backup"].includes(control.id) ? " — demonstration only; no files or application data were changed." : " — updated the demonstration.") };
}
