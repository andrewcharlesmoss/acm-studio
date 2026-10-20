"use client";
import { useId } from "react";
import { SearchInput } from "../controls/native-fields";
import { BlockRenderer } from "../../components/content";
import { paragraphStyleToCss, visualStyleClassName } from "../../content/paragraph-styles";
import { applyPreviewBlockStyles, effectivePreviewBlockStyle, resolvePreviewBlockVariant, type PreviewBlockId } from "./blocks-preview-model";
import { BlockPreviewRules } from "./block-preview-rules";
import { styleBookExamples, styleBookPresentation } from "./style-book-model";
import type { StyleSelection } from "./styles-preview-state";
/** The same canonical read-only block renderer as the right-hand Style Book. */
export function BlockStyleSpecimen({ id, selection, viewport, variation }: {
    id: PreviewBlockId;
    selection: StyleSelection;
    viewport: 'desktop' | 'tablet' | 'mobile';
    variation?: string;
}) {
    const inputId = useId();
    const scopeId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const resolved = resolvePreviewBlockVariant(selection.blockStyles?.[id], variation);
    // The inspector's chosen state controls this compact example, independently of pane width.
    const values = effectivePreviewBlockStyle(resolved, viewport);
    const projected = { ...selection, blockStyles: { ...selection.blockStyles, [id]: values } };
    const source = styleBookExamples({ block: id })[0];
    const blocks = applyPreviewBlockStyles(source?.blocks ?? [], projected.blockStyles);
    return <div className="site-block-inline-specimen site-style-book studio-responsive-container" data-block-preview-scope={scopeId} style={styleBookPresentation(projected)} aria-label={`${source?.label ?? id} style preview`}>
    <BlockPreviewRules scopeId={scopeId} selection={projected}/>
    <div className="site-style-book-sample" inert>{id === 'search' ? <div className={`site-style-book-search site-block-style-search ${visualStyleClassName(values)}`} style={paragraphStyleToCss(values)}><label htmlFor={inputId}>Search</label><div className="site-style-book-search-row"><SearchInput id={inputId} placeholder="Optional placeholder…" readOnly/><BlockRenderer variant="studio" blocks={blocks}/></div></div> : <BlockRenderer variant="studio" blocks={blocks}/>}</div>
  </div>;
}
