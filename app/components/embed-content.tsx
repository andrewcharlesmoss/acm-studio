"use client";

import { useState } from "react";
import { resolveEmbedProvider } from "../content/embed-provider";
import { safeTextLink } from "../content/rich-text";

export function EmbedContent({ url, title, placeholder = false }: { url: string; title: string; placeholder?: boolean }) {
  const provider = resolveEmbedProvider(url);
  const [attempt, setAttempt] = useState(0);
  const link = safeTextLink(url);
  return <div className="content-provider-embed">
    {placeholder ? <div className="content-embed-placeholder" role="img" aria-label={title || "Embedded content"} style={{ aspectRatio: provider?.aspectRatio ?? "16 / 9", display: "grid", placeItems: "center", border: "1px solid currentColor" }}>{provider?.name ?? "Embedded content"}</div> : provider ? <iframe key={`${provider.src}-${attempt}`} src={provider.src} title={title || `${provider.name} embedded content`} style={{ aspectRatio: provider.aspectRatio }} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <p>This URL cannot be embedded. Use the original link to view its content.</p>}
    <div className="content-provider-embed-actions">{link ? <a href={link} target="_blank" rel="noopener noreferrer">Open original content</a> : <span>Enter a valid web address.</span>}{provider ? <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry embed</button> : null}</div>
  </div>;
}
