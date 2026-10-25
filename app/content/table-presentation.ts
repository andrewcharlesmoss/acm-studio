import type { ContentBlock, ParagraphStyle, TableCellMetadata, TextAlignment } from "./model";
import { paragraphStyleToCss } from "./paragraph-styles";

/** Maps the saved column alignment to the CSS value used by Edit and Preview. */
export function tableColumnTextAlign(alignment?: TextAlignment): "left" | "center" | "right" | undefined {
  // Left is the semantic baseline: body cells are left aligned by CSS, while
  // header cells retain their centred table default unless another alignment
  // is explicitly selected.
  if (!alignment || alignment === "left") return undefined;
  return alignment === "centre" ? "center" : alignment;
}

type TableBlock = Extract<ContentBlock, { type: "table" }>;
export type TableCellPosition = { rowIndex: number; columnIndex: number };

/** Explicit cell choices override legacy column defaults without reinterpreting old Left values. */
export function tableCellPresentation(block: TableBlock, row: number, column: number) {
  const cell = { ...block.columnStyles?.[column], ...block.cellMetadata?.[row]?.[column] };
  const textAlign = cell?.textAlign ? cell.textAlign === "centre" ? "center" : cell.textAlign : tableColumnTextAlign(block.columnAlignments?.[column]);
  return { ...(textAlign ? { textAlign } : {}), ...(cell?.verticalAlign ? { verticalAlign: cell.verticalAlign } : {}) };
}

export function setTableCellAlignment(block: TableBlock, target: TableCellPosition, patch: Pick<TableCellMetadata, "textAlign" | "verticalAlign">, scope: "cell" | "column" = "cell"): TableBlock {
  if (!Number.isInteger(target.rowIndex) || !Number.isInteger(target.columnIndex) || !block.rows[target.rowIndex] || target.columnIndex < 0 || target.columnIndex >= block.rows[target.rowIndex].length) return block;
  const columnStyles = scope === "column" ? Array.from({ length: block.rows[0].length }, (_, c) => {
    const next = { ...block.columnStyles?.[c], ...(c === target.columnIndex ? patch : {}) };
    for (const key of ["textAlign", "verticalAlign"] as const) if (next[key] === undefined) delete next[key];
    return next;
  }) : block.columnStyles;
  const cellMetadata = block.rows.map((row, r) => row.map((_text, c) => {
    const current = block.cellMetadata?.[r]?.[c];
    if (c !== target.columnIndex || scope === "cell" && r !== target.rowIndex) return current ? { ...current } : null;
    const next = { ...current, ...(scope === "cell" ? patch : {}) };
    for (const key of ["textAlign", "verticalAlign"] as const) {
      if (scope === "column" && key in patch || next[key] === undefined) delete next[key];
    }
    return Object.keys(next).length ? next : null;
  }));
  return { ...block, columnStyles: columnStyles?.some(style => Object.keys(style).length) ? columnStyles : undefined, cellMetadata: cellMetadata.some(row => row.some(Boolean)) ? cellMetadata : undefined };
}

// Gutenberg applies spacing to the figure and text/colour/border to its table.
// Keep the caption outside those table-specific overrides in Edit and Preview.
export function tablePresentation(style?: ParagraphStyle) {
  const css = paragraphStyleToCss(style);
  const wrapper: Record<string, string> = {};
  const table: Record<string, string> = {};
  const wrapperProperties = new Set(["padding", "margin", "width", "minWidth", "maxWidth", "height", "minHeight", "maxHeight"]);
  for (const [property, value] of Object.entries(css)) {
    const standardProperty = property.startsWith("--studio-rs-") ? property.replace(/^--studio-rs-(?:tablet|mobile)-/, "").replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase()) : property;
    (wrapperProperties.has(standardProperty) ? wrapper : table)[property] = value;
  }
  const hasBorder = Boolean(table.borderStyle || table.borderWidth || table.borderColor);
  if (hasBorder) {
    table.borderStyle ??= "solid";
    table.borderWidth ??= "1px";
  }
  return { wrapper, table, hasBorder };
}
