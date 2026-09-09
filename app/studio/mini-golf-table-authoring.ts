import type { ContentBlock } from "../content/model";

type Table = Extract<ContentBlock, { type: "table" }>;
export type TableAuthoringCell = { selector: string; rowIndex: number; columnIndex: number; value: string; label: string; editable: boolean };
type Totals = { holeTotals: number[]; playerTotals: number[]; grandTotal: number };

/** Rows hold authored labels and empty-state text only; populated totals stay derived. */
export function miniGolfTableAuthoringCells(table: Table, totals: Totals): TableAuthoringCell[] {
  const cells: TableAuthoringCell[] = [];
  const header = table.hasHeader ? table.rows[0] : undefined;
  const footerIndex = table.hasFooter ? table.rows.length - 1 : -1;
  const lastColumn = (table.rows[0]?.length ?? 0) - 1;
  const add = (selector: string, rowIndex: number, columnIndex: number, fallback: string, label: string, calculated?: number) => {
    const authored = table.rows[rowIndex]?.[columnIndex];
    cells.push({ selector, rowIndex, columnIndex, value: calculated ? String(calculated) : authored ?? fallback, label, editable: authored !== undefined && !calculated });
  };
  if (header) {
    add("thead th:first-child", 0, 0, "Hole", "Edit hole heading");
    add("thead th:last-child", 0, lastColumn, "Total", "Edit total heading");
  }
  totals.holeTotals.forEach((total, hole) => {
    const row = hole + (header ? 1 : 0);
    if (row === footerIndex || row >= table.rows.length) return;
    add(`tbody tr:nth-child(${hole + 1}) .hole-number`, row, 0, String(hole + 1), `Edit hole ${hole + 1} label`);
    add(`tbody tr:nth-child(${hole + 1}) .hole-total`, row, lastColumn, "—", `Edit hole ${hole + 1} empty total label`, total);
  });
  if (footerIndex >= 0) {
    add("tfoot th:first-child", footerIndex, 0, "Total", "Edit total row label");
    totals.playerTotals.forEach((total, index) => {
      if (index + 1 >= lastColumn) return;
      add(`tfoot td:nth-child(${index + 2})`, footerIndex, index + 1, "—", `Edit player ${index + 1} empty total label`, total);
    });
    add("tfoot td:last-child", footerIndex, lastColumn, "—", "Edit empty grand total label", totals.grandTotal);
  }
  return cells;
}

export function updateMiniGolfAuthoredCell(table: Table, row: number, column: number, value: string): Table {
  if (table.rows[row]?.[column] === undefined) return table;
  return { ...table, rows: table.rows.map((cells, index) => index === row ? cells.map((cell, cellIndex) => cellIndex === column ? value : cell) : cells) };
}

// Preserve source attributes until authoring actually ends, rather than toggling
// contenteditable during every selection/input effect cleanup.
const originalControlAttributes = new WeakMap<HTMLElement, readonly (readonly [string, string | null])[]>();
function restoreControlAttributes(control: HTMLElement) {
  for (const [name, value] of originalControlAttributes.get(control) ?? []) {
    if (value === null) control.removeAttribute(name); else control.setAttribute(name, value);
  }
  originalControlAttributes.delete(control);
}

/** Adapt only source text-only cells; never replace source inputs or event handlers. */
export function installMiniGolfTableAuthoring(root: HTMLElement, cells: TableAuthoringCell[], mode: "edit" | "preview", select: (row: number, column: number) => void, update: (row: number, column: number, value: string) => void) {
  const cleanups: (() => void)[] = [];
  for (const cell of cells) {
    const element = root.querySelector<HTMLElement>(cell.selector);
    if (!element) continue;
    const existingControl = element.querySelector<HTMLElement>(":scope > [data-studio-cell-editor]");
    const editable = mode === "edit" && cell.editable;
    if (!editable) {
      restoreControlAttributes(existingControl ?? element);
      if (existingControl || element.textContent !== cell.value) element.textContent = cell.value;
    }
    if (mode !== "edit") continue;
    const focus = () => select(cell.rowIndex, cell.columnIndex);
    if (!editable) {
      element.addEventListener("click", focus);
      cleanups.push(() => element.removeEventListener("click", focus));
      continue;
    }
    let control = element;
    if (element.matches("th, td")) {
      control = existingControl ?? element.ownerDocument.createElement("span");
      if (!existingControl) {
        control.setAttribute("data-studio-cell-editor", "true");
        element.textContent = "";
        element.append(control);
      }
    }
    // Retain an existing control across input-triggered renders so focus/caret
    // survive. Header and data-cell semantics remain on the original th/td.
    if (control.textContent !== cell.value) control.textContent = cell.value;
    const attributes = { contenteditable: "plaintext-only", role: "textbox", tabindex: "0", "aria-label": cell.label, "aria-multiline": "false", "data-studio-table-authoring": "true" };
    if (!originalControlAttributes.has(control)) originalControlAttributes.set(control, Object.keys(attributes).map(name => [name, control.getAttribute(name)] as const));
    for (const [name, value] of Object.entries(attributes)) if (control.getAttribute(name) !== value) control.setAttribute(name, value);
    // Let native focus happen before selecting the Studio cell. Stop only
    // propagation so the surrounding block cannot rerender on pointerdown.
    const pointerdown = (event: PointerEvent) => event.stopPropagation();
    const input = () => update(cell.rowIndex, cell.columnIndex, control.textContent ?? "");
    const keydown = (event: KeyboardEvent) => { if (event.key === "Enter") event.preventDefault(); };
    control.addEventListener("pointerdown", pointerdown);
    control.addEventListener("focus", focus);
    control.addEventListener("input", input);
    control.addEventListener("keydown", keydown);
    cleanups.push(() => {
      control.removeEventListener("pointerdown", pointerdown);
      control.removeEventListener("focus", focus);
      control.removeEventListener("input", input);
      control.removeEventListener("keydown", keydown);
    });
  }
  return () => cleanups.forEach(cleanup => cleanup());
}
