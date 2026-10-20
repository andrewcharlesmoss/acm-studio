"use client";
import { useState } from "react";
import { Pane } from "./pane-components";
import { TwoLeftPaneWorkspace } from "./two-left-pane-workspace";
import { StudioIcon } from "../studio-icons";
import { SelectControl, TextInput } from "../controls/native-fields";
import { ResizablePreviewFrame } from "../controls/resizable-preview-frame";

/** Memory-only consumer of the same composition used by Site Editor. */
export function TwoLeftPaneSpecimen() {
  const [revision, setRevision] = useState(0);
  const [width, setWidth] = useState("available");
  return <div className="pl-main"><h2>Two Left Panes</h2><p>Navigation, settings, then the preview. Both panes use the shared resize, collapse, and keyboard controls. When a pane closes, its reopen button joins the open pane’s control in a vertically centred stack. Collapsed panes leave no gaps.</p>
    <div className="pl-preview-tools"><label className="pl-field">Example Width<SelectControl value={width} onChange={event => setWidth(event.currentTarget.value)}><option value="available">Available Width</option><option value="1280">1280px</option><option value="820">820px</option><option value="390">390px</option></SelectControl></label><button className="pl-button" type="button" onClick={() => setRevision(value => value + 1)}><StudioIcon name="undo" size={18} />Reset Demo</button></div>
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
    <div className="pl-preview-viewport" role="region" aria-label="Two Left Panes Preview" tabIndex={0}><div style={{ width: width === "available" ? "100%" : `${width}px` }}><Example key={revision} /></div></div>
    <p className="pl-caption">This composition responds to its own container width, including the fixed-width examples. All example values and pane state are temporary.</p>
  </div>;
}
function Example() {
  const [primaryWidth, setPrimaryWidth] = useState(240);
  const [secondaryWidth, setSecondaryWidth] = useState(280);
  const [primaryClosed, setPrimaryClosed] = useState(false);
  const [secondaryClosed, setSecondaryClosed] = useState(false);
  const [title, setTitle] = useState("Example website");
  return <TwoLeftPaneWorkspace label="Two Left Panes Example" primary={<Pane label="Example Navigation" side="left" width={primaryWidth} minWidth={200} maxWidth={360} onWidthChange={setPrimaryWidth} collapsed={primaryClosed} onCollapsedChange={setPrimaryClosed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} header={<h2>Navigation</h2>}><p>Choose a section.</p><strong>Identity</strong></Pane>} secondary={<Pane label="Example Settings" side="left" width={secondaryWidth} minWidth={220} maxWidth={420} onWidthChange={setSecondaryWidth} collapsed={secondaryClosed} onCollapsedChange={setSecondaryClosed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} header={<h2>Settings</h2>}><label className="pl-field">Example Title<TextInput value={title} onChange={event => setTitle(event.currentTarget.value)} /></label><p>Try hiding either pane, then both. Reopen each by pointer or keyboard.</p></Pane>}>
    <div style={{ height: 540, minWidth: 0 }}><ResizablePreviewFrame><article className="pane-centre"><h2>{title || "Untitled example"}</h2><p>The preview fills the released space when its neighbouring panes close.</p></article></ResizablePreviewFrame></div>
  </TwoLeftPaneWorkspace>;
}
