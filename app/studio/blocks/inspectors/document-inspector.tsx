"use client";
import { useSharedStylePreset } from "../../ui/styles/shared-style-preset";
import { StudioButton } from "../../controls/button";
import { FeaturedImageControl } from "../../controls/featured-image-control";
import { InspectorSettingRow, InspectorSettingsSection } from "../../controls/inspector-setting-row";

import { useId, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { PopoverHeading as StudioPopoverHeading } from "../../overlays/popover-heading";
import { StudioAnchoredPopover } from "../../overlays/anchored-popover";
import type { DocumentDisplayField } from "../../../content/model";
import { formatDocumentDate } from "../../../content/document-metadata";
import { contentWordCount, readingTimeMinutes } from "../../../content/reading-time";
import { type StudioCategory, type StudioDocument, type StudioDocumentKind, type StudioDocumentStatus } from "../../editor-model";
import { StudioIcon } from "../../studio-icons";
import { InspectorAccordionSection } from "../../inspector-accordion";
import { documentDisplaySource, type FieldUsage } from "../../document-fields";
import { createPasswordProtection } from "../../../content/password-protection";
import { MONTH_NAMES, WEEKDAY_NAMES, formatCalendarMonth, formatPublicationTimezone, formatPublishDate, getCalendarDays, isSameCalendarDay, makePublicationDate, parsePublicationDate, startOfMonth } from "../../publication-date";



export type LocalDocumentPublication = { status: "draft" | "published"; publishedAt?: string; busy?: boolean };

type DocumentInspectorProps = {
  panel: "document" | "studio";
  documentControls?: ReactNode;
  siteContext?: boolean;
  writable?: boolean;
  localPublication?: LocalDocumentPublication;
  document: StudioDocument;
  categories: StudioCategory[];
  tagSuggestions: string[];
  onCategorySelectionChange: (categoryIds: string[]) => void;
  onAddCategory: (name: string, parentId?: string) => void;
  onOpenCoverMediaLibrary?: () => void;
  onRemoveCoverImage?: () => void;
  coverImageUrl?: string;
  pages: StudioDocument[];
  calendarPosts?: StudioDocument[];
  onChange: <K extends keyof StudioDocument>(field: K, value: StudioDocument[K]) => void;
  onUnpublish: () => void;
  onStatusChange?: (status: StudioDocumentStatus) => void;
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

export function DocumentStickyControl({ document, siteContext = false, disabled = false, onChange }: Pick<DocumentInspectorProps, "document" | "siteContext" | "onChange"> & { disabled?: boolean }) {
  if (document.kind !== "post") return null;
  return <div className="sticky-post-option"><div className="password-protection-toggle">
    <input id="sticky-post-toggle" type="checkbox" disabled={disabled} checked={Boolean(document.sticky)} onChange={event => { if (!disabled) onChange("sticky", event.target.checked); }} />
    <label htmlFor="sticky-post-toggle"><strong>Sticky</strong><small>{siteContext ? "Save this post as pinned for post listings. This local site has no post archive yet." : "Pin this post to the top of the Writing archive."}</small></label>
  </div></div>;
}

export function DocumentInspector({ writable = true, siteContext = false, localPublication, panel, documentControls, document, resolvedDocument, categories, tagSuggestions, onCategorySelectionChange, onAddCategory, hasTemplate = false, fieldUsage, onFieldOverride, onSaveAsTemplate, pages, calendarPosts = [], onOpenCoverMediaLibrary, onRemoveCoverImage, coverImageUrl, onChange, onUnpublish, onStatusChange, onDuplicate, onDelete, canDelete, canDuplicate, allowedStatuses = ["draft", "pending", "private", "scheduled", "published"], allowedPageTemplates = ["default", "wide", "landing"] }: DocumentInspectorProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [passwordEditorOpen, setPasswordEditorOpen] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const passwordSavingRef = useRef(false);
  const passwordSaveGenerationRef = useRef(0);
  const [publishOpen, setPublishOpen] = useState(false);
  const [excerptOpen, setExcerptOpen] = useState(false);
  const statusTriggerRef = useRef<HTMLButtonElement>(null);
  const publishTriggerRef = useRef<HTMLButtonElement>(null);
  const publishHourInputRef = useRef<HTMLInputElement>(null);
  const excerptTriggerRef = useRef<HTMLButtonElement>(null);
  const excerptInputRef = useRef<HTMLTextAreaElement>(null);
  const statusLabel = documentStatusLabel(document.status);
  const dateValue = document.publishAt ?? (siteContext ? document.publishedAt : undefined);
  const publishDate = dateValue ? formatPublishDate(dateValue) : "Immediately";
  const selectedDate = parsePublicationDate(dateValue) ?? new Date();
  const statusOptions = allowedStatuses;
  const [publicationDateError, setPublicationDateError] = useState<string | null>(null);
  const sharedStylePreset = useSharedStylePreset();
  const calendarActionStyle = { "--acm-color-accent": sharedStylePreset.palette.accent } as CSSProperties;
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(selectedDate));
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const categoriesContentId = useId();
  const statusPopoverId = useId();
  const excerptPopoverId = useId();
  const newCategoryNameRef = useRef<HTMLInputElement>(null);
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
    setCalendarMonth(startOfMonth(parsePublicationDate(dateValue) ?? new Date()));
    setPublishOpen(true);
  }

  function updatePublicationDate(next: Date) {
    if (siteContext && !statusOptions.includes("scheduled") && next.getTime() > new Date().getTime()) {
      setPublicationDateError("Choose a past or current date. The home page must have a past or current publication date.");
      return;
    }
    setPublicationDateError(null);
    onChange("publishAt", next.toISOString());
  }

  function publishImmediately() {
    setPublicationDateError(null);
    const now = new Date().toISOString();
    if (siteContext) { onChange("publishAt", now); if (document.status === "scheduled") onChange("status", "published"); setCalendarMonth(startOfMonth(new Date())); return; }
    onChange("publishAt", undefined);
    onChange("publishedAt", now);
    if (document.status === "scheduled") onChange("status", "published");
    setCalendarMonth(startOfMonth(new Date()));
  }

  function updateDateParts(parts: { year?: number; month?: number; day?: number; hours?: number; minutes?: number }) {
    const year = parts.year ?? selectedDate.getUTCFullYear();
    const month = parts.month ?? selectedDate.getUTCMonth();
    const maximumDay = makePublicationDate(year, month + 1, 0).getUTCDate();
    const day = Math.min(parts.day ?? selectedDate.getUTCDate(), maximumDay);
    updatePublicationDate(makePublicationDate(year, month, day, parts.hours ?? selectedDate.getUTCHours(), parts.minutes ?? selectedDate.getUTCMinutes()));
  }

  function moveCalendarMonth(amount: number) {
    setCalendarMonth((month) => makePublicationDate(month.getUTCFullYear(), month.getUTCMonth() + amount, 1));
  }

  const calendarDays = getCalendarDays(calendarMonth);
  const postsByCalendarDay = new Map<string, number>();
  for (const post of calendarPosts) {
    if (post.kind !== "post") continue;
    const timestamp = post.status === "scheduled" ? post.publishAt : post.status === "published" ? post.publishedAt : undefined;
    const date = parsePublicationDate(timestamp);
    if (!date) continue;
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
    postsByCalendarDay.set(key, (postsByCalendarDay.get(key) ?? 0) + 1);
  }

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

  const isDocumentPanel = panel === "document";
  const hasCategories = document.kind === "post";
  const postWordCount = contentWordCount(document.blocks);
  const postReadingTime = readingTimeMinutes(document.blocks);
  const lastEdited = new Date(document.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

  return (
    <div className={`inspector-sections${isDocumentPanel ? " document-settings-pane" : ""}${document.kind === "post" && isDocumentPanel ? " post-document-inspector" : ""}`}>
      {isDocumentPanel ? <>
        <InspectorSettingsSection className="document-overview">
          <div className="document-summary"><span className={`kind-badge is-${document.kind}`}>{document.kind === "page" ? "P" : "A"}</span><InspectorSettingRow label="Title" value={document.title || "Untitled"} hideLabel className="document-title-control" disabled={!writable}><label>Title<input value={document.title} onChange={event => onChange("title", event.target.value)} /></label></InspectorSettingRow></div>
          {onOpenCoverMediaLibrary ? <FeaturedImageControl image={document.coverImage} sourceUrl={coverImageUrl} onReplace={onOpenCoverMediaLibrary} onRemove={onRemoveCoverImage} /> : null}
        </InspectorSettingsSection>
        <div className="post-summary-block">
          {document.kind === "post" ? <>
          <div className="post-excerpt-control">
            <button ref={excerptTriggerRef} className="post-excerpt-trigger" type="button" aria-expanded={excerptOpen} aria-haspopup="dialog" aria-controls={excerptPopoverId} onClick={() => { setStatusOpen(false); setPublishOpen(false); setExcerptOpen(open => !open); }}>{document.excerpt.trim() ? "Edit excerpt" : "Add an excerpt…"}</button>
            {excerptOpen ? <StudioAnchoredPopover id={excerptPopoverId} anchor={() => excerptTriggerRef.current} inspectorPlacement preferredWidth={640} topOffset={-12} focusOnMount initialFocus={() => excerptInputRef.current} label="Excerpt" className="inspector-popover post-excerpt-popover" onClose={restore => { setExcerptOpen(false); if (restore) requestAnimationFrame(() => excerptTriggerRef.current?.focus()); }}><StudioPopoverHeading className="inspector-popover-heading" title="Excerpt" closeLabel="Close excerpt" onClose={() => { setExcerptOpen(false); requestAnimationFrame(() => excerptTriggerRef.current?.focus()); }} /><textarea ref={excerptInputRef} aria-label="Excerpt" rows={6} value={document.excerpt} onChange={(event) => onChange("excerpt", event.target.value)} /><p className="setting-note">Leave blank and Studio will generate a summary.</p></StudioAnchoredPopover> : null}
          </div>
          </> : null}
          <div className="post-content-summary" aria-label="Document content summary"><span>{postWordCount} {postWordCount === 1 ? "word" : "words"}, {postReadingTime} {postReadingTime === 1 ? "minute" : "minutes"} reading time</span><span>Last edited {lastEdited}</span></div>
        </div>
        <InspectorSettingsSection className="document-properties">
          <div className="inspector-setting-row"><span>Status</span><button ref={statusTriggerRef} className="inspector-setting-trigger" type="button" disabled={siteContext && localPublication?.busy} aria-expanded={statusOpen} aria-haspopup="dialog" aria-controls={statusPopoverId} onClick={() => { setExcerptOpen(false); setStatusOpen((open) => !open); }}>{statusLabel}</button></div>
          {statusOpen ? <StudioAnchoredPopover id={statusPopoverId} anchor={() => statusTriggerRef.current} inspectorPlacement preferredWidth={360} focusOnMount initialFocus={popup => popup.querySelector('[aria-checked="true"]')} label="Status and visibility" className="inspector-popover status-visibility-popover" onClose={restore => { setStatusOpen(false); if (restore) requestAnimationFrame(() => statusTriggerRef.current?.focus()); }}><StudioPopoverHeading className="inspector-popover-heading" title="Status & visibility" closeLabel="Close status and visibility" onClose={() => { setStatusOpen(false); requestAnimationFrame(() => statusTriggerRef.current?.focus()); }} /><div className="status-options" role="radiogroup" aria-label="Document status">{statusOptions.map((status) => <button className="status-option" type="button" role="radio" aria-checked={document.status === status} key={status} onClick={() => { if (siteContext) { onStatusChange?.(status); setStatusOpen(false); return; } if (document.status === "scheduled" && status !== "scheduled") onUnpublish(); if (status === "scheduled" && !document.publishAt) onChange("publishAt", new Date(Date.now() + 60 * 60 * 1000).toISOString()); if (status === "published") { const now = new Date().toISOString(); onChange("publishAt", undefined); onChange("publishedAt", now); } onChange("status", status); setStatusOpen(false); }}><span className="status-radio" aria-hidden="true" /><span><strong>{documentStatusLabel(status)}</strong><small>{siteContext ? siteDocumentStatusDescription(status) : documentStatusDescription(status, document.kind)}</small></span></button>)}</div>{<><div className="password-protection-option"><div className="password-protection-toggle"><input id="password-protection-toggle" type="checkbox" checked={Boolean(document.passwordProtection) || passwordEditorOpen} onChange={(event) => { setPasswordError(""); if (event.target.checked) setPasswordEditorOpen(true); else { passwordSaveGenerationRef.current += 1; onChange("passwordProtection", null); setPasswordEditorOpen(false); setPasswordDraft(""); } }} /><label htmlFor="password-protection-toggle"><strong>Password protected</strong><small>{siteContext ? "Requires a password in the local site preview." : "Only visible to people who know the password."}</small></label></div>{passwordEditorOpen ? <div className="password-protection-editor">{document.kind === "page" && !siteContext ? <small>Page publishing is not available yet, so this setting does not protect a page preview.</small> : null}<label htmlFor="document-password">Password</label><div className="password-protection-input" aria-busy={passwordSaving} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) void savePasswordProtection(); }}><input id="document-password" type={passwordVisible ? "text" : "password"} autoComplete="new-password" maxLength={256} placeholder={document.passwordProtection ? "Enter a new password to replace it" : "Use a secure password"} value={passwordDraft} onChange={(event) => setPasswordDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void savePasswordProtection(); } }} /><button type="button" title={passwordVisible ? "Hide password" : "Show password"} aria-label={passwordVisible ? "Hide password" : "Show password"} aria-pressed={passwordVisible} onClick={() => setPasswordVisible(value => !value)}><StudioIcon name={passwordVisible ? "seen-off" : "seen"} size={18} /></button></div>{document.passwordProtection ? <button className="password-protection-cancel" type="button" onClick={() => { passwordSaveGenerationRef.current += 1; setPasswordEditorOpen(false); setPasswordDraft(""); setPasswordVisible(false); }}>Cancel</button> : null}{passwordError ? <p role="status">{passwordError}</p> : null}</div> : document.passwordProtection ? <div className="password-protection-saved"><small>Password is set.</small><button type="button" onClick={() => { setPasswordError(""); setPasswordEditorOpen(true); }}>Change password</button></div> : null}</div><DocumentStickyControl document={document} siteContext={siteContext} disabled={!writable || Boolean(siteContext && localPublication?.busy)} onChange={onChange} /></>}</StudioAnchoredPopover> : null}
          <div className="inspector-setting-row"><span>Publish</span><button ref={publishTriggerRef} className="inspector-setting-trigger" type="button" disabled={siteContext && localPublication?.busy} aria-expanded={publishOpen} aria-haspopup="dialog" aria-controls="publish-date-popover" onClick={openPublishDate}>{publishDate}</button></div>
          {publishOpen ? <StudioAnchoredPopover id="publish-date-popover" anchor={() => publishTriggerRef.current} inspectorPlacement topOffset={-12} focusOnMount initialFocus={() => publishHourInputRef.current} label="Publish date" className="inspector-popover publish-date-popover" onClose={restore => { setPublishOpen(false); if (restore) requestAnimationFrame(() => publishTriggerRef.current?.focus()); }}><StudioPopoverHeading className="inspector-popover-heading" title="Publish" closeLabel="Close publish date" actions={<StudioButton variant="text" style={calendarActionStyle} className="publish-now-button" type="button" onClick={publishImmediately}>Now</StudioButton>} onClose={() => { setPublishOpen(false); requestAnimationFrame(() => publishTriggerRef.current?.focus()); }} /><div className="publish-time-row"><strong>Time</strong><div className="publish-time-controls"><div className="publish-time-input"><input ref={publishHourInputRef} aria-label="Hour" inputMode="numeric" min="0" max="23" value={String(selectedDate.getUTCHours()).padStart(2, "0")} onChange={(event) => updateDateParts({ hours: clampNumber(event.target.value, 0, 23) })} /><span>:</span><input aria-label="Minute" inputMode="numeric" min="0" max="59" value={String(selectedDate.getUTCMinutes()).padStart(2, "0")} onChange={(event) => updateDateParts({ minutes: clampNumber(event.target.value, 0, 59) })} /></div><span className="publish-timezone" title="Times are recorded in Coordinated Universal Time">{formatPublicationTimezone()}</span></div></div><div className="publish-date-fields"><strong>Date</strong><div><input aria-label="Day" inputMode="numeric" min="1" max="31" value={String(selectedDate.getUTCDate()).padStart(2, "0")} onChange={(event) => updateDateParts({ day: clampNumber(event.target.value, 1, 31) })} /><select aria-label="Month" value={selectedDate.getUTCMonth()} onChange={(event) => updateDateParts({ month: Number(event.target.value) })}>{MONTH_NAMES.map((month, index) => <option value={index} key={month}>{month}</option>)}</select><input aria-label="Year" inputMode="numeric" value={selectedDate.getUTCFullYear()} onChange={(event) => updateDateParts({ year: clampNumber(event.target.value, 1, 9999) })} /></div></div><div className="publish-calendar"><div className="publish-calendar-heading"><StudioButton variant="text" style={calendarActionStyle} type="button" aria-label="Previous month" onClick={() => moveCalendarMonth(-1)}><StudioIcon name="arrow-left" size={20} /></StudioButton><strong>{formatCalendarMonth(calendarMonth)}</strong><StudioButton variant="text" style={calendarActionStyle} type="button" aria-label="Next month" onClick={() => moveCalendarMonth(1)}><StudioIcon name="arrow-right" size={20} /></StudioButton></div><div className="publish-calendar-weekdays">{WEEKDAY_NAMES.map((weekday) => <span key={weekday}>{weekday}</span>)}</div><div className="publish-calendar-grid">{calendarDays.map((day, index) => { if (!day) return <span aria-hidden="true" key={`empty-${index}`} />; const key = `${day.getUTCFullYear()}-${day.getUTCMonth()}-${day.getUTCDate()}`; const postCount = postsByCalendarDay.get(key) ?? 0; const selected = isSameCalendarDay(day, selectedDate); const today = isSameCalendarDay(day, new Date()); const dateLabel = day.toLocaleDateString("en-GB", { dateStyle: "full", timeZone: "UTC" }); return <button type="button" disabled={siteContext && !statusOptions.includes("scheduled") && day.getTime() > new Date().getTime()} className={`${selected ? "is-selected" : ""}${postCount ? " has-posts" : ""}${today ? " is-today" : ""}`} aria-current={today ? "date" : undefined} aria-label={`${dateLabel}${postCount ? `, ${postCount} ${postCount === 1 ? "post" : "posts"}` : ""}`} key={day.toISOString()} onClick={() => updatePublicationDate(makePublicationDate(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), selectedDate.getUTCHours(), selectedDate.getUTCMinutes()))}>{day.getUTCDate()}</button>; })}</div></div><p className="setting-note">Times are shown and saved as UTC+0.{siteContext ? " Future dates require Scheduled; backdating is supported." : ""}</p>{publicationDateError ? <p role="alert">{publicationDateError}</p> : null}</StudioAnchoredPopover> : null}
          <InspectorSettingRow label="Slug" value={document.slug || "/"} disabled={!writable}><label>Slug<input value={document.slug} onChange={event => onChange("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))} /></label></InspectorSettingRow>
          <InspectorSettingRow label="Author" value={resolvedDocument.author || "No author"} disabled={!writable}><label>Author<select aria-label="Author" value={resolvedDocument.author ?? ""} onChange={event => { onFieldOverride?.("author", false); onChange("author", event.target.value); }}><option value="">No author</option>{resolvedDocument.author && resolvedDocument.author !== "Andrew Moss" ? <option value={resolvedDocument.author}>{resolvedDocument.author}</option> : null}<option value="Andrew Moss">Andrew Moss</option></select></label></InspectorSettingRow>
          {documentControls}
          {document.kind === "page" ? <InspectorSettingRow label="Parent" value={pages.find(page => page.id === resolvedDocument.parentPageId)?.title || "None"} disabled={!writable}><label>Parent<select value={resolvedDocument.parentPageId ?? ""} onChange={event => { onFieldOverride?.("parentPageId", false); onChange("parentPageId", event.target.value || undefined); }}><option value="">None</option>{pages.filter(page => page.id !== document.id).map(page => <option value={page.id} key={page.id}>{page.title}</option>)}</select></label></InspectorSettingRow> : null}
        </InspectorSettingsSection>
        {hasCategories ? <>
          <section className="post-categories-section inspector-accordion-section">
            <h2><button type="button" className="inspector-accordion-heading" aria-expanded={categoriesOpen} aria-controls={categoriesContentId} onClick={() => setCategoriesOpen(open => !open)}><span>Categories</span><StudioIcon name={categoriesOpen ? "chevron-down" : "chevron-right"} size={16} /></button></h2>
            <div id={categoriesContentId} className="inspector-accordion-content" hidden={!categoriesOpen}>
              <div className="post-category-list" aria-label="Categories">{renderCategoryOptions() || <p className="setting-note">No categories yet.</p>}</div>
              <button type="button" className="post-category-add-toggle" aria-expanded={addCategoryOpen} onClick={() => { setAddCategoryOpen(open => !open); if (!addCategoryOpen) requestAnimationFrame(() => newCategoryNameRef.current?.focus()); }}>{addCategoryOpen ? "Cancel" : "Add category"}</button>
              {addCategoryOpen ? <form className="post-category-form" onSubmit={submitNewCategory}>
                <label><span>New category name</span><input ref={newCategoryNameRef} required maxLength={200} value={newCategoryName} onChange={event => setNewCategoryName(event.target.value)} /></label>
                <label><span>Parent category</span><select value={newCategoryParentId} onChange={event => setNewCategoryParentId(event.target.value)}><option value="">— Parent category —</option>{categoryParentOptions().map(({ category, depth }) => <option key={category.id} value={category.id}>{`${"— ".repeat(depth)}${category.name}`}</option>)}</select></label>
                <button className="post-category-submit" type="submit" disabled={!categoryName || duplicateCategory}>Add category</button>
              </form> : null}
            </div>
          </section>
          <PostTagsEditor tags={resolvedDocument.tags} suggestions={tagSuggestions} onChange={tags => onChange("tags", tags)} />
        </> : null}
        {canDelete ? <div className="document-bin-action"><button type="button" className="is-destructive" onClick={onDelete}>Move to bin</button></div> : null}
      </> : <>
        <InspectorAccordionSection kind={document.kind} title="Title and subtitle"><p className="setting-note">Control how these values appear through blocks in the assigned template.</p><FieldDisplaySetting label="Title display" field="title" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.title} onChange={value => changeDisplay("title", value)} /><label><span>Subtitle</span><textarea rows={3} value={document.subtitle ?? ""} onChange={(event) => onChange("subtitle", event.target.value)} placeholder="A line beneath the title" /></label><FieldDisplaySetting label="Subtitle display" field="subtitle" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.subtitle} onChange={value => changeDisplay("subtitle", value)} /></InspectorAccordionSection>
        <InspectorSection kind={document.kind} title="Content fields"><div className="inspector-value-row"><span>Featured image</span><strong>{document.coverImage === null ? "Not used" : document.coverImage?.alt || "Not set"}</strong></div><FieldDisplaySetting label="Featured image display" field="coverImage" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.coverImage} onChange={value => changeDisplay("coverImage", value)} /><FieldUsageRow label="Author source" usage={fieldUsage?.author} source={valueSource("author")} onReset={hasTemplate && document.templateOverrides?.author === true && onFieldOverride ? () => onFieldOverride("author", true) : undefined} /><FieldDisplaySetting label="Author display" field="author" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.author} onChange={value => changeDisplay("author", value)} /><div className="inspector-value-row"><span>Publication date</span><strong>{formatDocumentDate(resolvedDocument) ?? "Not set"}</strong></div><FieldDisplaySetting label="Date display" field="publicationDate" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.publicationDate} onChange={value => changeDisplay("publicationDate", value)} /><div className="inspector-value-row"><span>Reading time</span><strong>{fieldUsage ? `${readingTimeMinutesForInspector(document)} ${readingTimeMinutesForInspector(document) === 1 ? "minute" : "minutes"}` : "Calculated"}</strong></div><FieldDisplaySetting label="Reading time display" field="readingTime" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.readingTime} onChange={value => changeDisplay("readingTime", value)} /><p className="setting-note">Values remain saved when their display blocks are removed. Display choices affect this document only.</p></InspectorSection>
        {!siteContext ? <InspectorSection kind={document.kind} title="Studio template presentation"><label><span>Layout</span><select value={document.template ?? "default"} onChange={(event) => onChange("template", event.target.value as StudioDocument["template"])}>{allowedPageTemplates.map((template) => <option value={template} key={template}>{template.charAt(0).toUpperCase() + template.slice(1)}</option>)}</select></label><p className="setting-note">This layout is built from Studio blocks and is separate from the assigned site template.</p></InspectorSection> : null}
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
    <h2><button type="button" className="inspector-accordion-heading" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen(value => !value)}><span>Tags</span><StudioIcon name={open ? "chevron-down" : "chevron-right"} size={16} /></button></h2>
    <div id={contentId} className="inspector-accordion-content" hidden={!open}>
      <label className="post-tags-label" htmlFor={inputId}>Add tag</label>
      <div className="post-tags-input-area" role="presentation" onClick={() => inputRef.current?.focus()}>
        {tags.map((tag, index) => <span className="post-tag-chip" key={`${tag.toLocaleLowerCase("en-GB")}-${index}`}>
          <span>{tag}</span><button type="button" aria-label={`Remove ${tag} tag`} onClick={event => { event.stopPropagation(); removeTag(index); }}><StudioIcon name="close" size={16} /></button>
        </span>)}
        <input ref={inputRef} id={inputId} aria-label="Add a tag" autoComplete="off" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder={tags.length ? "" : "Type a tag and press Enter"} />
      </div>
      <p className="post-tags-help">Separate with commas or the Enter key.</p>
      {suggestions.length ? <div className="post-tags-suggestions"><h3>Most used</h3><div>{suggestions.map(tag => <button type="button" key={tag} aria-label={`Add tag: ${tag}`} onClick={() => addTags(tag, false)}>{tag}</button>)}</div></div> : null}
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

function siteDocumentStatusDescription(status: StudioDocumentStatus) {
  switch (status) {
    case "draft": return "Not ready to publish.";
    case "pending": return "Waiting for review before publishing.";
    case "private": return "Only visible in Studio.";
    case "scheduled": return "Appears in the local site preview at the saved UTC time.";
    case "published": return "Visible in the local site preview.";
  }
}
