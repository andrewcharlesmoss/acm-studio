import type { UniversalStylePreset } from "@acm/styles";

const historyLimit = 60;

export type StylePresetHistory = {
  past: UniversalStylePreset[];
  present: UniversalStylePreset;
  future: UniversalStylePreset[];
  editKey?: string;
};

export type StylePresetHistoryAction =
  | { type: "change"; update: (preset: UniversalStylePreset) => UniversalStylePreset; editKey?: string }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "end-edit" };

export function createStylePresetHistory(present: UniversalStylePreset): StylePresetHistory {
  return { past: [], present, future: [] };
}

/** Preset updates are immutable; one focused colour/number edit shares a snapshot. */
export function stylePresetHistoryReducer(history: StylePresetHistory, action: StylePresetHistoryAction): StylePresetHistory {
  if (action.type === "end-edit") return history.editKey ? { ...history, editKey: undefined } : history;
  if (action.type === "undo") {
    const previous = history.past.at(-1);
    return previous ? {
      past: history.past.slice(0, -1), present: previous,
      future: [...history.future, history.present],
    } : history;
  }
  if (action.type === "redo") {
    const next = history.future.at(-1);
    return next ? {
      past: [...history.past, history.present].slice(-historyLimit), present: next,
      future: history.future.slice(0, -1),
    } : history;
  }
  const next = action.update(history.present);
  // Resetting an unchanged value must preserve the redo branch.
  if (JSON.stringify(next) === JSON.stringify(history.present)) return history;
  const coalesce = action.editKey !== undefined && action.editKey === history.editKey;
  return {
    past: coalesce ? history.past : [...history.past, history.present].slice(-historyLimit),
    present: next, future: [], editKey: action.editKey,
  };
}
