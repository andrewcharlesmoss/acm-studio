import { containsGeneralTemplatePart } from "./reference-template-parts-contract";
/** Detect stored template nodes and temporary clipboard projections. */
export function containsSiteTitle(value: unknown): boolean {
  const pending: unknown[] = [value];
  const visited = new Set<object>();
  while (pending.length) {
    const current = pending.pop();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    if (!Array.isArray(current)) {
      const item = current as Record<string, unknown>;
      if (item.type === "element" && item.element === "site-title") return true;
      if (item.type === "group" && item.data && typeof item.data === "object" && (item.data as Record<string, unknown>).templateElement === "site-title") return true;
    }
    for (const child of Array.isArray(current) ? current : Object.values(current)) pending.push(child);
  }
  return false;
}

/** Template projections must never enter ordinary page or post content. */
export function permitsSiteTitlePaste(blocks: unknown, templateTarget: boolean): boolean {
  return templateTarget || !containsSiteTitle(blocks) && !containsGeneralTemplatePart(blocks);
}
