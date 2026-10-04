/** Toolbar menus prefer below their trigger and use the larger side if needed. */
export function anchoredMenuPosition({ anchor, width, height, viewportWidth, viewportHeight, viewportLeft = 0, viewportTop = 0, align = "start" }) {
  const inset = 8;
  const gap = 8;
  const maxWidth = Math.max(1, viewportWidth - inset * 2);
  const placedWidth = Math.min(width, maxWidth);
  const above = Math.max(1, Math.min(viewportHeight - inset * 2, anchor.top - viewportTop - inset - gap));
  const below = Math.max(1, Math.min(viewportHeight - inset * 2, viewportTop + viewportHeight - anchor.bottom - inset - gap));
  const openBelow = height <= below || (height > above && below >= above);
  const maxHeight = openBelow ? below : above;
  const placedHeight = Math.min(height, maxHeight);
  const preferredLeft = align === "end" ? anchor.right - placedWidth : anchor.left;
  const preferredTop = openBelow ? anchor.bottom + gap : anchor.top - placedHeight - gap;
  return {
    left: Math.max(viewportLeft + inset, Math.min(preferredLeft, viewportLeft + viewportWidth - placedWidth - inset)),
    top: Math.max(viewportTop + inset, Math.min(preferredTop, viewportTop + viewportHeight - placedHeight - inset)),
    maxWidth,
    maxHeight,
  };
}

/** Resize/scroll tracking is shared by canvas and Library consumers. */
export function watchAnchoredMenu(anchor, popup, align, onPosition) {
  function place() {
    const viewport = window.visualViewport;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const maxWidth = Math.max(1, viewportWidth - 16);
    popup.style.maxWidth = `${maxWidth}px`;
    // Measure scrollHeight without temporarily expanding the menu. Expansion
    // clamps scrollTop and can move the keyboard-focused last item out of view.
    const bounds = popup.getBoundingClientRect();
    const position = anchoredMenuPosition({
      anchor: anchor.getBoundingClientRect(), width: bounds.width,
      height: Math.max(bounds.height, popup.scrollHeight),
      viewportWidth, viewportHeight, viewportLeft: viewport?.offsetLeft ?? 0,
      viewportTop: viewport?.offsetTop ?? 0, align,
    });
    popup.style.maxHeight = `${position.maxHeight}px`;
    onPosition(position);
  }
  place();
  const observer = new ResizeObserver(place);
  observer.observe(anchor);
  observer.observe(popup);
  window.addEventListener("resize", place);
  window.addEventListener("scroll", place, true);
  window.visualViewport?.addEventListener("resize", place);
  window.visualViewport?.addEventListener("scroll", place);
  return () => {
    observer.disconnect();
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", place, true);
    window.visualViewport?.removeEventListener("resize", place);
    window.visualViewport?.removeEventListener("scroll", place);
  };
}
