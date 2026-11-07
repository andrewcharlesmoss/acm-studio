/** A host-supplied post suitable for a Query Loop; private source data stays with the host. */
export type QueryPost = { id: string; title: string; href: string; publishedAt: string; sticky?: boolean; availableAt?: number };
export type PostQuery = { count: number; order: "asc" | "desc"; stickyFirst?: boolean };

export const MAX_QUERY_POSTS = 100;

/** Deterministic ordering also keeps equal-date entries stable across renderers. */
export function queryPosts(posts: readonly QueryPost[], query: PostQuery): QueryPost[] {
  const count = Math.max(1, Math.min(MAX_QUERY_POSTS, Math.trunc(query.count)));
  if (!Number.isFinite(count) || (query.order !== "asc" && query.order !== "desc")) return [];
  return posts.filter(post => Number.isFinite(Date.parse(post.publishedAt)))
    .slice().sort((a, b) => {
      const date = Date.parse(a.publishedAt) - Date.parse(b.publishedAt);
      return date ? date * (query.order === "asc" ? 1 : -1) : a.id.localeCompare(b.id, "en");
    }).sort((a, b) => query.stickyFirst && Boolean(b.sticky) !== Boolean(a.sticky) ? Number(Boolean(b.sticky)) - Number(Boolean(a.sticky)) : 0).slice(0, count);
}
