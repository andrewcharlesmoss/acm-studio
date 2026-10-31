import type { CSSProperties } from "react";
import type { ColumnBlock, ColumnWidthUnit, ContentBlock, LayoutOptions } from "./model";
import { childContentBlocks } from "./block-tree";
import { cssVerticalAlignment } from "./layout";

export function findColumnsParent(blocks: ContentBlock[], columnId: string): Extract<ContentBlock, { type: "columns" }> | undefined {
  for (const block of blocks) {
    if (block.type === "columns" && block.children.some(column => column.id === columnId)) return block;
    const parent = findColumnsParent(childContentBlocks(block), columnId);
    if (parent) return parent;
  }
  return undefined;
}

export const COLUMN_LAYOUT_PRESETS = [
  { label: "One column", widths: [100] },
  { label: "Equal columns", widths: [50, 50] },
  { label: "One third / two thirds", widths: [33.333, 66.667] },
  { label: "Two thirds / one third", widths: [66.667, 33.333] },
  { label: "Three equal columns", widths: [33.333, 33.333, 33.334] },
  { label: "Quarter / half / quarter", widths: [25, 50, 25] },
] as const;

export const COLUMN_COUNT_LIMITS = { min: 1, max: 6 } as const;

export function containsColumnWidthUnit(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsColumnWidthUnit);
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.type === "column" && record.widthUnit !== undefined) return true;
  return Object.values(record).some(containsColumnWidthUnit);
}

export function maximumColumnWidth(flexibleColumnCount: number): number {
  return Math.max(5, 100 - 5 * (flexibleColumnCount - 1));
}

export function createColumnsBlock(id: string, widths: readonly number[] = [50, 50], createId = (index: number) => `${id}-column-${index + 1}`): Extract<ContentBlock, { type: "columns" }> {
  const columns = widths.slice(0, COLUMN_COUNT_LIMITS.max).map((width, index): ColumnBlock => ({
    id: createId(index), type: "column", width, children: [],
  }));
  return { id, type: "columns", gap: 16, stackAt: "mobile", children: columns };
}

export function setColumnsLayout(block: Extract<ContentBlock, { type: "columns" }>, widths: readonly number[], createId: (index: number) => string): Extract<ContentBlock, { type: "columns" }> {
  const bounded = widths.slice(0, COLUMN_COUNT_LIMITS.max);
  if (!bounded.length) return block;
  const columns = bounded.map((width, index): ColumnBlock => {
    const existing = block.children[index];
    return existing ? { ...existing, width } : { id: createId(index), type: "column", width, children: [] };
  });
  if (block.children.length > columns.length) {
    const lastColumnIndex = columns.length - 1;
    const removedContent = block.children.slice(columns.length).flatMap((column) => column.children);
    columns[lastColumnIndex] = { ...columns[lastColumnIndex], children: [...columns[lastColumnIndex].children, ...removedContent] };
  }
  return { ...block, children: columns };
}

export function setColumnCount(block: Extract<ContentBlock, { type: "columns" }>, requestedCount: number, createId: (index: number) => string): Extract<ContentBlock, { type: "columns" }> {
  if (!Number.isFinite(requestedCount)) return block;
  const count = Math.max(COLUMN_COUNT_LIMITS.min, Math.min(COLUMN_COUNT_LIMITS.max, Math.round(requestedCount)));
  const current = block.children.length;
  if (count === current) return block;
  if (count < current) {
    const children = block.children.slice(0, count);
    const flexible = children.filter(column => !column.widthUnit);
    const flexibleWidth = flexible.length ? 100 / flexible.length : 0;
    const resized = children.map(column => column.widthUnit ? column : { ...column, width: flexibleWidth });
    const removedContent = block.children.slice(count).flatMap((column) => column.children);
    const lastColumnIndex = resized.length - 1;
    resized[lastColumnIndex] = { ...resized[lastColumnIndex], children: [...resized[lastColumnIndex].children, ...removedContent] };
    return { ...block, children: resized };
  }
  const added = Array.from({ length: count - current }, (_, offset): ColumnBlock => ({
    id: createId(current + offset), type: "column", width: 0, children: [],
  }));
  const children = [...block.children, ...added];
  const flexible = children.filter(column => !column.widthUnit);
  const width = flexible.length ? 100 / flexible.length : 0;
  return { ...block, children: children.map(column => column.widthUnit ? column : { ...column, width }) };
}

export function setColumnWidth(block: Extract<ContentBlock, { type: "columns" }>, columnId: string, requestedWidth: number): Extract<ContentBlock, { type: "columns" }> {
  if (!Number.isFinite(requestedWidth)) return block;
  const index = block.children.findIndex((column) => column.id === columnId);
  if (index < 0 || block.children.length < 2) return block;
  const flexible = block.children.filter(column => !column.widthUnit);
  const width = Math.max(5, Math.min(maximumColumnWidth(flexible.length), requestedWidth));
  const others = block.children.filter((_, columnIndex) => columnIndex !== index && !block.children[columnIndex].widthUnit);
  const widths = new Map<string, number>();
  let remaining = 100 - width;
  let unallocated = others;
  // Keep every sibling within the reader's 5% minimum, redistributing the rest.
  while (unallocated.length) {
    const total = unallocated.reduce((sum, column) => sum + (column.width ?? 100 / block.children.length), 0);
    const share = (column: ColumnBlock) => total > 0 ? (column.width ?? 100 / block.children.length) * remaining / total : remaining / unallocated.length;
    const minimumColumns = unallocated.filter(column => share(column) < 5);
    if (!minimumColumns.length) {
      for (const column of unallocated) widths.set(column.id, share(column));
      break;
    }
    for (const column of minimumColumns) { widths.set(column.id, 5); remaining -= 5; }
    unallocated = unallocated.filter(column => !widths.has(column.id));
  }
  const children = block.children.map((column, columnIndex) => columnIndex === index
    ? { ...column, width }
    : widths.has(column.id) ? { ...column, width: widths.get(column.id)! } : column);
  return { ...block, children };
}

export function setColumnWidthUnit(block: Extract<ContentBlock, { type: "columns" }>, columnId: string, requestedWidth: number, unit: ColumnWidthUnit): Extract<ContentBlock, { type: "columns" }> {
  if (!Number.isFinite(requestedWidth)) return block;
  const selected = block.children.find(column => column.id === columnId);
  if (!selected) return block;
  if (unit === "%") {
    const flexibleParent = { ...block, children: block.children.map(column => column.id === columnId ? { ...column, width: requestedWidth, widthUnit: undefined } : column) };
    return setColumnWidth(flexibleParent, columnId, requestedWidth);
  }
  const width = Math.max(1, Math.min(2000, requestedWidth));
  if (selected.widthUnit === unit && selected.width === width) return block;
  return { ...block, children: block.children.map(column => column.id === columnId ? { ...column, width, widthUnit: unit } : column) };
}

export function columnsGridTemplate(columns: readonly Pick<ColumnBlock, "width" | "widthUnit">[]): string {
  const widths = columns.map((column) => Math.max(0.01, column.width ?? 100 / Math.max(1, columns.length)));
  return columns.map((column, index) => column.widthUnit
    ? `minmax(${widths[index]}${column.widthUnit}, ${widths[index]}${column.widthUnit})`
    : `minmax(0, ${widths[index]}fr)`).join(" ");
}

export function columnsLayoutStyle(options: LayoutOptions & { children: readonly Pick<ColumnBlock, "width">[] }): CSSProperties {
  return {
    "--block-layout-gap": `${options.gap ?? 16}px`,
    ...(options.columnGap === undefined ? {} : { "--block-layout-column-gap": `${options.columnGap}px` }),
    ...(options.rowGap === undefined ? {} : { "--block-layout-row-gap": `${options.rowGap}px` }),
    "--block-layout-columns": String(options.children.length),
    "--block-layout-grid-template": columnsGridTemplate(options.children),
    "--block-layout-vertical-align": cssVerticalAlignment(options.verticalAlign ?? "stretch"),
  } as CSSProperties;
}
