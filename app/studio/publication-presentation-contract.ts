function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Only publication-owned records carry these additions. A draft's parent belongs to the workspace. */
export function containsPublicationPresentation(value: unknown): boolean {
  if (!record(value)) return false;
  const hasPresentation = (post: unknown) => record(post) && (post.fallbackHeader !== undefined || post.parentPageId !== undefined);
  if (Array.isArray(value.posts)) return value.posts.some(hasPresentation);
  if (Array.isArray(value.bin)) return value.bin.some(item => record(item) && hasPresentation(item.publication));
  return hasPresentation(value);
}
