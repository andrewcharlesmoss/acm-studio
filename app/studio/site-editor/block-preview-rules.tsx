"use client";
import { useId, useMemo, type ReactNode } from "react";
import { useBlobUrls } from "../controls/use-blob-urls";
import { DuotoneFilter } from "../controls/duotone-filter";
import { parseAdditionalCssDeclarations, paragraphStyleToCss } from "../../content/paragraph-styles";
import { effectivePreviewBlockStyle, referencePreviewBlockStyles, type PreviewBlockStyle, type PreviewBlockId } from "./blocks-preview-model";
import { availableTypographyFamily, fontSizePresetCss, resolveFontSizePresets } from "./typography-preview-model";
import { previewColourValue } from "./colours-preview-model";
import { previewStyleDetails, type StyleSelection } from "./styles-preview-state";
import { resolveShadowPresets, shadowPresetCss } from "./shadows-preview-model";
const typographyFields = ['font-family', 'font-size', 'font-weight', 'font-style', 'text-align', 'text-indent', 'color', 'line-height', 'letter-spacing', 'text-transform', 'text-decoration', 'writing-mode', 'text-orientation', 'column-count'] as const;
const textChildren = ':is(.heading-field,.block-textarea,.list-item-text,.list-field-marker,.studio-code-preview,.content-table,.content-button)';
function declarations(value: PreviewBlockStyle, selection: StyleSelection, id: PreviewBlockId, includeButtonSurface = false): Record<string, string> {
    const { palette } = previewStyleDetails(selection);
    const canonical = Object.entries(paragraphStyleToCss(value)).map(([key, value]) => [key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`), value]);
    // Code paints its background and padding on the inner pre; putting padding
    // on both the canonical wrapper and that surface leaves an inset panel.
    const css: Record<string, string> = Object.fromEntries(canonical.filter(([key]) => typographyFields.includes(key as typeof typographyFields[number]) || key.startsWith('--') || (['code','heading'].includes(id) && ['background-color','background-image'].includes(key)) || (id === 'code' && key === 'padding') || (includeButtonSurface && ['background-color','background-image','border-color','border-width','border-style','border-radius','padding','box-shadow'].includes(key))));
    if (value.websiteFont)
        css['font-family'] = availableTypographyFamily(value.websiteFont, selection.typography ?? {})!;
    const preset = resolveFontSizePresets(selection.typography).find(p => p.id === value.websitePreset);
    if (preset)
        css['font-size'] = fontSizePresetCss(preset);
    if (value.websiteWeight !== undefined)
        css['font-weight'] = String(value.websiteWeight);
    if (value.websiteItalic !== undefined)
        css['font-style'] = value.websiteItalic ? 'italic' : 'normal';
    if (value.textAlign)
        css['text-align'] = value.textAlign;
    if (value.textIndent && value.indentAll)
        css['text-indent'] = value.textIndent;
    if (value.shadowPreset) {
        const preset = resolveShadowPresets(selection.shadows).find(p => p.id === value.shadowPreset);
        css['box-shadow'] = value.shadowPreset === 'none' ? 'none' : value.shadowPreset === 'custom' ? shadowPresetCss({ id: 'custom', name: 'Custom', layers: value.customShadows ?? [] }) : preset ? shadowPresetCss(preset) : 'none';
    }
    for (const [field, property] of [['textColor', 'color'], ['backgroundColor', 'background-color'], ['borderColor', 'border-color']] as const) {
        if (value[field]?.startsWith('var(--site-palette-') && (field === 'textColor' || field === 'backgroundColor' && ['code', 'heading'].includes(id)))
            css[property] = previewColourValue(value[field], palette, selection.colours) ?? 'inherit';
    }
    // Reuse canonical declaration validation; values never become selectors.
    const parsed = parseAdditionalCssDeclarations(Object.entries(css).map(([key, value]) => `${key}:${value}`).join(';'));
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`), value]));
}
export function BlockPreviewRules({ selection, scopeId, referenceDefaults = true, imageUrls = {}, selectorSuffix = "" }: {
    selection: StyleSelection;
    scopeId: string;
    referenceDefaults?: boolean;
    imageUrls?: Record<string,string>;
    selectorSuffix?: string;
}) {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const styles = referenceDefaults ? referencePreviewBlockStyles(selection.blockStyles) : selection.blockStyles ?? {};
    const images = useMemo(() => Object.values(selection.blockStyles ?? {}).flatMap(style => style?.backgroundImage?.blob instanceof Blob ? [style.backgroundImage] : []), [selection.blockStyles]);
    const generated = useBlobUrls(images);
    const urls = { ...generated, ...imageUrls };
    const rules: string[] = [];
    const filters: ReactNode[] = [];
    for (const [key, style] of Object.entries(styles)) {
        const id = key as PreviewBlockId;
        if (!style)
            continue;
        const selector = `[data-block-preview-scope="${scopeId}"] .site-block-style-${id}${selectorSuffix}`;
        for (const viewport of ['desktop', 'tablet', 'mobile'] as const) {
            const value = effectivePreviewBlockStyle(style, viewport);
            const css = declarations(value, selection, id);
            // The Button element/Buttons group owns inherited type sizing. Only
            // authored Button sizes may supersede those shared role variables.
            if (id === 'button') {
                const own = effectivePreviewBlockStyle(selection.blockStyles?.button, viewport);
                if (!own.websitePreset && !own.fontSize && !own.fontSizeCustom) delete css['font-size'];
            }
            let body = '';
            const emit = (target: string, values: Record<string, string>) => { if (Object.keys(values).length)
                body += Object.entries(values).map(([property, value]) => `${target.replace(selector, `${selector}:not(.site-block-authored-${property})${viewport === 'desktop' ? '' : `:not(.site-block-authored---studio-rs-${viewport}-${property.replace(/^--/, '')})`}`)}{${property}:${value}!important}`).join(''); };
            const surface = id === 'button' ? `${selector} .content-button` : id === 'image' ? `${selector} img` : id === 'code' ? `${selector} .studio-code-preview` : id === 'heading' ? `${selector} .heading-field` : undefined;
            const surfaceFields = new Set(['box-shadow', 'background-color', 'background-image', 'border-color', 'border-width', 'border-style', 'border-radius', 'padding']);
            if (surface) {
                emit(surface, Object.fromEntries(Object.entries(css).filter(([key]) => surfaceFields.has(key))));
                emit(selector, { ...(css['box-shadow'] ? { 'box-shadow': 'none' } : {}), ...(css['background-color'] ? { 'background-color': 'transparent' } : {}), ...(css['background-image'] ? { 'background-image': 'none' } : {}), ...(css['border-style'] ? { 'border-style': 'none' } : {}), ...(css.padding ? { padding: '0' } : {}) });
            }
            emit(selector, Object.fromEntries(Object.entries(css).filter(([key]) => !surface || !surfaceFields.has(key))));
            const inherited = Object.fromEntries(typographyFields.filter(p => css[p]).map(p => [p, 'inherit']));
            if (id === 'buttons') {
                emit(`${selector} .content-buttons`, Object.fromEntries(Object.entries(css).filter(([p]) => typographyFields.includes(p as typeof typographyFields[number])).map(([p, v]) => [`--button-group-${p}`, v])));
            }
            else
                emit(`${selector} ${textChildren}`, inherited);
            // An explicit Heading margin owns its rhythm, including zero. Do
            // not let the book's unedited browser margins impose a larger gap.
            if (id === 'heading' && value.margin !== undefined)
                emit(`.site-style-book ${selector} .heading-field`, { 'margin-block': '0' });
            if (id === 'quote' && value.headingColor)
                emit(`${selector} .heading-field`, { color: previewColourValue(value.headingColor, previewStyleDetails(selection).palette, selection.colours) ?? value.headingColor });
            if (id === 'quote' && value.headingColors) for (const [level, colour] of Object.entries(value.headingColors)) {
                if (/^[1-6]$/.test(level) && colour) emit(`${selector} h${level}.heading-field`, { color: previewColourValue(colour, previewStyleDetails(selection).palette, selection.colours) ?? colour });
            }
            if (id === 'buttons' && (value.rowGap || value.columnGap))
                emit(`${selector} .content-buttons`, { 'row-gap': value.rowGap ?? '16px', 'column-gap': value.columnGap ?? '16px', '--site-block-button-gap': value.columnGap ?? '16px' });
            if (id === 'button' && value.buttonWidth) {
                // The item is the sole width owner; its field and painted button fill it.
                const owner = `[data-block-preview-scope="${scopeId}"] .content-button-item:has(.site-block-style-button${selectorSuffix})`;
                emit(owner, { '--button-item-width': `calc(${value.buttonWidth}% - var(--site-block-button-gap,16px) * ${1 - Number(value.buttonWidth) / 100})` });
                emit(`${selector} .content-button`, { width: '100%', 'box-sizing': 'border-box' });
            }
            if (id === 'button') {
                const pseudoSelectors = { hover: ':hover', focus: ':focus', 'focus-visible': ':focus-visible', active: ':active' } as const;
                for (const state of Object.keys(pseudoSelectors) as (keyof typeof pseudoSelectors)[]) {
                    const stateStyle = style.interactionStates?.[state];
                    if (!stateStyle) continue;
                    const stateValue = effectivePreviewBlockStyle(stateStyle, viewport);
                    const stateCss = declarations(stateValue, selection, id, true);
                    emit(`${selector} .content-button${pseudoSelectors[state]}`, stateCss);
                    emit(`${selector}.is-button-state-preview-${state} .content-button`, stateCss);
                }
            }
            if (id === 'quote' && value.blockGap)
                emit(`${selector} blockquote > * + *`, { 'margin-block-start': value.blockGap });
            if (value.backgroundImage && urls[value.backgroundImage.id])
                emit(selector, { 'background-image': `url(${JSON.stringify(urls[value.backgroundImage.id])})`, 'background-size': value.imageSize === 'tile' ? 'auto' : value.imageSize ?? 'cover', 'background-repeat': (value.imageRepeat ?? value.imageSize === 'tile') ? 'repeat' : 'no-repeat', 'background-position': `${value.imageFocalX ?? 50}% ${value.imageFocalY ?? 50}%` });
            if (id === 'image' && value.duotone) {
                const filterId = `block-duotone-${uid}-${viewport}`;
                filters.push(<DuotoneFilter key={filterId} id={filterId} value={value.duotone}/>);
                emit(`${selector} img`, { filter: `url("#${filterId}")` });
            }
            else if (id === 'image' && value.duotone === null)
                emit(`${selector} img`, { filter: 'none' });
            // Authored Additional CSS wins over generated theme adapters.
            const additional = parseAdditionalCssDeclarations(value.additionalCss);
            emit(surface ?? selector, Object.fromEntries(Object.entries(additional).filter(([key]) => typographyFields.includes(key.replace(/[A-Z]/g,c=>`-${c.toLowerCase()}`) as typeof typographyFields[number])).map(([p, v]) => [p.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`), v])));
            rules.push(viewport === 'desktop' ? `@container studio-document (min-width:782.01px){${body}}` : `@container studio-document (${viewport === 'mobile' ? 'max-width:480px' : 'min-width:480.01px) and (max-width:782px'}){${body}}`);
        }
    }
    return <><style>{rules.join('\n')}</style>{filters}</>;
}
