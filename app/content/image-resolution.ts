export const IMAGE_RESOLUTION_KEYS = ["thumbnail", "medium", "large"] as const;
export const IMAGE_RENDITION_MAXIMUMS = { thumbnail: 150, medium: 300, large: 1024 } as const;
export type ImageResolutionKey = typeof IMAGE_RESOLUTION_KEYS[number];
export type ImageResolution = { key: ImageResolutionKey; sourceDigest: string; renditionDigest: string };
export type ImageRendition = { key: ImageResolutionKey; width: number; height: number; type: "image/png"; size: number; digest: string; blob: Blob };
export type ImageRenditionBundle = { sourceDigest: string; width: number; height: number; variants: ImageRendition[] };
export type ImageRenditions = { version: 1; bundles: ImageRenditionBundle[] };
export type ImageRenditionUrls = Readonly<Record<string, string>>;
export const validImageDigest = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export function validImageResolution(value: unknown): value is ImageResolution | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const pin = value as Record<string, unknown>;
  return Object.keys(pin).sort().join() === "key,renditionDigest,sourceDigest" && IMAGE_RESOLUTION_KEYS.includes(pin.key as ImageResolutionKey) && validImageDigest(pin.sourceDigest) && validImageDigest(pin.renditionDigest);
}
/** Separate from original-id maps: arbitrary imported IDs cannot collide with pins. */
export function imageRenditionResourceKey(mediaId: string, pin: ImageResolution): string {
  return JSON.stringify([mediaId, pin.key, pin.sourceDigest, pin.renditionDigest]);
}
export function containsImageResolution(value: unknown): boolean {
  if (Array.isArray(value)) {
    // Global-template recovery patches can retain individual image fields.
    // Only a matching image discriminator makes these content properties.
    const patches = value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item) && Array.isArray((item as Record<string, unknown>).path));
    for (const patch of patches) {
      const path = patch.path as unknown[];
      if (!["templates", "parts"].includes(path[0] as string) || !path.includes("nodes") || path.at(-1) !== "type" || patch.value !== "image") continue;
      const prefix = path.slice(0, -1);
      if (patches.some(candidate => {
        const candidatePath = candidate.path as unknown[];
        if (!prefix.every((part, index) => candidatePath[index] === part) || candidate.value === undefined) return false;
        if (candidatePath.length === prefix.length && candidate.value && typeof candidate.value === "object" && !Array.isArray(candidate.value)) return (candidate.value as Record<string, unknown>).imageResolution !== undefined;
        if (candidatePath.length === prefix.length + 1) return candidatePath.at(-1) === "imageResolution";
        return candidatePath.length === prefix.length + 2 && candidatePath.at(-2) === "imageResolution" && ["key", "sourceDigest", "renditionDigest"].includes(candidatePath.at(-1) as string);
      })) return true;
    }
    return value.some(containsImageResolution);
  }
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.type === "image" && record.imageResolution !== undefined || Object.values(record).some(containsImageResolution);
}
