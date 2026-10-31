/** Detect new blocks, Group insertion policies and retained template property overrides. */
export function containsPullquote(value: unknown): boolean {
  const pending: unknown[] = [value];
  const visited = new Set<object>();
  // Iterate the finite input graph without recursion or an arbitrary value-count
  // cutoff: a large legacy document must not be mistaken for a new block.
  while (pending.length) {
    const current = pending.pop();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    if (!Array.isArray(current)) {
      const record = current as Record<string, unknown>;
      if (record.type === "pullquote" || Array.isArray(record.allowedBlocks) && record.allowedBlocks.includes("pullquote")) return true;
      if (Array.isArray(record.path)) {
        const property = record.path.at(-1);
        if (property === "type" && record.value === "pullquote"
          || property === "allowedBlocks" && Array.isArray(record.value) && record.value.includes("pullquote")) return true;
      }
    }
    for (const child of Array.isArray(current) ? current : Object.values(current)) {
      if (child && typeof child === "object" && !visited.has(child)) pending.push(child);
    }
  }
  return false;
}
