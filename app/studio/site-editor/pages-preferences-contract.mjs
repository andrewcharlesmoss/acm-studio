import { validPagesView } from "./pages-model.mjs";

export const pagesPreferenceKey = "acm-studio-pages-view-v1";
export const pagesPreferenceChangedEvent = "acm-studio-pages-view-saved-v1";

const record = value => Boolean(value && typeof value === "object" && !Array.isArray(value));

export function validPagesPreferenceMode(value) {
  if (typeof value !== "string" || value.length > 5000) return false;
  try {
    const payload = JSON.parse(value);
    return record(payload) && Object.keys(payload).sort().join() === "siteId,view"
      && ["test", "test2"].includes(payload.siteId) && validPagesView(payload.view);
  } catch { return false; }
}
