import { resolveWebsiteLayout, validateWebsiteLayoutOverrides, WEBSITE_LAYOUT_VERSION, type WebsiteLayoutOverrides, type WebsiteLayoutValues, type WebsiteLayoutProfile } from "../../website-layout.ts";

export const previewDefaults: WebsiteLayoutValues = { siteWidth: { mode: "full" }, contentWidth: 720, wideWidth: 1120, gutters: { desktop: 24 } };
export type PreviewScope = "profile" | "journal" | "portfolio";
export type PreviewDraft = { profile: WebsiteLayoutOverrides; journal: WebsiteLayoutOverrides; portfolio: WebsiteLayoutOverrides };
export type PreviewHistory = { past: PreviewDraft[]; present: PreviewDraft; future: PreviewDraft[]; editKey?: string };
export type PreviewAction = { type: "change"; scope: PreviewScope; overrides: WebsiteLayoutOverrides; editKey?: string } | { type: "undo" } | { type: "redo" } | { type: "end-edit" } | { type: "reset" };
export function createPreviewHistory(): PreviewHistory { return { past: [], present: { profile: {}, journal: {}, portfolio: {} }, future: [] }; }
export function resolvePreview(draft: PreviewDraft, scope: PreviewScope) {
  const profile: WebsiteLayoutProfile = { format: "acm-website-layout-profile", version: WEBSITE_LAYOUT_VERSION, id: "sample-websites", name: "Sample Websites", overrides: draft.profile };
  return resolveWebsiteLayout(previewDefaults, profile, scope === "profile" ? {} : draft[scope]);
}
export function parsePreviewNumber(value: string, gutter = false): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= (gutter ? 0 : 1) && number <= (gutter ? 512 : 8192) ? number : null;
}
export function previewHistoryReducer(history: PreviewHistory, action: PreviewAction): PreviewHistory {
  if (action.type === "end-edit") return { ...history, editKey: undefined };
  if (action.type === "undo") {
    const previous = history.past.at(-1);
    return previous ? { past: history.past.slice(0, -1), present: previous, future: [...history.future, history.present] } : history;
  }
  if (action.type === "redo") {
    const next = history.future.at(-1);
    return next ? { past: [...history.past, history.present].slice(-60), present: next, future: history.future.slice(0, -1) } : history;
  }
  const next = action.type === "reset" ? createPreviewHistory().present : { ...history.present, [action.scope]: validateWebsiteLayoutOverrides(action.overrides) };
  if (JSON.stringify(next) === JSON.stringify(history.present)) return history;
  const editKey = action.type === "change" ? action.editKey : undefined;
  return { past: editKey && editKey === history.editKey ? history.past : [...history.past, history.present].slice(-60), present: next, future: [], editKey };
}
