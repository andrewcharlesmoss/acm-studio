/** An authored image effect is portable content; website defaults remain separate. */
export type ImageDuotone = { dark: string; light: string };
function record(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
export function validImageDuotone(value: unknown): value is ImageDuotone | null | undefined {
  return value === undefined || value === null || record(value)
    && Object.keys(value).every(key => key === "dark" || key === "light")
    && typeof value.dark === "string" && /^#[\da-f]{6}$/i.test(value.dark)
    && typeof value.light === "string" && /^#[\da-f]{6}$/i.test(value.light);
}
export function containsAuthoredImageDuotone(value: unknown): boolean {
  if (Array.isArray(value)) {
    // Recovery properties need the retained node discriminator. Ambiguous
    // duotone-only patches remain recoverable without being applied.
    const patches = value.filter((entry): entry is Record<string, unknown> => record(entry) && Array.isArray(entry.path));
    for (const patch of patches) {
      const path = patch.path as unknown[];
      if (!["templates", "parts"].includes(path[0] as string) || !path.includes("nodes") || path.at(-1) !== "type" || patch.value !== "image") continue;
      const prefix = path.slice(0, -1);
      if (patches.some(candidate => {
        const candidatePath = candidate.path as unknown[];
        if (!prefix.every((part, index) => candidatePath[index] === part) || candidate.value === undefined) return false;
        if (candidatePath.length === prefix.length && record(candidate.value)) return candidate.value.duotone !== undefined;
        if (candidatePath.length === prefix.length + 1) return candidatePath.at(-1) === "duotone";
        return candidatePath.length === prefix.length + 2 && candidatePath.at(-2) === "duotone" && ["dark", "light"].includes(candidatePath.at(-1) as string);
      })) return true;
    }
    return value.some(containsAuthoredImageDuotone);
  }
  if (!record(value)) return false;
  if (value.type === "image" && typeof value.id === "string" && typeof value.src === "string" && typeof value.alt === "string" && value.duotone !== undefined) return true;
  return Object.values(value).some(containsAuthoredImageDuotone);
}

/** Featured Image effects are authored presentation and use a separate format gate. */
export function containsAuthoredFeaturedImageDuotone(value: unknown): boolean {
  return containsLegacyFeaturedImageOverride(value) || inspectFeaturedDuotone(value);
}

function containsLegacyFeaturedImageOverride(value: unknown): boolean {
  if (!record(value) || !record(value.migrations)) return false;
  for (const migration of Object.values(value.migrations)) {
    if (!record(migration) || !Array.isArray(migration.bindings) || !Array.isArray(migration.bases)) continue;
    for (const binding of migration.bindings) {
      if (!record(binding) || typeof binding.setId !== "string" || !Array.isArray(binding.overrides)) continue;
      const base = migration.bases.find(candidate => record(candidate) && candidate.id === binding.setId);
      if (!base) continue;
      const featuredIds = new Set<string>();
      const collectFeaturedIds = (item: unknown): void => {
        if (Array.isArray(item)) { item.forEach(collectFeaturedIds); return; }
        if (!record(item)) return;
        if ((item.type === "cover-image" || item.type === "element" && item.element === "cover-image") && typeof item.id === "string") featuredIds.add(item.id);
        Object.values(item).forEach(collectFeaturedIds);
      };
      collectFeaturedIds(base);
      if (inspectFeaturedDuotone(binding.overrides, featuredIds)) return true;
    }
  }
  return false;
}

function inspectFeaturedDuotone(value: unknown, featuredIds = new Set<string>()): boolean {
  if (Array.isArray(value)) {
    // Legacy global-template overrides are path records, not materialised
    // nodes. Binding callers supply IDs from their matching migration base.
    const patches = value.filter((entry): entry is Record<string, unknown> => record(entry) && Array.isArray(entry.path));
    for (const patch of patches) {
      const path = patch.path as unknown[];
      if (!["templates", "parts"].includes(path[0] as string) || !path.includes("nodes")) continue;
      const nodeIndex = path.lastIndexOf("nodes");
      const nodeSegment = path[nodeIndex + 1];
      const nodeId = typeof nodeSegment === "string" && nodeSegment.startsWith("@") ? nodeSegment.slice(1) : undefined;
      const propertyPath = path.slice(nodeIndex + 2);
      const targetsDuotone = propertyPath[0] === "duotone"
        || propertyPath.length === 0 && record(patch.value) && patch.value.duotone !== undefined;
      if (nodeId && featuredIds.has(nodeId) && targetsDuotone) return true;
      // Also accept complete node/field patches that include their own discriminator.
      const isFeaturedImageMarker = (path.at(-1) === "type" && patch.value === "cover-image")
        || (path.at(-1) === "element" && patch.value === "cover-image");
      if (!isFeaturedImageMarker) continue;
      const prefix = path.slice(0, -1);
      if (patches.some(candidate => {
        const candidatePath = candidate.path as unknown[];
        if (!prefix.every((part, index) => candidatePath[index] === part) || candidate.value === undefined) return false;
        if (candidatePath.length === prefix.length && record(candidate.value)) return candidate.value.duotone !== undefined;
        if (candidatePath.length === prefix.length + 1) return candidatePath.at(-1) === "duotone";
        return candidatePath.length === prefix.length + 2 && candidatePath.at(-2) === "duotone" && ["dark", "light"].includes(candidatePath.at(-1) as string);
      })) return true;
    }
    return value.some(item => inspectFeaturedDuotone(item, featuredIds));
  }
  if (!record(value)) return false;
  if ((value.type === "cover-image" && typeof value.id === "string")
    || (value.type === "element" && value.element === "cover-image" && typeof value.id === "string")) {
    if (value.duotone !== undefined) return true;
  }
  return Object.values(value).some(item => inspectFeaturedDuotone(item, featuredIds));
}
