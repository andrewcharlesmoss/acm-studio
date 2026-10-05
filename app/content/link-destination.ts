import { safeTextLink } from "./rich-text";

/** An outer link's settings; rich label content belongs to its caller. */
export type LinkDestination = { url: string; opensInNewTab?: boolean; rel?: string };
export type LinkDestinationDraft = { url: string; opensInNewTab: boolean; nofollow: boolean };

export function linkDestinationDraft(value: LinkDestination): LinkDestinationDraft {
  return { url: value.url, opensInNewTab: Boolean(value.opensInNewTab), nofollow: (value.rel ?? "").split(/\s+/).some(token => token.toLowerCase() === "nofollow") };
}

export function sameLinkDestination(first: LinkDestination, second: LinkDestination): boolean {
  return first.url === second.url && first.opensInNewTab === second.opensInNewTab && first.rel === second.rel;
}

/** HTML rel tokens are unordered and case-insensitive; empty defaults are equivalent. */
export function equivalentLinkDestination(first: LinkDestination, second: LinkDestination): boolean {
  const tokens = (value?: string) => [...new Set((value ?? "").split(/\s+/).filter(Boolean).map(token => token.toLowerCase()))].sort().join(" ");
  return first.url === second.url && Boolean(first.opensInNewTab) === Boolean(second.opensInNewTab) && tokens(first.rel) === tokens(second.rel);
}

export function updatedLinkDestination(previous: LinkDestination, draft: LinkDestinationDraft): LinkDestination | null {
  const url = safeTextLink(draft.url);
  if (!url) return null;
  const tokens = (previous.rel ?? "").split(/\s+/).filter(token => token && token.toLowerCase() !== "nofollow");
  if (draft.nofollow) tokens.push("nofollow");
  const rel = [...new Set(tokens)].join(" ");
  const opensInNewTab = draft.opensInNewTab === Boolean(previous.opensInNewTab) ? previous.opensInNewTab : draft.opensInNewTab || undefined;
  return { url, opensInNewTab, rel: rel || (previous.rel === "" ? "" : undefined) };
}

export function clearedLinkDestination(): LinkDestination {
  return { url: "", opensInNewTab: undefined, rel: undefined };
}
