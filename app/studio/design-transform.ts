import { DESIGN_MAX_DIMENSION, type DesignObject } from "./design-model.ts";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export function formatRotationAngle(rotation: number) {
  const normalised = ((Math.round(rotation) % 360) + 360) % 360;
  return `${normalised > 180 ? normalised - 360 : normalised}°`;
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

export function rotationCursorCss(rotation: number) {
  const angle = ((rotation % 360) + 360) % 360;
  // Original Studio cursor artwork, reversed to point towards the object at
  // the bottom handle, then rotated around the fixed screen-space hotspot.
  const path = "M6.5 18.5C10.5 10.5 21.5 10.5 25.5 18.5M6.5 18.5L7.2 13.3M6.5 18.5L11.5 17M25.5 18.5L24.8 13.3M25.5 18.5L20.5 17";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g transform="rotate(${angle + 180} 16 16) translate(16 16) scale(.86) translate(-16 -16)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${path}" stroke="white" stroke-width="4.6"/><path d="${path}" stroke="#17191c" stroke-width="2"/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 16, crosshair`;
}
