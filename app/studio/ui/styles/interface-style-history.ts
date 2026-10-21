import type { InterfaceStylePreset } from "@acm/styles";

const limit = 60;
export type InterfaceStyleHistory = { past: InterfaceStylePreset[]; present: InterfaceStylePreset; future: InterfaceStylePreset[]; editKey?: string };
export type InterfaceStyleHistoryAction =
  | { type: "load"; preset: InterfaceStylePreset }
  | { type: "saved"; preset: InterfaceStylePreset }
  | { type: "change"; update: (preset: InterfaceStylePreset) => InterfaceStylePreset; editKey?: string }
  | { type: "undo" | "redo" | "end-edit" };

export function interfaceStyleHistoryReducer(history: InterfaceStyleHistory, action: InterfaceStyleHistoryAction): InterfaceStyleHistory {
  if (action.type === "load") return { past: [], present: action.preset, future: [] };
  if (action.type === "saved") return { ...history, present: action.preset, editKey: undefined };
  if (action.type === "end-edit") return history.editKey ? { ...history, editKey: undefined } : history;
  if (action.type === "undo") {
    const previous = history.past.at(-1);
    return previous ? { past: history.past.slice(0, -1), present: previous, future: [...history.future, history.present] } : history;
  }
  if (action.type === "redo") {
    const next = history.future.at(-1);
    return next ? { past: [...history.past, history.present].slice(-limit), present: next, future: history.future.slice(0, -1) } : history;
  }
  if (action.type !== "change") return history;
  const next = action.update(history.present);
  if (JSON.stringify(next) === JSON.stringify(history.present)) return history;
  const coalesce = action.editKey !== undefined && action.editKey === history.editKey;
  return { past: coalesce ? history.past : [...history.past, history.present].slice(-limit), present: next, future: [], editKey: action.editKey };
}
