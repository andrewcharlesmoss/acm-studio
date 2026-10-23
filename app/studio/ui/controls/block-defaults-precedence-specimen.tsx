"use client";
import { useState } from "react";
import { BlockRenderer } from "../../../components/content";
import type { ContentBlock } from "../../../content/model";
import { applyPreviewBlockStyles } from "../../site-editor/blocks-preview-model";
import { BlockPreviewRules } from "../../site-editor/block-preview-rules";
import { createStylesPreview, resolvePreviewStyle } from "../../site-editor/styles-preview-state";
import { StudioButton } from "../../controls/button";

const blocks: ContentBlock[] = [
  { id: 'precedence-buttons', type: 'buttons', children: [{ id: 'precedence-button', type: 'button', label: 'Authored state example', url: '#block-style-panels', style: 'primary', interactionStyles: { hover: { textColor: '#123456', backgroundColor: '#abcdef' }, focus: { textColor: '#654321' }, active: { textColor: '#135724' } } }] },
  { id: 'precedence-first', type: 'paragraph', text: 'First paragraph.' },
  { id: 'precedence-second', type: 'paragraph', text: 'Following paragraph.' },
];
/** Interactive, memory-only canonical rendering for authored/default precedence. */
export function BlockDefaultsPrecedenceSpecimen() {
  const [all, setAll] = useState(false);
  const selection = { ...resolvePreviewStyle(createStylesPreview().present, 'global'), blockStyles: {
    button: { textColor: '#000000', interactionStates: { hover: { textColor: '#ff0000', backgroundColor: '#ff0000', borderRadius: '12px' }, focus: { textColor: '#ff0000' }, 'focus-visible': { textColor: '#ff0000' }, active: { textColor: '#ff0000' } } },
    paragraph: { textIndent: '8px', previewResponsive: { mobile: { textIndent: '24px', indentAll: all } } },
  } };
  return <details><summary>Compare authored styles</summary>
    <StudioButton onClick={() => setAll(value => !value)} aria-pressed={all}>Indent all paragraphs</StudioButton>
    <div className="studio-responsive-container" style={{ width: '400px', maxWidth: '100%' }} data-block-preview-scope="library-authored-precedence" aria-label="Authored styles example">
      <BlockPreviewRules scopeId="library-authored-precedence" selection={selection} />
      <BlockRenderer variant="studio" blocks={applyPreviewBlockStyles(blocks, selection.blockStyles)} />
    </div>
  </details>;
}
