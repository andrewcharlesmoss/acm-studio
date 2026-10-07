"use client";
import { GroupLayoutControls } from "../group-layout-controls";
import { changeGroupLayout, groupVariationFor } from "../group-variations";

import { AdvancedFieldsControl, type AdvancedFields } from "../../controls/advanced-fields-control";
import { useEffect, useId, useState, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import { GROUP_ALLOWED_BLOCK_TYPES } from "../../../content/model";
import type { ButtonInteractionState, ColumnBlock, ContentBlock, GroupAllowedBlockType, DocumentTitleLevel, ListItemSelection, ParagraphBackgroundGradient, ParagraphStyle, PostDateFormat, SiteSectionRole, SpacerUnit, TextAlignment } from "../../../content/model";
import type { LayoutMode } from "../../../content/model";
import { LAYOUT_SPACING_PRESETS, LAYOUT_VALUE_LIMITS } from "../../../content/layout";
import { blockCatalogue } from "../../editor-model";
import { BlockLibraryIcon } from "../../block-library-icons";
import { HeadingLevelIcon, HeadingLevelSetting } from "../../controls/heading-level-setting";
import { PaneTabPanel, PaneTabs } from "../../panes/pane-components";
import { InspectorAccordionSection } from "../../inspector-accordion";
import { InspectorToolsSection } from "../../inspector-tools-section";
import { BoxLengthSetting } from "../../box-length-setting";
import { proposeColumnCountChange } from "../../columns-count-change";
import { SPACER_SIZE_LIMIT, SPACER_UNITS, type SpacerOrientation } from "../../../content/spacer";
import { safeTextLink } from "../../../content/rich-text";
import { BackgroundSelection } from "../../controls/background-selection";
import { StyleVariationSetting } from "../../controls/style-variation-setting";
import { BorderSettings } from "../../controls/border-settings";
import { FocalPositionSetting } from "../../controls/focal-position-setting";
import { ImageDimensionsSetting } from "../../controls/image-dimensions-setting";
import { PresetNumberSetting } from "../../controls/preset-number-setting";
import { LayoutSpacingSetting } from "../../controls/layout-spacing-setting";
import { ParagraphLengthSetting } from "../../controls/paragraph-length-setting";
import { capabilityProfileFor } from "../capability-profiles";
import { ListSettingsInspector } from "../text-block-settings-inspector";
import { TableSettingsInspector } from "../table-settings-inspector";
import { ListItemInspector } from "../list-item-inspector";
import { GroupLayoutSelection } from "../group-layout-selection";
import { ParagraphInspector, ManagedBackgroundImageInspector } from "./paragraph-inspector";

function blockLabel(type: ContentBlock["type"]) {
  return type.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export type FontSizeViewMode = "presets" | "custom";

export function fontSizeModeKey(scope: string, block: ContentBlock) {
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
  const blockName = contentSlot ? "Content" : block.type === "group" ? groupVariationFor(block).label : block.type === "heading" ? `Heading ${block.level}` : blockInfo?.label ?? profile.label ?? blockLabel(block.type);
  const blockDescription = contentSlot ? "Displays the current document body in this template." : (block.type === "group" ? groupVariationFor(block).description : blockInfo?.description) ?? profile.description ?? `Configure this ${blockName.toLowerCase()} block.`;
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
    <div className="inspector-sections"><section className="inspector-block-summary"><div className="inspector-block-summary-heading"><span aria-hidden="true">{block.type === "heading" ? <HeadingLevelIcon level={block.level} /> : <BlockLibraryIcon type={block.type === "group" ? groupVariationFor(block).type : block.type} />}</span><h2>{blockName}</h2></div>{block.type === "button" ? <div className="inspector-button-state-controls"><label><span>State</span><select aria-label="Button state" value={buttonState} onChange={event => setButtonState(event.target.value as ButtonInteractionState | "default")}><option value="default">Default</option><option value="hover">Hover</option><option value="focus">Focus</option><option value="active">Active</option></select></label><label className="checkbox-setting"><input type="checkbox" checked={showButtonStatePreview} disabled={buttonState === "default"} onChange={event => setShowButtonStatePreview(event.target.checked)} /><span>Show state on canvas</span></label></div> : null}<p className="setting-note">{blockDescription}</p>{block.type === "heading" ? <HeadingLevelSetting value={block.level} onChange={level => onChange({ ...block, level })} /> : null}{block.type === "group" && !contentSlot ? <GroupLayoutSelection value={block.layout} onChange={layout => onChange(changeGroupLayout(block, layout))} /> : null}</section></div>
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
    return <GroupLayoutControls key={`${block.id}:${block.layout}`} block={block} onChange={onChange} />;
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

export type ColumnsBlock = Extract<ContentBlock, { type: "columns" }>;

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
