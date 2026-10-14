/** Captured drags keep native-style edge scrolling without changing saved data. */
export function startDragAutoScroll(handle: HTMLElement, point: () => { x: number; y: number } | null, onScroll: () => void): () => void {
  const view = handle.ownerDocument.defaultView;
  if (!view) return () => {};
  let cancelled = false;
  let frame = 0;
  const step = () => {
    if (cancelled) return;
    const cursor = point();
    if (!cursor) return;
    let changed = false;
    let vertical = false, horizontal = false;
    for (let owner = handle.parentElement; owner; owner = owner.parentElement) {
      const style = view.getComputedStyle(owner);
      const box = owner.getBoundingClientRect();
      if (cursor.x < box.left - 24 || cursor.x > box.right + 24 || cursor.y < box.top - 24 || cursor.y > box.bottom + 24) continue;
      const delta = (value: number, start: number, end: number) => value < start + 24 ? -8 : value > end - 24 ? 8 : 0;
      if (!vertical && /auto|scroll/.test(style.overflowY) && owner.scrollHeight > owner.clientHeight) {
        const previous = owner.scrollTop;
        owner.scrollTop += delta(cursor.y, box.top, box.bottom);
        vertical = owner.scrollTop !== previous; changed ||= vertical;
      }
      if (!horizontal && /auto|scroll/.test(style.overflowX) && owner.scrollWidth > owner.clientWidth) {
        const previous = owner.scrollLeft;
        owner.scrollLeft += delta(cursor.x, box.left, box.right);
        horizontal = owner.scrollLeft !== previous; changed ||= horizontal;
      }
    }
    if (changed) onScroll();
    frame = view.requestAnimationFrame(step);
  };
  frame = view.requestAnimationFrame(step);
  return () => { cancelled = true; view.cancelAnimationFrame(frame); };
}
