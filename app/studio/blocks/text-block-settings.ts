import type { ListBlock } from "../../content/model";

export type ListSetting = "marker" | "start" | "reversed";
export { resetTableSettings, type TableSetting } from "../../content/table-sections";

export function resetListSettings(block: ListBlock, fields: readonly ListSetting[] = ["marker", "start", "reversed"]): ListBlock {
  const next = { ...block };
  for (const field of fields) delete next[field];
  return next;
}
