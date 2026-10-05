import type { ContentBlock } from "./model";

/** Keep a saved value representable when the configured choices change. */
export function fieldSelectOptions(block: Extract<ContentBlock, { type: "field" }>) {
  const choices = [...new Set(block.options?.length ? block.options : [block.value])];
  return choices.includes(block.value) ? choices : [block.value, ...choices];
}
