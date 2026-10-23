"use client";
import { SearchInput } from "../controls/native-fields";
import { useId } from "react";

import { applyPreviewBlockStyles, resolvePreviewBlockVariant, referencePreviewBlockStyles, previewBlockTargets, type PreviewBlockId } from "./blocks-preview-model";
import { paragraphStyleToCss, visualStyleClassName } from "../../content/paragraph-styles";
import { previewLayoutCss } from "./layout-preview-model";
import "./layout-preview.css";
import { BackgroundPreviewSurface } from "./background-preview-surface";
import { BlockRenderer } from "../../components/content";
import { previewStyleDetails, type StyleSelection } from "./styles-preview-state";
import type { TypographyRole } from "./typography-preview-model";
import { styleBookDocument, styleBookExamples, styleBookExampleText, styleBookPresentation, type StyleBookContext } from "./style-book-model";
import "./style-book.css";
import { BlockPreviewRules } from "./block-preview-rules";

/** Read-only specimen content; navigation and the existing Styles history stay with the owner. */
export function StyleBook({ selection: baseSelection, context, onTypography, onBrowse, onColours, onBlock, backgroundImageUrl }: {
  backgroundImageUrl?: string;
  selection: StyleSelection;
  context: StyleBookContext;
  onTypography: (role?: TypographyRole) => void;
  onBrowse: () => void;
  onColours?: () => void;
  onBlock?: (id: PreviewBlockId) => void;
}) {
  const scopeId=useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const selection = typeof context === "object" && context.block && context.variation
    ? { ...baseSelection, blockStyles: { ...baseSelection.blockStyles, [context.block]: resolvePreviewBlockVariant(referencePreviewBlockStyles(baseSelection.blockStyles)[context.block], context.variation) } }
    : baseSelection;
  const { palette } = previewStyleDetails(selection);
  return <BackgroundPreviewSurface className={`site-style-book has-site-layout${selection.layout?.blockSpacing !== undefined ? " has-custom-block-spacing" : ""}`} background={selection.background} palette={palette} colours={selection.colours} imageUrl={backgroundImageUrl} style={{ ...styleBookPresentation(selection), ...previewLayoutCss(selection.layout) }} label="Style Book examples">
    <div data-block-preview-scope={scopeId}>
    <BlockPreviewRules scopeId={scopeId} selection={selection} />
    {styleBookExamples(context).map(source => {
      // Reference-only block families inherit element type, not the surrogate
      // Paragraph/Code block inspector used to render their portable content.
      const referenceOnly = ["math", "preformatted", "poetry", "custom-link", "home-link"].includes(source.id);
      const example = { ...source, blocks: referenceOnly ? source.blocks : applyPreviewBlockStyles(source.blocks ?? [], selection.blockStyles) };
      const blockTarget = onBlock ? (typeof context === "object" ? context.block : undefined) ?? previewBlockTargets.find(item => item.example === example.id && item.id !== "button")?.id : undefined;
      const open = blockTarget && onBlock ? () => onBlock(blockTarget) : example.id === "colours" ? onColours ?? onBrowse : example.id === "typography" ? () => onTypography() : example.role ? () => onTypography(example.role) : undefined;
      const label = blockTarget ? `Edit ${previewBlockTargets.find(item => item.id === blockTarget)!.label} block styles` : example.id === "colours" ? onColours ? "Edit palette" : "Browse Colour Variations" : example.id === "typography" ? "Open Typography" : `Open ${example.role === "text" ? "Text" : example.role === "captions" ? "Captions" : example.label} Typography`;
      return <section className={`site-style-book-example is-${example.id}`} key={example.id} aria-labelledby={`style-book-label-${example.id}`}>
        <h2 id={`style-book-label-${example.id}`} className="site-style-book-label">{example.label}</h2>
        <div id={`style-book-sample-${example.id}`} className="site-style-book-sample" inert>
          {example.id === "colours" ? <div className="site-style-book-colours">{palette.colours.map((colour, index) => <span key={index} style={{ background: colour }} title={colour} />)}</div>
          : example.id === "typography" ? <><p className="site-style-book-alphabet">AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789X&#123;(…)&#125;,.-&lt;&gt;?!*&amp;:/A@HELFO™©</p><div className="site-style-book-columns">{(example.blocks ?? []).map(block => <BlockRenderer key={block.id} variant="studio" blocks={[block]} />)}</div></>
          : example.presentation === "details" ? <details open><summary>La Mancha</summary><BlockRenderer externalEmbedPlaceholder document={styleBookDocument} variant="studio" blocks={example.blocks ?? []} /></details>
          : example.id === "search" ? <div className={`site-style-book-search site-block-style-search ${visualStyleClassName(referencePreviewBlockStyles(selection.blockStyles).search ?? {})}`} style={paragraphStyleToCss(referencePreviewBlockStyles(selection.blockStyles).search)}><label htmlFor="style-book-search-input">Search</label><div className="site-style-book-search-row"><SearchInput id="style-book-search-input" placeholder="Optional placeholder…" readOnly /><BlockRenderer externalEmbedPlaceholder document={styleBookDocument} variant="studio" blocks={example.blocks ?? []} /></div></div>
          : <BlockRenderer externalEmbedPlaceholder document={styleBookDocument} variant="studio" blocks={example.blocks ?? []} />}
        </div>
        <p className="visually-hidden" id={`style-book-description-${example.id}`}>{example.id === "colours" ? palette.colours.join(", ") : styleBookExampleText(example)}</p>
        {open ? <button type="button" className="site-style-book-target" aria-label={label} aria-describedby={`style-book-description-${example.id}`} onClick={open} /> : null}
      </section>;
    })}
    </div>
  </BackgroundPreviewSurface>;
}
