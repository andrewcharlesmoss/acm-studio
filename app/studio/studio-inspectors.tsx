"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AcmIcon } from "@acm/icons/react";
import type { ColumnBlock, ContentBlock, DocumentDisplayField, HeadingLevel, ParagraphAppearance, ParagraphBackgroundGradient, ParagraphBorderStyle, ParagraphFontSize, ParagraphStyle, PostDateFormat, ReadingTimePresentation, SiteSectionRole, SpacerUnit, TextAlignment } from "../content/model";
import { PARAGRAPH_BACKGROUND_GRADIENTS, fitTextEnabled, paragraphBackgroundGradientCss } from "../content/paragraph-styles";
import { formatDocumentDate } from "../content/document-metadata";
import { contentWordCount, readingTimeMinutes } from "../content/reading-time";
import type { LayoutMode } from "../content/model";
import { LAYOUT_SPACING_PRESETS, LAYOUT_VALUE_LIMITS } from "../content/layout";
import { CODE_LANGUAGE_OPTIONS, isKnownCodeLanguage } from "../content/code-highlighting.mjs";
import { blockCatalogue, type StudioCategory, type StudioDocument, type StudioDocumentKind, type StudioDocumentStatus } from "./editor-model";
import { StudioIcon } from "./studio-icons";
import { BlockLibraryIcon } from "./block-library-icons";
import { Pane, PaneTabPanel, PaneTabs } from "./panes/pane-components";
import { InspectorAccordionSection } from "./inspector-accordion";
import { InspectorToolsSection, type InspectorToolOption } from "./inspector-tools-section";
import { BoxLengthSetting } from "./box-length-setting";
import { BorderColourControl } from "./border-colour-control";
import { documentDisplaySource, type FieldUsage } from "./document-fields";
import { createPasswordProtection } from "../content/password-protection";
import { COLUMN_LAYOUT_PRESETS, setColumnCount, setColumnsLayout, setColumnWidth } from "../content/columns";
import { SPACER_SIZE_LIMIT, SPACER_UNITS } from "../content/spacer";
import { customFontSizeMaximum, normaliseCustomFontSize, type CustomFontSizeUnit } from "../content/font-size";
import { safeTextLink } from "../content/rich-text";
import { UNIVERSAL_STYLE_PRESET, type UniversalStylePreset } from "@acm/styles";

function blockLabel(type: ContentBlock["type"]) {
  return type.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function usePortalRoot() {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // Resolve the body after hydration so server and first client renders match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPortalRoot(globalThis.document?.body ?? null);
  }, []);
  return portalRoot;
}

export type StudioInspectorProps = {
  paneWidth?: number;
  onPaneWidthChange?: (width: number) => void;
  paneCollapsed?: boolean;
  onPaneCollapsedChange?: (collapsed: boolean) => void;
  documentControls?: ReactNode;
  inspectorTab: "document" | "studio" | "block" | "styles";
  selectedBlock: ContentBlock | null;
  selectedDocumentField?: "title" | "subtitle" | null;
  activeDocument: StudioDocument;
  categories: StudioCategory[];
  tagSuggestions: string[];
  pages: StudioDocument[];
  canDelete: boolean;
  canDuplicate?: boolean;
  canOpenFiles?: boolean;
  allowedStatuses?: StudioDocumentStatus[];
  allowedPageTemplates?: NonNullable<StudioDocument["template"]>[];
  onSelectTab: (tab: "document" | "studio" | "block" | "styles") => void;
  onDocumentChange: <K extends keyof StudioDocument>(field: K, value: StudioDocument[K]) => void;
  onCategorySelectionChange: (categoryIds: string[]) => void;
  onAddCategory: (name: string, parentId?: string) => void;
  onBlockChange: (block: ContentBlock) => void;
  onOpenFiles: () => void;
  onOpenCoverMediaLibrary?: () => void;
  onRemoveCoverImage?: () => void;
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

export function StudioInspector({ paneWidth = 300, onPaneWidthChange, paneCollapsed, onPaneCollapsedChange, documentControls, inspectorTab, selectedBlock, selectedDocumentField = null, activeDocument, pages, categories, tagSuggestions, canDelete, canDuplicate = true, canOpenFiles = true, allowedStatuses, allowedPageTemplates, onSelectTab, onDocumentChange, onCategorySelectionChange, onAddCategory, onBlockChange, onOpenFiles, onOpenCoverMediaLibrary, onRemoveCoverImage, onPublish, onUnpublish, onDuplicate, onDelete, resolvedDocument, hasTemplate = false, fieldUsage, onFieldOverride, onSaveAsTemplate }: StudioInspectorProps) {
  const tabPrefix = useId();
  const tabs = ["document", "studio", "block", "styles"] as const;
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const [fontSizeViewModes, setFontSizeViewModes] = useState<Record<string, FontSizeViewMode>>({});
  const collapsed = paneCollapsed ?? localCollapsed;
  const setCollapsed = onPaneCollapsedChange ?? setLocalCollapsed;
  const selectedColumnParent = selectedBlock?.type === "column" ? findColumnsParent(activeDocument.blocks, selectedBlock.id) : undefined;
  const canSetSticky = selectedBlock?.type === "group" && activeDocument.blocks.some(block => block.id === selectedBlock.id);
  return (
    <Pane trackClassName="studio-inspector-track" className="studio-inspector" bodyClassName="inspector-scroll" label="Editor Inspector" side="right" width={paneWidth} onWidthChange={onPaneWidthChange} minWidth={270} maxWidth={480} collapsed={collapsed} onCollapsedChange={setCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />}
      tabs={<PaneTabs id={tabPrefix} label="Editor settings" className="inspector-tabs" tabs={[
        { id: "document", label: activeDocument.kind === "page" ? "Page" : "Post" },
        { id: "studio", label: "Studio" },
        { id: "block", label: "Block", disabled: !selectedBlock && !selectedDocumentField },
        { id: "styles", label: "Styles" },
      ]} active={inspectorTab} onChange={(tab) => onSelectTab(tab as StudioInspectorProps["inspectorTab"])} />}>
      {tabs.map((panel) => <PaneTabPanel key={panel} id={tabPrefix} tab={panel} active={inspectorTab}>
        {panel === "document" || panel === "studio" ? (
          <DocumentInspector key={activeDocument.id} panel={panel} documentControls={documentControls} document={activeDocument} resolvedDocument={resolvedDocument ?? activeDocument} categories={categories} tagSuggestions={tagSuggestions} onCategorySelectionChange={onCategorySelectionChange} onAddCategory={onAddCategory} hasTemplate={hasTemplate} fieldUsage={fieldUsage} onFieldOverride={onFieldOverride} onSaveAsTemplate={onSaveAsTemplate} pages={pages} onOpenCoverMediaLibrary={onOpenCoverMediaLibrary} onRemoveCoverImage={onRemoveCoverImage} onChange={onDocumentChange} onPublish={onPublish} onUnpublish={onUnpublish} onDuplicate={onDuplicate} onDelete={onDelete} canDelete={canDelete} canDuplicate={canDuplicate} allowedStatuses={allowedStatuses} allowedPageTemplates={allowedPageTemplates} />
        ) : panel === "styles" ? <DocumentStylesInspector document={activeDocument} /> : selectedDocumentField ? (
          <InspectorAccordionSection className="document-field-inspector" title={`Document ${selectedDocumentField}`}>
            <p>This field is part of the document. Edit it on the canvas.</p>
          </InspectorAccordionSection>
        ) : selectedBlock ? (
          <BlockInspector block={selectedBlock} canSetSticky={canSetSticky} fontSizeModeScope={activeDocument.id} fontSizeViewModes={fontSizeViewModes} onFontSizeViewModeChange={(key, mode) => setFontSizeViewModes(current => ({ ...current, [key]: mode }))} onChange={onBlockChange} onColumnWidthChange={selectedColumnParent && selectedColumnParent.children.length > 1 ? (columnId, width) => onBlockChange(setColumnWidth(selectedColumnParent, columnId, width)) : undefined} onOpenFiles={onOpenFiles} canOpenFiles={canOpenFiles} />
        ) : (
          <div className="inspector-empty"><span><StudioIcon name="block" /></span><p>Select a block to see its settings.</p></div>
        )}
      </PaneTabPanel>)}
    </Pane>
  );
}

function findColumnsParent(blocks: ContentBlock[], columnId: string): ColumnsBlock | undefined {
  for (const block of blocks) {
    if (block.type === "columns" && block.children.some(column => column.id === columnId)) return block;
    if (block.type === "columns") {
      for (const column of block.children) {
        const found = findColumnsParent(column.children, columnId);
        if (found) return found;
      }
    } else if ((block.type === "column" || block.type === "group" || block.type === "section" || block.type === "component") && block.children) {
      const found = findColumnsParent(block.children, columnId);
      if (found) return found;
    }
  }
  return undefined;
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

function DocumentInspector({ panel, documentControls, document, resolvedDocument, categories, tagSuggestions, onCategorySelectionChange, onAddCategory, hasTemplate = false, fieldUsage, onFieldOverride, onSaveAsTemplate, pages, onOpenCoverMediaLibrary, onRemoveCoverImage, onChange, onPublish, onUnpublish, onDuplicate, onDelete, canDelete, canDuplicate, allowedStatuses = ["draft", "pending", "private", "scheduled", "published"], allowedPageTemplates = ["default", "wide", "landing"] }: DocumentInspectorProps) {
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
    function positionStatusPopover() {
      const trigger = statusTriggerRef.current;
      const popover = statusPopoverRef.current;
      if (!trigger || !popover) return;
      const rect = trigger.getBoundingClientRect();
      const inspectorLeft = trigger.closest(".studio-inspector")?.getBoundingClientRect().left ?? rect.left;
      const width = Math.min(360, window.innerWidth - 32);
      setStatusPopoverPosition({
        left: Math.max(16, inspectorLeft - width - 12),
        top: Math.max(16, Math.min(rect.top, window.innerHeight - popover.getBoundingClientRect().height - 16)),
      });
    }
    positionStatusPopover();
    const popover = statusPopoverRef.current;
    const sizeObserver = popover ? new ResizeObserver(positionStatusPopover) : null;
    if (popover) sizeObserver?.observe(popover);
    window.addEventListener("resize", positionStatusPopover);
    window.addEventListener("scroll", positionStatusPopover, true);
    return () => {
      sizeObserver?.disconnect();
      window.removeEventListener("resize", positionStatusPopover);
      window.removeEventListener("scroll", positionStatusPopover, true);
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
    function positionPublishPopover() {
      const trigger = publishTriggerRef.current;
      const popover = publishPopoverRef.current;
      if (!trigger || !popover) return;
      const rect = trigger.getBoundingClientRect();
      const inspectorLeft = trigger.closest(".studio-inspector")?.getBoundingClientRect().left ?? rect.left;
      const width = Math.min(320, window.innerWidth - 32);
      setPublishPopoverPosition({
        left: Math.max(16, inspectorLeft - width - 12),
        top: Math.max(16, Math.min(rect.top - 12, window.innerHeight - popover.getBoundingClientRect().height - 16)),
      });
    }
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
    positionPublishPopover();
    const popover = publishPopoverRef.current;
    const sizeObserver = popover ? new ResizeObserver(positionPublishPopover) : null;
    if (popover) sizeObserver?.observe(popover);
    window.addEventListener("resize", positionPublishPopover);
    window.addEventListener("scroll", positionPublishPopover, true);
    globalThis.document.addEventListener("pointerdown", closePublishPopover);
    globalThis.document.addEventListener("keydown", closeWithEscape);
    requestAnimationFrame(() => publishHourInputRef.current?.focus());
    return () => {
      sizeObserver?.disconnect();
      window.removeEventListener("resize", positionPublishPopover);
      window.removeEventListener("scroll", positionPublishPopover, true);
      globalThis.document.removeEventListener("pointerdown", closePublishPopover);
      globalThis.document.removeEventListener("keydown", closeWithEscape);
    };
  }, [publishOpen]);

  useLayoutEffect(() => {
    if (!excerptOpen) return;
    function positionExcerptPopover() {
      const trigger = excerptTriggerRef.current;
      const popover = excerptPopoverRef.current;
      if (!trigger || !popover) return;
      const rect = trigger.getBoundingClientRect();
      const inspectorLeft = trigger.closest(".studio-inspector")?.getBoundingClientRect().left ?? rect.left;
      const width = Math.min(640, window.innerWidth - 32);
      setExcerptPopoverPosition({
        left: Math.max(16, inspectorLeft - width - 12),
        top: Math.max(16, Math.min(rect.top - 12, window.innerHeight - popover.getBoundingClientRect().height - 16)),
      });
    }
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
    positionExcerptPopover();
    const popover = excerptPopoverRef.current;
    const sizeObserver = popover ? new ResizeObserver(positionExcerptPopover) : null;
    if (popover) sizeObserver?.observe(popover);
    window.addEventListener("resize", positionExcerptPopover);
    window.addEventListener("scroll", positionExcerptPopover, true);
    globalThis.document.addEventListener("pointerdown", closeExcerptPopover);
    globalThis.document.addEventListener("keydown", closeWithEscape);
    requestAnimationFrame(() => excerptInputRef.current?.focus());
    return () => {
      sizeObserver?.disconnect();
      window.removeEventListener("resize", positionExcerptPopover);
      window.removeEventListener("scroll", positionExcerptPopover, true);
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
          {publishOpen && portalRoot ? createPortal(<div ref={publishPopoverRef} id="publish-date-popover" className="inspector-popover publish-date-popover" role="dialog" aria-label="Publish date" style={publishPopoverPosition ?? undefined}><div className="inspector-popover-heading"><strong>Publish</strong><button className="publish-now-button" type="button" onClick={publishImmediately}>Now</button><button type="button" aria-label="Close publish date" onClick={() => { setPublishOpen(false); requestAnimationFrame(() => publishTriggerRef.current?.focus()); }}><StudioIcon name="close" size={20} /></button></div><div className="publish-time-row"><strong>Time</strong><div className="publish-time-controls"><div className="publish-time-input"><input ref={publishHourInputRef} aria-label="Hour" inputMode="numeric" min="0" max="23" value={String(selectedDate.getHours()).padStart(2, "0")} onChange={(event) => updateDateParts({ hours: clampNumber(event.target.value, 0, 23) })} /><span>:</span><input aria-label="Minute" inputMode="numeric" min="0" max="59" value={String(selectedDate.getMinutes()).padStart(2, "0")} onChange={(event) => updateDateParts({ minutes: clampNumber(event.target.value, 0, 59) })} /></div><span className="publish-timezone">UTC+0</span></div></div><div className="publish-date-fields"><strong>Date</strong><div><input aria-label="Day" inputMode="numeric" min="1" max="31" value={String(selectedDate.getDate()).padStart(2, "0")} onChange={(event) => updateDateParts({ day: clampNumber(event.target.value, 1, 31) })} /><select aria-label="Month" value={selectedDate.getMonth()} onChange={(event) => updateDateParts({ month: Number(event.target.value) })}>{MONTH_NAMES.map((month, index) => <option value={index} key={month}>{month}</option>)}</select><input aria-label="Year" inputMode="numeric" value={selectedDate.getFullYear()} onChange={(event) => updateDateParts({ year: clampNumber(event.target.value, 1, 9999) })} /></div></div><div className="publish-calendar"><div className="publish-calendar-heading"><button type="button" aria-label="Previous month" onClick={() => moveCalendarMonth(-1)}><StudioIcon name="arrow-left" size={20} /></button><strong>{formatCalendarMonth(calendarMonth)}</strong><button type="button" aria-label="Next month" onClick={() => moveCalendarMonth(1)}><StudioIcon name="arrow-right" size={20} /></button></div><div className="publish-calendar-weekdays">{WEEKDAY_NAMES.map((weekday) => <span key={weekday}>{weekday}</span>)}</div><div className="publish-calendar-grid">{calendarDays.map((day, index) => day ? <button type="button" className={isSameCalendarDay(day, selectedDate) ? "is-selected" : ""} aria-label={day.toLocaleDateString("en-GB", { dateStyle: "full" })} key={day.toISOString()} onClick={() => updatePublicationDate(new Date(day.getFullYear(), day.getMonth(), day.getDate(), selectedDate.getHours(), selectedDate.getMinutes()))}>{day.getDate()}</button> : <span aria-hidden="true" key={`empty-${index}`} />)}</div></div><p className="setting-note">This date is used when the {document.kind} is published locally.</p></div>, portalRoot) : null}
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
const MONTH_NAMES = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat("en-GB", { month: "long" }).format(new Date(2020, index, 1)));
const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function documentStatusDescription(status: StudioDocumentStatus, kind: StudioDocumentKind) {
  if (status === "draft") return "Not ready to publish.";
  if (status === "pending") return "Waiting for review before publishing.";
  if (status === "private") return "Only visible in Studio for now.";
  if (status === "scheduled") return kind === "page" ? "Page publishing is not available yet." : "Publish automatically on a chosen date.";
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
  return <div className="inspector-sections"><InspectorAccordionSection title="Styles"><p className="setting-note">Document styles come from the assigned template and explicit block styles. There is no separate document-level style override.</p><div className="inspector-value-row"><span>Document type</span><strong>{document.kind === "post" ? "Post" : "Page"}</strong></div><div className="inspector-value-row"><span>Breakpoint rules</span><strong>Template controlled</strong></div></InspectorAccordionSection></div>;
}

type FontSizeViewMode = "presets" | "custom";

function fontSizeModeKey(scope: string, block: ContentBlock) {
  return JSON.stringify([scope, block.id, block.type]) ?? "";
}

export function BlockInspector({ block, canSetSticky = false, onChange, onColumnWidthChange, onOpenFiles, canOpenFiles, fontSizeModeScope, fontSizeViewModes, onFontSizeViewModeChange }: { block: ContentBlock; canSetSticky?: boolean; onChange: (block: ContentBlock) => void; onColumnWidthChange?: (columnId: string, width: number) => void; onOpenFiles: () => void; canOpenFiles: boolean; fontSizeModeScope: string; fontSizeViewModes: Record<string, FontSizeViewMode>; onFontSizeViewModeChange: (key: string, mode: FontSizeViewMode) => void }) {
  const tabPrefix = useId();
  const [selectedTab, setSelectedTab] = useState<{ blockId: string; blockType: ContentBlock["type"]; tab: "block" | "studio" } | null>(null);
  const selectedFontSizeModeKey = fontSizeModeKey(fontSizeModeScope, block);
  const hasStudioOptions = ["field", "component", "section", "reading-time", "post-author", "post-date", "code", "embed", "spacer", "group", "columns", "social-icons"].includes(block.type);
  const defaultTab: "block" | "studio" = block.type === "field" || block.type === "component" ? "studio" : "block";
  const activeTab = selectedTab?.blockId === block.id && selectedTab.blockType === block.type ? selectedTab.tab : defaultTab;
  const blockInfo = blockCatalogue.find((item) => item.type === block.type);
  const blockName = blockInfo?.label ?? blockLabel(block.type);
  const blockDescription = block.type === "paragraph"
    ? "Start with the basic building block of all narrative."
    : blockInfo?.description ?? `Configure this ${blockName.toLowerCase()} block.`;
  const alignedBlock = block.type === "heading" || block.type === "document-title" || block.type === "document-subtitle" || block.type === "cover-image" ? block : null;
  const alignment = alignedBlock?.align ?? null;
  const advanced = advancedFieldsForBlock(block);
  const blockSettings = (
    <>
      {alignedBlock ? <InspectorAccordionSection title={<>Text</>}><label><span>Alignment</span><select value={alignment ?? "left"} onChange={(event) => onChange({ ...alignedBlock, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label>{alignedBlock.type === "heading" || alignedBlock.type === "document-title" ? <label><span>Level</span><select value={alignedBlock.level ?? 2} onChange={(event) => onChange({ ...alignedBlock, level: Number(event.target.value) as HeadingLevel })}>{[1, 2, 3, 4, 5, 6].map((level) => <option value={level} key={level}>Heading {level}</option>)}</select></label> : null}</InspectorAccordionSection> : null}
      {block.type === "document-title" ? <InspectorAccordionSection title="Link settings"><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.isLink)} onChange={(event) => onChange({ ...block, isLink: event.target.checked })} /><span>Make title a link</span></label>{block.isLink ? <><label className="checkbox-setting"><input type="checkbox" checked={block.linkTarget === "_blank"} onChange={(event) => onChange({ ...block, linkTarget: event.target.checked ? "_blank" : "_self" })} /><span>Open in new tab</span></label><label><span>Link rel</span><input value={block.rel ?? ""} onChange={(event) => onChange({ ...block, rel: event.target.value || undefined })} placeholder="nofollow sponsored" /></label></> : null}</InspectorAccordionSection> : null}
      {block.type === "quote" ? <InspectorAccordionSection title={<>Quote</>}><label><span>Attribution</span><input value={block.attribution ?? ""} onChange={(event) => onChange({ ...block, attribution: event.target.value })} placeholder="Optional name" /></label><label><span>Text alignment</span><select value={block.align ?? "left"} onChange={(event) => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label><label><span>Style</span><select value={block.quoteStyle ?? "default"} onChange={(event) => onChange({ ...block, quoteStyle: event.target.value as "default" | "plain" })}><option value="default">Default</option><option value="plain">Plain</option></select></label></InspectorAccordionSection> : null}
      {block.type === "list" ? <InspectorAccordionSection title={<>List</>}><label><span>Style</span><select value={block.style} onChange={(event) => onChange({ ...block, style: event.target.value as "ordered" | "unordered" })}><option value="unordered">Bullets</option><option value="ordered">Numbers</option></select></label>{block.style === "ordered" ? <><label><span>List style</span><select value={block.marker ?? "1"} onChange={(event) => onChange({ ...block, marker: event.target.value as "1" | "A" | "a" | "I" | "i" })}><option value="1">Numbers</option><option value="A">Uppercase letters</option><option value="a">Lowercase letters</option><option value="I">Uppercase Roman numerals</option><option value="i">Lowercase Roman numerals</option></select></label><label><span>Start at</span><input type="number" min="1" max="100000" value={block.start ?? (block.reversed ? Math.max(1, block.items.length) : 1)} onChange={(event) => onChange({ ...block, start: Math.max(1, Math.min(100000, Number(event.target.value) || 1)) })} /></label><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.reversed)} onChange={(event) => onChange({ ...block, reversed: event.target.checked })} /><span>Reverse numbering</span></label></> : null}<p className="setting-note">Edit each item directly in the canvas.</p></InspectorAccordionSection> : null}
      {block.type === "table" ? <><InspectorAccordionSection title="Table"><label className="checkbox-setting"><input type="checkbox" checked={block.fixedWidth !== false} onChange={(event) => onChange({ ...block, fixedWidth: event.target.checked })} /><span>Fixed width table cells</span></label><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.hasHeader)} onChange={(event) => onChange({ ...block, hasHeader: event.target.checked })} /><span>Header row</span></label><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.hasFooter)} onChange={(event) => onChange({ ...block, hasFooter: event.target.checked })} /><span>Footer row</span></label><label><span>Caption</span><input value={block.caption ?? ""} onChange={(event) => onChange({ ...block, caption: event.target.value || undefined })} /></label><p className="setting-note">Select a cell, then use the table toolbar menu to add or remove rows and columns.</p></InspectorAccordionSection><InspectorAccordionSection title="Styles"><label><span>Table style</span><select value={block.tableStyle ?? "default"} onChange={(event) => onChange({ ...block, tableStyle: event.target.value as "default" | "stripes" })}><option value="default">Default</option><option value="stripes">Stripes</option></select></label></InspectorAccordionSection></> : null}
      {block.type === "image" ? <ImageInspector block={block} onChange={onChange} onOpenFiles={onOpenFiles} canOpenFiles={canOpenFiles} /> : null}
      {block.type === "cover-image" ? <CoverImageInspector block={block} onChange={onChange} /> : null}
      {block.type === "embed" ? <><InspectorAccordionSection title={<>Embed</>}><label><span>URL</span><input type="url" value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} /></label><label><span>Caption</span><input value={block.caption ?? ""} onChange={(event) => onChange({ ...block, caption: event.target.value || undefined })} /></label></InspectorAccordionSection><SpacingAndAdvancedInspector block={block} onChange={onChange} advancedFields={advanced} /></> : null}
      {block.type === "button" ? <InspectorAccordionSection title={<>Button</>}><label><span>Label</span><input value={block.label} onChange={(event) => onChange({ ...block, label: event.target.value })} /></label><label><span>URL</span><input value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} /></label><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.opensInNewTab)} onChange={(event) => onChange({ ...block, opensInNewTab: event.target.checked })} /><span>Open in new tab</span></label><label><span>Style</span><select value={block.style} onChange={(event) => onChange({ ...block, style: event.target.value as "primary" | "secondary" })}><option value="primary">Fill</option><option value="secondary">Outline</option></select></label><label><span>Width</span><select value={block.width ?? ""} onChange={(event) => onChange({ ...block, width: event.target.value ? Number(event.target.value) as 25 | 50 | 75 | 100 : undefined })}><option value="">Auto</option><option value="25">25%</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option></select></label><label><span>Text alignment</span><select value={block.align ?? "centre"} onChange={(event) => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label><label><span>Title attribute</span><input value={block.title ?? ""} onChange={(event) => onChange({ ...block, title: event.target.value || undefined })} /></label><label><span>Link rel</span><input value={block.rel ?? ""} onChange={(event) => onChange({ ...block, rel: event.target.value || undefined })} placeholder="nofollow sponsored" /></label></InspectorAccordionSection> : null}
      {block.type === "social-icons" ? <InspectorAccordionSection title="Social Icons"><p className="setting-note">Use the plus button in the block to add LinkedIn or TikTok. Select an icon to edit its link.</p><label><span>Style</span><select value={block.socialStyle ?? "default"} onChange={event => onChange({ ...block, socialStyle: event.target.value as NonNullable<typeof block.socialStyle> })}><option value="default">Default</option><option value="logos-only">Logos Only</option><option value="pill-shape">Pill Shape</option></select></label><label><span>Justification</span><select value={block.justification ?? "left"} onChange={event => onChange({ ...block, justification: event.target.value as NonNullable<typeof block.justification> })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option><option value="space-between">Space between</option></select></label><label><span>Orientation</span><select value={block.orientation ?? "horizontal"} onChange={event => onChange({ ...block, orientation: event.target.value as NonNullable<typeof block.orientation> })}><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></label><label className="checkbox-setting"><input type="checkbox" checked={block.allowWrap !== false} onChange={event => onChange({ ...block, allowWrap: event.target.checked })} /><span>Allow to wrap</span></label><label><span>Icon size</span><select value={block.iconSize ?? "normal"} onChange={event => onChange({ ...block, iconSize: event.target.value as NonNullable<typeof block.iconSize> })}><option value="small">Small</option><option value="normal">Normal</option><option value="large">Large</option><option value="huge">Huge</option></select></label><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.showLabels)} onChange={event => onChange({ ...block, showLabels: event.target.checked })} /><span>Show text labels</span></label><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.openInNewTab)} onChange={event => onChange({ ...block, openInNewTab: event.target.checked })} /><span>Open links in a new tab</span></label></InspectorAccordionSection> : null}
      {block.type === "social-linkedin" || block.type === "social-tiktok" ? <InspectorAccordionSection title={block.type === "social-linkedin" ? "LinkedIn" : "TikTok"}><label><span>Profile URL</span><input type="url" value={block.url} onChange={event => onChange({ ...block, url: event.target.value })} placeholder={block.type === "social-linkedin" ? "https://www.linkedin.com/in/…" : "https://www.tiktok.com/@…"} /></label>{block.url && !safeTextLink(block.url) ? <p className="setting-note" role="alert">Enter a valid link. The icon will not link until the address is valid.</p> : null}<label><span>Text label</span><input value={block.label ?? ""} onChange={event => onChange({ ...block, label: event.target.value || undefined })} placeholder={block.type === "social-linkedin" ? "LinkedIn" : "TikTok"} /></label><label><span>Link rel</span><input value={block.rel ?? ""} onChange={event => onChange({ ...block, rel: event.target.value || undefined })} placeholder="nofollow" /></label></InspectorAccordionSection> : null}
      {block.type === "social-icons" ? <InspectorAccordionSection title="Spacing"><label><span>Gap</span><input type="number" min="0" max="120" value={block.horizontalGap === block.verticalGap ? block.horizontalGap ?? "" : ""} placeholder={block.horizontalGap === block.verticalGap ? "Default" : "Mixed"} onChange={event => { const gap = event.target.value === "" ? undefined : Math.max(0, Math.min(120, Number(event.target.value) || 0)); onChange({ ...block, horizontalGap: gap, verticalGap: gap }); }} /></label></InspectorAccordionSection> : null}
      {block.type === "divider" ? <DividerInspector block={block} onChange={onChange} /> : null}
      {block.type === "spacer" ? <><SpacerInspector block={block} onChange={onChange} /><SpacingAndAdvancedInspector block={block} onChange={onChange} advancedFields={advanced} /></> : null}
      {block.type === "reading-time" ? <InspectorAccordionSection title="Alignment"><label><span>Alignment</span><select value={block.align ?? "left"} onChange={(event) => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label></InspectorAccordionSection> : null}
      {block.type === "post-author" ? <InspectorAccordionSection title="Alignment"><label><span>Alignment</span><select value={block.align ?? "left"} onChange={(event) => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label></InspectorAccordionSection> : null}
      {block.type === "post-date" ? <InspectorAccordionSection title="Post Date"><label><span>Format</span><select value={block.format ?? "long"} onChange={(event) => onChange({ ...block, format: event.target.value as PostDateFormat })}><option value="long">Long — 2 September 2026</option><option value="short">Short — 02/09/2026</option><option value="iso">ISO — 2026-09-02</option></select></label><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.isLink)} onChange={(event) => onChange({ ...block, isLink: event.target.checked })} /><span>Link to post</span></label><label><span>Alignment</span><select value={block.align ?? "left"} onChange={(event) => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label><p className="setting-note">The value uses Publish date first, then the existing publication date.</p></InspectorAccordionSection> : null}
      {block.type === "section" ? <LayoutInspector block={block} onChange={onChange} heading="Section" note={`This section contains ${block.children.length} nested block${block.children.length === 1 ? "" : "s"}.`} /> : null}
      {block.type === "group" ? <LayoutInspector block={block} onChange={onChange} canSetSticky={canSetSticky} heading="Group" note={`This group contains ${block.children.length} nested block${block.children.length === 1 ? "" : "s"}.`} /> : null}
      {block.type === "columns" ? <ColumnsInspector block={block} onChange={onChange} /> : null}
      {block.type === "column" ? <ColumnInspector block={block} onChange={onChange} onWidthChange={onColumnWidthChange} /> : null}
      {["paragraph", "heading", "quote", "list", "table", "code", "button", "footnotes", "group", "section", "columns", "column", "document-title", "document-subtitle", "reading-time", "post-author", "post-date", "social-icons"].includes(block.type) ? <ParagraphInspector key={`${block.id}:${block.type}`} block={block} onChange={onChange} fontSizeViewMode={fontSizeViewModes[selectedFontSizeModeKey] ?? null} onFontSizeViewModeChange={mode => onFontSizeViewModeChange(selectedFontSizeModeKey, mode)} /> : null}
      {advanced && block.type !== "embed" && block.type !== "spacer" && block.type !== "image" && block.type !== "divider" ? <AdvancedFieldsInspector block={block} onChange={onChange} fields={advanced} /> : null}
    </>
  );
  const studioSettings = (
    <>
      {block.type === "field" ? <InspectorAccordionSection title="Field"><label><span>Label</span><input value={block.label} onChange={(event) => onChange({ ...block, label: event.target.value })} /></label><label><span>Control</span><select value={block.control} onChange={(event) => onChange({ ...block, control: event.target.value as "text" | "select" })}><option value="text">Text</option><option value="select">Select</option></select></label><label><span>Value</span><input value={block.value} onChange={(event) => onChange({ ...block, value: event.target.value })} /></label>{block.control === "select" ? <label><span>Options</span><input value={(block.options ?? []).join(", ")} onChange={(event) => onChange({ ...block, options: event.target.value.split(",").map((option) => option.trim()).filter(Boolean) })} placeholder="First, Second" /></label> : null}</InspectorAccordionSection> : null}
      {block.type === "component" ? <ComponentInspector block={block} onChange={onChange} /> : null}
      {block.type === "section" ? <InspectorAccordionSection title="Studio section"><label><span>Site role</span><select value={block.role ?? ""} onChange={(event) => onChange({ ...block, role: (event.target.value || undefined) as SiteSectionRole | undefined })}><option value="">None</option>{(["account", "setup", "scorecard", "leaderboard", "share", "hero", "hero-copy", "account-copy", "scorecard-heading", "scorecard-actions", "leaderboard-card", "leaderboard-score", "leaderboard-metrics", "metric", "footer", "footer-brand", "footer-links", "social-link"] as SiteSectionRole[]).map((role) => <option value={role} key={role}>{role}</option>)}</select></label>{block.source ? <><p className="setting-note">Source: {block.source.module} · {block.source.exportName} · {block.source.revision.slice(0, 8)}</p>{canOpenFiles ? <button className="choose-media-button" type="button" onClick={onOpenFiles}>Open source files</button> : null}</> : null}</InspectorAccordionSection> : null}
      {block.type === "group" || block.type === "section" ? <LayoutResponsiveInspector block={block} onChange={onChange} /> : null}
      {block.type === "columns" ? <InspectorAccordionSection title="Studio responsive layout"><label><span>Stack columns at</span><select value={block.stackAt ?? "mobile"} onChange={(event) => onChange({ ...block, stackAt: event.target.value as typeof block.stackAt })}><option value="mobile">Mobile — 620px</option><option value="tablet">Tablet — 780px</option><option value="never">Never</option></select></label><p className="setting-note">Studio lets you select a tablet or mobile stacking breakpoint.</p></InspectorAccordionSection> : null}
      {block.type === "spacer" ? <SpacerWidthInspector block={block} onChange={onChange} /> : null}
      {block.type === "social-icons" ? <InspectorAccordionSection title="Studio spacing"><label><span>Horizontal gap (px)</span><input type="number" min="0" max="120" value={block.horizontalGap ?? ""} placeholder="Default" onChange={event => onChange({ ...block, horizontalGap: event.target.value === "" ? undefined : Math.max(0, Math.min(120, Number(event.target.value) || 0)) })} /></label><label><span>Vertical gap (px)</span><input type="number" min="0" max="120" value={block.verticalGap ?? ""} placeholder="Default" onChange={event => onChange({ ...block, verticalGap: event.target.value === "" ? undefined : Math.max(0, Math.min(120, Number(event.target.value) || 0)) })} /></label><p className="setting-note">Set one gap value in the Block tab.</p></InspectorAccordionSection> : null}
      {block.type === "reading-time" ? <InspectorAccordionSection title="Reading Time"><label><span>Prefix</span><input value={block.prefix ?? "Reading Time:"} onChange={(event) => onChange({ ...block, prefix: event.target.value })} /></label><label><span>Presentation</span><select value={block.presentation ?? "badge"} onChange={(event) => onChange({ ...block, presentation: event.target.value as ReadingTimePresentation })}><option value="badge">Badge</option><option value="plain">Plain text</option></select></label><p className="setting-note">The value is calculated from ordinary document content at 220 words per minute.</p></InspectorAccordionSection> : null}
      {block.type === "post-author" ? <InspectorAccordionSection title="Post Author"><label><span>Prefix</span><input value={block.prefix ?? "By"} onChange={(event) => onChange({ ...block, prefix: event.target.value })} /></label><label className="checkbox-setting"><input type="checkbox" checked={block.avatar !== false} onChange={(event) => onChange({ ...block, avatar: event.target.checked })} /><span>Show initials avatar</span></label><p className="setting-note">The author value is edited in Document metadata.</p></InspectorAccordionSection> : null}
      {block.type === "post-date" ? <InspectorAccordionSection title="Studio date options"><label className="checkbox-setting"><input type="checkbox" checked={block.showIcon !== false} onChange={(event) => onChange({ ...block, showIcon: event.target.checked })} /><span>Show clock icon</span></label></InspectorAccordionSection> : null}
      {block.type === "code" ? <InspectorAccordionSection title="Code language"><label><span>Language</span><select value={(block.language?.trim().toLowerCase() || "text")} onChange={(event) => onChange({ ...block, language: event.target.value })}>{block.language && !isKnownCodeLanguage(block.language) ? <option value={block.language.trim().toLowerCase()}>Plain text — unsupported “{block.language}”</option> : null}{CODE_LANGUAGE_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><p className="setting-note">Syntax highlighting is an ACM Studio feature. The original code remains unchanged.</p></InspectorAccordionSection> : null}
      {block.type === "embed" ? <InspectorAccordionSection title="Embed card"><label><span>Card title</span><input value={block.title} onChange={(event) => onChange({ ...block, title: event.target.value })} /></label><p className="setting-note">Studio displays safe resource cards instead of fetching provider embeds.</p></InspectorAccordionSection> : null}
    </>
  );
  const tabs = [{ id: "block", label: "Block" }, { id: "studio", label: "Studio" }];
  function selectTab(tab: "block" | "studio") {
    setSelectedTab({ blockId: block.id, blockType: block.type, tab });
  }
  return <div className="block-inspector-settings">
    <div className="inspector-sections"><section className="inspector-block-summary"><div className="inspector-block-summary-heading"><span><BlockLibraryIcon type={block.type} /></span><h2>{blockName}</h2></div><p className="setting-note">{blockDescription}</p></section></div>
    {hasStudioOptions ? <PaneTabs id={tabPrefix} label={`${blockName} settings`} tabs={tabs} active={activeTab} onChange={(tab) => selectTab(tab as "block" | "studio")} /> : null}
    {hasStudioOptions ? <PaneTabPanel id={tabPrefix} tab="block" active={activeTab} className="block-inspector-tabpanel"><div className="inspector-sections">{blockSettings}</div></PaneTabPanel> : <div className="inspector-sections">{blockSettings}</div>}
    {hasStudioOptions ? <PaneTabPanel id={tabPrefix} tab="studio" active={activeTab} className="block-inspector-tabpanel"><div className="inspector-sections">{studioSettings}</div></PaneTabPanel> : null}
  </div>;
}

type AdvancedFields = { anchor: boolean; className: boolean };

// Match the Gutenberg core blocks represented by Studio. Studio-only blocks
// without a shared style wrapper do not expose generic Advanced fields.
function advancedFieldsForBlock(block: ContentBlock): AdvancedFields | null {
  if (["paragraph", "heading", "quote", "list", "table", "code", "image", "embed", "button", "divider", "spacer", "group", "section", "columns", "column", "footnotes", "social-icons", "social-linkedin", "social-tiktok", "document-title", "cover-image", "post-date", "post-author"].includes(block.type)) {
    return { anchor: true, className: block.type !== "paragraph" };
  }
  return null;
}

function AdvancedFieldsInspector({ block, onChange, fields }: { block: ContentBlock; onChange: (block: ContentBlock) => void; fields: AdvancedFields }) {
  const style = block.type === "paragraph" || block.type === "columns" || block.type === "column" ? block.style ?? {} : block.visualStyle ?? {};
  function update(field: "anchor" | "className", value: string) {
    const next = { ...style };
    if (value.trim()) next[field] = value;
    else delete next[field];
    if (block.type === "paragraph" || block.type === "columns" || block.type === "column") onChange({ ...block, style: Object.keys(next).length ? next : undefined } as ContentBlock);
    else onChange({ ...block, visualStyle: Object.keys(next).length ? next : undefined } as ContentBlock);
  }
  return <InspectorAccordionSection title="Advanced">
    {block.type === "group" ? <><label><span>HTML element</span><select value={block.tagName ?? "div"} onChange={(event) => onChange({ ...block, tagName: event.target.value as NonNullable<typeof block.tagName> })}>{["div", "main", "section", "article", "aside", "header", "footer", "nav"].map((tag) => <option value={tag} key={tag}>{tag}</option>)}</select></label><label><span>ARIA label</span><input value={block.ariaLabel ?? ""} onChange={(event) => onChange({ ...block, ariaLabel: event.target.value || undefined })} /></label></> : null}
    {fields.anchor ? <label><span>HTML anchor</span><input value={style.anchor ?? ""} onChange={(event) => update("anchor", event.target.value)} placeholder="section-name" /></label> : null}
    {fields.className ? <label><span>Additional CSS class(es)</span><input value={style.className ?? ""} onChange={(event) => update("className", event.target.value)} placeholder="custom-class" /></label> : null}
  </InspectorAccordionSection>;
}

type LayoutBlock = Extract<ContentBlock, { type: "group" | "section" }>;

function LayoutResponsiveInspector({ block, onChange }: { block: LayoutBlock; onChange: (block: ContentBlock) => void }) {
  return <InspectorAccordionSection title="Studio responsive layout"><label><span>Stack at</span><select value={block.stackAt ?? ""} onChange={(event) => onChange({ ...block, stackAt: (event.target.value || undefined) as LayoutBlock["stackAt"] } as ContentBlock)}><option value="">Never</option><option value="tablet">Tablet — 780px</option><option value="mobile">Mobile — 620px</option></select></label><p className="setting-note">Studio lets you select a tablet or mobile stacking breakpoint.</p></InspectorAccordionSection>;
}

type SpacingBlock = Extract<ContentBlock, { type: "embed" | "spacer" }>;

function SpacingAndAdvancedInspector({ block, onChange, advancedFields }: { block: SpacingBlock; onChange: (block: ContentBlock) => void; advancedFields: AdvancedFields | null }) {
  const style = block.visualStyle ?? {};
  function updateStyle(field: "margin", value: string | undefined) {
    const nextStyle = { ...style };
    if (value) nextStyle[field] = value;
    else delete nextStyle[field];
    onChange({ ...block, visualStyle: Object.keys(nextStyle).length ? nextStyle : undefined });
  }
  return <>
    <InspectorAccordionSection title="Dimensions"><ParagraphLengthSetting key={`${block.id}-margin`} label="Margin" value={style.margin} min={-100} max={200} onChange={(value) => updateStyle("margin", value)} /></InspectorAccordionSection>
    {advancedFields ? <AdvancedFieldsInspector block={block} onChange={onChange} fields={advancedFields} /> : null}
  </>;
}

function SpacerInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "spacer" }>; onChange: (block: ContentBlock) => void }) {
  const defaultHeightByUnit: Record<SpacerUnit, number> = { px: 32, em: 2, rem: 2, vw: 10, vh: 10 };
  const unitOptions = SPACER_UNITS.map((unit) => <option value={unit} key={unit}>{unit}</option>);
  return <InspectorAccordionSection title="Spacer"><div className="inspector-two-column"><label><span>Height</span><input type="number" min="0" max={SPACER_SIZE_LIMIT} step="any" value={block.height} onChange={(event) => onChange({ ...block, height: Math.max(0, Math.min(SPACER_SIZE_LIMIT, Number(event.target.value) || 0)) })} /></label><label><span>Height unit</span><select value={block.heightUnit ?? "px"} onChange={(event) => { const unit = event.target.value as SpacerUnit; onChange({ ...block, height: defaultHeightByUnit[unit], heightUnit: unit === "px" ? undefined : unit }); }}>{unitOptions}</select></label></div><p className="setting-note">Spacer blocks add empty space without adding screen-reader content.</p></InspectorAccordionSection>;
}

function SpacerWidthInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "spacer" }>; onChange: (block: ContentBlock) => void }) {
  const defaultWidthByUnit: Record<SpacerUnit, number> = { px: 100, em: 8, rem: 8, vw: 10, vh: 10 };
  const unitOptions = SPACER_UNITS.map((unit) => <option value={unit} key={unit}>{unit}</option>);
  return <InspectorAccordionSection title="Studio spacer width"><div className="inspector-two-column"><label><span>Width</span><input type="number" min="0" max={SPACER_SIZE_LIMIT} step="any" value={block.width ?? ""} placeholder="Full" onChange={(event) => onChange({ ...block, width: event.target.value === "" ? undefined : Math.max(0, Math.min(SPACER_SIZE_LIMIT, Number(event.target.value) || 0)), widthUnit: event.target.value === "" ? undefined : block.widthUnit })} /></label><label><span>Width unit</span><select value={block.widthUnit ?? "px"} disabled={block.width === undefined} onChange={(event) => { const unit = event.target.value as SpacerUnit; onChange({ ...block, width: defaultWidthByUnit[unit], widthUnit: unit === "px" ? undefined : unit }); }}>{unitOptions}</select></label></div><p className="setting-note">Gutenberg shows spacer width or height according to its parent layout. Studio keeps its additional width setting here.</p></InspectorAccordionSection>;
}

function ImageInspector({ block, onChange, onOpenFiles, canOpenFiles }: { block: Extract<ContentBlock, { type: "image" }>; onChange: (block: ContentBlock) => void; onOpenFiles: () => void; canOpenFiles: boolean }) {
  const ratio = block.aspectRatio ?? "original";
  const linkDestination = block.linkDestination ?? (block.linkUrl ? "custom" : "none");
  const style = block.visualStyle ?? {};
  function updateVisualStyle(changes: Partial<ParagraphStyle>) {
    const next = { ...style, ...changes };
    for (const key of Object.keys(next) as (keyof ParagraphStyle)[]) if (!next[key]) delete next[key];
    onChange({ ...block, visualStyle: Object.keys(next).length ? next : undefined });
  }
  return <>
    <InspectorAccordionSection title="Image">
      {canOpenFiles ? <button className="choose-media-button" type="button" onClick={onOpenFiles}>Choose from files</button> : null}
      {block.mediaId ? <p className="setting-note">This block uses a managed local file.</p> : <label><span>Image URL</span><input type="url" value={block.src} onChange={(event) => onChange({ ...block, src: event.target.value })} placeholder="https://…" /></label>}
      <label><span>Alternative text</span><input value={block.alt} disabled={Boolean(block.decorative)} onChange={(event) => onChange({ ...block, alt: event.target.value })} /></label>
      <label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.decorative)} disabled={linkDestination !== "none"} onChange={(event) => onChange({ ...block, decorative: event.target.checked })} /><span>Mark as decorative</span></label>
      <label><span>Caption</span><input value={block.caption ?? ""} onChange={(event) => onChange({ ...block, caption: event.target.value })} /></label>
      <label><span>Link destination</span><select value={linkDestination} onChange={(event) => { const destination = event.target.value as NonNullable<typeof block.linkDestination>; onChange({ ...block, linkDestination: destination, linkUrl: destination === "custom" ? block.linkUrl : undefined, opensInNewTab: destination === "custom" || destination === "media" ? block.opensInNewTab : undefined, decorative: destination === "none" ? block.decorative : false }); }}><option value="none">None</option><option value="custom">Custom URL</option><option value="media">Image file</option><option value="lightbox">Enlarge on click</option></select></label>
      {linkDestination === "custom" ? <label><span>Link URL</span><input type="url" value={block.linkUrl ?? ""} onChange={(event) => onChange({ ...block, linkUrl: event.target.value || undefined, decorative: event.target.value ? false : block.decorative })} placeholder="https://…" /></label> : null}
      {(linkDestination === "custom" || linkDestination === "media") ? <label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.opensInNewTab)} onChange={(event) => onChange({ ...block, opensInNewTab: event.target.checked })} /><span>Open in new tab</span></label> : null}
    </InspectorAccordionSection>
    <InspectorAccordionSection title="Styles"><label><span>Style</span><select value={block.imageStyle ?? "default"} onChange={(event) => onChange({ ...block, imageStyle: event.target.value as NonNullable<typeof block.imageStyle> })}><option value="default">Default</option><option value="rounded">Rounded</option></select></label></InspectorAccordionSection>
    <InspectorAccordionSection title="Dimensions">
      <label><span>Aspect ratio</span><select value={ratio} onChange={(event) => onChange({ ...block, aspectRatio: event.target.value as typeof block.aspectRatio })}><option value="original">Original</option><option value="square">Square — 1:1</option><option value="portrait">Portrait — 3:4</option><option value="landscape">Landscape — 4:3</option><option value="wide">Wide — 16:9</option></select></label>
      <label><span>Width (px)</span><input type="number" min="32" max="2400" value={block.displayWidth ?? ""} placeholder="Auto" onChange={(event) => onChange({ ...block, displayWidth: event.target.value ? Math.max(32, Math.min(2400, Number(event.target.value) || 32)) : undefined })} /></label>
      <label><span>Height (px)</span><input type="number" min="32" max="2400" value={block.displayHeight ?? ""} placeholder="Auto" onChange={(event) => onChange({ ...block, displayHeight: event.target.value ? Math.max(32, Math.min(2400, Number(event.target.value) || 32)) : undefined })} /></label>
      {ratio !== "original" ? <><label><span>Scale</span><select value={block.scale ?? "cover"} onChange={(event) => onChange({ ...block, scale: event.target.value as "cover" | "contain" })}><option value="cover">Cover</option><option value="contain">Contain</option></select></label><div className="inspector-two-column"><label><span>Focal X (%)</span><input type="number" min="0" max="100" value={block.focalX ?? 50} onChange={(event) => onChange({ ...block, focalX: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /></label><label><span>Focal Y (%)</span><input type="number" min="0" max="100" value={block.focalY ?? 50} onChange={(event) => onChange({ ...block, focalY: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /></label></div></> : null}
      <ParagraphLengthSetting key={`${block.id}-margin`} label="Margin" value={style.margin} min={-100} max={200} onChange={(value) => updateVisualStyle({ margin: value })} />
    </InspectorAccordionSection>
    <InspectorAccordionSection title="Border & shadow"><ColourSetting label="Border colour" value={style.borderColor} onChange={(value) => updateVisualStyle({ borderColor: value })} /><label><span>Border style</span><select value={style.borderStyle ?? "none"} onChange={(event) => updateVisualStyle({ borderStyle: event.target.value as ParagraphBorderStyle })}><option value="none">None</option><option value="solid">Solid</option><option value="dashed">Dashed</option></select></label><div className="inspector-two-column"><label><span>Border width</span><input value={style.borderWidth ?? ""} onChange={(event) => updateVisualStyle({ borderWidth: event.target.value })} placeholder="1px" /></label><label><span>Radius</span><input value={style.borderRadius ?? ""} onChange={(event) => updateVisualStyle({ borderRadius: event.target.value })} placeholder="0" /></label></div><label><span>Shadow</span><select value={style.shadow ?? ""} onChange={(event) => updateVisualStyle({ shadow: (event.target.value || undefined) as ParagraphStyle["shadow"] })}><option value="">Default</option><option value="none">None</option><option value="soft">Soft</option><option value="strong">Strong</option></select></label></InspectorAccordionSection>
    <InspectorAccordionSection title="Advanced"><label><span>Title attribute</span><input value={block.title ?? ""} onChange={(event) => onChange({ ...block, title: event.target.value || undefined })} /></label><label><span>HTML anchor</span><input value={style.anchor ?? ""} onChange={(event) => updateVisualStyle({ anchor: event.target.value })} placeholder="section-name" /></label><label><span>Additional CSS class(es)</span><input value={style.className ?? ""} onChange={(event) => updateVisualStyle({ className: event.target.value })} placeholder="custom-class" /></label></InspectorAccordionSection>
  </>;
}

function CoverImageInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "cover-image" }>; onChange: (block: ContentBlock) => void }) {
  const ratio = block.aspectRatio ?? "original";
  const style = block.visualStyle ?? {};
  function updateVisualStyle(changes: Partial<ParagraphStyle>) {
    const next = { ...style, ...changes };
    for (const key of Object.keys(next) as (keyof ParagraphStyle)[]) if (!next[key]) delete next[key];
    onChange({ ...block, visualStyle: Object.keys(next).length ? next : undefined });
  }
  function updateBorderColour(value: string | undefined) {
    updateVisualStyle({ borderColor: value, ...(value ? { borderStyle: style.borderStyle && style.borderStyle !== "none" ? style.borderStyle : "solid" } : {}) });
  }
  function updateBorderWidth(value: string) {
    updateVisualStyle({ borderWidth: value || undefined, ...(value ? { borderStyle: style.borderStyle && style.borderStyle !== "none" ? style.borderStyle : "solid" } : {}) });
  }
  return <>
    <InspectorAccordionSection title="Link settings">
      <label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.isLink)} onChange={(event) => onChange({ ...block, isLink: event.target.checked })} /><span>Link to post</span></label>
      {block.isLink ? <><label className="checkbox-setting"><input type="checkbox" checked={block.linkTarget === "_blank"} onChange={(event) => onChange({ ...block, linkTarget: event.target.checked ? "_blank" : "_self" })} /><span>Open in new tab</span></label><label><span>Link rel</span><input value={block.rel ?? ""} onChange={(event) => onChange({ ...block, rel: event.target.value || undefined })} placeholder="nofollow sponsored" /></label></> : null}
    </InspectorAccordionSection>
    <InspectorAccordionSection title="Dimensions">
      <label><span>Aspect ratio</span><select value={ratio} onChange={(event) => onChange({ ...block, aspectRatio: event.target.value as typeof block.aspectRatio })}><option value="original">Original</option><option value="square">Square — 1:1</option><option value="portrait">Portrait — 3:4</option><option value="landscape">Landscape — 4:3</option><option value="wide">Wide — 16:9</option></select></label>
      <label><span>Width (px)</span><input type="number" min="32" max="2400" value={block.displayWidth ?? ""} placeholder="Auto" onChange={(event) => onChange({ ...block, displayWidth: event.target.value ? Math.max(32, Math.min(2400, Number(event.target.value) || 32)) : undefined })} /></label>
      <label><span>Height (px)</span><input type="number" min="32" max="2400" value={block.displayHeight ?? ""} placeholder="Auto" onChange={(event) => onChange({ ...block, displayHeight: event.target.value ? Math.max(32, Math.min(2400, Number(event.target.value) || 32)) : undefined })} /></label>
      {ratio !== "original" ? <><label><span>Scale</span><select value={block.scale ?? "cover"} onChange={(event) => onChange({ ...block, scale: event.target.value as "cover" | "contain" })}><option value="cover">Cover</option><option value="contain">Contain</option></select></label><div className="inspector-two-column"><label><span>Focal X (%)</span><input type="number" min="0" max="100" value={block.focalX ?? 50} onChange={(event) => onChange({ ...block, focalX: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /></label><label><span>Focal Y (%)</span><input type="number" min="0" max="100" value={block.focalY ?? 50} onChange={(event) => onChange({ ...block, focalY: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /></label></div></> : null}
    </InspectorAccordionSection>
    <InspectorAccordionSection title="Border & shadow"><ColourSetting label="Border colour" value={style.borderColor} onChange={updateBorderColour} /><label><span>Border style</span><select value={style.borderStyle ?? "none"} onChange={(event) => updateVisualStyle({ borderStyle: event.target.value as ParagraphBorderStyle })}><option value="none">None</option><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></label><div className="inspector-two-column"><label><span>Border width</span><input value={style.borderWidth ?? ""} onChange={(event) => updateBorderWidth(event.target.value)} placeholder="1px" /></label><label><span>Radius</span><input value={style.borderRadius ?? ""} onChange={(event) => updateVisualStyle({ borderRadius: event.target.value })} placeholder="0" /></label></div><label><span>Shadow</span><select value={style.shadow ?? ""} onChange={(event) => updateVisualStyle({ shadow: (event.target.value || undefined) as ParagraphStyle["shadow"] })}><option value="">Default</option><option value="none">None</option><option value="soft">Soft</option><option value="strong">Strong</option></select></label></InspectorAccordionSection>
  </>;
}

function DividerInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "divider" }>; onChange: (block: ContentBlock) => void }) {
  const style = block.visualStyle ?? {};
  function updateVisualStyle(changes: Partial<ParagraphStyle>) {
    const next = { ...style, ...changes };
    for (const key of Object.keys(next) as (keyof ParagraphStyle)[]) if (!next[key]) delete next[key];
    onChange({ ...block, visualStyle: Object.keys(next).length ? next : undefined });
  }
  return <>
    <InspectorAccordionSection title="Styles"><label><span>Style</span><select value={block.style ?? "default"} onChange={(event) => onChange({ ...block, style: event.target.value as "default" | "wide" | "dots" })}><option value="default">Default</option><option value="wide">Wide line</option><option value="dots">Dots</option></select></label><label><span>HTML element</span><select value={block.tagName ?? "hr"} onChange={event => onChange({ ...block, tagName: event.target.value as "hr" | "div" })}><option value="hr">Horizontal rule</option><option value="div">Div</option></select></label></InspectorAccordionSection>
    <InspectorAccordionSection title="Colour"><PaletteColourSetting label="Divider colour" value={style.textColor} onChange={(value) => updateVisualStyle({ textColor: value })} /></InspectorAccordionSection>
    <InspectorAccordionSection title="Dimensions"><ParagraphLengthSetting key={`${block.id}-margin`} label="Margin" value={style.margin} min={-100} max={200} onChange={(value) => updateVisualStyle({ margin: value })} /></InspectorAccordionSection>
    <AdvancedFieldsInspector block={block} onChange={onChange} fields={{ anchor: true, className: true }} />
  </>;
}

function LayoutInspector({ block, onChange, canSetSticky = false, heading, note }: { block: LayoutBlock; onChange: (block: ContentBlock) => void; canSetSticky?: boolean; heading: string; note: string }) {
  const update = (changes: Partial<LayoutBlock> & { position?: "sticky" }) => onChange({ ...block, ...changes } as ContentBlock);
  return (
    <InspectorAccordionSection title={<>{heading} layout</>}>
      <label>
        <span>Arrangement</span>
        <select value={block.layout} onChange={(event) => update({ layout: event.target.value as LayoutMode })}>
          <option value="stack">Stack</option>
          <option value="row">Row</option>
          <option value="columns">Columns</option>
          <option value="grid">Grid</option>
        </select>
      </label>
      {canSetSticky && block.type === "group" ? (
        <label>
          <span>Position</span>
          <select value={block.position ?? ""} onChange={(event) => update({ position: event.target.value === "sticky" ? "sticky" : undefined })}>
            <option value="">Default</option>
            <option value="sticky">Sticky</option>
          </select>
        </label>
      ) : null}
      <div className="inspector-two-column">
        <label>
          <span>Horizontal alignment</span>
          <select value={block.horizontalAlign ?? ""} onChange={(event) => update({ horizontalAlign: (event.target.value || undefined) as LayoutBlock["horizontalAlign"] })}>
            <option value="">Default</option>
            <option value="left">Left</option>
            <option value="centre">Centre</option>
            <option value="right">Right</option>
            <option value="stretch">Stretch</option>
          </select>
        </label>
        <label>
          <span>Vertical alignment</span>
          <select value={block.verticalAlign ?? ""} onChange={(event) => update({ verticalAlign: (event.target.value || undefined) as LayoutBlock["verticalAlign"] })}>
            <option value="">Default</option>
            <option value="top">Top</option>
            <option value="centre">Centre</option>
            <option value="bottom">Bottom</option>
            <option value="stretch">Stretch</option>
          </select>
        </label>
      </div>
      <div className="inspector-two-column">
        <PresetNumberSetting label="Horizontal gap" value={block.columnGap ?? block.gap} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.gap[0]} max={LAYOUT_VALUE_LIMITS.gap[1]} onChange={(columnGap) => update({ columnGap })} />
        <PresetNumberSetting label="Vertical gap" value={block.rowGap ?? block.gap} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.gap[0]} max={LAYOUT_VALUE_LIMITS.gap[1]} onChange={(rowGap) => update({ rowGap })} />
        <PresetNumberSetting label="Horizontal padding" value={block.paddingX} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.padding[0]} max={LAYOUT_VALUE_LIMITS.padding[1]} onChange={(paddingX) => update({ paddingX })} />
        <PresetNumberSetting label="Vertical padding" value={block.paddingY} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.padding[0]} max={LAYOUT_VALUE_LIMITS.padding[1]} onChange={(paddingY) => update({ paddingY })} />
      </div>
      <label>
        <span>Content width</span>
        <select value={block.contentWidth ?? ""} onChange={(event) => update({ contentWidth: (event.target.value || undefined) as LayoutBlock["contentWidth"] })}>
          <option value="">Default</option>
          <option value="constrained">Constrained</option>
          <option value="full">Full width</option>
        </select>
      </label>
      {block.layout === "columns" ? (
        <label>
          <span>Columns</span>
          <select value={block.columns ?? 2} onChange={(event) => update({ columns: Number(event.target.value) })}>
            {[1, 2, 3, 4, 5, 6].map((count) => <option value={count} key={count}>{count}</option>)}
          </select>
        </label>
      ) : null}
      {block.layout === "grid" ? <>
        <label>
          <span>Max. columns</span>
          <select value={block.columns ?? 3} onChange={(event) => update({ columns: Number(event.target.value) })}>
            {[1, 2, 3, 4, 5, 6].map((count) => <option value={count} key={count}>{count}</option>)}
          </select>
        </label>
        <PresetNumberSetting label="Min. column width" value={block.minColumnWidth ?? 192} presets={[120, 160, 192, 240, 320]} min={LAYOUT_VALUE_LIMITS.minColumnWidth[0]} max={LAYOUT_VALUE_LIMITS.minColumnWidth[1]} onChange={(minColumnWidth) => update({ minColumnWidth })} />
        <p className="setting-note">Columns wrap automatically to fit the available width.</p>
      </> : null}
      <p className="setting-note">{note}</p>
    </InspectorAccordionSection>
  );
}

type ColumnsBlock = Extract<ContentBlock, { type: "columns" }>;

function ColumnsInspector({ block, onChange }: { block: ColumnsBlock; onChange: (block: ContentBlock) => void }) {
  const update = (changes: Partial<ColumnsBlock>) => onChange({ ...block, ...changes });
  const createId = () => `column-${crypto.randomUUID()}`;
  return <InspectorAccordionSection title="Layout">
    <div className="column-layout-presets" role="group" aria-label="Column layout">
      {COLUMN_LAYOUT_PRESETS.map((preset) => <button key={preset.label} type="button" aria-label={preset.label} aria-pressed={block.children.length === preset.widths.length && preset.widths.every((width, index) => Math.abs((block.children[index]?.width ?? 100 / block.children.length) - width) < 1)} onClick={() => onChange(setColumnsLayout(block, preset.widths, createId))}>
        <span aria-hidden="true" className="column-layout-preview">{preset.widths.map((width, index) => <i key={index} style={{ flexGrow: width }} />)}</span><span>{preset.widths.map(width => Math.round(width)).join(" / ")}</span>
      </button>)}
    </div>
    <div className="column-count-controls"><span>Columns</span><div><button type="button" aria-label="Remove column" disabled={block.children.length <= 1} onClick={() => onChange(setColumnCount(block, block.children.length - 1, createId))}>−</button><output aria-live="polite">{block.children.length}</output><button type="button" aria-label="Add column" disabled={block.children.length >= 6} onClick={() => onChange(setColumnCount(block, block.children.length + 1, createId))}>+</button></div></div>
    <div className="inspector-two-column"><label><span>Vertical alignment</span><select value={block.verticalAlign ?? "stretch"} onChange={(event) => update({ verticalAlign: event.target.value as ColumnsBlock["verticalAlign"] })}><option value="top">Top</option><option value="centre">Centre</option><option value="bottom">Bottom</option><option value="stretch">Stretch</option></select></label><PresetNumberSetting label="Horizontal gap" value={block.columnGap ?? block.gap} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.gap[0]} max={LAYOUT_VALUE_LIMITS.gap[1]} onChange={(columnGap) => update({ columnGap })} /><PresetNumberSetting label="Vertical gap" value={block.rowGap ?? block.gap} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.gap[0]} max={LAYOUT_VALUE_LIMITS.gap[1]} onChange={(rowGap) => update({ rowGap })} /></div>
    <label><span>Content width</span><select value={block.contentWidth ?? ""} onChange={(event) => update({ contentWidth: (event.target.value || undefined) as ColumnsBlock["contentWidth"] })}><option value="">Default</option><option value="constrained">Constrained</option><option value="full">Full width</option></select></label>
  </InspectorAccordionSection>;
}

function ColumnInspector({ block, onChange, onWidthChange }: { block: ColumnBlock; onChange: (block: ContentBlock) => void; onWidthChange?: (columnId: string, width: number) => void }) {
  const update = (changes: Partial<ColumnBlock>) => onChange({ ...block, ...changes });
  return <InspectorAccordionSection title="Column settings">
    <label><span>Width (%)</span><input type="number" min="5" max="95" step="1" value={Math.round(block.width ?? 100)} disabled={!onWidthChange} onChange={(event) => { const width = Math.max(5, Math.min(95, Number(event.target.value) || 5)); onWidthChange?.(block.id, width); }} /></label>
    <label><span>Vertical alignment</span><select value={block.verticalAlign ?? ""} onChange={(event) => onChange({ ...block, verticalAlign: (event.target.value || undefined) as ColumnBlock["verticalAlign"] })}><option value="">Use Columns setting</option><option value="top">Top</option><option value="centre">Centre</option><option value="bottom">Bottom</option><option value="stretch">Stretch</option></select></label>
    <PresetNumberSetting label="Block gap" value={block.rowGap ?? block.gap} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.gap[0]} max={LAYOUT_VALUE_LIMITS.gap[1]} onChange={(rowGap) => update({ rowGap })} />
    <p className="setting-note">Add and edit blocks inside this column on the canvas.</p>
  </InspectorAccordionSection>;
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
  return <InspectorAccordionSection title={<>{block.component.replace("mini-golf-", "Mini Golf ")} component</>}><p className="setting-note">This application interface is inactive in Studio. Edit only its supported content properties.</p>{block.source ? <p className="setting-note">Source: {block.source.module} · {block.source.exportName} · {block.source.revision.slice(0, 8)}</p> : null}{fields.map(([key, label]) => <label key={key}><span>{label}</span><input value={typeof data[key] === "string" ? data[key] as string : ""} onChange={(event) => update(key, event.target.value)} /></label>)}</InspectorAccordionSection>;
}

type StyledBlock = ContentBlock;

type InspectorControlDefaults = {
  typography?: readonly string[];
  dimensions?: readonly string[];
  border?: readonly string[];
  elements?: readonly string[];
};

// Core blocks declare these defaults through __experimentalDefaultControls.
// ACM-only metadata blocks keep Studio's existing starting controls.
const gutenbergInspectorDefaults: Partial<Record<ContentBlock["type"], InspectorControlDefaults>> = {
  paragraph: { typography: ["colour", "size"] },
  heading: { typography: ["colour", "size"] },
  quote: { typography: ["colour", "size"], border: ["border", "radius"] },
  list: { typography: ["colour", "size"] },
  table: { typography: ["colour", "size"], border: ["border"] },
  code: { typography: ["colour", "size"], border: ["border"] },
  button: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] },
  footnotes: { typography: ["colour", "size"], elements: ["link-colour"] },
  "document-title": { typography: ["colour", "size"], border: ["border", "radius"], elements: ["link-colour"] },
  "post-date": { typography: ["colour", "size"], border: ["border", "radius"], elements: ["link-colour"] },
  "social-icons": { dimensions: ["margin"], border: ["border", "radius"] },
  group: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] },
  section: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] },
  columns: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] },
  column: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] },
};

const studioInspectorDefaults: InspectorControlDefaults = {
  typography: ["colour", "size", "appearance"],
};

const styleGuidePaletteRoles: { key: keyof UniversalStylePreset["palette"]; label: string }[] = [
  { key: "surface", label: "Surface" },
  { key: "surfaceRaised", label: "Raised surface" },
  { key: "surfaceSubtle", label: "Subtle surface" },
  { key: "textPrimary", label: "Primary text" },
  { key: "textSecondary", label: "Secondary text" },
  { key: "border", label: "Border" },
  { key: "accent", label: "Accent" },
  { key: "onAccent", label: "Text on accent" },
  { key: "success", label: "Success" },
  { key: "information", label: "Information" },
  { key: "alert", label: "Alert" },
  { key: "warning", label: "Warning" },
  { key: "rating", label: "Rating" },
];

function hasLegacyStyle(block: ContentBlock): block is Extract<ContentBlock, { type: "paragraph" | "columns" | "column" }> {
  return block.type === "paragraph" || block.type === "columns" || block.type === "column";
}

function ParagraphInspector({ block, onChange, fontSizeViewMode, onFontSizeViewModeChange }: { block: StyledBlock; onChange: (block: ContentBlock) => void; fontSizeViewMode: "presets" | "custom" | null; onFontSizeViewModeChange: (mode: "presets" | "custom") => void }) {
  const style = hasLegacyStyle(block) ? block.style ?? {} : block.visualStyle ?? {};
  const socialIconsOnly = block.type === "social-icons";
  const defaults = gutenbergInspectorDefaults[block.type] ?? studioInspectorDefaults;
  const defaultTypography = new Set(defaults.typography ?? []);
  const defaultDimensions = new Set(defaults.dimensions ?? []);
  const defaultBorder = new Set(defaults.border ?? []);
  const defaultElements = new Set(defaults.elements ?? []);
  const [backgroundMode, setBackgroundMode] = useState<"colour" | "gradient">(style.backgroundGradient ? "gradient" : "colour");
  const fontSizeMode = fontSizeViewMode
    ? fontSizeViewMode
    : style.fontSizeCustom ? "custom" : "presets";
  const activeBackgroundMode = style.backgroundGradient ? "gradient" : backgroundMode;
  const typographyOptions: InspectorToolOption[] = socialIconsOnly ? [
    { id: "colour", label: "Colour" }, { id: "size", label: "Size" },
  ] : [
    { id: "colour", label: "Colour" }, { id: "size", label: "Size" },
    { id: "family", label: "Font family" }, { id: "appearance", label: "Appearance" },
    { id: "line-height", label: "Line height" }, { id: "letter-spacing", label: "Letter spacing" },
    ...(block.type === "paragraph" ? [{ id: "line-indent", label: "Line indent" }] : []),
    ...(block.type === "paragraph" || block.type === "group" ? [{ id: "columns", label: "Columns" }] : []),
    { id: "decoration", label: "Decoration" },
    ...(["paragraph", "heading", "button", "footnotes"].includes(block.type) ? [{ id: "orientation", label: "Orientation" }] : []),
    { id: "letter-case", label: "Letter case" },
    ...(block.type === "paragraph" ? [{ id: "drop-cap", label: "Drop cap" }] : []),
    ...(block.type === "paragraph" || block.type === "heading" ? [{ id: "fit-text", label: "Fit text" }] : []),
    ...(block.type === "paragraph" || block.type === "heading" ? [{ id: "text-shadow", label: "Text shadow" }] : []),
  ];
  const dimensionOptions: InspectorToolOption[] = [
    { id: "padding", label: "Padding" },
    ...(!["button", "column"].includes(block.type) ? [{ id: "margin", label: "Margin" }] : []),
    ...(["quote", "group", "section"].includes(block.type) || style.minHeight ? [{ id: "min-height", label: "Minimum height" }] : []),
    ...(["group", "section"].includes(block.type) || style.minWidth ? [{ id: "min-width", label: "Minimum width" }] : []),
  ];
  const coreBlocksWithShadow = ["heading", "quote", "button", "group", "section", "columns", "column", "image", "cover-image", "document-title"];
  const borderOptions: InspectorToolOption[] = [{ id: "border", label: "Border" }, ...(block.type !== "table" ? [{ id: "radius", label: "Radius" }, ...((coreBlocksWithShadow.includes(block.type) || style.shadow) ? [{ id: "shadow", label: "Shadow" }] : [])] : [])];
  const elementOptions: InspectorToolOption[] = ["paragraph", "heading", "quote", "list", "footnotes", "group", "columns", "column", "document-title", "post-author", "post-date"].includes(block.type) ? [{ id: "link-colour", label: "Link colour" }] : [];
  const marginLayout = ["code", "group", "columns"].includes(block.type) ? "vertical" as const : "axes" as const;
  const [typographyUserVisible, setTypographyVisible] = useState(() => new Set<string>());
  const [dimensionsUserVisible, setDimensionsVisible] = useState(() => new Set<string>());
  const [borderUserVisible, setBorderVisible] = useState(() => new Set<string>());
  const [elementsUserVisible, setElementsVisible] = useState(() => new Set<string>());
  const typographyVisible = new Set([...defaultTypography, ...typographyUserVisible, ...[
    style.textColor && "colour", (style.fontSize || style.fontSizeCustom) && "size", style.appearance && "appearance", style.fontFamily && "family", style.textShadow && "text-shadow",
    style.lineHeight && "line-height", style.letterSpacing && "letter-spacing", style.textIndent && "line-indent",
    style.textColumns && "columns", style.textDecoration && "decoration", style.textTransform && "letter-case", style.dropCap && "drop-cap", style.fitText && "fit-text", style.orientation && "orientation",
  ].filter((value): value is string => Boolean(value))]);
  const dimensionsVisible = new Set([...defaultDimensions, ...dimensionsUserVisible, ...[style.padding && "padding", style.margin && "margin", style.minHeight && "min-height", style.minWidth && "min-width"].filter((value): value is string => Boolean(value))]);
  const borderVisible = new Set([...defaultBorder, ...borderUserVisible, ...[
    (style.borderStyle || style.borderColor || style.borderWidth) && "border", style.borderRadius && "radius", style.shadow && "shadow",
  ].filter((value): value is string => Boolean(value))]);
  const elementsVisible = new Set([...defaultElements, ...elementsUserVisible, ...[style.linkColor && "link-colour"].filter((value): value is string => Boolean(value))]);
  const optionalTypographyOptions = typographyOptions.filter(option => !defaultTypography.has(option.id));
  const optionalDimensionOptions = dimensionOptions.filter(option => !defaultDimensions.has(option.id));
  const optionalBorderOptions = borderOptions.filter(option => !defaultBorder.has(option.id));
  const optionalElementOptions = elementOptions.filter(option => !defaultElements.has(option.id));
  const toolFields: Record<string, (keyof ParagraphStyle)[]> = {
    colour: ["textColor"], family: ["fontFamily"], size: ["fontSize", "fontSizeCustom"], appearance: ["appearance"], "text-shadow": ["textShadow"],
    "line-height": ["lineHeight"], "letter-spacing": ["letterSpacing"], "line-indent": ["textIndent"], columns: ["textColumns"], decoration: ["textDecoration"],
    "letter-case": ["textTransform"], padding: ["padding"], margin: ["margin"], "min-height": ["minHeight"], "min-width": ["minWidth"],
    "drop-cap": ["dropCap"], "fit-text": ["fitText"], orientation: ["orientation"],
    border: ["borderColor", "borderStyle", "borderWidth"], radius: ["borderRadius"], shadow: ["shadow"],
    "link-colour": ["linkColor"],
  };
  function writeStyle(nextStyle: ParagraphStyle) {
    const updatedStyle = Object.keys(nextStyle).length ? nextStyle : undefined;
    onChange(hasLegacyStyle(block) ? { ...block, style: updatedStyle } : { ...block, visualStyle: updatedStyle });
  }
  function clearTools(ids: Iterable<string>) {
    const nextStyle = { ...style };
    for (const id of ids) for (const field of toolFields[id] ?? []) delete nextStyle[field];
    writeStyle(nextStyle);
  }
  function toggleTool(id: string, visible: Set<string>, setVisible: (value: Set<string>) => void) {
    const next = new Set(visible);
    if (next.has(id)) { next.delete(id); clearTools([id]); }
    else next.add(id);
    setVisible(next);
  }
  function updateStyle<K extends keyof ParagraphStyle>(field: K, value: ParagraphStyle[K] | undefined) {
    const nextStyle = { ...style };
    if (value === undefined || value === "") delete nextStyle[field];
    else nextStyle[field] = value;
    writeStyle(nextStyle);
  }
  function updateFitText(enabled: boolean) {
    const nextStyle = { ...style };
    if (enabled) nextStyle.fitText = true;
    else delete nextStyle.fitText;
    writeStyle(nextStyle);
  }
  function updateFontSize(value: ParagraphFontSize | string | undefined, mode: "presets" | "custom") {
    onFontSizeViewModeChange(mode);
    const nextStyle = { ...style };
    delete nextStyle.fontSize;
    delete nextStyle.fontSizeCustom;
    if (value) {
      if (mode === "custom") nextStyle.fontSizeCustom = value;
      else nextStyle.fontSize = value as ParagraphFontSize;
    }
    writeStyle(nextStyle);
  }
  function updateBackground(backgroundColor: string | undefined, backgroundGradient: ParagraphBackgroundGradient | undefined) {
    const nextStyle = { ...style };
    if (backgroundColor) nextStyle.backgroundColor = backgroundColor;
    else delete nextStyle.backgroundColor;
    if (backgroundGradient) nextStyle.backgroundGradient = backgroundGradient;
    else delete nextStyle.backgroundGradient;
    writeStyle(nextStyle);
  }
  function updateBorderWidth(value: string | undefined) {
    const nextStyle = { ...style };
    if (value) {
      nextStyle.borderWidth = value;
      if (!nextStyle.borderStyle || nextStyle.borderStyle === "none") nextStyle.borderStyle = "solid";
    } else delete nextStyle.borderWidth;
    writeStyle(nextStyle);
  }
  function updateBorderColour(value: string | undefined) {
    const nextStyle = { ...style };
    if (value) {
      nextStyle.borderColor = value;
      if (!nextStyle.borderStyle || nextStyle.borderStyle === "none") nextStyle.borderStyle = "solid";
    } else delete nextStyle.borderColor;
    writeStyle(nextStyle);
  }
  const fontSizes: { value: ParagraphFontSize; label: string; accessibleName: string }[] = [
    { value: "small", label: "S", accessibleName: "Small" },
    { value: "medium", label: "M", accessibleName: "Medium" },
    { value: "large", label: "L", accessibleName: "Large" },
    { value: "x-large", label: "XL", accessibleName: "Extra large" },
    { value: "xx-large", label: "XXL", accessibleName: "Extra extra large" },
  ];
  const appearanceWeights = [
    ["thin", "Thin"], ["extra-light", "Extra light"], ["light", "Light"], ["regular", "Regular"],
    ["medium", "Medium"], ["semi-bold", "Semi bold"], ["bold", "Bold"],
    ["extra-bold", "Extra bold"], ["black", "Black"],
  ] as const;
  return <>
    <InspectorToolsSection title="Typography" options={optionalTypographyOptions} visible={typographyVisible} onToggle={id => toggleTool(id, typographyVisible, setTypographyVisible)} onReset={() => { clearTools(typographyVisible); setTypographyVisible(new Set()); }}>
      {typographyVisible.has("colour") ? <PaletteColourSetting label="Text colour" value={style.textColor} onChange={(value) => updateStyle("textColor", value)} /> : null}
      {typographyVisible.has("size") ? <fieldset className="paragraph-font-size-setting" disabled={fitTextEnabled(style)}><legend className="visually-hidden">Font size</legend><div className="paragraph-font-size-heading"><span>Font size</span><button type="button" className="paragraph-font-size-mode" aria-label={fontSizeMode === "custom" ? "Use font size presets" : "Use custom font size"} title={fontSizeMode === "custom" ? "Use font size presets" : "Use custom font size"} aria-pressed={fontSizeMode === "custom"} onClick={() => onFontSizeViewModeChange(fontSizeMode === "custom" ? "presets" : "custom")}><AcmIcon name="action.adjust" scale="Regular-M" size={20} /></button></div>{fontSizeMode === "custom" ? <CustomFontSizeSetting key={`${block.id}-custom-size`} value={style.fontSizeCustom} onChange={value => updateFontSize(value, "custom")} /> : <div role="group" aria-label="Font size presets" className="paragraph-font-size-options">{fontSizes.map(({ value, label, accessibleName }) => <button key={value} type="button" aria-label={accessibleName} aria-pressed={style.fontSize === value} className={style.fontSize === value ? "is-active" : ""} onClick={() => updateFontSize(style.fontSize === value ? undefined : value, "presets")}>{label}</button>)}</div>}</fieldset> : null}
      {typographyVisible.has("family") ? <label><span>Font family</span><select value={style.fontFamily ?? ""} onChange={(event) => updateStyle("fontFamily", (event.target.value || undefined) as ParagraphStyle["fontFamily"])}><option value="">Default</option><option value="inter">Inter</option><option value="helvetica-neue">Helvetica Neue</option><option value="helvetica">Helvetica</option><option value="arial">Arial</option></select></label> : null}
      {typographyVisible.has("appearance") ? <label><span>Appearance</span><select value={style.appearance ?? ""} onChange={(event) => updateStyle("appearance", (event.target.value || undefined) as ParagraphAppearance | undefined)}><option value="">Default</option>{appearanceWeights.map(([value, label]) => <option key={value} value={value}>{label}</option>)}{appearanceWeights.map(([value, label]) => <option key={`${value}-italic`} value={value === "regular" ? "italic" : `${value}-italic`}>{label} italic</option>)}</select></label> : null}
      {typographyVisible.has("line-height") ? <label><span>Line height</span><input value={style.lineHeight ?? ""} onChange={(event) => updateStyle("lineHeight", event.target.value)} placeholder="1.5" inputMode="decimal" /></label> : null}
      {typographyVisible.has("letter-spacing") ? <label><span>Letter spacing</span><input value={style.letterSpacing ?? ""} onChange={(event) => updateStyle("letterSpacing", event.target.value)} placeholder="0" /></label> : null}
      {typographyVisible.has("line-indent") ? <ParagraphLengthSetting key={`${block.id}-indent`} label="Line indent" value={style.textIndent} min={-100} max={200} onChange={(value) => updateStyle("textIndent", value)} /> : null}
      {typographyVisible.has("columns") ? <label><span>Columns</span><select value={style.textColumns ?? ""} onChange={(event) => updateStyle("textColumns", event.target.value ? Number(event.target.value) : undefined)}><option value="">Default</option>{[1, 2, 3, 4].map(count => <option key={count} value={count}>{count}</option>)}</select></label> : null}
      {typographyVisible.has("decoration") ? <label><span>Decoration</span><select value={style.textDecoration ?? ""} onChange={(event) => updateStyle("textDecoration", (event.target.value || undefined) as ParagraphStyle["textDecoration"])}><option value="">Default</option><option value="none">None</option><option value="underline">Underline</option><option value="line-through">Strikethrough</option></select></label> : null}
      {typographyVisible.has("orientation") ? <label><span>Orientation</span><select value={style.orientation ?? ""} onChange={event => updateStyle("orientation", (event.target.value || undefined) as ParagraphStyle["orientation"])}><option value="">Default</option><option value="horizontal-tb">Horizontal</option><option value="vertical-rl">Vertical</option></select></label> : null}
      {typographyVisible.has("letter-case") ? <label><span>Letter case</span><select value={style.textTransform ?? ""} onChange={(event) => updateStyle("textTransform", (event.target.value || undefined) as ParagraphStyle["textTransform"])}><option value="">Default</option><option value="none">Normal</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option><option value="capitalize">Capitalise</option></select></label> : null}
      {typographyVisible.has("drop-cap") ? <label className="checkbox-setting"><input type="checkbox" checked={Boolean(style.dropCap)} onChange={event => updateStyle("dropCap", event.target.checked || undefined)} /><span>Drop cap</span></label> : null}
      {typographyVisible.has("fit-text") ? <label className="checkbox-setting"><input type="checkbox" checked={Boolean(style.fitText)} onChange={event => updateFitText(event.target.checked)} /><span>Fit text{style.fitText && style.orientation === "vertical-rl" ? " (paused for vertical text)" : ""}</span></label> : null}
      {typographyVisible.has("text-shadow") ? <label><span>Text shadow</span><select value={style.textShadow ?? ""} onChange={event => updateStyle("textShadow", (event.target.value || undefined) as ParagraphStyle["textShadow"])}><option value="">Default</option><option value="none">None</option><option value="soft">Soft</option><option value="strong">Strong</option></select></label> : null}
    </InspectorToolsSection>
    <InspectorAccordionSection className="inspector-panel" title="Background">
      <ParagraphBackgroundControl mode={activeBackgroundMode} colour={style.backgroundColor} gradient={style.backgroundGradient} onModeChange={mode => { setBackgroundMode(mode); if (mode === "colour" && style.backgroundGradient) updateBackground(style.backgroundColor, undefined); }} onColourChange={value => updateBackground(value, undefined)} onGradientChange={value => updateBackground(undefined, value)} />
      {style.backgroundGradient ? <button type="button" className="paragraph-reset-button" onClick={() => { updateBackground(style.backgroundColor, undefined); setBackgroundMode("colour"); }}>Reset background</button> : null}
    </InspectorAccordionSection>
    <InspectorToolsSection title="Dimensions" options={optionalDimensionOptions} visible={dimensionsVisible} onToggle={id => toggleTool(id, dimensionsVisible, setDimensionsVisible)} onReset={() => { clearTools(dimensionsVisible); setDimensionsVisible(new Set()); }}>
      {dimensionsVisible.has("padding") ? <BoxLengthSetting key={`${block.id}-padding`} label="Padding" value={style.padding} layout="axes" min={0} max={100} onChange={(value) => updateStyle("padding", value)} /> : null}
      {dimensionsVisible.has("margin") ? <BoxLengthSetting key={`${block.id}-margin`} label="Margin" value={style.margin} layout={marginLayout} min={-100} max={200} onChange={(value) => updateStyle("margin", value)} /> : null}
      {dimensionsVisible.has("min-height") ? <ParagraphLengthSetting key={`${block.id}-min-height`} label="Minimum height" value={style.minHeight} min={0} max={4000} onChange={(value) => updateStyle("minHeight", value)} /> : null}
      {dimensionsVisible.has("min-width") ? <ParagraphLengthSetting key={`${block.id}-min-width`} label="Minimum width" value={style.minWidth} min={0} max={4000} onChange={(value) => updateStyle("minWidth", value)} /> : null}
    </InspectorToolsSection>
    <InspectorToolsSection title="Border" options={optionalBorderOptions} visible={borderVisible} canReset={Boolean(borderVisible.size || style.shadow)} onToggle={id => toggleTool(id, borderVisible, setBorderVisible)} onReset={() => { clearTools([...borderVisible, "shadow"]); setBorderVisible(new Set()); }}>
      {borderVisible.has("border") ? <div className="box-border-setting"><div className="box-border-appearance"><BorderColourControl value={style.borderColor} onChange={updateBorderColour} /><label><span>Border style</span><select value={style.borderStyle ?? "none"} onChange={(event) => updateStyle("borderStyle", event.target.value as ParagraphBorderStyle)}><option value="none">None</option><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></label></div><BoxLengthSetting key={`${block.id}-border-width`} label="Width" value={style.borderWidth ?? (style.borderStyle && style.borderStyle !== "none" ? "1px" : undefined)} canReset={Boolean(style.borderWidth)} layout="all" allowPercent={false} min={0} max={20} onChange={updateBorderWidth} /></div> : null}
      {borderVisible.has("radius") ? <BoxLengthSetting key={`${block.id}-radius`} label="Radius" value={style.borderRadius} layout="all" corners min={0} max={100} onChange={value => updateStyle("borderRadius", value)} /> : null}
      {borderVisible.has("shadow") ? <label><span>Shadow</span><select value={style.shadow ?? ""} onChange={(event) => updateStyle("shadow", (event.target.value || undefined) as ParagraphStyle["shadow"])}><option value="">Default</option><option value="none">None</option><option value="soft">Soft</option><option value="strong">Strong</option></select></label> : null}
    </InspectorToolsSection>
    {elementOptions.length ? <InspectorToolsSection title="Elements" options={optionalElementOptions} visible={elementsVisible} onToggle={id => toggleTool(id, elementsVisible, setElementsVisible)} onReset={() => { clearTools(elementsVisible); setElementsVisible(new Set()); }}>
      {elementsVisible.has("link-colour") ? <ColourSetting label="Link colour" value={style.linkColor} onChange={(value) => updateStyle("linkColor", value)} /> : null}
    </InspectorToolsSection> : null}
  </>;
}

function CustomFontSizeSetting({ value, onChange }: { value?: string; onChange: (value: string | undefined) => void }) {
  const units: CustomFontSizeUnit[] = ["px", "em", "rem", "vw", "vh"];
  const match = value?.match(/^(\d+(?:\.\d+)?)(px|em|rem|vw|vh)$/);
  const [unit, setUnit] = useState<CustomFontSizeUnit>((match?.[2] as CustomFontSizeUnit) ?? "px");
  const [draft, setDraft] = useState<string | null>(null);
  const [sliderDraft, setSliderDraft] = useState<string | null>(null);
  const sliderDraftRef = useRef<string | null>(null);
  const sliderDraggingRef = useRef(false);
  const sliderPointerIdRef = useRef<number | null>(null);
  const sliderStartValueRef = useRef<string | null>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const finishSliderDragRef = useRef<(pointerId?: number) => void>(() => {});
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const unitMenuId = useId();
  const unitTriggerRef = useRef<HTMLButtonElement>(null);
  const unitMenuRef = useRef<HTMLDivElement>(null);
  const displayedValue = draft ?? match?.[1] ?? "";
  const relativeUnit = unit !== "px";
  const sliderMinimum = relativeUnit ? 0.1 : 1;
  const sliderMaximum = customFontSizeMaximum(unit);
  const sliderDisplayedValue = sliderDraft ?? displayedValue;
  const numericValue = Number(sliderDisplayedValue);
  const sliderValue = sliderDisplayedValue && Number.isFinite(numericValue) ? Math.max(sliderMinimum, Math.min(numericValue, sliderMaximum)) : relativeUnit ? 1 : 16;
  function startSliderDrag(pointerId: number, value: string) {
    if (sliderDraggingRef.current) return;
    // The range only renders in custom mode. Avoid a parent state update here,
    // which can interrupt the browser's native range drag as it starts.
    sliderDraggingRef.current = true;
    sliderPointerIdRef.current = pointerId;
    sliderStartValueRef.current = value;
    sliderDraftRef.current = null;
  }
  function commit(next: string, nextUnit = unit) {
    setDraft(null);
    if (!next.trim()) { onChange(undefined); return; }
    const normalised = normaliseCustomFontSize(Number(next), nextUnit);
    if (normalised) onChange(normalised);
  }
  function finishSliderDrag(input = sliderRef.current, pointerId?: number) {
    if (!input) return;
    if (!sliderDraggingRef.current) return;
    if (pointerId !== undefined && sliderPointerIdRef.current !== pointerId) return;
    const nextValue = sliderDraftRef.current ?? input.value;
    const changed = nextValue !== sliderStartValueRef.current;
    sliderDraggingRef.current = false;
    sliderPointerIdRef.current = null;
    sliderStartValueRef.current = null;
    sliderDraftRef.current = null;
    setSliderDraft(null);
    if (changed) commit(nextValue);
  }
  useLayoutEffect(() => {
    finishSliderDragRef.current = (pointerId) => finishSliderDrag(sliderRef.current, pointerId);
  });
  useEffect(() => {
    const finishPointerInteraction = (event: PointerEvent) => finishSliderDragRef.current(event.pointerId);
    window.addEventListener("pointerup", finishPointerInteraction);
    window.addEventListener("pointercancel", finishPointerInteraction);
    return () => {
      window.removeEventListener("pointerup", finishPointerInteraction);
      window.removeEventListener("pointercancel", finishPointerInteraction);
    };
  }, []);
  useEffect(() => {
    if (unitMenuOpen) unitMenuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  }, [unitMenuOpen]);
  function closeUnitMenu(restoreFocus = false) {
    setUnitMenuOpen(false);
    if (restoreFocus) requestAnimationFrame(() => unitTriggerRef.current?.focus());
  }
  function selectUnit(nextUnit: CustomFontSizeUnit) {
    setUnit(nextUnit);
    if (displayedValue) commit(displayedValue, nextUnit);
    closeUnitMenu(true);
  }
  return <div className="paragraph-custom-font-size"><div className="paragraph-custom-font-size-input" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeUnitMenu(); }}><input aria-label="Custom font size" type="number" min={sliderMinimum} max={sliderMaximum} step={relativeUnit ? "0.1" : "1"} value={displayedValue} onChange={event => setDraft(event.target.value)} onBlur={() => { if (draft !== null) commit(draft); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /><button ref={unitTriggerRef} className="paragraph-custom-font-size-unit" type="button" aria-label={`Custom font size unit: ${unit}`} aria-haspopup="menu" aria-expanded={unitMenuOpen} aria-controls={unitMenuId} onClick={() => setUnitMenuOpen(open => !open)}>{unit}</button>{unitMenuOpen ? <div ref={unitMenuRef} id={unitMenuId} className="paragraph-custom-font-size-unit-menu" role="menu" tabIndex={-1} aria-label="Custom font size unit" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeUnitMenu(true); return; }
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
    const activeIndex = items.indexOf(event.target as HTMLButtonElement);
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown") nextIndex = (activeIndex + 1) % items.length;
    else if (event.key === "ArrowUp") nextIndex = (activeIndex - 1 + items.length) % items.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    if (nextIndex !== null && items.length) { event.preventDefault(); items[nextIndex]?.focus(); }
  }}>{units.map(option => <button className={option === unit ? "is-active" : ""} type="button" role="menuitemradio" aria-checked={option === unit} key={option} onClick={() => selectUnit(option)}><span className="paragraph-custom-font-size-unit-check">{option === unit ? <AcmIcon name="state.selected" scale="Regular-S" size={16} /> : null}</span><span>{option}</span></button>)}</div> : null}</div><input ref={sliderRef} className="paragraph-custom-font-size-slider" aria-label="Custom font size slider" type="range" min={sliderMinimum} max={sliderMaximum} step={relativeUnit ? "0.1" : "1"} value={sliderValue} onPointerDown={event => startSliderDrag(event.pointerId, event.currentTarget.value)} onPointerUp={event => finishSliderDrag(event.currentTarget, event.pointerId)} onPointerCancel={event => finishSliderDrag(event.currentTarget, event.pointerId)} onLostPointerCapture={event => finishSliderDrag(event.currentTarget, event.pointerId)} onBlur={event => finishSliderDrag(event.currentTarget)} onChange={event => { if (sliderDraggingRef.current) { sliderDraftRef.current = event.currentTarget.value; setSliderDraft(event.currentTarget.value); } else commit(event.currentTarget.value); }} /></div>;
}

function ParagraphLengthSetting({ label, value, min, max, onChange }: { label: string; value?: string; min: number; max: number; onChange: (value: string | undefined) => void }) {
  const match = value?.match(/^(-?\d+(?:\.\d+)?)(px|rem|em|%|ch|vw|vh)?$/);
  const number = match ? Number(match[1]) : 0;
  const unit = match?.[2] ?? "px";
  const [draft, setDraft] = useState<string | null>(null);
  const displayedDraft = draft ?? (match ? match[1] : "");
  const units = ["px", "rem", "em", "%", "ch", "vw", "vh"];
  function setNumber(next: number) {
    if (!Number.isFinite(next)) return;
    const bounded = Math.max(min, Math.min(max, next));
    setDraft(null);
    onChange(bounded === 0 && !value ? undefined : `${bounded}${unit}`);
  }
  function commitDraft() {
    if (draft === null) return;
    if (draft.trim() === "") {
      setDraft(null);
      onChange(undefined);
      return;
    }
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) setNumber(parsed);
    else setDraft(null);
  }
  const rangeMin = Math.min(min, number);
  const rangeMax = Math.max(max, number);
  return <div className="paragraph-length-setting"><span>{label}</span><div className="paragraph-length-controls"><input aria-label={`${label} amount`} type="range" min={rangeMin} max={rangeMax} step="0.1" value={number} onChange={(event) => setNumber(Number(event.target.value))} /><input aria-label={`${label} value`} type="number" min={min} max={max} step="0.1" value={displayedDraft} placeholder="0" onChange={(event) => setDraft(event.target.value)} onBlur={commitDraft} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /><select aria-label={`${label} unit`} value={unit} onChange={(event) => { const nextUnit = event.target.value; if (match) onChange(`${number}${nextUnit}`); }} disabled={!match}>{units.map((option) => <option key={option} value={option}>{option}</option>)}</select><button type="button" className="paragraph-reset-button" onClick={() => { setDraft(null); onChange(undefined); }} disabled={!value}>Reset</button></div></div>;
}

function ColourSetting({ label, value, onChange }: { label: string; value?: string; onChange: (value: string | undefined) => void }) {
  return <div className="inspector-colour-setting"><span>{label}</span><div><label className="inspector-colour-control"><span aria-hidden="true" style={value ? { backgroundColor: value } : undefined} /> <input aria-label={label} type="color" value={value ?? "#1e1e1e"} onChange={(event) => onChange(event.target.value)} /></label><button type="button" onClick={() => onChange(undefined)} disabled={!value}>Reset</button></div></div>;
}

function PaletteColourSetting({ label, value, onChange }: { label: string; value?: string; onChange: (value: string | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const settingRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const paletteId = useId();
  const [palettePosition, setPalettePosition] = useState({ left: 16, top: 16, width: 280 });

  useLayoutEffect(() => {
    if (!open) return;
    function positionPalette() {
      const trigger = triggerRef.current;
      const palette = paletteRef.current;
      if (!trigger || !palette) return;
      const triggerRect = trigger.getBoundingClientRect();
      const inspectorLeft = trigger.closest(".studio-inspector")?.getBoundingClientRect().left ?? triggerRect.left;
      const width = Math.min(280, window.innerWidth - 32);
      setPalettePosition({
        left: Math.max(16, inspectorLeft - width - 12),
        top: Math.max(16, Math.min(triggerRect.top, window.innerHeight - palette.getBoundingClientRect().height - 16)),
        width,
      });
    }
    positionPalette();
    window.addEventListener("resize", positionPalette);
    window.addEventListener("scroll", positionPalette, true);
    return () => {
      window.removeEventListener("resize", positionPalette);
      window.removeEventListener("scroll", positionPalette, true);
    };
  }, [open]);

  function closePalette() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    };
    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && !settingRef.current?.contains(event.target) && !paletteRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  return <div ref={settingRef} className="inspector-colour-setting paragraph-palette-setting">
    <span>{label}</span>
    <div className="paragraph-palette-actions">
      <button ref={triggerRef} type="button" className={`paragraph-palette-trigger${value ? " has-colour" : ""}`} aria-label={`Choose ${label}`} aria-expanded={open} aria-controls={paletteId} onClick={() => setOpen(current => !current)}>
        <span aria-hidden="true" style={value ? { backgroundColor: value } : undefined} />
      </button>
      <button type="button" onClick={() => onChange(undefined)} disabled={!value}>Reset</button>
    </div>
    {open ? createPortal(<div ref={paletteRef} id={paletteId} className="paragraph-colour-palette" role="group" aria-label="Style Guide colour palette" style={palettePosition}>
      <div className="paragraph-colour-palette-heading"><strong>{label}</strong><button type="button" aria-label={`Close ${label} palette`} title="Close" onClick={closePalette}><StudioIcon name="close" size={16} /></button></div>
      <StyleGuideColourSwatches value={value} onChange={onChange} />
      <label className="paragraph-custom-colour"><span>Custom colour</span><input aria-label="Custom text colour" type="color" value={value ?? UNIVERSAL_STYLE_PRESET.palette.textPrimary} onChange={event => onChange(event.target.value)} /></label>
    </div>, document.body) : null}
  </div>;
}

function StyleGuideColourSwatches({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
  return <div className="paragraph-colour-swatches">
    {styleGuidePaletteRoles.map(({ key, label }) => {
      const colour = UNIVERSAL_STYLE_PRESET.palette[key];
      const selected = value?.toLowerCase() === colour.toLowerCase();
      return <button key={key} type="button" className="paragraph-colour-swatch" aria-label={`${label}, ${colour}`} aria-pressed={selected} title={`${label} — ${colour}`} onClick={() => onChange(colour)}>
        <span aria-hidden="true" style={{ backgroundColor: colour }} />
      </button>;
    })}
  </div>;
}

function ParagraphBackgroundControl({ mode, colour, gradient, onModeChange, onColourChange, onGradientChange }: {
  mode: "colour" | "gradient";
  colour?: string;
  gradient?: ParagraphBackgroundGradient;
  onModeChange: (mode: "colour" | "gradient") => void;
  onColourChange: (value: string | undefined) => void;
  onGradientChange: (value: ParagraphBackgroundGradient) => void;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const colourTriggerRef = useRef<HTMLButtonElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const [palettePosition, setPalettePosition] = useState({ left: 16, top: 16, width: 280 });

  useLayoutEffect(() => {
    if (!paletteOpen) return;
    function positionPalette() {
      const trigger = colourTriggerRef.current;
      const palette = paletteRef.current;
      if (!trigger || !palette) return;
      const triggerRect = trigger.getBoundingClientRect();
      const inspectorLeft = trigger.closest(".studio-inspector")?.getBoundingClientRect().left ?? triggerRect.left;
      const width = Math.min(280, window.innerWidth - 32);
      setPalettePosition({
        left: Math.max(16, inspectorLeft - width - 12),
        top: Math.max(16, Math.min(triggerRect.top, window.innerHeight - palette.getBoundingClientRect().height - 16)),
        width,
      });
    }
    positionPalette();
    window.addEventListener("resize", positionPalette);
    window.addEventListener("scroll", positionPalette, true);
    return () => {
      window.removeEventListener("resize", positionPalette);
      window.removeEventListener("scroll", positionPalette, true);
    };
  }, [paletteOpen]);

  function closePalette() {
    setPaletteOpen(false);
    requestAnimationFrame(() => colourTriggerRef.current?.focus());
  }

  useEffect(() => {
    if (!paletteOpen) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setPaletteOpen(false);
      requestAnimationFrame(() => colourTriggerRef.current?.focus());
    };
    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target) && !paletteRef.current?.contains(event.target)) setPaletteOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [paletteOpen]);

  const selectColourMode = () => {
    if (mode !== "colour") onModeChange("colour");
    setPaletteOpen(current => mode === "colour" ? !current : true);
  };
  const selectGradientMode = () => {
    onModeChange("gradient");
    setPaletteOpen(false);
  };

  return <div ref={rootRef} className="paragraph-background-control">
    <div className="paragraph-background-modes" role="group" aria-label="Background type">
      <button ref={colourTriggerRef} type="button" aria-pressed={mode === "colour"} aria-expanded={paletteOpen} aria-controls={paletteId} className={mode === "colour" ? "is-active" : ""} onClick={selectColourMode}>
        <span className={`paragraph-background-mode-swatch${colour ? " has-colour" : ""}`} aria-hidden="true" style={colour ? { backgroundColor: colour } : undefined} />Colour
      </button>
      <button type="button" aria-pressed={mode === "gradient"} className={mode === "gradient" ? "is-active" : ""} onClick={selectGradientMode}>
        <span className={`paragraph-background-mode-swatch${gradient ? " has-gradient" : ""}`} aria-hidden="true" style={gradient ? { backgroundImage: paragraphBackgroundGradientCss(gradient) } : undefined} />Gradient
      </button>
    </div>
    {paletteOpen ? createPortal(<div ref={paletteRef} id={paletteId} className="paragraph-colour-palette" role="group" aria-label="Style Guide background colour palette" style={palettePosition}>
      <div className="paragraph-colour-palette-heading"><strong>Background colour</strong><button type="button" aria-label="Close Background colour palette" title="Close" onClick={closePalette}><StudioIcon name="close" size={16} /></button></div>
      <StyleGuideColourSwatches value={colour} onChange={value => onColourChange(value)} />
      <label className="paragraph-custom-colour"><span>Custom colour</span><input aria-label="Custom background colour" type="color" value={colour ?? UNIVERSAL_STYLE_PRESET.palette.surface} onChange={event => onColourChange(event.target.value)} /></label>
      <button type="button" className="paragraph-reset-button" disabled={!colour} onClick={() => onColourChange(undefined)}>Clear background colour</button>
    </div>, document.body) : null}
    {mode === "gradient" ? <div className="paragraph-gradient-options" role="group" aria-label="Background gradient">{(Object.entries(PARAGRAPH_BACKGROUND_GRADIENTS) as [ParagraphBackgroundGradient, string][]).map(([name]) => <button key={name} type="button" aria-label={`${name} gradient`} aria-pressed={gradient === name} className={gradient === name ? "is-active" : ""} style={{ backgroundImage: paragraphBackgroundGradientCss(name) }} onClick={() => onGradientChange(name)} />)}</div> : null}
  </div>;
}
