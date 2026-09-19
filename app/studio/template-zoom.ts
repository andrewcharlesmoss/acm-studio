export const TEMPLATE_ZOOM_MIN = 50;
export const TEMPLATE_ZOOM_MAX = 200;
export const TEMPLATE_ZOOM_STEP = 10;
export const TEMPLATE_ZOOM_DEFAULT = 100;

export type TemplateZoomAction = "in" | "out" | "reset";

type TemplateZoomShortcutEvent = {
  key?: string;
  code?: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  defaultPrevented?: boolean;
  target?: unknown;
};

function isNativeEditingTarget(target: unknown) {
  if (!target || typeof target !== "object") return false;
  const candidate = target as { isContentEditable?: boolean; closest?: (selector: string) => unknown };
  return Boolean(candidate.isContentEditable || candidate.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable=""]'));
}

export function templateZoomShortcut(event: TemplateZoomShortcutEvent, ownsWorkspace: boolean): TemplateZoomAction | null {
  if (!ownsWorkspace || event.defaultPrevented || event.altKey || isNativeEditingTarget(event.target)) return null;
  if (!event.metaKey && !event.ctrlKey) return null;

  if (event.key === "0" || event.code === "Digit0" || event.code === "Numpad0") return "reset";
  if (event.key === "+" || event.key === "=" || event.code === "Equal" || event.code === "NumpadAdd") return "in";
  if (event.key === "-" || event.key === "_" || event.code === "Minus" || event.code === "NumpadSubtract") return "out";
  return null;
}

export function changeTemplateZoom(value: number, action: TemplateZoomAction) {
  if (action === "reset") return TEMPLATE_ZOOM_DEFAULT;
  const next = value + (action === "in" ? TEMPLATE_ZOOM_STEP : -TEMPLATE_ZOOM_STEP);
  return Math.max(TEMPLATE_ZOOM_MIN, Math.min(TEMPLATE_ZOOM_MAX, next));
}
