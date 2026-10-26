/** Shared creation budgets match the portable website settings validator. */
export const WEBSITE_STYLE_ENTRY_LIMIT = 200;
// A scope can remove its own and an inherited palette without dropping recovery references.
export const WEBSITE_STYLE_RETIRED_ENTRY_LIMIT = 400;
export const WEBSITE_SHADOW_LAYER_LIMIT = 20;
export function canAddWebsiteStyleEntry(...maps: (object | undefined)[]) {
  return new Set(maps.flatMap(value => Object.keys(value ?? {}))).size < WEBSITE_STYLE_ENTRY_LIMIT;
}
