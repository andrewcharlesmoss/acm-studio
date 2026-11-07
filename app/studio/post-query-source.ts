import type { StudioDocument } from "./editor-model";
import type { QueryPost } from "../content/post-query";

/** Read only retained publication snapshots belonging to the selected site. */
export function fixtureQueryPostSummaries(publications: readonly { document: StudioDocument }[], activeDocumentIds: ReadonlySet<string>, href: (document: StudioDocument) => string, options: { now?: number; includeFutureScheduled?: boolean; maxCandidates?: number } = {}): QueryPost[] {
  const now = options.now ?? Date.now();
  const candidates = publications.flatMap(({ document }) => {
    if (!activeDocumentIds.has(document.id)) return [];
    if (document.kind !== "post" || document.passwordProtection) return [];
    if (document.status !== "published" && document.status !== "scheduled") return [];
    const publishedAt = document.publishAt ?? document.publishedAt ?? "";
    if (!Number.isFinite(Date.parse(publishedAt))) return [];
    const availableAt = document.status === "scheduled" ? Date.parse(publishedAt) : undefined;
    if (availableAt !== undefined && availableAt > now && !options.includeFutureScheduled) return [];
    return [{ id: document.id, title: document.title || "Untitled", href: href(document), publishedAt, sticky: document.sticky === true, ...(availableAt !== undefined ? { availableAt } : {}) }];
  }).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id, "en"));
  const requested = options.maxCandidates ?? 1000;
  const maximum = Number.isFinite(requested) ? Math.max(1, Math.min(1000, Math.trunc(requested))) : 1000;
  return candidates.slice(0, maximum);
}

/** The next eligible scheduled post boundary for live previews. */
export function nextFixtureQueryPostBoundary(publications: readonly { document: StudioDocument }[], activeDocumentIds: ReadonlySet<string>, options: { now?: number } = {}): number | null {
  const now = options.now ?? Date.now();
  const future = publications.flatMap(({ document }) => {
    if (!activeDocumentIds.has(document.id) || document.kind !== "post" || document.passwordProtection || document.status !== "scheduled") return [];
    const publishAt = Date.parse(document.publishAt ?? document.publishedAt ?? "");
    return Number.isFinite(publishAt) && publishAt > now ? [publishAt] : [];
  });
  return future.length ? Math.min(...future) : null;
}
