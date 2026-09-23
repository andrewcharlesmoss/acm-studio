"use client";

import { useEffect, useState } from "react";
import { normalisePostSlug, UnreadablePublicationsError, validatePostForPublication } from "../content/local-publishing";
import { browserPublishingRepository, type PublishingRepository } from "../content/publishing-repository";
import { articles } from "../content/sample-content";
import type { StudioDocument, StudioWorkspace } from "./editor-model";

export function useStudioPublishing({
  activeDocument,
  resolvedDocument,
  workspace,
  updateActiveDocument,
  setSaveLabel,
  publishingWritable = true,
  publishingRepository = browserPublishingRepository,
  reservedSlugs = articles.map((article) => article.slug),
}: {
  activeDocument: StudioDocument;
  resolvedDocument?: StudioDocument;
  workspace: StudioWorkspace;
  updateActiveDocument: (update: (document: StudioDocument) => StudioDocument) => void;
  setSaveLabel: (label: string) => void;
  publishingWritable?: boolean;
  publishingRepository?: PublishingRepository;
  reservedSlugs?: string[];
}) {
  const [publishFeedback, setPublishFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!publishFeedback?.startsWith("Published locally") && !publishFeedback?.startsWith("Scheduled locally") && publishFeedback !== "Published post updated locally." && publishFeedback !== "Scheduled post updated locally.") return;
    const timeout = window.setTimeout(() => setPublishFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [publishFeedback]);

  function publish() {
    if (!publishingWritable) { setPublishFeedback("Publishing is paused while another Studio tab owns local storage."); return false; }
    const error = validatePostForPublication(activeDocument, workspace.documents, reservedSlugs);
    if (error) {
      setPublishFeedback(error);
      return false;
    }
    const scheduled = activeDocument.status === "scheduled";
    const firstPublication = activeDocument.status !== "published" && activeDocument.status !== "scheduled";
    const timestamp = new Date().toISOString();
    const slug = normalisePostSlug(activeDocument.slug);
    const publication: StudioDocument = {
      ...activeDocument,
      slug,
      status: scheduled ? "scheduled" : "published",
      publishedAt: scheduled ? activeDocument.publishAt : activeDocument.publishAt ?? activeDocument.publishedAt ?? timestamp,
      publishedSlug: slug,
      updatedAt: timestamp,
    };
    try {
      publishingRepository.publish(resolvedDocument ? { ...publication, author: resolvedDocument.author, category: resolvedDocument.category, tags: resolvedDocument.tags } : publication);
    } catch (error) {
      setPublishFeedback(error instanceof UnreadablePublicationsError ? error.message : "This browser could not store the published post. Your draft is still safe in Studio.");
      return false;
    }
    updateActiveDocument(() => publication);
    setPublishFeedback(scheduled
      ? firstPublication ? `Scheduled locally for ${new Date(activeDocument.publishAt!).toLocaleString("en-GB")}. It will appear in the Writing archive on this browser at that time.` : "Scheduled post updated locally."
      : firstPublication ? "Published locally. This post is now visible in the Writing archive on this browser." : "Published post updated locally.");
    setSaveLabel(scheduled ? "Post scheduled locally" : "Published locally just now");
    return true;
  }

  function unpublish() {
    if (activeDocument.kind !== "post") return false;
    if (!publishingWritable) { setPublishFeedback("Publishing is paused while another Studio tab owns local storage."); return false; }
    try {
      publishingRepository.unpublish(activeDocument.id);
    } catch (error) {
      setPublishFeedback(error instanceof UnreadablePublicationsError ? error.message : "This browser could not remove the published post.");
      return false;
    }
    const cancelledSchedule = activeDocument.status === "scheduled";
    updateActiveDocument((document) => {
      const draft = { ...document };
      delete draft.publishedAt;
      delete draft.publishedSlug;
      return { ...draft, status: "draft" };
    });
    setPublishFeedback(cancelledSchedule ? "Schedule cancelled and removed from the local Writing archive." : "Post returned to draft and removed from the local Writing archive.");
    setSaveLabel("Draft saved locally");
    return true;
  }

  return { publish, unpublish, publishFeedback, setPublishFeedback };
}
