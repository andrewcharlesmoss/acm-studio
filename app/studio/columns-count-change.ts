import type { ContentBlock } from "../content/model";
import { setColumnCount } from "../content/columns";
import { preservesBlockLocks } from "../content/block-editorial";
import { permitsBlockTreeChanges } from "./block-inserter-options";

type ColumnsBlock = Extract<ContentBlock, { type: "columns" }>;

/** Count changes retain content, so the surviving column must permit every moved block. */
export function proposeColumnCountChange(block: ColumnsBlock, count: number, createId: (index: number) => string): { block: ColumnsBlock; reason?: string } {
  if (!Number.isFinite(count)) return { block, reason: "Choose a valid number of columns." };
  const next = setColumnCount(block, count, createId);
  if (next === block) return { block };
  if (!permitsBlockTreeChanges([block], [next])) return { block, reason: "Removing a column would move blocks into a column that does not allow them." };
  if (!preservesBlockLocks([block], [next])) return { block, reason: "Removing a column would remove or move a locked block." };
  return { block: next };
}
