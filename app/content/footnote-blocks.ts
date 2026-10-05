import { childContentBlocks } from "./block-tree.ts";
import type { ContentBlock } from "./model";
import { migrateLegacyFootnoteRuns } from "./footnote-runs.ts";
import { mapRichTextFields, visitRichTextFields, type RichTextField } from "./rich-text-fields.ts";

export type FootnoteFieldLocation = Omit<RichTextField, "active">;

export function footnoteFragment(anchor: string): string {
  return `#${encodeURIComponent(anchor.toWellFormed())}`;
}

/** DOM identity belongs to the reference occurrence, not the shared note record. */
export function footnoteReferenceAnchor(id: string, field: FootnoteFieldLocation, runIndex: number, markIndex = 0): string {
  return `footnote-ref-${encodeURIComponent(JSON.stringify([id, field.blockId, field.kind, field.itemIndex ?? null, field.row ?? null, field.column ?? null, runIndex, markIndex]))}`;
}

/** Component recovery children and empty Tables have no rendered content fields. */
function visibleFootnoteBlocks(blocks: ContentBlock[]): Set<string> {
  const visible = new Set<string>();
  function collect(items: ContentBlock[]) {
    for (const block of items) {
      if (block.editorial?.hidden || block.type === "component" || (block.type === "table" && !block.rows.length)) continue;
      visible.add(block.id);
      collect(childContentBlocks(block));
    }
  }
  collect(blocks);
  return visible;
}

/** Backlinks resolve to the first visible occurrence in document reading order. */
export function visibleFootnoteReferenceAnchors(blocks: ContentBlock[]): Map<string, string> {
  const visible = visibleFootnoteBlocks(blocks);
  const anchors = new Map<string, string>();
  visitRichTextFields(blocks, (runs, field) => {
    if (!field.active || !visible.has(field.blockId)) return;
    runs.forEach((run, index) => {
      if (run.inline?.type === "footnote") {
        if (!anchors.has(run.inline.id)) anchors.set(run.inline.id, footnoteReferenceAnchor(run.inline.id, field, index));
      } else (run.marks ?? []).forEach((mark, markIndex) => {
        if (typeof mark !== "string" && mark.type === "footnote" && !anchors.has(mark.id)) anchors.set(mark.id, footnoteReferenceAnchor(mark.id, field, index, markIndex));
      });
    });
  });
  return anchors;
}

/** Readers validate legacy fields first, then migrate their typed projection in memory. */
export function migrateLegacyFootnoteBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return mapRichTextFields(blocks, runs => runs.some(run => run.marks?.some(mark => typeof mark !== "string" && mark.type === "footnote")) ? migrateLegacyFootnoteRuns(runs) : runs);
}

/** Active reference order follows content fields, independent of notes placement. */
export function footnoteReferenceIds(blocks: ContentBlock[], includeDormant = false): string[] {
  const ids: string[] = [];
  visitRichTextFields(blocks, (runs, field) => {
    if (!field.active && !includeDormant) return;
    for (const run of runs) {
      if (run.inline?.type === "footnote") ids.push(run.inline.id);
      else for (const mark of run.marks ?? []) if (typeof mark !== "string" && mark.type === "footnote") ids.push(mark.id);
    }
  });
  return ids;
}

/** Number visible, resolved references in reading order, not note-storage order. */
export function visibleFootnoteNumbers(blocks: ContentBlock[]): Map<string, number> {
  const numbers = new Map<string, number>();
  const visibleOwners = visibleFootnoteBlocks(blocks);
  const notes = new Set<string>();
  function visit(source: ContentBlock[]) {
    for (const block of source) {
      if (!visibleOwners.has(block.id)) continue;
      if (block.type === "footnotes") for (const note of block.notes) notes.add(note.id);
      visit(childContentBlocks(block));
    }
  }
  visit(blocks);
  visitRichTextFields(blocks, (runs, field) => {
    if (!field.active || !visibleOwners.has(field.blockId)) return;
    for (const run of runs) {
      const ids = run.inline?.type === "footnote" ? [run.inline.id] : (run.marks ?? []).flatMap(mark => typeof mark !== "string" && mark.type === "footnote" ? [mark.id] : []);
      for (const id of ids) if (notes.has(id) && !numbers.has(id)) numbers.set(id, numbers.size + 1);
    }
  });
  return numbers;
}

/** Unreferenced saved text stays last and recoverable in the editor. */
export function orderedFootnoteEntries(notes: Extract<ContentBlock, { type: "footnotes" }>["notes"], numbers: Map<string, number>) {
  return notes.map(note => ({ note, number: numbers.get(note.id) })).sort((left, right) => (left.number ?? Infinity) - (right.number ?? Infinity));
}
