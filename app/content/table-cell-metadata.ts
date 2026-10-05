import type { TableCellMetadata, TableCellScope, TableCellTag } from "./model";

export type TableStructureAction = "insert-row-before" | "insert-row-after" | "delete-row" | "insert-column-before" | "insert-column-after" | "delete-column";

export function tableCellMetadataAt(metadata: (TableCellMetadata | null)[][] | undefined, rowIndex: number, columnIndex: number) {
  return metadata?.[rowIndex]?.[columnIndex] ?? null;
}

export function tableCellTagFor(metadata: TableCellMetadata | null | undefined, defaultTag: TableCellTag): TableCellTag {
  return metadata?.tag ?? defaultTag;
}

export function tableCellScopeFor(metadata: TableCellMetadata | null | undefined, defaultTag: TableCellTag): TableCellScope | undefined {
  if (metadata && metadata.scope !== undefined) return metadata.scope ?? undefined;
  return defaultTag === "th" && tableCellTagFor(metadata, defaultTag) === "th" ? "col" : undefined;
}

export function updateTableCellMetadata(
  metadata: (TableCellMetadata | null)[][] | undefined,
  action: TableStructureAction,
  rowIndex: number,
  columnIndex: number,
  rowCount: number,
  columnCount: number,
  headerRows: boolean | number = false,
  nextHeaderRows: number = Number(headerRows),
): (TableCellMetadata | null)[][] | undefined {
  const changesRows = action === "insert-row-before" || action === "insert-row-after" || action === "delete-row";
  const inserts = action === "insert-row-before" || action === "insert-row-after" || action === "insert-column-before" || action === "insert-column-after";
  const deletes = action === "delete-row" || action === "delete-column";
  const nextRowCount = rowCount + (changesRows ? inserts ? 1 : -1 : 0);
  const nextColumnCount = columnCount + (changesRows ? 0 : inserts ? 1 : deletes ? -1 : 0);
  const next = Array.from({ length: nextRowCount }, () => Array.from({ length: nextColumnCount }, () => null as TableCellMetadata | null));
  for (let oldRow = 0; oldRow < rowCount; oldRow += 1) {
    for (let oldColumn = 0; oldColumn < columnCount; oldColumn += 1) {
      if (action === "delete-row" && oldRow === rowIndex) continue;
      if (action === "delete-column" && oldColumn === columnIndex) continue;
      let newRow = oldRow;
      let newColumn = oldColumn;
      if (action === "insert-row-before" && oldRow >= rowIndex) newRow += 1;
      if (action === "insert-row-after" && oldRow > rowIndex) newRow += 1;
      if (action === "delete-row" && oldRow > rowIndex) newRow -= 1;
      if (action === "insert-column-before" && oldColumn >= columnIndex) newColumn += 1;
      if (action === "insert-column-after" && oldColumn > columnIndex) newColumn += 1;
      if (action === "delete-column" && oldColumn > columnIndex) newColumn -= 1;

      const oldDefaultTag: TableCellTag = oldRow < Number(headerRows) ? "th" : "td";
      const newDefaultTag: TableCellTag = newRow < nextHeaderRows ? "th" : "td";
      const oldMetadata = tableCellMetadataAt(metadata, oldRow, oldColumn);
      const tag = tableCellTagFor(oldMetadata, oldDefaultTag);
      const scope = tableCellScopeFor(oldMetadata, oldDefaultTag);
      const nextMetadata: TableCellMetadata = {};
      if (tag !== newDefaultTag) nextMetadata.tag = tag;
      const newDefaultScope = newDefaultTag === "th" && tag === "th" ? "col" : undefined;
      if (scope !== newDefaultScope) nextMetadata.scope = scope ?? null;
      if (Object.keys(nextMetadata).length) next[newRow][newColumn] = nextMetadata;
    }
  }
  return next.some(row => row.some(cell => cell !== null)) ? next : undefined;
}
