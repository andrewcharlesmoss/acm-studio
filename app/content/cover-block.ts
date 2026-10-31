import { safeVideoSource } from "./video-block";
import { resolveEmbedProvider } from "./embed-provider";
import { oEmbedRequest, parseResolvedRemoteEmbed } from "./embed-oembed";

export const COVER_CONTENT_POSITIONS = [
  "top left", "top center", "top right",
  "center left", "center center", "center right",
  "bottom left", "bottom center", "bottom right",
] as const;

export type CoverContentPosition = typeof COVER_CONTENT_POSITIONS[number];

export type CoverVideoBackground = { provider: "youtube" | "vimeo" | "tiktok" | "videopress"; url: string };

/** Direct native media source for a Cover background, separate from provider iframe URLs. */
export function validNativeCoverVideoSource(value: unknown): value is string {
  return typeof value === "string" && value.length <= 2048 && value.trim() === value && Boolean(safeVideoSource(value));
}

/** Accept only bounded HTTPS video URLs from providers with fixed player mappings. */
export function coverVideoBackground(value: unknown): CoverVideoBackground | null {
  if (typeof value !== "string" || value.length > 2048 || value.trim() !== value) return null;
  const resolved = resolveEmbedProvider(value);
  if (!resolved || !["YouTube", "Vimeo", "TikTok", "VideoPress"].includes(resolved.name)) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  const allowedHosts = resolved.name === "YouTube" ? ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"]
    : resolved.name === "Vimeo" ? ["vimeo.com", "www.vimeo.com", "player.vimeo.com"]
      : resolved.name === "TikTok" ? ["tiktok.com", "www.tiktok.com"] : ["videopress.com"];
  if (!allowedHosts.includes(host) || url.hash) return null;
  const allowedQuery = resolved.name === "YouTube" ? new Set(["v", "t", "start", "list"])
    : resolved.name === "Vimeo" ? new Set(["h"])
      : new Set<string>();
  const keys = [...url.searchParams.keys()];
  if (keys.some(key => !allowedQuery.has(key)) || new Set(keys).size !== keys.length) return null;
  if (resolved.name === "YouTube" && url.searchParams.has("v") && url.pathname !== "/watch") return null;
  if (resolved.name === "VideoPress" && url.search) return null;
  return { provider: resolved.name === "YouTube" ? "youtube" : resolved.name === "Vimeo" ? "vimeo" : resolved.name === "TikTok" ? "tiktok" : "videopress", url: value };
}

/** Convert a validated WordPress.tv oEmbed result to the existing VideoPress source contract. */
export function coverVideoBackgroundFromWordPressTv(value: unknown, resolvedValue: unknown): CoverVideoBackground | null {
  if (oEmbedRequest(value)?.provider !== "WordPress.tv") return null;
  const resolved = parseResolvedRemoteEmbed("WordPress.tv", resolvedValue, value);
  if (!resolved || resolved.kind !== "frame") return null;
  let player: URL;
  try { player = new URL(resolved.src); } catch { return null; }
  const videoId = player.hostname === "video.wordpress.com"
    ? /^\/embed\/([A-Za-z0-9]{6,32})$/.exec(player.pathname)?.[1]
    : null;
  if (!videoId) return null;
  return coverVideoBackground(`https://videopress.com/v/${videoId}`);
}

export function validCoverVideoBackground(value: unknown): value is CoverVideoBackground {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const parsed = coverVideoBackground(candidate.url);
  return Boolean(parsed && candidate.provider === parsed.provider && Object.keys(candidate).every(key => key === "provider" || key === "url"));
}

export function coverVideoPlayerUrl(value: CoverVideoBackground, autoplay = true): string | null {
  if (!validCoverVideoBackground(value)) return null;
  const resolved = resolveEmbedProvider(value.url);
  const provider = resolved?.name === "YouTube" ? "youtube" : resolved?.name === "Vimeo" ? "vimeo" : resolved?.name === "TikTok" ? "tiktok" : resolved?.name === "VideoPress" ? "videopress" : null;
  if (!resolved || provider !== value.provider) return null;
  const player = new URL(resolved.src);
  if (value.provider === "youtube") {
    if (autoplay) player.searchParams.set("autoplay", "1");
    player.searchParams.set("mute", "1");
    player.searchParams.set("loop", "1");
    player.searchParams.set("controls", "0");
    player.searchParams.set("modestbranding", "1");
    player.searchParams.set("playsinline", "1");
    const videoId = /^\/embed\/([A-Za-z0-9_-]{11})\/?$/.exec(player.pathname)?.[1];
    if (videoId) player.searchParams.set("playlist", videoId);
  } else if (value.provider === "vimeo") {
    player.searchParams.set("muted", "1");
    player.searchParams.set("loop", "1");
    player.searchParams.set("controls", "0");
    player.searchParams.set("transparent", "0");
    if (autoplay) {
      player.searchParams.set("autoplay", "1");
      player.searchParams.set("background", "1");
    }
  } else if (value.provider === "videopress") {
    player.searchParams.set("muted", "1");
    player.searchParams.set("loop", "1");
    if (autoplay) player.searchParams.set("autoplay", "1");
  }
  return player.href;
}

/** Detect Cover video data before a versioned reader can silently discard it. */
export function containsCoverVideoBackground(value: unknown): boolean {
  const seen = new Set<object>();
  const visit = (item: unknown): boolean => {
    if (!item || typeof item !== "object") return false;
    if (seen.has(item)) return false;
    seen.add(item);
    if (Array.isArray(item)) return item.some(visit);
    const record = item as Record<string, unknown>;
    return (record.type === "cover" && record.videoBackground !== undefined) || Object.values(record).some(visit);
  };
  return visit(value);
}

export function containsNativeCoverVideoSource(value: unknown): boolean {
  const seen = new Set<object>();
  const visit = (item: unknown): boolean => {
    if (!item || typeof item !== "object" || seen.has(item)) return false;
    seen.add(item);
    if (Array.isArray(item)) return item.some(visit);
    const record = item as Record<string, unknown>;
    return (record.type === "cover" && record.nativeVideoUrl !== undefined) || Object.values(record).some(visit);
  };
  return visit(value);
}

export function isCoverContentPosition(value: unknown): value is CoverContentPosition {
  return typeof value === "string" && (COVER_CONTENT_POSITIONS as readonly string[]).includes(value);
}

export function coverContentPositionClass(value: CoverContentPosition | undefined): string | undefined {
  return value && value !== "center center" ? `is-position-${value.replace(" ", "-")}` : undefined;
}

/** Detect the new body Cover block in a versioned envelope before validation. */
export function containsCoverBlock(value: unknown): boolean {
  const seen = new Set<object>();
  const visit = (item: unknown): boolean => {
    if (!item || typeof item !== "object") return false;
    if (seen.has(item)) return false;
    seen.add(item);
    if (Array.isArray(item)) return item.some(visit);
    const record = item as Record<string, unknown>;
    return record.type === "cover" || Object.values(record).some(visit);
  };
  return visit(value);
}

/** Detect versioned Cover content positioning without rejecting older Covers. */
export function containsCoverContentPosition(value: unknown): boolean {
  const seen = new Set<object>();
  const visit = (item: unknown): boolean => {
    if (!item || typeof item !== "object") return false;
    if (seen.has(item)) return false;
    seen.add(item);
    if (Array.isArray(item)) return item.some(visit);
    const record = item as Record<string, unknown>;
    return (record.type === "cover" && record.contentPosition !== undefined) || Object.values(record).some(visit);
  };
  return visit(value);
}

/** Detect the persisted Cover inner-content-width setting in a versioned envelope. */
export function containsCoverInnerContentWidth(value: unknown): boolean {
  const seen = new Set<object>();
  const visit = (item: unknown): boolean => {
    if (!item || typeof item !== "object") return false;
    if (seen.has(item)) return false;
    seen.add(item);
    if (Array.isArray(item)) return item.some(visit);
    const record = item as Record<string, unknown>;
    return (record.type === "cover" && record.innerContentWidth !== undefined) || Object.values(record).some(visit);
  };
  return visit(value);
}
