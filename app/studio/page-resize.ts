import { DESIGN_MAX_DIMENSION } from "./design-model.ts";
import type { ResizeHandle } from "./design-transform.ts";

export function resizePage<T extends { width: number; height: number }>(page: T, handle: ResizeHandle, dx: number, dy: number, keepRatio: boolean) {
  const minimum = 120;
  const widthDelta = handle.includes("e") ? dx : handle.includes("w") ? -dx : 0;
  const heightDelta = handle.includes("s") ? dy : handle.includes("n") ? -dy : 0;
  let width = Math.max(minimum, Math.min(DESIGN_MAX_DIMENSION, page.width + widthDelta));
  let height = Math.max(minimum, Math.min(DESIGN_MAX_DIMENSION, page.height + heightDelta));
  if (keepRatio) {
    const ratio = page.width / page.height;
    if (Math.abs(dx) >= Math.abs(dy)) height = width / ratio;
    else width = height * ratio;
    const scale = Math.min(1, DESIGN_MAX_DIMENSION / width, DESIGN_MAX_DIMENSION / height);
    width *= scale;
    height *= scale;
  }
  return { ...page, width: Math.round(Math.max(minimum, Math.min(DESIGN_MAX_DIMENSION, width))), height: Math.round(Math.max(minimum, Math.min(DESIGN_MAX_DIMENSION, height))) };
}

export function resizePageFromKey<T extends { width: number; height: number }>(page: T, handle: ResizeHandle, key: string, shiftKey: boolean) {
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) return null;
  const amount = shiftKey ? 10 : 1;
  const dx = key === "ArrowLeft" ? -amount : key === "ArrowRight" ? amount : 0;
  const dy = key === "ArrowUp" ? -amount : key === "ArrowDown" ? amount : 0;
  return resizePage(page, handle, dx, dy, !shiftKey);
}
