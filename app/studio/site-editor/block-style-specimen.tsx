"use client";
import { useId } from "react";
import { SearchInput } from "../controls/native-fields";
import { BlockRenderer } from "../../components/content";
import { paragraphStyleToCss, visualStyleClassName } from "../../content/paragraph-styles";
import { applyPreviewBlockStyles, effectivePreviewBlockStyle, resolvePreviewBlockVariant, referencePreviewBlockStyles, type PreviewBlockId } from "./blocks-preview-model";
import { BlockPreviewRules } from "./block-preview-rules";
import { styleBookDocument, styleBookExamples, styleBookPresentation } from "./style-book-model";
import { NavigationStyleSpecimen } from "./navigation-style-specimen";
import type { StyleSelection } from "./styles-preview-state";
/** The same canonical read-only block renderer as the right-hand Style Book. */
export function BlockStyleSpecimen({ id, selection, viewport, variation, buttonPreviewState = 'default', sampleText }: {
    id: PreviewBlockId;
    selection: StyleSelection;
    viewport: 'desktop' | 'tablet' | 'mobile';
    variation?: string;
    buttonPreviewState?: 'default' | 'hover' | 'focus' | 'focus-visible' | 'active';
    sampleText?: string;
}) {
    const inputId = useId();
    const scopeId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const resolved = resolvePreviewBlockVariant(referencePreviewBlockStyles(selection.blockStyles)[id], variation);
    // The inspector's chosen state controls this compact example, independently of pane width.
    const values = effectivePreviewBlockStyle(resolved, viewport);
    const interactionStates = id === 'button' && resolved.interactionStates ? Object.fromEntries(Object.entries(resolved.interactionStates).map(([state, style]) => [state, effectivePreviewBlockStyle(style, viewport)])) : undefined;
    const viewportDefaults = Object.fromEntries(Object.entries(referencePreviewBlockStyles(selection.blockStyles)).map(([key, style]) => [key, effectivePreviewBlockStyle(style, viewport)]));
    const projected = { ...selection, blockStyles: { ...viewportDefaults, [id]: { ...values, ...(interactionStates ? { interactionStates } : {}) } } };
    const source = styleBookExamples({ block: id })[0];
    const sampleBlocks = id === 'heading' && sampleText
        ? (source?.blocks ?? []).filter(block => block.type === 'heading' && block.level === 2).slice(0, 1).map(block => ({ ...block, text: sampleText }))
        : source?.blocks ?? [];
    const blocks = applyPreviewBlockStyles(sampleBlocks, projected.blockStyles, buttonPreviewState);
    return <div className="site-block-inline-specimen site-style-book studio-responsive-container" data-block-preview-scope={scopeId} style={styleBookPresentation(projected)} aria-label={`${id === 'heading' && sampleText ? 'Heading' : source?.label ?? id} style preview`}>
    <BlockPreviewRules scopeId={scopeId} selection={projected}/>
    <div className="site-style-book-sample" inert>{id === 'navigation' ? <NavigationStyleSpecimen style={values}/> : id === 'search' ? <div className={`site-style-book-search site-block-style-search ${visualStyleClassName(values)}`} style={paragraphStyleToCss(values)}><label htmlFor={inputId}>Search</label><div className="site-style-book-search-row"><SearchInput id={inputId} placeholder="Optional placeholder…" readOnly/><BlockRenderer externalEmbedPlaceholder document={styleBookDocument} variant="studio" blocks={blocks}/></div></div> : <BlockRenderer externalEmbedPlaceholder document={styleBookDocument} variant="studio" blocks={blocks}/>}</div>
  </div>;
}
