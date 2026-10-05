import { tableRowSections } from "../content/table-row-sections";
import type { ContentBlock } from "../content/model";

function tableStructures(blocks: ContentBlock[]): Map<string, string> {
  const structures = new Map<string, string>();
  const pending = [...blocks];
  while (pending.length) {
    const block = pending.pop()!;
    if (block.type === "table") {
      const { headerRowCount, footerRowCount } = tableRowSections(block);
      structures.set(block.id, `${headerRowCount}:${footerRowCount}:${block.rows.map(row => row.length).join(",")}`);
    }
    if ("children" in block && block.children) pending.push(...block.children);
  }
  return structures;
}

/** Cell offsets must not survive section, dimension or document changes. */
export function changedTableStructures(previous: ContentBlock[], next: ContentBlock[]): Set<string> {
  const before = tableStructures(previous);
  const after = tableStructures(next);
  return new Set([...before.keys()].filter(id => before.get(id) !== after.get(id)));
}

export function staleTableTextSelection(key: string, changed: Set<string>): boolean {
  return [...changed].some(id => key === id || key.startsWith(`${id}:cell:`));
}
