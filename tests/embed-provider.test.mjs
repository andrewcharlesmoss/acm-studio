import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { dailymotionPlayerId, resolveEmbedProvider, withDailymotionPlayerId } = await loadProductionModule(new URL("../app/content/embed-provider.ts", import.meta.url));
const { flickrOEmbedRequest, oEmbedRequest, parseFlickrOEmbed, parseOEmbedResponse, parseResolvedRemoteEmbed } = await loadProductionModule(new URL("../app/content/embed-oembed.ts", import.meta.url));
const { EmbedContent } = await loadProductionModule(new URL("../app/components/embed-content.tsx", import.meta.url));
const { POST: resolveEmbedRoute } = await loadProductionModule(new URL("../app/api/embed/resolve/route.ts", import.meta.url));
const spotifyId = "4uLU6hMCjMI75M1A2tKUQC";

test("Pocket Casts share links map to a bounded, provider-owned player", () => {
  assert.deepEqual(resolveEmbedProvider("https://pca.st/k2rof194"), {
    name: "Pocket Casts", src: "https://pca.st/embed/k2rof194", height: 450,
  });
  assert.deepEqual(resolveEmbedProvider("https://pca.st/qekyjgs6/"), {
    name: "Pocket Casts", src: "https://pca.st/embed/qekyjgs6", height: 450,
  });
  for (const input of [
    "http://pca.st/k2rof194",
    "https://pca.st.evil.test/k2rof194",
    "https://user:p@pca.st/k2rof194",
    "https://pca.st:443/k2rof194",
    "https://pca.st/k2rof194?next=https://evil.test",
    "https://pca.st/k2rof194#fragment",
    "https://pca.st/short",
    "https://pca.st/k2rof194/extra",
  ]) assert.equal(resolveEmbedProvider(input), null, input);
});

test("public WordPress.org and WordPress.com posts map to their embed views", () => {
  assert.deepEqual(resolveEmbedProvider("https://wordpress.org/news/2026/10/wordpress-7-1-4/"), {
    name: "WordPress",
    src: "https://wordpress.org/news/2026/10/wordpress-7-1-4/embed/",
    aspectRatio: "16 / 9",
    height: 360,
  });
  assert.deepEqual(resolveEmbedProvider("https://example.wordpress.com/2024/05/public-post"), {
    name: "WordPress",
    src: "https://example.wordpress.com/2024/05/public-post/embed/",
    aspectRatio: "16 / 9",
    height: 360,
  });
  for (const input of [
    "https://evilwordpress.com/2024/05/public-post",
    "https://wordpress.com.evil.test/2024/05/public-post",
    "https://user@wordpress.org/news/2026/10/wordpress-7-1-4/",
    "https://wordpress.org:443/news/2026/10/wordpress-7-1-4/",
    "http://wordpress.org/news/2026/10/wordpress-7-1-4/",
    "https://wordpress.org/wp-admin/edit.php",
    "https://wordpress.org/news/2026/10/wordpress-7-1-4/embed/",
    "https://wordpress.org/news/2026/10/wordpress-7-1-4/?redirect=https://evil.test",
    "https://wordpress.org/news/2026/10/wordpress-7-1-4/#fragment",
    "https://wordpress.org/news/%2e%2e/wp-admin/",
  ]) assert.equal(resolveEmbedProvider(input), null, input);
});

test("Spotify public entity URLs map to canonical iframe URLs and common heights", () => {
  for (const type of ["track", "album", "artist", "playlist", "show", "episode"]) {
    const provider = resolveEmbedProvider(`https://open.spotify.com/${type}/${spotifyId}`);
    assert.equal(provider.name, "Spotify");
    assert.equal(provider.src, `https://open.spotify.com/embed/${type}/${spotifyId}`);
    assert.equal(provider.height, ["track", "album", "artist", "playlist"].includes(type) ? 352 : 152);
    assert.equal(provider.aspectRatio, undefined);
  }
  assert.equal(resolveEmbedProvider(`https://open.spotify.com/intl-en/playlist/${spotifyId}?si=share_123`).src, `https://open.spotify.com/embed/playlist/${spotifyId}`);
});

test("SoundCloud public track, set, and user URLs map to safe player URLs and dimensions", () => {
  const track = resolveEmbedProvider("https://soundcloud.com/artist/track-name");
  assert.equal(track.name, "SoundCloud");
  assert.equal(new URL(track.src).origin, "https://w.soundcloud.com");
  assert.equal(new URL(track.src).pathname, "/player/");
  assert.equal(new URL(track.src).searchParams.get("url"), "https://soundcloud.com/artist/track-name");
  assert.equal(track.height, 166);
  for (const input of ["https://soundcloud.com/artist/sets/collection", "https://www.soundcloud.com/artist"]) {
    const provider = resolveEmbedProvider(input);
    assert.equal(provider.name, "SoundCloud");
    assert.equal(provider.height, 450);
  }
  assert.equal(new URL(resolveEmbedProvider("https://soundcloud.com/artist/track-name?si=share_123").src).searchParams.get("url"), "https://soundcloud.com/artist/track-name");
});

test("TED public talk URLs map to the official player URL", () => {
  for (const input of [
    "https://www.ted.com/talks/simon_sinek_how_great_leaders_inspire_action",
    "https://ted.com/talks/simon_sinek_how_great_leaders_inspire_action",
    "https://www.ted.com/talks/simon_sinek_how_great_leaders_inspire_action.html",
  ]) {
    assert.deepEqual(resolveEmbedProvider(input), {
      name: "TED",
      src: "https://embed.ted.com/talks/simon_sinek_how_great_leaders_inspire_action.html",
      aspectRatio: "16 / 9",
    });
  }
});

test("VideoPress URLs map only a validated video ID to the official player", () => {
  assert.deepEqual(resolveEmbedProvider("https://videopress.com/v/zKLzUDgS"), {
    name: "VideoPress", src: "https://video.wordpress.com/embed/zKLzUDgS?hd=0&cover=1", aspectRatio: "16 / 9",
  });
  for (const input of [
    "https://videopress.com.evil.test/v/zKLzUDgS",
    "https://videopress.com:443/v/zKLzUDgS",
    "https://videopress.com/v/zKLzUDgS/extra",
    "https://videopress.com/v/zKLzUDgS?next=https://evil.test",
    "https://videopress.com/v/zKLzUDgS#fragment",
    "http://videopress.com/v/zKLzUDgS",
  ]) assert.equal(resolveEmbedProvider(input), null, input);
});

test("public Mixcloud show and playlist URLs map to the player widget", () => {
  for (const input of [
    "https://www.mixcloud.com/spartacus/lambiance/",
    "https://mixcloud.com/spartacus/lambiance",
    "https://www.mixcloud.com/spartacus/playlists/favourites/",
  ]) {
    const provider = resolveEmbedProvider(input);
    assert.equal(provider.name, "Mixcloud");
    assert.equal(new URL(provider.src).origin, "https://player-widget.mixcloud.com");
    assert.equal(new URL(provider.src).pathname, "/");
    assert.equal(new URL(provider.src).searchParams.get("hide_cover"), "1");
    assert.equal(provider.height, 120);
  }
  assert.equal(new URL(resolveEmbedProvider("https://www.mixcloud.com/spartacus/lambiance/").src).searchParams.get("feed"), "https://www.mixcloud.com/spartacus/lambiance/");
  assert.equal(new URL(resolveEmbedProvider("https://www.mixcloud.com/spartacus/playlists/favourites/").src).searchParams.get("feed"), "https://www.mixcloud.com/spartacus/playlists/favourites/");
});

test("public Mixcloud profile URLs use the separate follow widget", () => {
  const profile = resolveEmbedProvider("https://www.mixcloud.com/spartacus/");
  assert.deepEqual(profile, {
    name: "Mixcloud",
    src: "https://follow-widget.mixcloud.com/?u=spartacus",
    height: 250,
  });
});

test("Dailymotion video URLs require and safely apply the configured Player ID", () => {
  const video = resolveEmbedProvider("https://www.dailymotion.com/video/x84sh87?player=x8lr5");
  assert.deepEqual(video, {
    name: "Dailymotion",
    src: "https://geo.dailymotion.com/player/x8lr5.html?video=x84sh87",
    aspectRatio: "16 / 9",
  });

  const playlistUrl = "https://www.dailymotion.com/playlist/x5zhzj";
  assert.equal(dailymotionPlayerId(playlistUrl), "");
  const configuredPlaylistUrl = withDailymotionPlayerId(playlistUrl, "x8lr5");
  assert.equal(configuredPlaylistUrl, `${playlistUrl}?player=x8lr5`);
  assert.equal(dailymotionPlayerId(configuredPlaylistUrl), "x8lr5");
  assert.deepEqual(resolveEmbedProvider(configuredPlaylistUrl), {
    name: "Dailymotion",
    src: "https://geo.dailymotion.com/player/x8lr5.html?playlist=x5zhzj",
    aspectRatio: "16 / 9",
  });

  const shortUrl = "https://dai.ly/x84sh87";
  assert.equal(dailymotionPlayerId(shortUrl), "");
  const configuredShortUrl = withDailymotionPlayerId(shortUrl, "x8lr5");
  assert.equal(configuredShortUrl, `${shortUrl}?player=x8lr5`);
  assert.equal(dailymotionPlayerId(configuredShortUrl), "x8lr5");
  assert.deepEqual(resolveEmbedProvider(configuredShortUrl), video);

  for (const input of [
    "https://www.dailymotion.com/video/x84sh87",
    "https://www.dailymotion.com/video/x84sh87?player=x8lr5&next=evil",
    "https://www.dailymotion.com/video/x84sh87?player=x8lr5&player=attacker",
    "https://www.dailymotion.com/video/x84sh87?player=bad%2Fhost",
    "https://www.dailymotion.com/playlist/x5zhzj",
    "https://www.dailymotion.com/playlist/x5zhzj?player=x8lr5&video=x84sh87",
    "https://www.dailymotion.com/playlist/x5zhzj?player=x8lr5&playlist=x7abc1",
    "https://www.dailymotion.com/playlist/x5zhzj/extra?player=x8lr5",
    "https://www.dailymotion.com/playlist/x5zhzj%2fextra?player=x8lr5",
    "https://www.dailymotion.com/playlist/bad-id?player=x8lr5",
    "https://dailymotion.com.evil.test/playlist/x5zhzj?player=x8lr5",
    "https://www.dailymotion.com:443/playlist/x5zhzj?player=x8lr5",
    "https://dai.ly/playlist/x5zhzj?player=x8lr5",
    "https://dailymotion.com.evil.test/video/x84sh87?player=x8lr5",
    "https://www.dailymotion.com:443/video/x84sh87?player=x8lr5",
    "http://dai.ly/x84sh87?player=x8lr5",
    "https://www.dai.ly/x84sh87?player=x8lr5",
    "https://dai.ly.evil.test/x84sh87?player=x8lr5",
    "https://user@dai.ly/x84sh87?player=x8lr5",
    "https://dai.ly:443/x84sh87?player=x8lr5",
    "https://dai.ly/x84sh87/extra?player=x8lr5",
    "https://dai.ly/x84sh87%2fextra?player=x8lr5",
    "https://dai.ly/bad-id?player=x8lr5",
    "https://dai.ly/x84sh87?next=https://evil.test",
    "https://dai.ly/x84sh87?player=x8lr5&player=other",
    "https://dai.ly/x84sh87?player=x8lr5#fragment",
  ]) assert.equal(resolveEmbedProvider(input), null, input);
});

test("Dailymotion Player ID setting accepts, removes, and validates IDs only for supported source URLs", () => {
  const video = "https://www.dailymotion.com/video/x84sh87";
  assert.equal(dailymotionPlayerId(video), "");
  const configured = withDailymotionPlayerId(video, "x8lr5");
  assert.equal(configured, `${video}?player=x8lr5`);
  assert.equal(dailymotionPlayerId(configured), "x8lr5");
  assert.equal(resolveEmbedProvider(configured).name, "Dailymotion");
  assert.equal(withDailymotionPlayerId(configured, ""), video);
  assert.equal(dailymotionPlayerId(withDailymotionPlayerId(configured, "")), "");
  const playlist = "https://www.dailymotion.com/playlist/x5zhzj";
  assert.equal(withDailymotionPlayerId(playlist, "x8lr5"), `${playlist}?player=x8lr5`);
  assert.equal(withDailymotionPlayerId(withDailymotionPlayerId(playlist, "x8lr5"), ""), playlist);
  for (const invalidId of ["abc", "x8lr5&next=evil", "bad/id", "x".repeat(33)]) {
    assert.equal(withDailymotionPlayerId(video, invalidId), null, invalidId);
  }
  for (const invalidUrl of [
    "https://youtube.com/watch?v=jNQXAC9IVRw",
    "https://dailymotion.com.evil.test/video/x84sh87",
    "https://www.dailymotion.com/video/x84sh87?next=evil",
    "https://www.dailymotion.com/video/x84sh87?player=x8lr5&player=other",
  ]) {
    assert.equal(dailymotionPlayerId(invalidUrl), null, invalidUrl);
    assert.equal(withDailymotionPlayerId(invalidUrl, "x8lr5"), null, invalidUrl);
  }

  for (const invalidShortUrl of [
    "http://dai.ly/x84sh87",
    "https://www.dai.ly/x84sh87",
    "https://dai.ly.evil.test/x84sh87",
    "https://user@dai.ly/x84sh87",
    "https://dai.ly:443/x84sh87",
    "https://dai.ly/x84sh87/extra",
    "https://dai.ly/x84sh87%2fextra",
    "https://dai.ly/bad-id",
    "https://dai.ly/x84sh87?next=evil",
    "https://dai.ly/x84sh87?player=x8lr5&player=other",
    "https://dai.ly/x84sh87#fragment",
  ]) {
    assert.equal(dailymotionPlayerId(invalidShortUrl), null, invalidShortUrl);
    assert.equal(withDailymotionPlayerId(invalidShortUrl, "x8lr5"), null, invalidShortUrl);
  }
});

test("new provider URLs reject malformed origins, path/query injection, and private SoundCloud tokens", () => {
  const invalid = [
    `https://open.spotify.com.evil.example/track/${spotifyId}`,
    `https://open.spotify.com:443/track/${spotifyId}`,
    `https://user@open.spotify.com/track/${spotifyId}`,
    `https://open.spotify.com/track/${spotifyId}/extra`,
    `https://open.spotify.com/track/${spotifyId}%2fextra`,
    `https://open.spotify.com/track/${spotifyId}?si=ok&redirect=https://evil.example`,
    `https://open.spotify.com/track/${spotifyId}?secret_token=private`,
    "https://soundcloud.com.evil.example/artist/track-name",
    "https://soundcloud.com:443/artist/track-name",
    "https://user@soundcloud.com/artist/track-name",
    "https://soundcloud.com/artist/track-name/extra",
    "https://soundcloud.com/artist%2fprivate/track-name",
    "https://soundcloud.com/artist/sets/collection?secret_token=s-private",
    "https://soundcloud.com/artist/sets/collection?si=ok&secret_token=s-private",
    "https://soundcloud.com/artist/track-name#fragment",
    "https://soundcloud.com/artist/track-name#",
    "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?",
    "https://ted.com.evil.example/talks/talk_slug",
    "https://ted.com:443/talks/talk_slug",
    "https://user@ted.com/talks/talk_slug",
    "https://www.ted.com/talks/talk_slug/extra",
    "https://www.ted.com/talks/talk_slug%2fextra",
    "https://www.ted.com/talks/%2e%2e",
    "https://www.ted.com/talks/talk_slug?language=en",
    "https://www.ted.com/talks/talk_slug#transcript",
    "https://www.ted.com/talks/talk_slug#",
    "https://mixcloud.com.evil.example/spartacus/lambiance/",
    "https://mixcloud.com:443/spartacus/lambiance/",
    "https://user@mixcloud.com/spartacus/lambiance/",
    "https://www.mixcloud.com/spartacus/lambiance/extra/",
    "https://www.mixcloud.com/spartacus/playlists/list%2fprivate/",
    "https://www.mixcloud.com/spartacus/lambiance/?feed=https://evil.example/",
    "https://www.mixcloud.com/spartacus/lambiance/#fragment",
  ];
  for (const value of invalid) assert.equal(resolveEmbedProvider(value), null, value);
});

test("existing YouTube, Vimeo, and TikTok player URLs remain unchanged", () => {
  assert.deepEqual(resolveEmbedProvider("https://www.youtube.com/watch?v=jNQXAC9IVRw&t=23s"), { name: "YouTube", src: "https://www.youtube-nocookie.com/embed/jNQXAC9IVRw?start=23", aspectRatio: "16 / 9" });
  assert.deepEqual(resolveEmbedProvider("https://vimeo.com/123456789/abcdef123456"), { name: "Vimeo", src: "https://player.vimeo.com/video/123456789?h=abcdef123456", aspectRatio: "16 / 9" });
  assert.deepEqual(resolveEmbedProvider("https://www.tiktok.com/@creator/video/1234567890123456789"), { name: "TikTok", src: "https://www.tiktok.com/player/v1/1234567890123456789", aspectRatio: "9 / 16" });
});

test("YouTube playlist URLs use the privacy-enhanced playlist player", () => {
  const player = resolveEmbedProvider("https://www.youtube.com/playlist?list=PLC77007E23FF423C6");
  assert.equal(player.name, "YouTube");
  assert.equal(player.aspectRatio, "16 / 9");
  assert.equal(player.src, "https://www.youtube-nocookie.com/embed/?listType=playlist&list=PLC77007E23FF423C6");
  assert.equal(resolveEmbedProvider("https://youtube.com/playlist?list=bad%2fid"), null);
  assert.equal(resolveEmbedProvider("https://youtube.com/playlist"), null);

  assert.equal(
    resolveEmbedProvider("https://www.youtube.com/watch?v=96URE_-aj-8&list=PLC77007E23FF423C6").src,
    "https://www.youtube-nocookie.com/embed/96URE_-aj-8?listType=playlist&list=PLC77007E23FF423C6",
  );
  assert.equal(resolveEmbedProvider("https://www.youtube.com/watch?v=96URE_-aj-8&list=bad%2fid"), null);

  const markup = renderToStaticMarkup(createElement(EmbedContent, {
    url: "https://www.youtube.com/playlist?list=PLC77007E23FF423C6",
    title: "Playlist",
  }));
  assert.match(markup, /src="https:\/\/www\.youtube-nocookie\.com\/embed\/\?listType=playlist&amp;list=PLC77007E23FF423C6"/);
  assert.match(markup, /aspect-ratio:16 \/ 9/);
});

test("Spotify and SoundCloud iframe elements receive explicit provider heights", () => {
  const spotify = renderToStaticMarkup(createElement(EmbedContent, { url: `https://open.spotify.com/track/${spotifyId}`, title: "Track" }));
  assert.match(spotify, /height:352px;min-height:352px/);
  assert.match(spotify, /allow="accelerometer; autoplay; clipboard-write; encrypted-media/);
  const episode = renderToStaticMarkup(createElement(EmbedContent, { url: `https://open.spotify.com/episode/${spotifyId}`, title: "Episode" }));
  assert.match(episode, /height:152px;min-height:152px/);
  const soundcloudTrack = renderToStaticMarkup(createElement(EmbedContent, { url: "https://soundcloud.com/artist/track-name", title: "Track" }));
  assert.match(soundcloudTrack, /height:166px;min-height:166px/);
  const soundcloud = renderToStaticMarkup(createElement(EmbedContent, { url: "https://soundcloud.com/artist/sets/collection", title: "Set" }));
  assert.match(soundcloud, /height:450px;min-height:450px/);
});

test("TED uses its official iframe player and unsupported TED input retains the unavailable fallback", () => {
  const talk = renderToStaticMarkup(createElement(EmbedContent, {
    url: "https://www.ted.com/talks/simon_sinek_how_great_leaders_inspire_action",
    title: "Simon Sinek: How great leaders inspire action",
  }));
  assert.match(talk, /src="https:\/\/embed\.ted\.com\/talks\/simon_sinek_how_great_leaders_inspire_action\.html"/);
  assert.match(talk, /title="Simon Sinek: How great leaders inspire action"/);
  assert.match(talk, /aspect-ratio:16 \/ 9/);

  const rejected = renderToStaticMarkup(createElement(EmbedContent, {
    url: "https://www.ted.com/talks/simon_sinek_how_great_leaders_inspire_action?language=en",
    title: "Unaccepted TED URL",
  }));
  assert.doesNotMatch(rejected, /<iframe/);
  assert.match(rejected, /This URL cannot be embedded/);
  assert.match(rejected, /Open original content/);
});

test("Mixcloud uses its official player with the WordPress-compatible compact height", () => {
  const markup = renderToStaticMarkup(createElement(EmbedContent, {
    url: "https://www.mixcloud.com/spartacus/lambiance/",
    title: "L'Ambiance",
  }));
  assert.match(markup, /src="https:\/\/player-widget\.mixcloud\.com\/\?feed=https%3A%2F%2Fwww\.mixcloud\.com%2Fspartacus%2Flambiance%2F&amp;hide_cover=1"/);
  assert.match(markup, /height:120px;min-height:120px/);
  assert.match(markup, /title="L&#x27;Ambiance"/);
});

test("Mixcloud profile renders the official follow widget", () => {
  const markup = renderToStaticMarkup(createElement(EmbedContent, {
    url: "https://www.mixcloud.com/spartacus/",
    title: "Spartacus profile",
  }));
  assert.match(markup, /src="https:\/\/follow-widget\.mixcloud\.com\/\?u=spartacus"/);
  assert.match(markup, /height:250px;min-height:250px/);
});

test("Flickr photo URLs map only to the fixed oEmbed endpoint", () => {
  const request = flickrOEmbedRequest("https://www.flickr.com/photos/bees/2341623661/");
  assert.equal(request.origin, "https://www.flickr.com");
  assert.equal(request.pathname, "/services/oembed/");
  assert.equal(request.searchParams.get("format"), "json");
  assert.equal(request.searchParams.get("url"), "https://www.flickr.com/photos/bees/2341623661/");
  for (const shortUrl of ["https://flic.kr/p/2n8QxYz", "https://flic.kr/p/2n8QxYz/"]) {
    const shortRequest = oEmbedRequest(shortUrl);
    assert.equal(shortRequest.provider, "Flickr");
    assert.equal(shortRequest.url.origin, "https://www.flickr.com");
    assert.equal(shortRequest.url.pathname, "/services/oembed/");
    assert.equal(shortRequest.url.searchParams.get("url"), shortUrl);
  }
  for (const invalid of [
    "https://flickr.com.evil.test/photos/bees/2341623661/",
    "https://flickr.com:443/photos/bees/2341623661/",
    "https://user@flickr.com/photos/bees/2341623661/",
    "https://www.flickr.com/photos/bees/2341623661/?next=https://evil.test",
    "https://www.flickr.com/photos/bees/2341623661%2fextra/",
    "https://www.flickr.com/photos/bees/2341623661/#photo",
    "https://www.flickr.com/groups/test/",
    "https://flic.kr/p/invalid_id",
    "https://flic.kr/photos/bees/2341623661/",
    "https://flic.kr/p/2n8QxYz?next=https://evil.test",
    "http://www.flickr.com/photos/bees/2341623661/",
  ]) assert.equal(flickrOEmbedRequest(invalid), null, invalid);
});

test("Flickr response exposes only a validated static photo URL and bounded metadata", () => {
  const result = parseFlickrOEmbed({
    type: "photo",
    title: "  Bees at work  ",
    url: "https://live.staticflickr.com/3689/11197949844_1a2b3c4d5e_b.jpg",
    width: 640,
    height: 480,
    html: '<script src="https://evil.test/steal.js"></script>',
  });
  assert.deepEqual(result, {
    provider: "Flickr", kind: "photo", title: "Bees at work",
    src: "https://live.staticflickr.com/3689/11197949844_1a2b3c4d5e_b.jpg", width: 640, height: 480,
  });
  for (const response of [
    { type: "rich", html: '<iframe src="https://evil.test"></iframe>' },
    { type: "photo", url: "https://evil.test/photo.jpg" },
    { type: "photo", url: "http://live.staticflickr.com/3689/11197949844_1a2b3c4d5e_b.jpg" },
    { type: "photo", url: "https://live.staticflickr.com.evil.test/3689/11197949844_1a2b3c4d5e_b.jpg" },
    { type: "photo", url: "https://live.staticflickr.com/3689/11197949844_1a2b3c4d5e_b.jpg?next=https://evil.test" },
    { type: "photo", url: "https://live.staticflickr.com/3689/11197949844_1a2b3c4d5e_unknown.jpg" },
  ]) assert.equal(parseFlickrOEmbed(response), null);
  assert.equal(parseFlickrOEmbed({ type: "photo", url: "https://live.staticflickr.com/3689/11197949844_1a2b3c4d5e_b.jpg", title: "x".repeat(500) }).title.length, 240);
  assert.equal(parseFlickrOEmbed({ type: "photo", url: "https://live.staticflickr.com/3689/11197949844_1a2b3c4d5e_b.jpg", width: 9000 }).width, undefined);
});

test("Flickr accepts the unsuffixed image URL returned by its live oEmbed endpoint", () => {
  const result = parseFlickrOEmbed({
    type: "photo",
    title: "ZB8T0193",
    url: "https://live.staticflickr.com/3123/2341623661_7c99f48bbf.jpg",
    width: 500,
    height: 333,
  });
  assert.deepEqual(result, {
    provider: "Flickr", kind: "photo", title: "ZB8T0193",
    src: "https://live.staticflickr.com/3123/2341623661_7c99f48bbf.jpg", width: 500, height: 333,
  });
});

test("Tumblr oEmbed becomes a post-matched Tumblr frame without executing provider scripts", () => {
  const source = "https://www.tumblr.com/wordpressvip/703811716841160704/what-is-wordpress-vip";
  const request = oEmbedRequest(source);
  assert.equal(request.provider, "Tumblr");
  assert.equal(request.url.origin, "https://www.tumblr.com");
  assert.equal(request.url.pathname, "/oembed/1.0");
  assert.equal(request.url.searchParams.get("url"), source);
  const response = {
    type: "rich",
    title: "WordPress VIP",
    width: 540,
    height: null,
    html: '<div class="tumblr-post" data-href="https://embed.tumblr.com/embed/post/t:eLj-c_062aJ29aNakZbfLw/703811716841160704/v2" data-did="cceec2120fbf321c97aa1c673d9ea7c9f42e4cd6"  ><a href="https://www.tumblr.com/wordpressvip/703811716841160704/what-is-wordpress-vip">https://www.tumblr.com/wordpressvip/703811716841160704/what-is-wordpress-vip</a></div><script async src="https://assets.tumblr.com/post.js?_v=2e3257777411face7e6785c8941f968f"></script>',
  };
  const result = parseOEmbedResponse("Tumblr", response, source);
  assert.deepEqual(result, {
    provider: "Tumblr", kind: "frame", title: "WordPress VIP", width: 540, height: 600,
    src: "https://embed.tumblr.com/embed/post/t:eLj-c_062aJ29aNakZbfLw/703811716841160704/v2?width=540&did=cceec2120fbf321c97aa1c673d9ea7c9f42e4cd6",
  });
  assert.deepEqual(parseResolvedRemoteEmbed("Tumblr", result, source), result);
  assert.equal(parseResolvedRemoteEmbed("Tumblr", result), null, "resolved frames must be tied to a requested public post");
  assert.equal(parseResolvedRemoteEmbed("Tumblr", result, "https://www.tumblr.com/wordpressvip/703811716841160705/other-post"), null);

  for (const input of [
    "https://evil.tumblr.com/post/not-a-post",
    "https://wordpressvip.tumblr.com/703811716841160704/what-is-wordpress-vip",
    "https://custom.example/post/703811716841160704",
    `${source}?next=https://evil.test`,
    "https://www.tumblr.com/wordpressvip/not-a-post",
    "https://www.tumblr.com/wordpressvip/703811716841160704/%2fother",
  ]) assert.equal(oEmbedRequest(input), null, input);
  assert.equal(oEmbedRequest("https://wordpressvip.tumblr.com/post/703811716841160704/what-is-wordpress-vip").provider, "Tumblr");

  const unsafeResponses = [
    { ...response, html: response.html.replace("embed.tumblr.com", "embed.tumblr.com.evil.test") },
    { ...response, html: response.html.replace("703811716841160704/v2", "703811716841160705/v2") },
    { ...response, html: response.html.replace("data-did=\"cceec2120fbf321c97aa1c673d9ea7c9f42e4cd6\"", "data-did=\"bad\"") },
    { ...response, html: response.html + "<script>evil()</script>" },
    { ...response, html: response.html.replace("data-href=", "onclick=\"evil()\" data-href=") },
  ];
  for (const unsafe of unsafeResponses) assert.equal(parseOEmbedResponse("Tumblr", unsafe, source), null);
});

test("same-origin resolver fetches only Tumblr's fixed oEmbed endpoint and returns the checked frame", async () => {
  const previous = globalThis.fetch;
  const source = "https://www.tumblr.com/wordpressvip/703811716841160704/what-is-wordpress-vip";
  const calls = [];
  globalThis.fetch = async (input, options) => {
    calls.push({ url: new URL(String(input)), options });
    return Response.json({
      type: "rich", title: "WordPress VIP", width: 540, height: null,
      html: '<div class="tumblr-post" data-href="https://embed.tumblr.com/embed/post/t:eLj-c_062aJ29aNakZbfLw/703811716841160704/v2" data-did="cceec2120fbf321c97aa1c673d9ea7c9f42e4cd6"  ><a href="https://www.tumblr.com/wordpressvip/703811716841160704/what-is-wordpress-vip">post</a></div><script async src="https://assets.tumblr.com/post.js?_v=2e3257777411face7e6785c8941f968f"></script>',
    });
  };
  try {
    const response = await resolveEmbedRoute(new Request("http://localhost:3010/api/embed/resolve", {
      method: "POST", headers: { origin: "http://localhost:3010", "content-type": "application/json" }, body: JSON.stringify({ url: source }),
    }));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result, {
      provider: "Tumblr", kind: "frame", title: "WordPress VIP", width: 540, height: 600,
      src: "https://embed.tumblr.com/embed/post/t:eLj-c_062aJ29aNakZbfLw/703811716841160704/v2?width=540&did=cceec2120fbf321c97aa1c673d9ea7c9f42e4cd6",
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url.origin, "https://www.tumblr.com");
    assert.equal(calls[0].url.pathname, "/oembed/1.0");
    assert.equal(calls[0].url.searchParams.get("url"), source);
    assert.equal(calls[0].options.redirect, "manual");
    assert.doesNotMatch(JSON.stringify(result), /<script|<div|post\.js/);
  } finally { globalThis.fetch = previous; }
});

test("sanitised resolver responses are validated and retained by the client contract", () => {
  const photo = {
    provider: "Flickr", kind: "photo", title: " Bees at work ",
    src: "https://live.staticflickr.com/3689/11197949844_1a2b3c4d5e_b.jpg", width: 640, height: 480,
  };
  assert.deepEqual(parseResolvedRemoteEmbed("Flickr", photo), {
    provider: "Flickr", kind: "photo", title: "Bees at work", src: photo.src, width: 640, height: 480,
  });
  assert.equal(parseResolvedRemoteEmbed("Flickr", { ...photo, src: "https://evil.test/photo.jpg" }), null);
  assert.equal(parseResolvedRemoteEmbed("Scribd", photo), null);

  const frame = {
    provider: "Speaker Deck", kind: "frame", title: "Atom",
    src: "https://speakerdeck.com/player/31f86a9069ae0132dede22511952b5a3",
  };
  assert.deepEqual(parseResolvedRemoteEmbed("Speaker Deck", frame), frame);
  assert.equal(parseResolvedRemoteEmbed("Speaker Deck", { ...frame, src: "https://evil.test/frame" }), null);
  const pinterestFrame = {
    provider: "Pinterest", kind: "frame", title: "Pin",
    src: "https://assets.pinterest.com/ext/embed.html?id=99360735500167749&src=oembed",
  };
  const pinterestSource = "https://www.pinterest.com/pin/99360735500167749/";
  assert.deepEqual(parseResolvedRemoteEmbed("Pinterest", pinterestFrame, pinterestSource), pinterestFrame);
  assert.equal(parseResolvedRemoteEmbed("Pinterest", pinterestFrame), null);
  assert.equal(parseResolvedRemoteEmbed("Pinterest", pinterestFrame, "https://www.pinterest.com/pin/12345678901234567/"), null);
  assert.equal(parseResolvedRemoteEmbed("Pinterest", { ...pinterestFrame, src: "https://assets.pinterest.com.evil.test/ext/embed.html?id=99360735500167749&src=oembed" }, pinterestSource), null);
});

test("Scribd and Speaker Deck use fixed endpoints and return only validated iframe sources", () => {
  const scribdRequest = oEmbedRequest("https://www.scribd.com/doc/12986/New-features-on-Scribd");
  assert.equal(scribdRequest.provider, "Scribd");
  assert.equal(scribdRequest.url.origin, "https://www.scribd.com");
  assert.equal(scribdRequest.url.pathname, "/services/oembed");
  assert.equal(scribdRequest.url.searchParams.get("url"), "https://www.scribd.com/doc/12986/New-features-on-Scribd");

  const speakerDeckRequest = oEmbedRequest("https://speakerdeck.com/jnunemaker/atom");
  assert.equal(speakerDeckRequest.provider, "Speaker Deck");
  assert.equal(speakerDeckRequest.url.origin, "https://speakerdeck.com");
  assert.equal(speakerDeckRequest.url.pathname, "/oembed.json");
  assert.equal(speakerDeckRequest.url.searchParams.get("url"), "https://speakerdeck.com/jnunemaker/atom");

  const scribd = parseOEmbedResponse("Scribd", {
    type: "rich", title: "New features on Scribd", width: 640, height: 480,
    html: '<div><iframe src="https://www.scribd.com/embeds/12986/content" width="100%" height="600"></iframe></div><script src="https://www.scribd.com/embeds/scripts/iframe.api.js">onerror = ignored</script>',
  });
  assert.deepEqual(scribd, {
    provider: "Scribd", kind: "frame", title: "New features on Scribd",
    src: "https://www.scribd.com/embeds/12986/content", width: 640, height: 480,
  });
  const deck = parseOEmbedResponse("Speaker Deck", {
    type: "rich", title: "Atom", html: '<iframe src="https://speakerdeck.com/player/31f86a9069ae0132dede22511952b5a3"></iframe>',
  });
  assert.deepEqual(deck, {
    provider: "Speaker Deck", kind: "frame", title: "Atom",
    src: "https://speakerdeck.com/player/31f86a9069ae0132dede22511952b5a3",
  });

  for (const unsupported of [
    "https://dailymotion.com/video/x7tgad0", // Core's endpoint omits the required player ID; result is unplayable.
    "https://imgur.com/gallery/abc123", // Response shape is not verified as a safe single iframe.
    "https://example.test/embed/123",
    "https://www.scribd.com/doc/12986/page?redirect=https://evil.test",
    "https://speakerdeck.com/jnunemaker/atom?next=https://evil.test",
    "https://speakerdeck.com/jnunemaker/atom?",
  ]) assert.equal(oEmbedRequest(unsupported), null, unsupported);

  for (const response of [
    { type: "rich", html: '<iframe src="https://evil.test/player/31f86a9069ae0132dede22511952b5a3"></iframe>' },
    { type: "rich", html: '<iframe src="https://speakerdeck.com/player/31f86a9069ae0132dede22511952b5a3" onload="bad()"></iframe>' },
    { type: "rich", html: '<iframe src="https://speakerdeck.com/player/31f86a9069ae0132dede22511952b5a3"></iframe><iframe src="https://evil.test/"></iframe>' },
    { type: "video", html: '<iframe src="https://www.scribd.com/embeds/12986/content"></iframe>' },
    { type: "rich", html: '<iframe src="https://www.scribd.com.evil.test/embeds/12986/content"></iframe>' },
  ]) assert.equal(parseOEmbedResponse("Speaker Deck", response), null);
  assert.equal(parseOEmbedResponse("Scribd", { type: "rich", html: '<iframe src="https://www.scribd.com/embeds/12986/content"></iframe><script src="https://evil.test/x.js"></script>' })?.src, "https://www.scribd.com/embeds/12986/content");
});

test("WordPress.tv uses its fixed endpoint and extracts only its VideoPress iframe", () => {
  const source = "https://wordpress.tv/2026/08/06/new-wordpress-playground-ui/";
  const request = oEmbedRequest(source);
  assert.equal(request.provider, "WordPress.tv");
  assert.equal(request.url.origin, "https://wordpress.tv");
  assert.equal(request.url.pathname, "/oembed/");
  assert.equal(request.url.searchParams.get("url"), source);
  assert.deepEqual(parseOEmbedResponse("WordPress.tv", {
    type: "video", title: null, width: 400, height: 225,
    html: '<iframe title="VideoPress Video Player" src="https://video.wordpress.com/embed/zKLzUDgS?hd=1&amp;cover=1"></iframe><script src="https://v0.wordpress.com/js/next/videopress-iframe.js"></script>',
  }), {
    provider: "WordPress.tv", kind: "frame", title: "",
    src: "https://video.wordpress.com/embed/zKLzUDgS?hd=1&cover=1", width: 400, height: 225,
  });
  for (const invalid of [
    "https://wordpress.tv.evil.test/2026/08/06/video/",
    "https://wordpress.tv:443/2026/08/06/video/",
    "https://wordpress.tv/2026/08/06/video/?next=https://evil.test",
    "https://wordpress.tv/2026/08/06/video%2fextra/",
    "https://wordpress.tv/2026/08/06/video/#fragment",
    "https://wordpress.tv/oembed/?url=https://evil.test",
  ]) assert.equal(oEmbedRequest(invalid), null, invalid);

  for (const response of [
    { type: "rich", html: '<iframe src="https://video.wordpress.com/embed/zKLzUDgS"></iframe>' },
    { type: "video", html: '<iframe src="https://video.wordpress.com.evil.test/embed/zKLzUDgS"></iframe>' },
    { type: "video", html: '<iframe src="https://video.wordpress.com/embed/zKLzUDgS?next=https://evil.test"></iframe>' },
    { type: "video", html: '<iframe src="https://video.wordpress.com/embed/zKLzUDgS?hd=0&amp;hd=1"></iframe>' },
    { type: "video", html: '<iframe src="https://video.wordpress.com/embed/zKLzUDgS"></iframe><iframe src="https://evil.test/"></iframe>' },
  ]) assert.equal(parseOEmbedResponse("WordPress.tv", response), null);
  assert.deepEqual(parseResolvedRemoteEmbed("WordPress.tv", {
    provider: "WordPress.tv", kind: "frame", title: "", src: "https://video.wordpress.com/embed/zKLzUDgS?hd=1&cover=1", width: 400, height: 225,
  }), {
    provider: "WordPress.tv", kind: "frame", title: "", src: "https://video.wordpress.com/embed/zKLzUDgS?hd=1&cover=1", width: 400, height: 225,
  });
  assert.equal(parseResolvedRemoteEmbed("WordPress.tv", {
    provider: "WordPress.tv", kind: "frame", title: "", src: "https://video.wordpress.com/embed/zKLzUDgS?next=https://evil.test",
  }), null);
});

test("Pinterest pin URLs use the fixed endpoint and return only its validated iframe", () => {
  const request = oEmbedRequest("https://www.pinterest.com/pin/99360735500167749/");
  assert.equal(request.provider, "Pinterest");
  assert.equal(request.url.origin, "https://www.pinterest.com");
  assert.equal(request.url.pathname, "/oembed.json");
  assert.equal(request.url.searchParams.get("url"), "https://www.pinterest.com/pin/99360735500167749/");
  assert.equal(request.url.searchParams.get("format"), "json");
  for (const regionalUrl of [
    "https://uk.pinterest.com/pin/99360735500167749/",
    "https://www.pinterest.com.au/pin/99360735500167749/",
    "https://mx.pinterest.com.mx/pin/99360735500167749/",
  ]) {
    const regional = oEmbedRequest(regionalUrl);
    assert.equal(regional.provider, "Pinterest");
    assert.equal(regional.url.origin, "https://www.pinterest.com");
    assert.equal(regional.url.searchParams.get("url"), regionalUrl);
  }
  for (const invalid of [
    "https://pinterest.com/pin/99360735500167749/",
    "https://www.pinterest.com.evil.test/pin/99360735500167749/",
    "https://www.pinterest.com:443/pin/99360735500167749/",
    "https://user@www.pinterest.com/pin/99360735500167749/",
    "https://www.pinterest.com/pin/99360735500167749/?next=https://evil.test",
    "https://www.pinterest.com/pin/99360735500167749%2fother/",
    "https://www.pinterest.com/andrewmoss/boards/",
    "https://pinterest.com.au/pin/99360735500167749/",
    "https://engb.pinterest.com/pin/99360735500167749/",
    "https://www.pinterest.com/pin/not-an-id/",
    "https://www.pinterest.com/pin/99360735500167749/#pin",
    "https://embed.bsky.app/profile/example/post/3kq7aeuwbg42k",
    "https://www.reddit.com/r/aww/comments/193io7n/example/",
  ]) assert.equal(oEmbedRequest(invalid), null, invalid);

  const pinSource = "https://www.pinterest.com/pin/99360735500167749/";
  const pinResponse = {
    type: "rich", title: "Love my Pinterest t-shirt!", width: 450, height: 436,
    html: '<iframe src="https://assets.pinterest.com/ext/embed.html?id=99360735500167749&amp;src=oembed" height="436" width="450"></iframe>',
  };
  const pin = parseOEmbedResponse("Pinterest", pinResponse, pinSource);
  assert.deepEqual(pin, {
    provider: "Pinterest", kind: "frame", title: "Love my Pinterest t-shirt!",
    src: "https://assets.pinterest.com/ext/embed.html?id=99360735500167749&src=oembed", width: 450, height: 436,
  });
  assert.equal(parseOEmbedResponse("Pinterest", {
    ...pinResponse,
    html: '<iframe src="https://assets.pinterest.com/ext/embed.html?id=12345678901234567&amp;src=oembed"></iframe>',
  }, pinSource), null, "a provider response for a different pin must not be accepted");
  assert.equal(parseOEmbedResponse("Pinterest", pinResponse), null, "Pinterest parsing requires the requested source pin");
  assert.deepEqual(parseOEmbedResponse("Pinterest", pinResponse, "https://uk.pinterest.com/pin/99360735500167749/"), pin);

  for (const response of [
    { type: "photo", html: '<iframe src="https://assets.pinterest.com/ext/embed.html?id=99360735500167749&src=oembed"></iframe>' },
    { type: "rich", html: '<iframe src="https://evil.test/ext/embed.html?id=99360735500167749&src=oembed"></iframe>' },
    { type: "rich", html: '<iframe src="https://assets.pinterest.com.evil.test/ext/embed.html?id=99360735500167749&src=oembed"></iframe>' },
    { type: "rich", html: '<iframe src="https://assets.pinterest.com/ext/embed.html/extra?id=99360735500167749&src=oembed"></iframe>' },
    { type: "rich", html: '<iframe src="https://assets.pinterest.com/ext/embed.html?id=99360735500167749&src=other"></iframe>' },
    { type: "rich", html: '<iframe src="https://assets.pinterest.com/ext/embed.html?id=99360735500167749&src=oembed&redirect=https://evil.test"></iframe>' },
    { type: "rich", html: '<iframe src="https://assets.pinterest.com/ext/embed.html?id=99360735500167749&src=oembed"></iframe><iframe src="https://evil.test/"></iframe>' },
  ]) assert.equal(parseOEmbedResponse("Pinterest", response, pinSource), null);

  // Bluesky and Reddit return script-driven blockquotes, not a trusted iframe URL.
  // These are rejected instead of returning or executing provider HTML.
  const scriptWidgetShapes = [
    '<blockquote class="bluesky-embed">Post</blockquote><script async src="https://embed.bsky.app/static/embed.js"></script>',
    '<blockquote class="reddit-embed-bq"><a href="https://www.reddit.com/r/example/comments/12345/">Post</a></blockquote><script async src="https://embed.reddit.com/widgets.js"></script>',
  ];
  for (const html of scriptWidgetShapes) {
    assert.equal(parseOEmbedResponse("Pinterest", { type: "rich", html }, pinSource), null);
  }
});

test("same-origin resolver accepts a bounded Flickr response and sends no credentials or referrer", async () => {
  const previous = globalThis.fetch;
  let requestUrl;
  let requestOptions;
  globalThis.fetch = async (input, options) => {
    requestUrl = String(input);
    requestOptions = options;
    return Response.json({
      type: "photo", title: "Photo", url: "https://live.staticflickr.com/3689/11197949844_1a2b3c4d5e_b.jpg",
      width: 640, height: 480, html: '<script>bad()</script>',
    });
  };
  try {
    const response = await resolveEmbedRoute(new Request("http://localhost:3010/api/embed/resolve", {
      method: "POST", headers: { origin: "http://localhost:3010", "content-type": "application/json" },
      body: JSON.stringify({ url: "https://www.flickr.com/photos/bees/2341623661/" }),
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      provider: "Flickr", kind: "photo", title: "Photo",
      src: "https://live.staticflickr.com/3689/11197949844_1a2b3c4d5e_b.jpg", width: 640, height: 480,
    });
    assert.equal(new URL(requestUrl).origin, "https://www.flickr.com");
    assert.equal(requestOptions.redirect, "manual");
    assert.equal(requestOptions.credentials, "omit");
    assert.equal(requestOptions.referrerPolicy, "no-referrer");
    assert.equal(requestOptions.headers.Authorization, undefined);
    assert.equal(requestOptions.headers.Cookie, undefined);
  } finally { globalThis.fetch = previous; }
});

test("same-origin resolver resolves only fixed Scribd and Speaker Deck player URLs", async () => {
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, options) => {
    calls.push({ url: new URL(String(input)), options });
    if (calls.at(-1).url.hostname === "www.scribd.com") return Response.json({
      type: "rich", title: "Document", width: 640, height: 480,
      html: '<iframe src="https://www.scribd.com/embeds/12986/content"></iframe><script>discard()</script>',
    });
    return Response.json({ type: "rich", title: "Deck", html: '<iframe src="https://speakerdeck.com/player/31f86a9069ae0132dede22511952b5a3"></iframe>' });
  };
  const resolve = url => resolveEmbedRoute(new Request("http://localhost:3010/api/embed/resolve", {
    method: "POST", headers: { origin: "http://localhost:3010", "content-type": "application/json" }, body: JSON.stringify({ url }),
  }));
  try {
    const scribd = await resolve("https://www.scribd.com/doc/12986/New-features-on-Scribd");
    assert.equal(scribd.status, 200);
    assert.deepEqual(await scribd.json(), {
      provider: "Scribd", kind: "frame", title: "Document", src: "https://www.scribd.com/embeds/12986/content", width: 640, height: 480,
    });
    const deck = await resolve("https://speakerdeck.com/jnunemaker/atom");
    assert.equal(deck.status, 200);
    assert.deepEqual(await deck.json(), {
      provider: "Speaker Deck", kind: "frame", title: "Deck", src: "https://speakerdeck.com/player/31f86a9069ae0132dede22511952b5a3",
    });
    assert.deepEqual(calls.map(call => call.url.origin), ["https://www.scribd.com", "https://speakerdeck.com"]);
    for (const call of calls) {
      assert.equal(call.options.credentials, "omit");
      assert.equal(call.options.redirect, "manual");
      assert.equal(call.options.referrerPolicy, "no-referrer");
      assert.equal(call.options.headers.Authorization, undefined);
    }
  } finally { globalThis.fetch = previous; }
});

test("same-origin resolver returns only the Pinterest iframe URL and refuses script-widget providers", async () => {
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, options) => {
    calls.push({ url: new URL(String(input)), options });
    return Response.json({
      type: "rich", title: "Pin", width: 450, height: 436,
      html: '<iframe src="https://assets.pinterest.com/ext/embed.html?id=99360735500167749&amp;src=oembed" height="436" width="450"></iframe>',
    });
  };
  const resolve = url => resolveEmbedRoute(new Request("http://localhost:3010/api/embed/resolve", {
    method: "POST", headers: { origin: "http://localhost:3010", "content-type": "application/json" }, body: JSON.stringify({ url }),
  }));
  try {
    const response = await resolve("https://www.pinterest.com/pin/99360735500167749/");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      provider: "Pinterest", kind: "frame", title: "Pin",
      src: "https://assets.pinterest.com/ext/embed.html?id=99360735500167749&src=oembed", width: 450, height: 436,
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url.origin, "https://www.pinterest.com");
    assert.equal(calls[0].url.pathname, "/oembed.json");
    assert.equal(calls[0].options.credentials, "omit");
    assert.equal(calls[0].options.redirect, "manual");
    assert.equal(calls[0].options.referrerPolicy, "no-referrer");

    globalThis.fetch = async (input, options) => {
      calls.push({ url: new URL(String(input)), options });
      return Response.json({
        type: "rich", title: "Bluesky post",
        html: '<blockquote class="bluesky-embed" data-bluesky-uri="at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3kq7aeuwbg42k"></blockquote><script src="https://embed.bsky.app/static/embed.js"></script>',
      });
    };
    const bluesky = await resolve("https://bsky.app/profile/bsky.app/post/3kq7aeuwbg42k");
    assert.equal(bluesky.status, 200);
    assert.deepEqual(await bluesky.json(), {
      provider: "Bluesky", kind: "frame", title: "Bluesky post",
      src: "https://embed.bsky.app/embed/did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3kq7aeuwbg42k",
    });
    assert.equal(calls[1].url.origin, "https://embed.bsky.app");
    assert.equal(calls[1].url.pathname, "/oembed");
    assert.equal(calls[1].options.credentials, "omit");
    assert.equal(calls[1].options.redirect, "manual");

    assert.equal((await resolve("https://www.reddit.com/r/aww/comments/193io7n/example/")).status, 400);
    assert.equal(calls.length, 2, "unsupported providers must not trigger outbound fetches");

    // A Pinterest response with script-driven blockquote markup is not upgraded
    // to an embed and its HTML never leaves the resolver.
    globalThis.fetch = async () => Response.json({
      type: "rich", title: "Pin", html: '<blockquote>Pin</blockquote><script src="https://assets.pinterest.com/js/pinit.js"></script>',
    });
    const unsafe = await resolve("https://www.pinterest.com/pin/99360735500167749/");
    assert.equal(unsafe.status, 502);
    assert.doesNotMatch(await unsafe.text(), /blockquote|pinit|<script/);

    globalThis.fetch = async () => Response.json({
      type: "rich", title: "Different pin", width: 450, height: 436,
      html: '<iframe src="https://assets.pinterest.com/ext/embed.html?id=12345678901234567&amp;src=oembed"></iframe>',
    });
    const mismatch = await resolve("https://www.pinterest.com/pin/99360735500167749/");
    assert.equal(mismatch.status, 502);
    assert.doesNotMatch(await mismatch.text(), /12345678901234567|Different pin/);
  } finally { globalThis.fetch = previous; }
});

test("same-origin resolver reduces WordPress.tv output to its validated VideoPress iframe", async () => {
  const previous = globalThis.fetch;
  let calledUrl;
  globalThis.fetch = async input => {
    calledUrl = new URL(String(input));
    return Response.json({
      type: "video", title: null, width: 400, height: 225,
      html: '<iframe src="https://video.wordpress.com/embed/zKLzUDgS?hd=1&amp;cover=1"></iframe><script src="https://v0.wordpress.com/js/next/videopress-iframe.js"></script>',
    });
  };
  try {
    const source = "https://wordpress.tv/2026/08/06/new-wordpress-playground-ui/";
    const response = await resolveEmbedRoute(new Request("http://localhost:3010/api/embed/resolve", {
      method: "POST", headers: { origin: "http://localhost:3010", "content-type": "application/json" }, body: JSON.stringify({ url: source }),
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      provider: "WordPress.tv", kind: "frame", title: "",
      src: "https://video.wordpress.com/embed/zKLzUDgS?hd=1&cover=1", width: 400, height: 225,
    });
    assert.equal(calledUrl.origin, "https://wordpress.tv");
    assert.equal(calledUrl.pathname, "/oembed/");
  } finally { globalThis.fetch = previous; }
});

test("Pinterest follows only one exact HTTPS regional oEmbed redirect", async () => {
  const previous = globalThis.fetch;
  const source = "https://www.pinterest.com/pin/99360735500167749/";
  const fixedEndpoint = oEmbedRequest(source).url;
  const regionalUrl = `https://uk.pinterest.com/oembed.json${fixedEndpoint.search}`;
  const request = () => new Request("http://localhost:3010/api/embed/resolve", {
    method: "POST", headers: { origin: "http://localhost:3010", "content-type": "application/json" },
    body: JSON.stringify({ url: source }),
  });
  const frameResponse = () => Response.json({
    type: "rich", title: "Pin", width: 450, height: 436,
    html: '<iframe src="https://assets.pinterest.com/ext/embed.html?id=99360735500167749&amp;src=oembed"></iframe>',
  });
  try {
    const calls = [];
    globalThis.fetch = async (input, options) => {
      calls.push({ url: String(input), options });
      if (calls.length === 1) return new Response(null, { status: 302, headers: { location: regionalUrl } });
      return frameResponse();
    };
    const allowed = await resolveEmbedRoute(request());
    assert.equal(allowed.status, 200);
    assert.deepEqual(await allowed.json(), {
      provider: "Pinterest", kind: "frame", title: "Pin",
      src: "https://assets.pinterest.com/ext/embed.html?id=99360735500167749&src=oembed", width: 450, height: 436,
    });
    assert.deepEqual(calls.map(call => call.url), [fixedEndpoint.href, regionalUrl]);
    assert.ok(calls.every(call => call.options.redirect === "manual"));

    const australianUrl = `https://www.pinterest.com.au/oembed.json${fixedEndpoint.search}`;
    const australianCalls = [];
    globalThis.fetch = async (input, options) => {
      australianCalls.push({ url: String(input), options });
      if (australianCalls.length === 1) return new Response(null, { status: 302, headers: { location: australianUrl } });
      return frameResponse();
    };
    const australianRedirect = await resolveEmbedRoute(request());
    assert.equal(australianRedirect.status, 200);
    assert.deepEqual(australianCalls.map(call => call.url), [fixedEndpoint.href, australianUrl]);

    const rejectedLocations = [
      `https://uk.pinterest.com.evil.test/oembed.json${fixedEndpoint.search}`,
      `https://uk.pinterest.com/oembed.json${fixedEndpoint.search}&next=https%3A%2F%2Fevil.test`,
      `https://uk.pinterest.com/other.json${fixedEndpoint.search}`,
      `https://www.pinterest.com.evil.au/oembed.json${fixedEndpoint.search}`,
      `http://uk.pinterest.com/oembed.json${fixedEndpoint.search}`,
      `https://user@uk.pinterest.com/oembed.json${fixedEndpoint.search}`,
      `https://uk.pinterest.com:443/oembed.json${fixedEndpoint.search}`,
      `${regionalUrl}#fragment`,
    ];
    for (const location of rejectedLocations) {
      let callsForAttempt = 0;
      globalThis.fetch = async (_input, options) => {
        callsForAttempt++;
        assert.equal(options.redirect, "manual");
        return new Response(null, { status: 302, headers: { location } });
      };
      const rejected = await resolveEmbedRoute(request());
      assert.equal(rejected.status, 502, location);
      assert.equal(callsForAttempt, 1, "invalid redirect targets must not be fetched");
      assert.doesNotMatch(await rejected.text(), /pinterest\.com|evil\.test/);
    }

    let secondHopCalls = 0;
    globalThis.fetch = async (_input, options) => {
      secondHopCalls++;
      assert.equal(options.redirect, "manual");
      return new Response(null, {
        status: 302,
        headers: { location: `https://au.pinterest.com/oembed.json${fixedEndpoint.search}` },
      });
    };
    const secondHop = await resolveEmbedRoute(request());
    assert.equal(secondHop.status, 502);
    assert.equal(secondHopCalls, 2, "a second redirect must be rejected without a third request");
  } finally { globalThis.fetch = previous; }
});

test("resolver reports sanitized failure stages only in development", async () => {
  const previousFetch = globalThis.fetch;
  const previousNodeEnv = process.env.NODE_ENV;
  const request = () => new Request("http://localhost:3010/api/embed/resolve", {
    method: "POST", headers: { origin: "http://localhost:3010", "content-type": "application/json" },
    body: JSON.stringify({ url: "https://www.flickr.com/photos/bees/2341623661/" }),
  });
  const inspect = async (fetchMock, expectedDiagnostic, expectedError = "The provider could not resolve this item.") => {
    globalThis.fetch = fetchMock;
    const response = await resolveEmbedRoute(request());
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.error, expectedError);
    assert.deepEqual(body.diagnostic, expectedDiagnostic);
    assert.doesNotMatch(JSON.stringify(body), /flickr\.com|private upstream details|secret response/);
  };

  try {
    process.env.NODE_ENV = "development";
    const fetchError = new TypeError("private upstream details: https://flickr.com/secret");
    fetchError.cause = { code: "ETIMEDOUT", message: "secret response" };
    await inspect(async () => { throw fetchError; }, {
      code: "provider-fetch-error", errorName: "TypeError", causeCode: "ETIMEDOUT",
    });
    await inspect(async () => new Response("secret response", { status: 403 }), {
      code: "provider-http-error", httpStatus: 403,
    });
    await inspect(async () => new Response("secret response", { headers: { "content-type": "text/html" } }), {
      code: "provider-content-type-error",
    }, "The provider returned an unsupported response.");
    await inspect(async () => new Response(null, { headers: { "content-type": "application/json", "content-length": "65537" } }), {
      code: "provider-response-too-large",
    }, "The provider response is too large.");
    await inspect(async () => new Response(null, { headers: { "content-type": "application/json" } }), {
      code: "provider-response-unavailable-or-too-large",
    }, "The provider response could not be read or is too large.");
    await inspect(async () => new Response("{", { headers: { "content-type": "application/json" } }), {
      code: "provider-invalid-json",
    }, "The provider returned invalid JSON.");
    await inspect(async () => Response.json({ type: "video", html: "secret response" }), {
      code: "provider-unsupported-payload",
    }, "The provider response is not a supported embed.");

    process.env.NODE_ENV = "production";
    globalThis.fetch = async () => { throw new TypeError("private upstream details"); };
    const productionResponse = await resolveEmbedRoute(request());
    assert.equal(productionResponse.status, 502);
    assert.deepEqual(await productionResponse.json(), { error: "The provider could not resolve this item." });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("resolver rejects cross-origin, malformed, oversized, unsafe, and non-JSON requests", async () => {
  const request = options => new Request("http://localhost:3010/api/embed/resolve", {
    method: "POST", headers: { origin: "http://localhost:3010", "content-type": "application/json", ...options.headers },
    body: options.body ?? JSON.stringify({ url: "https://www.flickr.com/photos/bees/2341623661/" }),
  });
  const previous = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => { upstreamCalls++; return Response.json({}); };
  try {
    assert.equal((await resolveEmbedRoute(request({ headers: { origin: "https://evil.test" } }))).status, 403);
    assert.equal((await resolveEmbedRoute(request({ headers: { "content-type": "text/plain" } }))).status, 415);
    assert.equal((await resolveEmbedRoute(request({ body: "{" }))).status, 400);
    assert.equal((await resolveEmbedRoute(request({ body: JSON.stringify({ url: "https://www.flickr.com/photos/bees/2341623661/", endpoint: "https://evil.test" }) }))).status, 400);
    assert.equal((await resolveEmbedRoute(request({ body: "x".repeat(5000) }))).status, 413);
    for (const url of ["https://www.dailymotion.com/video/x7tgad0", "https://imgur.com/gallery/abc123"]) {
      assert.equal((await resolveEmbedRoute(request({ body: JSON.stringify({ url }) }))).status, 400, url);
    }
    assert.equal(upstreamCalls, 0);

    globalThis.fetch = async () => Response.json({ type: "photo", url: "https://evil.test/p.jpg" });
    const unsafe = await resolveEmbedRoute(request({}));
    assert.equal(unsafe.status, 502);
    assert.doesNotMatch(await unsafe.text(), /evil\.test|<script|html/);

    globalThis.fetch = async () => new Response("<script>bad()</script>", { headers: { "content-type": "text/html" } });
    assert.equal((await resolveEmbedRoute(request({}))).status, 502);
    globalThis.fetch = async () => { throw new TypeError("redirected"); };
    assert.equal((await resolveEmbedRoute(request({}))).status, 502);
    globalThis.fetch = async () => new Response("x".repeat(65 * 1024), { headers: { "content-type": "application/json" } });
    assert.equal((await resolveEmbedRoute(request({}))).status, 502);
  } finally { globalThis.fetch = previous; }
});

test("resolver rejects all redirects without following or reading their bodies", async () => {
  const previous = globalThis.fetch;
  const previousNodeEnv = process.env.NODE_ENV;
  let calls = 0;
  let cancellations = 0;
  let bodyRead = false;
  let redirectMode;
  const request = () => new Request("http://localhost:3010/api/embed/resolve", {
    method: "POST", headers: { origin: "http://localhost:3010", "content-type": "application/json" },
    body: JSON.stringify({ url: "https://www.flickr.com/photos/bees/2341623661/" }),
  });
  try {
    process.env.NODE_ENV = "development";
    globalThis.fetch = async (_input, options) => {
      calls++;
      redirectMode = options.redirect;
      return {
        ok: false,
        status: 302,
        type: "default",
        headers: new Headers({ location: "https://evil.test/redirect-target" }),
        body: {
          async cancel() { cancellations++; },
          getReader() { bodyRead = true; throw new Error("redirect body must not be read"); },
        },
      };
    };
    const response = await resolveEmbedRoute(request());
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      error: "The provider could not resolve this item.",
      diagnostic: { code: "provider-redirect-rejected", httpStatus: 302 },
    });
    assert.equal(redirectMode, "manual");
    assert.equal(calls, 1);
    assert.equal(cancellations, 1);
    assert.equal(bodyRead, false);

    globalThis.fetch = async (_input, options) => {
      calls++;
      redirectMode = options.redirect;
      return {
        ok: false,
        status: 0,
        type: "opaqueredirect",
        headers: new Headers(),
        body: null,
      };
    };
    const opaque = await resolveEmbedRoute(request());
    assert.equal(opaque.status, 502);
    assert.deepEqual(await opaque.json(), {
      error: "The provider could not resolve this item.",
      diagnostic: { code: "provider-redirect-rejected", httpStatus: 0 },
    });
    assert.equal(redirectMode, "manual");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = previous;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("Bluesky oEmbed output becomes a validated first-party post iframe without executing provider HTML", () => {
  const source = "https://bsky.app/profile/bsky.app/post/3l6oveex3ii2l";
  const request = oEmbedRequest(source);
  assert.equal(request.provider, "Bluesky");
  assert.equal(request.url.origin, "https://embed.bsky.app");
  assert.equal(request.url.pathname, "/oembed");
  assert.equal(request.url.searchParams.get("url"), source);
  const response = {
    type: "rich",
    title: "Bluesky post",
    html: '<blockquote class="bluesky-embed" data-bluesky-uri="at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3l6oveex3ii2l"><p>Post</p></blockquote><script src="https://embed.bsky.app/static/embed.js"></script>',
  };
  const result = parseOEmbedResponse("Bluesky", response, source);
  assert.deepEqual(result, {
    provider: "Bluesky",
    kind: "frame",
    src: "https://embed.bsky.app/embed/did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3l6oveex3ii2l",
    title: "Bluesky post",
  });
  assert.deepEqual(parseResolvedRemoteEmbed("Bluesky", result, source), result);
  for (const html of [
    '<blockquote data-bluesky-uri="at://did:plc:evil/app.bsky.feed.post/3l6oveex3ii2l"></blockquote>',
    '<blockquote data-bluesky-uri="at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/../evil"></blockquote>',
    '<blockquote data-bluesky-uri="at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3l6oveex3ii2l"></blockquote><blockquote data-bluesky-uri="at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3l6oveex3ii2l"></blockquote>',
  ]) assert.equal(parseOEmbedResponse("Bluesky", { type: "rich", html }), null);
  assert.equal(parseResolvedRemoteEmbed("Bluesky", { provider: "Bluesky", kind: "frame", title: "x", src: "https://evil.test/embed" }, source), null);
});

test("X oEmbed output maps only the source post ID to the fixed platform player", () => {
  const source = "https://x.com/WordPress/status/123456789012345";
  const request = oEmbedRequest(source);
  assert.equal(request.provider, "X");
  assert.equal(request.url.origin, "https://publish.twitter.com");
  assert.equal(request.url.searchParams.get("url"), source);
  const result = parseOEmbedResponse("X", {
    type: "rich",
    url: source,
    title: "X post",
    html: '<blockquote class="twitter-tweet"><p>Post</p><a href="https://twitter.com/WordPress/status/123456789012345">Link</a></blockquote><script src="https://platform.twitter.com/widgets.js"></script>',
  }, source);
  assert.deepEqual(result, {
    provider: "X", kind: "frame", src: "https://platform.twitter.com/embed/Tweet.html?id=123456789012345", title: "X post",
  });
  assert.deepEqual(parseResolvedRemoteEmbed("X", result, source), result);
  assert.equal(parseOEmbedResponse("X", { type: "rich", url: source, html: '<blockquote class="twitter-tweet"><a href="https://twitter.com/other/status/999999999999999">wrong ID</a></blockquote>' }), null);
  assert.equal(oEmbedRequest("https://x.com.evil.test/WordPress/status/123456789012345"), null);
  assert.equal(oEmbedRequest("https://x.com/WordPress/status/123456789012345?redirect=https://evil.test"), null);
});

test("SmugMug album URLs use the fixed oEmbed endpoint and reject unverified URL shapes", () => {
  const source = "https://cmac.smugmug.com/SmugMug/Support-Heroes-painted-faces/2504559_TrBCmb";
  const request = oEmbedRequest(source);
  assert.equal(request.provider, "SmugMug");
  assert.equal(request.url.origin, "https://api.smugmug.com");
  assert.equal(request.url.pathname, "/services/oembed/");
  assert.equal(request.url.searchParams.get("url"), source);
  for (const valid of [
    "https://smugmug.com/gallery/2504559_TrBCmb",
    "https://cmac.smugmug.com/SmugMug/Support-Heroes-painted-faces/2504559_TrBCmb/",
  ]) assert.equal(oEmbedRequest(valid)?.provider, "SmugMug", valid);
  for (const invalid of [
    "http://cmac.smugmug.com/SmugMug/Support-Heroes-painted-faces/2504559_TrBCmb",
    "https://smugmug.com.evil.test/gallery/2504559_TrBCmb",
    "https://user@cmac.smugmug.com/gallery/2504559_TrBCmb",
    "https://cmac.smugmug.com:443/gallery/2504559_TrBCmb",
    `${source}?next=https://evil.test`,
    `${source}#photo`,
    "https://cmac.smugmug.com/gallery/no-album-key",
    "https://cmac.smugmug.com/photos/i-VsPgkDp/0/M/i-VsPgkDp-M.jpg",
  ]) assert.equal(oEmbedRequest(invalid), null, invalid);
});

test("SmugMug exposes only its source-matched album iframe and mirrors its no-editor-preview state", () => {
  const source = "https://cmac.smugmug.com/SmugMug/Support-Heroes-painted-faces/2504559_TrBCmb";
  const response = {
    type: "rich", provider_name: "SmugMug", title: "SmugMug Heroes",
    html: '<iframe frameborder="0" scrolling="no" src="https://api.smugmug.com/services/embed/album/TrBCmb"></iframe>',
  };
  const result = parseOEmbedResponse("SmugMug", response, source);
  assert.deepEqual(result, {
    provider: "SmugMug", kind: "frame", title: "SmugMug Heroes",
    src: "https://api.smugmug.com/services/embed/album/TrBCmb",
  });
  assert.deepEqual(parseResolvedRemoteEmbed("SmugMug", result, source), result);
  for (const unsafe of [
    { ...response, html: '<iframe src="https://api.smugmug.com.evil.test/services/embed/album/TrBCmb"></iframe>' },
    { ...response, html: '<iframe src="https://api.smugmug.com/services/embed/album/Other1a"></iframe>' },
    { ...response, html: '<iframe src="https://api.smugmug.com/services/embed/album/TrBCmb?next=https://evil.test"></iframe>' },
    { ...response, html: '<iframe src="http://api.smugmug.com/services/embed/album/TrBCmb"></iframe>' },
    { ...response, html: '<iframe src="https://evil.test/services/embed/album/TrBCmb"></iframe>' },
    { ...response, provider_name: "Other" },
    { ...response, html: '<iframe src="https://api.smugmug.com/services/embed/album/TrBCmb"></iframe><iframe src="https://evil.test/"></iframe>' },
  ]) assert.equal(parseOEmbedResponse("SmugMug", unsafe, source), null);
  assert.equal(parseResolvedRemoteEmbed("SmugMug", result), null);
  assert.equal(parseResolvedRemoteEmbed("SmugMug", result, "https://cmac.smugmug.com/gallery/Other1a"), null);

  const editor = renderToStaticMarkup(createElement(EmbedContent, {
    url: source, title: "SmugMug Heroes", resolveRemote: true, editorPreviewUnavailable: true,
  }));
  assert.match(editor, /Embedded content from cmac\.smugmug\.com can’t be previewed in the editor/);
  assert.doesNotMatch(editor, /<iframe/);
  const preview = renderToStaticMarkup(createElement(EmbedContent, {
    url: source, title: "SmugMug Heroes", resolveRemote: true,
  }));
  assert.doesNotMatch(preview, /can’t be previewed in the editor/);
});

test("same-origin resolver requests SmugMug's fixed endpoint and returns only the validated album frame", async () => {
  const previous = globalThis.fetch;
  let requestUrl;
  let requestOptions;
  globalThis.fetch = async (input, options) => {
    requestUrl = String(input);
    requestOptions = options;
    return Response.json({
      type: "rich", provider_name: "SmugMug", title: "SmugMug Heroes",
      html: '<iframe frameborder="0" scrolling="no" src="https://api.smugmug.com/services/embed/album/TrBCmb"></iframe>',
    });
  };
  try {
    const source = "https://cmac.smugmug.com/SmugMug/Support-Heroes-painted-faces/2504559_TrBCmb";
    const response = await resolveEmbedRoute(new Request("http://localhost:3010/api/embed/resolve", {
      method: "POST", headers: { origin: "http://localhost:3010", "content-type": "application/json" },
      body: JSON.stringify({ url: source }),
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      provider: "SmugMug", kind: "frame", title: "SmugMug Heroes",
      src: "https://api.smugmug.com/services/embed/album/TrBCmb",
    });
    assert.equal(new URL(requestUrl).origin, "https://api.smugmug.com");
    assert.equal(new URL(requestUrl).pathname, "/services/oembed/");
    assert.equal(requestOptions.redirect, "manual");
    assert.equal(requestOptions.credentials, "omit");
    assert.equal(requestOptions.referrerPolicy, "no-referrer");
  } finally { globalThis.fetch = previous; }
});
