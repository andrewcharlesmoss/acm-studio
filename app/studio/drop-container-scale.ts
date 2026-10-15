/** Computed CSS width retains fractions that offsetWidth rounds away. */
export function dropContainerScale(element: HTMLElement): number {
  const bounds = element.getBoundingClientRect();
  const style = element.ownerDocument?.defaultView?.getComputedStyle(element);
  const width = style ? Number.parseFloat(style.width) : NaN;
  const extra = style?.boxSizing === "border-box" ? 0 : style ? [style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth].reduce((sum, value) => sum + (Number.parseFloat(value) || 0), 0) : 0;
  const unscaled = Number.isFinite(width) && width + extra > 0 ? width + extra : element.offsetWidth;
  return unscaled ? bounds.width / unscaled : 1;
}
