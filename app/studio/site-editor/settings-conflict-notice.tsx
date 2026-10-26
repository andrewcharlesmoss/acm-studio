"use client";

import { useState } from "react";
import { StudioButton } from "../controls/button";
import type { WebsiteDesignConflictError } from "./website-design";

const fieldLabels: Record<string, string> = { textColumns: "Columns", textIndent: "Line indent", title: "Site title", tagline: "Tagline" };
const words = (value: string) => value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, letter => letter.toUpperCase());
const display = (value: unknown, present: boolean) => !present || value === undefined ? "Default" : String(typeof value === "object" ? JSON.stringify(value) : value).slice(0, 120);

/** The settings owner retains both versions until a scoped choice is made. */
export function SettingsConflictNotice({ scope, conflict, onResolve }: {
  scope: string; conflict: WebsiteDesignConflictError; onResolve: (choice: "mine" | "theirs") => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function choose(choice: "mine" | "theirs") {
    if (busy) return;
    setBusy(true); setError("");
    try { await onResolve(choice); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The choice could not be applied. Your draft remains available."); }
    finally { setBusy(false); }
  }
  return <div className="studio-notice" role="alert">
    <p><strong>{scope} settings need review.</strong> Choose which overlapping values to keep. Other settings are preserved.</p>
    <ul aria-label="Conflicting website settings">{conflict.conflicts.map((item, index) => {
      const path = item.change.path;
      const blockIndex = path.indexOf("blockStyles");
      const label = [...(blockIndex >= 0 && path[blockIndex + 1] ? [words(path[blockIndex + 1])] : []), fieldLabels[path.at(-1)!] ?? words(path.at(-1) ?? "Settings")].join(" — ");
      return <li key={index}><strong>{label}:</strong> Saved: {display(item.current, item.currentPresent !== false)}; your draft: {item.change.kind === "set" ? display(item.change.after, item.change.afterPresent) : item.change.kind === "delete" ? "Removed" : "Changed"}.</li>;
    })}</ul>
    <StudioButton type="button" variant="text" disabled={busy} onClick={() => void choose("theirs")}>Use Saved Values</StudioButton>{" "}
    <StudioButton type="button" disabled={busy} onClick={() => void choose("mine")}>Use My Values</StudioButton>
    {error ? <p>{error}</p> : null}
  </div>;
}
