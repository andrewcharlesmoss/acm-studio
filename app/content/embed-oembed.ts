export type OEmbedProviderName = "Flickr" | "Scribd" | "Speaker Deck" | "Pinterest" | "WordPress.tv" | "Bluesky" | "X" | "Tumblr" | "SmugMug";

export type ResolvedRemoteEmbed = {
  provider: OEmbedProviderName;
  kind: "photo" | "frame";
  src: string;
  title: string;
  width?: number;
  height?: number;
};

export type OEmbedRequest = { provider: OEmbedProviderName; url: URL };

const FLICKR_SOURCE = /^\/photos\/[A-Za-z0-9@._-]{1,64}\/[0-9]{5,20}\/?$/;
const FLICKR_SHORTLINK = /^\/p\/[A-Za-z0-9]{1,16}\/?$/;
const FLICKR_IMAGE = /^\/[0-9]{1,10}\/[0-9]{5,20}_[A-Za-z0-9]{6,32}(?:_(?:[qtsnmzwcbhk]|[0-9]k|o))?\.(?:jpe?g|png|gif)$/i;
const SCRIBD_SOURCE = /^\/(?:doc|document)\/[0-9]{4,20}(?:\/[A-Za-z0-9._-]{1,120})?\/?$/;
const SCRIBD_EMBED = /^\/embeds\/[0-9]{4,20}\/content\/?$/;
const SPEAKER_DECK_SOURCE = /^\/[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9._-]{1,120}\/?$/;
const SPEAKER_DECK_EMBED = /^\/player\/[a-f0-9]{32}\/?$/i;
const PINTEREST_PIN_SOURCE = /^\/pin\/([0-9]{5,20})\/?$/;
const PINTEREST_EMBED_ID = /^[0-9]{5,20}$/;
const WORDPRESS_TV_VIDEO = /^\/embed\/[A-Za-z0-9]{6,32}$/;
const BLUESKY_POST = /^\/profile\/([^/]+)\/post\/([a-z2-7]{8,32})$/i;
const BLUESKY_POST_URI = /^at:\/\/(did:plc:[a-z2-7]{24})\/app\.bsky\.feed\.post\/([a-z2-7]{8,32})$/i;
const X_POST = /^\/([^/]{1,15})\/status\/(\d{5,25})\/?$/i;
const TUMBLR_POST = /^\/([A-Za-z0-9-]{1,64})\/(\d{9,20})(?:\/[A-Za-z0-9._-]{1,120})?\/?$/;
const TUMBLR_SUBDOMAIN_POST = /^\/post\/(\d{9,20})(?:\/[A-Za-z0-9._-]{1,120})?\/?$/;
const SMUGMUG_SOURCE = /^\/(?:[A-Za-z0-9][A-Za-z0-9._-]{0,119}\/)*(?:[A-Za-z0-9][A-Za-z0-9._-]{0,119}\/)?\d{1,20}_([A-Za-z0-9]{6,12})\/?$/;
const SMUGMUG_EMBED = /^\/services\/embed\/album\/([A-Za-z0-9]{6,12})$/;
const MAX_TEXT = 240;

function isPinterestHost(host: string): boolean {
  return /^(?:[a-z]{2}|www)\.pinterest\.com(?:\.(?:au|mx))?$/.test(host);
}

function strictHttpsUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.length > 2048 || value.trim() !== value) return null;
  const authority = /^https:\/\/([^/?#]*)/i.exec(value)?.[1];
  const rawPath = /^https:\/\/[^/?#]*([^?#]*)/i.exec(value)?.[1] || "/";
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port || !authority
    || authority.includes("@") || authority.includes(":") || url.pathname !== rawPath
    || rawPath.includes("%") || url.hash || value.includes("#")) return null;
  return url;
}

function oEmbedEndpoint(endpoint: string, source: URL): URL {
  const request = new URL(endpoint);
  request.searchParams.set("format", "json");
  request.searchParams.set("maxwidth", "640");
  request.searchParams.set("maxheight", "360");
  request.searchParams.set("url", source.href);
  return request;
}

function tumblrPostId(value: unknown): string | null {
  const source = strictHttpsUrl(value);
  if (!source || source.search || typeof value !== "string" || value.includes("?")) return null;
  const host = source.hostname.toLowerCase();
  if (host === "tumblr.com" || host === "www.tumblr.com") return TUMBLR_POST.exec(source.pathname)?.[2] ?? null;
  if (/^(?!www\.)[a-z0-9-]{1,63}\.tumblr\.com$/.test(host)) return TUMBLR_SUBDOMAIN_POST.exec(source.pathname)?.[1] ?? null;
  return null;
}

function smugMugAlbumKey(value: unknown): string | null {
  const source = strictHttpsUrl(value);
  if (!source || source.search || typeof value !== "string" || value.includes("?")) return null;
  const host = source.hostname.toLowerCase();
  if (!(host === "smugmug.com" || host.endsWith(".smugmug.com"))) return null;
  return SMUGMUG_SOURCE.exec(source.pathname)?.[1] ?? null;
}

/** Map only narrow public source URLs to fixed, first-party oEmbed endpoints. */
export function oEmbedRequest(value: unknown): OEmbedRequest | null {
  const source = strictHttpsUrl(value);
  if (!source || source.search || typeof value !== "string" || value.includes("?")) return null;
  const host = source.hostname.toLowerCase();

  if ((["flickr.com", "www.flickr.com"].includes(host) && FLICKR_SOURCE.test(source.pathname))
    || (host === "flic.kr" && FLICKR_SHORTLINK.test(source.pathname))) {
    return { provider: "Flickr", url: oEmbedEndpoint("https://www.flickr.com/services/oembed/", source) };
  }
  if (["scribd.com", "www.scribd.com"].includes(host) && SCRIBD_SOURCE.test(source.pathname)) {
    return { provider: "Scribd", url: oEmbedEndpoint("https://www.scribd.com/services/oembed", source) };
  }
  if (host === "speakerdeck.com" && SPEAKER_DECK_SOURCE.test(source.pathname)) {
    return { provider: "Speaker Deck", url: oEmbedEndpoint("https://speakerdeck.com/oembed.json", source) };
  }
  if (isPinterestHost(host) && PINTEREST_PIN_SOURCE.test(source.pathname)) {
    return { provider: "Pinterest", url: oEmbedEndpoint("https://www.pinterest.com/oembed.json", source) };
  }
  if (host === "wordpress.tv" && /^\/[0-9]{4}\/[0-9]{2}\/[0-9]{2}\/[A-Za-z0-9][A-Za-z0-9-]{0,180}\/?$/.test(source.pathname)) {
    return { provider: "WordPress.tv", url: oEmbedEndpoint("https://wordpress.tv/oembed/", source) };
  }
  if (host === "bsky.app" && BLUESKY_POST.test(source.pathname)) {
    return { provider: "Bluesky", url: oEmbedEndpoint("https://embed.bsky.app/oembed", source) };
  }
  if (tumblrPostId(source.href)) {
    return { provider: "Tumblr", url: oEmbedEndpoint("https://www.tumblr.com/oembed/1.0", source) };
  }
  if (smugMugAlbumKey(source.href)) {
    return { provider: "SmugMug", url: oEmbedEndpoint("https://api.smugmug.com/services/oembed/", source) };
  }
  if (["twitter.com", "www.twitter.com", "x.com", "www.x.com"].includes(host) && X_POST.test(source.pathname)) {
    return { provider: "X", url: oEmbedEndpoint("https://publish.twitter.com/oembed", source) };
  }
  return null;
}

/** Kept as a compatibility helper for earlier Flickr-specific tests and callers. */
export function flickrOEmbedRequest(value: unknown): URL | null {
  const request = oEmbedRequest(value);
  return request?.provider === "Flickr" ? request.url : null;
}

function boundedText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.split("").filter(character => {
    const code = character.charCodeAt(0);
    return code > 31 && code !== 127;
  }).join("").trim().slice(0, MAX_TEXT);
}

function boundedDimension(value: unknown): number | undefined {
  return Number.isInteger(value) && typeof value === "number" && value >= 1 && value <= 4000 ? value : undefined;
}

function oEmbedData(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function pinterestSourcePinId(value: unknown): string | null {
  const source = strictHttpsUrl(value);
  if (!source || !isPinterestHost(source.hostname.toLowerCase()) || source.search) return null;
  return PINTEREST_PIN_SOURCE.exec(source.pathname)?.[1] ?? null;
}

function flickrPhoto(data: Record<string, unknown>): ResolvedRemoteEmbed | null {
  if (data.type !== "photo") return null;
  const image = strictHttpsUrl(data.url);
  if (!image || image.hostname.toLowerCase() !== "live.staticflickr.com" || image.search
    || !FLICKR_IMAGE.test(image.pathname)) return null;
  const result: ResolvedRemoteEmbed = { provider: "Flickr", kind: "photo", src: image.href, title: boundedText(data.title) };
  const width = boundedDimension(data.width);
  const height = boundedDimension(data.height);
  if (width) result.width = width;
  if (height) result.height = height;
  return result;
}

function extractSingleIframeSrc(html: unknown): string | null {
  if (typeof html !== "string" || html.length > 32 * 1024) return null;
  // Scribd includes a script beside its iframe. Strip only complete script
  // elements because they are never returned to the browser or executed.
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  if (/<\s*script\b|<\s*(?:style|object|embed|svg|video|audio|img)\b|\bon[a-z]+\s*=|javascript:/i.test(markup)) return null;
  const simple = /^\s*<iframe\b([^>]*)>\s*<\/iframe>\s*$/i.exec(markup);
  const wrapped = /^\s*<div\b[^>]*>\s*<iframe\b([^>]*)>\s*<\/iframe>\s*<\/div>\s*$/i.exec(markup);
  const attributes = (simple ?? wrapped)?.[1];
  if (!attributes || /\bsrcdoc\b/i.test(attributes)) return null;
  const sources = [...attributes.matchAll(/(?:^|\s)src\s*=\s*(["'])(.*?)\1/gi)];
  if (sources.length !== 1) return null;
  return sources[0][2].replaceAll("&amp;", "&");
}

function checkedFrameUrl(value: unknown, provider: "Scribd" | "Speaker Deck" | "Pinterest" | "WordPress.tv" | "SmugMug"): URL | null {
  const src = strictHttpsUrl(value);
  if (!src || src.search.length > 1024) return null;

  if (provider === "Scribd") {
    if (src.hostname.toLowerCase() !== "www.scribd.com" || !SCRIBD_EMBED.test(src.pathname)) return null;
    for (const [key, parameter] of src.searchParams) {
      if (key === "start_page") {
        if (!/^[0-9]{1,4}$/.test(parameter)) return null;
      } else if (key === "view_mode") {
        if (!/^[a-z_-]{1,24}$/i.test(parameter)) return null;
      } else if (key === "access_key") {
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(parameter)) return null;
      } else return null;
    }
  } else if (provider === "Speaker Deck") {
    if (src.hostname.toLowerCase() !== "speakerdeck.com" || !SPEAKER_DECK_EMBED.test(src.pathname)) return null;
    for (const [key, parameter] of src.searchParams) {
      if (key !== "slide" || !/^[0-9]{1,5}$/.test(parameter)) return null;
    }
  } else if (provider === "Pinterest") {
    if (src.hostname.toLowerCase() !== "assets.pinterest.com" || src.pathname !== "/ext/embed.html") return null;
    const entries = [...src.searchParams.entries()];
    if (entries.length < 1 || entries.length > 2) return null;
    let idCount = 0;
    let sourceCount = 0;
    for (const [key, parameter] of entries) {
      if (key === "id" && PINTEREST_EMBED_ID.test(parameter)) idCount++;
      else if (key === "src" && parameter === "oembed") sourceCount++;
      else return null;
    }
    if (idCount !== 1 || sourceCount !== 1) return null;
  } else if (provider === "SmugMug") {
    if (src.hostname.toLowerCase() !== "api.smugmug.com" || src.search || !SMUGMUG_EMBED.test(src.pathname)) return null;
  } else {
    if (src.hostname.toLowerCase() !== "video.wordpress.com" || !WORDPRESS_TV_VIDEO.test(src.pathname)) return null;
    const seen = new Set<string>();
    for (const [key, parameter] of src.searchParams) {
      if (!["hd", "cover"].includes(key) || seen.has(key) || !/^[01]$/.test(parameter)) return null;
      seen.add(key);
    }
  }
  return src;
}

function checkedSocialFrameUrl(value: unknown, provider: "Bluesky" | "X"): URL | null {
  const src = strictHttpsUrl(value);
  if (!src || src.search.length > 256) return null;
  if (provider === "Bluesky") {
    if (src.hostname.toLowerCase() !== "embed.bsky.app"
      || !/^\/embed\/did:plc:[a-z2-7]{24}\/app\.bsky\.feed\.post\/[a-z2-7]{8,32}$/i.test(src.pathname)
      || [...src.searchParams.keys()].some(key => key !== "id")) return null;
    const ids = src.searchParams.getAll("id");
    if (ids.length > 1 || (ids.length === 1 && !/^\d{1,25}$/.test(ids[0]))) return null;
    return src;
  }
  if (src.hostname.toLowerCase() !== "platform.twitter.com" || src.pathname !== "/embed/Tweet.html") return null;
  const entries = [...src.searchParams.entries()];
  return entries.length === 1 && entries[0][0] === "id" && /^\d{5,25}$/.test(entries[0][1]) ? src : null;
}

function checkedIframe(value: unknown, provider: "Scribd" | "Speaker Deck" | "Pinterest" | "WordPress.tv" | "SmugMug"): URL | null {
  const rawSource = extractSingleIframeSrc(value);
  if (!rawSource) return null;
  const normalizedSource = rawSource.startsWith("//") ? `https:${rawSource}` : rawSource;
  return checkedFrameUrl(normalizedSource, provider);
}

function remoteFrame(data: Record<string, unknown>, provider: "Scribd" | "Speaker Deck" | "Pinterest" | "WordPress.tv" | "SmugMug", sourceUrl?: unknown): ResolvedRemoteEmbed | null {
  if ((provider === "WordPress.tv" && data.type !== "video") || (provider !== "WordPress.tv" && data.type !== "rich")) return null;
  const src = checkedIframe(data.html, provider);
  if (!src) return null;
  if (provider === "Pinterest") {
    const sourcePinId = pinterestSourcePinId(sourceUrl);
    if (!sourcePinId || src.searchParams.get("id") !== sourcePinId) return null;
  }
  if (provider === "SmugMug") {
    if (data.provider_name !== "SmugMug") return null;
    const sourceAlbumKey = smugMugAlbumKey(sourceUrl);
    const embeddedAlbumKey = SMUGMUG_EMBED.exec(src.pathname)?.[1];
    if (!sourceAlbumKey || !embeddedAlbumKey || sourceAlbumKey !== embeddedAlbumKey) return null;
  }
  const result: ResolvedRemoteEmbed = { provider, kind: "frame", src: src.href, title: boundedText(data.title) };
  const width = boundedDimension(data.width);
  const height = boundedDimension(data.height);
  if (width) result.width = width;
  if (height) result.height = height;
  return result;
}

function remoteSocialFrame(data: Record<string, unknown>, provider: "Bluesky" | "X", sourceUrl?: unknown): ResolvedRemoteEmbed | null {
  if (data.type !== "rich" || typeof data.html !== "string" || data.html.length > 32 * 1024) return null;
  let frame: URL | null = null;
  if (provider === "Bluesky") {
    const uris = [...data.html.matchAll(/\bdata-bluesky-uri\s*=\s*(["'])(.*?)\1/gi)];
    if (uris.length !== 1) return null;
    const post = BLUESKY_POST_URI.exec(uris[0][2]);
    const source = strictHttpsUrl(sourceUrl);
    const sourcePost = source?.hostname.toLowerCase() === "bsky.app" ? BLUESKY_POST.exec(source.pathname)?.[2] : null;
    if (!post || !sourcePost || sourcePost !== post[2]) return null;
    frame = checkedSocialFrameUrl(`https://embed.bsky.app/embed/${post[1]}/app.bsky.feed.post/${post[2]}`, provider);
  } else {
    const source = typeof data.url === "string" ? strictHttpsUrl(data.url) : null;
    const sourceId = source && ["twitter.com", "www.twitter.com", "x.com", "www.x.com"].includes(source.hostname.toLowerCase())
      ? X_POST.exec(source.pathname)?.[2]
      : null;
    const tweetIds = [...data.html.matchAll(/\/(?:[A-Za-z0-9_]{1,15})\/status\/(\d{5,25})(?:[/?"'&#]|$)/gi)];
    const requestedSource = strictHttpsUrl(sourceUrl);
    const requestedId = requestedSource && ["twitter.com", "www.twitter.com", "x.com", "www.x.com"].includes(requestedSource.hostname.toLowerCase())
      ? X_POST.exec(requestedSource.pathname)?.[2]
      : null;
    if (!/<blockquote\b[^>]*\bclass\s*=\s*(["'])[^"']*twitter-tweet[^"']*\1/i.test(data.html)
      || !sourceId || !requestedId || sourceId !== requestedId || tweetIds.length !== 1 || sourceId !== tweetIds[0][1]) return null;
    frame = checkedSocialFrameUrl(`https://platform.twitter.com/embed/Tweet.html?id=${sourceId}`, provider);
  }
  if (!frame) return null;
  return { provider, kind: "frame", src: frame.href, title: boundedText(data.title) };
}

function checkedTumblrFrameUrl(value: unknown, requestedPostId: string): URL | null {
  const frame = strictHttpsUrl(value);
  if (!frame || frame.hostname.toLowerCase() !== "embed.tumblr.com") return null;
  const embeddedPostId = /^\/embed\/post\/t:[A-Za-z0-9_-]{8,64}\/(\d{9,20})\/v2\/?$/.exec(frame.pathname)?.[1];
  const entries = [...frame.searchParams.entries()];
  const widths = frame.searchParams.getAll("width");
  const dids = frame.searchParams.getAll("did");
  if (!embeddedPostId || embeddedPostId !== requestedPostId
    || entries.length !== 2 || widths.length !== 1 || dids.length !== 1
    || !/^\d{3,4}$/.test(widths[0]) || Number(widths[0]) < 320 || Number(widths[0]) > 960
    || !/^[a-f0-9]{40}$/i.test(dids[0])) return null;
  return frame;
}

function tumblrFrame(data: Record<string, unknown>, sourceUrl: unknown): ResolvedRemoteEmbed | null {
  if (data.type !== "rich" || typeof data.html !== "string" || data.html.length > 32 * 1024) return null;
  const requestedPostId = tumblrPostId(sourceUrl);
  if (!requestedPostId) return null;

  // Tumblr supplies a script which builds a frame. Discard that markup and
  // extract only the inert provider URL and post identity.
  const scripts = [...data.html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi)];
  if (scripts.length !== 1) return null;
  const markup = data.html.replace(scripts[0][0], "");
  if (/<\s*script\b/i.test(markup)) return null;
  const wrapper = /^\s*<div\b([^>]*)>\s*<a\b[^>]*href\s*=\s*(["'])([^"']+)\2[^>]*>[^<]*<\/a>\s*<\/div>\s*$/i.exec(markup);
  if (!wrapper) return null;
  const attributes = wrapper[1];
  const classes = [...attributes.matchAll(/\bclass\s*=\s*(["'])(.*?)\1/gi)];
  const hrefs = [...attributes.matchAll(/\bdata-href\s*=\s*(["'])(.*?)\1/gi)];
  const dids = [...attributes.matchAll(/\bdata-did\s*=\s*(["'])(.*?)\1/gi)];
  const unrecognisedAttributes = attributes.replace(/\b(?:class|data-href|data-did)\s*=\s*(["'])(.*?)\1/gi, "").trim();
  if (classes.length !== 1 || classes[0][2] !== "tumblr-post" || hrefs.length !== 1 || dids.length !== 1
    || unrecognisedAttributes || !/^[a-f0-9]{40}$/i.test(dids[0][2])
    || tumblrPostId(wrapper[3]) !== requestedPostId) return null;

  const embed = strictHttpsUrl(hrefs[0][2]);
  if (!embed || embed.search || embed.hostname.toLowerCase() !== "embed.tumblr.com") return null;
  const embedMatch = /^\/embed\/post\/(t:[A-Za-z0-9_-]{8,64})\/(\d{9,20})\/v2\/?$/.exec(embed.pathname);
  if (!embedMatch || embedMatch[2] !== requestedPostId) return null;
  const player = new URL(embed.href);
  player.searchParams.set("width", String(Math.max(320, Math.min(960, boundedDimension(data.width) ?? 540))));
  player.searchParams.set("did", dids[0][2]);
  const frame = checkedTumblrFrameUrl(player.href, requestedPostId);
  if (!frame) return null;

  const result: ResolvedRemoteEmbed = { provider: "Tumblr", kind: "frame", src: frame.href, title: boundedText(data.title), height: 600 };
  const width = boundedDimension(data.width);
  if (width) result.width = width;
  return result;
}

/** Return only an approved image/player URL and bounded text/dimensions; never return provider HTML. */
export function parseOEmbedResponse(provider: OEmbedProviderName, value: unknown, sourceUrl?: unknown): ResolvedRemoteEmbed | null {
  const data = oEmbedData(value);
  if (!data) return null;
  if (provider === "Flickr") return flickrPhoto(data);
  if (provider === "Bluesky" || provider === "X") return remoteSocialFrame(data, provider, sourceUrl);
  if (provider === "Tumblr") return tumblrFrame(data, sourceUrl);
  if (provider === "Scribd" || provider === "Speaker Deck" || provider === "WordPress.tv") return remoteFrame(data, provider);
  if (provider === "Pinterest") return remoteFrame(data, provider, sourceUrl);
  if (provider === "SmugMug") return remoteFrame(data, provider, sourceUrl);
  return null;
}

/** Validate the sanitised response returned by the same-origin resolver. */
export function parseResolvedRemoteEmbed(provider: OEmbedProviderName, value: unknown, sourceUrl?: unknown): ResolvedRemoteEmbed | null {
  const data = oEmbedData(value);
  if (!data || data.provider !== provider || typeof data.title !== "string") return null;

  const result: ResolvedRemoteEmbed = { provider, kind: "photo", src: "", title: boundedText(data.title) };
  const width = boundedDimension(data.width);
  const height = boundedDimension(data.height);
  if (width) result.width = width;
  if (height) result.height = height;

  if (provider === "Flickr" && data.kind === "photo") {
    const image = strictHttpsUrl(data.src);
    if (!image || image.hostname.toLowerCase() !== "live.staticflickr.com" || image.search
      || !FLICKR_IMAGE.test(image.pathname)) return null;
    return { ...result, kind: "photo", src: image.href };
  }

  if ((provider === "Bluesky" || provider === "X") && data.kind === "frame") {
    const frame = checkedSocialFrameUrl(data.src, provider);
    if (!frame) return null;
    const requestedSource = strictHttpsUrl(sourceUrl);
    if (provider === "Bluesky") {
      const requestedPost = requestedSource?.hostname.toLowerCase() === "bsky.app" ? BLUESKY_POST.exec(requestedSource.pathname)?.[2] : null;
      const embeddedPost = /^\/embed\/did:plc:[a-z2-7]{24}\/app\.bsky\.feed\.post\/([a-z2-7]{8,32})$/i.exec(frame.pathname)?.[1];
      if (!requestedPost || requestedPost !== embeddedPost) return null;
    } else {
      const requestedPost = requestedSource && ["twitter.com", "www.twitter.com", "x.com", "www.x.com"].includes(requestedSource.hostname.toLowerCase())
        ? X_POST.exec(requestedSource.pathname)?.[2]
        : null;
      if (!requestedPost || frame.searchParams.get("id") !== requestedPost) return null;
    }
    return { ...result, kind: "frame", src: frame.href };
  }

  if ((provider === "Scribd" || provider === "Speaker Deck" || provider === "Pinterest" || provider === "WordPress.tv" || provider === "SmugMug") && data.kind === "frame") {
    const frame = checkedFrameUrl(data.src, provider);
    if (!frame) return null;
    if (provider === "Pinterest") {
      const sourcePinId = pinterestSourcePinId(sourceUrl);
      if (!sourcePinId || frame.searchParams.get("id") !== sourcePinId) return null;
    }
    if (provider === "SmugMug") {
      const sourceAlbumKey = smugMugAlbumKey(sourceUrl);
      const embeddedAlbumKey = SMUGMUG_EMBED.exec(frame.pathname)?.[1];
      if (!sourceAlbumKey || !embeddedAlbumKey || sourceAlbumKey !== embeddedAlbumKey) return null;
    }
    return { ...result, kind: "frame", src: frame.href };
  }

  if (provider === "Tumblr" && data.kind === "frame") {
    const requestedPostId = tumblrPostId(sourceUrl);
    if (!requestedPostId) return null;
    const frame = checkedTumblrFrameUrl(data.src, requestedPostId);
    if (!frame) return null;
    return { ...result, kind: "frame", src: frame.href };
  }

  return null;
}

/** Kept as a compatibility helper for earlier Flickr-specific tests and callers. */
export function parseFlickrOEmbed(value: unknown): ResolvedRemoteEmbed | null {
  return parseOEmbedResponse("Flickr", value);
}
