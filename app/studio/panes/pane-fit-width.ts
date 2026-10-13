/** Measure primary controls without forcing descriptive copy onto one line. */
export function fitPaneWidth(pane: HTMLElement, minWidth: number, maxWidth: number): number {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return minWidth;
  const visible = (element: Element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
  const insets = (element: Element) => {
    const style = getComputedStyle(element);
    return [style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth]
      .reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
  };
  function textWidth(element: Element): number {
    let result = 0;
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.replace(/\s+/g, " ").trim() ?? "";
        const style = getComputedStyle(element);
        context!.font = style.font || `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        result += context!.measureText(text).width + Math.max(0, text.length - 1) * (parseFloat(style.letterSpacing) || 0);
      } else if (child instanceof Element && visible(child)) {
        const style = getComputedStyle(child);
        // Descriptions may wrap; visually hidden labels don't affect geometry.
        if (child.matches("small, p, input, select, textarea") || style.position === "absolute" || style.position === "fixed") continue;
        result += child instanceof SVGElement ? child.getBoundingClientRect().width : intrinsicWidth(child);
      }
    }
    return result;
  }
  function intrinsicWidth(element: Element) {
    const style = getComputedStyle(element);
    const children = [...element.children].filter(child => visible(child) && !child.matches("small, p, input, select, textarea") && !["absolute", "fixed"].includes(getComputedStyle(child).position));
    const gaps = Math.max(0, children.length - 1) * (parseFloat(style.columnGap) || 0);
    const minimum = style.minWidth.endsWith("px") ? parseFloat(style.minWidth) : 0;
    // Square leaf marks reserve their frame, not just the initial inside it.
    const rect = element.getBoundingClientRect();
    const markWidth = element.matches("span") && element.children.length === 0 && ["flex", "inline-flex", "grid", "inline-grid"].includes(style.display) && Math.abs(rect.width - rect.height) < 1 ? rect.width : 0;
    return Math.max(textWidth(element) + insets(element) + gaps, markWidth, minimum + (style.boxSizing === "border-box" ? 0 : insets(element)));
  }
  function outerInsets(element: Element) {
    let result = 0;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      result += insets(parent);
      if (parent === pane) break;
    }
    return result;
  }
  let required = minWidth;
  for (const element of pane.querySelectorAll("button, a, strong, h2, h3, label")) {
    if (!visible(element) || element.closest('[role="tablist"]')) continue;
    required = Math.max(required, intrinsicWidth(element) + outerInsets(element));
  }
  for (const row of pane.querySelectorAll('[role="tablist"]')) {
    if (!visible(row)) continue;
    const tabs = [...row.querySelectorAll('[role="tab"]')].filter(visible);
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    // Respect the owning row's allocation, including unequal tab columns.
    const allocated = tabs.map(tab => tab.getBoundingClientRect().width);
    const total = allocated.reduce((sum, value) => sum + value, 0);
    const contentWidth = Math.max(0, ...tabs.map((tab, index) => intrinsicWidth(tab) / (total > 0 ? allocated[index] / total : 1 / tabs.length)));
    required = Math.max(required, contentWidth + gap * Math.max(0, tabs.length - 1) + insets(row) + outerInsets(row));
  }
  return Math.max(minWidth, Math.min(maxWidth, Math.ceil(required)));
}
