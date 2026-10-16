import { createStudioPreferenceRepository } from "./studio-preference-repository.mjs";
import { saveStudioPreferenceThroughOwner } from "./studio-preference-broker.mjs";
import { templatePartCanvasViews, templatePartViewKeys } from "./template-part-view-contract.mjs";
export { templatePartCanvasViews } from "./template-part-view-contract.mjs";

/** Each part kind owns its own key so saving Header cannot overwrite Footer. */
export function createTemplatePartViewRepository({ kind, ...options }) {
  if (kind !== "header" && kind !== "footer") throw new Error("Unsupported template part view");
  const key = templatePartViewKeys[kind];
  const local = createStudioPreferenceRepository({
    ...options,
    key,
    read: storage => {
      const value = storage.getItem(key);
      return templatePartCanvasViews.includes(value) ? value : "full";
    },
    validate: value => templatePartCanvasViews.includes(value),
  });
  let queue = Promise.resolve();
  return {
    read: local.read,
    save(mode) {
      const result = queue.then(async () => {
        const saved = await local.save(mode);
        if (saved.saved) {
          try { return local.read() === mode ? saved : { saved: false, reason: "storage" }; }
          catch { return { saved: false, reason: "storage" }; }
        }
        if (saved.reason !== "blocked") return saved;
        try {
          const result = await saveStudioPreferenceThroughOwner(kind, mode);
          return result.saved && local.read() !== mode ? { saved: false, reason: "storage" } : result;
        } catch { return { saved: false, reason: "owner-unavailable" }; }
      });
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
  };
}
