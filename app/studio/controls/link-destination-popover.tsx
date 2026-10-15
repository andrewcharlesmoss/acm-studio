"use client";

import { LinkPreviewActions, LinkSuggestions, LinkTextField, LinkUrlField, type LinkSuggestion } from "./link-controls";
export type { LinkSuggestion } from "./link-controls";
import { useState } from "react";
import { safeTextLink } from "../../content/rich-text";
import { linkDestinationDraft, type LinkDestination, type LinkDestinationDraft } from "../../content/link-destination";
import { StudioAnchoredPopover } from "../overlays/anchored-popover";
import { StudioIcon } from "../studio-icons";
import { StudioButton } from "./button";
import { ToggleSetting } from "./toggle-setting";


/** The owner validates freshness and commits one destination change. */
export function LinkDestinationPopover({ value, mode, anchor, inspectorPlacement = false, focusOnMount = false, focusRevision = 0, onFocusPlaced, ignoreOutside, suggestions = [], textControl, onSuggestionSelect, onEdit, onApply, onRemove, onClose }: {
  value: LinkDestination;
  mode: "edit" | "preview";
  anchor: () => HTMLElement | null;
  inspectorPlacement?: boolean;
  focusOnMount?: boolean;
  focusRevision?: number;
  onFocusPlaced?: () => void;
  ignoreOutside?: (target: Node) => boolean;
  suggestions?: LinkSuggestion[];
  textControl?: { value: string; onChange: (text: string) => void };
  onSuggestionSelect?: (suggestion: LinkSuggestion) => void;
  onEdit: () => void;
  onApply: (draft: LinkDestinationDraft, baseline: LinkDestination) => string | null;
  onRemove: () => void;
  onClose: (restoreFocus: boolean) => void;
}) {
  const [baseline] = useState<LinkDestination>({ url: value.url, opensInNewTab: value.opensInNewTab, rel: value.rel });
  const [draft, setDraft] = useState(() => linkDestinationDraft(value));
  const [error, setError] = useState<string | null>(null);
  const url = safeTextLink(value.url);
  const matches = suggestions.filter(item => `${item.title} ${item.href}`.toLocaleLowerCase("en-GB").includes(draft.url.trim().toLocaleLowerCase("en-GB"))).slice(0, 5);
  return <StudioAnchoredPopover inspectorPlacement={inspectorPlacement} anchor={anchor} label={mode === "edit" ? "Edit link destination" : "Link destination"} focusOnMount={focusOnMount} focusRevision={focusRevision} onFocusPlaced={onFocusPlaced} ignoreOutside={ignoreOutside} onClose={onClose} className="studio-link-destination">
    <button className="studio-link-close" type="button" onClick={() => onClose(true)} aria-label="Close link destination" title="Close"><StudioIcon name="close" size={20} /></button>
    {mode === "edit" ? <form onSubmit={event => {
      event.preventDefault();
      const message = onApply(draft, baseline);
      setError(message);
    }}>
      {textControl ? <LinkTextField inputProps={{ value: textControl.value, maxLength: 160, "aria-label": "Navigation link text", onChange: event => textControl.onChange(event.target.value) }} /> : null}
      <LinkUrlField inputProps={{ value: draft.url, "aria-label": "Link destination", onChange: event => { setDraft(current => ({ ...current, url: event.target.value })); setError(null); } }} />
      <LinkSuggestions items={matches} onChoose={item => { setDraft(current => ({ ...current, url: item.href })); onSuggestionSelect?.(item); setError(null); }} />
      <ToggleSetting label="Open in new tab" checked={draft.opensInNewTab} onChange={opensInNewTab => setDraft(current => ({ ...current, opensInNewTab }))} />
      <ToggleSetting label="Mark as nofollow" checked={draft.nofollow} onChange={nofollow => setDraft(current => ({ ...current, nofollow }))} />
      {error ? <p role="alert">{error}</p> : null}
      <div className="studio-link-actions"><StudioButton variant="secondary" type="button" onClick={() => onClose(true)}>Cancel</StudioButton><StudioButton type="submit">Apply</StudioButton></div>
    </form> : <>
      <div className="studio-link-preview"><StudioIcon name="globe" size={20} />{url ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Link destination: ${value.url}`}>{value.url}</a> : <span>{value.url}</span>}</div>
      <LinkPreviewActions url={value.url} onEdit={onEdit} onRemove={onRemove} />
    </>}
  </StudioAnchoredPopover>;
}
