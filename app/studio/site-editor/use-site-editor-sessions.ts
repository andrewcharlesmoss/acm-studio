"use client";

import { useStudioWorkspace } from "../use-studio-workspace";
import { useTestSite } from "../test-site/use-test-site";
import { useGlobalTemplates } from "../use-global-templates";

/** Visible adapters submit through the persistent, lock-owned broker runtime. */
export function useSiteEditorSessions() {
  const browser = useStudioWorkspace();
  const ownsSaving = browser.ready && browser.exclusiveWritable;
  const test = useTestSite(true, false, "test");
  const test2 = useTestSite(true, false, "test2");
  const globals = useGlobalTemplates(test, true, false, false, ownsSaving);
  return { browser, test, test2, globals };
}

export type SiteEditorSessions = ReturnType<typeof useSiteEditorSessions>;
