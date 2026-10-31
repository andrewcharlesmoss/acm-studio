import { saveStudioPreferenceThroughOwner } from "../studio-preference-broker.mjs";
import { defaultPagesView, normalizePagesView, validPagesView } from "./pages-model.mjs";
import { legacyPagesPreferenceKey, pagesPreferenceKey, pagesPreferenceChangedEvent, validPagesPreferenceMode } from "./pages-preferences-contract.mjs";

export { legacyPagesPreferenceKey, pagesPreferenceKey, pagesPreferenceChangedEvent, validPagesPreferenceMode };

const record = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
function readPreference(storage, key) {
  try { return JSON.parse(storage.getItem(key) ?? "{}"); }
  catch { return {}; }
}

export function readPagesView(storage, siteId) {
  try {
    const current = readPreference(storage, pagesPreferenceKey);
    if (record(current) && validPagesView(current[siteId])) return normalizePagesView(current[siteId]);
    const legacy = readPreference(storage, legacyPagesPreferenceKey);
    if (record(legacy) && validPagesView(legacy[siteId])) return normalizePagesView({ ...legacy[siteId], sortBy: "order" });
    return normalizePagesView(defaultPagesView);
  } catch { return normalizePagesView(defaultPagesView); }
}

export async function savePagesViewThroughOwner(siteId, view) {
  const mode = JSON.stringify({ siteId, view: normalizePagesView(view) });
  if (!validPagesPreferenceMode(mode)) return { saved: false, reason: "invalid" };
  return saveStudioPreferenceThroughOwner("pages", mode);
}
