import { isNativeEditingTarget, workspaceHistoryShortcut } from "./workspace-shortcuts.mjs";

const independentSurfaces = ".studio-code-editor, .html-editor-popover, .link-editor-popover, .block-inserter";

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
  const target = event.target;
  const canvas = target?.matches?.("[data-studio-block-anchor-id], [data-studio-nested-block-id]")
    ? target.closest(".editor-canvas-scroll") : null;
  if (action === "undo") undo(); else redo();
  // A structural history step can remove its focused block frame. Restore a
  // stable editor focus only if it disappeared and focus was not moved elsewhere.
  // Rich-text fields, form controls and surviving frames retain their focus.
  if (canvas) target.ownerDocument?.defaultView?.requestAnimationFrame(() => {
    const owner = target.ownerDocument;
    if (!target.isConnected && canvas.isConnected && (!owner.activeElement || owner.activeElement === owner.body || owner.activeElement === owner.documentElement)) canvas.focus({ preventScroll: true });
  });
  return true;
}
