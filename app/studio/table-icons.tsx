import { AcmStudioIcon, type AcmStudioIconName } from "./acm-studio-icons";

const tableActions = {
  "insert-row-before": "table-row-before",
  "insert-row-after": "table-row-after",
  "delete-row": "table-row-delete",
  "insert-column-before": "table-column-before",
  "insert-column-after": "table-column-after",
  "delete-column": "table-column-delete",
} as const satisfies Record<string, AcmStudioIconName>;

export type TableAction = keyof typeof tableActions;

export function TableIcon() {
  return <AcmStudioIcon name="table" />;
}

export function TableActionIcon({ action }: { action: TableAction }) {
  return <AcmStudioIcon name={tableActions[action]} />;
}
