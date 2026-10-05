export type TableCell = { rowIndex: number; columnIndex: number };
export type TableTextTarget = { kind: "caption" } | ({ kind: "cell" } & TableCell);

export function tableCellForTextTarget(target?: TableTextTarget): TableCell | undefined {
  return target?.kind === "cell" ? { rowIndex: target.rowIndex, columnIndex: target.columnIndex } : undefined;
}
