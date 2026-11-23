import { OUTER_INSERTION_GAP, type PlacementEdgeGaps } from "./drag-placement-space";
/** Viewport rectangles, shared by insertion feedback and destination hit testing. */
export type DropBounds = { left: number; right: number; top: number; bottom: number; width: number; height: number };
export type DropAxis = "x" | "y";
export type ReorderLayout = DropAxis | "card-grid";
export type DropEdgeAlignment = "gap" | "boundary";
export type WrappedRowBoundaryCue = "full-row" | "next-item" | "row-edge";
export type DropLine = { left: number; top: number; width: number; height: number };

function visualRows(rows: DropBounds[]) {
  const groups: { start: number; end: number; top: number; bottom: number; left: number; right: number }[] = [];
  rows.forEach((row, index) => {
    const previous = groups.at(-1);
    if (previous && row.top < previous.bottom && row.bottom > previous.top) {
      previous.end = index; previous.top = Math.min(previous.top, row.top); previous.bottom = Math.max(previous.bottom, row.bottom); previous.left = Math.min(previous.left, row.left); previous.right = Math.max(previous.right, row.right);
    } else groups.push({ start: index, end: index, top: row.top, bottom: row.bottom, left: row.left, right: row.right });
  });
  return groups;
}
export function insertionGapIndex(rows: DropBounds[], x: number, y: number, axis: DropAxis = "y"): number {
  if (axis === "y") { const index = rows.findIndex(row => y < (row.top + row.bottom) / 2); return index < 0 ? rows.length : index; }
  for (const group of visualRows(rows)) {
    if (y < group.top) return group.start;
    if (y <= group.bottom) {
      for (let index = group.start; index <= group.end; index++) if (x < (rows[index].left + rows[index].right) / 2) return index;
      return group.end + 1;
    }
  }
  return rows.length;
}

/** A card body selects its slot; its edges and the space between cards select gaps. */
export function cardGridInsertion(rows: DropBounds[], sourceIndex: number, x: number, y: number, scale = 1) {
  const axis: DropAxis = visualRows(rows).some(row => row.start !== row.end) ? "x" : "y";
  const hit = rows.findIndex(row => x >= row.left && x <= row.right && y >= row.top && y <= row.bottom);
  if (hit < 0) return { axis, index: insertionGapIndex(rows, x, y, axis) };

  const card = rows[hit];
  const [coordinate, start, end] = axis === "x" ? [x, card.left, card.right] : [y, card.top, card.bottom];
  // Leave a narrow edge zone for an explicit before/after drop on the card.
  const edge = Math.min(12 * scale, (end - start) / 4);
  if (coordinate < start + edge) return { axis, index: hit };
  if (coordinate > end - edge) return { axis, index: hit + 1 };
  return { axis, index: hit > sourceIndex ? hit + 1 : hit };
}

export function insertionGapLine(rows: DropBounds[], index: number, owner: DropBounds, scale = 1, axis: DropAxis = "y", thickness = 2, outerGaps: PlacementEdgeGaps = { before: OUTER_INSERTION_GAP, after: OUTER_INSERTION_GAP }, edgeAlignment: DropEdgeAlignment = "boundary", wrappedRowBoundaryCue: WrappedRowBoundaryCue = "full-row", pointerY?: number): DropLine {
  const edgeGaps = edgeAlignment === "boundary" ? { before: 0, after: 0 } : outerGaps;
  const before = rows[index - 1]; const after = rows[index];
  const groups = axis === "x" ? visualRows(rows) : [];
  const previousRow = groups.find(group => index - 1 >= group.start && index - 1 <= group.end);
  const followingRow = groups.find(group => index >= group.start && index <= group.end);
  if (wrappedRowBoundaryCue !== "full-row" && before && after && previousRow && followingRow && previousRow !== followingRow) {
    const centre = (previousRow.bottom + followingRow.top) / 2;
    if (wrappedRowBoundaryCue === "row-edge") {
      // A wrapped gap has two physical approaches, with one saved insertion index.
      const atRowEnd = (pointerY ?? followingRow.top) < centre;
      const row = atRowEnd ? previousRow : followingRow;
      const edge = atRowEnd ? before.right : after.left;
      return {
        left: (edge - owner.left) / scale - thickness / 2,
        top: (row.top - owner.top) / scale,
        width: thickness,
        height: (row.bottom - row.top) / scale,
      };
    }
    const markerWidth = Math.min(after.width, 48 * scale);
    const left = (after.left + after.right - markerWidth) / 2;
    return { left: (left - owner.left) / scale, top: (centre - owner.top) / scale - thickness / 2, width: markerWidth / scale, height: thickness };
  }
  const horizontal = axis === "x" && (!before || !after || previousRow === followingRow);
  if (horizontal) {
    const centre = before && after ? (before.right + after.left) / 2 : after ? after.left - edgeGaps.before * scale / 2 : before ? before.right + edgeGaps.after * scale / 2 : (owner.left + owner.right) / 2;
    const top = followingRow?.top ?? previousRow?.top ?? owner.top;
    const bottom = followingRow?.bottom ?? previousRow?.bottom ?? owner.bottom;
    return { left: (centre - owner.left) / scale - thickness / 2, top: (top - owner.top) / scale, width: thickness, height: (bottom - top) / scale };
  }
  const centre = before && after ? ((previousRow?.bottom ?? before.bottom) + (followingRow?.top ?? after.top)) / 2 : after ? after.top - edgeGaps.before * scale / 2 : before ? before.bottom + edgeGaps.after * scale / 2 : (owner.top + owner.bottom) / 2;
  const neighbours = [previousRow ?? before, followingRow ?? after].filter((row): row is NonNullable<typeof row> => Boolean(row));
  const left = neighbours.length ? Math.min(...neighbours.map(row => row.left)) : owner.left;
  const right = neighbours.length ? Math.max(...neighbours.map(row => row.right)) : owner.right;
  return { left: (left - owner.left) / scale, top: (centre - owner.top) / scale - thickness / 2, width: (right - left) / scale, height: thickness };
}

/** Translate one canonical line into a positioned container, including scroll/borders. */
export function dropLineInContainer(line: DropLine, gapOwner: DropBounds, container: DropBounds, scale = 1, offsets: { scrollLeft?: number; scrollTop?: number; borderLeft?: number; borderTop?: number } = {}): DropLine {
  return { ...line, left: line.left + (gapOwner.left - container.left) / scale + (offsets.scrollLeft ?? 0) - (offsets.borderLeft ?? 0), top: line.top + (gapOwner.top - container.top) / scale + (offsets.scrollTop ?? 0) - (offsets.borderTop ?? 0) };
}

export { dropContainerScale } from "./drop-container-scale";
