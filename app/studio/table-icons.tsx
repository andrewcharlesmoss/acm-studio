import { AcmIcon } from "@acm/icons/react";
import type { IconName } from "@acm/icons";

const tableActions = {
  "insert-row-before": "table.row-before",
  "insert-row-after": "table.row-after",
  "delete-row": "table.row-delete",
  "insert-column-before": "table.column-before",
  "insert-column-after": "table.column-after",
  "delete-column": "table.column-delete",
} as const satisfies Record<string, IconName>;

export type TableAction = keyof typeof tableActions;

export function TableIcon() {
  return <AcmIcon name="table.cell" scale="Regular-M" size={24} />;
}

export function TableActionIcon({ action }: { action: TableAction }) {
  return <AcmIcon name={tableActions[action]} scale="Regular-M" size={24} />;
}
