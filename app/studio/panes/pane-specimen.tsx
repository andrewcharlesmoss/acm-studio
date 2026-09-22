"use client";

import { useId, useState } from "react";
import { StudioIcon } from "../studio-icons";
import { Pane, PaneSection, PaneTabs, PaneTabPanel, PaneWorkspace, type PaneSide } from "./pane-components";
import { demoRows, initialPaneDemo, updatePaneDemo, type PaneDefinition, type PaneDemo, type RegionOptions } from "./catalogue-model";

export function PaneSpecimen({ definition, regions, layout, content, studio }: {
  definition: PaneDefinition; regions: RegionOptions; layout: "both" | "left" | "right";
  content: "normal" | "empty" | "long"; studio: boolean;
}) {
  const [left, setLeft] = useState(() => initialPaneDemo(definition.tabs[0]));
  const [right, setRight] = useState(() => initialPaneDemo(definition.tabs[0]));
  const [notice, setNotice] = useState("Changes stay in this example only.");
  const instance = useId();
  const pane = (side: PaneSide) => {
    const state = side === "left" ? left : right;
    const setState = side === "left" ? setLeft : setRight;
    const patch = (value: Partial<PaneDemo>) => setState((previous) => updatePaneDemo(previous, value));
    const collapsed = side === "left" ? state.leftCollapsed : state.rightCollapsed;
    const label = studio ? definition.label : `${side === "left" ? "Left" : "Right"} Pane`;
    const tabsId = `${instance}-${side}`;
    const names = definition.id === "blocks" ? ["Paragraph", "Heading", "List", "Quote", "Image", "Embed", "Group", "Section"]
      : definition.id === "design-navigation" ? state.tab === "Layers" ? ["Heading layer", "Image layer", "Background layer"] : ["Cover page", "Second page", "Closing page"]
      : definition.id === "navigation" ? state.tab === "Posts" ? ["Project notes", "An update", "Draft post"] : state.tab === "Templates" ? ["Page", "Post", "Header", "Footer"] : ["Home", "About", "Projects"]
      : ["Example item", "Another item", "Third item"];
    const rows = demoRows(content, names, state.query);
    const isFields = definition.id === "inspector" || definition.id === "design-properties";
    const body = <>
      {content === "empty" ? <p className="pl-muted">No items in this example.</p> : isFields ? <>
        <PaneSection title={state.tab === "Styles" ? "Appearance" : "Properties"}>
          <label className="pl-field">{definition.id === "design-properties" ? "Page Name" : state.tab === "Block" ? "Block Label" : "Title"}<input value={state.value} onChange={(event) => patch({ value: event.target.value })} /></label>
          <label className="pl-field">Alignment<select defaultValue="Left"><option>Left</option><option>Centre</option><option>Right</option></select></label>
        </PaneSection>
        <PaneSection title="Display"><label className="pl-check"><input type="checkbox" defaultChecked />Show Label</label><p className="pl-muted">Sample settings, with no product connection.</p></PaneSection>
        {content === "long" && Array.from({ length: 20 }, (_, i) => <PaneSection key={i} title={`Settings Group ${i + 1}`}><label className="pl-field">Example Value<input defaultValue={`Value ${i + 1}`} /></label></PaneSection>)}
      </> : <PaneSection title={definition.id === "skeleton" ? "Scrolling Body" : definition.id === "blocks" ? "Available Blocks" : state.tab}>
        {rows.length ? <div className={definition.id === "blocks" ? "pl-block-grid" : "pl-item-list"}>{rows.map((name) => <button key={name} type="button" className="pl-item" aria-pressed={state.selected === name} onClick={() => patch({ selected: name })}>
          <StudioIcon name={definition.id === "blocks" ? "block" : definition.id === "design-navigation" ? "image" : "file"} size={20} /><span>{name}</span>
        </button>)}</div> : <p className="pl-muted">No matching items.</p>}
        {definition.id === "skeleton" && <label className="pl-field">Example Field<input value={state.value} onChange={(event) => patch({ value: event.target.value })} /></label>}
      </PaneSection>}
    </>;
    return <Pane side={side} label={label} width={studio ? definition.width : side === "left" ? 290 : 300}
      collapsed={collapsed} onCollapsedChange={(next) => patch(side === "left" ? { leftCollapsed: next } : { rightCollapsed: next })}
      collapseIcon={<StudioIcon name="chevron-right" size={18} />}
      header={regions.header ? <><h2>{studio ? definition.label : "Header"}</h2><button type="button" className="pl-icon-button" aria-label={`Collapse ${label} from Header`} onClick={() => patch(side === "left" ? { leftCollapsed: true } : { rightCollapsed: true })}><StudioIcon name="close" size={20} /></button></> : undefined}
      tabs={regions.tabs ? <PaneTabs id={tabsId} label={`${label} Tabs`} tabs={definition.tabs.map((name) => ({ id: name, label: name }))} active={state.tab} onChange={(tab) => patch({ tab })} /> : undefined}
      toolbar={regions.toolbar ? <label className="pl-field">{studio ? "Search" : "Toolbar / Search"}<input type="search" value={state.query} placeholder="Find an item…" onChange={(event) => patch({ query: event.target.value })} /></label> : undefined}
      footer={regions.footer ? <button type="button" className="pl-button" onClick={() => setNotice(`${label}: example action selected. No product data was changed.`)}>{studio ? "Example Action" : "Footer Action"}</button> : undefined}>
      {regions.tabs ? definition.tabs.map((tab) => <PaneTabPanel key={tab} id={tabsId} tab={tab} active={state.tab}>{body}</PaneTabPanel>) : body}
    </Pane>;
  };
  return <div className={studio ? "pl-specimen pl-studio-specimen" : "pl-specimen"}>
    <PaneWorkspace left={layout !== "right" ? pane("left") : undefined} right={layout !== "left" ? pane("right") : undefined}>
      <div className="pl-centre-card"><span className="pl-eyebrow">Centre workspace</span><h3>Room for your work</h3><p>The panes keep their width. This space adjusts around them.</p><p className="pl-muted">Use the edge buttons to collapse and reopen each pane.</p></div>
      <p className="pl-demo-status" role="status">{notice}</p>
    </PaneWorkspace>
  </div>;
}
