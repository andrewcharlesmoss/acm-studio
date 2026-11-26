export const motionCatalogueKey = "acm-studio-motion-catalogue-v1";
export const motionCatalogueChanged = "acm-studio-motion-catalogue-saved";

export function readMotionCatalogue(storage) {
  return storage.getItem(motionCatalogueKey) ?? "{}";
}

export function validMotionCatalogue(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      && Object.keys(parsed).length <= 200
      && Object.entries(parsed).every(([key, item]) => key.length > 0 && key.length <= 100
        && item && typeof item === "object" && !Array.isArray(item)
        && Object.keys(item).every(k => k === "name" || k === "hidden" || k === "deletedAt")
        && (item.name === undefined || typeof item.name === "string" && item.name.trim().length > 0 && item.name.length <= 100)
        && (item.hidden === undefined || typeof item.hidden === "boolean")
        && (item.deletedAt === undefined || item.hidden === true && typeof item.deletedAt === "string"
          && item.deletedAt.length <= 40 && Number.isFinite(Date.parse(item.deletedAt))));
  } catch { return false; }
}
