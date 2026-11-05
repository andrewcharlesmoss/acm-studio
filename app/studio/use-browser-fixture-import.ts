"use client";
import { useEffect, useRef } from "react";
import { importBrowserTestContent } from "./test-site/contract";
import type { useTestSite } from "./test-site/use-test-site";
import type { useStudioWorkspace } from "./use-studio-workspace";
import type { TemplateStore } from "./template-model";
import type { LocalFixtureSiteId } from "./test-site/sites";

type Options = {
  hostedHome: boolean; previewWindow: boolean; selectedSite: LocalFixtureSiteId | null;
  testSite: ReturnType<typeof useTestSite>; studioSession: ReturnType<typeof useStudioWorkspace>;
  browserTemplateSession: { ready: boolean; store: TemplateStore }; siteName: string;
  setSiteFeedback: (message: string | null) => void;
};

export function useBrowserFixtureImport({ hostedHome, previewWindow, selectedSite, testSite, studioSession, browserTemplateSession, siteName, setSiteFeedback }: Options) {
  const importAttempt = useRef(false);
  useEffect(() => {
    if (hostedHome || previewWindow || !selectedSite || !testSite.writable || !testSite.draft || !studioSession.ready || !browserTemplateSession.ready || importAttempt.current || ("browserImportComplete" in testSite.draft && testSite.draft.browserImportComplete)) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || importAttempt.current) return;
      importAttempt.current = true;
      try {
        const imported = importBrowserTestContent(testSite.draft!, studioSession.workspace, browserTemplateSession.store);
        if (!testSite.installDraft(imported, false)) throw new Error(`${siteName}’s saving session is unavailable. The browser originals were kept.`);
        void testSite.flush().catch(() => {});
      } catch (error) { setSiteFeedback(error instanceof Error ? error.message : `${siteName} could not import the browser drafts. All originals were kept.`); }
    });
    return () => { cancelled = true; };
  }, [hostedHome, previewWindow, selectedSite, testSite, studioSession, browserTemplateSession, siteName, setSiteFeedback]);
}
