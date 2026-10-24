export type ResizeGestureEnd = "pointer-up" | "pointer-cancel" | "capture-loss" | "escape";

/** Capture loss finalises the last displayed size; explicit cancellation restores the starting value. */
export function shouldCommitResizeGesture(end: ResizeGestureEnd) {
  return end === "pointer-up" || end === "capture-loss";
}
