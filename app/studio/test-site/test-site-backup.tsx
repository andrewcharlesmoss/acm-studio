"use client";
import { exportStudioJson } from "../studio-json-export";
import { validateGlobalTemplateLibrary, type GlobalTemplateLibrary } from "../global-template-contract";
import { useRef, useState, type ChangeEvent } from "react";
import { testSiteBackupSource } from "./contract";
import type { useTestSite } from "./use-test-site";
import { collectSiteImages, stageSiteImages } from "./featured-images";

export function TestSiteBackup({ site, globalTemplates }: { globalTemplates?: GlobalTemplateLibrary | null; site: ReturnType<typeof useTestSite> }) {
  const input = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    if (!file || !site.writable || restoring) return;
    setRestoring(true); setFeedback(null);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error(`Choose a ${site.siteName} backup smaller than 10 MiB.`);
      const envelope = JSON.parse(await file.text());
      if (envelope.format === "acm-local-site-backup" && (envelope.version !== 1 || envelope.siteId !== site.siteId || !Array.isArray(envelope.featuredImages))) throw new Error("This backup belongs to another site or uses an unsupported version.");
      if (envelope.globalTemplateLibrary) {
        const original = validateGlobalTemplateLibrary(envelope.globalTemplateLibrary);
        if (!globalTemplates || JSON.stringify(original) !== JSON.stringify(globalTemplates)) throw new Error("This backup includes a different global library. Import its globalTemplateLibrary in Templates first, then restore this site; global changes affect every site.");
      }
      const source = testSiteBackupSource(envelope?.draft ?? envelope, site.siteId);
      if (!window.confirm(`Restore this ${site.siteName} backup? It replaces ${site.siteName}’s current content and templates. The previous source remains in local save history; browser drafts are unchanged.`)) return;
      if (envelope.featuredImages !== undefined) await stageSiteImages(envelope.featuredImages, source);
      if (!site.writable) throw new Error("Editing became unavailable. The site source was kept.");
      if (!site.installDraft(source)) throw new Error(`${site.siteName} cannot restore the backup in this tab. The site was kept.`);
      await site.flush();
      setFeedback(`${site.siteName} backup restored locally.`);
    } catch (error) { setFeedback(error instanceof Error ? error.message : `${site.siteName} could not restore this backup. Export the current draft before reconnecting.`); }
    finally { setRestoring(false); }
  }
  async function exportBackup() {
    try {
      const draft = site.draft;
      const featuredImages = await collectSiteImages(draft, site.siteId, true);
      const globalDesignImages = globalTemplates ? await collectSiteImages(globalTemplates.websiteDesignDefaults,"global",true) : [];
      exportStudioJson({ format: "acm-local-site-backup", version: 1, siteId: site.siteId, draft, featuredImages, ...(globalTemplates ? { globalTemplateLibrary: globalTemplates, globalDesignImages } : {}) }, `${site.siteId}-backup.json`);
      setFeedback("Backup exported with its featured image files.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "The backup could not include its featured images. Try again when the local connection is available."); }
  }
  return <section className="template-library"><h1>{site.siteName} backup</h1><p>Export or restore the complete site source, including pages, posts, templates and Bin contents. Browser recovery copies remain in Studio Drafts.</p>
    <button type="button" onClick={() => void exportBackup()}>Export {site.siteName} Backup</button><button type="button" disabled={!site.writable || restoring} onClick={() => input.current?.click()}>Restore {site.siteName} Backup</button>
    <input ref={input} type="file" accept="application/json,.json" aria-label={`${site.siteName} backup file`} hidden onChange={event => void restore(event)} />
    {feedback ? <p role="status">{feedback}</p> : null}
  </section>;
}
