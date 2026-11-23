import type { TemplateStore } from "./template-model";

export type TemplateCheckpoint = { store: TemplateStore; group?: symbol };

export function recordTemplateCheckpoint(past: TemplateCheckpoint[], store: TemplateStore, group?: symbol, limit?: number) {
  if (group !== undefined && past.at(-1)?.group === group) return past;
  const next = [...past, { store, group }];
  return limit === undefined ? next : next.slice(-limit);
}
