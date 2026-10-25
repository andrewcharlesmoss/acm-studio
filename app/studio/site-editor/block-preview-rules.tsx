"use client";
import { useId, useMemo, type ReactNode } from "react";
import { useBlobUrls } from "../controls/use-blob-urls";
import { DuotoneFilter } from "../controls/duotone-filter";
import { parseAdditionalCssDeclarations, paragraphStyleToCss, paragraphBackgroundGradientCss } from "../../content/paragraph-styles";
import { effectivePreviewBlockStyle, previewButtonItemWidth, resolvePreviewBlockDefaults, type PreviewBlockStyle, type PreviewBlockId } from "./blocks-preview-model";
import { availableTypographyFamily, fontSizePresetCss, resolveFontSizePresets } from "./typography-preview-model";
import { previewColourValue } from "./colours-preview-model";
import { previewStyleDetails, type StyleSelection } from "./styles-preview-state";
import { resolveShadowPresets, shadowPresetCss } from "./shadows-preview-model";
const containerButtonProperties = { color: '--site-container-button-color', 'background-color': '--site-container-button-background-color', 'background-image': '--site-container-button-background-image' } as const;
const typographyFields = ['font-family', 'font-size', 'font-weight', 'font-style', 'text-align', 'text-indent', 'color', 'line-height', 'letter-spacing', 'text-transform', 'text-decoration', 'writing-mode', 'text-orientation', 'column-count'] as const;
const textChildren = ':is(.heading-field,.block-textarea,.list-item-text,.list-item-editor,.list-field-marker,.studio-code-preview,.content-table,.content-button,.template-subtitle,.metadata-block,.article-footnotes,.reading-time-badge,.content-field input,.content-field select)';
function declarations(value: PreviewBlockStyle, selection: StyleSelection, id: PreviewBlockId, includeButtonSurface = false): Record<string, string> {
    const { palette } = previewStyleDetails(selection);
    const canonical = Object.entries(paragraphStyleToCss(value)).map(([key, value]) => [key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`), value]);
    // Code paints its background and padding on the inner pre; putting padding
    // on both the canonical wrapper and that surface leaves an inset panel.
    const css: Record<string, string> = Object.fromEntries(canonical.filter(([key]) => typographyFields.includes(key as typeof typographyFields[number]) || key.startsWith('--') || (['code','heading'].includes(id) && ['background-color','background-image'].includes(key)) || (id === 'code' && key === 'padding') || (includeButtonSurface && ['background-color','background-image','border-color','border-width','border-style','border-radius','padding','box-shadow'].includes(key))));
    if (includeButtonSurface && value.backgroundColor !== undefined && !value.backgroundGradient) css['background-image'] = 'none';
    if (value.websiteFont)
        css['font-family'] = availableTypographyFamily(value.websiteFont, selection.typography ?? {})!;
    const preset = resolveFontSizePresets(selection.typography).find(p => p.id === value.websitePreset);
    if (preset)
        css['font-size'] = fontSizePresetCss(preset);
    if (value.websiteWeight !== undefined)
        css['font-weight'] = String(value.websiteWeight);
    if (value.websiteItalic !== undefined)
        css['font-style'] = value.websiteItalic ? 'italic' : 'normal';
    if (id === 'table' && value.cellPadding)
        css['--studio-table-cell-padding'] = value.cellPadding;
    if (value.textAlign)
        css['text-align'] = value.textAlign;
    if (value.textIndent !== undefined && id === 'paragraph')
        css['text-indent'] = value.indentAll ? value.textIndent : '0px';
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
    const styles = resolvePreviewBlockDefaults(selection.blockStyles, referenceDefaults);
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
                body += Object.entries(values).map(([property, value]) => {
                    // Content-owned interaction classes come from the canonical Button mapper.
                    // An active authored property wins; unrelated theme properties still inherit.
                    const stateGuard = ['hover', 'focus', 'active'].map(state => `:not(.has-button-${state}-${property}:is(:${state},.is-button-state-preview-${state}))`).join('');
                    const guardedTarget = target.replace(/\.content-button(?![\w-])/g, `.content-button${stateGuard}`);
                    const containerVariable = property in containerButtonProperties && target.includes('.content-button') ? containerButtonProperties[property as keyof typeof containerButtonProperties] : undefined;
                    const inheritedButtonValue = containerVariable && id === 'button' && !/:hover|:focus|:active|is-button-state-preview/.test(target) ? `var(${containerVariable},${value})` : value;
                    return `${guardedTarget.replace(selector, `${selector}:not(.site-block-authored-${property})${viewport === 'desktop' ? '' : `:not(.site-block-authored---studio-rs-${viewport}-${property.replace(/^--/, '')})`}`)}{${property}:${inheritedButtonValue}!important}`;
                }).join(''); };
            const surface = id === 'button' ? `${selector} .content-button` : ['image', 'cover-image'].includes(id) ? `${selector} img` : id === 'code' ? `${selector} .studio-code-preview` : id === 'heading' ? `${selector} .heading-field` : undefined;
            const surfaceFields = new Set(['box-shadow', 'background-color', 'background-image', 'border-color', 'border-width', 'border-style', 'border-radius', 'padding']);
            if (surface) {
                emit(surface, Object.fromEntries(Object.entries(css).filter(([key]) => surfaceFields.has(key))));
                emit(selector, { ...(css['box-shadow'] ? { 'box-shadow': 'none' } : {}), ...(css['background-color'] ? { 'background-color': 'transparent' } : {}), ...(css['background-image'] ? { 'background-image': 'none' } : {}), ...(css['border-style'] ? { 'border-style': 'none' } : {}), ...(css.padding ? { padding: '0' } : {}) });
            }
            emit(selector, Object.fromEntries(Object.entries(css).filter(([key]) => !surface || !surfaceFields.has(key))));
            if (id === 'paragraph' && value.textIndent !== undefined && !value.indentAll) emit(`${selector}.site-block-follows-paragraph`, { 'text-indent': value.textIndent });
            const inherited = Object.fromEntries(typographyFields.filter(p => css[p]).map(p => [p, 'inherit']));
            if (id === 'buttons') {
                emit(`${selector} .content-buttons`, Object.fromEntries(Object.entries(css).filter(([p]) => typographyFields.includes(p as typeof typographyFields[number])).map(([p, v]) => [`--button-group-${p}`, v])));
            }
            else
                for (const [property, inheritedValue] of Object.entries(inherited)) {
                    // Button element colours have their own scoped owner; ordinary container
                    // text colours must not override that painted surface.
                    const children = property === 'color' ? textChildren.replace(',.content-button', '') : textChildren;
                    emit(`${selector} ${children}:not(.site-block-authored-${property}):not(.site-block-authored-${property} *)${viewport === "desktop" ? "" : `:not(.site-block-authored---studio-rs-${viewport}-${property}):not(.site-block-authored---studio-rs-${viewport}-${property} *)`}`, { [property]: inheritedValue });
                }
            if (['group','row','stack','grid','columns','column'].includes(id)) {
                const variables: Record<string,string> = {};
                if (value.buttonTextColor !== undefined) variables['--site-container-button-color'] = value.buttonTextColor;
                if (value.buttonBackgroundColor !== undefined) {
                    variables['--site-container-button-background-color'] = value.buttonBackgroundColor;
                    variables['--site-container-button-background-image'] = 'none';
                }
                const gradient = value.buttonGradientId ? selection.colours?.gradients?.[value.buttonGradientId]?.gradient ?? selection.colours?.retiredGradients?.[value.buttonGradientId] ?? value.buttonBackgroundGradient : value.buttonBackgroundGradient;
                if (gradient) {
                    variables['--site-container-button-background-color'] = 'transparent';
                    variables['--site-container-button-background-image'] = paragraphBackgroundGradientCss(gradient)!;
                }
                // Inherited custom properties resolve the nearest container independently
                // for text and background, regardless of block/profile source order.
                emit(selector, variables);
                for (const [property, variable] of Object.entries(containerButtonProperties)) {
                    if (!(variable in variables)) continue;
                    const deviceGuard = viewport === 'desktop' ? '' : `:not(.site-block-authored---studio-rs-${viewport}-${property})`;
                    const stateGuard = ['hover','focus','active'].map(state => `:not(.has-button-${state}-${property}:is(:${state},.is-button-state-preview-${state}))`).join('');
                    const themeStateGuard = (['hover','focus','focus-visible','active'] as const).filter(state => {
                        const stateValue = effectivePreviewBlockStyle(styles.button?.interactionStates?.[state], viewport);
                        return declarations(stateValue, selection, 'button', true)[property] !== undefined;
                    }).map(state => `:not(:${state}):not(.is-button-state-preview-${state})`).join('');
                    const target = `${selector} .site-block-style-button:not(.site-block-authored-${property})${deviceGuard} .content-button${stateGuard}${themeStateGuard}`;
                    body += `${target}{${property}:var(${variable})!important}`;
                }
            }
            // An explicit Heading margin owns its rhythm, including zero. Do
            // not let the book's unedited browser margins impose a larger gap.
            if (id === 'heading' && value.margin !== undefined)
                emit(`.site-style-book ${selector} .heading-field`, { 'margin-block': '0' });
            const headingColourGuard = `:not(.site-block-authored-color):not(.site-block-authored-color *)${viewport === "desktop" ? "" : `:not(.site-block-authored---studio-rs-${viewport}-color):not(.site-block-authored---studio-rs-${viewport}-color *)`}`;
            if (value.headingColor)
                emit(`${selector} .heading-field${headingColourGuard}`, { color: previewColourValue(value.headingColor, previewStyleDetails(selection).palette, selection.colours) ?? value.headingColor });
            if (value.headingColors) for (const [level, colour] of Object.entries(value.headingColors)) {
                if (/^[1-6]$/.test(level) && colour) emit(`${selector} h${level}.heading-field${headingColourGuard}`, { color: previewColourValue(colour, previewStyleDetails(selection).palette, selection.colours) ?? colour });
            }
            if (id === 'buttons' && (value.rowGap || value.columnGap))
                emit(`${selector} .content-buttons`, { 'row-gap': value.rowGap ?? '16px', 'column-gap': value.columnGap ?? '16px', '--site-block-button-gap': value.columnGap ?? '16px' });
            if (['group','row','stack','grid','section','columns','column'].includes(id)) {
                const layout = id === 'columns' || id === 'column' ? selector : `${selector} > :is(.content-group,.content-section)`;
                if (value.blockGap) emit(layout, { '--block-layout-gap': value.blockGap });
                if (value.rowGap) emit(layout, { '--block-layout-row-gap': value.rowGap });
                if (value.columnGap) emit(layout, { '--block-layout-column-gap': value.columnGap });
            }
            if (id === 'social-icons' && (value.rowGap || value.columnGap)) emit(`${selector} .social-icons-block ul`, { gap: `${value.rowGap ?? '8px'} ${value.columnGap ?? '8px'}` });
            if (id === 'button' && previewButtonItemWidth(value.buttonWidth)) {
                // The item is the sole width owner; its field and painted button fill it.
                const owner = `[data-block-preview-scope="${scopeId}"] .content-button-item:has(.site-block-style-button${selectorSuffix}:not(.site-block-authored-button-width))`;
                emit(owner, { '--button-item-width': previewButtonItemWidth(value.buttonWidth)! });
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
                    const stateWidth = previewButtonItemWidth(stateValue.buttonWidth);
                    if (stateWidth) {
                        const stateOwner = `[data-block-preview-scope="${scopeId}"] .content-button-item:has(.site-block-style-button${selectorSuffix}:not(.site-block-authored-button-width):not(.site-block-authored-button-${state}-width) .content-button${pseudoSelectors[state]})`;
                        const previewOwner = `[data-block-preview-scope="${scopeId}"] .content-button-item:has(.site-block-style-button${selectorSuffix}.is-button-state-preview-${state}:not(.site-block-authored-button-width):not(.site-block-authored-button-${state}-width))`;
                        emit(`${stateOwner},${previewOwner}`, { '--button-item-width': stateWidth });
                        emit(`${selector} .content-button${pseudoSelectors[state]},${selector}.is-button-state-preview-${state} .content-button`, { width: '100%', 'box-sizing': 'border-box' });
                    }
                }
            }
            if (id === 'quote' && value.blockGap)
                emit(`${selector} blockquote > * + *`, { 'margin-block-start': value.blockGap });
            if (id === 'list' && value.blockGap)
                emit(`${selector} :is(.list-field-editor,.list-field-preview)`, { 'row-gap': value.blockGap });
            if (value.backgroundImage && urls[value.backgroundImage.id])
                emit(selector, { 'background-image': `url(${JSON.stringify(urls[value.backgroundImage.id])})`, 'background-size': value.imageSize === 'tile' ? 'auto' : value.imageSize ?? 'cover', 'background-repeat': (value.imageRepeat ?? value.imageSize === 'tile') ? 'repeat' : 'no-repeat', 'background-position': `${value.imageFocalX ?? 50}% ${value.imageFocalY ?? 50}%` });
            if (['image', 'cover-image'].includes(id) && value.duotone) {
                const filterId = `block-duotone-${uid}-${id}-${viewport}`;
                filters.push(<DuotoneFilter key={filterId} id={filterId} value={value.duotone}/>);
                emit(`${selector} img`, { filter: `url("#${filterId}")` });
            }
            else if (['image', 'cover-image'].includes(id) && value.duotone === null)
                emit(`${selector} img`, { filter: 'none' });
            // Authored Additional CSS wins over generated theme adapters.
            const additional = parseAdditionalCssDeclarations(value.additionalCss);
            emit(surface ?? selector, Object.fromEntries(Object.entries(additional).filter(([key]) => typographyFields.includes(key.replace(/[A-Z]/g,c=>`-${c.toLowerCase()}`) as typeof typographyFields[number])).map(([p, v]) => [p.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`), v])));
            rules.push(viewport === 'desktop' ? `@container studio-document (min-width:782.01px){${body}}` : `@container studio-document (${viewport === 'mobile' ? 'max-width:480px' : 'min-width:480.01px) and (max-width:782px'}){${body}}`);
        }
    }
    return <><style>{rules.join('\n')}</style>{filters}</>;
}
