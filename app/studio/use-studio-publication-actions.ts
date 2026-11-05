"use client";
import { useState, type RefObject } from "react";
import type { StudioDocument } from "./editor-model";
import type { useTestSite } from "./test-site/use-test-site";
import type { useTestSiteContext } from "./test-site/use-test-site-context";
import type { useStudioPublishing } from "./use-studio-publishing";
import type { useStudioWorkspace } from "./use-studio-workspace";
import type { LocalFixtureSiteId } from "./test-site/sites";

type Options = {
  selectedSite: LocalFixtureSiteId | null; previewWindow: boolean; writable: boolean; switchingSite: boolean;
  testSite: ReturnType<typeof useTestSite>; testContext: ReturnType<typeof useTestSiteContext>;
  studioSession: ReturnType<typeof useStudioWorkspace>; publishing: ReturnType<typeof useStudioPublishing>;
  activeDocument: StudioDocument; siteName: string; codeEditorDirtyRef: RefObject<boolean>;
  setSiteFeedback: (message: string | null) => void;
};

export function useStudioPublicationActions({ selectedSite, previewWindow, writable, switchingSite, testSite, testContext, studioSession, publishing, activeDocument, siteName, codeEditorDirtyRef, setSiteFeedback }: Options) {
  const [publishingLocalSite, setPublishingLocalSite] = useState(false);
  async function publishLocalDocument() {
    if (!selectedSite || publishingLocalSite || previewWindow || !testSite.writable) return;
    if (codeEditorDirtyRef.current) { setSiteFeedback("Apply or discard code edits before publishing."); return; }
    setPublishingLocalSite(true);
    try {
      await testContext.publishDocument(activeDocument.id);
      if (!testSite.acknowledgeExplicitSave()) throw new Error(`${siteName} connection changed. Your draft was kept.`);
      setSiteFeedback(null);
    } catch (error) { setSiteFeedback(error instanceof Error ? error.message : "Local publishing failed. Your draft was kept."); }
    finally { setPublishingLocalSite(false); }
  }
  async function changeSitePublicationStatus(status: string) {
    if (!selectedSite || publishingLocalSite || !testSite.writable || previewWindow) return;
    if (status !== "draft" && status !== "pending" && status !== "private" && status !== "scheduled" && status !== "published") return;
    if (codeEditorDirtyRef.current) { setSiteFeedback("Apply or discard code edits before changing publication status."); return; }
    setPublishingLocalSite(true);
    try {
      await testContext.changePublicationStatus(activeDocument.id, status, status !== "scheduled");
      setSiteFeedback(null);
    } catch (error) { setSiteFeedback(error instanceof Error ? error.message : "The status could not be saved. Your draft was kept."); }
    finally { setPublishingLocalSite(false); }
  }
  function publishCurrentDocument() {
    if (codeEditorDirtyRef.current) {
      const message = "Apply or discard code edits before publishing.";
      if (selectedSite) setSiteFeedback(message); else publishing.setPublishFeedback(message);
      return;
    }
    if (selectedSite) void publishLocalDocument();
    else publishing.publish();
  }
  function saveCurrentDocument() {
    if (activeDocument.status === "published") {
      if (codeEditorDirtyRef.current) {
        const message = "Apply or discard code edits before saving the publication.";
        if (selectedSite) setSiteFeedback(message); else publishing.setPublishFeedback(message);
        return;
      }
      if (selectedSite) void publishLocalDocument();
      else if (writable) publishing.publish();
      return;
    }
    if (selectedSite) {
      if (testSite.writable && !switchingSite) void testSite.saveExplicitly().then(() => setSiteFeedback(null)).catch(error => setSiteFeedback(error instanceof Error ? error.message : "Save failed. Your draft was kept."));
      return;
    }
    if (writable) studioSession.requestSave();
  }

  return { publishingLocalSite, publishLocalDocument, changeSitePublicationStatus, publishCurrentDocument, saveCurrentDocument };
}
