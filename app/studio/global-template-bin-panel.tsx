"use client";
import { useState } from "react";
import type { useTemplates } from "./use-templates";
import { restoreGlobalTemplate } from "./global-template-bin";
import { BinFeedback, BinItem, BinList, BinRestoreButton } from "./bin-presentation";
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
  return <section className="studio-bin-global-templates" aria-labelledby="global-template-bin-title"><h2 id="global-template-bin-title">Global templates</h2>
    <p>Shared across Studio Drafts, Test and Test2. Restore keeps the original identity and design.</p>
    <BinFeedback>{feedback}</BinFeedback>
    {session.error ? <p role="alert">{session.error}</p> : null}
    <BinList hasItems={Boolean(session.store.bin.length)} emptyMessage="No global templates in the Bin.">{session.store.bin.map(item => item.kind === "template" ? <BinItem key={item.id} mark="T" label={item.entry.name} detail={item.entry.kind === "page" || item.entry.kind === "post" ? `${item.entry.kind} template` : `Shared ${item.entry.kind}`}><BinRestoreButton disabled={busy || !session.writable} onClick={() => void restore(item.id)} /></BinItem> : null)}</BinList>
  </section>;
}
