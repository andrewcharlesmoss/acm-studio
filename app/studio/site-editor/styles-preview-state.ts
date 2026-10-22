import { mergePreviewBlockStyles, patchPreviewBlockViewport, type PreviewBlockId, replacePreviewBlockStyle, type PreviewBlockStyle, type PreviewBlockStyles } from "./blocks-preview-model";
import { type StyleViewport } from "../../content/responsive-styles";
import { stylePalettes, styleTypography, styleVariations } from "./style-reference-data";
import { mergeTypographySettings, validFontSizePreset, type TypographySettings, type TypographyFields, type TypographyRole, type FontSizePreset } from "./typography-preview-model";
import { mergePreviewColours, resolveColourPalette, type PreviewColours, type PreviewPalette } from "./colours-preview-model";
import { mergePreviewBackground, patchPreviewBackground, equalPreviewBackground, backgroundImageFields, type PreviewBackground } from "./background-preview-model";
import { mergePreviewShadows, removeCustomShadowPresets, type PreviewShadows, type PreviewShadowPreset } from "./shadows-preview-model";
import { patchPreviewLayout, type PreviewLayout } from "./layout-preview-model";
import type { PreviewScope } from "./identity-preview-state";

export type PaletteId = typeof stylePalettes[number]["id"];
export type TypographyId = typeof styleTypography[number]["id"];
export type StyleSelection = { paletteId: PaletteId; typographyId: TypographyId; typography?: TypographySettings; additionalCss?: string; colours?: PreviewColours; background?: PreviewBackground; shadows?: PreviewShadows; layout?: PreviewLayout; blockStyles?: PreviewBlockStyles };
export type StyleValues = { global: Partial<StyleSelection>; test: Partial<StyleSelection>; test2: Partial<StyleSelection> };
export type StyleHistory = { past: StyleValues[]; present: StyleValues; future: StyleValues[] };
function withInteractionStates(base: PreviewBlockStyle, interactionStates: NonNullable<PreviewBlockStyle["interactionStates"]>): PreviewBlockStyle {
  const result = { ...base };
  if (Object.keys(interactionStates).length) result.interactionStates = interactionStates;
  else delete result.interactionStates;
  return result;
}
type PreviewPseudoState = "hover" | "focus" | "focus-visible" | "active";
export type StyleAction = { type: "hydrate"; values: StyleValues } | { type: "block-style"; scope: PreviewScope; block: PreviewBlockId; variation?: string; viewport?: StyleViewport; pseudoState?: PreviewPseudoState; patch: Partial<PreviewBlockStyle> } | { type: "reset-block-style"; scope: PreviewScope; block?: PreviewBlockId; variation?: string; viewport?: StyleViewport; pseudoState?: PreviewPseudoState } | { type: "remove-custom-shadows"; scope: PreviewScope } | { type: "layout"; scope: PreviewScope; patch: PreviewLayout } | { type: "reset-layout"; scope: PreviewScope; field?: keyof PreviewLayout } | { type: "shadow"; scope: PreviewScope; id: string; patch: Partial<Omit<PreviewShadowPreset, "id">> } | { type: "reset-shadow"; scope: PreviewScope; id?: string } | { type: "delete-shadow"; scope: PreviewScope; id: string } | { type: "background"; scope: PreviewScope; patch: PreviewBackground } | { type: "reset-background"; scope: PreviewScope; field?: "image" | "colour" | "gradient" } | { type: "remove-custom-colours"; scope: PreviewScope } | { type: "reset-colour-elements"; scope: PreviewScope } | { type: "reset-theme-colours"; scope: PreviewScope } | { type: "colour-palette"; scope: PreviewScope; paletteId: PaletteId } | { type: "remove-colour"; scope: PreviewScope; id: string } | { type: "remove-gradient"; scope: PreviewScope; id: string } | { type: "colours"; scope: PreviewScope; patch: PreviewColours } | { type: "reset-colours"; scope: PreviewScope; role?: TypographyRole } | { type: "reset-css"; scope: PreviewScope } | { type: "change"; scope: PreviewScope; patch: Partial<StyleSelection> } | { type: "inherit"; scope: "test" | "test2" } | { type: "reset"; scope: PreviewScope; defaults?: Partial<StyleSelection> } | { type: "element"; scope: PreviewScope; role: TypographyRole; patch: TypographyFields } | { type: "reset-element"; scope: PreviewScope; role: TypographyRole } | { type: "reset-element-fields"; scope: PreviewScope; role: TypographyRole; fields: readonly (keyof TypographyFields)[] } | { type: "font-preset"; scope: PreviewScope; id: string; preset: FontSizePreset | null | undefined } | { type: "fonts"; scope: PreviewScope; families: string[]; disabledFamilies?: string[] } | { type: "undo" } | { type: "redo" };

export function createStylesPreview(): StyleHistory {
  return { past: [], present: { global: { paletteId: "default", typographyId: "default" }, test: {}, test2: {} }, future: [] };
}

export function resolvePreviewStyle(values: StyleValues, scope: PreviewScope): StyleSelection {
  const selection: StyleSelection = { paletteId: "default", typographyId: "default", ...values.global, ...values[scope] };
  if (values.global.typography || values[scope].typography) selection.typography = mergeTypographySettings(values.global.typography, scope === "global" ? {} : values[scope].typography);
  if (values.global.colours || values[scope].colours) selection.colours = mergePreviewColours(values.global.colours, scope === "global" ? {} : values[scope].colours);
  if (values.global.background || values[scope].background) selection.background = mergePreviewBackground(values.global.background, scope === "global" ? {} : values[scope].background);
  if (values.global.shadows || values[scope].shadows) selection.shadows = mergePreviewShadows(values.global.shadows, scope === "global" ? {} : values[scope].shadows);
  if (values.global.layout || values[scope].layout) selection.layout = { ...values.global.layout, ...(scope === "global" ? {} : values[scope].layout) };
  if (values.global.blockStyles || values[scope].blockStyles) selection.blockStyles = mergePreviewBlockStyles(values.global.blockStyles, scope === "global" ? {} : values[scope].blockStyles);
  return selection;
}

export function stylesPreviewReducer(state: StyleHistory, action: StyleAction): StyleHistory {
  if (action.type === "hydrate") return { past: [], present: action.values, future: [] };
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
  if (action.type === "block-style") {
    const owned = current.blockStyles?.[action.block] ?? {};
    const base = action.variation ? owned.variations?.[action.variation] ?? {} : owned;
    let value: PreviewBlockStyle;
    if (action.pseudoState) {
      const interactionStates = { ...base.interactionStates };
      const stateStyle = patchPreviewBlockViewport(interactionStates[action.pseudoState] ?? {}, action.viewport ?? "desktop", action.patch);
      if (Object.keys(stateStyle).length) interactionStates[action.pseudoState] = stateStyle; else delete interactionStates[action.pseudoState];
      value = withInteractionStates(base, interactionStates);
    } else value = patchPreviewBlockViewport(base, action.viewport ?? "desktop", action.patch);
    const result = action.variation ? { ...owned, variations: { ...owned.variations, [action.variation]: value } } : value;
    const blockStyles = { ...current.blockStyles, [action.block]: result };
    if (!Object.keys(blockStyles[action.block]!).length) delete blockStyles[action.block];
    next = { ...current, blockStyles };
    if (!Object.keys(blockStyles).length) delete next.blockStyles;
  } else if (action.type === "reset-block-style") {
    next = { ...current };
    if (!action.block) delete next.blockStyles;
    else {
      next.blockStyles = { ...current.blockStyles };
      const owned = current.blockStyles?.[action.block] ?? {};
      let retained: PreviewBlockStyle | undefined;
      if (action.variation) {
        retained = { ...owned, variations: { ...owned.variations } };
        if (action.pseudoState) {
          const base = retained.variations?.[action.variation] ?? {};
          const interactionStates = { ...base.interactionStates };
          const value = replacePreviewBlockStyle(interactionStates[action.pseudoState] ?? {}, action.viewport ?? "desktop", {});
          if (value && Object.keys(value).length) interactionStates[action.pseudoState] = value; else delete interactionStates[action.pseudoState];
          const updated = withInteractionStates(base, interactionStates);
          if (Object.keys(updated).length) retained.variations![action.variation] = updated; else delete retained.variations![action.variation];
        } else {
          const value = replacePreviewBlockStyle(owned.variations?.[action.variation] ?? {}, action.viewport ?? "desktop", {});
          if (Object.keys(value).length) retained.variations![action.variation] = value; else delete retained.variations![action.variation];
        }
        if (!Object.keys(retained.variations!).length) delete retained.variations;
      } else if (action.pseudoState) {
        const base = action.variation ? retained!.variations?.[action.variation] ?? {} : owned;
        const interactionStates = { ...base.interactionStates };
        const value = replacePreviewBlockStyle(interactionStates[action.pseudoState] ?? {}, action.viewport ?? "desktop", {});
        if (value && Object.keys(value).length) interactionStates[action.pseudoState] = value; else delete interactionStates[action.pseudoState];
        const updated = withInteractionStates(base, interactionStates);
        if (action.variation) {
          if (Object.keys(updated).length) retained!.variations![action.variation] = updated; else delete retained!.variations![action.variation];
          if (!Object.keys(retained!.variations!).length) delete retained!.variations;
        } else retained = updated;
      } else if (action.viewport) retained = replacePreviewBlockStyle(owned, action.viewport, {});
      else {
        retained = {};
        if (owned.interactionStates) retained.interactionStates = owned.interactionStates;
        if (owned.variations) retained.variations = owned.variations;
      }
      if (retained && Object.keys(retained).length) next.blockStyles[action.block] = retained;
      else delete next.blockStyles[action.block];
      if (!Object.keys(next.blockStyles).length) delete next.blockStyles;
    }
  } else if (action.type === "layout") next = { ...current, layout: patchPreviewLayout(current.layout, action.patch) };
  else if (action.type === "reset-layout") {
    next = { ...current };
    if (!action.field) delete next.layout;
    else { next.layout = { ...current.layout }; delete next.layout[action.field]; if (!Object.keys(next.layout).length) delete next.layout; }
  } else if (action.type === "shadow") next = { ...current, shadows: { ...current.shadows, [action.id]: { ...current.shadows?.[action.id], ...action.patch } } };
  else if (action.type === "remove-custom-shadows") next = { ...current, shadows: removeCustomShadowPresets(resolvePreviewStyle(state.present, action.scope).shadows, current.shadows) };
  else if (action.type === "delete-shadow") next = { ...current, shadows: { ...current.shadows, [action.id]: null } };
  else if (action.type === "reset-shadow") { next = { ...current }; if (!action.id) delete next.shadows; else { next.shadows = { ...current.shadows }; delete next.shadows[action.id]; if (!Object.keys(next.shadows).length) delete next.shadows; } }
  else if (action.type === "background") next = { ...current, background: patchPreviewBackground(current.background, action.patch) };
  else if (action.type === "reset-background") {
    next = { ...current };
    if (!action.field) delete next.background;
    else {
      next.background = { ...current.background };
      if (action.field === "image") for (const field of backgroundImageFields) delete next.background[field];
      else delete next.background[action.field];
      if (!Object.keys(next.background).length) delete next.background;
    }
  } else if (action.type === "reset-colour-elements") {
    const typography = { ...current.typography, elements: { ...current.typography?.elements } };
    for (const role of Object.keys(typography.elements) as TypographyRole[]) { typography.elements[role] = { ...typography.elements[role] }; delete typography.elements[role]!.colour; }
    next = { ...current, typography, colours: { ...current.colours, elements: {} } };
  } else if (action.type === "reset-theme-colours" || action.type === "colour-palette") {
    next = { ...current, colours: { ...current.colours } }; delete next.colours!.theme;
    if (action.type === "colour-palette") {
      next.paletteId = action.paletteId;
      next.colours!.theme = Object.fromEntries(stylePalettes.find(palette => palette.id === action.paletteId)!.colours.map((colour, index) => [String(index), colour]));
    }
  } else if (action.type === "remove-custom-colours") {
    const custom = resolvePreviewStyle(state.present, action.scope).colours?.custom ?? {};
    const active = Object.values(custom).filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (!active.length) return state;
    next = { ...current, colours: { ...current.colours, custom: { ...current.colours?.custom, ...Object.fromEntries(active.map(item => [item.id, null])) }, retired: { ...current.colours?.retired, ...Object.fromEntries(active.map(item => [item.id, item.colour])) } } };
  } else if (action.type === "remove-colour" || action.type === "remove-gradient") {
    const effective = resolvePreviewStyle(state.present, action.scope).colours;
    const removed = effective?.custom?.[action.id];
    const removedGradient = effective?.gradients?.[action.id];
    const key = action.type === "remove-colour" ? "custom" : "gradients";
    next = { ...current, colours: { ...current.colours, ...(removedGradient ? { retiredGradients: { ...current.colours?.retiredGradients, [action.id]: removedGradient.gradient } } : {}), ...(removed ? { retired: { ...current.colours?.retired, [action.id]: removed.colour } } : {}), [key]: { ...current.colours?.[key], [action.id]: null } } };
  } else if (action.type === "colours") next = { ...current, colours: mergePreviewColours(current.colours, action.patch) };
  else if (action.type === "reset-colours") {
    next = { ...current };
    if (!action.role) delete next.colours;
    else {
      next.colours = { ...current.colours, elements: { ...current.colours?.elements } }; delete next.colours.elements![action.role];
      next.typography = { ...current.typography, elements: { ...current.typography?.elements, [action.role]: { ...current.typography?.elements?.[action.role] } } };
      delete next.typography.elements![action.role]!.colour;
    }
  }
  else if (action.type === "reset-css") { next = { ...current }; delete next.additionalCss; }
  else if (action.type === "reset") next = action.defaults ?? (action.scope === "global" ? { paletteId: "default", typographyId: "default" } : {});
  else if (action.type === "inherit") next = {};
  else if (action.type === "change") {
    next = { ...current, ...action.patch };
    if (action.patch.typographyId && current.typography?.elements) next.typography = { ...current.typography, elements: {} };
  } else {
    const typography: TypographySettings = { ...current.typography };
    if (action.type === "element" || action.type === "reset-element" || action.type === "reset-element-fields") {
      typography.elements = { ...typography.elements };
      if (action.type === "reset-element") delete typography.elements[action.role];
      else if (action.type === "reset-element-fields") {
        const fields = { ...typography.elements[action.role] };
        for (const field of action.fields) delete fields[field];
        if (Object.keys(fields).length) typography.elements[action.role] = fields;
        else delete typography.elements[action.role];
      }
      else {
        const fields = { ...typography.elements[action.role], ...action.patch };
        for (const key of Object.keys(fields) as (keyof TypographyFields)[]) if (fields[key] === undefined) delete fields[key];
        typography.elements[action.role] = fields;
      }
    } else if (action.type === "font-preset") {
      if (action.preset && !validFontSizePreset(action.preset)) return state;
      typography.presets = { ...typography.presets };
      if (action.preset === undefined) delete typography.presets[action.id]; else typography.presets[action.id] = action.preset;
    } else {
      typography.enabledFonts = [...new Set(action.families)];
      if (action.disabledFamilies) typography.disabledFonts = [...new Set(action.disabledFamilies)];
    }
    next = { ...current, typography };
  }
  if (sameBlockImages(next.blockStyles, current.blockStyles) && equalPreviewBackground(next.background, current.background) && JSON.stringify(next) === JSON.stringify(current)) return state;
  return { past: [...state.past, state.present].slice(-60), present: { ...state.present, [action.scope]: next }, future: [] };
}

export function previewStyleDetails(selection: StyleSelection) {
  return {
    palette: resolveColourPalette(stylePalettes.find(item => item.id === selection.paletteId)! as PreviewPalette, selection.colours),
    typography: styleTypography.find(item => item.id === selection.typographyId)!,
    variation: styleVariations.find(item => item.paletteId === selection.paletteId && item.typographyId === selection.typographyId),
  };
}

// Blob bytes are not represented by JSON; image replacement must still enter history.
function sameBlockImages(a: StyleSelection['blockStyles'], b: StyleSelection['blockStyles']): boolean {
  function same(first: PreviewBlockStyle = {}, second: PreviewBlockStyle = {}): boolean {
    return first.backgroundImage === second.backgroundImage && [...new Set([...Object.keys(first.variations ?? {}), ...Object.keys(second.variations ?? {})])].every(key => same(first.variations?.[key], second.variations?.[key]));
  }
  return [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].every(key => same(a?.[key as PreviewBlockId], b?.[key as PreviewBlockId]));
}
