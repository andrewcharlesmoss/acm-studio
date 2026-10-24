import { DESIGN_MAX_DIMENSION, type DesignObject } from "./design-model.ts";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export { formatRotationAngle, rotationCursorCss } from "./controls/rotation-geometry.ts";

/** Corner handles keep visual proportions by default; edge handles resize one axis unless Shift locks the ratio. */
export function shouldKeepResizeRatio(object: DesignObject, handle: ResizeHandle, shiftKey: boolean) {
  if (object.type === "text" || object.type === "arrow") return false;
  const edgeHandle = handle === "n" || handle === "e" || handle === "s" || handle === "w";
  return edgeHandle ? shiftKey : !shiftKey;
}

// Pointer deltas arrive in page coordinates; dimensions belong to the rotated
// object's local axes. Move its centre so the opposite corner stays anchored.
// Allow page-edge overflow, as rotation already does: page-axis clamping would
// move that anchor or detach the dragged corner from the pointer. Export clips
// objects to the page; the dimension limit still bounds the editable object.
export function resizeRotatedObject(object: DesignObject, handle: ResizeHandle, dx: number, dy: number, keepRatio: boolean, centred: boolean) {
  const radians = object.rotation * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;
  const horizontal = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const vertical = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  const factor = centred ? 2 : 1;
  const changeX = horizontal * localX * factor;
  const changeY = vertical * localY * factor;
  let width = object.width + changeX;
  let height = object.height + changeY;
  if (keepRatio && object.width > 0 && object.height > 0) {
    const scaleX = width / object.width;
    const scaleY = height / object.height;
    const requested = !vertical || (horizontal && Math.abs(scaleX - 1) >= Math.abs(scaleY - 1)) ? scaleX : scaleY;
    const maximumScale = DESIGN_MAX_DIMENSION / Math.max(object.width, object.height);
    const minimumScale = Math.min(maximumScale, 10 / Math.min(object.width, object.height));
    const scale = Math.max(minimumScale, Math.min(maximumScale, requested));
    width = object.width * scale;
    height = object.height * scale;
  } else {
    width = Math.max(10, Math.min(DESIGN_MAX_DIMENSION, width));
    height = Math.max(10, Math.min(DESIGN_MAX_DIMENSION, height));
  }
  const centreShiftX = centred ? 0 : horizontal * (width - object.width) / 2;
  const centreShiftY = centred ? 0 : vertical * (height - object.height) / 2;
  return {
    ...object, width, height,
    x: object.x + object.width / 2 + centreShiftX * cos - centreShiftY * sin - width / 2,
    y: object.y + object.height / 2 + centreShiftX * sin + centreShiftY * cos - height / 2,
  };
}

export function resizeCursor(handle: ResizeHandle, rotation: number) {
  const handleAngles: Record<ResizeHandle, number> = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 };
  const axis = ((handleAngles[handle] + rotation) % 180 + 180) % 180;
  const direction = Math.round(axis / 45) % 4;
  return ["ns-resize", "nesw-resize", "ew-resize", "nwse-resize"][direction];
}

export function resizeFromKey(object: DesignObject, handle: ResizeHandle, key: string, shiftKey: boolean) {
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) return null;
  const amount = shiftKey ? 10 : 1;
  const dx = key === "ArrowLeft" ? -amount : key === "ArrowRight" ? amount : 0;
  const dy = key === "ArrowUp" ? -amount : key === "ArrowDown" ? amount : 0;
  return resizeRotatedObject(object, handle, dx, dy, shouldKeepResizeRatio(object, handle, shiftKey), false);
}

/** Geometry only; hosts supply snapping, bounds, ownership, and transactions. */
export function moveDesignObject<T extends { x: number; y: number }>(object: T, dx: number, dy: number, minimum = -Infinity): T {
  return { ...object, x: Math.max(minimum, object.x + dx), y: Math.max(minimum, object.y + dy) };
}

export function moveDesignObjectFromKey<T extends { x: number; y: number }>(object: T, key: string, shift: boolean): T | null {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return null;
  const amount = shift ? 10 : 1;
  return moveDesignObject(object, key === "ArrowLeft" ? -amount : key === "ArrowRight" ? amount : 0, key === "ArrowUp" ? -amount : key === "ArrowDown" ? amount : 0);
}
