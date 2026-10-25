import { saveStudioPreferenceThroughOwner } from "../studio-preference-broker.mjs";
import { defaultPagesView, normalizePagesView, validPagesView } from "./pages-model.mjs";
import { pagesPreferenceKey, pagesPreferenceChangedEvent, validPagesPreferenceMode } from "./pages-preferences-contract.mjs";

export { pagesPreferenceKey, pagesPreferenceChangedEvent, validPagesPreferenceMode };

const record = value => Boolean(value && typeof value === "object" && !Array.isArray(value));

export function readPagesView(storage, siteId) {
  try {
    const value = JSON.parse(storage.getItem(pagesPreferenceKey) ?? "{}");
    return record(value) && validPagesView(value[siteId]) ? normalizePagesView(value[siteId]) : normalizePagesView(defaultPagesView);
  } catch { return normalizePagesView(defaultPagesView); }
}

export async function savePagesViewThroughOwner(siteId, view) {
  const mode = JSON.stringify({ siteId, view: normalizePagesView(view) });
  if (!validPagesPreferenceMode(mode)) return { saved: false, reason: "invalid" };
  return saveStudioPreferenceThroughOwner("pages", mode);
}
