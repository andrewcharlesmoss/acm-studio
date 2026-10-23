"use client";
import { useState } from "react";
import { BlockField } from "../../studio-canvas";
import { WebsiteDesignContext } from "../../site-editor/website-design-surface";
import { effectiveWebsiteDesign } from "../../site-editor/website-design";
import { BlockRenderer } from "../../../components/content";
import type { ContentBlock } from "../../../content/model";
import { applyPreviewBlockStyles } from "../../site-editor/blocks-preview-model";
import { BlockPreviewRules } from "../../site-editor/block-preview-rules";
import { createStylesPreview, resolvePreviewStyle } from "../../site-editor/styles-preview-state";
import { SelectControl } from "../../controls/native-fields";
import { StudioButton } from "../../controls/button";

const blocks: ContentBlock[] = [
  { id: 'precedence-buttons', type: 'buttons', children: [{ id: 'precedence-button', type: 'button', label: 'Authored state example', url: '#block-style-panels', style: 'primary', interactionStyles: { hover: { textColor: '#123456', backgroundColor: '#abcdef' }, focus: { textColor: '#654321' }, active: { textColor: '#135724' } } }] },
  { id: 'precedence-first', type: 'paragraph', text: 'First paragraph.' },
  { id: 'precedence-second', type: 'paragraph', text: 'Following paragraph.' },
];
/** Interactive, memory-only canonical rendering for authored/default precedence. */
export function BlockDefaultsPrecedenceSpecimen() {
  const [all, setAll] = useState(false);
  const [width, setWidth] = useState("400");
  const paragraphs = blocks.filter(block => block.type === 'paragraph');
  const selection = { ...resolvePreviewStyle(createStylesPreview().present, 'global'), blockStyles: {
    button: { textColor: '#000000', interactionStates: { hover: { textColor: '#ff0000', backgroundColor: '#ff0000', borderRadius: '12px' }, focus: { textColor: '#ff0000' }, 'focus-visible': { textColor: '#ff0000' }, active: { textColor: '#ff0000' } } },
    paragraph: { textIndent: '8px', indentAll: all, previewResponsive: { tablet: { textIndent: '16px', indentAll: all }, mobile: { textIndent: '24px', indentAll: all } } },
  } };
  return <details><summary>Compare authored styles</summary>
    <StudioButton onClick={() => setAll(value => !value)} aria-pressed={all}>Indent all paragraphs</StudioButton>
    <label>Comparison viewport<SelectControl value={width} onChange={event => setWidth(event.target.value)}><option value="900">Desktop</option><option value="640">Tablet</option><option value="400">Mobile</option></SelectControl></label>
    <div style={{ overflowX: 'auto', maxWidth: '100%' }}><div className="studio-responsive-container" style={{ width: `${width}px` }} data-block-preview-scope="library-authored-precedence" aria-label="Authored styles example">
      <BlockPreviewRules scopeId="library-authored-precedence" selection={selection} />
      <BlockRenderer variant="studio" blocks={applyPreviewBlockStyles(blocks, selection.blockStyles)} />
      <WebsiteDesignContext.Provider value={{ design: { ...effectiveWebsiteDesign(undefined, undefined), styles: selection }, imageUrl: value => value }}>
        <div aria-label="Paragraph Edit comparison">{paragraphs.map((block, index) => <BlockField key={block.id} block={block} rootBlocks={paragraphs} previousSibling={paragraphs[index - 1]} writable={false} onChange={() => {}} onTextSelection={() => {}} onLinkActivate={() => {}} onTableCellFocus={() => {}} />)}</div>
        <div aria-label="Paragraph Preview comparison"><BlockRenderer variant="studio" blocks={paragraphs} /></div>
      </WebsiteDesignContext.Provider>
    </div></div>
  </details>;
}
