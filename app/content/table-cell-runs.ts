import type { RichTextRun } from "./model";

export type TableStructureAction = "insert-row-before" | "insert-row-after" | "delete-row" | "insert-column-before" | "insert-column-after" | "delete-column";

/** Keeps inline formatting attached to its cell while table rows or columns move. */
export function updateTableCellRuns(cellRuns: RichTextRun[][][] | undefined, action: TableStructureAction, rowIndex: number, columnIndex: number, columnCount: number) {
  if (!cellRuns) return undefined;
  const next = cellRuns.map((row) => row.map((runs) => [...runs]));
  if (action === "insert-row-before") next.splice(rowIndex, 0, Array.from({ length: columnCount }, () => []));
  else if (action === "insert-row-after") next.splice(rowIndex + 1, 0, Array.from({ length: columnCount }, () => []));
  else if (action === "delete-row") next.splice(rowIndex, 1);
  else if (action === "insert-column-before") next.forEach((row) => row.splice(columnIndex, 0, []));
  else if (action === "insert-column-after") next.forEach((row) => row.splice(columnIndex + 1, 0, []));
  else next.forEach((row) => row.splice(columnIndex, 1));
  return next;
}
