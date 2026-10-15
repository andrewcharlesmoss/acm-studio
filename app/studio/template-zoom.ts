import { workspaceZoomShortcut } from "./workspace-shortcuts.mjs";

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

export function templateZoomShortcut(event: TemplateZoomShortcutEvent, ownsWorkspace: boolean, platform?: string): TemplateZoomAction | null {
  return workspaceZoomShortcut(event, ownsWorkspace, platform);
}

export function changeTemplateZoom(value: number, action: TemplateZoomAction) {
  if (action === "reset") return TEMPLATE_ZOOM_DEFAULT;
  const next = value + (action === "in" ? TEMPLATE_ZOOM_STEP : -TEMPLATE_ZOOM_STEP);
  return Math.max(TEMPLATE_ZOOM_MIN, Math.min(TEMPLATE_ZOOM_MAX, next));
}
