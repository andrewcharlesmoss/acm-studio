import { createStudioPreferenceRepository } from "./studio-preference-repository.mjs";

export const siteOrderPreferenceKey = "acm-studio-site-order-v1";
export function orderedSiteIds(ids, stored, normalise = order => order) {
  if (!Array.isArray(stored) || stored.some(id => typeof id !== "string") || new Set(stored).size !== stored.length) return normalise([...ids]);
  return normalise([...stored.filter(id => ids.includes(id)), ...ids.filter(id => !stored.includes(id))]);
}
export function readSiteOrder(storage, ids, key = siteOrderPreferenceKey, normalise = order => order) {
  try { const value = storage.getItem(key); return orderedSiteIds(ids, value && value.length <= 2048 ? JSON.parse(value) : null, normalise); }
  catch { return normalise([...ids]); }
}
/** A move checks fresh saved order under the same preference ownership gate. */
export function createSiteOrderRepository({ ids, key = siteOrderPreferenceKey, normaliseOrder = order => order, ...options }) {
  const readOrder = storage => readSiteOrder(storage, ids, key, normaliseOrder);
  return {
    read: () => readOrder(options.storage),
    save(order, baseline) {
      const read = storage => {
        const current = readOrder(storage);
        if (JSON.stringify(current) !== JSON.stringify(baseline)) throw new Error("Site order changed in another tab.");
        return current;
      };
      return createStudioPreferenceRepository({ ...options, key, read,
        validate: value => { try { const parsed = JSON.parse(value); return Array.isArray(parsed) && parsed.length === ids.length && new Set(parsed).size === ids.length && parsed.every(id => ids.includes(id)); } catch { return false; } },
      }).save(JSON.stringify(order));
    },
  };
}
