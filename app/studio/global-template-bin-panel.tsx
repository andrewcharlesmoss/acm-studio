"use client";
import { useState } from "react";
import type { useTemplates } from "./use-templates";
import { restoreGlobalTemplate } from "./global-template-bin";
import { StudioIcon } from "./studio-icons";
import { useStudioHistoryShortcuts } from "./use-studio-history-shortcuts";

/** Global originals have their own recoverable Bin, independent of site recovery copies. */
export function GlobalTemplateBinPanel({ session }: { session: ReturnType<typeof useTemplates> }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useStudioHistoryShortcuts(session.undo, session.redo, session.writable && !busy);
  async function restore(id: string) {
    setBusy(true);
    try {
      if (!session.commit(store => restoreGlobalTemplate(store, id))) throw new Error("The template could not be restored. Its recovery copy was kept.");
      await session.flush?.(); setFeedback("Global template restored.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Restoration could not be confirmed. Reload before retrying."); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="global-template-bin-title"><h2 id="global-template-bin-title">Global templates</h2>
    <p>Shared across Studio Drafts, Test and Test2. Restore keeps the original identity and design.</p>
    {feedback ? <p role="status">{feedback}</p> : null}
    {session.error ? <p role="alert">{session.error}</p> : null}
    {session.store.bin.length ? <ul className="studio-bin-list">{session.store.bin.map(item => item.kind === "template" ? <li className="studio-bin-item" key={item.id}><span className="document-kind-mark" aria-hidden="true">T</span><span className="studio-bin-copy"><strong>{item.entry.name}</strong><small>{item.entry.kind === "page" || item.entry.kind === "post" ? `${item.entry.kind} template` : `Shared ${item.entry.kind}`}</small></span><div className="studio-bin-actions"><button type="button" disabled={busy || !session.writable} onClick={() => void restore(item.id)}><StudioIcon name="undo" size={16} />Restore</button></div></li> : null)}</ul> : <p className="studio-bin-empty">No global templates in the Bin.</p>}
  </section>;
}
