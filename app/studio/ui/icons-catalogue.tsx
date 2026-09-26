"use client";

import { useState } from "react";
import { iconNames, iconMetadata, iconScales, type IconName } from "@acm/icons";
import { AcmIcon } from "@acm/icons/react";
import { commandInventory } from "../ribbon/catalogue-model";
import { StudioUiLibrary } from "./studio-ui-library";

export function IconsCatalogue({ initialIcon }: { initialIcon?: string }) {
  const [iconQuery, setIconQuery] = useState("");
  const [golden, setGolden] = useState(false);
  const [dark, setDark] = useState(false);
  const [icon, setIcon] = useState<IconName>(() => iconNames.includes(initialIcon as IconName) ? initialIcon as IconName : "action.undo");
  const filteredIcons = iconNames.filter((name) => (!golden || iconMetadata[name].golden) && (name + " " + iconMetadata[name].label + " " + iconMetadata[name].keywords.join(" ")).toLowerCase().includes(iconQuery.toLowerCase()));
  const ribbonExamples = commandInventory.filter((control) => control.icon === icon || control.iconVariants?.includes(icon));

  return <StudioUiLibrary section="icons">
    <section className="ui-icons-page" aria-labelledby="ui-icons-title">
      <div className="ui-page-intro">
        <p className="rl-eyebrow">Shared ACM Foundation</p>
        <h1 id="ui-icons-title">Icons for the whole interface.</h1>
        <p>Original ACM symbols, available to Ribbon, panes and other interface features.</p>
      </div>
      <div className="rl-layout">
        <aside className="rl-sidebar" aria-label="Icon Filters">
          <h2>Symbols</h2>
          <label className="rl-search"><AcmIcon name="action.search" size={18} /><input aria-label="Search Icons" placeholder="Search icons…" value={iconQuery} onChange={(event) => setIconQuery(event.target.value)} /></label>
          <label className="rl-check"><input type="checkbox" checked={golden} onChange={(event) => setGolden(event.target.checked)} />Golden Reference Only</label>
          <label className="rl-check"><input type="checkbox" checked={dark} onChange={(event) => setDark(event.target.checked)} />Dark Specimens</label>
          <p>{filteredIcons.length} {filteredIcons.length === 1 ? "symbol" : "symbols"} · three scales</p>
          <p className="rl-secondary">Regular-S · 16px<br />Regular-M · 24px<br />Regular-L · 32px</p>
        </aside>
        <section className="rl-main" aria-label="ACM Icon Catalogue">
          <div className="rl-section-heading"><p className="rl-eyebrow">ACM ICONS</p><h2>One family. Every action.</h2></div>
          <div className={"rl-icon-grid" + (dark ? " rl-dark" : "")}>{filteredIcons.map((name) => <button className="rl-icon-card" type="button" key={name} aria-pressed={icon === name} onClick={() => setIcon(name)}>
            <span className="rl-icon-scales">{iconScales.map((scale, index) => <span key={scale} title={scale}><AcmIcon name={name} scale={scale} size={[16, 24, 32][index]} /></span>)}</span>
            <strong>{iconMetadata[name].label}</strong><small>{name}</small>
          </button>)}</div>
          {!filteredIcons.length && <p>No icons match this search.</p>}
        </section>
        <aside className="rl-inspector" aria-label="Icon Inspector">
          <p className="rl-eyebrow">SYMBOL INSPECTOR</p><h2>{iconMetadata[icon].label}</h2><code>{icon}</code>
          <div className="rl-enlarged"><AcmIcon name={icon} size={144} /></div><p>{iconMetadata[icon].description}</p>
          <div className="rl-scale-samples">{iconScales.map((scale, index) => <div key={scale}><AcmIcon name={icon} scale={scale} size={[16, 24, 32][index]} /><span>{scale}<small>{[16, 24, 32][index]}px</small></span></div>)}</div>
          <h3>Ribbon catalogue examples</h3>
          <ul className="rl-usage">{ribbonExamples.map((control) => <li key={control.id}><small>{control.product === "skeleton" ? "Component Specimen" : control.product === "studio" ? "ACM Studio" : "ACM Account"}</small>{control.label}{icon !== control.icon ? " (state variant)" : ""}</li>)}</ul>
          {!ribbonExamples.length && <p>No Ribbon catalogue examples use this symbol.</p>}
          <details><summary>Provenance and source</summary><p>{iconMetadata[icon].provenance}</p><code>acm-icons/masters/{icon}.svg</code><p>Three editable scale groups. ACM icon specification v0.5.8.</p></details>
        </aside>
      </div>
    </section>
  </StudioUiLibrary>;
}
