"use client";

import { useRef, useState, type InputHTMLAttributes, type MouseEventHandler } from "react";
import { StudioIcon } from "../studio-icons";

export type LinkSuggestion = { id: string; title: string; href: string; kind?: string };

/** Owners retain drafts, filtering, destination validation and range transactions. */
export function LinkUrlField({ inputProps }: { inputProps: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> }) {
  return <label className="studio-link-url"><span>Link</span><input {...inputProps} type="text" placeholder={inputProps.placeholder ?? "Search or type URL"} autoComplete="url" /></label>;
}

export function LinkTextField({ inputProps }: { inputProps: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> }) {
  return <label className="studio-link-url"><span>Text</span><input {...inputProps} type="text" /></label>;
}

export function LinkSuggestions<T extends LinkSuggestion>({ items, onChoose, onMouseDown }: { items: readonly T[]; onChoose: (item: T) => void; onMouseDown?: MouseEventHandler<HTMLButtonElement> }) {
  return items.length ? <ul className="studio-link-suggestions" aria-label="Internal links">{items.map(item => <li key={item.id}><button type="button" className={item.kind ? "has-kind" : undefined} onMouseDown={onMouseDown} onClick={() => onChoose(item)}>
    {item.kind ? <span className="link-target-mark" aria-hidden="true">{item.kind === "page" ? "P" : "A"}</span> : null}<span className="studio-link-suggestion-copy"><strong>{item.title}</strong><small>{item.href}</small></span>{item.kind ? <em>{item.kind}</em> : null}
  </button></li>)}</ul> : null;
}

export function LinkPreviewActions({ url, onEdit, onRemove, onClose }: { url: string; onEdit: () => void; onRemove: () => void; onClose?: () => void }) {
  const [copyResult, setCopyResult] = useState<{ url: string; state: "copied" | "failed" } | null>(null);
  const request = useRef(0);
  const copyState = copyResult?.url === url ? copyResult.state : "idle";
  async function copyLink() {
    const copiedUrl = url;
    const sequence = ++request.current;
    try { await navigator.clipboard.writeText(copiedUrl); if (sequence === request.current) setCopyResult({ url: copiedUrl, state: "copied" }); }
    catch { if (sequence === request.current) setCopyResult({ url: copiedUrl, state: "failed" }); }
  }
  return <><div className="studio-link-preview-actions">
    <button type="button" aria-label="Edit link" title="Edit link" onClick={onEdit}><StudioIcon name="pencil" size={20} /></button>
    <button type="button" aria-label="Remove link" title="Remove link" onClick={onRemove}><StudioIcon name="link-off" size={20} /></button>
    <button type="button" aria-label={copyState === "copied" ? "Link copied" : "Copy link"} title={copyState === "copied" ? "Link copied" : "Copy link"} onClick={() => void copyLink()}><StudioIcon name="copy" size={20} /></button>
    {onClose ? <button type="button" aria-label="Close link options" title="Close" onClick={onClose}><StudioIcon name="close" size={20} /></button> : null}
  </div>{copyState !== "idle" ? <span className="visually-hidden" role="status">{copyState === "copied" ? "Link copied to clipboard." : "Unable to copy link."}</span> : null}</>;
}
