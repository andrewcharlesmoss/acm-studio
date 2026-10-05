import type { ParagraphStyle } from "./model";
import { paragraphStyleToCss } from "./paragraph-styles";

// Gutenberg applies spacing to the figure and text/colour/border to its table.
// Keep the caption outside those table-specific overrides in Edit and Preview.
export function tablePresentation(style?: ParagraphStyle) {
  const css = paragraphStyleToCss(style);
  const wrapper: Record<string, string> = {};
  const table: Record<string, string> = {};
  const wrapperProperties = new Set(["padding", "margin", "width", "minWidth", "maxWidth", "height", "minHeight", "maxHeight"]);
  for (const [property, value] of Object.entries(css)) {
    (wrapperProperties.has(property) ? wrapper : table)[property] = value;
  }
  const hasBorder = Boolean(table.borderStyle || table.borderWidth || table.borderColor);
  if (hasBorder) {
    table.borderStyle ??= "solid";
    table.borderWidth ??= "1px";
  }
  return { wrapper, table, hasBorder };
}
