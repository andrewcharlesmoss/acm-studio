import type { ContentBlock, RichTextRun } from "./model";
import { plainTextFromRuns } from "./rich-text.ts";
import { childContentBlocks } from "./block-tree.ts";

export type RichTextField = {
  blockId: string;
  kind: "text" | "attribution" | "caption" | "label" | "list-item" | "table-cell";
  /** A Quote with children retains a dormant legacy body for recovery only. */
  active: boolean;
  itemIndex?: number;
  row?: number;
  column?: number;
};

/** Update rich fields and their plain projections through one typed ownership walk. */
export function mapRichTextFields(blocks: ContentBlock[], update: (runs: RichTextRun[], field: RichTextField) => RichTextRun[]): ContentBlock[] {
  let changed = false;
  const mapped = blocks.map(original => {
    let block = original;
    const field = (runs: RichTextRun[], kind: RichTextField["kind"], position: Pick<RichTextField, "itemIndex" | "row" | "column"> = {}) => update(runs, { blockId: block.id, kind, active: kind !== "text" || block.type !== "quote" || block.children === undefined, ...position });
    if ((block.type === "paragraph" || block.type === "heading" || block.type === "quote") && block.runs) {
      const runs = field(block.runs, "text");
      if (runs !== block.runs) block = { ...block, runs, text: plainTextFromRuns(runs) };
    }
    const ownedChildren = block.type === "list" ? [] : childContentBlocks(block);
    if (ownedChildren.length) {
      const children = mapRichTextFields(ownedChildren, update);
      if (children !== ownedChildren) block = { ...block, children } as ContentBlock;
    }
    if (block.type === "quote" && block.attributionRuns) {
      const attributionRuns = field(block.attributionRuns, "attribution");
      if (attributionRuns !== block.attributionRuns) block = { ...block, attributionRuns, attribution: plainTextFromRuns(attributionRuns) };
    }
    if (block.type === "button" && block.labelRuns) {
      const labelRuns = field(block.labelRuns, "label");
      if (labelRuns !== block.labelRuns) block = { ...block, labelRuns, label: plainTextFromRuns(labelRuns) };
    }
    if (block.type === "list") {
      let itemsChanged = false;
      const items = block.items.map((item, itemIndex) => {
        if (typeof item === "string") return item;
        const runs = item.runs ? field(item.runs, "list-item", { itemIndex }) : undefined;
        const children = item.children ? mapRichTextFields(item.children, update) as typeof item.children : undefined;
        if (runs === item.runs && children === item.children) return item;
        itemsChanged = true;
        return { ...item, runs, children, text: runs !== item.runs && runs ? plainTextFromRuns(runs) : item.text };
      });
      if (itemsChanged) block = { ...block, items };
    }
    if (block.type === "table" && block.cellRuns) {
      let cellsChanged = false;
      const rows = block.rows.map(row => [...row]);
      const cellRuns = block.cellRuns.map((rowRuns, row) => rowRuns.map((source, column) => {
        const runs = field(source, "table-cell", { row, column });
        if (runs !== source) {
          cellsChanged = true;
          rows[row][column] = plainTextFromRuns(runs);
        }
        return runs;
      }));
      if (cellsChanged) block = { ...block, rows, cellRuns };
    }
    if ((block.type === "table" || block.type === "image" || block.type === "embed") && block.captionRuns) {
      const captionRuns = field(block.captionRuns, "caption");
      if (captionRuns !== block.captionRuns) block = { ...block, captionRuns, caption: plainTextFromRuns(captionRuns) };
    }
    if (block !== original) changed = true;
    return block;
  });
  return changed ? mapped : blocks;
}

/** Reading never materialises absent fields or changes block ownership. */
export function visitRichTextFields(blocks: ContentBlock[], visit: (runs: RichTextRun[], field: RichTextField) => void): void {
  mapRichTextFields(blocks, (runs, field) => { visit(runs, field); return runs; });
}
