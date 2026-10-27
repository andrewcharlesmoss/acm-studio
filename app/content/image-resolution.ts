export const IMAGE_RESOLUTION_KEYS = ["thumbnail", "medium", "large"] as const;
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
  if (Array.isArray(value)) return value.some(containsImageResolution);
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.type === "image" && record.imageResolution !== undefined || Object.values(record).some(containsImageResolution);
}
