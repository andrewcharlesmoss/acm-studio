"use client";
import { useId, useState, type ReactNode } from "react";
import type { ButtonInteractionState, ContentBlock, ListItemSelection } from "../content/model";
import { blockCatalogue, type StudioCategory, type StudioDocument, type StudioDocumentStatus } from "./editor-model";
import { StudioIcon } from "./studio-icons";
import { BlockLibraryIcon } from "./block-library-icons";
import { Pane, PaneTabPanel, PaneTabs } from "./panes/pane-components";
import { InspectorAccordionSection } from "./inspector-accordion";
import { type FieldUsage } from "./document-fields";
import { findColumnsParent, maximumColumnWidth } from "../content/columns";
import { spacerOrientationFor } from "../content/spacer";
import { DocumentInspector, DocumentStylesInspector } from "./blocks/inspectors/document-inspector";
import { BlockInspector, type ColumnsBlock, type FontSizeViewMode } from "./blocks/inspectors/block-inspector";
export { DocumentInspector, DocumentStylesInspector } from "./blocks/inspectors/document-inspector";
export { BlockInspector, fontSizeModeKey, type ColumnsBlock, type FontSizeViewMode } from "./blocks/inspectors/block-inspector";
export { ParagraphInspector } from "./blocks/inspectors/paragraph-inspector";

export type StudioInspectorProps = {
  paneWidth?: number;
  onPaneWidthChange?: (width: number) => void;
  paneCollapsed?: boolean;
  onPaneCollapsedChange?: (collapsed: boolean) => void;
  documentControls?: ReactNode;
  siteContext?: boolean;
  writable?: boolean;
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

export function StudioInspector({ siteContext = false, writable = true, paneWidth = 300, onPaneWidthChange, paneCollapsed, onPaneCollapsedChange, documentControls, inspectorTab, selectedBlock, selectedListItem = null, selectedDocumentField = null, activeDocument, pages, categories, tagSuggestions, canDelete, canDuplicate = true, canOpenFiles = true, allowedStatuses, allowedPageTemplates, onSelectTab, onDocumentChange, onCategorySelectionChange, onAddCategory, onBlockChange, onColumnWidthChange, onColumnCountChange, onButtonPreviewChange, onOpenFiles, onOpenBackgroundMedia, onOpenCoverMediaLibrary, onRemoveCoverImage, onPublish, onUnpublish, onDuplicate, onDelete, resolvedDocument, hasTemplate = false, fieldUsage, onFieldOverride, onSaveAsTemplate }: StudioInspectorProps) {
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
      <fieldset disabled={!writable} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>{tabs.map((panel) => <PaneTabPanel key={panel} id={tabPrefix} tab={panel} active={inspectorTab}>
        {panel === "document" || panel === "studio" ? (
          <DocumentInspector siteContext={siteContext} key={activeDocument.id} panel={panel} documentControls={documentControls} document={activeDocument} resolvedDocument={resolvedDocument ?? activeDocument} categories={categories} tagSuggestions={tagSuggestions} onCategorySelectionChange={onCategorySelectionChange} onAddCategory={onAddCategory} hasTemplate={hasTemplate} fieldUsage={fieldUsage} onFieldOverride={onFieldOverride} onSaveAsTemplate={onSaveAsTemplate} pages={pages} onOpenCoverMediaLibrary={onOpenCoverMediaLibrary} onRemoveCoverImage={onRemoveCoverImage} onChange={onDocumentChange} onPublish={onPublish} onUnpublish={onUnpublish} onDuplicate={onDuplicate} onDelete={onDelete} canDelete={canDelete} canDuplicate={canDuplicate} allowedStatuses={allowedStatuses} allowedPageTemplates={allowedPageTemplates} />
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
      </PaneTabPanel>)}</fieldset>
    </Pane>
  );
}
