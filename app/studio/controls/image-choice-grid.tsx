import type { ReactNode } from "react";

type ImageChoice = { id: string; name: string };

/** Providers and insertion policy stay with callers; this owns choice presentation. */
export function ImageChoiceGrid<T extends ImageChoice>({ choices, urls, onChoose, disabled = false, loading = false, empty = "No images are available.", className = "", children }: {
  choices: readonly T[]; urls: Record<string, string>; onChoose: (choice: T, url: string) => void;
  disabled?: boolean; loading?: boolean; empty?: string; className?: string; children?: ReactNode;
}) {
  if (loading) return <p role="status">Loading images…</p>;
  if (!choices.length) return <p>{empty}</p>;
  return <div className={`studio-image-choices ${className}`}>{choices.map(choice => <button key={choice.id} type="button" disabled={disabled || !urls[choice.id]} onClick={() => onChoose(choice, urls[choice.id])}>
    {/* URLs are transient caller-owned resources. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {urls[choice.id] ? <img src={urls[choice.id]} alt="" /> : <span aria-hidden="true">Loading…</span>}<span>{choice.name}</span>
  </button>)}{children}</div>;
}
