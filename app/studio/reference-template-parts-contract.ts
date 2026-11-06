/** General parts are stored independently from document templates and overlays. */
export function containsGeneralTemplatePart(value: unknown): boolean {
  const pending: unknown[] = [value];
  const seen = new Set<object>();
  while (pending.length) {
    const current = pending.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    if (!Array.isArray(current) && (current as Record<string, unknown>).type === "element" && (current as Record<string, unknown>).element === "site-logo") return true;
    if (!Array.isArray(current) && (current as Record<string, unknown>).type === "group" && (current as { data?: { templateElement?: string } }).data?.templateElement === "site-logo") return true;
    if (!Array.isArray(current) && (current as Record<string, unknown>).kind === "general" && Array.isArray((current as Record<string, unknown>).nodes)) return true;
    for (const child of Array.isArray(current) ? current : Object.values(current)) pending.push(child);
  }
  return false;
}
