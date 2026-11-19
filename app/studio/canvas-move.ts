type Point = { x: number; y: number };

export type CanvasMove = { pointerId: number; origin: Point };

export function beginCanvasMove(pointerId: number, point: Point): CanvasMove {
  return { pointerId, origin: { ...point } };
}

export function canvasMoveDelta(move: CanvasMove, pointerId: number, point: Point): Point | null {
  if (move.pointerId !== pointerId) return null;
  return { x: point.x - move.origin.x, y: point.y - move.origin.y };
}

export function moveCanvasPlacement<T extends Point>(placement: T, delta: Point, fit?: (candidate: T) => T): T {
  const candidate = { ...placement, x: placement.x + delta.x, y: placement.y + delta.y };
  return fit ? fit(candidate) : candidate;
}

export function canvasMoveKeyDelta(key: string, shift: boolean, unit = 1): Point | null {
  const step = (shift ? 10 : 1) * unit;
  switch (key) {
    case "ArrowLeft": return { x: -step, y: 0 };
    case "ArrowRight": return { x: step, y: 0 };
    case "ArrowUp": return { x: 0, y: -step };
    case "ArrowDown": return { x: 0, y: step };
    default: return null;
  }
}
