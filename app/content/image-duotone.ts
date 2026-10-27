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
