export type PreviewScope = "global" | "test" | "test2";
export type PreviewValues = { global: number; test?: number; test2?: number };
export type PreviewHistory = { past: PreviewValues[]; present: PreviewValues; future: PreviewValues[] };
export type PreviewAction = { type: "change"; scope: PreviewScope; value?: number } | { type: "undo" | "redo" };
export function createSiteEditorPreview(): PreviewHistory {
  return { past: [], present: { global: 18 }, future: [] };
}
export function resolveParagraphSize(values: PreviewValues, scope: PreviewScope): number {
  return values[scope] ?? values.global;
}
export function siteEditorPreviewReducer(state: PreviewHistory, action: PreviewAction): PreviewHistory {
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    return previous ? { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] } : state;
  }
  if (action.type === "redo") {
    const next = state.future[0];
    return next ? { past: [...state.past, state.present], present: next, future: state.future.slice(1) } : state;
  }
  if (action.type !== "change") return state;
  if (action.value === undefined && action.scope === "global") return state;
  if (action.value !== undefined && (!Number.isFinite(action.value) || action.value < 8 || action.value > 96)) return state;
  if (state.present[action.scope] === action.value) return state;
  const present = { ...state.present };
  if (action.value === undefined) delete present[action.scope as "test" | "test2"];
  else present[action.scope] = action.value;
  return { past: [...state.past, state.present].slice(-60), present, future: [] };
}
