/** Viewport rectangles, shared by insertion feedback and destination hit testing. */
export type DropBounds = { left: number; right: number; top: number; bottom: number; width: number; height: number };
export type DropAxis = "x" | "y";
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

export function insertionGapLine(rows: DropBounds[], index: number, owner: DropBounds, scale = 1, axis: DropAxis = "y", thickness = 2): DropLine {
  const before = rows[index - 1]; const after = rows[index];
  const groups = axis === "x" ? visualRows(rows) : [];
  const previousRow = groups.find(group => index - 1 >= group.start && index - 1 <= group.end);
  const followingRow = groups.find(group => index >= group.start && index <= group.end);
  const horizontal = axis === "x" && (!before || !after || previousRow === followingRow);
  if (horizontal) {
    const centre = before && after ? (before.right + after.left) / 2 : after?.left ?? before?.right ?? (owner.left + owner.right) / 2;
    const top = followingRow?.top ?? previousRow?.top ?? owner.top;
    const bottom = followingRow?.bottom ?? previousRow?.bottom ?? owner.bottom;
    return { left: (centre - owner.left) / scale - thickness / 2, top: (top - owner.top) / scale, width: thickness, height: (bottom - top) / scale };
  }
  const centre = before && after ? ((previousRow?.bottom ?? before.bottom) + (followingRow?.top ?? after.top)) / 2 : after?.top ?? before?.bottom ?? (owner.top + owner.bottom) / 2;
  const neighbours = [previousRow ?? before, followingRow ?? after].filter((row): row is NonNullable<typeof row> => Boolean(row));
  const left = neighbours.length ? Math.min(...neighbours.map(row => row.left)) : owner.left;
  const right = neighbours.length ? Math.max(...neighbours.map(row => row.right)) : owner.right;
  return { left: (left - owner.left) / scale, top: (centre - owner.top) / scale - thickness / 2, width: (right - left) / scale, height: thickness };
}

/** Translate one canonical line into a positioned container, including scroll/borders. */
export function dropLineInContainer(line: DropLine, gapOwner: DropBounds, container: DropBounds, scale = 1, offsets: { scrollLeft?: number; scrollTop?: number; borderLeft?: number; borderTop?: number } = {}): DropLine {
  return { ...line, left: line.left + (gapOwner.left - container.left) / scale + (offsets.scrollLeft ?? 0) - (offsets.borderLeft ?? 0), top: line.top + (gapOwner.top - container.top) / scale + (offsets.scrollTop ?? 0) - (offsets.borderTop ?? 0) };
}

/** Computed CSS width retains fractions that offsetWidth rounds away. */
export function dropContainerScale(element: HTMLElement): number {
  const bounds = element.getBoundingClientRect();
  const style = element.ownerDocument?.defaultView?.getComputedStyle(element);
  const width = style ? Number.parseFloat(style.width) : NaN;
  const extra = style?.boxSizing === "border-box" ? 0 : style ? [style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth].reduce((sum, value) => sum + (Number.parseFloat(value) || 0), 0) : 0;
  const unscaled = Number.isFinite(width) && width + extra > 0 ? width + extra : element.offsetWidth;
  return unscaled ? bounds.width / unscaled : 1;
}
