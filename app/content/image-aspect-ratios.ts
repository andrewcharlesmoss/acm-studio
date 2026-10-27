export const imageAspectRatios = {
  original: undefined,
  square: "1 / 1",
  portrait: "3 / 4",
  landscape: "4 / 3",
  classic: "3 / 2",
  "classic-portrait": "2 / 3",
  wide: "16 / 9",
  tall: "9 / 16",
} as const;

export type ImageAspectRatio = keyof typeof imageAspectRatios;

export function isImageAspectRatio(value: unknown): value is ImageAspectRatio {
  return typeof value === "string" && Object.hasOwn(imageAspectRatios, value);
}

function isExtendedRatio(value: unknown): boolean {
  return value === "classic" || value === "classic-portrait" || value === "tall";
}

/** Gate new values in complete persisted envelopes, including recovery copies. */
export function containsExtendedImageAspectRatio(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) {
    // Legacy recovery patches may separately record a node's type and ratio.
    // A ratio-only patch is ambiguous without the original node and must stay
    // readable; legacy overrides are retained, never applied to live designs.
    const patches = value.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object" && !Array.isArray(entry) && Array.isArray((entry as Record<string, unknown>).path));
    for (const patch of patches) {
      const path = patch.path as unknown[];
      if ((path[0] !== "templates" && path[0] !== "parts") || !path.includes("nodes")) continue;
      const last = path.at(-1);
      if (!((last === "type" && (patch.value === "image" || patch.value === "cover-image")) || (last === "element" && patch.value === "cover-image"))) continue;
      const prefix = path.slice(0, -1);
      if (patches.some(candidate => {
        const candidatePath = candidate.path as unknown[];
        const samePrefix = prefix.every((part, index) => candidatePath[index] === part);
        if (!samePrefix) return false;
        if (candidatePath.length === prefix.length + 1 && candidatePath.at(-1) === "aspectRatio") return isExtendedRatio(candidate.value);
        return candidatePath.length === prefix.length && !!candidate.value && typeof candidate.value === "object" && isExtendedRatio((candidate.value as Record<string, unknown>).aspectRatio);
      })) return true;
    }
    return value.some(containsExtendedImageAspectRatio);
  }
  const item = value as Record<string, unknown>;
  if ((item.type === "image" || item.type === "cover-image" || item.element === "cover-image")
    && isExtendedRatio(item.aspectRatio)) return true;
  return Object.values(item).some(containsExtendedImageAspectRatio);
}
