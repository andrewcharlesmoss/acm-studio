import { stylePalettes, styleTypography, styleVariations } from "./style-reference-data";
import type { PreviewScope } from "./identity-preview-state";

export type PaletteId = typeof stylePalettes[number]["id"];
export type TypographyId = typeof styleTypography[number]["id"];
export type StyleSelection = { paletteId: PaletteId; typographyId: TypographyId };
type StyleValues = { global: StyleSelection; test: Partial<StyleSelection>; test2: Partial<StyleSelection> };
type StyleHistory = { past: StyleValues[]; present: StyleValues; future: StyleValues[] };
export type StyleAction = { type: "change"; scope: PreviewScope; patch: Partial<StyleSelection> } | { type: "inherit"; scope: "test" | "test2" } | { type: "undo" } | { type: "redo" };

export function createStylesPreview(): StyleHistory {
  return { past: [], present: { global: { paletteId: "default", typographyId: "default" }, test: {}, test2: {} }, future: [] };
}

export function resolvePreviewStyle(values: StyleValues, scope: PreviewScope): StyleSelection {
  return { ...values.global, ...values[scope] };
}

export function stylesPreviewReducer(state: StyleHistory, action: StyleAction): StyleHistory {
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    return previous ? { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] } : state;
  }
  if (action.type === "redo") {
    const next = state.future[0];
    return next ? { past: [...state.past, state.present], present: next, future: state.future.slice(1) } : state;
  }
  const next = action.type === "inherit" ? {} : { ...state.present[action.scope], ...action.patch };
  if (JSON.stringify(next) === JSON.stringify(state.present[action.scope])) return state;
  return { past: [...state.past, state.present].slice(-60), present: { ...state.present, [action.scope]: next }, future: [] };
}

export function previewStyleDetails(selection: StyleSelection) {
  return {
    palette: stylePalettes.find(item => item.id === selection.paletteId)!,
    typography: styleTypography.find(item => item.id === selection.typographyId)!,
    variation: styleVariations.find(item => item.paletteId === selection.paletteId && item.typographyId === selection.typographyId),
  };
}
