export type EmbedProvider = { name: "YouTube" | "Vimeo" | "TikTok"; src: string; aspectRatio: string };

/** Construct provider players from recognised public URLs; never accept supplied iframe HTML. */
export function resolveEmbedProvider(value: string): EmbedProvider | null {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(host)) {
    const id = host === "youtu.be" ? url.pathname.slice(1).split("/")[0]
      : url.pathname === "/watch" ? url.searchParams.get("v")
      : /^\/(?:embed|shorts|live)\/([^/]+)\/?$/.exec(url.pathname)?.[1];
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    const player = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
    const start = url.searchParams.get("start") ?? url.searchParams.get("t");
    if (start && /^\d{1,7}s?$/.test(start)) player.searchParams.set("start", start.replace(/s$/, ""));
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
  return null;
}
