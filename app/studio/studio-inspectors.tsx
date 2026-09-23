"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ContentBlock, DocumentDisplayField, HeadingLevel, ParagraphAppearance, ParagraphBorderStyle, ParagraphFontSize, ParagraphStyle, PostDateFormat, ReadingTimePresentation, TextAlignment } from "../content/model";
import { formatDocumentDate } from "../content/document-metadata";
import { readingTimeMinutes } from "../content/reading-time";
import type { LayoutMode } from "../content/model";
import { LAYOUT_SPACING_PRESETS, LAYOUT_VALUE_LIMITS, SPACER_HEIGHT_PRESETS } from "../content/layout";
import { CODE_LANGUAGE_OPTIONS, isKnownCodeLanguage } from "../content/code-highlighting.mjs";
import type { StudioDocument, StudioDocumentStatus } from "./editor-model";
import { StudioIcon } from "./studio-icons";
import { documentDisplaySource, type FieldUsage } from "./document-fields";

function blockLabel(type: ContentBlock["type"]) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export type StudioInspectorProps = {
  documentControls?: ReactNode;
  inspectorTab: "document" | "block" | "styles";
  selectedBlock: ContentBlock | null;
  activeDocument: StudioDocument;
  pages: StudioDocument[];
  canDelete: boolean;
  canDuplicate?: boolean;
  canOpenFiles?: boolean;
  allowedStatuses?: StudioDocumentStatus[];
  allowedPageTemplates?: NonNullable<StudioDocument["template"]>[];
  onSelectTab: (tab: "document" | "block" | "styles") => void;
  onDocumentChange: <K extends keyof StudioDocument>(field: K, value: StudioDocument[K]) => void;
  onBlockChange: (block: ContentBlock) => void;
  onOpenFiles: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  resolvedDocument?: StudioDocument;
  hasTemplate?: boolean;
  fieldUsage?: Record<string, FieldUsage>;
  onFieldOverride?: (field: "author" | "category" | "tags" | "parentPageId", useTemplate: boolean) => void;
  onSaveAsTemplate?: () => void;
};

export function StudioInspector({ documentControls, inspectorTab, selectedBlock, activeDocument, pages, canDelete, canDuplicate = true, canOpenFiles = true, allowedStatuses, allowedPageTemplates, onSelectTab, onDocumentChange, onBlockChange, onOpenFiles, onPublish, onUnpublish, onDuplicate, onDelete, resolvedDocument, hasTemplate = false, fieldUsage, onFieldOverride, onSaveAsTemplate }: StudioInspectorProps) {
  return (
    <aside className="studio-inspector">
      <div className="inspector-tabs" role="tablist" aria-label="Editor settings">
        <button className={inspectorTab === "document" ? "is-active" : ""} type="button" role="tab" aria-selected={inspectorTab === "document"} onClick={() => onSelectTab("document")}>Document</button>
        <button className={inspectorTab === "block" ? "is-active" : ""} type="button" role="tab" aria-selected={inspectorTab === "block"} onClick={() => onSelectTab("block")} disabled={!selectedBlock}>Block</button>
        <button className={inspectorTab === "styles" ? "is-active" : ""} type="button" role="tab" aria-selected={inspectorTab === "styles"} onClick={() => onSelectTab("styles")}>Styles</button>
      </div>
      <div className="inspector-scroll">
        {inspectorTab === "document" ? documentControls : null}
        {inspectorTab === "document" ? (
          <DocumentInspector document={activeDocument} resolvedDocument={resolvedDocument ?? activeDocument} hasTemplate={hasTemplate} fieldUsage={fieldUsage} onFieldOverride={onFieldOverride} onSaveAsTemplate={onSaveAsTemplate} pages={pages} onChange={onDocumentChange} onPublish={onPublish} onUnpublish={onUnpublish} onDuplicate={onDuplicate} onDelete={onDelete} canDelete={canDelete} canDuplicate={canDuplicate} allowedStatuses={allowedStatuses} allowedPageTemplates={allowedPageTemplates} />
        ) : inspectorTab === "styles" ? <DocumentStylesInspector document={activeDocument} /> : selectedBlock ? (
          <BlockInspector block={selectedBlock} onChange={onBlockChange} onOpenFiles={onOpenFiles} canOpenFiles={canOpenFiles} />
        ) : (
          <div className="inspector-empty"><span><StudioIcon name="block" /></span><p>Select a block to see its settings.</p></div>
        )}
      </div>
    </aside>
  );
}

type DocumentInspectorProps = {
  document: StudioDocument;
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

function DocumentInspector({ document, resolvedDocument, hasTemplate = false, fieldUsage, onFieldOverride, onSaveAsTemplate, pages, onChange, onPublish, onUnpublish, onDuplicate, onDelete, canDelete, canDuplicate, allowedStatuses = ["draft", "pending", "private", "published"], allowedPageTemplates = ["default", "wide", "landing"] }: DocumentInspectorProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishPopoverPosition, setPublishPopoverPosition] = useState<{ left: number; top: number } | null>(null);
  const publishTriggerRef = useRef<HTMLButtonElement>(null);
  const publishPopoverRef = useRef<HTMLDivElement>(null);
  const publishHourInputRef = useRef<HTMLInputElement>(null);
  const statusLabel = documentStatusLabel(document.status);
  const publishDate = document.publishAt ? formatPublishDate(document.publishAt) : "Immediately";
  const selectedDate = parsePublicationDate(document.publishAt) ?? new Date();
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(selectedDate));
  const valueSource = (field: "author" | "category" | "tags" | "parentPageId") => !hasTemplate ? "Document Value" : document.templateOverrides?.[field] === true ? "Document Override" : "Template Default";
  function changeDisplay(field: DocumentDisplayField, value: "template" | "show" | "hide") {
    const next = { ...(document.displayOverrides ?? {}) };
    if (value === "template") delete next[field]; else next[field] = value;
    onChange("displayOverrides", Object.keys(next).length ? next : undefined);
  }

  function openPublishDate() {
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
    onChange("publishAt", undefined);
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

  useEffect(() => {
    if (!publishOpen) return;
    function positionPublishPopover() {
      const trigger = publishTriggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const inspectorLeft = trigger.closest(".studio-inspector")?.getBoundingClientRect().left ?? rect.left;
      const width = Math.min(320, window.innerWidth - 32);
      setPublishPopoverPosition({
        left: Math.max(16, inspectorLeft - width - 12),
        top: Math.min(Math.max(16, rect.top - 12), Math.max(16, window.innerHeight - 520)),
      });
    }
    function closePublishPopover(event: PointerEvent) {
      if (publishPopoverRef.current?.contains(event.target as Node) || publishTriggerRef.current?.contains(event.target as Node)) return;
      setPublishOpen(false);
      if (!(event.target instanceof Element) || !event.target.closest("button, input, select, textarea, a[href], [tabindex]:not([tabindex='-1'])")) requestAnimationFrame(() => publishTriggerRef.current?.focus());
    }
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setPublishOpen(false);
      requestAnimationFrame(() => publishTriggerRef.current?.focus());
    }
    positionPublishPopover();
    window.addEventListener("resize", positionPublishPopover);
    window.addEventListener("scroll", positionPublishPopover, true);
    globalThis.document.addEventListener("pointerdown", closePublishPopover);
    globalThis.document.addEventListener("keydown", closeWithEscape);
    requestAnimationFrame(() => publishHourInputRef.current?.focus());
    return () => {
      window.removeEventListener("resize", positionPublishPopover);
      window.removeEventListener("scroll", positionPublishPopover, true);
      globalThis.document.removeEventListener("pointerdown", closePublishPopover);
      globalThis.document.removeEventListener("keydown", closeWithEscape);
    };
  }, [publishOpen]);

  return (
    <div className="inspector-sections">
      <section><h2>Document Identity</h2><div className="document-summary"><span className={`kind-badge is-${document.kind}`}>{document.kind === "page" ? "P" : "A"}</span><div><strong>{document.title}</strong><small>{document.kind} · {statusLabel}</small></div></div><label><span>Type</span><select value={document.kind} disabled aria-label="Document type"><option value="page">Page</option><option value="post">Post</option></select></label><label><span>Title</span><input value={document.title} onChange={event => onChange("title", event.target.value)} /></label><FieldDisplaySetting label="Title display" field="title" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.title} onChange={value => changeDisplay("title", value)} /><label><span>Address</span><input value={document.slug} onChange={(event) => onChange("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))} /></label><label><span>Parent page</span><select value={resolvedDocument.parentPageId ?? ""} onChange={(event) => { onFieldOverride?.("parentPageId", false); onChange("parentPageId", event.target.value || undefined); }}><option value="">None</option>{pages.filter((page) => page.id !== document.id).map((page) => <option value={page.id} key={page.id}>{page.title}</option>)}</select></label><FieldSettingsRow label="Parent page source" source={valueSource("parentPageId")} onReset={hasTemplate && document.templateOverrides?.parentPageId === true && onFieldOverride ? () => onFieldOverride("parentPageId", true) : undefined} /></section>
      <section><h2>Publishing</h2><div className="local-publish-status"><i className={`document-status is-${document.status}`} /><div><strong>{document.status === "published" ? "Published locally" : statusLabel}</strong><small>{document.status === "published" && document.publishedAt ? `Since ${new Date(document.publishedAt).toLocaleDateString("en-GB")}` : "Only visible in Studio"}</small></div></div>
        <div className="inspector-setting-row"><span>Status</span><button className="inspector-setting-trigger" type="button" aria-expanded={statusOpen} onClick={() => setStatusOpen((open) => !open)}>{statusLabel}<StudioIcon name="chevron-right" size={16} /></button></div>
        {statusOpen ? <div className="inspector-popover" role="group" aria-label="Status and visibility"><div className="inspector-popover-heading"><strong>Status &amp; visibility</strong><button type="button" aria-label="Close status and visibility" onClick={() => setStatusOpen(false)}><StudioIcon name="close" size={16} /></button></div><div className="status-options" role="radiogroup" aria-label="Document status">{allowedStatuses.map((status) => <button className="status-option" type="button" role="radio" aria-checked={document.status === status} key={status} onClick={() => { onChange("status", status); setStatusOpen(false); }}><span className="status-radio" aria-hidden="true" /><span><strong>{documentStatusLabel(status)}</strong><small>{documentStatusDescription(status)}</small></span></button>)}</div></div> : null}
        <div className="inspector-setting-row"><span>Publish</span><button ref={publishTriggerRef} className="inspector-setting-trigger" type="button" aria-expanded={publishOpen} aria-haspopup="dialog" aria-controls="publish-date-popover" onClick={openPublishDate}>{publishDate}<StudioIcon name="chevron-right" size={16} /></button></div>
        {publishOpen ? <div ref={publishPopoverRef} id="publish-date-popover" className="inspector-popover publish-date-popover" role="dialog" aria-label="Publish date" style={publishPopoverPosition ?? undefined}><div className="inspector-popover-heading"><strong>Publish</strong><button className="publish-now-button" type="button" onClick={publishImmediately}>Now</button><button type="button" aria-label="Close publish date" onClick={() => { setPublishOpen(false); requestAnimationFrame(() => publishTriggerRef.current?.focus()); }}><StudioIcon name="close" size={20} /></button></div><div className="publish-time-row"><strong>Time</strong><div className="publish-time-controls"><div className="publish-time-input"><input ref={publishHourInputRef} aria-label="Hour" inputMode="numeric" min="0" max="23" value={String(selectedDate.getHours()).padStart(2, "0")} onChange={(event) => updateDateParts({ hours: clampNumber(event.target.value, 0, 23) })} /><span>:</span><input aria-label="Minute" inputMode="numeric" min="0" max="59" value={String(selectedDate.getMinutes()).padStart(2, "0")} onChange={(event) => updateDateParts({ minutes: clampNumber(event.target.value, 0, 59) })} /></div><span className="publish-timezone">UTC+0</span></div></div><div className="publish-date-fields"><strong>Date</strong><div><input aria-label="Day" inputMode="numeric" min="1" max="31" value={String(selectedDate.getDate()).padStart(2, "0")} onChange={(event) => updateDateParts({ day: clampNumber(event.target.value, 1, 31) })} /><select aria-label="Month" value={selectedDate.getMonth()} onChange={(event) => updateDateParts({ month: Number(event.target.value) })}>{MONTH_NAMES.map((month, index) => <option value={index} key={month}>{month}</option>)}</select><input aria-label="Year" inputMode="numeric" value={selectedDate.getFullYear()} onChange={(event) => updateDateParts({ year: clampNumber(event.target.value, 1, 9999) })} /></div></div><div className="publish-calendar"><div className="publish-calendar-heading"><button type="button" aria-label="Previous month" onClick={() => moveCalendarMonth(-1)}><StudioIcon name="arrow-left" size={20} /></button><strong>{formatCalendarMonth(calendarMonth)}</strong><button type="button" aria-label="Next month" onClick={() => moveCalendarMonth(1)}><StudioIcon name="arrow-right" size={20} /></button></div><div className="publish-calendar-weekdays">{WEEKDAY_NAMES.map((weekday) => <span key={weekday}>{weekday}</span>)}</div><div className="publish-calendar-grid">{calendarDays.map((day, index) => day ? <button type="button" className={isSameCalendarDay(day, selectedDate) ? "is-selected" : ""} aria-label={day.toLocaleDateString("en-GB", { dateStyle: "full" })} key={day.toISOString()} onClick={() => updatePublicationDate(new Date(day.getFullYear(), day.getMonth(), day.getDate(), selectedDate.getHours(), selectedDate.getMinutes()))}>{day.getDate()}</button> : <span aria-hidden="true" key={`empty-${index}`} />)}</div></div><p className="setting-note">This date is used when the {document.kind} is published locally.</p></div> : null}
        {document.kind === "post" ? <div className="publishing-actions"><button className="publish-action" type="button" onClick={onPublish}>{document.status === "published" ? "Update published post" : "Publish post"}</button>{document.status === "published" ? <button type="button" onClick={onUnpublish}>Return to draft</button> : null}</div> : <p className="setting-note">Page publishing will follow after the post workflow is proven. These settings are saved with the page.</p>}<p className="setting-note">Local publication is visible only in this browser.</p></section>
      <section><h2>Description</h2><label><span>Excerpt</span><textarea rows={4} value={document.excerpt} onChange={(event) => onChange("excerpt", event.target.value)} placeholder="A short public summary" /></label></section>
      <section><h2>Subtitle</h2><label><span>Subtitle</span><textarea rows={3} value={document.subtitle ?? ""} onChange={(event) => onChange("subtitle", event.target.value)} placeholder="A line beneath the title" /></label><FieldDisplaySetting label="Subtitle display" field="subtitle" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.subtitle} onChange={value => changeDisplay("subtitle", value)} /></section>
      <section><h2>Content Fields</h2><div className="inspector-value-row"><span>Cover image</span><strong>{document.coverImage === null ? "Not used" : document.coverImage?.alt || "Not set"}</strong></div><FieldDisplaySetting label="Cover display" field="coverImage" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.coverImage} onChange={value => changeDisplay("coverImage", value)} /><label><span>Author</span><input value={resolvedDocument.author ?? ""} onChange={(event) => { onFieldOverride?.("author", false); onChange("author", event.target.value); }} placeholder="Optional author name" /></label><FieldUsageRow label="Author source" usage={fieldUsage?.author} source={valueSource("author")} onReset={hasTemplate && document.templateOverrides?.author === true && onFieldOverride ? () => onFieldOverride("author", true) : undefined} /><FieldDisplaySetting label="Author display" field="author" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.author} onChange={value => changeDisplay("author", value)} /><div className="inspector-value-row"><span>Publication date</span><strong>{formatDocumentDate(resolvedDocument) ?? "Not set"}</strong></div><FieldDisplaySetting label="Date display" field="publicationDate" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.publicationDate} onChange={value => changeDisplay("publicationDate", value)} /><div className="inspector-value-row"><span>Reading time</span><strong>{fieldUsage ? `${readingTimeMinutesForInspector(document)} ${readingTimeMinutesForInspector(document) === 1 ? "minute" : "minutes"}` : "Calculated"}</strong></div><FieldDisplaySetting label="Reading time display" field="readingTime" document={document} resolvedDocument={resolvedDocument} hasTemplate={hasTemplate} usage={fieldUsage?.readingTime} onChange={value => changeDisplay("readingTime", value)} /><p className="setting-note">Values remain saved when their display blocks are removed. Display choices affect this document only.</p></section>
      <section><h2>Organisation</h2><label><span>Category</span><input value={resolvedDocument.category ?? ""} onChange={(event) => { onFieldOverride?.("category", false); onChange("category", event.target.value || undefined); }} placeholder="Optional category" /></label><FieldUsageRow label="Category source" usage={fieldUsage?.category} source={valueSource("category")} onReset={hasTemplate && document.templateOverrides?.category === true && onFieldOverride ? () => onFieldOverride("category", true) : undefined} /><label><span>Tags</span><input value={resolvedDocument.tags.join(", ")} onChange={(event) => { onFieldOverride?.("tags", false); onChange("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean)); }} placeholder="Optional tags" /></label><FieldSettingsRow label="Tags source" source={valueSource("tags")} onReset={hasTemplate && document.templateOverrides?.tags === true && onFieldOverride ? () => onFieldOverride("tags", true) : undefined} /><p className="setting-note">These values are available to both Pages and Posts. Their use in listings and archives depends on the document type.</p></section>
      <section><h2>Template</h2><label><span>Presentation</span><select value={document.template ?? "default"} onChange={(event) => onChange("template", event.target.value as StudioDocument["template"])}>{allowedPageTemplates.map((template) => <option value={template} key={template}>{template.charAt(0).toUpperCase() + template.slice(1)}</option>)}</select></label><p className="setting-note">The document type is fixed when it is created. Field values and display choices remain editable for either type.</p></section>
      <section><h2>Search preview</h2><label><span>SEO title</span><input value={document.seoTitle} onChange={(event) => onChange("seoTitle", event.target.value)} /></label><label><span>SEO description</span><textarea rows={4} value={document.seoDescription} onChange={(event) => onChange("seoDescription", event.target.value)} /></label></section>
      {canDuplicate || canDelete || onSaveAsTemplate ? <section className="document-operations"><h2>Document actions</h2>{onSaveAsTemplate ? <button type="button" onClick={onSaveAsTemplate}>Save as template</button> : null}{canDuplicate ? <button type="button" onClick={onDuplicate}>Duplicate {document.kind}</button> : null}<button type="button" onClick={onDelete} disabled={!canDelete}>Move {document.kind} to Bin</button></section> : null}
    </div>
  );
}

const documentStatusLabel = (status: StudioDocumentStatus) => status.charAt(0).toUpperCase() + status.slice(1);
const MONTH_NAMES = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat("en-GB", { month: "long" }).format(new Date(2020, index, 1)));
const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function documentStatusDescription(status: StudioDocumentStatus) {
  if (status === "draft") return "Not ready to publish.";
  if (status === "pending") return "Waiting for review before publishing.";
  if (status === "private") return "Only visible in Studio for now.";
  return "Visible in the local Writing archive.";
}

function parsePublicationDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCalendarDays(month: Date) {
  const firstDayOffset = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days: Array<Date | null> = Array.from({ length: firstDayOffset }, () => null);
  for (let day = 1; day <= daysInMonth; day++) days.push(new Date(month.getFullYear(), month.getMonth(), day));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function isSameCalendarDay(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();
}

function formatCalendarMonth(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
}

function clampNumber(value: string, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.max(minimum, Math.min(maximum, parsed));
}

function formatPublishDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Immediately";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
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

function DocumentStylesInspector({ document }: { document: StudioDocument }) {
  return <div className="inspector-sections"><section><h2>Styles</h2><p className="setting-note">Document styles come from the assigned template and explicit block styles. There is no separate document-level style override.</p><div className="inspector-value-row"><span>Document type</span><strong>{document.kind === "post" ? "Post" : "Page"}</strong></div><div className="inspector-value-row"><span>Breakpoint rules</span><strong>Template controlled</strong></div></section></div>;
}

export function BlockInspector({ block, onChange, onOpenFiles, canOpenFiles }: { block: ContentBlock; onChange: (block: ContentBlock) => void; onOpenFiles: () => void; canOpenFiles: boolean }) {
  const alignedBlock = block.type === "paragraph" || block.type === "heading" || block.type === "document-title" || block.type === "document-subtitle" || block.type === "cover-image" ? block : null;
  const alignment = alignedBlock?.align ?? null;
  return (
    <div className="inspector-sections">
      <section><h2>{blockLabel(block.type)} block</h2><p className="setting-note">Changes apply to the selected block.</p></section>
      {alignedBlock ? <section><h2>Text</h2><label><span>Alignment</span><select value={alignment ?? "left"} onChange={(event) => onChange({ ...alignedBlock, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label>{alignedBlock.type === "heading" ? <label><span>Level</span><select value={alignedBlock.level} onChange={(event) => onChange({ ...alignedBlock, level: Number(event.target.value) as HeadingLevel })}>{[1, 2, 3, 4, 5, 6].map((level) => <option value={level} key={level}>Heading {level}</option>)}</select></label> : null}</section> : null}
      {block.type === "paragraph" ? <ParagraphInspector block={block} onChange={onChange} /> : null}
      {block.type === "quote" ? <section><h2>Quote</h2><label><span>Attribution</span><input value={block.attribution ?? ""} onChange={(event) => onChange({ ...block, attribution: event.target.value })} placeholder="Optional name" /></label></section> : null}
      {block.type === "list" ? <section><h2>List</h2><label><span>Style</span><select value={block.style} onChange={(event) => onChange({ ...block, style: event.target.value as "ordered" | "unordered" })}><option value="unordered">Bullets</option><option value="ordered">Numbers</option></select></label><p className="setting-note">Edit each item directly in the canvas.</p></section> : null}
      {block.type === "table" ? <section><h2>Table</h2><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.hasHeader)} onChange={(event) => onChange({ ...block, hasHeader: event.target.checked })} /><span>Header row</span></label><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.hasFooter)} onChange={(event) => onChange({ ...block, hasFooter: event.target.checked })} /><span>Footer row</span></label><p className="setting-note">Select a cell, then use the table toolbar menu to add or remove rows and columns.</p></section> : null}
      {block.type === "code" ? <section><h2>Code</h2><label><span>Language</span><select value={(block.language?.trim().toLowerCase() || "text")} onChange={(event) => onChange({ ...block, language: event.target.value })}>{block.language && !isKnownCodeLanguage(block.language) ? <option value={block.language.trim().toLowerCase()}>Plain text — unsupported “{block.language}”</option> : null}{CODE_LANGUAGE_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><p className="setting-note">Choose a language to apply syntax highlighting while preserving the original code.</p></section> : null}
      {block.type === "image" ? <section><h2>Image</h2>{canOpenFiles ? <button className="choose-media-button" type="button" onClick={onOpenFiles}>Choose from files</button> : null}{block.mediaId ? <p className="setting-note">This block uses a managed local file.</p> : <label><span>Image URL</span><input type="url" value={block.src} onChange={(event) => onChange({ ...block, src: event.target.value })} placeholder="https://…" /></label>}<label><span>Alternative text</span><input value={block.alt} onChange={(event) => onChange({ ...block, alt: event.target.value })} /></label><label><span>Caption</span><input value={block.caption ?? ""} onChange={(event) => onChange({ ...block, caption: event.target.value })} /></label><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.wide)} onChange={(event) => onChange({ ...block, wide: event.target.checked })} /><span>Wide display</span></label></section> : null}
      {block.type === "embed" ? <section><h2>Embed</h2><label><span>Title</span><input value={block.title} onChange={(event) => onChange({ ...block, title: event.target.value })} /></label><label><span>URL</span><input type="url" value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} /></label></section> : null}
      {block.type === "button" ? <section><h2>Button</h2><label><span>Label</span><input value={block.label} onChange={(event) => onChange({ ...block, label: event.target.value })} /></label><label><span>URL</span><input value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} /></label><label><span>Style</span><select value={block.style} onChange={(event) => onChange({ ...block, style: event.target.value as "primary" | "secondary" })}><option value="primary">Primary</option><option value="secondary">Secondary</option></select></label></section> : null}
      {block.type === "field" ? <section><h2>Field</h2><label><span>Label</span><input value={block.label} onChange={(event) => onChange({ ...block, label: event.target.value })} /></label><label><span>Control</span><select value={block.control} onChange={(event) => onChange({ ...block, control: event.target.value as "text" | "select" })}><option value="text">Text</option><option value="select">Select</option></select></label><label><span>Value</span><input value={block.value} onChange={(event) => onChange({ ...block, value: event.target.value })} /></label>{block.control === "select" ? <label><span>Options</span><input value={(block.options ?? []).join(", ")} onChange={(event) => onChange({ ...block, options: event.target.value.split(",").map((option) => option.trim()).filter(Boolean) })} placeholder="First, Second" /></label> : null}</section> : null}
      {block.type === "divider" ? <section><p className="setting-note">This divider has no additional settings.</p></section> : null}
      {block.type === "spacer" ? <section><h2>Spacer</h2><PresetNumberSetting label="Height" value={block.height} presets={SPACER_HEIGHT_PRESETS} min={LAYOUT_VALUE_LIMITS.spacer[0]} max={LAYOUT_VALUE_LIMITS.spacer[1]} onChange={(height) => onChange({ ...block, height: height ?? 32 })} /><p className="setting-note">Spacer blocks add empty space without adding screen-reader content.</p></section> : null}
      {block.type === "reading-time" ? <section><h2>Reading Time</h2><label><span>Prefix</span><input value={block.prefix ?? "Reading Time:"} onChange={(event) => onChange({ ...block, prefix: event.target.value })} /></label><label><span>Presentation</span><select value={block.presentation ?? "badge"} onChange={(event) => onChange({ ...block, presentation: event.target.value as ReadingTimePresentation })}><option value="badge">Badge</option><option value="plain">Plain text</option></select></label><label><span>Alignment</span><select value={block.align ?? "left"} onChange={(event) => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label><p className="setting-note">The value is calculated from ordinary document content at 220 words per minute.</p></section> : null}
      {block.type === "post-author" ? <section><h2>Post Author</h2><label><span>Prefix</span><input value={block.prefix ?? "By"} onChange={(event) => onChange({ ...block, prefix: event.target.value })} /></label><label className="checkbox-setting"><input type="checkbox" checked={block.avatar !== false} onChange={(event) => onChange({ ...block, avatar: event.target.checked })} /><span>Show initials avatar</span></label><label><span>Alignment</span><select value={block.align ?? "left"} onChange={(event) => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label><p className="setting-note">The author value is edited in Document metadata.</p></section> : null}
      {block.type === "post-date" ? <section><h2>Post Date</h2><label><span>Format</span><select value={block.format ?? "long"} onChange={(event) => onChange({ ...block, format: event.target.value as PostDateFormat })}><option value="long">Long — 2 September 2026</option><option value="short">Short — 02/09/2026</option><option value="iso">ISO — 2026-09-02</option></select></label><label className="checkbox-setting"><input type="checkbox" checked={block.showIcon !== false} onChange={(event) => onChange({ ...block, showIcon: event.target.checked })} /><span>Show clock icon</span></label><label><span>Alignment</span><select value={block.align ?? "left"} onChange={(event) => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label><p className="setting-note">The value uses Publish date first, then the existing publication date.</p></section> : null}
      {block.type === "section" ? <LayoutInspector block={block} onChange={onChange} heading="Section" note={`This section contains ${block.children.length} nested block${block.children.length === 1 ? "" : "s"}.`} /> : null}
      {block.type === "section" && block.source ? <section><p className="setting-note">Source: {block.source.module} · {block.source.exportName} · {block.source.revision.slice(0, 8)}</p>{canOpenFiles ? <button className="choose-media-button" type="button" onClick={onOpenFiles}>Open source files</button> : null}</section> : null}
      {block.type === "group" ? <LayoutInspector block={block} onChange={onChange} heading="Group" note={`This group contains ${block.children.length} nested block${block.children.length === 1 ? "" : "s"}.`} /> : null}
      {block.type === "component" ? <ComponentInspector block={block} onChange={onChange} /> : null}
    </div>
  );
}

type LayoutBlock = Extract<ContentBlock, { type: "group" | "section" }>;

function LayoutInspector({ block, onChange, heading, note }: { block: LayoutBlock; onChange: (block: ContentBlock) => void; heading: string; note: string }) {
  const update = (changes: Partial<LayoutBlock>) => onChange({ ...block, ...changes });
  return <section><h2>{heading} layout</h2><label><span>Arrangement</span><select value={block.layout} onChange={(event) => update({ layout: event.target.value as LayoutMode })}><option value="stack">Stack</option><option value="row">Row</option><option value="columns">Columns</option></select></label><div className="inspector-two-column"><label><span>Horizontal alignment</span><select value={block.horizontalAlign ?? ""} onChange={(event) => update({ horizontalAlign: (event.target.value || undefined) as LayoutBlock["horizontalAlign"] })}><option value="">Default</option><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option><option value="stretch">Stretch</option></select></label><label><span>Vertical alignment</span><select value={block.verticalAlign ?? ""} onChange={(event) => update({ verticalAlign: (event.target.value || undefined) as LayoutBlock["verticalAlign"] })}><option value="">Default</option><option value="top">Top</option><option value="centre">Centre</option><option value="bottom">Bottom</option><option value="stretch">Stretch</option></select></label></div><div className="inspector-two-column"><PresetNumberSetting label="Gap" value={block.gap} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.gap[0]} max={LAYOUT_VALUE_LIMITS.gap[1]} onChange={(gap) => update({ gap })} /><PresetNumberSetting label="Horizontal padding" value={block.paddingX} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.padding[0]} max={LAYOUT_VALUE_LIMITS.padding[1]} onChange={(paddingX) => update({ paddingX })} /><PresetNumberSetting label="Vertical padding" value={block.paddingY} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.padding[0]} max={LAYOUT_VALUE_LIMITS.padding[1]} onChange={(paddingY) => update({ paddingY })} /></div><label><span>Content width</span><select value={block.contentWidth ?? ""} onChange={(event) => update({ contentWidth: (event.target.value || undefined) as LayoutBlock["contentWidth"] })}><option value="">Default</option><option value="constrained">Constrained</option><option value="full">Full width</option></select></label>{block.layout === "columns" ? <label><span>Columns</span><select value={block.columns ?? 2} onChange={(event) => update({ columns: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 6].map((count) => <option value={count} key={count}>{count}</option>)}</select></label> : null}<label><span>Stack at</span><select value={block.stackAt ?? ""} onChange={(event) => update({ stackAt: (event.target.value || undefined) as LayoutBlock["stackAt"] })}><option value="">Never</option><option value="tablet">Tablet — 780px</option><option value="mobile">Mobile — 620px</option></select></label><p className="setting-note">{note} Responsive changes use Studio’s shared 780px and 620px breakpoints.</p></section>;
}

function PresetNumberSetting({ label, value, presets, min, max, onChange }: { label: string; value: number | undefined; presets: readonly number[]; min: number; max: number; onChange: (value: number | undefined) => void }) {
  const isPreset = value !== undefined && presets.includes(value);
  const customValue = () => { for (let candidate = min; candidate <= max; candidate += 1) if (!presets.includes(candidate)) return candidate; return min; };
  return <label><span>{label}</span><select value={value === undefined ? "" : isPreset ? String(value) : "custom"} onChange={(event) => { if (event.target.value === "") onChange(undefined); else if (event.target.value === "custom") onChange(value !== undefined && !isPreset ? value : customValue()); else onChange(Number(event.target.value)); }}><option value="">Default</option>{presets.map((preset) => <option value={preset} key={preset}>{preset}px</option>)}<option value="custom">Custom</option></select>{value !== undefined && !isPreset ? <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value) || min)))} aria-label={`${label} custom value in pixels`} /> : null}</label>;
}

function ComponentInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "component" }>; onChange: (block: ContentBlock) => void }) {
  const data = block.data ?? {};
  const update = (key: string, value: string) => onChange({ ...block, data: { ...data, [key]: value } });
  const fields = block.component === "mini-golf-scorecard" ? [["heading", "Heading"], ["player1", "Player 1"], ["player2", "Player 2"]] : block.component === "mini-golf-leaderboard" ? [["player1", "Player 1"], ["player2", "Player 2"]] : block.component === "mini-golf-share" ? [["heading", "Heading"]] : block.component === "mini-golf-account" ? [["status", "Account status"], ["action", "Account button"]] : [];
  return <section><h2>{block.component.replace("mini-golf-", "Mini Golf ")} component</h2><p className="setting-note">This application interface is inactive in Studio. Edit only its supported content properties.</p>{block.source ? <p className="setting-note">Source: {block.source.module} · {block.source.exportName} · {block.source.revision.slice(0, 8)}</p> : null}{fields.map(([key, label]) => <label key={key}><span>{label}</span><input value={typeof data[key] === "string" ? data[key] as string : ""} onChange={(event) => update(key, event.target.value)} /></label>)}</section>;
}

function ParagraphInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "paragraph" }>; onChange: (block: ContentBlock) => void }) {
  const style = block.style ?? {};
  function updateStyle<K extends keyof ParagraphStyle>(field: K, value: ParagraphStyle[K] | undefined) {
    const nextStyle = { ...style };
    if (value === undefined || value === "") delete nextStyle[field];
    else nextStyle[field] = value;
    onChange({ ...block, style: Object.keys(nextStyle).length ? nextStyle : undefined });
  }
  return <>
    <section className="inspector-panel"><h2>Typography</h2><label><span>Font size</span><select value={style.fontSize ?? ""} onChange={(event) => updateStyle("fontSize", (event.target.value || undefined) as ParagraphFontSize | undefined)}><option value="">Default</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="x-large">XL</option><option value="xx-large">XXL</option></select></label><label><span>Appearance</span><select value={style.appearance ?? ""} onChange={(event) => updateStyle("appearance", (event.target.value || undefined) as ParagraphAppearance | undefined)}><option value="">Default</option><option value="regular">Regular</option><option value="italic">Italic</option><option value="bold">Bold</option><option value="bold-italic">Bold italic</option></select></label><div className="inspector-two-column"><label><span>Line height</span><input value={style.lineHeight ?? ""} onChange={(event) => updateStyle("lineHeight", event.target.value)} placeholder="1.5" inputMode="decimal" /></label><label><span>Letter spacing</span><input value={style.letterSpacing ?? ""} onChange={(event) => updateStyle("letterSpacing", event.target.value)} placeholder="0" /></label></div></section>
    <section className="inspector-panel"><h2>Colour</h2><ColourSetting label="Text" value={style.textColor} onChange={(value) => updateStyle("textColor", value)} /><ColourSetting label="Background" value={style.backgroundColor} onChange={(value) => updateStyle("backgroundColor", value)} /><ColourSetting label="Links" value={style.linkColor} onChange={(value) => updateStyle("linkColor", value)} /></section>
    <section className="inspector-panel"><h2>Dimensions</h2><label><span>Padding</span><input value={style.padding ?? ""} onChange={(event) => updateStyle("padding", event.target.value)} placeholder="0" /></label><label><span>Margin</span><input value={style.margin ?? ""} onChange={(event) => updateStyle("margin", event.target.value)} placeholder="0" /></label></section>
    <section className="inspector-panel"><h2>Border</h2><label><span>Style</span><select value={style.borderStyle ?? "none"} onChange={(event) => updateStyle("borderStyle", event.target.value as ParagraphBorderStyle)}><option value="none">None</option><option value="solid">Solid</option><option value="dashed">Dashed</option></select></label><div className="inspector-two-column"><label><span>Width</span><input value={style.borderWidth ?? ""} onChange={(event) => updateStyle("borderWidth", event.target.value)} placeholder="1px" /></label><label><span>Radius</span><input value={style.borderRadius ?? ""} onChange={(event) => updateStyle("borderRadius", event.target.value)} placeholder="0" /></label></div><ColourSetting label="Colour" value={style.borderColor} onChange={(value) => updateStyle("borderColor", value)} /></section>
    <section className="inspector-panel"><h2>Advanced</h2><label><span>HTML anchor</span><input value={style.anchor ?? ""} onChange={(event) => updateStyle("anchor", event.target.value)} placeholder="section-name" /></label><label><span>Additional CSS class(es)</span><input value={style.className ?? ""} onChange={(event) => updateStyle("className", event.target.value)} placeholder="custom-class" /></label></section>
  </>;
}

function ColourSetting({ label, value, onChange }: { label: string; value?: string; onChange: (value: string | undefined) => void }) {
  return <div className="inspector-colour-setting"><span>{label}</span><div><input aria-label={`${label} colour`} type="color" value={value ?? "#1e1e1e"} onChange={(event) => onChange(event.target.value)} /><button type="button" onClick={() => onChange(undefined)} disabled={!value}>Reset</button></div></div>;
}
