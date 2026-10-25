"use client";
import { useState } from "react";
import { BlockRenderer } from "../../../components/content";
import type { ContentBlock } from "../../../content/model";
import { BlockField } from "../../studio-canvas";
import { SelectControl } from "../../controls/native-fields";
import { WebsiteDesignSurface } from "../../site-editor/website-design-surface";
import { effectiveWebsiteDesign } from "../../site-editor/website-design";
import type { StyleSelection } from "../../site-editor/styles-preview-state";

const buttons = (id: string, label: string): ContentBlock => ({ id, type: 'buttons', children: [{ id: `${id}-button`, type: 'button', style: 'primary', url: '#block-style-panels', label }] });
const blocks: ContentBlock[] = [buttons('container-unscoped-buttons', 'Unscoped Button'), { id: 'container-outer-group', type: 'group', layout: 'flow', children: [
  buttons('container-group-buttons', 'Group Button'),
  { id: 'container-authored-buttons', type: 'buttons', children: [{ id: 'container-authored-button', type: 'button', style: 'primary', url: '#block-style-panels', label: 'Authored Button', visualStyle: { textColor: '#135724', backgroundColor: '#eeeeee', responsive: { mobile: { textColor: '#246813' } } }, interactionStyles: { hover: { textColor: '#123456', backgroundColor: '#abcdef' } } }] },
  { id: 'container-columns', type: 'columns', children: [{ id: 'container-column', type: 'column', children: [
    buttons('container-column-buttons', 'Column Button'),
    { id: 'container-inner-group', type: 'group', layout: 'flow', children: [buttons('container-inner-buttons', 'Inner Group Button')] },
  ] }] },
] }];
/** Temporary production rendering for nested/default/authored precedence; no document store. */
export function ContainerButtonPrecedenceSpecimen({ selection }: { selection: StyleSelection }) {
  const [width, setWidth] = useState('900');
  const styles: StyleSelection = { ...selection, blockStyles: { ...selection.blockStyles, button: {
    textColor: '#ff0000', backgroundColor: '#00ff00', interactionStates: { hover: { textColor: '#987654', backgroundColor: '#fefefe' } }, ...selection.blockStyles?.button,
  } } };
  const design = { ...effectiveWebsiteDesign(undefined, undefined), styles };
  return <details><summary>Compare container Button inheritance</summary>
    <label>Container preview width<SelectControl value={width} onChange={event => setWidth(event.target.value)}><option value="900">Desktop</option><option value="640">Tablet</option><option value="400">Mobile</option></SelectControl></label>
    <div style={{ overflowX: 'auto', maxWidth: '100%' }}><div style={{ width: `${width}px` }}>
      <WebsiteDesignSurface design={design} scopeId="library-container-buttons">
        <div aria-label="Container Button Edit comparison">{blocks.map(block => <BlockField key={block.id} block={block} rootBlocks={blocks} writable={false} onChange={() => {}} onTextSelection={() => {}} onLinkActivate={() => {}} onTableCellFocus={() => {}} />)}</div>
        <div aria-label="Container Button Preview comparison"><BlockRenderer variant="studio" blocks={blocks} /></div>
      </WebsiteDesignSurface>
    </div></div>
  </details>;
}
