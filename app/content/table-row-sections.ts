import type { ContentBlock } from "./model";

type TableBlock = Extract<ContentBlock, { type: "table" }>;
export type TableRowSection = "header" | "body" | "footer";

/** Flat row coordinates stay stable across text, metadata and dimension grids. */
export function tableRowSections(block: TableBlock) {
  const rowCount = block.rows.length;
  const headerRowCount = Math.min(rowCount, block.headerRowCount ?? (block.hasHeader ? 1 : 0));
  const footerRowCount = Math.min(rowCount - headerRowCount, block.footerRowCount ?? (block.hasFooter ? 1 : 0));
  return { headerRowCount, footerRowCount, bodyStart: headerRowCount, bodyEnd: rowCount - footerRowCount };
}

export function tableRowSectionAt(block: TableBlock, rowIndex: number): TableRowSection {
  const { bodyStart, bodyEnd } = tableRowSections(block);
  return rowIndex < bodyStart ? "header" : rowIndex >= bodyEnd ? "footer" : "body";
}

export function tableSectionAttributes(headerRowCount: number, footerRowCount: number) {
  return {
    headerRowCount: headerRowCount || undefined,
    footerRowCount: footerRowCount || undefined,
    hasHeader: headerRowCount > 0 || undefined,
    hasFooter: footerRowCount > 0 || undefined,
  };
}

/** Explicit counts are authoritative and must agree with the legacy flags. */
export function validTableRowSections(block: { rows: string[][]; headerRowCount?: unknown; footerRowCount?: unknown; hasHeader?: unknown; hasFooter?: unknown }) {
  const validCount = (value: unknown) => value === undefined || (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= block.rows.length);
  if (!validCount(block.headerRowCount) || !validCount(block.footerRowCount)) return false;
  if (block.headerRowCount !== undefined && Boolean(block.hasHeader) !== (Number(block.headerRowCount) > 0)) return false;
  if (block.footerRowCount !== undefined && Boolean(block.hasFooter) !== (Number(block.footerRowCount) > 0)) return false;
  // Legacy flags on an empty table were accepted before explicit sections.
  const header = block.headerRowCount ?? (block.hasHeader && block.rows.length ? 1 : 0);
  const footer = block.footerRowCount ?? (block.hasFooter && block.rows.length > Number(header) ? 1 : 0);
  return Number(header) + Number(footer) <= block.rows.length;
}
