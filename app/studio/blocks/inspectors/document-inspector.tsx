"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { watchInspectorPopover } from "../../panes/inspector-popover-position";
import { createPortal } from "react-dom";
import type { DocumentDisplayField } from "../../../content/model";
import { formatDocumentDate } from "../../../content/document-metadata";
import { contentWordCount, readingTimeMinutes } from "../../../content/reading-time";
import { type StudioCategory, type StudioDocument, type StudioDocumentKind, type StudioDocumentStatus } from "../../editor-model";
import { StudioIcon } from "../../studio-icons";
import { InspectorAccordionSection } from "../../inspector-accordion";
import { documentDisplaySource, type FieldUsage } from "../../document-fields";
import { createPasswordProtection } from "../../../content/password-protection";
import { MONTH_NAMES, WEEKDAY_NAMES, formatCalendarMonth, formatPublicationTimezone, formatPublishDate, getCalendarDays, isSameCalendarDay, parsePublicationDate, startOfMonth } from "../../publication-date";

function usePortalRoot() {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // Resolve the body after hydration so server and first client renders match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPortalRoot(globalThis.document?.body ?? null);
  }, []);
  return portalRoot;
}

type DocumentInspectorProps = {
  panel: "document" | "studio";
  documentControls?: ReactNode;
  document: StudioDocument;
  categories: StudioCategory[];
  tagSuggestions: string[];
  onCategorySelectionChange: (categoryIds: string[]) => void;
  onAddCategory: (name: string, parentId?: string) => void;
  onOpenCoverMediaLibrary?: () => void;
  onRemoveCoverImage?: () => void;
  pages: StudioDocument[];
  onChange: <K extends keyof StudioDocument>(field: K, value: StudioDocument[K]) => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
  canDuplicate: boolean;
  allowedStatuses?: StudioDocumentStatus[];
  allowedPageTemplates?: NonNullable<StudioDocument["template"]>[];
  resolvedDocument: StudioDocument;
  hasTemplate?: boolean;
  fieldUsage?: Record<string, FieldUsage>;
  onFieldOverride?: (field: "author" | "category" | "tags" | "parentPageId", useTemplate: boolean) => void;
  onSaveAsTemplate?: () => void;
};

export function DocumentInspector({ panel, documentControls, document, resolvedDocument, categories, tagSuggestions, onCategorySelectionChange, onAddCategory, hasTemplate = false, fieldUsage, onFieldOverride, onSaveAsTemplate, pages, onOpenCoverMediaLibrary, onRemoveCoverImage, onChange, onPublish, onUnpublish, onDuplicate, onDelete, canDelete, canDuplicate, allowedStatuses = ["draft", "pending", "private", "scheduled", "published"], allowedPageTemplates = ["default", "wide", "landing"] }: DocumentInspectorProps) {
  const portalRoot = usePortalRoot();
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusPopoverPosition, setStatusPopoverPosition] = useState<{ left: number; top: number } | null>(null);
  const [passwordEditorOpen, setPasswordEditorOpen] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const passwordSavingRef = useRef(false);
  const passwordSaveGenerationRef = useRef(0);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishPopoverPosition, setPublishPopoverPosition] = useState<{ left: number; top: number } | null>(null);
  const [excerptOpen, setExcerptOpen] = useState(false);
  const [excerptPopoverPosition, setExcerptPopoverPosition] = useState<{ left: number; top: number } | null>(null);
  const statusTriggerRef = useRef<HTMLButtonElement>(null);
  const statusPopoverRef = useRef<HTMLDivElement>(null);
  const publishTriggerRef = useRef<HTMLButtonElement>(null);
  const publishPopoverRef = useRef<HTMLDivElement>(null);
  const publishHourInputRef = useRef<HTMLInputElement>(null);
  const excerptTriggerRef = useRef<HTMLButtonElement>(null);
  const excerptPopoverRef = useRef<HTMLDivElement>(null);
  const excerptInputRef = useRef<HTMLTextAreaElement>(null);
  const statusLabel = documentStatusLabel(document.status);
  const publishDate = document.publishAt ? formatPublishDate(document.publishAt) : "Immediately";
  const selectedDate = parsePublicationDate(document.publishAt) ?? new Date();
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(selectedDate));
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const categoriesContentId = useId();
  const statusPopoverId = useId();
  const excerptPopoverId = useId();
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState("");
  const valueSource = (field: "author" | "category" | "tags" | "parentPageId") => !hasTemplate ? "Document Value" : document.templateOverrides?.[field] === true ? "Document Override" : "Template Default";
  const selectedCategoryIds = document.categoryIds ?? (resolvedDocument.category ? categories.filter(category => category.name.toLocaleLowerCase("en-GB") === resolvedDocument.category?.trim().toLocaleLowerCase("en-GB")).map(category => category.id) : []);
  const categoriesByParent = (parentId?: string): StudioCategory[] => categories.filter(category => (category.parentId || undefined) === parentId);
  const renderCategoryOptions = (parentId?: string, depth = 0): ReactNode => categoriesByParent(parentId).map(category => <div className="post-category-option" key={category.id} style={{ paddingInlineStart: `${depth * 18}px` }}><label><input type="checkbox" checked={selectedCategoryIds.includes(category.id)} onChange={event => { const nextIds = event.target.checked ? [...selectedCategoryIds, category.id] : selectedCategoryIds.filter(id => id !== category.id); onCategorySelectionChange(nextIds); }} /><span>{category.name}</span></label>{renderCategoryOptions(category.id, depth + 1)}</div>);
  const categoryName = newCategoryName.trim();
  const duplicateCategory = categories.some(category => category.name.toLocaleLowerCase("en-GB") === categoryName.toLocaleLowerCase("en-GB") && (category.parentId || "") === newCategoryParentId);
  const categoryParentOptions = (parentId?: string, depth = 0): Array<{ category: StudioCategory; depth: number }> => categoriesByParent(parentId).flatMap(category => [{ category, depth }, ...categoryParentOptions(category.id, depth + 1)]);
  function submitNewCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryName || duplicateCategory) return;
    onAddCategory(categoryName, newCategoryParentId || undefined);
    setNewCategoryName("");
    setNewCategoryParentId("");
    setAddCategoryOpen(false);
  }
  function changeDisplay(field: DocumentDisplayField, value: "template" | "show" | "hide") {
    const next = { ...(document.displayOverrides ?? {}) };
    if (value === "template") delete next[field]; else next[field] = value;
    onChange("displayOverrides", Object.keys(next).length ? next : undefined);
  }

  function openPublishDate() {
    setExcerptOpen(false);
    setStatusOpen(false);
    if (publishOpen) {
      setPublishOpen(false);
      return;
    }
    setCalendarMonth(startOfMonth(parsePublicationDate(document.publishAt) ?? new Date()));
    setPublishOpen(true);
  }

  function updatePublicationDate(next: Date) {
    onChange("publishAt", next.toISOString());
  }

  function publishImmediately() {
    const now = new Date().toISOString();
    onChange("publishAt", undefined);
    onChange("publishedAt", now);
    if (document.status === "scheduled") onChange("status", "published");
    setCalendarMonth(startOfMonth(new Date()));
  }

  function updateDateParts(parts: { year?: number; month?: number; day?: number; hours?: number; minutes?: number }) {
    const year = parts.year ?? selectedDate.getFullYear();
    const month = parts.month ?? selectedDate.getMonth();
    const maximumDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(parts.day ?? selectedDate.getDate(), maximumDay);
    updatePublicationDate(new Date(year, month, day, parts.hours ?? selectedDate.getHours(), parts.minutes ?? selectedDate.getMinutes()));
  }

  function moveCalendarMonth(amount: number) {
    setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1));
  }

  const calendarDays = getCalendarDays(calendarMonth);

  useLayoutEffect(() => {
    if (!statusOpen) return;

    const stopPositioning = watchInspectorPopover(statusTriggerRef.current, statusPopoverRef.current, 360, setStatusPopoverPosition, { topOffset: 0 });
    return () => {
      stopPositioning();
    };
  }, [statusOpen]);

  useEffect(() => {
    if (!statusOpen) return;
    function closeWithEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setStatusOpen(false);
      requestAnimationFrame(() => statusTriggerRef.current?.focus());
    }
    function closeOnOutsidePointer(event: globalThis.PointerEvent) {
      if (statusPopoverRef.current?.contains(event.target as Node) || statusTriggerRef.current?.contains(event.target as Node)) return;
      setStatusOpen(false);
    }
    globalThis.document.addEventListener("keydown", closeWithEscape);
    globalThis.document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      globalThis.document.removeEventListener("keydown", closeWithEscape);
      globalThis.document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [statusOpen]);

  async function savePasswordProtection(value = passwordDraft) {
    if (!value || passwordSavingRef.current) return;
    passwordSavingRef.current = true;
    const generation = passwordSaveGenerationRef.current;
    setPasswordSaving(true);
    setPasswordError("");
    try {
      const protection = await createPasswordProtection(value);
      if (generation !== passwordSaveGenerationRef.current) return;
      onChange("passwordProtection", protection);
      setPasswordDraft("");
      setPasswordVisible(false);
      setPasswordEditorOpen(false);
    } catch {
      if (generation === passwordSaveGenerationRef.current) setPasswordError("This browser could not save the password. Try again.");
    } finally {
      passwordSavingRef.current = false;
      setPasswordSaving(false);
    }
  }

  useLayoutEffect(() => {
    if (!publishOpen) return;

    function closePublishPopover(event: globalThis.PointerEvent) {
      if (publishPopoverRef.current?.contains(event.target as Node) || publishTriggerRef.current?.contains(event.target as Node)) return;
      setPublishOpen(false);
      if (!(event.target instanceof Element) || !event.target.closest("button, input, select, textarea, a[href], [tabindex]:not([tabindex='-1'])")) requestAnimationFrame(() => publishTriggerRef.current?.focus());
    }
    function closeWithEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setPublishOpen(false);
      requestAnimationFrame(() => publishTriggerRef.current?.focus());
    }
    const stopPositioning = watchInspectorPopover(publishTriggerRef.current, publishPopoverRef.current, 320, setPublishPopoverPosition, { topOffset: -12 });
    globalThis.document.addEventListener("pointerdown", closePublishPopover);
    globalThis.document.addEventListener("keydown", closeWithEscape);
    requestAnimationFrame(() => publishHourInputRef.current?.focus());
    return () => {
      stopPositioning();
      globalThis.document.removeEventListener("pointerdown", closePublishPopover);
      globalThis.document.removeEventListener("keydown", closeWithEscape);
    };
  }, [publishOpen]);

  useLayoutEffect(() => {
    if (!excerptOpen) return;

    function closeExcerptPopover(event: globalThis.PointerEvent) {
      if (excerptPopoverRef.current?.contains(event.target as Node) || excerptTriggerRef.current?.contains(event.target as Node)) return;
      setExcerptOpen(false);
      if (!(event.target instanceof Element) || !event.target.closest("button, input, select, textarea, a[href], [tabindex]:not([tabindex='-1'])")) requestAnimationFrame(() => excerptTriggerRef.current?.focus());
    }
    function closeWithEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setExcerptOpen(false);
      requestAnimationFrame(() => excerptTriggerRef.current?.focus());
    }
    const stopPositioning = watchInspectorPopover(excerptTriggerRef.current, excerptPopoverRef.current, 640, setExcerptPopoverPosition, { topOffset: -12 });
    globalThis.document.addEventListener("pointerdown", closeExcerptPopover);
    globalThis.document.addEventListener("keydown", closeWithEscape);
    requestAnimationFrame(() => excerptInputRef.current?.focus());
    return () => {
      stopPositioning();
      globalThis.document.removeEventListener("pointerdown", closeExcerptPopover);
      globalThis.document.removeEventListener("keydown", closeWithEscape);
    };
  }, [excerptOpen]);

  const isDocumentPanel = panel === "document";
  const hasCategories = document.kind === "post";
  const postWordCount = document.kind === "post" ? contentWordCount(document.blocks) : 0;
  const postReadingTime = document.kind === "post" ? readingTimeMinutes(document.blocks) : 0;
  const lastEdited = new Date(document.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className={`inspector-sections${document.kind === "post" && isDocumentPanel ? " post-document-inspector" : ""}`}>
      {isDocumentPanel ? <>
        <InspectorAccordionSection kind={document.kind} title={document.kind === "page" ? "Page" : "Post"}>
          <div className="document-summary"><span className={`kind-badge is-${document.kind}`}>{document.kind === "page" ? "P" : "A"}</span><div><strong>{document.title}</strong><small>{document.kind} · {statusLabel}</small></div></div>
          <label><span>Title</span><input value={document.title} onChange={event => onChange("title", event.target.value)} /></label>
          {onOpenCoverMediaLibrary ? <div className="page-featured-image"><span>Featured image</span><div><button type="button" className="choose-media-button" onClick={onOpenCoverMediaLibrary}>{document.coverImage ? "Replace featured image" : "Set featured image"}</button>{document.coverImage && onRemoveCoverImage ? <button type="button" className="page-featured-image-remove" onClick={onRemoveCoverImage}>Remove image</button> : null}</div></div> : null}
        </InspectorAccordionSection>
        {document.kind === "post" ? <div className="post-summary-block">
          <div className="post-excerpt-control">
            <button ref={excerptTriggerRef} className="post-excerpt-trigger" type="button" aria-expanded={excerptOpen} aria-haspopup="dialog" aria-controls={excerptPopoverId} onClick={() => { setStatusOpen(false); setPublishOpen(false); setExcerptOpen(open => !open); }}>{document.excerpt.trim() ? "Edit excerpt" : "Add an excerpt…"}</button>
            {excerptOpen && portalRoot ? createPortal(<section ref={excerptPopoverRef} id={excerptPopoverId} className="inspector-popover post-excerpt-popover" role="dialog" aria-label="Excerpt" style={excerptPopoverPosition ?? undefined}><div className="inspector-popover-heading"><h2>Excerpt</h2><button type="button" aria-label="Close excerpt" onClick={() => { setExcerptOpen(false); requestAnimationFrame(() => excerptTriggerRef.current?.focus()); }}><StudioIcon name="close" size={20} /></button></div><textarea ref={excerptInputRef} aria-label="Excerpt" rows={6} value={document.excerpt} onChange={(event) => onChange("excerpt", event.target.value)} /><a href="https://wordpress.org/documentation/article/what-is-an-excerpt-block-editor/" target="_blank" rel="noopener noreferrer">Learn more about manual excerpts <StudioIcon name="external" size={14} /></a><p className="setting-note">Leave blank and Studio will generate a summary.</p></section>, portalRoot) : null}
          </div>
          <div className="post-content-summary" aria-label="Post content summary"><span>{postWordCount} {postWordCount === 1 ? "word" : "words"}</span><span>{postReadingTime} {postReadingTime === 1 ? "minute" : "minutes"} reading time</span><span>Last edited {lastEdited}</span></div>
        </div>
        : null}
        <InspectorAccordionSection kind={document.kind} title="Publishing">
          <div className="local-publish-status"><i className={`document-status is-${document.status}`} /><div><strong>{document.status === "published" ? "Published locally" : statusLabel}</strong><small>{document.status === "published" && document.publishedAt ? `Since ${new Date(document.publishedAt).toLocaleDateString("en-GB")}` : document.status === "scheduled" && document.publishAt ? `Scheduled for ${new Date(document.publishAt).toLocaleString("en-GB")}` : "Only visible in Studio"}</small></div></div>
          <div className="inspector-setting-row"><span>Status</span><button ref={statusTriggerRef} className="inspector-setting-trigger" type="button" aria-expanded={statusOpen} aria-haspopup="dialog" aria-controls={statusPopoverId} onClick={() => { setExcerptOpen(false); setStatusOpen((open) => !open); }}>{statusLabel}<StudioIcon name="chevron-right" size={16} /></button></div>
          {statusOpen && portalRoot ? createPortal(<div ref={statusPopoverRef} id={statusPopoverId} className="inspector-popover status-visibility-popover" role="dialog" aria-label="Status and visibility" style={statusPopoverPosition ?? undefined}><div className="inspector-popover-heading"><strong>Status &amp; visibility</strong><button type="button" aria-label="Close status and visibility" onClick={() => { setStatusOpen(false); requestAnimationFrame(() => statusTriggerRef.current?.focus()); }}><StudioIcon name="close" size={16} /></button></div><div className="status-options" role="radiogroup" aria-label="Document status">{allowedStatuses.map((status) => <button className="status-option" type="button" role="radio" aria-checked={document.status === status} key={status} onClick={() => { if (document.status === "scheduled" && status !== "scheduled") onUnpublish(); if (status === "scheduled" && !document.publishAt) onChange("publishAt", new Date(Date.now() + 60 * 60 * 1000).toISOString()); if (status === "published") { const now = new Date().toISOString(); onChange("publishAt", undefined); onChange("publishedAt", now); } onChange("status", status); setStatusOpen(false); }}><span className="status-radio" aria-hidden="true" /><span><strong>{documentStatusLabel(status)}</strong><small>{documentStatusDescription(status, document.kind)}</small></span></button>)}</div><div className="password-protection-option"><div className="password-protection-toggle"><input id="password-protection-toggle" type="checkbox" checked={Boolean(document.passwordProtection) || passwordEditorOpen} onChange={(event) => { setPasswordError(""); if (event.target.checked) setPasswordEditorOpen(true); else { passwordSaveGenerationRef.current += 1; onChange("passwordProtection", null); setPasswordEditorOpen(false); setPasswordDraft(""); } }} /><label htmlFor="password-protection-toggle"><strong>Password protected</strong><small>Only visible to people who know the password.</small></label></div>{passwordEditorOpen ? <div className="password-protection-editor">{document.kind === "page" ? <small>Page publishing is not available yet, so this setting does not protect a page preview.</small> : null}<label htmlFor="document-password">Password</label><div className="password-protection-input" aria-busy={passwordSaving} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) void savePasswordProtection(); }}><input id="document-password" type={passwordVisible ? "text" : "password"} autoComplete="new-password" maxLength={256} placeholder={document.passwordProtection ? "Enter a new password to replace it" : "Use a secure password"} value={passwordDraft} onChange={(event) => setPasswordDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void savePasswordProtection(); } }} /><button type="button" title={passwordVisible ? "Hide password" : "Show password"} aria-label={passwordVisible ? "Hide password" : "Show password"} aria-pressed={passwordVisible} onClick={() => setPasswordVisible(value => !value)}><StudioIcon name={passwordVisible ? "seen-off" : "seen"} size={18} /></button></div>{document.passwordProtection ? <button className="password-protection-cancel" type="button" onClick={() => { passwordSaveGenerationRef.current += 1; setPasswordEditorOpen(false); setPasswordDraft(""); setPasswordVisible(false); }}>Cancel</button> : null}{passwordError ? <p role="status">{passwordError}</p> : null}</div> : document.passwordProtection ? <div className="password-protection-saved"><small>Password is set.</small><button type="button" onClick={() => { setPasswordError(""); setPasswordEditorOpen(true); }}>Change password</button></div> : null}</div>{document.kind === "post" ? <div className="sticky-post-option"><div className="password-protection-toggle"><input id="sticky-post-toggle" type="checkbox" checked={Boolean(document.sticky)} onChange={(event) => onChange("sticky", event.target.checked)} /><label htmlFor="sticky-post-toggle"><strong>Sticky</strong><small>Pin this post to the top of the Writing archive.</small></label></div></div> : null}</div>, portalRoot) : null}
          <div className="inspector-setting-row"><span>Publish</span><button ref={publishTriggerRef} className="inspector-setting-trigger" type="button" aria-expanded={publishOpen} aria-haspopup="dialog" aria-controls="publish-date-popover" onClick={openPublishDate}>{publishDate}<StudioIcon name="chevron-right" size={16} /></button></div>
          {publishOpen && portalRoot ? createPortal(<div ref={publishPopoverRef} id="publish-date-popover" className="inspector-popover publish-date-popover" role="dialog" aria-label="Publish date" style={publishPopoverPosition ?? undefined}><div className="inspector-popover-heading"><strong>Publish</strong><button className="publish-now-button" type="button" onClick={publishImmediately}>Now</button><button type="button" aria-label="Close publish date" onClick={() => { setPublishOpen(false); requestAnimationFrame(() => publishTriggerRef.current?.focus()); }}><StudioIcon name="close" size={20} /></button></div><div className="publish-time-row"><strong>Time</strong><div className="publish-time-controls"><div className="publish-time-input"><input ref={publishHourInputRef} aria-label="Hour" inputMode="numeric" min="0" max="23" value={String(selectedDate.getHours()).padStart(2, "0")} onChange={(event) => updateDateParts({ hours: clampNumber(event.target.value, 0, 23) })} /><span>:</span><input aria-label="Minute" inputMode="numeric" min="0" max="59" value={String(selectedDate.getMinutes()).padStart(2, "0")} onChange={(event) => updateDateParts({ minutes: clampNumber(event.target.value, 0, 59) })} /></div><span className="publish-timezone" title="Local time on this device">{formatPublicationTimezone(selectedDate)}</span></div></div><div className="publish-date-fields"><strong>Date</strong><div><input aria-label="Day" inputMode="numeric" min="1" max="31" value={String(selectedDate.getDate()).padStart(2, "0")} onChange={(event) => updateDateParts({ day: clampNumber(event.target.value, 1, 31) })} /><select aria-label="Month" value={selectedDate.getMonth()} onChange={(event) => updateDateParts({ month: Number(event.target.value) })}>{MONTH_NAMES.map((month, index) => <option value={index} key={month}>{month}</option>)}</select><input aria-label="Year" inputMode="numeric" value={selectedDate.getFullYear()} onChange={(event) => updateDateParts({ year: clampNumber(event.target.value, 1, 9999) })} /></div></div><div className="publish-calendar"><div className="publish-calendar-heading"><button type="button" aria-label="Previous month" onClick={() => moveCalendarMonth(-1)}><StudioIcon name="arrow-left" size={20} /></button><strong>{formatCalendarMonth(calendarMonth)}</strong><button type="button" aria-label="Next month" onClick={() => moveCalendarMonth(1)}><StudioIcon name="arrow-right" size={20} /></button></div><div className="publish-calendar-weekdays">{WEEKDAY_NAMES.map((weekday) => <span key={weekday}>{weekday}</span>)}</div><div className="publish-calendar-grid">{calendarDays.map((day, index) => day ? <button type="button" className={isSameCalendarDay(day, selectedDate) ? "is-selected" : ""} aria-label={day.toLocaleDateString("en-GB", { dateStyle: "full" })} key={day.toISOString()} onClick={() => updatePublicationDate(new Date(day.getFullYear(), day.getMonth(), day.getDate(), selectedDate.getHours(), selectedDate.getMinutes()))}>{day.getDate()}</button> : <span aria-hidden="true" key={`empty-${index}`} />)}</div></div><p className="setting-note">Times use this device’s local time zone. This date is used when the {document.kind} is published locally.</p></div>, portalRoot) : null}
          {document.kind === "post" ? <div className="publishing-actions"><button className="publish-action" type="button" onClick={onPublish}>{document.status === "published" ? "Update published post" : document.status === "scheduled" ? "Schedule post" : "Publish post"}</button>{document.status === "published" || document.status === "scheduled" ? <button type="button" onClick={onUnpublish}>{document.status === "scheduled" ? "Cancel schedule" : "Return to draft"}</button> : null}</div> : null}
        </InspectorAccordionSection>
        {document.kind === "page" ? <InspectorAccordionSection kind={document.kind} title="Address"><label><span>Slug</span><input value={document.slug} onChange={(event) => onChange("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))} /></label></InspectorAccordionSection> : null}
        {document.kind === "post" ? <InspectorAccordionSection kind={document.kind} title="Address"><label><span>Slug</span><input value={document.slug} onChange={(event) => onChange("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))} /></label></InspectorAccordionSection> : null}
        <InspectorAccordionSection kind={document.kind} title="Author"><select aria-label="Author" value={resolvedDocument.author ?? ""} onChange={(event) => { onFieldOverride?.("author", false); onChange("author", event.target.value); }}><option value="">No author</option>{resolvedDocument.author && resolvedDocument.author !== "Andrew Moss" ? <option value={resolvedDocument.author}>{resolvedDocument.author}</option> : null}<option value="Andrew Moss">Andrew Moss</option></select></InspectorAccordionSection>
        {documentControls}
        {document.kind === "page" ? <InspectorAccordionSection kind={document.kind} title="Parent page"><label><span>Parent</span><select value={resolvedDocument.parentPageId ?? ""} onChange={(event) => { onFieldOverride?.("parentPageId", false); onChange("parentPageId", event.target.value || undefined); }}><option value="">None</option>{pages.filter((page) => page.id !== document.id).map((page) => <option value={page.id} key={page.id}>{page.title}</option>)}</select></label></InspectorAccordionSection> : null}
        {hasCategories ? <>
          <section className="post-categories-section">
            <h2><button type="button" className="post-categories-heading" aria-expanded={categoriesOpen} aria-controls={categoriesContentId} onClick={() => setCategoriesOpen(open => !open)}><span>Categories</span><StudioIcon name={categoriesOpen ? "chevron-down" : "chevron-right"} size={16} /></button></h2>
            <div id={categoriesContentId} className="inspector-accordion-content" hidden={!categoriesOpen}>
              <div className="post-category-list" aria-label="Categories">{renderCategoryOptions() || <p className="setting-note">No categories yet.</p>}</div>
              <button type="button" className="post-category-add-toggle" aria-expanded={addCategoryOpen} onClick={() => setAddCategoryOpen(open => !open)}>{addCategoryOpen ? "Cancel" : "Add category"}</button>
              {addCategoryOpen ? <form className="post-category-form" onSubmit={submitNewCategory}>
                <label><span>New category name</span><input autoFocus required maxLength={200} value={newCategoryName} onChange={event => setNewCategoryName(event.target.value)} /></label>
                <label><span>Parent category</span><select value={newCategoryParentId} onChange={event => setNewCategoryParentId(event.target.value)}><option value="">— Parent category —</option>{categoryParentOptions().map(({ category, depth }) => <option key={category.id} value={category.id}>{`${"— ".repeat(depth)}${category.name}`}</option>)}</select></label>
                <button className="post-category-submit" type="submit" disabled={!categoryName || duplicateCategory}>Add category</button>
              </form> : null}
            </div>
          </section>
          <PostTagsEditor tags={resolvedDocument.tags} suggestions={tagSuggestions} onChange={tags => onChange("tags", tags)} />
        </> : null}
        {canDelete ? <InspectorAccordionSection kind={document.kind} title="Document actions" className="document-operations"><button type="button" onClick={onDelete} disabled={!canDelete}>Move {document.kind} to Bin</button></InspectorAccordionSection> : null}
      </> : <>
        <InspectorAccordionSection kind={document.kind} title="Title and subtitle"><p className="setting-note">Control how these values appear through blocks in the assigned template.</p><FieldDisplaySetting label="Title display" field="title" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.title} onChange={value => changeDisplay("title", value)} /><label><span>Subtitle</span><textarea rows={3} value={document.subtitle ?? ""} onChange={(event) => onChange("subtitle", event.target.value)} placeholder="A line beneath the title" /></label><FieldDisplaySetting label="Subtitle display" field="subtitle" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.subtitle} onChange={value => changeDisplay("subtitle", value)} /></InspectorAccordionSection>
        <InspectorSection kind={document.kind} title="Content fields"><div className="inspector-value-row"><span>Cover image</span><strong>{document.coverImage === null ? "Not used" : document.coverImage?.alt || "Not set"}</strong></div><FieldDisplaySetting label="Cover display" field="coverImage" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.coverImage} onChange={value => changeDisplay("coverImage", value)} /><FieldUsageRow label="Author source" usage={fieldUsage?.author} source={valueSource("author")} onReset={hasTemplate && document.templateOverrides?.author === true && onFieldOverride ? () => onFieldOverride("author", true) : undefined} /><FieldDisplaySetting label="Author display" field="author" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.author} onChange={value => changeDisplay("author", value)} /><div className="inspector-value-row"><span>Publication date</span><strong>{formatDocumentDate(resolvedDocument) ?? "Not set"}</strong></div><FieldDisplaySetting label="Date display" field="publicationDate" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.publicationDate} onChange={value => changeDisplay("publicationDate", value)} /><div className="inspector-value-row"><span>Reading time</span><strong>{fieldUsage ? `${readingTimeMinutesForInspector(document)} ${readingTimeMinutesForInspector(document) === 1 ? "minute" : "minutes"}` : "Calculated"}</strong></div><FieldDisplaySetting label="Reading time display" field="readingTime" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.readingTime} onChange={value => changeDisplay("readingTime", value)} /><p className="setting-note">Values remain saved when their display blocks are removed. Display choices affect this document only.</p></InspectorSection>
        <InspectorSection kind={document.kind} title="Studio template presentation"><label><span>Layout</span><select value={document.template ?? "default"} onChange={(event) => onChange("template", event.target.value as StudioDocument["template"])}>{allowedPageTemplates.map((template) => <option value={template} key={template}>{template.charAt(0).toUpperCase() + template.slice(1)}</option>)}</select></label><p className="setting-note">This layout is built from Studio blocks and is separate from the assigned site template.</p></InspectorSection>
        {document.kind === "page" ? <InspectorSection kind={document.kind} title="Page excerpt"><label><span>Excerpt (optional)</span><textarea rows={4} value={document.excerpt} onChange={(event) => onChange("excerpt", event.target.value)} placeholder="A short page summary" /></label></InspectorSection> : null}
        <InspectorSection kind={document.kind} title="Organisation settings">
          {document.kind === "page" ? <><label><span>Category</span><input value={resolvedDocument.category ?? ""} onChange={(event) => { onFieldOverride?.("category", false); onChange("category", event.target.value || undefined); }} placeholder="Optional category" /></label><label><span>Tags</span><input value={resolvedDocument.tags.join(", ")} onChange={(event) => { onFieldOverride?.("tags", false); onChange("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean)); }} placeholder="Optional tags" /></label></> : null}
          <FieldUsageRow label="Category source" usage={fieldUsage?.category} source={valueSource("category")} onReset={hasTemplate && document.templateOverrides?.category === true && onFieldOverride ? () => onFieldOverride("category", true) : undefined} />
          <FieldSettingsRow label="Tags source" source={valueSource("tags")} onReset={hasTemplate && document.templateOverrides?.tags === true && onFieldOverride ? () => onFieldOverride("tags", true) : undefined} />
          {document.kind === "page" ? <FieldSettingsRow label="Parent page source" source={valueSource("parentPageId")} onReset={hasTemplate && document.templateOverrides?.parentPageId === true && onFieldOverride ? () => onFieldOverride("parentPageId", true) : undefined} /> : null}
          <p className="setting-note">Template sources apply when the document uses a site template.</p>
        </InspectorSection>
        <InspectorSection kind={document.kind} title={document.kind === "page" ? "Search preview" : "Search preview"}><label><span>SEO title</span><input value={document.seoTitle} onChange={(event) => onChange("seoTitle", event.target.value)} /></label><label><span>SEO description</span><textarea rows={4} value={document.seoDescription} onChange={(event) => onChange("seoDescription", event.target.value)} /></label></InspectorSection>
        {onSaveAsTemplate || canDuplicate ? <InspectorAccordionSection kind={document.kind} title="Document actions" className="document-operations">{onSaveAsTemplate ? <button type="button" onClick={onSaveAsTemplate}>Save as template</button> : null}{canDuplicate ? <button type="button" onClick={onDuplicate}>Duplicate {document.kind}</button> : null}</InspectorAccordionSection> : null}
      </>}
    </div>
  );
}

function InspectorSection({ kind, title, children }: { kind: StudioDocument["kind"]; title: string; children: ReactNode }) {
  return <InspectorAccordionSection kind={kind} title={title}>{children}</InspectorAccordionSection>;
}

function PostTagsEditor({ tags, suggestions, onChange }: { tags: string[]; suggestions: string[]; onChange: (tags: string[]) => void }) {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const contentId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const addTags = (value: string, clearDraft = true) => {
    const additions = value.split(",").map(tag => tag.trim()).filter(Boolean);
    if (!additions.length) {
      if (clearDraft) setDraft("");
      return;
    }
    const next = [...tags];
    const seen = new Set(tags.map(tag => tag.toLocaleLowerCase("en-GB")));
    for (const tag of additions) {
      const key = tag.toLocaleLowerCase("en-GB");
      if (!seen.has(key)) { next.push(tag); seen.add(key); }
    }
    if (next.length !== tags.length) onChange(next);
    if (clearDraft) setDraft("");
  };
  const removeTag = (index: number) => {
    onChange(tags.filter((_, tagIndex) => tagIndex !== index));
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTags(draft);
    } else if (event.key === "Backspace" && !draft && tags.length) {
      event.preventDefault();
      removeTag(tags.length - 1);
    }
  };
  return <section className="post-tags-section inspector-accordion-section">
    <h2><button type="button" className="post-taxonomy-heading" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen(value => !value)}><span>Tags</span><StudioIcon name={open ? "chevron-down" : "chevron-right"} size={16} /></button></h2>
    <div id={contentId} className="inspector-accordion-content" hidden={!open}>
      <label className="post-tags-label" htmlFor={inputId}>ADD TAG</label>
      <div className="post-tags-input-area" onClick={() => inputRef.current?.focus()}>
        {tags.map((tag, index) => <span className="post-tag-chip" key={`${tag.toLocaleLowerCase("en-GB")}-${index}`}>
          <span>{tag}</span><button type="button" aria-label={`Remove ${tag} tag`} onClick={event => { event.stopPropagation(); removeTag(index); }}><StudioIcon name="close" size={16} /></button>
        </span>)}
        <input ref={inputRef} id={inputId} aria-label="Add a tag" autoComplete="off" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder={tags.length ? "" : "Type a tag and press Enter"} />
      </div>
      <p className="post-tags-help">Separate with commas or the Enter key.</p>
      {suggestions.length ? <div className="post-tags-suggestions"><h3>MOST USED</h3><div>{suggestions.map(tag => <button type="button" key={tag} aria-label={`Add tag: ${tag}`} onClick={() => addTags(tag, false)}>{tag}</button>)}</div></div> : null}
    </div>
  </section>;
}

const documentStatusLabel = (status: StudioDocumentStatus) => status.charAt(0).toUpperCase() + status.slice(1);

function documentStatusDescription(status: StudioDocumentStatus, kind: StudioDocumentKind) {
  if (status === "draft") return "Not ready to publish.";
  if (status === "pending") return "Waiting for review before publishing.";
  if (status === "private") return "Only visible in Studio for now.";
  if (status === "scheduled") return kind === "page" ? "Page publishing is not available yet." : "Publish automatically on a chosen date.";
  return "Visible in the local Writing archive.";
}

function clampNumber(value: string, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.max(minimum, Math.min(maximum, parsed));
}

function readingTimeMinutesForInspector(document: StudioDocument) {
  return readingTimeMinutes(document.blocks);
}

function FieldUsageRow({ label, usage, source, onReset }: { label: string; usage?: FieldUsage; source?: string; onReset?: () => void }) {
  const text = !usage || usage.total === 0 ? "Not displayed" : usage.document && usage.template ? `${usage.document} in document · ${usage.template} in template` : usage.template ? `${usage.template} in template` : `${usage.document} in document`;
  return <div className="inspector-value-row"><span>{label}</span><strong>{source ? `${source} · ` : ""}{text}{onReset ? <button type="button" onClick={onReset}>Use template default</button> : null}</strong></div>;
}

function FieldDisplaySetting({ label, field, document, resolvedDocument, hasTemplate, usage, onChange }: { label: string; field: DocumentDisplayField; document: StudioDocument; resolvedDocument: StudioDocument; hasTemplate: boolean; usage?: FieldUsage; onChange: (value: "template" | "show" | "hide") => void }) {
  const value = document.displayOverrides?.[field] ?? (hasTemplate ? "template" : "show");
  const effective = resolvedDocument.displayOverrides?.[field] ?? "show";
  const display = usage?.total ? `${usage.total} occurrence${usage.total === 1 ? "" : "s"}${effective === "hide" ? " · Hidden" : ""}` : "Not displayed";
  return <label className="field-display-setting"><span>{label} <small>{display} · {documentDisplaySource(document, field, hasTemplate)}</small></span><select value={value} onChange={event => onChange(event.target.value as "template" | "show" | "hide")}><option value="template" disabled={!hasTemplate}>Use Template</option><option value="show">Show</option><option value="hide">Hide</option></select></label>;
}

function FieldSettingsRow({ label, source, onReset }: { label: string; source: string; onReset?: () => void }) {
  return <div className="inspector-value-row"><span>{label}</span><strong>{source} · Setting{onReset ? <button type="button" onClick={onReset}>Use template default</button> : null}</strong></div>;
}

export function DocumentStylesInspector({ document }: { document: StudioDocument }) {
  return <div className="inspector-sections"><InspectorAccordionSection title="Styles"><p className="setting-note">Document styles come from the assigned template and explicit block styles. There is no separate document-level style override.</p><div className="inspector-value-row"><span>Document type</span><strong>{document.kind === "post" ? "Post" : "Page"}</strong></div><div className="inspector-value-row"><span>Breakpoint rules</span><strong>Template controlled</strong></div></InspectorAccordionSection></div>;
}
