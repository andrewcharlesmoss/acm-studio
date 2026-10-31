/** Detect both new blocks and persisted Group insertion policy in any portable owner. */
export function containsPullquote(value: unknown): boolean {
  const pending: unknown[] = [value];
  const visited = new Set<object>();
  let inspected = 0;
  while (pending.length && inspected < 100000) {
    const current = pending.pop(); inspected += 1;
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    if (!Array.isArray(current)) {
      const record = current as Record<string, unknown>;
      if (record.type === "pullquote" || Array.isArray(record.allowedBlocks) && record.allowedBlocks.includes("pullquote")) return true;
    }
    pending.push(...(Array.isArray(current) ? current : Object.values(current)));
  }
  return pending.length > 0;
}
