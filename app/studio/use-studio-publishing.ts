"use client";

import { useState } from "react";
import { normalisePostSlug, UnreadablePublicationsError, validatePostForPublication } from "../content/local-publishing";
import { browserPublishingRepository, type PublishingRepository } from "../content/publishing-repository";
import { articles } from "../content/sample-content";
import type { StudioDocument, StudioWorkspace } from "./editor-model";

export function useStudioPublishing({
  activeDocument,
  workspace,
  updateActiveDocument,
  setSaveLabel,
  publishingWritable = true,
  publishingRepository = browserPublishingRepository,
  reservedSlugs = articles.map((article) => article.slug),
}: {
  activeDocument: StudioDocument;
  workspace: StudioWorkspace;
  updateActiveDocument: (update: (document: StudioDocument) => StudioDocument) => void;
  setSaveLabel: (label: string) => void;
  publishingWritable?: boolean;
  publishingRepository?: PublishingRepository;
  reservedSlugs?: string[];
}) {
  const [publishFeedback, setPublishFeedback] = useState<string | null>(null);

  function publish() {
    if (!publishingWritable) { setPublishFeedback("Publishing is paused while another Studio tab owns local storage."); return false; }
    const error = validatePostForPublication(activeDocument, workspace.documents, reservedSlugs);
    if (error) {
      setPublishFeedback(error);
      return false;
    }
    const firstPublication = !activeDocument.publishedAt;
    const timestamp = new Date().toISOString();
    const slug = normalisePostSlug(activeDocument.slug);
    const publication: StudioDocument = {
      ...activeDocument,
      slug,
      status: "published",
      publishedAt: activeDocument.publishAt ?? activeDocument.publishedAt ?? timestamp,
      publishedSlug: slug,
      updatedAt: timestamp,
    };
    try {
      publishingRepository.publish(publication);
    } catch (error) {
      setPublishFeedback(error instanceof UnreadablePublicationsError ? error.message : "This browser could not store the published post. Your draft is still safe in Studio.");
      return false;
    }
    updateActiveDocument(() => publication);
    setPublishFeedback(firstPublication ? "Published locally. This post is now visible in the Writing archive on this browser." : "Published post updated locally.");
    setSaveLabel("Published locally just now");
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
    updateActiveDocument((document) => ({ ...document, status: "draft" }));
    setPublishFeedback("Post returned to draft and removed from the local Writing archive.");
    setSaveLabel("Draft saved locally");
    return true;
  }

  return { publish, unpublish, publishFeedback, setPublishFeedback };
}
