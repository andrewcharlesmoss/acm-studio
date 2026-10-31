"use client";

/* Provider photos are transient remote media; Next image optimisation is not configured for them. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { oEmbedRequest, parseResolvedRemoteEmbed, type ResolvedRemoteEmbed } from "../content/embed-oembed";
import { resolveEmbedProvider } from "../content/embed-provider";
import { safeTextLink } from "../content/rich-text";

export function EmbedContent({ url, title, placeholder = false, resolveRemote = false, editorPreviewUnavailable = false }: { url: string; title: string; placeholder?: boolean; resolveRemote?: boolean; editorPreviewUnavailable?: boolean }) {
  const provider = resolveEmbedProvider(url);
  const hasDirectProvider = Boolean(provider);
  const request = resolveRemote ? oEmbedRequest(url) : null;
  const resolverProvider = request?.provider ?? null;
  const canResolveRemote = Boolean(resolverProvider);
  const suppressRemotePreview = editorPreviewUnavailable && resolverProvider === "SmugMug";
  const [remoteResult, setRemoteResult] = useState<{ url: string; result: ResolvedRemoteEmbed } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const link = safeTextLink(url);

  useEffect(() => {
    if (placeholder || hasDirectProvider || !resolverProvider || !link || suppressRemotePreview) return;
    const controller = new AbortController();
    void fetch("/api/embed/resolve", {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) return null;
      const value: unknown = await response.json();
      return parseResolvedRemoteEmbed(resolverProvider, value, url);
    }).then(result => {
      if (result && !controller.signal.aborted) setRemoteResult({ url, result });
    }).catch(() => undefined);
    return () => controller.abort();
  }, [url, link, placeholder, hasDirectProvider, resolverProvider, suppressRemotePreview, attempt]);

  const remote = remoteResult?.url === url ? remoteResult.result : null;
  const playerStyle = provider ? {
    ...(provider.aspectRatio ? { aspectRatio: provider.aspectRatio } : {}),
    ...(provider.height !== undefined ? { height: provider.height, minHeight: provider.height } : { minHeight: 200 }),
  } : undefined;
  const remoteFrameStyle = remote?.kind === "frame" ? {
    width: "100%",
    aspectRatio: remote.width && remote.height ? `${remote.width} / ${remote.height}` : "16 / 9",
    minHeight: remote.height && remote.width ? Math.min(720, Math.max(240, Math.round(640 * remote.height / remote.width))) : 360,
  } : undefined;

  return <div className="content-provider-embed">
    {placeholder ? <div className="content-embed-placeholder" role="img" aria-label={title || "Embedded content"} style={{ ...(provider?.aspectRatio ? { aspectRatio: provider.aspectRatio } : {}), ...(provider?.height !== undefined ? { height: provider.height } : {}), display: "grid", placeItems: "center", border: "1px solid currentColor" }}>{provider?.name ?? "Embedded content"}</div>
      : suppressRemotePreview ? <p>Embedded content from {new URL(url).hostname} can’t be previewed in the editor.</p>
      : provider ? <iframe key={`${provider.src}-${attempt}`} src={provider.src} title={title || `${provider.name} embedded content`} style={playerStyle} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      : remote?.kind === "photo" && link ? <a href={link} target="_blank" rel="noopener noreferrer" aria-label={`Open original Flickr photo${remote.title ? `: ${remote.title}` : ""}`}><img src={remote.src} alt={remote.title || title || "Flickr photo"} width={remote.width} height={remote.height} loading="lazy" referrerPolicy="no-referrer" style={{ maxWidth: "100%", height: "auto" }} /></a>
      : remote?.kind === "frame" ? <iframe key={`${remote.src}-${attempt}`} src={remote.src} title={remote.title || title || `${remote.provider} embedded content`} style={remoteFrameStyle} loading="lazy" allow="fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" />
      : <p>This URL cannot be embedded. Use the original link to view its content.</p>}
    <div className="content-provider-embed-actions">{link ? <a href={link} target="_blank" rel="noopener noreferrer">Open original content</a> : <span>Enter a valid web address.</span>}{provider || remote || canResolveRemote && !suppressRemotePreview ? <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry embed</button> : null}</div>
  </div>;
}
