export type RotationPoint = { x: number; y: number };
export type RotationBox = RotationPoint & { width: number; height: number; rotation: number };

export function formatRotationAngle(rotation: number) {
  const normalised = ((Math.round(rotation) % 360) + 360) % 360;
  return `${normalised > 180 ? normalised - 360 : normalised}°`;
}

export function rotationCursorCss(rotation: number) {
  const angle = ((rotation % 360) + 360) % 360;
  // Original Studio cursor artwork, reversed to point towards the object at
  // the bottom handle, then rotated around the fixed screen-space hotspot.
  const path = "M6.5 18.5C10.5 10.5 21.5 10.5 25.5 18.5M6.5 18.5L7.2 13.3M6.5 18.5L11.5 17M25.5 18.5L24.8 13.3M25.5 18.5L20.5 17";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g transform="rotate(${angle + 180} 16 16) translate(16 16) scale(.86) translate(-16 -16)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${path}" stroke="white" stroke-width="4.6"/><path d="${path}" stroke="#17191c" stroke-width="2"/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 16, crosshair`;
}

export function rotationPointerAngle(box: RotationBox, point: RotationPoint) {
  return Math.atan2(point.y - box.y - box.height / 2, point.x - box.x - box.width / 2);
}

export function rotationFromPointer(box: RotationBox, startAngle: number | undefined, point: RotationPoint) {
  const angle = rotationPointerAngle(box, point);
  return (box.rotation + (angle - (startAngle ?? angle)) * 180 / Math.PI + 360) % 360;
}

export function rotationFromKey(rotation: number, key: string, shift: boolean) {
  if (key !== "ArrowLeft" && key !== "ArrowRight") return null;
  const amount = shift ? 15 : 5;
  return (rotation + (key === "ArrowLeft" ? -amount : amount) + 360) % 360;
}

export function rotationBadgePoint(object: RotationBox, cursor: RotationPoint | null, controlScale: number) {
  const fallback = { x: object.x + object.width / 2, y: object.y + object.height + 90 * controlScale };
  const pagePoint = cursor ? { x: cursor.x + 44 * controlScale, y: cursor.y - 44 * controlScale } : fallback;
  const centre = { x: object.x + object.width / 2, y: object.y + object.height / 2 };
  const radians = -object.rotation * Math.PI / 180;
  const dx = pagePoint.x - centre.x;
  const dy = pagePoint.y - centre.y;
  return { x: object.width / 2 + dx * Math.cos(radians) - dy * Math.sin(radians), y: object.height / 2 + dx * Math.sin(radians) + dy * Math.cos(radians) };
}
