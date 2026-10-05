import type { ComponentPropsWithRef, KeyboardEvent } from "react";

export function StudioMenuItem(props: ComponentPropsWithRef<"button">) {
  return <button type="button" {...props} role="menuitem" />;
}

export function focusStudioMenu(menu: HTMLElement | null) {
  const first = menu?.querySelector<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)');
  if (first) first.focus();
  else menu?.focus();
}

/** Shared navigation, with placement and feature commands owned by consumers. */
export function navigateStudioMenu(event: KeyboardEvent<HTMLElement>, onClose: () => void) {
  if (event.defaultPrevented || event.nativeEvent.isComposing) return;
  if (event.key === "Escape" || event.key === "Tab") {
    if (event.key === "Escape") event.preventDefault();
    event.stopPropagation();
    onClose();
    return;
  }
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const menu = event.currentTarget;
  const items = [...menu.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)')].filter(item => item.closest('[role="menu"]') === menu);
  if (!items.length) return;
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : index < 0 ? (event.key === "ArrowUp" ? items.length - 1 : 0) : (index + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
  event.preventDefault();
  event.stopPropagation();
  items[next]?.focus();
}
