export type EmbedProvider = { name: "YouTube" | "Vimeo" | "TikTok" | "Spotify" | "SoundCloud" | "TED" | "Mixcloud" | "Dailymotion" | "VideoPress" | "Pocket Casts" | "WordPress"; src: string; aspectRatio?: string; height?: number };

function strictPublicProviderUrl(value: string): URL | null {
  if (value.trim() !== value) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  const authority = /^https:\/\/([^/?#]*)/i.exec(value)?.[1];
  const rawPath = /^https:\/\/[^/?#]*([^?#]*)/i.exec(value)?.[1] || "/";
  if (url.protocol !== "https:" || url.username || url.password || url.port
    || !authority || authority.includes("@") || authority.includes(":")
    || url.pathname !== rawPath || rawPath.includes("%") || url.hash || value.includes("#")
    || (value.includes("?") && !url.search)) return null;
  // Public share links may carry SoundCloud/Spotify's non-secret `si`
  // attribution. Do not accept or forward other query parameters.
  if (url.search && !/^\?si=[A-Za-z0-9_-]{1,128}$/.test(url.search)) return null;
  return url;
}

function dailymotionSourceUrl(value: string): URL | null {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  const authority = /^https:\/\/([^/?#]*)/i.exec(value)?.[1] ?? "";
  const rawPath = /^https:\/\/[^/?#]*([^?#]*)/i.exec(value)?.[1] || "/";
  const host = url.hostname.toLowerCase();
  const validHost = ["dailymotion.com", "www.dailymotion.com"].includes(host) || host === "dai.ly";
  const validPath = host === "dai.ly"
    ? /^\/[A-Za-z0-9]{6,20}\/?$/.test(url.pathname)
    : /^\/(?:video|playlist)\/[A-Za-z0-9]{6,20}\/?$/.test(url.pathname);
  if (url.protocol !== "https:" || !validHost
    || url.username || url.password || url.port || !authority || authority.includes("@") || authority.includes(":")
    || url.pathname !== rawPath || rawPath.includes("%") || url.hash || value.includes("#")
    || !validPath) return null;
  return url;
}

/** Return the configured Player ID, an empty string when it is absent, or null for other/invalid URLs. */
export function dailymotionPlayerId(value: string): string | null {
  const url = dailymotionSourceUrl(value);
  if (!url) return null;
  const playerIds = url.searchParams.getAll("player");
  if (url.searchParams.size === 0) return "";
  if (url.searchParams.size !== 1 || playerIds.length !== 1 || !/^[A-Za-z0-9]{4,32}$/.test(playerIds[0])) return null;
  return playerIds[0];
}

/** Add or remove the Dailymotion Player ID on a supported video or playlist URL. */
export function withDailymotionPlayerId(value: string, playerId: string): string | null {
  if (playerId !== "" && !/^[A-Za-z0-9]{4,32}$/.test(playerId)) return null;
  const url = dailymotionSourceUrl(value);
  if (!url || dailymotionPlayerId(value) === null) return null;
  url.searchParams.delete("player");
  if (playerId) url.searchParams.set("player", playerId);
  return url.href;
}

/** Construct provider players from recognised public URLs; never accept supplied iframe HTML. */
export function resolveEmbedProvider(value: string): EmbedProvider | null {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(host)) {
    const playlistId = host !== "youtu.be" && url.pathname === "/playlist" ? url.searchParams.get("list") : null;
    if (playlistId) {
      if (!/^[A-Za-z0-9_-]{5,80}$/.test(playlistId)) return null;
      const player = new URL("https://www.youtube-nocookie.com/embed/");
      player.searchParams.set("listType", "playlist");
      player.searchParams.set("list", playlistId);
      return { name: "YouTube", src: player.href, aspectRatio: "16 / 9" };
    }
    const id = host === "youtu.be" ? url.pathname.slice(1).split("/")[0]
      : url.pathname === "/watch" ? url.searchParams.get("v")
      : /^\/(?:embed|shorts|live)\/([^/]+)\/?$/.exec(url.pathname)?.[1];
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    const player = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
    const start = url.searchParams.get("start") ?? url.searchParams.get("t");
    if (start && /^\d{1,7}s?$/.test(start)) player.searchParams.set("start", start.replace(/s$/, ""));
    const videoPlaylistId = url.searchParams.get("list");
    if (videoPlaylistId) {
      if (!/^[A-Za-z0-9_-]{5,80}$/.test(videoPlaylistId)) return null;
      player.searchParams.set("listType", "playlist");
      player.searchParams.set("list", videoPlaylistId);
    }
    return { name: "YouTube", src: player.href, aspectRatio: "16 / 9" };
  }
  if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
    const match = /^\/(?:video\/)?(\d{1,12})(?:\/([a-f\d]{6,32}))?\/?$/i.exec(url.pathname);
    if (!match) return null;
    const player = new URL(`https://player.vimeo.com/video/${match[1]}`);
    const hash = url.searchParams.get("h") ?? match[2];
    if (hash) { if (!/^[a-f\d]{6,32}$/i.test(hash)) return null; player.searchParams.set("h", hash); }
    return { name: "Vimeo", src: player.href, aspectRatio: "16 / 9" };
  }
  if (["www.tiktok.com", "tiktok.com"].includes(host)) {
    const id = /^\/@[^/]+\/video\/(\d{10,25})\/?$/.exec(url.pathname)?.[1];
    if (id) return { name: "TikTok", src: `https://www.tiktok.com/player/v1/${id}`, aspectRatio: "9 / 16" };
  }
  if (host === "dailymotion.com" || host === "www.dailymotion.com" || host === "dai.ly") {
    const parsed = dailymotionSourceUrl(value);
    const playerId = dailymotionPlayerId(value);
    const shortVideoId = host === "dai.ly" ? parsed && /^\/([A-Za-z0-9]{6,20})\/?$/.exec(parsed.pathname)?.[1] : null;
    const sourceMatch = host === "dai.ly" ? null : parsed && /^\/(video|playlist)\/([A-Za-z0-9]{6,20})\/?$/.exec(parsed.pathname);
    const videoId = shortVideoId ?? (sourceMatch?.[1] === "video" ? sourceMatch[2] : null);
    const playlistId = sourceMatch?.[1] === "playlist" ? sourceMatch[2] : null;
    const mediaId = videoId ?? playlistId;
    if (mediaId && playerId) {
      const player = new URL(`https://geo.dailymotion.com/player/${playerId}.html`);
      player.searchParams.set(videoId ? "video" : "playlist", mediaId);
      return { name: "Dailymotion", src: player.href, aspectRatio: "16 / 9" };
    }
  }
  const publicUrl = strictPublicProviderUrl(value);
  if (publicUrl) {
    const strictHost = publicUrl.hostname.toLowerCase();
    if ((strictHost === "wordpress.org" || strictHost === "www.wordpress.org" || strictHost === "wordpress.com" || strictHost.endsWith(".wordpress.com"))
      && /^\/(?!wp-admin(?:\/|$)|wp-content(?:\/|$)|wp-json(?:\/|$)|feed(?:\/|$)|embed(?:\/|$))[A-Za-z0-9._~!$&'()*+,;=:@/-]{2,512}\/?$/.test(publicUrl.pathname)
      && !/\/embed\/?$/.test(publicUrl.pathname)) {
      const player = new URL(publicUrl.href);
      player.pathname = `${publicUrl.pathname.replace(/\/$/, "")}/embed/`;
      player.search = "";
      player.hash = "";
      return { name: "WordPress", src: player.href, aspectRatio: "16 / 9", height: 360 };
    }
    if (strictHost === "pca.st" && publicUrl.search === "") {
      const match = /^\/([A-Za-z0-9]{8})\/?$/.exec(publicUrl.pathname);
      if (!match) return null;
      return { name: "Pocket Casts", src: `https://pca.st/embed/${match[1]}`, height: 450 };
    }
    if (strictHost === "open.spotify.com") {
      const match = /^\/(?:intl-[a-z]{2}(?:-[A-Z]{2})?\/)?(track|album|artist|playlist|show|episode)\/([A-Za-z0-9]{22})\/?$/.exec(publicUrl.pathname);
      if (!match) return null;
      return {
        name: "Spotify",
        src: `https://open.spotify.com/embed/${match[1]}/${match[2]}`,
        height: ["track", "album", "artist", "playlist"].includes(match[1]) ? 352 : 152,
      };
    }
    if (strictHost === "soundcloud.com" || strictHost === "www.soundcloud.com") {
      const set = /^\/([A-Za-z0-9][A-Za-z0-9._-]{0,49})\/sets\/([A-Za-z0-9][A-Za-z0-9._-]{0,99})\/?$/.exec(publicUrl.pathname);
      const track = /^\/([A-Za-z0-9][A-Za-z0-9._-]{0,49})\/([A-Za-z0-9][A-Za-z0-9._-]{0,99})\/?$/.exec(publicUrl.pathname);
      const user = /^\/([A-Za-z0-9][A-Za-z0-9._-]{0,49})\/?$/.exec(publicUrl.pathname);
      if (!set && !track && !user) return null;
      const canonicalPath = publicUrl.pathname.replace(/\/$/, "");
      const source = `https://soundcloud.com${canonicalPath}`;
      const player = new URL("https://w.soundcloud.com/player/");
      player.searchParams.set("url", source);
      return { name: "SoundCloud", src: player.href, height: track ? 166 : 450 };
    }
    if ((strictHost === "mixcloud.com" || strictHost === "www.mixcloud.com") && publicUrl.search === "") {
      const path = publicUrl.pathname.endsWith("/") ? publicUrl.pathname : `${publicUrl.pathname}/`;
      const parts = path.split("/").filter(Boolean);
      if (parts.length < 1 || parts.length > 3 || parts.some(part => !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(part))) return null;
      const isPlaylist = parts.length === 3 && parts[1] === "playlists";
      const isShow = parts.length === 2;
      const isProfile = parts.length === 1;
      if (!isPlaylist && !isShow && !isProfile) return null;
      if (isProfile) {
        const profile = new URL("https://follow-widget.mixcloud.com/");
        profile.searchParams.set("u", parts[0]);
        return { name: "Mixcloud", src: profile.href, height: 250 };
      }
      const feed = new URL(`https://www.mixcloud.com/${parts.join("/")}/`);
      const player = new URL("https://player-widget.mixcloud.com/");
      player.searchParams.set("feed", feed.href);
      player.searchParams.set("hide_cover", "1");
      return { name: "Mixcloud", src: player.href, height: 120 };
    }
    if ((strictHost === "ted.com" || strictHost === "www.ted.com") && publicUrl.search === "") {
      const match = /^\/talks\/([a-z0-9_]{1,200})(?:\.html)?$/.exec(publicUrl.pathname);
      if (!match) return null;
      return { name: "TED", src: `https://embed.ted.com/talks/${match[1]}.html`, aspectRatio: "16 / 9" };
    }
    if (strictHost === "videopress.com" && publicUrl.search === "") {
      const match = /^\/v\/([A-Za-z0-9]{6,32})\/?$/.exec(publicUrl.pathname);
      if (!match) return null;
      const player = new URL(`https://video.wordpress.com/embed/${match[1]}`);
      player.searchParams.set("hd", "0");
      player.searchParams.set("cover", "1");
      return { name: "VideoPress", src: player.href, aspectRatio: "16 / 9" };
    }
  }
  return null;
}
