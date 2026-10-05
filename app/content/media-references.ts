import type { ContentBlock } from "./model";
import { childContentBlocks } from "./block-tree";
import { mapRichTextFields, visitRichTextFields } from "./rich-text-fields";

export function contentMediaIds(blocks: ContentBlock[]): string[] {
  return collectContentMediaIds(blocks, false);
}

/** Saved publication indexes used this narrower walk before rich-field repair. */
export function historicalContentMediaIds(blocks: ContentBlock[]): string[] {
  return collectContentMediaIds(blocks, true);
}

/** Package import renames assets through the same canonical ownership boundary. */
export function remapContentMediaIds(blocks: ContentBlock[], ids: ReadonlyMap<string, string>): ContentBlock[] {
  const id = (value: string) => ids.get(value) ?? value;
  const rich = mapRichTextFields(blocks, runs => {
    let changed = false;
    const next = runs.map(run => {
      if (run.inline?.type === "image" && run.inline.mediaId && id(run.inline.mediaId) !== run.inline.mediaId) {
        changed = true;
        return { ...run, inline: { ...run.inline, mediaId: id(run.inline.mediaId) } };
      }
      if (!run.marks) return run;
      const marks = run.marks.map(mark => typeof mark !== "string" && mark.type === "inline-image" && mark.mediaId && id(mark.mediaId) !== mark.mediaId ? { ...mark, mediaId: id(mark.mediaId) } : mark);
      if (marks.every((mark, index) => mark === run.marks![index])) return run;
      changed = true;
      return { ...run, marks };
    });
    return changed ? next : runs;
  });
  const style = <T extends { backgroundImageMediaId?: string } | undefined>(value: T): T => value?.backgroundImageMediaId && id(value.backgroundImageMediaId) !== value.backgroundImageMediaId ? { ...value, backgroundImageMediaId: id(value.backgroundImageMediaId) } : value;
  function remapAssets(source: ContentBlock[]): ContentBlock[] {
    let changed = false;
    const next = source.map(original => {
      let block = original;
      if (block.type === "image" && block.mediaId && id(block.mediaId) !== block.mediaId) block = { ...block, mediaId: id(block.mediaId) };
      const visualStyle = style(block.visualStyle);
      if (visualStyle !== block.visualStyle) block = { ...block, visualStyle };
      if (block.type === "paragraph" || block.type === "columns" || block.type === "column") {
        const updatedStyle = style(block.style);
        if (updatedStyle !== block.style) block = { ...block, style: updatedStyle } as ContentBlock;
      }
      if (block.type === "list") {
        const items = block.items.map(item => {
          if (typeof item === "string") return item;
          const updatedStyle = style(item.style), children = item.children ? remapAssets(item.children) as typeof item.children : undefined;
          return updatedStyle === item.style && children === item.children ? item : { ...item, style: updatedStyle, children };
        });
        if (items.some((item, index) => item !== (block as Extract<ContentBlock, { type: "list" }>).items[index])) block = { ...block, items };
      } else {
        const children = childContentBlocks(block);
        const updated = children.length ? remapAssets(children) : children;
        if (updated !== children) block = { ...block, children: updated } as ContentBlock;
      }
      if (block !== original) changed = true;
      return block;
    });
    return changed ? next : source;
  }
  return remapAssets(rich);
}

function collectContentMediaIds(blocks: ContentBlock[], historical: boolean): string[] {
  const ids: string[] = [];
  // Recovery fields still own their files even when their content is dormant.
  visitRichTextFields(blocks, (runs, field) => {
    if (historical && (!field.active || field.kind === "table-cell")) return;
    for (const run of runs) {
      if (!historical && run.inline?.type === "image" && run.inline.mediaId) ids.push(run.inline.mediaId);
      for (const mark of run.marks ?? []) {
        if (typeof mark !== "string" && mark.type === "inline-image" && mark.mediaId) ids.push(mark.mediaId);
      }
    }
  });
  function visitBlocks(children: ContentBlock[]) {
    for (const block of children) {
      const style = block.type === "paragraph" || block.type === "columns" || block.type === "column" ? block.style : block.visualStyle;
      if (block.type === "image" && block.mediaId) ids.push(block.mediaId);
      if (style?.backgroundImageMediaId) ids.push(style.backgroundImageMediaId);
      if (!historical && block.type === "list") for (const item of block.items) {
        if (typeof item !== "string" && item.style?.backgroundImageMediaId) ids.push(item.style.backgroundImageMediaId);
      }
      visitBlocks(childContentBlocks(block));
    }
  }
  visitBlocks(blocks);
  return ids;
}
