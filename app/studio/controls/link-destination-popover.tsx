"use client";

import { useState } from "react";
import { safeTextLink } from "../../content/rich-text";
import { linkDestinationDraft, type LinkDestination, type LinkDestinationDraft } from "../../content/link-destination";
import { StudioAnchoredPopover } from "../overlays/anchored-popover";
import { StudioIcon } from "../studio-icons";
import { StudioButton } from "./button";
import { ToggleSetting } from "./toggle-setting";

export type LinkSuggestion = { id: string; title: string; href: string };

/** The owner validates freshness and commits one destination change. */
export function LinkDestinationPopover({ value, mode, anchor, focusOnMount = false, focusRevision = 0, onFocusPlaced, ignoreOutside, suggestions = [], onEdit, onApply, onRemove, onClose }: {
  value: LinkDestination;
  mode: "edit" | "preview";
  anchor: () => HTMLElement | null;
  focusOnMount?: boolean;
  focusRevision?: number;
  onFocusPlaced?: () => void;
  ignoreOutside?: (target: Node) => boolean;
  suggestions?: LinkSuggestion[];
  onEdit: () => void;
  onApply: (draft: LinkDestinationDraft, baseline: LinkDestination) => string | null;
  onRemove: () => void;
  onClose: (restoreFocus: boolean) => void;
}) {
  const [baseline] = useState<LinkDestination>({ url: value.url, opensInNewTab: value.opensInNewTab, rel: value.rel });
  const [draft, setDraft] = useState(() => linkDestinationDraft(value));
  const [error, setError] = useState<string | null>(null);
  const [copyResult, setCopyResult] = useState<{ url: string; state: "copied" | "failed" } | null>(null);
  const copyState = copyResult?.url === value.url ? copyResult.state : "idle";
  const url = safeTextLink(value.url);
  const matches = suggestions.filter(item => `${item.title} ${item.href}`.toLocaleLowerCase("en-GB").includes(draft.url.trim().toLocaleLowerCase("en-GB"))).slice(0, 5);
  return <StudioAnchoredPopover anchor={anchor} label={mode === "edit" ? "Edit link destination" : "Link destination"} focusOnMount={focusOnMount} focusRevision={focusRevision} onFocusPlaced={onFocusPlaced} ignoreOutside={ignoreOutside} onClose={onClose} className="studio-link-destination">
    <button className="studio-link-close" type="button" onClick={() => onClose(true)} aria-label="Close link destination" title="Close"><StudioIcon name="close" size={20} /></button>
    {mode === "edit" ? <form onSubmit={event => {
      event.preventDefault();
      const message = onApply(draft, baseline);
      setError(message);
    }}>
      <label className="studio-link-url"><span>Link</span><input type="text" value={draft.url} aria-label="Link destination" placeholder="Search or type URL" autoComplete="url" onChange={event => { setDraft(current => ({ ...current, url: event.target.value })); setError(null); }} /></label>
      {matches.length ? <ul className="studio-link-suggestions" aria-label="Internal links">{matches.map(item => <li key={item.id}><button type="button" onClick={() => { setDraft(current => ({ ...current, url: item.href })); setError(null); }}><strong>{item.title}</strong><span>{item.href}</span></button></li>)}</ul> : null}
      <ToggleSetting label="Open in new tab" checked={draft.opensInNewTab} onChange={opensInNewTab => setDraft(current => ({ ...current, opensInNewTab }))} />
      <ToggleSetting label="Mark as nofollow" checked={draft.nofollow} onChange={nofollow => setDraft(current => ({ ...current, nofollow }))} />
      {error ? <p role="alert">{error}</p> : null}
      <div className="studio-link-actions"><StudioButton variant="secondary" type="button" onClick={() => onClose(true)}>Cancel</StudioButton><StudioButton type="submit">Apply</StudioButton></div>
    </form> : <>
      <div className="studio-link-preview"><StudioIcon name="globe" size={20} />{url ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Link destination: ${value.url}`}>{value.url}</a> : <span>{value.url}</span>}</div>
      <div className="studio-link-preview-actions"><button type="button" aria-label="Edit link" title="Edit link" onClick={onEdit}><StudioIcon name="pencil" size={20} /></button><button type="button" aria-label="Remove link" title="Remove link" onClick={onRemove}><StudioIcon name="link-off" size={20} /></button><button type="button" aria-label={copyState === "copied" ? "Link copied" : "Copy link"} title="Copy link" onClick={async () => {
        const copiedUrl = value.url;
        try { await navigator.clipboard.writeText(copiedUrl); setCopyResult({ url: copiedUrl, state: "copied" }); }
        catch { setCopyResult({ url: copiedUrl, state: "failed" }); }
      }}><StudioIcon name="copy" size={20} /></button></div>
      {copyState !== "idle" ? <span className="visually-hidden" role="status">{copyState === "copied" ? "Link copied to clipboard." : "Unable to copy link."}</span> : null}
    </>}
  </StudioAnchoredPopover>;
}
