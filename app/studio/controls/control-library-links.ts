/** Stable component-to-catalogue associations; no feature supplies its own URL. */
export const controlLibraryLinks = {
  "text-input": "/studio/ui/controls#text-input",
  "text-area": "/studio/ui/controls#text-area",
  "select-dropdown": "/studio/ui/controls#select-dropdown",
  "search-field": "/studio/ui/controls#search-field",
  "number-field": "/studio/ui/controls#number-field",
  "number-unit-field": "/studio/ui/controls#number-unit-field",
  button: "/studio/ui/controls#button",
  "slider-foundation": "/studio/ui/controls#slider-foundation",
  tooltip: "/studio/ui/controls#tooltip",
  "form-field": "/studio/ui/controls#form-field",
  checkbox: "/studio/ui/controls#checkbox",
  "radio-group": "/studio/ui/controls#radio-group",
  "text-action": "/studio/ui/controls#text-action",
} as const;

export function controlLibraryAttributes(id: keyof typeof controlLibraryLinks) {
  return { "data-studio-control": id, "data-studio-library-href": controlLibraryLinks[id] };
}
