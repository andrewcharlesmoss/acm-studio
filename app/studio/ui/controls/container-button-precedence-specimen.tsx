"use client";
import { useState } from "react";
import { BlockRenderer } from "../../../components/content";
import type { ContentBlock } from "../../../content/model";
import { BlockField } from "../../studio-canvas";
import { SelectControl } from "../../controls/native-fields";
import { WebsiteDesignSurface } from "../../site-editor/website-design-surface";
import { effectiveWebsiteDesign } from "../../site-editor/website-design";
import { createWorkspacePreviewDocument } from "../../editor-model";
import type { StyleSelection } from "../../site-editor/styles-preview-state";

const buttons = (id: string, label: string): ContentBlock => ({ id, type: 'buttons', children: [{ id: `${id}-button`, type: 'button', style: 'primary', url: '#block-style-panels', label }] });
const blocks: ContentBlock[] = [buttons('container-unscoped-buttons', 'Unscoped Button'), { id: 'container-outer-group', type: 'group', layout: 'flow', children: [
  { id: 'container-group-heading', type: 'heading', level: 2, text: 'Group heading' },
  buttons('container-group-buttons', 'Group Button'),
  { id: 'container-authored-buttons', type: 'buttons', children: [{ id: 'container-authored-button', type: 'button', style: 'primary', url: '#block-style-panels', label: 'Authored Button', visualStyle: { textColor: '#135724', backgroundColor: '#eeeeee', responsive: { mobile: { textColor: '#246813' } } }, interactionStyles: { hover: { textColor: '#123456', backgroundColor: '#abcdef' } } }] },
  { id: 'container-columns', type: 'columns', children: [{ id: 'container-column', type: 'column', children: [
    { id: 'container-column-heading', type: 'heading', level: 2, text: 'Column heading' },
    { id: 'container-authored-heading', type: 'heading', level: 2, text: 'Authored heading', visualStyle: { backgroundColor: '#123456' } },
    buttons('container-column-buttons', 'Column Button'),
    { id: 'container-inner-group', type: 'group', layout: 'flow', children: [{ id: 'container-inner-heading', type: 'heading', level: 2, text: 'Inner Group heading' }, buttons('container-inner-buttons', 'Inner Group Button')] },
  ] }] },
] }];
const sectionBlocks: ContentBlock[] = [1,2,3,4,5].map(index => ({ id: `section-${index}-example`, type: 'group', layout: 'flow', visualStyle: { className: `is-style-section-${index}` }, children: [
  { id: `section-${index}-heading`, type: 'heading', level: 2, text: `Style ${index}` },
  { id: `section-${index}-date`, type: 'post-date', isLink: true },
  { id: `section-${index}-separator`, type: 'divider', style: 'wide' },
  { id: `section-${index}-authored-separator`, type: 'divider', style: 'wide', visualStyle: { backgroundColor: '#123456' } },
  { id: `section-${index}-quote`, type: 'quote', text: 'Room for a new idea.' },
  buttons(`section-${index}-buttons`, `Section ${index} Button`),
  { id: `section-${index}-authored-buttons`, type: 'buttons', children: [{ id: `section-${index}-authored`, type: 'button', style: 'primary', url: '#block-style-panels', label: `Section ${index} authored Button`, visualStyle: { backgroundColor: '#eeeeee', textColor: '#135724' }, interactionStyles: { hover: { backgroundColor: '#abcdef', textColor: '#123456' } } }] },
] }));
const exampleDocument = { ...createWorkspacePreviewDocument('post','section-style-example'), title: 'Example', publishAt: '2026-10-26T12:00:00Z' };
/** Temporary production rendering for nested/default/authored precedence; no document store. */
export function ContainerButtonPrecedenceSpecimen({ selection }: { selection: StyleSelection }) {
  const [width, setWidth] = useState('900');
  const [content, setContent] = useState('containers');
  const exampleBlocks = content === 'sections' ? sectionBlocks : blocks;
  const styles: StyleSelection = content === 'sections' ? selection : { ...selection, blockStyles: { ...selection.blockStyles, button: {
    textColor: '#ff0000', backgroundColor: '#00ff00', interactionStates: { hover: { textColor: '#987654', backgroundColor: '#fefefe' } }, ...selection.blockStyles?.button,
  } } };
  const design = { ...effectiveWebsiteDesign(undefined, undefined), styles };
  return <details><summary>Compare container Button inheritance</summary>
    <label>Comparison content<SelectControl value={content} onChange={event => setContent(event.target.value)}><option value="containers">Nested containers</option><option value="sections">Section styles</option></SelectControl></label>
    <label>Container preview width<SelectControl value={width} onChange={event => setWidth(event.target.value)}><option value="900">Desktop</option><option value="640">Tablet</option><option value="400">Mobile</option></SelectControl></label>
    <div style={{ overflowX: 'auto', maxWidth: '100%' }}><div style={{ width: `${width}px` }}>
      <WebsiteDesignSurface design={design} scopeId="library-container-buttons">
        <div aria-label="Container Button Edit comparison">{exampleBlocks.map(block => <BlockField key={block.id} block={block} rootBlocks={exampleBlocks} document={exampleDocument} writable={false} onChange={() => {}} onTextSelection={() => {}} onLinkActivate={() => {}} onTableCellFocus={() => {}} />)}</div>
        <div aria-label="Container Button Preview comparison"><BlockRenderer variant="studio" blocks={exampleBlocks} document={exampleDocument} /></div>
      </WebsiteDesignSurface>
    </div></div>
  </details>;
}
