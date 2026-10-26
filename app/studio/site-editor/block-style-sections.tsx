"use client";
import { cssDecimal } from "../../content/box-lengths";
import { useRef, useState, useMemo, type ReactNode } from "react";
import { ElementColourSetting } from "./element-colour-setting";
import { InspectorToolsSection } from "../inspector-tools-section";
import { InspectorAccordionSection } from "../inspector-accordion";
import { PaletteColourSetting } from "../controls/palette-colour-setting";
import { BackgroundSelection } from "../controls/background-selection";
import { ParagraphLengthSetting } from "../controls/paragraph-length-setting";
import { FontFamilySelect } from "../controls/font-family-setting";
import { FontSizeAppearanceSetting } from "../controls/font-size-appearance-setting";
import { FontAppearanceSelect, typographyAppearanceOptions } from "./font-appearance-select";
import { LineHeightSetting } from "../controls/line-height-setting";
import { NumberUnitField } from "../controls/number-unit-field";
import { RadioGroup } from "../controls/radio-group";
import { ToggleSetting } from "../controls/toggle-setting";
import { BorderSettings } from "../controls/border-settings";
import { BoxLengthSetting } from "../box-length-setting";
import { AdvancedFieldsControl } from "../controls/advanced-fields-control";
import { DuotoneControl } from "../controls/duotone-control";
import { ShadowPresetSelect } from "../controls/shadow-preset-select";
import { FocalPositionSetting } from "../controls/focal-position-setting";
import { StudioAnchoredPopover } from "../overlays/anchored-popover";
import { PopoverHeading } from "../overlays/popover-heading";
import { StudioButton } from "../controls/button";
import { IdentityImagePicker } from "./identity-image-picker";
import { useBlobUrls } from "../controls/use-blob-urls";
import { AcmIcon } from "@acm/icons/react";
import { blockStyleProfiles, blockStyleLabels, type BlockStyleControl } from "./block-style-profiles";
import { previewButtonWidth, type HeadingBackground, type PreviewBlockId, type PreviewBlockStyle } from "./blocks-preview-model";
import { visibleTypographyFonts, resolveFontSizePresets } from "./typography-preview-model";
import { previewStyleDetails, type StyleSelection } from "./styles-preview-state";
import { previewColourEntries, previewColourValue, previewPaletteReference } from "./colours-preview-model";
import { resolveShadowPresets, shadowPresetCss, newShadowLayer } from "./shadows-preview-model";
import { referenceSpacing } from "./reference-spacing";
import { ShadowLayer } from "./shadows-preview";
import type { ParagraphStyle } from "../../content/model";
const units = ['px', '%', 'em', 'rem', 'vw', 'vh'] as const;
const controlFields: Partial<Record<BlockStyleControl, (keyof PreviewBlockStyle)[]>> = {
    colour: ['textColor'], font: ['websiteFont', 'fontFamily'], size: ['websitePreset', 'fontSize', 'fontSizeCustom'], appearance: ['websiteWeight', 'websiteItalic', 'appearance'], lineHeight: ['lineHeight'], letterSpacing: ['letterSpacing'], textIndent: ['textIndent', 'indentAll'], indentAll: ['indentAll'], columns: ['textColumns'], decoration: ['textDecoration'], orientation: ['orientation'], case: ['textTransform'], align: ['textAlign'], padding: ['padding'], cellPadding: ['cellPadding'], margin: ['margin'], gap: ['blockGap', 'rowGap', 'columnGap'], minHeight: ['minHeight'], minWidth: ['minWidth'], width: ['buttonWidth'], border: ['borderColor', 'borderWidth', 'borderStyle'], radius: ['borderRadius'], shadow: ['shadowPreset', 'customShadows', 'shadow'], link: ['linkColor', 'linkHoverColor'], heading: ['headingColor', 'headingBackground'], button: ['buttonTextColor', 'buttonBackgroundColor', 'buttonBackgroundGradient', 'buttonGradientId'], duotone: ['duotone'], enlarge: ['enlargeOnClick'],
};
/** Styles-owned composition of canonical Library controls; editor inspectors are independent. */
export function BlockStyleSections({ id, value, authored, fontSelectionValue, selection, viewport, onChange }: {
    id: PreviewBlockId;
    value: PreviewBlockStyle;
    authored: PreviewBlockStyle;
    fontSelectionValue: string;
    selection: StyleSelection;
    viewport: 'desktop' | 'tablet' | 'mobile';
    onChange: (patch: Partial<PreviewBlockStyle>) => void;
}) {
    const profile = blockStyleProfiles[id];
    const [headingVisibility, setHeadingVisibility] = useState<Partial<Record<number, boolean>>>({});
    const visibleHeadings = ([1,2,3,4,5,6] as const).filter(level => authored.headingColors?.[level] !== undefined || authored.headingBackgrounds?.[level] !== undefined || (headingVisibility[level] ?? (value.headingColors?.[level] !== undefined || value.headingBackgrounds?.[level] !== undefined)));
    const { palette, typography } = previewStyleDetails(selection);
    const entries = previewColourEntries(palette, selection.colours).map(({ key, label, colour }) => ({ key, label, colour }));
    const fonts = visibleTypographyFonts(typography, selection.typography ?? {}).filter(font => !selection.typography?.disabledFonts?.includes(font.family));
    const presets = resolveFontSizePresets(selection.typography);
    const incomingSize = value.fontSizeCustom ?? value.websitePreset ?? '';
    const [previousSize, setPreviousSize] = useState(incomingSize);
    const [custom, setCustom] = useState(Boolean(value.fontSizeCustom));
    if (previousSize !== incomingSize) { setPreviousSize(incomingSize); setCustom(Boolean(value.fontSizeCustom)); }
    const [gradientActive, setGradientActive] = useState(false);
    const selectedPreset = presets.find(p => p.id === value.websitePreset);
    const appearanceValue = value;
    const family = value.websiteFont ?? (id === 'code' ? '"TT5 Fira Code", monospace' : undefined);
    const shadowPresets = resolveShadowPresets(selection.shadows);
    function reset(ids: readonly BlockStyleControl[]) { onChange(Object.fromEntries(ids.flatMap(control => (controlFields[control] ?? []).map(field => [field, undefined])))); }
    function section(title: string, ids: readonly BlockStyleControl[], children: ReactNode) {
        if (!ids.length)
            return null;
        const options = ids.filter(control => control !== 'indentAll').map(control => ({ id: control, label: blockStyleLabels[control], disabled: true }));
        const resettable = new Set(ids.filter(control => (controlFields[control] ?? []).some(field => authored[field] !== undefined)));
        return <InspectorToolsSection title={title} options={options} visible={new Set(options.map(option => option.id))} showCloseControl={false} canReset={resettable.size > 0} resettableOptions={resettable} onResetOption={control => reset([control as BlockStyleControl])} onToggle={() => { }} onReset={() => reset(ids)}>{children}</InspectorToolsSection>;
    }
    const colour = (label: string, field: 'textColor' | 'linkColor' | 'headingColor') => <PaletteColourSetting row label={label} palette={entries} enableAlpha onSelectPalette={(entry, state) => onChange({ [state === 'hover' ? 'linkHoverColor' : field]: previewPaletteReference(entry.key) })} value={previewColourValue(value[field], palette, selection.colours)} hoverValue={field === 'linkColor' ? previewColourValue(value.linkHoverColor, palette, selection.colours) : undefined} onChange={next => onChange({ [field]: next })} onHoverChange={field === 'linkColor' ? next => onChange({ linkHoverColor: next }) : undefined}/>;
    const typographyField = (control: BlockStyleControl): ReactNode => {
        switch (control) {
            case 'colour': return colour('Colour', 'textColor');
            case 'font': return <FontFamilySelect label="Font" previewOptions value={fontSelectionValue} options={[{ value: '', label: 'Default' }, ...fonts.map(font => ({ value: font.family, label: font.name, family: font.family }))]} onChange={websiteFont => onChange({ websiteFont: websiteFont || undefined, fontFamily: undefined })}/>;
            case 'size': return <FontSizeAppearanceSetting presetChoices={presets.map(preset => ({ value: preset.id, label: ({small:'S',medium:'M',large:'L','x-large':'XL','xx-large':'XXL'} as Record<string,string>)[preset.id] ?? preset.name, accessibleName: preset.name }))} size={value.websitePreset} customSize={value.fontSizeCustom} mode={custom ? 'custom' : 'presets'} onModeChange={mode => { setCustom(mode === 'custom'); if (mode === 'custom' && !value.fontSizeCustom)
                onChange({ fontSizeCustom: selectedPreset?.size, websitePreset: undefined, fontSize: undefined }); }} onSizeChange={websitePreset => { onChange({ websitePreset, fontSize: undefined, fontSizeCustom: undefined }); setCustom(false); }} onCustomSizeChange={fontSizeCustom => onChange({ fontSizeCustom, fontSize: undefined, websitePreset: undefined })} onAppearanceChange={() => { }} showAppearance={false}/>;
            case 'appearance': return <FontAppearanceSelect family={family} options={typographyAppearanceOptions} value={appearanceValue.websiteWeight === undefined ? '' : `${appearanceValue.websiteWeight}:${appearanceValue.websiteItalic ? 'italic' : 'normal'}`} onChange={next => onChange({ websiteWeight: next ? Number(next.split(':')[0]) : undefined, websiteItalic: next ? next.endsWith('italic') : undefined, appearance: undefined })}/>;
            case 'lineHeight': return <LineHeightSetting stepper placeholder="1.5" value={value.lineHeight} onChange={lineHeight => onChange({ lineHeight })}/>;
            case 'letterSpacing': return <BlockStyleLength label="Letter spacing" value={value.letterSpacing} min={-100} onChange={letterSpacing => onChange({ letterSpacing })}/>;
            case 'textIndent': return <ParagraphLengthSetting label="Line indent" value={value.textIndent} presentation="input-first" units={units} min={-100} max={200} onChange={textIndent => onChange({ textIndent })}/>;
            case 'indentAll': return <><ToggleSetting label="Indent all paragraphs" checked={value.indentAll ?? false} onChange={indentAll => onChange({ indentAll })}/><p className="site-block-indent-help">Indents the first line of each paragraph after the first one.</p></>;
            case 'columns': return <LineHeightSetting stepper label="Columns" value={value.textColumns?.toString()} min={1} max={6} step={1} defaultValue={1} placeholder="" onChange={next => onChange({ textColumns: next === undefined ? undefined : Math.round(Number(next)) })}/>;
            case 'decoration': return <RadioGroup label="Decoration" presentation="buttons" value={value.textDecoration} onChange={textDecoration => onChange({ textDecoration: textDecoration as ParagraphStyle['textDecoration'] })} options={[{ value: 'none', label: <AcmIcon name="action.remove" size={20}/>, accessibleName: 'None' }, { value: 'underline', label: <AcmIcon name="text.underline" size={20}/>, accessibleName: 'Underline' }, { value: 'line-through', label: <AcmIcon name="text.strikethrough" size={20}/>, accessibleName: 'Strikethrough' }]}/>;
            case 'orientation': return <RadioGroup label="Orientation" presentation="buttons" value={value.orientation} onChange={orientation => onChange({ orientation: orientation as ParagraphStyle['orientation'] })} options={[{ value: 'horizontal-tb', label: <AcmIcon name="text.typography" size={20}/>, accessibleName: 'Horizontal', title: 'Horizontal' }, { value: 'vertical-rl', label: <AcmIcon name="text.typography" className="site-block-vertical-type-icon" size={20}/>, accessibleName: 'Vertical', title: 'Vertical' }]}/>;
            case 'case': return <RadioGroup label="Letter case" presentation="buttons" value={value.textTransform} onChange={textTransform => onChange({ textTransform: textTransform as ParagraphStyle['textTransform'] })} options={[{ value: 'none', label: <AcmIcon name="action.remove" size={20}/>, accessibleName: 'None' }, { value: 'uppercase', label: 'AB', accessibleName: 'Upper case' }, { value: 'lowercase', label: 'ab', accessibleName: 'Lower case' }, { value: 'capitalize', label: 'Ab', accessibleName: 'Capitalise' }]}/>;
            case 'align': return <RadioGroup label="Text alignment" presentation="buttons" value={value.textAlign} onChange={textAlign => onChange({ textAlign: textAlign as PreviewBlockStyle['textAlign'] })} options={([['left', 'text.align-left', 'Align text left'], ['center', 'text.align-centre', 'Align text centre'], ['right', 'text.align-right', 'Align text right'], ['justify', 'text.justify', 'Justify text']] as const).map(([value, icon, label]) => ({ value, label: <AcmIcon name={icon} size={20}/>, accessibleName: label }))}/>;
            default: return null;
        }
    };
    const headingField = (level?: 1 | 2 | 3 | 4 | 5 | 6) => {
      const background = level ? value.headingBackgrounds?.[level] : value.headingBackground;
      const changeBackground = (background: HeadingBackground) => onChange(level ? {headingBackgrounds:{[level]:background}} : {headingBackground:background});
      return <ElementColourSetting label={level ? `H${level}` : 'Heading'} selection={selection} foreground={previewColourValue(level ? value.headingColors?.[level] : value.headingColor,palette,selection.colours)} background={previewColourValue(background?.background,palette,selection.colours)} gradient={background?.gradient} gradientId={background?.gradientId} onForeground={colour => onChange(level ? {headingColors:{[level]:colour}} : {headingColor:colour})} onBackground={background => changeBackground({background,gradient:undefined,gradientId:undefined})} onGradient={(gradient,gradientId) => changeBackground({gradient,gradientId,background:undefined})} />;
    };
    const elementField = (control: BlockStyleControl) => control === 'button' ? <ElementColourSetting label="Button" selection={selection} foreground={previewColourValue(value.buttonTextColor, palette, selection.colours)} background={previewColourValue(value.buttonBackgroundColor, palette, selection.colours)} gradient={value.buttonBackgroundGradient} gradientId={value.buttonGradientId} onForeground={buttonTextColor => onChange({ buttonTextColor })} onBackground={buttonBackgroundColor => onChange({ buttonBackgroundColor, buttonBackgroundGradient: undefined, buttonGradientId: undefined })} onGradient={(buttonBackgroundGradient, buttonGradientId) => onChange({ buttonBackgroundGradient, buttonGradientId, buttonBackgroundColor: undefined })} /> : control === 'heading' ? headingField() : colour('Link', 'linkColor');
    const authoredElements = profile.elements.filter(control => (controlFields[control] ?? []).some(field => authored[field] !== undefined));
    const authoredHeadings = ([1,2,3,4,5,6] as const).filter(level => authored.headingColors?.[level] !== undefined || authored.headingBackgrounds?.[level] !== undefined);
    const elementOptions = [
      ...profile.elements.map(control => ({id:control,label:blockStyleLabels[control],disabled:true})),
      ...[1,2,3,4,5,6].map(level => ({id:`h${level}`,label:`H${level}`,accessibleName:`${visibleHeadings.some(value => value === level) ? 'Hide and reset' : 'Show'} H${level}`})),
    ];
    function resetHeadingLevel(level: number, keepVisible = true) {
      setHeadingVisibility(current => ({...current,[level]:keepVisible}));
      onChange({headingColors:{[level]:undefined},headingBackgrounds:{[level]:undefined}});
    }
    function toggleHeadingLevel(control: string) {
      const level = Number(control.slice(1));
      const visible = visibleHeadings.some(value => value === level);
      if (visible) resetHeadingLevel(level,false);
      else setHeadingVisibility(current => ({...current,[level]:true}));
    }
    function resetElements() {
      setHeadingVisibility({});
      onChange({...Object.fromEntries(profile.elements.flatMap(control => (controlFields[control] ?? []).map(field => [field,undefined]))),headingColors:undefined,headingBackgrounds:undefined});
    }
    return <div className="site-block-style-sections inspector-sections">
    {profile.filters ? section('Filters', ['duotone'], <DuotoneControl value={value.duotone} onChange={duotone => onChange({ duotone })}/>) : null}
    {section('Typography', profile.typography, profile.typography.map(control => <div key={control} className={`site-block-style-field is-${control}`}>{typographyField(control)}</div>))}
    {profile.background ? <InspectorToolsSection title="Background" showCloseControl={false} resettableOptions={new Set([...(authored.backgroundColor !== undefined ? ['colour'] : []), ...(authored.backgroundGradient !== undefined ? ['gradient'] : []), ...(authored.backgroundImage !== undefined ? ['image'] : [])])} onResetOption={option => onChange(option === 'colour' ? {backgroundColor:undefined} : option === 'gradient' ? {backgroundGradient:undefined} : {backgroundImage:undefined,imageSize:undefined,imageRepeat:undefined,imageFocalX:undefined,imageFocalY:undefined})} options={[...(profile.backgroundImage && viewport === 'desktop' ? [{ id: 'image', label: 'Image', disabled: true }] : []), { id: 'colour', label: 'Colour', disabled: true }, ...(profile.backgroundGradient !== false ? [{ id: 'gradient', label: 'Gradient', disabled: true }] : [])]} visible={new Set(profile.backgroundImage && viewport === 'desktop' ? ['image', 'colour', ...(profile.backgroundGradient !== false ? ['gradient'] : [])] : ['colour', ...(profile.backgroundGradient !== false ? ['gradient'] : [])])} canReset={['backgroundColor', 'backgroundGradient', 'backgroundImage', 'imageSize', 'imageRepeat', 'imageFocalX', 'imageFocalY'].some(field => authored[field as keyof PreviewBlockStyle] !== undefined)} onToggle={() => { }} onReset={() => onChange({ backgroundColor: undefined, backgroundGradient: undefined, backgroundImage: undefined, imageSize: undefined, imageRepeat: undefined, imageFocalX: undefined, imageFocalY: undefined })}>
      <BackgroundSelection allowGradient={profile.backgroundGradient !== false} mode={gradientActive ? 'gradient' : 'colour'} onModeChange={mode => setGradientActive(mode === 'gradient')} colour={previewColourValue(value.backgroundColor, palette, selection.colours)} gradient={value.backgroundGradient} palette={entries} enableAlpha onSelectPalette={entry => onChange({ backgroundColor: previewPaletteReference(entry.key), backgroundGradient: undefined })} onColourChange={backgroundColor => onChange({ backgroundColor, backgroundGradient: undefined })} onGradientChange={backgroundGradient => onChange({ backgroundGradient, backgroundColor: undefined })} imageControl={profile.backgroundImage && viewport === 'desktop' ? <BlockBackgroundImage value={value} onChange={onChange}/> : undefined}/>
    </InspectorToolsSection> : null}
    {section('Dimensions', profile.dimensions, profile.dimensions.map(control => <div key={control}>{control === 'padding' || control === 'cellPadding' || control === 'margin' ? <BoxLengthSetting label={blockStyleLabels[control]} value={value[control]} layout={control === 'margin' && profile.verticalMargin ? 'vertical' : 'axes'} showLinkControl={id !== 'button'} presetValues={referenceSpacing} canReset={false} unitOptions={units} min={control === 'margin' ? -100 : 0} max={200} onChange={next => onChange({ [control]: next })}/> : control === 'gap' ? ['buttons', 'columns', 'social-icons'].includes(id) ? <div className="site-block-axis-spacing"><span>Block spacing</span><BoxLengthSetting label="Vertical block spacing" layout="single" singleAxis="Vertical" initiallyCustom presetValues={referenceSpacing} canReset={false} unitOptions={units} value={value.rowGap} min={0} max={200} onChange={rowGap => onChange({ rowGap })}/><BoxLengthSetting label="Horizontal block spacing" layout="single" singleAxis="Horizontal" initiallyCustom presetValues={referenceSpacing} canReset={false} unitOptions={units} value={value.columnGap} min={0} max={200} onChange={columnGap => onChange({ columnGap })}/></div> : <BoxLengthSetting label="Block spacing" layout="single" presetValues={referenceSpacing} canReset={false} unitOptions={units} value={value.blockGap} min={0} max={200} onChange={blockGap => onChange({ blockGap })}/> : control === 'minHeight' || control === 'minWidth' ? <ParagraphLengthSetting label={blockStyleLabels[control]} presentation="input-first" units={units} value={value[control]} min={0} max={1000} onChange={next => onChange({ [control]: next })}/> : control === 'width' ? <BoxLengthSetting label="Width" layout="single" presetUnit="%" presets={[0,25,50,75,100]} canReset={false} unitOptions={units} value={previewButtonWidth(value.buttonWidth)} min={0} max={10000} onChange={next => onChange({ buttonWidth: previewButtonWidth(next) })}/> : null}</div>))}
    {section(profile.border.includes('shadow') ? 'Border and shadow' : 'Border', profile.border, profile.border.map(control => <div key={control}>{control === 'border' ? <BorderSettings palette={entries} enableAlpha onSelectPalette={entry => onChange({borderColor:previewPaletteReference(entry.key),borderStyle:value.borderStyle && value.borderStyle !== 'none' ? value.borderStyle : 'solid'})} initiallyLinked allowStyle={id !== 'image' && id !== 'search'} unitOptions={units} includeRadius={false} includeShadow={false} style={{...value,borderColor:previewColourValue(value.borderColor,palette,selection.colours)}} onChange={onChange}/> : control === 'radius' ? <BoxLengthSetting label="Radius" corners layout="all" unitOptions={units} value={value.borderRadius} min={0} max={100} onChange={borderRadius => onChange({ borderRadius })}/> : <><span className="site-block-control-label">Shadow</span><ShadowPresetSelect value={value.shadowPreset} choices={[{ id: 'none', label: 'None', css: 'none' }, ...shadowPresets.map(preset => ({ id: preset.id, label: preset.name, css: shadowPresetCss(preset) }))]} onChange={shadowPreset => onChange({ shadowPreset, customShadows: shadowPreset === 'custom' ? (value.customShadows ?? [newShadowLayer('preview-custom')]) : undefined })}/>{value.shadowPreset === 'custom' ? (value.customShadows ?? []).map((layer, index) => <ShadowLayer key={layer.id} layer={layer} colour={layer.colour} entries={entries} index={index} onChange={patch => onChange({ customShadows: value.customShadows!.map((item, i) => i === index ? { ...item, ...patch } : item) })} onRemove={() => onChange({ customShadows: undefined, shadowPreset: undefined })}/>) : null}</>}</div>))}
    {profile.elements.includes('heading') ? <InspectorToolsSection title="Elements" showCloseControl={false} options={elementOptions} visible={new Set([...profile.elements,...visibleHeadings.map(level => `h${level}`)])} resettableOptions={new Set([...authoredElements, ...authoredHeadings.map(level => `h${level}`)])} canReset={authoredElements.length > 0 || authoredHeadings.length > 0} onResetOption={control => /^h[1-6]$/.test(control) ? resetHeadingLevel(Number(control.slice(1))) : reset([control as BlockStyleControl])} onReset={resetElements} onToggle={toggleHeadingLevel}>
      {profile.elements.map(control => <div key={control}>{elementField(control)}</div>)}{visibleHeadings.sort().map(level => <div key={level}>{headingField(level)}</div>) }
    </InspectorToolsSection> : section('Elements', profile.elements, profile.elements.map(control => <div key={control}>{elementField(control)}</div>))}
    {profile.settings && viewport === 'desktop' ? section('Settings', ['enlarge'], <ToggleSetting label="Enlarge on click" checked={value.enlargeOnClick ?? false} onChange={enlargeOnClick => onChange({ enlargeOnClick })}/>) : null}
    {viewport === 'desktop' ? <InspectorAccordionSection title="Advanced" defaultOpen={false}><AdvancedFieldsControl blockName={id === 'divider' ? 'Separator' : id[0].toUpperCase() + id.slice(1)} fields={{ anchor: false, className: false, additionalCss: true }} style={value} onChange={(_, additionalCss) => onChange({ additionalCss: additionalCss || undefined })}/></InspectorAccordionSection> : null}
  </div>;
}
export function BlockStyleLength({ label, value, min = 0, onChange }: {
    label: string;
    value?: string;
    min?: number;
    onChange: (value: string | undefined) => void;
}) {
    const match = value?.match(/^(-?\d+(?:\.\d+)?)(px|%|em|rem|vw|vh)$/);
    const [draft, setDraft] = useState<string | null>(null);
    const amount = draft ?? match?.[1] ?? '';
    const unit = match?.[2] ?? 'px';
    function commit(nextUnit = unit) { const number = Number(amount); setDraft(null); onChange(amount.trim() && Number.isFinite(number) ? `${cssDecimal(Math.max(min, Math.min(10000, number)))}${nextUnit}` : undefined); }
    return <label className="site-block-length-label"><span>{label}</span><NumberUnitField units={units} inputProps={{ 'aria-label': label, value: amount, min, max: 10000, step: 'any', onChange: event => setDraft(event.target.value), onBlur: () => { if (draft !== null)
            commit(); }, onKeyDown: event => { if (event.key === 'Enter')
            event.currentTarget.blur(); } }} unitProps={{ 'aria-label': `${label} unit`, value: unit, onChange: event => commit(event.target.value) }}/></label>;
}
// Existing Files supplies private Blob URLs; an external image optimiser cannot serve them.
function BlockBackgroundImage({ value, onChange }: {
    value: PreviewBlockStyle;
    onChange: (patch: Partial<PreviewBlockStyle>) => void;
}) {
    const [open, setOpen] = useState(false), [picker, setPicker] = useState<HTMLElement | null>(null);
    const trigger = useRef<HTMLButtonElement>(null), close = useRef<HTMLButtonElement>(null);
    const images = useMemo(() => value.backgroundImage ? [value.backgroundImage] : [], [value.backgroundImage]);
    const urls = useBlobUrls(images);
    function dismiss(restore: boolean) { setOpen(false); if (restore)
        trigger.current?.focus(); }
    // eslint-disable-next-line @next/next/no-img-element -- The picker renders a browser-local Blob URL.
    return <><button ref={trigger} className="paragraph-background-option" type="button" aria-label="Choose background image" aria-expanded={open} onClick={event => value.backgroundImage ? setOpen(v => !v) : setPicker(event.currentTarget)}><span className="site-block-image-swatch" style={value.backgroundImage && urls[value.backgroundImage.id] ? { backgroundImage: `url(${JSON.stringify(urls[value.backgroundImage.id])})` } : undefined} aria-label={value.backgroundImage ? value.backgroundImage.name : "No background image selected"}/><span>Image</span>{value.backgroundImage ? <span className="visually-hidden">{value.backgroundImage.name}</span> : null}</button>{open ? <StudioAnchoredPopover anchor={() => trigger.current} inspectorPlacement preferredWidth={280} label="Background image" focusOnMount initialFocus={() => close.current} onClose={dismiss}><PopoverHeading closeRef={close} closeLabel="Close background image" onClose={() => dismiss(true)}>Image</PopoverHeading>{value.backgroundImage && urls[value.backgroundImage.id] ? <img src={urls[value.backgroundImage.id]} alt="" style={{ width: '100%', maxHeight: 120, objectFit: 'contain' }}/> : null}<div><StudioButton variant="text" onClick={() => { setPicker(trigger.current); dismiss(false); }}>Replace</StudioButton><StudioButton variant="text" onClick={() => { onChange({ backgroundImage: null }); dismiss(true); }}>Remove</StudioButton></div><FocalPositionSetting x={value.imageFocalX ?? 50} y={value.imageFocalY ?? 50} onXChange={imageFocalX => onChange({ imageFocalX })} onYChange={imageFocalY => onChange({ imageFocalY })}/><RadioGroup label="Size" value={value.imageSize ?? 'cover'} options={[{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }, { value: 'tile', label: 'Tile' }]} onChange={size => onChange({ imageSize: size as PreviewBlockStyle['imageSize'] })}/>{value.imageSize === 'tile' ? <ToggleSetting label="Repeat" checked={value.imageRepeat ?? true} onChange={imageRepeat => onChange({ imageRepeat })}/> : null}</StudioAnchoredPopover> : null}{picker ? <IdentityImagePicker title="Choose Background Image" opener={picker} onClose={() => setPicker(null)} onChoose={backgroundImage => { onChange({ backgroundImage }); setPicker(null); }}/> : null}</>;
}
