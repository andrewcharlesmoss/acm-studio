"use client";

import { useState } from "react";
import { iconNames, iconMetadata, iconScales, type IconName } from "@acm/icons";
import { AcmIcon } from "@acm/icons/react";
import { AcmStudioIcon } from "../acm-studio-icons";
import { blockCatalogue, templateContentBlock, type BlockLibraryItemType } from "../editor-model";
import { BlockLibraryIconSample, blockLibrarySymbol } from "../block-library-icons";
import { commandInventory } from "../ribbon/catalogue-model";
import { StudioUiLibrary } from "./studio-ui-library";
import { createIconPng, createIconSvg, downloadIconFile } from "./icon-download.mjs";
import { KeyboardCatalogue } from "./keyboard-catalogue";

const blockLibraryCatalogue = [...blockCatalogue, templateContentBlock];

export function IconsCatalogue({ initialIcon, collection = "icons" }: { initialIcon?: string; collection?: "icons" | "keyboard" | "blocks" }) {
  const [iconQuery, setIconQuery] = useState("");
  const [golden, setGolden] = useState(false);
  const [dark, setDark] = useState(false);
  const [icon, setIcon] = useState<IconName>(() => iconNames.includes(initialIcon as IconName) ? initialIcon as IconName : "action.undo");
  const [exportStatus, setExportStatus] = useState("");
  const [blockQuery, setBlockQuery] = useState("");
  const [blockSymbol, setBlockSymbol] = useState<BlockLibraryItemType>("paragraph");
  const filteredIcons = iconNames.filter((name) => !name.startsWith("keyboard.") && (!golden || iconMetadata[name].golden) && (name + " " + iconMetadata[name].label + " " + iconMetadata[name].keywords.join(" ")).toLowerCase().includes(iconQuery.toLowerCase()));
  const filteredBlocks = blockLibraryCatalogue.filter((item) => `${item.label} ${item.description} ${item.group} ${blockLibrarySymbol(item.type).symbol}`.toLowerCase().includes(blockQuery.toLowerCase()));
  const selectedBlock = blockLibraryCatalogue.find((item) => item.type === blockSymbol) ?? blockLibraryCatalogue[0];
  const selectedBlockSymbol = blockLibrarySymbol(selectedBlock.type);
  const ribbonExamples = commandInventory.filter((control) => control.icon === icon || control.iconVariants?.includes(icon));

  async function downloadIcon(scale: typeof iconScales[number], size: number, format: "svg" | "png") {
    try {
      const svg = createIconSvg(icon, scale, size);
      const blob = format === "svg"
        ? new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
        : await createIconPng(svg, size);
      const filename = `${icon}-${size}px${format === "png" ? "-3x" : ""}.${format}`;
      downloadIconFile(blob, filename);
      setExportStatus(`${iconMetadata[icon].label} ${size}px ${format.toUpperCase()} download started.`);
    } catch {
      setExportStatus(`Could not prepare the ${format.toUpperCase()} download. Try again.`);
    }
  }

  return <StudioUiLibrary section="icons">
    <section className="ui-icons-page" aria-labelledby="ui-icons-title">
      <div className="ui-page-intro">
        <p className="rl-eyebrow">Shared ACM Foundation</p>
        <h1 id="ui-icons-title">Symbols for websites, videos and more.</h1>
        <p>Browse ACM artwork and sourced brand marks, and download SVG or PNG assets.</p>
      </div>
      <nav className="ui-symbol-collections" aria-label="Symbol Collections">
        <a href="/studio/ui/icons" aria-current={collection === "icons" ? "page" : undefined}><AcmIcon name="insert.shapes" size={20} />Interface Icons</a>
        <a href="/studio/ui/icons?collection=blocks" aria-current={collection === "blocks" ? "page" : undefined}><AcmIcon name="document.insert" size={20} />Block Library</a>
        <a href="/studio/ui/icons?collection=keyboard" aria-current={collection === "keyboard" ? "page" : undefined}><AcmIcon name="text.keyboard" size={20} />Keyboard <span>UK Set</span></a>
      </nav>
      {collection === "keyboard" ? <KeyboardCatalogue /> : collection === "blocks" ? <div className="rl-layout">
        <aside className="rl-sidebar" aria-label="Block Symbol Filters">
          <h2>Block Symbols</h2>
          <label className="rl-search"><AcmIcon name="action.search" size={18} /><input aria-label="Search Block Symbols" placeholder="Search blocks…" value={blockQuery} onChange={(event) => setBlockQuery(event.target.value)} /></label>
          <label className="rl-check"><input type="checkbox" checked={dark} onChange={(event) => setDark(event.target.checked)} />Dark Specimens</label>
          <p>{filteredBlocks.length} {filteredBlocks.length === 1 ? "block" : "blocks"} · three scales</p>
          <p className="rl-secondary">Regular-S · 16px<br />Regular-M · 24px<br />Regular-L · 32px</p>
        </aside>
        <section className="rl-main" aria-label="Block Library Icon Catalogue">
          <div className="rl-section-heading"><p className="rl-eyebrow">ACM STUDIO BLOCK LIBRARY</p><h2>Symbols used for each block type.</h2></div>
          <div className={"rl-icon-grid" + (dark ? " rl-dark" : "")}>{filteredBlocks.map((item) => {
            const symbol = blockLibrarySymbol(item.type);
            return <button className="rl-icon-card" type="button" key={item.type} aria-pressed={blockSymbol === item.type} onClick={() => setBlockSymbol(item.type)}>
              <span className="rl-icon-scales">{iconScales.map((scale, index) => {
                const size = [16, 24, 32][index];
                return <span key={scale} title={scale}><BlockLibraryIconSample type={item.type} scale={scale} size={size} /></span>;
              })}</span>
              <strong>{item.label}</strong><small>{symbol.source} · {symbol.symbol}</small>
            </button>;
          })}</div>
          {!filteredBlocks.length && <p>No blocks match this search.</p>}
        </section>
        <aside className="rl-inspector" aria-label="Block Symbol Inspector">
          <p className="rl-eyebrow">BLOCK SYMBOL</p><h2>{selectedBlock.label}</h2>
          <code>{selectedBlockSymbol.symbol}</code>
          <div className="rl-enlarged"><BlockLibraryIconSample type={selectedBlock.type} scale="Regular-L" size={144} /></div>
          <p>{selectedBlock.description}</p>
          <details open><summary>Artwork source</summary><p>{selectedBlockSymbol.source === "ACM Icons" ? "This block uses an existing product-neutral ACM symbol from the shared icon catalogue." : "This block uses original ACM Studio artwork from the Studio icon set."}</p></details>
        </aside>
      </div> : <div className="rl-layout">
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
          <div className="rl-scale-samples">{iconScales.map((scale, index) => {
            const size = [16, 24, 32][index];
            return <div key={scale}>
              <AcmIcon name={icon} scale={scale} size={size} />
              <span className="ui-icon-scale-label">{scale}<small>{size}px</small></span>
              <span className="ui-icon-download-actions">
                <button type="button" className="ui-icon-download" aria-label={`Download ${size}px SVG`} title={`Download ${size}px SVG`} onClick={() => void downloadIcon(scale, size, "svg")}><AcmStudioIcon name="download" size={14} /><span>SVG</span></button>
                <button type="button" className="ui-icon-download" aria-label={`Download ${size}px PNG at 3×`} title={`Download transparent PNG at ${size * 3}×${size * 3}px`} onClick={() => void downloadIcon(scale, size, "png")}><AcmStudioIcon name="download" size={14} /><span>PNG</span></button>
              </span>
            </div>;
          })}</div>
          <p className="ui-icon-download-note">PNG files have a transparent background and export at 3× the selected size.</p>
          <p className="ui-icon-download-status" role="status" aria-live="polite">{exportStatus}</p>
          <h3>Ribbon catalogue examples</h3>
          <ul className="rl-usage">{ribbonExamples.map((control) => <li key={control.id}><small>{control.product === "skeleton" ? "Component Specimen" : control.product === "studio" ? "ACM Studio" : "ACM Account"}</small>{control.label}{icon !== control.icon ? " (state variant)" : ""}</li>)}</ul>
          {!ribbonExamples.length && <p>No Ribbon catalogue examples use this symbol.</p>}
          <details><summary>Provenance and source</summary><p>{iconMetadata[icon].provenance}</p><code>acm-icons/masters/{icon}.svg</code><p>Three editable scale groups. ACM icon specification v0.9.0.</p></details>
        </aside>
      </div>}
    </section>
  </StudioUiLibrary>;
}
