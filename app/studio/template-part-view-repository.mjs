import { createStudioPreferenceRepository } from "./studio-preference-repository.mjs";

export const templatePartCanvasViews = ["full", "fit"];

/** Each part kind owns its own key so saving Header cannot overwrite Footer. */
export function createTemplatePartViewRepository({ kind, ...options }) {
  if (kind !== "header" && kind !== "footer") throw new Error("Unsupported template part view");
  const key = `acm-studio-template-${kind}-canvas-view-v1`;
  return createStudioPreferenceRepository({
    ...options,
    key,
    read: storage => {
      const value = storage.getItem(key);
      return templatePartCanvasViews.includes(value) ? value : "full";
    },
    validate: value => templatePartCanvasViews.includes(value),
  });
}
