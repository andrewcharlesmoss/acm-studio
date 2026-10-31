import type { IconName } from "@acm/icons";
import { safeTextLink } from "./rich-text";

/** WordPress 7.1's built-in core/social-link service keys and visible names. */
export const coreSocialServices = [
  { id: "wordpress", label: "WordPress" },
  { id: "fivehundredpx", label: "500px" },
  { id: "amazon", label: "Amazon" },
  { id: "bandcamp", label: "Bandcamp" },
  { id: "behance", label: "Behance" },
  { id: "bluesky", label: "Bluesky" },
  { id: "chain", label: "Link" },
  { id: "codepen", label: "CodePen" },
  { id: "deviantart", label: "DeviantArt" },
  { id: "discord", label: "Discord" },
  { id: "dribbble", label: "Dribbble" },
  { id: "dropbox", label: "Dropbox" },
  { id: "etsy", label: "Etsy" },
  { id: "facebook", label: "Facebook" },
  { id: "feed", label: "RSS Feed" },
  { id: "flickr", label: "Flickr" },
  { id: "foursquare", label: "Foursquare" },
  { id: "goodreads", label: "Goodreads" },
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "gravatar", label: "Gravatar" },
  { id: "instagram", label: "Instagram" },
  { id: "lastfm", label: "Last.fm" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "mail", label: "Mail" },
  { id: "mastodon", label: "Mastodon" },
  { id: "meetup", label: "Meetup" },
  { id: "medium", label: "Medium" },
  { id: "patreon", label: "Patreon" },
  { id: "pinterest", label: "Pinterest" },
  { id: "pocket", label: "Pocket" },
  { id: "reddit", label: "Reddit" },
  { id: "snapchat", label: "Snapchat" },
  { id: "soundcloud", label: "SoundCloud" },
  { id: "spotify", label: "Spotify" },
  { id: "telegram", label: "Telegram" },
  { id: "threads", label: "Threads" },
  { id: "tiktok", label: "TikTok" },
  { id: "tumblr", label: "Tumblr" },
  { id: "twitch", label: "Twitch" },
  { id: "twitter", label: "Twitter" },
  { id: "vimeo", label: "Vimeo" },
  { id: "vk", label: "VK" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "x", label: "X" },
  { id: "yelp", label: "Yelp" },
  { id: "youtube", label: "YouTube" },
] as const;

export type CoreSocialService = (typeof coreSocialServices)[number]["id"];
export type SocialServiceInsertType = `social-service:${CoreSocialService}`;

const serviceIds = new Set<string>(coreSocialServices.map(service => service.id));

export function isCoreSocialService(value: unknown): value is CoreSocialService {
  return typeof value === "string" && serviceIds.has(value);
}

export function coreSocialServiceLabel(service: CoreSocialService): string {
  return coreSocialServices.find(item => item.id === service)!.label;
}

/** Link, Mail and RSS use existing neutral ACM symbols; other services use shared service symbols. */
export function coreSocialServiceIcon(service: CoreSocialService): IconName {
  if (service === "chain") return "action.link";
  if (service === "feed") return "communication.rss";
  if (service === "mail") return "communication.envelope";
  if (service === "linkedin") return "social.service.linkedin";
  if (service === "tiktok") return "social.service.tiktok";
  return `social.service.${service}` as IconName;
}

export function socialServiceInsertType(service: CoreSocialService): SocialServiceInsertType {
  return `social-service:${service}`;
}

export function socialServiceFromInsertType(type: string): CoreSocialService | null {
  const service = type.startsWith("social-service:") ? type.slice("social-service:".length) : "";
  return isCoreSocialService(service) ? service : null;
}

function isBareEmail(value: string): boolean {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(value);
}

/** Match core's email and scheme-less host conveniences while retaining Studio's safe URL allowlist. */
export function socialServiceHref(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return null;
  if (isBareEmail(candidate)) return safeTextLink(`mailto:${candidate}`);
  return safeTextLink(candidate);
}

export function socialServiceRel(rel: string | undefined, openInNewTab: boolean): string | undefined {
  const tokens = (rel ?? "").trim().split(/\s+/u).filter(Boolean);
  const seen = new Set(tokens.map(token => token.toLowerCase()));
  if (openInNewTab) {
    for (const token of ["noopener", "nofollow"]) {
      if (!seen.has(token)) {
        tokens.push(token);
        seen.add(token);
      }
    }
  }
  return tokens.length ? tokens.join(" ") : undefined;
}

export function socialIconTypeLabel(block: { type: string; service?: unknown }): string {
  if (block.type === "social-link" && isCoreSocialService(block.service)) return coreSocialServiceLabel(block.service);
  if (block.type === "social-linkedin") return "LinkedIn";
  if (block.type === "social-tiktok") return "TikTok";
  return "Social link";
}

/** The format readers use this to prevent older envelopes silently dropping new service records. */
export function containsCoreSocialLink(value: unknown): boolean {
  const visited = new WeakSet<object>();
  const visit = (item: unknown): boolean => {
    if (!item || typeof item !== "object") return false;
    if (visited.has(item)) return false;
    visited.add(item);
    if (!Array.isArray(item) && (item as Record<string, unknown>).type === "social-link") return true;
    return Array.isArray(item) ? item.some(visit) : Object.values(item).some(visit);
  };
  return visit(value);
}
