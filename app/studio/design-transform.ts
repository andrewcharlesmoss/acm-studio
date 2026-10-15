import { DESIGN_MAX_DIMENSION, type DesignObject } from "./design-model.ts";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export { formatRotationAngle, rotationCursorCss } from "./controls/rotation-geometry.ts";

/** Visual objects scale proportionally; text boxes reflow and arrows edit endpoints. */
export function shouldKeepResizeRatio(object: DesignObject, shiftKey: boolean) {
  return !shiftKey && object.type !== "text" && object.type !== "arrow";
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
