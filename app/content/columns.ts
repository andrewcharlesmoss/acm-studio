import type { CSSProperties } from "react";
import type { ColumnBlock, ContentBlock, LayoutOptions } from "./model";
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

export function maximumColumnWidth(columnCount: number): number {
  return 100 - 5 * (columnCount - 1);
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
    const children = block.children.slice(0, count).map((column) => ({ ...column, width: 100 / count }));
    const removedContent = block.children.slice(count).flatMap((column) => column.children);
    const lastColumnIndex = children.length - 1;
    children[lastColumnIndex] = { ...children[lastColumnIndex], children: [...children[lastColumnIndex].children, ...removedContent] };
    return { ...block, children };
  }
  const width = 100 / count;
  return { ...block, children: [...block.children, ...Array.from({ length: count - current }, (_, offset): ColumnBlock => ({
    id: createId(current + offset), type: "column", width, children: [],
  }))].map((column) => ({ ...column, width })) };
}

export function setColumnWidth(block: Extract<ContentBlock, { type: "columns" }>, columnId: string, requestedWidth: number): Extract<ContentBlock, { type: "columns" }> {
  if (!Number.isFinite(requestedWidth)) return block;
  const index = block.children.findIndex((column) => column.id === columnId);
  if (index < 0 || block.children.length < 2) return block;
  const width = Math.max(5, Math.min(maximumColumnWidth(block.children.length), requestedWidth));
  const others = block.children.filter((_, columnIndex) => columnIndex !== index);
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
    : { ...column, width: widths.get(column.id)! });
  return { ...block, children };
}

export function columnsGridTemplate(columns: readonly Pick<ColumnBlock, "width">[]): string {
  const widths = columns.map((column) => Math.max(0.01, column.width ?? 100 / Math.max(1, columns.length)));
  return widths.map((width) => `minmax(0, ${width}fr)`).join(" ");
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
