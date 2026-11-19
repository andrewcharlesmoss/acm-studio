import type { ResizeHandle } from "../design-transform.ts";
import { resizePage } from "../page-resize.ts";
import { motionDimensionLimit } from "./motion-asset.ts";

export type MotionSize = { width: number; height: number };

const shortSideLimit = 1080;
const longSideLimit = motionDimensionLimit(shortSideLimit);

export function resizeMotion<T extends MotionSize>(
  size: T, handle: ResizeHandle, dx: number, dy: number, keepRatio: boolean, previous: MotionSize = size,
): T {
  const target = resizePage(size, handle, dx, dy, false);
  const reference = keepRatio ? size : target;
  let landscape = reference.width >= reference.height;
  if (!keepRatio && target.width > shortSideLimit && target.height > shortSideLimit) {
    // Keep the last valid orientation while neither requested side fits the short limit.
    if (previous.width > shortSideLimit) landscape = true;
    else if (previous.height > shortSideLimit) landscape = false;
  }
  const maxWidth = landscape ? longSideLimit : shortSideLimit;
  const maxHeight = landscape ? shortSideLimit : longSideLimit;
  if (!keepRatio) {
    return { ...size, width: Math.max(128, Math.min(maxWidth, target.width)), height: Math.max(128, Math.min(maxHeight, target.height)) };
  }
  const scaleX = target.width / size.width;
  const scaleY = target.height / size.height;
  const requested = Math.abs(scaleX - 1) >= Math.abs(scaleY - 1) ? scaleX : scaleY;
  const minimum = Math.max(128 / size.width, 128 / size.height);
  const maximum = Math.min(maxWidth / size.width, maxHeight / size.height);
  const scale = Math.max(minimum, Math.min(maximum, requested));
  return { ...size, width: Math.round(size.width * scale), height: Math.round(size.height * scale) };
}
