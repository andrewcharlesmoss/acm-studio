const independentSurfaces = ".site-settings, .site-codex, .studio-code-editor, .html-editor-popover, .link-editor-popover, .block-inserter, .mini-golf-runtime-table, .mini-golf-editor-surface .setup, .mini-golf-editor-surface .table-size-control";

export function isIndependentHistoryTarget(target) {
  const element = typeof target?.closest === "function" ? target : target?.parentElement;
  if (!element) return false;
  if (element.closest("[data-studio-table-authoring]") && element.closest(".block-canvas")) return false;
  if (element.closest(independentSurfaces)) return true;
  const editable = element.isContentEditable || element.matches?.("input, textarea, select") || element.closest('[contenteditable="true"], [contenteditable=""]');
  return Boolean(editable && !element.closest(".block-canvas"));
}

/** Resolve editor history commands without consuming unrelated platform shortcuts. */
export function studioHistoryShortcut(event, platform) {
  if (event.defaultPrevented || event.altKey || isIndependentHistoryTarget(event.target)) return null;
  const mac = /Mac|iPhone|iPad|iPod/i.test(platform);
  if (mac ? !event.metaKey || event.ctrlKey : !event.ctrlKey || event.metaKey) return null;
  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (!mac && key === "y" && !event.shiftKey) return "redo";
  return null;
}

export function handleStudioHistoryShortcut(event, platform, undo, redo) {
  const action = studioHistoryShortcut(event, platform);
  if (!action) return false;
  event.preventDefault();
  if (action === "undo") undo(); else redo();
  return true;
}
