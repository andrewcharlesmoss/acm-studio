/** Shared recognition only; workspace owners retain commands, bounds and history. */
export function primaryShortcutModifier(event, platform) {
  if (platform === undefined) return Boolean(event.metaKey) !== Boolean(event.ctrlKey);
  return /Mac|iPhone|iPad|iPod/i.test(platform)
    ? Boolean(event.metaKey && !event.ctrlKey)
    : Boolean(event.ctrlKey && !event.metaKey);
}

export function isNativeEditingTarget(target) {
  const element = typeof target?.closest === "function" ? target : target?.parentElement;
  return Boolean(element && (element.isContentEditable || element.matches?.("input, textarea, select")
    || element.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')));
}

export function workspaceHistoryShortcut(event, platform) {
  if (event.defaultPrevented || event.isComposing || event.altKey || !primaryShortcutModifier(event, platform)) return null;
  const key = event.key?.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (!/Mac|iPhone|iPad|iPod/i.test(platform ?? "") && key === "y" && !event.shiftKey) return "redo";
  return null;
}

export function workspaceZoomShortcut(event, ownsWorkspace, platform) {
  if (!ownsWorkspace || event.defaultPrevented || event.isComposing || event.altKey
    || isNativeEditingTarget(event.target) || !primaryShortcutModifier(event, platform)) return null;
  if (event.key === "0" || event.code === "Digit0" || event.code === "Numpad0") return "reset";
  if (event.key === "+" || event.key === "=" || event.code === "Equal" || event.code === "NumpadAdd") return "in";
  if (event.key === "-" || event.key === "_" || event.code === "Minus" || event.code === "NumpadSubtract") return "out";
  return null;
}
