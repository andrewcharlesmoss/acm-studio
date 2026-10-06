"use client";

import { Fragment, useId, useRef, useState, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import type { ButtonInteractionState, ButtonWidth, ContentBlock, ParagraphBackgroundGradient, ParagraphFontSize, ParagraphStyle } from "../../../content/model";
import { blockContrastWarning, paragraphLinkColourHasPoorContrast } from "../../../content/paragraph-styles";
import { LAYOUT_SPACING_PRESETS } from "../../../content/layout";
import { InspectorAccordionSection } from "../../inspector-accordion";
import { InspectorToolsSection, type InspectorMenuOption, type InspectorToolOption } from "../../inspector-tools-section";
import { BoxLengthSetting } from "../../box-length-setting";
import { inspectorStyleHasValues, resetSupportedInspectorStyleFields, setInspectorFitText, setInspectorFontSize } from "../inspector-style-actions";
import { FontFamilySetting } from "../../controls/font-family-setting";
import { resetGroupDimensionFields } from "../group-dimensions";
import { PaletteColourSetting } from "../../controls/palette-colour-setting";
import { BackgroundSelection } from "../../controls/background-selection";
import { useRenderedColours } from "../../controls/rendered-colour-contrast";
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

export function ParagraphInspector({ profileOverride, block, interactionState = "default", onChange, fontSizeViewMode, onFontSizeViewModeChange, backgroundImageControls, backgroundImageOptions, groupLayoutControls, groupDimensionControls, onResetGroupDimensions }: { profileOverride?: ReturnType<typeof capabilityProfileFor>; block: StyledBlock; interactionState?: ButtonInteractionState | "default"; onChange: (block: ContentBlock) => void; fontSizeViewMode: "presets" | "custom" | null; onFontSizeViewModeChange: (mode: "presets" | "custom") => void; backgroundImageControls?: ReactNode; backgroundImageOptions?: ReactNode; groupLayoutControls?: ReactNode; groupDimensionControls?: ReactNode; onResetGroupDimensions?: () => void }) {
  const inspectorRef = useRef<HTMLDivElement>(null);
  const renderedColours = useRenderedColours(inspectorRef, block.id);
  const baseVisualStyle = hasLegacyStyle(block) ? block.style ?? {} : block.visualStyle ?? {};
  const style: ParagraphStyle = block.type === "button" && interactionState !== "default"
    ? block.interactionStyles?.[interactionState] ?? {}
    : baseVisualStyle;
  const textContrastWarning = blockContrastWarning({ backgroundColor: renderedColours?.background, textColor: renderedColours?.text, enableAlphaChecker: true });
  const blockWarning = blockContrastWarning({ backgroundColor: renderedColours?.background, textColor: renderedColours?.text, linkColor: renderedColours?.link, enableAlphaChecker: true });
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
      {typographyVisible.has("colour") ? <PaletteColourSetting label="Colour" row value={style.textColor} onChange={(value) => updateStyle("textColor", value)} defaultWarning={Boolean(textContrastWarning)} warningMessage={textContrastWarning?.message} announceWarning={false} /> : null}
      {(typographyVisible.has("size") || typographyVisible.has("family") || typographyVisible.has("appearance")) ? <FontSizeAppearanceSetting size={style.fontSize} customSize={style.fontSizeCustom} appearance={style.appearance} mode={fontSizeMode} onModeChange={onFontSizeViewModeChange} onSizeChange={value => updateFontSize(value, "presets")} onCustomSizeChange={value => updateFontSize(value, "custom")} onAppearanceChange={value => updateStyle("appearance", value)} paragraphLabels={paragraphSpecificOptions || ["heading", "list", "quote", "table", "code"].includes(block.type)} showSize={typographyVisible.has("size")} showAppearance={typographyVisible.has("appearance")} fontControl={typographyVisible.has("family") ? <FontFamilySetting label={paragraphSpecificOptions ? "Font" : "Font family"} value={style.fontFamily} onChange={value => updateStyle("fontFamily", value)} /> : null} /> : null}
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
      <BackgroundSelection imageControl={backgroundImageControls} mode={activeBackgroundMode} colour={style.backgroundColor} gradient={style.backgroundGradient} contrastWarning={blockWarning?.message ?? null} announceWarning={false} onModeChange={setBackgroundMode} onColourChange={value => updateBackground(value, undefined)} onGradientChange={value => updateBackground(undefined, value)} />
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
      {elementsVisible.has("link-colour") ? <LinkColourSetting style={style} renderedColours={renderedColours} defaultValue={style.linkColor} hoverValue={style.linkHoverColor} onDefaultChange={value => updateStyle("linkColor", value)} onHoverChange={value => updateStyle("linkHoverColor", value)} /> : null}
    </InspectorToolsSection> : null,
  };
  const orderedSharedStyleSections = scopedStyleSectionIds(profile, style, visibleSource)
    .filter(sectionId => sectionId in sharedStyleSectionContent)
    .flatMap(sectionId => [<Fragment key={sectionId}>{sharedStyleSectionContent[sectionId]}</Fragment>, ...(sectionId === "background" && groupLayoutControls ? [<Fragment key="group-layout">{groupLayoutControls}</Fragment>] : [])]);
  return <div ref={inspectorRef} className={`inspector-sections${block.type === "group" ? " group-block-inspector" : ""}`}>{orderedSharedStyleSections}{blockWarning ? <div className="paragraph-colour-contrast-warning inspector-block-contrast-warning" role="status"><AcmIcon name="state.warning" size={18} /><span>{blockWarning.message}</span></div> : null}</div>;
}

type ManagedBackgroundImageBlock = Extract<ContentBlock, { type: "quote" | "group" | "heading" | "code" | "document-title" }>;

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

function LinkColourSetting({ style, renderedColours, defaultValue, hoverValue, onDefaultChange, onHoverChange }: {
  style: ParagraphStyle;
  renderedColours: ReturnType<typeof useRenderedColours>;
  defaultValue?: string;
  hoverValue?: string;
  onDefaultChange: (value: string | undefined) => void;
  onHoverChange: (value: string | undefined) => void;
}) {
  // Keep Studio's existing gradient-stop safeguard where one sampled stop may
  // make a link hard to read; the rendered-colour check cannot resolve gradients.
  const gradientWarning = (colour?: string) => style.backgroundGradient && paragraphLinkColourHasPoorContrast(colour, style) === true
    ? { message: "This link colour may be hard to read over parts of the gradient." }
    : null;
  const defaultWarning = style.backgroundGradient
    ? gradientWarning(defaultValue)
    : blockContrastWarning({ backgroundColor: renderedColours?.background, linkColor: renderedColours?.link, enableAlphaChecker: true });
  const hoverWarning = style.backgroundGradient
    ? gradientWarning(hoverValue)
    : renderedColours?.link && hoverValue
      ? blockContrastWarning({ backgroundColor: renderedColours.background, linkColor: hoverValue, enableAlphaChecker: true })
      : null;
  const warningDescriptionId = useId();
  const warningStates = [defaultWarning && "Default", hoverWarning && "Hover"].filter(Boolean).join(" and ");
  return <PaletteColourSetting row label="Link" value={defaultValue} onChange={onDefaultChange} hoverValue={hoverValue} onHoverChange={onHoverChange} warningStates={warningStates} warningDescriptionId={warningDescriptionId} defaultWarning={Boolean(defaultWarning)} hoverWarning={Boolean(hoverWarning)} warningMessage={defaultWarning?.message} hoverWarningMessage={hoverWarning?.message} announceWarning={false} />;
}

function GroupBackgroundSection({ group, canReset, onReset, children }: { group: boolean; canReset: boolean; onReset: () => void; children: ReactNode }) {
  return group ? <InspectorToolsSection title="Background" options={[]} visible={new Set(["background"])} canReset={canReset} alwaysShow onToggle={() => {}} onReset={onReset}>{children}</InspectorToolsSection> : <InspectorAccordionSection className="inspector-panel" title="Background">{children}</InspectorAccordionSection>;
}
