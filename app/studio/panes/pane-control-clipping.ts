/** Leftmost visible point within the viewport and any scrolling or clipping ancestor. */
export function paneControlVisibleLeft(element: HTMLElement) {
  let left = 0;
  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const overflow = getComputedStyle(ancestor).overflowX;
    if (overflow !== "visible") left = Math.max(left, ancestor.getBoundingClientRect().left + ancestor.clientLeft);
  }
  return left;
}
