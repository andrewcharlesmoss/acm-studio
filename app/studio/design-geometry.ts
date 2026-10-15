import { DESIGN_ARROWHEAD_SCALE_MAX, DESIGN_ARROWHEAD_SCALE_MIN, DESIGN_MAX_DIMENSION, type DesignArrowObject, type DesignShapeKind, type DesignShapeObject } from "./design-model";

export function shapeKindFor(object: DesignShapeObject): DesignShapeKind {
  return object.shape ?? (object.type === "ellipse" ? "circle" : "rectangle");
}

export function polygonPoints(kind: DesignShapeKind, width: number, height: number) {
  const centreX = width / 2;
  const centreY = height / 2;
  const radiusX = width / 2;
  const radiusY = height / 2;
  if (kind === "triangle") return `${centreX},0 ${width},${height} 0,${height}`;
  if (kind === "triangleDown") return `0,0 ${width},0 ${centreX},${height}`;
  if (kind === "diamond") return `${centreX},0 ${width},${centreY} ${centreX},${height} 0,${centreY}`;
  const sides = kind === "pentagon" ? 5 : kind === "hexagon" ? 6 : kind === "octagon" ? 8 : 0;
  if (!sides) return null;
  return Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / sides;
    return `${centreX + radiusX * Math.cos(angle)},${centreY + radiusY * Math.sin(angle)}`;
  }).join(" ");
}

export function arrowPoints(object: DesignArrowObject) {
  const start = object.start ?? { x: 0, y: object.height };
  const end = object.end ?? { x: object.width, y: 0 };
  const normaliseBend = (bend: { x: number; y: number }) => ({ x: Math.max(-DESIGN_MAX_DIMENSION * 2, Math.min(DESIGN_MAX_DIMENSION * 2, bend.x)), y: Math.max(-DESIGN_MAX_DIMENSION * 2, Math.min(DESIGN_MAX_DIMENSION * 2, bend.y)) });
  const bends = object.bends?.length === 1 || object.bends?.length === 2 ? object.bends.map(normaliseBend) : [{ x: start.x + (end.x - start.x) / 2, y: start.y + (end.y - start.y) / 2 }];
  return { start, end, bends };
}

export function arrowheadScale(object: DesignArrowObject) {
  const scale = object.arrowheadScale;
  return typeof scale === "number" && Number.isFinite(scale) ? Math.max(DESIGN_ARROWHEAD_SCALE_MIN, Math.min(DESIGN_ARROWHEAD_SCALE_MAX, scale)) : 1;
}

export function arrowLineStyle(object: DesignArrowObject) {
  return object.lineStyle === "dotted" ? "dotted" : "solid";
}

function normaliseArrowDirection(point: { x: number; y: number }, fallback: { x: number; y: number }) {
  const length = Math.hypot(point.x, point.y) || Math.hypot(fallback.x, fallback.y) || 1;
  const source = Math.hypot(point.x, point.y) ? point : (Math.hypot(fallback.x, fallback.y) ? fallback : { x: 1, y: 0 });
  return { x: source.x / length, y: source.y / length };
}

function arrowCurveLength(start: { x: number; y: number }, end: { x: number; y: number }, bends: Array<{ x: number; y: number }>, control: { x: number; y: number } | null) {
  const pointAt = (t: number) => {
    if (bends.length === 1) {
      const inverse = 1 - t;
      return { x: inverse * inverse * start.x + 2 * inverse * t * control!.x + t * t * end.x, y: inverse * inverse * start.y + 2 * inverse * t * control!.y + t * t * end.y };
    }
    const inverse = 1 - t;
    return { x: inverse ** 3 * start.x + 3 * inverse ** 2 * t * bends[0].x + 3 * inverse * t ** 2 * bends[1].x + t ** 3 * end.x, y: inverse ** 3 * start.y + 3 * inverse ** 2 * t * bends[0].y + 3 * inverse * t ** 2 * bends[1].y + t ** 3 * end.y };
  };
  let length = 0;
  let previous = start;
  for (let index = 1; index <= 24; index += 1) {
    const point = pointAt(index / 24);
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return length;
}

export function arrowGeometry(object: DesignArrowObject) {
  const { start, end, bends } = arrowPoints(object);
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const control = bends.length === 1 ? { x: 2 * bends[0].x - midpoint.x, y: 2 * bends[0].y - midpoint.y } : null;
  const fallbackDirection = { x: end.x - start.x, y: end.y - start.y };
  const startDirection = normaliseArrowDirection(bends.length === 1 ? { x: control!.x - start.x, y: control!.y - start.y } : { x: bends[0].x - start.x, y: bends[0].y - start.y }, fallbackDirection);
  const endDirection = normaliseArrowDirection(bends.length === 1 ? { x: end.x - control!.x, y: end.y - control!.y } : { x: end.x - bends[1].x, y: end.y - bends[1].y }, fallbackDirection);
  const length = arrowCurveLength(start, end, bends, control);
  const startArrowhead = object.startArrowhead === true;
  const endArrowhead = object.arrowhead === true;
  const requestedHeadLength = Math.max(12, object.strokeWidth * 2.5) * arrowheadScale(object);
  const headLengthLimit = length * (startArrowhead && endArrowhead ? 0.4 : 0.48);
  const startHeadLength = startArrowhead ? Math.min(requestedHeadLength, headLengthLimit) : 0;
  const endHeadLength = endArrowhead ? Math.min(requestedHeadLength, headLengthLimit) : 0;
  const startBase = { x: start.x + startDirection.x * startHeadLength, y: start.y + startDirection.y * startHeadLength };
  const endBase = { x: end.x - endDirection.x * endHeadLength, y: end.y - endDirection.y * endHeadLength };
  const headHalfWidth = Math.max(4, object.strokeWidth * 1.1) * arrowheadScale(object);
  const startNormal = { x: -startDirection.y * headHalfWidth, y: startDirection.x * headHalfWidth };
  const endNormal = { x: -endDirection.y * headHalfWidth, y: endDirection.x * headHalfWidth };
  const startLeft = { x: startBase.x + startNormal.x, y: startBase.y + startNormal.y };
  const startRight = { x: startBase.x - startNormal.x, y: startBase.y - startNormal.y };
  const endLeft = { x: endBase.x + endNormal.x, y: endBase.y + endNormal.y };
  const endRight = { x: endBase.x - endNormal.x, y: endBase.y - endNormal.y };
  const path = bends.length === 1
    ? `M ${startBase.x} ${startBase.y} Q ${control!.x} ${control!.y}, ${endBase.x} ${endBase.y}`
    : `M ${startBase.x} ${startBase.y} C ${bends[0].x} ${bends[0].y}, ${bends[1].x} ${bends[1].y}, ${endBase.x} ${endBase.y}`;
  return {
    path,
    startArrowhead: startArrowhead ? `${start.x},${start.y} ${startLeft.x},${startLeft.y} ${startRight.x},${startRight.y}` : null,
    endArrowhead: endArrowhead ? `${end.x},${end.y} ${endLeft.x},${endLeft.y} ${endRight.x},${endRight.y}` : null,
  };
}
