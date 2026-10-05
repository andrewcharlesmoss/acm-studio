import { DEFAULT_TABLE_ROW_HEIGHT, normaliseTableColumnWidths, normaliseTableRowHeights, type ContentBlock } from "./model";
import { updateTableCellMetadata } from "./table-cell-metadata";
import { updateTableCellRuns } from "./table-cell-runs";
import { tableRowSectionAt, tableRowSections, tableSectionAttributes } from "./table-row-sections";

export type TableStructureAction = "insert-row-before" | "insert-row-after" | "delete-row" | "insert-column-before" | "insert-column-after" | "delete-column";
type TableBlock = Extract<ContentBlock, { type: "table" }>;
type Cell = { rowIndex: number; columnIndex: number };

export function validTableActiveCell(block: TableBlock, cell: Cell | null | undefined): cell is Cell {
  return Boolean(cell && Number.isInteger(cell.rowIndex) && Number.isInteger(cell.columnIndex)
    && cell.rowIndex >= 0 && cell.rowIndex < block.rows.length
    && cell.columnIndex >= 0 && cell.columnIndex < block.rows[cell.rowIndex].length);
}

/** Every table editing surface moves text, formatting and dimensions together. */
export function applyTableStructureAction(block: TableBlock, action: TableStructureAction, activeCell: Cell | null | undefined) {
  if (!validTableActiveCell(block, activeCell)) return null;
  const rows = block.rows.map(row => [...row]);
  const columnCount = rows[0].length;
  const { rowIndex, columnIndex } = activeCell;
  const sections = tableRowSections(block);
  const section = tableRowSectionAt(block, rowIndex);
  const insertsRow = action === "insert-row-before" || action === "insert-row-after";
  const rowDelta = insertsRow ? 1 : action === "delete-row" ? -1 : 0;
  let headerRowCount = sections.headerRowCount + (section === "header" ? rowDelta : 0);
  let footerRowCount = sections.footerRowCount + (section === "footer" ? rowDelta : 0);
  const columnWidths = normaliseTableColumnWidths(columnCount, block.columnWidths);
  const rowHeights = normaliseTableRowHeights(rows.length, block.rowHeights);
  const columnAlignments = Array.from({ length: columnCount }, (_, index) => block.columnAlignments?.[index] ?? "left" as const);
  let cellRuns = updateTableCellRuns(block.cellRuns, action, rowIndex, columnIndex, columnCount);
  let cellMetadata = updateTableCellMetadata(block.cellMetadata, action, rowIndex, columnIndex, rows.length, columnCount, sections.headerRowCount, headerRowCount);
  let nextCell: Cell | null = null;
  if (insertsRow) {
    const at = rowIndex + (action === "insert-row-after" ? 1 : 0);
    rows.splice(at, 0, Array.from({ length: columnCount }, () => ""));
    rowHeights.splice(at, 0, DEFAULT_TABLE_ROW_HEIGHT);
    nextCell = { rowIndex: at, columnIndex: 0 };
  } else if (action === "delete-row") {
    rows.splice(rowIndex, 1);
    rowHeights.splice(rowIndex, 1);
  } else if (action === "insert-column-before" || action === "insert-column-after") {
    const at = columnIndex + (action === "insert-column-after" ? 1 : 0);
    rows.forEach(row => row.splice(at, 0, ""));
    const width = columnWidths[columnIndex] / 2;
    columnWidths[columnIndex] = width;
    columnWidths.splice(at, 0, width);
    columnAlignments.splice(at, 0, "left");
    nextCell = { rowIndex, columnIndex: at };
  } else if (columnCount === 1) {
    rows.splice(0);
    rowHeights.splice(0);
    cellRuns = block.cellRuns ? [] : undefined;
    cellMetadata = undefined;
    headerRowCount = 0;
    footerRowCount = 0;
  } else {
    rows.forEach(row => row.splice(columnIndex, 1));
    const [removed] = columnWidths.splice(columnIndex, 1);
    columnWidths[Math.max(0, columnIndex - 1)] += removed;
    columnAlignments.splice(columnIndex, 1);
  }
  return {
    block: {
      ...block, rows, cellRuns, cellMetadata, ...tableSectionAttributes(headerRowCount, footerRowCount),
      columnAlignments: rows.length ? columnAlignments : undefined,
      columnWidths: rows.length && block.columnWidths ? columnWidths : undefined,
      rowHeights: block.rowHeights ? rowHeights : undefined,
    },
    activeCell: nextCell,
  };
}
