"use client";

import { useEffect, useState } from "react";
import { normalisePostSlug, UnreadablePublicationsError, validatePostForPublication } from "../content/local-publishing";
import { browserPublishingRepository, type PublishingRepository } from "../content/publishing-repository";
import { articles } from "../content/sample-content";
import type { StudioDocument, StudioWorkspace } from "./editor-model";
import { formatPublishDate, parsePublicationDate } from "./publication-date";

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
    if (activeDocument.kind === "page") {
      if (!activeDocument.title.trim()) { setPublishFeedback("Add a page title before publishing."); return false; }
      if (activeDocument.status === "scheduled" || activeDocument.status === "private") {
        // Browser pages retain these editorial states; only site fixtures have a publication renderer.
        updateActiveDocument(document => ({ ...document, updatedAt: new Date().toISOString() }));
        setPublishFeedback("Page status saved in Studio Drafts. Browser page publishing is not connected to a website.");
        return true;
      }
      const timestamp = new Date().toISOString();
      updateActiveDocument(document => ({ ...document, status: "published", publishedAt: document.publishedAt ?? timestamp, updatedAt: timestamp }));
      setPublishFeedback("Page marked as published in Studio Drafts. This saves its local status; it does not publish a website.");
      return true;
    }
    const normalisedPublishAt = parsePublicationDate(activeDocument.publishAt)?.toISOString() ?? activeDocument.publishAt;
    const normalisedPublishedAt = parsePublicationDate(activeDocument.publishedAt)?.toISOString() ?? activeDocument.publishedAt;
    const documentToPublish = { ...activeDocument, publishAt: normalisedPublishAt, publishedAt: normalisedPublishedAt };
    const error = validatePostForPublication(documentToPublish, workspace.documents, reservedSlugs);
    if (error) {
      setPublishFeedback(error);
      return false;
    }
    const scheduled = documentToPublish.status === "scheduled";
    const firstPublication = documentToPublish.status !== "published" && documentToPublish.status !== "scheduled";
    const timestamp = new Date().toISOString();
    const slug = normalisePostSlug(activeDocument.slug);
    const publication: StudioDocument = {
      ...documentToPublish,
      slug,
      status: scheduled ? "scheduled" : "published",
      publishedAt: scheduled ? documentToPublish.publishAt : documentToPublish.publishAt ?? documentToPublish.publishedAt ?? timestamp,
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
      ? firstPublication ? `Scheduled locally for ${formatPublishDate(documentToPublish.publishAt!)} UTC+0. It will appear in the Writing archive on this browser at that time.` : "Scheduled post updated locally."
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
