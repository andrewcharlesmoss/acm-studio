"use client";

import { AdvancedFieldsControl, type AdvancedFields } from "./controls/advanced-fields-control";

import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { watchInspectorPopover } from "./panes/inspector-popover-position";
import { createPortal } from "react-dom";
import { AcmIcon } from "@acm/icons/react";
import { GROUP_ALLOWED_BLOCK_TYPES } from "../content/model";
import type { ButtonInteractionState, ButtonWidth, ColumnBlock, ContentBlock, DocumentDisplayField, GroupAllowedBlockType, GroupLayoutOptions, DocumentTitleLevel, ListItemSelection, ParagraphBackgroundGradient, ParagraphFontSize, ParagraphStyle, PostDateFormat, SiteSectionRole, SpacerUnit, TextAlignment } from "../content/model";
import { paragraphLinkColourHasPoorContrast } from "../content/paragraph-styles";
import { formatDocumentDate } from "../content/document-metadata";
import { contentWordCount, readingTimeMinutes } from "../content/reading-time";
import type { LayoutMode } from "../content/model";
import { LAYOUT_SPACING_PRESETS, LAYOUT_VALUE_LIMITS } from "../content/layout";
import { blockCatalogue, type StudioCategory, type StudioDocument, type StudioDocumentKind, type StudioDocumentStatus } from "./editor-model";
import { StudioIcon } from "./studio-icons";
import { BlockLibraryIcon } from "./block-library-icons";
import { HeadingLevelIcon, HeadingLevelSetting } from "./controls/heading-level-setting";
import { Pane, PaneTabPanel, PaneTabs } from "./panes/pane-components";
import { InspectorAccordionSection } from "./inspector-accordion";
import { InspectorToolsSection, type InspectorMenuOption, type InspectorToolOption } from "./inspector-tools-section";
import { BoxLengthSetting } from "./box-length-setting";
import { documentDisplaySource, type FieldUsage } from "./document-fields";
import { createPasswordProtection } from "../content/password-protection";
import { findColumnsParent, maximumColumnWidth } from "../content/columns";
import { proposeColumnCountChange } from "./columns-count-change";
import { SPACER_SIZE_LIMIT, SPACER_UNITS, spacerOrientationFor, type SpacerOrientation } from "../content/spacer";
import { safeTextLink } from "../content/rich-text";
import { UNIVERSAL_STYLE_PRESET } from "@acm/styles";
import { inspectorStyleHasValues, resetSupportedInspectorStyleFields, setInspectorFitText, setInspectorFontSize } from "./blocks/inspector-style-actions";
import { resetGroupDimensionFields } from "./blocks/group-dimensions";
import { PaletteColourSetting } from "./controls/palette-colour-setting";
import { BackgroundSelection } from "./controls/background-selection";
import { ToggleSetting } from "./controls/toggle-setting";
import { StyleVariationSetting } from "./controls/style-variation-setting";
import { LineHeightSetting } from "./controls/line-height-setting";
import { BorderSettings } from "./controls/border-settings";
import { FocalPositionSetting } from "./controls/focal-position-setting";
import { FontSizeAppearanceSetting } from "./controls/font-size-appearance-setting";
import { ImageDimensionsSetting } from "./controls/image-dimensions-setting";
import { PresetNumberSetting } from "./controls/preset-number-setting";
import { LayoutSpacingSetting } from "./controls/layout-spacing-setting";
import { ParagraphLengthSetting } from "./controls/paragraph-length-setting";
import { capabilityProfileFor, retainedLegacyStyleControls, scopedStyleSectionIds } from "./blocks/capability-profiles";
import { ListSettingsInspector } from "./blocks/text-block-settings-inspector";
import { TableSettingsInspector } from "./blocks/table-settings-inspector";
import { ListItemInspector } from "./blocks/list-item-inspector";
import { GroupLayoutSelection } from "./blocks/group-layout-selection";
import { MONTH_NAMES, WEEKDAY_NAMES, formatCalendarMonth, formatPublicationTimezone, formatPublishDate, getCalendarDays, isSameCalendarDay, parsePublicationDate, startOfMonth } from "./publication-date";

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
  selectedListItem?: ListItemSelection | null;
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
  onColumnWidthChange?: (parent: ColumnsBlock, columnId: string, width: number) => void;
  onColumnCountChange?: (parent: ColumnsBlock, count: number) => void;
  onButtonPreviewChange?: (preview: { blockId: string; state: ButtonInteractionState } | null) => void;
  onOpenFiles: () => void;
  onOpenBackgroundMedia?: (blockId: string) => void;
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

export function StudioInspector({ paneWidth = 300, onPaneWidthChange, paneCollapsed, onPaneCollapsedChange, documentControls, inspectorTab, selectedBlock, selectedListItem = null, selectedDocumentField = null, activeDocument, pages, categories, tagSuggestions, canDelete, canDuplicate = true, canOpenFiles = true, allowedStatuses, allowedPageTemplates, onSelectTab, onDocumentChange, onCategorySelectionChange, onAddCategory, onBlockChange, onColumnWidthChange, onColumnCountChange, onButtonPreviewChange, onOpenFiles, onOpenBackgroundMedia, onOpenCoverMediaLibrary, onRemoveCoverImage, onPublish, onUnpublish, onDuplicate, onDelete, resolvedDocument, hasTemplate = false, fieldUsage, onFieldOverride, onSaveAsTemplate }: StudioInspectorProps) {
  const tabPrefix = useId();
  const tabs = ["document", "studio", "block", "styles"] as const;
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const [fontSizeViewModes, setFontSizeViewModes] = useState<Record<string, FontSizeViewMode>>({});
  const collapsed = paneCollapsed ?? localCollapsed;
  const setCollapsed = onPaneCollapsedChange ?? setLocalCollapsed;
  const selectedColumnParent = selectedBlock?.type === "column" ? findColumnsParent(activeDocument.blocks, selectedBlock.id) : undefined;
  const selectedSpacerOrientation = selectedBlock?.type === "spacer" ? spacerOrientationFor(activeDocument.blocks, selectedBlock.id) : "vertical";
  const canSetSticky = selectedBlock?.type === "group" && activeDocument.blocks.some(block => block.id === selectedBlock.id);
  const selectedDocumentFieldBlockType = selectedDocumentField === "title" ? "document-title" : "document-subtitle";
  const selectedDocumentFieldInfo = selectedDocumentField ? blockCatalogue.find(item => item.type === selectedDocumentFieldBlockType) : null;
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
          <div className="block-inspector-settings">
            <div className="inspector-sections"><section className="inspector-block-summary"><div className="inspector-block-summary-heading"><span><BlockLibraryIcon type={selectedDocumentFieldBlockType} /></span><h2>{selectedDocumentFieldInfo?.label ?? `Document ${selectedDocumentField}`}</h2></div><p className="setting-note">{selectedDocumentFieldInfo?.description}</p></section></div>
            <InspectorAccordionSection className="document-field-inspector" title={`Document ${selectedDocumentField}`}>
              <p>This field is part of the document. Edit it on the canvas.</p>
            </InspectorAccordionSection>
          </div>
        ) : selectedBlock ? (
          <BlockInspector key={selectedBlock.id} block={selectedBlock} selectedListItem={selectedListItem?.blockId === selectedBlock.id ? selectedListItem : null} canSetSticky={canSetSticky} spacerOrientation={selectedSpacerOrientation} fontSizeModeScope={activeDocument.id} fontSizeViewModes={fontSizeViewModes} onFontSizeViewModeChange={(key, mode) => setFontSizeViewModes(current => ({ ...current, [key]: mode }))} onChange={onBlockChange} onColumnCountChange={selectedBlock.type === "columns" && onColumnCountChange ? count => onColumnCountChange(selectedBlock, count) : undefined} columnWidthMax={maximumColumnWidth(selectedColumnParent?.children.length ?? 2)} onButtonPreviewChange={onButtonPreviewChange} onColumnWidthChange={selectedColumnParent && selectedColumnParent.children.length > 1 && onColumnWidthChange ? (columnId, width) => onColumnWidthChange(selectedColumnParent, columnId, width) : undefined} onOpenFiles={onOpenFiles} onOpenBackgroundMedia={onOpenBackgroundMedia ? () => onOpenBackgroundMedia(selectedBlock.id) : undefined} canOpenFiles={canOpenFiles} />
        ) : (
          <div className="inspector-empty"><span><StudioIcon name="block" /></span><p>Select a block to see its settings.</p></div>
        )}
      </PaneTabPanel>)}
    </Pane>
  );
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

function DocumentStylesInspector({ document }: { document: StudioDocument }) {
  return <div className="inspector-sections"><InspectorAccordionSection title="Styles"><p className="setting-note">Document styles come from the assigned template and explicit block styles. There is no separate document-level style override.</p><div className="inspector-value-row"><span>Document type</span><strong>{document.kind === "post" ? "Post" : "Page"}</strong></div><div className="inspector-value-row"><span>Breakpoint rules</span><strong>Template controlled</strong></div></InspectorAccordionSection></div>;
}

type FontSizeViewMode = "presets" | "custom";

function fontSizeModeKey(scope: string, block: ContentBlock) {
  return JSON.stringify([scope, block.id, block.type]) ?? "";
}

export function BlockInspector({ contentSlot = false, block, selectedListItem = null, canSetSticky = false, spacerOrientation = "vertical", onChange, onButtonPreviewChange, onColumnWidthChange, onColumnCountChange, columnWidthMax = 95, onOpenFiles, onOpenBackgroundMedia, canOpenFiles, fontSizeModeScope, fontSizeViewModes, onFontSizeViewModeChange }: { contentSlot?: boolean; block: ContentBlock; selectedListItem?: ListItemSelection | null; canSetSticky?: boolean; spacerOrientation?: SpacerOrientation; onChange: (block: ContentBlock) => void; onButtonPreviewChange?: (preview: { blockId: string; state: ButtonInteractionState } | null) => void; onColumnWidthChange?: (columnId: string, width: number) => void; columnWidthMax?: number; onColumnCountChange?: (count: number) => void; onOpenFiles: () => void; onOpenBackgroundMedia?: () => void; canOpenFiles: boolean; fontSizeModeScope: string; fontSizeViewModes: Record<string, FontSizeViewMode>; onFontSizeViewModeChange: (key: string, mode: FontSizeViewMode) => void }) {
  const [buttonState, setButtonState] = useState<ButtonInteractionState | "default">("default");
  const [showButtonStatePreview, setShowButtonStatePreview] = useState(true);
  const tableInspectorId = useId();
  const [tableTabSelection, setTableTabSelection] = useState({ blockId: block.id, tab: "settings" });
  const tableTab = tableTabSelection.blockId === block.id ? tableTabSelection.tab : "settings";
  useEffect(() => {
    onButtonPreviewChange?.(block.type === "button" && buttonState !== "default" && showButtonStatePreview ? { blockId: block.id, state: buttonState } : null);
    return () => onButtonPreviewChange?.(null);
  }, [block.id, block.type, buttonState, showButtonStatePreview, onButtonPreviewChange]);
  const selectedFontSizeModeKey = fontSizeModeKey(fontSizeModeScope, block);
  const profile = capabilityProfileFor(contentSlot ? "template-content" : block.type);
  const blockInfo = blockCatalogue.find((item) => item.type === block.type);
  const blockName = contentSlot ? "Content" : block.type === "heading" ? `Heading ${block.level}` : blockInfo?.label ?? profile.label ?? blockLabel(block.type);
  const blockDescription = contentSlot ? "Displays the current document body in this template." : blockInfo?.description ?? profile.description ?? `Configure this ${blockName.toLowerCase()} block.`;
  if (block.type === "list" && selectedListItem?.blockId === block.id) return <ListItemInspector key={`${selectedListItem.listId}-${selectedListItem.itemIndex}`} block={block} listId={selectedListItem.listId} itemIndex={selectedListItem.itemIndex} onChange={onChange} />;
  const alignedBlock = block.type === "document-title" ? block : null;
  const alignment = alignedBlock?.align ?? null;
  const advanced = advancedFieldsForBlock(block, "gutenberg");
  const blockSettings = (
    <>
      {alignedBlock ? <InspectorAccordionSection title={<>Text</>}><label><span>Alignment</span><select value={alignment ?? "left"} onChange={(event) => onChange({ ...alignedBlock, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label>{alignedBlock.type === "document-title" ? <label><span>Level</span><select value={alignedBlock.level ?? 2} onChange={(event) => onChange({ ...alignedBlock, level: Number(event.target.value) as DocumentTitleLevel })}><option value={0}>Paragraph</option>{[1, 2, 3, 4, 5, 6].map((level) => <option value={level} key={level}>Heading {level}</option>)}</select></label> : null}</InspectorAccordionSection> : null}
      {block.type === "document-title" ? <InspectorAccordionSection title="Link settings"><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.isLink)} onChange={(event) => onChange({ ...block, isLink: event.target.checked })} /><span>Make title a link</span></label>{block.isLink ? <><label className="checkbox-setting"><input type="checkbox" checked={block.linkTarget === "_blank"} onChange={(event) => onChange({ ...block, linkTarget: event.target.checked ? "_blank" : "_self" })} /><span>Open in new tab</span></label><label><span>Link rel</span><input value={block.rel ?? ""} onChange={(event) => onChange({ ...block, rel: event.target.value || undefined })} placeholder="nofollow sponsored" /></label></> : null}</InspectorAccordionSection> : null}
      {block.type === "quote" ? <InspectorAccordionSection title="Quote"><StyleVariationSetting kind="quote" value={block.quoteStyle} onChange={quoteStyle => onChange({ ...block, quoteStyle: quoteStyle as "default" | "plain" })} /><label><span>Attribution</span><input value={block.attribution ?? ""} onChange={(event) => onChange({ ...block, attribution: event.target.value, attributionRuns: undefined })} placeholder="Optional name" /></label></InspectorAccordionSection> : null}
      {block.type === "list" ? <><InspectorAccordionSection title="List"><label><span>List type</span><select value={block.style} onChange={event => onChange({ ...block, style: event.target.value as "ordered" | "unordered" })}><option value="unordered">Bullets</option><option value="ordered">Numbers</option></select></label><p className="setting-note">Edit each item directly in the canvas.</p></InspectorAccordionSection>{block.style === "ordered" ? <ListSettingsInspector block={block} onChange={onChange} /> : null}</> : null}

      {block.type === "image" ? <ImageInspector block={block} onChange={onChange} onOpenFiles={onOpenFiles} canOpenFiles={canOpenFiles} advancedFields={advanced} /> : null}
      {block.type === "cover-image" ? <CoverImageInspector block={block} onChange={onChange} /> : null}
      {block.type === "embed" ? <EmbedSettingsInspector block={block} onChange={onChange} advancedFields={advanced} /> : null}
      {block.type === "buttons" ? <InspectorAccordionSection title="Layout"><label><span>Justification</span><select value={block.justification ?? "left"} onChange={event => onChange({ ...block, justification: event.target.value as typeof block.justification })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option><option value="space-between">Space between</option></select></label><label><span>Orientation</span><select value={block.orientation ?? "horizontal"} onChange={event => onChange({ ...block, orientation: event.target.value as typeof block.orientation })}><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></label><label className="setting-checkbox"><input type="checkbox" checked={block.allowWrap !== false} onChange={event => onChange({ ...block, allowWrap: event.target.checked })} />Allow wrapping</label>{(["horizontalGap", "verticalGap"] as const).map((field, index) => <LayoutSpacingSetting key={field} label={index ? "Vertical gap" : "Horizontal gap"} value={block[field]} presets={LAYOUT_SPACING_PRESETS} min={0} max={120} onChange={value => onChange({ ...block, [field]: value })} />)}</InspectorAccordionSection> : null}
      {block.type === "button" ? <InspectorAccordionSection title="Button"><label><span>Label</span><input value={block.label} onChange={(event) => onChange({ ...block, label: event.target.value, labelRuns: undefined })} /></label><label><span>URL</span><input value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} /></label><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.opensInNewTab)} onChange={(event) => onChange({ ...block, opensInNewTab: event.target.checked })} /><span>Open in new tab</span></label><label><span>Style</span><select value={block.style} onChange={(event) => onChange({ ...block, style: event.target.value as "primary" | "secondary" })}><option value="primary">Fill</option><option value="secondary">Outline</option></select></label><label><span>Text alignment</span><select value={block.align ?? "centre"} onChange={(event) => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label><label><span>Title attribute</span><input value={block.title ?? ""} onChange={(event) => onChange({ ...block, title: event.target.value || undefined })} /></label><label><span>Link rel</span><input value={block.rel ?? ""} onChange={(event) => onChange({ ...block, rel: event.target.value || undefined })} placeholder="nofollow sponsored" /></label></InspectorAccordionSection> : null}
      {block.type === "social-icons" ? <InspectorAccordionSection title="Social Icons"><p className="setting-note">Use the plus button in the block to add LinkedIn or TikTok. Select an icon to edit its link.</p><label><span>Style</span><select value={block.socialStyle ?? "default"} onChange={event => onChange({ ...block, socialStyle: event.target.value as NonNullable<typeof block.socialStyle> })}><option value="default">Default</option><option value="logos-only">Logos Only</option><option value="pill-shape">Pill Shape</option></select></label><label><span>Justification</span><select value={block.justification ?? "left"} onChange={event => onChange({ ...block, justification: event.target.value as NonNullable<typeof block.justification> })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option><option value="space-between">Space between</option></select></label><label><span>Orientation</span><select value={block.orientation ?? "horizontal"} onChange={event => onChange({ ...block, orientation: event.target.value as NonNullable<typeof block.orientation> })}><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></label><label className="checkbox-setting"><input type="checkbox" checked={block.allowWrap !== false} onChange={event => onChange({ ...block, allowWrap: event.target.checked })} /><span>Allow to wrap</span></label><label><span>Icon size</span><select value={block.iconSize ?? "normal"} onChange={event => onChange({ ...block, iconSize: event.target.value as NonNullable<typeof block.iconSize> })}><option value="small">Small</option><option value="normal">Normal</option><option value="large">Large</option><option value="huge">Huge</option></select></label><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.showLabels)} onChange={event => onChange({ ...block, showLabels: event.target.checked })} /><span>Show text labels</span></label><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.openInNewTab)} onChange={event => onChange({ ...block, openInNewTab: event.target.checked })} /><span>Open links in a new tab</span></label>{(["horizontalGap", "verticalGap"] as const).map((field, index) => <LayoutSpacingSetting key={field} label={index ? "Vertical gap" : "Horizontal gap"} value={block[field]} presets={LAYOUT_SPACING_PRESETS} min={0} max={120} onChange={value => onChange({ ...block, [field]: value })} />)}</InspectorAccordionSection> : null}

      {block.type === "divider" ? <DividerInspector block={block} onChange={onChange} /> : null}
      {block.type === "spacer" ? <SpacerInspector block={block} orientation={spacerOrientation} onChange={onChange} advancedFields={advanced} /> : null}
      {block.type === "post-date" ? <InspectorAccordionSection title="Date"><label><span>Format</span><select value={block.format ?? "long"} onChange={(event) => onChange({ ...block, format: event.target.value as PostDateFormat })}><option value="long">Long — 2 September 2026</option><option value="short">Short — 02/09/2026</option><option value="iso">ISO — 2026-09-02</option><option value="custom">Custom</option></select></label>{block.format === "custom" ? <label><span>Custom date format</span><input value={block.customFormat ?? "j F Y"} maxLength={128} onChange={event => onChange({ ...block, customFormat: event.target.value })} /><small>Tokens: Y y m n F M d j l D H G h g i s a A. Escape a literal with a backslash.</small></label> : null}<label><span>Date source</span><select value={block.dateSource ?? "published"} onChange={event => onChange({ ...block, dateSource: event.target.value as "published" | "modified" })}><option value="published">Published</option><option value="modified">Last modified</option></select></label><label className="checkbox-setting"><input type="checkbox" checked={block.showIcon !== false} onChange={event => onChange({ ...block, showIcon: event.target.checked })} /><span>Show clock icon</span></label><label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.isLink)} onChange={(event) => onChange({ ...block, isLink: event.target.checked })} /><span>Link to post</span></label><p className="setting-note">Published uses the document publication date. Last modified uses its saved modification timestamp when available.</p></InspectorAccordionSection> : null}
      {block.type === "post-author" ? <InspectorAccordionSection title="Author"><label><span>Alignment</span><select value={block.align ?? "left"} onChange={event => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label><label><span>Prefix</span><input value={block.prefix ?? "By"} onChange={event => onChange({ ...block, prefix: event.target.value })} /></label><label className="checkbox-setting"><input type="checkbox" checked={block.avatar !== false} onChange={event => onChange({ ...block, avatar: event.target.checked })} /><span>Show initials avatar</span></label><p className="setting-note">The author value is edited in Document settings.</p></InspectorAccordionSection> : null}
      {block.type === "reading-time" ? <InspectorAccordionSection title="Time to Read"><label><span>Display</span><select value={block.mode ?? "time"} onChange={event => onChange({ ...block, mode: event.target.value as "time" | "words" })}><option value="time">Reading time</option><option value="words">Word count</option></select></label>{block.mode !== "words" ? <label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.showRange)} onChange={event => onChange({ ...block, showRange: event.target.checked })} /><span>Show reading time range</span></label> : null}<label><span>Prefix</span><input value={block.prefix ?? "Reading Time:"} onChange={event => onChange({ ...block, prefix: event.target.value })} /></label><label><span>Presentation</span><select value={block.presentation ?? "badge"} onChange={event => onChange({ ...block, presentation: event.target.value as "badge" | "plain" })}><option value="badge">Badge</option><option value="plain">Plain text</option></select></label><MetadataAlignment block={block} onChange={onChange} /></InspectorAccordionSection> : null}
      {block.type === "document-subtitle" ? <InspectorAccordionSection title="Subtitle"><MetadataAlignment block={block} onChange={onChange} /></InspectorAccordionSection> : null}
      {block.type === "post-date" ? <InspectorAccordionSection title="Date alignment"><label><span>Alignment</span><select value={block.align ?? "left"} onChange={event => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label></InspectorAccordionSection> : null}
      {block.type === "section" ? <LayoutInspector block={block} onChange={onChange} heading="Section" note={`This section contains ${block.children.length} nested block${block.children.length === 1 ? "" : "s"}.`} /> : null}
      {block.type === "columns" ? <ColumnsInspector block={block} onChange={onChange} onCountChange={onColumnCountChange} /> : null}
      {block.type === "column" ? <ColumnInspector block={block} onChange={onChange} onWidthChange={onColumnWidthChange} widthMax={columnWidthMax} /> : null}
      {profile.sharedStyleInspector ? <ParagraphInspector key={`${block.id}:${block.type}:${block.type === "button" ? buttonState : "default"}:block`} profileOverride={contentSlot ? profile : undefined} block={block} interactionState={block.type === "button" ? buttonState : "default"} onChange={onChange} fontSizeViewMode={fontSizeViewModes[selectedFontSizeModeKey] ?? null} onFontSizeViewModeChange={mode => onFontSizeViewModeChange(selectedFontSizeModeKey, mode)} backgroundImageOptions={block.type === "group" || block.type === "quote" || block.type === "heading" || block.type === "code" || block.type === "document-title" ? <ManagedBackgroundImageInspector block={block} onChange={onChange} detailsOnly /> : undefined} backgroundImageControls={block.type === "group" || block.type === "quote" || (block.type === "heading" && Boolean(block.visualStyle?.backgroundImageMediaId)) || block.type === "code" || block.type === "document-title" ? <ManagedBackgroundImageInspector block={block} onChange={onChange} onOpenBackgroundMedia={onOpenBackgroundMedia} embedded /> : undefined} groupLayoutControls={block.type === "group" ? <LayoutInspector block={block} onChange={onChange} heading="Layout" note={`This group contains ${block.children.length} nested block${block.children.length === 1 ? "" : "s"}.`} /> : undefined} groupDimensionControls={block.type === "group" ? <GroupDimensionsInspector block={block} onChange={onChange} /> : block.type === "columns" ? <LayoutGapsInspector block={block} onChange={onChange} /> : undefined} onResetGroupDimensions={block.type === "group" || block.type === "columns" ? () => onChange({ ...block, paddingX: undefined, paddingY: undefined, gap: undefined, columnGap: undefined, rowGap: undefined }) : undefined} /> : null}
      {block.type === "group" && canSetSticky && !contentSlot ? <GroupPositionInspector block={block} onChange={onChange} /> : null}
      {advanced && block.type !== "embed" && block.type !== "spacer" && block.type !== "image" && block.type !== "divider" ? <AdvancedFieldsInspector semanticElement={!contentSlot} block={block} onChange={onChange} fields={advanced} /> : null}
      {!contentSlot && (block.type === "group" || block.type === "column") ? <AllowedBlocksInspector block={block} onChange={onChange} /> : null}
    </>
  );
  const requiredSettings = (
    <>
      {block.type === "field" ? <InspectorAccordionSection title="Field"><label><span>Label</span><input value={block.label} onChange={event => onChange({ ...block, label: event.target.value })} /></label><label><span>Control</span><select value={block.control} onChange={event => onChange({ ...block, control: event.target.value as "text" | "select" })}><option value="text">Text</option><option value="select">Select</option></select></label><label><span>Value</span><input value={block.value} onChange={event => onChange({ ...block, value: event.target.value })} /></label>{block.control === "select" ? <label><span>Options</span><input value={(block.options ?? []).join(", ")} onChange={event => onChange({ ...block, options: event.target.value.split(",").map(option => option.trim()).filter(Boolean) })} placeholder="First, Second" /></label> : null}</InspectorAccordionSection> : null}
      {block.type === "component" ? <ComponentInspector block={block} onChange={onChange} /> : null}
      {block.type === "section" ? <InspectorAccordionSection title="Section role"><label><span>Site role</span><select value={block.role ?? ""} onChange={event => onChange({ ...block, role: (event.target.value || undefined) as SiteSectionRole | undefined })}><option value="">None</option>{(["account", "setup", "scorecard", "leaderboard", "share", "hero", "hero-copy", "account-copy", "scorecard-heading", "scorecard-actions", "leaderboard-card", "leaderboard-score", "leaderboard-metrics", "metric", "footer", "footer-brand", "footer-links", "social-link"] as SiteSectionRole[]).map(role => <option value={role} key={role}>{role}</option>)}</select></label>{block.source ? <p className="setting-note">Source: {block.source.module} · {block.source.exportName} · {block.source.revision.slice(0, 8)}</p> : null}</InspectorAccordionSection> : null}
      {block.type === "social-linkedin" || block.type === "social-tiktok" ? <InspectorAccordionSection title={block.type === "social-linkedin" ? "LinkedIn" : "TikTok"}><label><span>Profile URL</span><input type="url" value={block.url} onChange={event => onChange({ ...block, url: event.target.value })} placeholder={block.type === "social-linkedin" ? "https://www.linkedin.com/in/…" : "https://www.tiktok.com/@…"} /></label>{block.url && !safeTextLink(block.url) ? <p className="setting-note" role="alert">Enter a valid link. The icon will not link until the address is valid.</p> : null}<label><span>Text label</span><input value={block.label ?? ""} onChange={event => onChange({ ...block, label: event.target.value || undefined })} placeholder={block.type === "social-linkedin" ? "LinkedIn" : "TikTok"} /></label><label><span>Link rel</span><input value={block.rel ?? ""} onChange={event => onChange({ ...block, rel: event.target.value || undefined })} placeholder="nofollow" /></label></InspectorAccordionSection> : null}

    </>
  );
  return <div className={`block-inspector-settings${block.type === "embed" ? " embed-block-inspector" : block.type === "table" ? " table-block-inspector" : ""}`}>
    <div className="inspector-sections"><section className="inspector-block-summary"><div className="inspector-block-summary-heading"><span aria-hidden="true">{block.type === "heading" ? <HeadingLevelIcon level={block.level} /> : <BlockLibraryIcon type={block.type} />}</span><h2>{blockName}</h2></div>{block.type === "button" ? <div className="inspector-button-state-controls"><label><span>State</span><select aria-label="Button state" value={buttonState} onChange={event => setButtonState(event.target.value as ButtonInteractionState | "default")}><option value="default">Default</option><option value="hover">Hover</option><option value="focus">Focus</option><option value="active">Active</option></select></label><label className="checkbox-setting"><input type="checkbox" checked={showButtonStatePreview} disabled={buttonState === "default"} onChange={event => setShowButtonStatePreview(event.target.checked)} /><span>Show state on canvas</span></label></div> : null}<p className="setting-note">{blockDescription}</p>{block.type === "heading" ? <HeadingLevelSetting value={block.level} onChange={level => onChange({ ...block, level })} /> : null}{block.type === "group" && !contentSlot ? <GroupLayoutSelection value={block.layout} onChange={layout => onChange({ ...block, layout, allowWrap: layout === "row" ? block.allowWrap ?? false : block.allowWrap })} /> : null}</section></div>
    {block.type === "table" ? <>
      <PaneTabs id={tableInspectorId} label="Table inspector" className="table-inspector-tabs" indicatorVariant="selected" tabs={[{ id: "settings", label: "Settings" }, { id: "styles", label: "Styles" }]} active={tableTab} onChange={tab => setTableTabSelection({ blockId: block.id, tab })} renderLabel={tab => <><AcmIcon name={tab.id === "settings" ? "action.settings" : "view.styles"} scale="Regular-M" size={24} /><span className="table-inspector-tab-label">{tab.label}</span></>} />
      <PaneTabPanel id={tableInspectorId} tab="settings" active={tableTab} className="inspector-sections table-inspector-tab-panel">
        <TableSettingsInspector block={block} onChange={onChange} />
        {advanced ? <AdvancedFieldsInspector block={block} onChange={onChange} fields={advanced} /> : null}
      </PaneTabPanel>
      <PaneTabPanel id={tableInspectorId} tab="styles" active={tableTab} className="inspector-sections table-inspector-tab-panel">
        <InspectorToolsSection title="Styles" options={[]} visible={new Set(["table-style"])} canReset={block.tableStyle === "stripes"} alwaysShow onToggle={() => {}} onReset={() => onChange({ ...block, tableStyle: undefined })}><StyleVariationSetting kind="table" value={block.tableStyle} onChange={tableStyle => onChange({ ...block, tableStyle: tableStyle as "default" | "stripes" })} /></InspectorToolsSection>
        <ParagraphInspector key={`${block.id}:table:styles`} block={block} onChange={onChange} fontSizeViewMode={fontSizeViewModes[selectedFontSizeModeKey] ?? null} onFontSizeViewModeChange={mode => onFontSizeViewModeChange(selectedFontSizeModeKey, mode)} />
      </PaneTabPanel>
    </> : <div className="inspector-sections">{blockSettings}{requiredSettings}</div>}
  </div>;
}



function MetadataAlignment({ block, onChange }: { block: Extract<ContentBlock, { type: "reading-time" | "document-subtitle" }>; onChange: (block: ContentBlock) => void }) {
  return <label><span>Alignment</span><select value={block.align ?? "left"} onChange={event => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label>;
}

function AllowedBlocksInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "group" | "column" }>; onChange: (block: ContentBlock) => void }) {
  const [manageOpen, setManageOpen] = useState(false);
  const controlsId = useId();
  const options = blockCatalogue.filter((item): item is typeof item & { type: GroupAllowedBlockType } => GROUP_ALLOWED_BLOCK_TYPES.includes(item.type as GroupAllowedBlockType) && item.type !== "button" && item.type !== "social-linkedin" && item.type !== "social-tiktok");
  const allowed = new Set(block.allowedBlocks?.map(type => type === "button" ? "buttons" : type) ?? options.map(option => option.type));
  function toggle(type: GroupAllowedBlockType, checked: boolean) {
    const next = new Set(allowed);
    if (checked) next.add(type); else next.delete(type);
    const allowedBlocks = options.every(option => next.has(option.type)) ? undefined : options.filter(option => next.has(option.type)).map(option => option.type);
    onChange({ ...block, allowedBlocks });
  }
  return <div className="group-allowed-blocks-section">
    <h3>Allowed Blocks</h3>
    <button className="group-allowed-blocks-trigger" type="button" aria-expanded={manageOpen} aria-controls={controlsId} onClick={() => setManageOpen(open => !open)}>Manage allowed blocks</button>
    <p className="setting-note">Specify which blocks are allowed inside this container.</p>
    {manageOpen ? <fieldset id={controlsId} className="group-allowed-blocks"><legend>Blocks allowed inside this {block.type === "column" ? "Column" : "Group"}</legend>{options.map(option => <label className="checkbox-setting" key={option.type}><input type="checkbox" checked={allowed.has(option.type)} onChange={event => toggle(option.type, event.target.checked)} /><span>{option.label}</span></label>)}</fieldset> : null}
  </div>;
}

// Match the Gutenberg core blocks represented by Studio. Studio-only blocks
// without a shared style wrapper do not expose generic Advanced fields.
function advancedFieldsForBlock(block: ContentBlock, source: "gutenberg" | "studio"): AdvancedFields | null {
  const profile = capabilityProfileFor(block.type);
  const controls = profile.controls.filter(item => item.section === "advanced" && item.source === source);
  if (!controls.length) return null;
  const fields = controls.flatMap(control => control.fields);
  return {
    anchor: fields.some(field => field.endsWith("anchor")),
    className: fields.some(field => field.endsWith("className")),
    additionalCss: fields.some(field => field.endsWith("additionalCss")),
  };
}

function AdvancedFieldsInspector({ semanticElement = true, block, onChange, fields, children }: { semanticElement?: boolean; block: ContentBlock; onChange: (block: ContentBlock) => void; fields: AdvancedFields; children?: ReactNode }) {
  const style = block.type === "paragraph" || block.type === "columns" || block.type === "column" ? block.style ?? {} : block.visualStyle ?? {};
  const blockName = blockCatalogue.find(entry => entry.type === block.type)?.label ?? capabilityProfileFor(block.type).label;
  function update(field: "anchor" | "className" | "additionalCss", value: string) {
    const next = { ...style };
    if (value.trim()) next[field] = value;
    else delete next[field];
    if (block.type === "paragraph" || block.type === "columns" || block.type === "column") onChange({ ...block, style: Object.keys(next).length ? next : undefined } as ContentBlock);
    else onChange({ ...block, visualStyle: Object.keys(next).length ? next : undefined } as ContentBlock);
  }
  return <InspectorAccordionSection className={`advanced-fields-section${block.type === "paragraph" ? " paragraph-advanced-fields" : ""}`} title="Advanced">
    <AdvancedFieldsControl fields={fields} style={style} blockName={blockName} placeholders={block.type !== "paragraph" && block.type !== "embed"} onChange={update} />
    {children}
    {semanticElement && block.type === "group" ? <><label><span>HTML element</span><select value={block.tagName ?? "div"} onChange={(event) => onChange({ ...block, tagName: event.target.value as NonNullable<typeof block.tagName> })}>{["div", "main", "section", "article", "aside", "header", "footer", "nav"].map((tag) => <option value={tag} key={tag}>{tag}</option>)}</select></label><label><span>ARIA label</span><input value={block.ariaLabel ?? ""} onChange={(event) => onChange({ ...block, ariaLabel: event.target.value || undefined })} /></label></> : null}
  </InspectorAccordionSection>;
}

type LayoutBlock = Extract<ContentBlock, { type: "group" | "section" }>;

function EmbedSettingsInspector({ block, onChange, advancedFields }: { block: Extract<ContentBlock, { type: "embed" }>; onChange: (block: ContentBlock) => void; advancedFields: AdvancedFields | null }) {
  const [marginVisible, setMarginVisible] = useState(true);
  const style = block.visualStyle ?? {};
  function updateMargin(value: string | undefined) {
    const nextStyle = { ...style };
    if (value) nextStyle.margin = value;
    else delete nextStyle.margin;
    onChange({ ...block, visualStyle: Object.keys(nextStyle).length ? nextStyle : undefined });
  }
  return <>
    <InspectorToolsSection title="Dimensions" options={[{ id: "margin", label: "Margin" }]} visible={new Set(marginVisible ? ["margin"] : [])} canReset={Boolean(style.margin)} onToggle={() => setMarginVisible(visible => !visible)} onReset={() => updateMargin(undefined)}>
      <BoxLengthSetting label="Margin" value={style.margin} layout="axes" min={-100} max={200} onChange={updateMargin} />
    </InspectorToolsSection>
    {advancedFields ? <AdvancedFieldsInspector block={block} onChange={onChange} fields={advancedFields} /> : null}
  </>;
}

function SpacerInspector({ block, orientation, onChange, advancedFields }: { block: Extract<ContentBlock, { type: "spacer" }>; orientation: SpacerOrientation; onChange: (block: ContentBlock) => void; advancedFields: AdvancedFields | null }) {
  const defaultHeightByUnit: Record<SpacerUnit, number> = { px: 32, em: 2, rem: 2, vw: 10, vh: 10 };
  const defaultWidthByUnit: Record<SpacerUnit, number> = { px: 100, em: 2, rem: 2, vw: 10, vh: 10 };
  const unitOptions = SPACER_UNITS.map((unit) => <option value={unit} key={unit}>{unit}</option>);
  const dimension = orientation === "horizontal" ? "width" : "height";
  const unitField = orientation === "horizontal" ? "widthUnit" : "heightUnit";
  const label = orientation === "horizontal" ? "Width" : "Height";
  const unit = block[unitField] ?? "px";
  const value = orientation === "horizontal" ? block.width ?? 100 : block.height;
  return <>
    <InspectorAccordionSection title="Dimensions">
      <div className="inspector-two-column">
        <label><span>{label}</span><input aria-label={label} type="number" min="0" max={SPACER_SIZE_LIMIT} step="any" value={value} onChange={(event) => onChange({ ...block, [dimension]: Math.max(0, Math.min(SPACER_SIZE_LIMIT, Number(event.target.value) || 0)) })} /></label>
        <label><span>{label} unit</span><select aria-label={`${label} unit`} value={unit} onChange={(event) => { const nextUnit = event.target.value as SpacerUnit; const defaults = orientation === "horizontal" ? defaultWidthByUnit : defaultHeightByUnit; onChange({ ...block, [dimension]: defaults[nextUnit], [unitField]: nextUnit === "px" ? undefined : nextUnit }); }}>{unitOptions}</select></label>
      </div>
      <ParagraphLengthSetting label="Margin" value={block.visualStyle?.margin} min={-100} max={200} onChange={value => { const visualStyle = { ...(block.visualStyle ?? {}) }; if (value) visualStyle.margin = value; else delete visualStyle.margin; onChange({ ...block, visualStyle: Object.keys(visualStyle).length ? visualStyle : undefined }); }} />
      <p className="setting-note">Spacer blocks add empty space without adding screen-reader content.</p>
    </InspectorAccordionSection>
    {advancedFields ? <AdvancedFieldsInspector block={block} onChange={onChange} fields={advancedFields} /> : null}
  </>;
}

function ImageInspector({ block, onChange, onOpenFiles, canOpenFiles, advancedFields }: { block: Extract<ContentBlock, { type: "image" }>; onChange: (block: ContentBlock) => void; onOpenFiles: () => void; canOpenFiles: boolean; advancedFields: AdvancedFields | null }) {
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
      <p className="setting-note">Edit the caption directly below the image in the canvas.</p>
      <label><span>Link destination</span><select value={linkDestination} onChange={(event) => { const destination = event.target.value as NonNullable<typeof block.linkDestination>; onChange({ ...block, linkDestination: destination, linkUrl: destination === "custom" ? block.linkUrl : undefined, opensInNewTab: destination === "custom" || destination === "media" ? block.opensInNewTab : undefined, decorative: destination === "none" ? block.decorative : false }); }}><option value="none">None</option><option value="custom">Custom URL</option><option value="media">Image file</option><option value="lightbox">Enlarge on click</option></select></label>
      {linkDestination === "custom" ? <label><span>Link URL</span><input type="url" value={block.linkUrl ?? ""} onChange={(event) => onChange({ ...block, linkUrl: event.target.value || undefined, decorative: event.target.value ? false : block.decorative })} placeholder="https://…" /></label> : null}
      {(linkDestination === "custom" || linkDestination === "media") ? <label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.opensInNewTab)} onChange={(event) => onChange({ ...block, opensInNewTab: event.target.checked })} /><span>Open in new tab</span></label> : null}
    </InspectorAccordionSection>
    <InspectorAccordionSection title="Styles"><label><span>Style</span><select value={block.imageStyle ?? "default"} onChange={(event) => onChange({ ...block, imageStyle: event.target.value as NonNullable<typeof block.imageStyle> })}><option value="default">Default</option><option value="rounded">Rounded</option></select></label></InspectorAccordionSection>
    <InspectorAccordionSection title="Dimensions">
      <ImageDimensionsSetting aspectRatio={ratio} displayWidth={block.displayWidth} displayHeight={block.displayHeight} scale={block.scale} onAspectRatioChange={aspectRatio => onChange({ ...block, aspectRatio })} onWidthChange={displayWidth => onChange({ ...block, displayWidth })} onHeightChange={displayHeight => onChange({ ...block, displayHeight })} onScaleChange={scale => { if (scale !== "fill") onChange({ ...block, scale }); }} />
      {(block.src || block.mediaId) && ratio !== "original" && block.scale !== "contain" ? <FocalPositionSetting x={block.focalX} y={block.focalY} onXChange={focalX => onChange({ ...block, focalX })} onYChange={focalY => onChange({ ...block, focalY })} /> : null}
      <ParagraphLengthSetting key={`${block.id}-margin`} label="Margin" value={style.margin} min={-100} max={200} onChange={(value) => updateVisualStyle({ margin: value })} />
    </InspectorAccordionSection>
    <InspectorAccordionSection title="Border & shadow"><BorderSettings style={style} idPrefix={block.id} onChange={updateVisualStyle} /></InspectorAccordionSection>
    {advancedFields ? <AdvancedFieldsInspector block={block} onChange={onChange} fields={advancedFields}><label><span>Title attribute</span><input value={block.title ?? ""} onChange={event => onChange({ ...block, title: event.target.value || undefined })} /></label></AdvancedFieldsInspector> : null}
  </>;
}

function CoverImageInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "cover-image" }>; onChange: (block: ContentBlock) => void }) {
  const ratio = block.aspectRatio ?? "original";
  return <>
    <InspectorAccordionSection title="Link settings">
      <label className="checkbox-setting"><input type="checkbox" checked={Boolean(block.isLink)} onChange={(event) => onChange({ ...block, isLink: event.target.checked })} /><span>Link to post</span></label>
      {block.isLink ? <><label className="checkbox-setting"><input type="checkbox" checked={block.linkTarget === "_blank"} onChange={(event) => onChange({ ...block, linkTarget: event.target.checked ? "_blank" : "_self" })} /><span>Open in new tab</span></label><label><span>Link rel</span><input value={block.rel ?? ""} onChange={(event) => onChange({ ...block, rel: event.target.value || undefined })} placeholder="nofollow sponsored" /></label></> : null}
    </InspectorAccordionSection>
    <InspectorAccordionSection title="Dimensions">
      <ImageDimensionsSetting aspectRatio={ratio} displayWidth={block.displayWidth} displayHeight={block.displayHeight} scale={block.scale} scaleOptions={["cover", "contain", "fill"]} onAspectRatioChange={aspectRatio => onChange({ ...block, aspectRatio })} onWidthChange={displayWidth => onChange({ ...block, displayWidth })} onHeightChange={displayHeight => onChange({ ...block, displayHeight })} onScaleChange={scale => onChange({ ...block, scale })} />
    </InspectorAccordionSection>
  </>;
}

function DividerInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "divider" }>; onChange: (block: ContentBlock) => void }) {
  const style = block.visualStyle ?? {};
  const [backgroundMode, setBackgroundMode] = useState<"colour" | "gradient">(style.backgroundGradient ? "gradient" : "colour");
  function updateVisualStyle(changes: Partial<ParagraphStyle>) {
    const next = { ...style, ...changes };
    for (const key of Object.keys(next) as (keyof ParagraphStyle)[]) if (!next[key]) delete next[key];
    onChange({ ...block, visualStyle: Object.keys(next).length ? next : undefined });
  }
  function updateBackground(backgroundColor: string | undefined, backgroundGradient: ParagraphBackgroundGradient | undefined) {
    const next = { ...style };
    if (backgroundColor) next.backgroundColor = backgroundColor;
    else delete next.backgroundColor;
    if (backgroundGradient) next.backgroundGradient = backgroundGradient;
    else delete next.backgroundGradient;
    onChange({ ...block, visualStyle: Object.keys(next).length ? next : undefined });
  }
  return <>
    <InspectorAccordionSection title="Styles"><label><span>Style</span><select value={block.style ?? "default"} onChange={(event) => onChange({ ...block, style: event.target.value as "default" | "wide" | "dots" })}><option value="default">Default</option><option value="wide">Wide line</option><option value="dots">Dots</option></select></label></InspectorAccordionSection>
    <InspectorAccordionSection className="inspector-panel" title="Background">
      <BackgroundSelection mode={backgroundMode} colour={style.backgroundColor} gradient={style.backgroundGradient} onModeChange={setBackgroundMode} onColourChange={value => updateBackground(value, undefined)} onGradientChange={value => updateBackground(undefined, value)} />
      {style.backgroundGradient ? <button type="button" className="paragraph-reset-button" onClick={() => { updateBackground(undefined, undefined); setBackgroundMode("colour"); }}>Reset background</button> : null}
    </InspectorAccordionSection>
    <InspectorAccordionSection title="Dimensions"><ParagraphLengthSetting key={`${block.id}-margin`} label="Margin" value={style.margin} min={-100} max={200} onChange={(value) => updateVisualStyle({ margin: value })} /></InspectorAccordionSection>
    <AdvancedFieldsInspector block={block} onChange={onChange} fields={{ anchor: true, className: true, additionalCss: true }}>
      <label><span>HTML element</span><select value={block.tagName ?? "hr"} onChange={event => onChange({ ...block, tagName: event.target.value as "hr" | "div" })}><option value="hr">Default (&lt;hr&gt;)</option><option value="div">&lt;div&gt;</option></select></label>
    </AdvancedFieldsInspector>
  </>;
}

function LayoutInspector({ block, onChange, heading, note }: { block: LayoutBlock; onChange: (block: ContentBlock) => void; heading: string; note: string }) {
  const update = (changes: Partial<LayoutBlock>) => onChange({ ...block, ...changes } as ContentBlock);
  if (block.type === "group") {
    if (block.layout === "flow" || block.layout === "stack") return <InspectorAccordionSection title={heading}>
      <label className="checkbox-setting"><input type="checkbox" checked={block.inheritLayout === true} onChange={event => update({ inheritLayout: event.target.checked })} /><span>Inherit content and wide widths</span></label>
      {block.inheritLayout === undefined ? <button type="button" onClick={() => update({ inheritLayout: false })}>Customise content widths</button> : null}
      {block.inheritLayout === false ? <div className="layout-content-widths"><ParagraphLengthSetting label="Content width" value={block.contentSize} min={0} max={4000} onChange={contentSize => update({ contentSize })} /><ParagraphLengthSetting label="Wide width" value={block.wideSize} min={0} max={4000} onChange={wideSize => update({ wideSize })} /></div> : null}
      <p className="setting-note">{block.inheritLayout === undefined ? "This saved Group uses its legacy unrestricted width. Enable inheritance or customise widths." : "Content and wide widths inherit from the enclosing layout until customised."} Full-width children use the container width.</p>
      {block.layout === "stack" ? <><label><span>Horizontal alignment</span><select value={block.horizontalAlign ?? "stretch"} onChange={event => update({ horizontalAlign: event.target.value as GroupLayoutOptions["horizontalAlign"] })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option><option value="stretch">Stretch</option></select></label><label><span>Justification</span><select value={block.verticalAlign ?? "top"} onChange={event => update({ verticalAlign: event.target.value as GroupLayoutOptions["verticalAlign"] })}><option value="top">Top</option><option value="centre">Centre</option><option value="bottom">Bottom</option><option value="space-between">Space between</option></select></label></> : null}
    </InspectorAccordionSection>;
    if (block.layout === "columns") return null;
    const row = block.layout === "row";
    const horizontalAlignments = row ? ["left", "centre", "right", "space-between"] : ["left", "centre", "right", "stretch"];
    const verticalAlignments = row ? ["top", "centre", "bottom", "stretch"] : ["top", "centre", "bottom", "space-between"];
    return <InspectorAccordionSection title={heading}>
      {block.layout === "grid" ? <>
        <label><span>Grid arrangement</span><select value={block.gridMode ?? "auto"} onChange={event => update({ gridMode: event.target.value as "auto" | "manual" })}><option value="auto">Auto</option><option value="manual">Manual</option></select></label>
        <label><span>{block.gridMode === "manual" ? "Columns" : "Max. columns"}</span><select value={block.columns ?? 3} onChange={event => update({ columns: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 6].map(count => <option value={count} key={count}>{count}</option>)}</select></label>
        {block.gridMode !== "manual" ? <><PresetNumberSetting label="Min. column width" value={block.minColumnWidth ?? 192} presets={block.minColumnWidthUnit && block.minColumnWidthUnit !== "px" ? [8, 12, 16, 20] : [120, 160, 192, 240, 320]} min={block.minColumnWidthUnit && block.minColumnWidthUnit !== "px" ? 1 : 80} max={600} onChange={minColumnWidth => update({ minColumnWidth })} /><label><span>Minimum column width unit</span><select value={block.minColumnWidthUnit ?? "px"} onChange={event => update({ minColumnWidthUnit: event.target.value as GroupLayoutOptions["minColumnWidthUnit"], minColumnWidth: event.target.value === "px" ? 192 : 12 })}>{["px", "em", "rem", "vw"].map(unit => <option key={unit}>{unit}</option>)}</select></label></> : null}
        <p className="setting-note">Auto fits columns to the available width. Manual uses the selected column count.</p>
      </> : <div className="inspector-two-column">
        <label><span>{row ? "Justification" : "Horizontal alignment"}</span><select value={block.horizontalAlign ?? ""} onChange={event => update({ horizontalAlign: (event.target.value || undefined) as LayoutBlock["horizontalAlign"] })}><option value="">Default</option>{horizontalAlignments.map(value => <option value={value} key={value}>{value === "centre" ? "Centre" : value === "space-between" ? "Space between" : value.charAt(0).toUpperCase() + value.slice(1)}</option>)}</select></label>
        <label><span>{row ? "Vertical alignment" : "Justification"}</span><select value={block.verticalAlign ?? ""} onChange={event => update({ verticalAlign: (event.target.value || undefined) as LayoutBlock["verticalAlign"] })}><option value="">Default</option>{verticalAlignments.map(value => <option value={value} key={value}>{value === "centre" ? "Centre" : value === "space-between" ? "Space between" : value.charAt(0).toUpperCase() + value.slice(1)}</option>)}</select></label>
      </div>}
      {row ? <label className="checkbox-setting"><input type="checkbox" checked={block.allowWrap !== false} onChange={event => update({ allowWrap: event.target.checked })} /><span>Allow wrapping to multiple lines</span></label> : null}
    </InspectorAccordionSection>;
  }
  const controls = <>
      {block.type === "section" ? <label>
        <span>Arrangement</span>
        <select value={block.layout} onChange={(event) => update({ layout: event.target.value as LayoutMode })}>
          <option value="stack">Stack</option><option value="row">Row</option><option value="columns">Columns</option><option value="grid">Grid</option>
        </select>
      </label> : null}
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
        <LayoutSpacingSetting label="Horizontal gap" value={block.columnGap ?? block.gap} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.gap[0]} max={LAYOUT_VALUE_LIMITS.gap[1]} onChange={(columnGap) => update({ columnGap })} />
        <LayoutSpacingSetting label="Vertical gap" value={block.rowGap ?? block.gap} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.gap[0]} max={LAYOUT_VALUE_LIMITS.gap[1]} onChange={(rowGap) => update({ rowGap })} />
        <LayoutSpacingSetting label="Horizontal padding" value={block.paddingX} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.padding[0]} max={LAYOUT_VALUE_LIMITS.padding[1]} onChange={(paddingX) => update({ paddingX })} />
        <LayoutSpacingSetting label="Vertical padding" value={block.paddingY} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.padding[0]} max={LAYOUT_VALUE_LIMITS.padding[1]} onChange={(paddingY) => update({ paddingY })} />
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
      {block.type === "section" ? <p className="setting-note">{note}</p> : null}
  </>;
  return <InspectorAccordionSection title={`${heading} layout`}>{controls}</InspectorAccordionSection>;
}

function LayoutGapsInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "columns" }>; onChange: (block: ContentBlock) => void }) {
  return <fieldset className="group-layout-dimension-group"><legend>Block spacing</legend>{(["columnGap", "rowGap"] as const).map((field, index) => <LayoutSpacingSetting key={field} label={index ? "Vertical gap" : "Horizontal gap"} value={block[field] ?? block.gap} presets={LAYOUT_SPACING_PRESETS} min={0} max={120} onChange={value => onChange({ ...block, [field]: value })} />)}</fieldset>;
}

function GroupDimensionsInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "group" }>; onChange: (block: ContentBlock) => void }) {
  const update = (changes: Partial<Extract<ContentBlock, { type: "group" }>>) => onChange({ ...block, ...changes });
  return <>
    <fieldset className="group-layout-dimension-group"><legend>Block spacing</legend><div className="inspector-two-column">
      <LayoutSpacingSetting label="Horizontal gap" value={block.columnGap ?? block.gap} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.gap[0]} max={LAYOUT_VALUE_LIMITS.gap[1]} onChange={columnGap => update({ columnGap })} />
      <LayoutSpacingSetting label="Vertical gap" value={block.rowGap ?? block.gap} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.gap[0]} max={LAYOUT_VALUE_LIMITS.gap[1]} onChange={rowGap => update({ rowGap })} />
    </div></fieldset>
  </>;
}

function GroupPositionInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "group" }>; onChange: (block: ContentBlock) => void }) {
  const [positionVisibility, setPositionVisibility] = useState(() => ({ blockId: block.id, configuredPosition: block.position, visible: Boolean(block.position) }));
  const positionVisible = positionVisibility.blockId === block.id && positionVisibility.configuredPosition === block.position
    ? positionVisibility.visible
    : Boolean(block.position);
  const visible = new Set(positionVisible ? ["position"] : []);
  return <InspectorToolsSection title="Position" options={[{ id: "position", label: "Position" }]} visible={visible} onToggle={() => setPositionVisibility({ blockId: block.id, configuredPosition: block.position, visible: !positionVisible })} onReset={() => { setPositionVisibility({ blockId: block.id, configuredPosition: block.position, visible: false }); onChange({ ...block, position: undefined }); }}>
    <label><span>Position</span><select value={block.position ?? ""} onChange={event => onChange({ ...block, position: event.target.value === "sticky" ? "sticky" : undefined })}><option value="">Default</option><option value="sticky">Sticky</option></select></label>
  </InspectorToolsSection>;
}

type ColumnsBlock = Extract<ContentBlock, { type: "columns" }>;

function ColumnsInspector({ block, onChange, onCountChange }: { block: ColumnsBlock; onChange: (block: ContentBlock) => void; onCountChange?: (count: number) => void }) {
  const update = (changes: Partial<ColumnsBlock>) => onChange({ ...block, ...changes });
  const countHelpId = useId();
  const removal = proposeColumnCountChange(block, block.children.length - 1, index => `${block.id}-proposed-column-${index}`);
  const countReason = !onCountChange ? "Column count editing is unavailable in this context." : removal.reason;
  return <InspectorAccordionSection title="Columns">
    <div className="column-count-controls"><span>Columns</span><div><button type="button" aria-label="Remove column" aria-describedby={countReason ? countHelpId : undefined} disabled={!onCountChange || block.children.length <= 1 || Boolean(removal.reason)} onClick={() => onCountChange?.(block.children.length - 1)}><AcmIcon name="action.remove" size={16} /></button><output aria-live="polite">{block.children.length}</output><button type="button" aria-label="Add column" disabled={!onCountChange || block.children.length >= 6} onClick={() => onCountChange?.(block.children.length + 1)}><AcmIcon name="action.add" size={16} /></button></div></div>
    {countReason ? <p id={countHelpId} className="setting-note">{countReason}</p> : null}
    <label className="checkbox-setting"><input type="checkbox" checked={block.stackAt !== "never"} onChange={event => update({ stackAt: event.target.checked ? block.stackAt === "never" || !block.stackAt ? "mobile" : block.stackAt : "never" })} /><span>Stack on mobile</span></label>
    <label><span>Vertical alignment</span><select value={block.verticalAlign ?? "stretch"} onChange={event => update({ verticalAlign: event.target.value as ColumnsBlock["verticalAlign"] })}><option value="top">Top</option><option value="centre">Centre</option><option value="bottom">Bottom</option><option value="stretch">Stretch</option></select></label>
    <p className="setting-note">Stack columns on mobile when the available width is limited.</p>
  </InspectorAccordionSection>;
}

function ColumnInspector({ block, onChange, onWidthChange, widthMax }: { block: ColumnBlock; onChange: (block: ContentBlock) => void; onWidthChange?: (columnId: string, width: number) => void; widthMax: number }) {
  const update = (changes: Partial<ColumnBlock>) => onChange({ ...block, ...changes });
  return <InspectorAccordionSection title="Column settings">
    <label><span>Width (%)</span><input type="number" min="5" max={widthMax} step="1" value={Math.round(block.width ?? 100)} disabled={!onWidthChange} onChange={(event) => { const width = Math.max(5, Math.min(widthMax, Number(event.target.value) || 5)); onWidthChange?.(block.id, width); }} /></label>
    <label><span>Vertical alignment</span><select value={block.verticalAlign ?? ""} onChange={event => update({ verticalAlign: (event.target.value || undefined) as ColumnBlock["verticalAlign"] })}><option value="">Use Columns setting</option><option value="top">Top</option><option value="centre">Centre</option><option value="bottom">Bottom</option><option value="stretch">Stretch</option></select></label>
    <LayoutSpacingSetting label="Block gap" value={block.rowGap ?? block.gap} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.gap[0]} max={LAYOUT_VALUE_LIMITS.gap[1]} onChange={(rowGap) => update({ rowGap })} />
    <p className="setting-note">Add and edit blocks inside this column on the canvas.</p>
  </InspectorAccordionSection>;
}

function ComponentInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "component" }>; onChange: (block: ContentBlock) => void }) {
  const data = block.data ?? {};
  const update = (key: string, value: string) => onChange({ ...block, data: { ...data, [key]: value } });
  const fields = block.component === "mini-golf-scorecard" ? [["heading", "Heading"], ["player1", "Player 1"], ["player2", "Player 2"]] : block.component === "mini-golf-leaderboard" ? [["player1", "Player 1"], ["player2", "Player 2"]] : block.component === "mini-golf-share" ? [["heading", "Heading"]] : block.component === "mini-golf-account" ? [["status", "Account status"], ["action", "Account button"]] : [];
  return <InspectorAccordionSection title={<>{block.component.replace("mini-golf-", "Mini Golf ")} component</>}><p className="setting-note">This application interface is inactive in Studio. Edit only its supported content properties.</p>{block.source ? <p className="setting-note">Source: {block.source.module} · {block.source.exportName} · {block.source.revision.slice(0, 8)}</p> : null}{fields.map(([key, label]) => <label key={key}><span>{label}</span><input value={typeof data[key] === "string" ? data[key] as string : ""} onChange={(event) => update(key, event.target.value)} /></label>)}</InspectorAccordionSection>;
}

type StyledBlock = ContentBlock;

function hasLegacyStyle(block: ContentBlock): block is Extract<ContentBlock, { type: "paragraph" | "columns" | "column" }> {
  return block.type === "paragraph" || block.type === "columns" || block.type === "column";
}

export function ParagraphInspector({ profileOverride, block, interactionState = "default", onChange, fontSizeViewMode, onFontSizeViewModeChange, backgroundImageControls, backgroundImageOptions, groupLayoutControls, groupDimensionControls, onResetGroupDimensions }: { profileOverride?: ReturnType<typeof capabilityProfileFor>; block: StyledBlock; interactionState?: ButtonInteractionState | "default"; onChange: (block: ContentBlock) => void; fontSizeViewMode: "presets" | "custom" | null; onFontSizeViewModeChange: (mode: "presets" | "custom") => void; backgroundImageControls?: ReactNode; backgroundImageOptions?: ReactNode; groupLayoutControls?: ReactNode; groupDimensionControls?: ReactNode; onResetGroupDimensions?: () => void }) {
  const baseVisualStyle = hasLegacyStyle(block) ? block.style ?? {} : block.visualStyle ?? {};
  const style: ParagraphStyle = block.type === "button" && interactionState !== "default"
    ? block.interactionStyles?.[interactionState] ?? {}
    : baseVisualStyle;
  const contrastStyle = block.type === "button" && interactionState !== "default" ? { ...baseVisualStyle, ...style } : style;
  const contrastFontSize = contrastStyle.fontSizeCustom
    ?? (contrastStyle.fontSize ? ({ small: "14px", medium: "16px", large: "20px", "x-large": "24px", "xx-large": "32px" } as const)[contrastStyle.fontSize] : undefined)
    ?? (block.type === "heading" ? ({ 1: "40px", 2: "30px", 3: "23px", 4: "20px", 5: "18px", 6: "16px" } as const)[block.level ?? 2] : undefined);
  const buttonWidth = block.type === "button"
    ? interactionState === "default" ? block.width : block.interactionStyles?.[interactionState]?.width
    : undefined;
  const profile = profileOverride ?? capabilityProfileFor(block.type);
  const visibleSource = profileOverride && profileOverride.label === "List Item" ? undefined : block.type === "document-subtitle" ? "studio" : "gutenberg";
  const styleControls = [...profile.controls, ...retainedLegacyStyleControls(profile, style)].filter(control => control.fields.length > 0 && (visibleSource === undefined || control.source === visibleSource));
  const optionsFor = (section: "typography" | "dimensions" | "border" | "elements"): InspectorToolOption[] => styleControls.filter(control => control.enabled !== false && control.section === section).map(({ id, label, source }) => ({ id, label, source }));
  const defaults = profile.defaults;
  const defaultTypography = new Set(defaults.typography ?? []);
  const defaultDimensions = new Set(defaults.dimensions ?? []);
  const defaultBorder = new Set(defaults.border ?? []);
  const defaultElements = new Set(defaults.elements ?? []);
  const [backgroundMode, setBackgroundMode] = useState<"colour" | "gradient">(style.backgroundGradient ? "gradient" : "colour");
  const fontSizeMode = fontSizeViewMode
    ? fontSizeViewMode
    : style.fontSizeCustom ? "custom" : "presets";
  const activeBackgroundMode = backgroundMode;
  const paragraphSpecificOptions = block.type === "paragraph";
  const typographyOptions = optionsFor("typography");
  const dimensionOptions = optionsFor("dimensions");
  const borderOptions = optionsFor("border");
  const elementOptions = optionsFor("elements");
  const marginLayout = ["code", "columns"].includes(block.type) ? "vertical" as const : "axes" as const;
  const [typographyUserVisible, setTypographyVisible] = useState(() => new Set<string>());
  const [dimensionsUserVisible, setDimensionsVisible] = useState(() => new Set<string>());
  const [borderUserVisible, setBorderVisible] = useState(() => new Set<string>());
  const [elementsUserVisible, setElementsVisible] = useState(() => new Set<string>());
  const scopedTypographyOptions = typographyOptions.filter(option => (visibleSource === undefined || (option.source ?? "gutenberg") === visibleSource));
  const scopedTypographyIds = new Set(scopedTypographyOptions.map(option => option.id));
  const scopedDimensionOptions = dimensionOptions.filter(option => (visibleSource === undefined || (option.source ?? "gutenberg") === visibleSource));
  const scopedDimensionIds = new Set(scopedDimensionOptions.map(option => option.id));
  const scopedBorderOptions = borderOptions.filter(option => (visibleSource === undefined || (option.source ?? "gutenberg") === visibleSource));
  const scopedBorderIds = new Set(scopedBorderOptions.map(option => option.id));
  const typographyVisible = new Set([...defaultTypography, ...typographyUserVisible, ...[
    style.textColor && "colour", (style.fontSize || style.fontSizeCustom) && "size", style.appearance && "appearance", style.fontFamily && "family", style.textShadow && "text-shadow",
    style.lineHeight && "line-height", style.letterSpacing && "letter-spacing", style.textIndent && "line-indent",
    style.textColumns && "columns", style.textDecoration && "decoration", style.textTransform && "letter-case", style.dropCap && "drop-cap", style.fitText && "fit-text", style.orientation && "orientation",
  ].filter((value): value is string => Boolean(value) && scopedTypographyIds.has(value as string))]);
  const dimensionsVisible = new Set([...defaultDimensions, ...[...dimensionsUserVisible, ...[style.padding && "padding", style.margin && "margin", style.minHeight && "min-height", style.minWidth && "min-width", block.type === "button" && buttonWidth && "width"].filter((value): value is string => Boolean(value))].filter(id => scopedDimensionIds.has(id))]);
  const borderVisible = new Set([...defaultBorder, ...borderUserVisible, ...[
    (style.borderStyle || style.borderColor || style.borderWidth) && "border",
    style.borderRadius && "radius", style.shadow && "shadow",
  ].filter((value): value is string => Boolean(value) && scopedBorderIds.has(value as string))]);
  const scopedElementOptions = elementOptions.filter(option => (visibleSource === undefined || (option.source ?? "gutenberg") === visibleSource));
  const scopedElementIds = new Set(scopedElementOptions.map(option => option.id));
  const elementsVisible = new Set([...defaultElements, ...elementsUserVisible, ...[style.linkColor && "link-colour", style.linkHoverColor && "link-colour"].filter((value): value is string => Boolean(value) && scopedElementIds.has(value as string))]);
  const dropCapDisabled = block.type === "paragraph" && (block.align === "centre" || block.align === "right");
  const optionalTypographyOptions = scopedTypographyOptions.filter(option => !defaultTypography.has(option.id));
  const paragraphHasExplicitFontSize = Boolean(style.fontSize || style.fontSizeCustom);
  const paragraphMenuOptions: InspectorMenuOption[] = [
    ...(defaultTypography.has("colour") ? [{ id: style.textColor ? "reset-colour" : "colour", label: style.textColor ? "Reset Colour" : "Colour", checked: !style.textColor, disabled: !style.textColor }] : []),
    ...(defaultTypography.has("size") ? [{ id: paragraphHasExplicitFontSize ? "reset-size" : "size", label: paragraphHasExplicitFontSize ? "Reset Size" : "Size", checked: !paragraphHasExplicitFontSize, disabled: !paragraphHasExplicitFontSize }] : []),
  ];
  const typographyMenuOptions = optionalTypographyOptions;
  const optionalDimensionOptions = scopedDimensionOptions.filter(option => !defaultDimensions.has(option.id));
  const optionalBorderOptions = scopedBorderOptions.filter(option => !defaultBorder.has(option.id));
  const optionalElementOptions = scopedElementOptions.filter(option => !defaultElements.has(option.id));
  const backgroundControl = profile.controls.find(control => control.id === "background");
  const showBackground = backgroundControl && (visibleSource === undefined || backgroundControl.source === visibleSource);
  function writeStyle(nextStyle: ParagraphStyle) {
    const updatedStyle = Object.keys(nextStyle).length ? nextStyle : undefined;
    if (block.type === "button" && interactionState !== "default") {
      const interactionStyles = { ...(block.interactionStyles ?? {}) };
      if (updatedStyle) interactionStyles[interactionState] = updatedStyle;
      else delete interactionStyles[interactionState];
      onChange({ ...block, interactionStyles: Object.keys(interactionStyles).length ? interactionStyles : undefined });
    } else onChange(hasLegacyStyle(block) ? { ...block, style: updatedStyle } : { ...block, visualStyle: updatedStyle });
  }
  function clearTools(ids: Iterable<string>, resetGroupLayout = false) {
    const selectedIds = [...ids];
    const nextStyle = resetSupportedInspectorStyleFields(style, selectedIds, styleControls);
    if (block.type === "group" && (resetGroupLayout || selectedIds.includes("padding"))) {
      onChange(resetGroupDimensionFields(block, nextStyle, { padding: selectedIds.includes("padding"), layout: resetGroupLayout }));
      return;
    }
    if (block.type === "columns" && resetGroupLayout) {
      onChange({ ...block, style: Object.keys(nextStyle).length ? nextStyle : undefined, gap: undefined, columnGap: undefined, rowGap: undefined, paddingX: undefined, paddingY: undefined });
      return;
    }
    if (block.type !== "button") {
      writeStyle(nextStyle);
      return;
    }
    const interactionStyles = { ...(block.interactionStyles ?? {}) };
    if (interactionState === "default") {
      onChange({ ...block, width: selectedIds.includes("width") ? undefined : block.width, visualStyle: Object.keys(nextStyle).length ? nextStyle : undefined });
      return;
    }
    if (Object.keys(nextStyle).length) interactionStyles[interactionState] = nextStyle;
    else delete interactionStyles[interactionState];
    onChange({ ...block, interactionStyles: Object.keys(interactionStyles).length ? interactionStyles : undefined });
  }
  function toggleTool(id: string, visible: Set<string>, setVisible: (value: Set<string>) => void) {
    const next = new Set(visible);
    if (next.has(id)) { next.delete(id); clearTools([id]); }
    else next.add(id);
    setVisible(next);
  }
  function updateStyle<K extends keyof ParagraphStyle>(field: K, value: ParagraphStyle[K] | undefined) {
    const nextStyle: ParagraphStyle = { ...style };
    if (value === undefined || value === "") delete nextStyle[field];
    else nextStyle[field] = value;
    writeStyle(nextStyle);
  }
  function updateFitText(enabled: boolean) {
    writeStyle(setInspectorFitText(style, enabled));
  }
  function updateFontSize(value: ParagraphFontSize | string | undefined, mode: "presets" | "custom") {
    onFontSizeViewModeChange(mode);
    writeStyle(setInspectorFontSize(style, value, mode));
  }
  function updateBackground(backgroundColor: string | undefined, backgroundGradient: ParagraphBackgroundGradient | undefined) {
    const nextStyle = { ...style };
    if (backgroundColor) nextStyle.backgroundColor = backgroundColor;
    else delete nextStyle.backgroundColor;
    if (backgroundGradient) nextStyle.backgroundGradient = backgroundGradient;
    else delete nextStyle.backgroundGradient;
    writeStyle(nextStyle);
  }
  const sharedStyleSectionContent: Record<string, ReactNode> = {
    typography: <InspectorToolsSection title="Typography" options={typographyMenuOptions} visible={typographyVisible} canReset={optionalTypographyOptions.some(option => typographyVisible.has(option.id)) || inspectorStyleHasValues(style, typographyVisible, styleControls)} menuOptions={paragraphMenuOptions} onMenuOptionSelect={id => { if (id === "reset-size") updateFontSize(undefined, "presets"); else if (id === "reset-colour") updateStyle("textColor", undefined); }} onToggle={id => toggleTool(id, typographyVisible, setTypographyVisible)} onReset={() => { clearTools(typographyVisible); setTypographyVisible(new Set()); }}>
      {typographyVisible.has("colour") ? <PaletteColourSetting label="Colour" row value={style.textColor} onChange={(value) => updateStyle("textColor", value)} /> : null}
      {(typographyVisible.has("size") || typographyVisible.has("appearance")) ? <FontSizeAppearanceSetting size={style.fontSize} customSize={style.fontSizeCustom} appearance={style.appearance} mode={fontSizeMode} onModeChange={onFontSizeViewModeChange} onSizeChange={value => updateFontSize(value, "presets")} onCustomSizeChange={value => updateFontSize(value, "custom")} onAppearanceChange={value => updateStyle("appearance", value)} paragraphLabels={paragraphSpecificOptions || ["heading", "list", "quote", "table", "code"].includes(block.type)} showSize={typographyVisible.has("size")} showAppearance={typographyVisible.has("appearance")} /> : null}
      {typographyVisible.has("family") ? <label><span>Font family</span><select value={style.fontFamily ?? ""} onChange={(event) => updateStyle("fontFamily", (event.target.value || undefined) as ParagraphStyle["fontFamily"])}><option value="">Default</option><option value="inter">Inter</option><option value="helvetica-neue">Helvetica Neue</option><option value="helvetica">Helvetica</option><option value="arial">Arial</option></select></label> : null}
      {typographyVisible.has("line-height") ? <LineHeightSetting value={style.lineHeight} onChange={value => updateStyle("lineHeight", value)} /> : null}
      {typographyVisible.has("letter-spacing") ? <label><span>Letter spacing</span><input value={style.letterSpacing ?? ""} onChange={(event) => updateStyle("letterSpacing", event.target.value)} placeholder="0" /></label> : null}
      {typographyVisible.has("line-indent") ? <ParagraphLengthSetting key={`${block.id}-indent`} label="Line indent" value={style.textIndent} min={-100} max={200} onChange={(value) => updateStyle("textIndent", value)} /> : null}
      {typographyVisible.has("columns") ? <label><span>Columns</span><select value={style.textColumns ?? ""} onChange={(event) => updateStyle("textColumns", event.target.value ? Number(event.target.value) : undefined)}><option value="">Default</option>{[1, 2, 3, 4].map(count => <option key={count} value={count}>{count}</option>)}</select></label> : null}
      {typographyVisible.has("decoration") ? <label><span>Decoration</span><select value={style.textDecoration ?? ""} onChange={(event) => updateStyle("textDecoration", (event.target.value || undefined) as ParagraphStyle["textDecoration"])}><option value="">Default</option><option value="none">None</option><option value="underline">Underline</option><option value="line-through">Strikethrough</option></select></label> : null}
      {typographyVisible.has("orientation") ? <label><span>Orientation</span><select value={style.orientation ?? ""} onChange={event => updateStyle("orientation", (event.target.value || undefined) as ParagraphStyle["orientation"])}><option value="">Default</option><option value="horizontal-tb">Horizontal</option><option value="vertical-rl">Vertical</option></select></label> : null}
      {typographyVisible.has("letter-case") ? <label><span>Letter case</span><select value={style.textTransform ?? ""} onChange={(event) => updateStyle("textTransform", (event.target.value || undefined) as ParagraphStyle["textTransform"])}><option value="">Default</option><option value="none">Normal</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option><option value="capitalize">Capitalise</option></select></label> : null}
      {typographyVisible.has("drop-cap") ? <ToggleSetting label={<>Drop cap{dropCapDisabled ? <small className="inspector-setting-help">Not available for aligned text.</small> : null}</>} checked={Boolean(style.dropCap)} disabled={dropCapDisabled} onChange={enabled => updateStyle("dropCap", enabled || undefined)} /> : null}
      {typographyVisible.has("fit-text") ? <ToggleSetting label={<>Fit text{style.fitText && style.orientation === "vertical-rl" ? " (paused for vertical text)" : ""}</>} checked={Boolean(style.fitText)} onChange={updateFitText} /> : null}
      {typographyVisible.has("text-shadow") ? <label><span>Text shadow</span><select value={style.textShadow ?? ""} onChange={event => updateStyle("textShadow", (event.target.value || undefined) as ParagraphStyle["textShadow"])}><option value="">Default</option><option value="none">None</option><option value="soft">Soft</option><option value="strong">Strong</option></select></label> : null}
    </InspectorToolsSection>,
    background: showBackground ? <GroupBackgroundSection group canReset={inspectorStyleHasValues(style, ["background"], styleControls)} onReset={() => writeStyle(resetSupportedInspectorStyleFields(style, ["background"], styleControls))}>
      <BackgroundSelection imageControl={backgroundImageControls} mode={activeBackgroundMode} colour={style.backgroundColor} gradient={style.backgroundGradient} textColour={contrastStyle.textColor} fontSize={contrastFontSize} fontWeight={contrastStyle.appearance?.replace(/-italic$/, "")} assessTextContrast={["paragraph", "heading", "quote", "list", "table", "button"].includes(block.type)} hasBackgroundImage={Boolean(style.backgroundImageMediaId)} onModeChange={setBackgroundMode} onColourChange={value => updateBackground(value, undefined)} onGradientChange={value => updateBackground(undefined, value)} />
      {backgroundImageOptions}
      {style.backgroundGradient ? <button type="button" className="paragraph-reset-button" onClick={() => { updateBackground(style.backgroundColor, undefined); setBackgroundMode("colour"); }}>Reset background</button> : null}
    </GroupBackgroundSection> : null,
    dimensions: <InspectorToolsSection title="Dimensions" options={optionalDimensionOptions} visible={dimensionsVisible} canReset={optionalDimensionOptions.some(option => dimensionsVisible.has(option.id)) || inspectorStyleHasValues(style, dimensionsVisible, styleControls) || Boolean((block.type === "group" || block.type === "columns") && (block.paddingX !== undefined || block.paddingY !== undefined || block.gap !== undefined || block.rowGap !== undefined || block.columnGap !== undefined))} alwaysShow={Boolean(groupDimensionControls)} onToggle={id => toggleTool(id, dimensionsVisible, setDimensionsVisible)} onReset={() => { clearTools(dimensionsVisible, true); if (block.type !== "group" && block.type !== "columns") onResetGroupDimensions?.(); setDimensionsVisible(new Set()); }}>
      {block.type === "button" && dimensionsVisible.has("width") ? <label><span>Width</span><select aria-label="Button width" value={buttonWidth ?? ""} onChange={event => {
        const width = event.target.value ? Number(event.target.value) as ButtonWidth : undefined;
        if (interactionState === "default") onChange({ ...block, width });
        else {
          const interactionStyles = { ...(block.interactionStyles ?? {}) };
          const nextStateStyle = { ...(interactionStyles[interactionState] ?? {}) };
          if (width) nextStateStyle.width = width;
          else delete nextStateStyle.width;
          if (Object.keys(nextStateStyle).length) interactionStyles[interactionState] = nextStateStyle;
          else delete interactionStyles[interactionState];
          onChange({ ...block, interactionStyles: Object.keys(interactionStyles).length ? interactionStyles : undefined });
        }
      }}><option value="">Auto</option><option value="25">25%</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option></select></label> : null}
      {dimensionsVisible.has("padding") ? <BoxLengthSetting key={`${block.id}-padding`} label="Padding" value={style.padding ?? (block.type === "group" && (block.paddingX !== undefined || block.paddingY !== undefined) ? `${block.paddingY ?? 0}px ${block.paddingX ?? 0}px` : undefined)} layout="all" presets={LAYOUT_SPACING_PRESETS} min={0} max={160} onChange={value => { if (block.type === "group") { const next = { ...style, padding: value }; if (!value) delete next.padding; onChange({ ...block, paddingX: undefined, paddingY: undefined, visualStyle: Object.keys(next).length ? next : undefined }); } else updateStyle("padding", value); }} /> : null}
      {dimensionsVisible.has("margin") ? <BoxLengthSetting key={`${block.id}-margin`} label="Margin" value={style.margin} layout={block.type === "group" || ["paragraph", "heading", "list", "quote", "table"].includes(block.type) ? "all" : marginLayout} presets={LAYOUT_SPACING_PRESETS} min={-100} max={200} onChange={(value) => updateStyle("margin", value)} /> : null}
      {dimensionsVisible.has("min-height") ? <ParagraphLengthSetting key={`${block.id}-min-height`} label="Minimum height" value={style.minHeight} min={0} max={4000} onChange={(value) => updateStyle("minHeight", value)} /> : null}
      {dimensionsVisible.has("min-width") ? <ParagraphLengthSetting key={`${block.id}-min-width`} label="Minimum width" value={style.minWidth} min={0} max={4000} onChange={(value) => updateStyle("minWidth", value)} /> : null}
      {groupDimensionControls}
    </InspectorToolsSection>,
    border: <InspectorToolsSection title="Border" options={optionalBorderOptions} visible={borderVisible} canReset={optionalBorderOptions.some(option => borderVisible.has(option.id)) || inspectorStyleHasValues(style, borderVisible, styleControls)} onToggle={id => toggleTool(id, borderVisible, setBorderVisible)} onReset={() => { clearTools(borderVisible); setBorderVisible(new Set()); }}>
      {borderVisible.has("border") ? <BorderSettings style={style} compact idPrefix={block.id} includeRadius={false} includeShadow={false} onChange={changes => { const nextStyle = { ...style, ...changes }; for (const key of Object.keys(nextStyle) as (keyof ParagraphStyle)[]) if (!nextStyle[key]) delete nextStyle[key]; writeStyle(nextStyle); }} /> : null}
      {borderVisible.has("radius") ? <BoxLengthSetting key={`${block.id}-radius`} label="Radius" value={style.borderRadius} layout="all" corners min={0} max={100} onChange={value => updateStyle("borderRadius", value)} /> : null}
      {borderVisible.has("shadow") ? <label><span>Shadow</span><select value={style.shadow ?? ""} onChange={(event) => updateStyle("shadow", (event.target.value || undefined) as ParagraphStyle["shadow"])}><option value="">Default</option><option value="none">None</option><option value="soft">Soft</option><option value="strong">Strong</option></select></label> : null}
    </InspectorToolsSection>,
    elements: elementOptions.length ? <InspectorToolsSection title="Elements" options={optionalElementOptions} visible={elementsVisible} onToggle={id => toggleTool(id, elementsVisible, setElementsVisible)} onReset={() => { clearTools(elementsVisible); setElementsVisible(new Set()); }}>
      {elementsVisible.has("link-colour") ? <LinkColourSetting style={style} defaultValue={style.linkColor} hoverValue={style.linkHoverColor} onDefaultChange={value => updateStyle("linkColor", value)} onHoverChange={value => updateStyle("linkHoverColor", value)} /> : null}
    </InspectorToolsSection> : null,
  };
  const orderedSharedStyleSections = scopedStyleSectionIds(profile, style, visibleSource)
    .filter(sectionId => sectionId in sharedStyleSectionContent)
    .flatMap(sectionId => [<Fragment key={sectionId}>{sharedStyleSectionContent[sectionId]}</Fragment>, ...(sectionId === "background" && groupLayoutControls ? [<Fragment key="group-layout">{groupLayoutControls}</Fragment>] : [])]);
  return <div className={`inspector-sections${block.type === "group" ? " group-block-inspector" : ""}`}>{orderedSharedStyleSections}</div>;
}

type ManagedBackgroundImageBlock = Extract<ContentBlock, { type: "quote" | "group" | "heading" | "code" | "document-title" }>;

function ManagedBackgroundImageInspector({ block, onChange, onOpenBackgroundMedia, embedded = false, detailsOnly = false }: {
  block: ManagedBackgroundImageBlock;
  onChange: (block: ContentBlock) => void;
  onOpenBackgroundMedia?: () => void;
  embedded?: boolean;
  detailsOnly?: boolean;
}) {
  const style = block.visualStyle ?? {};
  function updateStyle<K extends keyof ParagraphStyle>(field: K, value: ParagraphStyle[K] | undefined) {
    const next = { ...style };
    if (value === undefined || value === "") delete next[field];
    else next[field] = value;
    onChange({ ...block, visualStyle: Object.keys(next).length ? next : undefined });
  }
  const controls = <>
    {!detailsOnly && onOpenBackgroundMedia ? <button type="button" className={embedded ? "paragraph-background-option group-background-image" : "choose-media-button"} aria-label={style.backgroundImageMediaId ? "Replace background image" : "Choose background image"} onClick={onOpenBackgroundMedia}>{embedded ? <><span className="paragraph-background-mode-swatch is-image" aria-hidden="true" />Image</> : style.backgroundImageMediaId ? "Replace background image" : "Choose background image"}</button> : null}
    {!embedded && style.backgroundImageMediaId ? <>
      <button type="button" className="paragraph-reset-button" onClick={() => updateStyle("backgroundImageMediaId", undefined)}>Remove background image</button>
      <label><span>Image size</span><select value={style.backgroundSize ?? "cover"} onChange={event => updateStyle("backgroundSize", event.target.value as ParagraphStyle["backgroundSize"])}><option value="cover">Cover</option><option value="contain">Contain</option><option value="fixed">Fixed size</option></select></label>
      {style.backgroundSize === "fixed" ? <label><span>Image width ({style.backgroundFixedSize ?? 200}px)</span><input className="studio-range-control" aria-label="Background image width" type="range" min="50" max="2000" step="10" value={style.backgroundFixedSize ?? 200} onChange={event => updateStyle("backgroundFixedSize", Number(event.target.value))} /></label> : null}
      <ToggleSetting label="Repeat background image" checked={style.backgroundRepeat ? style.backgroundRepeat === "repeat" : style.backgroundSize === "fixed"} onChange={enabled => updateStyle("backgroundRepeat", enabled ? "repeat" : "no-repeat")} />
      <FocalPositionSetting x={style.backgroundPositionX} y={style.backgroundPositionY} onXChange={value => updateStyle("backgroundPositionX", value)} onYChange={value => updateStyle("backgroundPositionY", value)} presentation="range" label="Background image focal position" />
    </> : null}
  </>;
  return embedded || detailsOnly ? controls : <InspectorAccordionSection title="Managed background image">{controls}</InspectorAccordionSection>;
}


function LinkColourSetting({ style, defaultValue, hoverValue, onDefaultChange, onHoverChange }: {
  style: ParagraphStyle;
  defaultValue?: string;
  hoverValue?: string;
  onDefaultChange: (value: string | undefined) => void;
  onHoverChange: (value: string | undefined) => void;
}) {
  const defaultWarning = paragraphLinkColourHasPoorContrast(defaultValue, style, UNIVERSAL_STYLE_PRESET.palette.surface) === true;
  const hoverWarning = paragraphLinkColourHasPoorContrast(hoverValue, style, UNIVERSAL_STYLE_PRESET.palette.surface) === true;
  const warningDescriptionId = useId();
  const warningStates = [defaultWarning && "Default", hoverWarning && "Hover"].filter(Boolean).join(" and ");
  return <PaletteColourSetting row label="Link" value={defaultValue} onChange={onDefaultChange} hoverValue={hoverValue} onHoverChange={onHoverChange} warningStates={warningStates} warningDescriptionId={warningDescriptionId} defaultWarning={defaultWarning} hoverWarning={hoverWarning} />;
}


function GroupBackgroundSection({ group, canReset, onReset, children }: { group: boolean; canReset: boolean; onReset: () => void; children: ReactNode }) {
  return group ? <InspectorToolsSection title="Background" options={[]} visible={new Set(["background"])} canReset={canReset} alwaysShow onToggle={() => {}} onReset={onReset}>{children}</InspectorToolsSection> : <InspectorAccordionSection className="inspector-panel" title="Background">{children}</InspectorAccordionSection>;
}
