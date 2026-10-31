"use client";
import { changeButtonsJustification, buttonsVerticalAlignment } from "../../../content/buttons-alignment";
import { useImageDuotoneInheritance } from "../../use-image-duotone-inheritance";
import { DuotoneControl } from "../../controls/duotone-control";
import { GroupAllowedBlocksControl } from "../../controls/group-allowed-blocks";

import { textStyleVariation, setTextStyleVariation, type TextStyleVariation } from "../../../content/text-style-variations";

import { CheckboxControl } from "../../controls/checkbox-control";
import { ImageLinkSettings } from "../../controls/image-link-settings";
import { NumberInput, SelectControl, TextArea, TextInput } from "../../controls/native-fields";
import { useResponsiveStyleScope } from "../../responsive-style-context";
import { GroupLayoutControls } from "../group-layout-controls";
import { changeGroupLayout, groupVariationFor } from "../group-variations";

import { AdvancedFieldsControl, type AdvancedFields } from "../../controls/advanced-fields-control";
import { useEffect, useId, useState, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import type { ButtonInteractionState, ColumnBlock, ColumnWidthUnit, ContentBlock, DocumentTitleLevel, ListItemSelection, ParagraphBackgroundGradient, ParagraphStyle, PostDateFormat, SiteSectionRole, SpacerUnit, TextAlignment } from "../../../content/model";
import { NumberUnitField } from "../../controls/number-unit-field";
import type { LayoutMode } from "../../../content/model";
import { LAYOUT_SPACING_PRESETS, LAYOUT_VALUE_LIMITS } from "../../../content/layout";
import { blockCatalogue, FEATURED_IMAGE_LABEL } from "../../editor-model";
import { BlockLibraryIcon } from "../../block-library-icons";
import { HeadingLevelIcon, HeadingLevelSetting } from "../../controls/heading-level-setting";
import { PaneTabPanel, PaneTabs } from "../../panes/pane-components";
import { InspectorAccordionSection, useInspectorContentDisabled } from "../../inspector-accordion";
import { InspectorToolsSection } from "../../inspector-tools-section";
import { BoxLengthSetting } from "../../box-length-setting";
import { proposeColumnCountChange } from "../../columns-count-change";
import { SPACER_SIZE_LIMIT, SPACER_UNITS, type SpacerOrientation } from "../../../content/spacer";
import { safeTextLink } from "../../../content/rich-text";
import { dailymotionPlayerId, withDailymotionPlayerId } from "../../../content/embed-provider";
import { oEmbedRequest } from "../../../content/embed-oembed";
import { coreSocialServiceLabel, socialIconTypeLabel, socialServiceHref, socialServiceInsertType } from "../../../content/social-services";
import { validAuthorProfileUrl } from "../../../content/author-profile-presentation";
import { coverVideoBackground, coverVideoBackgroundFromWordPressTv, validNativeCoverVideoSource } from "../../../content/cover-block";
import { safeVideoSource } from "../../../content/video-block";
import { BackgroundSelection } from "../../controls/background-selection";
import { RangeControl } from "../../controls/range-control";
import { StyleVariationSetting } from "../../controls/style-variation-setting";
import { BorderSettings } from "../../controls/border-settings";
import { FocalPositionSetting } from "../../controls/focal-position-setting";
import { ImageDimensionsSetting } from "../../controls/image-dimensions-setting";
import { ImageResolutionSetting, useImageResolutionChoices } from "../../controls/image-resolution-setting";
import { PresetNumberSetting } from "../../controls/preset-number-setting";
import { LayoutSpacingSetting } from "../../controls/layout-spacing-setting";
import { ParagraphLengthSetting } from "../../controls/paragraph-length-setting";
import { capabilityProfileFor } from "../capability-profiles";
import { ListSettingsInspector } from "../text-block-settings-inspector";
import { TableSettingsInspector } from "../table-settings-inspector";
import { ListItemInspector } from "../list-item-inspector";
import { ListContentInspector } from "../list-content-inspector";
import { validListItemSelection } from "../../list-structure";
import { GroupLayoutSelection } from "../group-layout-selection";
import { ParagraphInspector, ManagedBackgroundImageInspector } from "./paragraph-inspector";

import type { ListItemBackgroundTarget } from "../../list-item-background";

function blockLabel(type: ContentBlock["type"]) {
  if (type === "cover-image") return FEATURED_IMAGE_LABEL;
  if (type === "time-to-read") return "Time to Read";
  if (type === "social-link") return "Social Link";
  return type.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export type FontSizeViewMode = "presets" | "custom";

export function fontSizeModeKey(scope: string, block: ContentBlock) {
  return JSON.stringify([scope, block.id, block.type]) ?? "";
}

export function BlockInspector({ contentSlot = false, block, selectedListItem = null, canSetSticky = false, spacerOrientation = "vertical", flexItemParent = false, gridItemParent = false, onChange, onButtonPreviewChange, onColumnWidthChange, onColumnWidthUnitChange, onColumnCountChange, columnWidthMax = 95, onOpenFiles, onOpenBackgroundMedia, canOpenFiles, fontSizeModeScope, fontSizeViewModes, onFontSizeViewModeChange }: { contentSlot?: boolean; block: ContentBlock; selectedListItem?: ListItemSelection | null; canSetSticky?: boolean; spacerOrientation?: SpacerOrientation; flexItemParent?: boolean; gridItemParent?: boolean; onChange: (block: ContentBlock) => void; onButtonPreviewChange?: (preview: { blockId: string; state: ButtonInteractionState } | null) => void; onColumnWidthChange?: (columnId: string, width: number) => void; onColumnWidthUnitChange?: (columnId: string, width: number, unit: ColumnWidthUnit) => void; columnWidthMax?: number; onColumnCountChange?: (count: number) => void; onOpenFiles: (trigger?: HTMLElement) => void; onOpenBackgroundMedia?: (item?: ListItemBackgroundTarget) => void; canOpenFiles: boolean; fontSizeModeScope: string; fontSizeViewModes: Record<string, FontSizeViewMode>; onFontSizeViewModeChange: (key: string, mode: FontSizeViewMode) => void }) {
  const { editingViewport } = useResponsiveStyleScope();
  const [buttonState, setButtonState] = useState<ButtonInteractionState | "default">("default");
  const [showButtonStatePreview, setShowButtonStatePreview] = useState(true);
  const tableInspectorId = useId();
  const [tableTabSelection, setTableTabSelection] = useState({ blockId: block.id, tab: "settings" });
  const tableTab = tableTabSelection.blockId === block.id ? tableTabSelection.tab : "settings";
  const listInspectorId = useId();
  const [listTabSelection, setListTabSelection] = useState({ blockId: block.id, tab: "content" });
  const listTab = listTabSelection.blockId === block.id ? listTabSelection.tab : "content";
  useEffect(() => {
    onButtonPreviewChange?.(block.type === "button" && buttonState !== "default" && showButtonStatePreview ? { blockId: block.id, state: buttonState } : null);
    return () => onButtonPreviewChange?.(null);
  }, [block.id, block.type, buttonState, showButtonStatePreview, onButtonPreviewChange]);
  const selectedFontSizeModeKey = fontSizeModeKey(fontSizeModeScope, block);
  const profile = capabilityProfileFor(contentSlot ? "template-content" : block.type);
  const blockInfo = blockCatalogue.find((item) => item.type === block.type);
  const blockName = contentSlot ? "Content" : block.type === "social-link" ? socialIconTypeLabel(block) : block.type === "group" ? groupVariationFor(block).label : block.type === "heading" ? `Heading ${block.level}` : blockInfo?.label ?? profile.label ?? blockLabel(block.type);
  const blockDescription = contentSlot ? "Displays the current document body in this template." : (block.type === "group" ? groupVariationFor(block).description : blockInfo?.description) ?? profile.description ?? `Configure this ${blockName.toLowerCase()} block.`;
  if (block.type === "list" && selectedListItem?.blockId === block.id) {
    // Undo can remove the item selected by Content's add button. Keep the
    // parent pane available rather than rendering an empty item inspector.
    if (validListItemSelection(block, selectedListItem)) {
      return <ListItemInspector key={`${selectedListItem.listId}-${selectedListItem.itemIndex}`} block={block} listId={selectedListItem.listId} itemIndex={selectedListItem.itemIndex} onChange={onChange} onOpenBackgroundMedia={onOpenBackgroundMedia} />;
    }
  }
  if (editingViewport !== "desktop") return <div className="block-inspector-settings">
    <div className="inspector-sections"><section className="inspector-block-summary"><h2>{blockName}</h2><p className="setting-note">Style {editingViewport} only. Unset values inherit Desktop.</p></section></div>
    <ParagraphInspector key={`${block.id}:${editingViewport}`} profileOverride={profile} block={block} onChange={onChange} fontSizeViewMode={fontSizeViewModes[selectedFontSizeModeKey] ?? null} onFontSizeViewModeChange={mode => onFontSizeViewModeChange(selectedFontSizeModeKey, mode)} />
  </div>;
  const alignedBlock = block.type === "title" ? block : null;
  const alignment = alignedBlock?.align ?? null;
  const advanced = advancedFieldsForBlock(block, "gutenberg");
  const blockSettings = (
    <>
      {flexItemParent ? <FlexItemSizingInspector block={block} onChange={onChange} /> : null}
      {gridItemParent ? <GridItemSizingInspector block={block} onChange={onChange} /> : null}
      {contentSlot && block.type === "group" ? <InspectorAccordionSection title="Text"><label><span>Alignment</span><SelectControl value={block.data?.align === "centre" || block.data?.align === "right" ? block.data.align : "left"} onChange={event => onChange({ ...block, data: { ...block.data, align: event.target.value as TextAlignment } })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></SelectControl></label></InspectorAccordionSection> : null}
      {block.type === "paragraph" || block.type === "heading" ? <InspectorToolsSection title="Styles" options={[]} visible={new Set(["text-style"])} canReset={textStyleVariation(block.type === "paragraph" ? block.style : block.visualStyle) !== "default"} alwaysShow showCloseControl={false} onToggle={() => {}} onReset={() => onChange(block.type === "paragraph" ? { ...block, style: setTextStyleVariation(block.style, "default") } : { ...block, visualStyle: setTextStyleVariation(block.visualStyle, "default") })}><StyleVariationSetting kind={block.type} value={textStyleVariation(block.type === "paragraph" ? block.style : block.visualStyle)} onChange={value => onChange(block.type === "paragraph" ? { ...block, style: setTextStyleVariation(block.style, value as TextStyleVariation) } : { ...block, visualStyle: setTextStyleVariation(block.visualStyle, value as TextStyleVariation) })} /></InspectorToolsSection> : null}
      {alignedBlock ? <InspectorAccordionSection title={<>Text</>}><label><span>Alignment</span><SelectControl value={alignment ?? "left"} onChange={(event) => onChange({ ...alignedBlock, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></SelectControl></label>{alignedBlock.type === "title" ? <label><span>Level</span><SelectControl value={alignedBlock.level ?? 2} onChange={(event) => onChange({ ...alignedBlock, level: Number(event.target.value) as DocumentTitleLevel })}><option value={0}>Paragraph</option>{[1, 2, 3, 4, 5, 6].map((level) => <option value={level} key={level}>Heading {level}</option>)}</SelectControl></label> : null}</InspectorAccordionSection> : null}
      {block.type === "title" ? <InspectorAccordionSection title="Link settings"><CheckboxControl className="checkbox-setting" checked={Boolean(block.isLink)} onChange={checked => onChange({ ...block, isLink: checked })} label={<>Make title a link</>} />{block.isLink ? <><CheckboxControl className="checkbox-setting" checked={block.linkTarget === "_blank"} onChange={checked => onChange({ ...block, linkTarget: checked ? "_blank" : "_self" })} label={<>Open in new tab</>} /><label><span>Link rel</span><TextInput value={block.rel ?? ""} onChange={(event) => onChange({ ...block, rel: event.target.value || undefined })} placeholder="nofollow sponsored" /></label></> : null}</InspectorAccordionSection> : null}
      {(block.type === "quote" || block.type === "pullquote") ? <InspectorAccordionSection title={block.type === "pullquote" ? "Pullquote" : "Quote"}>{block.type === "quote" ? <StyleVariationSetting kind="quote" value={block.quoteStyle} onChange={quoteStyle => onChange({ ...block, quoteStyle: quoteStyle as "default" | "plain" })} /> : null}<label><span>Attribution</span><TextInput value={block.attribution ?? ""} onChange={(event) => onChange({ ...block, attribution: event.target.value, attributionRuns: undefined })} placeholder="Optional name" /></label></InspectorAccordionSection> : null}
      {block.type === "list" && block.style === "ordered" ? <ListSettingsInspector block={block} onChange={onChange} /> : null}

      {block.type === "cover-image" ? <CoverImageInspector block={block} onChange={onChange} /> : null}
      {block.type === "cover" ? <CoverInspector block={block} onChange={onChange} onOpenFiles={onOpenFiles} canOpenFiles={canOpenFiles} /> : null}
      {block.type === "author-name" && block.profileImage ? <AuthorDuotoneInspector block={block} onChange={onChange} /> : null}
      {block.type === "embed" ? <EmbedSettingsInspector block={block} onChange={onChange} advancedFields={advanced} /> : null}
      {block.type === "buttons" ? <InspectorAccordionSection title="Layout"><label><span>Justification</span><SelectControl value={block.justification ?? "left"} onChange={event => onChange(changeButtonsJustification(block, event.target.value as typeof block.justification))}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option>{block.orientation === "vertical" ? <option value="stretch">Stretch</option> : <option value="space-between">Space between</option>}</SelectControl></label><label><span>Vertical alignment</span><SelectControl value={buttonsVerticalAlignment(block)} onChange={event => onChange({ ...block, verticalAlign: event.target.value as typeof block.verticalAlign })}><option value="top">Top</option><option value="centre">Middle</option><option value="bottom">Bottom</option>{block.orientation === "vertical" ? <option value="space-between">Space between</option> : <option value="stretch">Stretch</option>}</SelectControl></label><label><span>Orientation</span><SelectControl value={block.orientation ?? "horizontal"} onChange={event => onChange({ ...block, orientation: event.target.value as typeof block.orientation })}><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></SelectControl></label><CheckboxControl className="setting-checkbox" checked={block.allowWrap !== false} onChange={checked => onChange({ ...block, allowWrap: checked })} label={<>Allow wrapping</>} />{(["horizontalGap", "verticalGap"] as const).map((field, index) => <LayoutSpacingSetting key={field} label={index ? "Vertical gap" : "Horizontal gap"} value={block[field]} presets={LAYOUT_SPACING_PRESETS} min={0} max={120} onChange={value => onChange({ ...block, [field]: value })} />)}</InspectorAccordionSection> : null}
      {block.type === "button" ? <InspectorAccordionSection title="Button"><label><span>Label</span><TextInput value={block.label} onChange={(event) => onChange({ ...block, label: event.target.value, labelRuns: undefined })} /></label><label><span>URL</span><TextInput value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} /></label><CheckboxControl className="checkbox-setting" checked={Boolean(block.opensInNewTab)} onChange={checked => onChange({ ...block, opensInNewTab: checked })} label={<>Open in new tab</>} /><label><span>Style</span><SelectControl value={block.style} onChange={(event) => onChange({ ...block, style: event.target.value as "primary" | "secondary" })}><option value="primary">Fill</option><option value="secondary">Outline</option></SelectControl></label><label><span>Text alignment</span><SelectControl value={block.align ?? "centre"} onChange={(event) => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></SelectControl></label><label><span>Title attribute</span><TextInput value={block.title ?? ""} onChange={(event) => onChange({ ...block, title: event.target.value || undefined })} /></label><label><span>Link rel</span><TextInput value={block.rel ?? ""} onChange={(event) => onChange({ ...block, rel: event.target.value || undefined })} placeholder="nofollow sponsored" /></label></InspectorAccordionSection> : null}
      {block.type === "social-icons" ? <InspectorAccordionSection title="Social Icons"><p className="setting-note">Use the plus button in the block to add any of the 47 built-in WordPress 7.1 social services. Select an icon to edit its link.</p><label><span>Style</span><SelectControl value={block.socialStyle ?? "default"} onChange={event => onChange({ ...block, socialStyle: event.target.value as NonNullable<typeof block.socialStyle> })}><option value="default">Default</option><option value="logos-only">Logos Only</option><option value="pill-shape">Pill Shape</option></SelectControl></label><label><span>Justification</span><SelectControl value={block.justification ?? "left"} onChange={event => onChange({ ...block, justification: event.target.value as NonNullable<typeof block.justification> })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option><option value="space-between">Space between</option></SelectControl></label><label><span>Orientation</span><SelectControl value={block.orientation ?? "horizontal"} onChange={event => onChange({ ...block, orientation: event.target.value as NonNullable<typeof block.orientation> })}><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></SelectControl></label><CheckboxControl className="checkbox-setting" checked={block.allowWrap !== false} onChange={checked => onChange({ ...block, allowWrap: checked })} label={<>Allow to wrap</>} /><label><span>Icon size</span><SelectControl value={block.iconSize ?? "normal"} onChange={event => onChange({ ...block, iconSize: event.target.value as NonNullable<typeof block.iconSize> })}><option value="small">Small</option><option value="normal">Normal</option><option value="large">Large</option><option value="huge">Huge</option></SelectControl></label><CheckboxControl className="checkbox-setting" checked={Boolean(block.showLabels)} onChange={checked => onChange({ ...block, showLabels: checked })} label={<>Show text labels</>} /><CheckboxControl className="checkbox-setting" checked={Boolean(block.openInNewTab)} onChange={checked => onChange({ ...block, openInNewTab: checked })} label={<>Open links in a new tab</>} />{(["horizontalGap", "verticalGap"] as const).map((field, index) => <LayoutSpacingSetting key={field} label={index ? "Vertical gap" : "Horizontal gap"} value={block[field]} presets={LAYOUT_SPACING_PRESETS} min={0} max={120} onChange={value => onChange({ ...block, [field]: value })} />)}</InspectorAccordionSection> : null}

      {block.type === "separator" ? <DividerInspector block={block} onChange={onChange} /> : null}
      {block.type === "spacer" ? <SpacerInspector block={block} orientation={spacerOrientation} onChange={onChange} advancedFields={advanced} /> : null}
      {block.type === "post-date" ? <InspectorAccordionSection title="Post Date"><label><span>Format</span><SelectControl value={block.format ?? "long"} onChange={(event) => onChange({ ...block, format: event.target.value as PostDateFormat })}><option value="long">Long — 2 September 2026</option><option value="short">Short — 02/09/2026</option><option value="iso">ISO — 2026-09-02</option><option value="custom">Custom</option></SelectControl></label>{block.format === "custom" ? <label><span>Custom date format</span><TextInput value={block.customFormat ?? "j F Y"} maxLength={128} onChange={event => onChange({ ...block, customFormat: event.target.value })} /><small>Tokens: Y y m n F M d j l D H G h g i s a A. Escape a literal with a backslash.</small></label> : null}<label><span>Date source</span><SelectControl value={block.dateSource ?? "published"} onChange={event => onChange({ ...block, dateSource: event.target.value as "published" | "modified" })}><option value="published">Published</option><option value="modified">Last modified</option></SelectControl></label><CheckboxControl className="checkbox-setting" checked={block.showIcon !== false} onChange={checked => onChange({ ...block, showIcon: checked })} label={<>Show clock icon</>} /><CheckboxControl className="checkbox-setting" checked={Boolean(block.isLink)} onChange={checked => onChange({ ...block, isLink: checked })} label={<>Link to post</>} /><p className="setting-note">Published uses the document publication date. Last modified uses its saved modification timestamp when available.</p></InspectorAccordionSection> : null}
      {block.type === "author-name" ? <InspectorAccordionSection title="Author Name"><label><span>Alignment</span><SelectControl value={block.align ?? "left"} onChange={event => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></SelectControl></label><label><span>Prefix</span><TextInput value={block.prefix ?? "By"} onChange={event => onChange({ ...block, prefix: event.target.value })} /></label><CheckboxControl className="checkbox-setting" checked={block.avatar !== false} onChange={checked => onChange({ ...block, avatar: checked })} label={<>Show avatar</>} /><label><span>Avatar size</span><SelectControl value={block.avatarSize ?? 96} onChange={event => onChange({ ...block, avatarSize: Number(event.target.value) })}>{[48, 64, 96, 128, 160, 192].map(size => <option key={size} value={size}>{size} px</option>)}</SelectControl></label>{canOpenFiles ? <button className="choose-media-button" type="button" onClick={event => onOpenFiles(event.currentTarget)}>Choose profile image from Files</button> : null}{block.profileImage ? <button className="text-action" type="button" onClick={() => onChange({ ...block, profileImage: undefined })}>Remove profile image</button> : null}<label><span>Biography</span><TextArea rows={4} maxLength={5000} value={block.biography ?? ""} onChange={event => onChange({ ...block, biography: event.target.value || undefined })} /></label><label><span>Profile URL</span><TextInput type="url" value={block.profileUrl ?? ""} onChange={event => onChange({ ...block, profileUrl: event.target.value || undefined })} placeholder="https://example.com/about" /></label>{block.profileUrl && !validAuthorProfileUrl(block.profileUrl) ? <p className="setting-note" role="alert">Enter a valid profile link.</p> : null}<CheckboxControl className="checkbox-setting" checked={Boolean(block.openInNewTab)} disabled={!block.profileUrl || !validAuthorProfileUrl(block.profileUrl)} onChange={checked => onChange({ ...block, openInNewTab: checked })} label={<>Open profile link in new tab</>} /><p className="setting-note">The author name is edited in Document settings. Profile details are stored on this block.</p></InspectorAccordionSection> : null}
      {block.type === "time-to-read" ? <InspectorAccordionSection title="Time to Read"><label><span>Display</span><SelectControl value={block.mode ?? "time"} onChange={event => onChange({ ...block, mode: event.target.value as "time" | "words" })}><option value="time">Reading time</option><option value="words">Word count</option></SelectControl></label>{block.mode !== "words" ? <CheckboxControl className="checkbox-setting" checked={Boolean(block.showRange)} onChange={checked => onChange({ ...block, showRange: checked })} label={<>Show reading time range</>} /> : null}<label><span>Prefix</span><TextInput value={block.prefix ?? "Reading Time:"} onChange={event => onChange({ ...block, prefix: event.target.value })} /></label><label><span>Presentation</span><SelectControl value={block.presentation ?? "badge"} onChange={event => onChange({ ...block, presentation: event.target.value as "badge" | "plain" })}><option value="badge">Badge</option><option value="plain">Plain text</option></SelectControl></label><MetadataAlignment block={block} onChange={onChange} /></InspectorAccordionSection> : null}
      {block.type === "subtitle" ? <InspectorAccordionSection title="Subtitle"><MetadataAlignment block={block} onChange={onChange} /></InspectorAccordionSection> : null}
      {block.type === "post-date" ? <InspectorAccordionSection title="Post Date alignment"><label><span>Alignment</span><SelectControl value={block.align ?? "left"} onChange={event => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></SelectControl></label></InspectorAccordionSection> : null}
      {block.type === "section" ? <LayoutInspector block={block} onChange={onChange} heading="Section" note={`This section contains ${block.children.length} nested block${block.children.length === 1 ? "" : "s"}.`} /> : null}
      {block.type === "columns" ? <ColumnsInspector block={block} onChange={onChange} onCountChange={onColumnCountChange} /> : null}
      {block.type === "column" ? <ColumnInspector block={block} onChange={onChange} onWidthChange={onColumnWidthChange} onWidthUnitChange={onColumnWidthUnitChange} widthMax={columnWidthMax} /> : null}
      {block.type === "video" ? <InspectorAccordionSection title="Video"><label><span>Video URL</span><TextInput type="url" value={block.src} onChange={event => onChange({ ...block, src: event.target.value })} placeholder="https://…" /></label><p className="setting-note">Use a direct video file URL. Provider pages belong in an Embed block. Local file upload is not supported yet.</p><label><span>Poster image URL</span><TextInput type="url" value={block.poster ?? ""} onChange={event => onChange({ ...block, poster: event.target.value || undefined })} placeholder="https://…" /></label><label><span>Caption</span><TextArea rows={3} value={block.caption ?? ""} onChange={event => onChange({ ...block, caption: event.target.value || undefined, captionRuns: undefined })} /></label><CheckboxControl className="checkbox-setting" checked={block.autoplay === true} onChange={checked => onChange({ ...block, autoplay: checked })} label={<>Autoplay</>} /><CheckboxControl className="checkbox-setting" checked={block.controls !== false} onChange={checked => onChange({ ...block, controls: checked })} label={<>Show playback controls</>} /><CheckboxControl className="checkbox-setting" checked={block.loop === true} onChange={checked => onChange({ ...block, loop: checked })} label={<>Loop</>} /><CheckboxControl className="checkbox-setting" checked={block.muted === true} onChange={checked => onChange({ ...block, muted: checked })} label={<>Mute</>} /><CheckboxControl className="checkbox-setting" checked={block.playsInline === true} onChange={checked => onChange({ ...block, playsInline: checked })} label={<>Play inline</>} /><label><span>Preload</span><SelectControl value={block.preload ?? "metadata"} onChange={event => onChange({ ...block, preload: event.target.value as "none" | "metadata" | "auto" })}><option value="none">None</option><option value="metadata">Metadata</option><option value="auto">Auto</option></SelectControl></label></InspectorAccordionSection> : null}
      {profile.sharedStyleInspector ? <ParagraphInspector key={`${block.id}:${block.type}:${block.type === "button" ? buttonState : "default"}:block`} profileOverride={contentSlot ? profile : undefined} block={block} interactionState={block.type === "button" ? buttonState : "default"} onChange={onChange} fontSizeViewMode={fontSizeViewModes[selectedFontSizeModeKey] ?? null} onFontSizeViewModeChange={mode => onFontSizeViewModeChange(selectedFontSizeModeKey, mode)} backgroundImageOptions={block.type === "list" || block.type === "group" || (block.type === "quote" || block.type === "pullquote") || block.type === "heading" || block.type === "code" || block.type === "title" || block.type === "buttons" ? <ManagedBackgroundImageInspector block={block} onChange={onChange} detailsOnly /> : undefined} backgroundImageControls={block.type === "list" || block.type === "group" || (block.type === "quote" || block.type === "pullquote") || (block.type === "heading" && Boolean(block.visualStyle?.backgroundImageMediaId)) || block.type === "code" || block.type === "title" || block.type === "buttons" ? <ManagedBackgroundImageInspector block={block} onChange={onChange} onOpenBackgroundMedia={onOpenBackgroundMedia} embedded /> : undefined} groupLayoutControls={block.type === "group" ? <LayoutInspector block={block} onChange={onChange} heading="Layout" note={`This group contains ${block.children.length} nested block${block.children.length === 1 ? "" : "s"}.`} /> : undefined} groupDimensionControls={block.type === "group" ? <GroupDimensionsInspector block={block} onChange={onChange} /> : block.type === "columns" ? <LayoutGapsInspector block={block} onChange={onChange} /> : undefined} onResetGroupDimensions={block.type === "group" || block.type === "columns" ? () => onChange({ ...block, paddingX: undefined, paddingY: undefined, gap: undefined, columnGap: undefined, rowGap: undefined }) : undefined} /> : null}
      {block.type === "group" && canSetSticky && !contentSlot ? <GroupPositionInspector block={block} onChange={onChange} /> : null}
      {advanced && block.type !== "embed" && block.type !== "spacer" && block.type !== "image" && block.type !== "separator" ? <AdvancedFieldsInspector semanticElement={!contentSlot} contentElement={contentSlot} block={block} onChange={onChange} fields={advanced} hasAllowedBlocks={block.type === "group" && !contentSlot} /> : null}
    </>
  );
  const requiredSettings = (
    <>
      {block.type === "field" ? <InspectorAccordionSection title="Field"><label><span>Label</span><TextInput value={block.label} onChange={event => onChange({ ...block, label: event.target.value })} /></label><label><span>Control</span><SelectControl value={block.control} onChange={event => onChange({ ...block, control: event.target.value as "text" | "select" })}><option value="text">Text</option><option value="select">Select</option></SelectControl></label><label><span>Value</span><TextInput value={block.value} onChange={event => onChange({ ...block, value: event.target.value })} /></label>{block.control === "select" ? <label><span>Options</span><TextInput value={(block.options ?? []).join(", ")} onChange={event => onChange({ ...block, options: event.target.value.split(",").map(option => option.trim()).filter(Boolean) })} placeholder="First, Second" /></label> : null}</InspectorAccordionSection> : null}
      {block.type === "section" ? <InspectorAccordionSection title="Section role"><label><span>Site role</span><SelectControl value={block.role ?? ""} onChange={event => onChange({ ...block, role: (event.target.value || undefined) as SiteSectionRole | undefined })}><option value="">None</option>{(["account", "setup", "scorecard", "leaderboard", "share", "hero", "hero-copy", "account-copy", "scorecard-heading", "scorecard-actions", "leaderboard-card", "leaderboard-score", "leaderboard-metrics", "metric", "footer", "footer-brand", "footer-links", "social-link"] as SiteSectionRole[]).map(role => <option value={role} key={role}>{role}</option>)}</SelectControl></label>{block.source ? <p className="setting-note">Source: {block.source.module} · {block.source.exportName} · {block.source.revision.slice(0, 8)}</p> : null}</InspectorAccordionSection> : null}
      {block.type === "social-link" ? <InspectorAccordionSection title={coreSocialServiceLabel(block.service)}><label><span>{block.service === "chain" ? "URL or email address" : "Profile URL"}</span><TextInput value={block.url} onChange={event => onChange({ ...block, url: event.target.value })} placeholder={block.service === "chain" ? "https://example.com or name@example.com" : "https://…"} /></label>{block.url && !socialServiceHref(block.url) ? <p className="setting-note" role="alert">Enter a valid web or email address. The icon will not link until the address is valid.</p> : null}{block.service === "chain" ? <p className="setting-note">A bare email address becomes an email link; a web address without a scheme uses HTTPS.</p> : null}<label><span>Text label</span><TextInput value={block.label ?? ""} onChange={event => onChange({ ...block, label: event.target.value || undefined })} placeholder={coreSocialServiceLabel(block.service)} /></label><label><span>Link rel</span><TextInput value={block.rel ?? ""} onChange={event => onChange({ ...block, rel: event.target.value || undefined })} placeholder="nofollow" /></label></InspectorAccordionSection> : null}
      {block.type === "social-linkedin" || block.type === "social-tiktok" ? <InspectorAccordionSection title={block.type === "social-linkedin" ? "LinkedIn" : "TikTok"}><label><span>Profile URL</span><TextInput type="url" value={block.url} onChange={event => onChange({ ...block, url: event.target.value })} placeholder={block.type === "social-linkedin" ? "https://www.linkedin.com/in/…" : "https://www.tiktok.com/@…"} /></label>{block.url && !safeTextLink(block.url) ? <p className="setting-note" role="alert">Enter a valid link. The icon will not link until the address is valid.</p> : null}<label><span>Text label</span><TextInput value={block.label ?? ""} onChange={event => onChange({ ...block, label: event.target.value || undefined })} placeholder={block.type === "social-linkedin" ? "LinkedIn" : "TikTok"} /></label><label><span>Link rel</span><TextInput value={block.rel ?? ""} onChange={event => onChange({ ...block, rel: event.target.value || undefined })} placeholder="nofollow" /></label></InspectorAccordionSection> : null}

    </>
  );
  return <div className={`block-inspector-settings${block.type === "embed" ? " embed-block-inspector" : block.type === "table" ? " table-block-inspector" : ""}`}>
    <div className="inspector-sections"><section className="inspector-block-summary"><div className="inspector-block-summary-heading"><span aria-hidden="true">{block.type === "heading" ? <HeadingLevelIcon level={block.level} /> : <BlockLibraryIcon type={block.type === "social-link" ? socialServiceInsertType(block.service) : block.type === "group" ? groupVariationFor(block).type : block.type} />}</span><h2>{blockName}</h2></div>{block.type === "button" ? <div className="inspector-button-state-controls"><label><span>State</span><SelectControl aria-label="Button state" value={buttonState} onChange={event => setButtonState(event.target.value as ButtonInteractionState | "default")}><option value="default">Default</option><option value="hover">Hover</option><option value="focus">Focus</option><option value="active">Active</option></SelectControl></label><CheckboxControl className="checkbox-setting" checked={showButtonStatePreview} disabled={buttonState === "default"} onChange={checked => setShowButtonStatePreview(checked)} label={<>Show state on canvas</>} /></div> : null}<p className="setting-note">{blockDescription}</p>{block.type === "heading" ? <HeadingLevelSetting value={block.level} onChange={level => onChange({ ...block, level })} /> : null}{block.type === "group" && !contentSlot ? <GroupLayoutSelection value={block.layout} onChange={layout => onChange(changeGroupLayout(block, layout))} /> : null}</section></div>
    {block.type === "image" ? <ImageInspector key={block.id} block={block} onChange={onChange} onOpenFiles={onOpenFiles} canOpenFiles={canOpenFiles} advancedFields={advanced} /> : block.type === "list" ? <>
      <PaneTabs id={listInspectorId} label="List inspector" className="list-inspector-tabs" indicatorVariant="selected"
        tabs={[{ id: "content", label: "Content" }, { id: "settings", label: "Settings" }, { id: "styles", label: "Styles" }]}
        active={listTab} onChange={tab => setListTabSelection({ blockId: block.id, tab })}
        renderLabel={tab => <><AcmIcon name={tab.id === "content" ? "view.list" : tab.id === "settings" ? "action.settings" : "view.styles"} scale="Regular-M" size={24} /><span className="table-inspector-tab-label">{tab.label}</span></>} />
      <PaneTabPanel id={listInspectorId} tab="content" active={listTab} className="list-inspector-tab-panel">
        <ListContentInspector block={block} onChange={onChange} />
      </PaneTabPanel>
      <PaneTabPanel id={listInspectorId} tab="settings" active={listTab} className="inspector-sections list-inspector-tab-panel">
        {block.style === "ordered" ? <ListSettingsInspector block={block} onChange={onChange} /> : null}
        {advanced ? <AdvancedFieldsInspector block={block} onChange={onChange} fields={advanced} defaultOpen={false} /> : null}
      </PaneTabPanel>
      <PaneTabPanel id={listInspectorId} tab="styles" active={listTab} className="inspector-sections list-inspector-tab-panel">
        <ParagraphInspector key={`${block.id}:list:styles`} block={block} onChange={onChange} fontSizeViewMode={fontSizeViewModes[selectedFontSizeModeKey] ?? null} onFontSizeViewModeChange={mode => onFontSizeViewModeChange(selectedFontSizeModeKey, mode)}
          backgroundImageControls={<ManagedBackgroundImageInspector block={block} onChange={onChange} onOpenBackgroundMedia={onOpenBackgroundMedia} embedded />}
          backgroundImageOptions={<ManagedBackgroundImageInspector block={block} onChange={onChange} onOpenBackgroundMedia={onOpenBackgroundMedia} detailsOnly />} />
      </PaneTabPanel>
    </> : block.type === "table" ? <>
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

function FlexItemSizingInspector({ block, onChange }: { block: ContentBlock; onChange: (block: ContentBlock) => void }) {
  const value = block.visualStyle?.flexItemSizing;
  const [draft, setDraft] = useState<{ blockId: string; mode: "max" | "fixed"; value: string } | null>(null);
  const sizeDraft = draft?.blockId === block.id && draft.mode === value?.mode ? draft.value : value?.size ?? "320px";
  const update = (next: ParagraphStyle["flexItemSizing"] | undefined) => {
    const visualStyle = { ...block.visualStyle };
    if (next) visualStyle.flexItemSizing = next;
    else delete visualStyle.flexItemSizing;
    onChange({ ...block, visualStyle: Object.keys(visualStyle).length ? visualStyle : undefined } as ContentBlock);
  };
  return <InspectorAccordionSection title="Flex sizing">
    <label><span>Sizing</span><SelectControl value={value?.mode ?? "fit"} onChange={event => {
      const mode = event.target.value as NonNullable<ParagraphStyle["flexItemSizing"]>["mode"];
      update(mode === "max" || mode === "fixed" ? { mode, size: value?.size ?? "320px" } : { mode });
    }}><option value="fit">Fit</option><option value="grow">Grow</option><option value="max">Max width</option><option value="fixed">Fixed</option></SelectControl></label>
    {value?.mode === "max" || value?.mode === "fixed" ? <label><span>{value.mode === "max" ? "Maximum width" : "Width"}</span><TextInput aria-label={value.mode === "max" ? "Maximum width" : "Width"} value={sizeDraft} onChange={event => {
      const size = event.target.value;
      if (value.mode === "max" || value.mode === "fixed") setDraft({ blockId: block.id, mode: value.mode, value: size });
      if (/^(?:\d+(?:\.\d+)?)(?:px|em|rem|%|vw|vh|ch)$/.test(size) && Number.parseFloat(size) > 0 && Number.parseFloat(size) <= 4000) update({ ...value, size });
    }} /></label> : null}
    <p className="setting-note">Controls this block’s size inside the parent Flex layout.</p>
    {value ? <button type="button" className="inspector-text-action" onClick={() => update(undefined)}>Reset sizing</button> : null}
  </InspectorAccordionSection>;
}

function GridItemSizingInspector({ block, onChange }: { block: ContentBlock; onChange: (block: ContentBlock) => void }) {
  const value = block.visualStyle?.gridItemSizing;
  const update = (next: ParagraphStyle["gridItemSizing"] | undefined) => {
    const visualStyle = { ...block.visualStyle };
    const sizing = next ? Object.fromEntries(Object.entries(next).filter(([, span]) => span !== undefined)) as ParagraphStyle["gridItemSizing"] : undefined;
    if (sizing && Object.keys(sizing).length) visualStyle.gridItemSizing = sizing;
    else delete visualStyle.gridItemSizing;
    onChange({ ...block, visualStyle: Object.keys(visualStyle).length ? visualStyle : undefined } as ContentBlock);
  };
  return <InspectorAccordionSection title="Grid sizing">
    <label><span>Column span</span><NumberInput aria-label="Grid column span" min={1} max={6} value={value?.columnSpan ?? 1} onChange={event => {
      const columnSpan = Number(event.target.value);
      if (Number.isInteger(columnSpan) && columnSpan >= 1 && columnSpan <= 6) update({ ...value, columnSpan: columnSpan === 1 ? undefined : columnSpan });
    }} /></label>
    <label><span>Row span</span><NumberInput aria-label="Grid row span" min={1} max={6} value={value?.rowSpan ?? 1} onChange={event => {
      const rowSpan = Number(event.target.value);
      if (Number.isInteger(rowSpan) && rowSpan >= 1 && rowSpan <= 6) update({ ...value, rowSpan: rowSpan === 1 ? undefined : rowSpan });
    }} /></label>
    <p className="setting-note">Controls how many Grid tracks this block spans.</p>
    {value ? <button type="button" className="inspector-text-action" onClick={() => update(undefined)}>Reset sizing</button> : null}
  </InspectorAccordionSection>;
}

function MetadataAlignment({ block, onChange }: { block: Extract<ContentBlock, { type: "time-to-read" | "subtitle" }>; onChange: (block: ContentBlock) => void }) {
  return <label><span>Alignment</span><SelectControl value={block.align ?? "left"} onChange={event => onChange({ ...block, align: event.target.value as TextAlignment })}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></SelectControl></label>;
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

function AdvancedFieldsInspector({ semanticElement = true, contentElement = false, defaultOpen = true, block, onChange, fields, hasAllowedBlocks = false, children }: { semanticElement?: boolean; contentElement?: boolean; defaultOpen?: boolean; block: ContentBlock; onChange: (block: ContentBlock) => void; fields: AdvancedFields; hasAllowedBlocks?: boolean; children?: ReactNode }) {
  const style = block.type === "paragraph" || block.type === "columns" || block.type === "column" ? block.style ?? {} : block.visualStyle ?? {};
  const blockName = contentElement ? "Content" : blockCatalogue.find(entry => entry.type === block.type)?.label ?? capabilityProfileFor(block.type).label;
  function update(field: "anchor" | "className" | "additionalCss", value: string) {
    const next = { ...style };
    if (value.trim()) next[field] = value;
    else delete next[field];
    if (block.type === "paragraph" || block.type === "columns" || block.type === "column") onChange({ ...block, style: Object.keys(next).length ? next : undefined } as ContentBlock);
    else onChange({ ...block, visualStyle: Object.keys(next).length ? next : undefined } as ContentBlock);
  }
  return <InspectorAccordionSection className={`advanced-fields-section${block.type === "paragraph" ? " paragraph-advanced-fields" : ""}`} title="Advanced" defaultOpen={defaultOpen}>
    <AdvancedFieldsControl fields={fields} style={style} blockName={blockName} placeholders={block.type !== "paragraph" && block.type !== "embed"} onChange={update} />
    {children}
    {semanticElement && block.type === "group" ? <><label><span>HTML element</span><SelectControl value={block.tagName ?? "div"} onChange={(event) => { const tagName = event.target.value as NonNullable<typeof block.tagName>; onChange({ ...block, tagName, ...(tagName === "details" ? { detailsSummary: block.detailsSummary ?? "Details" } : { detailsSummary: undefined, openByDefault: undefined }) }); }}>{["div", "main", "section", "article", "aside", "header", "footer", "nav", "details"].map((tag) => <option value={tag} key={tag}>{tag}</option>)}</SelectControl></label><label><span>ARIA label</span><TextInput value={block.ariaLabel ?? ""} onChange={(event) => onChange({ ...block, ariaLabel: event.target.value || undefined })} /></label></> : null}
    {contentElement && block.type === "group" ? <label><span>HTML element</span><SelectControl value={block.tagName ?? "div"} onChange={(event) => onChange({ ...block, tagName: event.target.value as NonNullable<typeof block.tagName> })}>{["div", "main", "section", "article"].map((tag) => <option value={tag} key={tag}>{tag}</option>)}</SelectControl></label> : null}
    {hasAllowedBlocks && block.type === "group" ? <GroupAllowedBlocksControl value={block.allowedBlocks} onChange={allowedBlocks => onChange({ ...block, allowedBlocks })} /> : null}
  </InspectorAccordionSection>;
}
type LayoutBlock = Extract<ContentBlock, { type: "group" | "section" }>;

function EmbedSettingsInspector({ block, onChange, advancedFields }: { block: Extract<ContentBlock, { type: "embed" }>; onChange: (block: ContentBlock) => void; advancedFields: AdvancedFields | null }) {
  const [visibleDimensions, setVisibleDimensions] = useState(new Set(["margin", "padding", "min-height", "min-width"]));
  const playerId = dailymotionPlayerId(block.url);
  const [playerIdDraftState, setPlayerIdDraftState] = useState<{ url: string; value: string } | null>(null);
  const playerIdDraft = playerIdDraftState?.url === block.url ? playerIdDraftState.value : playerId ?? "";
  const playerIdHelpId = useId();
  const playerIdInputId = useId();
  const invalidPlayerId = playerIdDraft !== "" && !/^[A-Za-z0-9]{4,32}$/.test(playerIdDraft);
  const style = block.visualStyle ?? {};
  function updateDimension(field: "margin" | "padding" | "minHeight" | "minWidth", value: string | undefined) {
    const nextStyle = { ...style };
    if (value) nextStyle[field] = value;
    else delete nextStyle[field];
    onChange({ ...block, visualStyle: Object.keys(nextStyle).length ? nextStyle : undefined });
  }
  return <>
    {playerId !== null ? <InspectorAccordionSection title="Dailymotion">
      <label htmlFor={playerIdInputId}><span>Player ID</span></label><TextInput id={playerIdInputId} aria-label="Dailymotion Player ID" aria-invalid={invalidPlayerId} aria-describedby={playerIdHelpId} value={playerIdDraft} onChange={event => {
        const value = event.target.value;
        setPlayerIdDraftState({ url: block.url, value });
        const url = withDailymotionPlayerId(block.url, value);
        if (url) onChange({ ...block, url });
      }} />
      <p className="setting-note" id={playerIdHelpId}>{invalidPlayerId ? "Enter 4–32 letters or numbers." : "Required to display this Dailymotion video or playlist. Find it in your Dailymotion player settings."}</p>
    </InspectorAccordionSection> : null}
    <InspectorToolsSection title="Dimensions" options={[{ id: "padding", label: "Padding" }, { id: "margin", label: "Margin" }, { id: "min-height", label: "Minimum height" }, { id: "min-width", label: "Minimum width" }]} visible={visibleDimensions} canReset={Boolean(style.padding || style.margin || style.minHeight || style.minWidth)} onToggle={id => setVisibleDimensions(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onReset={() => { const nextStyle = { ...style }; delete nextStyle.padding; delete nextStyle.margin; delete nextStyle.minHeight; delete nextStyle.minWidth; onChange({ ...block, visualStyle: Object.keys(nextStyle).length ? nextStyle : undefined }); }}>
      {visibleDimensions.has("padding") ? <BoxLengthSetting label="Padding" value={style.padding} layout="all" presets={LAYOUT_SPACING_PRESETS} min={0} max={160} onChange={value => updateDimension("padding", value)} /> : null}
      {visibleDimensions.has("margin") ? <BoxLengthSetting label="Margin" value={style.margin} layout="axes" min={-100} max={200} onChange={value => updateDimension("margin", value)} /> : null}
      {visibleDimensions.has("min-height") ? <ParagraphLengthSetting label="Minimum height" value={style.minHeight} min={0} max={4000} onChange={value => updateDimension("minHeight", value)} /> : null}
      {visibleDimensions.has("min-width") ? <ParagraphLengthSetting label="Minimum width" value={style.minWidth} min={0} max={4000} onChange={value => updateDimension("minWidth", value)} /> : null}
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
        <label><span>{label}</span><NumberInput aria-label={label}  min="0" max={SPACER_SIZE_LIMIT} step="any" value={value} onChange={(event) => onChange({ ...block, [dimension]: Math.max(0, Math.min(SPACER_SIZE_LIMIT, Number(event.target.value) || 0)) })} /></label>
        <label><span>{label} unit</span><SelectControl aria-label={`${label} unit`} value={unit} onChange={(event) => { const nextUnit = event.target.value as SpacerUnit; const defaults = orientation === "horizontal" ? defaultWidthByUnit : defaultHeightByUnit; onChange({ ...block, [dimension]: defaults[nextUnit], [unitField]: nextUnit === "px" ? undefined : nextUnit }); }}>{unitOptions}</SelectControl></label>
      </div>
      <ParagraphLengthSetting label="Margin" value={block.visualStyle?.margin} min={-100} max={200} onChange={value => { const visualStyle = { ...(block.visualStyle ?? {}) }; if (value) visualStyle.margin = value; else delete visualStyle.margin; onChange({ ...block, visualStyle: Object.keys(visualStyle).length ? visualStyle : undefined }); }} />
      <p className="setting-note">Spacer blocks add empty space without adding screen-reader content.</p>
    </InspectorAccordionSection>
    {advancedFields ? <AdvancedFieldsInspector block={block} onChange={onChange} fields={advancedFields} /> : null}
  </>;
}

function AuthorDuotoneInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "author-name" }>; onChange: (block: ContentBlock) => void }) {
  const inheritedDuotone = useImageDuotoneInheritance(block);
  const disabled = useInspectorContentDisabled();
  return <InspectorAccordionSection title="Filters"><DuotoneControl value={block.duotone} inheritedValue={inheritedDuotone} disabled={disabled} allowClearWhenUnset onChange={duotone => onChange({ ...block, duotone })} onReset={() => { const next = { ...block }; delete next.duotone; onChange(next); }} /></InspectorAccordionSection>;
}

function ImageInspector({ block, onChange, onOpenFiles, canOpenFiles, advancedFields }: { block: Extract<ContentBlock, { type: "image" }>; onChange: (block: ContentBlock) => void; onOpenFiles: (trigger?: HTMLElement) => void; canOpenFiles: boolean; advancedFields: AdvancedFields | null }) {
  const inheritedDuotone = useImageDuotoneInheritance(block);
  const resolutions = useImageResolutionChoices(block.mediaId);
  const inspectorId = useId();
  const disabled = useInspectorContentDisabled();
  const [tab, setTab] = useState("content");
  const ratio = block.aspectRatio ?? "original";
  const linkDestination = block.linkDestination ?? (block.linkUrl ? "custom" : "none");
  const style = block.visualStyle ?? {};
  function updateVisualStyle(changes: Partial<ParagraphStyle>) {
    const next = { ...style, ...changes };
    for (const key of Object.keys(next) as (keyof ParagraphStyle)[]) if (!next[key]) delete next[key];
    onChange({ ...block, visualStyle: Object.keys(next).length ? next : undefined });
  }
  return <>
    <PaneTabs id={inspectorId} label="Image inspector" className="image-inspector-tabs" indicatorVariant="selected"
      tabs={[{ id: "content", label: "Content" }, { id: "settings", label: "Settings" }, { id: "styles", label: "Styles" }]}
      active={tab} onChange={setTab}
      renderLabel={item => <><AcmIcon name={item.id === "content" ? "view.list" : item.id === "settings" ? "action.settings" : "view.styles"} scale="Regular-M" size={24} /><span className="table-inspector-tab-label">{item.label}</span></>} />
    <PaneTabPanel id={inspectorId} tab="content" active={tab} className="inspector-sections image-inspector-tab-panel">
    <InspectorAccordionSection title="Media">
      {canOpenFiles ? <button className="choose-media-button" type="button" onClick={event => onOpenFiles(event.currentTarget)}>Choose from files</button> : null}
      {block.mediaId ? <p className="setting-note">This block uses a managed local file.</p> : <label><span>Image URL</span><TextInput type="url" value={block.src} onChange={(event) => onChange({ ...block, src: event.target.value })} placeholder="https://…" /></label>}
      <label><span>Alternative text</span><TextInput value={block.alt} disabled={Boolean(block.decorative)} onChange={(event) => onChange({ ...block, alt: event.target.value })} /></label>
      <CheckboxControl className="checkbox-setting" checked={Boolean(block.decorative)} disabled={linkDestination !== "none"} onChange={checked => onChange({ ...block, decorative: checked })} label={<>Mark as decorative</>} />
      <p className="setting-note">Edit the caption directly below the image in the canvas.</p>
      <ImageLinkSettings block={block} onChange={onChange} />
    </InspectorAccordionSection>
    </PaneTabPanel>
    <PaneTabPanel id={inspectorId} tab="settings" active={tab} className="inspector-sections image-inspector-tab-panel">
      {resolutions ? <InspectorAccordionSection title="Resolution"><ImageResolutionSetting value={block.imageResolution} choices={resolutions.choices} canPrepare={resolutions.canPrepare} preparing={resolutions.preparing} onPrepare={resolutions.onPrepare} disabled={disabled} onChange={imageResolution => { const next = { ...block }; if (imageResolution) next.imageResolution = imageResolution; else delete next.imageResolution; onChange(next); }} /></InspectorAccordionSection> : null}
      {advancedFields ? <AdvancedFieldsInspector block={block} onChange={onChange} fields={advancedFields}><label><span>Title attribute</span><TextInput value={block.title ?? ""} onChange={event => onChange({ ...block, title: event.target.value || undefined })} /></label></AdvancedFieldsInspector> : null}
    </PaneTabPanel>
    <PaneTabPanel id={inspectorId} tab="styles" active={tab} className="inspector-sections image-inspector-tab-panel">
    <InspectorAccordionSection title="Styles"><label><span>Style</span><SelectControl value={block.imageStyle ?? "default"} onChange={(event) => onChange({ ...block, imageStyle: event.target.value as NonNullable<typeof block.imageStyle> })}><option value="default">Default</option><option value="rounded">Rounded</option></SelectControl></label></InspectorAccordionSection>
    <InspectorAccordionSection title="Filters"><DuotoneControl value={block.duotone} inheritedValue={inheritedDuotone} disabled={disabled} allowClearWhenUnset onChange={duotone => onChange({ ...block, duotone })} onReset={() => { const next = { ...block }; delete next.duotone; onChange(next); }} /></InspectorAccordionSection>
    <InspectorAccordionSection title="Dimensions">
      <ImageDimensionsSetting aspectRatio={ratio} displayWidth={block.displayWidth} displayHeight={block.displayHeight} scale={block.scale} onAspectRatioChange={aspectRatio => onChange({ ...block, aspectRatio, ...(aspectRatio !== "original" ? { displayHeight: undefined } : {}) })} onWidthChange={displayWidth => onChange({ ...block, displayWidth })} onHeightChange={displayHeight => onChange({ ...block, displayHeight })} onScaleChange={scale => { if (scale !== "fill") onChange({ ...block, scale }); }} />
      {(block.src || block.mediaId) && ratio !== "original" && block.scale !== "contain" ? <FocalPositionSetting x={block.focalX} y={block.focalY} onXChange={focalX => onChange({ ...block, focalX })} onYChange={focalY => onChange({ ...block, focalY })} /> : null}
      <ParagraphLengthSetting key={`${block.id}-margin`} label="Margin" value={style.margin} min={-100} max={200} onChange={(value) => updateVisualStyle({ margin: value })} />
    </InspectorAccordionSection>
    <InspectorAccordionSection title="Border & shadow"><BorderSettings style={style} idPrefix={block.id} onChange={updateVisualStyle} /></InspectorAccordionSection>
    </PaneTabPanel>
  </>;
}

function CoverInspector({ block, onChange, onOpenFiles, canOpenFiles }: { block: Extract<ContentBlock, { type: "cover" }>; onChange: (block: ContentBlock) => void; onOpenFiles: (trigger?: HTMLElement) => void; canOpenFiles: boolean }) {
  const inheritedDuotone = useImageDuotoneInheritance(block);
  const resolutions = useImageResolutionChoices(block.mediaId);
  const disabled = useInspectorContentDisabled();
  const ratio = block.aspectRatio ?? "original";
  const hasImageFrame = ratio !== "original" || block.displayHeight !== undefined;
  const visualStyle = block.visualStyle ?? {};
  const [overlayMode, setOverlayMode] = useState<"colour" | "gradient">(visualStyle.backgroundGradient ? "gradient" : "colour");
  const [videoDraft, setVideoDraft] = useState<{ blockId: string; url: string } | null>(null);
  const [nativeVideoDraft, setNativeVideoDraft] = useState<{ blockId: string; url: string } | null>(null);
  const [resolvingVideo, setResolvingVideo] = useState(false);
  const [videoError, setVideoError] = useState("");
  const videoUrl = videoDraft?.blockId === block.id ? videoDraft.url : block.videoBackground?.url ?? "";
  const nativeVideoUrl = nativeVideoDraft?.blockId === block.id ? nativeVideoDraft.url : block.nativeVideoUrl ?? "";
  const validVideo = coverVideoBackground(videoUrl);
  const canResolveWordPressTv = oEmbedRequest(videoUrl)?.provider === "WordPress.tv";
  const canSaveVideo = Boolean(validVideo || canResolveWordPressTv);
  const nativeVideoSource = safeVideoSource(nativeVideoUrl);
  const canSaveNativeVideo = validNativeCoverVideoSource(nativeVideoUrl);
  async function saveVideo() {
    if (disabled || resolvingVideo || !canSaveVideo) return;
    setVideoError("");
    if (validVideo) {
      onChange({ ...block, videoBackground: validVideo });
      return;
    }
    if (!canResolveWordPressTv) return;
    setResolvingVideo(true);
    try {
      const response = await fetch("/api/embed/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });
      if (!response.ok) throw new Error("The video could not be resolved.");
      const resolved = coverVideoBackgroundFromWordPressTv(videoUrl, await response.json());
      if (!resolved) throw new Error("The provider returned an unsupported video.");
      onChange({ ...block, videoBackground: resolved });
      setVideoDraft({ blockId: block.id, url: resolved.url });
    } catch {
      setVideoError("WordPress.tv could not resolve this video. Check the link and try again.");
    } finally {
      setResolvingVideo(false);
    }
  }
  function updateVisualStyle(changes: Partial<ParagraphStyle>) {
    const next = { ...visualStyle, ...changes };
    for (const [key, value] of Object.entries(changes)) if (value === undefined) delete next[key as keyof ParagraphStyle];
    onChange({ ...block, visualStyle: Object.keys(next).length ? next : undefined });
  }
  function saveNativeVideo() {
    if (disabled || !canSaveNativeVideo || block.videoBackground) return;
    onChange({ ...block, nativeVideoUrl: nativeVideoSource! });
  }
  return <div className="inspector-sections">
    <InspectorAccordionSection title="Media">
      {canOpenFiles ? <button className="choose-media-button" type="button" onClick={event => onOpenFiles(event.currentTarget)}>Choose from files</button> : null}
      {block.mediaId ? <p className="setting-note">This Cover uses a managed local file.</p> : <label><span>Image URL</span><TextInput type="url" value={block.src} onChange={event => onChange({ ...block, src: event.target.value })} placeholder="https://…" /></label>}
      <label><span>Alternative text</span><TextInput value={block.alt} onChange={event => onChange({ ...block, alt: event.target.value })} /></label>
      <label><span>Background video URL</span><TextInput type="url" value={videoUrl} onChange={event => { setVideoDraft({ blockId: block.id, url: event.target.value }); setVideoError(""); }} placeholder="https://vimeo.com/… or https://wordpress.tv/…" /></label>
      {block.videoBackground ? <div className="cover-video-actions">
        <button type="button" className="paragraph-reset-button" disabled={disabled || !canSaveVideo || resolvingVideo} onClick={saveVideo}>{resolvingVideo ? "Resolving video…" : "Update video"}</button>
        <button type="button" className="paragraph-reset-button" disabled={disabled || resolvingVideo} onClick={() => { const next = { ...block }; delete next.videoBackground; onChange(next); setVideoDraft({ blockId: block.id, url: "" }); setVideoError(""); }}>Remove video</button>
      </div> : <button type="button" className="paragraph-reset-button" disabled={disabled || !canSaveVideo || resolvingVideo} onClick={saveVideo}>{resolvingVideo ? "Resolving video…" : "Add video"}</button>}
      {resolvingVideo ? <p className="setting-note" role="status">Resolving the WordPress.tv video…</p> : null}
      {videoError ? <p className="setting-note" role="alert">{videoError}</p> : null}
      {videoUrl && !validVideo && !canResolveWordPressTv ? <p className="setting-note">Use a YouTube, Vimeo, TikTok, VideoPress, or WordPress.tv video URL.</p> : null}
    </InspectorAccordionSection>
    <InspectorAccordionSection title="Native video background">
      <label><span>Direct video file URL</span><TextInput type="url" value={nativeVideoUrl} onChange={event => { setNativeVideoDraft({ blockId: block.id, url: event.target.value }); setVideoError(""); }} placeholder="https://example.com/video.mp4" /></label>
      <p className="setting-note">Use a direct HTTPS video file URL or a local file path. Provider pages belong in Background video URL.</p>
      {block.videoBackground ? <p className="setting-note" role="status">Remove the provider background before adding a native video source.</p> : null}
      {nativeVideoUrl && !canSaveNativeVideo ? <p className="setting-note" role="alert">Enter a direct HTTPS URL or root-relative local video path.</p> : null}
      {block.nativeVideoUrl ? <div className="cover-video-actions"><button type="button" className="paragraph-reset-button" disabled={disabled || !canSaveNativeVideo || Boolean(block.videoBackground)} onClick={saveNativeVideo}>Update native video</button><button type="button" className="paragraph-reset-button" disabled={disabled} onClick={() => { const next = { ...block }; delete next.nativeVideoUrl; onChange(next); setNativeVideoDraft({ blockId: block.id, url: "" }); }}>Remove native video</button></div> : <button type="button" className="paragraph-reset-button" disabled={disabled || !canSaveNativeVideo || Boolean(block.videoBackground)} onClick={saveNativeVideo}>Add native video</button>}
    </InspectorAccordionSection>
    <InspectorAccordionSection title="Dimensions">
      <ImageDimensionsSetting aspectRatio={ratio} displayWidth={block.displayWidth} displayHeight={block.displayHeight} scale={block.scale === "contain" ? "contain" : "cover"} scaleOptions={["cover", "contain"]} onAspectRatioChange={aspectRatio => onChange({ ...block, aspectRatio })} onWidthChange={displayWidth => onChange({ ...block, displayWidth })} onHeightChange={displayHeight => onChange({ ...block, displayHeight })} onScaleChange={scale => onChange({ ...block, scale: scale === "contain" ? "contain" : "cover" })} disabled={disabled} />
      <ParagraphLengthSetting label="Minimum height" value={visualStyle.minHeight} min={0} max={4000} onChange={minHeight => updateVisualStyle({ minHeight })} disabled={disabled} />
      <CheckboxControl className="checkbox-setting" checked={block.innerContentWidth !== false} onChange={innerContentWidth => onChange({ ...block, innerContentWidth })} label={<>Inner blocks use content width</>} disabled={disabled} />
    </InspectorAccordionSection>
    {(block.src || block.mediaId) && hasImageFrame && block.scale !== "contain" ? <InspectorAccordionSection title="Position"><FocalPositionSetting x={block.focalX} y={block.focalY} onXChange={focalX => onChange({ ...block, focalX })} onYChange={focalY => onChange({ ...block, focalY })} disabled={disabled} /></InspectorAccordionSection> : null}
    <InspectorAccordionSection title="Color">
      <BackgroundSelection mode={overlayMode} colour={visualStyle.backgroundColor} gradient={visualStyle.backgroundGradient} onModeChange={setOverlayMode} onColourChange={backgroundColor => updateVisualStyle({ backgroundColor, backgroundGradient: undefined })} onGradientChange={backgroundGradient => updateVisualStyle({ backgroundGradient, backgroundColor: undefined })} />
      {(visualStyle.backgroundColor || visualStyle.backgroundGradient) ? <button type="button" className="paragraph-reset-button" onClick={() => { updateVisualStyle({ backgroundColor: undefined, backgroundGradient: undefined }); setOverlayMode("colour"); }}>Reset overlay colour</button> : null}
      <label className="featured-image-overlay-opacity"><span>Overlay opacity — {block.dimRatio}%</span><RangeControl aria-label="Overlay opacity" min={0} max={100} step={1} value={block.dimRatio} onChange={event => onChange({ ...block, dimRatio: Number(event.currentTarget.value) })} /></label>
    </InspectorAccordionSection>
    {resolutions ? <InspectorAccordionSection title="Resolution"><ImageResolutionSetting value={block.imageResolution} choices={resolutions.choices} canPrepare={resolutions.canPrepare} preparing={resolutions.preparing} onPrepare={resolutions.onPrepare} disabled={disabled} onChange={imageResolution => onChange({ ...block, imageResolution })} /></InspectorAccordionSection> : null}
    <InspectorAccordionSection title="Filters"><DuotoneControl value={block.duotone} inheritedValue={inheritedDuotone} disabled={disabled} allowClearWhenUnset onChange={duotone => onChange({ ...block, duotone })} onReset={() => { const next = { ...block }; delete next.duotone; onChange(next); }} /></InspectorAccordionSection>
  </div>;
}

function CoverImageInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "cover-image" }>; onChange: (block: ContentBlock) => void }) {
  const inheritedDuotone = useImageDuotoneInheritance(block);
  const ratio = block.aspectRatio ?? "original";
  const overlay = block.overlay;
  const [overlayMode, setOverlayMode] = useState<"colour" | "gradient">(overlay?.gradient ? "gradient" : "colour");
  function updateOverlay(changes: Partial<NonNullable<typeof overlay>>) {
    onChange({ ...block, overlay: { opacity: overlay?.opacity ?? 0, ...overlay, ...changes } });
  }
  return <>
    <InspectorAccordionSection title="Link settings">
      <CheckboxControl className="checkbox-setting" checked={Boolean(block.isLink)} onChange={checked => onChange({ ...block, isLink: checked })} label={<>Link to post</>} />
      {block.isLink ? <><CheckboxControl className="checkbox-setting" checked={block.linkTarget === "_blank"} onChange={checked => onChange({ ...block, linkTarget: checked ? "_blank" : "_self" })} label={<>Open in new tab</>} /><label><span>Link rel</span><TextInput value={block.rel ?? ""} onChange={(event) => onChange({ ...block, rel: event.target.value || undefined })} placeholder="nofollow sponsored" /></label></> : null}
    </InspectorAccordionSection>
    <InspectorAccordionSection title="Filters"><DuotoneControl value={block.duotone} inheritedValue={inheritedDuotone} onChange={duotone => onChange({ ...block, duotone })} onReset={() => { const next = { ...block }; delete next.duotone; onChange(next); }} /></InspectorAccordionSection>
    <InspectorAccordionSection title="Overlay">
      <BackgroundSelection mode={overlayMode} colour={overlay?.colour} gradient={overlay?.gradient} onModeChange={setOverlayMode} onColourChange={colour => updateOverlay({ colour, gradient: undefined })} onGradientChange={gradient => updateOverlay({ gradient, colour: undefined })} />
      <label className="featured-image-overlay-opacity"><span>Opacity — {overlay?.opacity ?? 0}%</span><RangeControl aria-label="Overlay opacity" min={0} max={100} step={1} value={overlay?.opacity ?? 0} onChange={event => updateOverlay({ opacity: Number(event.currentTarget.value) })} /></label>
      {overlay ? <button type="button" className="paragraph-reset-button" onClick={() => { const next = { ...block }; delete next.overlay; onChange(next); }}>Reset overlay</button> : null}
    </InspectorAccordionSection>
    <InspectorAccordionSection title="Dimensions">
      <ImageDimensionsSetting aspectRatio={ratio} displayWidth={block.displayWidth} displayHeight={block.displayHeight} scale={block.scale} scaleOptions={["cover", "contain", "fill"]} onAspectRatioChange={aspectRatio => onChange({ ...block, aspectRatio, ...(aspectRatio !== "original" ? { displayHeight: undefined } : {}) })} onWidthChange={displayWidth => onChange({ ...block, displayWidth })} onHeightChange={displayHeight => onChange({ ...block, displayHeight })} onScaleChange={scale => onChange({ ...block, scale })} />
    </InspectorAccordionSection>
  </>;
}

function DividerInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "separator" }>; onChange: (block: ContentBlock) => void }) {
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
    <InspectorAccordionSection title="Styles"><label><span>Style</span><SelectControl value={block.style ?? "default"} onChange={(event) => onChange({ ...block, style: event.target.value as "default" | "wide" | "dots" })}><option value="default">Default</option><option value="wide">Wide line</option><option value="dots">Dots</option></SelectControl></label></InspectorAccordionSection>
    <InspectorAccordionSection className="inspector-panel" title="Background">
      <BackgroundSelection mode={backgroundMode} colour={style.backgroundColor} gradient={style.backgroundGradient} onModeChange={setBackgroundMode} onColourChange={value => updateBackground(value, undefined)} onGradientChange={value => updateBackground(undefined, value)} />
      {style.backgroundGradient ? <button type="button" className="paragraph-reset-button" onClick={() => { updateBackground(undefined, undefined); setBackgroundMode("colour"); }}>Reset background</button> : null}
    </InspectorAccordionSection>
    <InspectorAccordionSection title="Dimensions"><ParagraphLengthSetting key={`${block.id}-margin`} label="Margin" value={style.margin} min={-100} max={200} onChange={(value) => updateVisualStyle({ margin: value })} /></InspectorAccordionSection>
    <AdvancedFieldsInspector block={block} onChange={onChange} fields={{ anchor: true, className: true, additionalCss: true }}>
      <label><span>HTML element</span><SelectControl value={block.tagName ?? "hr"} onChange={event => onChange({ ...block, tagName: event.target.value as "hr" | "div" })}><option value="hr">Default (&lt;hr&gt;)</option><option value="div">&lt;div&gt;</option></SelectControl></label>
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
        <SelectControl value={block.layout} onChange={(event) => update({ layout: event.target.value as LayoutMode })}>
          <option value="stack">Stack</option><option value="row">Row</option><option value="columns">Columns</option><option value="grid">Grid</option>
        </SelectControl>
      </label> : null}
      <div className="inspector-two-column">
        <label>
          <span>Horizontal alignment</span>
          <SelectControl value={block.horizontalAlign ?? ""} onChange={(event) => update({ horizontalAlign: (event.target.value || undefined) as LayoutBlock["horizontalAlign"] })}>
            <option value="">Default</option>
            <option value="left">Left</option>
            <option value="centre">Centre</option>
            <option value="right">Right</option>
            <option value="stretch">Stretch</option>
          </SelectControl>
        </label>
        <label>
          <span>Vertical alignment</span>
          <SelectControl value={block.verticalAlign ?? ""} onChange={(event) => update({ verticalAlign: (event.target.value || undefined) as LayoutBlock["verticalAlign"] })}>
            <option value="">Default</option>
            <option value="top">Top</option>
            <option value="centre">Centre</option>
            <option value="bottom">Bottom</option>
            <option value="stretch">Stretch</option>
          </SelectControl>
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
        <SelectControl value={block.contentWidth ?? ""} onChange={(event) => update({ contentWidth: (event.target.value || undefined) as LayoutBlock["contentWidth"] })}>
          <option value="">Default</option>
          <option value="constrained">Constrained</option>
          <option value="full">Full width</option>
        </SelectControl>
      </label>
      {block.layout === "columns" ? (
        <label>
          <span>Columns</span>
          <SelectControl value={block.columns ?? 2} onChange={(event) => update({ columns: Number(event.target.value) })}>
            {[1, 2, 3, 4, 5, 6].map((count) => <option value={count} key={count}>{count}</option>)}
          </SelectControl>
        </label>
      ) : null}
      {block.layout === "grid" ? <>
        <label>
          <span>Max. columns</span>
          <SelectControl value={block.columns ?? 3} onChange={(event) => update({ columns: Number(event.target.value) })}>
            {[1, 2, 3, 4, 5, 6].map((count) => <option value={count} key={count}>{count}</option>)}
          </SelectControl>
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
    {block.layout === "flow" ? <fieldset className="group-layout-dimension-group">
      <legend>Block spacing</legend>
      <LayoutSpacingSetting label="Block spacing" value={block.rowGap ?? block.gap} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.gap[0]} max={LAYOUT_VALUE_LIMITS.gap[1]} onChange={value => update({ rowGap: value, ...(value === undefined ? { gap: undefined } : {}) })} />
    </fieldset> : <fieldset className="group-layout-dimension-group"><legend>Block spacing</legend><div className="inspector-two-column">
      <LayoutSpacingSetting label="Horizontal gap" value={block.columnGap ?? block.gap} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.gap[0]} max={LAYOUT_VALUE_LIMITS.gap[1]} onChange={columnGap => update({ columnGap })} />
      <LayoutSpacingSetting label="Vertical gap" value={block.rowGap ?? block.gap} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.gap[0]} max={LAYOUT_VALUE_LIMITS.gap[1]} onChange={rowGap => update({ rowGap })} />
    </div></fieldset>}
  </>;
}

function GroupPositionInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "group" }>; onChange: (block: ContentBlock) => void }) {
  const [positionVisibility, setPositionVisibility] = useState(() => ({ blockId: block.id, configuredPosition: block.position, visible: Boolean(block.position) }));
  const positionVisible = positionVisibility.blockId === block.id && positionVisibility.configuredPosition === block.position
    ? positionVisibility.visible
    : Boolean(block.position);
  const visible = new Set(positionVisible ? ["position"] : []);
  return <InspectorToolsSection title="Position" options={[{ id: "position", label: "Position" }]} visible={visible} onToggle={() => setPositionVisibility({ blockId: block.id, configuredPosition: block.position, visible: !positionVisible })} onReset={() => { setPositionVisibility({ blockId: block.id, configuredPosition: block.position, visible: false }); onChange({ ...block, position: undefined }); }}>
    <label><span>Position</span><SelectControl value={block.position ?? ""} onChange={event => onChange({ ...block, position: event.target.value === "sticky" ? "sticky" : undefined })}><option value="">Default</option><option value="sticky">Sticky</option></SelectControl></label>
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
    <CheckboxControl className="checkbox-setting" checked={block.stackAt !== "never"} onChange={checked => update({ stackAt: checked ? block.stackAt === "never" || !block.stackAt ? "mobile" : block.stackAt : "never" })} label={<>Stack on mobile</>} />
    <label><span>Vertical alignment</span><SelectControl value={block.verticalAlign ?? "stretch"} onChange={event => update({ verticalAlign: event.target.value as ColumnsBlock["verticalAlign"] })}><option value="top">Top</option><option value="centre">Centre</option><option value="bottom">Bottom</option><option value="stretch">Stretch</option></SelectControl></label>
    <p className="setting-note">Stack columns on mobile when the available width is limited.</p>
  </InspectorAccordionSection>;
}

function ColumnInspector({ block, onChange, onWidthChange, onWidthUnitChange, widthMax }: { block: ColumnBlock; onChange: (block: ContentBlock) => void; onWidthChange?: (columnId: string, width: number) => void; onWidthUnitChange?: (columnId: string, width: number, unit: ColumnWidthUnit) => void; widthMax: number }) {
  const update = (changes: Partial<ColumnBlock>) => onChange({ ...block, ...changes });
  const widthUnit: ColumnWidthUnit = block.widthUnit ?? "%";
  const width = block.width ?? 100;
  return <InspectorAccordionSection title="Column settings">
    <label><span>Width</span><NumberUnitField inputProps={{ min: widthUnit === "%" ? 5 : 1, max: widthUnit === "%" ? widthMax : 2000, step: "1", value: Math.round(width), disabled: !onWidthChange, "aria-label": "Column width value", onChange: event => { const nextWidth = Math.max(widthUnit === "%" ? 5 : 1, Math.min(widthUnit === "%" ? widthMax : 2000, Number(event.target.value) || 1)); if (widthUnit === "%") onWidthChange?.(block.id, nextWidth); else update({ width: nextWidth }); } }} unitProps={{ value: widthUnit, "aria-label": "Column width unit", disabled: !onWidthChange, onChange: event => { const unit = event.target.value as ColumnWidthUnit; if (onWidthUnitChange) { onWidthUnitChange(block.id, width, unit); return; } const maxWidth = unit === "%" ? (widthUnit === "%" ? widthMax : Math.max(5, widthMax - 5)) : 2000; const nextWidth = Math.max(unit === "%" ? 5 : 1, Math.min(maxWidth, width)); update({ width: nextWidth, widthUnit: unit === "%" ? undefined : unit as Exclude<ColumnWidthUnit, "%"> }); } }} units={["%", "px", "em", "rem", "vw", "vh"]} /></label>
    <label><span>Vertical alignment</span><SelectControl value={block.verticalAlign ?? ""} onChange={event => update({ verticalAlign: (event.target.value || undefined) as ColumnBlock["verticalAlign"] })}><option value="">Use Columns setting</option><option value="top">Top</option><option value="centre">Centre</option><option value="bottom">Bottom</option><option value="stretch">Stretch</option></SelectControl></label>
    <LayoutSpacingSetting label="Block gap" value={block.rowGap ?? block.gap} presets={LAYOUT_SPACING_PRESETS} min={LAYOUT_VALUE_LIMITS.gap[0]} max={LAYOUT_VALUE_LIMITS.gap[1]} onChange={(rowGap) => update({ rowGap })} />
    <p className="setting-note">Add and edit blocks inside this column on the canvas.</p>
  </InspectorAccordionSection>;
}
