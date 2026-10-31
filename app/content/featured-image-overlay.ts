import type { ParagraphBackgroundGradient } from "./model";
import { validBackgroundGradient } from "./background-gradient";

/** Authored Featured Image overlay. Opacity is Gutenberg's 0–100 dim ratio. */
export type FeaturedImageOverlay = {
  colour?: string;
  gradient?: ParagraphBackgroundGradient;
  opacity: number;
};

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function validFeaturedImageOverlay(value: unknown): value is FeaturedImageOverlay | undefined {
  if (value === undefined) return true;
  if (!record(value) || Object.keys(value).some(key => !["colour", "gradient", "opacity"].includes(key))) return false;
  const hasColour = typeof value.colour === "string" && /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.colour);
  return Number.isInteger(value.opacity) && Number(value.opacity) >= 0 && Number(value.opacity) <= 100
    && (value.colour === undefined || hasColour)
    && (value.gradient === undefined || validBackgroundGradient(value.gradient))
    && !(value.colour !== undefined && value.gradient !== undefined);
}

/** Detect only Featured Image authored data, including retained global overrides. */
export function containsAuthoredFeaturedImageOverlay(value: unknown): boolean {
  if (inspect(value)) return true;
  if (!record(value) || !record(value.migrations)) return false;
  for (const migration of Object.values(value.migrations)) {
    if (!record(migration) || !Array.isArray(migration.bindings) || !Array.isArray(migration.bases)) continue;
    for (const binding of migration.bindings) {
      if (!record(binding) || typeof binding.setId !== "string" || !Array.isArray(binding.overrides)) continue;
      const base = migration.bases.find(candidate => record(candidate) && candidate.id === binding.setId);
      if (!base) continue;
      const ids = new Set<string>();
      const collect = (item: unknown): void => {
        if (Array.isArray(item)) { item.forEach(collect); return; }
        if (!record(item)) return;
        if ((item.type === "cover-image" || item.type === "element" && item.element === "cover-image") && typeof item.id === "string") ids.add(item.id);
        Object.values(item).forEach(collect);
      };
      collect(base);
      if (inspectPatches(binding.overrides, ids)) return true;
    }
  }
  return false;
}

function inspect(value: unknown): boolean {
  if (Array.isArray(value)) return inspectPatches(value, new Set()) || value.some(inspect);
  if (!record(value)) return false;
  if ((value.type === "cover-image" || value.type === "element" && value.element === "cover-image") && typeof value.id === "string" && value.overlay !== undefined) return true;
  return Object.values(value).some(inspect);
}

function inspectPatches(value: unknown[], featuredIds: Set<string>): boolean {
  const patches = value.filter(record).filter(patch => Array.isArray(patch.path));
  for (const patch of patches) {
    const path = patch.path as unknown[];
    if (!path.includes("nodes")) continue;
    const nodeIndex = path.lastIndexOf("nodes");
    const segment = path[nodeIndex + 1];
    const nodeId = typeof segment === "string" && segment.startsWith("@") ? segment.slice(1) : undefined;
    const property = path.slice(nodeIndex + 2);
    if (nodeId && featuredIds.has(nodeId) && (property[0] === "overlay" || property.length === 0 && record(patch.value) && patch.value.overlay !== undefined)) return true;
    const marker = path.at(-1) === "type" && patch.value === "cover-image" || path.at(-1) === "element" && patch.value === "cover-image";
    if (!marker) continue;
    const prefix = path.slice(0, -1);
    if (patches.some(candidate => {
      const candidatePath = candidate.path as unknown[];
      if (!prefix.every((part, index) => candidatePath[index] === part) || candidate.value === undefined) return false;
      if (candidatePath.length === prefix.length && record(candidate.value)) return candidate.value.overlay !== undefined;
      return candidatePath.length === prefix.length + 1 && candidatePath.at(-1) === "overlay";
    })) return true;
  }
  return false;
}
