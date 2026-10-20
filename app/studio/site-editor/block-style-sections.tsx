"use client";
import { useRef, useState, useMemo, type ReactNode } from "react";
import { InspectorToolsSection } from "../inspector-tools-section";
import { InspectorAccordionSection } from "../inspector-accordion";
import { PaletteColourSetting } from "../controls/palette-colour-setting";
import { ColourPicker } from "../controls/colour-picker";
import { GradientPicker } from "../controls/gradient-picker";
import { FontFamilySelect } from "../controls/font-family-setting";
import { FontSizeAppearanceSetting } from "../controls/font-size-appearance-setting";
import { FontAppearanceSelect, typographyAppearanceOptions } from "./font-appearance-select";
import { LineHeightSetting } from "../controls/line-height-setting";
import { NumberUnitField } from "../controls/number-unit-field";
import { RadioGroup } from "../controls/radio-group";
import { NumberInput, SelectControl } from "../controls/native-fields";
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
import { type PreviewBlockId, type PreviewBlockStyle } from "./blocks-preview-model";
import { visibleTypographyFonts, resolveFontSizePresets } from "./typography-preview-model";
import { previewStyleDetails, type StyleSelection } from "./styles-preview-state";
import { previewColourEntries, previewColourValue, previewPaletteReference } from "./colours-preview-model";
import { resolveShadowPresets, shadowPresetCss, newShadowLayer } from "./shadows-preview-model";
import { ShadowLayer } from "./shadows-preview";
import type { ParagraphStyle } from "../../content/model";
const units = ['px', '%', 'em', 'rem', 'vw', 'vh'] as const;
const controlFields: Partial<Record<BlockStyleControl, (keyof PreviewBlockStyle)[]>> = {
    colour: ['textColor'], font: ['websiteFont', 'fontFamily'], size: ['websitePreset', 'fontSize', 'fontSizeCustom'], appearance: ['websiteWeight', 'websiteItalic', 'appearance'], lineHeight: ['lineHeight'], letterSpacing: ['letterSpacing'], textIndent: ['textIndent', 'indentAll'], indentAll: ['indentAll'], columns: ['textColumns'], decoration: ['textDecoration'], orientation: ['orientation'], case: ['textTransform'], align: ['textAlign'], padding: ['padding'], margin: ['margin'], gap: ['blockGap', 'rowGap', 'columnGap'], minHeight: ['minHeight'], width: ['buttonWidth'], border: ['borderColor', 'borderWidth', 'borderStyle'], radius: ['borderRadius'], shadow: ['shadowPreset', 'customShadows', 'shadow'], link: ['linkColor', 'linkHoverColor'], heading: ['headingColor'], duotone: ['duotone'], enlarge: ['enlargeOnClick'],
};
/** Styles-owned composition of canonical Library controls; editor inspectors are independent. */
export function BlockStyleSections({ id, value, authored, selection, viewport, onChange }: {
    id: PreviewBlockId;
    value: PreviewBlockStyle;
    authored: PreviewBlockStyle;
    selection: StyleSelection;
    viewport: 'desktop' | 'tablet' | 'mobile';
    onChange: (patch: Partial<PreviewBlockStyle>) => void;
}) {
    const profile = blockStyleProfiles[id];
    const { palette, typography } = previewStyleDetails(selection);
    const entries = previewColourEntries(palette, selection.colours).map(({ key, label, colour }) => ({ key, label, colour }));
    const fonts = visibleTypographyFonts(typography, selection.typography ?? {}).filter(font => !selection.typography?.disabledFonts?.includes(font.family));
    const presets = resolveFontSizePresets(selection.typography);
    const [custom, setCustom] = useState(Boolean(value.fontSizeCustom));
    const [gradientActive, setGradientActive] = useState(false);
    const selectedPreset = presets.find(p => p.id === value.websitePreset);
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
            case 'font': return <FontFamilySelect label="Font" previewOptions value={family ?? ''} options={[{ value: '', label: 'Default' }, ...fonts.map(font => ({ value: font.family, label: font.name, family: font.family }))]} onChange={websiteFont => onChange({ websiteFont: websiteFont || undefined, fontFamily: undefined })}/>;
            case 'size': return <FontSizeAppearanceSetting size={value.websitePreset as ParagraphStyle['fontSize']} customSize={value.fontSizeCustom} mode={custom ? 'custom' : 'presets'} onModeChange={mode => { setCustom(mode === 'custom'); if (mode === 'custom' && !value.fontSizeCustom)
                onChange({ fontSizeCustom: selectedPreset?.size, websitePreset: undefined, fontSize: undefined }); }} onSizeChange={websitePreset => { onChange({ websitePreset, fontSize: undefined, fontSizeCustom: undefined }); setCustom(false); }} onCustomSizeChange={fontSizeCustom => onChange({ fontSizeCustom, fontSize: undefined, websitePreset: undefined })} onAppearanceChange={() => { }} showAppearance={false}/>;
            case 'appearance': return <FontAppearanceSelect family={family} options={typographyAppearanceOptions} value={value.websiteWeight === undefined ? '' : `${value.websiteWeight}:${value.websiteItalic ? 'italic' : 'normal'}`} onChange={next => onChange({ websiteWeight: next ? Number(next.split(':')[0]) : undefined, websiteItalic: next ? next.endsWith('italic') : undefined, appearance: undefined })}/>;
            case 'lineHeight': return <LineHeightSetting stepper value={value.lineHeight} onChange={lineHeight => onChange({ lineHeight })}/>;
            case 'letterSpacing': return <BlockStyleLength label="Letter spacing" value={value.letterSpacing} min={-100} onChange={letterSpacing => onChange({ letterSpacing })}/>;
            case 'textIndent': return <BoxLengthSetting label="Line indent" value={value.textIndent} layout="single" unitOptions={units} min={-100} max={200} onChange={textIndent => onChange({ textIndent })}/>;
            case 'indentAll': return <ToggleSetting label="Indent all paragraphs" checked={value.indentAll ?? false} onChange={indentAll => onChange({ indentAll })}/>;
            case 'columns': return <label className="site-block-field-label"><span>Columns</span><NumberInput aria-label="Columns" min={1} max={6} value={value.textColumns ?? ''} onChange={event => { const n = event.target.valueAsNumber; onChange({ textColumns: Number.isFinite(n) ? Math.max(1, Math.min(6, n)) : undefined }); }}/></label>;
            case 'decoration': return <RadioGroup label="Decoration" presentation="buttons" value={value.textDecoration} onChange={textDecoration => onChange({ textDecoration: textDecoration as ParagraphStyle['textDecoration'] })} options={[{ value: 'none', label: <AcmIcon name="action.remove" size={20}/>, accessibleName: 'None' }, { value: 'underline', label: <AcmIcon name="text.underline" size={20}/>, accessibleName: 'Underline' }, { value: 'line-through', label: <AcmIcon name="text.strikethrough" size={20}/>, accessibleName: 'Strikethrough' }]}/>;
            case 'orientation': return <RadioGroup label="Orientation" presentation="buttons" value={value.orientation} onChange={orientation => onChange({ orientation: orientation as ParagraphStyle['orientation'] })} options={[{ value: 'horizontal-tb', label: 'Horizontal' }, { value: 'vertical-rl', label: 'Vertical' }]}/>;
            case 'case': return <RadioGroup label="Letter case" presentation="buttons" value={value.textTransform} onChange={textTransform => onChange({ textTransform: textTransform as ParagraphStyle['textTransform'] })} options={[{ value: 'none', label: <AcmIcon name="action.remove" size={20}/>, accessibleName: 'None' }, { value: 'uppercase', label: 'AB', accessibleName: 'Upper case' }, { value: 'lowercase', label: 'ab', accessibleName: 'Lower case' }, { value: 'capitalize', label: 'Ab', accessibleName: 'Capitalise' }]}/>;
            case 'align': return <RadioGroup label="Text alignment" presentation="buttons" value={value.textAlign} onChange={textAlign => onChange({ textAlign: textAlign as PreviewBlockStyle['textAlign'] })} options={([['left', 'text.align-left', 'Align text left'], ['center', 'text.align-centre', 'Align text centre'], ['right', 'text.align-right', 'Align text right'], ['justify', 'text.justify', 'Justify text']] as const).map(([value, icon, label]) => ({ value, label: <AcmIcon name={icon} size={20}/>, accessibleName: label }))}/>;
            default: return null;
        }
    };
    return <div className="site-block-style-sections inspector-sections">
    {profile.filters ? section('Filters', ['duotone'], <DuotoneControl value={value.duotone} onChange={duotone => onChange({ duotone })}/>) : null}
    {section('Typography', profile.typography, profile.typography.map(control => <div key={control} className={`site-block-style-field is-${control}`}>{typographyField(control)}</div>))}
    {profile.background ? <InspectorToolsSection title="Background" showCloseControl={false} resettableOptions={new Set([...(authored.backgroundColor !== undefined ? ['colour'] : []), ...(authored.backgroundGradient !== undefined ? ['gradient'] : []), ...(authored.backgroundImage !== undefined ? ['image'] : [])])} onResetOption={option => onChange(option === 'colour' ? {backgroundColor:undefined} : option === 'gradient' ? {backgroundGradient:undefined} : {backgroundImage:undefined,imageSize:undefined,imageRepeat:undefined,imageFocalX:undefined,imageFocalY:undefined})} options={[...(profile.backgroundImage && viewport === 'desktop' ? [{ id: 'image', label: 'Image', disabled: true }] : []), { id: 'colour', label: 'Colour', disabled: true }, { id: 'gradient', label: 'Gradient', disabled: true }]} visible={new Set(profile.backgroundImage && viewport === 'desktop' ? ['image', 'colour', 'gradient'] : ['colour', 'gradient'])} canReset={['backgroundColor', 'backgroundGradient', 'backgroundImage', 'imageSize', 'imageRepeat', 'imageFocalX', 'imageFocalY'].some(field => authored[field as keyof PreviewBlockStyle] !== undefined)} onToggle={() => { }} onReset={() => onChange({ backgroundColor: undefined, backgroundGradient: undefined, backgroundImage: undefined, imageSize: undefined, imageRepeat: undefined, imageFocalX: undefined, imageFocalY: undefined })}>
      <div className="paragraph-background-modes site-background-rows">
      {profile.backgroundImage && viewport === 'desktop' ? <BlockBackgroundImage value={value} onChange={onChange}/> : null}
      <ColourPicker label="Background colour" onSelectPalette={entry => onChange({ backgroundColor: previewPaletteReference(entry.key), backgroundGradient: undefined })} palette={entries} enableAlpha value={value.backgroundColor} onChange={backgroundColor => onChange({ backgroundColor, backgroundGradient: undefined })} trigger={({ onClick, expanded, controls }) => <div className="paragraph-background-option-row"><button type="button" className="paragraph-background-option" aria-label="Choose background colour" aria-expanded={expanded} aria-controls={controls} onClick={onClick}><AcmIcon name="style.colour" size={20}/><span>Colour</span></button></div>}/>
      <GradientPicker active={gradientActive} onOpen={() => setGradientActive(true)} value={value.backgroundGradient} onChange={backgroundGradient => onChange({ backgroundGradient, backgroundColor: undefined })}/>
      </div>
    </InspectorToolsSection> : null}
    {section('Dimensions', profile.dimensions, profile.dimensions.map(control => <div key={control}>{control === 'padding' || control === 'margin' ? <BoxLengthSetting label={blockStyleLabels[control]} value={value[control]} layout={control === 'margin' && profile.verticalMargin ? 'vertical' : 'axes'} unitOptions={units} min={control === 'margin' ? -100 : 0} max={200} onChange={next => onChange({ [control]: next })}/> : control === 'gap' ? id === 'buttons' ? <><BlockStyleLength label="Vertical block spacing" value={value.rowGap} onChange={rowGap => onChange({ rowGap })}/><BlockStyleLength label="Horizontal block spacing" value={value.columnGap} onChange={columnGap => onChange({ columnGap })}/></> : <BoxLengthSetting label="Block spacing" layout="single" unitOptions={units} value={value.blockGap} min={0} max={200} onChange={blockGap => onChange({ blockGap })}/> : control === 'minHeight' ? <BlockStyleLength label="Minimum height" value={value.minHeight} onChange={minHeight => onChange({ minHeight })}/> : control === 'width' ? <label className="site-block-field-label"><span>Width</span><SelectControl aria-label="Button width" value={value.buttonWidth ?? ''} onChange={event => onChange({ buttonWidth: event.target.value || undefined })}><option value="">Auto</option>{[25, 50, 75, 100].map(n => <option key={n} value={n}>{n}%</option>)}</SelectControl></label> : null}</div>))}
    {section(profile.border.includes('shadow') ? 'Border and shadow' : 'Border', profile.border, profile.border.map(control => <div key={control}>{control === 'border' ? <BorderSettings unitOptions={units} compact includeRadius={false} includeShadow={false} style={value} onChange={onChange}/> : control === 'radius' ? <BoxLengthSetting label="Radius" corners layout="all" unitOptions={units} value={value.borderRadius} min={0} max={100} onChange={borderRadius => onChange({ borderRadius })}/> : <><ShadowPresetSelect value={value.shadowPreset} choices={[{ id: 'none', label: 'None', css: 'none' }, ...shadowPresets.map(preset => ({ id: preset.id, label: preset.name, css: shadowPresetCss(preset) }))]} onChange={shadowPreset => onChange({ shadowPreset, customShadows: shadowPreset === 'custom' ? (value.customShadows ?? [newShadowLayer('preview-custom')]) : undefined })}/>{value.shadowPreset === 'custom' ? (value.customShadows ?? []).map((layer, index) => <ShadowLayer key={layer.id} layer={layer} colour={layer.colour} entries={entries} index={index} onChange={patch => onChange({ customShadows: value.customShadows!.map((item, i) => i === index ? { ...item, ...patch } : item) })} onRemove={() => onChange({ customShadows: undefined, shadowPreset: undefined })}/>) : null}</>}</div>))}
    {section('Elements', profile.elements, profile.elements.map(control => <div key={control}>{colour(control === 'heading' ? 'Heading' : 'Link', control === 'heading' ? 'headingColor' : 'linkColor')}</div>))}
    {profile.settings && viewport === 'desktop' ? section('Settings', ['enlarge'], <ToggleSetting label="Enlarge on click" checked={value.enlargeOnClick ?? false} onChange={enlargeOnClick => onChange({ enlargeOnClick })}/>) : null}
    {viewport === 'desktop' ? <InspectorAccordionSection title="Advanced"><AdvancedFieldsControl blockName={id === 'divider' ? 'Separator' : id[0].toUpperCase() + id.slice(1)} fields={{ anchor: false, className: false, additionalCss: true }} style={value} onChange={(_, additionalCss) => onChange({ additionalCss: additionalCss || undefined })}/></InspectorAccordionSection> : null}
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
    function commit(nextUnit = unit) { const number = Number(amount); setDraft(null); onChange(amount.trim() && Number.isFinite(number) ? `${Math.max(min, Math.min(10000, number))}${nextUnit}` : undefined); }
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
    return <><div className="paragraph-background-option-row"><button ref={trigger} className="paragraph-background-option" type="button" aria-label="Choose background image" aria-expanded={open} onClick={event => value.backgroundImage ? setOpen(v => !v) : setPicker(event.currentTarget)}><AcmIcon name="insert.image" size={20}/><span>Image</span>{value.backgroundImage ? <span className="visually-hidden">{value.backgroundImage.name}</span> : null}</button></div>{open ? <StudioAnchoredPopover anchor={() => trigger.current} inspectorPlacement preferredWidth={280} label="Background image" focusOnMount initialFocus={() => close.current} onClose={dismiss}><PopoverHeading closeRef={close} closeLabel="Close background image" onClose={() => dismiss(true)}>Image</PopoverHeading>{value.backgroundImage && urls[value.backgroundImage.id] ? <img src={urls[value.backgroundImage.id]} alt="" style={{ width: '100%', maxHeight: 120, objectFit: 'contain' }}/> : null}<div><StudioButton variant="text" onClick={() => { setPicker(trigger.current); dismiss(false); }}>Replace</StudioButton><StudioButton variant="text" onClick={() => { onChange({ backgroundImage: null }); dismiss(true); }}>Remove</StudioButton></div><FocalPositionSetting x={value.imageFocalX ?? 50} y={value.imageFocalY ?? 50} onXChange={imageFocalX => onChange({ imageFocalX })} onYChange={imageFocalY => onChange({ imageFocalY })}/><RadioGroup label="Size" value={value.imageSize ?? 'cover'} options={[{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }, { value: 'tile', label: 'Tile' }]} onChange={size => onChange({ imageSize: size as PreviewBlockStyle['imageSize'] })}/><ToggleSetting label="Repeat" checked={value.imageRepeat ?? false} onChange={imageRepeat => onChange({ imageRepeat })}/></StudioAnchoredPopover> : null}{picker ? <IdentityImagePicker title="Choose Background Image" opener={picker} onClose={() => setPicker(null)} onChoose={backgroundImage => { onChange({ backgroundImage }); setPicker(null); }}/> : null}</>;
}
