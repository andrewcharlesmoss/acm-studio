export function containsTemplateElementsInCover(value: unknown): boolean {
  const seen = new Set<object>();
  function visit(current: unknown, inCover: boolean): boolean {
    if (!current || typeof current !== "object" || seen.has(current)) return false;
    seen.add(current);
    if (Array.isArray(current)) return current.some(item => visit(item, inCover));
    if ((typeof current !== "object" || current === null || Array.isArray(current))) return false;
    if (inCover && ((current as Record<string, unknown>).type === "element" || (current as Record<string, unknown>).type === "part")) return true;
    const nested = inCover || (current as Record<string, unknown>).type === "cover";
    return Object.values(current).some(item => visit(item, nested));
  }
  return visit(value, false);
}
