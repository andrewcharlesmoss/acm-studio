"use client";
import { useState } from "react";
import { Pane } from "./pane-components";
import { StudioNavigationWorkspace } from "./studio-navigation-workspace";
import { TwoLeftPaneWorkspace } from "./two-left-pane-workspace";
import { StudioIcon } from "../studio-icons";
import { SelectControl, TextInput } from "../controls/native-fields";
import { ResizablePreviewFrame } from "../controls/resizable-preview-frame";

export function StudioNavigationWorkspaceSpecimen() {
  const [width, setWidth] = useState("available");
  const [revision, setRevision] = useState(0);
  return <div className="pl-main">
    <h2>Studio Navigation with Editor Panes</h2>
    <p>The shared Studio Navigation pane stays beside an editor workspace with its own navigation and settings panes. The editor can use a separate feature scope while Studio navigation remains available.</p>
    <div className="pl-preview-tools">
      <label className="pl-field">Example Width<SelectControl value={width} onChange={event => setWidth(event.currentTarget.value)}><option value="available">Available Width</option><option value="1440">1440px</option><option value="820">820px</option><option value="390">390px</option></SelectControl></label>
      <button className="pl-button" type="button" onClick={() => setRevision(value => value + 1)}><StudioIcon name="undo" size={18} />Reset Demo</button>
    </div>
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
    <div className="pl-preview-viewport" role="region" aria-label="Studio Navigation workspace preview" tabIndex={0}><div style={{ width: width === "available" ? "100%" : `${width}px` }}><Example key={revision} /></div></div>
    <p className="pl-caption">All controls and content are temporary examples. Resize or collapse each pane independently; when all three are closed, their controls follow pane order from top to bottom. Narrow examples scroll horizontally.</p>
  </div>;
}

function Example() {
  const [navigationWidth, setNavigationWidth] = useState(290);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const [editorNavigationWidth, setEditorNavigationWidth] = useState(230);
  const [settingsWidth, setSettingsWidth] = useState(260);
  const [editorNavigationCollapsed, setEditorNavigationCollapsed] = useState(false);
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const [title, setTitle] = useState("Example site");
  const [library, setLibrary] = useState("Pages");
  return <div className="pl-studio-navigation-workspace">
    <StudioNavigationWorkspace label="Studio Navigation with Editor Panes example" navigation={<Pane label="Studio Navigation" side="left" width={navigationWidth} minWidth={270} maxWidth={480} onWidthChange={setNavigationWidth} collapsed={navigationCollapsed} onCollapsedChange={setNavigationCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} flushRegions={["header", "body", "footer"]} header={<div className="pl-studio-navigation-tools"><button type="button">New post</button><button type="button">New page</button></div>} tabs={<div className="pl-studio-navigation-tabs"><button type="button">Studio Drafts</button><button type="button">Sites · Example</button></div>} footer={<button type="button">All Sites</button>}><nav className="pl-studio-navigation-list" aria-label="Studio tools"><button type="button">Files</button><button type="button">Templates</button><button type="button">Design Canvas</button><button type="button">Studio UI Library</button><button type="button" aria-current="page">Content Editor</button><button type="button">Site Editor</button><button type="button">Backup</button><button type="button">Bin</button></nav><div className="pl-studio-navigation-library"><div><button type="button" aria-pressed={library === "Posts"} onClick={() => setLibrary("Posts")}>Posts 2</button><button type="button" aria-pressed={library === "Pages"} onClick={() => setLibrary("Pages")}>Pages 2</button><button type="button" aria-pressed={library === "Templates"} onClick={() => setLibrary("Templates")}>Templates 1</button></div><button type="button" className="document-item is-active"><span className="document-kind-mark">{library === "Posts" ? "A" : library === "Templates" ? "T" : "P"}</span><span><strong>{title}</strong><small>/{library.toLowerCase()}</small></span><span className="document-status is-published">Published</span></button><button type="button" className="document-item"><span className="document-kind-mark">{library === "Posts" ? "A" : library === "Templates" ? "T" : "P"}</span><span><strong>Another {library.slice(0, -1)}</strong><small>/another</small></span><span className="document-status">Draft</span></button></div></Pane>}>
      <TwoLeftPaneWorkspace precedingPaneCount={1} label="Editor panes example" primary={<Pane label="Editor Navigation" side="left" width={editorNavigationWidth} minWidth={200} maxWidth={360} onWidthChange={setEditorNavigationWidth} collapsed={editorNavigationCollapsed} onCollapsedChange={setEditorNavigationCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} header={<h2>Design</h2>}><p>Choose an editor section.</p><button type="button">Identity</button><button type="button">Styles</button><button type="button">Pages</button></Pane>} secondary={<Pane label="Editor Settings" side="left" width={settingsWidth} minWidth={220} maxWidth={420} onWidthChange={setSettingsWidth} collapsed={settingsCollapsed} onCollapsedChange={setSettingsCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} header={<h2>Identity</h2>}><label className="pl-field">Site title<TextInput value={title} onChange={event => setTitle(event.currentTarget.value)} /></label><p>These settings belong to the editor scope.</p></Pane>}>
        <div className="pl-studio-navigation-canvas"><ResizablePreviewFrame><article className="pane-centre"><h2>{title || "Untitled site"}</h2><p>The editor preview uses the remaining workspace width.</p></article></ResizablePreviewFrame></div>
      </TwoLeftPaneWorkspace>
    </StudioNavigationWorkspace>
  </div>;
}
