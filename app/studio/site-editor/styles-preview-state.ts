import { stylePalettes, styleTypography, styleVariations } from "./style-reference-data";
import { mergeTypographySettings, validFontSizePreset, type TypographySettings, type TypographyFields, type TypographyRole, type FontSizePreset } from "./typography-preview-model";
import type { PreviewScope } from "./identity-preview-state";

export type PaletteId = typeof stylePalettes[number]["id"];
export type TypographyId = typeof styleTypography[number]["id"];
export type StyleSelection = { paletteId: PaletteId; typographyId: TypographyId; typography?: TypographySettings };
type StyleValues = { global: StyleSelection; test: Partial<StyleSelection>; test2: Partial<StyleSelection> };
type StyleHistory = { past: StyleValues[]; present: StyleValues; future: StyleValues[] };
export type StyleAction = { type: "change"; scope: PreviewScope; patch: Partial<StyleSelection> } | { type: "inherit"; scope: "test" | "test2" } | { type: "reset"; scope: PreviewScope } | { type: "element"; scope: PreviewScope; role: TypographyRole; patch: TypographyFields } | { type: "reset-element"; scope: PreviewScope; role: TypographyRole } | { type: "font-preset"; scope: PreviewScope; id: string; preset: FontSizePreset | null | undefined } | { type: "fonts"; scope: PreviewScope; families: string[] } | { type: "undo" } | { type: "redo" };

export function createStylesPreview(): StyleHistory {
  return { past: [], present: { global: { paletteId: "default", typographyId: "default" }, test: {}, test2: {} }, future: [] };
}

export function resolvePreviewStyle(values: StyleValues, scope: PreviewScope): StyleSelection {
  const selection = { ...values.global, ...values[scope] };
  if (values.global.typography || values[scope].typography) selection.typography = mergeTypographySettings(values.global.typography, scope === "global" ? {} : values[scope].typography);
  return selection;
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
  const current = state.present[action.scope];
  let next: Partial<StyleSelection>;
  if (action.type === "reset") next = action.scope === "global" ? { paletteId: "default", typographyId: "default" } : {};
  else if (action.type === "inherit") next = {};
  else if (action.type === "change") {
    next = { ...current, ...action.patch };
    if (action.patch.typographyId && current.typography?.elements) next.typography = { ...current.typography, elements: {} };
  } else {
    const typography: TypographySettings = { ...current.typography };
    if (action.type === "element" || action.type === "reset-element") {
      typography.elements = { ...typography.elements };
      if (action.type === "reset-element") delete typography.elements[action.role];
      else {
        const fields = { ...typography.elements[action.role], ...action.patch };
        for (const key of Object.keys(fields) as (keyof TypographyFields)[]) if (fields[key] === undefined) delete fields[key];
        typography.elements[action.role] = fields;
      }
    } else if (action.type === "font-preset") {
      if (action.preset && !validFontSizePreset(action.preset)) return state;
      typography.presets = { ...typography.presets };
      if (action.preset === undefined) delete typography.presets[action.id]; else typography.presets[action.id] = action.preset;
    } else typography.enabledFonts = [...new Set(action.families)];
    next = { ...current, typography };
  }
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
