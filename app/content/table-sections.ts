import { DEFAULT_TABLE_ROW_HEIGHT, type ContentBlock } from "./model";

import { tableRowSections, tableSectionAttributes } from "./table-row-sections";

type TableBlock = Extract<ContentBlock, { type: "table" }>;
export type TableSetting = "fixedWidth" | "hasHeader" | "hasFooter";

/** Add an empty section row or remove that section, leaving body rows intact. */
export function setTableSection(block: TableBlock, section: "header" | "footer", enabled: boolean): TableBlock {
  const sections = tableRowSections(block);
  const count = section === "header" ? sections.headerRowCount : sections.footerRowCount;
  if (Boolean(count) === enabled || !block.rows.length) return block;
  const rowIndex = section === "header" ? 0 : enabled ? block.rows.length : sections.bodyEnd;
  const removeCount = enabled ? 0 : count;
  const headerRowCount = section === "header" ? enabled ? 1 : 0 : sections.headerRowCount;
  const footerRowCount = section === "footer" ? enabled ? 1 : 0 : sections.footerRowCount;
  const columns = block.rows[0].length;
  const rows = [...block.rows];
  rows.splice(rowIndex, removeCount, ...(enabled ? [Array<string>(columns).fill("")] : []));
  const cellRuns = block.cellRuns ? [...block.cellRuns] : undefined;
  cellRuns?.splice(rowIndex, removeCount, ...(enabled ? [Array.from({ length: columns }, () => [])] : []));
  const cellMetadata = block.cellMetadata ? [...block.cellMetadata] : undefined;
  cellMetadata?.splice(rowIndex, removeCount, ...(enabled ? [Array(columns).fill(null)] : []));
  const rowHeights = block.rowHeights ? [...block.rowHeights] : undefined;
  rowHeights?.splice(rowIndex, removeCount, ...(enabled ? [DEFAULT_TABLE_ROW_HEIGHT] : []));

  return {
    ...block, rows, cellRuns, cellMetadata, rowHeights, ...tableSectionAttributes(headerRowCount, footerRowCount),
    // Legacy tables can consist solely of section rows. Empty tables cannot
    // retain column-sized arrays because their column count is now zero.
    ...(rows.length ? {} : { columnWidths: undefined, columnAlignments: undefined, hasHeader: undefined, hasFooter: undefined }),
  };
}

export function resetTableSettings(block: TableBlock, fields: readonly TableSetting[] = ["fixedWidth", "hasHeader", "hasFooter"]): TableBlock {
  let next = block;
  for (const field of fields) {
    if (field === "fixedWidth") next = { ...next, fixedWidth: undefined };
    else next = setTableSection(next, field === "hasHeader" ? "header" : "footer", false);
  }
  return next;
}
