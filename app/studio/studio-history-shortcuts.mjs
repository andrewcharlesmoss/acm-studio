import { isNativeEditingTarget, workspaceHistoryShortcut } from "./workspace-shortcuts.mjs";

const independentSurfaces = ".site-settings, .site-codex, .studio-code-editor, .html-editor-popover, .link-editor-popover, .block-inserter, .mini-golf-runtime-table, .mini-golf-editor-surface .setup, .mini-golf-editor-surface .table-size-control";

export function isIndependentHistoryTarget(target) {
  const element = typeof target?.closest === "function" ? target : target?.parentElement;
  if (!element) return false;
  if (element.closest("[data-studio-table-authoring]") && element.closest(".block-canvas")) return false;
  if (element.closest(independentSurfaces)) return true;
  if (element.closest(".rich-text-editor") && element.closest("[data-studio-rich-text-history]")) return false;
  const editable = isNativeEditingTarget(element);
  return Boolean(editable && !element.closest(".block-canvas"));
}

/** Resolve editor history commands without consuming unrelated platform shortcuts. */
export function studioHistoryShortcut(event, platform) {
  if (isIndependentHistoryTarget(event.target)) return null;
  return workspaceHistoryShortcut(event, platform);
}

export function handleStudioHistoryShortcut(event, platform, undo, redo) {
  const action = studioHistoryShortcut(event, platform);
  if (!action) return false;
  event.preventDefault();
  if (action === "undo") undo(); else redo();
  return true;
}
