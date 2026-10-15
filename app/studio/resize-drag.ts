type Point = { x: number; y: number };

export type ResizeDrag<T> = {
  basis: T;
  latest: T;
  origin: Point;
  previous: Point;
  keepRatio: boolean;
};

export function beginResizeDrag<T>(value: T, point: Point, keepRatio: boolean): ResizeDrag<T> {
  return { basis: value, latest: value, origin: point, previous: point, keepRatio };
}

/** A modifier transition continues from the last rendered size, never the initial ratio. */
export function updateResizeDrag<T>(drag: ResizeDrag<T>, point: Point, keepRatio: boolean, resize: (basis: T, dx: number, dy: number, keepRatio: boolean) => T): T {
  if (drag.keepRatio !== keepRatio) {
    drag.basis = drag.latest;
    drag.origin = drag.previous;
    drag.keepRatio = keepRatio;
  }
  drag.latest = resize(drag.basis, point.x - drag.origin.x, point.y - drag.origin.y, keepRatio);
  drag.previous = point;
  return drag.latest;
}
