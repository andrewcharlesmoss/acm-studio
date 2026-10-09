"use client";
import { useRef, useState, type ChangeEvent } from "react";
import { testSiteBackupSource } from "./contract";
import type { useTestSite } from "./use-test-site";

export function TestSiteBackup({ site }: { site: ReturnType<typeof useTestSite> }) {
  const input = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    if (!file || !site.writable || restoring) return;
    setRestoring(true); setFeedback(null);
    try {
      if (file.size > 500000) throw new Error("Choose a Test backup smaller than 500 KB.");
      const envelope = JSON.parse(await file.text());
      const source = testSiteBackupSource(envelope?.draft ?? envelope);
      if (!window.confirm("Restore this Test backup? It replaces Test’s current content and templates. The previous source remains in local save history; browser drafts are unchanged.")) return;
      if (!site.installDraft(source)) throw new Error("Test cannot restore the backup in this tab. The site was kept.");
      await site.flush();
      setFeedback("Test backup restored locally.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Test could not restore this backup. Export the current draft before reconnecting."); }
    finally { setRestoring(false); }
  }
  return <section className="template-library"><h1>Test backup</h1><p>Export or restore the complete site source, including pages, posts, templates and Bin contents. Browser recovery copies remain in Studio Drafts.</p>
    <button type="button" onClick={site.exportDraft}>Export Test Backup</button><button type="button" disabled={!site.writable || restoring} onClick={() => input.current?.click()}>Restore Test Backup</button>
    <input ref={input} type="file" accept="application/json,.json" aria-label="Test backup file" hidden onChange={event => void restore(event)} />
    {feedback ? <p role="status">{feedback}</p> : null}
  </section>;
}
