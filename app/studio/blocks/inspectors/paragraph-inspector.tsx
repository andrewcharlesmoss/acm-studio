"use client";
import { expandBoxLengths, updatePaddingSides, updateMarginSides, updateBorderWidthSides, updateBorderRadiusCorners } from "../../../content/box-lengths";
import { referenceSpacing } from "../../site-editor/reference-spacing";
import { SettingInheritanceProvider, SettingLabel } from "../../controls/setting-inheritance";
import { useContentSettingInheritance, useEffectiveContentSettingStyle } from "../style-inheritance";

import { SelectControl, TextInput } from "../../controls/native-fields";
import { useResponsiveStyleScope } from "../../responsive-style-context";
import { editableViewportStyle, replaceViewportStyle, RESPONSIVE_STYLE_FIELDS } from "../../../content/responsive-styles";
import { Fragment, useId, useRef, useState, type ReactNode } from "react";
import type { ButtonInteractionState, ButtonWidth, ContentBlock, ParagraphBackgroundGradient, ParagraphFontSize, ParagraphStyle } from "../../../content/model";
import { blockContrastWarning, paragraphLinkColourHasPoorContrast, type BlockContrastWarning } from "../../../content/paragraph-styles";
import { LAYOUT_SPACING_PRESETS } from "../../../content/layout";
import { InspectorAccordionSection } from "../../inspector-accordion";
import { InspectorToolsSection, type InspectorMenuOption, type InspectorToolOption } from "../../inspector-tools-section";
import { BoxLengthSetting } from "../../box-length-setting";
import { inspectorStyleHasValues, resetSupportedInspectorStyleFields, setInspectorFitText, setInspectorFontSize } from "../inspector-style-actions";
import { FontFamilySetting } from "../../controls/font-family-setting";
import { resetGroupDimensionFields } from "../group-dimensions";
import { ElementColourSetting } from "../../controls/element-colour-setting";
import { PaletteColourSetting } from "../../controls/palette-colour-setting";
import { BackgroundSelection } from "../../controls/background-selection";
import { useRenderedColours } from "../../controls/rendered-colour-contrast";
import { useWebsiteDesignContext } from "../../site-editor/website-design-surface";
import { useWebsiteFontAvailability } from "../../site-editor/font-availability-context";
import { previewStyleDetails } from "../../site-editor/styles-preview-state";
import { visibleTypographyFonts } from "../../site-editor/typography-preview-model";
import { previewColourEntries } from "../../site-editor/colours-preview-model";
import type { ColourPaletteEntry } from "../../controls/colour-picker";
import { RangeControl } from "../../controls/range-control";
import { ToggleSetting } from "../../controls/toggle-setting";
import { LineHeightSetting } from "../../controls/line-height-setting";
import { BorderSettings } from "../../controls/border-settings";
import { FocalPositionSetting } from "../../controls/focal-position-setting";
import { FontSizeAppearanceSetting } from "../../controls/font-size-appearance-setting";
import { ParagraphLengthSetting } from "../../controls/paragraph-length-setting";
import { capabilityProfileFor, retainedLegacyStyleControls, scopedStyleSectionIds } from "../capability-profiles";

type StyledBlock = ContentBlock;

function hasLegacyStyle(block: ContentBlock): block is Extract<ContentBlock, { type: "paragraph" | "columns" | "column" }> {
  return block.type === "paragraph" || block.type === "columns" || block.type === "column";
}

const lowContrastWarningMessage = "This color has poor contrast against the background. Consider increasing contrast.";

function describeBlockContrastWarning(warning: BlockContrastWarning | null, style: ParagraphStyle): string | undefined {
  if (!warning) return undefined;
  if (warning.kind === "contrast") return lowContrastWarningMessage;
  const inheritedFields = [
    ...(!(warning.target === "link" ? style.linkColor : style.textColor) ? [warning.target === "link" ? "link colour" : "text colour"] : []),
    ...(!style.backgroundColor && !style.backgroundGradient ? ["background colour"] : []),
  ];
  return `${warning.message}${inheritedFields.length ? ` The effective ${inheritedFields.join(" and ")} may be inherited from Site Editor or parent styles.` : ""}`;
}

export function ParagraphInspector({ inheritanceParentId, profileOverride, block, interactionState = "default", onChange, fontSizeViewMode, onFontSizeViewModeChange, backgroundImageControls, backgroundImageOptions, groupLayoutControls, groupDimensionControls, onResetGroupDimensions }: { inheritanceParentId?: string; profileOverride?: ReturnType<typeof capabilityProfileFor>; block: StyledBlock; interactionState?: ButtonInteractionState | "default"; onChange: (block: ContentBlock) => void; fontSizeViewMode: "presets" | "custom" | null; onFontSizeViewModeChange: (mode: "presets" | "custom") => void; backgroundImageControls?: ReactNode; backgroundImageOptions?: ReactNode; groupLayoutControls?: ReactNode; groupDimensionControls?: ReactNode; onResetGroupDimensions?: () => void }) {
  const { editingViewport } = useResponsiveStyleScope();
  const deviceScope = editingViewport !== "desktop";
  const inspectorRef = useRef<HTMLDivElement>(null);
  const renderedColours = useRenderedColours(inspectorRef, block.id);
  const website = useWebsiteDesignContext();
  const fallbackFontStyles = useWebsiteFontAvailability();
  const fontStyles = website?.design.styles ?? fallbackFontStyles;
  const websiteFonts = fontStyles ? visibleTypographyFonts(previewStyleDetails(fontStyles).typography, fontStyles.typography ?? {}).filter(font => !fontStyles.typography?.disabledFonts?.includes(font.family)).map(font => font.family) : undefined;
  const websitePalette = website ? previewColourEntries(previewStyleDetails(website.design.styles).palette, website.design.styles.colours).map(({ key, label, colour }) => ({ key, label, colour })) : undefined;
  const baseVisualStyle = hasLegacyStyle(block) ? block.style ?? {} : block.visualStyle ?? {};
  const currentStoredStyle: ParagraphStyle = block.type === "button" && interactionState !== "default" ? block.interactionStyles?.[interactionState] ?? {} : baseVisualStyle;
  const style = editableViewportStyle(currentStoredStyle, editingViewport);
  const inheritance = useContentSettingInheritance(block, style, editingViewport, interactionState, inheritanceParentId);
  const effectiveStyle = useEffectiveContentSettingStyle(block, editingViewport, interactionState, inheritanceParentId);
  const effectivePadding = expandBoxLengths(effectiveStyle.padding);
  for (const [index, side] of (["top", "right", "bottom", "left"] as const).entries()) if (effectiveStyle.paddingSides?.[side] !== undefined) effectivePadding[index] = effectiveStyle.paddingSides[side]!;
  const effectiveMargin = expandBoxLengths(effectiveStyle.margin);
  for (const [index, side] of (["top", "right", "bottom", "left"] as const).entries()) if (effectiveStyle.marginSides?.[side] !== undefined) effectiveMargin[index] = effectiveStyle.marginSides[side]!;
  const effectiveBorderWidth = expandBoxLengths(effectiveStyle.borderWidth);
  for (const [index, side] of (["top", "right", "bottom", "left"] as const).entries()) if (effectiveStyle.borderWidthSides?.[side] !== undefined) effectiveBorderWidth[index] = effectiveStyle.borderWidthSides[side]!;
  const effectiveRadius = expandBoxLengths(effectiveStyle.borderRadius);
  for (const [index, corner] of (["topLeft", "topRight", "bottomRight", "bottomLeft"] as const).entries()) if (effectiveStyle.borderRadiusCorners?.[corner] !== undefined) effectiveRadius[index] = effectiveStyle.borderRadiusCorners[corner]!;
  const displayedStyle = block.type === "paragraph" ? effectiveStyle : style;
  const websiteSize = ["small", "medium", "large", "x-large", "xx-large"].includes(effectiveStyle.websitePreset ?? "") ? effectiveStyle.websitePreset as ParagraphFontSize : undefined;
  const weights: Record<number, string> = { 100: "thin", 200: "extra-light", 300: "light", 400: "regular", 500: "medium", 600: "semi-bold", 700: "bold", 800: "extra-bold", 900: "black" };
  const weight = effectiveStyle.websiteWeight === undefined ? undefined : weights[effectiveStyle.websiteWeight];
  const websiteAppearance = weight ? `${weight === "regular" && effectiveStyle.websiteItalic ? "" : weight}${effectiveStyle.websiteItalic ? weight === "regular" ? "italic" : "-italic" : ""}` as ParagraphStyle["appearance"] : effectiveStyle.websiteItalic ? "italic" : undefined;
  const textContrastWarning = blockContrastWarning({ backgroundColor: renderedColours?.background, textColor: renderedColours?.text, enableAlphaChecker: true });
  const buttonWidth = block.type === "button"
    ? interactionState === "default" ? block.width : block.interactionStyles?.[interactionState]?.width
    : undefined;
  const profile = profileOverride ?? capabilityProfileFor(block.type);
  const visibleSource = profileOverride && profileOverride.label === "List Item" ? undefined : block.type === "subtitle" ? "studio" : "gutenberg";
  const styleControls = [...profile.controls, ...retainedLegacyStyleControls(profile, style)].filter(control => control.fields.length > 0 && (!deviceScope || control.fields.some(field => RESPONSIVE_STYLE_FIELDS.includes(field as typeof RESPONSIVE_STYLE_FIELDS[number])) && !["width", "gaps", "fit-text", "drop-cap", "line-indent"].includes(control.id) && !(currentStoredStyle.fitText && ["size", "columns"].includes(control.id))) && (visibleSource === undefined || control.source === visibleSource));
  const optionsFor = (section: "typography" | "dimensions" | "border" | "elements"): InspectorToolOption[] => styleControls.filter(control => control.enabled !== false && control.section === section).map(({ id, label, source }) => ({ id, label, source }));
  const defaults = profile.defaults;
  const defaultTypography = new Set((defaults.typography ?? []).filter(id => !deviceScope || styleControls.some(control => control.id === id)));
  const defaultDimensions = new Set((defaults.dimensions ?? []).filter(id => !deviceScope || styleControls.some(control => control.id === id)));
  const defaultBorder = new Set((defaults.border ?? []).filter(id => !deviceScope || styleControls.some(control => control.id === id)));
  const defaultElements = new Set((defaults.elements ?? []).filter(id => !deviceScope || styleControls.some(control => control.id === id)));
  const [backgroundMode, setBackgroundMode] = useState<"colour" | "gradient">(style.backgroundGradient ? "gradient" : "colour");
  const fontSizeMode = fontSizeViewMode
    ? fontSizeViewMode
    : displayedStyle.fontSizeCustom ? "custom" : "presets";
  const activeBackgroundMode = backgroundMode;
  const paragraphSpecificOptions = block.type === "paragraph";
  const typographyOptions = optionsFor("typography");
  const dimensionOptions = optionsFor("dimensions");
  const borderOptions = optionsFor("border");
  const elementOptions = optionsFor("elements");
  const marginLayout = ["code", "columns"].includes(block.type) ? "vertical" as const : "axes" as const;
  const [typographyUserVisible, setTypographyVisible] = useState(() => new Set<string>());
  const [dimensionsUserVisible, setDimensionsVisible] = useState(() => new Set<string>());
  const [hiddenDefaultDimensions, setHiddenDefaultDimensions] = useState(() => new Set<string>());
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
  const dimensionsVisible = new Set([...[...defaultDimensions].filter(id => !hiddenDefaultDimensions.has(id)), ...[...dimensionsUserVisible, ...[(style.padding || style.paddingSides) && "padding", (style.margin || style.marginSides) && "margin", style.minHeight && "min-height", style.minWidth && "min-width", style.blockGap !== undefined && "block-gap", block.type === "button" && buttonWidth && "width", block.type === "group" && (block.gap !== undefined || block.rowGap !== undefined || block.columnGap !== undefined) && "gaps"].filter((value): value is string => Boolean(value))].filter(id => scopedDimensionIds.has(id))]);
  const borderVisible = new Set([...defaultBorder, ...borderUserVisible, ...[
    (style.borderStyle || style.borderColor || style.borderWidth || style.borderWidthSides) && "border",
    (style.borderRadius || style.borderRadiusCorners) && "radius", style.shadow && "shadow",
  ].filter((value): value is string => Boolean(value) && scopedBorderIds.has(value as string))]);
  const scopedElementOptions = elementOptions.filter(option => (visibleSource === undefined || (option.source ?? "gutenberg") === visibleSource));
  const scopedElementIds = new Set(scopedElementOptions.map(option => option.id));
  const elementsVisible = new Set([...defaultElements, ...elementsUserVisible, ...[style.linkColor && "link-colour", style.linkHoverColor && "link-colour", (style.headingColor || style.headingBackgroundColor || style.headingBackgroundGradient) && "heading-colour", (style.buttonTextColor || style.buttonBackgroundColor || style.buttonBackgroundGradient) && "button-colour"].filter((value): value is string => Boolean(value) && scopedElementIds.has(value as string))]);
  const dropCapDisabled = block.type === "paragraph" && (block.align === "centre" || block.align === "right");
  const optionalTypographyOptions = scopedTypographyOptions.filter(option => !defaultTypography.has(option.id));
  const paragraphHasExplicitFontSize = Boolean(style.fontSize || style.fontSizeCustom);
  const paragraphMenuOptions: InspectorMenuOption[] = [
    ...(defaultTypography.has("colour") ? [{ id: style.textColor ? "reset-colour" : "colour", label: style.textColor ? "Reset Colour" : "Colour", checked: !style.textColor, disabled: !style.textColor }] : []),
    ...(defaultTypography.has("size") ? [{ id: paragraphHasExplicitFontSize ? "reset-size" : "size", label: paragraphHasExplicitFontSize ? "Reset Size" : "Size", checked: !paragraphHasExplicitFontSize, disabled: !paragraphHasExplicitFontSize }] : []),
  ];
  const typographyMenuOptions = optionalTypographyOptions;
  const optionalDimensionOptions = scopedDimensionOptions.filter(option => !defaultDimensions.has(option.id) || (profile.type === "template-content" && option.id === "gaps"));
  const optionalBorderOptions = scopedBorderOptions.filter(option => !defaultBorder.has(option.id));
  const optionalElementOptions = scopedElementOptions.filter(option => !defaultElements.has(option.id));
  const backgroundControl = profile.controls.find(control => control.id === "background");
  const showBackground = backgroundControl && (visibleSource === undefined || backgroundControl.source === visibleSource);
  function writeStyle(nextStyle: ParagraphStyle) {
    const updatedStyle = replaceViewportStyle(currentStoredStyle, editingViewport, nextStyle);
    if (block.type === "button" && interactionState !== "default") {
      const interactionStyles = { ...(block.interactionStyles ?? {}) };
      if (updatedStyle) interactionStyles[interactionState] = updatedStyle;
      else delete interactionStyles[interactionState];
      onChange({ ...block, interactionStyles: Object.keys(interactionStyles).length ? interactionStyles : undefined });
    } else onChange(hasLegacyStyle(block) ? { ...block, style: updatedStyle } : { ...block, visualStyle: updatedStyle });
  }
  function clearTools(ids: Iterable<string>, resetGroupLayout = false) {
    const selectedIds = [...ids];
    if (deviceScope) { writeStyle(resetSupportedInspectorStyleFields(style, selectedIds, styleControls)); return; }
    const nextStyle = replaceViewportStyle(currentStoredStyle, "desktop", resetSupportedInspectorStyleFields(style, selectedIds, styleControls)) ?? {};
    if (block.type === "group" && (resetGroupLayout || selectedIds.includes("padding") || selectedIds.includes("gaps"))) {
      onChange(resetGroupDimensionFields(block, nextStyle, { padding: selectedIds.includes("padding"), layout: resetGroupLayout || selectedIds.includes("gaps") }));
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
  const textContrastWarningMessage = describeBlockContrastWarning(textContrastWarning, style);
  const sharedStyleSectionContent: Record<string, ReactNode> = {
    typography: <InspectorToolsSection showCloseControl={false} title="Typography" options={typographyMenuOptions} visible={typographyVisible} canReset={optionalTypographyOptions.some(option => typographyVisible.has(option.id)) || inspectorStyleHasValues(style, typographyVisible, styleControls)} menuOptions={paragraphMenuOptions} onMenuOptionSelect={id => { if (id === "reset-size") updateFontSize(undefined, "presets"); else if (id === "reset-colour") updateStyle("textColor", undefined); }} onToggle={id => toggleTool(id, typographyVisible, setTypographyVisible)} onReset={() => { clearTools(typographyVisible); setTypographyVisible(new Set()); }}>
      {typographyVisible.has("colour") ? <PaletteColourSetting palette={websitePalette} enableAlpha={Boolean(websitePalette)} label="Colour" row value={style.textColor} inheritedValue={block.type === "paragraph" ? renderedColours?.text : undefined} onChange={(value) => updateStyle("textColor", value)} defaultWarning={Boolean(textContrastWarning)} warningMessage={describeBlockContrastWarning(textContrastWarning, style)} announceWarning={false} /> : null}
      {(typographyVisible.has("size") || typographyVisible.has("family") || typographyVisible.has("appearance")) ? <FontSizeAppearanceSetting size={displayedStyle.fontSize ?? (block.type === "paragraph" ? websiteSize : undefined)} customSize={displayedStyle.fontSizeCustom} appearance={displayedStyle.appearance ?? (block.type === "paragraph" ? websiteAppearance : undefined)} mode={fontSizeMode} onModeChange={onFontSizeViewModeChange} onSizeChange={value => updateFontSize(value, "presets")} onCustomSizeChange={value => updateFontSize(value, "custom")} onAppearanceChange={value => updateStyle("appearance", value)} paragraphLabels={paragraphSpecificOptions || ["heading", "list", "quote", "pullquote", "table", "code"].includes(block.type)} showSize={typographyVisible.has("size")} showAppearance={typographyVisible.has("appearance")} fontControl={typographyVisible.has("family") ? <FontFamilySetting label={paragraphSpecificOptions ? "Font" : "Font family"} value={style.fontFamily} displayValue={block.type === "paragraph" ? displayedStyle.fontFamily ?? effectiveStyle.websiteFont : undefined} families={block.type === "code" ? ["monospace"] : undefined} websiteFamilies={block.type === "code" ? undefined : websiteFonts} onChange={value => updateStyle("fontFamily", value)} /> : null} /> : null}
      {typographyVisible.has("line-height") ? <LineHeightSetting value={displayedStyle.lineHeight} onChange={value => updateStyle("lineHeight", value)} /> : null}
      {typographyVisible.has("letter-spacing") ? <label><SettingLabel>Letter spacing</SettingLabel><TextInput value={displayedStyle.letterSpacing ?? ""} onChange={(event) => updateStyle("letterSpacing", event.target.value)} placeholder="0" /></label> : null}
      {typographyVisible.has("line-indent") ? <ParagraphLengthSetting key={`${block.id}-indent`} label="Line indent" value={displayedStyle.textIndent} min={-100} max={200} onChange={(value) => updateStyle("textIndent", value)} /> : null}
      {typographyVisible.has("columns") ? <label><SettingLabel>Columns</SettingLabel><SelectControl value={displayedStyle.textColumns ?? ""} onChange={(event) => updateStyle("textColumns", event.target.value ? Number(event.target.value) : undefined)}><option value="">Default</option>{[1, 2, 3, 4].map(count => <option key={count} value={count}>{count}</option>)}</SelectControl></label> : null}
      {typographyVisible.has("decoration") ? <label><SettingLabel>Decoration</SettingLabel><SelectControl value={displayedStyle.textDecoration ?? ""} onChange={(event) => updateStyle("textDecoration", (event.target.value || undefined) as ParagraphStyle["textDecoration"])}><option value="">Default</option><option value="none">None</option><option value="underline">Underline</option><option value="line-through">Strikethrough</option></SelectControl></label> : null}
      {typographyVisible.has("orientation") ? <label><SettingLabel>Orientation</SettingLabel><SelectControl value={displayedStyle.orientation ?? ""} onChange={event => updateStyle("orientation", (event.target.value || undefined) as ParagraphStyle["orientation"])}><option value="">Default</option><option value="horizontal-tb">Horizontal</option><option value="vertical-rl">Vertical</option></SelectControl></label> : null}
      {typographyVisible.has("letter-case") ? <label><SettingLabel>Letter case</SettingLabel><SelectControl value={displayedStyle.textTransform ?? ""} onChange={(event) => updateStyle("textTransform", (event.target.value || undefined) as ParagraphStyle["textTransform"])}><option value="">Default</option><option value="none">Normal</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option><option value="capitalize">Capitalise</option></SelectControl></label> : null}
      {typographyVisible.has("drop-cap") ? <ToggleSetting inheritanceLabel="Drop cap" label={<>Drop cap{dropCapDisabled ? <small className="inspector-setting-help">Not available for aligned text.</small> : null}</>} checked={Boolean(style.dropCap)} disabled={dropCapDisabled} onChange={enabled => updateStyle("dropCap", enabled || undefined)} /> : null}
      {typographyVisible.has("fit-text") ? <ToggleSetting inheritanceLabel="Fit text" label={<>Fit text{style.fitText && style.orientation === "vertical-rl" ? " (paused for vertical text)" : ""}</>} checked={Boolean(style.fitText)} onChange={updateFitText} /> : null}
      {typographyVisible.has("text-shadow") ? <label><SettingLabel>Text shadow</SettingLabel><SelectControl value={displayedStyle.textShadow ?? ""} onChange={event => updateStyle("textShadow", (event.target.value || undefined) as ParagraphStyle["textShadow"])}><option value="">Default</option><option value="none">None</option><option value="soft">Soft</option><option value="strong">Strong</option></SelectControl></label> : null}
    </InspectorToolsSection>,
    background: showBackground ? <GroupBackgroundSection group canReset={inspectorStyleHasValues(style, ["background"], styleControls)} onReset={() => writeStyle(resetSupportedInspectorStyleFields(style, ["background"], styleControls))}>
      <BackgroundSelection palette={websitePalette} enableAlpha={Boolean(websitePalette)} imageControl={deviceScope ? undefined : backgroundImageControls} mode={activeBackgroundMode} colour={style.backgroundColor} gradient={style.backgroundGradient} inheritedColour={block.type === "paragraph" && effectiveStyle.backgroundColor !== undefined && !style.backgroundGradient && !style.backgroundColor ? renderedColours?.background ?? undefined : undefined} inheritedGradient={block.type === "paragraph" && !style.backgroundGradient && !style.backgroundColor ? effectiveStyle.backgroundGradient : undefined} contrastWarning={textContrastWarningMessage ?? null} announceWarning={false} onModeChange={setBackgroundMode} onColourChange={value => updateBackground(value, undefined)} onGradientChange={value => updateBackground(undefined, value)} />
      {deviceScope ? null : backgroundImageOptions}
      {style.backgroundGradient ? <button type="button" className="paragraph-reset-button" onClick={() => { updateBackground(style.backgroundColor, undefined); setBackgroundMode("colour"); }}>Reset background</button> : null}
    </GroupBackgroundSection> : null,
    dimensions: <InspectorToolsSection showCloseControl={false} title="Dimensions" options={optionalDimensionOptions} visible={dimensionsVisible} canReset={optionalDimensionOptions.some(option => dimensionsVisible.has(option.id)) || inspectorStyleHasValues(style, dimensionsVisible, styleControls) || Boolean((block.type === "group" || block.type === "columns") && (block.paddingX !== undefined || block.paddingY !== undefined || block.gap !== undefined || block.rowGap !== undefined || block.columnGap !== undefined))} alwaysShow={block.type !== "group" && Boolean(groupDimensionControls)} onToggle={id => { if (profile.type === "template-content" && id === "gaps") { if (dimensionsVisible.has(id)) { clearTools([id]); setHiddenDefaultDimensions(new Set([id])); } else setHiddenDefaultDimensions(new Set()); } else toggleTool(id, dimensionsVisible, setDimensionsVisible); }} onReset={() => { clearTools(dimensionsVisible, true); if (block.type !== "group" && block.type !== "columns") onResetGroupDimensions?.(); setDimensionsVisible(new Set()); setHiddenDefaultDimensions(new Set()); }}>
      {block.type === "button" && dimensionsVisible.has("width") ? <label><SettingLabel>Width</SettingLabel><SelectControl aria-label="Button width" value={buttonWidth ?? ""} onChange={event => {
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
      }}><option value="">Auto</option><option value="25">25%</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option></SelectControl></label> : null}
      {dimensionsVisible.has("padding") ? <BoxLengthSetting key={`${block.id}-padding`} label="Padding" resolvedSides={block.type === "paragraph" ? effectivePadding : undefined} inheritedPresets={block.type === "paragraph" ? referenceSpacing : undefined} onSidesChange={block.type === "paragraph" ? (indices, value) => writeStyle(updatePaddingSides(style, indices, value)) : undefined} value={style.padding ?? (block.type === "group" && (block.paddingX !== undefined || block.paddingY !== undefined) ? `${block.paddingY ?? 0}px ${block.paddingX ?? 0}px` : undefined)} layout="all" presets={LAYOUT_SPACING_PRESETS} min={0} max={160} onChange={value => { if (block.type === "group" && !deviceScope) { const next = { ...style, padding: value }; if (!value) delete next.padding; onChange({ ...block, paddingX: undefined, paddingY: undefined, visualStyle: replaceViewportStyle(currentStoredStyle, "desktop", next) }); } else updateStyle("padding", value); }} /> : null}
      {dimensionsVisible.has("margin") ? <BoxLengthSetting key={`${block.id}-margin`} label="Margin" value={style.margin} resolvedSides={block.type === "paragraph" ? effectiveMargin : undefined} inheritedPresets={block.type === "paragraph" ? referenceSpacing : undefined} onSidesChange={block.type === "paragraph" ? (indices, value) => writeStyle(updateMarginSides(style, indices, value)) : undefined} layout={block.type === "group" || ["paragraph", "heading", "list", "quote", "pullquote", "table"].includes(block.type) ? "all" : marginLayout} presets={LAYOUT_SPACING_PRESETS} min={-100} max={200} onChange={(value) => updateStyle("margin", value)} /> : null}
      {dimensionsVisible.has("block-gap") ? <BoxLengthSetting label="Block spacing" layout="single" value={displayedStyle.blockGap} presets={LAYOUT_SPACING_PRESETS} min={0} max={200} onChange={value => updateStyle("blockGap", value)} /> : null}
      {dimensionsVisible.has("min-height") ? <ParagraphLengthSetting key={`${block.id}-min-height`} label="Minimum height" value={displayedStyle.minHeight} min={0} max={4000} onChange={(value) => updateStyle("minHeight", value)} /> : null}
      {dimensionsVisible.has("min-width") ? <ParagraphLengthSetting key={`${block.id}-min-width`} label="Minimum width" value={displayedStyle.minWidth} min={0} max={4000} onChange={(value) => updateStyle("minWidth", value)} /> : null}
      {!deviceScope && (block.type !== "group" || dimensionsVisible.has("gaps")) ? groupDimensionControls : null}
    </InspectorToolsSection>,
    border: <InspectorToolsSection showCloseControl={false} title="Border" options={optionalBorderOptions} visible={borderVisible} canReset={optionalBorderOptions.some(option => borderVisible.has(option.id)) || inspectorStyleHasValues(style, borderVisible, styleControls)} onToggle={id => toggleTool(id, borderVisible, setBorderVisible)} onReset={() => { clearTools(borderVisible); setBorderVisible(new Set()); }}>
      {borderVisible.has("border") ? <BorderSettings palette={websitePalette} enableAlpha={Boolean(websitePalette)} style={style} displayStyle={block.type === "paragraph" ? effectiveStyle : undefined} resolvedWidthSides={block.type === "paragraph" && (effectiveStyle.borderWidth !== undefined || effectiveStyle.borderWidthSides !== undefined) ? effectiveBorderWidth : undefined} onWidthSidesChange={block.type === "paragraph" ? (indices, value) => { const next = updateBorderWidthSides(style, indices, value); if (value !== undefined && (!effectiveStyle.borderStyle || effectiveStyle.borderStyle === "none")) next.borderStyle = "solid"; writeStyle(next); } : undefined} compact idPrefix={block.id} includeRadius={false} includeShadow={false} onChange={changes => { const nextStyle = { ...style, ...changes }; for (const key of Object.keys(nextStyle) as (keyof ParagraphStyle)[]) if (!nextStyle[key]) delete nextStyle[key]; writeStyle(nextStyle); }} /> : null}
      {borderVisible.has("radius") ? <BoxLengthSetting key={`${block.id}-radius`} label="Radius" value={style.borderRadius} resolvedSides={block.type === "paragraph" && (effectiveStyle.borderRadius !== undefined || effectiveStyle.borderRadiusCorners !== undefined) ? effectiveRadius : undefined} onSidesChange={block.type === "paragraph" ? (indices, value) => writeStyle(updateBorderRadiusCorners(style, indices, value)) : undefined} layout="all" corners min={0} max={100} canReset={false} onChange={value => { const next = { ...style }; if (value) next.borderRadius = value; else { delete next.borderRadius; delete next.borderRadiusCorners; } writeStyle(next); }} /> : null}
      {borderVisible.has("shadow") ? <label><SettingLabel>Shadow</SettingLabel><SelectControl value={style.shadow ?? ""} onChange={(event) => updateStyle("shadow", (event.target.value || undefined) as ParagraphStyle["shadow"])}><option value="">Default</option><option value="none">None</option><option value="soft">Soft</option><option value="strong">Strong</option></SelectControl></label> : null}
    </InspectorToolsSection>,
    elements: elementOptions.length ? <InspectorToolsSection showCloseControl={false} title="Elements" options={optionalElementOptions} visible={elementsVisible} onToggle={id => toggleTool(id, elementsVisible, setElementsVisible)} onReset={() => { clearTools(elementsVisible); setElementsVisible(new Set()); }}>
      {elementsVisible.has("heading-colour") ? <ElementColourSetting palette={websitePalette} label="Heading" foreground={style.headingColor} background={style.headingBackgroundColor} gradient={style.headingBackgroundGradient} onForeground={value => updateStyle("headingColor", value)} onBackground={value => { const next = { ...style, headingBackgroundColor: value }; delete next.headingBackgroundGradient; if (!value) delete next.headingBackgroundColor; writeStyle(next); }} onGradient={value => { const next = { ...style, headingBackgroundGradient: value }; delete next.headingBackgroundColor; if (!value) delete next.headingBackgroundGradient; writeStyle(next); }} /> : null}
      {elementsVisible.has("button-colour") ? <ElementColourSetting palette={websitePalette} label="Button" foreground={style.buttonTextColor} background={style.buttonBackgroundColor} gradient={style.buttonBackgroundGradient} onForeground={value => updateStyle("buttonTextColor", value)} onBackground={value => { const next = { ...style, buttonBackgroundColor: value }; delete next.buttonBackgroundGradient; if (!value) delete next.buttonBackgroundColor; writeStyle(next); }} onGradient={value => { const next = { ...style, buttonBackgroundGradient: value }; delete next.buttonBackgroundColor; if (!value) delete next.buttonBackgroundGradient; writeStyle(next); }} /> : null}
      {elementsVisible.has("link-colour") ? <LinkColourSetting palette={websitePalette} style={style} renderedColours={renderedColours} defaultValue={style.linkColor} inheritedDefault={block.type === "paragraph" ? renderedColours?.link ?? effectiveStyle.linkColor : undefined} hoverValue={style.linkHoverColor} inheritedHover={block.type === "paragraph" ? renderedColours?.linkHover ?? effectiveStyle.linkHoverColor : undefined} onDefaultChange={value => updateStyle("linkColor", value)} onHoverChange={value => updateStyle("linkHoverColor", value)} /> : null}
    </InspectorToolsSection> : null,
  };
  const orderedSectionIds = scopedStyleSectionIds(profile, style, visibleSource).filter(sectionId => sectionId in sharedStyleSectionContent);
  const orderedSharedStyleSections = orderedSectionIds.flatMap(sectionId => [
    <Fragment key={sectionId}>{sharedStyleSectionContent[sectionId]}</Fragment>,
    ...(sectionId === "background" && !deviceScope && groupLayoutControls ? [<Fragment key="group-layout">{groupLayoutControls}</Fragment>] : []),
  ]);
  return <SettingInheritanceProvider values={inheritance}><div ref={inspectorRef} className={`inspector-sections${block.type === "group" ? " group-block-inspector" : ""}`}>{orderedSharedStyleSections}</div></SettingInheritanceProvider>;
}

type ManagedBackgroundImageBlock = Extract<ContentBlock, { type: "quote" | "pullquote" | "group" | "heading" | "code" | "list" | "title" | "buttons" }>;

export function ManagedBackgroundImageInspector({ block, onChange, onOpenBackgroundMedia, embedded = false, detailsOnly = false }: {
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
    {!detailsOnly && onOpenBackgroundMedia ? <button type="button" className={embedded ? "paragraph-background-option group-background-image" : "choose-media-button"} aria-label={style.backgroundImageMediaId ? "Replace background image" : "Choose background image"} onClick={() => onOpenBackgroundMedia()}>{embedded ? <><span className="paragraph-background-mode-swatch is-image" aria-hidden="true" /><SettingLabel>Image</SettingLabel></> : style.backgroundImageMediaId ? "Replace background image" : "Choose background image"}</button> : null}
    {!embedded && style.backgroundImageMediaId ? <>
      <button type="button" className="paragraph-reset-button" onClick={() => updateStyle("backgroundImageMediaId", undefined)}>Remove background image</button>
      <label><SettingLabel>Image size</SettingLabel><SelectControl value={style.backgroundSize ?? "cover"} onChange={event => updateStyle("backgroundSize", event.target.value as ParagraphStyle["backgroundSize"])}><option value="cover">Cover</option><option value="contain">Contain</option><option value="fixed">Fixed size</option></SelectControl></label>
      {style.backgroundSize === "fixed" ? <label><span>Image width ({style.backgroundFixedSize ?? 200}px)</span><RangeControl aria-label="Background image width" min="50" max="2000" step="10" value={style.backgroundFixedSize ?? 200} onChange={event => updateStyle("backgroundFixedSize", Number(event.target.value))} /></label> : null}
      <ToggleSetting label="Repeat background image" checked={style.backgroundRepeat ? style.backgroundRepeat === "repeat" : style.backgroundSize === "fixed"} onChange={enabled => updateStyle("backgroundRepeat", enabled ? "repeat" : "no-repeat")} />
      <FocalPositionSetting x={style.backgroundPositionX} y={style.backgroundPositionY} onXChange={value => updateStyle("backgroundPositionX", value)} onYChange={value => updateStyle("backgroundPositionY", value)} presentation="range" label="Background image focal position" />
    </> : null}
  </>;
  return embedded || detailsOnly ? controls : <InspectorAccordionSection title="Managed background image">{controls}</InspectorAccordionSection>;
}

function LinkColourSetting({ palette, style, renderedColours, defaultValue, inheritedDefault, hoverValue, inheritedHover, onDefaultChange, onHoverChange }: {
  palette?: readonly ColourPaletteEntry[];
  style: ParagraphStyle;
  renderedColours: ReturnType<typeof useRenderedColours>;
  defaultValue?: string;
  inheritedDefault?: string;
  hoverValue?: string;
  inheritedHover?: string;
  onDefaultChange: (value: string | undefined) => void;
  onHoverChange: (value: string | undefined) => void;
}) {
  // Keep Studio's existing gradient-stop safeguard where one sampled stop may
  // make a link hard to read; the rendered-colour check cannot resolve gradients.
  const gradientWarning = (colour?: string) => style.backgroundGradient && paragraphLinkColourHasPoorContrast(colour, style) === true
    ? { message: lowContrastWarningMessage }
    : null;
  const renderedDefaultWarning = blockContrastWarning({ backgroundColor: renderedColours?.background, linkColor: renderedColours?.link, enableAlphaChecker: true });
  const effectiveHover = hoverValue ?? inheritedHover;
  const renderedHoverWarning = renderedColours?.link && effectiveHover
    ? blockContrastWarning({ backgroundColor: renderedColours.background, linkColor: effectiveHover, enableAlphaChecker: true })
    : null;
  const defaultWarning = style.backgroundGradient ? gradientWarning(defaultValue) : renderedDefaultWarning;
  const hoverWarning = style.backgroundGradient ? gradientWarning(effectiveHover) : renderedHoverWarning;
  const warningDescriptionId = useId();
  const warningStates = [defaultWarning && "Default", hoverWarning && "Hover"].filter(Boolean).join(" and ");
  return <PaletteColourSetting palette={palette} enableAlpha={Boolean(palette)} row label="Link" value={defaultValue} inheritedValue={inheritedDefault} inheritedHoverValue={inheritedHover} onChange={onDefaultChange} hoverValue={hoverValue} onHoverChange={onHoverChange} warningStates={warningStates} warningDescriptionId={warningDescriptionId} defaultWarning={Boolean(defaultWarning)} hoverWarning={Boolean(hoverWarning)} warningMessage={style.backgroundGradient ? defaultWarning?.message : describeBlockContrastWarning(renderedDefaultWarning, style)} hoverWarningMessage={style.backgroundGradient ? hoverWarning?.message : describeBlockContrastWarning(renderedHoverWarning, { ...style, linkColor: hoverValue })} announceWarning={false} />;
}

function GroupBackgroundSection({ group, canReset, onReset, children }: { group: boolean; canReset: boolean; onReset: () => void; children: ReactNode }) {
  return group ? <InspectorToolsSection showCloseControl={false} title="Background" options={[]} visible={new Set(["background"])} canReset={canReset} alwaysShow onToggle={() => {}} onReset={onReset}>{children}</InspectorToolsSection> : <InspectorAccordionSection className="inspector-panel" title="Background">{children}</InspectorAccordionSection>;
}
